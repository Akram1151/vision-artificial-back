const OpenAI = require('openai')

// Lazy-initialized so the client is only created at runtime (not during deploy-time analysis),
// when process.env.OPENAI_API_KEY is injected by Cloud Secret Manager.
let openai = null
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openai
}

const UNIFIED_PROMPT = `You are an expert AI system specialized in two tasks:
1. Receipt / ticket OCR — extract structured purchase data from scanned or photographed receipts.
2. Vehicle & license plate recognition — read license plates and classify vehicles.

Analyze the image, determine its type, and extract all available information.
Return ONLY a valid JSON object (no markdown, no extra text) using EXACTLY one of these schemas:

For a receipt / ticket:
{
  "type": "ticket",
  "confidence": <number 0-1>,
  "data": {
    "merchant": { "name": <string|null>, "address": <string|null>, "vat_number": <string|null> },
    "ticket":   { "date": <"YYYY-MM-DD"|null>, "time": <"HH:MM"|null>, "currency": <string|null>, "currency_inferred": <true|false> },
    "items": [
      { "name": <string>, "quantity": <number>, "unit_price": <number>, "total_price": <number>, "category": <string>, "confidence": <number 0-1> }
    ],
    "totals": {
      "subtotal":  <number|null>,
      "tax":       <number|null>,
      "tax_lines": [
        { "name": <string>, "rate": <number|null>, "base": <number|null>, "amount": <number|null> }
      ],
      "total":     <number|null>
    },
    "raw_text": <string>,
    "warnings": []
  }
}

IMPORTANT rules for receipt / ticket:

CURRENCY:
- If the currency is explicitly printed on the receipt (symbol €, $, £, "EUR", "USD", etc.) use that value (ISO 4217 code, e.g. "EUR").
- If the currency is NOT printed, infer it from the merchant's location context:
  * Use the address, city, region, country, store name, phone prefix, VAT number format, or any other localisation clue visible on the receipt.
  * Common mappings: Spain / Andorra → "EUR", UK → "GBP", USA / Canada → "USD" / "CAD", Mexico → "MXN", etc.
  * Set "currency_inferred" to true and add a warning such as "Currency inferred as EUR from merchant location (Tarragona, Spain)".
- If currency cannot be determined at all, set "currency" to null and "currency_inferred" to false.

TAXES (IVA / VAT / PVP / GST / etc.):
- Always look for individual tax breakdowns printed on the receipt (lines like "IVA 21%", "IVA 10%", "IVA 4%", "Base imponible", "Cuota IVA", "VAT", "GST", "Tax", etc.).
- For EACH tax line found, add one entry in "tax_lines":
  * "name":   the label as printed (e.g. "IVA 21%", "VAT 20%", "GST")
  * "rate":   the percentage as a decimal (e.g. 0.21 for 21%) — null if not specified
  * "base":   the taxable base amount — null if not specified
  * "amount": the tax amount charged — null if not specified
- "tax" in totals must equal the sum of all tax_lines[].amount (or the single tax figure if no breakdown is given).
- PVP (Precio de Venta al Público) is the final consumer price inclusive of all taxes — map it to "total".
- If no tax information is present anywhere on the receipt, set "tax" to null and "tax_lines" to [].

For a vehicle / license plate:
{
  "type": "vehicle",
  "confidence": <number 0-1>,
  "data": {
    "vehicle": {
      "license_plate": <string|null>,
      "plate_visible": <true|false>,
      "plate_unreadable_reason": <"occluded"|"blurry"|"angle"|"damaged"|"not_present"|null>,
      "country": <string|null>,
      "vehicle_type": <"car"|"truck"|"motorcycle"|"bus"|"van"|"other"|null>,
      "brand": <string|null>, "model": <string|null>, "color": <string|null>
    },
    "detection": { "bounding_box": { "x": <number>, "y": <number>, "width": <number>, "height": <number> } },
    "raw_text": <string>,
    "warnings": <string[]>
  }
}

IMPORTANT rules for vehicle images:
- If a vehicle IS detected but the license plate is NOT visible or readable:
  * Set "license_plate" to null
  * Set "plate_visible" to false
  * Set "plate_unreadable_reason" to one of: "occluded", "blurry", "angle", "damaged", "not_present"
  * Add a human-readable explanation to "warnings", e.g. "License plate not visible: plate is occluded by an object"
- If the plate IS readable:
  * Set "plate_visible" to true
  * Set "plate_unreadable_reason" to null
  * Set "license_plate" to the plate text (uppercase, no spaces)

If the image is neither a receipt nor a vehicle, return:
{ "type": "unknown", "confidence": 0, "data": { "warnings": ["Image does not match any supported type"] } }`

/**
 * Analyzes an image buffer using OpenAI Vision API
 * @param {Buffer} imageBuffer - The image buffer
 * @param {string} mimeType - The MIME type of the image (e.g. 'image/jpeg')
 * @returns {Promise<Object>} - Parsed JSON result from the model
 */
/**
 * Analyzes an image buffer using OpenAI Vision API.
 * Auto-detects whether the image is a receipt/ticket or a vehicle/license plate.
 * @param {Buffer} imageBuffer
 * @param {string} mimeType - e.g. 'image/jpeg'
 * @returns {Promise<{ type: string, confidence: number, data: Object }>}
 */
async function analyzeImage(imageBuffer, mimeType) {
  const prompt = process.env.VISION_PROMPT || UNIFIED_PROMPT
  const openai = getOpenAI()
  const base64Image = imageBuffer.toString('base64')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    max_tokens: 1500,
  })

  const rawContent = response.choices[0].message.content

  try {
    return JSON.parse(rawContent)
  } catch (err) {
    console.error('Failed to parse model JSON response:', rawContent)
    throw err
  }
}

module.exports = { analyzeImage }

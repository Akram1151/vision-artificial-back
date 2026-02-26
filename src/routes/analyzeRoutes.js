const express = require('express')
const Busboy = require('busboy')
const { analyze } = require('../controllers/analyzeController')

const router = express.Router()

/**
 * @openapi
 * components:
 *   schemas:
 *     AnalyseMeta:
 *       type: object
 *       properties:
 *         batch_id:       { type: string, example: "batch_a1b2c3d4" }
 *         processed_at:   { type: string, format: date-time, example: "2025-06-10T14:32:00.000Z" }
 *         total_images:   { type: integer, example: 2 }
 *
 *     TicketItem:
 *       type: object
 *       properties:
 *         name:        { type: string,  example: "Llet semidesnatada 1L" }
 *         quantity:    { type: number,  example: 2 }
 *         unit_price:  { type: number,  example: 0.89 }
 *         total_price: { type: number,  example: 1.78 }
 *         category:    { type: string,  example: "dairy" }
 *         confidence:  { type: number,  example: 0.97 }
 *
 *     TicketData:
 *       type: object
 *       properties:
 *         merchant:
 *           type: object
 *           properties:
 *             name:       { type: string,  example: "Mercadona S.A." }
 *             address:    { type: string,  example: "Carrer de Balmes 32, 08007 Barcelona" }
 *             vat_number: { type: string,  example: "A46103834" }
 *         ticket:
 *           type: object
 *           properties:
 *             date:               { type: string, example: "2025-06-10" }
 *             time:               { type: string, example: "13:47" }
 *             currency:           { type: string, example: "EUR" }
 *             currency_inferred:  { type: boolean, example: false, description: "true when currency was not printed and was inferred from merchant location" }
 *         items:
 *           type: array
 *           items: { $ref: '#/components/schemas/TicketItem' }
 *         totals:
 *           type: object
 *           properties:
 *             subtotal: { type: number, example: 12.40 }
 *             tax:      { type: number, example: 1.23, description: "Sum of all tax_lines amounts" }
 *             tax_lines:
 *               type: array
 *               description: Individual tax breakdown lines (IVA 21%, IVA 10%, VAT, GST…)
 *               items:
 *                 type: object
 *                 properties:
 *                   name:   { type: string,  example: "IVA 21%" }
 *                   rate:   { type: number,  example: 0.21, nullable: true }
 *                   base:   { type: number,  example: 5.86, nullable: true }
 *                   amount: { type: number,  example: 1.23, nullable: true }
 *             total:    { type: number, example: 13.38, description: "PVP — final consumer price inclusive of all taxes" }
 *         raw_text: { type: string, example: "MERCADONA\nTicket 0042..." }
 *         warnings: { type: array, items: { type: string } }
 *
 *     VehicleData:
 *       type: object
 *       properties:
 *         vehicle:
 *           type: object
 *           properties:
 *             license_plate:         { type: string,  example: "1234ABC" }
 *             plate_visible:         { type: boolean, example: true }
 *             plate_unreadable_reason: { type: string, enum: [occluded, blurry, angle, damaged, not_present], nullable: true }
 *             country:               { type: string,  example: "ES" }
 *             vehicle_type:          { type: string,  enum: [car, truck, motorcycle, bus, van, other], example: "car" }
 *             brand:                 { type: string,  example: "SEAT" }
 *             model:                 { type: string,  example: "Ibiza" }
 *             color:                 { type: string,  example: "red" }
 *         detection:
 *           type: object
 *           properties:
 *             bounding_box:
 *               type: object
 *               properties:
 *                 x:      { type: number, example: 0.12 }
 *                 y:      { type: number, example: 0.55 }
 *                 width:  { type: number, example: 0.40 }
 *                 height: { type: number, example: 0.18 }
 *         raw_text:  { type: string,  example: "1234ABC" }
 *         warnings:  { type: array,   items: { type: string } }
 *
 *     AnalyseResult:
 *       type: object
 *       properties:
 *         image_id:   { type: string, example: "img_1" }
 *         type:       { type: string, enum: [ticket, vehicle, unknown, error], example: "ticket" }
 *         confidence: { type: number, minimum: 0, maximum: 1, example: 0.95 }
 *         data:
 *           oneOf:
 *             - $ref: '#/components/schemas/TicketData'
 *             - $ref: '#/components/schemas/VehicleData'
 *
 *     AnalyseResponse:
 *       type: object
 *       properties:
 *         meta:    { $ref: '#/components/schemas/AnalyseMeta' }
 *         results:
 *           type: array
 *           items: { $ref: '#/components/schemas/AnalyseResult' }
 *         summary:
 *           type: object
 *           properties:
 *             total_tickets:      { type: integer, example: 1 }
 *             total_spent:        { type: number,  example: 13.38 }
 *             vehicles_detected:  { type: integer, example: 1 }
 *             vehicle_types:
 *               type: object
 *               additionalProperties: { type: integer }
 *               example: { car: 1 }
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:   { type: string, example: "No images provided. Send one or more files with field name \"image\"." }
 *         details: { type: string }
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_FILES = 20

/**
 * Custom multipart middleware that reads from req.rawBody.
 * Supports multiple files sent as repeated 'image' fields.
 * Firebase Functions v2 (Cloud Run) stores the raw body in req.rawBody;
 * the readable stream is already consumed by the framework, which causes
 * busboy to throw "Unexpected end of form" when piped from req directly.
 */
function uploadImages(req, res, next) {
  const contentType = req.headers['content-type'] || ''
  if (!contentType.includes('multipart/form-data')) {
    return next()
  }

  const busboy = Busboy({
    headers: req.headers,
    limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  })

  req.files = []
  let hasError = false

  busboy.on('file', (fieldname, file, info) => {
    const { mimeType, filename } = info

    if (!mimeType.startsWith('image/')) {
      file.resume()
      if (!hasError) {
        hasError = true
        return next(new Error('Only image files are allowed'))
      }
      return
    }

    const chunks = []
    file.on('data', (chunk) => chunks.push(chunk))
    file.on('limit', () => {
      if (!hasError) {
        hasError = true
        next(new Error('File too large (max 10 MB)'))
      }
    })
    file.on('end', () => {
      if (!hasError) {
        req.files.push({
          fieldname,
          originalname: filename || fieldname,
          mimetype: mimeType,
          buffer: Buffer.concat(chunks),
        })
      }
    })
  })

  busboy.on('finish', () => {
    if (!hasError) next()
  })
  busboy.on('error', (err) => next(err))

  // Firebase Functions v2 stores the raw request body in req.rawBody.
  if (req.rawBody) {
    busboy.end(req.rawBody)
  } else {
    req.pipe(busboy)
  }
}

/**
 * @openapi
 * /analyze:
 *   post:
 *     summary: Analyse one or more images
 *     description: |
 *       Send up to **20 images** as `multipart/form-data` using the field name `image`.
 *       The API auto-detects whether each image is a **receipt/ticket** or a **vehicle/licence plate**
 *       and returns structured JSON for each file plus a batch summary.
 *     tags: [Analyse]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: One or more image files (JPEG, PNG, WebP, GIF). Max 10 MB each, 20 files per request.
 *           examples:
 *             single_ticket:
 *               summary: Single receipt photo
 *               value: { image: "<binary JPEG of a supermarket receipt>" }
 *             batch_mixed:
 *               summary: Mixed batch (1 receipt + 1 vehicle)
 *               value: { image: ["<receipt.jpg>", "<car_plate.jpg>"] }
 *     responses:
 *       200:
 *         description: All images processed successfully (individual errors are reported inside each result object)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AnalyseResponse' }
 *             examples:
 *               ticket_result:
 *                 summary: Receipt detected
 *                 value:
 *                   meta: { batch_id: "batch_a1b2c3d4", processed_at: "2025-06-10T14:32:00.000Z", total_images: 1 }
 *                   results:
 *                     - image_id: "img_1"
 *                       type: "ticket"
 *                       confidence: 0.97
 *                       data:
 *                         merchant: { name: "Mercadona S.A.", address: "Carrer de Balmes 32, 08007 Barcelona", vat_number: "A46103834" }
 *                         ticket:   { date: "2025-06-10", time: "13:47", currency: "EUR", currency_inferred: false }
 *                         items:
 *                           - { name: "Llet semidesnatada 1L", quantity: 2, unit_price: 0.89, total_price: 1.78, category: "dairy", confidence: 0.97 }
 *                           - { name: "Pa de motlle integral", quantity: 1, unit_price: 1.20, total_price: 1.20, category: "bakery", confidence: 0.95 }
 *                         totals:
 *                           subtotal: 12.15
 *                           tax: 1.23
 *                           tax_lines:
 *                             - { name: "IVA 21%", rate: 0.21, base: 5.86, amount: 1.23 }
 *                           total: 13.38
 *                         raw_text: "MERCADONA\\nTicket 0042..."
 *                         warnings: []
 *                   summary: { total_tickets: 1, total_spent: 13.38, vehicles_detected: 0, vehicle_types: {} }
 *               vehicle_result:
 *                 summary: Vehicle detected
 *                 value:
 *                   meta: { batch_id: "batch_b9c8d7e6", processed_at: "2025-06-10T15:00:00.000Z", total_images: 1 }
 *                   results:
 *                     - image_id: "img_1"
 *                       type: "vehicle"
 *                       confidence: 0.95
 *                       data:
 *                         vehicle: { license_plate: "1234ABC", plate_visible: true, plate_unreadable_reason: null, country: "ES", vehicle_type: "car", brand: "SEAT", model: "Ibiza", color: "red" }
 *                         detection: { bounding_box: { x: 0.12, y: 0.55, width: 0.40, height: 0.18 } }
 *                         raw_text: "1234ABC"
 *                         warnings: []
 *                   summary: { total_tickets: 0, total_spent: 0, vehicles_detected: 1, vehicle_types: { car: 1 } }
 *       400:
 *         description: No images supplied or invalid file type / size
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             example: { error: "No images provided. Send one or more files with field name \"image\"." }
 *       502:
 *         description: OpenAI returned invalid JSON
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
// POST /analyze — accepts one or more 'image' fields
router.post('/analyze', uploadImages, analyze)

module.exports = router

module.exports = router

const { analyzeImage } = require('../services/visionService')
const { randomUUID } = require('crypto')

async function analyze(req, res) {
  try {
    const files = req.files && req.files.length > 0 ? req.files : null

    if (!files) {
      return res.status(400).json({
        error: 'No images provided. Send one or more files with field name "image".',
      })
    }

    const processedAt = new Date().toISOString()
    const batchId = `batch_${randomUUID().split('-')[0]}`

    // Process all images in parallel
    const results = await Promise.all(
      files.map(async (file, index) => {
        const imageId = `img_${index + 1}`
        try {
          const parsed = await analyzeImage(file.buffer, file.mimetype)
          return {
            image_id: imageId,
            type: parsed.type || 'unknown',
            confidence: parsed.confidence ?? 0,
            data: parsed.data || {},
          }
        } catch (err) {
          console.error(`Error processing ${imageId}:`, err.message)
          return {
            image_id: imageId,
            type: 'error',
            confidence: 0,
            data: { warnings: [err.message] },
          }
        }
      })
    )

    // Build summary
    const tickets = results.filter((r) => r.type === 'ticket')
    const vehicles = results.filter((r) => r.type === 'vehicle')

    const vehicleTypes = vehicles.reduce((acc, r) => {
      const vType = r.data?.vehicle?.vehicle_type || 'unknown'
      acc[vType] = (acc[vType] || 0) + 1
      return acc
    }, {})

    // Combined total: only when there are multiple tickets AND all share the same currency
    let combinedTotal = null
    if (tickets.length > 1) {
      const currencies = tickets.map((r) => r.data?.ticket?.currency ?? null)
      const uniqueCurrencies = [...new Set(currencies.filter(Boolean))]
      const allMatch = uniqueCurrencies.length === 1 && currencies.every(Boolean)

      if (allMatch) {
        const rawTotal = tickets.reduce((sum, r) => sum + (r.data?.totals?.total || 0), 0)
        combinedTotal = {
          amount: Math.round(rawTotal * 100) / 100,
          currency: uniqueCurrencies[0],
        }
      }
    }

    const summary = {
      total_tickets: tickets.length,
      vehicles_detected: vehicles.length,
      vehicle_types: vehicleTypes,
      ...(combinedTotal !== null && { combined_total: combinedTotal }),
    }

    return res.json({
      meta: {
        batch_id: batchId,
        processed_at: processedAt,
        total_images: files.length,
      },
      results,
      summary,
    })
  } catch (error) {
    console.error('Error in analyze controller:', error)

    if (error instanceof SyntaxError) {
      return res.status(502).json({ error: 'Model returned invalid JSON', details: error.message })
    }

    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

module.exports = { analyze }

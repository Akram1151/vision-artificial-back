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

    const totalSpent = tickets.reduce((sum, r) => {
      return sum + (r.data?.totals?.total || 0)
    }, 0)

    const vehicleTypes = vehicles.reduce((acc, r) => {
      const vType = r.data?.vehicle?.vehicle_type || 'unknown'
      acc[vType] = (acc[vType] || 0) + 1
      return acc
    }, {})

    return res.json({
      meta: {
        batch_id: batchId,
        processed_at: processedAt,
        total_images: files.length,
      },
      results,
      summary: {
        total_tickets: tickets.length,
        total_spent: Math.round(totalSpent * 100) / 100,
        vehicles_detected: vehicles.length,
        vehicle_types: vehicleTypes,
      },
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

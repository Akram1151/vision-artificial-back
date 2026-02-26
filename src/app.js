const express = require('express')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./swagger')
const analyzeRoutes = require('./routes/analyzeRoutes')

const app = express()

app.use(cors())
app.use(express.json())

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Service health check
 *     description: "Returns {status: ok} when the service is running."
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'ok' }
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// ── Swagger UI  →  GET /api-docs  ──────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Vision Artificial API Docs',
  swaggerOptions: { persistAuthorization: true },
}))

// ── Raw OpenAPI JSON  →  GET /api-docs/swagger.json  ───────────────────────
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})

app.use('/', analyzeRoutes)

// Global error handler so Firebase doesn't return generic HTML errors
// and to surface Multer / multipart issues as JSON.
app.use((err, req, res, next) => {
  console.error('Global error handler:', err)

  // Multer / Busboy form parsing error
  if (err && (err.code === 'LIMIT_FILE_SIZE' || err.message === 'Unexpected end of form')) {
    return res.status(400).json({
      error: 'Invalid image upload',
      details: err.message,
    })
  }

  // Fallback
  res.status(500).json({
    error: 'Internal server error',
    details: err && err.message ? err.message : 'Unknown error',
  })
})

module.exports = app
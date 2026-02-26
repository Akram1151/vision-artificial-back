const express = require('express')
const cors = require('cors')
const analyzeRoutes = require('./routes/analyzeRoutes')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', analyzeRoutes)

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
const express = require('express')
const Busboy = require('busboy')
const { analyze } = require('../controllers/analyzeController')

const router = express.Router()

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

// POST /api/analyze — accepts one or more 'image' fields
router.post('/analyze', uploadImages, analyze)

module.exports = router

module.exports = router

const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Vision Artificial API',
      version: '1.0.0',
      description:
        'REST API that uses OpenAI Vision to automatically analyse images.\n\n' +
        'Supports two detection modes:\n' +
        '- **Receipt / Ticket OCR** – extracts merchant, line items, totals and VAT number.\n' +
        '- **Vehicle & Licence-Plate Recognition** – reads the plate and classifies the vehicle type, brand and colour.\n\n' +
        'Send up to **20 images** in a single request (field name `image`, multipart/form-data).',
      contact: {
        name: 'Vision Artificial Team',
      },
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: 'https://us-central1-vision-artificial-back.cloudfunctions.net/api',
        description: 'Production (Firebase / Cloud Run)',
      },
      {
        url: 'http://localhost:3000',
        description: 'Local development',
      },
    ],
    tags: [
      { name: 'Health', description: 'Service liveness check' },
      { name: 'Analyse', description: 'Image analysis endpoints' },
    ],
  },
  apis: ['./src/routes/*.js', './src/app.js'],
}

const swaggerSpec = swaggerJsdoc(options)

module.exports = swaggerSpec

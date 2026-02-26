const { onRequest } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const app = require('./src/app')

// Define the secret — Firebase will inject it as process.env.OPENAI_API_KEY at runtime
const openAiApiKey = defineSecret('OPENAI_API_KEY')

exports.api = onRequest(
  { secrets: [openAiApiKey] },
  app
)

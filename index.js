const functions = require('firebase-functions')
const app = require('./src/app')

// Exportar la app de Express como una Cloud Function
exports.api = functions.https.onRequest(app)

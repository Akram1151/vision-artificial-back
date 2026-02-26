/**
 * scripts/export-swagger.js
 * Generates swagger.json (OpenAPI 3.0 spec) from the JSDoc annotations.
 *
 * Usage:
 *   node scripts/export-swagger.js
 *
 * Output:
 *   swagger.json  (project root)
 */

const fs = require('fs')
const path = require('path')
const swaggerSpec = require('../src/swagger')

const outputPath = path.resolve(__dirname, '..', 'swagger.json')
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2), 'utf8')

console.log(`✅  swagger.json written to ${outputPath}`)
console.log(`    Endpoints documented: ${Object.keys(swaggerSpec.paths || {}).length}`)

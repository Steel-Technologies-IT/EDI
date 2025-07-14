const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });
/**
 * Writes structured JSON to the network path using the base name of the uploaded flat file.
 * @param {Object} structured - The structured JSON object to write.
 * @param {string} originalName - The original filename of the uploaded flat file.
 * @param {string} [outputDir] - Optional output directory. Defaults to the network path.
 * @param {string} [ext] - Optional extension (default: .txt).
 */
function writeStructuredJSON(structured, originalName, outputDir, ext = '.txt') {
  outputDir = process.env.REACT_APP_CLEO_PATH;

  const baseName = path.parse(originalName).name;
  const filePath = `${outputDir}\\${baseName}${ext}`;

  fs.writeFileSync(filePath, JSON.stringify(structured, null, 2));
  console.log('Structured JSON written to:', filePath);
}

module.exports = { writeStructuredJSON };


const fs = require('fs');
const path = require('path');

/**
 * Writes structured JSON to the network path using the base name of the uploaded flat file.
 * @param {Object} structured - The structured JSON object to write.
 * @param {string} originalName - The original filename of the uploaded flat file.
 * @param {string} [outputDir] - Optional output directory. Defaults to the network path.
 * @param {string} [ext] - Optional extension (default: .txt).
 */
async function writeStructuredJSON(structured, originalName, outputDir, ext = '.txt') {
  
  
  outputDir = process.env.REACT_APP_CLEO_PATH;

  const baseName = path.parse(originalName).name;
  const filePath = `${outputDir}\\${baseName}${ext}`;

  const file = await fs.promises.open(filePath, 'w');
  await file.writeFile(JSON.stringify(structured, null, 2));
  await file.close();

  console.log('Structured JSON written to:', filePath);
}


module.exports = { writeStructuredJSON };


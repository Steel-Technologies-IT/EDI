const fs = require('fs').promises;
const { exec } = require('child_process');
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

  const tempPath = path.join(__dirname, `../../../../../processedSNF/${baseName}${ext}`);

  await fs.writeFile(tempPath, JSON.stringify(structured, null, 2));

  // Use Windows copy command to move to network path
  exec(`copy "${tempPath}" "${filePath}"`, (err, stdout, stderr) => {
    if (err) {
      console.error('Error copying file:', err);
    } else {
      console.log('Structured JSON written to:', filePath);
    }
    // Optionally delete temp file
    fs.unlink(tempPath);
  });
}

module.exports = { writeStructuredJSON };


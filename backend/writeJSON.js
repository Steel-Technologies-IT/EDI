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
  outputDir = '\\\\sttxcleoharmp02\\E$\\payload\\Invex\\JSON\\Inbound';
  console.log('CLEO_PATH:', outputDir);
  console.log(structured);
  const baseName = path.parse(originalName).name;
  const filePath = `${outputDir}/${baseName}${ext}`;

  if (!fs.existsSync(outputDir)) {
    throw new Error(`Output directory does not exist: ${outputDir}`);
  }

  try {
    await fs.promises.writeFile(filePath, JSON.stringify(structured, null, 2));
    console.log('Structured JSON written to:', filePath);
  } catch (err) {
    console.error('Error writing structured JSON:', err);
    throw err;
  }
}

module.exports = { writeStructuredJSON };


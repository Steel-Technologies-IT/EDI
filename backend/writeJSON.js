const fs = require('fs');
const path = require('path');

/**
 * Writes structured JSON to the network path using the base name of the uploaded flat file.
 * @param {Object} structured - The structured JSON object to write.
 * @param {string} originalName - The original filename of the uploaded flat file.
 * @param {string} [outputDir] - Optional output directory. Defaults to the network path.
 * @param {string} [ext] - Optional extension (default: .txt).
 */
function writeStructuredJSON(structured, originalName, outputDir, ext = '.txt') {
  
  
  outputDir = process.env.REACT_APP_CLEO_PATH;

  
if (!outputDir) {
  throw new Error('Environment variable REACT_APP_CLEO_PATH is not set.');
}

  const baseName = path.parse(originalName).name;
  const filePath = `${outputDir}\\${baseName}${ext}`;

  if (!fs.existsSync(outputDir)) {
  throw new Error(`Network path not accessible: ${outputDir}`);
  }


 
try {
  fs.writeFileSync(filePath, JSON.stringify(structured, null, 2));
  console.log('Structured JSON written to:', filePath);
} catch (err) {
  console.error('Error writing structured JSON:', {
    message: err.message,
    code: err.code,
    errno: err.errno,
    syscall: err.syscall,
    path: err.path,
  });
  throw err; // or handle gracefully
}

}

module.exports = { writeStructuredJSON };


const fs = require('fs');
const path = require('path');

/**
 * Retry writing to a file with delay and limited attempts.
 */
function retryWrite(filePath, data, retries = 3, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      fs.writeFileSync(filePath, data);
      console.log('Write successful:', filePath);
      return;
    } catch (err) {
      console.warn(`Write attempt ${i + 1} failed: ${err.message}`);
      if (i === retries - 1) throw err;
      // Simple blocking delay (Node.js >= v12)
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
    }
  }
}

/**
 * Writes structured JSON to the network path using the base name of the uploaded flat file.
 * @param {Object} structured - The structured JSON object to write.
 * @param {string} originalName - The original filename of the uploaded flat file.
 * @param {string} [outputDir] - Optional output directory. Defaults to the network path.
 * @param {string} [ext] - Optional extension (default: .txt).
 */
function writeStructuredJSON(structured, originalName, outputDir, ext = '.txt') {
  outputDir = '\\\\sttxcleoharmp02.sttx.int\\payload\\Invex\\JSON\\Inbound'//process.env.REACT_APP_CLEO_PATH;

  if (!outputDir) {
    throw new Error('Environment variable REACT_APP_CLEO_PATH is not set.');
  }

  const baseName = path.parse(originalName).name;
  const filePath = `${outputDir}\\${baseName}${ext}`;


  if (!fs.existsSync(outputDir)) {
    throw new Error(`Network path not accessible: ${outputDir}`);
  }

  try {
    retryWrite(filePath, JSON.stringify(structured, null, 2));
    console.log('Structured JSON written to:', filePath);
  } catch (err) {
    console.error('Error writing structured JSON:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      syscall: err.syscall,
      path: err.path,
    });
    throw err;
  }
}

module.exports = { writeStructuredJSON };


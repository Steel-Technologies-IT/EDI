const fs = require('fs');
const path = require('path');

/**
 * Writes a structured object as a flat file without quotes or JSON formatting
 * @param {Object[]} structured - Array of records to write as flat file
 * @param {string} fileName - Original filename to use as base for output
 * @param {string} ext - File extension (default: '.txt')
 */
function writeSNFFile(structured, fileName, ext = '.txt') {
  const filePath = path.join(process.env.REACT_APP_LISTEN_PATH, 'SNFS', `${fileName}${ext}`);
  
  fs.writeFileSync(filePath, structured, 'utf-8');
  
  console.log('Flat file written to:', filePath);
}

module.exports = { writeSNFFile };

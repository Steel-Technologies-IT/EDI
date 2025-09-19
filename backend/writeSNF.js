const fs = require('fs');
const path = require('path');

/**
 * Writes a structured object as a flat file without quotes or JSON formatting
 * @param {Object[]} structured - Array of records to write as flat file
 * @param {string} originalName - Original filename to use as base for output
 * @param {string} ext - File extension (default: '.txt')
 */
function writeSNFFile(structured, originalName, ext = '.txt') {
  const baseName = path.parse(originalName).name;
  const filePath = `E:/SNFS/${baseName}${ext}`;
  
  fs.writeFileSync(filePath, structured, 'utf-8');

  console.log('Flat file written to:', filePath);
}

module.exports = { writeSNFFile };

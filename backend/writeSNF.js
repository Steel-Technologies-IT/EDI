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
  
  // Convert the structured data to flat file format
  let flatFileContent = '';
  
  // Process each record
  structured.forEach(record => {
    // Create a line by joining all values without quotes
    const line = Object.values(record).join('|');
    flatFileContent += line + '\r\n'; // Use Windows line endings
  });
  
  // Write the file without JSON formatting
  fs.writeFileSync(filePath, flatFileContent);
  console.log('Flat file written to:', filePath);
}

module.exports = { writeSNFFile };

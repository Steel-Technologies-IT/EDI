const fs = require('fs');
const path = require('path');

function writeSNFFile(structured, originalName, ext = '.txt') {
  
  
 

  const baseName = path.parse(originalName).name;
  const filePath = `'E:/SNFS'/${baseName}${ext}`;


  fs.writeFileSync(filePath, JSON.stringify(structured, null, 2));
  console.log('Structured JSON written to:', filePath);
}

module.exports = { writeSNFFile };

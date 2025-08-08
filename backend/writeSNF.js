const fs = require('fs');
const path = require('path');

function writeSNFFile(structured, originalName, ext = '.txt') {
  
  
  outputDir = process.env.REACT_APP_CLEO_PATH_OUTBOUND;

  const baseName = path.parse(originalName).name;
  const filePath = `${outputDir}\\${baseName}${ext}`;


  fs.writeFileSync(filePath, JSON.stringify(structured, null, 2));
  console.log('Structured JSON written to:', filePath);
}

module.exports = { writeSNFFile };

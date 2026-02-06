const fs = require('fs');
const path = require('path');


async function writeSNFFile2(structured, fileName, ext = '.txt') {
  outputDir = '/mnt/edifiles/SNFS';
  const filePath = path.join(outputDir, `${fileName}${ext}`);

  await fs.writeFileSync(filePath, structured, 'utf-8');
  
  console.log('Flat file written to:', filePath);
}

module.exports = { writeSNFFile2 };

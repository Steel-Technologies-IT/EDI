const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function writeStructuredJSON(structured, originalName, outputDir, ext = '.txt') {
  outputDir = '/mnt/edifiles/JSONS';
  const baseName = path.parse(originalName).name;
  const filePath = path.join(outputDir, `${baseName}${ext}`);

  await fs.writeFile(filePath, JSON.stringify(structured, null, 2));

  console.log('✅ Structured JSON written to:', filePath);
}

module.exports = { writeStructuredJSON };


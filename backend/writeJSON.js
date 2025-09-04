const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function writeStructuredJSON(structured, originalName, outputDir, ext = '.txt') {
  outputDir = process.env.REACT_APP_CLEO_PATH;
  const baseName = path.parse(originalName).name;
  const filePath = `${outputDir}\\${baseName}${ext}`;
  const tempPath = path.join(__dirname, `../../../../../JSONS/${baseName}${ext}`);

  await fs.writeFile(tempPath, JSON.stringify(structured, null, 2));
}

module.exports = { writeStructuredJSON };


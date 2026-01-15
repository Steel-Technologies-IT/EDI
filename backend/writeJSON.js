const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function writeStructuredJSON(structured, originalName, outputDir, ext = '.txt') {
  outputDir = process.env.REACT_APP_CLEO_PATH;
  const baseName = path.parse(originalName).name;
  const filePath = `${outputDir}\\${baseName}${ext}`;
  const tempPath = `${process.env.REACT_APP_LISTEN_PATH}JSONS\\${baseName}${ext}`;

  await fs.writeFile(tempPath, JSON.stringify(structured, null, 2));

  //const psCmd = `powershell Copy-Item -Path "${tempPath}" -Destination "${filePath}"`;
  //exec(psCmd, (err, stdout, stderr) => {
  //  if (err) {
  //    console.error('PowerShell copy error:', err);
  //  } else {
      console.log('Structured JSON written to:', filePath);
      console.log('Temporary file created at:', tempPath);
  //  }
  //  fs.unlink(tempPath);
  //});
}

module.exports = { writeStructuredJSON };


const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function writeStructuredJSON(structured, originalName, outputDir, ext = '.txt') {
  outputDir = process.env.REACT_APP_CLEO_PATH;
  const baseName = path.parse(originalName).name;
  const filePath = `${outputDir}\\${baseName}${ext}`;
  const tempPath = path.join(__dirname, `../../../../../JSONS/${baseName}${ext}`);

  await fs.writeFile(tempPath, JSON.stringify(structured, null, 2));

  // Use Start-Process with -Verb RunAs for elevation
  const psCmd = `powershell -Command "Start-Process powershell -ArgumentList 'Copy-Item -Path \\"${tempPath}\\" -Destination \\"${filePath}\\"' -Verb RunAs"`;
  exec(psCmd, (err, stdout, stderr) => {
    if (err) {
      console.error('PowerShell copy error:', err);
    } else {
      console.log('Structured JSON written to:', filePath);
    }
    //fs.unlink(tempPath);
  });
}

module.exports = { writeStructuredJSON };


const fs = require('fs');
const path = require('path');

async function redirectAS400File(filePath) {
  try {
    const originalFileName = path.basename(filePath);
    const AS400_dir = process.env.REACT_APP_AS400_PATH || '\\\\sttxcleoharmd02\\';
    const destinationPath = path.join(`${AS400_dir}`, `${originalFileName}.txt`);

    // Read the file from the original path
    const fileData = fs.readFileSync(filePath);

    // Write the file to the new destination
    fs.writeFileSync(destinationPath, fileData);

    console.log('AS400 File Successfully Redirected');
  } catch (error) {
    console.error('Error redirecting AS400 file:', error);
  }
}

module.exports = redirectAS400File;
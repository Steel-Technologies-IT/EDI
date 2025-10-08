const { exec } = require('child_process');
const path = require('path');

async function callLoadNumber(location, xref) {
    return new Promise((resolve, reject) => {
        const javaDir = path.join(__dirname);
        
        // Pass parameters as command line arguments
        const javaCommand = `cd "${javaDir}" && java -cp ".;java/jt400.jar" LoadNumberCall "${location}" "${xref}"`;
        
        console.log(`Calling AS400 with Location: ${location}, XREF: ${xref}`);
        
        exec(javaCommand, { timeout: 60000 }, (error, stdout, stderr) => {
            if (error) {
                reject({
                    success: false,
                    error: error.message,
                    stderr: stderr
                });
                return;
            }
            
            // Parse the structured output
            if (stdout.includes('RESULT_SUCCESS:')) {
                const loadNumber = stdout.split('RESULT_SUCCESS:')[1].trim();
                resolve({
                    success: true,
                    loadNumber: loadNumber,
                    inputLocation: location,
                    inputXref: xref
                });
            } else if (stdout.includes('RESULT_ERROR:')) {
                const errorMsg = stdout.split('RESULT_ERROR:')[1].trim();
                reject({
                    success: false,
                    error: errorMsg
                });
            } else {
                reject({
                    success: false,
                    error: 'Unable to parse program output',
                    stdout: stdout
                });
            }
        });
    });
}

module.exports = { callLoadNumber };
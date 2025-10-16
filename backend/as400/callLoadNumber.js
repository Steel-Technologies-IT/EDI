const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

function findJavaExecutable() {
    // Try common Java installation paths
    const javaPaths = [
        'C:\\Program Files\\Eclipse Adoptium\\jdk-11.0.28.6-hotspot\\bin\\java.exe',
        'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.9.9-hotspot\\bin\\java.exe',
        'C:\\Program Files\\Java\\jdk-11.0.21\\bin\\java.exe',
        'C:\\Program Files\\Java\\jre-11.0.21\\bin\\java.exe',
        'C:\\Program Files (x86)\\Java\\jdk-11.0.21\\bin\\java.exe',
        'C:\\Program Files (x86)\\Java\\jre-11.0.21\\bin\\java.exe'
    ];
    
    // Check if any of these paths exist
    for (const javaPath of javaPaths) {
        if (fs.existsSync(javaPath)) {
            console.log(`Found Java at: ${javaPath}`);
            return `"${javaPath}"`;
        }
    }
    
    return null;
}

async function callLoadNumber(location, xref) {
    return new Promise((resolve, reject) => {
        const javaDir = path.join(__dirname);
        
        // Find Java executable with full path
        const javaExe = findJavaExecutable();
        if (!javaExe) {
            reject({
                success: false,
                error: 'Java executable not found in common installation directories',
                suggestion: 'Please verify Java installation path'
            });
            return;
        }
        
        // Use full path to Java executable
        const javaCommand = `cd "${javaDir}" && ${javaExe} -cp ".;java/jt400.jar" LoadNumberCall "${location}" "${xref}"`;
        
        console.log(`Calling AS400 with Location: ${location}, XREF: ${xref}`);
        console.log(`Using Java: ${javaExe}`);
        
        exec(javaCommand, { timeout: 60000 }, (error, stdout, stderr) => {
            if (error) {
                console.error('Java execution error:', error.message);
                console.error('stderr:', stderr);
                reject({
                    success: false,
                    error: error.message,
                    stderr: stderr,
                    javaPath: javaExe
                });
                return;
            }
            
            console.log('Java output:', stdout);
            
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
                    stdout: stdout,
                    stderr: stderr
                });
            }
        });
    });
}

module.exports = { callLoadNumber };
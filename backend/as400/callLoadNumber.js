const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function findJavaExecutable() {
    // 1) Prefer JAVA_HOME if set
    const javaHome = process.env.JAVA_HOME || process.env.JRE_HOME;
    if (javaHome) {
        const candidate = path.join(javaHome, 'bin', os.platform() === 'win32' ? 'java.exe' : 'java');
        if (fs.existsSync(candidate)) {
            console.log(`Found Java via JAVA_HOME at: ${candidate}`);
            return candidate;
        }
    }

    // 2) Check if `java` is on PATH
    try {
        const res = spawnSync('java', ['-version'], { stdio: 'ignore' });
        if (res.status === 0 || res.status === null) {
            console.log('Found Java on PATH: java');
            return 'java';
        }
    } catch (e) {
        // ignore
    }

    // 3) Fallback to some common Windows install locations (useful for local dev only)
    if (os.platform() === 'win32') {
        const javaPaths = [
            path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Eclipse Adoptium', 'jdk-11.0.28.6-hotspot', 'bin', 'java.exe'),
            path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Eclipse Adoptium', 'jdk-17.0.9.9-hotspot', 'bin', 'java.exe'),
            path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Java', 'jdk-11.0.21', 'bin', 'java.exe')
        ];
        for (const p of javaPaths) {
            if (fs.existsSync(p)) {
                console.log(`Found Java at: ${p}`);
                return p;
            }
        }
    }

    return null;
}

async function callLoadNumber(location, xref) {
    return new Promise((resolve, reject) => {
        const javaDir = path.join(__dirname);

        // Find Java executable with full path or on PATH
        const javaExe = findJavaExecutable();
        if (!javaExe) {
            reject({
                success: false,
                error: 'Java executable not found. Set JAVA_HOME or install java in PATH.'
            });
            return;
        }

        // Build classpath (current dir + helper jar + jt400.jar). Use platform-specific separator
        const sep = os.platform() === 'win32' ? ';' : ':';
        const classpath = [
            javaDir, 
            path.join(javaDir, 'as400-helper.jar'), 
            path.join(javaDir, 'java', 'jt400.jar')
        ].join(sep);

        const args = [
            '-cp', classpath, 'LoadNumberCall', 
            process.env.REACT_APP_AS400_SERVER || '', 
            process.env.REACT_APP_AS400_LIBRARY || '', 
            process.env.REACT_APP_AS400_USER || '', 
            process.env.REACT_APP_AS400_PASSWORD || '', 
            location, 
            xref
        ];

        console.log(`Calling AS400 with Location: ${location}, XREF: ${xref}`);
        console.log(`Using Java: ${javaExe}`);

        const child = spawn(javaExe, args, { cwd: javaDir });
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => stdout += data.toString());
        child.stderr.on('data', (data) => stderr += data.toString());

        child.on('error', (err) => {
            console.error('Java spawn error:', err.message);
            reject({ success: false, error: err.message, stderr, javaPath: javaExe });
        });

        child.on('close', (code) => {
            if (code !== 0) {
                console.error('Java exited with code', code, 'stderr:', stderr);
                reject({ success: false, error: `java exited ${code}`, stderr, javaPath: javaExe });
                return;
            }

            console.log('Java output:', stdout);

            if (stdout.includes('RESULT_SUCCESS:')) {
                const loadNumber = stdout.split('RESULT_SUCCESS:')[1].trim();
                resolve({ success: true, loadNumber, inputLocation: location, inputXref: xref });
            } else if (stdout.includes('RESULT_ERROR:')) {
                const errorMsg = stdout.split('RESULT_ERROR:')[1].trim();
                reject({ success: false, error: errorMsg });
            } else {
                reject({ success: false, error: 'Unable to parse program output', stdout, stderr });
            }
        });
    });
}

module.exports = { callLoadNumber };
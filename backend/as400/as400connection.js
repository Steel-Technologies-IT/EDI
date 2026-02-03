const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

function queryAS400Java(sql) {
    return new Promise((resolve, reject) => {
        // Build cross-platform classpath (: on Linux, ; on Windows)
        const sep = os.platform() === 'win32' ? ';' : ':';
        const cp = [
            path.join(__dirname),
            path.join(__dirname, 'as400-helper.jar'),
            path.join(__dirname, 'java', 'jt400.jar'),
            path.join(__dirname, 'java', 'json.jar')
        ].join(sep);

        const args = ['-cp', cp, 'AS400Query', process.env.REACT_APP_AS400_URL, process.env.REACT_APP_AS400_USER, process.env.REACT_APP_AS400_PASSWORD, sql];

        const java = spawn('java', args, { cwd: path.join(__dirname) });
        let output = '';
        let error = '';
        java.stdout.on('data', data => output += data.toString());
        java.stderr.on('data', data => error += data.toString());
        java.on('error', err => {
            // e.g., spawn ENOENT when java is not found
            reject(err);
        });
        java.on('close', code => {
            if (code === 0) {
                try {
                    resolve(JSON.parse(output));
                } catch (e) {
                    reject('Failed to parse output: ' + output);
                }
            } else {
                reject(error || `java exited with code ${code}`);
            }
        });
    });
}

// Usage:


module.exports = {
    queryAS400Java
};
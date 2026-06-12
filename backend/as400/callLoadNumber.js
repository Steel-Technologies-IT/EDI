const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const LOAD_NUMBER_TIMEOUT_MS = 45000;


async function callLoadNumber(location, xref) {
     return new Promise((resolve, reject) => {
            // Build cross-platform classpath (: on Linux, ; on Windows)
            const sep = os.platform() === 'win32' ? ';' : ':';
            const cp = [
                path.join(__dirname),
                path.join(__dirname, 'as400-helper.jar'),
                path.join(__dirname, 'java', 'jt400.jar'),
                path.join(__dirname, 'java', 'json.jar')
            ].join(sep);


        const args = ['-cp', cp, 'LoadNumberCall', process.env.REACT_APP_AS400_SERVER, process.env.REACT_APP_AS400_LIBRARY, process.env.REACT_APP_AS400_USER, process.env.REACT_APP_AS400_PASSWORD,  `${location}`, `${xref}`];
       
        console.log(`Calling AS400 with Location: ${location}, XREF: ${xref}`);

         const java = spawn('java', args, { cwd: path.join(__dirname) });
                let output = '';
                let error = '';
                let settled = false;

                const finish = callback => value => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    clearTimeout(timeoutId);
                    callback(value);
                };

                const resolveOnce = finish(resolve);
                const rejectOnce = finish(reject);

                const timeoutId = setTimeout(() => {
                    java.kill();
                    rejectOnce(`LoadNumberCall timed out after ${LOAD_NUMBER_TIMEOUT_MS}ms. Stdout: ${output.trim()} Stderr: ${error.trim()}`.trim());
                }, LOAD_NUMBER_TIMEOUT_MS);

                java.stdout.on('data', data => {
                    const text = data.toString();
                    output += text;
                    process.stdout.write(text);
                });
                java.stderr.on('data', data => {
                    const text = data.toString();
                    error += text;
                    process.stderr.write(text);
                });
                java.on('error', err => {
                    // e.g., spawn ENOENT when java is not found
                    rejectOnce(err);
                });
                java.on('close', code => {
                    const stdout = output.trim();
                    const stderr = error.trim();
                    const successMatch = stdout.match(/RESULT_SUCCESS:(.+)$/m);
                    const errorMatch = stdout.match(/RESULT_ERROR:(.+)$/m);

                    if (code === 0 && successMatch) {
                        resolveOnce({ loadNumber: successMatch[1].trim() });
                        return;
                    }

                    if (errorMatch) {
                        rejectOnce(errorMatch[1].trim());
                        return;
                    }

                    rejectOnce(stderr || stdout || `java exited with code ${code}`);
                });
            });
        }

module.exports = { callLoadNumber };
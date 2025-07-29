const { spawn } = require('child_process');

function queryAS400Java(sql) {
    return new Promise((resolve, reject) => {
        const java = spawn('java', [
            '-cp',
            '.\\as400;.\\as400\\java\\jt400.jar;.\\as400\\java\\json.jar',
            'AS400Query',
            sql
        ]);
        let output = '';
        let error = '';
        java.stdout.on('data', data => output += data);
        java.stderr.on('data', data => error += data);
        java.on('close', code => {
            if (code === 0) {
                try {
                    resolve(JSON.parse(output));
                } catch (e) {
                    reject('Failed to parse output: ' + output);
                }
            } else {
                reject(error);
            }
        });
    });
}

// Usage:


module.exports = {
    queryAS400Java
};
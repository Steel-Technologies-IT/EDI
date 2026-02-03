const { spawn } = require('child_process');

function queryAS400Java(sql) {
    console.log('Executing AS400 query via Java:', sql);
    console.log('Using AS400 URL:', process.env.REACT_APP_AS400_URL);
    console.log('Using AS400 User:', process.env.REACT_APP_AS400_USER);
    console.log('Using AS400 Password:', process.env.REACT_APP_AS400_PASSWORD);
    return new Promise((resolve, reject) => {
        const java = spawn('java', [
            '-cp',
            '.\\as400;.\\as400\\java\\jt400.jar;.\\as400\\java\\json.jar',
            'AS400Query',
            process.env.REACT_APP_AS400_URL,
            process.env.REACT_APP_AS400_USER,
            process.env.REACT_APP_AS400_PASSWORD,
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
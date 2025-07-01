const JDBC = require('jdbc');
const jinst = require('jdbc/lib/jinst');

// Initialize JVM if not already done
if (!jinst.isJvmCreated()) {
    jinst.addOption('-Xrs');
    // Path to your AS400 JDBC driver .jar file
    jinst.setupClasspath(['./drivers/jt400.jar']);
}

const config = {
    url: 'jdbc:as400://<HOSTNAME_OR_IP>/<DATABASE>',
    drivername: 'com.ibm.as400.access.AS400JDBCDriver',
    minpoolsize: 1,
    maxpoolsize: 5,
    user: '<USERNAME>',
    password: '<PASSWORD>',
    // Optional: properties
    properties: {}
};

const as400 = new JDBC(config);

as400.initialize((err) => {
    if (err) {
        console.error('Error initializing JDBC:', err);
    } else {
        console.log('AS400 JDBC connection pool initialized.');
    }
});

// Example function to get a connection and run a query
async function queryAS400(sql, params = []) {
    return new Promise((resolve, reject) => {
        as400.reserve((err, connObj) => {
            if (err) return reject(err);
            const conn = connObj.conn;
            conn.prepareStatement(sql, (err, statement) => {
                if (err) {
                    as400.release(connObj, () => {});
                    return reject(err);
                }
                statement.executeQuery(params, (err, resultset) => {
                    if (err) {
                        as400.release(connObj, () => {});
                        return reject(err);
                    }
                    resultset.toObjArray((err, results) => {
                        as400.release(connObj, () => {});
                        if (err) return reject(err);
                        resolve(results);
                    });
                });
            });
        });
    });
}

module.exports = {
    as400,
    queryAS400
};
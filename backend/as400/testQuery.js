const { queryAS400Java } = require('./as400connection');

const sql = process.argv[2] || process.env.AS400_TEST_SQL || 'SELECT 1';

async function run() {
  if (!process.env.REACT_APP_AS400_SERVER) {
    console.error('Missing environment variable: REACT_APP_AS400_SERVER');
    console.error('Set REACT_APP_AS400_SERVER, REACT_APP_AS400_USER, REACT_APP_AS400_PASSWORD and try again.');
    process.exit(1);
  }

  try {
    console.log('Running AS400 test query:', sql);
    const res = await queryAS400Java(sql);
    console.log('AS400 query result:');
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('AS400 query failed:', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    process.exit(2);
  }
}

run();

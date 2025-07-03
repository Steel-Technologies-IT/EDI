//PERN PostgreSQL Connection

const Pool = require("pg").Pool;
const pool = new Pool({
  user: process.env.REACT_APP_DB_USER,
  password: process.env.REACT_APP_DB_PASSWORD,
  host: process.env.REACT_APP_DB_HOST,
  port: process.env.REACT_APP_DB_PORT,
  database: process.env.REACT_APP_DB_NAME,
});



module.exports = pool;

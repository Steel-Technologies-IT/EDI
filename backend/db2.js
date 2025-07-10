//PERN PostgreSQL Connection

const Pool = require("pg").Pool;
const pool = new Pool({
  user: process.env.REACT_APP_DB_USER || "postgres",
  password: process.env.REACT_APP_DB_PASSWORD || "PostSttx24!",
  host: process.env.REACT_APP_DB_HOST || "localhost",
  port: process.env.REACT_APP_DB_PORT || 5432,
  database: process.env.REACT_APP_DB_NAME || "Steel Technologies",
});



module.exports = pool;

//PERN PostgreSQL Connection

const Pool = require("pg").Pool;
const pool = new Pool({
  user: 'JDEWITT',
  password: 'sttx1234',
  host: 'az-cld-ivdb-q1',
  port: 5432,
  database: 'Steel Technologies',
});


module.exports = pool;
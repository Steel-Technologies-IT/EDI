const pool = require("../db2.js");
async function retrieveTableCodeDesc(TableNumber, TableCode) {
       try {
          const result = await pool.query(`SELECT aisi_code_desc
	                                            FROM public."AISI_Table_Codes"  
                                              WHERE aisi_table_number = $1 AND aisi_table_code = $2`, [TableNumber, TableCode]);
          if (result.rows && result.rows.length > 0) {
              const returnDsc = result.rows[0]['aisi_code_desc'].toUpperCase();
          return returnDsc.trim();
          }
        } catch (error) {
          console.error('Error querying database for Table Code Description:', error);
          return null;
        }
}

module.exports = {
    retrieveTableCodeDesc
};
const pool = require("../db2.js");
// const queryInvexDatabase = require("../Invex/InvexConnection");
const queryInvexDatabase = require('../Invex/InvexConnection.js');
async function retrieveBranch(Invex_OUId,Invex_OUIdQCd) {
try {      
          // Query to get inventory quality, hold status, and inventory type               
          const sql = `SELECT * FROM EDRPYI_REC 
                        WHERE (PYI_EDIX_ICQ = '${Invex_OUIdQCd}' 
                        and PYI_EDIX_ID_CD = '${Invex_OUId}' 
                        and PYI_PRTY_ACCT_TYP = 'WH') 
                        LIMIT 1`;                       
          const result = await queryInvexDatabase(sql);

          let returnBranch = null;
          if (result.Data && result.Data.length > 0) {
            // Check if hold status is not blank
            if (result.Data[0]['pyi_stx_acct_id'] !== ' ') { 
              returnBranch = result.Data[0]['pyi_stx_acct_id'].trim();
              return returnBranch;
            }

          }
          return returnBranch;

        } catch (error) {
          console.error('Error querying Invex database for branch:', error);
          return null;
        }
}

module.exports = {
    retrieveBranch
};
const pool = require("../db2.js");
// const queryInvexDatabase = require("../Invex/InvexConnection");
const queryInvexDatabase = require('../Invex/InvexConnection.js');
async function retrieveMaterialStatus(TaglotID) {
try {      
          // Query to get inventory quality, hold status, and inventory type               
          const sql = `select prd_tag_no, prd_invt_typ, prd_invt_qlty, prd_hld_sts
                        from intprd_rec
                        where prd_tag_no = '${TaglotID}'
                        order by prd_upd_dtts desc`;                       
          const result = await queryInvexDatabase(sql);

          let returnMStatus = null;
          if (result.Data && result.Data.length > 0) {
            // Check if hold status is not blank
            if (result.Data[0]['prd_hld_sts'] !== ' ') { 
              returnMStatus = '2';
              return returnMStatus;
            }

            // query AISI_MATERIAL_STATUS table for specific material status
            const results = await pool.query(`SELECT inv_mat_sts
	                                            FROM public."AISI_Material_Status"  
                                              WHERE inv_type = $1 AND inv_quality = $2`, [result.Data[0]['prd_invt_typ'], result.Data[0]['prd_invt_qlty']]);
            if (results.rows && results.rows.length > 0) {
              returnMStatus = results.rows[0]['inv_mat_sts'];
              return returnMStatus;
            } else {
              console.log(`No material status found in AISI_Material_Status for inv_type: ${result.Data[0]['prd_invt_typ']} and inv_quality: ${result.Data[0]['prd_invt_qlty']}`);
            }

            // Map inventory type to default material status
            switch (result.Data[0]['prd_invt_typ']) {
              case 'F':
              case 'X':
                returnMStatus = '1';
                break;
              case 'D':
              case 'R':
                returnMStatus = '2';
                break;
              case 'W':
              case 'M':
                returnMStatus = '7';
                break;
              case 'S':
                returnMStatus = 'S';
                break;
              default:
                returnMStatus = null;
            }

          } else {
            console.log(`No records found in intprd_rec for TaglotID: ${TaglotID}`);
          }
          return returnMStatus;

        } catch (error) {
          console.error('Error querying Invex database for Material Status:', error);
          return null;
        }
}

module.exports = {
    retrieveMaterialStatus
};
const pool = require("../db2.js");
async function retrieveInboundASN(millCoil, heat, mill) {
    try {
        let oldKey
        console.log(`Retrieving Inbound ASN for Mill Coil: ${millCoil}, Heat: ${heat}, Mill: ${mill}`);
        if (mill && mill != undefined && mill != null && mill !== "") {
        oldKey = await pool.query(`
        SELECT dtl_key FROM "856_SNF_Detail" 
        INNER JOIN "856_SNF_Names" names ON names.name_key = "856_SNF_Detail".dtl_key
        WHERE dtl_heat = $1 
        AND dtl_mcoil = $2 
        AND names.name_id = $3
      `, [
        heat, 
        millCoil, 
        mill
      ]);}
      else {
         oldKey = await pool.query(`
        SELECT dtl_key FROM "856_SNF_Detail"
        WHERE dtl_heat = $1 
        AND dtl_mcoil = $2
      `, [
        heat, 
        millCoil
      ]);
      }
      return oldKey

    }
    catch (error) {
        console.error("Error in retrieveInboundASN:", error);
    }
}

module.exports = {
    retrieveInboundASN
};
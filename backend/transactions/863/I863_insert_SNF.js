async function LoadI863SNF(pool, data, key) {
  // Implementation for loading I863 SNF data into the database
  const getRecords = (code) => data.filter(r => r.record_code === code);
   // Extract records by code
  const CT = getRecords("CT")[0] || {};
  const ten = getRecords("10")[0] || {};
  const eleven = getRecords("11") || [];
  const fifteen = getRecords("15")[0] || {};
  const thirty = getRecords("30") || [];
  const thirtytwo = getRecords("32") || [];
  const forty = getRecords("40") || [];
  const ninety = getRecords("90")[0] || {};


  //Insert into tables functions
  await insert863Header(pool, CT, ten, eleven, fifteen, thirty, thirtytwo, forty, ninety, key);

  return data;
}


//MARK: Header
//863 Header Insert
async function insert863Header(pool, CT, ten, eleven, fifteen, thirty, thirtytwo, forty, ninety, key) {
  try {
    await pool.query(`
     INSERT INTO public."863_SNF_Header"(
	hdr_type, hdr_key, hdr_isnd, hdr_gsnd, hdr_ircv, hdr_grcv, hdr_isa, hdr_gs, hdr_st, hdr_btr01, hdr_btr02, hdr_btr03, hdr_rpttyp, hdr_shpid, hdr_bol, hdr_mbol, hdr_shpd, hdr_shpt, hdr_shptz, hdr_destid, hdr_byid, hdr_ctt1, hdr_ctt2, hdr_ctt3, hdr_locn, hdr_odat, hdr_otim, hdr_opgm, hdr_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29);
    `, [
     //variables
    ]);

    console.log('863 Header inserted successfully');
  } catch (error) {
    console.error('Error inserting parsed records:', error);
  }
};

//MARK: Detail
// 863 Detail Insert
async function insert863Detail(pool, detail) {
  try {
    await pool.query(`
      INSERT INTO public."863_SNF_Detail"(
	dtl_type, dtl_key, dtl_line, dtl_heat, dtl_mcoil, dtl_mo, dtl_mol, dtl_po, dtl_pol, dtl_pod, dtl_part, dtl_tu, dtl_tdat, dtl_pdat, dtl_n1st, dtl_n1mf, dtl_locn, dtl_odat, dtl_otim, dtl_opgm, dtl_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);
    `, [
      //variables
    ]);

    console.log('863 Detail inserted successfully');
  } catch (error) {
    console.error('Error inserting 863 Detail:', error);
  }
}

//MARK: DetailNotes
async function insert863DetailNotes(pool, detailNotes) {
  try {
      await pool.query(`
        INSERT INTO public."863_SNF_DetailNotes"(
	dtln_type, dtln_key, dtln_line, dtln_seq, dtln_text, dtln_odat, dtln_otim, dtln_opgm, dtln_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
      `, [
        //variables
      ]);
    ;

    console.log('863 Detail Notes inserted successfully');
  } catch (error) {
    console.error('Error inserting 863 Detail Notes:', error);
  }
}







module.exports = {
    LoadI863SNF
}
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
//856 Header Insert
async function insert863Header(pool, CT, ten, eleven, fifteen, thirty, thirtytwo, forty, ninety, key) {
  try {
    await pool.query(`
     INSERT INTO <table name> (
     <field names>
     )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
      $51, $52, $53, $54, $55, $56, $57, $58, $59, $60)
    `, [
     //variables
    ]);

    console.log('863 Header inserted successfully');
  } catch (error) {
    console.error('Error inserting parsed records:', error);
  }
};




module.exports = {
    LoadI863SNF
}
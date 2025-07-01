//const trfm_Inbound = require('./functions/transformationInbound');
//const insert856OutputTables = require('./transactions/856/856_insert_Output_tables.js');

async function transform856(pool, key) {

    //Fetch the header, details, measurements, and names from the database
    const result = await pool.query('SELECT * FROM "856_SNF_Header" WHERE hdr_key = $1', [key]);
    const header = result.rows[0];

    const result2 = await pool.query('SELECT * FROM "856_SNF_Detail" WHERE dtl_key = $1', [key]);
    const details = result2.rows;

    const result3 = await pool.query('SELECT * FROM "856_SNF_Measure" WHERE msr_key = $1', [key]);
    const measurements = result3.rows;

    const result4 = await pool.query('SELECT * FROM "856_SNF_Names" WHERE name_key = $1', [key]);
    const names = result4.rows;


// Fetch the EDI rules for header, details, measurements, and names
// let headerRules = [], detailRules = [], measureRules = [], nameRules = [];
// try {
//     const rulesHeader = await pool.query('SELECT * FROM EDI_Rules WHERE edi_tbl = $1', ["856_SNF_Header"]); 
//     const rulesDetail = await pool.query('SELECT * FROM EDI_Rules WHERE edi_tbl = $1', ["856_SNF_Detail"]);
//     const rulesMeasure = await pool.query('SELECT * FROM EDI_Rules WHERE edi_tbl = $1', ["856_SNF_Measure"]);
//     const rulesNames = await pool.query('SELECT * FROM EDI_Rules WHERE edi_tbl = $1', ["856_SNF_Names"]);

//     headerRules = rulesHeader.rows;
//     detailRules = rulesDetail.rows;
//     measureRules = rulesMeasure.rows;
//     nameRules = rulesNames.rows;
// } catch (error) {
//     console.error('Error fetching EDI rules:', error);
// }

//     //Transform the header, details, measurements, and names using the rules
//     const newHeader = trfm_Inbound(header, headerRules);

//     const newDetails = details.map(detail => trfm_Inbound(detail, detailRules));

//     const newMeasurements = measurements.map(measurement => trfm_Inbound(measurement, measureRules));

//     const newNames = names.map(name => trfm_Inbound(name, nameRules));

//     insert856OutputTables(pool, newHeader, newDetails, newMeasurements, newNames);
    
}

module.exports = {
  transform856
}
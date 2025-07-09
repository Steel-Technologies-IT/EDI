//const { insert856InvexInbound } = require('./I856_insert_Invex.js');
const { trfm_Inbound } = require('../../functions/transformationInbound.js');
const { insert856InvexInbound } = require('./I856_insert_Invex.js');

async function transformI856(pool, key) {
  console.log("Transforming I856 with key:", key);
    //Fetch the header, details, measurements, and names from the database
    const result = await pool.query('SELECT * FROM "856_SNF_Header" WHERE hdr_key = $1', [key]);
    const SNF_Header = result.rows[0];

    const result2 = await pool.query('SELECT * FROM "856_SNF_Detail" WHERE dtl_key = $1', [key]);
    const SNF_Details = result2.rows;

    const result3 = await pool.query('SELECT * FROM "856_SNF_Measure" WHERE msr_key = $1', [key]);
    const SNF_Measurements = result3.rows;

    const result4 = await pool.query('SELECT * FROM "856_SNF_Names" WHERE name_key = $1', [key]);
    const SNF_Names = result4.rows;

  const context = {SNF_Header, SNF_Details, SNF_Measurements, SNF_Names};



// Fetch the EDI rules for header, details, measurements, and names
let headerRules = [], detailRules = [], measureRules = [], nameRules = [];
try {
    const rulesHeader = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["856_SNF_Header"]); 
    const rulesDetail = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["856_SNF_Detail"]);
    const rulesMeasure = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["856_SNF_Measure"]);
    const rulesNames = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["856_SNF_Names"]);

    headerRules = rulesHeader.rows;
    detailRules = rulesDetail.rows;
    measureRules = rulesMeasure.rows;
    nameRules = rulesNames.rows;
} catch (error) {
    console.error('Error fetching EDI rules:', error);
}

    //Transform the header, details, measurements, and names using the rules
    const newHeader = await trfm_Inbound(context, SNF_Header, headerRules);


     const newDetails = await Promise.all(SNF_Details.map(detail => trfm_Inbound(context, detail, detailRules)));

     const newMeasurements = await Promise.all(SNF_Measurements.map(measurement => trfm_Inbound(context, measurement, measureRules)));

     const newNames = await Promise.all(SNF_Names.map(name => trfm_Inbound(context, name, nameRules)));

    await insert856InvexInbound(pool, newHeader, newDetails, newMeasurements, newNames);
}



module.exports = {
  transformI856
}
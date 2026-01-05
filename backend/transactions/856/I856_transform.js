//const { insert856InvexInbound } = require('./I856_insert_Invex.js');
const { trfm_Inbound } = require('../../functions/transformationInbound.js');
const { insert856InvexInbound } = require('./I856_insert_Invex.js');

async function transformI856(pool, key) {
  console.log("Transforming I856 with key:", key);
  
  // Create a fresh Set for THIS specific file transformation
  const executedAddRowRules = new Set();
  
    //Fetch the header, details, measurements, and names from the database
    const result = await pool.query('SELECT * FROM "856_SNF_Header" WHERE hdr_key = $1', [key]);
    let SNF_Header = result.rows[0];
    
    const result2 = await pool.query('SELECT * FROM "856_SNF_Detail" WHERE dtl_key = $1', [key]);
    let SNF_Details = result2.rows;

    const result3 = await pool.query('SELECT * FROM "856_SNF_Measure" WHERE msr_key = $1', [key]);
    let SNF_Measurements = result3.rows;

    const result4 = await pool.query('SELECT * FROM "856_SNF_Names" WHERE name_key = $1', [key]);
    let SNF_Names = result4.rows;

    const rulesContextHeader = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["856_SNF_Context", "hdr_%"]);
    const rulesContextDetails = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["856_SNF_Context", "dtl_%"]);
    const rulesContextMeasurements = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["856_SNF_Context", "msr_%"]);
    const rulesContextNames = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["856_SNF_Context", "name_%"]);
    
    // Extract the rules for header, details, measurements, and names
    const context_Header_rules = rulesContextHeader.rows;
    const context_Details_rules = rulesContextDetails.rows;
    const context_Measurements_rules = rulesContextMeasurements.rows;
    const context_Names_rules = rulesContextNames.rows;
    console.log()

    const context = {SNF_Header, SNF_Details, SNF_Measurements, SNF_Names};

    // Transform the context using the rules
    const transformedHeader = await trfm_Inbound(context, context.SNF_Header, context_Header_rules);
 // Handle potential arrays returned from transformations - flatten results
    const contextDetailsResults = await Promise.all(context.SNF_Details.map(detail => trfm_Inbound(context, detail, context_Details_rules)));
    const transformedDetail = contextDetailsResults.flat().filter(row => row !== undefined);

    const contextMeasurementsResults = await Promise.all(context.SNF_Measurements.map(measurement => trfm_Inbound(context, measurement, context_Measurements_rules)));
    const transformedMeasurements = contextMeasurementsResults.flat().filter(row => row !== undefined);

    const contextNamesResults = await Promise.all(context.SNF_Names.map(name => trfm_Inbound(context, name, context_Names_rules)));
    const transformedNames = contextNamesResults.flat().filter(row => row !== undefined);

    context.SNF_Header = transformedHeader;
    SNF_Header = context.SNF_Header;

    context.SNF_Details = transformedDetail;
    SNF_Details = context.SNF_Details;

    context.SNF_Measurements = transformedMeasurements;
    SNF_Measurements = context.SNF_Measurements;

    context.SNF_Names = transformedNames;
    SNF_Names = context.SNF_Names;

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
    console.error('-', key, '-\n', 'Error fetching EDI rules:', error, '\n-', key, '-');
}

    //Transform the header, details, measurements, and names using the rules - handle arrays
    const newHeader = await trfm_Inbound(context, SNF_Header, headerRules);
    
    const detailsResults = await Promise.all(
        SNF_Details.map(detail => trfm_Inbound(context, detail, detailRules, executedAddRowRules))
    );
    const newDetails = detailsResults.flat().filter(row => row !== undefined);
    
    const measurementsResults = await Promise.all(
        SNF_Measurements.map(measurement => trfm_Inbound(context, measurement, measureRules, executedAddRowRules))
    );
    const newMeasurements = measurementsResults.flat().filter(row => row !== undefined);

    const namesResults = await Promise.all(
        SNF_Names.map(name => trfm_Inbound(context, name, nameRules, executedAddRowRules))
    );
    const newNames = namesResults.flat().filter(row => row !== undefined);

    console.log(`Transformation complete for key ${key}. Details: ${newDetails.length}, Names: ${newNames.length}, Measurements: ${newMeasurements.length}`);

    await insert856InvexInbound(pool, newHeader, newDetails, newMeasurements, newNames);
}

module.exports = {
  transformI856
}
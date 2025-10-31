//const { insert861InvexInbound } = require('./I861_insert_Invex.js');
const { trfm_Inbound, resetAddRowTracker } = require('../../functions/transformationInbound.js');
const { insert861InvexInbound } = require('./I861_insert_Invex.js');

async function transformI861(pool, key) {
  console.log("Transforming I861 with key:", key);
  
  // Reset the ADD_ROW tracker for this transformation
  resetAddRowTracker();
  
    //Fetch the header, details, measurements, and names from the database
    const result = await pool.query('SELECT * FROM "861_SNF_Header" WHERE hdr_key = $1', [key]);
    let SNF_Header = result.rows[0];
    
    const result2 = await pool.query('SELECT * FROM "861_SNF_Detail" WHERE dtl_key = $1', [key]);
    let SNF_Details = result2.rows;

    const result3 = await pool.query('SELECT * FROM "861_SNF_Names" WHERE name_key = $1', [key]);
    let SNF_Names = result3.rows;

    const rulesContextHeader = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["861_SNF_Context", "hdr_%"]);
    const rulesContextDetails = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["861_SNF_Context", "dtl_%"]);
    const rulesContextNames = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["861_SNF_Context", "name_%"]);
    
    // Extract the rules for header, details, and names
    const context_Header_rules = rulesContextHeader.rows;
    const context_Details_rules = rulesContextDetails.rows;
    const context_Names_rules = rulesContextNames.rows;

    const context = {SNF_Header, SNF_Details, SNF_Names};

    // Transform the context using the rules
    context.SNF_Header = await trfm_Inbound(context, context.SNF_Header, context_Header_rules);
    SNF_Header = context.SNF_Header;

    // Handle potential arrays returned from transformations - flatten results
    const contextDetailsResults = await Promise.all(context.SNF_Details.map(detail => trfm_Inbound(context, detail, context_Details_rules)));
    context.SNF_Details = contextDetailsResults.flat().filter(row => row !== undefined);
    SNF_Details = context.SNF_Details;

    const contextNamesResults = await Promise.all(context.SNF_Names.map(name => trfm_Inbound(context, name, context_Names_rules)));
    context.SNF_Names = contextNamesResults.flat().filter(row => row !== undefined);
    SNF_Names = context.SNF_Names;


// Fetch the EDI rules for header, details, measurements, and names
let headerRules = [], detailRules = [], nameRules = [];
try {
    const rulesHeader = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["861_SNF_Header"]); 
    const rulesDetail = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["861_SNF_Detail"]);
    const rulesNames = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["861_SNF_Names"]);

    headerRules = rulesHeader.rows;
    detailRules = rulesDetail.rows;
    nameRules = rulesNames.rows;
} catch (error) {
    console.error('-', key, '-\n', 'Error fetching EDI rules:', error, '\n-', key, '-');
}

    //Transform the header, details and names using the rules - handle arrays
    const newHeader = await trfm_Inbound(context, SNF_Header, headerRules);
    
    const detailsResults = await Promise.all(SNF_Details.map(detail => trfm_Inbound(context, detail, detailRules)));
    const newDetails = detailsResults.flat().filter(row => row !== undefined);

    const namesResults = await Promise.all(SNF_Names.map(name => trfm_Inbound(context, name, nameRules)));
    const newNames = namesResults.flat().filter(row => row !== undefined);

    await insert861InvexInbound(pool, newHeader, newDetails, newNames);
}

module.exports = {
  transformI861
}
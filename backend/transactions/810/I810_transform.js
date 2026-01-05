
const { trfm_Inbound, resetAddRowTracker } = require('../../functions/transformationInbound.js');
const { insert810InvexInbound } = require('./I810_insert_Invex.js');

async function transformI810(pool, key) {
  console.log("Transforming I810 with key:", key);
  
  const executedAddRowRules = new Set();
  
    //Fetch the header, details, measurements, and names from the database
    const result = await pool.query('SELECT * FROM "810_SNF_Header" WHERE hdr_key = $1', [key]);
    let SNF_Header = result.rows[0];
    console.log("Fetched SNF_Header:", SNF_Header);
    const result2 = await pool.query('SELECT * FROM "810_SNF_Detail" WHERE dtl_key = $1', [key]);
    let SNF_Details = result2.rows;

    const result3 = await pool.query('SELECT * FROM "810_SNF_MEA" WHERE mea_key = $1', [key]);
    let SNF_Mea = result3.rows;

    const result4 = await pool.query('SELECT * FROM "810_SNF_Tag" WHERE tag_key = $1', [key]);
    let SNF_Tags = result4.rows;

    const result5 = await pool.query('SELECT * FROM "810_SNF_Name" WHERE name_key = $1', [key]);
    let SNF_Names = result5.rows;

    const result6 = await pool.query('SELECT * FROM "810_SNF_AllChg" WHERE alc_key = $1', [key]);
    let SNF_AllowancesCharges = result6.rows;

    const rulesContextHeader = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["810_SNF_Context", "hdr_%"]);
    const rulesContextDetails = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["810_SNF_Context", "dtl_%"]);
    const rulesContextMea= await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["810_SNF_Context", "mea_%"]);
    const rulesContextNames = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["810_SNF_Context", "name_%"]);
    const rulesContextTags = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["810_SNF_Context", "tag_%"]);
    const rulesContextAllowancesCharges = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["810_SNF_Context", "alc_%"]);

    // Extract the rules for header, details, measurements, and names
    const context_Header_rules = rulesContextHeader.rows;
    const context_Details_rules = rulesContextDetails.rows;
    const context_Mea_rules = rulesContextMea.rows;
    const context_Names_rules = rulesContextNames.rows;
    const context_Tags_rules = rulesContextTags.rows;
    const context_AllowancesCharges_rules = rulesContextAllowancesCharges.rows;

    const context = {SNF_Header, SNF_Details, SNF_Mea, SNF_Names, SNF_Tags, SNF_AllowancesCharges};

    // Transform the context using the rules
    context.SNF_Header = await trfm_Inbound(context, context.SNF_Header, context_Header_rules, executedAddRowRules);
    SNF_Header = context.SNF_Header;

    // Handle potential arrays returned from transformations - flatten results
    const contextDetailsResults = await Promise.all(context.SNF_Details.map(detail => trfm_Inbound(context, detail, context_Details_rules, executedAddRowRules)));
    context.SNF_Details = contextDetailsResults.flat().filter(row => row !== undefined);
    SNF_Details = context.SNF_Details;

    const contextMeaResults = await Promise.all(context.SNF_Mea.map(measurement => trfm_Inbound(context, measurement, context_Mea_rules, executedAddRowRules)));
    context.SNF_Mea = contextMeaResults.flat().filter(row => row !== undefined);
    SNF_Mea = context.SNF_Mea;

    const contextNamesResults = await Promise.all(context.SNF_Names.map(name => trfm_Inbound(context, name, context_Names_rules, executedAddRowRules)));
    context.SNF_Names = contextNamesResults.flat().filter(row => row !== undefined);
    SNF_Names = context.SNF_Names;

    context.SNF_Tags = await Promise.all(context.SNF_Tags.map(tag => trfm_Inbound(context, tag, context_Tags_rules, executedAddRowRules)));
    context.SNF_Tags = context.SNF_Tags.flat().filter(row => row !== undefined);
    SNF_Tags = context.SNF_Tags;

    context.SNF_AllowancesCharges = await Promise.all(context.SNF_AllowancesCharges.map(allowanceCharge => trfm_Inbound(context, allowanceCharge, context_AllowancesCharges_rules, executedAddRowRules)));
    context.SNF_AllowancesCharges = context.SNF_AllowancesCharges.flat().filter(row => row !== undefined);
    SNF_AllowancesCharges = context.SNF_AllowancesCharges;


// Fetch the EDI rules for header, details, measurements, and names
let headerRules = [], detailRules = [], meaRules = [], nameRules = [];
try {
    const rulesHeader = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["810_SNF_Header"]); 
    const rulesDetail = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["810_SNF_Detail"]);
    const rulesMeasure = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["810_SNF_Mea"]);
    const rulesNames = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["810_SNF_Names"]);
    const rulesTags = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["810_SNF_Tag"]);
    const rulesAllowancesCharges = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["810_SNF_AllChg"]);


    headerRules = rulesHeader.rows;
    detailRules = rulesDetail.rows;
    meaRules = rulesMeasure.rows;
    nameRules = rulesNames.rows;
    tagRules = rulesTags.rows;
    allowancesChargesRules = rulesAllowancesCharges.rows;

} catch (error) {
    console.error('-', key, '-\n', 'Error fetching EDI rules:', error, '\n-', key, '-');
}

    //Transform the header, details, measurements, and names using the rules - handle arrays
    const newHeader = await trfm_Inbound(context, SNF_Header, headerRules, executedAddRowRules);
    
    const detailsResults = await Promise.all(SNF_Details.map(detail => trfm_Inbound(context, detail, detailRules, executedAddRowRules)));
    const newDetails = detailsResults.flat().filter(row => row !== undefined);
    
    const meaResults = await Promise.all(SNF_Mea.map(measurement => trfm_Inbound(context, measurement, meaRules, executedAddRowRules)));
    const newMea = meaResults.flat().filter(row => row !== undefined);

    const namesResults = await Promise.all(SNF_Names.map(name => trfm_Inbound(context, name, nameRules, executedAddRowRules)));
    const newNames = namesResults.flat().filter(row => row !== undefined);

    const tagsResults = await Promise.all(SNF_Tags.map(tag => trfm_Inbound(context, tag, tagRules, executedAddRowRules)));
    const newTags = tagsResults.flat().filter(row => row !== undefined);

    const allowancesChargesResults = await Promise.all(SNF_AllowancesCharges.map(allowanceCharge => trfm_Inbound(context, allowanceCharge, allowancesChargesRules, executedAddRowRules)));
    const newAllowancesCharges = allowancesChargesResults.flat().filter(row => row !== undefined);
  
    await insert810InvexInbound(pool, newHeader, newDetails, newMea, newNames, newTags, newAllowancesCharges);
}

module.exports = {
  transformI810
}
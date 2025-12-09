const { insert870InvexInbound } = require('./I870_insert_Invex.js');
const { trfm_Inbound, resetAddRowTracker } = require('../../functions/transformationInbound.js');

async function transformI870(pool, key) {
  console.log("Transforming I870 with key:", key);
  
  // Reset the ADD_ROW tracker for this  formation
  resetAddRowTracker();
  
    //Fetch the header, details, measurements,names and notes from the database
    const result = await pool.query('SELECT * FROM "870_SNF_Header" WHERE hdr_key = $1', [key]);
    let SNF_Header = result.rows[0];
    
    const result2 = await pool.query('SELECT * FROM "870_SNF_OrderDtl" WHERE dtl_key = $1', [key]);
    let SNF_OrderDtl = result2.rows;

    const result3 = await pool.query('SELECT * FROM "870_SNF_Names" WHERE name_key = $1', [key]);
    let SNF_Names = result3.rows;
    
    const result4 = await pool.query('SELECT * FROM "870_SNF_ChgInDtl" WHERE chgindtl_key = $1', [key]);
    let SNF_ChgInDtl = result4.rows;

    const result5 = await pool.query('SELECT * FROM "870_SNF_ChgInMeasure" WHERE chginmsr_key = $1', [key]);
    let SNF_ChgInMeasure = result5.rows;

    const result6 = await pool.query('SELECT * FROM "870_SNF_ChgInPID" WHERE chginpid_key = $1', [key]);
    let SNF_ChgInPID = result6.rows;
 
    const result7 = await pool.query('SELECT * FROM "870_SNF_ChgOutDtl" WHERE chgoutdtl_key = $1', [key]);
    let SNF_ChgOutDtl = result7.rows;

    const result8 = await pool.query('SELECT * FROM "870_SNF_ChgOutMeasure" WHERE chgoutmsr_key = $1', [key]);
    let SNF_ChgOutMeasure = result8.rows;

    const result9 = await pool.query('SELECT * FROM "870_SNF_ChgOutPID" WHERE chgoutpid_key = $1', [key]);
    let SNF_ChgOutPID = result9.rows;

    const rulesContextHeader = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["870_SNF_Context", "hdr_%"]);
    const rulesContextOrderDtl = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["870_SNF_Context", "ord_%"]);
    const rulesContextNames = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["870_SNF_Context", "name_%"]);
    const rulesContextChgInDtl = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["870_SNF_Context", "chgindtl_%"]);
    const rulesContextChgInMeasure = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["870_SNF_Context", "chginmsr_%"]); 
    const rulesContextChgInPID = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["870_SNF_Context", "chginpid_%"]);
    const rulesContextChgOutDtl = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["870_SNF_Context", "chgoutdtl_%"]);
    const rulesContextChgOutMeasure = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["870_SNF_Context", "chgoutmsr_%"]); 
    const rulesContextChgOutPID = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["870_SNF_Context", "chgoutpid_%"]);

    // Extract the rules for header, details, measurements, names and notes
    const context_Header_rules = rulesContextHeader.rows;
    const context_OrderDtl_rules = rulesContextOrderDtl.rows;
    const context_Names_rules = rulesContextNames.rows;
    const context_ChgInDtl_rules = rulesContextChgInDtl.rows;
    const context_ChgInMeasure_rules = rulesContextChgInMeasure.rows;
    const context_ChgInPID_rules = rulesContextChgInPID.rows; 
    const context_ChgOutDtl_rules = rulesContextChgOutDtl.rows;
    const context_ChgOutMeasure_rules = rulesContextChgOutMeasure.rows;
    const context_ChgOutPID_rules = rulesContextChgOutPID.rows; 

    const context = {SNF_Header, SNF_OrderDtl, SNF_Names, SNF_ChgInDtl, SNF_ChgInMeasure, SNF_ChgInPID, SNF_ChgOutDtl, SNF_ChgOutMeasure, SNF_ChgOutPID};

    // Transform the context using the rules
    context.SNF_Header = await trfm_Inbound(context, context.SNF_Header, context_Header_rules);
    SNF_Header = context.SNF_Header;

    // Handle potential arrays returned from transformations - flatten results
    const contextOrderDtlResults = await Promise.all(context.SNF_OrderDtl.map(OrderDtl => trfm_Inbound(context, OrderDtl, context_OrderDtl_rules)));
    context.SNF_OrderDtl = contextOrderDtlResults.flat().filter(row => row !== undefined);
    SNF_OrderDtl = context.SNF_OrderDtl;

    const contextNamesResults = await Promise.all(context.SNF_Names.map(name => trfm_Inbound(context, name, context_Names_rules)));
    context.SNF_Names = contextNamesResults.flat().filter(row => row !== undefined);
    SNF_Names = context.SNF_Names;

    const contextChgInDtlResults = await Promise.all(context.SNF_ChgInDtl.map(ChgInDtl => trfm_Inbound(context, ChgInDtl, context_ChgInDtl_rules)));
    context.SNF_ChgInDtl = contextChgInDtlResults.flat().filter(row => row !== undefined);
    SNF_ChgInDtl = context.SNF_ChgInDtl;

    const contextChgInMeasureResults = await Promise.all(context.SNF_ChgInMeasure.map(ChgInMeasure => trfm_Inbound(context, ChgInMeasure, context_ChgInMeasure_rules)));
    context.SNF_ChgInMeasure = contextChgInMeasureResults.flat().filter(row => row !== undefined);
    SNF_ChgInMeasure = context.SNF_ChgInMeasure;

    const contextChgInPIDResults = await Promise.all(context.SNF_ChgInPID.map(ChgInPID => trfm_Inbound(context, ChgInPID, context_ChgInPID_rules)));
    context.SNF_ChgInPID = contextChgInPIDResults.flat().filter(row => row !== undefined);
    SNF_ChgInPID = context.SNF_ChgInPID;

    const contextChgOutDtlResults = await Promise.all(context.SNF_ChgOutDtl.map(ChgOutDtl => trfm_Inbound(context, ChgOutDtl, context_ChgOutDtl_rules)));
    context.SNF_ChgOutDtl = contextChgOutDtlResults.flat().filter(row => row !== undefined);
    SNF_ChgOutDtl = context.SNF_ChgOutDtl;

    const contextChgOutMeasureResults = await Promise.all(context.SNF_ChgOutMeasure.map(ChgOutMeasure => trfm_Inbound(context, ChgOutMeasure, context_ChgOutMeasure_rules)));
    context.SNF_ChgOutMeasure = contextChgOutMeasureResults.flat().filter(row => row !== undefined);
    SNF_ChgOutMeasure = context.SNF_ChgOutMeasure;

    const contextChgOutPIDResults = await Promise.all(context.SNF_ChgOutPID.map(ChgOutPID => trfm_Inbound(context, ChgOutPID, context_ChgOutPID_rules)));
    context.SNF_ChgOutPID = contextChgOutPIDResults.flat().filter(row => row !== undefined);
    SNF_ChgOutPID = context.SNF_ChgOutPID;

// Fetch the EDI rules for header, details, measurements, and names
let headerRules = [], OrderDtlRules = [], nameRules = [], ChgInDtlRules = [], ChgInMeasureRules = [], ChgInPIDRules = [], ChgOutDtlRules = [], ChgOutMeasureRules = [], ChgOutPIDRules = [];
try {
    const rulesHeader = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["870_SNF_Header"]); 
    const rulesOrderDtl = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["870_SNF_OrderDtl"]);
    const rulesNames = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["870_SNF_Names"]);
    const rulesChgInDtl = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["870_SNF_ChgInDtl"]);
    const rulesChgInMeasure = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["870_SNF_ChgInMeasure"]);
    const rulesChgInPID = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["870_SNF_ChgInPID"]);
    const rulesChgOutDtl = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["870_SNF_ChgOutDtl"]);
    const rulesChgOutMeasure = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["870_SNF_ChgOutMeasure"]);
    const rulesChgOutPID = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["870_SNF_ChgOutPID"]);

    headerRules = rulesHeader.rows;
    OrderDtlRules = rulesOrderDtl.rows;
    nameRules = rulesNames.rows;
    ChgInDtlRules = rulesChgInDtl.rows;
    ChgInMeasureRules = rulesChgInMeasure.rows;
    ChgInPIDRules = rulesChgInPID.rows;
    ChgOutDtlRules = rulesChgOutDtl.rows;
    ChgOutMeasureRules = rulesChgOutMeasure.rows;
    ChgOutPIDRules = rulesChgOutPID.rows;

} catch (error) {
    console.error('-', key, '-\n', 'Error fetching EDI rules:', error, '\n-', key, '-');
}

    //Transform the header, OrderDtl, names and ChgIn, ChgOut using the rules - handle arrays
    const newHeader = await trfm_Inbound(context, SNF_Header, headerRules);
    
    const OrderDtlResults = await Promise.all(SNF_OrderDtl.map(OrderDtl => trfm_Inbound(context, OrderDtl, OrderDtlRules)));
    const newOrderDtl = OrderDtlResults.flat().filter(row => row !== undefined);
 
    const namesResults = await Promise.all(SNF_Names.map(name => trfm_Inbound(context, name, nameRules)));
    const newNames = namesResults.flat().filter(row => row !== undefined);    

    const ChgInDtlResults = await Promise.all(SNF_ChgInDtl.map(ChgInDtl => trfm_Inbound(context, ChgInDtl, ChgInDtlRules)));
    const newChgInDtl = ChgInDtlResults.flat().filter(row => row !== undefined);

    const ChgInMeasureResults = await Promise.all(SNF_ChgInMeasure.map(ChgInMeasure => trfm_Inbound(context, ChgInMeasure, ChgInMeasureRules)));
    const newChgInMeasure = ChgInMeasureResults.flat().filter(row => row !== undefined);

    const ChgInPIDResults = await Promise.all(SNF_ChgInPID.map(ChgInPID => trfm_Inbound(context, ChgInPID, ChgInPIDRules)));
    const newChgInPID = ChgInPIDResults.flat().filter(row => row !== undefined);

    const ChgOutDtlResults = await Promise.all(SNF_ChgOutDtl.map(ChgOutDtl => trfm_Inbound(context, ChgOutDtl, ChgOutDtlRules)));
    const newChgOutDtl = ChgOutDtlResults.flat().filter(row => row !== undefined);

    const ChgOutMeasureResults = await Promise.all(SNF_ChgOutMeasure.map(ChgOutMeasure => trfm_Inbound(context, ChgOutMeasure, ChgOutMeasureRules)));
    const newChgOutMeasure = ChgOutMeasureResults.flat().filter(row => row !== undefined);

    const ChgOutPIDResults = await Promise.all(SNF_ChgOutPID.map(ChgOutPID => trfm_Inbound(context, ChgOutPID, ChgOutPIDRules)));
    const newChgOutPID = ChgOutPIDResults.flat().filter(row => row !== undefined);

    await insert870InvexInbound(pool, newHeader, newOrderDtl, newNames, newChgInDtl, newChgInMeasure, newChgInPID, newChgOutDtl, newChgOutMeasure, newChgOutPID); 
}

module.exports = {
  transformI870
}
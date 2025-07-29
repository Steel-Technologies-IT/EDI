//const { insert863InvexInbound } = require('./I863_insert_Invex.js');
const { trfm_Inbound, resetAddRowTracker } = require('../../functions/transformationInbound.js');
//const { insert863InvexInbound } = require('./I863_insert_Invex.js');

async function transformI863(pool, key) {
  console.log("Transforming I863 with key:", key);
  
  // Reset the ADD_ROW tracker for this  formation
  resetAddRowTracker();
  
    //Fetch the header, details, measurements,names and notes from the database
    const result = await pool.query('SELECT * FROM "863_SNF_Header" WHERE hdr_key = $1', [key]);
    let SNF_Header = result.rows[0];
    //console.log('SNF_Header:', SNF_Header);
    
    const result2 = await pool.query('SELECT * FROM "863_SNF_Detail" WHERE dtl_key = $1', [key]);
    let SNF_Details = result2.rows;
    //console.log('SNF_Details:', SNF_Details);

    const result3 = await pool.query('SELECT * FROM "863_SNF_DetailNotes" WHERE dtln_key = $1', [key]);
    let SNF_DetailNotes = result3.rows;
    console.log('SNF_DetailNotes:', SNF_DetailNotes);

    const result4 = await pool.query('SELECT * FROM "863_SNF_Measure" WHERE msr_key = $1', [key]);
    let SNF_Measurements = result4.rows;
    //console.log('SNF_Measurements:', SNF_Measurements);

    const result5 = await pool.query('SELECT * FROM "863_SNF_Names" WHERE name_key = $1', [key]);
    let SNF_Names = result5.rows;
    //console.log('SNF_Names:', SNF_Names);

    const result6 = await pool.query('SELECT * FROM "863_SNF_Notes" WHERE note_key = $1', [key]);
    let SNF_Notes = result6.rows;
    //console.log('SNF_Notes:', SNF_Notes);

    const rulesContextHeader = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "hdr_%"]);
    const rulesContextDetails = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "dtl_%"]);
    const rulesContextDetailNotes = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "dtln_%"]);
    const rulesContextMeasurements = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "msr_%"]);
    const rulesContextNames = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "name_%"]);
    const rulesContextNotes = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "note_%"]);


    // Extract the rules for header, details, measurements, names and notes
    const context_Header_rules = rulesContextHeader.rows;
    const context_Details_rules = rulesContextDetails.rows;
    const context_DetailNotes_rules = rulesContextDetailNotes.rows;
    const context_Measurements_rules = rulesContextMeasurements.rows;
    const context_Names_rules = rulesContextNames.rows;
    const context_Notes_rules = rulesContextNotes.rows; 

    const context = {SNF_Header, SNF_Details, SNF_DetailNotes, SNF_Measurements, SNF_Names, SNF_Notes};

    // Transform the context using the rules
    context.SNF_Header = await trfm_Inbound(context, context.SNF_Header, context_Header_rules);
    SNF_Header = context.SNF_Header;

    // Handle potential arrays returned from transformations - flatten results
    const contextDetailsResults = await Promise.all(context.SNF_Details.map(detail => trfm_Inbound(context, detail, context_Details_rules)));
    context.SNF_Details = contextDetailsResults.flat().filter(row => row !== undefined);
    SNF_Details = context.SNF_Details;

    const contextDetailNotesResults = await Promise.all(context.SNF_DetailNotes.map(detailNote => trfm_Inbound(context, detailNote, context_DetailNotes_rules)));
    context.SNF_DetailNotes = contextDetailNotesResults.flat().filter(row => row !== undefined);
    SNF_DetailNotes = context.SNF_DetailNotes;

    const contextMeasurementsResults = await Promise.all(context.SNF_Measurements.map(measurement => trfm_Inbound(context, measurement, context_Measurements_rules)));
    context.SNF_Measurements = contextMeasurementsResults.flat().filter(row => row !== undefined);
    SNF_Measurements = context.SNF_Measurements;

    const contextNamesResults = await Promise.all(context.SNF_Names.map(name => trfm_Inbound(context, name, context_Names_rules)));
    context.SNF_Names = contextNamesResults.flat().filter(row => row !== undefined);
    SNF_Names = context.SNF_Names;

    const contextNotesResults = await Promise.all(context.SNF_Notes.map(Note => trfm_Inbound(context, Note, context_Notes_rules)));
    context.SNF_Notes = contextNotesResults.flat().filter(row => row !== undefined);
    SNF_Notes = context.SNF_Notes;

// Fetch the EDI rules for header, details, measurements, and names
let headerRules = [], detailRules = [], detailNotesRules = [], measureRules = [], nameRules = [], notesRules = [];
try {
    const rulesHeader = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["863_SNF_Header"]); 
    const rulesDetail = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["863_SNF_Detail"]);
    const rulesDetailNotes = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["863_SNF_DetailNotes"]);
    const rulesMeasure = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["863_SNF_Measure"]);
    const rulesNames = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["863_SNF_Names"]);
    const rulesNotes = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["863_SNF_Notes"]);

    headerRules = rulesHeader.rows;
    detailRules = rulesDetail.rows;
    detailNotesRules = rulesDetailNotes.rows;
    measureRules = rulesMeasure.rows;
    nameRules = rulesNames.rows;
    notesRules = rulesNotes.rows;

} catch (error) {
    console.error('-', key, '-\n', 'Error fetching EDI rules:', error, '\n-', key, '-');
}

    //Transform the header, details, measurements, and names using the rules - handle arrays
    const newHeader = await trfm_Inbound(context, SNF_Header, headerRules);
    
    const detailsResults = await Promise.all(SNF_Details.map(detail => trfm_Inbound(context, detail, detailRules)));
    const newDetails = detailsResults.flat().filter(row => row !== undefined);
    
    const detailNotesResults = await Promise.all(SNF_DetailNotes.map(detailNote => trfm_Inbound(context, detailNote, detailNotesRules)));
    const newDetailNotes = detailNotesResults.flat().filter(row => row !== undefined);

    const measurementsResults = await Promise.all(SNF_Measurements.map(measurement => trfm_Inbound(context, measurement, measureRules)));
    const newMeasurements = measurementsResults.flat().filter(row => row !== undefined);

    const namesResults = await Promise.all(SNF_Names.map(name => trfm_Inbound(context, name, nameRules)));
    const newNames = namesResults.flat().filter(row => row !== undefined);

    const notesResults = await Promise.all(SNF_Notes.map(note => trfm_Inbound(context, note, notesRules)));
    const newNotes = notesResults.flat().filter(row => row !== undefined);

   // await insert863InvexInbound(pool, newHeader, newDetails, newMeasurements, newNames, newNotes, newDetailNotes); commented out for now  
}

module.exports = {
  transformI863
}
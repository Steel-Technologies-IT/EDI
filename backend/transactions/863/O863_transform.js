const { get863InterchangeControl, get863TransactionSet, get863ShipmentHeader, get863ShipmentItem, get863ProductItem, get863MetalStandards, get863Chemistry, get863PhysicalTests, get863Jominy, get863HeatTreatment, get863Impact, get863MicroInclusion, get863QDSInstructions, get863ProductItemInstructions, get863ProductItemNameAddress, get863ItemInstructions, get863HeaderNameAddress, get863TransactionErrors} = require('./O863_retrieve.js');
const { trfm_Outbound } = require('../../functions/transformationOutbound.js');
const { LoadO863SNF } = require('./O863_insert_SNF.js');


async function transformO863(pool, keyPK, flag, filePath) {
   console.log("Transforming I863 with key:", keyPK); 




   // Fetch the data from the database
   let InterchangeControl = await get863InterchangeControl(pool, keyPK, filePath); //
   let TransactionSet = await get863TransactionSet(pool, keyPK, filePath); //
   let ShipmentHeader = await get863ShipmentHeader(pool, keyPK, filePath);  //
   let HeaderNameAddress = await get863HeaderNameAddress(pool, keyPK, filePath); //
   let Item = await get863ShipmentItem(pool, keyPK, filePath); //
   let ItemInstructions = await get863ItemInstructions(pool, keyPK, filePath); //
   let ProductItem = await get863ProductItem(pool, keyPK, filePath); //
   let MetalStandardsData = await get863MetalStandards(pool, keyPK, filePath); //
   let PhysicalTestsData = await get863PhysicalTests(pool, keyPK, filePath); //
   let JominyData = await get863Jominy(pool, keyPK, filePath);  //
   let HeatTreatmentData = await get863HeatTreatment(pool, keyPK, filePath); //
   let ImpactData = await get863Impact(pool, keyPK, filePath);  //
   let MicroInclusionData = await get863MicroInclusion(pool, keyPK, filePath); //
   let QDSInstructionsData = await get863QDSInstructions(pool, keyPK, filePath); //
   let Chemistries = await get863Chemistry(pool, keyPK, filePath); //
   let ProductInstructions = await get863ProductItemInstructions(pool, keyPK, filePath); //
   let ProductItemNameAddress = await get863ProductItemNameAddress(pool, keyPK, filePath); //
   let Errors = await get863TransactionErrors(pool, keyPK, filePath); //

   // Create the context object with all the data
   const context = {
    InterchangeControl, TransactionSet, ShipmentHeader, HeaderNameAddress, Item,
    ItemInstructions, ProductItem, MetalStandardsData, PhysicalTestsData, JominyData, HeatTreatmentData, ImpactData, MicroInclusionData, QDSInstructionsData, Chemistries, ProductInstructions, ProductItemNameAddress, Errors
   };

    // Transform the context using the rules
    const rulesInterchangeControl = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "ictl_%"]);
    const rulesTransactionSet = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "txs_%"]);
    const rulesShipmentHeader = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "ish_%"]);
    const rulesHeaderNameAddress = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_Invex_HeaderNameAddress", "hdna_%"]);
    const rulesItem = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "shp_%"]);
    const rulesItemInstructions = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "itin_%"]);
    const rulesProductItem = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "prd_%"]);
    const rulesMetalStandards = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_Invex_MetalStandards", "mstd_%"]);
    const rulesPhysicalTests = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_Invex_PhysicalTests", "phts_%"]);
    const rulesJominy = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "jmny_%"]);
    const rulesHeatTreatment = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "htrt_%"]);
    const rulesImpact = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "imp_%"]);
    const rulesMicroInclusion = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "micl_%"]);
    const rulesQDSInstructions = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "qdsi_%"]);
    
    
    const rulesChemistries = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "chm_%"]);
    const rulesProductInstructions = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "prii_%"]);
    const rulesProductItemNameAddress = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_Invex_ProductItemNameAddress", "prna_%"]);          
    const rulesErrors = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["863_SNF_Context", "txer_%"]);

    //Transform Reference Data
    context.InterchangeControl = await trfm_Outbound(context, context.InterchangeControl, rulesInterchangeControl.rows);
    context.TransactionSet = await Promise.all(context.TransactionSet.map(tx => trfm_Outbound(context, tx, rulesTransactionSet.rows)));
    context.ShipmentHeader = await Promise.all(context.ShipmentHeader.map(sh => trfm_Outbound(context, sh, rulesShipmentHeader.rows)));
    context.HeaderNameAddress = await Promise.all(context.HeaderNameAddress.map(hna => trfm_Outbound(context, hna, rulesHeaderNameAddress.rows)));
    context.Item = await Promise.all(context.Item.map(item => trfm_Outbound(context, item   , rulesItem.rows)));
    context.ItemInstructions = await Promise.all(context.ItemInstructions.map(ii => trfm_Outbound(context, ii, rulesItemInstructions.rows)));
    context.ProductItem = await Promise.all(context.ProductItem.map(pi => trfm_Outbound(context, pi, rulesProductItem.rows)));
    context.MetalStandardsData = await Promise.all(context.MetalStandardsData.map(ms => trfm_Outbound(context, ms, rulesMetalStandards.rows)));
    context.PhysicalTestsData = await Promise.all(context.PhysicalTestsData.map(pt => trfm_Outbound(context, pt, rulesPhysicalTests.rows)));    
    context.JominyData = await Promise.all(context.JominyData.map(jm => trfm_Outbound(context, jm, rulesJominy.rows)));
    context.HeatTreatmentData = await Promise.all(context.HeatTreatmentData.map(ht => trfm_Outbound(context, ht, rulesHeatTreatment.rows)));
    context.ImpactData = await Promise.all(context.ImpactData.map(ip => trfm_Outbound(context, ip, rulesImpact.rows)));
    context.MicroInclusionData = await Promise.all(context.MicroInclusionData.map(mi => trfm_Outbound(context, mi, rulesMicroInclusion.rows)));
    context.QDSInstructionsData = await Promise.all(context.QDSInstructionsData.map(qd => trfm_Outbound(context, qd, rulesQDSInstructions.rows)));

    context.Chemistries = await Promise.all(context.Chemistries.map(ch => trfm_Outbound(context, ch, rulesChemistries.rows)));
    context.ProductInstructions = await Promise.all(context.ProductInstructions.map(pi => trfm_Outbound(context, pi, rulesProductInstructions.rows)));
    context.ProductItemNameAddress = await Promise.all(context.ProductItemNameAddress.map(pina => trfm_Outbound(context, pina, rulesProductItemNameAddress.rows)));
    context.Errors = await Promise.all(context.Errors.map(err => trfm_Outbound(context, err, rulesErrors.rows)));

    //Set transformed context back to the original variables
   InterchangeControl = context.InterchangeControl;
   TransactionSet = context.TransactionSet;
   ShipmentHeader = context.ShipmentHeader;
   HeaderNameAddress = context.HeaderNameAddress;
   Item = context.Item;
   ItemInstructions = context.ItemInstructions;
   ProductItem = context.ProductItem;
   MetalStandards = context.MetalStandardsData;
   PhysicalTests = context.PhysicalTestsData;
   Jominy = context.JominyData;
   HeatTreatment = context.HeatTreatmentData;
   Impact = context.ImpactData;
   MicroInclusion = context.MicroInclusionData;
   QDSInstructions = context.QDSInstructionsData;
   Chemistries = context.Chemistries;
   ProductInstructions = context.ProductInstructions;
   ProductItemNameAddress = context.ProductItemNameAddress;
   Errors = context.Errors;



   //Get rules for each object
   let InterchangeControlRules = [], TransactionSetRules = [], ShipmentHeaderRules = [], HeaderNameAddressRules = [], ItemRules = [], ItemInstructionsRules = [], ProductItemRules = [], MetalStandardsRules = [], PhysicalTestsRules = [], JominyRules = [], HeatTreatmentRules = [], ImpactRules = [], MicroInclusionRules = [], QDSInstructionsRules = [], ChemistriesRules = [], ProductInstructionsRules = [], ProductItemNameAddressRules = [], ErrorsRules = [];
try {
    const rulesInterchangeControl = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_InterchangeControl"]); 
    const rulesTransactionSet = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_TransactionSet"]);
    const rulesShipmentHeader = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_ShipmentHeaderTestResult"]);
    const rulesHeaderNameAddress = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_HeaderNameAddress"]);
    const rulesItem = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_ShipmentItemTestResult"]); 
    const rulesItemInstructions = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_ItemInstructions"]);
    const rulesProductItem = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_ProductItem"]);
    const rulesMetalStandards = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_MetalStandards"]);
    const rulesPhysicalTests = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_PhysicalTests"]);
    const rulesJominy = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_Jominy"]);
    const rulesHeatTreatment = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_HeatTreatment"]);
    const rulesImpact = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_Impact"]);
    const rulesMicroInclusion = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_MicroInclusion"]);
    const rulesQDSInstructions = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_QDSInstructions"]);
    const rulesChemistries = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_Chemistry"]);
    const rulesProductInstructions = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_ProductInstructions"]);
    const rulesProductItemNameAddress = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_ProductItemNameAddress"]);
    const rulesErrors = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1', ["863_Invex_TransactionErrors"]);

    //Set Rules
    InterchangeControlRules = rulesInterchangeControl.rows;
    TransactionSetRules = rulesTransactionSet.rows;
    ShipmentHeaderRules = rulesShipmentHeader.rows;
    HeaderNameAddressRules = rulesHeaderNameAddress.rows;
    ItemRules = rulesItem.rows;
    ItemInstructionsRules = rulesItemInstructions.rows;
    ProductItemRules = rulesProductItem.rows;
    MetalStandardsRules = rulesMetalStandards.rows;
    PhysicalTestsRules = rulesPhysicalTests.rows;
    JominyRules = rulesJominy.rows;
    HeatTreatmentRules = rulesHeatTreatment.rows;
    ImpactRules = rulesImpact.rows;
    MicroInclusionRules = rulesMicroInclusion.rows;
    QDSInstructionsRules = rulesQDSInstructions.rows;
    ChemistriesRules = rulesChemistries.rows;
    ProductInstructionsRules = rulesProductInstructions.rows;
    ProductItemNameAddressRules = rulesProductItemNameAddress.rows;
    ErrorsRules = rulesErrors.rows;

} catch (error) {
          const readableErrorMessage = readableErrors(error, keyPK, filePath);
          console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
}

// Transform the data using the rules
const newInterchangeControl = await trfm_Outbound(context, InterchangeControl, InterchangeControlRules);
const transactionSetResults = await Promise.all(TransactionSet.map(tx => trfm_Outbound(context, tx, TransactionSetRules)));
const newTransactionSet = transactionSetResults.flat().filter(row => row !== undefined);
const shipmentHeaderResults = await Promise.all(ShipmentHeader.map(sh => trfm_Outbound(context, sh, ShipmentHeaderRules)));
const newShipmentHeader = shipmentHeaderResults.flat().filter(row => row !== undefined);
const headerNameAddressResults = await Promise.all(HeaderNameAddress.map(hna => trfm_Outbound(context, hna, HeaderNameAddressRules)));
const newHeaderNameAddress = headerNameAddressResults.flat().filter(row => row !== undefined);
const itemResults = await Promise.all(Item.map(item => trfm_Outbound(context, item, ItemRules)));
const newItem = itemResults.flat().filter(row => row !== undefined);
const itemInstructionsResults = await Promise.all(ItemInstructions.map(ii => trfm_Outbound(context, ii, ItemInstructionsRules)));
const newItemInstructions = itemInstructionsResults.flat().filter(row => row !== undefined);
const productItemResults = await Promise.all(ProductItem.map(pi => trfm_Outbound(context, pi, ProductItemRules)));
const newMetalStandards = await Promise.all(MetalStandardsData.map(ms => trfm_Outbound(context, ms, MetalStandardsRules)));
const newPhysicalTests = await Promise.all(PhysicalTestsData.map(pt => trfm_Outbound(context, pt, PhysicalTestsRules)));
const newJominy = await Promise.all(JominyData.map(jm => trfm_Outbound(context, jm, JominyRules)));
const newHeatTreatment = await Promise.all(HeatTreatmentData.map(ht => trfm_Outbound(context, ht, HeatTreatmentRules)));
const newImpact = await Promise.all(ImpactData.map(ip => trfm_Outbound(context, ip, ImpactRules)));
const newMicroInclusion = await Promise.all(MicroInclusionData.map(mi => trfm_Outbound(context, mi, MicroInclusionRules)));
const newQDSInstructions = await Promise.all(QDSInstructionsData.map(qd => trfm_Outbound(context, qd, QDSInstructionsRules)));
const newProductItem = productItemResults.flat().filter(row => row !== undefined);
const chemistriesResults = await Promise.all(Chemistries.map(c => trfm_Outbound(context, c, ChemistriesRules)));
const newChemistries = chemistriesResults.flat().filter(row => row !== undefined);
const productInstructionsResults = await Promise.all(ProductInstructions.map(pi => trfm_Outbound(context, pi, ProductInstructionsRules)));
const newProductInstructions = productInstructionsResults.flat().filter(row => row !== undefined);
const productItemNameAddressResults = await Promise.all(ProductItemNameAddress.map(pina => trfm_Outbound(context, pina, ProductItemNameAddressRules)));
const newProductItemNameAddress = productItemNameAddressResults.flat().filter(row => row !== undefined);
const errorsResults = await Promise.all(Errors.map(e => trfm_Outbound(context, e, ErrorsRules)));
const newErrors = errorsResults.flat().filter(row => row !== undefined);


global.CustomerID = newProductItem[0].prd_partcustomerid

console.log("Customer ID:", global.CustomerID);
    await LoadO863SNF(pool, newInterchangeControl, newTransactionSet, newShipmentHeader, newHeaderNameAddress, newItem, newItemInstructions, newProductItem, newChemistries, newPhysicalTests, newJominy, newHeatTreatment, newImpact, newMicroInclusion, newQDSInstructions, newProductItemNameAddress, newErrors, flag, filePath);
}


module.exports = {  
    transformO863
};

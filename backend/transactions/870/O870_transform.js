const { get870InterchangeControl, get870ProductionReportingHeader, get870HeaderNameAddress, get870HeaderInstructions, get870NonRecordedScrapItems, get870ProductItem, get870ProductItemInstructions, get870ProductItemNameAddress, get870Damages, get870TransactionErrors, get870TransactionSet} = require('./O870_retrieve.js');
const { trfm_Outbound } = require('../../functions/transformationOutbound.js');
const { LoadO870SNF } = require('./O870_insert_SNF.js');


async function transformO870(pool, keyPK, flag, filePath) {
   console.log("Transforming I870 with key:", keyPK); 

   // Fetch the data from the database
   let InterchangeControl = await get870InterchangeControl(pool, keyPK, filePath); //
   let ProductionReportingHeader = await get870ProductionReportingHeader(pool, keyPK, filePath); //
   let HeaderNameAddress = await get870HeaderNameAddress(pool, keyPK, filePath); //
   let HeaderInstructions = await get870HeaderInstructions(pool, keyPK, filePath); //
   let NonRecordedScrapItems = await get870NonRecordedScrapItems(pool, keyPK, filePath); //
   let ProductItem = await get870ProductItem(pool, keyPK, filePath); //
   let ProductInstructions = await get870ProductItemInstructions(pool, keyPK, filePath); //
   let ProductItemNameAddress = await get870ProductItemNameAddress(pool, keyPK, filePath); //
   let Damages = await get870Damages(pool, keyPK, filePath); //
   let Errors = await get870TransactionErrors(pool, keyPK, filePath); //
   let TransactionSet = await get870TransactionSet(pool, keyPK, filePath); //

   // Create the context object with all the data
   const context = {
    InterchangeControl, ProductionReportingHeader, HeaderNameAddress, HeaderInstructions, NonRecordedScrapItems, ProductItem, ProductInstructions, ProductItemNameAddress, Damages, Errors, TransactionSet
   };

    // Transform the context using the rules
    const customerId = `${ProductItem[0].prd_partcustomerid}`;

    const rulesInterchangeControl = await pool.query(
        'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)', 
        ["870_SNF_Context", "ictl_%", customerId, "ALL"]
    );
    const rulesProductionReportingHeader = await pool.query(
        'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)', 
        ["870_SNF_Context", "prdhdr_%", customerId, "ALL"]
    );
    const rulesHeaderNameAddress = await pool.query(
        'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)', 
        ["870_SNF_Context", "hdna_%", customerId, "ALL"]
    );
    const rulesHeaderInstructions = await pool.query(
        'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)', 
        ["870_SNF_Context", "hdin_%", customerId, "ALL"]
    );
    const rulesNonRecordedScrapItems = await pool.query(
        'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)', 
        ["870_SNF_Context", "nrscr_%", customerId, "ALL"]
    );
    const rulesProductItem = await pool.query(
        'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)', 
        ["870_SNF_Context", "prd_%", customerId, "ALL"]
    );
    const rulesProductInstructions = await pool.query(
        'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)', 
        ["870_SNF_Context", "prii_%", customerId, "ALL"]
    );
    const rulesProductItemNameAddress = await pool.query(
        'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)', 
        ["870_SNF_Context", "prna_%", customerId, "ALL"]
    );          
    const rulesDamages = await pool.query(
        'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)', 
        ["870_SNF_Context", "dmg_%", customerId, "ALL"]
    );          
    const rulesErrors = await pool.query(
        'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)', 
        ["870_SNF_Context", "txer_%", customerId, "ALL"]
    );
    const rulesTransactionSet = await pool.query(
        'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)', 
        ["870_SNF_Context", "txs_%", customerId, "ALL"]
    );

    //Transform Reference Data
    context.InterchangeControl = await trfm_Outbound(context, context.InterchangeControl, rulesInterchangeControl.rows);
    context.ProductionReportingHeader = await Promise.all(context.ProductionReportingHeader.map(prh => trfm_Outbound(context, prh, rulesProductionReportingHeader.rows)));
    context.HeaderNameAddress = await Promise.all(context.HeaderNameAddress.map(hna => trfm_Outbound(context, hna, rulesHeaderNameAddress.rows)));
    context.HeaderInstructions = await Promise.all(context.HeaderInstructions.map(hins => trfm_Outbound(context, hins, rulesHeaderInstructions.rows)));
    context.NonRecordedScrapItems = await Promise.all(context.NonRecordedScrapItems.map(nrsi => trfm_Outbound(context, nrsi, rulesNonRecordedScrapItems.rows)));
    context.ProductItem = await Promise.all(context.ProductItem.map(pi => trfm_Outbound(context, pi, rulesProductItem.rows)));
    context.ProductInstructions = await Promise.all(context.ProductInstructions.map(pi => trfm_Outbound(context, pi, rulesProductInstructions.rows)));
    context.ProductItemNameAddress = await Promise.all(context.ProductItemNameAddress.map(pina => trfm_Outbound(context, pina, rulesProductItemNameAddress.rows)));
    context.Damages = await Promise.all(context.Damages.map(dmg => trfm_Outbound(context, dmg, rulesDamages.rows)));
    context.Errors = await Promise.all(context.Errors.map(err => trfm_Outbound(context, err, rulesErrors.rows)));
    context.TransactionSet = await Promise.all(context.TransactionSet.map(tx => trfm_Outbound(context, tx, rulesTransactionSet.rows)));

    //Set transformed context back to the original variables
   InterchangeControl = context.InterchangeControl;
   ProductionReportingHeader = context.ProductionReportingHeader;
   HeaderNameAddress = context.HeaderNameAddress;
   HeaderInstructions = context.HeaderInstructions;
   NonRecordedScrapItems = context.NonRecordedScrapItems;
   ProductItem = context.ProductItem;
   ProductInstructions = context.ProductInstructions;
   ProductItemNameAddress = context.ProductItemNameAddress;
   Damages = context.Damages;
   Errors = context.Errors;
   TransactionSet = context.TransactionSet;

   //Get rules for each object
   let InterchangeControlRules = [], ProductionReportingHeaderRules = [], HeaderNameAddressRules = [], HeaderInstructionsRules = [], NonRecordedScrapItemsRules = [], ProductItemRules = [], ProductInstructionsRules = [], ProductItemNameAddressRules = [], DamagesRules = [], ErrorsRules = [], TransactionSetRules = [];
try {
    const rulesInterchangeControl = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["870_Invex_InterchangeControl", `${ProductItem[0].prd_partcustomerid}`, 'ALL']); 
    const rulesProductionReportingHeader = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["870_Invex_ProductionReportingHeader", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesHeaderNameAddress = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["870_Invex_HeaderNameAddress", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesHeaderInstructions = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["870_Invex_HeaderInstructions", `${ProductItem[0].prd_partcustomerid}`, 'ALL']); 
    const rulesNonRecordedScrapItems = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["870_Invex_NonRecordedScrapItems", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesProductItem = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["870_Invex_ProductItem", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesProductInstructions = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["870_Invex_ProductInstructions", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesProductItemNameAddress = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["870_Invex_ProductItemNameAddress", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesDamages = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["870_Invex_Damages", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesErrors = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["870_Invex_TransactionErrors", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesTransactionSet = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["870_Invex_TransactionSet", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    
    //Set Rules
    InterchangeControlRules = rulesInterchangeControl.rows;
    ProductionReportingHeaderRules = rulesProductionReportingHeader.rows;
    HeaderNameAddressRules = rulesHeaderNameAddress.rows;
    HeaderInstructionsRules = rulesHeaderInstructions.rows;
    NonRecordedScrapItemsRules = rulesNonRecordedScrapItems.rows;
    ProductItemRules = rulesProductItem.rows;
    ProductInstructionsRules = rulesProductInstructions.rows;
    ProductItemNameAddressRules = rulesProductItemNameAddress.rows;
    DamagesRules = rulesDamages.rows;
    ErrorsRules = rulesErrors.rows;
    TransactionSetRules = rulesTransactionSet.rows;

} catch (error) {
          const readableErrorMessage = readableErrors(error, keyPK, filePath);
          console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
}

// Transform the data using the rules
const newInterchangeControl = await trfm_Outbound(context, InterchangeControl, InterchangeControlRules);

const productionReportingHeaderResults = await Promise.all(ProductionReportingHeader.map(prh => trfm_Outbound(context, prh, ProductionReportingHeaderRules)));
const newProductionReportingHeader = productionReportingHeaderResults.flat().filter(row => row !== undefined);
const headerNameAddressResults = await Promise.all(HeaderNameAddress.map(hna => trfm_Outbound(context, hna, HeaderNameAddressRules)));
const newHeaderNameAddress = headerNameAddressResults.flat().filter(row => row !== undefined);
const headerInstructionsResults = await Promise.all(HeaderInstructions.map(hi => trfm_Outbound(context, hi, HeaderInstructionsRules)));
const newHeaderInstructions = headerInstructionsResults.flat().filter(row => row !== undefined);
const nonRecordedScrapItemsResults = await Promise.all(NonRecordedScrapItems.map(nrsi => trfm_Outbound(context, nrsi, NonRecordedScrapItemsRules)));
const newNonRecordedScrapItems = nonRecordedScrapItemsResults.flat().filter(row => row !== undefined);
const productItemResults = await Promise.all(ProductItem.map(pi => trfm_Outbound(context, pi, ProductItemRules)));
const newProductItem = productItemResults.flat().filter(row => row !== undefined);
const productInstructionsResults = await Promise.all(ProductInstructions.map(pi => trfm_Outbound(context, pi, ProductInstructionsRules)));
const newProductInstructions = productInstructionsResults.flat().filter(row => row !== undefined);
const productItemNameAddressResults = await Promise.all(ProductItemNameAddress.map(pina => trfm_Outbound(context, pina, ProductItemNameAddressRules)));
const newProductItemNameAddress = productItemNameAddressResults.flat().filter(row => row !== undefined);
const damagesResults = await Promise.all(Damages.map(d => trfm_Outbound(context, d, DamagesRules)));
const newDamages = damagesResults.flat().filter(row => row !== undefined);
const errorsResults = await Promise.all(Errors.map(e => trfm_Outbound(context, e, ErrorsRules)));
const newErrors = errorsResults.flat().filter(row => row !== undefined);
const transactionSetResults = await Promise.all(TransactionSet.map(tx => trfm_Outbound(context, tx, TransactionSetRules)));
const newTransactionSet = transactionSetResults.flat().filter(row => row !== undefined);

const CustomerID = newProductItem[0].prd_partcustomerid || null;
const Branch = newInterchangeControl.ictl_invexbranchcode || null;
console.log("Customer ID:", CustomerID);
    await LoadO870SNF(pool, newInterchangeControl, newTransactionSet, newProductionReportingHeader, newHeaderInstructions, newHeaderNameAddress, newNonRecordedScrapItems, newProductItem, newProductInstructions, newProductItemNameAddress, newDamages, newErrors,  flag, filePath);

        return { CustomerID, Branch };
}


module.exports = {  
    transformO870
};

const { get846InterchangeControl, get846InventoryHandoffHeader, get846HeaderNameAddress, get846ProductItem, get846ProductItemInstruction, get846Damages, get846TransactionErrors, get846TransactionSet } = require('./O846_retrieve.js');
const { trfm_Outbound } = require('../../functions/transformationOutbound.js');
const { LoadO846SNF } = require('./O846_insert_SNF.js');

const readableErrors = require('../../functions/readableErrors.js');


async function transformO846(pool, keyPK, flag, filePath) {
   console.log("Transforming I846 with key:", keyPK); 




   // Fetch the data from the database
   let InterchangeControl = await get846InterchangeControl(pool, keyPK, filePath);
   let TransactionSet = await get846TransactionSet(pool, keyPK, filePath);
   let InventoryHandoffHeader = await get846InventoryHandoffHeader(pool, keyPK, filePath);
   let HeaderNameAddress = await get846HeaderNameAddress(pool, keyPK, filePath);
   let ProductItem = await get846ProductItem(pool, keyPK, filePath);
   let ProductItemInstruction = await get846ProductItemInstruction(pool, keyPK, filePath);
   let Damages = await get846Damages(pool, keyPK, filePath);
   let Errors = await get846TransactionErrors(pool, keyPK, filePath);
   // Create the context object with all the data
   const context = {
    InterchangeControl,
    TransactionSet,
    InventoryHandoffHeader,
    HeaderNameAddress,
    ProductItem,
    ProductItemInstruction,
    Damages,
    Errors
  };    

    // Transform the context using the rules
    const rulesInterchangeControl = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["846_SNF_Context", "ictl_%"]);
    const rulesTransactionSet = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["846_SNF_Context", "txs_%"]);
    const rulesInventoryHandoffHeader = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["846_SNF_Context", "ish_%"]);
    const rulesHeaderNameAddress = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["846_SNF_Context", "hdna_%"]);
    const rulesProductItem = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["846_SNF_Context", "prdi_%"]);
    const rulesDamages = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["846_SNF_Context", "dmg_%"]);     
    const rulesProductInstructions = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["846_SNF_Context", "prii_%"]);
    const rulesErrors = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2', ["846_SNF_Context", "txer_%"]);

    //Transform Reference Data
    context.InterchangeControl = await trfm_Outbound(context, context.InterchangeControl, rulesInterchangeControl.rows);
    context.TransactionSet = await Promise.all(context.TransactionSet.map(tx => trfm_Outbound(context, tx, rulesTransactionSet.rows)));
    context.InventoryHandoffHeader = await Promise.all(context.InventoryHandoffHeader.map(sh => trfm_Outbound(context, sh, rulesInventoryHandoffHeader.rows)));
    context.HeaderNameAddress = await Promise.all(context.HeaderNameAddress.map(hna => trfm_Outbound(context, hna, rulesHeaderNameAddress.rows)));
    context.ProductItem = await Promise.all(context.ProductItem.map(item => trfm_Outbound(context, item, rulesProductItem.rows)));
    context.Damages = await Promise.all(context.Damages.map(dmg => trfm_Outbound(context, dmg, rulesDamages.rows)));
    //context.ProductInstructions = await Promise.all(context.ProductInstructions.map(pi => trfm_Outbound(context, pi, rulesProductInstructions.rows)));
    context.Errors = await Promise.all(context.Errors.map(err => trfm_Outbound(context, err, rulesErrors.rows)));

    //Set transformed context back to the original variables
   InterchangeControl = context.InterchangeControl;
   TransactionSet = context.TransactionSet;
   InventoryHandoffHeader = context.InventoryHandoffHeader;
   HeaderNameAddress = context.HeaderNameAddress;
   ProductItem = context.ProductItem;
   Damages = context.Damages;
   Errors = context.Errors;


   //Get rules for each object
   let InterchangeControlRules = [], TransactionSetRules = [], InventoryHandoffHeaderRules = [], HeaderNameAddressRules = [], ProductItemRules = [], DamagesRules = [], ProductInstructionsRules = [], ErrorsRules = [];
try {
    const rulesInterchangeControl = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["846_SNF_Header"]); 
    const rulesTransactionSet = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["846_SNF_Detail"]);
    const rulesInventoryHandoffHeader = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["846_SNF_Header"]);
    const rulesHeaderNameAddress = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["846_SNF_Names"]);
    const rulesItem = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["846_SNF_Detail"]); 
    const rulesProductItem = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["846_SNF_Names"]);
    const rulesDamages = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["846_SNF_Damages"]); 
    const rulesProductInstructions = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["846_SNF_ProductInstructions"]);
    const rulesErrors = await pool.query('SELECT * FROM public."EDI_translations" WHERE trns_trns_tbl = $1', ["846_SNF_TransactionErrors"]);

    //Set Rules
    InterchangeControlRules = rulesInterchangeControl.rows;
    TransactionSetRules = rulesTransactionSet.rows;
    InventoryHandoffHeaderRules = rulesInventoryHandoffHeader.rows;
    HeaderNameAddressRules = rulesHeaderNameAddress.rows;
    ItemRules = rulesItem.rows;
    ProductItemRules = rulesProductItem.rows;
    DamagesRules = rulesDamages.rows;
    //ProductInstructionsRules = rulesProductItemInstructions.rows;
    ErrorsRules = rulesErrors.rows;

} catch (error) {
          const readableErrorMessage = readableErrors(error, keyPK, filePath);
          console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
}

// Transform the data using the rules
const newInterchangeControl = await trfm_Outbound(context, InterchangeControl, InterchangeControlRules);
const transactionSetResults = await Promise.all(TransactionSet.map(tx => trfm_Outbound(context, tx, TransactionSetRules)));
const newTransactionSet = transactionSetResults.flat().filter(row => row !== undefined);
const InventoryHandoffHeaderResults = await Promise.all(InventoryHandoffHeader.map(sh => trfm_Outbound(context, sh, InventoryHandoffHeaderRules)));
const newInventoryHandoffHeader = InventoryHandoffHeaderResults.flat().filter(row => row !== undefined);
const headerNameAddressResults = await Promise.all(HeaderNameAddress.map(hna => trfm_Outbound(context, hna, HeaderNameAddressRules)));
const newHeaderNameAddress = headerNameAddressResults.flat().filter(row => row !== undefined);
//const itemResults = await Promise.all(Item.map(item => trfm_Outbound(context, item, ItemRules)));
//const newItem = itemResults.flat().filter(row => row !== undefined);
const productItemResults = await Promise.all(ProductItem.map(pi => trfm_Outbound(context, pi, ProductItemRules)));
//const productItemInstructionsResults = await Promise.all(ProductItemInstruction.map(pi => trfm_Out
//const newProductItemInstructions = productItemInstructionsResults.flat().filter(row => row !== undefined
const newProductItem = productItemResults.flat().filter(row => row !== undefined);
const damagesResults = await Promise.all(Damages.map(d => trfm_Outbound(context, d, DamagesRules)));
const newDamages = damagesResults.flat().filter(row => row !== undefined);
//const productItemInstructionsResults = await Promise.all(ProductItemInstructions.map(pi => trfm_Outbound(context, pi, ProductItemInstructionsRules)));
const errorsResults = await Promise.all(Errors.map(e => trfm_Outbound(context, e, ErrorsRules)));
const newErrors = errorsResults.flat().filter(row => row !== undefined);


//global.CustomerID = newProductItem[0].prd_partcustomerid
console.log("Customer ID:", global.CustomerID);
    await LoadO846SNF(pool, newInterchangeControl, newTransactionSet, newInventoryHandoffHeader, newHeaderNameAddress, newProductItem, newDamages, newErrors, flag, filePath);
}


module.exports = {  
    transformO846
};

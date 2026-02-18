const { get861InterchangeControl, get861ReceiptHeader, get861HeaderNameAddress, get861HeaderInstructions, 
  get861ReceiptItem, get861ItemInstructions, get861ProductItem, get861Damages, get861ProductItemInstructions, 
  get861ProductItemNameAddress, get861TransactionErrors,
  get861TransactionSet} = require('./O861_retrieve.js');
const { trfm_Outbound } = require('../../functions/transformationOutbound.js');
const { LoadO861SNF } = require('./O861_insert_SNF.js');


async function transformO861(pool, keyPK, flag, filePath) {
   console.log("Transforming O861 with key:", keyPK); 

   // Fetch the data from the database
   let InterchangeControl = await get861InterchangeControl(pool, keyPK, filePath);
   let TransactionSet = await get861TransactionSet(pool, keyPK, filePath);
   let ReceiptHeader = await get861ReceiptHeader(pool, keyPK, filePath);
   let HeaderNameAddress = await get861HeaderNameAddress(pool, keyPK, filePath);
   let HeaderInstructions = await get861HeaderInstructions(pool, keyPK, filePath);
   let Item = await get861ReceiptItem(pool, keyPK, filePath);
   let ItemInstructions = await get861ItemInstructions(pool, keyPK, filePath);
   let ProductItem = await get861ProductItem(pool, keyPK, filePath);
   let Damages = await get861Damages(pool, keyPK, filePath);
   let ProductInstructions = await get861ProductItemInstructions(pool, keyPK, filePath);
   let ProductItemNameAddress = await get861ProductItemNameAddress(pool, keyPK, filePath);
   let Errors = await get861TransactionErrors(pool, keyPK, filePath);
   // Create the context object with all the data
   const context = {
    InterchangeControl, TransactionSet, ReceiptHeader, HeaderNameAddress, HeaderInstructions, Item,
    ItemInstructions, ProductItem, Damages, ProductInstructions, ProductItemNameAddress, Errors
   };
   // Transform the context using the rules
    const customerId = `${ProductItem[0].prd_partcustomerid}`;
//     const customerId = (Array.isArray(ProductItem) && ProductItem[0] && ProductItem[0].prd_partcustomerid)
//   ? `${ProductItem[0].prd_partcustomerid}`
//   : null;
   
    const rulesInterchangeControl = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["861_SNF_Context", "ictl_%", customerId, "ALL"]
    );
    const rulesTransactionSet = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["861_SNF_Context", "txs_%", customerId, "ALL"]
    );
    const rulesReceiptHeader = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["861_SNF_Context", "rct_%", customerId, "ALL"]
    );
    const rulesHeaderNameAddress = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["861_SNF_Context", "hdna_%", customerId, "ALL"]
    );
    const rulesHeaderInstructions = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["861_SNF_Context", "hdin_%", customerId, "ALL"]
    );
    const rulesItem = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["861_SNF_Context", "rtm_%", customerId, "ALL"]
    );
    const rulesItemInstructions = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["861_SNF_Context", "itin_%", customerId, "ALL"]
    );
    const rulesProductItem = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["861_SNF_Context", "prd_%", customerId, "ALL"]
    );
    const rulesDamages = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["861_SNF_Context", "dmg_%", customerId, "ALL"]
    );
    const rulesProductInstructions = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["861_SNF_Context", "prii_%", customerId, "ALL"]
    );
    const rulesProductItemNameAddress = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["861_SNF_Context", "prna_%", customerId, "ALL"]
    );
    const rulesErrors = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["861_SNF_Context", "txer_%", customerId, "ALL"]
    );

   //Transform Reference Data
    context.InterchangeControl = await trfm_Outbound(context, context.InterchangeControl, rulesInterchangeControl.rows);
    context.TransactionSet = await Promise.all(context.TransactionSet.map(tx => trfm_Outbound(context, tx, rulesTransactionSet.rows)));
    context.ReceiptHeader = await Promise.all(context.ReceiptHeader.map(sh => trfm_Outbound(context, sh, rulesReceiptHeader.rows)));
    context.HeaderNameAddress = await Promise.all(context.HeaderNameAddress.map(hna => trfm_Outbound(context, hna, rulesHeaderNameAddress.rows)));
    context.HeaderInstructions = await Promise.all(context.HeaderInstructions.map(hi => trfm_Outbound(context, hi, rulesHeaderInstructions.rows)));
    context.Item = await Promise.all(context.Item.map(item => trfm_Outbound(context, item   , rulesItem.rows)));
    context.ItemInstructions = await Promise.all(context.ItemInstructions.map(ii => trfm_Outbound(context, ii, rulesItemInstructions.rows)));
    context.ProductItem = await Promise.all(context.ProductItem.map(pi => trfm_Outbound(context, pi, rulesProductItem.rows)));
    context.Damages = await Promise.all(context.Damages.map(dmg => trfm_Outbound(context, dmg, rulesDamages.rows)));
    context.ProductInstructions = await Promise.all(context.ProductInstructions.map(pi => trfm_Outbound(context, pi, rulesProductInstructions.rows)));
    context.ProductItemNameAddress = await Promise.all(context.ProductItemNameAddress.map(pina => trfm_Outbound(context, pina, rulesProductItemNameAddress.rows)));
    context.Errors = await Promise.all(context.Errors.map(err => trfm_Outbound(context, err, rulesErrors.rows)));

    //Set transformed context back to the original variables
   InterchangeControl = context.InterchangeControl;
   TransactionSet = context.TransactionSet;
   ReceiptHeader = context.ReceiptHeader;
   HeaderNameAddress = context.HeaderNameAddress;
   HeaderInstructions = context.HeaderInstructions;
   Item = context.Item;
   ItemInstructions = context.ItemInstructions;
   ProductItem = context.ProductItem;
   Damages = context.Damages;
   ProductInstructions = context.ProductInstructions;
   ProductItemNameAddress = context.ProductItemNameAddress;
   Errors = context.Errors;

   //Get rules for each object
   let InterchangeControlRules = [], TransactionSetRules = [], ShipmentHeaderRules = [], HeaderNameAddressRules = [], HeaderInstructionsRules = [], ItemRules = [], ItemInstructionsRules = [], ProductItemRules = [], DamagesRules = [], ProductInstructionsRules = [], ProductItemNameAddressRules = [], ErrorsRules = [];
try {
    const rulesInterchangeControl = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["861_Invex_InterchangeControl", `${ProductItem[0].prd_partcustomerid}`, 'ALL']); 
    const rulesTransactionSet = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["861_Invex_TransactionSet", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesReceiptHeader = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["861_Invex_ReceiptHeader", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesHeaderNameAddress = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["861_Invex_HeaderNameAddress", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesHeaderInstructions = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["861_Invex_HeaderInstructions", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesItem = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["861_Invex_Item", `${ProductItem[0].prd_partcustomerid}`, 'ALL']); 
    const rulesItemInstructions = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["861_Invex_ItemInstructions", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesProductItem = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["861_Invex_ProductItem", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesDamages = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["861_Invex_Damages", `${ProductItem[0].prd_partcustomerid}`, 'ALL']); 
    const rulesProductInstructions = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["861_Invex_ProductInstructions", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesProductItemNameAddress = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["861_Invex_ProductItemNameAddress", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesErrors = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["861_Invex_TransactionErrors", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);

    //Set Rules
    InterchangeControlRules = rulesInterchangeControl.rows;
    TransactionSetRules = rulesTransactionSet.rows;
    ReceiptHeaderRules = rulesReceiptHeader.rows;
    HeaderNameAddressRules = rulesHeaderNameAddress.rows;
    HeaderInstructionsRules = rulesHeaderInstructions.rows;
    ItemRules = rulesItem.rows;
    ItemInstructionsRules = rulesItemInstructions.rows;
    ProductItemRules = rulesProductItem.rows;
    DamagesRules = rulesDamages.rows;
    ProductInstructionsRules = rulesProductInstructions.rows;
    ProductItemNameAddressRules = rulesProductItemNameAddress.rows;
    ErrorsRules = rulesErrors.rows;

} catch (error) {
  console.error('Error fetching transformation rules:', error);
          const readableErrorMessage = readableErrors(error, keyPK, filePath);
          console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
}

// Transform the data using the rules
// Transform the data using the rules
const newInterchangeControl = await trfm_Outbound(context, InterchangeControl, InterchangeControlRules);
const transactionSetResults = await Promise.all(TransactionSet.map(tx => trfm_Outbound(context, tx, TransactionSetRules)));
const newTransactionSet = transactionSetResults.flat().filter(row => row !== undefined);
const receiptHeaderResults = await Promise.all(ReceiptHeader.map(sh => trfm_Outbound(context, sh, ReceiptHeaderRules)));
const newReceiptHeader = receiptHeaderResults.flat().filter(row => row !== undefined);
const headerNameAddressResults = await Promise.all(HeaderNameAddress.map(hna => trfm_Outbound(context, hna, HeaderNameAddressRules)));
const newHeaderNameAddress = headerNameAddressResults.flat().filter(row => row !== undefined);
const headerInstructionsResults = await Promise.all(HeaderInstructions.map(hi => trfm_Outbound(context, hi, HeaderInstructionsRules)));
const newHeaderInstructions = headerInstructionsResults.flat().filter(row => row !== undefined);
const itemResults = await Promise.all(Item.map(item => trfm_Outbound(context, item, ItemRules)));
const newItem = itemResults.flat().filter(row => row !== undefined);
const itemInstructionsResults = await Promise.all(ItemInstructions.map(ii => trfm_Outbound(context, ii, ItemInstructionsRules)));
const newItemInstructions = itemInstructionsResults.flat().filter(row => row !== undefined);
const productItemResults = await Promise.all(ProductItem.map(pi => trfm_Outbound(context, pi, ProductItemRules)));
const newProductItem = productItemResults.flat().filter(row => row !== undefined);
const damagesResults = await Promise.all(Damages.map(d => trfm_Outbound(context, d, DamagesRules)));
const newDamages = damagesResults.flat().filter(row => row !== undefined);
const productInstructionsResults = await Promise.all(ProductInstructions.map(pi => trfm_Outbound(context, pi, ProductInstructionsRules)));
const newProductInstructions = productInstructionsResults.flat().filter(row => row !== undefined);
const productItemNameAddressResults = await Promise.all(ProductItemNameAddress.map(pina => trfm_Outbound(context, pina, ProductItemNameAddressRules)));
const newProductItemNameAddress = productItemNameAddressResults.flat().filter(row => row !== undefined);
const errorsResults = await Promise.all(Errors.map(e => trfm_Outbound(context, e, ErrorsRules)));
const newErrors = errorsResults.flat().filter(row => row !== undefined);


const CustomerID = newProductItem[0].prd_partcustomerid || null;
const Branch = newInterchangeControl.ictl_invexbranchcode || null;
console.log("Customer ID:", global.CustomerID);
    await LoadO861SNF(pool, newInterchangeControl, newTransactionSet, newReceiptHeader, newHeaderNameAddress, newHeaderInstructions, newItem, newItemInstructions, newProductItem, newDamages, newProductInstructions, newProductItemNameAddress, newErrors, flag, filePath);

    return { CustomerID, Branch };
}


module.exports = {  
    transformO861
};
const { get856InterchangeControl, get856ShipmentHeader, get856HeaderNameAddress, get856HeaderInstructions, 
  get856ShipmentItem, get856ItemInstructions, get856ProductItem, get856Chemistry, get856Damages, get856ProductItemInstructions, 
  get856ProductItemNameAddress, get856TransactionErrors,
  get856TransactionSet} = require('./O856_retrieve.js');
const { trfm_Outbound } = require('../../functions/transformationOutbound.js');
const { LoadO856SNF } = require('./O856_insert_SNF.js');


async function transformO856(pool, keyPK, flag, filePath) {
   console.log("Transforming I856 with key:", keyPK); 




   // Fetch the data from the database
   let InterchangeControl = await get856InterchangeControl(pool, keyPK, filePath);
   let TransactionSet = await get856TransactionSet(pool, keyPK, filePath);
   let ShipmentHeader = await get856ShipmentHeader(pool, keyPK, filePath);
   let HeaderNameAddress = await get856HeaderNameAddress(pool, keyPK, filePath);
   let HeaderInstructions = await get856HeaderInstructions(pool, keyPK, filePath);
   let Item = await get856ShipmentItem(pool, keyPK, filePath);
   let ItemInstructions = await get856ItemInstructions(pool, keyPK, filePath);
   let ProductItem = await get856ProductItem(pool, keyPK, filePath);
   let Chemistries = await get856Chemistry(pool, keyPK, filePath);
   let Damages = await get856Damages(pool, keyPK, filePath);
   let ProductInstructions = await get856ProductItemInstructions(pool, keyPK, filePath);
   let ProductItemNameAddress = await get856ProductItemNameAddress(pool, keyPK, filePath);
   let Errors = await get856TransactionErrors(pool, keyPK, filePath);
   // Create the context object with all the data
   const context = {
    InterchangeControl, TransactionSet, ShipmentHeader, HeaderNameAddress, HeaderInstructions, Item,
    ItemInstructions, ProductItem, Chemistries, Damages, ProductInstructions, ProductItemNameAddress, Errors
   };

    // Transform the context using the rules
    const customerId = `${ProductItem[0].prd_partcustomerid}`;

    const rulesInterchangeControl = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["856_SNF_Context", "ictl_%", customerId, "ALL"]
    );
    const rulesTransactionSet = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["856_SNF_Context", "txs_%", customerId, "ALL"]
    );
    const rulesShipmentHeader = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["856_SNF_Context", "ish_%", customerId, "ALL"]
    );
    const rulesHeaderNameAddress = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["856_SNF_Context", "hdna_%", customerId, "ALL"]
    );
    const rulesHeaderInstructions = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["856_SNF_Context", "hdin_%", customerId, "ALL"]
    );
    const rulesItem = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["856_SNF_Context", "shp_%", customerId, "ALL"]
    );
    const rulesItemInstructions = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["856_SNF_Context", "itin_%", customerId, "ALL"]
    );
    const rulesProductItem = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["856_SNF_Context", "prd_%", customerId, "ALL"]
    );
    const rulesChemistries = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["856_SNF_Context", "chm_%", customerId, "ALL"]
    );
    const rulesDamages = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["856_SNF_Context", "dmg_%", customerId, "ALL"]
    );
    const rulesProductInstructions = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["856_SNF_Context", "prii_%", customerId, "ALL"]
    );
    const rulesProductItemNameAddress = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["856_SNF_Context", "prna_%", customerId, "ALL"]
    );
    const rulesErrors = await pool.query(
      'SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND trns_trns_fld LIKE $2 AND (trns_cust_no = $3 OR trns_cust_no = $4)',
      ["856_SNF_Context", "txer_%", customerId, "ALL"]
    );

    //Transform Reference Data
    context.InterchangeControl = await trfm_Outbound(context, context.InterchangeControl, rulesInterchangeControl.rows);
    context.TransactionSet = await Promise.all(context.TransactionSet.map(tx => trfm_Outbound(context, tx, rulesTransactionSet.rows)));
    context.ShipmentHeader = await Promise.all(context.ShipmentHeader.map(sh => trfm_Outbound(context, sh, rulesShipmentHeader.rows)));
    context.HeaderNameAddress = await Promise.all(context.HeaderNameAddress.map(hna => trfm_Outbound(context, hna, rulesHeaderNameAddress.rows)));
    context.HeaderInstructions = await Promise.all(context.HeaderInstructions.map(hi => trfm_Outbound(context, hi, rulesHeaderInstructions.rows)));
    context.Item = await Promise.all(context.Item.map(item => trfm_Outbound(context, item   , rulesItem.rows)));
    context.ItemInstructions = await Promise.all(context.ItemInstructions.map(ii => trfm_Outbound(context, ii, rulesItemInstructions.rows)));
    context.ProductItem = await Promise.all(context.ProductItem.map(pi => trfm_Outbound(context, pi, rulesProductItem.rows)));
    context.Chemistries = await Promise.all(context.Chemistries.map(ch => trfm_Outbound(context, ch, rulesChemistries.rows)));
    context.Damages = await Promise.all(context.Damages.map(dmg => trfm_Outbound(context, dmg, rulesDamages.rows)));
    context.ProductInstructions = await Promise.all(context.ProductInstructions.map(pi => trfm_Outbound(context, pi, rulesProductInstructions.rows)));
    context.ProductItemNameAddress = await Promise.all(context.ProductItemNameAddress.map(pina => trfm_Outbound(context, pina, rulesProductItemNameAddress.rows)));
    context.Errors = await Promise.all(context.Errors.map(err => trfm_Outbound(context, err, rulesErrors.rows)));

    //Set transformed context back to the original variables
   InterchangeControl = context.InterchangeControl;
   TransactionSet = context.TransactionSet;
   ShipmentHeader = context.ShipmentHeader;
   HeaderNameAddress = context.HeaderNameAddress;
   HeaderInstructions = context.HeaderInstructions;
   Item = context.Item;
   ItemInstructions = context.ItemInstructions;
   ProductItem = context.ProductItem;
   Chemistries = context.Chemistries;
   Damages = context.Damages;
   ProductInstructions = context.ProductInstructions;
   ProductItemNameAddress = context.ProductItemNameAddress;
   Errors = context.Errors;


   //Get rules for each object
   let InterchangeControlRules = [], TransactionSetRules = [], ShipmentHeaderRules = [], HeaderNameAddressRules = [], HeaderInstructionsRules = [], ItemRules = [], ItemInstructionsRules = [], ProductItemRules = [], ChemistriesRules = [], DamagesRules = [], ProductInstructionsRules = [], ProductItemNameAddressRules = [], ErrorsRules = [];
try {
    const rulesInterchangeControl = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["856_Invex_InterchangeControl", `${ProductItem[0].prd_partcustomerid}`, 'ALL']); 
    const rulesTransactionSet = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["856_Invex_TransactionSet", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesShipmentHeader = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["856_Invex_ShipmentHeader", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesHeaderNameAddress = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["856_Invex_HeaderNameAddress", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesHeaderInstructions = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["856_Invex_HeaderInstructions", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesItem = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["856_Invex_Item", `${ProductItem[0].prd_partcustomerid}`, 'ALL']); 
    const rulesItemInstructions = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["856_Invex_ItemInstructions", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesProductItem = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["856_Invex_ProductItem", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesChemistries = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["856_Invex_Chemistries", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesDamages = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["856_Invex_Damages", `${ProductItem[0].prd_partcustomerid}`, 'ALL']); 
    const rulesProductInstructions = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["856_Invex_ProductInstructions", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesProductItemNameAddress = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["856_Invex_ProductItemNameAddress", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);
    const rulesErrors = await pool.query('SELECT * FROM public."EDI_Outbound_Translations" WHERE trns_trns_tbl = $1 AND (trns_cust_no = $2 OR trns_cust_no = $3)', ["856_Invex_TransactionErrors", `${ProductItem[0].prd_partcustomerid}`, 'ALL']);

    //Set Rules
    InterchangeControlRules = rulesInterchangeControl.rows;
    TransactionSetRules = rulesTransactionSet.rows;
    ShipmentHeaderRules = rulesShipmentHeader.rows;
    HeaderNameAddressRules = rulesHeaderNameAddress.rows;
    HeaderInstructionsRules = rulesHeaderInstructions.rows;
    ItemRules = rulesItem.rows;
    ItemInstructionsRules = rulesItemInstructions.rows;
    ProductItemRules = rulesProductItem.rows;
    ChemistriesRules = rulesChemistries.rows;
    DamagesRules = rulesDamages.rows;
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
const headerInstructionsResults = await Promise.all(HeaderInstructions.map(hi => trfm_Outbound(context, hi, HeaderInstructionsRules)));
const newHeaderInstructions = headerInstructionsResults.flat().filter(row => row !== undefined);
const itemResults = await Promise.all(Item.map(item => trfm_Outbound(context, item, ItemRules)));
const newItem = itemResults.flat().filter(row => row !== undefined);
const itemInstructionsResults = await Promise.all(ItemInstructions.map(ii => trfm_Outbound(context, ii, ItemInstructionsRules)));
const newItemInstructions = itemInstructionsResults.flat().filter(row => row !== undefined);
const productItemResults = await Promise.all(ProductItem.map(pi => trfm_Outbound(context, pi, ProductItemRules)));
const newProductItem = productItemResults.flat().filter(row => row !== undefined);
const chemistriesResults = await Promise.all(Chemistries.map(c => trfm_Outbound(context, c, ChemistriesRules)));
const newChemistries = chemistriesResults.flat().filter(row => row !== undefined);
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
    await LoadO856SNF(pool, newInterchangeControl, newTransactionSet, newShipmentHeader, newHeaderNameAddress, newHeaderInstructions, newItem, newItemInstructions, newProductItem, newChemistries, newDamages, newProductInstructions, newProductItemNameAddress, newErrors, flag, filePath);

    return { CustomerID, Branch };
}

module.exports = {
    transformO856
};

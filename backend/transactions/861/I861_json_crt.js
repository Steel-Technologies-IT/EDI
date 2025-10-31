const pool2 = require("../../db2.js")
 const { get861InterchangeControl, get861ReceiptHeader, get861HeaderNameAddress, get861HeaderInstructions, 
  get861ReceiptItem, get861ItemInstructions, get861ProductItem, get861Damages, get861ProductItemInstructions, 
  get861ProductItemNameAddress, get861TransactionErrors, get861TransactionSet
  } = require('./I861_retrieve.js');
 

// MARK: Invex Getters
async function getInvexRecords861(typePK, keyPK) {

  const interchangeControl = await get861Data(get861InterchangeControl, keyPK);
  const transactionSet = await get861ListData(get861TransactionSet, keyPK);
  const ReceiptHeader = await get861ListData(get861ReceiptHeader, keyPK);
  const headerNameAddress = await get861ListData(get861HeaderNameAddress, keyPK);
  const headerInstructions = await get861ListData(get861HeaderInstructions, keyPK);
  const Item = await get861ListData(get861ReceiptItem, keyPK);
  const itemInstructions = await get861ListData(get861ItemInstructions, keyPK);
  const productItem = await get861ListData(get861ProductItem, keyPK);
  const damages = await get861ListData(get861Damages, keyPK);
  const productInstructions = await get861ListData(get861ProductItemInstructions, keyPK);
  const productNameAddress = await get861ListData(get861ProductItemNameAddress, keyPK);
  const Errors = await get861ListData(get861TransactionErrors, keyPK);

  return formatStructuredJSON(interchangeControl, transactionSet, ReceiptHeader, Errors, headerNameAddress, headerInstructions, Item, 
    itemInstructions, productItem, damages, productInstructions, productNameAddress);
}

async function get861Data (fn, typePK, keyPK) {
  const results = await fn(pool2, typePK, keyPK);

  if (results) {
    return Object.entries(results)
      .filter(([key, value]) =>  value!= null)
      .map(([key, value]) => ([key.substring(key.indexOf('_')+1), value]));
  }

  return [];

}

async function get861ListData (fn, typePK, keyPK) {
  const results = await fn(pool2, typePK, keyPK);
  let dataList = [];

  for (let res in results) {
    dataList.push(Object.entries(results[res])
    .filter(([key, value]) =>  value!= null)
    .map(([key, value]) => ([key.substring(key.indexOf('_')+1), value])));
  }
  return dataList;
}

function addIfNotEmpty(obj, key, value) {
  if (Array.isArray(value)) {
    if (value.length > 0 && !(value.length === 1 && Object.keys(value[0]).length === 0)) {
      obj[key] = value;
    }
  } else if (value && Object.keys(value).length > 0) {
    obj[key] = value;
  }
}

const formatStructuredJSON = (interchangeControlData, transactionSetData, ReceiptHeaderData, transactionErrorsData, headerNameAddressData, 
  headerInstructionData, ItemData, itemInstructionsData, productItemData, damagesData, productItemInstructionsData, productNameAddressData) => {
  
  //TransactionSet level
  let TransactionSet = Object.values(Object.entries(transactionSetData).map(([, value]) => Object.fromEntries(value)));
  const Errors = Object.entries(transactionErrorsData).map(([, value]) => Object.fromEntries(value));
  
  //ReceiptHeader level
  let ReceiptHeader = Object.entries(ReceiptHeaderData).map(([, value]) => Object.fromEntries(value));
  let HeaderNameAddress = Object.entries(headerNameAddressData).map(([, value]) => Object.fromEntries(value));
  let HeaderInstructions = Object.entries(headerInstructionData).map(([, value]) => Object.fromEntries(value));
  
  //ShipmentItem level
  let Item = Object.entries(ItemData).map(([, value]) => Object.fromEntries(value));
  let itemInstructions = Object.entries(itemInstructionsData).map(([, value]) => Object.fromEntries(value));

  //ProductItem level
  let ProductItem = Object.entries(productItemData).map(([, value]) => Object.fromEntries(value));
  const Damages = Object.entries(damagesData).map(([, value]) => Object.fromEntries(value));
  const ProductItemInstructions = Object.entries(productItemInstructionsData).map(([, value]) => Object.fromEntries(value));
  const ProductItemNameAddress = Object.entries(productNameAddressData).map(([, value]) => Object.fromEntries(value));

    //Build and combine json objects 
  function getProdNumber(num) {
  // Build Product Item
  const NewProductItem = ProductItem.filter(prod => prod.itemnumber === num).map((prod, idx) => {
      prod.width = Number(prod.width); // Ensure width is set in ProductItem
      prod.pieces = Number(prod.pieces); // Ensure pieces is set in ProductItem
      prod.theoreticalweight = Number(prod.theoreticalweight); // Ensure theoreticalweight is set in ProductItem
      prod.actualweight = Number(prod.actualweight); // Ensure actualweight is set in ProductItem
      prod.coillength = Number(prod.coillength); // Ensure coillength is set in ProductItem
      prod.gaugesize = Number(prod.gaugesize); // Ensure gaugesize is set in ProductItem
      prod.actualgauge1 = Number(prod.actualgauge1); // Ensure actualgauge1 is set in ProductItem
      prod.actualgauge2 = Number(prod.actualgauge2); // Ensure actualgauge2 is set in ProductItem
      prod.coilinnerdiameter = Number(prod.coilinnerdiameter); // Ensure coilinnerdiameter is set in ProductItem
      prod.coilouterdiameter = Number(prod.coilouterdiameter); // Ensure coilouterdiameter is set in ProductItem
      const { ref_itemnumber, ...prodWithoutRef } = prod;
      // Filter ProductItemInstructions for this product
    const filterInstruction = ProductItemInstructions.filter(
    instr => Number(instr.index) === Number(prod.externaltagid)
  );

  
  // Remove 'index' from each instruction object and add it to the product item
  const cleanedInstructions = filterInstruction.map(({ index, ...rest }) => rest);

  addIfNotEmpty(prodWithoutRef, 'ProductItemInstructions', cleanedInstructions);
        

      // Build the product item object
      const prodObj = {
        ...prodWithoutRef,
        itemnumber: idx + 1,
        //Chemistry: filteredChem,
        ProductItemNameAddress
      };
      
      
      return prodObj;
    });
    return NewProductItem
  }


 // Build Item array, matching each Item with its ProductItem by index
  Item = Item.map((itm, idx) => {
  const newItem = { ...itm };
  newItem.grossweight = Number(itm.grossweight); // Ensure grossweight is set in Item
  newItem.netweight = Number(itm.netweight); // Ensure netweight is set in Item
  newItem.numberofpackages = Number(itm.numberofpackages); // Ensure numberofpackages is set in Item
  addIfNotEmpty(newItem, 'ProductItem', getProdNumber(itm.itemnumber));  //Get product by its corresponding itemnumber
  newItem.itemnumber = idx + 1;
  return newItem;
});


  // ReceiptHeader Build
  ReceiptHeader = {...ReceiptHeader.at(0)}
  ReceiptHeader.mastergrossweight = Number(ReceiptHeader.mastergrossweight); // Ensure mastergrossweight is set in ShipmentHeader
  ReceiptHeader.grossweight = Number(ReceiptHeader.grossweight); // Ensure grossweight is set in ShipmentHeader
  ReceiptHeader.netweight = Number(ReceiptHeader.netweight); // Ensure netweight is set in ShipmentHeader
  ReceiptHeader.numberofpackages = Number(ReceiptHeader.numberofpackages); // Ensure numberofpackages is set in ShipmentHeader
  addIfNotEmpty(ReceiptHeader, 'HeaderNameAddress', HeaderNameAddress);
  addIfNotEmpty(ReceiptHeader, 'HeaderInstructions', HeaderInstructions);
  addIfNotEmpty(ReceiptHeader, 'ReceiptItem', Item);



  //TransactionSet Build
  TransactionSet = {...TransactionSet.at(0)}
  addIfNotEmpty(TransactionSet, 'ReceiptHeader', [ReceiptHeader]);
  addIfNotEmpty(TransactionSet, 'Errors', Errors);



  //Interchange Constrol Build
  const InterchangeControl = Object.fromEntries(interchangeControlData);

  if (
  InterchangeControl.alternateinterchangenumber !== undefined &&
  InterchangeControl.alternateinterchangenumber !== null &&
  InterchangeControl.alternateinterchangenumber !== ''
) {
  InterchangeControl.alternateinterchangenumber = Number(InterchangeControl.alternateinterchangenumber);
}

  InterchangeControl['TransactionSet'] = [TransactionSet];

  return {InterchangeControl};  //Structure JSON Object

};

module.exports = { 
  getInvexRecords861
};
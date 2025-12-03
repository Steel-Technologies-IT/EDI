const pool2 = require("../../db2.js")
 const { get870InterchangeControl, get870Damages, get870HeaderInstructions, get870HeaderNameAddress, get870NonRecordedScrapItems, get870ProductItem, get870ProductItemInstructions, get870ProductItemNameAddress, get870ProductionReportingHeader, get870TransactionErrors, get870TransactionSet} = require('./I870_retrieve.js');
 

// MARK: Invex Getters
async function getInvexRecords870(typePK, keyPK) {

  const interchangeControl = await get870Data(get870InterchangeControl, keyPK);
  const transactionSet = await get870ListData(get870TransactionSet, keyPK);
  const damages = await get870ListData(get870Damages, keyPK);
  const headerInstructions = await get870ListData(get870HeaderInstructions, keyPK);
  const headerNameAddress = await get870ListData(get870HeaderNameAddress, keyPK);
  const nonRecordedScrapItems = await get870ListData(get870NonRecordedScrapItems, keyPK);
  const productItem = await get870ListData(get870ProductItem, keyPK);
  const productItemInstructions = await get870ListData(get870ProductItemInstructions, keyPK);
  const productItemNameAddress = await get870ListData(get870ProductItemNameAddress, keyPK);
  const productionReportingHeader = await get870ListData(get870ProductionReportingHeader, keyPK);   
  const Errors = await get870ListData(get870TransactionErrors, keyPK);

  return formatStructuredJSON(interchangeControl, transactionSet, headerInstructions, headerNameAddress, nonRecordedScrapItems, productItem, damages, productItemInstructions, productItemNameAddress, productionReportingHeader, Errors);
} 

async function get870Data (fn, keyPK) {
  const results = await fn(pool2, keyPK);

  if (results) {
    return Object.entries(results)
      .filter(([key, value]) =>  value!= null)
      .map(([key, value]) => ([key.substring(key.indexOf('_')+1), value]));
  }

  return [];

}

async function get870ListData (fn, keyPK) {
  const results = await fn(pool2, keyPK);
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

const formatStructuredJSON = (interchangeControlData, transactionSetData, headerInstructionsData, headerNameAddressData, nonRecordedScrapItemsData, productItemData, damagesData, productItemInstructionsData, productItemNameAddressData, productionReportingHeaderData, transactionErrorsData, ) => {

  //TransactionSet level
  let TransactionSet = Object.values(Object.entries(transactionSetData).map(([, value]) => Object.fromEntries(value)));
  const Errors = Object.entries(transactionErrorsData).map(([, value]) => Object.fromEntries(value));
  
  //Header level
  let ProductionReportingHeader = Object.entries(productionReportingHeaderData).map(([, value]) => Object.fromEntries(value));
  let HeaderInstructions = Object.entries(headerInstructionsData).map(([, value]) => Object.fromEntries(value));
  let HeaderNameAddress = Object.entries(headerNameAddressData).map(([, value]) => Object.fromEntries(value));
  let NonRecordedScrapItems = Object.entries(nonRecordedScrapItemsData).map(([, value]) => Object.fromEntries(value));
  
  //ProductItem level
  let ProductItem = Object.entries(productItemData).map(([, value]) => Object.fromEntries(value));
  let ProductItemInstructions = Object.entries(productItemInstructionsData).map(([, value]) => Object.fromEntries(value));
  let ProductItemNameAddress = Object.entries(productItemNameAddressData).map(([, value]) => Object.fromEntries(value));
  let Damages = Object.entries(damagesData).map(([, value]) => Object.fromEntries(value));

  
  function getProdNumber(num) {

  // Build Product Item
  const NewProductItem = ProductItem.filter(prod => prod.itemnumber === num).map((prod, idx) => {
    
      prod.width = Number(prod.width); // Ensure width is set in ProductItem
      prod.pieces = Number(prod.pieces); // Ensure pieces is set in ProductItem
      prod.theoreticalweight = Number(prod.theoreticalweight); // Ensure theoreticalweight is set in ProductItem
      prod.theoreticalweightum = Number(prod.theoreticalweightum); // Ensure theoreticalweightum is set in ProductItem
      prod.actualweight = Number(prod.actualweight); // Ensure actualweight is set in ProductItem
      prod.coillength = Number(prod.coillength); // Ensure coillength is set in ProductItem
      prod.gaugesize = Number(prod.gaugesize); // Ensure gaugesize is set in ProductItem
      prod.actualgauge1 = Number(prod.actualgauge1); // Ensure actualgauge1 is set in ProductItem
      prod.actualgauge2 = Number(prod.actualgauge2); // Ensure actualgauge2 is set in ProductItem
      prod.coilinnerdiameter = Number(prod.coilinnerdiameter); // Ensure coilinnerdiameter is set in ProductItem
      prod.coilouterdiameter = Number(prod.coilouterdiameter); // Ensure coilouterdiameter is set in ProductItem
      const { itemnumber, ...prodWithoutRef } = prod;

      // Build the product item object
      const prodObj = {
        ...prodWithoutRef,
        itemnumber: idx + 1,
        ProductItemNameAddress: ProductItemNameAddress,
        ProductItemInstructions: ProductItemInstructions,
        Damages: Damages
      };

      return prodObj;
    });
    return NewProductItem
  }


 // Build Item array, matching each Item with its ProductItem by index
  ShipmentItemTestResult = ShipmentItemTestResult.map((itm, idx) => {
  const newItem = { ...itm };
  newItem.grossweight = Number(itm.grossweight); // Ensure grossweight is set in Item
  newItem.netweight = Number(itm.netweight); // Ensure netweight is set in Item
  newItem.numberofpackages = Number(itm.numberofpackages); // Ensure numberofpackages is set in Item

  newItem.referencelinenumber = Number(itm.referencelinenumber); // Ensure referencelinenumber is set in Item
  addIfNotEmpty(newItem, 'ProductItem', getProdNumber(itm.referencelinenumber));  //Get product by its corresponding itemnumber
  //newItem.itemnumber = idx + 1;
  return newItem;
});


  // ShipmentHeader Build
  ShipmentHeaderTestResult = {...ShipmentHeaderTestResult.at(0)}
  addIfNotEmpty(ShipmentHeaderTestResult, 'HeaderNameAddress', HeaderNameAddress);
  //addIfNotEmpty(ShipmentHeader, 'HeaderInstructions', HeaderInstructions); // Uncomment if you want to include header instructions
  addIfNotEmpty(ShipmentHeaderTestResult, 'ShipmentItemTestResult', ShipmentItemTestResult);



  //TransactionSet Build
  TransactionSet = {...TransactionSet.at(0)}
  addIfNotEmpty(TransactionSet, 'ShipmentHeaderTestResult', [ShipmentHeaderTestResult]);
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
  getInvexRecords870
};
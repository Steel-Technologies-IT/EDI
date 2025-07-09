const pool2 = require("../../db2.js")
 const { get856InterchangeControl, get856ShipmentHeader, get856HeaderNameAddress, get856HeaderInstructions, 
  get856ShipmentItem, get856ItemInstructions, get856ProductItem, get856Chemistry, get856Damages, get856ProductItemInstructions, 
  get856ProductItemNameAddress, get856TransactionErrors,
  get856TransactionSet} = require('./856_retrieve.js');
 

// MARK: Invex Getters
async function getInvexRecords856(typePK, keyPK) {

  const interchangeControl = await get856Data(get856InterchangeControl, typePK, keyPK);
  const transactionSet = await get856ListData(get856TransactionSet, typePK, keyPK);
  const shipmentHeader = await get856ListData(get856ShipmentHeader, typePK, keyPK);
  const headerNameAddress = await get856ListData(get856HeaderNameAddress, typePK, keyPK);
  const headerInstructions = await get856ListData(get856HeaderInstructions, typePK, keyPK);
  const Item = await get856ListData(get856ShipmentItem, typePK, keyPK);
  const itemInstructions = await get856ListData(get856ItemInstructions, typePK, keyPK);
  const productItem = await get856ListData(get856ProductItem, typePK, keyPK);
  const chemistries = await get856ListData(get856Chemistry, typePK, keyPK);
  const damages = await get856ListData(get856Damages, typePK, keyPK);
  const productInstructions = await get856ListData(get856ProductItemInstructions, typePK, keyPK);
  const productNameAddress = await get856ListData(get856ProductItemNameAddress, typePK, keyPK);
  const Errors = await get856ListData(get856TransactionErrors, typePK, keyPK);

  return formatStructuredJSON(interchangeControl, transactionSet, shipmentHeader, Errors, headerNameAddress, headerInstructions, Item, 
    itemInstructions, productItem, chemistries, damages, productInstructions, productNameAddress);
}

async function get856Data (fn, typePK, keyPK) {
  const results = await fn(pool2, typePK, keyPK);

  if (results) {
    return Object.entries(results)
      .filter(([key, value]) =>  value!= null)
      .map(([key, value]) => ([key.substring(key.indexOf('_')+1), value]));
  }

  return [];

}

async function get856ListData (fn, typePK, keyPK) {
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

const formatStructuredJSON = (interchangeControlData, transactionSetData, shipmentHeaderData, transactionErrorsData, headerNameAddressData, 
  headerInstructionData, shipmentItemData, itemInstructionsData, productItemData, chemistryData, damagesData, productItemInstructionsData, productNameAddressData) => {
  
  //TransactionSet level
  let TransactionSet = Object.values(Object.entries(transactionSetData).map(([, value]) => Object.fromEntries(value)));
  const Errors = Object.entries(transactionErrorsData).map(([, value]) => Object.fromEntries(value));
  
  //ShipmentHeader level
  let ShipmentHeader = Object.entries(shipmentHeaderData).map(([, value]) => Object.fromEntries(value));
  let HeaderNameAddress = Object.entries(headerNameAddressData).map(([, value]) => Object.fromEntries(value));
  let HeaderInstructions = Object.entries(headerInstructionData).map(([, value]) => Object.fromEntries(value));
  
  //ShipmentItem level
  let Item = Object.entries(shipmentItemData).map(([, value]) => Object.fromEntries(value));
  let itemInstructions = Object.entries(itemInstructionsData).map(([, value]) => Object.fromEntries(value));

  //ProductItem level
  let ProductItem = Object.entries(productItemData).map(([, value]) => Object.fromEntries(value));
  const Chemistry = Object.entries(chemistryData).map(([, value]) => Object.fromEntries(value));
  const Damages = Object.entries(damagesData).map(([, value]) => Object.fromEntries(value));
  const ProductItemInstructions = Object.entries(productItemInstructionsData).map(([, value]) => Object.fromEntries(value));
  const ProductItemNameAddress = Object.entries(productNameAddressData).map(([, value]) => Object.fromEntries(value));
 
  //Build and combine json objects 
ProductItem = ProductItem.map((prod, index) => {
  // Use the original itemnumber for filtering Chemistry
  const filteredChem = Chemistry
    .filter(chem => String(chem.linenumber).trim() === String(prod.itemnumber).trim())
    .map(({ linenumber, ...rest }) => rest);

  filteredChem.forEach(chem => {
    chem.value = Number(chem.value); // Ensure value is set in Chemistry
  });
  prod.width = Number(prod.width); // Ensure width is set in ProductItem
  prod.pieces = Number(prod.pieces); // Ensure pieces is set in ProductItem
  prod.theoreticalweight = Number(prod.theoreticalweight); // Ensure theoreticalweight is set in ProductItem
  prod.actualweight = Number(prod.actualweight); // Ensure actualweight is set in ProductItem
  prod.coillength = Number(prod.coillength); // Ensure coillength is set in ProductItem

  return {
    ...prod,
    itemnumber: (index + 1), // Overwrite itemnumber after filtering
    Chemistry: filteredChem,
    Damages,
    ProductItemInstructions
  };
});
  

  // Item Build
  Item = {...Item.at(0)}
  Item.grossweight = Number(Item.grossweight); // Ensure grossweight is set in Item
  Item.netweight = Number(Item.netweight); // Ensure netweight is set in Item
  Item.numberofpackages = Number(Item.numberofpackages); // Ensure numberofpackages is set in Item
  addIfNotEmpty(Item, 'itemInstructions', itemInstructions)
  addIfNotEmpty(Item, 'ProductItem', ProductItem);

  // ShipmentHeader Build
  ShipmentHeader = {...ShipmentHeader.at(0)}
  ShipmentHeader.mastergrossweight = Number(ShipmentHeader.mastergrossweight); // Ensure mastergrossweight is set in ShipmentHeader
  ShipmentHeader.grossweight = Number(ShipmentHeader.grossweight); // Ensure grossweight is set in ShipmentHeader
  ShipmentHeader.netweight = Number(ShipmentHeader.netweight); // Ensure netweight is set in ShipmentHeader
  ShipmentHeader.numberofpackages = Number(ShipmentHeader.numberofpackages); // Ensure numberofpackages is set in ShipmentHeader
  addIfNotEmpty(ShipmentHeader, 'HeaderNameAddress', HeaderNameAddress);
  addIfNotEmpty(ShipmentHeader, 'HeaderInstructions', HeaderInstructions);
  addIfNotEmpty(ShipmentHeader, 'Item', [Item]);

  //TransactionSet Build
  TransactionSet = {...TransactionSet.at(0)}
  addIfNotEmpty(TransactionSet, 'ShipmentHeader', [ShipmentHeader]);
  addIfNotEmpty(TransactionSet, 'Errors', Errors);

  const InterchangeControl = Object.fromEntries(interchangeControlData);

  if (
  InterchangeControl.alternateinterchangenumber !== undefined &&
  InterchangeControl.alternateinterchangenumber !== null &&
  InterchangeControl.alternateinterchangenumber !== ''
) {
  InterchangeControl.alternateinterchangenumber = Number(InterchangeControl.alternateinterchangenumber);
}

  InterchangeControl['TransactionSet'] = [TransactionSet];

  return {InterchangeControl};

};

module.exports = { 
  getInvexRecords856
};
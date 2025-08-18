
const pool2 = require("../../db2.js")
 const { get863InterchangeControl, get863ShipmentHeaderTestResult, get863HeaderNameAddress, get863ShipmentItemTestResult, get863ItemInstructions, 
  get863ProductItem, get863Chemistry, get863PhysicalTests, get863Jominy, get863HeatTreatment, get863Impact, get863MicroInclusion, get863QDSInstructions,
  get863ProductItemNameAddress, get863TransactionErrors,
  get863TransactionSet} = require('./I863_retrieve.js');
 

// MARK: Invex Getters
async function getInvexRecords863(typePK, keyPK) {

  const interchangeControl = await get863Data(get863InterchangeControl, keyPK);
  const transactionSet = await get863ListData(get863TransactionSet, keyPK);
  const shipmentHeaderTestResult = await get863ListData(get863ShipmentHeaderTestResult, keyPK);
  const headerNameAddress = await get863ListData(get863HeaderNameAddress, keyPK);
  const ShipmentItemTestResult = await get863ListData(get863ShipmentItemTestResult, keyPK);
  const itemInstructions = await get863ListData(get863ItemInstructions, keyPK);
  const productItem = await get863ListData(get863ProductItem, keyPK);
  const chemistries = await get863ListData(get863Chemistry, keyPK);
  const physicalTests = await get863ListData(get863PhysicalTests, keyPK);
  const jominy = await get863ListData(get863Jominy, keyPK);
  const heatTreatment = await get863ListData(get863HeatTreatment, keyPK);   
  const impact = await get863ListData(get863Impact, keyPK);  
  const microInclusion = await get863ListData(get863MicroInclusion, keyPK);
  const QDSInstructions = await get863ListData(get863QDSInstructions, keyPK);
  const productNameAddress = await get863ListData(get863ProductItemNameAddress, keyPK);
  const Errors = await get863ListData(get863TransactionErrors, keyPK);

  return formatStructuredJSON(interchangeControl, transactionSet, shipmentHeaderTestResult, Errors, headerNameAddress, ShipmentItemTestResult, 
  itemInstructions, productItem, chemistries, physicalTests, jominy, heatTreatment, impact, microInclusion, QDSInstructions, productNameAddress);
} 

async function get863Data (fn, keyPK) {
  const results = await fn(pool2, keyPK);

  if (results) {
    return Object.entries(results)
      .filter(([key, value]) =>  value!= null)
      .map(([key, value]) => ([key.substring(key.indexOf('_')+1), value]));
  }

  return [];

}

async function get863ListData (fn, keyPK) {
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

const formatStructuredJSON = (interchangeControlData, transactionSetData, shipmentHeaderData, transactionErrorsData, headerNameAddressData, 
  shipmentItemData, itemInstructionsData, productItemData, chemistryData, PhysicalTestsData, jominyData, heatTreatmentData, impactData, microInclusionData, QDSInstructions,productNameAddressData,) => {

  //TransactionSet level
  let TransactionSet = Object.values(Object.entries(transactionSetData).map(([, value]) => Object.fromEntries(value)));
  const Errors = Object.entries(transactionErrorsData).map(([, value]) => Object.fromEntries(value));
  
  //ShipmentHeader level
  let ShipmentHeaderTestResult = Object.entries(shipmentHeaderData).map(([, value]) => Object.fromEntries(value));
  let HeaderNameAddress = Object.entries(headerNameAddressData).map(([, value]) => Object.fromEntries(value));
 
  
  //ShipmentItem level
  let ShipmentItemTestResult = Object.entries(shipmentItemData).map(([, value]) => Object.fromEntries(value));
  let itemInstructions = Object.entries(itemInstructionsData).map(([, value]) => Object.fromEntries(value));

  //ProductItem level
  let ProductItem = Object.entries(productItemData).map(([, value]) => Object.fromEntries(value));
  const Chemistry = Object.entries(chemistryData).map(([, value]) => Object.fromEntries(value));
  const PhysicalTests = Object.entries(PhysicalTestsData).map(([, value]) => Object.fromEntries(value));
  const Jominy = Object.entries(jominyData).map(([, value]) => Object.fromEntries(value));
  const HeatTreatment = Object.entries(heatTreatmentData).map(([, value]) => Object.fromEntries(value));
  const Impact = Object.entries(impactData).map(([, value]) => Object.fromEntries (value));
  const MicroInclusion = Object.entries(microInclusionData).map(([, value]) => Object.fromEntries(value));
  const qdsInstructions = Object.entries(QDSInstructions).map(([, value]) => Object.fromEntries(value));
  const ProductItemNameAddress = Object.entries(productNameAddressData).map(([, value]) => Object.fromEntries(value));

  function getProdNumber(num) {

  // Build Product Item
  const NewProductItem = ProductItem.filter(prod => prod.itemnumber === num).map((prod, idx) => {
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
      prod.theoreticalweightum = Number(prod.theoreticalweightum); // Ensure theoreticalweightum is set in ProductItem
      prod.actualweight = Number(prod.actualweight); // Ensure actualweight is set in ProductItem
      prod.coillength = Number(prod.coillength); // Ensure coillength is set in ProductItem
      prod.gaugesize = Number(prod.gaugesize); // Ensure gaugesize is set in ProductItem
      prod.actualgauge1 = Number(prod.actualgauge1); // Ensure actualgauge1 is set in ProductItem
      prod.actualgauge2 = Number(prod.actualgauge2); // Ensure actualgauge2 is set in ProductItem
      prod.coilinnerdiameter = Number(prod.coilinnerdiameter); // Ensure coilinnerdiameter is set in ProductItem
      prod.coilouterdiameter = Number(prod.coilouterdiameter); // Ensure coilouterdiameter is set in ProductItem
      const { itemnumber, ...prodWithoutRef } = prod;
    // Filter ProductItemInstructions for this product
    //const filterInstruction = ProductItemInstructions.filter(
    //instr => Number(instr.index) === Number(prod.externaltagid)
    //  );

  
  
  // Remove 'index' from each instruction object and add it to the product item
  //const cleanedInstructions = filterInstruction.map(({ index, ...rest }) => rest);

  //addIfNotEmpty(prodWithoutRef, 'ProductItemInstructions', cleanedInstructions);
        

      // Build the product item object
      const prodObj = {
        ...prodWithoutRef,
        itemnumber: idx + 1,
        Chemistry: filteredChem,        
        physicalTests: [], // Initialize physicalTests as an empty array
        ProductItemNameAddress

      };

      const filteredPhysicalTests = PhysicalTests.filter(pt => pt.linenumber === itemnumber).map(pt => {
        pt.linenumber = Number(pt.linenumber);
        pt.value = Number(pt.value); // Ensure value is set in PhysicalTests
        const { linenumber: physicalTestItemNumber, ...physicalwitoutitemnumber } = pt;
        return physicalwitoutitemnumber;
      });
      
      addIfNotEmpty(prodObj, 'physicalTests', filteredPhysicalTests)
      addIfNotEmpty(prodObj, 'Jominy', Jominy.filter(j => j.linenumber === itemnumber))
      addIfNotEmpty(prodObj, 'HeatTreatment', HeatTreatment.filter(ht => ht.linenumber === itemnumber))
      addIfNotEmpty(prodObj, 'Impact', Impact.filter(i => i.linenumber === itemnumber))
      addIfNotEmpty(prodObj, 'MicroInclusion', MicroInclusion.filter(mi => mi.linenumber === itemnumber))


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

}}

module.exports = {
  getInvexRecords863
};

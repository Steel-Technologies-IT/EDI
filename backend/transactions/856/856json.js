 const pool = require("../../db2.js")
  const pool2 = require("../../db.js")
 const { insert856Header, insert856Detail, insert856Measure, insert856Names } = require('./856_insert');
 const { get856InterchangeControl, get856ShipmentHeader, get856HeaderNameAddress, get856HeaderInstructions, 
  get856ShipmentItem, get856ItemInstructions, get856ProductItem, get856Chemistry, get856Damages, get856ProductItemInstructions, 
  get856ProductItemNameAddress, get856TransactionErrors,
  get856TransactionSet} = require('./856_retrieve.js');
 
 // MARK: TRANSLATION MAPS
 const addressTypeMap = {
  ST: "S",
  SE: "B",
  SF: "F",
  SO: "O",
  BT: "I",
  RI: "P",
  MF: "F",
  VN: "G",
  ZJ: "H",
  WH: "U",
  HA: "W",
  OW: "W"
};

const IdentificationCodeQualifierMap = {
ST: "93"
}

const addressNameMap ={
  '790297527': "Mira Loma",
  '080103787': "Mission",
  '832061845': "Santa Teresa",
}

const uomTypeMap = {
  "LB": "LBS"}


 // MARK: Transform Function
 async function transformToStructuredJSON856(records) {

    // Group 40s with their associated 49s
  function group40With49(records) {
    const result = [];
    let current40 = null;
    for (const rec of records) {
      if (rec.record_code === "40") {
        current40 = { ...rec, _49s: [] }; // Create a new object with all 40 fields and an empty _49s array
        result.push(current40);
      } else if (rec.record_code === "49" && current40) {
        current40._49s.push({ ...rec }); // Push the full 49 record, not just record_code
      } else if (rec.record_code === "80") {
        current40 = null;
      }
    }
    return result;
  }
  const getRecords = (code) => records.filter(r => r.record_code === code);

  // Extract records by code
  const CT = getRecords("CT")[0] || {};
  const five = getRecords("05")[0] || {};
  const ten = getRecords("10")[0] || {};
  const eleven = getRecords("11") || [];
  const twelve = getRecords("12") || [];
  const fourteen = getRecords("14")[0] || {};
  const thirty = getRecords("30") || [];
  const forty = getRecords("40") || [];
  const fortynine = getRecords("49") || [];
  const eighty = getRecords("80")[0] || {};
  
  
// Use grouped 40s with their 49s
  const groupedItems = group40With49(records);



//   Insert into 856 Tables
  insert856Header(pool, CT, five, ten, twelve, fourteen, eighty, eleven);

  // Insert names from the eleven records
  for (const address of eleven) {
      await insert856Names(pool, CT, address);
  }


for (const fortyRec of groupedItems) {
  if (fortyRec._49s && fortyRec._49s.length > 0) {
  await insert856Detail(pool, CT, five, ten, thirty, [fortyRec], fortyRec._49s, eleven);
}
  }

// Insert measurements for each 40 and its associated 49s
    for (const fortyRec of groupedItems) {
    if (fortyRec._49s && fortyRec._49s.length > 0) {
        for (const fortynineRec of fortyRec._49s) {
        await insert856Measure(pool, CT, fortyRec, five, ten, fortynineRec, thirty, eleven);
        }
    }
    }




  // Query for Mill value
 const Loc = await pool2.query(
    "SELECT createdatetime FROM steeltechnologies.traffic_cop WHERE isa05senderqualifier = $1 and isa06senderid = $2 and isa07receiverqualifier = $3 and isa08receiverid = $4 and gs02senderid = $5 and gs03receiverid = $6 and st01documentid = $7 and destinationplant = $8",
    [
      CT["ISA Sender ID Qualifier"],
      CT["ISA Sender ID"],
      CT["ISA Receiver ID Qualifier"],
      CT["ISA Receiver ID"],
      CT["GS Sender ID"],
      CT["GS Receiver ID"],
      CT["ST Transaction Set ID"],
      CT["Plant ID Code"]
    ]
  );

  const productItems = groupedItems.map((itm, index) => {
    // Use only the 49s associated with this 40
    const itemChemistry = itm._49s
      .filter(chem => chem["Measurement Reference"] === "CH")
      .map(chem => ({
        EntryType: "V",
        X12ChemElement: chem["Measurement Qualifier"],
        Value: parseFloat(chem["Measurement Value"])
      }))
      .filter(c => c.X12ChemElement && c.Value);
 
    // Defensive checks for PO No and Customer PO Line Number
    let endUserPO = "";
    if (thirty[0] && thirty[0]['PO No'] && thirty[0]['Customer PO Line Number']) {
      const poParts = thirty[0]["PO No"].split("-");
      const poLine = thirty[0]["Customer PO Line Number"];
      endUserPO =
        (poParts[1] ? poParts[1].padStart(8, "0") : "".padStart(8, "0")) +
        "-" +
        (poLine ? poLine.padStart(3, "0") : "".padStart(3, "0"));
    }
    const gaugeObj = itm._49s.find(chem => chem["Measurement Reference"] === "PD" && chem["Measurement Qualifier"] === "TH");
    const gaugeValue = gaugeObj ? parseFloat(gaugeObj["Measurement Value"]) : null;

    const widthObj = itm._49s.find(chem => chem["Measurement Reference"] === "PD" && chem["Measurement Qualifier"] === "WD");
    const widthValue = widthObj ? parseFloat(widthObj["Measurement Value"]) : null;

    const gaugeUM = gaugeObj ? gaugeObj["Measurement UOM"] : null;
    const widthUM = widthObj ? widthObj["Measurement UOM"] : null;

    return {
      VendorTagID: itm["Mill Coil Number"]?.split("-")[0] || "",
      ExternalTagID: itm["Mill Coil Number"]?.split("-")[0] || "",
      CustomerTagNo: itm["Mill Coil Number"]?.split("-")[0] || "",
      ItemNumber: index + 1,
      Mill: (Loc.rows[0]?.createdatetime || "").trim(),
      PartNumber: itm["Part Number5"],
      MillOrderNo: thirty[0]?.["Mill Order Number"] || "",
      Heat: itm["Heat Number"],
      PiecesType: "A",
      EndUserPO: endUserPO,
      ActualWeight: parseFloat(itm["Billed Weight"]),
      X12ActualWeightUM: uomTypeMap[twelve.filter(ship => ship["Weight Qual"] === "N").map(ship => ship["Weight Uom"])],
      ActualGauge1: gaugeValue,
      ActualGauge2: gaugeValue,
      GaugeSize: gaugeValue,
      X12GaugeUM: gaugeUM,
      Width: widthValue,
      ActualWidth1: widthValue,
      ActualWidth2: widthValue,
      X12WidthUM: widthUM,
      Chemistry: itemChemistry
    };
  });



  const structured = {
    InterchangeControl: {
      CompanyID: "STX",
      SenderInterchangeIDQualifier: CT["ISA Sender ID Qualifier"],
      SenderInterchangeID: CT["ISA Sender ID"],
      EDIXControlNumber: CT["Record Key (10-digit integer)"],
      ReceiverInterchangeIDQualifier: CT["ISA Receiver ID Qualifier"],
      ReceiverInterchangeID: CT["ISA Receiver ID"],
      CreatedDateTime: new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 17),
      AlternateInterchangeNumber: CT["GS Control Number"],
      Status: "null",
      TransactionSet: [{
          EDIStandardsOrganizationTransactionSet: "856",
          EDIStandardsOrganization: "X",
          ShipmentHeader: [{
              GrossWeight: ten["Gross Weight"],
              AppointmentNumber: five["ASN Number"],
              AppointmentDateTime: five["ASN Date"],
              CarrierName: fourteen["Transport Route"],
              CarrierReferenceNumber: ten["Conveyance No"],
              VehicleInfo: ten["Conveyance No"],
              
              //Loop For Each Address
              HeaderNameAddress: eleven.filter(addr => addressTypeMap.hasOwnProperty(addr["AddressTypeCode"])).map(addr => ({
                AddressLine1: addr["Line1"],
                AddressLine2: addr["Line2"],
                AddressLine3: addr["Line3"],
                NameLine1: addressNameMap[addr["AddressNo"]],
                AddressType: addressTypeMap[addr["AddressTypeCode"]],
                IdentificationCodeQualifier: IdentificationCodeQualifierMap[addr["AddressTypeCode"]] ? IdentificationCodeQualifierMap[addr["AddressTypeCode"]] : addr["Address ID Qualifier"],
                IdentificationCode: addr["AddressNo"],
                PostalCode: addr["ZipCode"],
                StateProvinceCode: "",
                TelNumber: addr["ContactPhone"],
                City: addr["City"],
                CountryCode: addr["CountryCode"]
              })),
              Item: [{
                  GrossWeight: productItems.reduce((sum, i) => sum + i.ActualWeight, 0),
                  NetWeight: productItems.reduce((sum, i) => sum + i.ActualWeight, 0),
                  PartNumber: thirty[0]["Customer Part No"],
                  X12NetWeightUM: uomTypeMap[twelve.filter(ship => ship["Weight Qual"] === "N").map(ship => ship["Weight Uom"])],
                  X12GrossWeightUM: uomTypeMap[twelve.filter(ship => ship["Weight Qual"] === "G").map(ship => ship["Weight Uom"])],
                  //Loop For Each Item and Its description
                  ProductItem: productItems,

                  STRATIXOrderNumber:  productItems[0]?.EndUserPO || ""
                }],
              X12NetWeightUM: uomTypeMap[twelve.filter(ship => ship["Weight Qual"] === "N").map(ship => ship["Weight Uom"])],
          X12GrossWeightUM: uomTypeMap[twelve.filter(ship => ship["Weight Qual"] === "G").map(ship => ship["Weight Uom"])],
          X12MasterGrossWeightUM: ten["Gross Weight UOM"],
          MasterGrossWeight: ten["Gross Weight"],
          NetWeight: productItems[0]["NetWeight"] || 0,
          TransactionReference: thirty[0]["Bill Lading No"],
          ShipmentMethodOfPayment: ten["Payment Method"],
          TrailerDescription: ten["Conveyance No"],
          ManifestNumber: thirty[0]["Bill Lading No"]
            }
          ],
          TransactionSetControlNumber: CT["GS Control Number"]
        }
      ]
      
    }
  };

  return structured;
}

// MARK: Invex Getters
async function getInvexRecords856(typePK, keyPK) {

  const interchangeControl = await get856Data(get856InterchangeControl, typePK, keyPK);
  const transactionSet = await get856ListData(get856TransactionSet, typePK, keyPK);
  const shipmentHeader = await get856ListData(get856ShipmentHeader, typePK, keyPK);
  const headerNameAddress = await get856ListData(get856HeaderNameAddress, typePK, keyPK);
  const headerInstructions = await get856ListData(get856HeaderInstructions, typePK, keyPK);
  const shipmentItem = await get856ListData(get856ShipmentItem, typePK, keyPK);
  const itemInstructions = await get856ListData(get856ItemInstructions, typePK, keyPK);
  const productItem = await get856ListData(get856ProductItem, typePK, keyPK);
  const chemistries = await get856ListData(get856Chemistry, typePK, keyPK);
  const damages = await get856ListData(get856Damages, typePK, keyPK);
  const productInstructions = await get856ListData(get856ProductItemInstructions, typePK, keyPK);
  const productNameAddress = await get856ListData(get856ProductItemNameAddress, typePK, keyPK);
  const transactionErrors = await get856ListData(get856TransactionErrors, typePK, keyPK);

  return formatStructuredJSON(interchangeControl, transactionSet, shipmentHeader, transactionErrors, headerNameAddress, headerInstructions, shipmentItem, 
    itemInstructions, productItem, chemistries, damages, productInstructions, productNameAddress);
}

async function get856Data (fn, typePK, keyPK) {
  const results = await fn(pool, typePK, keyPK);

  if (results) {
    return Object.entries(results)
      .filter(([key, value]) =>  value!= null)
      .map(([key, value]) => ([key.substring(key.indexOf('_')+1), value]));
  }

  return [];

}

async function get856ListData (fn, typePK, keyPK) {
  const results = await fn(pool, typePK, keyPK);
  let dataList = [];

  for (let res in results) {
    dataList.push(Object.entries(results[res])
    .filter(([key, value]) =>  value!= null)
    .map(([key, value]) => ([key.substring(key.indexOf('_')+1), value])));
  }
  return dataList;
}

const formatStructuredJSON = (interchangeControlData, transactionSetData, shipmentHeaderData, transactionErrorsData, headerNameAddressData, 
  headerInstructionData, shipmentItemData, itemInstructionsData, productItemData, chemistryData, damagesData, productItemInstructionsData, productNameAddressData) => {
  
  //TransactionSet level
  let TransactionSet = Object.values(Object.entries(transactionSetData).map(([, value]) => Object.fromEntries(value)));
  const TransactionErrors = Object.entries(transactionErrorsData).map(([, value]) => Object.fromEntries(value));
  
  //ShipmentHeader level
  let ShipmentHeader = Object.entries(shipmentHeaderData).map(([, value]) => Object.fromEntries(value));
  let HeaderNameAddress = Object.entries(headerNameAddressData).map(([, value]) => Object.fromEntries(value));
  let HeaderInstructions = Object.entries(headerInstructionData).map(([, value]) => Object.fromEntries(value));
  
  //ShipmentItem level
  let ShipmentItem = Object.entries(shipmentItemData).map(([, value]) => Object.fromEntries(value));
  let itemInstructions = Object.entries(itemInstructionsData).map(([, value]) => Object.fromEntries(value));

  //ProductItem level
  let ProductItem = Object.entries(productItemData).map(([, value]) => Object.fromEntries(value));
  const Chemistry = Object.entries(chemistryData).map(([, value]) => Object.fromEntries(value));
  const Damages = Object.entries(damagesData).map(([, value]) => Object.fromEntries(value));
  const ProductItemInstructions = Object.entries(productItemInstructionsData).map(([, value]) => Object.fromEntries(value));
  const ProductItemNameAddress = Object.entries(productNameAddressData).map(([, value]) => Object.fromEntries(value));

  //Build and combine json objects 
  ProductItem = {...ProductItem.at(0), Chemistry, Damages, ProductItemInstructions, ProductItemNameAddress};
  ShipmentItem = {...ShipmentItem.at(0), itemInstructions, ProductItem};
  ShipmentHeader = {...ShipmentHeader.at(0), HeaderNameAddress, HeaderInstructions, ShipmentItem};
  TransactionSet = {...TransactionSet.at(0), ShipmentHeader, TransactionErrors};

  const InterchangeControl = Object.fromEntries(interchangeControlData);
  InterchangeControl['TransactionSet'] = TransactionSet;

  return {InterchangeControl};

};

module.exports = { 
  transformToStructuredJSON856: transformToStructuredJSON856 ,
  getInvexRecords856: getInvexRecords856
};
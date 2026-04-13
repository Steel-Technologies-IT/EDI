const readableErrors = require('../../functions/readableErrors.js');
const queryInvexDatabase = require('../../Invex/InvexConnection.js');
async function insert856InvexOutbound(pool, data, flow, filePath) {
    // Insert the transformed data into the respective output tables
    // Map SNF tables to Invex JSON Structure 
    
        //Convert data to JSON
        data = JSON.parse(data);

        //Grab Interchange Control Values
        const InterchangeControl = {};
        // Get non-array properties from the top-level InterchangeControl object
        for (const [key, value] of Object.entries(data.InterchangeControl)) {
          if (!Array.isArray(value)) {
            InterchangeControl[key] = value;
          }
        }

        //Grab Interchange Control Errors Values
        const flatErrors = data.InterchangeControl.Errors.map(ts => {
          const flat = {};
          for (const [key, value] of Object.entries(ts)) {
              flat[key] = value;
          }
          return flat;
        });

        //Grab Transaction Set Values
        const TransactionSets = data.InterchangeControl.TransactionSet.map(ts => {
          const flat = {};
          for (const [key, value] of Object.entries(ts)) {
            if (!Array.isArray(value)) {
              flat[key] = value;
            }
          }
          return flat;
        });


        //Grab Shipment Header Values
        
        // Flatten all ShipmentHeader objects into a single array, filtering out array properties inside each
        const flatShipmentHeaders = data.InterchangeControl.TransactionSet
        .flatMap(ts => {
          const flat = {};
          for (const [key, value] of Object.entries(ts.ShipmentHeader[0])) {
            if (!Array.isArray(value)) {
              flat[key] = value;
            }
          }
          return flat;
        });


        //Grab Header Name Address Values
        const flatHeaderNameAddresses = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ShipmentHeader)
        .flatMap(header => (header.HeaderNameAddress || []).map(addr => {
          const flat = {};
          for (const [key, value] of Object.entries(addr)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));


        //Grab Header Instructions Values
        const flatHeaderInstructions = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ShipmentHeader)
        .flatMap(header => (header.HeaderInstructions || []).map(instr => {
          const flat = {};
          for (const [key, value] of Object.entries(instr)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));

        //Grab Shipment Item Values
        const flatShipmentItems = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ShipmentHeader)
        .flatMap(header => (header.Item || []).map((item, index) => {
          const flat = {};
          for (const [key, value] of Object.entries(item)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          flat.itemIndex = index + 1; // Add index to identify the item
          return flat;
        }));

        //Grab Product Item Values
        const flatItemInstructions = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ShipmentHeader)
        .flatMap(ts => ts.Item)
        .flatMap(header => (header.ItemInstructions || []).map(item => {
          const flat = {};
          for (const [key, value] of Object.entries(item)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));

        //Grab Product Item Values
        const flatProductItems = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ShipmentHeader)
        .flatMap(ts => ts.Item)
        .flatMap((header, itemIndex) => (header.ProductItem || []).map(item => {
          const flat = {};
          for (const [key, value] of Object.entries(item)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          flat.itemIndex = itemIndex + 1; // Add index to identify the parent item
          return flat;
        }));

        //Grab Chemistry Item Values
        const flatChemistry = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ShipmentHeader)
        .flatMap(ts => ts.Item)
        .flatMap(header => (header.Chemistry || []).map(chem => {
          const flat = {};
          for (const [key, value] of Object.entries(chem)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          // Overwrite LineNumber with header.ItemNumber
          flat.LineNumber = header.ItemNumber;
          return flat;
        }));


        //Grab Product Item  Instructions Values
        const flatProductItemInstructions = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ShipmentHeader)
        .flatMap(ts => ts.Item)
        .flatMap(header => (header.ProductItemInstructions || []).map(instr => {
          const flat = {};
          for (const [key, value] of Object.entries(instr)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));

        //Grab Product Item Name Address Values
        const flatProductItemNameAddress = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ShipmentHeader)
        .flatMap(ts => ts.Item)
        .flatMap(ts => ts.ProductItem)
        .flatMap(header => (header.NameAndAddress || []).map(addr => {
          const flat = {};
          for (const [key, value] of Object.entries(addr)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));

        //Grab Damages Values
        const flatDamages = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ShipmentHeader)
        .flatMap(ts => ts.Item)
        .flatMap(header => (header.Damages || []).map(damage => {
          const flat = {};
          for (const [key, value] of Object.entries(damage)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));

       const results = await pool.query('SELECT * FROM public."856_Invex_InterchangeControl" WHERE ictl_key = $1 AND ictl_type = $2', [
           InterchangeControl.EDIXControlNumber,
           flow
       ]);

       if (results.rows.length > 0) {
        console.log('Deleting existing records with ictl_key:', InterchangeControl.EDIXControlNumber);
        await pool.query(` DELETE FROM public."856_Invex_InterchangeControl" WHERE ictl_key = $1`, [InterchangeControl.EDIXControlNumber]);
        await pool.query(` DELETE FROM public."856_SNF_Header" WHERE hdr_key = $1`, [InterchangeControl.EDIXControlNumber])
       }; // Remove the parameter array






const getcustomerID = async () => {
        try {
          const sql = `select eii_ichg_acct_id from edreii_rec where eii_ichg_acct_typ = 'CU' and eii_edix_iiq = '${InterchangeControl.ReceiverInterchangeIDQualifier}' and eii_edix_ichid = '${InterchangeControl.ReceiverInterchangeID}'`;
          const result = await queryInvexDatabase(sql);

          return result.Data[0]['eii_ichg_acct_id'];
        } catch (error) {
          console.error('Error querying Invex database for customer ID:', error);
          return null;
        }
      };

const getPartNum = async (tag) => {
        try {
          const sql = `SELECT * FROM INTPRD_REC LEFT JOIN INTBAP_REC ON PRD_CMPY_ID = BAP_CMPY_ID AND PRD_ITM_CTL_NO = BAP_ITM_CTL_NO LEFT JOIN INTPFP_REC ON PRD_CMPY_ID = PFP_CMPY_ID AND PRD_ITM_CTL_NO = PFP_ITM_CTL_NO WHERE PRD_TAG_NO = '${tag}'`;
          const result = await queryInvexDatabase(sql);

          const returnPart = result.Data[0]['pfp_part'] || result.Data[0]['bap_bgt_as_part'];
          return returnPart.trim();
        } catch (error) {
          console.error('Error querying Invex database for part number:', error);
          return null;
        }
      };

const getStockTransferPartNum = async (tag, cust_id, Item, ProductItem) => {
  const selectedItem = await Item.find(itm => itm.itemIndex === ProductItem.itemIndex);
  try {
    const sql = `SELECT SUBSTR(itd_bgt_for_id, LENGTH(itd_ownr_ref_id) + 1) AS itd_bgt_for_id_remaining FROM INJITD_REC
    WHERE itd_cmpy_id = '${InterchangeControl.CompanyID}' 
    AND itd_tag_no = '${tag}'
    AND itd_brh = '${InterchangeControl.INVEXBranchCode}'
    AND itd_ref_pfx = 'SH' 
    AND itd_prnt_pfx = '${selectedItem.INVEXReferencePrefix}'        
    AND itd_prnt_no = ${selectedItem.INVEXReferenceNumber}
    AND itd_ownr_ref_id = '${cust_id}'
    AND itd_ownr_tag_no = '${ProductItem.CustomerTagNo}'
    AND itd_heat = '${ProductItem.Heat}'           
  `;
    const result = await queryInvexDatabase(sql);
    return result.Data[0].itd_bgt_for_id_remaining.trim();
  }
  catch (error) {
    console.error('Error querying Invex database for stock transfer part number:', error);
    return null
  }}

const getItemAttributes = async (refprefix, refnumber, refitem) => {
  
  const sql = `SELECT ava_attr, ava_attr_val_var
FROM xctava_rec
WHERE
    ava_tbl_nm = 'ortord'  
    AND ava_key_fld01_var = '${InterchangeControl.CompanyID}'  
    AND ava_key_fld02_var = '${refprefix}'   
    AND ava_key_fld03_var = '${refnumber}' 
    AND ava_key_fld04_var = '${refitem}'    
    AND ava_atmpl = 'SOLINE';`

  const result = await queryInvexDatabase(sql);
  console.log(result.Data)
  return result.Data;
}


const getASNType = async (tag, cust_id, Item, ProductItem) => {
  const selectedItem = await Item.find(itm => itm.itemIndex === ProductItem.itemIndex);
  try {
    const sql = `SELECT COUNT(*) as record_count FROM INJITD_REC
    WHERE itd_cmpy_id = '${InterchangeControl.CompanyID}' 
    AND itd_tag_no = '${tag}'
    AND itd_brh = '${InterchangeControl.INVEXBranchCode}'
    AND itd_ref_pfx = 'SH' 
    AND itd_prnt_pfx = '${selectedItem.INVEXReferencePrefix}'        
    AND itd_prnt_no = ${selectedItem.INVEXReferenceNumber}
    AND itd_ownr_ref_id = '${cust_id}'
    AND itd_ownr_tag_no = '${ProductItem.CustomerTagNo}'
    AND itd_heat = '${ProductItem.Heat}'           
  `;
    const result = await queryInvexDatabase(sql);
    
    // Check if any records were found
    const recordCount = result.Data[0].record_count || result.Data[0]['COUNT(*)'];
    return recordCount > 0 ? 'T' : null;
}
  catch (error) {
    console.error('Error querying Invex database for stock transfer part number:', error);
    return null
  }}

// MARK: Insert into Invex Tables

        try {
        // MARK: Interchange Control Table
        //Invex Interchange Control Table

        await pool.query(`INSERT INTO public."856_Invex_InterchangeControl"(
	ictl_type, ictl_key, ictl_companyid, ictl_senderinterchangeidqualifier, ictl_senderinterchangeid, ictl_edixcontrolnumber, ictl_receiverinterchangeidqualifier, ictl_receiverinterchangeid, ictl_createddatetime, ictl_alternateinterchangenumber, ictl_status, ictl_sndr_brch_ich_idqual, ictl_sndr_brch_ich_id, ictl_invexbranchcode, ictl_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);`, 
        [
                flow,
                InterchangeControl.EDIXControlNumber,
                InterchangeControl.CompanyID,
                InterchangeControl.SenderInterchangeIDQualifier,
                InterchangeControl.SenderInterchangeID,
                InterchangeControl.EDIXControlNumber,
                InterchangeControl.ReceiverInterchangeIDQualifier,
                InterchangeControl.ReceiverInterchangeID,
                InterchangeControl.CreatedDateTime,
                InterchangeControl.AlternateInterchangeNumber,
                InterchangeControl.Status,
                InterchangeControl.SenderBranchInterchangeIDQualifier,     //Needs more of a defining
                InterchangeControl.SenderBranchInterchangeID,              //Needs more of a defining
                InterchangeControl.INVEXBranchCode,                        //Needs more of a defining               
                flow
        ]);} catch (error) {
          console.log(error)
                const readableErrorMessage = readableErrors(error, InterchangeControl.EDIXControlNumber, filePath);
                console.error('-', InterchangeControl.EDIXControlNumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.EDIXControlNumber, '-');
        }


        //MARK: Errors Table
        //Invex Errors Table
         try {
            flatErrors ? await Promise.all(flatErrors.map(async error => {
                        await pool.query(`INSERT INTO public."856_Invex_TransactionErrors"(
		txer_type, txer_key, txer_lineno, txer_messagetext, txer_flow_flag)
		VALUES ($1, $2, $3, $4, $5);`, [
                                flow,
                                InterchangeControl.EDIXControlNumber,
                                error.INVEXInstructionType,
                                error.Text,
                                flow
                        ]);
                })) : null;
        } catch (error) {
                const readableErrorMessage = readableErrors(error, InterchangeControl.EDIXControlNumber, filePath);
                console.error('-', InterchangeControl.EDIXControlNumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.EDIXControlNumber, '-');
        }
      
       // MARK: Transaction Set Table
       //Invex Transaction Set Table
       try {

           TransactionSets ? await Promise.all(TransactionSets.map(async trans_set => {
               await pool.query(`INSERT INTO public."856_Invex_TransactionSet"(
               txs_type, txs_key, txs_transactionsetcontrolnumber, txs_edistandardsorganizationtransactionset, txs_edistandardsorganization, txs_status, txs_flow_flag)
               VALUES ($1, $2, $3, $4, $5, $6, $7);`, [
                   flow,
                   InterchangeControl.EDIXControlNumber,
                trans_set.TransactionSetControlNumber,
                trans_set.EDIStandardsOrganizationTransactionSet,
                trans_set.EDIStandardsOrganization,
                InterchangeControl.Status,
                flow 
                ]);
                })) : null;
       } catch (error) {
        console.error('Error inserting into Transaction Set Table:', error);
        
       }
      

//         // MARK: Shipment Header Table
//        //Invex Shipment Item Table

try {
        flatShipmentHeaders ? await Promise.all(flatShipmentHeaders.map(async flatShipmentHeaders => await pool.query(`INSERT INTO public."856_Invex_ShipmentHeader"(
	ish_type, ish_key, ish_transactionreference, ish_manifestnumber, ish_vendorshipmentreference, ish_shippingdatetime, ish_estimatedarrivaldatetime, ish_x12deliverymethod, ish_carriercodequalifier, ish_carrieridentificationcode, ish_carriername, ish_carrierreferencenumber, ish_vehicleinfo, ish_vehiclelicenseplate, ish_appointmentnumber, ish_gatedock, ish_appointmentdatetime, ish_shipmentmethodofpayment, ish_mastergrossweight, ish_x12mastergrossweightum, ish_numberofpackages, ish_grossweight, ish_x12grossweightum, ish_netweight, ish_x12netweightum, ish_flow_flag, ish_x12shipmentmethodofpayment, ish_transport_rte, ish_trans_method, ish_shipmentqualifier)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30);`, [
              flow,
              InterchangeControl.EDIXControlNumber,
              flatShipmentHeaders.TransactionReference,
              flatShipmentHeaders.ManifestNumber,
              flatShipmentHeaders.VendorShipmentReference,
              flatShipmentHeaders.ShippingDateTime,
              flatShipmentHeaders.EstimatedArrivalDateTime,
              flatShipmentHeaders.X12TransportationMethod,
              flatShipmentHeaders.CarrierCodeQualifier,
flatShipmentHeaders.X12TransportationMethod === 'M' ? flatShipmentHeaders.CarrierIdentificationCode ? flatShipmentHeaders.CarrierIdentificationCode : 'STQK' : flatShipmentHeaders.CarrierIdentificationCode ? flatShipmentHeaders.CarrierIdentificationCode : null,              flatShipmentHeaders.CarrierName,
              flatShipmentHeaders.CarrierReferenceNumber,
              flatShipmentHeaders.VehicleInfo,
              flatShipmentHeaders.VehicleLicensePlate,
              flatShipmentHeaders.AppointmentNumber,
              flatShipmentHeaders.GateDock,
              flatShipmentHeaders.AppointmentDateTime,
              flatShipmentHeaders.ShipmentMethodOfPayment,
              flatShipmentHeaders.MasterGrossWeight,
              flatShipmentHeaders.X12MasterGrossWeightUM,
              flatShipmentHeaders.NumberOfPackages,
              flatShipmentHeaders.GrossWeight,
              flatShipmentHeaders.X12GrossWeightUM,
              flatShipmentHeaders.NetWeight,
              flatShipmentHeaders.X12NetWeightUM,
              flow,
              flatShipmentHeaders.X12ShipmentMethodofPayment,
              flatShipmentHeaders.TransportRoute,
              flatShipmentHeaders.X12TransportationMethod,
              flatShipmentHeaders.ShipmentQualifier
            ])
          )): null;
    } catch (error) {
        console.error('Error inserting into Shipment Header Table:', error);

    }


       
        //MARK: Header Name Address Table
         //Invex Header Name Address Table
                try {
                      flatHeaderNameAddresses ? await Promise.all(flatHeaderNameAddresses.map(async address => {
                        await pool.query(`INSERT INTO public."856_Invex_HeaderNameAddress"(
                        hdna_type, hdna_key, hdna_addresstype, hdna_identificationcodequalifier, hdna_identificationcode, hdna_nameline1, hdna_nameline2, hdna_addressline1, hdna_addressline2, hdna_addressline3, hdna_city, hdna_postalcode, hdna_countrycode, hdna_stateprovincecode, hdna_telareacode, hdna_telnumber, hdna_telextension, hdna_faxareacode, hdna_faxnumber, hdna_faxextension, hdna_flow_flag)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);`, [
                                flow,
                                InterchangeControl.EDIXControlNumber,
                                address.AddressType,
                                address.IdentificationCodeQualifier,
                                address.IdentificationCode,
                                address.NameLine1,
                                address.NameLine2,
                                address.AddressLine1,
                                address.AddressLine2,
                                address.AddressLine3,
                                address.City,
                                address.PostalCode,
                                address.CountryCode,
                                address.StateProvincecode,
                                address.TeleAreaCode,
                                address.TeleNumber,
                                address.TeleExtension,
                                address.FaxAreaCode,
                                address.FaxNumber,
                                address.FaxExtension,
                                flow
                                ])})) : null;
                        
                } catch (error) {
                        console.error('Error inserting into Header Name Address Table:', error);
                }
        
        








//         //MARK: Header Instructions Table
        //Invex Header Instructions Table
        try {
        flatHeaderInstructions ? await Promise.all(flatHeaderInstructions.map(async header => {
        await pool.query(`INSERT INTO public."856_Invex_HeaderInstructions"(
	hdin_type, hdin_key, hdin_invexinstructiontype, hdin_text, hdin_flow_flag)
	VALUES ($1, $2, $3, $4, $5);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                header.INVEXInstructionType,
                header.Text,
                flow
        ]);})) : null
} catch (error) {
        console.error('Error inserting into Header Instructions Table:', error);
}


//         //MARK: Shipment Item Table
//         //Invex Shipment Item Table
try {

        flatShipmentItems ? await Promise.all(flatShipmentItems.map(async Item => {
        const attr = await getItemAttributes(Item.INVEXReferencePrefix, Item.INVEXReferenceNumber, Item.INVEXReferenceItem) || [];
        await pool.query(`INSERT INTO public."856_Invex_ShipmentItem"(
        shp_type, shp_key, shp_referencelinenumber, shp_invexreferencenumber, shp_invexreferenceitem, 
        shp_invexreferencesubitem, shp_stratixordernumber, shp_externalordernumber, 
        shp_externalorderitem, shp_externalorderrelease, shp_externalorderdate, shp_externalcontractnumber, 
        shp_serviceordernumber, shp_enduserpo, shp_partcustomerid, shp_partnumber, shp_partrevisionnumber, 
        shp_enduserreferencelabel1, shp_enduserreference1, shp_enduserreferencelabel2, shp_enduserreference2, 
        shp_enduserreferencelabel3, shp_enduserreference3, shp_enduserreferencelabel4, 
        shp_enduserreference4, shp_enduserreferencelabel5, shp_enduserreference5, shp_partdescription, shp_productdescriptionline1, 
        shp_productdescriptionline2, shp_productdescriptionline3, 
        shp_extendedfinishdescription, shp_multipledimensionid, shp_dimensioncutback, shp_jobsupplydescription,
        shp_numberofpackages, shp_grossweight, 
        shp_x12grossweightum, shp_netweight, shp_x12netweightum, shp_flow_flag, shp_invexreferenceprefix, shp_itemindex, shp_attr_cust_rls, shp_attr_ship_to_po, shp_attr_ship_to_pol, shp_attr_sold_to_po, shp_attr_sold_to_pol)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48);`, [
            flow,
            InterchangeControl.EDIXControlNumber,
            Item.ReferenceLineNumber,
            Item.INVEXReferenceNumber,
            Item.INVEXReferenceItem,
            Item.INVEXReferenceSubItem,
            Item.ServiceOrderNumber,
            Item.ExternalOrderNumber,
            Item.ExternalOrderItem,
            Item.ExternalOrderRelease,
            Item.ExternalOrderDate,
            Item.ExternalContractNumber,
            Item.ServiceOrderNumber,
            Item.EndUserPO,
            Item.PartCustomerID === '' ? await getcustomerID() : Item.PartCustomerID,
            Item.PartNumber,
            Item.PartRevisionNumber,
            Item.EndUserReferenceLabel1,
            Item.EndUserReference1,
            Item.EndUserReferenceLabel2,
            Item.EndUserReference2,
            Item.EndUserReferenceLabel3,
            Item.EndUserReference3,
            Item.EndUserReferenceLabel4,
            Item.EndUserReference4,
            Item.EndUserReferenceLabel5,
            Item.EndUserReference5,
            Item.PartDescription,
            Item.ProductDescriptionLine1,
            Item.ProductDescriptionLine2,
            Item.ProductDescriptionLine3,
            Item.ExtendedFinishDescription,
            Item.MultipleDimensionID,
            Item.DimensionCutBack,
            Item.JobSupplyDescription,
            Item.NumberOfPackages,
            Item.GrossWeight,
            Item.X12GrossWeightUM,
            Item.NetWeight,
            Item.X12NetWeightUM,
            flow,
            Item.INVEXReferencePrefix ? Item.INVEXReferencePrefix : null,
            Item.itemIndex,
            attr.length > 0 ? attr.find(a => a.ava_attr.trim() === 'CUSREL')?.ava_attr_val_var : null,
            attr.length > 0 ? attr.find(a => a.ava_attr.trim() === 'SHPO')?.ava_attr_val_var : null,
            attr.length > 0 ? attr.find(a => a.ava_attr.trim() === 'SHPOLN')?.ava_attr_val_var : null,
            attr.length > 0 ? attr.find(a => a.ava_attr.trim() === 'SOPO')?.ava_attr_val_var : null,
            attr.length > 0 ? attr.find(a => a.ava_attr.trim() === 'SOPOLN')?.ava_attr_val_var : null
        ]);})) : null;
        } catch (error) {
        console.error('Error inserting into Shipment Item Table:', error);
}


//         //MARK: Item Instructions Table
//         //Invex Item Instructions Table
try {
        flatItemInstructions ? await Promise.all(flatItemInstructions.map(async item => {
        await pool.query(`INSERT INTO public."856_Invex_ItemInstructions"(
	itin_type, itin_key, itin_invexinstructiontype, itin_text, itin_flow_flag)
	VALUES ($1, $2, $3, $4, $5);`, [
            flow,
            InterchangeControl.EDIXControlNumber,
            item.INVEXInstructionType,
            item.Text,
            flow
        ])})) : null
} catch (error) {
        console.error("Error inserting into 856_Invex_ItemInstructions:", error);
}
        


//         //MARK: Product Item Instructions Table
//         //Invex Product Item Instructions Table
try {
       flatProductItemInstructions ? await Promise.all(flatProductItemInstructions.map(async item => {

       await pool.query(`INSERT INTO public."856_Invex_ProductItemInstructions"(
	prii_type, prii_key, prii_invexinstructiontype, prii_text, prii_flow_flag, prii_index)
	VALUES ($1, $2, $3, $4, $5, $6);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                item.INVEXInstructionType,
                item.Text,
                flow,
                flatProductItems.ItemNumber // Assuming ItemNumber is the index or identifier for the product item
            ])})) : null;
} catch (error) {
        console.error('Error inserting into Product Item Table:', error);
        
}
         
            
//         //MARK: Product Item Table
//         //Invex Product Item Table
//         
       try {
        flatProductItems ? await Promise.all(flatProductItems.map(async prod => {
            await pool.query(`INSERT INTO public."856_Invex_ProductItem"(
	prd_type, prd_key, prd_itemnumber,prd_taglotid, prd_externaltagid, prd_customertagno, prd_outsideprocessortagid, prd_vendortagid, prd_labelid,
  prd_millorderno, prd_vendorreference, prd_x12packagingcode, prd_materialclassification, prd_materialclassificationdatetime, 
  prd_materialstatus, prd_materialstatusdatetime, prd_processeddate, prd_reapplicationaction, prd_opscurrentprocess, prd_mill, 
  prd_heat, prd_form, prd_grade, prd_size, prd_finish, prd_extended_finish_desc, prd_size_desc, prd_density, prd_coilform, prd_dimensiondesignator, prd_width, prd_x12widthum,
   prd_edgedesignation, prd_length, 
  prd_x12lengthum, prd_gaugesize, prd_x12gaugeum, prd_innerdiameter, prd_x12innerdiameterum, prd_outerdiameter, prd_x12outerdiameterum, 
  prd_randomdimension1, prd_randomdimension2, prd_randomdimension3, prd_randomdimension4, prd_randomdimension5, prd_randomdimension6, 
  prd_randomdimension7, prd_randomdimension8, prd_randomarea, prd_weightperpiece, prd_pieces, prd_piecestype, prd_measure, prd_x12measureum, 
  prd_measuretype, prd_measurequalifier, prd_weight, prd_weight_um, prd_weight_type, prd_net_gross_wgt, prd_coillength, prd_x12coillengthum, prd_coillengthtype, prd_cutnumber, 
  prd_coilinnerdiameter, prd_coilouterdiameter, prd_facewidth, prd_origin_zone_ctry, prd_melted_zone, prd_melted_zone_cntry, prd_actualwidth1, prd_actualwidth2, prd_actuallength1, 
  prd_actuallength2, 
  prd_actualid1, prd_actualid2, prd_actualod1, prd_actualod2, prd_actualgauge1, prd_actualgauge2, prd_actualdiagonal1, prd_actualdiagonal2, 
  prd_actualflatness1, prd_actualflatness2, prd_externalordernumber, prd_externalorderitem, prd_externalorderrelease, prd_externalorderdate, 
  prd_externalcontractnumber, prd_enduserpo, prd_enduserreference, prd_partcustomerid, prd_partnumber, prd_partrevisionnumber, 
  prd_partdescription, prd_flow_flag, prd_itemindex, prd_asntype)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96, $97, $98, $99);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                prod.ItemNumber,
                prod.TagLotID,
                prod.CustomerTagNo, 
                prod.CustomerTagNo,   
                prod.OutsideProcessorTagID,
                prod.VendorTagID,
                prod.LabelID,
                prod.MillOrderNumber,
                prod.VendorReference,
                prod.X12PackagingCode,
                prod.MaterialClassification,
                prod.MaterialClassificationDateTime,
                prod.MaterialStatus,
                prod.MaterialStatusDateTime,
                prod.ProcessedDate, 
                prod.ReapplicationAction,
                prod.OpsCurrentProcess,
                prod.Mill,         
                prod.Heat,
                prod.Form,
                prod.Grade,
                prod.Size,
                prod.Finish,
                prod.ExtendedFinishDescription,
                prod.SizeDescription,
                prod.Density,
                prod.CoilForm,
                prod.DimensionDesignator, 
                prod.Width,
                prod.X12WidthUM,
                prod.EdgeDesignation,
                prod.CoilLength,
                prod.X12CoilLengthUM,
                prod.GaugeSize,
                prod.X12GaugeUM,
                prod.CoilInnerDiameter,
                prod.X12InnerDiameterUM,
                prod.CoilOuterDiameter,
                prod.X12OuterDiameterUM,
                prod.RandomDimension1,
                prod.RandomDimension2,
                prod.RandomDimension3,
                prod.RandomDimension4,
                prod.RandomDimension5,
                prod.RandomDimension6,
                prod.RandomDimension7,
                prod.RandomDimension8,
                prod.RandomArea,
                prod.WeightPerPiece,
                prod.Pieces,
                prod.PiecesType,
                prod.Measure,
                prod.X12MeasureUM,
                prod.MeasureType,
                prod.MeasureQualifier,
                prod.Weight,
                prod.X12WeightUM,
                prod.WeightType,
                prod.NetGrossWeightQualifier,
                prod.CoilLength,
                prod.X12CoilLengthUM,
                prod.CoilLengthType,
                prod.CutNumber,
                prod.CoilInnerDiameter,
                prod.CoilOuterDiameter,
                prod.FaceWidth,
                prod.OriginZoneCountry,
                prod.MeltedZone,
                prod.MeltedZoneCountry,
                prod.ActualWidth1,
                prod.ActualWidth2,
                prod.ActualLength1,
                prod.ActualLength2,
                prod.ActualID1,
                prod.ActualID2,
                prod.ActualOD1,
                prod.ActualOD2,
                prod.ActualGauge1,
                prod.ActualGauge2,
                prod.ActualDiagonal1,
                prod.ActualDiagonal2,
                prod.ActualFlatness1,
                prod.ActualFlatness2,
                prod.ExternalOrderNumber,
                prod.ExternalOrderItem,
                prod.ExternalOrderRelease,
                prod.ExternalOrderDate,
                prod.ExternalContractNumber,
                prod.EndUserPO,
                prod.EndUserReference,
                prod.PartCustomerID === '' ? await getcustomerID() : prod.PartCustomerID,
                prod.PartNumber === '' ? flatShipmentHeaders[0].ShipmentQualifier === 'P' ? await getStockTransferPartNum(prod.TagLotID, prod.PartCustomerID === '' ? await getcustomerID() : prod.PartCustomerID, flatShipmentItems, prod) : await getPartNum(prod.TagLotID) : prod.PartNumber,
                prod.PartRevisionNumber,
                prod.PartDescription,
                flow,
                prod.itemIndex,
                await getASNType(prod.LiftID ? prod.LiftID : prod.TagLotID, prod.PartCustomerID === '' ? await getcustomerID() : prod.PartCustomerID, flatShipmentItems, prod)
            ]);
        })) : null;
    } catch (error) {
        console.error('Error inserting into Product Item Table:', error);
    }


//         //MARK: Product Item Name Address Table
//         //Invex Product Item Name Address Table
try {
    flatProductItemNameAddress ? await Promise.all(flatProductItemNameAddress.map(async nameAddress => {
        await pool.query(`INSERT INTO public."856_Invex_ProductItemNameAddress"(
	prna_type, prna_key, prna_addresstype, prna_identificationcodequalifier, prna_identificationcode, prna_nameline1, prna_nameline2, prna_addressline1, prna_addressline2, prna_addressline3, prna_city, prna_postalcode, prna_countrycode, prna_stateprovincecode, prna_telareacode, prna_telnumber, prna_telextension, prna_faxareacode, prna_faxnumber, prna_faxextension, prna_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);`, [
            flow,                                   //$1
            InterchangeControl.EDIXControlNumber,  //$2
            nameAddress.AddressType,        //$3
            nameAddress.IdentificationCodeQualifier, //$4
            nameAddress.IdentificationCode,         //$5
            nameAddress.NameLine1,                  //$6
            nameAddress.NameLine2,                  //$7
            nameAddress.AddressLine1,               //$8
            nameAddress.AddressLine2,               //$9
            nameAddress.AddressLine3,               //$10
            nameAddress.City,                       //$11
            nameAddress.PostalCode,                 //$12
            nameAddress.CountryCode,                //$13
            nameAddress.StateProvincecode,         //$14
            nameAddress.TelAreaCode,         //$15
            nameAddress.TelNumber,           //$16
            nameAddress.TelExtension,        //$17
            nameAddress.FaxAreaCode,               //$18
            nameAddress.FaxNumber,                  //$19
            nameAddress.FaxExtension,               //$20
            flow                                    //$21
        ]);
    })) : null;
} catch (error) {
    console.error("Error inserting into 856_Invex_Product_Item_Name_Address:", error);
}



       //MARK: Chemistry Table
//         //Invex Chemistry Table
//        
try {
        flatChemistry ? await Promise.all(flatChemistry.map(async chem => {
            await pool.query(`INSERT INTO public."856_Invex_Chemistry"(
                chm_type, chm_key, chm_linenumber, chm_x12chemelement, chm_entrytype, chm_value, chm_minvalue, chm_maxvalue, chm_flow_flag
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                chem.LineNumber,
                chem.X12ChemElement,
                chem.EntryType,
                chem.Value,
                chem.MinValue,
                chem.MaxValue,
                flow
            ]);
        })) : null;
    } catch (error) {
        console.error("Error inserting into 856_Invex_Chemistry:", error);
            }

//         //MARK: Damages Table
//         //Invex Damages Table

try {
    flatDamages ? await Promise.all(flatDamages.map(async damage => {
        await pool.query(`INSERT INTO public."856_Invex_Damages"(
            dmg_type, dmg_key, dmg_linenumber, dmg_damagecode, dmg_faultcode, dmg_flow_flag
        ) VALUES ($1, $2, $3, $4, $5, $6);`, [
            flow,
            InterchangeControl.EDIXControlNumber,
            damage.LineNumber,
            damage.DamageCode,
            damage.FaultCode,
            flow
        ]);
    })) : null;
} catch (error) {
    console.error("Error inserting into 856_Invex_Damages:", error);
}


        
return InterchangeControl.EDIXControlNumber;
    
}

module.exports = {
    insert856InvexOutbound
}
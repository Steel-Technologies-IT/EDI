
const readableErrors = require('../../functions/readableErrors.js');
async function insert846InvexOutbound(pool, data, flow, filePath) {
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


        //Grab Hand Off Header Values
        
        // Flatten all HandoffHeader objects
        // into a single array, filtering out array properties inside each
console.log(data.InterchangeControl.TransactionSet)
 
        const flatHandoffHeader = data.InterchangeControl.TransactionSet
        .flatMap(ts => {
          const flat = {};
          for (const [key, value] of Object.entries(ts.InventoryHandoffHeader[0])) {
            if (!Array.isArray(value)) {
              flat[key] = value;
            }
          }
          return flat;
        });


        //Grab Header Name Address Values
       const flatHeaderNameAddresses = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.InventoryHandoffHeader)
        .flatMap(header => (header.HeaderNameAddress || []).map(addr => {
          const flat = {};
          for (const [key, value] of Object.entries(addr)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));



        //Grab Product Item Values
        const flatProductItems = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.InventoryHandoffHeader)
        .flatMap(header => (header.ProductItem || []).map(ProductItem => {
          const flat = {};
          for (const [key, value] of Object.entries(ProductItem)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));

       //Grab Damages Values
        const flatDamages = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.InventoryHandoffHeader)
        .flatMap(header => (header.Damages || []).map(item => {
          const flat = {};
          for (const [key, value] of Object.entries(item)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));
       

// MARK: Insert into Invex Tables
    
        try {
        // MARK: Interchange Control Table
        //Invex Interchange Control Table

        await pool.query(`INSERT INTO public."846_Invex_InterchangeControl"(
  intctl_company_id, intctl_sender_interchange_id_qualifier, intctl_sender_interchange_id, intctl_edix_control_number, intctl_receiver_interchange_id_qualifier, intctl_receiver_interchange_id, intctl_created_datetime, intctl_alternate_interchange_number, intctl_status, intctl_flow_flag, intctl_type, intctl_key, intctl_sndr_brch_ich_idqual, intctl_sndr_brch_ich_id, intctl_invexbranchcode)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);`, 
        [
                
                InterchangeControl.CompanyID,
                InterchangeControl.SenderInterchangeIDQualifier,
                InterchangeControl.SenderInterchangeID,
                InterchangeControl.EDIXControlNumber,
                InterchangeControl.ReceiverInterchangeIDQualifier,
                InterchangeControl.ReceiverInterchangeID,
                InterchangeControl.CreatedDateTime,
                InterchangeControl.AlternateInterchangeNumber,
                InterchangeControl.Status,
                flow,
                flow, 
                InterchangeControl.EDIXControlNumber,  
                InterchangeControl.SenderBranchInterchangeIDQualifier,
                InterchangeControl.SenderBranchInterchangeID,
                InterchangeControl.INVEXBranchCode,            
                
        ]);} catch (error) {
          console.log(error)
                const readableErrorMessage = readableErrors(error, InterchangeControl.EDIXControlNumber, filePath);
                console.error('-', InterchangeControl.EDIXControlNumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.EDIXControlNumber, '-');
        }


        //MARK: Errors Table
        //Invex Errors Table
         try {
            flatErrors ? await Promise.all(flatErrors.map(async error => {
                        await pool.query(`INSERT INTO public."846_Invex_TransactionErrors"(
    err_lineno, err_messagetext, err_flow_flag, err_type, err_key)
    VALUES ($1, $2, $3, $4, $5);`, [
                                flow,
                                InterchangeControl.EDIXControlNumber,
                                error.INVEXInstructionType,
                                error.Text,
                                flow
                        ]);
                })) : null;
        } catch (error) {console.log(error)
                const readableErrorMessage = readableErrors(error, InterchangeControl.EDIXControlNumber, filePath);
                console.error('-', InterchangeControl.EDIXControlNumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.EDIXControlNumber, '-');
        }
      
       // MARK: Transaction Set Table
       //Invex Transaction Set Table
       try {

            
           TransactionSets ? await Promise.all(TransactionSets.map(async trans_set => {
               await pool.query(`INSERT INTO public."846_Invex_TransactionSet"(
              trnset_transaction_set_control_number, trnset_edi_standards_org_transaction_set, trnset_edi_standards_organization, trnset_status, trnset_flow_flag, trnset_type, trnset_key)
              VALUES ($1, $2, $3, $4, $5, $6, $7);`, [
                trans_set.TransactionSetControlNumber,
                trans_set.EDIStandardsOrganizationTransactionSet,
                trans_set.EDIStandardsOrganization,
                InterchangeControl.Status,
                flow,
                flow,
                InterchangeControl.EDIXControlNumber
                          
                ]);
                })) : null;
       } catch (error) {
        console.error('Error inserting into Transaction Set Table:', error);
        
       }
      

//         // MARK: Shipment Header Table
//        //Invex Shipment Item Table
            

try {
        flatHandoffHeader ? await Promise.all(flatHandoffHeader.map(async flatHandoffHeader => await pool.query(`INSERT INTO public."846_Invex_InventoryHandoffHeader"(
  invhdr_transaction_reference, invhdr_weight, invhdr_x12_weight_um, invhdr_flow_flag, invhdr_type, invhdr_key)
  VALUES ($1, $2, $3, $4, $5, $6);`, [
                           
              flatHandoffHeader.TransactionReference,
              flatHandoffHeader.TotalWeight,
              flatHandoffHeader.X12TotalWeightUM,
              flow,
              flow,
              InterchangeControl.EDIXControlNumber
              
            ])
          )): null;
    } catch (error) {
        console.error('Error inserting into Shipment Header Table:', error);

    }
       try {
        flatProductItems ? await Promise.all(flatProductItems.map(async prod => {  await pool.query(`INSERT INTO public."846_Invex_ProductItem"(
  prditm_itemnumber, prditm_taglotid, prditm_externaltagid, prditm_customertagno, prditm_outsideprocessortagid, prditm_vendortagid, prditm_millorderno, prditm_vendorreference, prditm_x12_packagingcode, prditm_materialclassification, prditm_materialclassificationdatetime, prditm_materialstatus, prditm_materialstatusdatetime, prditm_processeddate, prditm_reapplicationaction, prditm_opscurrentprocess, prditm_mill, prditm_heat, prditm_coilform, prditm_dimensiondesignator, prditm_width, prditm_x12widthum, prditm_edgedesignation, prditm_length, prditm_x12lengthum, prditm_gaugesize, prditm_x12gaugeum, prditm_innerdiameter, prditm_x12innerdiameterum, prditm_outerdiameter, prditm_x12outerdiameterum, prditm_opsouterdiameterum, prditm_randomdimension1, prditm_randomdimension2, prditm_randomdimension3, prditm_randomdimension4, prditm_randomdimension5, prditm_randomdimension6, prditm_randomdimension7, prditm_randomdimension8, prditm_randomarea, prditm_weightperpiece, prditm_pieces, prditm_piecestype, prditm_measure, prditm_x12measureum, prditm_measuretype, prditm_measurequalifier, prditm_theoreticalweight, prditm_x12theoreticalweightum, prditm_theoreticalnetgrossweight, prditm_actualweight, prditm_x12actualweightum, prditm_actualnetgrossweightqualifier, prditm_coillength, prditm_x12coillengthum, prditm_coillengthtype, prditm_cutnumber, prditm_coilinnerdiameter, prditm_coilouterdiameter, prditm_stxcoilouterdiameter, prditm_facewidth, prditm_actualwidth1, prditm_actualwidth2, prditm_actuallength1, prditm_actuallength2, prditm_actualid1, prditm_actualid2, prditm_actualod1, prditm_actualod2, prditm_actualgauge1, prditm_actualgauge2, prditm_actualdiagonal1, prditm_actualdiagonal2, prditm_actualflatness1, prditm_actualflatness2, prditm_externalordernumber, prditm_externalorderitem, prditm_externalorderrelease, prditm_externalorderdate, prditm_externalcontractnumber, prditm_enduserpo, prditm_enduserreference, prditm_partcustomerid, prditm_partnumber, prditm_partrevisionnumber, prditm_partdescription, prditm_meltedzone, prditm_meltedzonecountry, prditm_originzone, prditm_originzonecountry, prditm_flow_flag, prditm_type, prditm_key, prditm_labelid, prditm_form, prditm_grade, prditm_size, prditm_finish, prditm_ext_fin_desc, prditm_siz_desc, prditm_wgt_type, prditm_net_gross_wgt, prditm_density, prditm_transactionreference)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
   $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, 
   $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, 
   $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, 
   $89, $90, $91, $92, $93, $94, $95, $96, $97, $98, $99, $100, $101, $102, $103, $104, $105);`, [
              prod.ItemNumber,
              prod.TagLotID,
              prod.externaltagid, 
              prod.CustomerTagNo,   
              prod.OutsideProcessorTagID,
              prod.VendorTagID,
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
              prod.CoilForm,
              prod.CoilForm,
              prod.Width,
              prod.X12WidthUM,
              prod.EdgeDesignation,
              prod.Length,
              prod.X12LengthUM,
              prod.GaugeSize,
              prod.X12GaugeUM,
              prod.InnerDiameter,
              prod.X12InnerDiameterUM,
              prod.OuterDiameter,
              prod.X12OuterDiameterUM,
              prod.opsouterdiameterum,
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
              prod.theoreticalweight,
              prod.theoreticalweightum,
              prod.theoreticalnetgrossweight,
              prod.Weight,
              prod.X12WeightUM,
              prod.NetGrossWeightQualifier,
              prod.CoilLength,
              prod.X12CoilLengthUM,
              prod.CoilLengthType,
              prod.CutNumber,
              prod.CoilInnerDiameter,
              prod.CoilInnerDiameter,
              prod.stxcoilouterdiameter,
              prod.FaceWidth,
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
              prod.PartCustomerID,
              prod.PartNumber,
              prod.PartRevisionNumber,
              prod.PartDescription,
              prod.MeltedZone,
              prod.MeltedZoneCountry,
              prod.originzone,
              prod.OriginZoneCountry,
              flow,
              flow,
              InterchangeControl.EDIXControlNumber,
              prod.LabelID,
              prod.Form,
              prod.Grade,
              prod.Size,
              prod.Finish,
              prod.ExtendedFinishDescription,
              prod.SizeDescription,
              prod.WeightType,
              prod.NetGrossWeight,
              prod.Density,
              flatHandoffHeader.TransactionReference


            ]);
        })) : null;
    } catch (error) {
        console.error('Error inserting into Product Item Table:', error);
    }
   

       
        //MARK: Header Name Address Table
         //Invex Header Name Address Table
                try {
                      flatHeaderNameAddresses ? await Promise.all(flatHeaderNameAddresses.map(async address => {
                        await pool.query(`INSERT INTO public."846_Invex_HeaderNameAddress"(
                        hdradr_addresstype, hdradr_identificationcodequalifier, hdradr_identificationcode, hdradr_nameline1, hdradr_nameline2, hdradr_addressline1, hdradr_addressline2, hdradr_addressline3, hdradr_city, hdradr_postalcode, hdradr_countrycode, hdradr_stateprovincecode, hdradr_telareacode, hdradr_telnumber, hdradr_telextension, hdradr_faxareacode, hdradr_faxnumber, hdradr_faxextension, hdradr_flow_flag, hdradr_type, hdradr_key)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);`, [
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
                                address.TelAreaCode,
                                address.TelNumber,
                                address.TelExtension,
                                address.FaxAreaCode,
                                address.FaxNumber,
                                address.FaxExtension,
                                flow,
                                flow, 
                                InterchangeControl.EDIXControlNumber
                                
                                
                                ])})) : null;
                        
                } catch (error) {
                        console.error('Error inserting into Header Name Address Table:', error);
                }
 

        //MARK: Damages Table
        //Invex Damages Table
try {
    flatDamages ? await Promise.all(flatDamages.map(async damage => {
        await pool.query(`INSERT INTO public."846_Invex_Damage"(
            dam_linenumber, dam_opsdamagecode, dam_opsfaultcode, dam_flow_flag, dam_type, dam_key)
            VALUES ($1, $2, $3, $4, $5, $6);`, [
            flow,
            InterchangeControl.EDIXControlNumber,  // Assuming Key is a unique identifier for the damage record         
            damage.LineNumber,
            damage.OpsDamageCode,
            damage.OpsFaultCode,
            flow
         ]);
    })) : null;
} catch (error) {
    console.error("Error inserting into 846_Invex_Damages:", error);
}


        
return InterchangeControl.EDIXControlNumber;
    
}

module.exports = {
    insert846InvexOutbound
}
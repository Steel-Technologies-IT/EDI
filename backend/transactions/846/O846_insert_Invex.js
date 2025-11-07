
const readableErrors = require('../../functions/readableErrors.js');
async function insert846InvexOutbound(pool, data, flow, filePath) {
    // Insert the transformed data into the respective output tables
    // Map SNF tables to Invex JSON Structure 
    console.log('Inserting 846 Invex Outbound Data:', flow, filePath);
        //Convert data to JSON
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
        //Grab Interchange Control Values
        const InterchangeControl = {};
        // Get non-array properties from the top-level InterchangeControl object
        for (const [key, value] of Object.entries(data.InterchangeControl)) {
          if (!Array.isArray(value)) {
            InterchangeControl[key] = value;
          }
        }

        //Grab Interchange Control Errors Values
        const flatErrors = (data.InterchangeControl.Errors || []).map(ts => {
          const flat = {};
          for (const [key, value] of Object.entries(ts)) {
              flat[key] = value;
          }
          return flat;
        });

        //Grab Transaction Set Values
        const TransactionSets = (data.InterchangeControl.TransactionSet || []).map(ts => {
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
 
        const flatHandoffHeader = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.flatHandoffHeader || [])
        .map(header => {
          const flat = {};
          for (const [key, value] of Object.entries(header)) {
            if (!Array.isArray(value)) {
              flat[key] = value;
            }
          }
          return flat;
        });


        //Grab Header Name Address Values
       const flatHeaderNameAddresses = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.InventoryHandoffHeader || [])
        .flatMap(header => (header.HeaderNameAddress || []).map(addr => {
          const flat = {};
          for (const [key, value] of Object.entries(addr)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));


        //Grab Product Item Values
        const flatProductItems = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.InventoryHandoffHeader || [])
        .flatMap(header => (header.ProductItem || [])
        .map(ProductItem => {
          const flat = {};
          for (const [key, value] of Object.entries(ProductItem)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));

       //Grab Damages Values
        const flatDamages = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.InventoryHandoffHeader || [])
        .flatMap(header => (header.Damages || []).map(item => {
          const flat = {};
          for (const [key, value] of Object.entries(item)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));
       
        //Delete the records having the same EDIX control number, if found.

       const results = await pool.query('SELECT * FROM public."846_Invex_InterchangeControl" WHERE ictl_key = $1 AND ictl_type = $2', [
           InterchangeControl.EDIXControlNumber,
           flow
       ]);

       if (results.rows.length > 0) {
        await pool.query(`DO $$
DECLARE
    r RECORD;
    colname TEXT;
    match_found BOOLEAN;
    control_number TEXT := '${InterchangeControl.EDIXControlNumber}';
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename LIKE '846_%'
    LOOP
        -- Find a column ending in '_key'
        SELECT column_name INTO colname
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = r.tablename
          AND column_name LIKE '%\_key' ESCAPE '\'
        LIMIT 1;

        IF colname IS NOT NULL THEN
            -- Check if the value exists in that column
            EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE %I = %L)', r.tablename, colname, control_number)
            INTO match_found;

            IF match_found THEN
                -- Delete only the rows that match the condition
                EXECUTE format('DELETE FROM public.%I WHERE %I = %L', r.tablename, colname, control_number);
            END IF;
        END IF;
    END LOOP;
END $$;`); // Remove the parameter array
}

// MARK: Insert into Invex Tables
    
        try {
        // MARK: Interchange Control Table
        //Invex Interchange Control Table

        await pool.query(`INSERT INTO public."846_Invex_InterchangeControl"(
  ictl_company_id, ictl_sender_interchange_id_qualifier, ictl_sender_interchange_id, ictl_edix_control_number, ictl_receiver_interchange_id_qualifier, ictl_receiver_interchange_id, ictl_created_datetime, ictl_alternate_interchange_number, ictl_status, ictl_flow_flag, ictl_type, ictl_key, ictl_sndr_brch_ich_idqual, ictl_sndr_brch_ich_id, ictl_invexbranchcode)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);`, 
        [
                
                InterchangeControl.CompanyID, //$1 
                InterchangeControl.SenderInterchangeIDQualifier, //$2
                InterchangeControl.SenderInterchangeID, //$3
                InterchangeControl.EDIXControlNumber, //$4
                InterchangeControl.ReceiverInterchangeIDQualifier, //$5
                InterchangeControl.ReceiverInterchangeID, //$6
                InterchangeControl.CreatedDateTime, //$7
                InterchangeControl.AlternateInterchangeNumber, //$8
                InterchangeControl.Status, //$9
                flow, //$10
                flow, //$11
                InterchangeControl.EDIXControlNumber,  //$12
                InterchangeControl.SenderBranchInterchangeIDQualifier, //$13
                InterchangeControl.SenderBranchInterchangeID, //$14
                InterchangeControl.INVEXBranchCode, //$15           
                
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
                                error.INVEXInstructionType,
                                error.Text,
                                flow,
                                flow,
                                InterchangeControl.EDIXControlNumber
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
  prditm_itemnumber, prditm_taglotid, prditm_externaltagid, prditm_customertagno, 
  prditm_outsideprocessortagid, prditm_vendortagid, prditm_millorderno, prditm_vendorreference, 
  prditm_x12_packagingcode, prditm_materialclassification, prditm_materialclassificationdatetime, 
  prditm_materialstatus, prditm_materialstatusdatetime, prditm_processeddate, prditm_reapplicationaction, 
  prditm_opscurrentprocess, prditm_mill, prditm_heat, prditm_coilform, prditm_dimensiondesignator, 
  prditm_width, prditm_x12widthum, prditm_edgedesignation, prditm_length, prditm_x12lengthum, 
  prditm_gaugesize, prditm_x12gaugeum, prditm_innerdiameter, prditm_x12innerdiameterum, 
  prditm_outerdiameter, prditm_x12outerdiameterum, prditm_opsouterdiameterum, prditm_randomdimension1, 
  prditm_randomdimension2, prditm_randomdimension3, prditm_randomdimension4, prditm_randomdimension5, 
  prditm_randomdimension6, prditm_randomdimension7, prditm_randomdimension8, prditm_randomarea, 
  prditm_weightperpiece, prditm_pieces, prditm_piecestype, prditm_measure, prditm_x12measureum, 
  prditm_measuretype, prditm_measurequalifier, prditm_theoreticalweight, prditm_x12theoreticalweightum, 
  prditm_theoreticalnetgrossweight, prditm_actualweight, prditm_x12actualweightum, 
  prditm_actualnetgrossweightqualifier, prditm_coillength, prditm_x12coillengthum, prditm_coillengthtype,
  prditm_cutnumber, prditm_coilinnerdiameter, prditm_coilouterdiameter, prditm_stxcoilouterdiameter,
  prditm_facewidth, prditm_actualwidth1, prditm_actualwidth2, prditm_actuallength1, prditm_actuallength2, 
  prditm_actualid1, prditm_actualid2, prditm_actualod1, prditm_actualod2, prditm_actualgauge1, 
  prditm_actualgauge2, prditm_actualdiagonal1, prditm_actualdiagonal2, prditm_actualflatness1, 
  prditm_actualflatness2, prditm_externalordernumber, prditm_externalorderitem, 
  prditm_externalorderrelease, prditm_externalorderdate, prditm_externalcontractnumber, prditm_enduserpo, 
  prditm_enduserreference, prditm_partcustomerid, prditm_partnumber, prditm_partrevisionnumber, 
  prditm_partdescription, prditm_meltedzone, prditm_meltedzonecountry, prditm_originzone, 
  prditm_originzonecountry, prditm_flow_flag, prditm_type, prditm_key, prditm_labelid, prditm_form, 
  prditm_grade, prditm_size, prditm_finish, prditm_ext_fin_desc, prditm_siz_desc, prditm_wgt_type, 
  prditm_net_gross_wgt, prditm_density, prditm_transactionreference)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
   $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, 
   $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, 
   $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, 
   $89, $90, $91, $92, $93, $94, $95, $96, $97, $98, $99, $100, $101, $102, $103, $104, $105);`, [
              prod.ItemNumber, //$1
              prod.TagLotID,  //$2
              prod.externaltagid, //$3
              prod.CustomerTagNo,    //$4
              prod.OutsideProcessorTagID, //$5  
              prod.VendorTagID, //$6
              prod.MillOrderNumber, //$7
              prod.VendorReference, //$8
              prod.X12PackagingCode, //$9
              prod.MaterialClassification, //$10
              prod.MaterialClassificationDateTime, //$11
              prod.MaterialStatus, //$12 
              prod.MaterialStatusDateTime, //$13
              prod.ProcessedDate, //$14 
              prod.ReapplicationAction, //$15
              prod.OpsCurrentProcess, //$16
              prod.Mill, //$17             
              prod.Heat, //$18
              prod.CoilForm, //$19
              prod.CoilForm, //$20
              prod.Width, //$21
              prod.X12WidthUM, //$22
              prod.EdgeDesignation, //$23
              prod.Length, //$24
              prod.X12LengthUM, //$25
              prod.GaugeSize, //$26
              prod.X12GaugeUM, //$27
              prod.InnerDiameter, //$28
              prod.X12InnerDiameterUM, //$29
              prod.OuterDiameter, //$30
              prod.X12OuterDiameterUM, //$31
              prod.opsouterdiameterum, //$32
              prod.RandomDimension1, //$33
              prod.RandomDimension2, //$34
              prod.RandomDimension3, //$35
              prod.RandomDimension4, //$36
              prod.RandomDimension5, //$37
              prod.RandomDimension6, //$38 
              prod.RandomDimension7, //$39
              prod.RandomDimension8, //$40
              prod.RandomArea, //$41
              prod.WeightPerPiece, //$42
              prod.Pieces, //$43
              prod.PiecesType, //$44
              prod.Measure, //$45
              prod.X12MeasureUM, //$46
              prod.MeasureType, //$47
              prod.MeasureQualifier, //$48
              prod.theoreticalweight, //$49
              prod.theoreticalweightum, //$50
              prod.theoreticalnetgrossweight, //$51
              prod.Weight, //$52
              prod.X12WeightUM, //$53
              prod.NetGrossWeightQualifier, //$54
              prod.CoilLength, //$55
              prod.X12CoilLengthUM, //$56
              prod.CoilLengthType, //$57
              prod.CutNumber, //$58
              prod.CoilInnerDiameter, //$59
              prod.CoilInnerDiameter, //$60
              prod.stxcoilouterdiameter, //$61
              prod.FaceWidth, //$62
              prod.ActualWidth1, //$63
              prod.ActualWidth2, //$64
              prod.ActualLength1, //$65
              prod.ActualLength2, //$66
              prod.ActualID1, //$67
              prod.ActualID2, //$68
              prod.ActualOD1, //$69
              prod.ActualOD2, //$70
              prod.ActualGauge1, //$71
              prod.ActualGauge2, //$72
              prod.ActualDiagonal1, //$73
              prod.ActualDiagonal2, //$74
              prod.ActualFlatness1, //$75
              prod.ActualFlatness2, //$76
              prod.ExternalOrderNumber, //$77
              prod.ExternalOrderItem, //$78
              prod.ExternalOrderRelease, //$79
              prod.ExternalOrderDate, //$80
              prod.ExternalContractNumber, //$81
              prod.EndUserPO, //$82
              prod.EndUserReference, //$83
              prod.PartCustomerID, //$84
              prod.PartNumber, //$85
              prod.PartRevisionNumber, //$86
              prod.PartDescription, //$87
              prod.MeltedZone, //$88
              prod.MeltedZoneCountry, //$89
              prod.originzone, //$90
              prod.OriginZoneCountry, //$91
              flow, //$92
              flow, //$93
              InterchangeControl.EDIXControlNumber, //$94
              prod.LabelID, //$95
              prod.Form, //$96
              prod.Grade, //$97
              prod.Size, //$98
              prod.Finish, //$99
              prod.ExtendedFinishDescription, //$100
              prod.SizeDescription, //$101
              prod.WeightType, //$102
              prod.NetGrossWeight, //$103
              prod.Density, //$104
              flatHandoffHeader.TransactionReference //$105


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
            damage.LineNumber,
            damage.OpsDamageCode,
            damage.OpsFaultCode,
            flow,
            flow,
            InterchangeControl.EDIXControlNumber
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
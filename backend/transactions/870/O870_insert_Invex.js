const readableErrors = require('../../functions/readableErrors.js');
const queryInvexDatabase = require('../../Invex/InvexConnection.js');
async function insert870InvexOutbound(pool, data, flow, filePath) {
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


        //Grab ProductionReporting Header Values
        
        // Flatten all ProductionReportingHeader objects into a single array, filtering out array properties inside each
        const flatProductionReportingHeaders = data.InterchangeControl.TransactionSet
        .flatMap(ts => {
        if (Array.isArray(ts.ProductionReportingHeader) && ts.ProductionReportingHeader.length > 0) {
        const flat = {};
        for (const [key, value] of Object.entries(ts.ProductionReportingHeader[0])) {
        if (!Array.isArray(value)) {
          flat[key] = value;
          }
        }
        return flat;
        }
        return []; // Return empty array if not present
        });

        //Grab Header Name Address Values
        const flatHeaderNameAddresses = data.InterchangeControl.TransactionSet
        .flatMap(ts => Array.isArray(ts.ProductionReportingHeader) ? ts.ProductionReportingHeader : [])
        .flatMap(header => Array.isArray(header.HeaderNameAddress) ? header.HeaderNameAddress : [])
        .map(addr => {
        const flat = {};
        for (const [key, value] of Object.entries(addr)) {
          if (!Array.isArray(value)) flat[key] = value;
        }
        return flat;
        });

        //Grab Header Instructions Values
        const flatHeaderInstructions = data.InterchangeControl.TransactionSet
        .flatMap(ts => Array.isArray(ts.ProductionReportingHeader) ? ts.ProductionReportingHeader : [])
        .flatMap(header => Array.isArray(header.HeaderInstructions) ? header.HeaderInstructions : [])
        .map(instr => {
          const flat = {};
          for (const [key, value] of Object.entries(instr)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        });

        //Grab NonRecordedScrapItems Values
        const flatNonRecordedScrapItems = data.InterchangeControl.TransactionSet
        .flatMap(ts => Array.isArray(ts.ProductionReportingHeader) ? ts.ProductionReportingHeader : [])
        .flatMap(header => Array.isArray(header.NonRecordedScrapItems) ? header.NonRecordedScrapItems : [])
        .map(NonRecordedScrapItems => {
          const flat = {};
          for (const [key, value] of Object.entries(NonRecordedScrapItems)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        });      

        //Grab Product Item Values
    const flatProductItems = data.InterchangeControl.TransactionSet
    .flatMap((ts, tsIndex) => {
        // Prefer ProductItem under ProductionReportingHeader if present
        if (Array.isArray(ts.ProductionReportingHeader) && ts.ProductionReportingHeader.length > 0) {
        // Flatten all ProductItems from all ProductionReportingHeaders
        return ts.ProductionReportingHeader.flatMap(header =>
        Array.isArray(header.ProductItem) ? header.ProductItem.map(pi => ({ pi, tsIndex })) : []
        );
        } else if (Array.isArray(ts.ProductItem)) {
        // Fallback: ProductItem directly under TransactionSet
        return ts.ProductItem.map(pi => ({ pi, tsIndex }));
        } else {
        return [];
        }
    })
    .map(({ pi, tsIndex }, itemIndex) => {
    const flat = {};
    for (const [key, value] of Object.entries(pi)) {
      if (!Array.isArray(value)) flat[key] = value;
    }
    flat.itemIndex = itemIndex + 1; // or use tsIndex if you want TransactionSet index
    return flat;
  });

        //Grab Product Item Instructions Values
        const flatProductItemInstructions = data.InterchangeControl.TransactionSet
        .flatMap(ts => Array.isArray(ts.ProductionReportingHeader) ? ts.ProductionReportingHeader : [])
        .flatMap(header => Array.isArray(header.ProductItem) ? header.ProductItem : [])
        .flatMap(pi => (pi.ProductItemInstructions || []).map(instr => {
          const flat = {};
          for (const [key, value] of Object.entries(instr)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));


//Grab Product Item Name Address Values
const seenAddressTypes = new Set();
const flatProductItemNameAddress = data.InterchangeControl.TransactionSet
.flatMap(ts => {
  if (Array.isArray(ts.ProductionReportingHeader) && ts.ProductionReportingHeader.length > 0) {
    return ts.ProductionReportingHeader
      .flatMap(header => Array.isArray(header.ProductItem) ? header.ProductItem : [])
      .flatMap(pi => (pi.ProductItemNameAddress || [])
        .map(addr => {
          if (!addr || typeof addr !== 'object') return null;
          const typeKey = addr.AddressType || `${addr.IdentificationCodeQualifier || ''}:${addr.IdentificationCode || ''}`;
          if (seenAddressTypes.has(typeKey)) return null;
          seenAddressTypes.add(typeKey);
          const flat = {};
          for (const [key, value] of Object.entries(addr)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        })
        .filter(Boolean)
      );
  } else if (Array.isArray(ts.ProductItem)) {
    return ts.ProductItem
      .flatMap(pi => (pi.ProductItemNameAddress || [])
        .map(addr => {
          if (!addr || typeof addr !== 'object') return null;
          const typeKey = addr.AddressType || `${addr.IdentificationCodeQualifier || ''}:${addr.IdentificationCode || ''}`;
          if (seenAddressTypes.has(typeKey)) return null;
          seenAddressTypes.add(typeKey);
          const flat = {};
          for (const [key, value] of Object.entries(addr)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        })
        .filter(Boolean)
      );
  }
  return [];
});

        //Grab Damages Values
        const flatDamages = data.InterchangeControl.TransactionSet
        .flatMap(ts => Array.isArray(ts.ProductionReportingHeader) ? ts.ProductionReportingHeader : [])
        .flatMap(header => Array.isArray(header.ProductItem) ? header.ProductItem : [])
        .flatMap(pi => (pi.Damages || []).map(damage => {
          const flat = {};
          for (const [key, value] of Object.entries(damage)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));

        //Grab Hold Values
        const flatHolds = data.InterchangeControl.TransactionSet
        .flatMap(ts => Array.isArray(ts.ProductItem) ? ts.ProductItem : [])
        .flatMap(pi => Array.isArray(pi?.Holds) ? pi.Holds : [])
        .map(hold => {
          const flat = {};
          for (const [key, value] of Object.entries(hold)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        });
  
        //Grab InventoryAdjustments Values
        const flatInventoryAdjustments = data.InterchangeControl.TransactionSet
        .flatMap(ts => (ts.InventoryAdjustments ? ts.InventoryAdjustments : []).map(adj => {
          const flat = {};
          for (const [key, value] of Object.entries(adj)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));

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

const getReferenceLineNumber = async (tag) => {
        try {

          const sql = `select opr_edix_ref_ln_no from edtopr_rec where opr_edxctl_no = '${InterchangeControl.EDIXControlNumber}' and opr_tag_no = '${tag}'`;
          const result = await queryInvexDatabase(sql);
          console.log(`Invex Reference Number Query Result:`, result.Data[0]['opr_edix_ref_ln_no']);
          return result.Data[0]['opr_edix_ref_ln_no']? result.Data[0]['opr_edix_ref_ln_no'] : null;
        } catch (error) {
          console.error('Error querying Invex database for Reference Number:', error);
          return null;
        }
      };


       const results = await pool.query('SELECT * FROM public."870_Invex_InterchangeControl" WHERE ictl_key = $1 AND ictl_type = $2', [
           InterchangeControl.EDIXControlNumber,
           flow
       ]);

       if (results.rows.length > 0) {
        console.log('Deleting existing records with ictl_key:', InterchangeControl.EDIXControlNumber);
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
        WHERE schemaname = 'public' AND tablename LIKE '870_%'
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
      // MARK: Interchange Control Table
      //Invex Interchange Control Table
      try {
        await pool.query(`INSERT INTO public."870_Invex_InterchangeControl"(
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
                InterchangeControl.SenderBranchInterchangeIDQualifier,     
                InterchangeControl.SenderBranchInterchangeID,              
                InterchangeControl.INVEXBranchCode,                                 
                flow
        ]);
        } catch (error) {
          console.log(error)
                const readableErrorMessage = readableErrors(error, InterchangeControl.EDIXControlNumber, filePath);
                console.error('-', InterchangeControl.EDIXControlNumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.EDIXControlNumber, '-');
        }

//         //MARK: Errors Table
//         //Invex Errors Table
      try {
        flatErrors ? await Promise.all(flatErrors.map(async error => {
        await pool.query(`INSERT INTO public."870_Invex_TransactionErrors"(
		txer_type, txer_key, txer_lineno, txer_messagetext, txer_flow_flag)
		VALUES ($1, $2, $3, $4, $5);`, 
        [
                flow,
                InterchangeControl.EDIXControlNumber,
                error.LineNo,
                error.MessageText,
                flow
        ]);
        })) : null;
        } catch (error) {
                const readableErrorMessage = readableErrors(error, InterchangeControl.EDIXControlNumber, filePath);
                console.error('-', InterchangeControl.EDIXControlNumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.EDIXControlNumber, '-');
        }
      
//         // MARK: Transaction Set Table
//         //Invex Transaction Set Table
      try {
        TransactionSets ? await Promise.all(TransactionSets.map(async trans_set => {
            await pool.query(`INSERT INTO public."870_Invex_TransactionSet"(
            txs_type, txs_key, txs_transactionsetcontrolnumber, txs_edistandardsorganizationtransactionset, txs_edistandardsorganization, txs_status, txs_flow_flag)
            VALUES ($1, $2, $3, $4, $5, $6, $7);`, 
        [
                flow,
                InterchangeControl.EDIXControlNumber,
                trans_set.TransactionSetControlNumber,
                trans_set.EDIStandardsOrganizationTransactionSet,
                trans_set.EDIStandardsOrganization,
                null,
                flow 
        ]);
        })) : null;
        } catch (error) {
                console.error('Error inserting into Transaction Set Table:', error);    
        }
      
// //         // MARK: ProductionReporting Header Table
// //        //Invex ProductionReporting Header Table
    try {
        flatProductionReportingHeaders ? await Promise.all(flatProductionReportingHeaders.map(async flatProductionReportingHeaders => await pool.query(`INSERT INTO public."870_Invex_ProductionReportingHeader"(
	prdhdr_type, prdhdr_key, prdhdr_transactionreference, prdhdr_updatedatetime, prdhdr_statusreportcode, prdhdr_orderitemcode, prdhdr_opsprocess, prdhdr_serviceordernumber, prdhdr_externalordernumber, prdhdr_externalorderrelease, prdhdr_externalorderdate, prdhdr_externalcontractnumber, prdhdr_enduserpo, prdhdr_flow_flag)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`, 
        [
              flow,
              InterchangeControl.EDIXControlNumber,
              flatProductionReportingHeaders.TransactionReference,
              flatProductionReportingHeaders.UpdateDateTimetoSecsUT,
              flatProductionReportingHeaders.StatusReportCode,
              flatProductionReportingHeaders.OrderItemCode,
              flatProductionReportingHeaders.OPSProcess,
              flatProductionReportingHeaders.ServiceOrderNumber,
              flatProductionReportingHeaders.ExternalOrderNumber,
              flatProductionReportingHeaders.ExternalOrderRelease,
              flatProductionReportingHeaders.ExternalOrderDate,
              flatProductionReportingHeaders.ExternalContractNumber,
              flatProductionReportingHeaders.EndUserPO,
              flow
            ])
          )): null;
    } catch (error) {
        console.error('Error inserting into Receipt Header Table:', error);

    }

//         //MARK: Header Name Address Table
//          //Invex Header Name Address Table
               try {
                      flatHeaderNameAddresses ? await Promise.all(flatHeaderNameAddresses.map(async address => {
                        await pool.query(`INSERT INTO public."870_Invex_HeaderNameAddress"(
                        hdna_type, hdna_key, hdna_addresstype, hdna_identificationcodequalifier, hdna_identificationcode, hdna_name1, hdna_name2, hdna_address1, hdna_address2, hdna_address3, hdna_city, hdna_postalcode, hdna_countrycode, hdna_stateprovincecode, hdna_telephoneareacode, hdna_telephonenumber, hdna_telephoneextension, hdna_faxareacode, hdna_faxnumber, hdna_faxextension, hdna_flow_flag)
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
        
// //         //MARK: Header Instructions Table
//         //Invex Header Instructions Table
        try {
        flatHeaderInstructions ? await Promise.all(flatHeaderInstructions.map(async header => {
        await pool.query(`INSERT INTO public."870_Invex_HeaderInstructions"(
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

// //         //MARK: NonRecordedScrapItems Table
//         //Invex NonRecordedScrapItems Table
        try {
        flatNonRecordedScrapItems ? await Promise.all(flatNonRecordedScrapItems.map(async nrscr => {
        await pool.query(`INSERT INTO public."870_Invex_NonRecordedScrapItems"(
	nrscr_type, nrscr_key, nrscr_itemnumber, nrscr_scrapdamagecode, nrscr_pieces, nrscr_measurelength, nrscr_x12measurelengthum, nrscr_measurearea, nrscr_x12measureareaum, nrscr_weight, nrscr_x12weightum, nrscr_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                nrscr.ItemNumber,
                nrscr.ScrapDamageCode,
                nrscr.Pieces,
                nrscr.MeasureLength,
                nrscr.X12MeasureLengthUM,
                nrscr.MeasureArea,
                nrscr.X12MeasureAreaUM,
                nrscr.Weight,
                nrscr.X12WeightUM,
                flow
        ]);})) : null
} catch (error) {
        console.error('Error inserting into NonRecordedScrapItems Table:', error);
}


// //         //MARK: Product Item Instructions Table
// //         //Invex Product Item Instructions Table
try {
       flatProductItemInstructions ? await Promise.all(flatProductItemInstructions.map(async item => {
       await pool.query(`INSERT INTO public."870_Invex_ProductItemInstructions"(
	prii_type, prii_key, prii_INVEXInstructionType, prii_Text, prii_flow_flag)
	VALUES ($1, $2, $3, $4, $5);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                item.INVEXInstructionType,
                item.Text,
                flow
                //flatProductItems.ItemNumber // Assuming ItemNumber is the index or identifier for the product item
            ])})) : null;
} catch (error) {
        console.error('Error inserting into Product Item Table:', error);
        
}
                    
// //         //MARK: Product Item Table
// //         //Invex Product Item Table       
       try {
        flatProductItems ? await Promise.all(flatProductItems.map(async prod => {
            await pool.query(`INSERT INTO public."870_Invex_ProductItem"(
	prd_type, prd_key, prd_itemnumber, prd_taglotid, prd_externaltagid, prd_customertagno, prd_outsideprocessortagid, prd_vendortagid, prd_label_id,
  prd_millorderno, prd_vendorreference, prd_x12packagingcode, prd_materialclassification, prd_materialclassificationdatetime, 
  prd_materialstatus, prd_materialstatusdatetime, prd_reapplicationaction, prd_opscurrentprocess, 
  prd_heat, prd_form, prd_grade, prd_size, prd_finish, prd_ext_fin_desc, prd_size_desc, prd_density, prd_coilform, prd_width, prd_x12widthum, prd_length, 
  prd_x12lengthum, prd_gaugesize, prd_x12gaugeum, prd_innerdiameter, prd_x12innerdiameterum, prd_outerdiameter, prd_x12outerdiameterum, 
  prd_randomdimension1, prd_randomdimension2, prd_randomdimension3, prd_randomdimension4, prd_randomdimension5, prd_randomdimension6, 
  prd_randomdimension7, prd_randomdimension8, prd_randomarea, prd_weightperpiece, prd_pieces, prd_piecestype, prd_measure, prd_x12measureum, 
  prd_measuretype, prd_measurequalifier, prd_actualweight, prd_x12actualweightum, prd_wgt_type, prd_net_gross_wgt, prd_coillength, prd_x12coillengthum, prd_coillengthtype, prd_cutnumber, 
  prd_coilinnerdiameter, prd_coilouterdiameter, prd_facewidth, prd_originzonecountry, prd_meltedzone, prd_meltedzonecountry, prd_actualwidth1, prd_actualwidth2, prd_actuallength1, prd_actuallength2, 
  prd_actualid1, prd_actualid2, prd_actualod1, prd_actualod2, prd_actualgauge1, prd_actualgauge2, prd_actualdiagonal1, prd_actualdiagonal2, 
  prd_actualflatness1, prd_actualflatness2, prd_externalordernumber, prd_externalorderitem, prd_externalorderrelease, prd_externalorderdate, 
  prd_externalcontractnumber, prd_enduserpo, prd_enduserreference, prd_partcustomerid, prd_partnumber, prd_partrevisionnumber, 
  prd_partdescription, prd_referencelinenumber, prd_liftid, prd_inventorystatus, prd_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                prod.ItemNumber,
                prod.TagLotID,
                prod.CustomerTagNo, 
                prod.CustomerTagNo,   
                prod.OutsideProcessorTagID,
                prod.VendorTagID,
                prod.LabelID,
                prod.MillOrderNumber, //prd_millorderno
                prod.VendorReference,
                prod.X12PackagingCode,
                prod.MaterialClassification,
                prod.MaterialClassificationDateTime,
                prod.MaterialStatus,
                prod.MaterialStatusDateTime,
                prod.ReapplicationAction,
                prod.OPSCurrentProcess,         
                prod.Heat,
                prod.Form,
                prod.Grade,
                prod.Size,
                prod.Finish,
                prod.ExtendedFinishDescription,
                prod.SizeDescription,
                prod.Density,
                prod.CoilForm,
                prod.Width,
                prod.X12WidthUM,
                prod.Length,
                prod.X12LengthUM,
                prod.GaugeSize,
                prod.X12GaugeUM,
                prod.InnerDiameter,
                prod.X12InnerDiameterUM,
                prod.OuterDiameter,
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
                prod.ExternalOrderDate === "00000000" ? null : prod.ExternalOrderDate,
                prod.ExternalContractNumber,
                prod.EndUserPO,
                prod.EndUserReference,
                prod.PartCustomerID === '' ? await getcustomerID() : prod.PartCustomerID,
                prod.PartNumber,
                prod.PartRevisionNumber,
                prod.PartDescription,
                prod.ReferenceLineNumber ? prod.ReferenceLineNumber : (prod.TagLotID ? await getReferenceLineNumber(prod.TagLotID) : '1'), // Reference Line Number
                prod.LiftID ? prod.LiftID : null,
                prod.InventoryStatus,
                flow
            ]);
        })) : null;
    } catch (error) {
        console.error('Error inserting into Product Item Table:', error);
    }

//         //MARK: Product Item Name Address Table
//         //Invex Product Item Name Address Table
try {
    flatProductItemNameAddress ? await Promise.all(flatProductItemNameAddress.map(async nameAddress => {
        await pool.query(`INSERT INTO public."870_Invex_ProductItemNameAddress"(
	prna_type, prna_key, prna_addresstype, prna_identificationcodequalifier, prna_identificationcode, prna_name1, prna_name2, prna_address1, prna_address2, prna_address3, prna_city, prna_postalcode, prna_countrycode, prna_stateprovincecode, prna_telephoneareacode, prna_telephonenumber, prna_telephoneextension, prna_faxareacode, prna_faxnumber, prna_faxextension, prna_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);`, [
            flow,                                   //$1
            InterchangeControl.EDIXControlNumber,  //$2
            nameAddress.AddressType,        //$3
            nameAddress.IdentificationCodeQualifier, //$4
            nameAddress.IdentificationCode,         //$5
            nameAddress.Name1,                  //$6
            nameAddress.Name2,                  //$7
            nameAddress.Address1,               //$8
            nameAddress.Address2,               //$9
            nameAddress.Address3,               //$10
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
    console.error("Error inserting into 870_Invex_Product_Item_Name_Address:", error);
}

//         //MARK: Damages Table
//         //Invex Damages Table
try {
    flatDamages ? await Promise.all(flatDamages.map(async damage => {
        await pool.query(`INSERT INTO public."870_Invex_Damages"(
            dmg_type, dmg_key, dmg_linenumber, dmg_damagedode, dmg_faultcode, dmg_flow_flag
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
    console.error("Error inserting into 870_Invex_Damages:", error);
}

//         //MARK: Hold Table
//         //Invex Hold Table
try {
    flatHolds ? await Promise.all(flatHolds.map(async hold => {
        await pool.query(`INSERT INTO public."870_Invex_Holds"(
            hld_type, hld_key, hld_x12holdreleasecode, hld_invexholdstatus, hld_invexholdreason, hld_invexholdreasondescription, hld_invexholdremark, hld_flow_flag
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`, [
            flow,
            InterchangeControl.EDIXControlNumber,
            hold.X12HoldReleasecode,
            hold.INVEXHoldStatus,
            hold.INVEXHoldReason,
            hold.INVEXHoldReasonDescription,
            hold.INVEXHoldRemark,
            flow
        ]);
    })) : null;
} catch (error) {
    console.error("Error inserting into 870_Invex_Holds:", error);
}

//         //MARK: InventoryAdjustments Table
//         //Invex InventoryAdjustments Table
try {
    flatInventoryAdjustments ? await Promise.all(flatInventoryAdjustments.map(async adj => {
        await pool.query(`INSERT INTO public."870_Invex_InventoryAdjustments"(
            invadj_type, invadj_key, invadj_transactionreference, invadj_edixadjustmentcode, invadj_quantityaction, invadj_externalordernumber, invadj_externalorderdate, invadj_serviceordernumber, invadj_opsprocess, invadj_reason, invadj_reasondescription, invadj_reasonremark, invadj_adjustmentdate, invadj_flow_flag
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`, [
            flow,
            InterchangeControl.EDIXControlNumber,
            adj.TransactionReference,
            adj.EDIXAdjustmentCode,
            adj.QuantityAction ? adj.QuantityAction : null,
            adj.ExternalOrderNumber,
            adj.ExternalOrderDate,
            adj.ServiceOrderNumber ? adj.ServiceOrderNumber : null,
            adj.OPSProcess,
            adj.Reason,
            adj.ReasonDescription,
            adj.ReasonRemark,
            adj.AdjustmentDate,
            flow
        ]);
    })) : null;
} catch (error) {
    console.error("Error inserting into 870_Invex_InventoryAdjustments:", error);
}
        
return InterchangeControl.EDIXControlNumber;
    
}

module.exports = {
    insert870InvexOutbound
}
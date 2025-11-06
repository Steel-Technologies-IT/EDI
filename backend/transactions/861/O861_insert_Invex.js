const readableErrors = require('../../functions/readableErrors.js');
const queryInvexDatabase = require('../../Invex/InvexConnection.js');
async function insert861InvexOutbound(pool, data, flow, filePath) {
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


        //Grab Receipt Header Values
        
        // Flatten all ReceiptHeader objects into a single array, filtering out array properties inside each
        const flatReceiptHeaders = data.InterchangeControl.TransactionSet
        .flatMap(ts => {
          const flat = {};
          for (const [key, value] of Object.entries(ts.ReceiptHeader[0])) {
            if (!Array.isArray(value)) {
              flat[key] = value;
            }
          }
          return flat;
        });

        //Grab Header Name Address Values
        const flatHeaderNameAddresses = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ReceiptHeader)
        .flatMap(header => (header.HeaderNameAddress || []).map(addr => {
          const flat = {};
          for (const [key, value] of Object.entries(addr)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));

        //Grab Header Instructions Values
        const flatHeaderInstructions = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ReceiptHeader)
        .flatMap(header => (header.HeaderInstructions || []).map(instr => {
          const flat = {};
          for (const [key, value] of Object.entries(instr)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));
        
        //Grab Contacts Values
        const flatcontacts = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ReceiptHeader)
        .flatMap(header => (header.Contacts || []).map(Contacts => {
          const flat = {};
          for (const [key, value] of Object.entries(Contacts)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));      

        //Grab Receipt Item Values
        const flatReceiptItems = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ReceiptHeader)
        .flatMap(header => (header.ReceiptItem || []).map((ReceiptItem, index) => {
          const flat = {};
          for (const [key, value] of Object.entries(ReceiptItem)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          flat.itemIndex = index + 1; // Add index to identify the item
          return flat;
        }));      
        
        //Grab Item Instructions Values
        const flatItemInstructions = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ReceiptHeader)
        .flatMap(ts => ts.ReceiptItem)
        .flatMap(header => (header.ItemInstructions || []).map(ReceiptItem => {
          const flat = {};
          for (const [key, value] of Object.entries(ReceiptItem)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));

        //Grab Product Item Values
        const flatProductItems = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ReceiptHeader)
        .flatMap(ts => ts.ReceiptItem)
        .flatMap((header, itemIndex) => (header.ProductItem || []).map(ReceiptItem => {
          const flat = {};
          for (const [key, value] of Object.entries(ReceiptItem)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          flat.itemIndex = itemIndex + 1; // Add index to identify the parent item
          return flat;
        }));

        //Grab Product Item Instructions Values
        const flatProductItemInstructions = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ReceiptHeader)
        .flatMap(ts => ts.ReceiptItem)
        .flatMap(header => (header.ProductItemInstructions || []).map(instr => {
          const flat = {};
          for (const [key, value] of Object.entries(instr)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));

        //Grab Product Item Name Address Values
        const flatProductItemNameAddress = data.InterchangeControl.TransactionSet
        .flatMap(ts => ts.ReceiptHeader)
        .flatMap(ts => ts.ReceiptItem)
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
        .flatMap(ts => ts.ReceiptHeader)
        .flatMap(ts => ts.ReceiptItem)
        .flatMap(header => (header.Damages || []).map(damage => {
          const flat = {};
          for (const [key, value] of Object.entries(damage)) {
            if (!Array.isArray(value)) flat[key] = value;
          }
          return flat;
        }));
 

       const results = await pool.query('SELECT * FROM public."861_Invex_InterchangeControl" WHERE ictl_key = $1 AND ictl_type = $2', [
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
        WHERE schemaname = 'public' AND tablename LIKE '861_%'
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


// MARK: Insert into Invex Tables
      // MARK: Interchange Control Table
      //Invex Interchange Control Table
      try {
        await pool.query(`INSERT INTO public."861_Invex_InterchangeControl"(
	ictl_type, ictl_key, ictl_companyid, ictl_senderinterchangeidqualifier, ictl_senderinterchangeid, ictl_edixcontrolnumber, ictl_receiverinterchangeidqualifier, ictl_receiverinterchangeid, "ictl_createdDatetime", ictl_alternateinterchangenumber, ictl_status, ictl_sndr_brch_ich_idqual, ictl_sndr_brch_ich_id, "ictl_INVEXBranchCode", ictl_flow_flag)
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
        await pool.query(`INSERT INTO public."861_Invex_TransactionErrors"(
		err_type, err_key, err_lineno, err_msgtxt, err_flow_flag)
		VALUES ($1, $2, $3, $4, $5);`, 
        [
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
      
//         // MARK: Transaction Set Table
//         //Invex Transaction Set Table
      try {
        TransactionSets ? await Promise.all(TransactionSets.map(async trans_set => {
            await pool.query(`INSERT INTO public."861_Invex_TransactionSet"(
            txs_type, txs_key, txs_transactionsetcontrolnumber, txs_edistandardsorganizationtransactionset, txs_edistandardsorganization, txs_status, txs_flow_flag)
            VALUES ($1, $2, $3, $4, $5, $6, $7);`, 
        [
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
      
// //         // MARK: Receipt Header Table
// //        //Invex Receipt Header Table
    try {
        flatReceiptHeaders ? await Promise.all(flatReceiptHeaders.map(async flatReceiptHeaders => await pool.query(`INSERT INTO public."861_Invex_ReceiptHeader"(
	rct_type, rct_key, rct_transactionreference, rct_vendorshipmentreference, "rct_CarrierReferenceNumber", rct_reference, rct_reference_date, "rct_X12DeliveryMethod", rct_carrier_qual_cd, "rct_CarrierIdentificationCode", "rct_CarrierName", rct_veh_lic_plt, rct_apptno, "rct_X12_terms_trade", "rct_TotalReceivedWeight", "rct_X12ReceivedWeightUM", "rct_PackingListWeight", "rct_X12PackingListWeightUM", rct_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);`, 
        [
              flow,
              InterchangeControl.EDIXControlNumber,
              flatReceiptHeaders.TransactionReference,
              flatReceiptHeaders.VendorShipmentReference,
              flatReceiptHeaders.CarrierReferenceNumber,
              flatReceiptHeaders.Reference,
              flatReceiptHeaders.ReferenceDate,
              flatReceiptHeaders.X12DeliveryMethod,
              flatReceiptHeaders.CarrierQualifierCode,
              flatReceiptHeaders.CarrierIdentificationCode,
              flatReceiptHeaders.CarrierName,
              flatReceiptHeaders.VehicleLicensePlate,
              flatReceiptHeaders.AppointmentNumber,
              flatReceiptHeaders.X12TermsOfTrade,
              flatReceiptHeaders.TotalReceivedWeight,
              flatReceiptHeaders.X12TotalReceivedWeightUM,
              flatReceiptHeaders.PackingListWeight,
              flatReceiptHeaders.X12PackingListWeightUM,
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
                        await pool.query(`INSERT INTO public."861_Invex_HeaderNameAddress"(
                        adr_type, adr_key, adr_addresstype, adr_identificationcodequalifier, adr_identificationcode, adr_nameline1, adr_nameline2, adr_addressline1, adr_addressline2, adr_addressline3, adr_city, adr_postalcode, adr_countrycode, adr_stateprovincecode, adr_telareacode, adr_telnumber, adr_telextension, adr_faxareacode, adr_faxnumber, adr_faxextension, adr_flow_flag)
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
        await pool.query(`INSERT INTO public."861_Invex_HeaderInstructions"(
	ins_type, ins_key, ins_invexinstructiontype, ins_text, ins_flow_flag)
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


// //         //MARK: Receipt Item Table
// //         //Invex Receipt Item Table
try {
        flatReceiptItems ? await Promise.all(flatReceiptItems.map(async Item => {
        await pool.query(`INSERT INTO public."861_Invex_ReceiptItem"(
        rtm_type, rtm_key, rtm_ref_lin_no, rtm_serviceordernumber, rtm_ven_ship_ref, rtm_vendor_part_no, rtm_customerpartnumber, rtm_partrevisionnumber, 
        rtm_prd_desc_line1, rtm_prd_desc_line2, rtm_prd_desc_line3, rtm_ext_fin_desc, rtm_numberofpackages, rtm_receivedpieces, rtm_x12receivedpiecesum, rtm_receivedmeasure, rtm_x12receivedmeasureum, 
        rtm_receivedmeasurequalifier, rtm_receivedweight, rtm_x12receivedweightum, rtm_packinglistpieces, rtm_x12packinglistpiecesum, rtm_packinglistmeasure, rtm_x12packinglistmeasureum, 
        rtm_packinglistmeasurequalifier, rtm_packinglistweight, rtm_x12packinglistweightum, rtm_flow_flag, rtm_itemindex)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29);`, [
            flow,
            InterchangeControl.EDIXControlNumber,
            Item.ReferenceLineNumber,
            Item.ServiceOrderNumber,
            Item.VendorShipmentReference,
            Item.VendorPartNumber,
            Item.CustomerPartNumber,
            Item.PartRevisionNumber,
            Item.ProductDescriptionLine1,
            Item.ProductDescriptionLine2,
            Item.ProductDescriptionLine3,
            Item.ExtendedFinishDescription,
            Item.NumberOfPackages,
            Item.ReceivedPieces,
            Item.X12ReceivedPiecesUM,
            Item.ReceivedMeasure,
            Item.X12ReceivedMeasureUM,
            Item.ReceivedMeasureQualifier,
            Item.ReceivedWeight,
            Item.X12ReceivedWeightUM,
            Item.PackingListPieces,
            Item.X12PackingListPiecesUM,
            Item.PackingListMeasure,
            Item.X12PackingListMeasureUM,
            Item.PackingListMeasureQualifier,
            Item.PackingListWeight,
            Item.X12PackingListWeightUM,
            flow,
            Item.itemIndex
        ]);})) : null;
        } catch (error) {
        console.error('Error inserting into Receipt Item Table:', error);
}


// //         //MARK: Item Instructions Table
// //         //Invex Item Instructions Table
try {
        flatItemInstructions ? await Promise.all(flatItemInstructions.map(async item => {
        await pool.query(`INSERT INTO public."861_Invex_ItemInstructions"(
	iins_type, iins_key, iins_invexinstructiontype, iins_text, iins_flow_flag)
	VALUES ($1, $2, $3, $4, $5);`, [
            flow,
            InterchangeControl.EDIXControlNumber,
            item.INVEXInstructionType,
            item.Text,
            flow
        ])})) : null
} catch (error) {
        console.error("Error inserting into 861_Invex_ItemInstructions:", error);
}
        


// //         //MARK: Product Item Instructions Table
// //         //Invex Product Item Instructions Table
try {
       flatProductItemInstructions ? await Promise.all(flatProductItemInstructions.map(async item => {
       await pool.query(`INSERT INTO public."861_Invex_ProductItemInstructions"(
	pins_type, pins_key, "pins_INVEXInstructionType", "pins_Text", pins_flow_flag)
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
            await pool.query(`INSERT INTO public."861_Invex_ProductItem"(
	pitm_type, pitm_key, pitm_itemnumber,pitm_taglotid, pitm_externaltagid, pitm_customertagno, pitm_outsideprocessortagid, pitm_vendortagid, pitm_label_id,
  pitm_millorderno, pitm_vendorreference, pitm_x12packagingcode, pitm_materialclassification, pitm_materialclassificationdatetime, 
  pitm_materialstatus, pitm_materialstatusdatetime, pitm_reapplicationaction, pitm_opscurrentprocess, 
  pitm_heat, pitm_form, pitm_grade, pitm_size, pitm_finish, pitm_ext_fin_desc, pitm_size_desc, pitm_density, pitm_coilform, pitm_width, pitm_x12widthum, pitm_length, 
  pitm_x12lengthum, pitm_gaugesize, pitm_x12gaugeum, pitm_innerdiameter, pitm_x12innerdiameterum, pitm_outerdiameter, pitm_x12outerdiameterum, 
  pitm_randomdimension1, pitm_randomdimension2, pitm_randomdimension3, pitm_randomdimension4, pitm_randomdimension5, pitm_randomdimension6, 
  pitm_randomdimension7, pitm_randomdimension8, pitm_randomarea, pitm_weightperpiece, pitm_pieces, pitm_piecestype, pitm_measure, pitm_x12measureum, 
  pitm_measuretype, pitm_measurequalifier, pitm_actualweight, pitm_x12actualweightum, pitm_wgt_typ, pitm_net_gross_wgt, pitm_coillength, pitm_x12coillengthum, pitm_coillengthtype, pitm_cutnumber, 
  pitm_coilinnerdiameter, pitm_coilouterdiameter, pitm_facewidth, pitm_originzonecountry, pitm_meltedzone, pitm_meltedzonecountry, pitm_actualwidth1, pitm_actualwidth2, pitm_actuallength1, pitm_actuallength2, 
  pitm_actualid1, pitm_actualid2, pitm_actualod1, pitm_actualod2, pitm_actualgauge1, pitm_actualgauge2, pitm_actualdiagonal1, pitm_actualdiagonal2, 
  pitm_actualflatness1, pitm_actualflatness2, pitm_externalordernumber, pitm_externalorderitem, pitm_externalorderrelease, pitm_externalorderdate, 
  pitm_externalcontractnumber, pitm_enduserpo, pitm_enduserreference, pitm_partcustomerid, pitm_partnumber, pitm_partrevisionnumber, 
  pitm_partdescription, pitm_flow_flag, pitm_itemindex)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94);`, [
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
                prod.ReapplicationAction,
                prod.OpsCurrentProcess,         
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
                prod.PartNumber === '' ? await getPartNum(prod.TagLotID) : prod.PartNumber,
                prod.PartRevisionNumber,
                prod.PartDescription,
                flow,
                prod.itemIndex
            ]);
        })) : null;
    } catch (error) {
        console.error('Error inserting into Product Item Table:', error);
    }

//         //MARK: Product Item Name Address Table
//         //Invex Product Item Name Address Table
try {
    flatProductItemNameAddress ? await Promise.all(flatProductItemNameAddress.map(async nameAddress => {
        await pool.query(`INSERT INTO public."861_Invex_ProductItemNameAddress"(
	pita_type, pita_key, pita_addresstype, pita_identificationcodequalifier, pita_identificationcode, pita_nameline1, pita_nameline2, pita_addressline1, pita_addressline2, pita_addressline3, pita_city, pita_postalcode, pita_countrycode, pita_stateprovincecode, pita_telareacode, pita_telnumber, pita_telextension, pita_faxareacode, pita_faxnumber, pita_faxextension, pita_flow_flag)
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
    console.error("Error inserting into 861_Invex_Product_Item_Name_Address:", error);
}

//         //MARK: Damages Table
//         //Invex Damages Table

try {
    flatDamages ? await Promise.all(flatDamages.map(async damage => {
        await pool.query(`INSERT INTO public."861_Invex_Damages"(
            dmg_type, dmg_key, "dmg_LineNumber", "dmg_DamageCode", "dmg_FaultCode", dmg_flow_flag
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
    console.error("Error inserting into 861_Invex_Damages:", error);
}
        
return InterchangeControl.EDIXControlNumber;
    
}

module.exports = {
    insert861InvexOutbound
}
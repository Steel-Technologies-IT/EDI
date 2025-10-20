// It processes the hierarchical JSON structure and flattens it for PostgreSQL insertion.

const readableErrors = require('../../functions/readableErrors.js');

async function insert863InvexOutbound(pool, data, flow, filePath) {
    // Convert data to JSON if needed
    console.log('Inserting 863 Invex Outbound Data:', flow, filePath);
    if (typeof data === 'string') {
        data = JSON.parse(data);
    }

    // Grab Interchange Control Values
    const InterchangeControl = {};
    for (const [key, value] of Object.entries(data.InterchangeControl)) {
        if (!Array.isArray(value)) {
            InterchangeControl[key] = value;
        }
    }

    // Grab Interchange Control Errors Values
    const flatErrors = (data.InterchangeControl.Errors || []).map(ts => {
        const flat = {};
        for (const [key, value] of Object.entries(ts)) {
            flat[key] = value;
        }
        return flat;
    });

    // Grab Transaction Set Values
    const TransactionSets = (data.InterchangeControl.TransactionSet || []).map(ts => {
        const flat = {};
        for (const [key, value] of Object.entries(ts)) {
            if (!Array.isArray(value)) {
                flat[key] = value;
            }
        }
        return flat;
    });

    // Grab ShipmentHeaderTestResult Values
    const flatShipmentHeadersTestResult = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.ShipmentHeaderTestResult || [])
        .map(header => {
            const flat = {};
            for (const [key, value] of Object.entries(header)) {
                if (!Array.isArray(value)) {
                    flat[key] = value;
                }
            }
            return flat;
        });

    // Grab HeaderNameAddress Values
    const flatHeaderNameAddress = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.ShipmentHeaderTestResult || [])
        .flatMap(header => header.HeaderNameAddress || [])
        .map(addr => {
            const flat = {};
            for (const [key, value] of Object.entries(addr)) {
                if (!Array.isArray(value)) flat[key] = value;
            }
            return flat;
        });

    // Grab ShipmentItemTestResult Values
    const flatShipmentItemTestResult = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.ShipmentHeaderTestResult || [])
        .flatMap(header => header.ShipmentItemTestResult || [])
        .map(item => {
            const flat = {};
            for (const [key, value] of Object.entries(item)) {
                if (!Array.isArray(value)) flat[key] = value;
            }
            return flat;
        });

    // Grab ProductItem Values
    const flatProductItems = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.ShipmentHeaderTestResult || [])
        .flatMap(header => header.ShipmentItemTestResult || [])
        .flatMap(item => item.ProductItem || [])
        .map(pi => {
            const flat = {};
            for (const [key, value] of Object.entries(pi)) {
                if (!Array.isArray(value)) flat[key] = value;
            }
            return flat;
        });

    // Grab MetalStandards Values
    const flatMetalStandards = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.ShipmentHeaderTestResult || [])
        .flatMap(header => header.ShipmentItemTestResult || [])
        .flatMap(item => item.ProductItem || [])
        .flatMap(pi => (pi.MetalStandards || [])
        .map(mst => {
            const flat = {};
            for (const [key, value] of Object.entries(mst)) {
                if (!Array.isArray(value)) flat[key] = value;
            }
            // Insert TagLotID from parent ProductItem
            flat.PrdItmTagLotID = pi.TagLotID;
            return flat;
        }));

    // Grab Chemistry Values
    const flatChemistry = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.ShipmentHeaderTestResult || [])
        .flatMap(header => header.ShipmentItemTestResult || [])
        .flatMap(item => item.ProductItem || [])
        .flatMap(pi => (pi.Chemistry || []).map(chem => {
            const flat = {};
            for (const [key, value] of Object.entries(chem)) {
                flat[key] = value;
            }
            // Use parent ProductItem's ItemNumber as LineNumber
            flat.LineNumber = pi.ItemNumber;

            // Insert TagLotID from parent ProductItem
             flat.PrdItmTagLotID = pi.TagLotID;
          
             return flat;
        }));


    // Grab PhysicalTests Values
    const flatPhysicalTests = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.ShipmentHeaderTestResult || [])
        .flatMap(header => header.ShipmentItemTestResult || [])
        .flatMap(item => item.ProductItem || [])
        .flatMap(pi => (pi.PhysicalTests || []).map(pt => {
            const flat = {};
            for (const [key, value] of Object.entries(pt)) {
                if (!Array.isArray(value)) flat[key] = value;
            }
            // Use parent ProductItem's ItemNumber as LineNumber
            flat.LineNumber = pi.ItemNumber;
            // Insert TagLotID from parent ProductItem
             flat.PrdItmTagLotID = pi.TagLotID;
          
            return flat;
        }));


    // Grab Jominy Values
    const flatJominy = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.ShipmentHeaderTestResult || [])
        .flatMap(header => header.ShipmentItemTestResult || [])
        .flatMap(item => item.ProductItem || [])
        .flatMap(pi => pi.Jominy || [])
        .map(jom => {
            const flat = {};
            for (const [key, value] of Object.entries(jom)) {
                if (!Array.isArray(value)) flat[key] = value;
            }
            // Insert TagLotID from parent ProductItem
             flat.PrdItmTagLotID = null;

            return flat;
        });

    // Grab HeatTreatment Values
    const flatHeatTreatment = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.ShipmentHeaderTestResult || [])
        .flatMap(header => header.ShipmentItemTestResult || [])
        .flatMap(item => item.ProductItem || [])
        .flatMap(pi => (pi.HeatTreatment || [])
        .map(ht => {
            const flat = {};
            for (const [key, value] of Object.entries(ht)) {
                if (!Array.isArray(value)) flat[key] = value;
            }
            // Insert TagLotID from parent ProductItem
            flat.PrdItmTagLotID = pi.TagLotID;
          
            return flat;
        }));

    // Grab Impact Values
    const flatImpact = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.ShipmentHeaderTestResult || [])
        .flatMap(header => header.ShipmentItemTestResult || [])
        .flatMap(item => item.ProductItem || [])
        .flatMap(pi => pi.Impact || [])
        .map(im => {
            const flat = {};
            for (const [key, value] of Object.entries(im)) {
                if (!Array.isArray(value)) flat[key] = value;
            }
            // Insert TagLotID from parent ProductItem
             flat.PrdItmTagLotID = null;
          
            return flat;
        });

    // Grab MicroInclusion Values
    const flatMicroInclusion = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.ShipmentHeaderTestResult || [])
        .flatMap(header => header.ShipmentItemTestResult || [])
        .flatMap(item => item.ProductItem || [])
        .flatMap(pi => pi.MicroInclusion || [])
        .map(mi => {
            const flat = {};
            for (const [key, value] of Object.entries(mi)) {
                if (!Array.isArray(value)) flat[key] = value;
            }
            // Insert TagLotID from parent ProductItem
             flat.PrdItmTagLotID = null;
          
            return flat;
        });

    // Grab QDSInstructions Values
    const flatQDSInstructions = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.ShipmentHeaderTestResult || [])
        .flatMap(header => header.ShipmentItemTestResult || [])
        .flatMap(item => item.ProductItem || [])
        .flatMap(pi => pi.QDSInstructions || [])
        .map(qds => {
            const flat = {};
            for (const [key, value] of Object.entries(qds)) {
                if (!Array.isArray(value)) flat[key] = value;
            }
            // Insert TagLotID from parent ProductItem
             flat.PrdItmTagLotID = null;
        
            return flat;
        });

    // Grab ProductItemInstructions Values
    const flatProductItemInstructions = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.ShipmentHeaderTestResult || [])
        .flatMap(header => header.ShipmentItemTestResult || [])
        .flatMap(item => item.ProductItem || [])
        .flatMap(pi => pi.ProductItemInstructions || [])
        .map(instr => {
        const flat = {};
        for (const [key, value] of Object.entries(instr)) {
        if (!Array.isArray(value)) flat[key] = value;
        }
            // Insert TagLotID from parent ProductItem
             flat.PrdItmTagLotID = pi.TagLotID;
          
        return flat;
        });

    // Grab ItemInstructions Values
    const flatItemInstructions = (data.InterchangeControl.TransactionSet || [])
        .flatMap(ts => ts.ShipmentHeaderTestResult || [])
        .flatMap(header => header.ShipmentItemTestResult || [])
        .flatMap(item => item.ProductItem || [])
        .flatMap(pi => pi.ItemInstructions || [])
        .map(instr => {
            const flat = {};
            for (const [key, value] of Object.entries(instr)) {
                if (!Array.isArray(value)) flat[key] = value;
            }
            return flat;
        });

    // Grab ProductItemNameAddress Values
    const flatProductItemNameAddress = (data?.InterchangeControl?.TransactionSet || [])
        .flatMap(ts => ts.ShipmentHeaderTestResult || [])
        .flatMap(header => header.ShipmentItemTestResult || [])
        .flatMap(item => item.ProductItem || [])
        .flatMap(pi => pi.ProductItemNameAddress || [])
        .map(addr => {
            const flat = {};
            for (const [key, value] of Object.entries(addr)) {
                if (!Array.isArray(value)) flat[key] = value;
            }
            // Insert TagLotID from parent ProductItem
             flat.PrdItmTagLotID =  null;
          
            return flat;
        });

       const results = await pool.query('SELECT * FROM public."863_Invex_InterchangeControl" WHERE ictl_key = $1 AND ictl_type = $2', [
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
        WHERE schemaname = 'public' AND tablename LIKE '863_%'
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


    // Interchange Control Table
    try {
        const icValues = [
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
        ];
        //console.log('InterchangeControl values:', icValues);
        await pool.query(`INSERT INTO public."863_Invex_InterchangeControl" (
            ictl_type, ictl_key, ictl_companyid, ictl_senderinterchangeidqualifier,
            ictl_senderinterchangeid,ictl_edixcontrolnumber, ictl_receiverinterchangeidqualifier,
            ictl_receiverinterchangeid, ictl_createddatetime,
            ictl_alternateinterchangenumber, ictl_status,
            ictl_sndr_brch_ich_idqual, ictl_sndr_brch_ich_id,
            ictl_invexbranchcode, ictl_flow_flag
        ) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);`, icValues);
    } catch (error) {
        const readableErrorMessage = readableErrors(error, InterchangeControl.EDIXControlNumber, filePath);
        console.error('-', InterchangeControl.EDIXControlNumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.EDIXControlNumber, '-');
    }

    // Errors Table
    try {
        flatErrors ? await Promise.all(flatErrors.map(async error => {
            await pool.query(`INSERT INTO public."863_Invex_TransactionErrors"(
                txer_type, txer_key, txer_lineno, txer_messagetext txer_flow_flag
            ) VALUES ($1, $2, $3, $4, $5);`, [
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

    // Transaction Set Table
    try {
        TransactionSets ? await Promise.all(TransactionSets.map(async trans_set => {
            await pool.query(`INSERT INTO public."863_Invex_TransactionSet"(
                txs_type, txs_key, txs_transactionsetcontrolnumber, txs_edistandardsorganizationtransactionset, txs_edistandardsorganization, txs_status, txs_flow_flag
            ) VALUES ($1, $2, $3, $4, $5, $6, $7);`, [
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

    // ShipmentHeaderTestResult Table
    try {
        flatShipmentHeadersTestResult ? await Promise.all(flatShipmentHeadersTestResult.map(async header => {
            await pool.query(`INSERT INTO public."863_Invex_ShipmentHeaderTestResult"(
                tres_type, tres_key, tres_transactionreference, tres_manifestnumber, tres_vendorshipmentreference, tres_shippingdatetime, tres_transactionsetpurposecode, tres_flow_flag
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                header.TransactionReference,
                header.ManifestNumber,
                header.VendorShipmentReference,
                header.ShippingDateTime,
                header.TransactionSetPurposeCode,
                flow
            ]);
        })) : null;
    } catch (error) {
        console.error('Error inserting into ShipmentHeaderTestResult Table:', error);
    }

    // HeaderNameAddress Table
    try {
        flatHeaderNameAddress ? await Promise.all(flatHeaderNameAddress.map(async address => {
            await pool.query(`INSERT INTO public."863_Invex_HeaderNameAddress"(
                hdna_type, hdna_key, hdna_addresstype, hdna_identificationcodequalifier, hdna_identificationcode, hdna_nameline1, hdna_nameline2, hdna_addressline1, hdna_addressline2, hdna_addressline3, hdna_city, hdna_postalcode, hdna_countrycode, hdna_stateprovincecode, hdna_telareacode, hdna_telnumber, hdna_telextension, hdna_faxareacode, hdna_faxnumber, hdna_faxextension, hdna_flow_flag
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);`, [
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
                address.StateProvinceCode,
                address.TelAreaCode,
                address.TelNumber,
                address.TelExtension,
                address.FaxAreaCode,
                address.FaxNumber,
                address.FaxExtension,
                flow
            ]);
        })) : null;
    } catch (error) {
        console.error('Error inserting into HeaderNameAddress Table:', error);
    }

    // ShipmentItemTestResult Table
    try {
        flatShipmentItemTestResult ? await Promise.all(flatShipmentItemTestResult.map(async item => {
            await pool.query(`INSERT INTO public."863_Invex_ShipmentItemTestResult"(
                sitr_type, sitr_key, sitr_referencelinenumber,sitr_invexordernumber,sitr_externalordernumber,sitr_externalorderitem, sitr_externalorderrelease,sitr_externalorderdate,sitr_externalcontractnumber, sitr_enduserpo, sitr_flow_flag, sitr_ext_rls
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                item.ReferenceLineNumber,
                item.InvexOrderNumber,
                item.ExternalOrderNumber,
                item.ExternalOrderItem,
                item.ExternalOrderRelease,
                item.ExternalOrderDate,
                item.ExternalContractNumber,
                item.EndUserPO,
                flow,
                item.ExternalRelease      
            ]);
        })) : null;
    } catch (error) {
        console.error('Error inserting into ShipmentItemTestResult Table:', error);
    }

    // ProductItem Table
    try {
        flatProductItems ? await Promise.all(flatProductItems.map(async pi => {
            const piValues = [
                flow,
                InterchangeControl.EDIXControlNumber,
                pi.ItemNumber,
                pi.TagLotID,
                pi.ExternalTagID,
                pi.CustomerTagNo,
                pi.OutsideProcessorTagID,
                pi.VendorTagID,
                pi.LabelID,
                pi.MillOrderNumber,
                pi.VendorReference,
                pi.X12PackagingCode,
                pi.MaterialClassification,
                pi.MaterialClassificationDatetime,
                pi.MaterialStatus,
                pi.MaterialStatusDatetime,
                parseInt(pi.MaterialClassificationDatetime.substring(0, 8)), //pi.ProcessedDate,
                pi.ReapplicationAction,
                pi.OPSCurrentProcess,
                pi.Mill,
                pi.Heat,
                pi.Density,
                pi.CoilForm,
                pi.DimensionDesignator,
                pi.Width,
                pi.X12WidthUM,
                pi.EdgeDesignation,
                pi.Length,
                pi.X12LengthUM,
                pi.GaugeSize,
                pi.X12GaugeUM,
                pi.InnerDiameter,
                pi.X12InnerDiameterUM,
                pi.OuterDiameter,
                pi.X12OuterDiameterUM,
                pi.RandomDimension1,
                pi.RandomDimension2,
                pi.RandomDimension3,
                pi.RandomDimension4,
                pi.RandomDimension5,
                pi.RandomDimension6,
                pi.RandomDimension7,
                pi.RandomDimension8,
                pi.RandomArea,
                pi.Weightperpiece,
                pi.Pieces,
                pi.PiecesType,
                pi.Measure,
                pi.X12MeasureUM,
                pi.MeasureType,
                pi.MeasureQualifier,
                pi.TheoreticalWeight,
                pi.X12TheoreticalWeightUM,
                pi.TheoreticalNetGrossWeight,
                pi.ActualWeight,
                pi.X12ActualWeightUM,
                pi.ActualNetGrossWeightQualifier,
                pi.CoilLength,
                pi.X12CoilLengthUM,
                pi.CoilLengthType,
                pi.CutNumber,
                pi.CoilInnerDiameter,
                pi.CoilOuterDiameter,
                pi.FaceWidth,
                pi.ActualWidth1,
                pi.ActualWidth2,
                pi.ActualLength1,
                pi.ActualLength2,
                pi.ActualID1,
                pi.ActualID2,
                pi.ActualOD1,
                pi.ActualOD2,
                pi.ActualGauge1,
                pi.ActualGauge2,
                pi.ActualDiagonal1,
                pi.ActualDiagonal2,
                pi.ActualFlatness1,
                pi.ActualFlatness2,
                pi.ExternalOrderNumber,
                pi.ExternalOrderItem,
                pi.ExternalOrderRelease,
                pi.ExternalOrderDate,
                pi.ExternalContractNumber,
                pi.EndUserPO,
                pi.EndUserReference,
                pi.PartCustomerID,
                pi.PartNumber,
                pi.PartRevisionNumber,
                pi.PartDescription,
                flow,
                pi.ExtendedFinishDescription,
                pi.Finish,
                pi.Form,
                pi.Grade,
                pi.Size,
                pi.SizeDescription,
                pi.Weight,
                pi.WeightType,
                pi.X12WeightUM,
                pi.NetGrossWeightQualifier,
                pi.OriginZoneCountry,
                pi.MeltedZone,
                pi.MeltedZoneCountry
            ];

            await pool.query(`INSERT INTO public."863_Invex_ProductItem"(
            prd_type, prd_key, prd_itemnumber, 
            prd_taglotid, prd_externaltagid, prd_customertagno, prd_outsideprocessortagid, prd_vendortagid, prd_labelid, prd_millorderno, prd_vendorreference, prd_x12packagingcode, prd_materialclassification, prd_materialclassificationdatetime, prd_materialstatus, prd_materialstatusdatetime, prd_processeddate, prd_reapplicationaction, prd_opscurrentprocess, prd_mill, prd_heat, prd_density, prd_coilform,
            prd_dimensiondesignator, prd_width, prd_x12widthum, prd_edgedesignation, prd_length, prd_x12lengthum, prd_gaugesize, prd_x12gaugeum, prd_innerdiameter, prd_x12innerdiameterum, prd_outerdiameter, prd_x12outerdiameterum, prd_randomdimension1, prd_randomdimension2, prd_randomdimension3, prd_randomdimension4, prd_randomdimension5, prd_randomdimension6, prd_randomdimension7, prd_randomdimension8,
            prd_randomarea, prd_weightperpiece, prd_pieces, prd_piecestype, prd_measure, prd_x12measureum, prd_measuretype, prd_measurequalifier, prd_theoreticalweight, prd_x12theoreticalweightum, prd_theoreticalnetgrossweight, prd_actualweight, prd_x12actualweightum, prd_actualnetgrossweightqualifier, prd_coillength, prd_x12coillengthum, prd_coillengthtype,
            prd_cutnumber, prd_coilinnerdiameter, prd_coilouterdiameter, prd_facewidth, prd_actualwidth1, prd_actualwidth2, prd_actuallength1, prd_actuallength2, prd_actualid1, prd_actualid2, prd_actualod1, prd_actualod2, prd_actualgauge1, prd_actualgauge2, prd_actualdiagonal1, prd_actualdiagonal2, prd_actualflatness1, prd_actualflatness2,
            prd_externalordernumber, prd_externalorderitem, prd_externalorderrelease, prd_externalorderdate, prd_externalcontractnumber, prd_enduserpo, prd_enduserreference, prd_partcustomerid, prd_partnumber, prd_partrevisionnumber, prd_partdescription, prd_flow_flag,
            prd_extended_finish_desc, prd_finish, prd_form, prd_grade, prd_size, prd_size_desc, prd_weight, prd_weight_type, prd_x12_wgt_um, prd_net_gross_wgt_q, prd_origin_zone_ctry, prd_melted_zone, prd_melted_zone_cntry
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
            $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96, $97, $98, $99, $100, $101, $102, $103);`, piValues);
        })) : null;
    } catch (error) {
        console.error('Error inserting into ProductItem Table:', error);
    }

    // MetalStandards Table
    try {
        flatMetalStandards ? await Promise.all(flatMetalStandards.map(async mst => {
            await pool.query(`INSERT INTO public."863_Invex_MetalStandards"(
            mstd_type, mstd_key, mstd_line_no, mstd_met_std_ctl_no, mstd_std_dev_org, mstd_met_std_ident,mstd_met_std_add_id, mstd_flow_flag, mstd_tag_lot
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                mst.LineNumber,
                mst.MetalStandardsControlNo,
                mst.StandardsDevelopmentOrg,
                mst.MetalStandardsIdentification,
                mst.MetalStandardsAdditionalIdentification,     //spelling error
                flow,
                mst.PrdItmTagLotID
            ]);
        })) : null;
    } catch (error) {
        console.error("Error inserting into 863_Invex_MetalStandards:", error);
    }

    // Chemistry Table
    try {
        flatChemistry ? await Promise.all(flatChemistry.map(async chem => {
            await pool.query(`INSERT INTO public."863_Invex_Chemistry"(
                chm_type, chm_key, chm_linenumber, chm_x12chemelement, chm_entrytype, chm_value, chm_minvalue, chm_maxvalue, chm_flow_flag, chm_tag_lot
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                chem.LineNumber,
                chem.X12ChemElement,
                chem.EntryType,
                chem.Value,
                chem.MinValue,
                chem.MaxValue,
                flow,
                chem.PrdItmTagLotID
            ]);

        })) : null;
    } catch (error) {
        console.error("Error inserting into 863_Invex_Chemistry:", error);
    }

    // PhysicalTests Table
    try {
        flatPhysicalTests ? await Promise.all(flatPhysicalTests.map(async pt => {
            await pool.query(`INSERT INTO public."863_Invex_PhysicalTests"(
                phts_type,  phts_key, phts_linenumber, phts_x12testdirection, phts_x12physicaltest, phts_entrytype, phts_value, phts_minvalue, phts_maxvalue, phts_alphavalue, phts_x12unitofmeasure, phts_flow_flag, phts_tag_lot
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                pt.LineNumber,
                pt.X12TestDirection,
                pt.X12PhysicalTest,
                pt.EntryType,
                pt.Value,
                pt.MinValue,
                pt.MaxValue,
                pt.AlphaValue,
                pt.X12UnitOfMeasure,
                flow,
                pt.PrdItmTagLotID
            ]);
        })) : null;
    } catch (error) {
        console.error('Error inserting into PhysicalTests Table:', error);
    }

    // Jominy Table
    try {
        flatJominy ? await Promise.all(flatJominy.map(async jom => {
            await pool.query(`INSERT INTO public."863_Invex_Jominy"(
                jmny_type, jmny_key,  jmny_linenumber, jmny_testtype, jmny_readingposition, jmny_entrytype,
                jmny_value, jmny_minvalue, jmny_maxvalue, jmny_flow_flag, jmny_tag_lot
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, $11);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                jom.LineNumber,
                jom.TestType,
                jom.ReadingPosition,
                jom.EntryType,
                jom.Value,
                jom.MinValue,
                jom.MaxValue,
                flow,
                jom.PrdItmTagLotID
            ]);
        })) : null;
    } catch (error) {
        console.error("Error inserting into 863_Invex_Jominy:", error);
    }

    // HeatTreatment Table 
    try {
        flatHeatTreatment ? await Promise.all(flatHeatTreatment.map(async ht => {
            await pool.query(`INSERT INTO public."863_Invex_HeatTreatment"(
            htrt_type, htrt_key, htrt_linenumber, htrt_heattreatmentcode, htrt_heattreatmenttemp, htrt_x12heattreatmenttempmeasure,htrt_heattreatmenttime, htrt_coolantmethod, htrt_coolanttemp,
            htrt_x12_coolant_temp_measure, htrt_flow_flag, htrt_tag_lot
        ) VALUES ($1,$2,$3,$4,$5,$6,$7, $8, $9, $10, $11, $12);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                ht.LineNumber,
                ht.HeatTreatmentCode,
                ht.HeatTreatmentTemp,
                ht.X12HeatTreatmentTempMeasure,
                ht.HeatTreatmentTime,
                ht.CoolantMethod,
                ht.CoolantTemp,
                ht.X12CoolantTempMeasure,
                flow,
                ht.PrdItmTagLotID
            ]);
        })) : null;
    } catch (error) {
        console.error("Error inserting into 863_Invex_HeatTreatment:", error);
    }

    // Impact Table
    try {
        flatImpact ? await Promise.all(flatImpact.map(async imp => {
            await pool.query(`INSERT INTO public."863_Invex_Impact"(
            imp_type, imp_key, imp_linenumber, imp_impacttesttype, imp_x12testdirection, imp_x12unitofmeasure, imp_temperature, imp_x12temperaturemeasure, imp_result1, imp_result2, imp_result3, imp_flow_flag, imp_tag_lot
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, $13);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                imp.LineNumber,
                imp.ImpactTestType,
                imp.X12TestDirection,
                imp.X12UnitOfMeasure,
                imp.Temperature,
                imp.X12TemperatureMeasure,
                imp.Result1,
                imp.Result2,
                imp.Result3,
                flow,
                imp.PrdItmTagLotID
            ]);
        })) : null;
    } catch (error) {
        console.error("Error inserting into 863_Invex_Impact:", error);
    }


    // MicroInclusion Table
    try {
        flatMicroInclusion ? await Promise.all(flatMicroInclusion.map(async mi => {
            await pool.query(`INSERT INTO public."863_Invex_MicroInclusion"(
            micl_type, micl_key,  micl_linenumber, micl_microinclusionstandard, micl_thinresulta, micl_thickresulta,
            micl_thinresultb, micl_thickresultb, micl_thinresultc, micl_thickresultc,
            micl_thinresultd, micl_thickresultd, micl_flow_flag, micl_tag_lot
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                mi.LineNumber,
                mi.MicroInclusionStandard,
                mi.ThinResultA,
                mi.ThickResultA,
                mi.ThinResultB,
                mi.ThickResultB,
                mi.ThinResultC,
                mi.ThickResultC,
                mi.ThinResultD,
                mi.ThickResultD,
                flow,
                mi.PrdItmTagLotID
            ]);
        })) : null;
    } catch (error) {
        console.error("Error inserting into 863_Invex_MicroInclusion:", error);
    }

    // QDSInstructions Table
    try {
        flatQDSInstructions ? await Promise.all(flatQDSInstructions.map(async qds => {
            await pool.query(`INSERT INTO public."863_Invex_QDSInstructions"(
            qdsi_type, qdsi_key, qdsi_invexinstructiontype, qdsi_text, qdsi_flow_flag, qdsi_tag_lot
        ) VALUES ($1,$2,$3,$4,$5, $6);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                qds.INVEXInstructionType,
                qds.Text,
                flow,
                qds.PrdItmTagLotID
            ]);
        })) : null;
    } catch (error) {
        console.error("Error inserting into 863_Invex_QDSInstructions:", error);
    }

    // ProductItemInstructions Table
    try {
        flatProductItemInstructions ? await Promise.all(flatProductItemInstructions.map(async (pii) => {
        await pool.query(`INSERT INTO public."863_Invex_ProductItemInstructions"(
        prii_type,
        prii_key,
        prii_invexinstructiontype,
        prii_text,
        prii_flow_flag,
        prii_tag_lot
        ) VALUES ($1, $2, $3, $4, $5, $6);`, [
        flow,
        InterchangeControl.EDIXControlNumber,
        pii.INVEXInstructionType || '',
        pii.Text || '',
        flow,
        pii.PrdItmTagLotID
        ]);
    })) : null;
    } catch (error) {
        console.error("Error inserting into 863_Invex_ProductItemInstructions:", error);
    }



    // ItemInstructions Table
    try {
        flatItemInstructions ? await Promise.all(flatItemInstructions.map(async instr => {
            await pool.query(`INSERT INTO public."863_Invex_ItemInstructions"(
            itin_type, itin_key, itin_invexinstructiontype, itin_Text, itin_flow_flag
        ) VALUES ($1,$2,$3,$4,$5);`, [
                flow,
                InterchangeControl.EDIXControlNumber,
                instr.INVEXInstructionType,
                instr.Text,
                flow
            ]);
        })) : null;
    } catch (error) {
        console.error("Error inserting into 863_Invex_ItemInstructions:", error);
    }

    // ProductItemNameAddress Table
    try {
        flatProductItemNameAddress ? await Promise.all(flatProductItemNameAddress.map(async address => {
            await pool.query(`INSERT INTO public."863_Invex_ProductItemNameAddress"(prna_type, 
                prna_key, prna_addresstype, prna_identificationcodequalifier, prna_identificationcode, prna_nameline1, prna_nameline2, prna_addressline1, prna_addressline2, prna_addressline3, prna_city, prna_postalcode, prna_countrycode, prna_stateprovincecode, prna_telareacode, prna_telnumber, prna_telextension, prna_faxareacode, prna_faxnumber, prna_faxextension, prna_flow_flag, prna_tag_lot
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22);`, [
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
                address.StateProvinceCode,
                address.TelAreaCode,
                address.TelNumber,
                address.TelExtension,
                address.FaxAreaCode,
                address.FaxNumber,
                address.FaxExtension,
                flow,
                address.PrdItmTagLotID
            ]);
        })) : null;
    } catch (error) {
        console.error('Error inserting into ProductItemNameAddress Table:', error);
    }

    return InterchangeControl.EDIXControlNumber;
}

module.exports = {
    insert863InvexOutbound
};
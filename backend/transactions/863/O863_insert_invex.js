const fs = require('fs');
const { Pool } = require('pg');

// Update with your actual connection details
const pool = new Pool({
    user: 'your_user',
    host: 'your_host',
    database: 'your_db',
    password: 'your_password',
    port: 5432,
});

async function insertInterchangeControlFromJson(pool, data, flow, filePath) {
    // Convert data to JSON if it's a string
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

    const ic = data.InterchangeControl;
    // InterchangeControl insert
    const icValues = [
        flow || 'I',
        null,
        ic.CompanyID,
        ic.SenderInterchangeIDQualifier,
        ic.SenderInterchangeID,
        ic.EDIXControlNumber,
        ic.ReceiverInterchangeIDQualifier,
        ic.ReceiverInterchangeID,
        ic.AlternateInterchangeNumber,
        ic.Status,
        flow || 'I',
        ic.CreatedDateTime
    ];
    await pool.query(`INSERT INTO public."863_Invex_InterchangeControl"(
        ictl_type, ictl_key, ictl_companyid, ictl_senderinterchangeidqualifier, ictl_senderinterchangeid, ictl_edixcontrolnumber, ictl_receiverinterchangeidqualifier, ictl_receiverinterchangeid, ictl_alternateinterchangenumber, ictl_status, ictl_flow_flag, ictl_createddatetime)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`, icValues);
    console.log('InterchangeControl Insert successful');

    // TransactionSet
    if (Array.isArray(ic.TransactionSet)) {
        for (const ts of ic.TransactionSet) {
            const tsValues = [
                null,
                null,
                ts.TransactionSetControlNumber,
                ts.EDIStandardsOrganizationTransactionSet,
                ts.EDIStandardsOrganization,
                null,
                'I'
            ];
            await pool.query(`INSERT INTO public."863_Invex_TransactionSet"(
                txs_type, txs_key, txs_transactionsetcontrolnumber, txs_edistandardsorganizationtransactionset, txs_edistandardsorganization, txs_status, txs_flow_flag)
                VALUES ($1, $2, $3, $4, $5, $6, $7);`, tsValues);
            console.log('TransactionSet Insert successful');
        }

        // FlatMap all ShipmentHeaderTestResult
        const allShipmentHeaders = ic.TransactionSet.flatMap(ts => ts.ShipmentHeaderTestResult || []);
        for (const sh of allShipmentHeaders) {
            const shValues = [
                null,
                null,
                sh.TransactionReference,
                sh.ManifestNumber,
                sh.VendorShipmentReference,
                sh.ShippingDateTime,
                sh.TransactionSetPurposeCode,
                'I'
            ];
            await pool.query(`INSERT INTO public."863_Invex_ShipmentHeaderTestResult"(
                tres_type, tres_key, tres_transactionreference, tres_manifestnumber, tres_vendorshipmentreference, tres_shippingdatetime, tres_transactionsetpurposecode, tres_flow_flag)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`, shValues);
            console.log('ShipmentHeaderTestResult Insert successful');
        }

        // FlatMap all HeaderNameAddress
        const allHeaderNameAddresses = allShipmentHeaders.flatMap(sh => sh.HeaderNameAddress || []);
        for (const hna of allHeaderNameAddresses) {
            const hnaValues = [
                null,
                null,
                hna.AddressType,
                hna.IdentificationCodeQualifier,
                hna.IdentificationCode,
                hna.NameLine1,
                hna.NameLine2,
                hna.AddressLine1,
                hna.AddressLine2,
                hna.AddressLine3,
                hna.City,
                hna.PostalCode,
                hna.CountryCode,
                hna.StateProvinceCode,
                hna.TelAreaCode,
                hna.TelNumber,
                hna.TelExtension,
                hna.FaxAreaCode,
                hna.FaxNumber,
                hna.FaxExtension,
                'I'
            ];
            await pool.query(`INSERT INTO public."863_Invex_HeaderNameAddress"(
                hdna_type, hdna_key, hdna_addresstype, hdna_identificationcodequalifier, hdna_identificationcode, hdna_nameline1, hdna_nameline2, hdna_addressline1, hdna_addressline2, hdna_addressline3, hdna_city, hdna_postalcode, hdna_countrycode, hdna_stateprovincecode, hdna_telareacode, hdna_telnumber, hdna_telextension, hdna_faxareacode, hdna_faxnumber, hdna_faxextension, hdna_flow_flag)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);`, hnaValues);
            console.log('HeaderNameAddress Insert successful');
        }

        // FlatMap all ShipmentItemTestResult
        const allShipmentItems = allShipmentHeaders.flatMap(sh => sh.ShipmentItemTestResult || []);
        for (const sitr of allShipmentItems) {
            const sitrValues = [
                null,
                null,
                sitr.ReferenceLineNumber,
                null,
                null,
                null,
                sitr.ExternalRelease,
                null,
                null,
                sitr.EndUserPO,
                'I'
            ];
            await pool.query(`INSERT INTO public."863_Invex_ShipmentItemTestResult"(
                sitr_type, sitr_key, sitr_referencelinenumber, sitr_invexordernumber, sitr_externalordernumber, sitr_externalorderitem, sitr_externalorderrelease, sitr_externalorderdate, sitr_externalcontactnumber, sitr_enduserpo, sitr_flow_flag)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`, sitrValues);
            console.log('ShipmentItemTestResult Insert successful');
        }

        // FlatMap all ProductItem
        const allProductItems = allShipmentItems.flatMap(sitr => sitr.ProductItem || []);
        for (const pi of allProductItems) {
            const piValues = [
                null,
                null,
                pi.ItemNumber,
                null,
                pi.TagLotID,
                null,
                pi.CustomerTagNo,
                pi.OutsideProcessorTagID,
                pi.VendorTagID,
                pi.MillOrderNumber,
                pi.VendorReference,
                pi.X12PackagingCode,
                pi.MaterialClassification,
                pi.MaterialClassificationDatetime,
                pi.MaterialStatus,
                pi.MaterialStatusDatetime,
                null,
                pi.ReapplicationAction,
                pi.OPSCurrentProcess,
                null,
                pi.Heat,
                pi.Density,
                pi.CoilForm,
                null,
                pi.Width,
                pi.X12WidthUM,
                null,
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
                pi.Weight,
                pi.X12WeightUM,
                pi.WeightType,
                null,
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
                'I'
            ];
            await pool.query(`INSERT INTO public."863_Invex_ProductItem"(
                prd_type, prd_key, prd_itemnumber, prd_ref_itemnumber, prd_taglotid, prd_externaltagid, prd_customertagno, prd_outsideprocessortagid, prd_vendortagid, prd_millorderno, prd_vendorreference, prd_x12packagingcode, prd_materialclassification, prd_matericalclassificationdatetime, prd_materialstatus, prd_materialstatusdatetime, prd_processeddate, prd_reapplicationaction, prd_opscurrentprocess, prd_mill, prd_heat, prd_density, prd_coilform, prd_dimensiondesignator, prd_width, prd_x12widthum, prd_edgedesignation, prd_length, prd_x12lengthum, prd_gaugesize, prd_x12gaugeum, prd_innerdiameter, prd_x12innerdiameterum, prd_outerdiameter, prd_x12outerdiameterum, prd_randomdimension1, prd_randomdimension2, prd_randomdimension3, prd_randomdimension4, prd_randomdimension5, prd_randomdimension6, prd_randomdimension7, prd_randomdimension8, prd_randomarea, prd_weightperpiece, prd_pieces, prd_piecestype, prd_measure, prd_x12measureum, prd_measuretype, prd_measurequalifier, prd_theoreticalweight, prd_x12theoreticalweightum, prd_theoreticalnetgrossweight, prd_actualweight, prd_x12actualweightum, prd_actualnetgrossweightqualifier, prd_coillength, prd_x12coillengthum, prd_coillengthtype, prd_cutnumber, prd_coilinnerdiameter, prd_coilouterdiameter, prd_facewidth, prd_actualwidth1, prd_actualwidth2, prd_actuallength1, prd_actuallength2, prd_actualid1, prd_actualid2, prd_actualod1, prd_actualod2, prd_actualgauge1, prd_actualgauge2, prd_actualdiagonal1, prd_actualdiagonal2, prd_actualflatness1, prd_actualflatness2, prd_externalordernumber, prd_externalorderitem, prd_externalorderrelease, prd_externalorderdate, prd_externalcontractnumber, prd_enduserpo, prd_enduserreference, prd_partcustomerid, prd_partnumber, prd_partrevisionnumber, prd_partdescription, prd_flow_flag)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90);`, piValues);
            console.log('ProductItem Insert successful');
        }

        // Grab Product Item Values
        const flatProductItems = (data.InterchangeControl.TransactionSet || [])
            .flatMap(ts => ts.ShipmentHeader || [])
            .flatMap(header => header.Item || [])
            .flatMap(item => item.ProductItem || [])
            .map(pi => {
                const flat = {};
                for (const [key, value] of Object.entries(pi)) {
                    if (!Array.isArray(value)) flat[key] = value;
                }
                return flat;
            });

        // Grab Chemistry Item Values
        const flatChemistryItems = (data.InterchangeControl.TransactionSet || [])
            .flatMap(ts => ts.ShipmentHeader || [])
            .flatMap(header => header.Item || [])
            .flatMap(item => item.Chemistry || [])
            .map(chem => {
                const flat = {};
                for (const [key, value] of Object.entries(chem)) {
                    if (!Array.isArray(value)) flat[key] = value;
                }
                return flat;
            });

        // FlatMap all Chemistry
        const allChemistry = allProductItems.flatMap(pi => pi.Chemistry || []);
        for (const chem of allChemistry) {
            const chemValues = [
                null,
                null,
                chem.LineNumber,
                chem.X12ChemElement,
                chem.EntryType,
                chem.Value,
                chem.MinValue,
                chem.MaxValue,
                'I'
            ];
            await pool.query(`INSERT INTO public."863_Invex_Chemistry"(
                chm_type, chm_key, chm_linenumber, chm_x12chemelement, chm_entrytype, chm_value, chm_minvalue, chm_maxvalue, chm_flow_flag)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`, chemValues);
            console.log('Chemistry Insert successful');
        }

        // FlatMap all PhysicalTests
        const allPhysicalTests = allProductItems.flatMap(pi => pi.PhysicalTests || []);
        for (const pt of allPhysicalTests) {
            const ptValues = [
                null,
                null,
                pt.LineNumber,
                pt.X12TestDirection,
                pt.X12PhysicalTest,
                pt.EntryType,
                pt.Value,
                pt.MinValue,
                pt.MaxValue,
                pt.AlphaValue,
                pt.X12UnitOfMeasure,
                'I'
            ];
            await pool.query(`INSERT INTO public."863_Invex_PhysicalTests"(
                phts_type, phts_key, phts_linenumber, phts_x12testdirection, phts_x12physicaltest, phts_entrytype, phts_value, phts_minvalue, phts_maxvalue, phts_alphavalue, phts_x12unitofmeasure, phts_flow_flag)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`, ptValues);
            console.log('PhysicalTests Insert successful');
        }
    }
}

// Example usage:
// insertInterchangeControlFromJson('path_to_your_json_file.json');

module.exports = { insertInterchangeControlFromJson };

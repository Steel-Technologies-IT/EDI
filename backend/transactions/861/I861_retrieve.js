// This module handles the retrieval of parsed EDI 861 records from the PostgreSQL database. 
// It exports functions to retrieve control, transaction, shipment, instruction, chemistry, etc data from tables 

//861 Interchange Control
async function get861InterchangeControl(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            ictl_CompanyID, ictl_SenderInterchangeIDQualifier, ictl_senderinterchangeid, ictl_ReceiverInterchangeIDQualifier, 
            ictl_ReceiverInterchangeID, "ictl_createdDatetime", ictl_AlternateInterchangenumber, ictl_Status   
            FROM public."861_Invex_InterchangeControl" 
            WHERE ictl_Key = $1`, [keyPK]);

        structuredRes = results.rows[0];
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//861 TransactionSet
async function get861TransactionSet(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            txs_TransactionSetControlNumber, txs_EDIStandardsOrganizationTransactionSet, txs_EDIStandardsOrganization, txs_Status
            FROM public."861_Invex_TransactionSet"
            WHERE  txs_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//861 Receipt Header
async function get861ReceiptHeader(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            rct_transactionreference, rct_vendorshipmentreference, "rct_CarrierReferenceNumber", "rct_ReceiptDate", "rct_X12TransportationMethod", "rct_OPSTransportationMode", 
            "rct_CarrierQualifierCode", "rct_CarrierIdentificationCode", "rct_CarrierName", "rct_X12ShipmentMethodOfPayment", "rct_OPSTransportationLiability", "rct_TotalReceivedWeight", 
            "rct_X12ReceivedWeightUM", "rct_OPSReceivedWeightUM", "rct_PackingListWeight", "rct_X12PackingListWeightUM", "rct_OPSPackingListWeightUM"
            FROM public."861_Invex_ReceiptHeader"
            WHERE rct_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//861 Header Name Address
async function get861HeaderNameAddress(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT DISTINCT
            hdna_AddressType, hdna_IdentificationCodeQualifier, hdna_IdentificationCode, hdna_NameLine1, hdna_NameLine2, hdna_AddressLine1, hdna_AddressLine2, 
            hdna_AddressLine3, hdna_City, hdna_PostalCode, hdna_CountryCode, hdna_StateProvinceCode, hdna_TelAreaCode, hdna_TelNumber, hdna_TelExtension, 
            hdna_FaxAreaCode, hdna_FaxNumber, hdna_FaxExtension
            FROM public."861_Invex_HeaderNameAddress"
            WHERE hdna_Key = $1 order by hdna_identificationcodequalifier desc`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//861 Header Instructions
async function get861HeaderInstructions(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            hdin_INVEXInstructionType, hdin_Text
            FROM public."861_Invex_HeaderInstructions"
            WHERE hdin_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//861 Receipt Item
async function get861ReceiptItem(pool,  keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT DISTINCT 
            rtm_STRATIXOrderNoQualifier, rtm_STRATIXOrderNo, rtm_ServiceOrderNumber, rtm_ShipmentItemReference, rtm_CustomerPartNumber, 
            rtm_PartRevisionNumber, rtm_NumberOfPackages, rtm_ReceivedPieces, rtm_X12ReceivedPiecesUM, rtm_OPSReceivedPiecesUM, 
            rtm_ReceivedMeasure, rtm_X12ReceivedMeasureUM, rtm_OPSReceivedMeasureUM, rtm_ReceivedMeasureQualifier, rtm_ReceivedWeight, 
            rtm_X12ReceivedWeightUM, rtm_OPSReceivedWeightUM, rtm_PackingListPieces, rtm_X12PackingListPiecesUM, rtm_OPSPackingListPiecesUM, 
            rtm_PackingListMeasure, rtm_X12PackingListMeasureUM, rtm_OPSPackingListMeasureUM, rtm_PackingListMeasureQualifier, rtm_PackingListWeight, 
            rtm_X12PackingListWeightUM, rtm_OPSPackingListWeightUM, rtm_itemnumber
            FROM public."861_Invex_ReceiptItem"
            WHERE rtm_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};


//861 Item Instructions
async function get861ItemInstructions(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            itin_INVEXInstructionType, itin_Text
            FROM public."861_Invex_ItemInstructions"
            WHERE itin_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//861 Product Item
async function get861ProductItem(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            prd_ItemNumber, prd_TagLotID, prd_ExternalTagID, prd_CustomerTagNo, prd_OutsideProcessorTagID, prd_VendorTagID, prd_MillOrderNo, prd_VendorReference, 
            prd_X12PackagingCode, prd_MaterialClassification, prd_MaterialClassificationDatetime, prd_MaterialStatus, prd_MaterialStatusDateTime, prd_processeddate, 
            prd_ReapplicationAction, prd_OPSCurrentProcess, prd_Mill, prd_Heat, prd_Density, prd_CoilForm, prd_DimensionDesignator, prd_Width, prd_X12WidthUM, 
            prd_EdgeDesignation, prd_Length, prd_X12LengthUM, prd_GaugeSize, prd_X12GaugeUM, prd_InnerDiameter, prd_X12InnerDiameterUM, prd_OuterDiameter, 
            prd_X12OuterDiameterUM, prd_OPSOuterDiameterUM, prd_RandomDimension1, prd_RandomDimension2, prd_RandomDimension3, prd_RandomDimension4, prd_RandomDimension5, 
            prd_RandomDimension6, prd_RandomDimension7, prd_RandomDimension8, prd_RandomArea, prd_WeightPerPiece, prd_Pieces, prd_PiecesType, prd_Measure, prd_X12MeasureUM, 
            prd_MeasureType, prd_MeasureQualifier, prd_TheoreticalWeight, prd_X12TheoreticalWeightUM, prd_TheoreticalNetGrossWeight, prd_ActualWeight, prd_X12ActualWeightUM, 
            prd_ActualNetGrossWeightQualifier, prd_CoilLength, prd_X12CoilLengthUM, prd_CoilLengthType, prd_CutNumber, prd_CoilInnerDiameter, prd_CoilOuterDiameter, 
            prd_STXCoilOuterDiameter, prd_FaceWidth, prd_ActualWidth1, prd_ActualWidth2, prd_ActualLength1, prd_ActualLength2, prd_ActualID1, prd_ActualID2, prd_ActualOD1, 
            prd_ActualOD2, prd_ActualGauge1, prd_ActualGauge2, prd_ActualDiagonal1, prd_ActualDiagonal2, prd_ActualFlatness1, prd_ActualFlatness2, prd_ExternalOrderNumber, 
            prd_ExternalOrderItem, prd_ExternalOrderRelease, prd_ExternalOrderDate, prd_ExternalContractNumber, prd_EndUserPO, prd_EndUserReference, prd_PartCustomerID, 
            prd_PartNumber, prd_PartRevisionNumber, prd_PartDescription, prd_MeltedZone, prd_MeltedZoneCountry, prd_OriginZone, prd_OriginZoneCountry
            FROM public."861_Invex_ProductItem"
            WHERE prd_Key = $1
            ORDER BY prd_ItemNumber`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }
    return structuredRes;
};

//861 Damages
async function get861Damages(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            "dmg_LineNumber", "dmg_DamageCode", "dmg_FaultCode"
            FROM public."861_Invex_Damages"
            WHERE dmg_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//861 Product Item Instructions
async function get861ProductItemInstructions(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            "prii_INVEXInstructionType", "prii_Text"
            FROM public."861_Invex_ProductItemInstructions"
            WHERE prii_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//861 Product Item Name Address
async function get861ProductItemNameAddress(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            prna_AddressType, prna_IdentificationCodeQualifier, prna_IdentificationCode, prna_NameLine1, prna_NameLine2, prna_AddressLine1, prna_AddressLine2, 
            prna_AddressLine3, prna_City, prna_PostalCode, prna_CountryCode, prna_StateProvinceCode, prna_TelAreaCode, prna_TelNumber, prna_TelExtension, 
            prna_FaxAreaCode, prna_FaxNumber, prna_FaxExtension
            FROM public."861_Invex_ProductItemNameAddress"
            WHERE prna_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//861 Transaction Errors
async function get861TransactionErrors(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            txer_LineNo, txer_MsgTxt
            FROM public."861_Invex_TransactionErrors"
            WHERE txer_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

module.exports = {
    get861InterchangeControl: get861InterchangeControl,
    get861Damages: get861Damages,
    get861HeaderInstructions: get861HeaderInstructions,
    get861HeaderNameAddress: get861HeaderNameAddress,
    get861ItemInstructions: get861ItemInstructions,
    get861ProductItem: get861ProductItem,
    get861ProductItemInstructions: get861ProductItemInstructions,
    get861ProductItemNameAddress: get861ProductItemNameAddress,
    get861ReceiptHeader: get861ReceiptHeader,
    get861ReceiptItem: get861ReceiptItem,
    get861TransactionErrors: get861TransactionErrors,
    get861TransactionSet: get861TransactionSet
};
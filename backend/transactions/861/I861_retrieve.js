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
            adr_AddressType, adr_IdentificationCodeQualifier, adr_IdentificationCode, adr_NameLine1, adr_NameLine2, adr_AddressLine1, adr_AddressLine2, 
            adr_AddressLine3, adr_City, adr_PostalCode, adr_CountryCode, adr_StateProvinceCode, adr_TelAreaCode, adr_TelNumber, adr_TelExtension, 
            adr_FaxAreaCode, adr_FaxNumber, adr_FaxExtension
            FROM public."861_Invex_HeaderNameAddress"
            WHERE adr_Key = $1 order by adr_identificationcodequalifier desc`, [keyPK]);

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
            ins_INVEXInstructionType, ins_Text
            FROM public."861_Invex_HeaderInstructions"
            WHERE ins_Key = $1`, [keyPK]);

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
            rtm_X12PackingListWeightUM, rtm_OPSPackingListWeightUM
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
            iins_INVEXInstructionType, iins_Text
            FROM public."861_Invex_ItemInstructions"
            WHERE iins_Key = $1`, [keyPK]);

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
            pitm_ItemNumber, pitm_TagLotID, pitm_ExternalTagID, pitm_CustomerTagNo, pitm_OutsideProcessorTagID, pitm_VendorTagID, pitm_MillOrderNo, pitm_VendorReference, 
            pitm_X12PackagingCode, pitm_MaterialClassification, pitm_MaterialClassificationDatetime, pitm_MaterialStatus, pitm_MaterialStatusDateTime, pitm_processeddate, 
            pitm_ReapplicationAction, pitm_OPSCurrentProcess, pitm_Mill, pitm_Heat, pitm_Density, pitm_CoilForm, pitm_DimensionDesignator, pitm_Width, pitm_X12WidthUM, 
            pitm_EdgeDesignation, pitm_Length, pitm_X12LengthUM, pitm_GaugeSize, pitm_X12GaugeUM, pitm_InnerDiameter, pitm_X12InnerDiameterUM, pitm_OuterDiameter, 
            pitm_X12OuterDiameterUM, pitm_OPSOuterDiameterUM, pitm_RandomDimension1, pitm_RandomDimension2, pitm_RandomDimension3, pitm_RandomDimension4, pitm_RandomDimension5, 
            pitm_RandomDimension6, pitm_RandomDimension7, pitm_RandomDimension8, pitm_RandomArea, pitm_WeightPerPiece, pitm_Pieces, pitm_PiecesType, pitm_Measure, pitm_X12MeasureUM, 
            pitm_MeasureType, pitm_MeasureQualifier, pitm_TheoreticalWeight, pitm_X12TheoreticalWeightUM, pitm_TheoreticalNetGrossWeight, pitm_ActualWeight, pitm_X12ActualWeightUM, 
            pitm_ActualNetGrossWeightQualifier, pitm_CoilLength, pitm_X12CoilLengthUM, pitm_CoilLengthType, pitm_CutNumber, pitm_CoilInnerDiameter, pitm_CoilOuterDiameter, 
            pitm_STXCoilOuterDiameter, pitm_FaceWidth, pitm_ActualWidth1, pitm_ActualWidth2, pitm_ActualLength1, pitm_ActualLength2, pitm_ActualID1, pitm_ActualID2, pitm_ActualOD1, 
            pitm_ActualOD2, pitm_ActualGauge1, pitm_ActualGauge2, pitm_ActualDiagonal1, pitm_ActualDiagonal2, pitm_ActualFlatness1, pitm_ActualFlatness2, pitm_ExternalOrderNumber, 
            pitm_ExternalOrderItem, pitm_ExternalOrderRelease, pitm_ExternalOrderDate, pitm_ExternalContractNumber, pitm_EndUserPO, pitm_EndUserReference, pitm_PartCustomerID, 
            pitm_PartNumber, pitm_PartRevisionNumber, pitm_PartDescription, pitm_MeltedZone, pitm_MeltedZoneCountry, pitm_OriginZone, pitm_OriginZoneCountry
            FROM public."861_Invex_ProductItem"
            WHERE pitm_Key = $1
            ORDER BY pitm_ItemNumber`, [keyPK]);

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
            "pins_INVEXInstructionType", "pins_Text"
            FROM public."861_Invex_ProductItemInstructions"
            WHERE pins_Key = $1`, [keyPK]);

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
            pita_AddressType, pita_IdentificationCodeQualifier, pita_IdentificationCode, pita_NameLine1, pita_NameLine2, pita_AddressLine1, pita_AddressLine2, 
            pita_AddressLine3, pita_City, pita_PostalCode, pita_CountryCode, pita_StateProvinceCode, pita_TelAreaCode, pita_TelNumber, pita_TelExtension, 
            pita_FaxAreaCode, pita_FaxNumber, pita_FaxExtension
            FROM public."861_Invex_ProductItemNameAddress"
            WHERE pita_Key = $1`, [keyPK]);

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
            err_LineNo, err_MsgTxt
            FROM public."861_Invex_TransactionErrors"
            WHERE err_Key = $1`, [keyPK]);

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
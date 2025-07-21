// This module handles the retrieval of parsed EDI 856 records from the PostgreSQL database. 
// It exports functions to retrieve control, transaction, shipment, instruction, chemistry, etc data from tables 



//856 Interchange Control
async function get856InterchangeControl(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            ictl_CompanyID, ictl_SenderInterchangeIDQualifier, ictl_SenderInterchangeID, ictl_EDIXControlNumber, 
            ictl_ReceiverInterchangeIDQualifier, ictl_ReceiverInterchangeID, ictl_CreatedDateTime, ictl_AlternateInterchangeNumber, ictl_Status
            FROM public."856_Invex_InterchangeControl" 
            WHERE ictl_Key = $1`, [keyPK]);

        structuredRes = results.rows[0];
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//856 TransactionSet
async function get856TransactionSet(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            txs_TransactionSetControlNumber, txs_EDIStandardsOrganizationTransactionSet, txs_EDIStandardsOrganization, txs_Status
            FROM public."856_Invex_TransactionSet"
            WHERE  txs_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//856 Shipment Header
async function get856ShipmentHeader(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            ish_TransactionReference, ish_ManifestNumber, ish_VendorShipmentReference, ish_ShippingDateTime, ish_EstimatedArrivalDateTime, ish_X12DeliveryMethod, 
            ish_CarrierCodeQualifier, ish_CarrierIdentificationCode, ish_CarrierName, ish_CarrierReferenceNumber, ish_VehicleInfo, ish_VehicleLicensePlate, ish_AppointmentNumber, 
            ish_GateDock, ish_AppointmentDateTime, ish_ShipmentMethodOfPayment, ish_MasterGrossWeight, ish_X12MasterGrossWeightUM, ish_NumberOfPackages, ish_GrossWeight,
            ish_X12GrossWeightUM, ish_NetWeight, ish_X12NetWeightUM
            FROM public."856_Invex_ShipmentHeader"
            WHERE ish_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//856 Header Name Address
async function get856HeaderNameAddress(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT DISTINCT
            hdna_AddressType, hdna_IdentificationCodeQualifier, hdna_IdentificationCode, hdna_NameLine1, hdna_NameLine2, hdna_AddressLine1, hdna_AddressLine2, 
            hdna_AddressLine3, hdna_City, hdna_PostalCode, hdna_CountryCode, hdna_StateProvinceCode, hdna_TelAreaCode, hdna_TelNumber, hdna_TelExtension, 
            hdna_FaxAreaCode, hdna_FaxNumber, hdna_FaxExtension
            FROM public."856_Invex_HeaderNameAddress"
            WHERE hdna_Key = $1 order by hdna_identificationcodequalifier desc`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//856 Header Instructions
async function get856HeaderInstructions(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            hdin_INVEXInstructionType, hdin_Text
            FROM public."856_Invex_HeaderInstructions"
            WHERE hdin_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//856 Shipment Item
async function get856ShipmentItem(pool,  keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT DISTINCT shp_ItemNumber,
            shp_ReferenceLineNumber, shp_STRATIXOrderNumber, shp_ExternalOrderNumber, shp_ExternalOrderItem, shp_ExternalOrderRelease, 
            shp_ExternalOrderDate, shp_ExternalContractNumber, shp_EndUserPO, shp_PartNumber, shp_PartRevisionNumber, shp_NumberOfPackages, shp_GrossWeight, 
            shp_X12GrossWeightUM, shp_NetWeight, shp_X12NetWeightUM
            FROM public."856_Invex_ShipmentItem"
            WHERE shp_Key = $1
            ORDER BY shp_ItemNumber`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};


//856 Item Instructions
async function get856ItemInstructions(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            itin_INVEXInstructionType, itin_Text, itin_Index
            FROM public."856_Invex_ItemInstructions"
            WHERE itin_Key = $1
            ORDER BY itin_Index`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//856 Product Item
async function get856ProductItem(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            prd_ItemNumber, prd_Ref_ItemNumber, prd_TagLotID, prd_ExternalTagID, prd_CustomerTagNo, prd_OutsideProcessorTagID, prd_VendorTagID, prd_MillOrderNo, 
            prd_VendorReference, prd_X12PackagingCode, prd_MaterialClassification, prd_MatericalClassificationDateTime, prd_MaterialStatus, 
            prd_MaterialStatusDateTime, prd_ProcessedDate, prd_ReapplicationAction, prd_OPSCurrentProcess, prd_Mill, prd_Heat, prd_Density, prd_CoilForm, 
            prd_DimensionDesignator, prd_Width, prd_X12WidthUM, prd_EdgeDesignation, prd_Length, prd_X12LengthUM, prd_GaugeSize, prd_X12GaugeUM, 
            prd_InnerDiameter, prd_X12InnerDiameterUM, prd_OuterDiameter, prd_X12OuterDiameterUM, prd_RandomDimension1, prd_RandomDimension2, prd_RandomDimension3, 
            prd_RandomDimension4, prd_RandomDimension5, prd_RandomDimension6, prd_RandomDimension7, prd_RandomDimension8, prd_RandomArea, prd_WeightPerPiece, prd_Pieces, 
            prd_PiecesType, prd_Measure, prd_X12MeasureUM, prd_MeasureType, prd_MeasureQualifier, prd_TheoreticalWeight, prd_X12TheoreticalWeightUM, 
            prd_TheoreticalNetGrossWeight, prd_ActualWeight, prd_X12ActualWeightUM, prd_ActualNetGrossWeightQualifier, prd_CoilLength, prd_X12CoilLengthUM, 
            prd_CoilLengthType, prd_CutNumber, prd_CoilInnerDiameter, prd_CoilOuterDiameter, prd_FaceWidth, prd_ActualWidth1, prd_ActualWidth2, prd_ActualLength1, 
            prd_ActualLength2, prd_ActualID1, prd_ActualID2, prd_ActualOD1, prd_ActualOD2, prd_ActualGauge1, prd_ActualGauge2, prd_ActualDiagonal1, prd_ActualDiagonal2, 
            prd_ActualFlatness1, prd_ActualFlatness2, prd_ExternalOrderNumber, prd_ExternalOrderItem, prd_ExternalOrderRelease, prd_ExternalOrderDate, 
            prd_ExternalContractNumber, prd_EndUserPO, prd_EndUserReference, prd_PartCustomerID, prd_PartNumber, prd_PartRevisionNumber, prd_PartDescription
            FROM public."856_Invex_ProductItem"
            WHERE prd_Key = $1
            ORDER BY prd_ItemNumber, prd_Ref_ItemNumber`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//856 Chemistry
async function get856Chemistry(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            chm_LineNumber, chm_X12ChemElement, chm_EntryType, chm_Value, chm_MinValue, chm_MaxValue
            FROM public."856_Invex_Chemistry"
            WHERE chm_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//856 Damages
async function get856Damages(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            dmg_LineNumber, dmg_DamageCode, dmg_FaultCode
            FROM public."856_Invex_Damages"
            WHERE dmg_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//856 Product Item Instructions
async function get856ProductItemInstructions(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            prii_INVEXInstructionType, prii_Text, prii_Index
            FROM public."856_Invex_ProductItemInstructions"
            WHERE prii_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//856 Product Item Name Address
async function get856ProductItemNameAddress(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            prna_AddressType, prna_IdentificationCodeQualifier, prna_IdentificationCode, prna_NameLine1, prna_NameLine2, prna_AddressLine1, prna_AddressLine2, 
            prna_AddressLine3, prna_City, prna_PostalCode, prna_CountryCode, prna_StateProvinceCode, prna_TelAreaCode, prna_TelNumber, prna_TelExtension, 
            prna_FaxAreaCode, prna_FaxNumber, prna_FaxExtension
            FROM public."856_Invex_ProductItemNameAddress"
            WHERE prna_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//856 Transaction Errors
async function get856TransactionErrors(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            txer_LineNo, txer_MessageText
            FROM public."856_Invex_TransactionErrors"
            WHERE txer_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

module.exports = {
    get856InterchangeControl: get856InterchangeControl,
    get856Chemistry: get856Chemistry,
    get856Damages: get856Damages,
    get856HeaderInstructions: get856HeaderInstructions,
    get856HeaderNameAddress: get856HeaderNameAddress,
    get856ItemInstructions: get856ItemInstructions,
    get856ProductItem: get856ProductItem,
    get856ProductItemInstructions: get856ProductItemInstructions,
    get856ProductItemNameAddress: get856ProductItemNameAddress,
    get856ShipmentHeader: get856ShipmentHeader,
    get856ShipmentItem: get856ShipmentItem,
    get856TransactionErrors: get856TransactionErrors,
    get856TransactionSet: get856TransactionSet
};
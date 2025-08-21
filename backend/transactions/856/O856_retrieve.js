// This module handles the retrieval of parsed EDI 856 records from the PostgreSQL database. 
// It exports functions to retrieve control, transaction, shipment, instruction, chemistry, etc data from tables 

const  readableErrors  = require('../../functions/readableErrors.js');

//856 Interchange Control
async function get856InterchangeControl(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            ictl_CompanyID, ictl_SenderInterchangeIDQualifier, ictl_SenderInterchangeID, ictl_EDIXControlNumber, 
            ictl_ReceiverInterchangeIDQualifier, ictl_ReceiverInterchangeID, ictl_CreatedDateTime, ictl_AlternateInterchangeNumber, ictl_Status
            FROM public."856_Invex_InterchangeControl" 
            WHERE ictl_Key = $1`, [keyPK]);

        structuredRes = results.rows[0];
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//856 TransactionSet
async function get856TransactionSet(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            txs_TransactionSetControlNumber, txs_EDIStandardsOrganizationTransactionSet, txs_EDIStandardsOrganization, txs_Status
            FROM public."856_Invex_TransactionSet"
            WHERE  txs_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//856 Shipment Header
async function get856ShipmentHeader(pool, keyPK, filePath) {
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
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//856 Header Name Address
async function get856HeaderNameAddress(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT
            hdna_AddressType, hdna_IdentificationCodeQualifier, hdna_IdentificationCode, hdna_NameLine1, hdna_NameLine2, hdna_AddressLine1, hdna_AddressLine2, 
            hdna_AddressLine3, hdna_City, hdna_PostalCode, hdna_CountryCode, hdna_StateProvinceCode, hdna_TelAreaCode, hdna_TelNumber, hdna_TelExtension, 
            hdna_FaxAreaCode, hdna_FaxNumber, hdna_FaxExtension
            FROM public."856_Invex_HeaderNameAddress"
            WHERE hdna_Key = $1`, [parseInt(keyPK)]);
        structuredRes = results.rows;
      
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//856 Header Instructions
async function get856HeaderInstructions(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            hdin_INVEXInstructionType, hdin_Text
            FROM public."856_Invex_HeaderInstructions"
            WHERE hdin_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//856 Shipment Item
async function get856ShipmentItem(pool,  keyPK, filePath) {
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
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};


//856 Item Instructions
async function get856ItemInstructions(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            itin_INVEXInstructionType, itin_Text, itin_Index
            FROM public."856_Invex_ItemInstructions"
            WHERE itin_Key = $1
            ORDER BY itin_Index`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//856 Product Item
async function get856ProductItem(pool, keyPK, filePath) {
    var structuredRes = {};
    try {
        const results = await pool.query(`SELECT 
            * FROM public."856_Invex_ProductItem"
            WHERE prd_Key = $1
            ORDER BY prd_ItemNumber, prd_Ref_ItemNumber`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//856 Chemistry
async function get856Chemistry(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            chm_LineNumber, chm_X12ChemElement, chm_EntryType, chm_Value, chm_MinValue, chm_MaxValue
            FROM public."856_Invex_Chemistry"
            WHERE chm_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//856 Damages
async function get856Damages(pool, keyPK,   filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            dmg_LineNumber, dmg_DamageCode, dmg_FaultCode
            FROM public."856_Invex_Damages"
            WHERE dmg_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//856 Product Item Instructions
async function get856ProductItemInstructions(pool, keyPK , filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            prii_INVEXInstructionType, prii_Text, prii_Index
            FROM public."856_Invex_ProductItemInstructions"
            WHERE prii_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//856 Product Item Name Address
async function get856ProductItemNameAddress(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT DISTINCT
            prna_AddressType, prna_IdentificationCodeQualifier, prna_IdentificationCode, prna_NameLine1, prna_NameLine2, prna_AddressLine1, prna_AddressLine2, 
            prna_AddressLine3, prna_City, prna_PostalCode, prna_CountryCode, prna_StateProvinceCode, prna_TelAreaCode, prna_TelNumber, prna_TelExtension, 
            prna_FaxAreaCode, prna_FaxNumber, prna_FaxExtension
            FROM public."856_Invex_ProductItemNameAddress"
            WHERE prna_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//856 Transaction Errors
async function get856TransactionErrors(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            txer_LineNo, txer_MessageText
            FROM public."856_Invex_TransactionErrors"
            WHERE txer_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
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
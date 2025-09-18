// This module handles the retrieval of parsed EDI 856 records from the PostgreSQL database. 
// It exports functions to retrieve control, transaction, shipment, instruction, chemistry, etc data from tables 

const  readableErrors  = require('../../functions/readableErrors.js');

//856 Interchange Control
async function get856InterchangeControl(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            *
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
            *
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
            *
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
            *
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
            *
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
            *
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
            *
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
            *
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
            *
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
            *
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
            *
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
            *
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
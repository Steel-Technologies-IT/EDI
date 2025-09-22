// This module handles the retrieval of parsed EDI 856 records from the PostgreSQL database. 
// It exports functions to retrieve control, transaction, shipment, instruction, chemistry, etc data from tables 

const { get } = require('https');
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

async function get850forreference(pool, PartNumber, poNum, lineNum, rlsNum, isa_id, filePath, poNumShop) {
    var structuredRes = {};
    try {
        //Priority 1: If the material release exists:
        const results = await pool.query(`SELECT 
            *
            FROM public."850_SNF_Detail"
            JOIN public."850_SNF_Header" ON hdr_Key = dtl_hdr_Key AND hdr_isnd_id = $5
            WHERE dtl_part = $1 
            AND dtl_po = $2
            AND dtl_pol = $3
            AND dtl_rls = $4`, [PartNumber, poNum, lineNum, rlsNum, isa_id]);
        
        if (results.rows.length > 0) {
            structuredRes = results.rows;
            return structuredRes;
        }

        //Priority 2: If the material release doesn't exist, try without release number:
        const results2 = await pool.query(`SELECT 
            *
            FROM public."850_SNF_Detail"
            JOIN public."850_SNF_Header" ON hdr_Key = dtl_hdr_Key AND hdr_isnd_id = $4
            WHERE dtl_part = $1 
            AND dtl_po = $2
            AND dtl_pol = $3`, [PartNumber, poNum, lineNum, isa_id]);
        
        if (results2.rows.length > 0) {
            structuredRes = results2.rows;
            return structuredRes;
        }

        //Priority 3: Try without line number:
        const results3 = await pool.query(`SELECT 
            *
            FROM public."850_SNF_Detail"
            JOIN public."850_SNF_Header" ON hdr_Key = dtl_hdr_Key AND hdr_isnd_id = $4
            WHERE dtl_part = $1 
            AND dtl_po = $2
            AND dtl_rls = $3`, [PartNumber, poNum, rlsNum, isa_id]);
        
        if (results3.rows.length > 0) {
            structuredRes = results3.rows;
            return structuredRes;
        }

        //Priority 4: Try with just part and PO:
        const results4 = await pool.query(`SELECT 
            *
            FROM public."850_SNF_Detail"
            JOIN public."850_SNF_Header" ON hdr_Key = dtl_hdr_Key AND hdr_isnd_id = $3
            WHERE dtl_part = $1 
            AND dtl_po = $2`, [PartNumber, poNum, isa_id]);
        
        if (results4.rows.length > 0) {
            structuredRes = results4.rows;
            return structuredRes;
        }

        //Priority 5: Try with shop PO number:
        const results5 = await pool.query(`SELECT 
            *
            FROM public."850_SNF_Detail"
            JOIN public."850_SNF_Header" ON hdr_Key = dtl_hdr_Key AND hdr_isnd_id = $3
            WHERE dtl_part = $1 
            AND dtl_po = $2`, [PartNumber, poNumShop, isa_id]);
        
        if (results5.rows.length > 0) {
            structuredRes = results5.rows;
            return structuredRes;
        }

        //Priority 6: Attempt with just part number:
        const results6 = await pool.query(`SELECT 
            *
            FROM public."850_SNF_Detail"
            JOIN public."850_SNF_Header" ON hdr_Key = dtl_hdr_Key AND hdr_isnd_id = $2
            WHERE dtl_part = $1`, [PartNumber, isa_id]);
        
        structuredRes = results6.rows;

    } catch (error) {
        const readableErrorMessage = readableErrors(error, PartNumber, filePath);
        console.error('-', PartNumber, '-\n', readableErrorMessage, '\n-', PartNumber, '-');
    }
    return structuredRes;
};

async function get860forreference(pool, PartNumber, poNum, lineNum, rlsNum, isa_id, filePath, poNumShop) {
    var structuredRes = {};
    try {
        //Priority 1: If the material release exists:
        const results = await pool.query(`SELECT 
            *
            FROM public."860_SNF_Detail"
            JOIN public."860_SNF_Header" ON hdr_Key = dtl_hdr_Key AND hdr_isnd_id = $5
            WHERE dtl_part = $1 
            AND dtl_po = $2
            AND dtl_pol = $3
            AND dtl_rls = $4`, [PartNumber, poNum, lineNum, rlsNum, isa_id]);
        
        if (results.rows.length > 0) {
            structuredRes = results.rows;
            return structuredRes;
        }

        //Priority 2: If the material release doesn't exist, try without release number:
        const results2 = await pool.query(`SELECT 
            *
            FROM public."860_SNF_Detail"
            JOIN public."860_SNF_Header" ON hdr_Key = dtl_hdr_Key AND hdr_isnd_id = $4
            WHERE dtl_part = $1 
            AND dtl_po = $2
            AND dtl_pol = $3`, [PartNumber, poNum, lineNum, isa_id]);
        
        if (results2.rows.length > 0) {
            structuredRes = results2.rows;
            return structuredRes;
        }

        //Priority 3: Try without line number:
        const results3 = await pool.query(`SELECT 
            *
            FROM public."860_SNF_Detail"
            JOIN public."860_SNF_Header" ON hdr_Key = dtl_hdr_Key AND hdr_isnd_id = $4
            WHERE dtl_part = $1 
            AND dtl_po = $2
            AND dtl_rls = $3`, [PartNumber, poNum, rlsNum, isa_id]);
        
        if (results3.rows.length > 0) {
            structuredRes = results3.rows;
            return structuredRes;
        }

        //Priority 4: Try with just part and PO:
        const results4 = await pool.query(`SELECT 
            *
            FROM public."860_SNF_Detail"
            JOIN public."860_SNF_Header" ON hdr_Key = dtl_hdr_Key AND hdr_isnd_id = $3
            WHERE dtl_part = $1 
            AND dtl_po = $2`, [PartNumber, poNum, isa_id]);
        
        if (results4.rows.length > 0) {
            structuredRes = results4.rows;
            return structuredRes;
        }

        //Priority 5: Try with shop PO number:
        const results5 = await pool.query(`SELECT 
            *
            FROM public."860_SNF_Detail"
            JOIN public."860_SNF_Header" ON hdr_Key = dtl_hdr_Key AND hdr_isnd_id = $3
            WHERE dtl_part = $1 
            AND dtl_po = $2`, [PartNumber, poNumShop, isa_id]);
        
        if (results5.rows.length > 0) {
            structuredRes = results5.rows;
            return structuredRes;
        }

        //Priority 6: Attempt with just part number:
        const results6 = await pool.query(`SELECT 
            *
            FROM public."860_SNF_Detail"
            JOIN public."860_SNF_Header" ON hdr_Key = dtl_hdr_Key AND hdr_isnd_id = $2
            WHERE dtl_part = $1`, [PartNumber, isa_id]);
        
        structuredRes = results6.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, PartNumber, filePath);
        console.error('-', PartNumber, '-\n', readableErrorMessage, '\n-', PartNumber, '-');
    }
    return structuredRes;
};

async function get830forreference(pool, PartNumber, crt_dte, isa_id, filePath = '') {
    var structuredRes = {};
    try {
const results = await pool.query(`SELECT 
            *
        FROM public."830_SNF_Header"
        INNER JOIN public."830_SNF_Schd_Detail" ON hdr_Key = dtl_Key
        LEFT OUTER JOIN public."830_SNF_Forecast" ON hdr_Key = fcst_Key 
            AND dtl_line = fcst_line AND dtl_part = fcst_part
        WHERE dtl_part = $1 
            AND ((hdr_crt_dte <= $2 AND hdr_crt_dte > 0) OR (hdr_crt_dte = 0 AND hdr_sentdte <= $2))
            AND (hdr_isnd_id = $3 OR $3 = '')
            LIMIT 1`, 
        [PartNumber, crt_dte, isa_id]);
        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, PartNumber, filePath);
        console.error('-', PartNumber, '-\n', readableErrorMessage, '\n-', PartNumber, '-');
    }
    return structuredRes;
};


async function get862forreference(pool, PartNumber, crt_dte, isa_id, filePath = '') {
    let structuredRes = {};
    try {
        const results = await pool.query(`SELECT 
            *
        FROM public."862_SNF_Header"
        INNER JOIN public."862_SNF_Detail" ON hdr_Key = dtl_hdr_Key
        LEFT OUTER JOIN public."862_SNF_Forecast" ON hdr_Key = fcst_hdr_Key 
            AND dtl_line = fcst_sds_no AND dtl_part = fcst_part
        WHERE dtl_part = $1 
            AND ((hdr_crt_dte <= $2 AND hdr_crt_dte > 0) OR (hdr_crt_dte = 0 AND hdr_sentdte <= $2))
            AND (hdr_isnd_id = $3 OR $3 = '')
            LIMIT 1`, 
        [PartNumber, crt_dte, isa_id]);
        
        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, PartNumber, filePath);
        console.error('-', PartNumber, '-\n', readableErrorMessage, '\n-', PartNumber, '-');
    }
    return structuredRes;
}

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
    get856TransactionSet: get856TransactionSet,
    get850forreference: get850forreference,
    get860forreference: get860forreference,
    get830forreference: get830forreference,
    get862forreference: get862forreference
};
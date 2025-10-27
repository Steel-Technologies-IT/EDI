// This module handles the retrieval of parsed EDI 846 records from the PostgreSQL database. 
// It exports functions to retrieve control, transaction, shipment, instruction, chemistry, etc data from tables 

const  readableErrors  = require('../../functions/readableErrors.js');

//846 Interchange Control
async function get846InterchangeControl(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            intctl_company_id, intctl_sender_interchange_id_qualifier, intctl_sender_interchange_id,
            intctl_edix_control_number, intctl_receiver_interchange_id_qualifier, intctl_receiver_interchange_id, 
            intctl_created_datetime, intctl_alternate_interchange_number, intctl_status, intctl_flow_flag, 
            intctl_type, intctl_key, intctl_sndr_brch_ich_idqual, intctl_sndr_brch_ich_id, intctl_invexbranchcode
            FROM public."846_Invex_InterchangeControl" 
            WHERE intctl_Key = $1`, [keyPK]);

        structuredRes = results.rows[0];
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error(error)
    }

    return structuredRes;
};

//846 TransactionSet
async function get846TransactionSet(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            trnset_transaction_set_control_number, trnset_edi_standards_org_transaction_set, trnset_edi_standards_organization, trnset_status
            FROM public."846_Invex_TransactionSet"
            WHERE  trnset_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error(error)
    }

    return structuredRes;
};

//846 Inventory Handoff Header

async function get846InventoryHandoffHeader(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            invhdr_transaction_reference, invhdr_weight, invhdr_x12_weight_um, invhdr_flow_flag, invhdr_type, invhdr_key
            FROM public."846_Invex_InventoryHandoffHeader"
            WHERE  invhdr_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error(error)
    }

    return structuredRes;
};


//846 Header Name Address
async function get846HeaderNameAddress(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT
            hdradr_addresstype, hdradr_identificationcodequalifier, hdradr_identificationcode, hdradr_nameline1, 
            hdradr_nameline2, hdradr_addressline1, hdradr_addressline2, hdradr_addressline3, hdradr_city, 
            hdradr_postalcode, hdradr_countrycode, hdradr_stateprovincecode, hdradr_telareacode, hdradr_telnumber, 
            hdradr_telextension, hdradr_faxareacode, hdradr_faxnumber, hdradr_faxextension, hdradr_flow_flag, 
            hdradr_type, hdradr_key
            FROM public."846_Invex_HeaderNameAddress"
            WHERE hdradr_Key = $1`, [parseInt(keyPK)]);
        structuredRes = results.rows;
      
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error(error)
    }

    return structuredRes;
};

//846 Product Item
async function get846ProductItem(pool, keyPK, filePath) {
    var structuredRes = {};
    try {
        const results = await pool.query(`SELECT 
            prditm_itemnumber, prditm_taglotid, prditm_externaltagid, prditm_customertagno,
            prditm_outsideprocessortagid, prditm_vendortagid, prditm_millorderno, prditm_vendorreference,
            prditm_x12_packagingcode, prditm_materialclassification, prditm_materialclassificationdatetime,
            prditm_materialstatus, prditm_materialstatusdatetime, prditm_processeddate, prditm_reapplicationaction, 
            prditm_opscurrentprocess, prditm_mill, prditm_heat, prditm_density, prditm_coilform, prditm_dimensiondesignator,
            prditm_width, prditm_x12widthum, prditm_edgedesignation, prditm_length, prditm_x12lengthum, prditm_gaugesize, 
            prditm_x12gaugeum, prditm_innerdiameter, prditm_x12innerdiameterum, prditm_outerdiameter, 
            prditm_x12outerdiameterum, prditm_opsouterdiameterum, prditm_randomdimension1, prditm_randomdimension2, 
            prditm_randomdimension3, prditm_randomdimension4, prditm_randomdimension5, prditm_randomdimension6, 
            prditm_randomdimension7, prditm_randomdimension8, prditm_randomarea, prditm_weightperpiece, prditm_pieces, 
            prditm_piecestype, prditm_measure, prditm_x12measureum, prditm_measuretype, prditm_measurequalifier, 
            prditm_theoreticalweight, prditm_x12theoreticalweightum, prditm_theoreticalnetgrossweight, prditm_actualweight, 
            prditm_x12actualweightum, prditm_actualnetgrossweightqualifier, prditm_coillength, prditm_x12coillengthum, 
            prditm_coillengthtype, prditm_cutnumber, prditm_coilinnerdiameter, prditm_coilouterdiameter, 
            prditm_stxcoilouterdiameter, prditm_facewidth, prditm_actualwidth1, prditm_actualwidth2, prditm_actuallength1, 
            prditm_actuallength2, prditm_actualid1, prditm_actualid2, prditm_actualod1, prditm_actualod2, prditm_actualgauge1, 
            prditm_actualgauge2, prditm_actualdiagonal1, prditm_actualdiagonal2, prditm_actualflatness1, 
            prditm_actualflatness2, prditm_externalordernumber, prditm_externalorderitem, prditm_externalorderrelease, 
            prditm_externalorderdate, prditm_externalcontractnumber, prditm_enduserpo, prditm_enduserreference, 
            prditm_partcustomerid, prditm_partnumber, prditm_partrevisionnumber, prditm_partdescription, prditm_meltedzone, 
            prditm_meltedzonecountry, prditm_originzone, prditm_originzonecountry, prditm_flow_flag, prditm_type, 
            prditm_key, prditm_labelid, prditm_form, prditm_grade, prditm_size, prditm_finish, prditm_ext_fin_desc, 
            prditm_siz_desc, prditm_wgt_type, prditm_net_gross_wgt
            FROM public."846_Invex_ProductItem"
            WHERE prditm_Key = $1
            ORDER BY prditm_ItemNumber`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error(error)
    }

    return structuredRes;
};

//846 Damages
async function get846Damages(pool, keyPK,   filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            dam_linenumber, dam_opsdamagecode, dam_opsfaultcode
            FROM public."846_Invex_Damages"
            WHERE dam_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error(error)
    }

    return structuredRes;
};

//846 Product Item Instructions
async function get846ProductItemInstruction(pool, keyPK , filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            prdins_invexinstructiontype, prdins_text
            FROM public."846_Invex_ProductItemInstruction" 
            WHERE prdins_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error(error)
    }

    return structuredRes;
};

//846 Transaction Errors
async function get846TransactionErrors(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            err_lineno, err_messagetext
            FROM public."846_Invex_TransactionErrors"
            WHERE err_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error(error)
    }

    return structuredRes;
};

module.exports = {
    get846InterchangeControl: get846InterchangeControl,
    get846Damages: get846Damages,
    get846InventoryHandoffHeader: get846InventoryHandoffHeader,
    get846HeaderNameAddress: get846HeaderNameAddress,
    get846ProductItem: get846ProductItem,
    get846ProductItemInstruction: get846ProductItemInstruction,
    get846TransactionErrors: get846TransactionErrors,
    get846TransactionSet: get846TransactionSet
};
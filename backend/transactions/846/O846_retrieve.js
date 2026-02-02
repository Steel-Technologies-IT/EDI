// This module handles the retrieval of parsed EDI 846 records from the PostgreSQL database. 
// It exports functions to retrieve control, transaction, shipment, instruction, chemistry, etc data from tables 

const  readableErrors  = require('../../functions/readableErrors.js');

//846 Interchange Control
async function get846InterchangeControl(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            ictl_company_id,ictl_sender_interchange_id_qualifier,ictl_sender_interchange_id,ictl_edix_control_number,ictl_receiver_interchange_id_qualifier,ictl_receiver_interchange_id,ictl_created_datetime,ictl_alternate_interchange_number,ictl_status,ictl_flow_flag,ictl_type,ictl_key,ictl_sndr_brch_ich_idqual,ictl_sndr_brch_ich_id,ictl_invexbranchcode
            FROM public."846_Invex_InterchangeControl" 
            WHERE ictl_Key = $1`, [keyPK]);

        structuredRes = results.rows[0];
    } catch (error) {
        
        console.error(error)
    }

    return structuredRes;
};

//846 TransactionSet
async function get846TransactionSet(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            txs_transactionsetcontrolnumber, txs_edistandardsorgtransactionset, txs_edistandardsorganization, txs_status, txs_flow_flag, txs_type, txs_key
            FROM public."846_Invex_TransactionSet"
            WHERE  txs_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        
        console.error(error)
    }

    return structuredRes;
};

//846 Inventory Handoff Header

async function get846InventoryHandoffHeader(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            invhdr_transaction_reference, invhdr_weight, invhdr_x12_weight_um, invhdr_flow_flag, invhdr_type, invhdr_key, invhdr_sttx_locn
            FROM public."846_Invex_InventoryHandoffHeader"
            WHERE  invhdr_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        
        console.error(error)
    }

    return structuredRes;
};


//846 Header Name Address
async function get846HeaderNameAddress(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT
            hdna_addresstype,hdna_identificationcodequalifier,hdna_identificationcode,hdna_nameline1,hdna_nameline2,hdna_addressline1,hdna_addressline2,hdna_addressline3,hdna_city,hdna_postalcode,hdna_countrycode,hdna_stateprovincecode,hdna_telareacode,hdna_telnumber,hdna_telextension,hdna_faxareacode,hdna_faxnumber,hdna_faxextension,hdna_flow_flag,hdna_type,hdna_key,hdna_transactionreference
            FROM public."846_Invex_HeaderNameAddress"
            WHERE hdna_Key = $1`, [parseInt(keyPK)]);
        structuredRes = results.rows;
      
    } catch (error) {
        
        console.error(error)
    }

    return structuredRes;
};

//846 Product Item
async function get846ProductItem(pool, keyPK) {
    var structuredRes = {};
    try {
        const results = await pool.query(`SELECT 
            prd_itemnumber,prd_taglotid,prd_externaltagid,prd_customertagno,prd_outsideprocessortagid,prd_vendortagid,prd_millorderno,prd_vendorreference,prd_x12_packagingcode,prd_materialclassification,prd_materialclassificationdatetime,prd_materialstatus,prd_materialstatusdatetime,prd_processeddate,prd_reapplicationaction,prd_opscurrentprocess,prd_mill,prd_heat,prd_coilform,prd_dimensiondesignator,prd_width,prd_x12widthum,prd_edgedesignation,prd_length,prd_x12lengthum,prd_gaugesize,prd_x12gaugeum,prd_innerdiameter,prd_x12innerdiameterum,prd_outerdiameter,prd_x12outerdiameterum,prd_opsouterdiameterum,prd_randomdimension1,prd_randomdimension2,prd_randomdimension3,prd_randomdimension4,prd_randomdimension5,prd_randomdimension6,prd_randomdimension7,prd_randomdimension8,prd_randomarea,prd_weightperpiece,prd_pieces,prd_piecestype,prd_measure,prd_x12measureum,prd_measuretype,prd_measurequalifier,prd_theoreticalweight,prd_x12theoreticalweightum,prd_theoreticalnetgrossweight,prd_actualweight,prd_x12actualweightum,prd_actualnetgrossweightqualifier,prd_coillength,prd_x12coillengthum,prd_coillengthtype,prd_cutnumber,prd_coilinnerdiameter,prd_coilouterdiameter,prd_stxcoilouterdiameter,prd_facewidth,prd_actualwidth1,prd_actualwidth2,prd_actuallength1,prd_actuallength2,prd_actualid1,prd_actualid2,prd_actualod1,prd_actualod2,prd_actualgauge1,prd_actualgauge2,prd_actualdiagonal1,prd_actualdiagonal2,prd_actualflatness1,prd_actualflatness2,prd_externalordernumber,prd_externalorderitem,prd_externalorderrelease,prd_externalorderdate,prd_externalcontractnumber,prd_enduserpo,prd_enduserreference,prd_partcustomerid,prd_partnumber,prd_partrevisionnumber,prd_partdescription,prd_meltedzone,prd_meltedzonecountry,prd_originzone,prd_originzonecountry,prd_flow_flag,prd_type,prd_key,prd_labelid,prd_form,prd_grade,prd_size,prd_finish,prd_ext_fin_desc,prd_siz_desc,prd_wgt_type,prd_net_gross_wgt,prd_density,prd_transactionreference, prd_sttx_locn
            FROM public."846_Invex_ProductItem"
            WHERE prd_Key = $1
            ORDER BY prd_ItemNumber`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        
        console.error(error)
    }

    return structuredRes;
};

//846 Damages
async function get846Damages(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            dmg_linenumber,dmg_opsdamagecode,dmg_opsfaultcode,dmg_flow_flag,dmg_type,dmg_key
            FROM public."846_Invex_Damages"
            WHERE dmg_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        
        console.error(error)
    }

    return structuredRes;
};

//846 Product Item Instructions
async function get846ProductItemInstruction(pool, keyPK ) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            prii_invexinstructiontype,prii_text,prii_flow_flag,prii_type,prii_key
            FROM public."846_Invex_ProductItemInstruction" 
            WHERE prii_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        
        console.error(error)
    }

    return structuredRes;
};

//846 Transaction Errors
async function get846TransactionErrors(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            txer_lineno,txer_messagetext,txer_flow_flag,txer_type,txer_key
            FROM public."846_Invex_TransactionErrors"
            WHERE txer_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        
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
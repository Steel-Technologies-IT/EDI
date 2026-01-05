// This module handles the retrieval of parsed EDI 870 records from the PostgreSQL database. 
// It exports functions to retrieve control, transaction, shipment, instruction, chemistry, etc data from tables 



//870 Interchange Control
async function get870InterchangeControl(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT ictl_companyid,ictl_senderinterchangeidqualifier,ictl_senderinterchangeid,ictl_edixcontrolnumber,ictl_receiverinterchangeidqualifier,ictl_receiverinterchangeid,ictl_createddatetime,ictl_alternateinterchangenumber,ictl_status,ictl_flow_flag,ictl_type,ictl_key,ictl_sndr_brch_ich_idqual,ictl_sndr_brch_ich_id,ictl_INVEXBranchCode
            FROM public."870_Invex_InterchangeControl" 
            WHERE ictl_Key = $1`, [keyPK]);

        structuredRes = results.rows[0];
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//870 TransactionSet
async function get870TransactionSet(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            txs_interchangecontrolid,txs_transactionsetcontrolnumber,txs_edistandardsorganizationtransactionset,txs_edistandardsorganization,txs_status,txs_flow_flag,txs_type,txs_key
            FROM public."870_Invex_TransactionSet"
            WHERE  txs_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//870 Header Name Address
async function get870HeaderNameAddress(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT DISTINCT
            hdna_itemnumber,hdna_edixaddresstype,hdna_identificationcodequalifier,hdna_identificationcode,hdna_name1,hdna_name2,hdna_address1,hdna_address2,hdna_address3,hdna_city,hdna_postalcode,hdna_countrycode,hdna_stateprovincecode,hdna_telephoneareacode,hdna_telephonenumber,hdna_telephoneextension,hdna_faxareacode,hdna_faxnumber,hdna_faxextension,hdna_flow_flag,hdna_type,hdna_key,hdna_addresstype
            FROM public."870_Invex_HeaderNameAddress"
            WHERE hdna_Key = $1 order by hdna_identificationcodequalifier desc`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//870 Header Instructions
async function get870HeaderInstructions(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            hdin_invexinstructiontype,hdin_text,hdin_flow_flag,hdin_type,hdin_key
            FROM public."870_Invex_HeaderInstructions"
            WHERE hdin_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//870 Production Reporting Header
async function get870ProductionReportingHeader(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            prdhdr_transactionsetid, prdhdr_transactionreference, prdhdr_updatedatetime, prdhdr_statusreportcode, prdhdr_orderitemcode, prdhdr_opsprocess, prdhdr_serviceordernumber, prdhdr_layoutnumber, prdhdr_vendorreference, prdhdr_externalordernumber, prdhdr_externalorderitem, prdhdr_externalorderrelease, prdhdr_externalorderdate, prdhdr_externalcontractnumber, prdhdr_enduserpo, prdhdr_flow_flag, prdhdr_type, prdhdr_key
            FROM public."870_Invex_ProductionReportingHeader"
            WHERE prdhdr_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//870 Product Item
async function get870ProductItem(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT prd_itemnumber,prd_taglotid,prd_externaltagid,prd_customertagno,prd_outsideprocessortagid,prd_vendortagid,prd_millorderno,prd_vendorreference,prd_x12packagingcode,prd_materialclassification,prd_materialclassificationdatetime,prd_materialstatus,prd_materialstatusdatetime,prd_processeddate,prd_reapplicationaction,prd_opscurrentprocess,prd_mill,prd_heat,prd_density,prd_coilform,prd_dimensiondesignator,prd_width,prd_x12widthum,prd_edgedesignation,prd_length,prd_x12lengthum,prd_gaugesize,prd_x12gaugeum,prd_innerdiameter,prd_x12innerdiameterum,prd_outerdiameter,prd_x12outerdiameterum,prd_opsouterdiameterum,prd_randomdimension1,prd_randomdimension2,prd_randomdimension3,prd_randomdimension4,prd_randomdimension5,prd_randomdimension6,prd_randomdimension7,prd_randomdimension8,prd_randomarea,prd_weightperpiece,prd_pieces,prd_piecestype,prd_measure,prd_x12measureum,prd_measuretype,prd_measurequalifier,prd_theoreticalweight,prd_x12theoreticalweightum,prd_theoreticalnetgrossweight,prd_actualweight,prd_x12actualweightum,prd_actualnetgrossweightqualifier,prd_coillength,prd_x12coillengthum,prd_coillengthtype,prd_cutnumber,prd_coilinnerdiameter,prd_coilouterdiameter,prd_stxcoilouterdiameter,prd_facewidth,prd_actualwidth1,prd_actualwidth2,prd_actuallength1,prd_actuallength2,prd_actualid1,prd_actualid2,prd_actualod1,prd_actualod2,prd_actualgauge1,prd_actualgauge2,prd_actualdiagonal1,prd_actualdiagonal2,prd_actualflatness1,prd_actualflatness2,prd_externalordernumber,prd_externalorderitem,prd_externalorderrelease,prd_externalorderdate,prd_externalcontractnumber,prd_enduserpo,prd_enduserreference,prd_partcustomerid,prd_partnumber,prd_partrevisionnumber,prd_partdescription,prd_meltedzone,prd_meltedzonecountry,prd_originzone,prd_originzonecountry,prd_flow_flag,prd_type,prd_key,"prd_Item_cons_or_prod",prd_label_id,prd_form,prd_grade,prd_size,prd_finish,prd_ext_fin_desc,prd_size_desc,prd_wgt_type,prd_net_gross_wgt,prd_referencelinenumber
            FROM public."870_Invex_ProductItem"
            WHERE prd_Key = $1
            ORDER BY prd_ItemNumber, prd_taglotid`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};
// 870 Product Item Instructions
async function get870ProductItemInstructions(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT prii_invexinstructiontype, prii_text, prii_flow_flag, prii_type, prii_key
            FROM public."870_Invex_ProductItemInstructions"
            WHERE prii_Key = $1
            ORDER BY prii_Key`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//870 NonRecordedScrapItems 
async function get870NonRecordedScrapItems(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            nrscr_productionreportingheaderid,nrscr_scrapdamagecode,nrscr_pieces,nrscr_measurelength,nrscr_x12measurelengthum,nrscr_opsmeasurelengthum,nrscr_measurearea,nrscr_x12measureareaum,nrscr_opsmeasureareaum,nrscr_weight,nrscr_x12weightum,nrscr_opsweightum,nrscr_flow_flag,nrscr_type,nrscr_key,nrscr_itemnumber
            FROM public."870_Invex_NonRecordedScrapItems"
            WHERE nrscr_key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//870 Damages
async function get870Damages(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT dmg_linenumber, dmg_damagecode, dmg_faultcode, dmg_flow_flag, dmg_type, dmg_key
            FROM public."870_Invex_Damages"
            WHERE dmg_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};


//870 Product Item Name Address
async function get870ProductItemNameAddress(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            prna_itemnumber, prna_edixaddresstype, prna_identificationcodequalifier, prna_identificationcode, prna_name1, prna_name2, prna_address1, prna_address2, prna_address3, prna_city, prna_postalcode, prna_countrycode, prna_stateprovincecode, prna_telephoneareacode, prna_telephonenumber, prna_telephoneextension, prna_faxareacode, prna_faxnumber, prna_faxextension, prna_flow_flag, prna_type, prna_key, prna_addresstype
            FROM public."870_Invex_ProductItemNameAddress"
            WHERE prna_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};


//870 Transaction Errors
async function get870TransactionErrors(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            txer_LineNo, txer_MessageText
            FROM public."870_Invex_TransactionErrors"
            WHERE txer_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

module.exports = {
    get870InterchangeControl: get870InterchangeControl,
    get870Damages: get870Damages,
    get870HeaderInstructions: get870HeaderInstructions,
    get870HeaderNameAddress: get870HeaderNameAddress,
    get870NonRecordedScrapItems: get870NonRecordedScrapItems,
    get870ProductItem: get870ProductItem,
    get870ProductItemInstructions: get870ProductItemInstructions,
    get870ProductItemNameAddress: get870ProductItemNameAddress,
    get870ProductionReportingHeader: get870ProductionReportingHeader,
    get870TransactionErrors: get870TransactionErrors,
    get870TransactionSet: get870TransactionSet
};
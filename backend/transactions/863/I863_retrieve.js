// This module handles the retrieval of parsed EDI 863 records from the PostgreSQL database. 
// It exports functions to retrieve control, transaction, shipment, instruction, chemistry, etc data from tables 



//863 Interchange Control
async function get863InterchangeControl(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            ictl_companyid,ictl_senderinterchangeidqualifier,ictl_senderinterchangeid,ictl_edixcontrolnumber,ictl_receiverinterchangeidqualifier,ictl_receiverinterchangeid,ictl_createddatetime,ictl_alternateinterchangenumber,ictl_status
            FROM public."863_Invex_InterchangeControl" 
            WHERE ictl_Key = $1`, [keyPK]);

        structuredRes = results.rows[0];
    } catch (error) {
        console.error('Error retrieving InterchangeControl records:', error);
    }

    return structuredRes;
};

//863 TransactionSet
async function get863TransactionSet(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            txs_transactionsetcontrolnumber,txs_edistandardsorganizationtransactionset,txs_edistandardsorganization,txs_status
            FROM public."863_Invex_TransactionSet"
            WHERE  txs_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving TransactionSet records:', error);
    }

    return structuredRes;
};

//863 ShipmentHeaderTestResult
async function get863ShipmentHeaderTestResult(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            tres_transactionreference,tres_manifestnumber,tres_vendorshipmentreference,tres_shippingdatetime,tres_transactionsetpurposecode
            FROM public."863_Invex_ShipmentHeaderTestResult"
            WHERE  tres_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving ShipmentHeaderTestResult records:', error);
    }

    return structuredRes;
};

//863 HeaderNameAddress
async function get863HeaderNameAddress(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            hdna_addresstype,hdna_identificationcodequalifier,hdna_identificationcode,hdna_nameline1,hdna_nameline2,hdna_addressline1,hdna_addressline2,hdna_addressline3,hdna_city,hdna_postalcode,hdna_countrycode,hdna_stateprovincecode,hdna_telareacode,hdna_telnumber,hdna_telextension,hdna_faxareacode,hdna_faxnumber,hdna_faxextension
            FROM public."863_Invex_HeaderNameAddress"
            WHERE  hdna_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving HeaderNameAddress records:', error);
    }

    return structuredRes;
};

//863 ShipmentItemTestResult
async function get863ShipmentItemTestResult(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            sitr_referencelinenumber,sitr_invexordernumber,sitr_externalordernumber,sitr_externalorderitem,sitr_externalorderrelease,sitr_externalorderdate,sitr_externalcontactnumber,sitr_enduserpo
            FROM public."863_Invex_ShipmentItemTestResult"
            WHERE  sitr_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving ShipmentItemTestResult records:', error);
    }

    return structuredRes;
};

//863 ItemInstructions
async function get863ItemInstructions(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            itin_invexinstructiontype,itin_text
            FROM public."863_Invex_ItemInstructions"
            WHERE  itin_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving ItemInstructions records:', error);
    }

    return structuredRes;
};

//863 ProductItem
async function get863ProductItem(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            prd_itemnumber,prd_taglotid,prd_externaltagid,prd_customertagno,prd_outsideprocessortagid,prd_vendortagid,prd_millorderno,prd_vendorreference,prd_x12packagingcode,prd_materialclassification,prd_matericalclassificationdatetime,prd_materialstatus,prd_materialstatusdatetime,prd_processeddate,prd_reapplicationaction,prd_opscurrentprocess,prd_mill,prd_heat,prd_density,prd_coilform,prd_dimensiondesignator,prd_width,prd_x12widthum,prd_edgedesignation,prd_length,prd_x12lengthum,prd_gaugesize,prd_x12gaugeum,prd_innerdiameter,prd_x12innerdiameterum,prd_outerdiameter,prd_x12outerdiameterum,prd_randomdimension1,prd_randomdimension2,prd_randomdimension3,prd_randomdimension4,prd_randomdimension5,prd_randomdimension6,prd_randomdimension7,prd_randomdimension8,prd_randomarea,prd_weightperpiece,prd_pieces,prd_piecestype,prd_measure,prd_x12measureum,prd_measuretype,prd_measurequalifier,prd_theoreticalweight,prd_x12theoreticalweightum,prd_theoreticalnetgrossweight,prd_actualweight,prd_x12actualweightum,prd_actualnetgrossweightqualifier,prd_coillength,prd_x12coillengthum,prd_coillengthtype,prd_cutnumber,prd_coilinnerdiameter,prd_coilouterdiameter,prd_facewidth,prd_actualwidth1,prd_actualwidth2,prd_actuallength1,prd_actuallength2,prd_actualid1,prd_actualid2,prd_actualod1,prd_actualod2,prd_actualgauge1,prd_actualgauge2,prd_actualdiagonal1,prd_actualdiagonal2,prd_actualflatness1,prd_actualflatness2,prd_externalordernumber,prd_externalorderitem,prd_externalorderrelease,prd_externalorderdate,prd_externalcontractnumber,prd_enduserpo,prd_enduserreference,prd_partcustomerid,prd_partnumber,prd_partrevisionnumber,prd_partdescription
            FROM public."863_Invex_ProductItem"
            WHERE  prd_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving ProductItem records:', error);
    }

    return structuredRes;
};

//863 Chemistry
async function get863Chemistry(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            chm_linenumber,chm_x12chemelement,chm_entrytype,chm_value,chm_minvalue,chm_maxvalue
            FROM public."863_Invex_Chemistry"
            WHERE chm_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving Chemistry records:', error);
    }

    return structuredRes;
};

//863 PhysicalTests
async function get863PhysicalTests(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            phts_linenumber,phts_x12testdirection,phts_x12physicaltest,phts_entrytype,phts_value,phts_minvalue,phts_maxvalue,phts_alphavalue,phts_x12unitofmeasure
            FROM public."863_Invex_PhysicalTests"
            WHERE phts_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving PhysicalTests records:', error);
    }

    return structuredRes;
};

//863 Jominy
async function get863Jominy(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            jmny_linenumber,jmny_testtype,jmny_readingposition,jmny_entrytype,jmny_value,jmny_minvalue,jmny_maxvalue
            FROM public."863_Invex_Jominy"
            WHERE jmny_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving Jominy records:', error);
    }

    return structuredRes;
};

//863 HeatTreatment
async function get863HeatTreatment(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            htrt_linenumber,htrt_heattreatmentcode,htrt_heattreatmenttemp,htrt_x12heattreatmenttempmeasure,htrt_heattreatmenttime,htrt_coolantmethod,htrt_coolanttemp
            FROM public."863_Invex_HeatTreatment"
            WHERE htrt_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving HeatTreatment records:', error);
    }

    return structuredRes;
};

//863 Impact
async function get863Impact(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            imp_linenumber,imp_impacttesttype,imp_x12testdirection,imp_x12unitofmeasure,imp_temperature,imp_x12temperaturemeasure,imp_result1,imp_result2,imp_result3
            FROM public."863_Invex_Impact"
            WHERE imp_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving Impact records:', error);
    }

    return structuredRes;
};

//863 MicroInclusion
async function get863MicroInclusion(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            micl_linenumber,micl_microinclusionstandard,micl_thinresulta,micl_thickresulta,micl_thinresultb,micl_thickresultb,micl_thinresultc,micl_thickresultc,micl_thinresultd,micl_thickresultd
            FROM public."863_Invex_MicroInclusion"
            WHERE micl_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving MicroInclusion records:', error);
    }

    return structuredRes;
};

//863 QDSInstructions
async function get863QDSInstructions(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            qdsi_invexinstructiontype,qdsi_text
            FROM public."863_Invex_QDSInstructions"
            WHERE qdsi_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving QDSInstructions records:', error);
    }

    return structuredRes;
};

//863 ProductItemNameAddress
async function get863ProductItemNameAddress(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            prna_addresstype,prna_identificationcodequalifier,prna_identificationcode,prna_nameline1,prna_nameline2,prna_addressline1,prna_addressline2,prna_addressline3,prna_city,prna_postalcode,prna_countrycode,prna_stateprovincecode,prna_telareacode,prna_telnumber,prna_telextension,prna_faxareacode,prna_faxnumber,prna_faxextension
            FROM public."863_Invex_ProductItemNameAddress"
            WHERE prna_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving ProductItemNameAddress records:', error);
    }

    return structuredRes;
};

//863 TransactionErrors
async function get863TransactionErrors(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            txer_lineno,txer_messagetext
            FROM public."863_Invex_TransactionErrors"
            WHERE txer_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving TransactionErrors records:', error);
    }

    return structuredRes;
};

module.exports = {
    get863InterchangeControl: get863InterchangeControl,
    get863TransactionSet: get863TransactionSet,
    get863ShipmentHeaderTestResult: get863ShipmentHeaderTestResult, 
    get863HeaderNameAddress: get863HeaderNameAddress,
    get863ShipmentItemTestResult: get863ShipmentItemTestResult,
    get863ItemInstructions: get863ItemInstructions,
    get863ProductItem: get863ProductItem,   
    get863Chemistry: get863Chemistry,
    get863PhysicalTests: get863PhysicalTests,
    get863Jominy: get863Jominy,
    get863HeatTreatment: get863HeatTreatment,
    get863Impact: get863Impact,
    get863MicroInclusion: get863MicroInclusion,
    get863QDSInstructions: get863QDSInstructions,
    get863ProductItemNameAddress: get863ProductItemNameAddress,
    get863TransactionErrors: get863TransactionErrors
};
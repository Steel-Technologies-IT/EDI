// This module handles the retrieval of parsed EDI 863 records from the PostgreSQL database. 
// It exports functions to retrieve control, transaction, shipment, instruction, chemistry, etc data from tables 

//const  readableErrors  = require('../../functions/readableErrors.js');

//856 Interchange Control
async function get863InterchangeControl(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT
            ictl_type, ictl_key, ictl_companyid, ictl_senderinterchangeidqualifier, ictl_senderinterchangeid, ictl_edixcontrolnumber, ictl_receiverinterchangeidqualifier, ictl_receiverinterchangeid, ictl_alternateinterchangenumber, ictl_status, ictl_flow_flag, ictl_createddatetime, ictl_invexbranchcode, ictl_sndr_brch_ich_id, ictl_sndr_brch_ich_idqual
	        FROM public."863_Invex_InterchangeControl"
            WHERE ictl_key = $1`, [keyPK]);
            
        structuredRes = results.rows[0];
        //console.log('InterchangeControl Results:', structuredRes);

        //    console.log('863 Interchange Control:', JSON.stringify(structuredRes));
    } catch (error) {
//        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        //console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

   // console.log('863 Interchange Control:', JSON.stringify(structuredRes));
   // console.log('Key: ', keyPK);
    return structuredRes;
};

//863 TransactionSet
async function get863TransactionSet(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
        txs_type, txs_key, txs_transactionsetcontrolnumber, txs_edistandardsorganizationtransactionset, txs_edistandardsorganization, txs_status, txs_flow_flag
	    FROM public."863_Invex_TransactionSet"
        WHERE  txs_key = $1`, [keyPK]);

        structuredRes = results.rows;
        //console.log('TransactionSet Results:', structuredRes);
    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//863 Shipment Header
async function get863ShipmentHeader(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            tres_type, tres_key, tres_transactionreference, tres_manifestnumber, tres_vendorshipmentreference, tres_shippingdatetime, tres_transactionsetpurposecode, tres_flow_flag
	        FROM public."863_Invex_ShipmentHeaderTestResult"
            WHERE tres_key = $1`, [keyPK]);

        structuredRes = results.rows;
        //console.log('ShipmentHeader Results:', structuredRes);

    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//863 Header Name Address
async function get863HeaderNameAddress(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            hdna_type, hdna_key, hdna_addresstype, hdna_identificationcodequalifier, hdna_identificationcode, hdna_nameline1, hdna_nameline2, hdna_addressline1, hdna_addressline2, hdna_addressline3, hdna_city, hdna_postalcode, hdna_countrycode, hdna_stateprovincecode, hdna_telareacode, hdna_telnumber, hdna_telextension, hdna_faxareacode, hdna_faxnumber, hdna_faxextension, hdna_flow_flag
	        FROM public."863_Invex_HeaderNameAddress"
            WHERE hdna_key = $1`, [parseInt(keyPK)]);
        structuredRes = results.rows;
        
        //console.log('HeaderNameAddress Results:', structuredRes);

    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//863 Header QDSInstructions
async function get863QDSInstructions(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
        qdsi_type, qdsi_key, qdsi_invexinstructiontype, qdsi_text, qdsi_flow_flag
	    FROM public."863_Invex_QDSInstructions"
        WHERE qdsi_Key = $1`, [keyPK]);

        structuredRes = results.rows;
        //console.log('QDSInstructions Results:', structuredRes);
    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//863 Shipment Item
async function get863ShipmentItem(pool,  keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            sitr_type, sitr_key, sitr_referencelinenumber, sitr_invexordernumber, sitr_externalordernumber, sitr_externalorderitem, sitr_externalorderrelease, sitr_externalorderdate, sitr_externalcontractnumber, sitr_enduserpo, sitr_flow_flag
	        FROM public."863_Invex_ShipmentItemTestResult"
            WHERE sitr_key = $1
            ORDER BY sitr_referencelinenumber`, [keyPK]);

        structuredRes = results.rows;
        //console.log('Shipment Item Results:', structuredRes);
    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};


//863 Item Instructions
async function get863ItemInstructions(pool, keyPK, filePath) {
    var structuredRes = {};
    
    try {

        const results = await pool.query(`SELECT 
            itin_type, itin_key, itin_invexinstructiontype, itin_text, itin_flow_flag
	        FROM public."863_Invex_ItemInstructions"
            WHERE itin_key = $1`, [keyPK]);  
//            ORDER BY itin_Index  //Work with Chuck to add this column like 856 table
            
        structuredRes = results.rows;
        //console.log('Item Instructions:', structuredRes);
    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//863 Product Item
async function get863ProductItem(pool, keyPK, filePath) {
    var structuredRes = {};
    console.log('Key in Product Item:', keyPK);
/*     SELECT 
            prd_type, prd_key, prd_itemnumber, prd_taglotid, prd_externaltagid, prd_customertagno, prd_outsideprocessortagid, prd_vendortagid, prd_millorderno, prd_vendorreference, prd_x12packagingcode, prd_materialclassification, prd_materialclassificationdatetime, prd_materialstatus, prd_materialstatusdatetime, prd_processeddate, prd_reapplicationaction, prd_opscurrentprocess, prd_mill, prd_heat, prd_density, prd_coilform, prd_dimensiondesignator, prd_width, prd_x12widthum, prd_edgedesignation, prd_length, prd_x12lengthum, prd_gaugesize, prd_x12gaugeum, prd_innerdiameter, prd_x12innerdiameterum, prd_outerdiameter, prd_x12outerdiameterum, prd_randomdimension1, prd_randomdimension2, prd_randomdimension3, prd_randomdimension4, prd_randomdimension5, prd_randomdimension6, prd_randomdimension7, prd_randomdimension8, prd_randomarea, prd_weightperpiece, prd_pieces, prd_piecestype, prd_measure, prd_x12measureum, prd_measuretype, prd_measurequalifier, prd_theoreticalweight, prd_x12theoreticalweightum, prd_theoreticalnetgrossweight, prd_actualweight, prd_x12actualweightum, prd_actualnetgrossweightqualifier, prd_coillength, prd_x12coillengthum, prd_coillengthtype, prd_cutnumber, prd_coilinnerdiameter, prd_coilouterdiameter, prd_facewidth, prd_actualwidth1, prd_actualwidth2, prd_actuallength1, prd_actuallength2, prd_actualid1, prd_actualid2, prd_actualod1, prd_actualod2, prd_actualgauge1, prd_actualgauge2, prd_actualdiagonal1, prd_actualdiagonal2, prd_actualflatness1, prd_actualflatness2, prd_externalordernumber, prd_externalorderitem, prd_externalorderrelease, prd_externalorderdate, prd_externalcontractnumber, prd_enduserpo, prd_enduserreference, prd_partcustomerid, prd_partnumber, prd_partrevisionnumber, prd_partdescription, prd_flow_flag, prd_ext_fin_desc, prd__finish, prd_form, prd_grade, prd_label_id, prd_meltedzone, prd_meltedzonecountry
	        FROM public."863_Invex_ProductItem"
            WHERE prd_key = $1
            ORDER BY prd_itemnumber`, [keyPK]); 
            
            //, prd_Ref_ItemNumber // prd_Ref_ItemNumber to be added to the table -work with Chuck */
    try {
        const results = await pool.query(`SELECT 
            prd_type, prd_key, prd_itemnumber, prd_taglotid, prd_externaltagid, prd_customertagno, prd_outsideprocessortagid, prd_vendortagid, prd_millorderno, prd_vendorreference, prd_x12packagingcode, prd_materialclassification, prd_materialclassificationdatetime, prd_materialstatus, prd_materialstatusdatetime, prd_processeddate, prd_reapplicationaction, prd_opscurrentprocess, prd_mill, prd_heat, prd_density, prd_coilform, prd_dimensiondesignator, prd_width, prd_x12widthum, prd_edgedesignation, prd_length, prd_x12lengthum, prd_gaugesize, prd_x12gaugeum, prd_innerdiameter, prd_x12innerdiameterum, prd_outerdiameter, prd_x12outerdiameterum, prd_randomdimension1, prd_randomdimension2, prd_randomdimension3, prd_randomdimension4, prd_randomdimension5, prd_randomdimension6, prd_randomdimension7, prd_randomdimension8, prd_randomarea, prd_weightperpiece, prd_pieces, prd_piecestype, prd_measure, prd_x12measureum, prd_measuretype, prd_measurequalifier, prd_theoreticalweight, prd_x12theoreticalweightum, prd_theoreticalnetgrossweight, prd_actualweight, prd_x12actualweightum, prd_actualnetgrossweightqualifier, prd_coillength, prd_x12coillengthum, prd_coillengthtype, prd_cutnumber, prd_coilinnerdiameter, prd_coilouterdiameter, prd_facewidth, prd_actualwidth1, prd_actualwidth2, prd_actuallength1, prd_actuallength2, prd_actualid1, prd_actualid2, prd_actualod1, prd_actualod2, prd_actualgauge1, prd_actualgauge2, prd_actualdiagonal1, prd_actualdiagonal2, prd_actualflatness1, prd_actualflatness2, prd_externalordernumber, prd_externalorderitem, prd_externalorderrelease, prd_externalorderdate, prd_externalcontractnumber, prd_enduserpo, prd_enduserreference, prd_partcustomerid, prd_partnumber, prd_partrevisionnumber, prd_partdescription, prd_flow_flag, prd_extended_finish_desc, prd_finish, prd_form, prd_grade, prd_labelid, prd_melted_zone, prd_melted_zone_cntry, prd_net_gross_wgt_q, prd_origin_zone_ctry, prd_prd_itm_inst, prd_size, prd_size_desc, prd_weight, prd_weight_type, prd_x12_wgt_um
	        FROM public."863_Invex_ProductItem"
            WHERE prd_key = $1
            ORDER BY prd_itemnumber`, [keyPK]); 
            
            //, prd_Ref_ItemNumber // prd_Ref_ItemNumber to be added to the table -work with Chuck
        //console.log('Results from Product Item:', results);
        structuredRes = results.rows;
        //console.log('Product Item results:', structuredRes);
    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//863 Metal Standards
async function get863MetalStandards(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            mstd_line_no, mstd_met_std_ctl_no, mstd_std_dev_org, mstd_met_std_ident, mstd_met_std_add_id, mstd_type, mstd_key, mstd_flow_flag
	        FROM public."863_Invex_MetalStandards"
            WHERE mstd_key = $1
            ORDER BY mstd_line_no`, [keyPK]);

        structuredRes = results.rows;
        //console.log('Metal Standards results:', structuredRes);
    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//863 Physical Tests
async function get863PhysicalTests(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            phts_type, phts_key, phts_linenumber, phts_x12testdirection, phts_x12physicaltest, phts_entrytype, phts_value, phts_minvalue, phts_maxvalue, phts_alphavalue, phts_x12unitofmeasure, phts_flow_flag
	        FROM public."863_Invex_PhysicalTests"
            WHERE phts_key = $1
            ORDER BY phts_linenumber`, [keyPK]);

        structuredRes = results.rows;
        //console.log('Physical Tests results:', structuredRes);
    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//863 Chemistry
async function get863Chemistry(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            chm_type, chm_key, chm_linenumber, chm_x12chemelement, chm_entrytype, chm_value, chm_minvalue, chm_maxvalue, chm_flow_flag
	        FROM public."863_Invex_Chemistry"
            WHERE chm_key = $1
            ORDER BY chm_linenumber`, [keyPK]);

        structuredRes = results.rows;
        //console.log('Chemistry results:', structuredRes);
    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};


//863 Product Item Instructions  not in INVEX tables********************************************************
async function get863ProductItemInstructions(pool, keyPK , filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            prii_type, prii_key, prii_invexinstructiontype, prii_text, prii_flow_flag
	        FROM public."863_Invex_ProductItemInstructions"
            WHERE prii_Key = $1`, [keyPK]);

        structuredRes = results.rows;
        //console.log('Product Item Instructions results:', structuredRes);
    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//863 Product Item Name Address
async function get863ProductItemNameAddress(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            prna_type, prna_key, prna_addresstype, prna_identificationcodequalifier, prna_identificationcode, prna_nameline1, prna_nameline2, prna_addressline1, prna_addressline2, prna_addressline3, prna_city, prna_postalcode, prna_countrycode, prna_stateprovincecode, prna_telareacode, prna_telnumber, prna_telextension, prna_faxareacode, prna_faxnumber, prna_faxextension, prna_flow_flag
        	FROM public."863_Invex_ProductItemNameAddress"
            WHERE prna_key = $1`, [keyPK]);

        structuredRes = results.rows;
        //console.log('Product Item Name Address results:', structuredRes);
    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//863 Transaction Errors
async function get863TransactionErrors(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            txer_type, txer_key, txer_lineno, txer_messagetext, txer_flow_flag
	        FROM public."863_Invex_TransactionErrors"
            WHERE txer_key = $1`, [keyPK]);

        structuredRes = results.rows;
        //console.log('Transaction Errors results:', structuredRes);
    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//863 Invex HeatTreatment

async function get863HeatTreatment(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            htrt_type, htrt_key, htrt_linenumber, htrt_heattreatmentcode, htrt_heattreatmenttemp, htrt_x12heattreatmenttempmeasure, htrt_heattreatmenttime, htrt_coolantmethod, htrt_coolanttemp, htrt_flow_flag
	        FROM public."863_Invex_HeatTreatment"
            WHERE htrt_key = $1`, [keyPK]);

        structuredRes = results.rows;
        //console.log('HeatTreatment results:', structuredRes);
    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};


//863 Invex Impact

async function get863Impact(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            imp_type, imp_key, imp_linenumber, imp_impacttesttype, imp_x12testdirection, imp_x12unitofmeasure, imp_temperature, imp_x12temperaturemeasure, imp_result1, imp_result2, imp_result3, imp_flow_flag
	        FROM public."863_Invex_Impact"
            WHERE imp_key = $1`, [keyPK]);

        structuredRes = results.rows;
        //console.log('Impact results:', structuredRes);
    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//863 Invex Jominy

async function get863Jominy(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            jmny_type, jmny_key, jmny_linenumber, jmny_testtype, jmny_readingposition, jmny_entrytype, jmny_value, jmny_minvalue, jmny_maxvalue, jmny_flow_flag
	        FROM public."863_Invex_Jominy"
            WHERE jmny_key = $1`, [keyPK]);

        structuredRes = results.rows;
        //console.log('Jominy results:', structuredRes);
    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};


//863 Invex MicroInclusion

async function get863MicroInclusion(pool, keyPK, filePath) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            micl_type, micl_key, micl_linenumber, micl_microinclusionstandard, micl_thinresulta, micl_thickresulta, micl_thinresultb, micl_thickresultb, micl_thinresultc, micl_thickresultc, micl_thinresultd, micl_thickresultd, micl_flow_flag
	        FROM public."863_Invex_MicroInclusion"
            WHERE micl_key = $1`, [keyPK]);

        structuredRes = results.rows;
        //console.log('MicroInclusion results:', structuredRes);
    } catch (error) {
        // const readableErrorMessage = readableErrors(error, keyPK, filePath);
//        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};




module.exports = {
    get863InterchangeControl:  get863InterchangeControl,
    get863Chemistry: get863Chemistry,
    get863MetalStandards: get863MetalStandards,
    get863PhysicalTests: get863PhysicalTests,
    get863HeatTreatment: get863HeatTreatment,
    get863Impact: get863Impact,
    get863Jominy: get863Jominy,
    get863MicroInclusion: get863MicroInclusion,
    get863QDSInstructions: get863QDSInstructions,
    get863HeaderNameAddress: get863HeaderNameAddress,
    get863ItemInstructions: get863ItemInstructions,
    get863ProductItem: get863ProductItem,
    get863ProductItemInstructions: get863ProductItemInstructions,
    get863ProductItemNameAddress: get863ProductItemNameAddress,
    get863ShipmentHeader: get863ShipmentHeader,
    get863ShipmentItem: get863ShipmentItem,
    get863TransactionErrors: get863TransactionErrors,
    get863TransactionSet: get863TransactionSet 
};
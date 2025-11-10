// This module handles the retrieval of parsed EDI 861 records from the PostgreSQL database. 
// It exports functions to retrieve control, transaction, shipment, instruction.. etc data from tables 

const  readableErrors  = require('../../functions/readableErrors.js');

//861 Interchange Control
async function get861InterchangeControl(pool, keyPK, filePath) {
    var structuredRes = {};

    try {
        const results = await pool.query(`SELECT ictl_companyid, ictl_senderinterchangeidqualifier, ictl_senderinterchangeid, ictl_receiverinterchangeidqualifier, ictl_receiverinterchangeid, "ictl_createdDatetime", ictl_alternateinterchangenumber, ictl_status, ictl_flow_flag, ictl_type, ictl_key, ictl_edixcontrolnumber, ictl_sndr_brch_ich_idqual, ictl_sndr_brch_ich_id, ictl_invexbranchcode
	        FROM public."861_Invex_InterchangeControl"  
            WHERE ictl_Key = $1`, [keyPK]);

        structuredRes = results.rows[0];
        
    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');

    }
     
    return structuredRes;
};


//861 TransactionSet
async function get861TransactionSet(pool, keyPK, filePath) {
    var structuredRes = {};

    try {
        const results = await pool.query(`SELECT 
            txs_transactionsetcontrolnumber, txs_edistandardsorganizationtransactionset, txs_edistandardsorganization, txs_status, txs_flow_flag, txs_type, txs_key
	        FROM public."861_Invex_TransactionSet"
            WHERE  txs_Key = $1`, [keyPK]);

        structuredRes = results.rows;

    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//861 Header Instructions
async function get861HeaderInstructions(pool, keyPK, filePath) {
    var structuredRes = {};

    try {
        const results = await pool.query(`SELECT hdin_invexinstructiontype, hdin_text, hdin_flow_flag, hdin_type, hdin_key
	        FROM public."861_Invex_HeaderInstructions"
            WHERE hdin_Key = $1`, [keyPK]);

        structuredRes = results.rows;

    } catch (error) {
       const readableErrorMessage = readableErrors(error, keyPK, filePath);
       console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//861 Header Name Address
async function get861HeaderNameAddress(pool, keyPK, filePath) {
    var structuredRes = {};

    try {
        const results = await pool.query(`SELECT hdna_addresstype, hdna_identificationcodequalifier, hdna_identificationcode, hdna_nameline1, hdna_nameline2, hdna_addressline1, hdna_addressline2, hdna_addressline3, hdna_city, hdna_postalcode, hdna_countrycode, hdna_stateprovincecode, hdna_telareacode, hdna_telnumber, hdna_telextension, hdna_faxareacode, hdna_faxnumber, hdna_faxextension, hdna_flow_flag, hdna_type, hdna_key
	        FROM public."861_Invex_HeaderNameAddress"
            WHERE hdna_Key = $1`, [parseInt(keyPK)]);
            
        structuredRes = results.rows;

    } catch (error) {
       const readableErrorMessage = readableErrors(error, keyPK, filePath);
       console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//861 Item Instructions
async function get861ItemInstructions(pool, keyPK, filePath) {
    var structuredRes = {};
  
    try {
        const results = await pool.query(`SELECT itin_invexinstructiontype, itin_text, itin_flow_flag, itin_type, itin_key
	        FROM public."861_Invex_ItemInstructions"
            WHERE itin_Key = $1`, [keyPK]);

        structuredRes = results.rows;

    } catch (error) {
       const readableErrorMessage = readableErrors(error, keyPK, filePath);
       console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//861 Product Item
async function get861ProductItem(pool, keyPK, filePath) {
    var structuredRes = {};
 
    try {
        const results = await pool.query(`SELECT prd_itemnumber, prd_taglotid, prd_externaltagid, prd_customertagno, prd_outsideprocessortagid, prd_vendortagid, prd_millorderno, prd_vendorreference, prd_x12packagingcode, prd_materialclassification, prd_materialclassificationdatetime, prd_materialstatus, prd_materialstatusdatetime, prd_reapplicationaction, prd_opscurrentprocess, prd_mill, prd_heat, prd_density, prd_coilform, prd_dimensiondesignator, prd_width, prd_x12widthum, prd_edgedesignation, prd_length, prd_x12lengthum, prd_gaugesize, prd_x12gaugeum, prd_innerdiameter, prd_x12innerdiameterum, prd_outerdiameter, prd_x12outerdiameterum, prd_opsouterdiameterum, prd_randomdimension1, prd_randomdimension2, prd_randomdimension3, prd_randomdimension4, prd_randomdimension5, prd_randomdimension6, prd_randomdimension7, prd_randomdimension8, prd_randomarea, prd_weightperpiece, prd_pieces, prd_piecestype, prd_measure, prd_x12measureum, prd_measuretype, prd_measurequalifier, prd_theoreticalweight, prd_x12theoreticalweightum, prd_theoreticalnetgrossweight, prd_actualweight, prd_x12actualweightum, prd_actualnetgrossweightqualifier, prd_coillength, prd_x12coillengthum, prd_coillengthtype, prd_cutnumber, prd_coilinnerdiameter, prd_coilouterdiameter, prd_stxcoilouterdiameter, prd_facewidth, prd_actualwidth1, prd_actualwidth2, prd_actuallength1, prd_actuallength2, prd_actualid1, prd_actualid2, prd_actualod1, prd_actualod2, prd_actualgauge1, prd_actualgauge2, prd_actualdiagonal1, prd_actualdiagonal2, prd_actualflatness1, prd_actualflatness2, prd_externalordernumber, prd_externalorderitem, prd_externalorderrelease, prd_externalorderdate, prd_externalcontractnumber, prd_enduserpo, prd_enduserreference, prd_partcustomerid, prd_partnumber, prd_partrevisionnumber, prd_partdescription, prd_meltedzone, prd_meltedzonecountry, prd_originzone, prd_originzonecountry, prd_processeddate, prd_flow_flag, prd_type, prd_key, prd_label_id, prd_form, prd_grade, prd_size, prd_finish, prd_ext_fin_desc, prd_size_desc, prd_wgt_typ, prd_net_gross_wgt, prd_itemindex
	        FROM public."861_Invex_ProductItem"
            WHERE prd_Key = $1
            ORDER BY prd_ItemNumber`, [keyPK]);

        structuredRes = results.rows;

    } catch (error) {
        const readableErrorMessage = readableErrors(error, keyPK, filePath);
        console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};


//861 Product Item Instructions
async function get861ProductItemInstructions(pool, keyPK, filePath) {
    var structuredRes = {};
 
    try {
        const results = await pool.query(`SELECT "prii_INVEXInstructionType", "prii_Text", prii_flow_flag, prii_type, prii_key
	        FROM public."861_Invex_ProductItemInstructions"            
            WHERE prii_Key = $1
            ORDER BY prii_key`, [keyPK]);

        structuredRes = results.rows;

    } catch (error) {        
       const readableErrorMessage = readableErrors(error, keyPK, filePath);
       console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');

    }

    return structuredRes;
};

//861 Product Item Name Address
async function get861ProductItemNameAddress(pool, keyPK, filePath) {
    var structuredRes = {};

    try {
        const results = await pool.query(`SELECT prna_addresstype, prna_identificationcodequalifier, prna_identificationcode, prna_nameline1, prna_nameline2, prna_addressline1, prna_addressline2, prna_addressline3, prna_city, prna_postalcode, prna_countrycode, prna_stateprovincecode, prna_telareacode, prna_telnumber, prna_telextension, prna_faxareacode, prna_faxnumber, prna_faxextension, prna_flow_flag, prna_type, prna_key
	        FROM public."861_Invex_ProductItemNameAddress"
            WHERE prna_Key = $1
            ORDER BY prna_key`, [keyPK]);

        structuredRes = results.rows;

    } catch (error) {
       const readableErrorMessage = readableErrors(error, keyPK, filePath);
       console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//861 Receipt Header
async function get861ReceiptHeader(pool, keyPK, filePath) {
    var structuredRes = {};

    try {
        const results = await pool.query(`SELECT rct_transactionreference, rct_vendorshipmentreference, "rct_CarrierReferenceNumber", "rct_ReceiptDate", "rct_X12TransportationMethod", "rct_OPSTransportationMode", "rct_CarrierQualifierCode", "rct_CarrierIdentificationCode", "rct_CarrierName", "rct_X12ShipmentMethodOfPayment", "rct_OPSTransportationLiability", "rct_TotalReceivedWeight", "rct_X12ReceivedWeightUM", "rct_OPSReceivedWeightUM", "rct_PackingListWeight", "rct_X12PackingListWeightUM", "rct_OPSPackingListWeightUM", rct_flow_flag, rct_type, rct_key, rct_reference, rct_reference_date, "rct_X12DeliveryMethod", rct_carrier_qual_cd, rct_veh_lic_plt, rct_apptno, "rct_X12_terms_trade"
	        FROM public."861_Invex_ReceiptHeader"
            WHERE rct_Key = $1`, [keyPK]);

        structuredRes = results.rows;

    } catch (error) {
       const readableErrorMessage = readableErrors(error, keyPK, filePath);
       console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//861 Receipt Item
async function get861ReceiptItem(pool, keyPK, filePath) {
    var structuredRes = {};
 
    try {
        const results = await pool.query(`SELECT rtm_stratixordernoqualifier, rtm_stratixorderno, rtm_serviceordernumber, rtm_shipmentitemreference, rtm_customerpartnumber, rtm_partrevisionnumber, rtm_numberofpackages, rtm_receivedpieces, rtm_x12receivedpiecesum, rtm_opsreceivedpiecesum, rtm_receivedmeasure, rtm_x12receivedmeasureum, rtm_opsreceivedmeasureum, rtm_receivedmeasurequalifier, rtm_receivedweight, rtm_x12receivedweightum, rtm_opsreceivedweightum, rtm_packinglistpieces, rtm_x12packinglistpiecesum, rtm_opspackinglistpiecesum, rtm_packinglistmeasure, rtm_x12packinglistmeasureum, rtm_opspackinglistmeasureum, rtm_packinglistmeasurequalifier, rtm_packinglistweight, rtm_x12packinglistweightum, rtm_opspackinglistweightum, rtm_flow_flag, rtm_type, rtm_key, rtm_ref_lin_no, rtm_ven_ship_ref, rtm_vendor_part_no, rtm_prd_desc_line1, rtm_prd_desc_line2, rtm_prd_desc_line3, rtm_ext_fin_desc, rtm_itemnumber, rtm_itemindex
	        FROM public."861_Invex_ReceiptItem"
            WHERE rtm_Key = $1`, [keyPK]);

        structuredRes = results.rows;

    } catch (error) {
       const readableErrorMessage = readableErrors(error, keyPK, filePath);
       console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

//861 Transaction Errors
async function get861TransactionErrors(pool, keyPK, filePath) {
    var structuredRes = {};
  
    try {
        const results = await pool.query(`SELECT txer_lineno, txer_msgtxt, txer_flow_flag, txer_type, txer_key
	        FROM public."861_Invex_TransactionErrors"
            WHERE txer_Key = $1`, [keyPK]);

        structuredRes = results.rows;

    } catch (error) {
       const readableErrorMessage = readableErrors(error, keyPK, filePath);
       console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');

    }

    return structuredRes;
};

//861 Damages
async function get861Damages(pool, keyPK, filePath) {
    var structuredRes = {};

    try {
        const results = await pool.query(`SELECT "dmg_LineNumber", "dmg_DamageCode", "dmg_FaultCode", dmg_flow_flag, dmg_type, dmg_key
	        FROM public."861_Invex_Damages"
            WHERE dmg_Key = $1`, [keyPK]);

        structuredRes = results.rows;

    } catch (error) {
       const readableErrorMessage = readableErrors(error, keyPK, filePath);
       console.error('-', keyPK, '-\n', readableErrorMessage, '\n-', keyPK, '-');
    }

    return structuredRes;
};

module.exports = {
    get861InterchangeControl: get861InterchangeControl, 
    get861Damages: get861Damages,
    get861ReceiptHeader: get861ReceiptHeader,
    get861ReceiptItem: get861ReceiptItem,
    get861HeaderInstructions: get861HeaderInstructions,
    get861HeaderNameAddress: get861HeaderNameAddress,
    get861ItemInstructions: get861ItemInstructions,
    get861ProductItem: get861ProductItem,
    get861ProductItemInstructions: get861ProductItemInstructions,
    get861ProductItemNameAddress: get861ProductItemNameAddress,
    get861TransactionErrors: get861TransactionErrors,
    get861TransactionSet: get861TransactionSet
};
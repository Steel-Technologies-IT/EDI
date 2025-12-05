// This module handles the retrieval of parsed EDI 861 records from the PostgreSQL database. 
// It exports functions to retrieve control, transaction, shipment, instruction.. etc data from tables 

const  readableErrors  = require('../../functions/readableErrors.js');

//861 Interchange Control
async function get861InterchangeControl(pool, keyPK, filePath) {
    var structuredRes = {};

    try {
        const results = await pool.query(`SELECT ictl_companyid, ictl_senderinterchangeidqualifier, ictl_senderinterchangeid, ictl_receiverinterchangeidqualifier, ictl_receiverinterchangeid, "ictl_createdDatetime", ictl_alternateinterchangenumber, ictl_status, ictl_flow_flag, ictl_type, ictl_key, ictl_edixcontrolnumber, ictl_sndr_brch_ich_idqual, ictl_sndr_brch_ich_id, "ictl_INVEXBranchCode"
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
        const results = await pool.query(`SELECT ins_invexinstructiontype, ins_text, ins_flow_flag, ins_type, ins_key
	        FROM public."861_Invex_HeaderInstructions"
            WHERE ins_Key = $1`, [keyPK]);

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
        const results = await pool.query(`SELECT adr_addresstype, adr_identificationcodequalifier, adr_identificationcode, adr_nameline1, adr_nameline2, adr_addressline1, adr_addressline2, adr_addressline3, adr_city, adr_postalcode, adr_countrycode, adr_stateprovincecode, adr_telareacode, adr_telnumber, adr_telextension, adr_faxareacode, adr_faxnumber, adr_faxextension, adr_flow_flag, adr_type, adr_key
	        FROM public."861_Invex_HeaderNameAddress"
            WHERE adr_Key = $1`, [parseInt(keyPK)]);
            
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
        const results = await pool.query(`SELECT iins_invexinstructiontype, iins_text, iins_flow_flag, iins_type, iins_key
	        FROM public."861_Invex_ItemInstructions"
            WHERE iins_Key = $1`, [keyPK]);

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
        const results = await pool.query(`SELECT pitm_itemnumber, pitm_taglotid, pitm_externaltagid, pitm_customertagno, pitm_outsideprocessortagid, pitm_vendortagid, pitm_millorderno, pitm_vendorreference, pitm_x12packagingcode, pitm_materialclassification, pitm_materialclassificationdatetime, pitm_materialstatus, pitm_materialstatusdatetime, pitm_reapplicationaction, pitm_opscurrentprocess, pitm_mill, pitm_heat, pitm_density, pitm_coilform, pitm_dimensiondesignator, pitm_width, pitm_x12widthum, pitm_edgedesignation, pitm_length, pitm_x12lengthum, pitm_gaugesize, pitm_x12gaugeum, pitm_innerdiameter, pitm_x12innerdiameterum, pitm_outerdiameter, pitm_x12outerdiameterum, pitm_opsouterdiameterum, pitm_randomdimension1, pitm_randomdimension2, pitm_randomdimension3, pitm_randomdimension4, pitm_randomdimension5, pitm_randomdimension6, pitm_randomdimension7, pitm_randomdimension8, pitm_randomarea, pitm_weightperpiece, pitm_pieces, pitm_piecestype, pitm_measure, pitm_x12measureum, pitm_measuretype, pitm_measurequalifier, pitm_theoreticalweight, pitm_x12theoreticalweightum, pitm_theoreticalnetgrossweight, pitm_actualweight, pitm_x12actualweightum, pitm_actualnetgrossweightqualifier, pitm_coillength, pitm_x12coillengthum, pitm_coillengthtype, pitm_cutnumber, pitm_coilinnerdiameter, pitm_coilouterdiameter, pitm_stxcoilouterdiameter, pitm_facewidth, pitm_actualwidth1, pitm_actualwidth2, pitm_actuallength1, pitm_actuallength2, pitm_actualid1, pitm_actualid2, pitm_actualod1, pitm_actualod2, pitm_actualgauge1, pitm_actualgauge2, pitm_actualdiagonal1, pitm_actualdiagonal2, pitm_actualflatness1, pitm_actualflatness2, pitm_externalordernumber, pitm_externalorderitem, pitm_externalorderrelease, pitm_externalorderdate, pitm_externalcontractnumber, pitm_enduserpo, pitm_enduserreference, pitm_partcustomerid, pitm_partnumber, pitm_partrevisionnumber, pitm_partdescription, pitm_meltedzone, pitm_meltedzonecountry, pitm_originzone, pitm_originzonecountry, pitm_processeddate, pitm_flow_flag, pitm_type, pitm_key, pitm_label_id, pitm_form, pitm_grade, pitm_size, pitm_finish, pitm_ext_fin_desc, pitm_size_desc, pitm_wgt_typ, pitm_net_gross_wgt, pitm_itemindex
	        FROM public."861_Invex_ProductItem"
            WHERE pitm_Key = $1
            ORDER BY pitm_ItemNumber`, [keyPK]);

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
        const results = await pool.query(`SELECT "pins_INVEXInstructionType", "pins_Text", pins_flow_flag, pins_type, pins_key
	        FROM public."861_Invex_ProductItemInstructions"            
            WHERE pins_Key = $1
            ORDER BY pins_key`, [keyPK]);

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
        const results = await pool.query(`SELECT pita_addresstype, pita_identificationcodequalifier, pita_identificationcode, pita_nameline1, pita_nameline2, pita_addressline1, pita_addressline2, pita_addressline3, pita_city, pita_postalcode, pita_countrycode, pita_stateprovincecode, pita_telareacode, pita_telnumber, pita_telextension, pita_faxareacode, pita_faxnumber, pita_faxextension, pita_flow_flag, pita_type, pita_key
	        FROM public."861_Invex_ProductItemNameAddress"
            WHERE pita_Key = $1
            ORDER BY pita_key`, [keyPK]);

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
        const results = await pool.query(`SELECT err_lineno, err_msgtxt, err_flow_flag, err_type, err_key
	        FROM public."861_Invex_TransactionErrors"
            WHERE err_Key = $1`, [keyPK]);

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
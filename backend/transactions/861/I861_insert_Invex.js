async function insert861InvexInbound(pool, header, details, names) {
 
const retrieveInboundASN = require('../../functions/retrieveInboundASN.js').retrieveInboundASN;
let orginalHeader;
let orginalDetail;
let orginalNames;
let uniqueKeys = []; // Array to store unique keys

try {
  if (details && Array.isArray(details) && details.length > 0) {
    for (const detail of details) {
      let key = await retrieveInboundASN(detail.dtl_mcoil, detail.dtl_heat, names[0] && names[0].name_id ? names[0].name_id : null);
      
      if (!key.rows || key.rows.length === 0) {
      key = await retrieveInboundASN(detail.dtl_mcoil, detail.dtl_heat, null);
      }
      console.log('KEY', key.rows)
      // Check if we got a valid key and it's not already in our array
      if (key.rows && key.rows.length > 0 && key.rows[0].dtl_key) {
        const dtlKey = key.rows[0].dtl_key;
        
        // Only add if not already in the uniqueKeys array
        if (!uniqueKeys.includes(dtlKey)) {
          uniqueKeys.push(dtlKey);
        }
      }
    }
  }

  console.log('Unique Keys:', uniqueKeys);

  // Now retrieve original data for all unique keys
  if (uniqueKeys.length > 0) {
    // For multiple keys, use IN clause with parameterized query
    const placeholders = uniqueKeys.map((_, i) => `$${i + 1}`).join(',');
    
    orginalHeader = await pool.query(
      `SELECT * FROM "856_SNF_Header" WHERE hdr_key = ANY($1)`, 
      [uniqueKeys]
    );
    
    orginalDetail = await pool.query(
      `SELECT * FROM "856_SNF_Detail" WHERE dtl_key = ANY($1) ORDER BY dtl_key, dtl_hl1, dtl_hl2`, 
      [uniqueKeys]
    );
    
    orginalNames = await pool.query(
      `SELECT * FROM "856_SNF_Names" WHERE name_key = ANY($1)`, 
      [uniqueKeys]
    );
    

  } else {
    console.log("No previous ASN keys found");
  }

} catch (error) {
  console.log(error)
  console.log("Error retrieving previous ASN:");
}

    // Insert the transformed data into the respective output tables
    // Map SNF tables to Invex JSON Structure 
    const flow = "I"
    try {

        // MARK: Interchange Control Table
        //Invex Interchange Control Table
        await pool.query(`INSERT INTO public."861_Invex_InterchangeControl"(
	ictl_type, ictl_key, ictl_companyid, ictl_senderinterchangeidqualifier, ictl_senderinterchangeid, ictl_receiverinterchangeidqualifier, ictl_receiverinterchangeid, "ictl_createdDatetime", ictl_alternateinterchangenumber, ictl_status, ictl_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`, 
        [
                header.hdr_type, 
                header.hdr_key,
                "STX",
                header.hdr_isa_qual,
                header.hdr_isnd_id,
                header.hdr_ircv_qual,
                header.hdr_ircv_id,
                header.hdr_crt_dat + String(header.hdr_crt_tim).padStart(6, '0'),
                header.hdr_ictl_no,
                null,
                flow
        ]);



        // MARK: Transaction Set Table
        // Invex Transaction Set Table
        await pool.query(`INSERT INTO public."861_Invex_TransactionSet"(
	txs_type, txs_key, txs_transactionsetcontrolnumber, txs_edistandardsorganizationtransactionset, txs_edistandardsorganization, txs_status, txs_flow_flag)    
	VALUES ($1, $2, $3, $4, $5, $6, $7);`, [
                header.hdr_type,
                header.hdr_key,
                header.hdr_stctl_no,
                '861',
                'X',
                null,
                flow
        ]);

        //MARK: Header Name Address Table
        //Invex Header Name Address Table
        await Promise.all(
            names
                .filter(names => names.name_qual !== 'DE' && names.name_qual !== '')
                .map(async (names, index) => {
                    await pool.query(`INSERT INTO public."861_Invex_HeaderNameAddress"(
        hdna_type, hdna_key, hdna_addresstype, hdna_identificationcodequalifier, hdna_identificationcode, hdna_nameline1, hdna_nameline2, hdna_addressline1, hdna_addressline2, hdna_addressline3, hdna_city, hdna_postalcode, hdna_countrycode, hdna_stateprovincecode, hdna_telareacode, hdna_telnumber, hdna_telextension, hdna_faxareacode, hdna_faxnumber, hdna_faxextension, hdna_flow_flag)         
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);`, [
                        header.hdr_type,
                        header.hdr_key,
                        names.name_qual,
                        names.name_qual_id,
                        names.name_id,
                        names.name_name,
                        null, 
                        names.name_addr1,
                        names.name_addr2,
                        null,
                        names.name_city,
                        names.name_zpcd,
                        names.name_ctry_cd,
                        names.name_state,
                        null,
                        names.name_cont_phn, 
                        null,
                        null, 
                        null, 
                        null, 
                        flow
                    ]);
                })
        )

        //MARK: Header copied into product item since there is no address at item loop Name Address Table
        //Invex  Header copied into product item since there is no address at item loop Name Address Table
        await Promise.all(
            names
                .filter(names => names.name_qual !== 'DE' && names.name_qual !== '')
                .map(async (names, index) => {
                    await pool.query(`INSERT INTO public."861_Invex_ProductItemNameAddress"(
        prna_type, prna_key, prna_addresstype, prna_identificationcodequalifier, prna_identificationcode, prna_nameline1, prna_nameline2, prna_addressline1, prna_addressline2, prna_addressline3, prna_city, prna_postalcode, prna_countrycode, prna_stateprovincecode, prna_telareacode, prna_telnumber, prna_telextension, prna_faxareacode, prna_faxnumber, prna_faxextension, prna_flow_flag)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);`, [
                        header.hdr_type,
                        header.hdr_key,
                        names.name_qual,
                        names.name_qual_id,
                        names.name_id,
                        names.name_name,
                        null, 
                        names.name_addr1,
                        names.name_addr2,
                        null,
                        names.name_city,
                        names.name_zpcd,
                        names.name_ctry_cd,
                        names.name_state,
                        null,
                        names.name_cont_phn, 
                        null,
                        null, 
                        null, 
                        null, 
                        flow
                    ]);
                })
        )

    const toNum = (v) => {
      if (v === undefined || v === null || v === '') return 0;
      const n = Number(String(v).replace(/[^0-9.-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };
    const totalweight = Array.isArray(details)
      ? details.reduce((sum, dtl) => sum + toNum(dtl?.dtl_awgtlb), 0)
      : toNum(details?.dtl_awgtlb);
      //console.log('Total Weight:', totalweight);
        // MARK: Receipt Header Table
        // Invex Receipt Header Table
        await pool.query(`INSERT INTO public."861_Invex_ReceiptHeader"(
	rct_type, rct_key, rct_transactionreference, rct_vendorshipmentreference, "rct_CarrierReferenceNumber", "rct_ReceiptDate", "rct_X12TransportationMethod", "rct_OPSTransportationMode", "rct_CarrierQualifierCode", "rct_CarrierIdentificationCode", "rct_CarrierName", "rct_X12ShipmentMethodOfPayment", "rct_OPSTransportationLiability", "rct_TotalReceivedWeight", "rct_X12ReceivedWeightUM", "rct_OPSReceivedWeightUM", "rct_PackingListWeight", "rct_X12PackingListWeightUM", "rct_OPSPackingListWeightUM", rct_flow_flag)	 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`, [
                header.hdr_type,
                header.hdr_key,
                header.hdr_shp_no,
                header.hdr_bol_no,
                null,
                header.hdr_rcv_dte,
                orginalHeader ? orginalHeader.rows[0].hdr_tspt_mthd : null,
                null,
                null, 
                header.hdr_scac,
                null,
                orginalHeader ? orginalHeader.rows[0].hdr_shp_mthd_pmnt : null,
                null,
                totalweight,
                null,
                null,
                null,
                null,
                null,
                flow
        ]);

        //MARK: Receipt Item Table
    //Invex Receipt Item Table
    await Promise.all(details.map(async (details, index) => {
    
            await pool.query(`INSERT INTO public."861_Invex_ItemInstructions"( 
itin_type, itin_key, itin_invexinstructiontype, itin_text, itin_flow_flag)
VALUES ($1, $2, $3, $4, $5);`, [
                header.hdr_type,
                header.hdr_key,
                "07",
                details.dtl_prev,
                flow,
            ]);   
    




            await pool.query(`INSERT INTO public."861_Invex_ReceiptItem"(
    rtm_type, rtm_key, rtm_itemnumber, rtm_stratixordernoqualifier, rtm_stratixorderno, rtm_serviceordernumber, rtm_shipmentitemreference, rtm_customerpartnumber, rtm_partrevisionnumber, rtm_numberofpackages, rtm_receivedpieces, rtm_x12receivedpiecesum, rtm_opsreceivedpiecesum, rtm_receivedmeasure, rtm_x12receivedmeasureum, rtm_opsreceivedmeasureum, rtm_receivedmeasurequalifier, rtm_receivedweight, rtm_x12receivedweightum, rtm_opsreceivedweightum, rtm_packinglistpieces, rtm_x12packinglistpiecesum, rtm_opspackinglistpiecesum, rtm_packinglistmeasure, rtm_x12packinglistmeasureum, rtm_opspackinglistmeasureum, rtm_packinglistmeasurequalifier, rtm_packinglistweight, rtm_x12packinglistweightum, rtm_opspackinglistweightum, rtm_flow_flag)        
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31);`, [
                header.hdr_type,
                header.hdr_key,
                details.dtl_line,
                ' ',
                details.dtl_po,
                null,//details.dtl_mo ? details.dtl_mo : null,
                details.dtl_bol.substring(0,22),
                details.dtl_cpart,
                null,
                null,
                details.dtl_rcv_qty,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                flow
            ]);
        
    }));
        //MARK: Header Instructions Table
        //Invex Header Instructions Table
    await pool.query(`INSERT INTO public."861_Invex_HeaderInstructions"(
    hdin_type, hdin_key, hdin_invexinstructiontype, hdin_text, hdin_flow_flag)
	VALUES ($1, $2, $3, $4, $5);`, [
                header.hdr_type,
                header.hdr_key,                
                header.hdr_stx_no ?? null, //Unknown need to be defined
                header.hdr_version ?? null, //Unknown need to be defined
                flow
        ]);

        //MARK: Product Item Table
        //Invex Product Item Table
        await Promise.all(details.map(async (details, index) => {
if (details.dtl_prev) {
        await pool.query(`INSERT INTO public."861_Invex_ProductItemInstructions"(
    prii_type, prii_key, "prii_INVEXInstructionType", "prii_Text", prii_flow_flag)
	VALUES ($1, $2, $3, $4, $5);`, [
                    header.hdr_type,
                    header.hdr_key,
                    60,
                    details.dtl_prev,
                    flow,
            ]);   
            
            await pool.query(`INSERT INTO public."861_Invex_ProductItemInstructions"(
	prii_type, prii_key, "prii_INVEXInstructionType", "prii_Text", prii_flow_flag)
	VALUES ($1, $2, $3, $4, $5);`, [
                    header.hdr_type,
                    header.hdr_key,
                    35,
                    details.dtl_prev,
                    flow,
            ]); 
        }
//	prd_type, prd_key, prd_itemnumber, prd_taglotid, prd_externaltagid, prd_customertagno, prd_outsideprocessortagid, prd_vendortagid, prd_millorderno, prd_vendorreference, prd_x12packagingcode, prd_materialclassification, prd_materialclassificationdatetime, prd_materialstatus, prd_materialstatusdatetime, prd_processeddate, prd_reapplicationaction, prd_opscurrentprocess, prd_mill, prd_heat, prd_density, prd_coilform, prd_dimensiondesignator, prd_width, prd_x12widthum, prd_edgedesignation, prd_length, prd_x12lengthum, prd_gaugesize, prd_x12gaugeum, prd_innerdiameter, prd_x12innerdiameterum, prd_outerdiameter, prd_x12outerdiameterum, prd_opsouterdiameterum, prd_randomdimension1, prd_randomdimension2, prd_randomdimension3, prd_randomdimension4, prd_randomdimension5, prd_randomdimension6, prd_randomdimension7, prd_randomdimension8, prd_randomarea, prd_weightperpiece, prd_pieces, prd_piecestype, prd_measure, prd_x12measureum, prd_measuretype, prd_measurequalifier, prd_theoreticalweight, prd_x12theoreticalweightum, prd_theoreticalnetgrossweight, prd_actualweight, prd_x12actualweightum, prd_actualnetgrossweightqualifier, prd_coillength, prd_x12coillengthum, prd_coillengthtype, prd_cutnumber, prd_coilinnerdiameter, prd_coilouterdiameter, prd_stxcoilouterdiameter, prd_facewidth, prd_actualwidth1, prd_actualwidth2, prd_actuallength1, prd_actuallength2, prd_actualid1, prd_actualid2, prd_actualod1, prd_actualod2, prd_actualgauge1, prd_actualgauge2, prd_actualdiagonal1, prd_actualdiagonal2, prd_actualflatness1, prd_actualflatness2, prd_externalordernumber, prd_externalorderitem, prd_externalorderrelease, prd_externalorderdate, prd_externalcontractnumber, prd_enduserpo, prd_enduserreference, prd_partcustomerid, prd_partnumber, prd_partrevisionnumber, prd_partdescription, prd_meltedzone, prd_meltedzonecountry, prd_originzone, prd_originzonecountry, prd_flow_flag, prd_label_id, prd_form, prd_grade, prd_size, prd_finish, prd_ext_fin_desc, prd_size_desc, prd_wgt_typ, prd_net_gross_wgt
        await pool.query(`INSERT INTO public."861_Invex_ProductItem"(
	prd_type, prd_key, prd_itemnumber, prd_taglotid, prd_externaltagid, prd_customertagno, prd_outsideprocessortagid, prd_vendortagid, prd_millorderno, prd_vendorreference, prd_x12packagingcode, prd_materialclassification, prd_materialclassificationdatetime, prd_materialstatus, prd_materialstatusdatetime, prd_processeddate, prd_reapplicationaction, prd_opscurrentprocess, prd_mill, prd_heat, prd_density, prd_coilform, prd_dimensiondesignator, prd_width, prd_x12widthum, prd_edgedesignation, prd_length, prd_x12lengthum, prd_gaugesize, prd_x12gaugeum, prd_innerdiameter, prd_x12innerdiameterum, prd_outerdiameter, prd_x12outerdiameterum, prd_opsouterdiameterum, prd_randomdimension1, prd_randomdimension2, prd_randomdimension3, prd_randomdimension4, prd_randomdimension5, prd_randomdimension6, prd_randomdimension7, prd_randomdimension8, prd_randomarea, prd_weightperpiece, prd_pieces, prd_piecestype, prd_measure, prd_x12measureum, prd_measuretype, prd_measurequalifier, prd_theoreticalweight, prd_x12theoreticalweightum, prd_theoreticalnetgrossweight, prd_actualweight, prd_x12actualweightum, prd_actualnetgrossweightqualifier, prd_coillength, prd_x12coillengthum, prd_coillengthtype, prd_cutnumber, prd_coilinnerdiameter, prd_coilouterdiameter, prd_stxcoilouterdiameter, prd_facewidth, prd_actualwidth1, prd_actualwidth2, prd_actuallength1, prd_actuallength2, prd_actualid1, prd_actualid2, prd_actualod1, prd_actualod2, prd_actualgauge1, prd_actualgauge2, prd_actualdiagonal1, prd_actualdiagonal2, prd_actualflatness1, prd_actualflatness2, prd_externalordernumber, prd_externalorderitem, prd_externalorderrelease, prd_externalorderdate, prd_externalcontractnumber, prd_enduserpo, prd_enduserreference, prd_partcustomerid, prd_partnumber, prd_partrevisionnumber, prd_partdescription, prd_meltedzone, prd_meltedzonecountry, prd_originzone, prd_originzonecountry, prd_flow_flag)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95);`, [
                header.hdr_type,
                header.hdr_key,
                details.dtl_line,
                null,
                details.dtl_prev,
                null,
                null,
                details.dtl_mcoil?.split("-")[0] || "",
                details.dtl_mo,
                null,
                null,
                details.dtl_mcls67,
                null,
                details.dtl_msts70?  details.dtl_msts70 : null, 
                null,
                header.hdr_prc_dte,
                null,
                null,
                null,
                details.dtl_heat, //20
                null,
                null,
                null,
                details.dtl_widin? details.dtl_widin : details.dtl_widmm ? details.dtl_widmm : null,
                details.dtl_widin? 'IN' : details.dtl_widmm ? 'MM' : null,
                null,
                details.dtl_ulenin ? details.dtl_ulenin : details.dtl_ulenmm ? details.dtl_ulenmm : null,
                details.dtl_ulenin ? 'IN' : details.dtl_ulenmm ? 'MM' : null,
                details.dtl_gaugin ? Number(details.dtl_gaugin) : details.dtl_gaugmm ? Number(details.dtl_gaugmm) : null,
                details.dtl_gaugin ? 'IN' : details.dtl_gaugmm ? 'MM' : null,
                details.dtl_idin ? details.dtl_idin : details.dtl_idmm ? details.dtl_idmm : null, 
                details.dtl_idin ? 'IN' : details.dtl_idmm ? 'MM' : null,
                details.dtl_odin ? details.dtl_odin : details.dtl_odmm ? details.dtl_odmm : null,
                details.dtl_odin ? 'IN' : details.dtl_odmm ? 'MM' : null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null, 
                details.dtl_rcv_qty ? details.dtl_rcv_qty : null, 
                "A", // 47
                null,  // 48
                null, 
                null,
                null,
                details.dtl_twgtlb ? details.dtl_twgtlb : details.dtl_twgtkg ? details.dtl_twgtkg : null,
                details.dtl_twgtlb ? 'LB' : details.dtl_twgtkg ? 'KG' : null,
                null,
                details.dtl_awgtlb ? details.dtl_awgtlb : details.dtl_awgtkg ? details.dtl_awgtkg : null,
                details.dtl_awgtlb ? 'LB' : details.dtl_awgtkg ? 'KG' : null,
                null,
                details.dtl_lnft ? details.dtl_lnft : details.dtl_lnmt ? details.dtl_lnmt : null,
                details.dtl_lnft ? 'FT' : details.dtl_lnmt ? 'MR' : null,
                "T",
                null,
                details.dtl_idin ? details.dtl_idin : details.dtl_idmm ? details.dtl_idmm : null, 
                details.dtl_odin ? details.dtl_odin : details.dtl_odmm ? details.dtl_odmm : null, 
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null, 
                flow
        ]);}))

        //MARK: Damages Table
        //Invex Damages Table
    await pool.query(`INSERT INTO public."861_Invex_Damages"(
	dmg_type, dmg_key, "dmg_LineNumber", "dmg_DamageCode", "dmg_FaultCode", dmg_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6);`, [
                header.hdr_type,
                header.hdr_key,
                details.dtl_line,                
                details.dtl_scr_73 ?? null, //Unknown need to be defined
                details.dtl_falt72 ?? null, //Unknown need to be defined
                flow
        ]);

        //Invex Transaction Errors Table (***FUTURE/NOT NEEDED IMPLEMENTATION***)
        // await pool.query(`INSERT INTO public."861_Invex_TransactionErrors"(
	// txer_lineno, txer_msgtxt, txer_flow_flag, txer_type, txer_key, txer_flow_flag)
	// VALUES ($1, $2, $3, $4, $5, $6);`, [transformedData.transactionErrors]);

    } catch (error) {
        console.error('-', header.hdr_key, '-\n',"Error in insert861InvexInbound:", error,'\n-', header.hdr_key, '-');
    }
}
module.exports = {
    insert861InvexInbound
};

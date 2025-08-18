async function insert861InvexInbound(pool, header, details, names) {
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
                header.hdr_date_sent + header.hdr_time_sent,
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
        adr_type, adr_key, adr_addresstype, adr_identificationcodequalifier, adr_identificationcode, adr_nameline1, adr_nameline2, adr_addressline1, adr_addressline2, adr_addressline3, adr_city, adr_postalcode, adr_countrycode, adr_stateprovincecode, adr_telareacode, adr_telnumber, adr_telextension, adr_faxareacode, adr_faxnumber, adr_faxextension, adr_flow_flag)         
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
        pita_type, pita_key, pita_addresstype, pita_identificationcodequalifier, pita_identificationcode, pita_nameline1, pita_nameline2, pita_addressline1, pita_addressline2, pita_addressline3, pita_city, pita_postalcode, pita_countrycode, pita_stateprovincecode, pita_telareacode, pita_telnumber, pita_telextension, pita_faxareacode, pita_faxnumber, pita_faxextension, pita_flow_flag)
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
                null,
                null,
                2,
                header.hdr_scac,
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

        //MARK: Receipt Item Table
    //Invex Receipt Item Table
    await Promise.all(details.map(async (details, index) => {
    
            await pool.query(`INSERT INTO public."861_Invex_ItemInstructions"( 
iins_type, iins_key, iins_invexinstructiontype, iins_text, iins_flow_flag)
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
                details.dtl_po + "-" + details.dtl_pol,
                details.dtl_mo,
                details.dtl_bol,
                details.dtl_cpart,
                null,
                null,
                details.dtl_rcv_qty,
                null,
                null,
                null,
                "IN",
                null,
                null,
                null,
                "IN",
                null,
                null,
                "IN",
                null,
                null,
                null,
                null,
                null,
                null,
                "IN",
                null,
                flow
            ]);
        
    }));
        //MARK: Header Instructions Table
        //Invex Header Instructions Table
    await pool.query(`INSERT INTO public."861_Invex_HeaderInstructions"(
    ins_type, ins_key, ins_invexinstructiontype, ins_text, ins_flow_flag)
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
    pins_type, pins_key, "pins_INVEXInstructionType", "pins_Text", pins_flow_flag)
	VALUES ($1, $2, $3, $4, $5);`, [
                    header.hdr_type,
                    header.hdr_key,
                    60,
                    details.dtl_prev,
                    flow,
            ]);   
            
            await pool.query(`INSERT INTO public."861_Invex_ProductItemInstructions"(
	pins_type, pins_key, "pins_INVEXInstructionType", "pins_Text", pins_flow_flag)
	VALUES ($1, $2, $3, $4, $5);`, [
                    header.hdr_type,
                    header.hdr_key,
                    35,
                    details.dtl_prev,
                    flow,
            ]); 
        }
//	pitm_type, pitm_key, pitm_itemnumber, pitm_taglotid, pitm_externaltagid, pitm_customertagno, pitm_outsideprocessortagid, pitm_vendortagid, pitm_millorderno, pitm_vendorreference, pitm_x12packagingcode, pitm_materialclassification, pitm_materialclassificationdatetime, pitm_materialstatus, pitm_materialstatusdatetime, pitm_processeddate, pitm_reapplicationaction, pitm_opscurrentprocess, pitm_mill, pitm_heat, pitm_density, pitm_coilform, pitm_dimensiondesignator, pitm_width, pitm_x12widthum, pitm_edgedesignation, pitm_length, pitm_x12lengthum, pitm_gaugesize, pitm_x12gaugeum, pitm_innerdiameter, pitm_x12innerdiameterum, pitm_outerdiameter, pitm_x12outerdiameterum, pitm_opsouterdiameterum, pitm_randomdimension1, pitm_randomdimension2, pitm_randomdimension3, pitm_randomdimension4, pitm_randomdimension5, pitm_randomdimension6, pitm_randomdimension7, pitm_randomdimension8, pitm_randomarea, pitm_weightperpiece, pitm_pieces, pitm_piecestype, pitm_measure, pitm_x12measureum, pitm_measuretype, pitm_measurequalifier, pitm_theoreticalweight, pitm_x12theoreticalweightum, pitm_theoreticalnetgrossweight, pitm_actualweight, pitm_x12actualweightum, pitm_actualnetgrossweightqualifier, pitm_coillength, pitm_x12coillengthum, pitm_coillengthtype, pitm_cutnumber, pitm_coilinnerdiameter, pitm_coilouterdiameter, pitm_stxcoilouterdiameter, pitm_facewidth, pitm_actualwidth1, pitm_actualwidth2, pitm_actuallength1, pitm_actuallength2, pitm_actualid1, pitm_actualid2, pitm_actualod1, pitm_actualod2, pitm_actualgauge1, pitm_actualgauge2, pitm_actualdiagonal1, pitm_actualdiagonal2, pitm_actualflatness1, pitm_actualflatness2, pitm_externalordernumber, pitm_externalorderitem, pitm_externalorderrelease, pitm_externalorderdate, pitm_externalcontractnumber, pitm_enduserpo, pitm_enduserreference, pitm_partcustomerid, pitm_partnumber, pitm_partrevisionnumber, pitm_partdescription, pitm_meltedzone, pitm_meltedzonecountry, pitm_originzone, pitm_originzonecountry, pitm_flow_flag, pitm_label_id, pitm_form, pitm_grade, pitm_size, pitm_finish, pitm_ext_fin_desc, pitm_size_desc, pitm_wgt_typ, pitm_net_gross_wgt
        await pool.query(`INSERT INTO public."861_Invex_ProductItem"(
	pitm_type, pitm_key, pitm_itemnumber, pitm_taglotid, pitm_externaltagid, pitm_customertagno, pitm_outsideprocessortagid, pitm_vendortagid, pitm_millorderno, pitm_vendorreference, pitm_x12packagingcode, pitm_materialclassification, pitm_materialclassificationdatetime, pitm_materialstatus, pitm_materialstatusdatetime, pitm_processeddate, pitm_reapplicationaction, pitm_opscurrentprocess, pitm_mill, pitm_heat, pitm_density, pitm_coilform, pitm_dimensiondesignator, pitm_width, pitm_x12widthum, pitm_edgedesignation, pitm_length, pitm_x12lengthum, pitm_gaugesize, pitm_x12gaugeum, pitm_innerdiameter, pitm_x12innerdiameterum, pitm_outerdiameter, pitm_x12outerdiameterum, pitm_opsouterdiameterum, pitm_randomdimension1, pitm_randomdimension2, pitm_randomdimension3, pitm_randomdimension4, pitm_randomdimension5, pitm_randomdimension6, pitm_randomdimension7, pitm_randomdimension8, pitm_randomarea, pitm_weightperpiece, pitm_pieces, pitm_piecestype, pitm_measure, pitm_x12measureum, pitm_measuretype, pitm_measurequalifier, pitm_theoreticalweight, pitm_x12theoreticalweightum, pitm_theoreticalnetgrossweight, pitm_actualweight, pitm_x12actualweightum, pitm_actualnetgrossweightqualifier, pitm_coillength, pitm_x12coillengthum, pitm_coillengthtype, pitm_cutnumber, pitm_coilinnerdiameter, pitm_coilouterdiameter, pitm_stxcoilouterdiameter, pitm_facewidth, pitm_actualwidth1, pitm_actualwidth2, pitm_actuallength1, pitm_actuallength2, pitm_actualid1, pitm_actualid2, pitm_actualod1, pitm_actualod2, pitm_actualgauge1, pitm_actualgauge2, pitm_actualdiagonal1, pitm_actualdiagonal2, pitm_actualflatness1, pitm_actualflatness2, pitm_externalordernumber, pitm_externalorderitem, pitm_externalorderrelease, pitm_externalorderdate, pitm_externalcontractnumber, pitm_enduserpo, pitm_enduserreference, pitm_partcustomerid, pitm_partnumber, pitm_partrevisionnumber, pitm_partdescription, pitm_meltedzone, pitm_meltedzonecountry, pitm_originzone, pitm_originzonecountry, pitm_flow_flag)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95);`, [
                header.hdr_type,
                header.hdr_key,
                details.dtl_line,
                null,
                details.dtl_mcoil?.split("-")[0] || "",
                null,
                null,
                details.dtl_prev,
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
                details.dtl_heat,
                null,
                null,
                null,
                details.dtl_widin? details.dtl_widin : details.dtl_widmm ? details.dtl_widmm : null,
                "IN", //measurements.find(msr => msr.msr_mea2 === "WD" && msr.msr_hl1 === details.dtl_hl1)?.msr_mea4 || null, // "IN"
                null,
                details.dtl_ulenin ? details.dtl_ulenin : details.dtl_ulenmm ? details.dtl_ulenmm : null,
                "IN", //measurements.find(msr => msr.msr_mea2 === "LN" && msr.msr_hl1 === details.dtl_hl1)?.msr_mea4 || null,
                details.dtl_gaugin ? Number(details.dtl_gaugin) : details.dtl_gaugmm ? Number(details.dtl_gaugmm) : null,
                "IN", //measurements.find(msr => ["GG", "TH"].includes(msr.msr_mea2) && msr.msr_hl1 === details.dtl_hl1)?.msr_mea4 || null,
                details.dtl_idin ? details.dtl_idin : details.dtl_idmm ? details.dtl_idmm : null, 
                "IN",
                //details.dtl_odin,
                details.dtl_odin ? details.dtl_odin : details.dtl_odmm ? details.dtl_odmm : null,
                "IN",
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
                "A",
                details.dtl_lnft ? details.dtl_lnft : details.dtl_lnmt ? details.dtl_lnmt : null, 
                "IN", //measurements.find(msr => ["LN"].includes(msr.msr_mea2) && msr.msr_hl1 === details.dtl_hl1)?.msr_mea4 || null, //                "LF",
                null,
                "LN",
                details.dtl_twgtlb ? details.dtl_twgtlb : details.dtl_twgtkg ? details.dtl_twgtkg : null,
                "IN", //measurements.find(msr => ["WT"].includes(msr.msr_mea2) && msr.msr_hl1 === details.dtl_hl1)?.msr_mea4 || null, //                "24",
                null,
                details.dtl_awgtlb ? details.dtl_awgtlb : details.dtl_awgtkg ? details.dtl_awgtkg : null,
                "IN", //measurements.find(msr => ["WT"].includes(msr.msr_mea2) && msr.msr_hl1 === details.dtl_hl1)?.msr_mea4 || null, //                "LB",
                null,
                details.dtl_ulenin ? details.dtl_ulenin : details.dtl_ulenmm ? details.dtl_ulenmm : null,
                "FT",
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
	// err_lineno, err_msgtxt, err_flow_flag, err_type, err_key, txer_flow_flag)
	// VALUES ($1, $2, $3, $4, $5, $6);`, [transformedData.transactionErrors]);

    } catch (error) {
        console.error('-', header.hdr_key, '-\n',"Error in insert861InvexInbound:", error,'\n-', header.hdr_key, '-');
    }
}
module.exports = {
    insert861InvexInbound
};

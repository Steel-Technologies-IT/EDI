async function insert856InvexInbound(pool, header, details, measurements, names) {
    // Insert the transformed data into the respective output tables
    // Map SNF tables to Invex JSON Structure 
        console.log(measurements)

    const flow = "I"
    try {
        
        //Invex Interchange Control Table
        await pool.query(`INSERT INTO public."856_Invex_InterchangeControl"(
	ictl_type, ictl_key, ictl_companyid, ictl_senderinterchangeidqualifier, ictl_senderinterchangeid, ictl_edixcontrolnumber, ictl_receiverinterchangeidqualifier, ictl_receiverinterchangeid, ictl_createddatetime, ictl_alternateinterchangenumber, ictl_status, ictl_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`, 
        [
                header["hdr_type"], 
                header["hdr_key"],
                "STX",
                header["hdr_isa_qual"],
                header["hdr_isnd_id"],
                header["hdr_key"],  
                header["hdr_ircv_qual"],
                header["hdr_ircv_id"],
                header["hdr_crt_dat"],
                header["hdr_gctl_no"],
                null,
                flow
        ]);

       //Invex Transaction Set Table
        await pool.query(`INSERT INTO public."856_Invex_TransactionSet"(
	txs_type, txs_key, txs_transactionsetcontrolnumber, txs_edistandardsorganizationtransactionset, txs_edistandardsorganization, txs_status, txs_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7);`, [
                header["hdr_type"],
                header["hdr_key"],
                header["hdr_stctl_no"], 
                '856',
                'X',
                null,
                flow
        ]);

       //Invex Shipment Item Table
        await pool.query(`INSERT INTO public."856_Invex_ShipmentHeader"(
	ish_type, ish_key, ish_transactionreference, ish_manifestnumber, ish_vendorshipmentreference, ish_shippingdatetime, ish_estimatedarrivaldatetime, ish_x12deliverymethod, ish_carriercodequalifier, ish_carrieridentificationcode, ish_carriername, ish_carrierreferencenumber, ish_vehicleinfo, ish_vehiclelicenseplate, ish_appointmentnumber, ish_gatedock, ish_appointmentdatetime, ish_shipmentmethodofpayment, ish_mastergrossweight, ish_x12mastergrossweightum, ish_numberofpackages, ish_grossweight, ish_x12grossweightum, ish_netweight, ish_x12netweightum, ish_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26);`, [
                header["hdr_type"],
                header["hdr_key"],
                header["hdr_bol_no"],
                header["hdr_bol_no"],        
                header["hdr_mbol_no"], 
                header["hdr_bsn_dte"],
                null, 
                header["hdr_trpt_mthd"], 
                2,  
                header["hdr_std_car_cd"] ,          
                null,            
                null,                 
                null,
                header["hdr_eq_nbr"],
                null, 
                null,
                null,
                header["hdr_shp_mthd_pmnt"],
                header["hdr_shp_grss_wgt_lb"],
                header["hdr_shp_grss_wgt_uom"],
                header["hdr_shp_itm_cnt"],
                header["hdr_shp_grss_wgt_lb"],
                header["hdr_shp_grss_wgt_uom"],
                header["hdr_shp_net_wgt_lb"],
                header["hdr_shp_net_wgt_uom"],
                flow
        ]);

        //Invex Header Name Address Table
        await pool.query(`INSERT INTO public."856_Invex_HeaderNameAddress"(
	hdna_type, hdna_key, hdna_addresstype, hdna_identificationcodequalifier, hdna_identificationcode, hdna_nameline1, hdna_nameline2, hdna_addressline1, hdna_addressline2, hdna_addressline3, hdna_city, hdna_postalcode, hdna_countrycode, hdna_stateprovincecode, hdna_telareacode, hdna_telnumber, hdna_telextension, hdna_faxareacode, hdna_faxnumber, hdna_faxextension, hdna_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);`, [
                header["hdr_type"],
                header["hdr_key"],
                names["addressType"] ?? null, //Unknown need to be defined
                names["name_qual"],
                names["name_qual_id"],
                names["name_name"],
                names["name_name2"] ?? null, //Unknown need to be defined
                names["name_addr1"],
                names["name_addr2"],
                names["name_addr3"] ?? null, //Unknown need to be defined
                names["name_city"],
                names["name_zpcd"],
                names["name_ctry_cd"],
                names["name_state_prov_cd"] ?? null, //Unknown need to be defined
                names["name_tel_area_cd"] ?? null, //Unknown need to be defined
                names["name_cont_phn"] ?? null, 
                names["name_tel_ext"] ?? null, //Unknown need to be defined
                names["name_fax_area_cd"] ?? null, //Unknown need to be defined
                names["name_fax_phn"] ?? null, //Unknown need to be defined
                names["name_fax_ext"] ?? null, //Unknown need to be defined
                flow

        ]);

        //Invex Header Instructions Table
        await pool.query(`INSERT INTO public."856_Invex_HeaderInstructions"(
	hdin_type, hdin_key, hdin_invexinstructiontype, hdin_text, hdin_flow_flag)
	VALUES ($1, $2, $3, $4, $5);`, [
                header["hdr_type"],
                header["hdr_key"],
                header["hdr_stx_no"] ?? null, //Unknown need to be defined
                header["hdr_version"] ?? null, //Unknown need to be defined
                flow
        ]);

        //Invex Shipment Item Table
        await pool.query(`INSERT INTO public."856_Invex_ShipmentItem"(
	shp_type, shp_key, shp_referencelinenumber, shp_stratixordernumber, shp_externalordernumber, shp_externalorderitem, shp_externalorderrelease, shp_externalorderdate, shp_externalcontractnumber, shp_enduserpo, shp_partnumber, shp_partrevisionnumber, shp_numberofpackages, shp_grossweight, shp_x12grossweightum, shp_netweight, shp_x12netweightum, shp_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18);`, [
                header["hdr_type"],
                header["hdr_key"],
                null, 
                details["stratixordernumber"] ?? null, //Unknown need to be defined
                details["externalordernumber"] ?? null, //Unknown need to be defined
                details["externalorderitem"] ?? null, //Unknown need to be defined
                details["externalorderrelease"] ?? null, //Unknown need to be defined
                details["externalorderdate"] ?? null, //Unknown need to be defined
                details["externalcontractnumber"] ?? null, //Unknown need to be defined
                details["enduserpo"] ?? null, //Unknown need to be defined
                details["partnumber"] ?? null, //Unknown need to be defined
                details["partrevisionnumber"] ?? null, //Unknown need to be defined
                details["numberofpackages"] ?? null, //Unknown need to be defined
                details["dtl_awgtlb"],
                header["hdr_shp_grss_wgt_uom"],
                details["dtl_awgtlb"],
                header["hdr_shp_grss_wgt_uom"],
                flow
        ]);

        //Invex Item Instructions Table
        await pool.query(`INSERT INTO public."856_Invex_ItemInstructions"(
	itin_type, itin_key, itin_invexinstructiontype, itin_text, itin_flow_flag)
	VALUES ($1, $2, $3, $4, $5);`, [
                header["hdr_type"],
                header["hdr_key"],
                header["hdr_stx_no"] ?? null, //Unknown need to be defined
                header["hdr_version"] ?? null, //Unknown need to be defined
                flow
        ]);

        //Invex Product Item Table
        await pool.query(`INSERT INTO public."856_Invex_ProductItem"(
	prd_type, prd_key, prd_itemnumber, prd_taglotid, prd_externaltagid, prd_customertagno, prd_outsideprocessortagid, prd_vendortagid, prd_millorderno, prd_vendorreference, prd_x12packagingcode, prd_materialclassification, prd_matericalclassificationdatetime, prd_materialstatus, prd_materialstatusdatetime, prd_processeddate, prd_reapplicationaction, prd_opscurrentprocess, prd_mill, prd_heat, prd_density, prd_coilform, prd_dimensiondesignator, prd_width, prd_x12widthum, prd_edgedesignation, prd_length, prd_x12lengthum, prd_gaugesize, prd_x12gaugeum, prd_innerdiameter, prd_x12innerdiameterum, prd_outerdiameter, prd_x12outerdiameterum, prd_randomdimension1, prd_randomdimension2, prd_randomdimension3, prd_randomdimension4, prd_randomdimension5, prd_randomdimension6, prd_randomdimension7, prd_randomdimension8, prd_randomarea, prd_weightperpiece, prd_pieces, prd_piecestype, prd_measure, prd_x12measureum, prd_measuretype, prd_measurequalifier, prd_theoreticalweight, prd_x12theoreticalweightum, prd_theoreticalnetgrossweight, prd_actualweight, prd_x12actualweightum, prd_actualnetgrossweightqualifier, prd_coillength, prd_x12coillengthum, prd_coillengthtype, prd_cutnumber, prd_coilinnerdiameter, prd_coilouterdiameter, prd_facewidth, prd_actualwidth1, prd_actualwidth2, prd_actuallength1, prd_actuallength2, prd_actualid1, prd_actualid2, prd_actualod1, prd_actualod2, prd_actualgauge1, prd_actualgauge2, prd_actualdiagonal1, prd_actualdiagonal2, prd_actualflatness1, prd_actualflatness2, prd_externalordernumber, prd_externalorderitem, prd_externalorderrelease, prd_externalorderdate, prd_externalcontractnumber, prd_enduserpo, prd_enduserreference, prd_partcustomerid, prd_partnumber, prd_partrevisionnumber, prd_partdescription, prd_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89);`, [
                header["hdr_type"],
                header["hdr_key"],
                index + 1, // Assuming index is defined in the context
                details["taglotid"] ?? null, //Unknown need to be defined
                details["dtl_mcoil"]?.split("-")[0] || "",
                details["dtl_mcoil"]?.split("-")[0] || "",
                details["outsideprocessortagid"] ?? null, //Unknown need to be defined
                details["dtl_mcoil"]?.split("-")[0] || "",
                details["dtl_mo"],
                details["vendorreference"] ?? null, //Unknown need to be defined
                details["x12packagingcode"] ?? null, //Unknown need to be defined
                details["dtl_mcls67"],
                details["materialclassificationdatetime"] ?? null, //Unknown need to be defined
                details["dtl_msts70"],
                details["materialstatusdatetime"] ?? null, //Unknown need to be defined
                details["processeddate"] ?? null, //Unknown need to be defined
                details["reapplicationaction"] ?? null, //Unknown need to be defined
                details["opscurrentprocess"] ?? null, //Unknown need to be defined
                details["mill"] ?? null, //Unknown need to be defined
                details["dtl_heat"] ?? null,
                details["density"] ?? null, //Unknown need to be defined
                details["coilform"] ?? null, //Unknown need to be defined
                details["dimensiondesignator"] ?? null, //Unknown need to be defined
                details["dtl_widin"] ?? null,
                details["x12widthum"] ?? null, //Unknown need to be defined
                details["edge22"] ?? null,
                details["dtl_lenft"] ?? null,
                details["x12lengthum"] ?? null, //Unknown need to be defined
                details["dtl_gaugin"] ?? null,
                details["x12gaugeum"] ?? null, //Unknown need to be defined
                details["dtl_idin"] ?? null,
                details["x12innerdiameterum"] ?? null, //Unknown need to be defined
                details["dtl_odin"] ?? null,
                details["x12outerdiameterum"] ?? null, //Unknown need to be defined
                details["randomdimension1"] ?? null, //Unknown need to be defined
                details["randomdimension2"] ?? null, //Unknown need to be defined
                details["randomdimension3"] ?? null, //Unknown need to be defined
                details["randomdimension4"] ?? null, //Unknown need to be defined
                details["randomdimension5"] ?? null, //Unknown need to be defined
                details["randomdimension6"] ?? null, //Unknown need to be defined
                details["randomdimension7"] ?? null, //Unknown need to be defined
                details["randomdimension8"] ?? null, //Unknown need to be defined
                details["randomarea"] ?? null, //Unknown need to be defined
                details["weightperpiece"] ?? null, //Unknown need to be defined
                details["dtl_pcs"] ?? null,
                details["dtl_pcs_type"] ?? null, //Unknown need to be defined
                details["measure"] ?? null, //Unknown need to be defined
                details["x12measureum"] ?? null, //Unknown need to be defined
                details["measuretype"] ?? null, //Unknown need to be defined
                details["measurequalifier"] ?? null, //Unknown need to be defined
                details["dtl_twgtlb"] ?? null,
                header["hdr_shp_grss_wgt_uom"],
                details["dtl_twgtlb"],
                details["dtl_awgtlb"],
                header["hdr_shp_grss_wgt_uom"],
                details["dtl_grossweightqualifier"] ?? null, //Unknown need to be defined
                details["dtl_coil_length"] ?? null, //Unknown need to be defined
                details["x12coillengthum"] ?? null, //Unknown need to be defined
                details["coillengthtype"] ?? null, //Unknown need to be defined
                details["cutnumber"] ?? null, //Unknown need to be defined
                details["coilinnerdiameter"] ?? null, //Unknown need to be defined
                details["coilouterdiameter"] ?? null, //Unknown need to be defined
                details["facewidth"] ?? null, //Unknown need to be defined
                details["actualwidth1"] ?? null, //Unknown need to be defined
                details["actualwidth2"] ?? null, //Unknown need to be defined
                details["actuallength1"] ?? null, //Unknown need to be defined
                details["actuallength2"] ?? null, //Unknown need to be defined
                details["actualid1"] ?? null, //Unknown need to be defined
                details["actualid2"] ?? null, //Unknown need to be defined
                details["actualod1"] ?? null, //Unknown need to be defined
                details["actualod2"] ?? null, //Unknown need to be defined
                details["actualgauge1"] ?? null, //Unknown need to be defined
                details["actualgauge2"] ?? null, //Unknown need to be defined
                details["actualdiagonal1"] ?? null, //Unknown need to be defined
                details["actualdiagonal2"] ?? null, //Unknown need to be defined
                details["actualflatness1"] ?? null, //Unknown need to be defined
                details["actualflatness2"] ?? null, //Unknown need to be defined
                details["externalordernumber"] ?? null, //Unknown need to be defined
                details["externalorderlineitem"] ?? null, //Unknown need to be defined
                details["externalorderrelease"] ?? null, //Unknown need to be defined
                details["externalorderdate"] ?? null, //Unknown need to be defined
                details["externalcontractnumber"] ?? null, //Unknown need to be defined
                details["enduserpo"] ?? null, //Unknown need to be defined
                details["enduserreference"] ?? null, //Unknown need to be defined
                details["partcustomerid"] ?? null, //Unknown need to be defined
                details["partnumber"] ?? null, //Unknown need to be defined
                details["partrevisionnumber"] ?? null, //Unknown need to be defined
                details["partdescription"] ?? null, //Unknown need to be defined
                flow
        ]);

        //Invex Chemistry Table
        await Promise.all(
            measurements
                .filter(chem => chem["msr_mea1"] === "CH")
                .map(chem =>
                    pool.query(`INSERT INTO public."856_Invex_Chemistry"(
                        chm_type, chm_key, chm_linenumber, chm_x12chemelement, chm_entrytype, chm_value, chm_minvalue, chm_maxvalue, chm_flow_flag
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`, [
                        chem["msr_type"],
                        chem["msr_key"],
                        chem["msr_hl1"],
                        chem["msr_mea2"],
                        'V',
                        chem["msr_mea3"],
                        chem["msr_mea7"] ?? null,  // Need to be defined
                        chem["msr_mea8"] ?? null,  // Need to be defined
                        flow
                    ])
                )
        );

        //Invex Damages Table  (***FUTURE/NOT NEEDED IMPLEMENTATION***)
        // await pool.query(`INSERT INTO public."856_Invex_Damages"(
	// dmg_type, dmg_key, dmg_linenumber, dmg_damagecode, dmg_faultcode, dmg_flow_flag)
	// VALUES ($1, $2, $3, $4, $5, $6);`, [transformedData.damages]);

        //Invex Product Item Instructions Table
        await pool.query(`INSERT INTO public."856_Invex_ProductItemInstructions"(
	prii_type, prii_key, prii_invexinstructiontype, prii_text, prii_flow_flag)
	VALUES ($1, $2, $3, $4, $5);`, [
                header["hdr_type"],
                header["hdr_key"],
                header["hdr_stx_no"] ?? null, //Unknown need to be defined
                header["hdr_version"] ?? null, //Unknown need to be defined
                flow
        ]);

        //Invex Product Item Name Address Table
        await pool.query(`INSERT INTO public."856_Invex_ProductItemNameAddress"(
	prna_type, prna_key, prna_addresstype, prna_identificationcodequalifier, prna_identificationcode, prna_nameline1, prna_nameline2, prna_addressline1, prna_addressline2, prna_addressline3, prna_city, prna_postalcode, prna_countrycode, prna_stateprovincecode, prna_telareacode, prna_telnumber, prna_telextension, prna_faxareacode, prna_faxnumber, prna_faxextension, prna_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);`, [
                header["hdr_type"],
                header["hdr_key"],
                names["addressType"] ?? null, //Unknown need to be defined
                names["name_qual"] ?? null,
                names["name_qual_id"] ?? null,
                names["name_name"] ?? null,
                names["name_name2"] ?? null, //Unknown need to be defined
                names["name_addr1"] ?? null,
                names["name_addr2"] ?? null,
                names["name_addr3"] ?? null, //Unknown need to be defined
                names["name_city"] ?? null,
                names["name_zpcd"] ?? null,
                names["name_ctry_cd"] ?? null,
                names["name_state_prov_cd"] ?? null, //Unknown need to be defined
                names["name_tel_area_cd"] ?? null, //Unknown need to be defined
                names["name_cont_phn"] ?? null,
                names["name_tel_ext"] ?? null, //Unknown need to be defined
                names["name_fax_area_cd"] ?? null, //Unknown need to be defined
                names["name_fax_phn"] ?? null, //Unknown need to be defined
                names["name_fax_ext"] ?? null, //Unknown need to be defined
                flow
        ]);

        //Invex Transaction Errors Table (***FUTURE/NOT NEEDED IMPLEMENTATION***)
        // await pool.query(`INSERT INTO public."856_Invex_TransactionErrors"(
	// txer_type, txer_key, txer_lineno, txer_messagetext, txer_flow_flag)
	// VALUES ($1, $2, $3, $4, $5);`, [transformedData.transactionErrors]);

    } catch (error) {
        console.error('Error inserting into output tables:', error);
    }
}
module.exports = {
    insert856InvexInbound
};
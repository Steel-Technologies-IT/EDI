const  readableErrors  = require('../../functions/readableErrors.js');

async function insert870InvexInbound(pool, Header, OrderDtl, Names, ChgInDtl, ChgInMeasure, ChgInPID, ChgOutDtl, ChgOutMeasure, ChgOutPID, filePath) {
    // Insert the transformed data into the respective output tables
    // Map SNF tables to Invex JSON Structure 
    const flow = "I"
    //console.log("Inserting 870 Invex Inbound with key:", Header.hdr_key);
    try {
        
        // MARK: Interchange Control Table
        //Invex Interchange Control Table
        await pool.query(`INSERT INTO public."870_Invex_InterchangeControl"(
	ictl_type, ictl_key, ictl_companyid, ictl_senderinterchangeidqualifier, ictl_senderinterchangeid, ictl_edixcontrolnumber, ictl_receiverinterchangeidqualifier, ictl_receiverinterchangeid, ictl_createddatetime, ictl_alternateinterchangenumber, ictl_status, ictl_flow_flag, ictl_sndr_brch_ich_idqual, ictl_sndr_brch_ich_id, ictl_invexbranchcode)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);`, 
        [
                Header.hdr_type, //ictl_type
                Header.hdr_key,  //ictl_key
                "STX", //ictl_senderinterchangeidqualifier
                Header.hdr_isa_qual, //ictl_senderinterchangeid
                Header.hdr_isnd_id,  //ictl_receiverinterchangeidqualifier
                Header.hdr_key, //ictl_receiverinterchangeid
                Header.hdr_ircv_qual, //ictl_receiverinterchangeidqualifier
                Header.hdr_ircv_id, //ictl_receiverinterchangeid
                Header.hdr_crt_dat + String(Header.hdr_crt_tim).padStart(6, '0'), //ictl_createddatetime
                Header.hdr_ictl_no, //ictl_alternateinterchangenumber
                null, //ictl_status
                flow, //ictl_flow_flag
                null, //ictl_sndr_brch_ich_idqual
                null, //ictl_sndr_brch_ich_id
                null  //ictl_invexbranchcode
        ]);


        // MARK: Transaction Set Table
       //Invex Transaction Set Table
        await pool.query(`INSERT INTO public."870_Invex_TransactionSet"(
	txs_type, txs_key, txs_transactionsetcontrolnumber, txs_edistandardsorganizationtransactionset, txs_edistandardsorganization, txs_status, txs_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7);`, [
                Header.hdr_type, //txs_type
                Header.hdr_key,  //txs_key
                Header.hdr_stctl_no, //txs_transactionsetcontrolnumber
                '870', //txs_edistandardsorganizationtransactionset
                'X',   //txs_edistandardsorganization
                null,  //txs_status
                flow   //txs_flow_flag

        ]);

        await pool.query(`INSERT INTO public."870_Invex_NonRecordedScrapItems"(
    nrscr_type, nrscr_key, nrscr_productionreportingheaderid, nrscr_scrapdamagecode,nrscr_pieces, nrscr_measurelength, nrscr_x12measurelengthum, nrscr_opsmeasurelengthum, nrscr_measurearea, nrscr_x12measureareaum, nrscr_opsmeasureareaum, nrscr_weight, nrscr_x12weightum, nrscr_opsweightum, nrscr_flow_flag, nrscr_itemnumber)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16 );`, [
                Header.hdr_type, //nrscr_type
                Header.hdr_key, //nrscr_key
                null, //nrscr_productionreportingheaderid
                null, //nrscr_scrapdamagecode
                null, //nrscr_pieces
                null, //nrscr_measurelength
                null, //nrscr_x12measurelengthum
                null, //nrscr_opsmeasurelengthum
                null, //nrscr_measurearea
                null, //nrscr_x12measureareaum
                null, //nrscr_opsmeasureareaum
                null, //nrscr_weight
                null, //nrscr_x12weightum
                null, //nrscr_opsweightum
                flow, //nrscr_flow_flag
                null //nrscr_itemnumber
]);
        // MARK: Shipment Header Table
       //Invex Shipment Item Table
        await pool.query(`INSERT INTO public."870_Invex_ProductionReportingHeader"(
	prdhdr_type, prdhdr_key, prdhdr_transactionreference, prdhdr_updatedatetime, prdhdr_statusreportcode, prdhdr_orderitemcode, prdhdr_opsprocess, prdhdr_serviceordernumber, prdhdr_layoutnumber, prdhdr_vendorreference, prdhdr_externalordernumber, prdhdr_externalorderitem, prdhdr_externalorderrelease, prdhdr_externalorderdate, prdhdr_externalcontractnumber, prdhdr_enduserpo, prdhdr_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17);`, [
                Header.hdr_type,    // prdhdr_type
                Header.hdr_key ,    // prdhdr_key
                Header.hdr_ref_id,    // prdhdr_transactionreference
                Header.hdr_date && Header.hdr_time ? Header.hdr_date + String(Header.hdr_time).padStart(6, '0') : null,    // prdhdr_updatedatetime
                Header.hdr_sts_rpt_cd,    // prdhdr_statusreportcode
                Header.hdr_ord_itm_cd,    // prdhdr_orderitemcode
                null,    // prdhdr_opsprocess
                null,    // prdhdr_serviceordernumber
                null,    // prdhdr_layoutnumber
                null,    // prdhdr_vendorreference
                null,    // prdhdr_externalordernumber
                null,    // prdhdr_externalorderitem
                null,    // prdhdr_externalorderrelease
                null,    // prdhdr_externalorderdate
                null,    // prdhdr_externalcontractnumber
                null,    // prdhdr_enduserpo
                flow     // prdhdr_flow_flag

        ]);
        //MARK: Header Name Address Table
        //Invex Header Name Address Table
        await Promise.all(
            Names
                .filter(Names => Names.name_qual !== 'DE' && Names.name_qual !== '')
                .map(async (Names, index) => {
                    await pool.query(`INSERT INTO public."870_Invex_HeaderNameAddress"(
        hdna_type, hdna_key, hdna_addresstype,hdna_edixaddresstype, hdna_identificationcodequalifier,hdna_identificationcode, hdna_name1, hdna_name2,hdna_address1, hdna_address2, hdna_address3, hdna_city, hdna_postalcode, hdna_countrycode, hdna_stateprovincecode, hdna_telephoneareacode, hdna_telephonenumber, hdna_telephoneextension, hdna_faxareacode, hdna_faxnumber, hdna_faxextension, hdna_flow_flag, hdna_itemnumber)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23);`, [
                        Header.hdr_type, //hdna_type
                        Header.hdr_key, //hdna_key
                        Names.name_qual, //hdna_addresstype
                        null,                   //hdna_edixaddresstype
                        Names.name_qual_id, //hdna_identificationcodequalifier
                        Names.name_name_id, //hdna_identificationcode
                        Names.name_name, //hdna_name1
                        null, //hdna_name2
                        Names.name_addr1, //hdna_address1
                        Names.name_addr2, //hdna_address2
                        null, //hdna_address3
                        Names.name_city, //hdna_city
                        Names.name_zpcd, //hdna_postalcode
                        Names.name_ctry_cd, //hdna_countrycode
                        Names.name_state, //hdna_stateprovincecode
                        Names.name_cont_phn, //hdna_telephoneareacode
                        Names.name_tel, //hdna_telephonenumber
                        Names.name_tel_ext, //hdna_telephoneextension
                        Names.name_faxareacode, //hdna_faxareacode
                        Names.name_faxnumber, //hdna_faxnumber
                        Names.name_faxextension, //hdna_faxextension
                        flow, //hdna_flow_flag
                        null //hdna_itemnumber
                    ]);
                })
        )



        //MARK: Header Instructions Table
        //Invex Header Instructions Table
        await pool.query(`INSERT INTO public."870_Invex_HeaderInstructions"(
	hdin_type, hdin_key, hdin_invexinstructiontype, hdin_text, hdin_flow_flag)
	VALUES ($1, $2, $3, $4, $5);`, [
                Header.hdr_type, //hdin_type
                Header.hdr_key, //hdin_key
                null, //hdin_invexinstructiontype
                null, //hdin_text
                flow //hdin_flow_flag
        ]);


        //MARK: Product Item Table
        //Invex Product Item Table
//         await Promise.all(details.map(async (details, index) => {
// if (details.dtl_prev) {
        await pool.query(`INSERT INTO public."870_Invex_ProductItemInstructions"(
	prii_type, prii_key, prii_invexinstructiontype, prii_text, prii_flow_flag)
	VALUES ($1, $2, $3, $4, $5);`, [
                    Header.hdr_type,//prii_type
                    Header.hdr_key, //prii_key
                    60,   //prii_invexinstructiontype
                    null, //prii_text
                    flow  //prii_flow_flag
            ]);   
        
    //console.log("Inserting Product Items for 870 Invex Inbound with key:", ChgInDtl);

     try {
    
             await Promise.all(ChgInDtl.map(async (ChgInDtl) => {
        await pool.query(`INSERT INTO public."870_Invex_ProductItem"(
	prd_type, prd_key, prd_itemnumber, prd_taglotid, prd_externaltagid, prd_customertagno, prd_outsideprocessortagid, prd_vendortagid, prd_millorderno, prd_vendorreference, prd_x12packagingcode,    prd_materialclassification, prd_materialclassificationdatetime,    prd_materialstatus, prd_materialstatusdatetime,    prd_processeddate, prd_reapplicationaction,    prd_opscurrentprocess, prd_mill, prd_heat, prd_density,    prd_coilform, prd_dimensiondesignator, prd_width,    prd_x12widthum, prd_edgedesignation,    prd_length, prd_x12lengthum,    prd_gaugesize, prd_x12gaugeum,    prd_innerdiameter, prd_x12innerdiameterum,    prd_outerdiameter, prd_x12outerdiameterum,    prd_randomdimension1, prd_randomdimension2, prd_randomdimension3,    prd_randomdimension4, prd_randomdimension5, prd_randomdimension6,    prd_randomdimension7, prd_randomdimension8, prd_randomarea,    prd_weightperpiece, prd_pieces, prd_piecestype, prd_measure,    prd_x12measureum, prd_measuretype, prd_measurequalifier, prd_theoreticalweight, prd_x12theoreticalweightum, prd_theoreticalnetgrossweight, prd_actualweight, prd_x12actualweightum, prd_actualnetgrossweightqualifier, prd_coillength, prd_x12coillengthum,    prd_coillengthtype,   prd_cutnumber, prd_coilinnerdiameter, prd_coilouterdiameter,    prd_stxcoilouterdiameter,  prd_facewidth,   prd_actualwidth1,    prd_actualwidth2, prd_actuallength1, prd_actuallength2, prd_actualid1, prd_actualid2, prd_actualod1, prd_actualod2, prd_actualgauge1, prd_actualgauge2, prd_actualdiagonal1, prd_actualdiagonal2,    prd_actualflatness1, prd_actualflatness2,    prd_externalordernumber,  prd_externalorderitem,   prd_externalorderrelease,  prd_externalorderdate,    prd_externalcontractnumber,   prd_enduserpo,   prd_enduserreference,   prd_partcustomerid,    prd_partnumber,   prd_partrevisionnumber,     prd_partdescription,     prd_meltedzone,      prd_meltedzonecountry,     prd_originzone,     prd_originzonecountry,      "prd_Item_cons_or_prod",     prd_label_id,  prd_form,      prd_grade,      prd_size,      prd_finish,      prd_ext_fin_desc,      prd_size_desc,      prd_wgt_type,      prd_net_gross_wgt,      prd_referencelinenumber,      prd_flow_flag)  
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96, $97, $98, $99, $100, $101, $102, $103, $104, $105);`, [
                Header.hdr_type, //prd_type //1
                Header.hdr_key,  //prd_key//2
                ChgInDtl.chgindtl_hlo, //prd_itemnumber
                null, //prd_taglotid
                ChgInDtl.chgindtl_mcoil ? ChgInDtl.chgindtl_mcoil.substring(0, 15) : null, //prd_externaltagid
                null, //prd_customertagno
                null, //prd_outsideprocessortagid
                ChgInDtl.chgindtl_mcoil ? ChgInDtl.chgindtl_mcoil.substring(0, 15) : null, //prd_vendortagid
                null, //prd_millorderno
                null, //prd_vendorreference
                null, //prd_x12packagingcode
                ChgInDtl.chgindtl_mcls, //prd_materialclassification
                null, //prd_materialclassificationdatetime
                ChgInDtl.chgindtl_msts? ChgInDtl.chgindtl_msts : null, //prd_materialstatus
                null, //prd_materialstatusdatetime
                null, //prd_processeddate
                null, //prd_reapplicationaction
                null, //prd_opscurrentprocess
                null, //prd_mill
                ChgInDtl.chgindtl_heat, //prd_heat
                null, //prd_density
                null, //prd_coilform
                null, //prd_dimensiondesignator
                ChgInDtl.chgindtl_widin? ChgInDtl.chgindtl_widin : ChgInDtl.chgindtl_widmm ? ChgInDtl.chgindtl_widmm : null, //prd_width
                ChgInDtl.chgindtl_widin? 'IN' : ChgInDtl.chgindtl_widmm ? 'MM' : null, //prd_x12widthum
                null,  //ChgInDtl.chgindtl_edge22 !== undefined && ChgInDtl.chgindtl_edge22 !== null && ChgInDtl.chgindtl_edge22 !== "" ? Number(ChgInDtl.chgindtl_edge22) : null, //prd_edgedesignation
                ChgInDtl.chgindtl_ulenin ? ChgInDtl.chgindtl_ulenin : ChgInDtl.chgindtl_ulenmm ? ChgInDtl.chgindtl_ulenmm : null, //prd_length
                ChgInDtl.chgindtl_ulenin ? 'IN' : ChgInDtl.chgindtl_ulenmm ? 'MM' : null, //prd_x12lengthum
                ChgInDtl.chgindtl_gaugin ? Number(ChgInDtl.chgindtl_gaugin) : ChgInDtl.chgindtl_gaugmm ? Number(ChgInDtl.chgindtl_gaugmm) : null, //prd_gaugesize
                ChgInDtl.chgindtl_gaugin ? 'IN' : ChgInDtl.chgindtl_gaugmm ? 'MM' : null, //prd_x12gaugeum
                null, //prd_innerdiameter
                null, //prd_x12innerdiameterum
                null, //prd_outerdiameter
                null, //prd_x12outerdiameterum
                null, //prd_randomdimension1
                null, //prd_randomdimension2
                null, //prd_randomdimension3
                null, //prd_randomdimension4
                null, //prd_randomdimension5
                null, //prd_randomdimension6
                null, //prd_randomdimension7
                null, //prd_randomdimension8
                null, //prd_randomarea
                null, //prd_weightperpiece
                ChgInDtl.chgindtl_pcs, //prd_pieces 
                "A", //prd_piecestype
                null, //prd_measure
                null, //prd_x12measureum
                null, //prd_measuretype
                null, //prd_measurequalifier
                ChgInDtl.chgindtl_twgtlb ? ChgInDtl.chgindtl_twgtlb : ChgInDtl.chgindtl_twgtkg ? ChgInDtl.chgindtl_twgtkg : null, //prd_theoreticalweight
                ChgInDtl.chgindtl_twgtlb ? 'LB' : ChgInDtl.chgindtl_twgtkg ? 'KG' : null, //prd_x12theoreticalweightum
                null, //prd_theoreticalnetgrossweight
                ChgInDtl.chgindtl_awgtlb ? ChgInDtl.chgindtl_awgtlb : ChgInDtl.chgindtl_awgtkg ? ChgInDtl.chgindtl_awgtkg : null, //prd_actualweight
                ChgInDtl.chgindtl_awgtlb ? 'LB' : ChgInDtl.chgindtl_awgtkg ? 'KG' : null, //prd_actualweightum
                null, //prd_actualnetgrossweightqualifier
                ChgInDtl.chgindtl_lnft ? ChgInDtl.chgindtl_lnft : ChgInDtl.chgindtl_lnmt ? ChgInDtl.chgindtl_lnmt : null, //prd_coillength
                ChgInDtl.chgindtl_lnft ? 'FT' : ChgInDtl.chgindtl_lnmt ? 'MR' : null, //prd_x12coillengthum
                "T",  //prd_coillengthtype
                null, //prd_cutnumber
                ChgInDtl.chgindtl_idin ? ChgInDtl.chgindtl_idin : ChgInDtl.chgindtl_idmm ? ChgInDtl.chgindtl_idmm : null, // prd_coilinnerdiameter
                ChgInDtl.chgindtl_odin ? ChgInDtl.chgindtl_odin : ChgInDtl.chgindtl_odmm ? ChgInDtl.chgindtl_odmm : null, // prd_coilouterdiameter
                null, //prd_stxcoilouterdiameter
                null, //prd_facewidth
                null, //prd_actualwidth1
                null, //prd_actualwidth2
                null, //prd_actuallength1
                null, //prd_actuallength2
                null, //prd_actualid1
                null, //prd_actualid2
                null, //prd_actualod1
                null, //prd_actualod2
                null, //prd_actualgauge1
                null, //prd_actualgauge2
                null, //prd_actualdiagonal1
                null, //prd_actualdiagonal2
                null, //prd_actualflatness1
                null, //prd_actualflatness2
                ChgInDtl.chgindtl_po, //prd_externalordernumber
                null, //prd_externalorderitem
                ChgInDtl.chgindtl_rls, //prd_externalorderrelease
                ChgInDtl.chgindtl_pod, //prd_externalorderdate
                ChgInDtl.chgindtl_contractno, //prd_externalcontractnumber
                ChgInDtl.chgindtl_po, //prd_enduserpo
                null, //prd_enduserreference
                null, //prd_partcustomerid
                ChgInDtl.chgindtl_cpart, //prd_partnumber
                null,//prd_partrevisionnumber
                null,//prd_partdescription
                null,//prd_meltedzone
                null,//prd_meltedzonecountry
                null,//prd_originzone
                null,//prd_originzonecountry
                null,//prd_item_cons_or_prod
                null,//prd_label_id,
                null,//prd_form,
                ChgInDtl.chgindtl_gc,//prd_grade,
                null,//prd_size,
                null,//prd_finish,
                null,//prd_ext_fin_desc
                null,//prd_size_desc
                null,//prd_wgt_type
                null,//prd_net_gross_wgt
                "0", //prd_referencelinenumber
                flow //prd_flow_flag //105
    ]);
        })); // <-- Add this closing parenthesis for Promise.all
     } catch (error) {console.error("Error inserting Invex data:", error);}  

try {
    //console.log("Inserting Product Items for 870 Invex Inbound with key:", ChgOutDtl);

     await Promise.all(ChgOutDtl.map(async (ChgOutDtl) => { 
           await pool.query(`INSERT INTO public."870_Invex_ProductItem"(
	prd_type, prd_key, prd_itemnumber, prd_taglotid, prd_externaltagid, prd_customertagno, prd_outsideprocessortagid, prd_vendortagid, prd_millorderno, prd_vendorreference, prd_x12packagingcode,    prd_materialclassification, prd_materialclassificationdatetime,    prd_materialstatus, prd_materialstatusdatetime,    prd_processeddate, prd_reapplicationaction,    prd_opscurrentprocess, prd_mill, prd_heat, prd_density,    prd_coilform, prd_dimensiondesignator, prd_width,    prd_x12widthum, prd_edgedesignation,    prd_length, prd_x12lengthum,    prd_gaugesize, prd_x12gaugeum,    prd_innerdiameter, prd_x12innerdiameterum,    prd_outerdiameter, prd_x12outerdiameterum,    prd_randomdimension1, prd_randomdimension2, prd_randomdimension3,    prd_randomdimension4, prd_randomdimension5, prd_randomdimension6,    prd_randomdimension7, prd_randomdimension8, prd_randomarea,    prd_weightperpiece, prd_pieces, prd_piecestype, prd_measure,    prd_x12measureum, prd_measuretype, prd_measurequalifier, prd_theoreticalweight, prd_x12theoreticalweightum, prd_theoreticalnetgrossweight, prd_actualweight, prd_x12actualweightum, prd_actualnetgrossweightqualifier, prd_coillength, prd_x12coillengthum,    prd_coillengthtype,    prd_cutnumber, prd_coilinnerdiameter, prd_coilouterdiameter,    prd_stxcoilouterdiameter,  prd_facewidth,   prd_actualwidth1,    prd_actualwidth2, prd_actuallength1, prd_actuallength2, prd_actualid1, prd_actualid2, prd_actualod1, prd_actualod2, prd_actualgauge1, prd_actualgauge2, prd_actualdiagonal1, prd_actualdiagonal2,    prd_actualflatness1, prd_actualflatness2,    prd_externalordernumber,  prd_externalorderitem,   prd_externalorderrelease,  prd_externalorderdate,    prd_externalcontractnumber,   prd_enduserpo,   prd_enduserreference,   prd_partcustomerid,    prd_partnumber,   prd_partrevisionnumber,     prd_partdescription,     prd_meltedzone,      prd_meltedzonecountry,     prd_originzone,     prd_originzonecountry,      "prd_Item_cons_or_prod",     prd_label_id,  prd_form,      prd_grade,      prd_size,      prd_finish,      prd_ext_fin_desc, prd_size_desc, prd_wgt_type, prd_net_gross_wgt, prd_referencelinenumber,prd_flow_flag)  
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96, $97, $98, $99, $100, $101, $102, $103, $104, $105);`, [
                Header.hdr_type, //prd_type
                Header.hdr_key,  //prd_key
                ChgOutDtl.chgoutdtl_hlo, //prd_itemnumber,
                null,//prd_taglotid,
                ChgOutDtl.chgoutdtl_mcoil,//prd_externaltagid,
                null,//prd_customertagno,
                null,//prd_outsideprocessortagid,
                ChgOutDtl.chgoutdtl_mcoil,//prd_vendortagid,   
                null, //prd_millorderno,
                null,//prd_vendorreference,
                null,//prd_x12packagingcode,
                ChgOutDtl.chgoutdtl_mcls, //prd_materialclassification,
                null,//prd_materialclassificationdatetime, 
                ChgOutDtl.chgoutdtl_msts? ChgOutDtl.chgoutdtl_msts : null, //prd_materialstatus,
                null, //prd_materialstatusdatetime
                null, //prd_processeddate
                null, //prd_reapplicationaction,
                null, //prd_opscurrentprocess,
                null, //prd_mill,
                ChgOutDtl.chgoutdtl_heat, //prd_heat,
                null, //prd_density,
                null, //prd_coilform,
                null, //prd_dimensiondesignator,
                ChgOutDtl.chgoutdtl_widin? ChgOutDtl.chgoutdtl_widin : ChgOutDtl.chgoutdtl_widmm ? ChgOutDtl.chgoutdtl_widmm : null, //prd_width,
                ChgOutDtl.chgoutdtl_widin? 'IN' : ChgOutDtl.chgoutdtl_widmm ? 'MM' : null, //prd_x12widthum,
                null,  //ChgOutDtl.chgindtl_edge22 !== undefined && ChgOutDtl.chgindtl_edge22 !== null && ChgOutDtl.chgindtl_edge22 !== "" ? Number(ChgOutDtl.chgindtl_edge22) : null, //prd_edgedesignation,
                ChgOutDtl.chgoutdtl_ulenin ? ChgOutDtl.chgoutdtl_ulenin : ChgOutDtl.chgoutdtl_ulenmm ? ChgOutDtl.chgoutdtl_ulenmm : null, //prd_length,
                ChgOutDtl.chgoutdtl_ulenin ? 'IN' : ChgOutDtl.chgoutdtl_ulenmm ? 'MM' : null, //prd_x12lengthum,
                ChgOutDtl.chgoutdtl_gaugin ? Number(ChgOutDtl.chgoutdtl_gaugin) : ChgOutDtl.chgoutdtl_gaugmm ? Number(ChgOutDtl.chgoutdtl_gaugmm) : null, //prd_gaugesize 
                ChgOutDtl.chgoutdtl_gaugin ? 'IN' : ChgOutDtl.chgoutdtl_gaugmm ? 'MM' : null, //prd_x12gaugeum,
                null, //prd_innerdiameter,
                null, //prd_x12innerdiameterum,
                null, //prd_outerdiameter,
                null, //prd_x12outerdiameterum,
                null, //prd_randomdimension1,
                null, //prd_randomdimension2,
                null, //prd_randomdimension3,
                null, //prd_randomdimension4,
                null, //prd_randomdimension5,
                null, //prd_randomdimension6,
                null, //prd_randomdimension7,
                null, //prd_randomdimension8,
                null, //prd_randomarea,
                null, //prd_weightperpiece,
                ChgOutDtl.chgoutdtl_pcs, //prd_pieces,
                "A",  //prd_piecestype,
                null, //prd_measure,
                null, //prd_x12measureum,
                null, //prd_measuretype,
                null, //prd_measurequalifier,
                ChgOutDtl.chgoutdtl_twgtlb ? ChgOutDtl.chgoutdtl_twgtlb : ChgOutDtl.chgoutdtl_twgtkg ? ChgOutDtl.chgoutdtl_twgtkg : null, // prd_theoreticalweight,
                ChgOutDtl.chgoutdtl_twgtlb ? 'LB' : ChgOutDtl.chgoutdtl_twgtkg ? 'KG' : null, //prd_x12actualweightum,
                null, // prd_theoreticalnetgrossweight,
                ChgOutDtl.chgoutdtl_awgtlb ? ChgOutDtl.chgoutdtl_awgtlb : ChgOutDtl.chgoutdtl_awgtkg ? ChgOutDtl.chgoutdtl_awgtkg : null, // prd_actualweight,
                ChgOutDtl.chgoutdtl_awgtlb ? 'LB' : ChgOutDtl.chgoutdtl_awgtkg ? 'KG' : null, // prd_x12actualweightum,
                null, // prd_actualnetgrossweightqualifier, 
                ChgOutDtl.chgoutdtl_lnft ? ChgOutDtl.chgoutdtl_lnft : ChgOutDtl.chgoutdtl_lnmt ? ChgOutDtl.chgoutdtl_lnmt : null, // prd_coillength,
                ChgOutDtl.chgoutdtl_lnft ? 'FT' : ChgOutDtl.chgoutdtl_lnmt ? 'MR' : null, // prd_x12coillengthum,
                "T", //prd_coillengthtype,
                null, //prd_cutnumber, 
                ChgOutDtl.chgoutdtl_idin ? ChgOutDtl.chgoutdtl_idin : ChgOutDtl.chgoutdtl_idmm ? ChgOutDtl.chgoutdtl_idmm : null, // prd_coilinnerdiameter,
                ChgOutDtl.chgoutdtl_odin ? ChgOutDtl.chgoutdtl_odin : ChgOutDtl.chgoutdtl_odmm ? ChgOutDtl.chgoutdtl_odmm : null, // prd_coilouterdiameter,
                null, //prd_stxcoilouterdiameter,
                null, //prd_facewidth,
                null, //prd_actualwidth1,
                null, //prd_actualwidth2,
                null, //prd_actuallength1, 
                null, //prd_actuallength2,
                null, //prd_actualid1,
                null, //prd_actualid2,
                null, //prd_actualod1,
                null, //prd_actualod2,
                null, //prd_actualgauge1,
                null, //prd_actualgauge2,
                null, //prd_actualdiagonal1,
                null, //prd_actualdiagonal2,
                null, //prd_actualflatness1,
                null, //prd_actualflatness2,
                ChgOutDtl.chgoutdtl_po, //prd_externalordernumber,
                null, //prd_externalorderitem,
                ChgOutDtl.chgoutdtl_rls, //prd_externalorderrelease,
                ChgOutDtl.chgoutdtl_pod, //prd_externalorderdate,
                ChgOutDtl.chgoutdtl_contractno, //prd_externalcontractnumber,
                ChgOutDtl.chgoutdtl_po, //prd_enduserpo,
                null, //prd_enduserreference,
                null, //prd_partcustomerid,
                ChgOutDtl.chgoutdtl_cpart, // prd_partnumber,
                null, //prd_partrevisionnumber,  
                null, //prd_partdescription
                null, //prd_meltedzone,
                null, //prd_meltedzonecountry,
                null, //prd_originzone,
                null, //prd_originzonecountry,
                null, //prd_Item_cons_or_prod
                null, //prd_label_id
                null, //prd_form
                ChgOutDtl.chgoutdtl_gc,//prd_grade
                null,//prd_size
                null,//prd_finish
                null,//prd_ext_fin_desc
                null,//prd_size_desc
                null,//prd_wgt_type
                null,//prd_net_gross_wgt
                "1", //prd_referencelinenumber
                flow //prd_flow_flag
    ]);
     })); // <-- Add this closing parenthesis for Promise.all
} catch (error) {console.error("Error inserting Invex data:", error);}
        //Invex Damages Table  (***FUTURE/NOT NEEDED IMPLEMENTATION***)
        // await pool.query(`INSERT INTO public."870_Invex_Damages"(
        // dmg_type, dmg_key, dmg_linenumber, dmg_damagecode, dmg_faultcode, dmg_flow_flag)
        // VALUES ($1, $2, $3, $4, $5, $6);`, [transformedData.damages]);

        //MARK: Product Item Name Address Table 
         //Invex Header Name Address Table
        await Promise.all(
            Names
                .filter(Names => Names.name_qual === 'M')
                .map(async (Names, index) => {

                    await pool.query(`INSERT INTO public."870_Invex_ProductItemNameAddress"(
	prna_type, prna_key, prna_addresstype, prna_edixaddresstype, prna_identificationcodequalifier, prna_identificationcode, prna_nameline1, prna_nameline2, prna_addressline1, prna_addressline2, prna_addressline3, prna_city, prna_postalcode, prna_countrycode, prna_stateprovincecode, prna_telareacode, prna_telnumber, prna_telextension, prna_faxareacode, prna_faxnumber, prna_faxextension, prna_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23);`, [
                        Header.hdr_type,
                        Header.hdr_key,
                        Names.name_qual,
                        null,
                        Names.name_qual_id, 
                        Names.name_name_id,
                        Names.name_name,
                        null,
                        null, 
                        Names.name_addr1,
                        Names.name_addr2,
                        null,
                        Names.name_city,
                        Names.name_zpcd,
                        Names.name_ctry_cd,
                        Names.name_state,
                        Names.name_cont_phn, 
                        null,
                        null, 
                        null, 
                        null, 
                        flow,
                        null
                    ]);
                }))

        //Invex Transaction Errors Table (***FUTURE/NOT NEEDED IMPLEMENTATION***)
    //     await pool.query(`INSERT INTO public."870_Invex_TransactionErrors"(
	// txer_type, txer_key, txer_lineno, txer_messagetext, txer_flow_flag)
	// VALUES ($1, $2, $3, $4, $5);`, [transformedData.transactionErrors]);
    console.log("Insertion completed for 870 Invex Inbound with key:", Header.hdr_key);            
    } catch (error) {
       // const readableErrorMessage = readableErrors(error, header.hdr_key, filePath);
        //console.error('-', header.hdr_key, '-\n', readableErrorMessage, '\n-', header.hdr_key, '-');
        console.log(error)
 
    }
}
module.exports = {
    insert870InvexInbound
};
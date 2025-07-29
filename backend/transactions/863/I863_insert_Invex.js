async function insert863InvexInbound(pool, header, details, measurements, names) {
    // Insert the transformed data into the respective output tables
    // Map SNF tables to Invex JSON Structure 
    const flow = "I"
    try {
        
        // MARK: Interchange Control Table
        //Invex Interchange Control Table
        await pool.query(`INSERT INTO public."863_Invex_InterchangeControl"(
	ictl_type, ictl_key, ictl_companyid, ictl_senderinterchangeidqualifier, ictl_senderinterchangeid, ictl_edixcontrolnumber, ictl_receiverinterchangeidqualifier, ictl_receiverinterchangeid, ictl_createddatetime, ictl_alternateinterchangenumber, ictl_status, ictl_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`, 
        [
                header.hdr_type, 
                header.hdr_key,
                "STX",
                null,
                header.hdr_isnd_id,
                header.hdr_ictl_no,  
                null,
                header.hdr_ircv_id,
                header.hdr_crt_dat + String(header.hdr_crt_tim).padStart(6, '0'),
                header.hdr_ictl_no,
                null,
                flow
        ]);

       // MARK: Transaction Set Table
       //Invex Transaction Set Table
        await pool.query(`INSERT INTO public."863_Invex_TransactionSet"(
	txs_type, txs_key, txs_transactionsetcontrolnumber, txs_edistandardsorganizationtransactionset, txs_edistandardsorganization, txs_status, txs_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7);`, [
                header.hdr_type,
                header.hdr_key,
                header.hdr_stctl_no,
                '863',
                'X',
                null,
                flow
        ]);


       // MARK: Shipment Header Table
       // Invex Shipment Item Table
        await pool.query(`INSERT INTO public."863_Invex_ShipmentHeaderTestResult"(
	tres_type, tres_key, tres_transactionreference ,tres_manifestnumber ,tres_vendorshipmentreference ,tres_shippingdatetime ,tres_transactionsetpurposecode ,tres_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8 );`, [
                header.hdr_type,
                header.hdr_key,
                header.hdr_bol_no,
                header.hdr_bol_no,
                header.hdr_mbol_no,
                header.hdr_shp_dte && header.hdr_shp_tme ? header.hdr_shp_dte + String(header.hdr_shp_tme).padStart(6, '0') : null,
                null,
                flow
        ]);

        //MARK: Header Name Address Table
        //Invex Header Name Address Table
        await Promise.all(
            names
                .filter(names => names.name_qual !== 'DE' && names.name_qual !== '')
                .map(async (names, index) => {
                    await pool.query(`INSERT INTO public."863_Invex_HeaderNameAddress"(
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
                        names.name_zip,
                        names.name_ctry_cd,
                        names.name_state,
                        names.name_cont_phn, 
                        null,
                        null, 
                        null, 
                        null, 
                        null, 
                        flow
                    ]);
                })
        )


        //MARK: Shipment Item Table
        //Invex Shipment Item Test Result Table
        await Promise.all(details.map(async details => {
        await pool.query(`INSERT INTO public."863_Invex_ShipmentItemTestResult"(    
        sitr_type, sitr_key, sitr_referencelinenumber, sitr_invexordernumber, sitr_externalordernumber, sitr_externalorderitem, sitr_externalorderrelease, sitr_externalorderdate, sitr_externalcontactnumber, sitr_enduserpo, sitr_flow_flag)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`, [
            header.hdr_type,
            header.hdr_key,
            null,
            null,
            details.dtl_po,
            null,
            null,
            details.dtl_pod,
            null,
            details.dtl_mo,
            flow
        ]);}));

        //MARK: Item Instructions Table
        //Invex Item Instructions Table
        await pool.query(`INSERT INTO public."863_Invex_ItemInstructions"(
        hdin_type, hdin_key, hdin_invexinstructiontype, hdin_text, hdin_flow_flag)
        VALUES ($1, $2, $3, $4, $5);`, [
                header.hdr_type,
                header.hdr_key,
                null, //Unknown need to be defined
                null, //Unknown need to be defined
                flow
        ]);

        await pool.query(`INSERT INTO public."863_Invex_ProductItem"(
        prd_type, prd_key, prd_itemnumber, prd_ref_itemnumber ,prd_taglotid, prd_externaltagid, prd_customertagno, prd_outsideprocessortagid, prd_vendortagid, prd_millorderno, prd_vendorreference, prd_x12packagingcode, prd_materialclassification, prd_matericalclassificationdatetime, prd_materialstatus, prd_materialstatusdatetime, prd_processeddate, prd_reapplicationaction, prd_opscurrentprocess, prd_mill, prd_heat, prd_density, prd_coilform, prd_dimensiondesignator, prd_width, prd_x12widthum, prd_edgedesignation, prd_length, prd_x12lengthum, prd_gaugesize, prd_x12gaugeum, prd_innerdiameter, prd_x12innerdiameterum, prd_outerdiameter, prd_x12outerdiameterum, prd_randomdimension1, prd_randomdimension2, prd_randomdimension3, prd_randomdimension4, prd_randomdimension5, prd_randomdimension6, prd_randomdimension7, prd_randomdimension8, prd_randomarea, prd_weightperpiece, prd_pieces, prd_piecestype, prd_measure, prd_x12measureum, prd_measuretype, prd_measurequalifier, prd_theoreticalweight, prd_x12theoreticalweightum, prd_theoreticalnetgrossweight, prd_actualweight, prd_x12actualweightum, prd_actualnetgrossweightqualifier, prd_coillength, prd_x12coillengthum, prd_coillengthtype, prd_cutnumber, prd_coilinnerdiameter, prd_coilouterdiameter, prd_facewidth, prd_actualwidth1, prd_actualwidth2, prd_actuallength1, prd_actuallength2, prd_actualid1, prd_actualid2, prd_actualod1, prd_actualod2, prd_actualgauge1, prd_actualgauge2, prd_actualdiagonal1, prd_actualdiagonal2, prd_actualflatness1, prd_actualflatness2, prd_externalordernumber, prd_externalorderitem, prd_externalorderrelease, prd_externalorderdate, prd_externalcontractnumber, prd_enduserpo, prd_enduserreference, prd_partcustomerid, prd_partnumber, prd_partrevisionnumber, prd_partdescription, prd_flow_flag)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90);`, [
                header.hdr_type,
                header.hdr_key,
                null,
                null,
                null, 
                details.dtl_mcoil?.split("-")[0] || "",
                null,
                null,
                details.dtl_mcoil?.split("-")[0] || "",
                details.dtl_mo,
                null,
                null,
                null,
                null,
                null, 
                null,
                details.dtl_pdat, 
                null, 
                null, 
                null, 
                details.dtl_heat,
                null,
                null, 
                null, 
                measurements.msr_mea3,
                measurements.msr_mea4,
                null,
                measurements.msr_mea3,
                measurements.msr_mea4,
                measurements.msr_mea3,
                measurements.msr_mea4,
                measurements.msr_mea3,
                measurements.msr_mea4,
                measurements.msr_mea3,
                measurements.msr_mea4,
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
                measurements.msr_mea3,
                null,
                measurements.msr_mea3,
                measurements.msr_mea4,
                null,
                measurements.msr_mea2,
                measurements.msr_mea3,
                measurements.msr_mea4,
                measurements.msr_mea3,
                measurements.msr_mea3,
                measurements.msr_mea4,
                measurements.msr_mea3,
                measurements.msr_mea3,
                measurements.msr_mea4,
                null, 
                null, 
                measurements.msr_mea3,
                measurements.msr_mea3,
                measurements.msr_mea3,
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
                details.dtl_po, 
                details.dtl_mol,
                null, 
                details.dtl_pod,
                null,
                details.dtl_mo, 
                null, 
                null, 
                details.dtl_part,
                null, 
                null,
                flow
        ]);

        //MARK: Chemistry Table
        //Invex Chemistry Table
        await Promise.all(
            measurements
                .filter(chem => chem["msr_mea1"] === "CH")
                .map(chem =>
                    pool.query(`INSERT INTO public."863_Invex_Chemistry"(
                        chm_type, chm_key, chm_linenumber, chm_x12chemelement, chm_entrytype, chm_value, chm_minvalue, chm_maxvalue, chm_flow_flag
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`, [
                        chem.msr_type,
                        chem.msr_key,
                        null, 
                        chem.msr_mea2,
                        'V',
                        chem.msr_mea3,
                        chem.msr_mea3, 
                        chem.msr_mea3, 
                        flow
                    ])
                )
        );
        //MARK: Invex Physical Test
        //Invex Invex Physical Test
        await pool.query(`INSERT INTO public."863_Invex_PhysicalTests"(
	phts_type,phts_key,phts_linenumber,phts_x12testdirection,phts_x12physicaltest,phts_entrytype,phts_value,phts_minvalue,phts_maxvalue,phts_alphavalue,phts_x12unitofmeasure,phts_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`, [
                header.hdr_type,
                header.hdr_key,
                null, //Unknown need to be defined
                measurements.msr_sdir,
                null,
                null,
                measurements.msr_mea3,
                measurements.msr_mea3,
                measurements.msr_mea3,
                null,
                measurements.msr_mea4, 
                flow
        ]);

        // MARK: Jominy Table
        // Invex Jominy Table
        await pool.query(`INSERT INTO public."863_Invex_Jominy"(
                jmny_type, jmny_key, jmny_linenumber, jmny_testtype, jmny_readingposition, jmny_entrytype, jmny_value, jmny_minvalue, jmny_maxvalue, jmny_flow_flag)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10 );`, [
                header.hdr_type,
                header.hdr_key,
                null,
                measurements.msr_mea2,
                measurements.msr_mea9,
                null,
                measurements.msr_mea3,
                measurements.msr_mea3,
                measurements.msr_mea3,
                flow
        ]);


        // MARK: Heat Treatment Table
        // Invex Heat Treatment Table
        await pool.query(`INSERT INTO public."863_Invex_HeatTreatment"(
                htrt_type, htrt_key, htrt_linenumber, htrt_heattreatmentcode, htrt_heattreatmenttemp, htrt_x12heattreatmenttempmeasure, htrt_heattreatmenttime, htrt_coolantmethod, htrt_coolanttemp, htrt_flow_flag)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10 );`, [
                header.hdr_type,
                header.hdr_key,
                null,
                measurements.msr_meth,
                null, 
                null, 
                null,
                null, 
                null, 
                flow
        ]);

        // MARK: Impact Table
        // Invex Impact Table
        await pool.query(`INSERT INTO public."863_Invex_Impact"(
                impt_type, impt_key, impt_linenumber, impt_testtype, impt_entrytype, impt_value, impt_minvalue, impt_maxvalue, impt_flow_flag)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12 );`, [
                header.hdr_type,
                header.hdr_key,
                null,
                measurements.msr_mea2,
                measurements.msr_sdir,
                measurements.msr_mea4,
                null,                
                null,                
                measurements.msr_mea3,
                measurements.msr_mea3,
                measurements.msr_mea3, 
                flow
        ]);

        // MARK: Invex_MicroInclusion Table
        // Invex Invex_MicroInclusion Table
        await pool.query(`INSERT INTO public."863_Invex_MicroInclusion"(
                micl_type, micl_key, micl_linenumber, micl_x12microinclusiontype, micl_x12microinclusionqualifier, micl_thinresulta, micl_thickresulta, micl_thinresultb, micl_thickresultb, micl_thinresultc, micl_thickresultc, micl_thinresultd, micl_thickresultd, micl_flow_flag)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`, [
                header.hdr_type,
                header.hdr_key,
                null,
                measurements.msr_mea2,
                measurements.msr_mea3,         
                measurements.msr_mea3,
                measurements.msr_mea3,
                measurements.msr_mea3, 
                measurements.msr_mea3,         
                measurements.msr_mea3,
                measurements.msr_mea3,
                measurements.msr_mea3,
                flow
        ]);

        //MARK: 863 Invex QDSInstructions Table
        //Invex 863 Invex QDSInstructions Table
        await pool.query(`INSERT INTO public."863_Invex_QDSInstructions"(
                qdsi_type, qdsi_key, qdsi_invexinstructiontype, qdsi_text, qdsi_flow_flag)
	        VALUES ($1, $2, $3, $4, $5);`, [
                header.hdr_type,
                header.hdr_key,
                null, 
                null, 
                flow
        ]);

        //MARK: Invex Product Item Name Address Table
        //Invex Invex_Product Item Name Address Table
        await Promise.all(
            names
                .filter(names => names.name_qual === 'M')
                .map(async (names, index) => {
                    await pool.query(`INSERT INTO public."863_Invex_ProductItemNameAddress"(
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
                names.name_zip,
                names.name_ctry_cd,
                names.name_state,
                names.name_cont_phn, 
                null,
                null, 
                null, 
                null, 
                null, 
                flow
                ]);
        }))

        //Invex Transaction Errors Table (***FUTURE/NOT NEEDED IMPLEMENTATION***)
        // await pool.query(`INSERT INTO public."856_Invex_TransactionErrors"(
        // txer_type, txer_key, txer_lineno, txer_messagetext, txer_flow_flag)
        // VALUES ($1, $2, $3, $4, $5);`, [transformedData.transactionErrors]);
    }
    catch (error) {
        console.error('-', header.hdr_key, '-\n',"Error in insert863InvexInbound:", error,'\n-', header.hdr_key, '-');
    }
}
module.exports = {
    insert863InvexInbound
};
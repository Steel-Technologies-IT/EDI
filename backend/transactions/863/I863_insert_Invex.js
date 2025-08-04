async function insert863InvexInbound(pool, header, details, measurements, names, notes, detailNotes) {
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
                header.hdr_type,   //$1
                header.hdr_key,  //$2
                "STX",       //$3
                header.hdr_isa_qual,           //$4
                header.hdr_isnd_id,  //$5
                header.hdr_ictl_no,     //$6  
                header.hdr_ircv_qual,       //$7
                header.hdr_ircv_id,     //$8          
                header.hdr_crt_dat + String(header.hdr_crt_tim).padStart(6, '0'),   //$9
                header.hdr_ictl_no, //$10
                null, //$11
                flow //$12
        ]);

       // MARK: Transaction Set Table
       //Invex Transaction Set Table
        await pool.query(`INSERT INTO public."863_Invex_TransactionSet"(
	        txs_type, txs_key, txs_transactionsetcontrolnumber, txs_edistandardsorganizationtransactionset, txs_edistandardsorganization, txs_status, txs_flow_flag)
	        VALUES ($1, $2, $3, $4, $5, $6, $7);`, [
                header.hdr_type, //$1
                header.hdr_key,  //$2
                header.hdr_stctl_no,  //$3
                '863',  //$4
                'X',  //$5
                null,   //$6
                flow    //$7
        ]);


       // MARK: Shipment Header Table
       // Invex Shipment Item Table
        await pool.query(`INSERT INTO public."863_Invex_ShipmentHeaderTestResult"(
	         tres_type, tres_key, tres_transactionreference ,tres_manifestnumber ,tres_vendorshipmentreference ,tres_shippingdatetime ,tres_transactionsetpurposecode ,tres_flow_flag)
	        VALUES ($1, $2, $3, $4, $5, $6, $7, $8 );`, [
                header.hdr_type,  //$1
                header.hdr_key,  //$2
                header.hdr_bol_no,  //$3
                header.hdr_bol_no,  //$4
                header.hdr_mbol_no,  //$5
                header.hdr_shp_dte && header.hdr_shp_tme ? header.hdr_shp_dte + String(header.hdr_shp_tme).padStart(6, '0') : null, //$6
                null, //$7
                flow //$8
        ]);

        //MARK: Header Name Address Table
        //Invex Header Name Address Table
        await Promise.all(
            names.filter(names => names.name_qual !== 'DE' && names.name_qual !== '')
                .map(async (names, index) => {
                    console.log(names.name_qual_id);
                    console.log(names.name_qual);
                    await pool.query(`INSERT INTO public."863_Invex_HeaderNameAddress"(
                     hdna_type, hdna_key, hdna_addresstype, hdna_identificationcodequalifier, hdna_identificationcode, hdna_nameline1, hdna_nameline2, hdna_addressline1, hdna_addressline2, hdna_addressline3, hdna_city, hdna_postalcode, hdna_countrycode, hdna_stateprovincecode, hdna_telareacode, hdna_telnumber, hdna_telextension, hdna_faxareacode, hdna_faxnumber, hdna_faxextension, hdna_flow_flag)
                      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);`, [
                        header.hdr_type,  //$1
                        header.hdr_key,  //$2
                        names.name_qual,  //$3
                        names.name_qual_id,  //$4
                        names.name_id,  //$5
                        names.name_name,  //$6
                        null,       //$7
                        names.name_addr1,  //$8
                        names.name_addr2,  //$9
                        null,  //$10
                        names.name_city,  //$11
                        names.name_zip,  //$12
                        names.name_ctry_cd,  //$13
                        names.name_state,  //$14
                        names.name_cont_phn,    //$15
                        null,   //$16
                        null,   //$17
                        null,   //$18
                        null,   //$19
                        null,   //$20
                        flow    //$21
                    ]);
                })
        )


        //MARK: Shipment Item Test Result Table
        //Invex Shipment Item Test Result Table
        await Promise.all(details.map(async details => {
        await pool.query(`INSERT INTO public."863_Invex_ShipmentItemTestResult"(    
              sitr_type, sitr_key, sitr_referencelinenumber, sitr_invexordernumber, sitr_externalordernumber, sitr_externalorderitem, sitr_externalorderrelease, sitr_externalorderdate, sitr_externalcontactnumber, sitr_enduserpo, sitr_flow_flag)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`, [
            header.hdr_type,  //$1
            header.hdr_key,  //$2
            details.dtl_line,  //$3
            null,  //$4
            details.dtl_po,  //$5
            null,   //$6
            null,   //$7
            details.dtl_pod,    //$8
            null,   //$9
            details.dtl_mo, //$10
            flow    //$11
        ]);}));

        //MARK: Item Instructions Table
        //Invex Item Instructions Table
        
        try {   
            detailNotes ? 
        await Promise.all(detailNotes.map(async detailNotes => {
        await pool.query(`INSERT INTO public."863_Invex_ItemInstructions"(
        itin_type, itin_key, itin_invexinstructiontype, itin_text, itin_flow_flag)
        VALUES ($1, $2, $3, $4, $5);`, [
                header.hdr_type,  //$1
                header.hdr_key, //$2
                null, //$3 Unknown need to be defined  
                detailNotes.dtl_note,  //$4
                flow  //$5
        ]);})) : null;        
        } catch (error) {console.error("Error inserting Item Instructions:", error);}

        //MARK: Product Item Table
        //Invex Product Item Table  
        await Promise.all(details.map(async details => {
                const width = measurements.find(m => 
                    ["WD"].includes(m["msr_mea2"]) && 
                    ["IN","ED","EM","E8","MM","MB","MZ","M2"].includes(m["msr_mea4"]) && 
                    m.msr_key === details.dtl_key && 
                    m.msr_line === details.dtl_line
                );
                const length = measurements.find(m =>
                    ["LN"].includes(m["msr_mea2"]) && 
                    ["IN","ED","EM","E8","MM","MB","MZ","M2"].includes(m["msr_mea4"]) &&m.msr_key === details.dtl_key && 
                    m.msr_line === details.dtl_line
                ); 
                const gauge = measurements.find(m =>
                    ["TH"].includes(m["msr_mea2"]) && 
                    ["IN","ED","EM","E8","MM","MB","MZ","M2"].includes(m["msr_mea4"]) && 
                    m.msr_key === details.dtl_key && 
                    m.msr_line === details.dtl_line
                );
                const innerDiameter = measurements.find(m =>
                    ["ID"].includes(m["msr_mea2"]) && 
                    ["IN","ED","EM","E8","MM","MB","MZ","M2"].includes(m["msr_mea4"]) && 
                    m.msr_key === details.dtl_key && 
                    m.msr_line === details.dtl_line
                );
                const outerDiameter = measurements.find(m =>
                    ["OD"].includes(m["msr_mea2"]) && 
                    ["IN","ED","EM","E8","MM","MB","MZ","M2"].includes(m["msr_mea4"]) && 
                    m.msr_key === details.dtl_key && 
                    m.msr_line === details.dtl_line
                );
                const numofpieces = measurements.find(m =>
                    ["PC"].includes(m["msr_mea4"]) && 
                    m.msr_key === details.dtl_key && 
                    m.msr_line === details.dtl_line
                );
                const theoWgt = measurements.find(m =>
                    ["WT"].includes(m["msr_mea2"]) &&
                    ["24","53"].includes(m["msr_mea4"]) &&  
                    m.msr_key === details.dtl_key && 
                    m.msr_line === details.dtl_line
                );
                const actWgt = measurements.find(m =>
                    ["WT"].includes(m["msr_mea2"]) &&
                    ["01", "LB", "50", "KG"].includes(m["msr_mea4"]) &&  
                    m.msr_key === details.dtl_key && 
                    m.msr_line === details.dtl_line
                );
                const linearFt = measurements.find(m =>
                    ["LN"].includes(m["msr_mea2"]) &&
                    ["FT", "LF", "LM", "MT"].includes(m["msr_mea4"]) &&  
                    m.msr_key === details.dtl_key && 
                    m.msr_line === details.dtl_line
                );

        await pool.query(`INSERT INTO public."863_Invex_ProductItem"(
              prd_type, prd_key, prd_itemnumber, prd_taglotid, prd_externaltagid, prd_customertagno, prd_outsideprocessortagid, prd_vendortagid, prd_millorderno, prd_vendorreference, prd_x12packagingcode, prd_materialclassification, prd_matericalclassificationdatetime, prd_materialstatus, prd_materialstatusdatetime, prd_processeddate, prd_reapplicationaction, prd_opscurrentprocess, prd_mill, prd_heat, prd_density, prd_coilform, prd_dimensiondesignator, prd_width, prd_x12widthum, prd_edgedesignation, prd_length, prd_x12lengthum, prd_gaugesize, prd_x12gaugeum, prd_innerdiameter, prd_x12innerdiameterum, prd_outerdiameter, prd_x12outerdiameterum, prd_randomdimension1, prd_randomdimension2, prd_randomdimension3, prd_randomdimension4, prd_randomdimension5, prd_randomdimension6, prd_randomdimension7, prd_randomdimension8, prd_randomarea, prd_weightperpiece, prd_pieces, prd_piecestype, prd_measure, prd_x12measureum, prd_measuretype, prd_measurequalifier, prd_theoreticalweight, prd_x12theoreticalweightum, prd_theoreticalnetgrossweight, prd_actualweight, prd_x12actualweightum, prd_actualnetgrossweightqualifier, prd_coillength, prd_x12coillengthum, prd_coillengthtype, prd_cutnumber, prd_coilinnerdiameter, prd_coilouterdiameter, prd_facewidth, prd_actualwidth1, prd_actualwidth2, prd_actuallength1, prd_actuallength2, prd_actualid1, prd_actualid2, prd_actualod1, prd_actualod2, prd_actualgauge1, prd_actualgauge2, prd_actualdiagonal1, prd_actualdiagonal2, prd_actualflatness1, prd_actualflatness2, prd_externalordernumber, prd_externalorderitem, prd_externalorderrelease, prd_externalorderdate, prd_externalcontractnumber, prd_enduserpo, prd_enduserreference, prd_partcustomerid, prd_partnumber, prd_partrevisionnumber, prd_partdescription, prd_flow_flag)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89);`, [
                header.hdr_type,  //$1
                header.hdr_key,     //$2
                details.dtl_line,       //$3
                null,       //$4
                details.dtl_mcoil?.split("-")[0] || "",     //$5
                null,       //$6
                null,       //$7
                details.dtl_prev_proc_tag_id ? details.dtl_prev_proc_tag_id : details.dtl_mcoil?.split("-")[0] || "",     //$8
                details.dtl_mo,     //$9
                null,       //$10
                null,       //$11
                null,   //$12
                null,   //$13
                null,   //$14 
                null,   //$15
                details.dtl_pdat ? details.dtl_pdat : null,   //$16
                null,   //$17
                null,   //$18
                null,   //$19
                details.dtl_heat,   //$20
                null,   //$21
                null,   //$22 
                null,   //$23
                width ? width.msr_mea3 : null,   //$24
                width ? width.msr_mea4 : null,   //$25
                null,   //$26
                length ? length.msr_mea3 : null,  //$27
                length ? length.msr_mea4 : null,  //$28
                gauge ? gauge.msr_mea3 : null,   //$29
                gauge ? gauge.msr_mea4 : null,   //$30
                innerDiameter ? innerDiameter.msr_mea3 : null,   //$31
                innerDiameter ? innerDiameter.msr_mea4 : null,   //$32
                outerDiameter ? outerDiameter.msr_mea3 : null,   //$33
                outerDiameter ? outerDiameter.msr_mea4 : null,   //$34
                null,   //$35
                null,   //$36
                null,   //$37
                null,   //$38
                null,   //$39      
                null,   //$40 
                null,   //$41 
                null,   //$42
                null,   //$43
                null,   //$44 
                numofpieces ? numofpieces.msr_mea3 : null,   //$45
                null,   //$46
                null,   //$47
                null,   //$48
                null,   //$49
                null,   //$50
                theoWgt ? theoWgt.msr_mea3 : null,   //$51
                theoWgt ? theoWgt.msr_mea4 : null,   //$52
                null,  //$53 Gross weight qualifier
                actWgt ? actWgt.msr_mea3 : null,  //$54
                actWgt ? actWgt.msr_mea4 : null,  //$55
                null, //$56 Gross weight qualifier   
                linearFt ? linearFt.msr_mea3 : null,  //$57
                linearFt ? linearFt.msr_mea4 : null,  //$58
                null,   //$59
                null,   //$60
                null,   //$61    
                null,   //$62
                null,   //$63
                null,   //$64
                null,   //$65
                null,   //$66
                null,   //$67
                null,   //$68
                null,   //$69
                null,   //$70
                null,   //$71
                null,   //$72
                null,   //$73
                null,   //$74
                null,   //$75
                null,   //$76
                null,   //$77
                details.dtl_po,     //$78
                details.dtl_mol,    //$79
                null,   //$80
                details.dtl_pod ? details.dtl_pod : null,    //$81
                null,   //$82
                details.dtl_mo,     //$83
                null,   //$84
                null,   //$85
                details.dtl_part,   //$86
                null,   //$87
                null,   //$88
                flow    //$89       
        ]);}));

        //MARK: Chemistry Table
        //Invex Chemistry Table
        try {
        await Promise.all(
            measurements
                .filter(chem => chem["msr_mchr"] === "68")
                .map((chem,index) =>
                    pool.query(`INSERT INTO public."863_Invex_Chemistry"(
                        chm_type, chm_key, chm_linenumber, chm_x12chemelement, chm_entrytype, chm_value, chm_minvalue, chm_maxvalue, chm_flow_flag
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`, [
                        chem.msr_type,  //$1
                        chem.msr_key,   //$2
                        chem.msr_line,   //$3
                        chem.msr_mea2,  //$4
                        'V',    //$5
                        chem.msr_mea3,  //$6
                        null,   //$7
                        null,   //$8
                        flow    //$9
                    ])
                )
        );
        } catch (error) {console.error("Error inserting Chemistry:", error);}   
        //MARK: Invex Physical Test
        //Invex Invex Physical Test

        try {
        await Promise.all(
                measurements
                .filter(phy => ["69", "71"].includes(phy["msr_mchr"]))
                .map((phy,index) =>
                    pool.query(`INSERT INTO public."863_Invex_PhysicalTests"(
	                phts_type,phts_key,phts_linenumber,phts_x12testdirection,phts_x12physicaltest,phts_entrytype,phts_value,phts_minvalue,phts_maxvalue,phts_alphavalue,phts_x12unitofmeasure,phts_flow_flag)
	                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`, [
                header.hdr_type,    //$1
                header.hdr_key,   //$2
                phy.msr_line, //$3 
                null, //$4 This was phy.msr_sdir
                phy.msr_mea2,   //$5
                'V',   //$6
                phy.msr_mea3,   //$7
                null,   //$8
                null,   //$9
                null,   //$10
                phy.msr_mea4,   //$11
                flow    //$12
              ])
                )
            );
        } catch (error) {console.error("Error inserting Invex data:", error);}   
        // MARK: Jominy Table
        // Invex Jominy Table
      /*  await pool.query(`INSERT INTO public."863_Invex_Jominy"(
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
                imp_type, imp_key, imp_linenumber, imp_testtype, imp_entrytype, imp_value, imp_minvalue, imp_maxvalue, imp_flow_flag)
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
                */
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
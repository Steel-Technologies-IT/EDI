// This module handles the insertion of parsed EDI 856 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.


const  readableErrors = require('../../functions/readableErrors.js');

async function LoadO856SNF(pool, InterchangeControl, TransactionSet, ShipmentHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, Chemistries, Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath) {

  let oldKey;
  let pkey;
  if (Array.isArray(ProductItem)) {
    for (const product of ProductItem) {
    
      oldKey = await pool.query(`
        SELECT dtl_key FROM "856_SNF_Detail"
        INNER JOIN "856_SNF_Names" names ON names.name_key = "856_SNF_Detail".dtl_key
        WHERE dtl_heat = $1
        AND dtl_mcoil = $2
        AND names.name_id = $3
      `, [
        product.prd_heat,
        product.prd_customertagno,
        ProductItemNameAddress[0].prna_identificationcode
      ]);
      if (oldKey.rows.length > 0) {
        pkey = oldKey.rows[0].dtl_key;
        
        // Only query for header, detail, names, and measure if pkey is found
        const orginalHeaderResults = await pool.query('SELECT * FROM "856_SNF_Header" WHERE hdr_key = $1', [pkey]);
        var orginalHeader = await orginalHeaderResults.rows[0];
        var orginalDetail = await pool.query('SELECT * FROM "856_SNF_Detail" WHERE dtl_key = $1', [pkey]);
        var orginalNames = await pool.query('SELECT * FROM "856_SNF_Names" WHERE name_key = $1', [pkey]);
        var orginalMeasure = await pool.query('SELECT * FROM "856_SNF_Measure" WHERE msr_key = $1', [pkey]);
        
        await InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ShipmentHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, 
          Chemistries, Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath,
        orginalHeader, orginalDetail, orginalNames, orginalMeasure
        )
        break;
      }
    }
  

  }
}

  async function InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ShipmentHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, Chemistries, Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath, orginalHeader, orginalDetail, orginalNames, orginalMeasure){
  
  await insert856Header(pool, InterchangeControl, ShipmentHeader,  orginalHeader, flag, filePath);
    // Address Insertion

  await Promise.all(ProductItemNameAddress.map(async address => {
      await insert856Names(pool, InterchangeControl, address, orginalHeader, flag, filePath);
  }));

  //Header Address Insertion
  await Promise.all(HeaderNameAddress.map(async address => {
    await insert856Names(pool, InterchangeControl, address, orginalHeader, flag, filePath);
  }));

  await Promise.all(Item.map(async Item => {
      await Promise.all(ProductItem.filter(ProductItem => ProductItem["HL Parent ID"] === Item["HL ID"]).map(async ProductItem => {
    await insert856Detail(pool, InterchangeControl, Item, ProductItem, orginalHeader, flag, filePath);
    }));
}));


   await Promise.all(Item.map(async Item => {
      await Promise.all(ProductItem.filter(ProductItem => ProductItem["HL Parent ID"] === Item["HL ID"]).map(async ProductItem => {
    await insert856Measure(pool, InterchangeControl, Item, ProductItem, HeaderNameAddress, orginalHeader,flag, filePath);
      }));
   }));

  

// //MARK: Header
// //856 Header Insert
async function insert856Header(pool, InterchangeControl, ShipmentHeader, originalHeader ,flag, filePath) {
  
  try {
    await pool.query(`
     INSERT INTO public."856_SNF_Header"(
      hdr_type, hdr_key, hdr_isa_qual, hdr_isnd_id, hdr_gsnd_id, hdr_ircv_id, 
      hdr_grcv_id, hdr_ictl_no, hdr_func_no, hdr_gctl_no, hdr_ircv_qual, 
      hdr_stctl_no, hdr_bsn_cd, hdr_bsn_no, hdr_bsn_dte, hdr_bsn_tme, 
      hdr_tran_typ, hdr_shp_dte, hdr_shp_tme, hdr_shp_tzn, hdr_bol_no, 
      hdr_mbol_no, hdr_pck_no, hdr_dck_cd, hdr_shp_grss_wgt_lb, 
      hdr_shp_grss_wgt_kg, hdr_shp_grss_wgt_uom, hdr_shp_net_wgt_lb, 
      hdr_shp_net_wgt_kg, hdr_shp_net_wgt_uom, hdr_shp_ttl_pc_cnt, 
      hdr_shp_itm_typ, hdr_shp_itm_cnt, hdr_rte_sq_cd, hdr_std_car_cd, 
      hdr_tspt_mthd, hdr_tspt_rt_name, hdr_shp_ord_sts, hdr_shp_loc_id, 
      hdr_eq_cd, hdr_eq_init, hdr_eq_nbr, hdr_shp_mthd_pmnt, hdr_sf_no, 
      hdr_st_no, hdr_shp_hl, hdr_shp_phl, hdr_shp_hl_cd, hdr_shp_hl_ccd, 
      hdr_swgt_typ, hdr_swgt, hdr_swgt_uom, hdr_sum_hl_seg, hdr_sum_hsh_ttl, 
      hdr_sttx_locn, hdr_crt_dat, hdr_crt_tim, hdr_crt_pgm, hdr_xref, hdr_flow_flag
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
      $51, $52, $53, $54, $55, $56, $57, $58, $59, $60)
    `, [
      originalHeader.hdr_type, //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      InterchangeControl.ictl_senderinterchangeidqualifier, //$3
      InterchangeControl.ictl_senderinterchangeid, //$4
      InterchangeControl.ictl_receiverinterchangeidqualifier, //$5
      InterchangeControl.ictl_receiverinterchangeid, //$6
      InterchangeControl.ictl_alternateinterchangenumber, //$7
      originalHeader.hdr_ictl_no, //$8 // Needs to be defined
      originalHeader.hdr_func_no, //$9 Needs to be defined
      originalHeader.hdr_gctl_no, //$10 Needs to be defined
      InterchangeControl.ictl_receiverinterchangeidqualifier, //$11
      originalHeader.hdr_stctl_no, //$12 Needs to be defined
      originalHeader.hdr_bsn_cd, //$13 Needs to be defined
      originalHeader.hdr_bsn_no, //$14 Needs to be defined
      originalHeader.hdr_bsn_dte, //$15 Needs to be defined
      originalHeader.hdr_bsn_tme, //$16 Needs to be defined
      originalHeader.hdr_tran_typ, //$17 Needs to be defined
      null, //$18
      null, //$19
      originalHeader.hdr_shp_tzn, //$20 Needs to be defined
      ShipmentHeader.ish_manifestreference, //$21 Might need to be switched with below
      ShipmentHeader.ish_transactionreference, // $22 Might need to be switched with above
      originalHeader.hdr_pck_no, // $23 Needs to be defined
      ShipmentHeader.ish_gatedock, //$24
      ShipmentHeader.ish_grossweight, //$25
      ShipmentHeader.ish_grossweight, //$26
      ShipmentHeader.ish_x12grossweightum, //$27
      ShipmentHeader.ish_netweight, //$28
      ShipmentHeader.ish_netweight, //$29
      ShipmentHeader.ish_x12netweightum, //$30
      originalHeader.hdr_shp_ttl_pc_cnt, //$31 Needs to be defined
      originalHeader.hdr_itm_typ, //$32 Needs to be defined
      originalHeader.hdr_itm_cnt, //$33 Needs to be defined
      originalHeader.hdr_rte_sq_cd, //$34 Needs to be defined
      originalHeader.hdr_std_car_cd, //$35 Needs to be defined
      ShipmentHeader.ish_x12transportationmethod, //$36
      ShipmentHeader.ish_transportroute, //$37
      originalHeader.hdr_shp_ord_sts, //$38 Needs to be defined
      originalHeader.hdr_shp_loc_id, //$39 Needs to be defined
      originalHeader.hdr_eq_cd, //$40 Needs to be defined
      originalHeader.hdr_eq_init, //$41 Needs to be defined
      originalHeader.hdr_eq_nbr, //$42 Needs to be defined
      ShipmentHeader.ish_x12shipmentmethodofpayment, //$43
      HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id || null, //44
      HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id || null, //45
      originalHeader.hdr_shp_hl, //$46 Needs to be defined
      originalHeader.hdr_shp_phl, //$47 Needs to be defined
      originalHeader.hdr_shp_hl_cd, //$48 Needs to be defined
      originalHeader.hdr_shp_hl_ccd, //$49 Needs to be defined
      originalHeader.hdr_swgt_typ, //$50 Needs to be defined
      originalHeader.hdr_swgt, //$51 Needs to be defined
      originalHeader.hdr_swgt_uom, //$52 Needs to be defined
      originalHeader.hdr_sum_hl_seg, //$53 Needs to be defined
      originalHeader.hdr_sum_hsh_ttl, //$54 Needs to be defined
      originalHeader.hdr_sttx_locn, //$55 Needs to be defined
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$56
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //57
      'O856SNF', //$58
      null,
      flag //$59
    ]);


  } catch (error) {
    console.log(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }
};

//MARK: Names
  //856 Names Insert
async function insert856Names(pool, InterchangeControl, Address, orginalHeader, flag, filePath) {
 try {
    await pool.query( `INSERT INTO public."856_SNF_Names"(
  name_typ, name_key, name_qual, name_qual_id, name_id, name_name, name_addr1, name_addr2, name_city, name_state, name_zpcd, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_crt_dte, name_crt_tme, name_crt_pgm, name_flow_flag)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);`,
  [
    orginalHeader.hdr_type, //$1
    InterchangeControl.ictl_edixcontrolnumber, //$2
    Address.hdna_addresstype ? Address.hdna_addresstype : Address.prna_addresstype, //$3
    Address.hdna_identificationcodequalifier ? Address.hdna_identificationcodequalifier : Address.prna_identificationcodequalifier, //$4
    Address.hdna_identificationcode ? Address.hdna_identificationcode : Address.prna_identificationcode, //$5
    Address.hdna_nameline1 ? Address.hdna_nameline1 : Address.prna_nameline1, //$6
    Address.hdna_addressline1 ? Address.hdna_addressline1 : Address.prna_addressline1, //$7
    Address.hdna_addressline2 ? Address.hdna_addressline2 : Address.prna_addressline2, //$8
    Address.hdna_city ? Address.hdna_city : Address.prna_city, //$9
    Address.hdna_stateprovincecode ? Address.hdna_stateprovincecode : Address.prna_stateprovincecode, //$10
    Address.hdna_postalcode ? Address.hdna_postalcode : Address.prna_postalcode, //$11
    Address.hdna_countrycode ? Address.hdna_countrycode : Address.prna_countrycode, //$12
    Address.hdna_contactname ? Address.hdna_contactname : Address.prna_contactname, //$13 Needs to be defined
    Address.hdna_telnumber ? Address.hdna_telnumber : Address.prna_telnumber, //$14
    Address.hdna_email ? Address.hdna_email : Address.prna_email, //$15 Needs to be defined
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)), //$16
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)), //$17
    'O856SNF', //$18
    flag //$19
  ]);
  } catch (error) {
    console.log(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
  }
}

//MARK: Detail
//856 Detail Insert
async function insert856Detail(pool, InterchangeControl, Item, ProductItem, orginalHeader, flag, filePath) {
 try {
 
  await pool.query(`INSERT INTO public."856_SNF_Detail"(
  dtl_type, dtl_key, dtl_hl1, dtl_hl2, dtl_hl3, dtl_hl4, dtl_bsn2, dtl_bol, dtl_heat, dtl_mcoil, dtl_prev, dtl_mo, dtl_mol, dtl_cpo, dtl_cpor, dtl_cpoc, dtl_cpod, dtl_cpol, dtl_ucpo, dtl_po, dtl_poc, dtl_pod, dtl_pol, dtl_rls, dtl_cpart, dtl_awgtlb, dtl_awgtkg, dtl_twgtlb, dtl_twgtkg, dtl_gaugin, dtl_gaugmm, dtl_gaugt, dtl_widin, dtl_widmm, dtl_ulenin, dtl_ulenmm, dtl_lnft, dtl_lnmt, dtl_idin, dtl_idmm, dtl_odin, dtl_odmm, dtl_pcs, dtl_qtyuom, dtl_grcd, dtl_mcls67, dtl_msts68, dtl_msts70, dtl_edge22, dtl_msa, dtl_n1sf, dtl_n1st, dtl_n1ma, dtl_ohl1, dtl_ohl2, dtl_ohl3, dtl_ohl4, dtl_shp, dtl_ouom, dtl_cqty, dtl_locn, dtl_odat, dtl_otim, dtl_opgm, dtl_apart, dtl_partd, dtl_mdat, dtl_osid, dtl_cshdt, dtl_lubdt, dtl_bhdt, dtl_xref, dtl_sttxpo, dtl_ccoil, dtl_tmpr, dtl_olin01, dtl_ilin01, dtl_corg, dtl_smelt1, dtl_smelt2, dtl_flow_flag)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81)`,
[
      orginalHeader.hdr_type, //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      InterchangeControl.ictl_hl1, //$3 Need to be defined
      InterchangeControl.ictl_hl2, //$4 Need to be defined
      InterchangeControl.ictl_hl3, //$5 Need to be defined
      InterchangeControl.ictl_hl4, //$6 Need to be defined
      InterchangeControl.ictl_bsn2, //$7 Need to be defined
      InterchangeControl.ictl_bol, //$8 Need to be defined
      ProductItem.prd_heat, //9
      ProductItem.prd_mcoil, //10 Need to be defined
      ProductItem.prd_prev, //11 Need to be defined
      ProductItem.prd_mo, //12 Need to be defined
      ProductItem.prd_mol, //13 Need to be defined
      ProductItem.prd_enduserpo, //14
      ProductItem.prd_custporeleasenumber, //15 Need to be defined
      ProductItem.prd_custpochgordseq, //16 Need to be defined
      ProductItem.prd_custpodate, //17 Need to be defined
      ProductItem.prd_custpolineitem, //18 Need to be defined
      ProductItem.prd_2ndcustomer, //19 Need to be defined
      ProductItem.prd_po, //20 Need to be defined
      ProductItem.prd_poc, //21 Need to be defined
      ProductItem.prd_pod, //22 Need to be defined
      ProductItem.prd_pol, //23 Need to be defined
      ProductItem.prd_rls, //24 Need to be defined
      ProductItem.prd_partnumber, //25
      ProductItem.prd_weighttype === 'A' && ProductItem.prd_x12weightum === 'LB' ? ProductItem.prd_weight : null, //26
      ProductItem.prd_weighttype === 'A' && ProductItem.prd_x12weightum === 'KG' ? ProductItem.prd_weight : null, //27
      ProductItem.prd_weighttype === 'T' && ProductItem.prd_x12weightum === 'LB' ? ProductItem.prd_weight : null, //28
      ProductItem.prd_weighttype === 'T' && ProductItem.prd_x12weightum === 'KG' ? ProductItem.prd_weight : null, //29
      ProductItem.prd_x12gaugeum === 'EM' ? ProductItem.prd_gaugesize : null, //30
      ProductItem.prd_gaugesize !== 'EM' ? ProductItem.prd_gaugesize : null, //31
      ProductItem.prd_x12gaugeum, //32
      ProductItem.prd_x12widthum === 'IN' ? ProductItem.prd_width : null, //33
      ProductItem.prd_x12widthum === 'MM' ? ProductItem.prd_width : null, //34
      ProductItem.prd_x12lengthum === 'IN' ? ProductItem.prd_length : null, //35
      ProductItem.prd_x12lengthum === 'MM' ? ProductItem.prd_length : null, //36
      ProductItem.prd_linearfeat, //37 Need to be defined
      ProductItem.prd_linearfeat_meters, //38 Need to be defined
      ProductItem.prd_x12innerdiameterum === 'IN' ? ProductItem.prd_innerdiameter : null, //39
      ProductItem.prd_x12innerdiameterum === 'MM' ? ProductItem.prd_innerdiameter : null, //40
      ProductItem.prd_x12outerdiameterum === 'IN' ? ProductItem.prd_outerdiameter : null, //41
      ProductItem.prd_x12outerdiameterum === 'MM' ? ProductItem.prd_outerdiameter : null, //42
      ProductItem.prd_pieces, //43
      ProductItem.prd_x12qtyum, //44 need to be defined
      ProductItem.prd_grade, //45
      ProductItem.prd_materialclassification, //46
      ProductItem.prd_materialstatus, //47
      ProductItem.prd_materialstatus, //48
      ProductItem.prd_edgecondition, //49 Need to be defined
      ProductItem.prd_materialspecification, //50 Need to be defined
      HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id || null, //51
      HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id || null, //52
      ProductItem.prd_ultimateintendedid, //53 Need to be defined
      ProductItem.prd_orderhllevelid, //54 Need to be defined
      ProductItem.prd_orderparenthllevelid, //55 Need to be defined
      ProductItem.prd_orderhllevelcode, //56 Need to be defined
      ProductItem.prd_orderhlchildcode, //57 Need to be defined
      ProductItem.prd_orderlevel, //58 Need to be defined
      ProductItem.prd_x12orderum, //59 Need to be defined
      ProductItem.prd_cumqty, //60 Need to be defined
      ProductItem.prd_location, //61 Need to be defined
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$62
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //63
      'O856SNF', //$64
      ProductItem.prd_alternatepartnumber, //65 Need to be defined
      Item.shp_partdescription, //66
      ProductItem.prd_manufacturingdate, //67 Need to be defined
      ProductItem.prd_ordersid, //68 Need to be defined
      ProductItem.prd_heattreatdte, //69 Need to be defined
      ProductItem.prd_lubricationdte, //70 Need to be defined
      ProductItem.prd_bakehardeningdte, //71 Need to be defined
      null, //72
      ProductItem.prd_steeltechnologiespo, //73 Need to be defined
      ProductItem.prd_consumedcoil, //74 Need to be defined
      ProductItem.prd_temperature, //75 Need to be defined
      ProductItem.prd_olin01, //76 Need to be defined
      ProductItem.prd_ilin01, //77 Need to be defined
      ProductItem.prd_corg, //78 Need to be defined
      ProductItem.prd_smelt1, //79 Need to be defined
      ProductItem.prd_smelt2, //80 Need to be defined
      flag //$81
])

  } catch (error) {
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }}



//MARK: Measure
//856 Measure Insert
async function insert856Measure(pool, InterchangeControl, Item, ProductItem, HeaderNameAddress, orginalHeader, flag, filePath) {
 try {

  //Weights
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null,null,ProductItem.prd_heat, ProductItem.prd_mcoil,
  ProductItem.prd_prev,'PD','WT',null,ProductItem.prd_actualweight,ProductItem.prd_x12actualweightum,HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

//Gauges
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null,null,ProductItem.prd_heat, ProductItem.prd_mcoil,
  ProductItem.prd_prev,'PD','TH',null,ProductItem.prd_gaugesize,ProductItem.prd_x12gaugeum,HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

//Width
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null,null,ProductItem.prd_heat, ProductItem.prd_mcoil,
  ProductItem.prd_prev,'PD','WD',null,ProductItem.prd_width,ProductItem.prd_x12widthum,HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

//UnitLength
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null,null,ProductItem.prd_heat, ProductItem.prd_mcoil,
ProductItem.prd_prev,'PD','LN',null,ProductItem.prd_length,ProductItem.prd_x12lengthum,HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

//Linear Length
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null,null,ProductItem.prd_heat, ProductItem.prd_mcoil,
ProductItem.prd_prev,'PD','LN',null,ProductItem.prd_coillength,ProductItem.prd_x12coillengthum,HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)
    
//Inside Diameter
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null,null,ProductItem.prd_heat, ProductItem.prd_mcoil,
ProductItem.prd_prev,'PD','ID',null,ProductItem.prd_innerdiameter,ProductItem.prd_x12innerdiameterum,HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)


//Outside Diameter
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null,null,ProductItem.prd_heat, ProductItem.prd_mcoil,
ProductItem.prd_prev,'PD','OD',null,ProductItem.prd_outerdiameter,ProductItem.prd_x12outerdiameterum,HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

async function insertmeasures(pool, key, hl1, bsn2, bol, heat, mcoil, prev, meas1, meas2, meas3f, meas3, meas4, n1sf, n1st, n1ma, locn, orginalHeader,flag) {
      
  await pool.query( `INSERT INTO public."856_SNF_Measure"(
    msr_type, msr_key, msr_hl1, msr_bsn2, msr_bol, msr_heat, msr_mcoil, msr_prev, msr_mea1, msr_mea2, msr_mea3f, msr_mea3, msr_mea4, msr_n1sf, msr_n1st, msr_n1ma, msr_locn, msr_odat, msr_otim, msr_opgm, msr_xref, msr_flow_flag)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
  [
    orginalHeader.hdr_type, //$1
    key, //$2
    hl1, //$3 Need to be defined
    bsn2, //$4 Need to be defined
    bol, //$5 Need to be defined
    heat, //$6
    mcoil, //$7 Need to be defined
    prev, //$8 Need to be defined
    meas1, //$9 
    meas2, //$10 
    meas3f, //$11 
    meas3, //$12 
    meas4, //$13 
    n1sf, //$14 
    n1st, //$15 
    n1ma, //$16 
    locn, //$17 
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$62
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //63
    'O856SNF', //$64
    null, //$21
    flag //$22
  ]);
    }


   
  } catch (error) {
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
  }}


}

  module.exports = {
    LoadO856SNF
};
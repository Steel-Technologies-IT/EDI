// This module handles the insertion of parsed EDI 856 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.
const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');


const  readableErrors = require('../../functions/readableErrors.js');

async function LoadO856SNF(pool, InterchangeControl, TransactionSet, ShipmentHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, Chemistries, Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath) {
      // If ProductItem is an array, process each one
let orginalHeader;
let orginalDetail;
let orginalNames;
let orginalMeasure;
let oldKey;
try {
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
        break;
      }
      
    }
  } 

orginalHeader = await pool.query('SELECT * FROM "856_SNF_Header" WHERE hdr_key = $1', [oldKey.rows[0].dtl_key]);
orginalDetail = await pool.query('SELECT * FROM "856_SNF_Detail" WHERE dtl_key = $1', [oldKey.rows[0].dtl_key]);
orginalNames = await pool.query('SELECT * FROM "856_SNF_Names" WHERE name_key = $1', [oldKey.rows[0].dtl_key]);
orginalMeasure = await pool.query('SELECT * FROM "856_SNF_Measure" WHERE msr_key = $1', [oldKey.rows[0].dtl_key]);
console.log('Found Previous ASN')
} catch (error) {
  console.log("No previous ASN found:");
}


    await InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ShipmentHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, 
    Chemistries, Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath, orginalDetail)
  }
      

  async function InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ShipmentHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, Chemistries, Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath, orginalDetail){

    
  await insert856Header(pool, InterchangeControl, ShipmentHeader[0],  flag, filePath, ProductItem);
    // Address Insertion


  await Promise.all(ProductItemNameAddress.map(async address => {
      await insert856Names(pool, InterchangeControl, address, flag, filePath);
  }));

  //Header Address Insertion
  await Promise.all(HeaderNameAddress.map(async address => {
    await insert856Names(pool, InterchangeControl, address,  flag, filePath);
  }));
  await Promise.all(Item.map(async (Item, itemIndex) => {
      await Promise.all(ProductItem.filter(ProductItem => ProductItem["HL Parent ID"] === Item["HL ID"]).map(async (ProductItem, productIndex) => {
    await insert856Detail(pool, InterchangeControl, Item, ProductItem, ShipmentHeader, flag, filePath, itemIndex + 1, productIndex + 1, orginalDetail);
    }));
}));


   await Promise.all(Item.map(async (Item, itemIndex) => {
      await Promise.all(ProductItem.filter((ProductItem) => ProductItem["HL Parent ID"] === Item["HL ID"]).map(async (ProductItem, index) => {
    await insert856Measure(pool, InterchangeControl, Item, ProductItem, HeaderNameAddress, flag, filePath, index + 1, ShipmentHeader, itemIndex + 1);
      }));
   }));



// //MARK: Header
// //856 Header Insert
async function insert856Header(pool, InterchangeControl, ShipmentHeader, flag, filePath, ProductItem) {
const toNum = (v) => {
      if (v === undefined || v === null || v === '') return 0;
      const n = Number(String(v).replace(/[^0-9.-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };
    const totalPieces = Array.isArray(ProductItem)
      ? ProductItem.reduce((sum, p) => sum + toNum(p?.prd_pieces ?? p?.prd_pcs ?? p?.pieces), 0)
      : toNum(ProductItem?.prd_pieces ?? ProductItem?.prd_pcs ?? ProductItem?.pieces);
    const hdrPieces = totalPieces > 0 ? totalPieces : null;
  try {
   
    // After requiring pg and creating your pool:
    await pool.query(`
     INSERT INTO public."856_SNF_Header"(
      	hdr_type, hdr_key, hdr_isa_qual, hdr_isnd_id, hdr_gsnd_id, hdr_ircv_id, hdr_grcv_id, 
        hdr_ictl_no, hdr_func_no, hdr_gctl_no, hdr_ircv_qual, hdr_stctl_no, hdr_bsn_cd, hdr_bsn_no, hdr_bsn_dte, hdr_bsn_tme, hdr_tran_typ, 
        hdr_shp_dte, hdr_shp_tme, hdr_shp_tzn, 
        hdr_bol_no, hdr_mbol_no, hdr_pck_no, hdr_dck_cd, hdr_shp_grss_wgt_lb, hdr_shp_grss_wgt_kg, 
        hdr_shp_grss_wgt_uom, hdr_shp_net_wgt_lb, hdr_shp_net_wgt_kg, hdr_shp_net_wgt_uom, 
        hdr_shp_ttl_pc_cnt, hdr_shp_itm_typ, hdr_shp_itm_cnt, hdr_rte_sq_cd, hdr_std_car_cd, 
        hdr_tspt_mthd, hdr_tspt_rt_name, hdr_shp_ord_sts, hdr_shp_loc_id, hdr_eq_cd, hdr_eq_init, 
        hdr_eq_nbr, hdr_shp_mthd_pmnt, hdr_sf_no, hdr_st_no, hdr_shp_hl, hdr_shp_phl, hdr_shp_hl_cd, 
        hdr_shp_hl_ccd, hdr_swgt_typ, hdr_swgt, hdr_swgt_uom, hdr_sum_hl_seg, hdr_sum_hsh_ttl, hdr_sttx_locn, 
        hdr_crt_dat, hdr_crt_tim, hdr_crt_pgm, hdr_xref, hdr_flow_flag, hdr_scac)

    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
      $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61)
    `, [
      'O', //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      InterchangeControl.ictl_senderinterchangeidqualifier, //$3
      InterchangeControl.ictl_senderinterchangeid, //$4
      InterchangeControl.ictl_receiverinterchangeidqualifier, //$5  
      InterchangeControl.ictl_receiverinterchangeid, //$6
      InterchangeControl.ictl_receiverinterchangeid, //$7
      null, //$8 // hdr_ictl_no
      'SH', //$9 
      null, //$10 Needs to be defined
      InterchangeControl.ictl_receiverinterchangeidqualifier, //$11
      null, //$12 Needs to be defined
      '00', //$13
      ShipmentHeader.ish_transactionreference, //$14
      ymd, //$15
      hms, //$16
      ShipmentHeader.ish_shipment_qual ?? null, //$17
      ShipmentHeader.ish_shippingdatetime ? ShipmentHeader.ish_shippingdatetime.slice(0, 8) : null, //$18
      ShipmentHeader.ish_shippingdatetime ? ShipmentHeader.ish_shippingdatetime.slice(8, 14) : null, //$19
      'ET', //$20
      ShipmentHeader.ish_transactionreference, //$21
      ShipmentHeader.ish_manifestreference ?? null, //$22
      null, //$23 Needs to be defined pick no
      ShipmentHeader.ish_gatedock, //$24
      ShipmentHeader.ish_x12grossweightum === 'LB' ? ShipmentHeader.ish_grossweight : null, //$25
      ShipmentHeader.ish_x12grossweightum === 'KG' ? ShipmentHeader.ish_grossweight : null, //$26
      ShipmentHeader.ish_x12grossweightum, //$27
      ShipmentHeader.ish_x12netweightum === 'LB' ? ShipmentHeader.ish_netweight : null, //$28
      ShipmentHeader.ish_x12netweightum === 'KG' ? ShipmentHeader.ish_netweight : null, //$29
      ShipmentHeader.ish_x12netweightum, //$30
      totalPieces, //$31 
      totalPieces === 1 ? 'LIF52' : 'COL52', //$32
      ShipmentHeader.ish_numberofpackages, //$33
      'B', //$34
      ShipmentHeader.ish_shipment_qual === 'P' || ShipmentHeader.ish_shipment_qual === 'O' ? 'SSSS' : ShipmentHeader.ish_carriercodequalifier === 2 ? ShipmentHeader.ish_carrieridentificationcode : '', //$35
      ShipmentHeader.ish_x12deliverymethod ?? null, //$36  here
      ShipmentHeader.ish_transportroute ?? null, //$37
      null, //$38 Needs to be defined
      null, //$39 Needs to be defined
      null, //$40 Needs to be defined
      null, //$41 Needs to be defined
      ShipmentHeader.ish_vehiclelicenseplate, //$42   here
      ShipmentHeader.ish_x12shipmentmethodofpayment ?? null, //$43
      HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id || null, //44
      HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id || null, //45
      '1', //$46
      null, //$47 Needs to be defined
     'S', //$48
      null, //$49 Needs to be defined
      null, //$50
      null, //$51 
      null, //$52 
      null, //$53 Needs to be defined
      null, //$54 Needs to be defined
      null, //$55 Needs to be defined
      ymd,    //$56
      hms,   //$57
      'O856SNF', //$58
      null,
      flag, //$60
      ShipmentHeader.ish_carrieridentificationcode //61
    ]);


  } catch (error) {
    console.log(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }
};

//MARK: Names
  //856 Names Insert
async function insert856Names(pool, InterchangeControl, Address, flag, filePath) {
 try {
    await pool.query( `INSERT INTO public."856_SNF_Names"(
  name_typ, name_key, name_qual, name_qual_id, name_id, name_name, name_addr1, name_addr2, name_city, name_state, name_zpcd, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_crt_dte, name_crt_tme, name_crt_pgm, name_flow_flag)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);`,
  [
    'O', //$1
    InterchangeControl.ictl_edixcontrolnumber, //$2
    Address.hdna_addresstype ? Address.hdna_addresstype : Address.prna_addresstype, //$3
    Address.hdna_identificationcodequalifier ? Address.hdna_identificationcodequalifier : Address.prna_identificationcodequalifier ? Address.prna_identificationcodequalifier : '01',
    Address.hdna_identificationcode ? Address.hdna_identificationcode : Address.prna_identificationcode ? Address.prna_identificationcode : " ", //$5
    Address.hdna_nameline1 ? Address.hdna_nameline1 : Address.prna_nameline1, //$6
    Address.hdna_addressline1 ? Address.hdna_addressline1 : Address.prna_addressline1, //$7
    Address.hdna_addressline2 ? Address.hdna_addressline2 : Address.prna_addressline2, //$8
    Address.hdna_city ? Address.hdna_city : Address.prna_city, //$9
    Address.hdna_stateprovincecode ? Address.hdna_stateprovincecode : Address.prna_stateprovincecode, //$10
    Address.hdna_postalcode ? Address.hdna_postalcode : Address.prna_postalcode, //$11
    Address.hdna_countrycode ? Address.hdna_countrycode : Address.prna_countrycode, //$12
    null,
    Address.hdna_telnumber ? Address.hdna_telnumber : Address.prna_telnumber, //$14
    null,
    ymd, //$16
    hms, //$17
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
async function insert856Detail(pool, InterchangeControl, Item, ProductItem, ShipmentHeader, flag, filePath, itemIndex, productIndex, orginalDetail) {
 try {
  console.log(Item)
  await pool.query(`INSERT INTO public."856_SNF_Detail"(
  dtl_type, dtl_key, dtl_hl1, dtl_hl2, dtl_hl3, dtl_hl4, dtl_bsn2, dtl_bol, dtl_heat, dtl_mcoil, dtl_prev, dtl_mo, dtl_mol, dtl_cpo, dtl_cpor, dtl_cpoc, dtl_cpod, dtl_cpol, dtl_ucpo, dtl_po, dtl_poc, dtl_pod, dtl_pol, dtl_rls, dtl_cpart, dtl_awgtlb, dtl_awgtkg, dtl_twgtlb, dtl_twgtkg, dtl_gaugin, dtl_gaugmm, dtl_gaugt, dtl_widin, dtl_widmm, dtl_ulenin, dtl_ulenmm, dtl_lnft, dtl_lnmt, dtl_idin, dtl_idmm, dtl_odin, dtl_odmm, dtl_pcs, dtl_qtyuom, dtl_grcd, dtl_mcls67, dtl_msts68, dtl_msts70, dtl_edge22, dtl_msa, dtl_n1sf, dtl_n1st, dtl_n1ma, dtl_ohl1, dtl_ohl2, dtl_ohl3, dtl_ohl4, dtl_shp, dtl_ouom, dtl_cqty, dtl_locn, dtl_odat, dtl_otim, dtl_opgm, dtl_apart, dtl_partd, dtl_mdat, dtl_osid, dtl_cshdt, dtl_lubdt, dtl_bhdt, dtl_xref, dtl_sttxpo, dtl_ccoil, dtl_tmpr, dtl_olin01, dtl_ilin01, dtl_corg, dtl_smelt1, dtl_smelt2, dtl_flow_flag, dtl_end_ref1, dtl_end_ref2, dtl_end_ref3, dtl_end_ref4, dtl_end_ref5, dtl_prt_rev_no, dtl_invx_ref_pre, dtl_invx_ref_no, dtl_tag_lot, dtl_itm_prt_no)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91)`,
[
      'O', //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      itemIndex, //$3
      productIndex, //$4
      'I',
      '0',
      ShipmentHeader.ish_transactionreference,
      ShipmentHeader.ish_transactionreference,
      ProductItem.prd_heat, //9
      ProductItem.prd_customertagno, //10
      ProductItem.prd_vendortagid, //11
      ProductItem.prd_millorderno, //12 Need to be defined Partially INBOUND
      ProductItem.prd_mol, //13 Need to be defined INBOUND
      ProductItem.prd_externalordernumber, //14
      ProductItem.prd_externalorderrelease, //15
      null, //16
      ProductItem.prd_externalorderdate ? ProductItem.prd_externalorderdate : orginalDetail ? orginalDetail.rows[0].dtl_cpod : null, //17
      ProductItem.prd_externalorderitem, //18
      orginalDetail ? (orginalDetail.rows[0].dtl_ucpo || null) : null, //19 
      ProductItem.prd_externalordernumber, //20
      null, //21
      ProductItem.prd_externalorderdate ? ProductItem.prd_externalorderdate : orginalDetail ? orginalDetail.rows[0].dtl_cpod : null, //22
      ProductItem.prd_externalorderitem ? ProductItem.prd_externalorderitem : orginalDetail ? orginalDetail.rows[0].dtl_cpol : null, //23
      ProductItem.prd_rls, //24 Need to be defined
      ProductItem.prd_partnumber, //25
      ProductItem.prd_weighttype === 'A' && ProductItem.prd_x12weightum === 'LB' ? ProductItem.prd_weight : null, //26
      ProductItem.prd_weighttype === 'A' && ProductItem.prd_x12weightum === 'KG' ? ProductItem.prd_weight : null, //27
      ProductItem.prd_weighttype === 'T' && ProductItem.prd_x12weightum === 'LB' ? ProductItem.prd_weight : null, //28
      ProductItem.prd_weighttype === 'T' && ProductItem.prd_x12weightum === 'KG' ? ProductItem.prd_weight : null, //29
      ProductItem.prd_x12gaugeum === 'ED' ? ProductItem.prd_gaugesize : null, //30
      ProductItem.prd_gaugesize !== 'MM' ? ProductItem.prd_gaugesize : null, //31
      ProductItem.prd_x12gaugeum, //32
      ProductItem.prd_x12widthum === 'IN' ? ProductItem.prd_width : null, //33
      ProductItem.prd_x12widthum === 'MM' ? ProductItem.prd_width : null, //34
      ProductItem.prd_x12lengthum === 'IN' ? ProductItem.prd_length : null, //35
      ProductItem.prd_x12lengthum === 'MM' ? ProductItem.prd_length : null, //36
       ProductItem.prd_x12lengthum === 'FT' ? ProductItem.prd_length : null, //37
      ProductItem.prd_x12lengthum === 'M' ? ProductItem.prd_length : null, //38
      ProductItem.prd_x12innerdiameterum === 'IN' ? ProductItem.prd_innerdiameter : null, //39
      ProductItem.prd_x12innerdiameterum === 'MM' ? ProductItem.prd_innerdiameter : null, //40
      ProductItem.prd_x12outerdiameterum === 'IN' ? ProductItem.prd_outerdiameter : null, //41
      ProductItem.prd_x12outerdiameterum === 'MM' ? ProductItem.prd_outerdiameter : null, //42
      ProductItem.prd_pieces, //43
      'PC', //44 
      ProductItem.prd_grade, //45
      ProductItem.prd_materialclassification, //46
      null, //47 
      ProductItem.prd_materialstatus, //48  
      null, //49 Need to be defined
      ProductItem.prd_materialspecification, //50 Need to be defined
      HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id || null, //51
      HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id || null, //52
      ProductItem.prd_ultimateintendedid, //53 Need to be defined
      productIndex, //54
      itemIndex, //55 
      '0', //56 
      '1', //57 
      null, //58 
      null, //59 
      null, //60 
      null, //61 
      ymd,    //$62
      hms,   //63
      'O856SNF', //$64
      ProductItem.prd_alternatepartnumber, //65 Need to be defined
      Item.shp_partdescription, //66
      null, //67 
      null, //68 
      null, //69 
      null, //70 
      null, //71 
      null, //72
      ProductItem.prd_steeltechnologiespo, //73 Need to be defined
      orginalDetail ? orginalDetail.rows[0].dtl_ccoil : null, //74
      ProductItem.prd_temperature, //75 Need to be defined
      ProductItem.prd_olin01, //76 Need to be defined
      ProductItem.prd_ilin01, //77 Need to be defined
      null, //78
      null, //79
      null, //80 
      flag, //$81
      Item.shp_enduserreference1, //82
      Item.shp_enduserreference2, //83
      Item.shp_enduserreference3, //84
      Item.shp_enduserreference4, //85
      Item.shp_enduserreference5, //86
      Item.shp_partrevisionnumber, //87
      Item.shp_invexreferenceprefix, //88
      Item.shp_invexreferencenumber, //89
      Item.shp_taglotid, //90
      Item.shp_partnumber 
])

  } catch (error) {
    console.error(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }}



//MARK: Measure
//856 Measure Insert
async function insert856Measure(pool, InterchangeControl, Item, ProductItem, HeaderNameAddress, flag, filePath, index, ShipmentHeader, itemIndex) {
 try {

await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'CT','LN',null, ProductItem.prd_pieces,'PC',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

  //Weights
  //LB
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'WT','WT',null, ProductItem.prd_weight_um === 'LB' ? ProductItem.prd_weight : ProductItem.prd_weight * 0.45359237,'50',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)
//KG
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'WT','WT',null,ProductItem.prd_weight_um === 'LB' ? ProductItem.prd_weight / 0.45359237 : ProductItem.prd_weight,'01',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)


//Gauges
  await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'PD','TH',null,ProductItem.prd_x12gaugeum === 'IN' ? ProductItem.prd_gaugesize * 25.4 : ProductItem.prd_gaugesize ,'M2',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

  await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'PD','TH',null,ProductItem.prd_x12gaugeum === 'IN' ? ProductItem.prd_gaugesize : ProductItem.prd_gaugesize / 25.4 ,'E8',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

//Width
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'PD','WD',null,ProductItem.prd_x12widthum === 'IN' ? ProductItem.prd_width * 25.4 : ProductItem.prd_width ,'MB',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

  await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'PD','WD',null,ProductItem.prd_x12widthum === 'IN' ? ProductItem.prd_width: ProductItem.prd_width  / 25.4 ,'ED',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

//UnitLength
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','LN',null,ProductItem.prd_x12lengthum === 'FT' ? ProductItem.prd_length * .3048 : ProductItem.prd_length ,'LM',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','LN',null,ProductItem.prd_x12lengthum === 'FT' ? ProductItem.prd_length : ProductItem.prd_length * 3.28084  ,'LF',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)
    
//Inside Diameter
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','ID',null,ProductItem.prd_x12innerdiameterum === 'IN' ? ProductItem.prd_innerdiameter : ProductItem.prd_innerdiameter / 25.4, 'ED',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','ID',null,ProductItem.prd_x12innerdiameterum === 'IN' ? ProductItem.prd_innerdiameter * 25.4 : ProductItem.prd_innerdiameter, 'MB',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

//Outside Diameter
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','OD',null,ProductItem.prd_x12outerdiameterum === 'IN' ? ProductItem.prd_outerdiameter : ProductItem.prd_outerdiameter / 25.4, 'ED',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','OD',null,ProductItem.prd_x12outerdiameterum === 'IN' ? ProductItem.prd_outerdiameter * 25.4 : ProductItem.prd_outerdiameter, 'MB',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

async function insertmeasures(pool, key, hl1, bsn2, bol, heat, mcoil, prev, meas1, meas2, meas3f, meas3, meas4, n1sf, n1st, n1ma, locn, flag) {
      
  await pool.query( `INSERT INTO public."856_SNF_Measure"(
    msr_type, msr_key, msr_hl1, msr_bsn2, msr_bol, msr_heat, msr_mcoil, msr_prev, msr_mea1, msr_mea2, msr_mea3f, msr_mea3, msr_mea4, msr_n1sf, msr_n1st, msr_n1ma, msr_locn, msr_odat, msr_otim, msr_opgm, msr_xref, msr_flow_flag)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
  [
    'O', //$1
    key, //$2
    itemIndex, //$3
    index, //$4
    bol, //$5
    heat, //$6
    mcoil, //$7
    prev, //$8 
    meas1, //$9 
    meas2, //$10 
    meas3f, //$11 
    meas3, //$12 
    meas4, //$13 
    n1sf, //$14 
    n1st, //$15 
    n1ma, //$16 
    locn, //$17 
    ymd,    //$62
    hms,   //63
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








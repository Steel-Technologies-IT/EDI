// This module handles the insertion of parsed EDI 846 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.
const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');


const  readableErrors = require('../../functions/readableErrors.js');

async function LoadO846SNF(pool, InterchangeControl, TransactionSet, InventoryHandoffHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, Damages, ProductInstructions, Errors, flag, filePath) {

        
    await InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, InventoryHandoffHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, 
    Damages, ProductInstructions, Errors, flag, filePath)
  }
      

  async function InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, InventoryHandoffHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, Damages, ProductInstructions, Errors, flag, filePath){

  await insert846Header(pool, InterchangeControl, InventoryHandoffHeader, flag, filePath, ProductItem);
  
  //Header Address Insertion
  await Promise.all(HeaderNameAddress.map(async address => {
    await insert846Names(pool, InterchangeControl, address,  flag, filePath);
  }));

 //Detail Insertion
  const productItemsArray = Array.isArray(ProductItem) ? ProductItem : ProductItem ? [ProductItem] : [];
  await Promise.all(productItemsArray.map(async ProductItem => {
    await insert846Detail(pool, InterchangeControl, Item, ProductItem, InventoryHandoffHeader, flag, filePath, itemIndex + 1, productIndex + 1);
    //await insert846Names(pool, InterchangeControl, ProductItem,  flag, filePath);
  }));

  await Promise.all(Item.map(async (Item, itemIndex) => {
      await Promise.all(productItemsArray.filter(ProductItem => ProductItem["HL Parent ID"] === Item["HL ID"]).map(async (ProductItem, productIndex) => {
    await insert846Detail(pool, InterchangeControl, Item, ProductItem, InventoryHandoffHeader, flag, filePath, itemIndex + 1, productIndex + 1);
    }));
}));

   await Promise.all(Item.map(async (Item, itemIndex) => {
      await Promise.all(productItemsArray.filter((ProductItem) => ProductItem["HL Parent ID"] === Item["HL ID"]).map(async (ProductItem, index) => {
    await insert846Measure(pool, InterchangeControl, Item, ProductItem, HeaderNameAddress, flag, filePath, index + 1, InventoryHandoffHeader, itemIndex + 1);
      }));
   }));



// //MARK: Header
// //846 Header Insert
async function insert846Header(pool, InterchangeControl, InventoryHandoffHeader, flag, filePath, ProductItem) {
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
    await pool.query(`
     INSERT INTO public."846_SNF_Header"(
      	hdr_type, hdr_key, hdr_isa_qual, hdr_isnd_id, hdr_gsnd_id, hdr_ircv_qual, 
        hdr_ircv_id, hdr_grcv_id, hdr_ictl_no, hdr_gctl_no, hdr_stctl_no, 
        hdr_dsent, hdr_tsent, hdr_purpcode, hdr_invrptcd, hdr_rptrefid, hdr_rptdate, 
        hdr_rpttime, hdr_actioncd, hdr_invdate, hdr_invtime, hdr_invtimezn, hdr_mfgidq,
         hdr_mfgid, hdr_opidq, hdr_opid, hdr_sumlin, hdr_sumhash, hdr_sttx_locn, hdr_crt_dat,
          hdr_crt_tim, hdr_crt_pgm, hdr_flow_flag, hdr_func_no)

    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34)
    `, [
      'T', //$1
      InterchangeControl.intctl_edix_control_number, //$2 hdr_key
      InterchangeControl.intctl_sender_interchange_id_qualifier, //$3
      InterchangeControl.intctl_sender_interchange_id, //$4
      null,  //$5 needs to be defined
      InterchangeControl.intctl_receiver_interchange_id_qualifier, //$6
      InterchangeControl.intctl_receiver_interchange_id, //$7
      InterchangeControl.intctl_receiver_interchange_id, //$8 hdr_grcv_id
      null, //$9 hdr_ictl_no
      null, //$10 hdr_gctl_no
      null, //$11 hdr_stctl_no
      ymd, //$12 hdr_dsent
      hms, //$13 hdr_tsent
      '14', //$14 hdr_purpcode
      '15', //$15 hdr_invrptcd
      '16', //$16 hdr_rptrefid
      '17', //$17
      null, //InventoryHandoffHeader.ish_shipmentdatetime.slice(0, 8), $18
      null, //InventoryHandoffHeader.ish_shipmentdatetime.slice(8, 14), $19
      '20', //$20
      '21',  //InventoryHandoffHeader.ish_transactionreference, $21
      'ET',  //InventoryHandoffHeader.ish_manifestreference, $22
      null, //$23 Needs to be defined pick no
      '24',  //InventoryHandoffHeader.ish_gatedock, $24
      '25',  //InventoryHandoffHeader.ish_x12grossweightum === 'LB' ? InventoryHandoffHeader.ish_grossweight : null, $25
      '26',  //InventoryHandoffHeader.ish_x12grossweightum === 'KG' ? InventoryHandoffHeader.ish_grossweight : null, $26
      '27',  //InventoryHandoffHeader.ish_x12grossweightum, $27
      '28',  //InventoryHandoffHeader.ish_x12netweightum === 'LB' ? InventoryHandoffHeader.ish_netweight : null, $28
      '29',  //InventoryHandoffHeader.ish_x12netweightum === 'KG' ? InventoryHandoffHeader.ish_netweight : null, $29
      '30',  //InventoryHandoffHeader.ish_x12netweightum, $30
      '31',  //totalPieces, $31
      '32',  //totalPieces === 1 ? 'LIF52' : 'COL52', $32
       flag, //$33 hdr_flow_flag
       'IB'  //$34 hdr_func_no
    ]);


  } catch (error) {
    console.log(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }
};

//MARK: Names
  //846 Names Insert
async function insert846Names(pool, InterchangeControl, address, flag, filePath) {
 try {
    await pool.query( `INSERT INTO public."846_SNF_Address"(
  adr_addresstype, adr_key, adr_nameq, adr_nameid, adr_name, adr_addr1, adr_addr2, adr_city, adr_state, adr_zpcd, adr_ctry_cd, adr_cont_name, adr_cont_phn, adr_cont_eml, adr_resp_party_cd, adr_crt_dte, adr_crt_tme, adr_crt_pgm, adr_flow_flag)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);`,
  [
    address.hdradr_addresstype, //$1
    InterchangeControl.intctl_edix_control_number, //$2 hdr_key
    address.hdradr_addresstype, //$3
    address.hdradr_identificationcodequalifier, //$4
    address.hdradr_nameline1, //$6
    address.hdradr_addressline1, //$7
    address.hdradr_addressline2, //$8
    address.hdradr_city, //$9
    address.hdradr_stateprovincecode, //$10
    address.hdradr_postalcode, //$11
    address.hdradr_countrycode, //$12
    null,
    '14',  //Address.hdradr_telnumber ? Address.hdradr_telnumber : Address.prna_telnumber, //$14
    null,
    null,
    ymd, //$16
    hms, //$17
    'O846SNF', //$18
    'O' //$19
  ]);
  } catch (error) {
    console.log(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
  }
}

//MARK: Detail
//846 Detail Insert
async function insert846Detail(pool, InterchangeControl, Item, ProductItem, InventoryHandoffHeader, flag, filePath, itemIndex, productIndex) {
 try {
 
  await pool.query(`INSERT INTO public."846_SNF_Detail"(
  dtl_type, dtl_key, dlt_det_seq_no, dlt_line_asd_id, dlt_mo, dtl_mol, dtl_mcoil, dtl_heat, dtl_po, dtl_pol, dtl_pod, dtl_bpart, dtl_other, dtl_plistno, dtl_proc, dtl_prev, dtl_tagtyp, dtl_tag, dtl_lot, dtl_v_prod_no, dtl_cons_class, dtl_backout_cd, dtl_consignee_no, dtl_eff_dte, dtl_eff_tme, dtl_eff_tme_zn, dtl_inv_dte, dtl_inv_tme, dtl_inv_tme_zn, dtl_rcv_dte, dtl_iss_dte, dtl_qty_rtg_dte, dtl_qty_rtg_tme, dtl_qty_rtg_tme_zn, dtl_mat_class, dtl_mat_sts, dtl_act_wgt, dtl_gauge, dtl_gauge_tpe, dtl_width, dtl_lin_ft, dtl_unit_len, dtl_pcs, dtl_rcv_qty, dtl_use_qty, dtl_onhand_qty, dtl_sttx_locn, dtl_crt_dte, dtl_crt_tme, dtl_crt_pgm, dtl_flow_flag)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51)`,
[
      'O', //$1
      null, //InterchangeControl.intctl_edix_control_number, //$2
      '3', //itemIndex, //$3
      null, //productIndex, //$4
      'I', //$5
      'O', //$6
      '3', //InventoryHandoffHeader.ish_transactionreference, //$7
      '3', //InventoryHandoffHeader.ish_transactionreference, //$8
      ProductItem.prd_heat, //9
      ProductItem.prd_customertagno, //10
      '3', //ProductItem.prd_vendortagid, //11
      '3', //ProductItem.prd_millorderno, //12 Need to be defined Partially INBOUND
      '3', //ProductItem.prd_mol, //13 Need to be defined INBOUND
      '3', //ProductItem.prd_externalordernumber, //14
      '3', //ProductItem.prd_externalorderrelease, //15
      null, //16
      '3', //ProductItem.prd_externalorderdate, //17
      '3', //ProductItem.prd_externalorderitem, //18
      '3', //ProductItem.prd_externalorderitem, //19 Need to be defined
      '3', //ProductItem.prd_externalordernumber, //20 
      null, //21 
      '3', //ProductItem.prd_externalorderdate, //22
      '3', //ProductItem.prd_externalorderitem, //23
      '3', //ProductItem.prd_rls, //24 Need to be defined
      '3', //ProductItem.prd_partnumber, //25
      '3', //ProductItem.prd_weighttype === 'A' && ProductItem.prd_x12weightum === 'LB' ? ProductItem.prd_weight : null, //26
      '3', //ProductItem.prd_weighttype === 'A' && ProductItem.prd_x12weightum === 'KG' ? ProductItem.prd_weight : null, //27
      '3', //ProductItem.prd_weighttype === 'T' && ProductItem.prd_x12weightum === 'LB' ? ProductItem.prd_weight : null, //28
      '3', //ProductItem.prd_weighttype === 'T' && ProductItem.prd_x12weightum === 'KG' ? ProductItem.prd_weight : null, //29
      '3', //ProductItem.prd_x12gaugeum === 'ED' ? ProductItem.prd_gaugesize : null, //30
      '3', //ProductItem.prd_gaugesize !== 'MM' ? ProductItem.prd_gaugesize : null, //31
      '3', //ProductItem.prd_x12gaugeum, //32
      '3', //ProductItem.prd_x12widthum === 'IN' ? ProductItem.prd_width : null, //33
      '3', //ProductItem.prd_x12widthum === 'MM' ? ProductItem.prd_width : null, //34
      '3', //ProductItem.prd_x12lengthum === 'IN' ? ProductItem.prd_length : null, //35
      '3', //ProductItem.prd_x12lengthum === 'MM' ? ProductItem.prd_length : null, //36
      '3', //ProductItem.prd_linearfeat, //37 Need to be defined
      '3', //ProductItem.prd_linearfeat_meters, //38 Need to be defined
      '3', //ProductItem.prd_x12innerdiameterum === 'IN' ? ProductItem.prd_innerdiameter : null, //39
      '3', //ProductItem.prd_x12innerdiameterum === 'MM' ? ProductItem.prd_innerdiameter : null, //40
      '3', //ProductItem.prd_x12outerdiameterum === 'IN' ? ProductItem.prd_outerdiameter : null, //41
      '3', //ProductItem.prd_x12outerdiameterum === 'MM' ? ProductItem.prd_outerdiameter : null, //42
      '3', //ProductItem.prd_pieces, //43
      'PC', //44 
      '3', //ProductItem.prd_grade, //45
      '3', //ProductItem.prd_materialclassification, //46
      null, //47  //need to be defined
      '3', //ProductItem.prd_materialstatus, //48  
      '3', //ProductItem.prd_edgecondition, //49 Need to be defined
      '3', //ProductItem.prd_materialspecification, //50 Need to be defined
      'O' //$51
])

  } catch (error) {
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }}



//MARK: Measure
//846 Measure Insert
async function insert846Measure(pool, InterchangeControl, Item, ProductItem, HeaderNameAddress, flag, filePath, index, InventoryHandoffHeader, itemIndex) {
 try {

  //Weights
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, InventoryHandoffHeader.ish_transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'PD','WT',null,ProductItem.prd_weight,ProductItem.prd_weight_um,HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

//Gauges
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, InventoryHandoffHeader.ish_transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'PD','TH',null,ProductItem.prd_gaugesize,ProductItem.prd_x12gaugeum,HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

//Width
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, InventoryHandoffHeader.ish_transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'PD','WD',null,ProductItem.prd_width,ProductItem.prd_x12widthum,HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

//UnitLength
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, InventoryHandoffHeader.ish_transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','LN',null,ProductItem.prd_length,ProductItem.prd_x12lengthum,HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

//Linear Length
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, InventoryHandoffHeader.ish_transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','LN',null,ProductItem.prd_coillength,ProductItem.prd_x12coillengthum,HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)
    
//Inside Diameter
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, InventoryHandoffHeader.ish_transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','ID',null,ProductItem.prd_innerdiameter,ProductItem.prd_x12innerdiameterum,HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)


//Outside Diameter
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, InventoryHandoffHeader.ish_transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','OD',null,ProductItem.prd_outerdiameter,ProductItem.prd_x12outerdiameterum,HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag)

async function insertmeasures(pool, key, hl1, bsn2, bol, heat, mcoil, prev, meas1, meas2, meas3f, meas3, meas4, n1sf, n1st, n1ma, locn, flag) {
      
  await pool.query( `INSERT INTO public."846_SNF_MEA"(
    mea_type, mea_key, mea_dtl_seq_no, mea_dtl_mea_seq_no, mea_measr, mea_measq, mea_measf, mea_measval, mea_measuom, mea_sttx_locn, mea_crt_dte, mea_crt_tme, mea_crt_pgm, mea_flow_flag)))
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
  [
    'O', //$1
    key, //$2
    '3',//itemIndex, //$3
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
    flag //$14
  ]);
    }

   
  } catch (error) {
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
  }}


}

  module.exports = {
    LoadO846SNF
};














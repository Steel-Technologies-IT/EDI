// This module handles the insertion of parsed EDI 861 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.


const chopOffDecimals = require('../../functions/chopoffdecimals.js');
const limitDecimals = require('../../functions/limitDecimals.js');
const readableErrors = require('../../functions/readableErrors.js');
const retrieveInboundASN = require('../../functions/retrieveInboundASN.js').retrieveInboundASN;
const retrieveMaterialStatus = require('../../functions/retrieveMaterialStatus.js').retrieveMaterialStatus;
let ymd;
let hms;
async function LoadO861SNF(pool, InterchangeControl, TransactionSet, ReceiptHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath) {

    ymd = InterchangeControl.ictl_createdDatetime.slice(0, 8);
    hms = InterchangeControl.ictl_createdDatetime.slice(8, 14);

let orginalHeader;
let orginalDetail;
let orginalNames;
let orginalMeasure;
let uniqueKeys = []; // Array to store unique keys

try {
  if (ProductItem && Array.isArray(ProductItem) && ProductItem.length > 0) {
    for (const product of ProductItem) {
      const key = await retrieveInboundASN(product.prd_customertagno, product.prd_heat, ProductItemNameAddress[0] && ProductItemNameAddress[0].prna_identificationcode ? ProductItemNameAddress[0].prna_identificationcode : null);
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

    await InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ReceiptHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, 
    Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath, orginalDetail, orginalHeader)
  }


  async function InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ReceiptHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath, orginalDetail, orginalHeader){
    
  await insert861Header(pool, InterchangeControl, ReceiptHeader[0],  flag, filePath, ProductItem);
    // Address Insertion

  await Promise.all(ProductItemNameAddress.map(async address => {
      await insert861Names(pool, InterchangeControl, address, flag, filePath);
  }));

  //Header Address Insertion
  await Promise.all(HeaderNameAddress.map(async address => {
    await insert861Names(pool, InterchangeControl, address,  flag, filePath);
  }));

  // Detail insertion
  await Promise.all(Item.map(async (Item, itemIndex) => {
    await Promise.all(ProductItem.filter(product => 
        product.prd_itemindex === Item.rtm_itemindex 
    ).map(async (ProductItem, productIndex) => {
        const orgDetail = orginalDetail?.rows?.filter(od => od.dtl_heat === ProductItem.prd_heat && od.dtl_mcoil === ProductItem.prd_customertagno) || [];
        await insert861Detail(pool, InterchangeControl, Item, ProductItem, ReceiptHeader[0], flag, filePath, itemIndex + 1, productIndex + 1, orgDetail, Damages[0]);
      }));
}));



// //MARK: Header
// //861 Header Insert
async function insert861Header(pool, InterchangeControl, ReceiptHeader, flag, filePath, ProductItem) {
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
     INSERT INTO public."861_SNF_Header"(
      hdr_type, hdr_key, hdr_isa_qual, hdr_isnd_id, hdr_gsnd_id, hdr_ircv_qual, hdr_ircv_id, hdr_grcv_id, 
      hdr_ictl_no, hdr_gctl_no, hdr_stctl_no, hdr_date_sent, hdr_time_sent, hdr_shp_no, hdr_rcpt_date, 
      hdr_purp_cd, hdr_rcpt_typ_cd, hdr_rcpt_tme, hdr_bol_no, hdr_mbol_no, hdr_rcv_dte, hdr_rcv_tme, 
      hdr_rcv_tme_zn, hdr_shp_dte, hdr_shp_tme, hdr_shp_tzn, hdr_prc_dte, hdr_prc_tme, hdr_prc_tzn, 
      hdr_scac, hdr_trl_no, hdr_op_qual, hdr_op_id, hdr_shpto_qual, hdr_shpto_id, hdr_shpfrm_qual, 
      hdr_shpfrm_id, hdr_mfg_qual, hdr_mfg_id, hdr_sum_rcd, hdr_sum_hsh_ttl, hdr_sttx_locn, hdr_crt_dat, 
      hdr_crt_tim, hdr_crt_pgm, hdr_flow_flag)

    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41, $42, $43, $44, $45, $46)
    `, [
      'O', //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      InterchangeControl.ictl_senderinterchangeidqualifier, //$3
      InterchangeControl.ictl_senderinterchangeid, //$4
      InterchangeControl.ictl_senderinterchangeid, //$5
      InterchangeControl.ictl_receiverinterchangeidqualifier, //$6  
      InterchangeControl.ictl_receiverinterchangeid, //$7
      InterchangeControl.ictl_receiverinterchangeid, //$8
      null, //$9 // hdr_ictl_no
      null, //$10 
      null, //$11 Needs to be defined
      InterchangeControl.ictl_createdDatetime.slice(0, 8), //$12
      InterchangeControl.ictl_createdDatetime.slice(8, 14), //$13
      ReceiptHeader.rct_vendorshipmentreference ? ReceiptHeader.rct_vendorshipmentreference : orginalDetail ? orginalDetail.rows[0].dtl_bsn2 : orginalHeader ? orginalHeader.rows[0].hdr_bsn_no : null, //$14 hdr_shp_no
      ReceiptHeader.rct_ReceiptDate, //$15
      '00', //$16 hdr_purp_cd
      '1',  //$17
      null, //$18
      ReceiptHeader.rct_vendorshipmentreference ? ReceiptHeader.rct_vendorshipmentreference : orginalDetail ? orginalDetail.rows[0].dtl_bsn2 : orginalHeader ? orginalHeader.rows[0].hdr_bsn_no : null, //$19 hdr_bol_no
      null, //$20 hdr_mbol_no
      String(ymd), //$21
      String(hms), //$22
      'ET', //$23
      String(ymd), //$24
      String(hms), //$25
      null, //$26
      null, //$27
      null, //$28
      null, //$29
      ReceiptHeader.rct_CarrierIdentificationCode, //$30
      null, //$31 
      null, //$32
      null, //$33
      null, //$34
      null, //$35 hdr_shpto_id
      null, //$36
      null, //$37
      null, //$38
      null, //$39
      null, //$40 hdr_sum_rcd
      totalPieces, //$41 hdr_sum_hsh_ttl
      null, //$42
      ymd, //$43
      hms, //$44
      'O861SNF', //$45
      flag //$60
    ]);


  } catch (error) {
    console.log(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }
};

//MARK: Names
  //861 Names Insert
async function insert861Names(pool, InterchangeControl, Address, flag, filePath) {
 try {
    await pool.query( `INSERT INTO public."861_SNF_Names"(
  name_type, name_key, name_qual, name_qual_id, name_id, name_name, name_addr1, name_addr2, name_city, name_state,
  name_zpcd, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_resp_cd, name_crt_dte, name_crt_tme, 
  name_crt_pgm, name_flow_flag)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
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
    null, //$13 Needs to be defined
    Address.hdna_telnumber ? Address.hdna_telnumber : Address.prna_telnumber, //$14
    null, //$15 Needs to be defined,
    null, //$16
    ymd, //$17
    hms, //$18
    'O861SNF', //$19
    flag //$20
  ]);
  } catch (error) {
    console.log(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
  }
}

//MARK: Detail
//861 Detail Insert
async function insert861Detail(pool, InterchangeControl, Item, ProductItem, ReceiptHeader, flag, filePath, itemIndex, productIndex, orginalDetail, Damages) {
 try {
  const materialStatus = await retrieveMaterialStatus(ProductItem.prd_taglotid);
  await pool.query(`INSERT INTO public."861_SNF_Detail"(
  dtl_type, dtl_key, dtl_line, dtl_shp_no, dtl_bol, dtl_mbol_no, dtl_rcv_dte, dtl_rcv_tme, dtl_rcv_tme_zn, dtl_rcv_qty, dtl_rcv_qty_uom, dtl_ret_qty, dtl_ret_qty_uom, dtl_qty_in_ques, dtl_qty_in_ques_uom, dtl_rcv_cond_cd, dtl_mo, dtl_mol, dtl_heat, dtl_mcoil, dtl_proc, dtl_prev, dtl_po, dtl_rls, dtl_pod, dtl_pol, dtl_cpart, dtl_apart, dtl_partd, dtl_grcd, dtl_rtn_cnt_no, dtl_cst_ref_no, dtl_pck_lst_no, dtl_awgtlb, dtl_awgtkg, dtl_twgtlb, dtl_twgtkg, dtl_gaugin, dtl_gaugmm, dtl_gaugt, dtl_widin, dtl_widmm, dtl_ulenin, dtl_ulenmm, dtl_lnft, dtl_lnmt, dtl_idin, dtl_idmm, dtl_odin, dtl_odmm, dtl_sts_dte, dtl_sts_tme, dtl_sts_tme_zn, dtl_qua_rtg_dte, dtl_qua_rtg_tme, dtl_qua_rtg_tme_zn, dtl_mcls67, dtl_msts70, dtl_falt72, dtl_scr_73, dtl_locn, dtl_odat, dtl_otim, dtl_opgm, dtl_flow_flag, dtl_tag_lot, dtl_pcs, dtl_prt_rev_no, dtl_msa)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69)`,
[
      'O', //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      ProductItem.itemnumber, //$3
      ReceiptHeader.rct_transactionreference, //$4
      ReceiptHeader.rct_transactionreference, //$5
      null, //$6 dtl_mbol_no
      ReceiptHeader.rct_ReceiptDate,  //$77
      null, //$8
      'ET', //$9
      Item.rtm_ReceivedPieces, //$10
      ProductItem.prd_coilform === 1 ? 'CX' : 'UN', //$11 dtl_rcv_qty_uom
      null, //$12
      null, //$13
      null, //$14
      null, //$15 
      null, //$16
      (orginalDetail && orginalDetail[0]) ? orginalDetail[0].dtl_mo : null, //$17 dtl_mo
      (orginalDetail && orginalDetail[0]) ? orginalDetail[0].dtl_mol : null, //$18 dtl_mol
      ProductItem.prd_heat, //$19
      ProductItem.prd_customertagno ? ProductItem.prd_customertagno : ProductItem.prd_vendortagid ? ProductItem.prd_vendortagid : null, //$20
      null, //$21 dtl_proc
      //ProductItem.prd_vendortagid, //22 dtl_prev
      (orginalDetail && orginalDetail[0]) ? orginalDetail[0].dtl_prev : null, //22 dtl_prev
      ProductItem.prd_externalordernumber ? ProductItem.prd_externalordernumber : (orginalDetail && orginalDetail[0]) ? orginalDetail[0].dtl_po || orginalDetail[0].dtl_cpo || orginalDetail[0].dtl_mo : null, //23 dtl_po 
      ProductItem.prd_externalorderrelease, //24 dtl_rls
      (orginalDetail && orginalDetail[0]) ? orginalDetail[0].dtl_pod : null, //25 dtl_pod
      ProductItem.prd_externalorderitem ? ProductItem.prd_externalorderitem : (orginalDetail && orginalDetail[0] && orginalDetail[0].dtl_pol && orginalDetail[0].dtl_pol !== '000'
      ? orginalDetail[0].dtl_pol : (orginalDetail && orginalDetail[0] && orginalDetail[0].dtl_mol && orginalDetail[0].dtl_mol !== '000'
      ? orginalDetail[0].dtl_mol : null)), //26 dtl_pol
      (ProductItem.prd_partnumber === "COC" || ProductItem.prd_partnumber == null) ? (orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_cpart : null) : ProductItem.prd_partnumber, //27 dtl_cpart
      null, //28 dtl_apart
      ProductItem.PartDescription, //29 dtl_partd
      ProductItem.prd_grade, //30 dtl_grcd
      null, //31 dtl_rtn_cnt_no
      null, //32 dtl_cst_ref_no
      null, //33 dtl_pck_lst_no
      ProductItem.prd_wgt_typ === 'A' && ProductItem.prd_x12actualweightum === 'LB' ? parseInt(ProductItem.prd_actualweight, 10) : ProductItem.prd_wgt_typ === 'A' && ProductItem.prd_x12actualweightum === 'KG' ? parseInt(ProductItem.prd_actualweight * 2.20462, 10) : null, //34 dtl_awgtlb
      ProductItem.prd_wgt_typ === 'A' && ProductItem.prd_x12actualweightum === 'KG' ? parseInt(ProductItem.prd_actualweight, 10) : ProductItem.prd_wgt_typ === 'A' && ProductItem.prd_x12actualweightum === 'LB' ? parseInt(ProductItem.prd_actualweight / 2.20462, 10) : null, //35 dtl_awgtkg
      ProductItem.prd_wgt_typ === 'T' && ProductItem.prd_x12actualweightum === 'LB' ? parseInt(ProductItem.prd_actualweight, 10) : ProductItem.prd_wgt_typ === 'T' && ProductItem.prd_x12actualweightum === 'KG' ? parseInt(ProductItem.prd_actualweight * 2.20462, 10) : null, //36 dtl_twgtlb
      ProductItem.prd_wgt_typ === 'T' && ProductItem.prd_x12actualweightum === 'KG' ? parseInt(ProductItem.prd_actualweight, 10) : ProductItem.prd_wgt_typ === 'T' && ProductItem.prd_x12actualweightum === 'LB' ? parseInt(ProductItem.prd_actualweight / 2.20462, 10) : null, //37 dtl_twgtkg
      ['ED', 'E8', 'EM', 'E7', 'IN'].includes(ProductItem.prd_x12gaugeum) ? ProductItem.prd_gaugesize : ['MM', 'MB', 'M2', 'MZ', 'MY'].includes(ProductItem.prd_x12widthum) ? ProductItem.prd_gaugesize / 25.4 : (orginalDetail && orginalDetail[0]) ? orginalDetail[0].dtl_gaugin : null, //38 dtl_gaugin
      ['MM', 'MB', 'M2', 'MZ', 'MY'].includes(ProductItem.prd_x12gaugeum) ? ProductItem.prd_gaugesize : ['ED', 'E8', 'EM', 'E7', 'IN'].includes(ProductItem.prd_x12widthum) ? ProductItem.prd_gaugesize * 25.4 : (orginalDetail && orginalDetail[0]) ? orginalDetail[0].dtl_gaugmm : null, //39 dtl_gaugmm  
      ['ED', 'MB'].includes(ProductItem.prd_x12gaugeum) ? 'NOM' : ['EM', 'MZ'].includes(ProductItem.prd_x12gaugeum) ? 'MIN' : null, //40 dtl_gaugt
      ProductItem.prd_x12widthum === 'IN' ? ProductItem.prd_width : ProductItem.prd_x12widthum === 'MM' ? (ProductItem.prd_width / 25.4) : null, //41 dtl_widin
      ProductItem.prd_x12widthum === 'MM' ? ProductItem.prd_width : ProductItem.prd_x12widthum === 'IN' ? (ProductItem.prd_width * 25.4): null, //42 dtl_widmm
      ProductItem.prd_x12lengthum === 'IN' && ProductItem.prd_length > 0 ? ProductItem.prd_length : ProductItem.prd_x12lengthum === 'MM' && ProductItem.prd_length > 0 ? (ProductItem.prd_length / 25.4) : null, //43 dtl_ulenin
      ProductItem.prd_x12lengthum === 'MM' && ProductItem.prd_length > 0 ? ProductItem.prd_length : ProductItem.prd_x12lengthum === 'IN' && ProductItem.prd_length > 0 ? (ProductItem.prd_length * 25.4) : null, //44 dtl_ulenmm
      ['FT', 'LF'].includes(ProductItem.prd_x12coillengthum) ? ProductItem.prd_coillength : ['MT', 'MR'].includes(ProductItem.prd_x12coillengthum) ? ProductItem.prd_coillength * 3.28084 : (orginalDetail && orginalDetail[0]) ? orginalDetail[0].dtl_lnft : null, //45 dtl_lnft
      ['MT', 'MR'].includes(ProductItem.prd_x12coillengthum) ? ProductItem.prd_coillength : ['FT', 'LF'].includes(ProductItem.prd_x12coillengthum) ? ProductItem.prd_coillength / 3.28084 : (orginalDetail && orginalDetail[0]) ? orginalDetail[0].dtl_lnmt : null, //46 dtl_lnmt 
      ProductItem.prd_x12innerdiameterum === 'IN' && ProductItem.prd_innerdiameter > 0 ? ProductItem.prd_innerdiameter : ProductItem.prd_x12innerdiameterum === 'MM' && ProductItem.prd_innerdiameter > 0 ? ProductItem.prd_innerdiameter / 25.4 : null, //47 dtl_idin
      ProductItem.prd_x12innerdiameterum === 'MM' && ProductItem.prd_innerdiameter > 0 ? ProductItem.prd_innerdiameter : ProductItem.prd_x12innerdiameterum === 'IN' && ProductItem.prd_innerdiameter > 0 ? ProductItem.prd_innerdiameter * 25.4 : null, //48 dtl_idmm
      ProductItem.prd_x12outerdiameterum === 'IN' && ProductItem.prd_outerdiameter > 0 ? ProductItem.prd_outerdiameter : ProductItem.prd_x12outerdiameterum === 'MM' && ProductItem.prd_outerdiameter > 0 ? ProductItem.prd_outerdiameter / 25.4 : null, //49 dtl_odin
      ProductItem.prd_x12outerdiameterum === 'MM' && ProductItem.prd_outerdiameter > 0 ? ProductItem.prd_outerdiameter : ProductItem.prd_x12outerdiameterum === 'IN' && ProductItem.prd_outerdiameter > 0 ? ProductItem.prd_outerdiameter * 25.4 : null, //50 dtl_odmm
      ymd, //$51
      hms, //$52 
      null, //$53
      null, //$54
      null, //$55 
      null, //$56
      ProductItem.prd_materialclassification, //$57 dtl_mcls67
      materialStatus ? materialStatus : ProductItem.prd_materialstatus, //$58  dtl_msts70
      (Damages && Damages.dmg_FaultCode) ? Damages.dmg_FaultCode : null, //$59 dtl_falt72
      (Damages && Damages.dmg_DamageCode) ? Damages.dmg_DamageCode : null, //$60 dtl_scr_73
      null, //61
      ymd,    //$62
      hms,   //63
      'O861SNF', //$64
      flag, //$65
      ProductItem.prd_taglotid, //$66
      ProductItem.prd_pieces, //$67
      (orginalDetail && orginalDetail[0]) ? orginalDetail[0].dtl_poc : null,//$68 
      (orginalDetail && orginalDetail[0]) ? orginalDetail[0].dtl_msa : null //$69
])

  } catch (error) {
    console.error(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }}

}

  module.exports = {
    LoadO861SNF
};
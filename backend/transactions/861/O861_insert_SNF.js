// This module handles the insertion of parsed EDI 861 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.


const chopOffDecimals = require('../../functions/chopoffdecimals.js');
const limitDecimals = require('../../functions/limitDecimals.js');
const  readableErrors = require('../../functions/readableErrors.js');
let ymd;
let hms;
async function LoadO861SNF(pool, InterchangeControl, TransactionSet, ReceiptHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath) {
      // If ProductItem is an array, process each one
// console.log(InterchangeControl.ictl_createdDatetime);
// if (InterchangeControl.ictl_createdDatetime && InterchangeControl.ictl_createdDatetime.length >= 14) {
    ymd = InterchangeControl.ictl_createdDatetime.slice(0, 8);
    hms = InterchangeControl.ictl_createdDatetime.slice(8, 14);
// } else {
//     ymd = null;
//     hms = null;
//     console.error("ictl_createddatetime is missing or too short:", InterchangeControl.ictl_createdDatetime);
// }

let orginalHeader;
let orginalDetail;
let orginalNames;
let oldKey;
try {
  if (Array.isArray(ProductItem)) {
    for (const product of ProductItem) {
       oldKey = await pool.query(`
        SELECT dtl_key FROM "861_SNF_Detail" 
        INNER JOIN "861_SNF_Names" names ON names.name_key = "861_SNF_Detail".dtl_key
        WHERE dtl_heat = $1 
        AND dtl_mcoil = $2 
        AND names.name_id = $3
      `, [
        product.pitm_heat, 
        product.pitm_customertagno, 
        ProductItemNameAddress[0].pita_identificationcode
      ]);
      if (oldKey.rows.length > 0) {
        break;
      }
      
    }
  } 

orginalHeader = await pool.query('SELECT * FROM "861_SNF_Header" WHERE hdr_key = $1', [oldKey.rows[0].dtl_key]);
orginalDetail = await pool.query('SELECT * FROM "861_SNF_Detail" WHERE dtl_key = $1', [oldKey.rows[0].dtl_key]);
orginalNames = await pool.query('SELECT * FROM "861_SNF_Names" WHERE name_key = $1', [oldKey.rows[0].dtl_key]);
console.log('Found Previous ASN')
} catch (error) {
  console.log("No previous ASN found:");
}


//Weights for item and order level
let sumofproductweights = {};
let sumofweight = 0;
try {
    
    
    if (ProductItem) {
        ProductItem.forEach(prod => {
            const partNumber = prod.pitm_partnumber;
            const weight = parseFloat(prod.pitm_actualweight ? prod.pitm_actualweight : 0);
            
            // If this part number already exists, add to the existing weight
            if (sumofproductweights[partNumber]) {
                sumofproductweights[partNumber] += weight;
            } else {
                // First occurrence of this part number
                sumofproductweights[partNumber] = weight;
            }
            
            // Also add to total weight
            sumofweight += weight;
        });
        
        //console.log('Sum of product weights by part number:', sumofproductweights);
        //console.log('Total weight:', sumofweight);
    }
} catch (error) {
    console.log(error);
}

let sumofitemweights = {};
let sumweight = 0;
try {
    if (ProductItem && Item) {
        Item.forEach(Itm => {
            // Filter ProductItems to only those where pitm_itemindex matches shp_itemindex
            const matchingProducts = ProductItem.filter(prod => prod.pitm_itemindex === Itm.rtm_itemindex);
            
            matchingProducts.forEach(prod => {
                const key = Itm.rtm_invexreferencenumber + '-' + Itm.rtm_invexreferencetype + '-' + Itm.rtm_itemindex;
                const weight = parseFloat(prod.pitm_actualweight ? prod.pitm_actualweight : 0);

                // If this key already exists, add to the existing weight
                if (sumofitemweights[key]) {
                    sumofitemweights[key] += weight;
                } else {
                    // First occurrence of this key
                    sumofitemweights[key] = weight;
                }

                // Also add to total weight
                sumweight += weight;
            });
        });
        
        //console.log('Sum of item weights by key:', sumofitemweights);
        //console.log('Total matched weight:', sumweight);
    }
} catch (error) {
    console.log(error);
}

  

    await InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ReceiptHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, 
    Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath, orginalDetail, sumofproductweights, sumofitemweights)
  }
      

  async function InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ReceiptHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath, orginalDetail, sumofproductweights, sumofitemweights){

    
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
        product.pitm_itemindex === Item.rtm_itemindex 
    ).map(async (ProductItem, productIndex) => {
        await insert861Detail(pool, InterchangeControl, Item, ProductItem, ReceiptHeader[0], flag, filePath, itemIndex + 1, productIndex + 1, orginalDetail, sumofproductweights, sumofitemweights);
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
      ? ProductItem.reduce((sum, p) => sum + toNum(p?.pitm_pieces ?? p?.pitm_pcs ?? p?.pieces), 0)
      : toNum(ProductItem?.pitm_pieces ?? ProductItem?.pitm_pcs ?? ProductItem?.pieces);
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
      ReceiptHeader.rct_transactionreference, //$14 
      ReceiptHeader.rct_ReceiptDate, //$15
      null, //$16 
      '1',  //$17
      null, //$18
      ReceiptHeader.rct_transactionreference, //$19
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
    Address.adr_addresstype ? Address.adr_addresstype : Address.pita_addresstype, //$3
    Address.adr_identificationcodequalifier ? Address.adr_identificationcodequalifier : Address.pita_identificationcodequalifier ? Address.pita_identificationcodequalifier : '01',
    Address.adr_identificationcode ? Address.adr_identificationcode : Address.pita_identificationcode ? Address.pita_identificationcode : " ", //$5
    Address.adr_nameline1 ? Address.adr_nameline1 : Address.pita_nameline1, //$6
    Address.adr_addressline1 ? Address.adr_addressline1 : Address.pita_addressline1, //$7
    Address.adr_addressline2 ? Address.adr_addressline2 : Address.pita_addressline2, //$8
    Address.adr_city ? Address.adr_city : Address.pita_city, //$9
    Address.adr_stateprovincecode ? Address.adr_stateprovincecode : Address.pita_stateprovincecode, //$10
    Address.adr_postalcode ? Address.adr_postalcode : Address.pita_postalcode, //$11
    Address.adr_countrycode ? Address.adr_countrycode : Address.pita_countrycode, //$12
    null, //$13 Needs to be defined
    Address.adr_telnumber ? Address.adr_telnumber : Address.pita_telnumber, //$14
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
async function insert861Detail(pool, InterchangeControl, Item, ProductItem, ReceiptHeader, flag, filePath, itemIndex, productIndex, orginalDetail, sumofproductweights, sumofitemweights) {
 try {
  await pool.query(`INSERT INTO public."861_SNF_Detail"(
  dtl_type, dtl_key, dtl_line, dtl_shp_no, dtl_bol, dtl_mbol_no, dtl_rcv_dte, dtl_rcv_tme, dtl_rcv_tme_zn, dtl_rcv_qty, dtl_rcv_qty_uom, dtl_ret_qty, dtl_ret_qty_uom, dtl_qty_in_ques, dtl_qty_in_ques_uom, dtl_rcv_cond_cd, dtl_mo, dtl_mol, dtl_heat, dtl_mcoil, dtl_proc, dtl_prev, dtl_po, dtl_rls, dtl_pod, dtl_pol, dtl_cpart, dtl_apart, dtl_partd, dtl_grcd, dtl_rtn_cnt_no, dtl_cst_ref_no, dtl_pck_lst_no, dtl_awgtlb, dtl_awgtkg, dtl_twgtlb, dtl_twgtkg, dtl_gaugin, dtl_gaugmm, dtl_gaugt, dtl_widin, dtl_widmm, dtl_ulenin, dtl_ulenmm, dtl_lnft, dtl_lnmt, dtl_idin, dtl_idmm, dtl_odin, dtl_odmm, dtl_sts_dte, dtl_sts_tme, dtl_sts_tme_zn, dtl_qua_rtg_dte, dtl_qua_rtg_tme, dtl_qua_rtg_tme_zn, dtl_mcls67, dtl_msts70, dtl_falt72, dtl_scr_73, dtl_locn, dtl_odat, dtl_otim, dtl_opgm, dtl_flow_flag, dtl_tag_lot, dtl_pcs, dtl_prt_rev_no)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68)`,
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
      Item.rtm_X12ReceivedPiecesUM, //$11 dtl_rcv_qty_uom
      null, //$12
      null, //$13
      null, //$14
      null, //$15 
      null, //$16
      ProductItem.pitm_millorderno, //$17
      ProductItem.pitm_mol, //$18
      ProductItem.pitm_heat, //$19
      ProductItem.pitm_customertagno, //$20
      null, //$21 dtl_proc
      ProductItem.pitm_vendortagid, //22 dtl_prev
      ProductItem.pitm_externalordernumber, //23 dtl_po 
      ProductItem.pitm_externalorderrelease, //24 dtl_rls
      ProductItem.pitm_externalorderdate ? ProductItem.pitm_externalorderdate : orginalDetail ? orginalDetail.rows[0].dtl_cpod : null, //25 dtl_pod
      ProductItem.pitm_externalorderitem ? ProductItem.pitm_externalorderitem : orginalDetail ? orginalDetail.rows[0].dtl_cpol : null, //26 dtl_pol
      ProductItem.pitm_partnumber, //27 dtl_cpart
      null, //28 dtl_apart
      ProductItem.PartDescription, //29 dtl_partd
      ProductItem.pitm_grade, //30 dtl_grcd
      null, //31 dtl_rtn_cnt_no
      null, //32 dtl_cst_ref_no
      null, //33 dtl_pck_lst_no
      ProductItem.pitm_wgt_typ === 'A' && ProductItem.pitm_x12actualweightum === 'LB' ? parseInt(ProductItem.pitm_actualweight, 10) : null, //34 dtl_awgtlb
      ProductItem.pitm_wgt_typ === 'A' && ProductItem.pitm_x12actualweightum === 'KG' ? parseInt(ProductItem.pitm_actualweight, 10) : null, //35 dtl_awgtkg
      ProductItem.pitm_wgt_typ === 'T' && ProductItem.pitm_x12actualweightum === 'LB' ? parseInt(ProductItem.pitm_actualweight, 10) : null, //36 dtl_twgtlb
      ProductItem.pitm_wgt_typ === 'T' && ProductItem.pitm_x12actualweightum === 'KG' ? parseInt(ProductItem.pitm_actualweight, 10) : null, //37 dtl_twgtkg
      ProductItem.pitm_x12gaugeum === 'ED' ? ProductItem.pitm_gaugesize : null, //38 dtl_gaugin
      ProductItem.pitm_gaugesize !== 'MM' ? ProductItem.pitm_gaugesize : null, //39 dtl_gaugmm
      ProductItem.pitm_x12gaugeum, //40 dtl_gaugt
      ProductItem.pitm_x12widthum === 'IN' ? ProductItem.pitm_width : null, //41 dtl_widin
      ProductItem.pitm_x12widthum === 'MM' ? ProductItem.pitm_width : null, //42 dtl_widmm
      ProductItem.pitm_x12lengthum === 'IN' ? ProductItem.pitm_length : null, //43 dtl_ulenin
      ProductItem.pitm_x12lengthum === 'MM' ? ProductItem.pitm_length : null, //44 dtl_ulenmm
      ProductItem.pitm_x12lengthum === 'FT' ? ProductItem.pitm_length : null, //45 dtl_lnft
      ProductItem.pitm_x12lengthum === 'M' ? ProductItem.pitm_length : null, //46 dtl_lnmt
      ProductItem.pitm_x12innerdiameterum === 'IN' ? ProductItem.pitm_innerdiameter : null, //47 dtl_idin
      ProductItem.pitm_x12innerdiameterum === 'MM' ? ProductItem.pitm_innerdiameter : null, //48 dtl_idmm
      ProductItem.pitm_x12outerdiameterum === 'IN' ? ProductItem.pitm_outerdiameter : null, //49 dtl_odin
      ProductItem.pitm_x12outerdiameterum === 'MM' ? ProductItem.pitm_outerdiameter : null, //50 dtl_odmm
      ymd, //$51
      hms, //$52 
      null, //$53
      null, //$54
      null, //$55 
      null, //$56
      null, //$57
      null, //$58
      null, //$59
      null, //$60
      null, //61
      ymd,    //$62
      hms,   //63
      'O861SNF', //$64
      flag, //$65
      ProductItem.pitm_taglotid, //$66
      ProductItem.pitm_pieces, //$67
      Item.rtm_partrevisionnumber //$68 
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







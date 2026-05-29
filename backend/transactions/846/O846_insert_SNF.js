// This module handles the insertion of parsed EDI 846 records into the PostgreSQL database. 
// It exports functions to insert header, detail and names records into their respective tables.


const  readableErrors = require('../../functions/readableErrors.js');
const chopOffDecimals = require('../../functions/chopoffdecimals.js');
const limitDecimals = require('../../functions/limitDecimals.js');
const retrieveMaterialStatus = require('../../functions/retrieveMaterialStatus.js').retrieveMaterialStatus;
const queryInvexDatabase = require('../../Invex/InvexConnection.js');

let ymd;
let hms;

async function LoadO846SNF(pool, InterchangeControl, TransactionSet, InventoryHandoffHeader, HeaderNameAddress, ProductItem, Damages, Errors, flag) 
  {
ymd = InterchangeControl.ictl_created_datetime.slice(0, 8);
hms = InterchangeControl.ictl_created_datetime.slice(8, 14);
    console.log("O846 Insert SNF Module Loaded");
        await InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, InventoryHandoffHeader, HeaderNameAddress, ProductItem, Damages, Errors, flag);
        }       



// Function to get Mill Heat from Lift ID
const getMillHeatfromLiftID = async (LiftID) => {
  
  const sql = `SELECT pcr_mill_id, pcr_heat
                FROM intpcr_rec
                INNER JOIN injitd_rec ON itd_itm_ctl_no = pcr_itm_ctl_no
                WHERE itd_tag_no = '${LiftID}'
                limit 1;`

  const result = await queryInvexDatabase(sql);
  console.log("Mill Heat for Lift ID " + LiftID + ":", result.Data);
  return result.Data?.[0] || null;
}        
async function InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, InventoryHandoffHeader, HeaderNameAddress, ProductItem, Damages, Errors, flag)
  {

    //Weights for InventoryHandoffHeader level
let sumofproductweights = {};
let sumofweight = 0;
try {
    
    
if (InventoryHandoffHeader) {
    InventoryHandoffHeader.forEach(HandHdr => {
        const TranRef = HandHdr.invhdr_transaction_reference ? HandHdr.invhdr_transaction_reference : 0;
        const weight = parseFloat(HandHdr.invhdr_weight ? HandHdr.invhdr_weight : 0);
        
        // If this part number already exists, add to the existing weight
        if (sumofproductweights[TranRef]) {
            sumofproductweights[TranRef] += weight;
        } else {
            // First occurrence of this part number
            sumofproductweights[TranRef] = weight;
        }
        
        // Also add to total weight
        sumofweight += weight;
    });
    
    // Round all weights to remove floating-point precision errors and chop off decimals
    for (const TranRef of Object.keys(sumofproductweights)) {
        sumofproductweights[TranRef] = await chopOffDecimals(sumofproductweights[TranRef]); // Add await
    }
    sumofweight = await chopOffDecimals(sumofweight); // Add await
    
    console.log('Sum of product weights by part number:', sumofproductweights);
    console.log('Total weight:', sumofweight);
}
} catch (error) {
    console.log(error);
}
//////////////////
    //await Promise.all(InventoryHandoffHeader.map(async InventoryHandoffHeader => {await insert846Header(pool, InterchangeControl, TransactionSet, InventoryHandoffHeader, HeaderNameAddress, ProductItem, flag)}));
  await insert846Header(pool, InterchangeControl, TransactionSet, InventoryHandoffHeader, HeaderNameAddress, sumofweight, ProductItem, flag);


  //Header Address Insertion
  await Promise.all(HeaderNameAddress.map(async address => {
    await insert846Names(pool, InterchangeControl, address, InventoryHandoffHeader, flag);
  }));

  // Detail
  const uniqueLiftIds = [...new Set(ProductItem.filter(product => product.prd_lift_id != null).map(product => product.prd_lift_id))];
  const uniquesttxLocn = [...new Set(ProductItem.filter(product => product.prd_sttx_locn != null).map(product => product.prd_sttx_locn))];
  let LiftIDList = [];
  console.log('LiftId', uniqueLiftIds, uniqueLiftIds.length);

  for (let [sttxlocnIndex, sttxlocn] of uniquesttxLocn.entries()) {
    const matchingProducts = ProductItem.filter(product => product.prd_sttx_locn === sttxlocn).sort((a, b) => a.prd_itemnumber - b.prd_itemnumber);
    let detailRecordIndex = 0;  // Track only inserted record
      for (let [productIndex, product] of matchingProducts.entries()) {
      // Check for Lift ID and ensure uniqueness
      if (product.prd_lift_id && uniqueLiftIds.includes(product.prd_lift_id)) {
        if (!LiftIDList.includes(product.prd_lift_id)) {
          const totalPieces = ProductItem.filter(p => p.prd_lift_id === product.prd_lift_id).reduce((sum, item) => sum + (Number(item.prd_pieces) || 0), 0);
          const totalWeight = ProductItem.filter(p => p.prd_lift_id === product.prd_lift_id).reduce((sum, item) => sum + (Number(item.prd_actualweight) || 0), 0);
          const MillHeat = await getMillHeatfromLiftID(product.prd_lift_id);
          const productItm = MillHeat ? ProductItem.find(p => String(p.prd_lift_id).trim() === String(product.prd_lift_id).trim() && String(p.prd_heat).trim() === String(MillHeat.pcr_heat).trim() && String(p.prd_customertagno).trim() === String(MillHeat.pcr_mill_id).trim()) || product : product;
          console.log('MillHeat for LiftID', productItm.prd_lift_id, ':', MillHeat, 'with heat', productItm.prd_heat, 'and coil', productItm.prd_customertagno);
          detailRecordIndex++;  // Increment only when inserting
          await insert846Detail(pool, detailRecordIndex, InterchangeControl, productItm, HeaderNameAddress, InventoryHandoffHeader, flag, totalPieces, totalWeight);
          LiftIDList.push(product.prd_lift_id);
          console.log('Inserted detail record with LiftID:', product.prd_lift_id);
          } else {
          console.log('Skipped split duplicate LiftID:', product.prd_lift_id);
          }
      } else {
        detailRecordIndex++;  // Increment only when inserting
        await insert846Detail(pool, detailRecordIndex, InterchangeControl, product, HeaderNameAddress, InventoryHandoffHeader, flag);
        console.log('Inserted split detail record without TaglotID:', product.prd_taglotid);
      } 
  }
 }
 }  
// //MARK: Header
// //846 Header Insert
async function insert846Header(pool, InterchangeControl, TransactionSet, InventoryHandoffHeader, HeaderNameAddress, sumofweight, ProductItem, flag) 
{
 const NumberOfLines = ProductItem.length;
 InventoryHandoffHeader ? await Promise.all(InventoryHandoffHeader.map(async InventoryHandoffHeader =>{
   try {
    await pool.query(`
     INSERT INTO public."846_SNF_Header" (hdr_type, hdr_key, hdr_isa_qual, hdr_isnd_id, hdr_gsnd_id, hdr_ircv_qual, hdr_ircv_id, hdr_grcv_id, hdr_ictl_no, hdr_gctl_no, hdr_stctl_no, hdr_dsent, hdr_tsent, hdr_purpcode, hdr_invrptcd, hdr_rptrefid, hdr_rptdate, hdr_rpttime, hdr_actioncd, hdr_invdate, hdr_invtime, hdr_invtimezn, hdr_mfgidq, hdr_mfgid, hdr_opidq, hdr_opid, hdr_sumlin, hdr_sumhash, hdr_sttx_locn, hdr_crt_dat, hdr_crt_tim, hdr_crt_pgm, hdr_flow_flag, hdr_func_no
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34)
    `, [
      "O",
      InterchangeControl.ictl_key, 
      InterchangeControl.ictl_sender_interchange_id_qualifier, 
      InterchangeControl.ictl_sender_interchange_id, 
      null, 
      InterchangeControl.ictl_receiver_interchange_id_qualifier, 
      InterchangeControl.ictl_receiver_interchange_id, 
      null, 
      TransactionSet.id,
      null,
      TransactionSet.trnset_transaction_set_control_number, 
      InterchangeControl.ictl_created_datetime.slice(0, 8), 
      InterchangeControl.ictl_created_datetime.slice(8, 14), 
      '00', 
      null, 
      InterchangeControl.ictl_edix_control_number, 
      InterchangeControl.ictl_created_datetime.slice(0, 8), 
      InterchangeControl.ictl_created_datetime.slice(8, 14), 
      null, 
      InterchangeControl.ictl_created_datetime.slice(0, 8),  
      InterchangeControl.ictl_created_datetime.slice(8, 14), 
      null, 
      1, // 23 
      null, 
      null, 
      null, 
      NumberOfLines,
      sumofweight, //Math.trunc(  typeof InventoryHandoffHeader.invhdr_weight === number' && !isNaN(InventoryHandoffHeader.invhdr_weight) ? nventoryHandoffHeader.invhdr_weight : 0),
      InventoryHandoffHeader.invhdr_sttx_locn ? InventoryHandoffHeader.invhdr_sttx_locn : 0, 
      null, 
      null, 
      null, 
      InterchangeControl.ictl_flow_flag, 
      null
    ]);


  } catch (error) {
    console.log(error)
   }
  })) : null;
};

//MARK: Names
  //846 Names Insert
async function insert846Names(pool, InterchangeControl, Address, InventoryHandoffHeader, flag) 
{

 // InventoryHandoffHeader ? await Promise.all(InventoryHandoffHeader.map(async InventoryHandoffHeader =>{
 try {
    await pool.query( `INSERT INTO public."846_SNF_Names"(
  name_addresstype, name_key, name_nameq, name_nameid, name_name, name_addr1, name_addr2, name_city, name_state, name_zpcd, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_resp_party_cd, name_crt_dte, name_crt_tme, name_crt_pgm, name_flow_flag, name_sttx_locn, name_qual_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21);`,
  [
    "O", //$1
    InterchangeControl.ictl_edix_control_number, //$2
    Address.hdna_addresstype ? Address.hdna_addresstype : Address.prna_addresstype, //$3
    Address.hdna_identificationcode ? Address.hdna_identificationcode : Address.prna_identificationcode, //$5
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
    null, //$16 Needs to be defined
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)), //$17
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)), //$18
    "O846SNF", //$19
    flag, //$20
    Address.hdna_sttx_locn,  //$21 //InventoryHandoffHeader.invhdr_sttx_locn ? InventoryHandoffHeader.invhdr_sttx_locn : 0 //$20
    Address.hdna_identificationcodequalifier
  ]);
  } catch (error) {
    console.log(error)
     const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edix_control_number, ' ');
     console.error('-', InterchangeControl.ictl_edix_control_number, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edix_control_number, '-');
  }
    //})) : null;
}

//MARK: Detail
//846 Detail Insert
async function insert846Detail(pool, index, InterchangeControl, ProductItem, HeaderNameAddress, InventoryHandoffHeader, flag, totalPieces = null, totalWeight = null, MillHeat) 
{
 try {
  const Weight =  ProductItem.prd_lift_id === null || ProductItem.prd_lift_id === ''? ProductItem.prd_actualweight : totalWeight;
  const Pieces =  ProductItem.prd_lift_id === null || ProductItem.prd_lift_id === ''? ProductItem.prd_pieces : totalPieces;
  let gaugIN = ProductItem.prd_x12gaugeum.includes('ED', 'E8', 'EM', 'E7', 'IN') ? ProductItem.prd_gaugesize : ProductItem.prd_x12gaugeum === 'EM' ? (ProductItem.prd_gaugesize / 25.4) : null;
  gaugIN = await limitDecimals(gaugIN, 4);
  let widthIN = ProductItem.prd_x12widthum.includes('IN', 'MM', 'MB', 'M2', 'MZ', 'MY') ? ProductItem.prd_width : ProductItem.prd_x12widthum === 'MM' ? (ProductItem.prd_width / 25.4) : null;
  widthIN = await limitDecimals(widthIN, 4);
  let lengthIN = ProductItem.prd_x12lengthum === 'IN' ? ProductItem.prd_length : ProductItem.prd_x12lengthum === 'MM' ? (ProductItem.prd_length / 25.4) : null;
  lengthIN = await limitDecimals(lengthIN, 4);
  let weightLB = ProductItem.prd_x12actualweightum === 'LB' ?  Number(Weight) :  ProductItem.prd_x12actualweightum === 'KG' ?  Number(Weight * 2.20462) : null;
  weightLB = await limitDecimals(weightLB, 4);
  let LinearFeet = ProductItem.prd_x12coillengthum === 'FT' ? ProductItem.prd_coillength : ProductItem.prd_x12coillengthum === 'MR' ? (ProductItem.prd_coillength * 3.28084) : null;
  LinearFeet = await limitDecimals(LinearFeet, 4);
  let x$MatClsDte = null;
  let x$MatClsTim = null;
  if(ProductItem.prd_materialclassificationdatetime!==null)
    {x$MatClsDte = ProductItem.prd_materialclassificationdatetime.slice(0, 8);
     x$MatClsTim = ProductItem.prd_materialclassificationdatetime.slice(8, 14);
    }

  const ChgInTag =    ProductItem.prd_lift_id ? ProductItem.prd_lift_id : ProductItem.prd_taglotid;
  const materialStatus = ChgInTag ? await retrieveMaterialStatus(ChgInTag) : null;
  //console.log("Damage in Charge Out Detail:", Damage[0], "Charge Out Tag:", ChgOutTag);

  await pool.query(`INSERT INTO public."846_SNF_Detail"(
dtl_type, dtl_key, dtl_det_seq_no, dtl_line_asd_id, dtl_mo, dtl_mol, dtl_mcoil, dtl_heat, dtl_po, dtl_pol, dtl_pod, dtl_bpart, dtl_other, dtl_plistno, dtl_proc, dtl_prev, dtl_tagtyp, dtl_tag, dtl_lot, dtl_v_prod_no, dtl_cons_class, dtl_backout_cd, dtl_consignee_no, dtl_eff_dte, dtl_eff_tme, dtl_eff_tme_zn, dtl_inv_dte, dtl_inv_tme, dtl_inv_tme_zn, dtl_rcv_dte, dtl_iss_dte, dtl_qty_rtg_dte, dtl_qty_rtg_tme, dtl_qty_rtg_tme_zn, dtl_mat_class, dtl_mat_sts, dtl_act_wgt, dtl_gauge, dtl_gauge_tpe, dtl_width, dtl_lin_ft, dtl_unit_len, dtl_pcs, dtl_rcv_qty, dtl_use_qty, dtl_onhand_qty, dtl_sttx_locn, dtl_mat_class_dte, dtl_mat_class_tme, dtl_crt_dte, dtl_crt_tme, dtl_crt_pgm, dtl_flow_flag, dtl_idin, dtl_odin, dtl_lift_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56);`,
[
  
 "O", //$1
 InterchangeControl.ictl_edix_control_number, //$2
 index + 1, //$3 Line Number
 index, //$4 ASD ID
 ProductItem.prd_millorderno, // $5,
 null, // $6,
 ProductItem.prd_customertagno ? ProductItem.prd_customertagno : ProductItem.prd_vendortagid ? ProductItem.prd_vendortagid : null,// $7, Mill Coil ID
 ProductItem.prd_heat, // $8,
 ProductItem.prd_externalordernumber, // $9, PO
 null, // $10, POL
 ProductItem.prd_externalorderdate ? ProductItem.prd_externalorderdate.slice(0, 8) : null, //$11, POD
 ProductItem.prd_partnumber, // $12, Part Number
 null, // $13,
 null, // $14,
 ProductItem.prd_opscurrentprocess, // $15, 
 ProductItem.prd_outsideprocessortagid, // $16,
 null, // $17,
 ProductItem.prd_lift_id? ProductItem.prd_lift_id : ProductItem.prd_taglotid, // $18,
 null, //19,
 null, // $20,
 null, // $21,
 null, // $22,
 ProductItem.prd_partcustomerid, // $23,
 null, // $24,
 null, // $25,
 null, // $26,
 null, // $27,
 null, // $28,
 null, // $29,
 null, // $30,
 null, // $31,
 null, // $32,
 null, // $33,
 null, // $34,
 ProductItem.prd_materialclassification, // $35, Mat Class
 materialStatus ? materialStatus : ProductItem.prd_materialstatus, //ProductItem.prd_materialstatus, // $36, Mat Status
 weightLB, //ProductItem.prd_actualweight, // $37,
 gaugIN,     //ProductItem.prd_gaugesize, // $38,
 null,// $39,
 widthIN, // ProductItem.prd_width, // $40,
 LinearFeet, //ProductItem.prd_coillength, // $41,
 lengthIN,  //ProductItem.prd_length, // $42,
 Pieces, //ProductItem.prd_pieces, // $43,
 null, // $44,
 null, // $45,
 null, // $46,
 ProductItem.prd_sttx_locn ? ProductItem.prd_sttx_locn : 0, // null, // $47,
 x$MatClsDte, //ProductItem.prd_materialclassificationdatetime.slice(0, 8) ? ProductItem.prd_materialclassificationdatetime.slice(0, 8): null, //$48
 x$MatClsTim, //ProductItem.prd_materialclassificationdatetime.slice(8, 14) ? ProductItem.prd_materialclassificationdatetime.slice(8, 14): null, //$49
 ymd, //$50
 hms, //$51
 "O846SNF", //$52
 flag, // $53
 ProductItem.prd_coilinnerdiameter ? await limitDecimals(ProductItem.prd_coilinnerdiameter,4) : null, //$54
 ProductItem.prd_coilouterdiameter ? await limitDecimals(ProductItem.prd_coilouterdiameter,4) : null, //$55
 ProductItem.prd_lift_id //$56
    ])

  } catch (error) {
    console.log(error);  
     const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edix_control_number, ' ');  
     console.error('-', InterchangeControl.ictl_edix_control_number, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edix_control_number, '-');
   }}


  module.exports = 
  {
    LoadO846SNF
  };
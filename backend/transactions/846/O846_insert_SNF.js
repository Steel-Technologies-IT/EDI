// This module handles the insertion of parsed EDI 846 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.


const  readableErrors = require('../../functions/readableErrors.js');
const chopOffDecimals = require('../../functions/chopoffdecimals.js');

async function LoadO846SNF(pool, InterchangeControl, TransactionSet, InventoryHandoffHeader, HeaderNameAddress, ProductItem, Damages, Errors, flag) 
  {
    console.log("O846 Insert SNF Module Loaded");
        await InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, InventoryHandoffHeader, HeaderNameAddress, ProductItem, Damages, Errors, flag);
        }       

async function InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, InventoryHandoffHeader, HeaderNameAddress, ProductItem, Damages, Errors, flag)
  {
  
  await Promise.all(InventoryHandoffHeader.map(async InventoryHandoffHeader => {await insert846Header(pool, InterchangeControl, TransactionSet, InventoryHandoffHeader, HeaderNameAddress, ProductItem, flag)}));
    // Address Insertion

  //Header Address Insertion
  await Promise.all(HeaderNameAddress.map(async address => {
    await insert846Names(pool, InterchangeControl, address, flag);
  }));

  // Detail
    // await Promise.all(ProductItem.map(async (Item, index) => {
      for (const [index, Item] of ProductItem.entries()) {
    await insert846Detail(pool, index, InterchangeControl, Item, HeaderNameAddress, flag);
  
    // PID Segments
     let index3 = 0;

  if (Item.prd_materialclassification && Item.prd_materialclassification !== '') {
    index3++;  
    await insert846PID(pool, InterchangeControl.ictl_edix_control_number, index + 1, index3, 'S', '', 'ST', Item.prd_materialclassification, '', '', '67', flag); 
  };

  if (Item.prd_materialstatus && Item.prd_materialstatus !== '') {
    index3++;  
    await insert846PID(pool, InterchangeControl.ictl_edix_control_number, index + 1, index3, 'S', '', 'ST', Item.prd_materialstatus, '', '', '70', flag); 
  };

  //for (const index of ProductItem) {
  //  await Promise.all(ProductItem.map(async (Item,index) => {
    let index2 = 0;

  if (Item.prd_pieces && Item.prd_pieces > 0) {
    index2++;  
    await insert846Measure(pool, InterchangeControl.ictl_edix_control_number, index + 1, index2, 'CT', null, null,
        Item.prd_pieces,  'PC', flag); };

         
  if (Item.prd_width && Item.prd_width > 0) {
    index2++;
    const widthIN = Item.prd_x12widthum === 'IN' ? Item.prd_width : Item.prd_x12widthum === 'MM' ? (Item.prd_width / 25.4) : null;
    const widthMM = Item.prd_x12widthum === 'MM' ? Item.prd_width : Item.prd_x12widthum === 'IN' ? (Item.prd_width * 25.4) : null;
    await insert846Measure(pool, InterchangeControl.ictl_edix_control_number, index + 1, index2, 'PD', 'WD', 
        null, widthIN, 'IN', flag);
        index2++;
    await insert846Measure(pool, InterchangeControl.ictl_edix_control_number, index + 1, index2, 'PD', 'WD', 
         null, widthMM, 'MM', flag); 
      };   

  if (Item.prd_length && Item.prd_length > 0) {
    index2++;
    const lengthIN = Item.prd_x12lengthum === 'IN' ? Item.prd_length : Item.prd_x12lengthum === 'MM' ? (Item.prd_length / 25.4) : null;
    const lengthMM = Item.prd_x12lengthum === 'MM' ? Item.prd_length : Item.prd_x12lengthum === 'IN' ? (Item.prd_length * 25.4) : null;
    await insert846Measure(pool, InterchangeControl.ictl_edix_control_number, index + 1, index2, 'PD', 'LN', 
         null, lengthIN, 'IN', flag);
    index2++;
    await insert846Measure(pool, InterchangeControl.ictl_edix_control_number, index + 1, index2, 'PD', 'LN', 
         null, lengthMM,'MM', flag);  
      };

  if (Item.prd_gaugesize && Item.prd_gaugesize > 0) {
    index2++;
    const gaugeIN = Item.prd_x12gaugeum === 'IN' ? Item.prd_gaugesize : Item.prd_x12gaugeum === 'MM' ? (Item.prd_gaugesize / 25.4) : null;
    const gaugeMM = Item.prd_x12gaugeum === 'MM' ? Item.prd_gaugesize : Item.prd_x12gaugeum === 'IN' ? (Item.prd_gaugesize * 25.4) : null;
    await insert846Measure(pool, InterchangeControl.ictl_edix_control_number, index + 1, index2, 'PD', 'TH', 
         null, gaugeIN, 'IN', flag);
        index2++;
    await insert846Measure(pool, InterchangeControl.ictl_edix_control_number, index + 1, index2, 'PD', 'TH', 
        null, gaugeMM, 'MM', flag);      
      };

  if (Item.prd_actualweight && Item.prd_actualweight > 0) {
    index2++;
    const weightLB = Item.x12actualweightum === 'LB' ?  await chopOffDecimals(Number(Item.prd_actualweight)) :  Item.prd_x12_wgt_um === 'KG' ?  await chopOffDecimals(Number(Item.prd_actualweight * 2.20462)) : null;
    const weightKG = Item.x12actualweightum === 'KG' ?  await chopOffDecimals(Number(Item.prd_actualweight)) : Item.prd_x12_wgt_um === 'LB' ?  await chopOffDecimals(Number(Item.prd_actualweight / 2.20462)) : null;
    await insert846Measure(pool, InterchangeControl.ictl_edix_control_number, index + 1, index2, 'PD', 'WT', 
        null, weightLB, 'LB', flag);
        index2++;
    await insert846Measure(pool, InterchangeControl.ictl_edix_control_number, index + 1, index2, 'PD', 'WT', 
        null, weightKG, 'KG', flag);             
      };

    
    };

  

}  
// //MARK: Header
// //846 Header Insert
async function insert846Header(pool, InterchangeControl, TransactionSet, InventoryHandoffHeader, HeaderNameAddress, ProductItem, flag) 
{
 const NumberOfLines = ProductItem.length;
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
      null, 
      InterchangeControl.ictl_created_datetime.slice(0, 8), 
      InterchangeControl.ictl_created_datetime.slice(8, 14), 
      null, 
      InterchangeControl.ictl_created_datetime.slice(8, 14), 
      InterchangeControl.ictl_created_datetime.slice(8, 14), 
      null, 
      null, 
      null, 
      null, 
      null, 
      Math.trunc(InventoryHandoffHeader.invhdr_weight), 
      null,
      null, 
      null, 
      null, 
      null, 
      InterchangeControl.ictl_flow_flag, 
      null
    ]);


  } catch (error) {
    console.log(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edix_control_number, filePath);
    console.error('-', InterchangeControl.ictl_edix_control_number, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edix_control_number, '-');
   }
};

//MARK: Names
  //846 Names Insert
async function insert846Names(pool, InterchangeControl, Address, flag) 
{

 try {
    await pool.query( `INSERT INTO public."846_SNF_Names"(
  name_addresstype, name_key, name_nameq, name_nameid, name_name, name_addr1, name_addr2, name_city, name_state, name_zpcd, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_resp_party_cd, name_crt_dte, name_crt_tme, name_crt_pgm, name_flow_flag)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);`,
  [
    "O", //$1
    InterchangeControl.ictl_edix_control_number, //$2
    Address.hdna_addresstype ? Address.hdna_addresstype : Address.prna_addresstype, //$3
    //Address.hdna_identificationcodequalifier ? Address.hdna_identificationcodequalifier : Address.prna_identificationcodequalifier, //$4
    Address.hdna_identificationcode ? Address.hdna_identificationcode : Address.prna_identificationcode, //$5
    Address.hdna_nameline1 ? Address.hdna_nameline1 : Address.prna_nameline1, //$6
    Address.hdna_addressline1 ? Address.hdna_addressline1 : Address.prna_addressline1, //$7
    Address.hdna_addressline2 ? Address.hdna_addressline2 : Address.prna_addressline2, //$8
    Address.hdna_city ? Address.hdna_city : Address.prna_city, //$9
    Address.hdna_stateprovincecode ? Address.hdna_stateprovincecode : Address.prna_stateprovincecode, //$10
    Address.hdna_postalcode ? Address.hdna_postalcode : Address.prna_postalcode, //$11
    Address.hdna_countrycode ? Address.hdna_countrycode : Address.prna_countrycode, //$12
    null, //Address.hdna_contactname ? Address.hdna_contactname : Address.prna_contactname, //$13 Needs to be defined
    Address.hdna_telnumber ? Address.hdna_telnumber : Address.prna_telnumber, //$14
    null, //Address.hdna_email ? Address.hdna_email : Address.prna_email, //$15 Needs to be defined
    null, //$16 Needs to be defined
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)), //$17
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)), //$18
    "O863SNF", //$19
    flag //$20
  ]);
  } catch (error) {
    console.log(error)
     const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edix_control_number, ' ');
     console.error('-', InterchangeControl.ictl_edix_control_number, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edix_control_number, '-');
  }
}

//MARK: Detail
//846 Detail Insert
async function insert846Detail(pool, index, InterchangeControl, ProductItem, HeaderNameAddress, flag) 
{
 try {
  
  await pool.query(`INSERT INTO public."846_SNF_Detail"(
dtl_type, dtl_key, dlt_det_seq_no, dlt_line_asd_id, dlt_mo, dtl_mol, dtl_mcoil, dtl_heat, dtl_po, dtl_pol, dtl_pod, dtl_bpart, dtl_other, dtl_plistno, dtl_proc, dtl_prev, dtl_tagtyp, dtl_tag, dtl_lot, dtl_v_prod_no, dtl_cons_class, dtl_backout_cd, dtl_consignee_no, dtl_eff_dte, dtl_eff_tme, dtl_eff_tme_zn, dtl_inv_dte, dtl_inv_tme, dtl_inv_tme_zn, dtl_rcv_dte, dtl_iss_dte, dtl_qty_rtg_dte, dtl_qty_rtg_tme, dtl_qty_rtg_tme_zn, dtl_mat_class, dtl_mat_sts, dtl_act_wgt, dtl_gauge, dtl_gauge_tpe, dtl_width, dtl_lin_ft, dtl_unit_len, dtl_pcs, dtl_rcv_qty, dtl_use_qty, dtl_onhand_qty, dtl_sttx_locn, dtl_crt_dte, dtl_crt_tme, dtl_crt_pgm, dtl_flow_flag)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51)`,
[
  
 "O", //$1
 InterchangeControl.ictl_edix_control_number, //$2
 index + 1, //$3 Line Number
 ProductItem.prd_itemnumber, //$4 ASD ID
 ProductItem.prd_millorderno, // $5,
 null, // $6,
 ProductItem.prd_customertagno ? ProductItem.prd_customertagno : ProductItem.prd_vendortagid ? ProductItem.prd_vendortagid : null,// $7,
 ProductItem.prd_heat, // $8,
 ProductItem.prd_enduserpo, // $9,
 null, // $10,
 null, // $11,
 ProductItem.prd_partnumber, // $12,
 null, // $13,
 null, // $14,
 ProductItem.prd_opscurrentprocess, // $15,
 null, // $16,
 null, // $17,
 ProductItem.prd_taglotid, // $18,
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
 ProductItem.prd_materialclassification, // $35,
 ProductItem.prd_materialstatus, // $36,
 ProductItem.prd_actualweight, // $37,
 ProductItem.prd_gaugesize, // $38,
 null,// $39,
 ProductItem.prd_width, // $40,
 null, // $41,
 ProductItem.prd_length, // $42,
 ProductItem.prd_pieces, // $43,
 null, // $44,
 null, // $45,
 null, // $46,
 null, // $47,
 parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)), //$48
 parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)), //$49
 "O863SNF", //$50
 flag// $51
    ])

  } catch (error) {
    console.log(error);  
     const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edix_control_number, ' ');  
     console.error('-', InterchangeControl.ictl_edix_control_number, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edix_control_number, '-');
   }}



//MARK: Measure
//846 Measure Insert
//pool, InterchangeControl.ictl_edix_control_number, index, index2, 'CT', null, null, ProductItem.prd_pieces,  'PC', flag
async function insert846Measure(pool, key, line, lseq, mea1, mea2, mea3f, mea3, mea4, flag) 

{
try {      
  //console.log("Inserting Measure: ", key, line, heat, mcoil, mcoil2, mea1, mea2, mea3, mea3f, mea4, mea9, mchr, spsc, sdir, posc, meth, agq, dscd, locn, flag);
  await pool.query( `INSERT INTO public."846_SNF_Measure"(
    msr_type, msr_key, msr_dtl_seq_no, msr_dtl_mea_seq_no, msr_measr, msr_measq, msr_measf, msr_measval, msr_measuom, msr_sttx_locn, msr_crt_dte, msr_crt_tme, msr_crt_pgm, msr_flow_flag)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
  [
    'O', //$1
    key, //$2
    line, //$3 Line number
    lseq, //$4 Mea sequence
    mea1, //$5 MEA01
    mea2, //$6 MEA02
    mea3f, //$7 MEA03F
    mea3, //$8 MEA03
    mea4, //$9 MEA04
    null, //$10 Location
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$11
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$12
    'O846SNF', //$13
    flag, //$14
  ]);
    }
 
    catch (error) {
     //const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
     console.error("Error: ", error);
  }}


  //PID
async function insert846PID(pool, key, line, lseq, PID1, PID2, PID3, PID4, PID5, PID6, PID7, flag) 

{
try {      
  //console.log("Inserting Measure: ", key, line, heat, mcoil, mcoil2, mea1, mea2, mea3, mea3f, mea4, mea9, mchr, spsc, sdir, posc, meth, agq, dscd, locn, flag);
  await pool.query( `INSERT INTO public."846_SNF_PID"(
    pid_type, pid_key, pid_dtl_seq_no, pid_dtl_pid_seq_no, pid_itm_dsc_typ, pid_prd_char_cde, pid_agencyqualcd, pid_prddesccd, pid_pid_desc, pid_surfposcd, pid_srcsubq, pid_cond_rsp_cde, pid_lang_cde, pid_sttx_locn, pid_crt_dte, pid_crt_tme, pid_crt_pgm, pid_flow_flag)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
  [
    'O', //$1
    key, //$2
    line, //$3 Line number
    lseq, //$4 Mea sequence
    PID1, //$5 
    PID2, //$6 
    PID3, //$7 
    PID4, //$8 
    PID5, //$9 
    PID6, //$10 
    PID7, //$11 
    null, //$12 
    null, //$13 
    null, //$14 Location
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$15
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$16
    'O846SNF', //$17
    flag, //$18
  ]);
    }
 
    catch (error) {
     //const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
     console.error("Error: ", error);
  }}

  module.exports = 
  {
    LoadO846SNF
  };
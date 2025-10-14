// This module handles the insertion of parsed EDI 863 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.


const  readableErrors = require('../../functions/readableErrors.js');

async function LoadO863SNF(pool, InterchangeControl, TransactionSet, ShipmentHeaderTestResult, HeaderNameAddress, ShipmentItemTestResult, ItemInstructions, ProductItem, Chemistry, PhysicalTests, Jominy, HeatTreatment, Impact, MicroInclusion, QDSInstructions, ProductItemNameAddress, Errors, flag, filePath) 
  {
    console.log("O863 Insert SNF Module Loaded");
        await InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ShipmentHeaderTestResult, HeaderNameAddress, ShipmentItemTestResult, ItemInstructions, ProductItem, 
        Chemistry, PhysicalTests, Jominy, HeatTreatment, Impact, MicroInclusion, QDSInstructions, ProductItemNameAddress, Errors, flag, filePath);
        }       

async function InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ShipmentHeaderTestResult, HeaderNameAddress, ShipmentItemTestResult, ItemInstructions, ProductItem, 
    Chemistry, PhysicalTests, Jominy, HeatTreatment, Impact, MicroInclusion, QDSInstructions, ProductItemNameAddress, Errors, flag, filePath)
  {
  
  await Promise.all(ShipmentHeaderTestResult.map(async ShipmentHeaderTestResult => {await insert863Header(pool, InterchangeControl, ShipmentHeaderTestResult, ProductItem, flag, filePath)}));
    // Address Insertion

  await Promise.all(ProductItemNameAddress.map(async address => {
      await insert863Names(pool, InterchangeControl, address, flag, filePath);
  }));

  //Header Address Insertion
  await Promise.all(HeaderNameAddress.map(async address => {
    await insert863Names(pool, InterchangeControl, address, flag, filePath);
  }));

  // Detail Notes.
  await Promise.all(ItemInstructions.map(async (note, index) => {
    await insert863DetailNotes(pool, InterchangeControl, note, index, flag, filePath);
  }));

    await Promise.all(ProductItem.map(async (ProductItem, index) => {
    await insert863Detail(pool, index, InterchangeControl, ShipmentHeaderTestResult[0], ProductItem, HeaderNameAddress, flag, filePath);
  }));

  
  await Promise.all(ProductItem.map(async (ProductItem,index) => {

  if (ProductItem.prd_pieces && ProductItem.prd_pieces > 0) {
    await insert863Measure(pool, InterchangeControl.ictl_edixcontrolnumber, ProductItem.prd_itemnumber,
        ProductItem.prd_heat, ProductItem.prd_customertagno, ProductItem.prd_vendortagid, 'CT', null, 
        ProductItem.prd_pieces, null, 'PC', null, '69', '02', null, null, '32', null, null, null, flag, 
        ProductItem.prd_taglotid); };

  if (ProductItem.prd_width && ProductItem.prd_width > 0) {
    await insert863Measure(pool, InterchangeControl.ictl_edixcontrolnumber, ProductItem.prd_itemnumber,
        ProductItem.prd_heat, ProductItem.prd_customertagno, ProductItem.prd_vendortagid, 'PD', 'WD', 
        ProductItem.prd_width, null, ProductItem.prd_x12widthum, null, '69', '02', null, null, '32', null, null, null, flag, 
        ProductItem.prd_taglotid); };

  if (ProductItem.prd_length && ProductItem.prd_length > 0) {
    await insert863Measure(pool, InterchangeControl.ictl_edixcontrolnumber, ProductItem.prd_itemnumber,
        ProductItem.prd_heat, ProductItem.prd_customertagno, ProductItem.prd_vendortagid, 'PD', 'LN', 
        ProductItem.prd_length, null, ProductItem.prd_x12lengthum, null, '69', '02', null, null, '32', null, null, null, flag, 
        ProductItem.prd_taglotid); };

  if (ProductItem.prd_gaugesize && ProductItem.prd_gaugesize > 0) {
    await insert863Measure(pool, InterchangeControl.ictl_edixcontrolnumber, ProductItem.prd_itemnumber,
        ProductItem.prd_heat, ProductItem.prd_customertagno, ProductItem.prd_vendortagid, 'PD', 'TH', 
        ProductItem.prd_gaugesize, null, ProductItem.prd_x12gaugeum, null, '69', '02', null, null, '32', null, null, null, flag, 
        ProductItem.prd_taglotid); };

  if (ProductItem.prd_theoreticalweight && ProductItem.prd_theoreticalweight > 0) {
    await insert863Measure(pool, InterchangeControl.ictl_edixcontrolnumber, ProductItem.prd_itemnumber,
        ProductItem.prd_heat, ProductItem.prd_customertagno, ProductItem.prd_vendortagid, 'PD', 'WT', 
        ProductItem.prd_theoreticalweight, null, ProductItem.prd_x12theoreticalweightum, null, '69', '02', null, null, '32', null, null, null, flag, 
        ProductItem.prd_taglotid); };

  if (ProductItem.prd_actualweight && ProductItem.prd_actualweight > 0) {
    await insert863Measure(pool, InterchangeControl.ictl_edixcontrolnumber, ProductItem.prd_itemnumber,
        ProductItem.prd_heat, ProductItem.prd_customertagno, ProductItem.prd_vendortagid, 'PD', 'WT', 
        ProductItem.prd_actualweight, null, ProductItem.prd_x12actualweightum, null, '69', '02', null, null, '32', null, null, null, flag, 
        ProductItem.prd_taglotid); };

  if (ProductItem.prd_coillength && ProductItem.prd_coillength > 0) {
    await insert863Measure(pool, InterchangeControl.ictl_edixcontrolnumber, ProductItem.prd_itemnumber,
        ProductItem.prd_heat, ProductItem.prd_customertagno, ProductItem.prd_vendortagid, 'PD', 'LN', 
        ProductItem.prd_coillength, null, ProductItem.prd_x12coillengthum, null, '69', '02', null, null, '32', null, null, null, flag, 
        ProductItem.prd_taglotid); };

  if (ProductItem.prd_coilinnerdiameter && ProductItem.prd_coilinnerdiameter > 0) {
    await insert863Measure(pool, InterchangeControl.ictl_edixcontrolnumber, ProductItem.prd_itemnumber,
        ProductItem.prd_heat, ProductItem.prd_customertagno, ProductItem.prd_vendortagid, 'PD', 'ID', 
        ProductItem.prd_coilinnerdiameter, null, 'IN', null, '69', '02', null, null, '32', null, null, null, flag, 
        ProductItem.prd_taglotid); };

  if (ProductItem.prd_coilouterdiameter && ProductItem.prd_coilouterdiameter > 0) {
    await insert863Measure(pool, InterchangeControl.ictl_edixcontrolnumber, ProductItem.prd_itemnumber,
        ProductItem.prd_heat, ProductItem.prd_customertagno, ProductItem.prd_vendortagid, 'PD', 'OD', 
        ProductItem.prd_coilouterdiameter, null, 'IN', null, '69', '02', null, null, '32', null, null, null, flag, 
        ProductItem.prd_taglotid); };

  
  await Promise.all(PhysicalTests.filter(PhysicalTests => PhysicalTests["phts_tag_lot"] === ProductItem["prd_taglotid"]).map(async PhysicalTests => {
    const agq = MetalStandards.find(ms => ms.mstd_key === InterchangeControl.ictl_edixcontrolnumber && ms.mstd_tag_lot === PhysicalTests.phts_tag_lot)?.mstd_met_std_dev_org || null;
    await insert863Measure(pool, InterchangeControl.ictl_edixcontrolnumber, ProductItem.prd_itemnumber, 
      ProductItem.prd_heat, ProductItem.prd_customertagno, ProductItem.prd_vendortagid, PhysicalTests.phts_measurement_reference,
      PhysicalTests.phts_x12physicaltest, PhysicalTests.phts_value, null, 
      PhysicalTests.phts_x12unitofmeasure, null, PhysicalTests.phts_material_characteristic, '02', PhysicalTests.phts_x12testdirection,
      null, '32', agq, null, null, flag, ProductItem.prd_taglotid)}));
  }));

  await Promise.all(ProductItem.map(async (ProductItem,index) => {
  await Promise.all(Chemistry.filter(Chemistry => Chemistry["chm_tag_lot"] === ProductItem["prd_taglotid"]).map(async Chemistry => {
    const agq = MetalStandards.find(ms => ms.mstd_key === InterchangeControl.ictl_edixcontrolnumber && ms.mstd_tag_lot === PhysicalTests.phts_tag_lot)?.mstd_met_std_dev_org || null;
    await insert863Measure(pool, InterchangeControl.ictl_edixcontrolnumber, 
      ProductItem.prd_itemnumber, ProductItem.prd_heat, ProductItem.prd_customertagno, 
      ProductItem.prd_vendortagid, 'CH', Chemistry.chm_x12chemelement, Chemistry.chm_value,
      null, 'P1', null, '68', null, null, null, '32', agq, null, null, flag, 
      ProductItem.prd_taglotid)}));
  }));  

}  
// //MARK: Header
// //863 Header Insert
async function insert863Header(pool, InterchangeControl, ShipmentHeaderTestResult, ProductItem, flag, filePath) 
{
 const NumberOfLines = ProductItem.length;
 const totalWeight = ProductItem.reduce((sum, item) => sum + Number(item.prd_weight || 0), 0);
  try {
    await pool.query(`
     INSERT INTO public."863_SNF_Header" (hdr_type,hdr_key,hdr_isnd_id,hdr_gsnd_id,hdr_ircv_id,hdr_grcv_id,hdr_ictl_no,hdr_gctl_no,hdr_stctl_no,hdr_bsn_cd,
     hdr_bsn_dte,hdr_bsn_tme,hdr_rtyp_cd,hdr_shpid,hdr_bol_no,hdr_mbol_no,hdr_shp_dte,hdr_shp_tme,hdr_shp_tzn,hdr_destid,hdr_byid,hdr_sum_hl_seg,hdr_sum_hsh_ttl,
     hdr_sum_wgt_ttl,hdr_sttx_locn,hdr_crt_dat,hdr_crt_tim,hdr_crt_pgm,hdr_flow_flag,hdr_isa_qual,hdr_ircv_qual
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31)
    `, [
      "O", //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2 ? Key: This is mapped to ISA Control number in the inbound parsing/mapping
      InterchangeControl.ictl_senderinterchangeid, //$3 ISND
      InterchangeControl.ictl_senderinterchangeid, //$4 GSND
      InterchangeControl.ictl_receiverinterchangeid, //$5 IRCV
      InterchangeControl.ictl_receiverinterchangeid, //$6 GRCV
      InterchangeControl.ictl_alternateinterchangenumber, //$7 ISA#
      null, //$8 // Needs to be defined GS#
      null, //$9 Needs to be defined ST#
      ShipmentHeaderTestResult.tres_transactionsetpurposecode, //$10 BTR01
      ShipmentHeaderTestResult.tres_shippingdatetime ? ShipmentHeaderTestResult.tres_shippingdatetime.slice(0, 8) : null, //$11 BTR02
      ShipmentHeaderTestResult.tres_shippingdatetime ? ShipmentHeaderTestResult.tres_shippingdatetime.slice(8, 14) : null, //$12 BTR03
      'ET', //$13 // Needs to be defined "Report Type"
      ShipmentHeaderTestResult.tres_transactionreference, //$14 ShipID
      ShipmentHeaderTestResult.tres_manifestnumber, //$15 BOL
      ShipmentHeaderTestResult.tres_vendorshipmentreference, //$16 M-BOL
      ShipmentHeaderTestResult.tres_shippingdatetime ? ShipmentHeaderTestResult.tres_shippingdatetime.slice(0, 8) : null, //$17 ShpDTE
      ShipmentHeaderTestResult.tres_shippingdatetime ? ShipmentHeaderTestResult.tres_shippingdatetime.slice(8, 14) : null, //$18 ShpTME
      'ET', //$19 ShpTZN
      null, //$20 DestID
      null, //$21 ByID
      NumberOfLines, //$22 SumHLSEG  
      null, //$23 SumHSHTTL
      totalWeight, //$24 SumWGTTTL
      ShipmentHeaderTestResult.tres_location ? ShipmentHeaderTestResult.tres_location : null, //$25 ShpLocn
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$26
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$27
      "O863SNF", //$28
      flag, //$29
      InterchangeControl.ictl_senderinterchangeidqualifier, //$30 ISND Qualifier
      InterchangeControl.ictl_receiverinterchangeidqualifier, //$31 IRCV Qualifier
    ]);


  } catch (error) {
    console.log(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }
};

//MARK: Names
  //863 Names Insert
async function insert863Names(pool, InterchangeControl, Address, flag, filePath) 
{

 try {
    await pool.query( `INSERT INTO public."863_SNF_Names"(
  name_type, name_key, name_qual, name_qual_id, name_id, name_name, name_addr1, name_addr2, name_city, name_state, name_zip, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_resp, name_crt_dte, name_crt_tme, name_crt_pgm, name_flow_flag)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
  [
    "O", //$1
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
    null, //$16 Needs to be defined
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)), //$17
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)), //$18
    "O863SNF", //$19
    flag //$20
  ]);
  } catch (error) {
    console.log(error)
     const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
     console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
  }
}

//MARK: Detail
//863 Detail Insert
async function insert863Detail(pool, index, InterchangeControl, ShipmentHeaderTestResult, ProductItem, HeaderNameAddress, flag, filePath) 
{
 try {
  
  await pool.query(`INSERT INTO public."863_SNF_Detail"(
  dtl_type,dtl_key,dtl_line,dtl_heat,dtl_mcoil,dtl_mo,dtl_mol,dtl_po,dtl_pol,dtl_pod,dtl_part,dtl_tst_unt,dtl_tdat,dtl_pdat,dtl_n1st,dtl_n1mf,dtl_locn,dtl_crt_dat,dtl_crt_tim,dtl_crt_pgm,dtl_flow_flag,dtl_prd_dte,dtl_shp_dte,dtl_heat_trt_csh_dte,dtl_lub_app_dte,dtl_prev_proc_tag_id,dtl_tag_lot)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)`,
[
  
      "O", //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      index + 1, //$3 Line Number
      ProductItem.prd_heat, //4 Heat
      //ProductItem.prd_taglotid, //$5 Mill Coil ID
      ProductItem.prd_vendortagid ? ProductItem.prd_vendortagid : ProductItem.prd_customertagno ? ProductItem.prd_customertagno : null, //5 Mill Coil ID
      ProductItem.prd_millorderno, //$6 MO
      ProductItem.prd_externalorderitem, //$7 MOL
      ProductItem.prd_externalordernumber, //$8 PO
      null, //$9 POL
      ProductItem.prd_externalorderdate ? ProductItem.prd_externalorderdate.slice(0, 8) : null, //$10 POD 
      ProductItem.prd_partnumber, //$11 Part Number
      null, //$12 Test Unit
      null, //$13 Test Date
      ProductItem.prd_processeddate, //$14 Process Date
      HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id || null, //15
      HeaderNameAddress.find(name => name.name_qual === 'M')?.name_id || null, //16
      null,  //$17 Location
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$18
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$19
      "O863SNF", //$20
      flag, //$21 Flow Flag
      null, //$22 Production Date
      ShipmentHeaderTestResult.tres_shippingdatetime ? ShipmentHeaderTestResult.tres_shippingdatetime.slice(0, 8) : null, //$23 Shipping Date
      null, //$24 Heat Treat Date
      null, //$25 Lube Apply Date
      null, //$26 Previous Process Tag ID
      ProductItem.prd_taglotid //$27 Tag Lot ID
    ])

  } catch (error) {
    console.log(error);  
     const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
     console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }}



//MARK: Measure
//863 Measure Insert

async function insert863Measure(pool, key, line, heat, mcoil, mcoil2, mea1, mea2, mea3, mea3f, mea4, mea9, mchr, spsc, sdir, posc, meth, agq, dscd, locn, flag, taglot) 
{
try {      
  //console.log("Inserting Measure: ", key, line, heat, mcoil, mcoil2, mea1, mea2, mea3, mea3f, mea4, mea9, mchr, spsc, sdir, posc, meth, agq, dscd, locn, flag);
  await pool.query( `INSERT INTO public."863_SNF_Measure"(
    msr_type,msr_key,msr_line,msr_heat,msr_mcoil,msr_mea1,msr_mea2,msr_mea3f,msr_mea3,msr_mea4,msr_mea9,msr_tdat,msr_pdat,msr_mchr,msr_spsc,msr_sdir,msr_posc,msr_meth,msr_agq,msr_dscd,msr_locn,msr_odat,msr_otim,msr_opgm,msr_flow_flag,msr_tag_lot)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)`,
  [
    'O', //$1
    key, //$2
    line, //$3 Line number
    heat, //$4 Heat
    mcoil2 ? mcoil2 : mcoil, //$5 Mill Coil ID
    mea1, //$6 MEA01
    mea2, //$7 MEA02
    mea3f, //$8 MEA03F
    mea3, //$9 MEA03
    mea4, //$10 MEA04
    mea9, //$11 MEA09
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)), //$12 Tdat
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)), //$13 Pdat
    mchr, //$14 
    spsc, //$15 Hardcoded '02' for non-chemistry
    sdir, //$16
    posc, //$17
    meth, //$18 Hardcoded to '32'
    agq ? agq[0] ? agq[o] : null : null, //$19 
    dscd, //$20    
    locn, //$21
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$22
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$23
    'O863SNF', //$24
    flag, //$25
    taglot //$26
  ]);
    }
 
    catch (error) {
     const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
     console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
  }}


  async function insert863DetailNotes(pool, InterchangeControl, Note, flag, filePath) 
{
  //console.log("Inserting Note: ", Note);
  try {   
    await pool.query( `INSERT INTO public."863_SNF_DetailNotes"(
      dtln_type, dtln_key, dtln_line, dtln_seq, dtln_text, dtln_odat, dtln_otim, dtln_opgm, dtln_flow_flag, dtln_tag_lot)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
    [
      "O", //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      null, //$3
      index + 1, //$4
      Note.itin_text, //$5
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)), //$6
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)), //$7
      "O863SNF", //$8
      flag, //$9
      Note.itin_tag_lot //$10
      //null //$10 Tag Lot ID
    ]);
    }
    catch (error) {
     const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
     console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
  }}  


  module.exports = 
  {
    LoadO863SNF
  };
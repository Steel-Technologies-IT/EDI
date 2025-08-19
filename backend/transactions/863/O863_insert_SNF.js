// This module handles the insertion of parsed EDI 863 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.


const  readableErrors = require('../../functions/readableErrors.js');

async function LoadO863SNF(pool, InterchangeControl, TransactionSet, ShipmentItemTestResult, HeaderNameAddress, ShipmentItemTestResult, ItemInstructions, ProductItem, Chemistry, PhysicalTests, Jominy, HeatTreatment, Impact, MicroInclusion, QDSInstructions, ProductItemNameAddress, Errors, flag, filePath) {

  let oldKey;
  let pkey;
  if (Array.isArray(ProductItem)) {
    for (const product of ProductItem) {
    
      oldKey = await pool.query(`
        SELECT dtl_key FROM "863_SNF_Detail"
        INNER JOIN "863_SNF_Names" names ON names.name_key = "863_SNF_Detail".dtl_key
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
        const originalHeaderResults = await pool.query('SELECT * FROM "863_SNF_Header" WHERE hdr_key = $1', [pkey]);
        var originalHeader = await originalHeaderResults.rows[0];
        var originalDetail = await pool.query('SELECT * FROM "863_SNF_Detail" WHERE dtl_key = $1', [pkey]);
        var originalNames = await pool.query('SELECT * FROM "863_SNF_Names" WHERE name_key = $1', [pkey]);
        var originalMeasure = await pool.query('SELECT * FROM "863_SNF_Measure" WHERE msr_key = $1', [pkey]);
        var originalNotes = await pool.query('SELECT * FROM "863_SNF_Notes" WHERE note_key = $1', [pkey]);
        var originalDetailNotes = await pool.query('SELECT * FROM "863_SNF_DetailNotes" WHERE dtln_key = $1', [pkey]);

        await InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ShipmentItemTestResult, HeaderNameAddress, ShipmentItemTestResult, ItemInstructions, ProductItem, 
        Chemistry, PhysicalTests, Jominy, HeatTreatment, Impact, MicroInclusion, QDSInstructions, ProductItemNameAddress, Errors, flag, filePath,
        originalHeader, originalDetail, originalNames, originalMeasure, originalNotes, originalDetailNotes
        );
        break;
      }
    }
  }
  
}


  async function InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ShipmentItemTestResult, HeaderNameAddress, ShipmentItemTestResult, ItemInstructions, ProductItem, 
        Chemistry, PhysicalTests, Jominy, HeatTreatment, Impact, MicroInclusion, QDSInstructions, ProductItemNameAddress, Errors, flag, filePath,
        originalHeader, originalDetail, originalNames, originalMeasure, originalNotes, originalDetailNotes)
  {
  
  await insert863Header(pool, InterchangeControl, ShipmentHeader, originalHeader, flag, filePath);
    // Address Insertion

  await Promise.all(ProductItemNameAddress.map(async address => {
      await insert863Names(pool, InterchangeControl, address, originalHeader, flag, filePath);
  }));

  //Header Address Insertion
  await Promise.all(HeaderNameAddress.map(async address => {
    await insert863Names(pool, InterchangeControl, address, originalHeader, flag, filePath);
  }));

  await Promise.all(ProductItem.map(async (ProductItem,index) => {
    await insert863Detail(pool, InterchangeControl, ProductItem, originalHeader, flag, filePath);
    }));

   await Promise.all(Item.map(async Item => {
      await Promise.all(ProductItem.filter(ProductItem => ProductItem["HL Parent ID"] === Item["HL ID"]).map(async ProductItem => {
    await insert863Measure(pool, InterchangeControl, Item, ProductItem, HeaderNameAddress, originalHeader,flag, filePath);
      }));
   }));

  console.log('Item Length: ', Item.length, "Product Item Length: ", ProductItem.length);


// //MARK: Header
// //863 Header Insert
async function insert863Header(pool, InterchangeControl, ShipmentHeader, originalHeader ,flag, filePath) {
  
  try {
    await pool.query(`
     INSERT INTO public."863_SNF_Header"(hdr_type,hdr_key,hdr_isnd_id,hdr_gsnd_id,hdr_ircv_id,hdr_grcv_id,hdr_ictl_no,hdr_gctl_no,hdr_stctl_no,hdr_bsn_cd,
     hdr_bsn_dte,hdr_bsn_tme,hdr_rtyp_cd,hdr_shpid,hdr_bol_no,hdr_mbol_no,hdr_shp_dte,hdr_shp_tme,hdr_shp_tzn,hdr_destid,hdr_byid,hdr_sum_hl_seg,hdr_sum_hsh_ttl,
     hdr_sum_wgt_ttl,hdr_sttx_locn,hdr_crt_dat,hdr_crt_tim,hdr_crt_pgm,hdr_flow_flag,hdr_isa_qual,hdr_ircv_qual
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31)
    `, [
      originalHeader.hdr_type, //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2 ? Key: This is mapped to ISA Control number in the inbound parsing/mapping
      InterchangeControl.ictl_senderinterchangeidqualifier, //$3 ISND
      InterchangeControl.ictl_senderinterchangeid, //$4 GSND
      InterchangeControl.ictl_receiverinterchangeidqualifier, //$5 IRCV
      InterchangeControl.ictl_receiverinterchangeid, //$6 GRCV
      InterchangeControl.ictl_alternateinterchangenumber, //$7 ISA#
      originalHeader.hdr_ictl_no, //$8 // Needs to be defined GS#
      originalHeader.hdr_func_no, //$9 Needs to be defined ST#
      ShipmentItemTestResult.tres_transactionsetpurposecode, //$10 BTR01
      ShipmentItemTestResult.parseInt(tres_shippingdatetime.toISOString.replace(/\D/g, '').slice(0, 8)), //$11 BTR02
      ShipmentItemTestResult.parseInt(tres_shippingdatetime.toISOString.replace(/\D/g, '').slice(0, 8)), //$12 BTR03
      null, //$13 // Needs to be defined "Report Type"
      ShipmentItemTestResult.tres_transactionreference, //$14 ShipID
      ShipmentItemTestResult.tres_manifestnumber, //$15 BOL
      ShipmentItemTestResult.tres_vendorshipmentreference, //$16 M-BOL
      ShipmentItemTestResult.parseInt(tres_shippingdatetime.toISOString.replace(/\D/g, '').slice(0, 8)), //$17 ShpDTE
      ShipmentItemTestResult.parseInt(tres_shippingdatetime.toISOString.replace(/\D/g, '').slice(0, 8)), //$18 ShpTME
      null, //$19 ShpTZN
      null, //$20 DestID
      null, //$21 ByID
      null, //$22 SumHLSEG  
      null, //$23 SumHSHTTL
      null, //$24 SumWGTTTL
      ShipmentItemTestResult.tres_location, //$25 ShpLocn
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$26
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$27
      'O863SNF', //$28
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
async function insert863Names(pool, InterchangeControl, Address, originalHeader, flag, filePath) {
 try {
    await pool.query( `INSERT INTO public."863_SNF_Names"(
  name_typ, name_key, name_qual, name_qual_id, name_id, name_name, name_addr1, name_addr2, name_city, name_state, name_zpcd, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_resp, name_crt_dte, name_crt_tme, name_crt_pgm, name_flow_flag)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
  [
    originalHeader.hdr_type, //$1
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
    'O863SNF', //$19
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
async function insert863Detail(pool, InterchangeControl, ProductItem, orginalHeader, flag, filePath) {
 try {
 
  await pool.query(`INSERT INTO public."863_SNF_Detail"(
  dtl_type,dtl_key,dtl_line,dtl_heat,dtl_mcoil,dtl_mo,dtl_mol,dtl_po,dtl_pol,dtl_pod,dtl_part,dtl_tst_unt,dtl_tdat,dtl_pdat,dtl_n1st,dtl_n1mf,dtl_locn,dtl_crt_dat,dtl_crt_tim,dtl_crt_pgm,dtl_flow_flag,dtl_prd_dte,dtl_shp_dte,dtl_heat_trt_csh_dte,dtl_lub_app_dte,dtl_prev_proc_tag_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)`,
[
      orginalHeader.hdr_type, //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      index + 1, //$3 Line Number
      ProductItem.prd_heat, //4 Heat
      ProductItem.prd_externaltagid, //5 Mill Coil ID
      ProductItem.prd_millorderno, //$6 MO
      ProductItem.prd_externalorderitem, //$7 MOL
      ProductItem.prd_externalordernumber, //$8 PO
      null, //$9 POL
      ProductItem.prd_externalorderdate ? parseInt(ProductItem.prd_externalorderdate.replace(/\D/g, '').slice(0, 8)) : null, //$10 POD 
      ProductItem.prd_partnumber, //$11 Part Number
      null, //$12 Test Unit
      null, //$13 Test Date
      null, //$14 Promise Date
      HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id || null, //15
      HeaderNameAddress.find(name => name.name_qual === 'M')?.name_id || null, //16
      null,  //$17 Location
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$18
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$19
      'O863SNF', //$64
      null, //72
      flag //$81
])

  } catch (error) {
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }}



//MARK: Measure
//863 Measure Insert
async function insert863Measure(pool, InterchangeControl, Item, ProductItem, HeaderNameAddress, orginalHeader, flag, filePath) {
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
      
  await pool.query( `INSERT INTO public."863_SNF_Measure"(
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
    'O863SNF', //$64
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
    LoadO863SNF
};








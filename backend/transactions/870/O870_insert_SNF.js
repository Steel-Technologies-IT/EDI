// This module handles the insertion of parsed EDI 870 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.


const chopOffDecimals = require('../../functions/chopoffdecimals.js');
const limitDecimals = require('../../functions/limitDecimals.js');
const  readableErrors = require('../../functions/readableErrors.js');
const retrieveInboundASN = require('../../functions/retrieveInboundASN.js').retrieveInboundASN;
let ymd;
let hms;
async function LoadO870SNF(pool, InterchangeControl, TransactionSet, ProductionReportingHeader, HeaderInstructions, HeaderNameAddress, NonRecordedScrapItems,  ProductItem, Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath) {
      // If ProductItem is an array, process each one

ymd = InterchangeControl.ictl_createddatetime.slice(0, 8);
hms = InterchangeControl.ictl_createddatetime.slice(8, 14);



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
    
    orginalMeasure = await pool.query(
      `SELECT * FROM "856_SNF_Measure" WHERE msr_key = ANY($1)`, 
      [uniqueKeys]
    );

  } else {
    console.log("No previous ASN keys found");
  }

} catch (error) {
  console.log(error)
  console.log("Error retrieving previous ASN:");
}


//Weights for item and order level
// let sumofproductweights = {};
// let sumofweight = 0;
// try {
    
    
// if (ProductItem) {
//     ProductItem.forEach(prod => {
//         const partNumber = prod.prd_partnumber;
//         const weight = parseFloat(prod.prd_weight ? prod.prd_weight : 0);
        
//         // If this part number already exists, add to the existing weight
//         if (sumofproductweights[partNumber]) {
//             sumofproductweights[partNumber] += weight;
//         } else {
//             // First occurrence of this part number
//             sumofproductweights[partNumber] = weight;
//         }
        
//         // Also add to total weight
//         sumofweight += weight;
//     });
    
//     // Round all weights to remove floating-point precision errors and chop off decimals
//     for (const partNumber of Object.keys(sumofproductweights)) {
//         sumofproductweights[partNumber] = await chopOffDecimals(sumofproductweights[partNumber]); // Add await
//     }
//     sumofweight = await chopOffDecimals(sumofweight); // Add await
    
//     console.log('Sum of product weights by part number:', sumofproductweights);
//     console.log('Total weight:', sumofweight);
// }
// } catch (error) {
//     console.log(error);
// }

 

    await InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ProductionReportingHeader, HeaderInstructions, HeaderNameAddress, NonRecordedScrapItems,  ProductItem, Damages, ProductInstructions, ProductItemNameAddress, orginalDetail, Errors, flag, filePath)
  }
      

  async function InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ProductionReportingHeader, HeaderInstructions, HeaderNameAddress, NonRecordedScrapItems,  ProductItem, Damages, ProductInstructions, ProductItemNameAddress, orginalDetail, Errors, flag, filePath){

    
  await insert870Header(pool, InterchangeControl, HeaderNameAddress, ProductionReportingHeader[0],  flag, filePath, ProductItem);
    // Address Insertion


  await Promise.all(ProductItemNameAddress.map(async address => {
      await insert870Names(pool, InterchangeControl, address, flag, filePath);
  }));

  //Header Address Insertion
  await Promise.all(HeaderNameAddress.map(async address => {
    await insert870Names(pool, InterchangeControl, address,  flag, filePath);
  }));

  // Order Details
  await Promise.all(ProductionReportingHeader.map(async (dtl, dtlIndex) => {
    await insert870OrderDtl(pool, InterchangeControl, dtl, dtlIndex, HeaderNameAddress, flag, filePath);
  }))

  // Charge In Details
  const ChargeInCnt = ProductItem.filter(m => m.prd_referencelinenumber.includes('0')).length;
  const ChargeOutCnt = ProductItem.filter(m => m.prd_referencelinenumber.includes('1')).length;


  const ChargeIn = ProductItem.find(m => m.prd_referencelinenumber.includes('0'));
  if (ChargeIn && !Array.isArray(ChargeIn)) {
    await Promise.all(ChargeIn.map(async (Item, ChargeInIndex) => {
    await insert870ChargeInDtl(pool, InterchangeControl, TransactionSet, Item, ProductionReportingHeader[0], flag, filePath, ChargeInIndex, ChargeInCnt, ChargeOutCnt, orginalDetail);
  }))
  } else
  {
    console.warn('No product item found with reference line number 0');
  }
  

  // Charge Out Details
  const ChargeOut = ProductItem.filter(m => m.prd_referencelinenumber.includes('1'));
  if (ChargeOut && !Array.isArray(ChargeOut)) {
  await Promise.all(ChargeOut.map(async (Item, ChargeOutIndex) => {
    await insert870ChargeOutDtl(pool, InterchangeControl, TransactionSet, Item, ProductionReportingHeader[0], flag, filePath, ChargeOutIndex, ChargeInCnt, ChargeOutCnt, orginalDetail);      
  }))
  }
  else
  {
    console.warn('No product item found with reference line number 1');
  }

  }
  // //MARK: Header
// //870 Header Insert
async function insert870Header(pool, InterchangeControl, Address, ProductionReportingHeader, flag, filePath) {

  try {
    // After requiring pg and creating your pool:
    await pool.query(`
     INSERT INTO public."870_SNF_Header"(
      	hdr_type, hdr_key, hdr_isnd_id, hdr_gsnd_id, hdr_ircv_id, hdr_grcv_id, hdr_ictl_no, hdr_gctl_no, hdr_stctl_no, hdr_dsnt_no, hdr_tsnt_no, hdr_sts_rpt_cd, hdr_ord_itm_cd, hdr_ref_id, hdr_date, hdr_prd_dte_cd, hdr_loc_cd, hdr_time, hdr_prod_ref_id, hdr_tran_type, hdr_action_cd, hdr_pdte_no, hdr_ptme_no, hdr_ptmez_cd, hdr_stscd_no, hdr_ststm_no, hdr_stszn_cd, hdr_qltdte_no, hdr_qlttme_no, hdr_qltzne_cd, hdr_mfgidq_cd, hdr_mfgid_id, hdr_outprcq_cd, hdr_outprcid_id, hdr_sum_hl_seg, hdr_sum_hsh_ttl, hdr_sttx_locn, hdr_crt_dat, hdr_crt_tim, hdr_crt_pgm, hdr_isa_qual, hdr_ircv_qual, hdr_flow_flag)

    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43)
    `, [
      'O', //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2      
      InterchangeControl.ictl_senderinterchangeid, //$3 ISND
      InterchangeControl.ictl_senderinterchangeid, //$4 GSND
      InterchangeControl.ictl_receiverinterchangeid, //$5 IRCV
      InterchangeControl.ictl_receiverinterchangeid, //$6 GRCV
      null, //$7  hdr_ictl_no
      null, //$8  hdr_gctl_no
      null, //$9 hdr_stctl_no
      String(ymd), // $10 Date Sent
      String(hms), //$11 Time Sent
      ProductionReportingHeader.prdhdr_statusreportcode, //$12 Status Report Code
      ProductionReportingHeader.prdhdr_orderitemcode, //$13 Order Item Code
      ProductionReportingHeader.prdhdr_transactionreference, //$14 Transaction Reference
      String(ymd), //$15 
      null, //$16 Product Date Code
      null, //$17 Location Code
      String(hms), //$18 Time
      ProductionReportingHeader.prdhdr_transactionreference, //$19 Production Reference ID
      ProductionReportingHeader.prdhdr_opsprocess, //$20 Transaction Type
      null, //$21 Action Code
      ProductionReportingHeader.prdhdr_updatedatetime ? ProductionReportingHeader.prdhdr_updatedatetime.slice(0, 8) : null, //$22 Production Date
      ProductionReportingHeader.prdhdr_updatedatetime ? ProductionReportingHeader.prdhdr_updatedatetime.slice(8, 14) : null, //$23 Production Time
      'ET', //$24 Production Time Zone
      null, //$25 Status change date
      null, //$26 Status change time
      null, //$27 Status change time zone
      null, //$28 Quality rating date
      null, //$29 Quality rating time  
      null, //$30 Quality rating time zone  
      'MF', //$31 Manufacturing ID qualifier 
      Address.find(name => name.name_qual === 'M')?.name_id || null, //$32 Manufacturing ID
      'OU', //$33 OU ID qualifier
      Address.find(name => name.name_qual === 'U')?.name_id || null, //$34 OU ID
      char(length(ProductItem) + 1), //$35 Number of HL segments
      null, //$36 Hash total
      null, //$37 Plant location
      ymd, // $38 Date
      hms, //$39 Time
      'O870SNF', //$40
      InterchangeControl.ictl_senderinterchangeidqualifier, //$41
      InterchangeControl.ictl_receiverinterchangeidqualifier, //$42  
      flag, //$43
      
    ]);


  } catch (error) {
    console.log(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }
};

//MARK: Names
  //870 Names Insert
async function insert870Names(pool, InterchangeControl, Address, flag, filePath) {
 try {
    await pool.query( `INSERT INTO public."870_SNF_Names"(
  name_typ, name_key, name_qual, name_qual_id, name_id, name_name, name_addr1, name_addr2, name_city, name_state, name_zpcd, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_resp_party_cd, name_crt_dte, name_crt_tme, name_crt_pgm, name_flow_flag)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
  [
    'O', //$1 Type
    InterchangeControl.ictl_edixcontrolnumber, //$2 Key
    Address.hdna_addresstype ? Address.hdna_addresstype : Address.prna_addresstype, //$3 Qualifier
    Address.hdna_identificationcodequalifier ? Address.hdna_identificationcodequalifier : Address.prna_identificationcodequalifier ? Address.prna_identificationcodequalifier : '01', //$4 ID
    Address.hdna_identificationcode ? Address.hdna_identificationcode : Address.prna_identificationcode ? Address.prna_identificationcode : " ", //$5 Name ID
    Address.hdna_nameline1 ? Address.hdna_nameline1 : Address.prna_nameline1, //$6 Name
    Address.hdna_addressline1 ? Address.hdna_addressline1 : Address.prna_addressline1, //$7 Address 1
    Address.hdna_addressline2 ? Address.hdna_addressline2 : Address.prna_addressline2, //$8 Address 2
    Address.hdna_city ? Address.hdna_city : Address.prna_city, //$9 City
    Address.hdna_stateprovincecode ? Address.hdna_stateprovincecode : Address.prna_stateprovincecode, //$10 State
    Address.hdna_postalcode ? Address.hdna_postalcode : Address.prna_postalcode, //$11 ZipCode 
    Address.hdna_countrycode ? Address.hdna_countrycode : Address.prna_countrycode, //$12 Country Name
    null, //$13 Contact Name
    Address.hdna_telnumber ? Address.hdna_telnumber : Address.prna_telnumber, //$14 Contact Number
    null, //$15 Email
    null, //$16 Responsible Party
    ymd, //$17 Date
    hms, //$18 Time
    'O870SNF', //$19 Program
    flag //$19 Flow flag
  ]);
  } catch (error) {
    console.log(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
  }
}

//MARK: Detail
//870 Detail Insert
async function insert870OrderDtl(pool, InterchangeControl, dtl, dtlIndex, HeaderNameAddress, flag, filePath) {
try{
  await pool.query( `INSERT INTO public."870_SNF_OrderDtl"(
  ord_type, ord_key, ord_hlo, ord_po, ord_pol, ord_pod, ord_rls, ord_poc, ord_cont_no, ord_potype_cd, ord_cpo, ord_cpol, ord_cpart, ord_partd, ord_itm_lin_no, ord_qty_ord, ord_uom, ord_sttx_locn, ord_crt_dat, ord_crt_tim, ord_crt_pgm, ord_flow_flag)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22);`,
  [
    'O', //$1 Type
    InterchangeControl.ictl_edixcontrolnumber, //$2 Key
    dtlIndex + 1, //$3 HL*O For now assuming that it will be 1. won't be multiple.
    dtl.prdhdr_externalordernumber, //$4 PO#
    null, //$5 PO Line number?
    dtl.prdhdr_externalorderdate.slice(0,8), //$6 PO date
    dtl.prdhdr_externalorderrelease, //$7 Release#
    null, //$8 Change Order Sequence Number
    dtl.prdhdr_externalcontractnumber, //$9 Contract Number
    null, //$10 PO Type
    dtl.prdhdr_enduserpo, //$11 Customer PO#
    null, //$12 Customer PO Line#
    null, //$13 Part Number
    null, //$14 Part Desc
    null, //$15 Order Item Line Number
    null, //$16 Quantity Ordered
    null, //$17 UOM
    null, //$18 Location
    ymd, //$19 Date
    hms, //$20 Time
    'O870SNF', //$21 Program
    flag //$22 Flow flag
  ]);
}
catch (error) {
    console.error(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
}
}

// 870 Charge In details:
async function insert870ChargeInDtl(pool, InterchangeControl, TransactionSet, Item, ProductionReportingHeader, flag, filePath, ChargeInIndex, ChargeInCnt, ChargeOutCnt, orginalDetail) {
  try {
  await pool.query(`INSERT INTO public."870_SNF_ChgInDtl"(
  chgindtl_type, chgindtl_key, chgindtl_hlo, chgindtl_hli, chgindtl_chrgintype, chgindtl_chrgintag, chgindtl_heat, chgindtl_mcoil, chgindtl_bpart, chgindtl_mo, chgindtl_mol, chgindtl_gc, chgindtl_msa, chgindtl_rpac, chgindtl_rpnc, chgindtl_stsdt, chgindtl_ststm, chgindtl_ststmz, chgindtl_prcdt, chgindtl_prctm, chgindtl_prctmz, chgindtl_qlydte, chgindtl_qlytme, chgindtl_qlytmz, chgindtl_po, chgindtl_rls, chgindtl_chgordseq, chgindtl_pod, chgindtl_pol, chgindtl_contractno, chgindtl_potypecd, chgindtl_awgtlb, chgindtl_awgtkg, chgindtl_twgtlb, chgindtl_twgtkg, chgindtl_gaugin, chgindtl_gaugmm, chgindtl_gaugt, chgindtl_widin, chgindtl_widmm, chgindtl_lnft, chgindtl_lnmt, chgindtl_ulenin, chgindtl_ulenmm, chgindtl_idin, chgindtl_idmm, chgindtl_odin, chgindtl_odmm, chgindtl_pcs, chgindtl_proc, chgindtl_mcls, chgindtl_msts, chgindtl_fault, chgindtl_dmg, chgindtl_fcmt, chgindtl_qsts, chgindtl_csts, chgindtl_linid, chgindtl_qtyord, chgindtl_uom, chgindtl_locn, chgindtl_crt_dat, chgindtl_crt_tim, chgindtl_crt_pgm, chgindtl_flow_flag
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65);`,
[
      'O', //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      ChargeInCnt>1 ? 2 : 1, //$3 HL*O assuming that it will always be 1. 
      ChargeInCnt>1 ? ChargeInIndex + 3 : ChargeInIndex + 2, //$4 HL*I and for now assuming that it will be 1 HL*O.
      'RAW', //$5 Charge In Type - Raw Material
      Item.prd_taglotid, //$6 Charge out Tag
      Item.prd_heat, //$7 Heat#
      Item.prd_customertagno, //$8 Mill Coil#
      Item.prd_partnumber, //$9 Buyer's Part Number
      orginalDetail?.[0]?.dtl_mo ? orginalDetail?.[0]?.dtl_mo : prd_millorderno ?? null, //$10 Mill Order Number
      orginalDetail?.[0]?.dtl_mol ?? null, //$11 Mill Order Line
      Item.prd_grade, //$12 Grade Code
      null, //$13 MSA Code
      null, //$14 Responsible Party Alpha Code
      null, //$15 Responsible Party Code
      Item.prd_materialstatusdatetime ? Item.prd_materialstatusdatetime.slice(0,8) : null, //$16 Status Date
      Item.prd_materialstatusdatetime ? Item.prd_materialstatusdatetime.slice(8,14) : null, //$17 Status Time
      'ET', //$18 Status Time Zone
      Item.prd_processeddate ? Item.prd_processeddate.slice(0,8) : null, //$19 Process Date
      null, //$20 Process Time
      null, //$21 Process Time Zone
      null,//$22 Quality Date
      null,//$23 Quality Time
      null,//$24 Quality Time Zone
      orginalDetail ? orginalDetail[0].dtl_po || orginalDetail[0].dtl_cpo || Item.prd_externalordernumber : Item.prd_externalordernumber,//$25 PO Number
      Item.prdhdr_externalorderrelease ? Item.prdhdr_externalorderrelease : null,//$26 Release Number
      null,//$27 Change Order Sequence Number
      orginalDetail ? orginalDetail[0].dtl_pod || orginalDetail[0].dtl_cpod || Item.prd_externalorderdate : Item.prd_externalorderdate? Item.prd_externalorderdate : orginalDetail ? orginalDetail[0].dtl_cpod : null,//$28 PO Date
      orginalDetail ? orginalDetail[0].dtl_pol  && orginalDetail[0].dtl_pol !== '000' ? orginalDetail[0].dtl_pol : orginalDetail[0].dtl_cpol && orginalDetail[0].dtl_cpol !== '000' ? orginalDetail[0].dtl_cpol : Item.prd_externalorderitem : Item.prd_externalorderitem,//$29 PO Line Number
      Item.prd_externalcontractnumber ? Item.prd_externalcontractnumber : null,//$30 Contract Number
      null,//$31 PO Type Code
      Item.prd_prd_x12actualweightum === 'LB' ? Item.prd_actualweight : Item.prd_prd_x12actualweightum === 'KG' ? Item.prd_actualweight * 2.20462 : null,//$32 Actual Weight Lb
      Item.prd_prd_x12actualweightum === 'KG' ? Item.prd_actualweight : Item.prd_prd_x12actualweightum === 'LB' ? Item.prd_actualweight / 2.20462 : null,//$33 Actual Weight Kg
      Item.prd_x12theoreticalweightum === 'LB' ? Item.prd_theoreticalweight : Item.prd_x12theoreticalweightum === 'KG' ? Item.prd_theoreticalweight * 2.20462 : null,//$34 Theo Weight Lb
      Item.prd_x12theoreticalweightum === 'KG' ? Item.prd_theoreticalweight : Item.prd_x12theoreticalweightum === 'LB' ? Item.prd_theoreticalweight / 2.20462 : null,//$35 Theo Weight Kg
      Item.prd_x12gaugeum.includes('ED', 'EM','E8') ? Item.prd_gaugesize : Item.prd_x12gaugeum.includes('MM', 'MZ','M2') ? Item.prd_gaugesize / 25.4 : null,//$36 Gauge Inches
      Item.prd_x12gaugeum.includes('MM', 'MZ','M2') ? Item.prd_gaugesize : Item.prd_x12gaugeum.includes('ED', 'EM','E8') ? Item.prd_gaugesize * 25.4 : null,//$37 Gauge MM
      null,//$38 Gauge Type
      Item.prd_x12widthum === 'IN' ? Item.prd_width : Item.prd_x12widthum === 'MM' ? Item.prd_width / 25.4 : null,//$39 Width Inches
      Item.prd_x12widthum === 'MM' ? Item.prd_width : Item.prd_x12widthum === 'IN' ? Item.prd_width * 25.4 : null,//$40 Width MM
      Item.prd_x12lengthum === 'FT' ? Item.prd_length : Item.prd_x12lengthum === 'M' ? Item.prd_length * 3.28084 : null,//$41 Linear Feet
      Item.prd_x12lengthum === 'M' ? Item.prd_length : Item.prd_x12lengthum === 'FT' ? Item.prd_length / 3.28084 : null,//$42 Linear Meters
      Item.prd_x12lengthum === 'IN' ? Item.prd_length : Item.prd_x12lengthum === 'MM' ? Item.prd_length / 25.4 : null,//$43 Unit Length Inches
      Item.prd_x12lengthum === 'MM' ? Item.prd_length : Item.prd_x12lengthum === 'IN' ? Item.prd_length * 25.4 : null,//$44 Unit Length MM
      Item.prd_x12innerdiameterum === 'IN' ? Item.prd_innerdiameter : Item.prd_x12innerdiameterum === 'MM' ? Item.prd_innerdiameter / 25.4 : null, //$45 Inside Diameter Inches
      Item.prd_x12innerdiameterum === 'MM' ? Item.prd_innerdiameter : Item.prd_x12innerdiameterum === 'IN' ? Item.prd_innerdiameter * 25.4 : null,//$46 Inside Diameter MM
      Item.prd_x12outerdiameterum === 'IN' ? Item.prd_outerdiameter : Item.prd_x12outerdiameterum === 'MM' ? Item.prd_outerdiameter / 25.4 : null,//$47 Outside Diameter Inches
      Item.prd_x12outerdiameterum === 'MM' ? Item.prd_outerdiameter : Item.prd_x12outerdiameterum === 'IN' ? Item.prd_outerdiameter * 25.4 : null,//$48 Outside Diameter MM
      Item.prd_pieces ? Item.prd_pieces : null,//$49 Pieces
      Item.prd_opscurrentprocess,//$50 Process (AISI table 66)
      Item.prd_materialspecification,//$51 Material Classification (AISI table 67)
      Item.prd_materialstatus,//$52 Material Status (AISI table 70)
      null,//$53 Faults (AISI table 72)
      null,//$54 Damages (AISI table 73)
      null,//$55 Free format Comments
      null,//$56 Quality Status (AISI table 68)
      null,//$57 Commercial Status (AISI table 69)
      null,//$58 Line Item ID
      null,//$59 Quantity Ordered
      null,//$60 UOM
      null,//$61 Location  
      ymd, //$62 Date
      hms, //$63 Time
      'O870SNF', //$64 Program
      flag //$65 Flow flag





])

  } catch (error) {
    console.error(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }}


// 870 Charge Out details:
async function insert870ChargeOutDtl(pool, InterchangeControl, TransactionSet, Item, ProductionReportingHeader, flag, filePath, ChargeOutIndex, ChargeInCnt, ChargeOutCnt, orginalDetail) {
  try {
  await pool.query(`INSERT INTO public."870_SNF_ChgOutDtl"(
  chgoutdtl_type, chgoutdtl_key, chgoutdtl_hlo, chgoutdtl_hli, chgoutdtl_hlf, chgoutdtl_chrgintype, chgoutdtl_chrgintag, chgoutdtl_chrgoutttyp, chgoutdtl_chrgouttag, chgoutdtl_heat, chgoutdtl_mcoil, chgoutdtl_bpart, chgoutdtl_mo, chgoutdtl_mol, chgoutdtl_gc, chgoutdtl_msa, chgoutdtl_rpac, chgoutdtl_rpnc, chgoutdtl_stsdt, chgoutdtl_ststm, chgoutdtl_ststmz, chgoutdtl_prcdt, chgoutdtl_prctm, chgoutdtl_prctmz, chgoutdtl_qlydte, chgoutdtl_qlytme, chgoutdtl_qlytmz, chgoutdtl_po, chgoutdtl_rls, chgoutdtl_chgordseq, chgoutdtl_pod, chgoutdtl_pol, chgoutdtl_contractno, chgoutdtl_potypecd, chgoutdtl_awgtlb, chgoutdtl_awgtkg, chgoutdtl_twgtlb, chgoutdtl_twgtkg, chgoutdtl_gaugin, chgoutdtl_gaugmm, chgoutdtl_gaugt, chgoutdtl_lnft, chgoutdtl_lnmt, chgoutdtl_ulenin, chgoutdtl_ulenmm, chgoutdtl_idin, chgoutdtl_idmm, chgoutdtl_odin, chgoutdtl_odmm, chgoutdtl_pcs, chgoutdtl_proc, chgoutdtl_mcls, chgoutdtl_msts, chgoutdtl_fault, chgoutdtl_dmg, chgoutdtl_fcmt, chgoutdtl_qsts, chgoutdtl_csts, chgoutdtl_linid, chgoutdtl_qtyord, chgoutdtl_uom, chgoutdtl_ran, chgoutdtl_locn, chgoutdtl_crt_dat, chgoutdtl_crt_tim, chgoutdtl_crt_pgm, chgoutdtl_flow_flag, chgoutdtl_widmm, chgoutdtl_widin
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69);`,
[
      'O', //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      ChargeInCnt>1 ? 0 : 1, //$3 HL*O assuming that it will always be 1. 
      ChargeInCnt>1 ? 1 : 2, //$4 HL*F and for now assuming that it will be 1 HL*O.
      ChargeInCnt>1 ? ChargeOutIndex + 3 : ChargeOutIndex + 2, //$5 HL*I and for now assuming that it will be 1 HL*O.
      'RAW', //$6 Charge In Type - Raw Material
      Item.prd_taglotid, //$7 Charge in Tag
      'FG', //$8 Charge Out Type - Processed Waste/Retail
      Item.prd_taglotid, //$9 Charge out Tag
      Item.prd_heat, //$10 Heat#
      Item.prd_customertagno, //$11 Mill Coil#
      Item.prd_partnumber, //$12 Buyer's Part Number
      orginalDetail?.[0]?.dtl_mo ? orginalDetail?.[0]?.dtl_mo : prd_millorderno ?? null, //$13 Mill Order Number
      orginalDetail?.[0]?.dtl_mol ?? null, //$14 Mill Order Line
      Item.prd_grade, //$15 Grade Code
      null, //$16 MSA Code
      null, //$17 Responsible Party Alpha Code
      null, //$18 Responsible Party Code
      Item.prd_materialstatusdatetime ? Item.prd_materialstatusdatetime.slice(0,8) : null, //$19 Status Date
      Item.prd_materialstatusdatetime ? Item.prd_materialstatusdatetime.slice(8,14) : null, //$20 Status Time
      'ET', //$21 Status Time Zone
      Item.prd_processeddate ? Item.prd_processeddate.slice(0,8) : null, //$22 Process Date
      null, //$23 Process Time
      null, //$24 Process Time Zone
      null,//$25 Quality Date
      null,//$26 Quality Time
      null,//$27 Quality Time Zone
      orginalDetail ? orginalDetail[0].dtl_po || orginalDetail[0].dtl_cpo || Item.prd_externalordernumber : Item.prd_externalordernumber,//$28 PO Number
      Item.prdhdr_externalorderrelease ? Item.prdhdr_externalorderrelease : null,//$29 Release Number
      null,//$30 Change Order Sequence Number
      orginalDetail ? orginalDetail[0].dtl_pod || orginalDetail[0].dtl_cpod || Item.prd_externalorderdate : Item.prd_externalorderdate? Item.prd_externalorderdate : orginalDetail ? orginalDetail[0].dtl_cpod : null,//$31 PO Date
      orginalDetail ? orginalDetail[0].dtl_pol  && orginalDetail[0].dtl_pol !== '000' ? orginalDetail[0].dtl_pol : orginalDetail[0].dtl_cpol && orginalDetail[0].dtl_cpol !== '000' ? orginalDetail[0].dtl_cpol : Item.prd_externalorderitem : Item.prd_externalorderitem,//$32 PO Line Number
      Item.prd_externalcontractnumber ? Item.prd_externalcontractnumber : null,//$33 Contract Number
      null,//$34 PO Type Code
      Item.prd_prd_x12actualweightum === 'LB' ? Item.prd_actualweight : Item.prd_prd_x12actualweightum === 'KG' ? Item.prd_actualweight * 2.20462 : null,//$35 Actual Weight Lb
      Item.prd_prd_x12actualweightum === 'KG' ? Item.prd_actualweight : Item.prd_prd_x12actualweightum === 'LB' ? Item.prd_actualweight / 2.20462 : null,//$36 Actual Weight Kg
      Item.prd_x12theoreticalweightum === 'LB' ? Item.prd_theoreticalweight : Item.prd_x12theoreticalweightum === 'KG' ? Item.prd_theoreticalweight * 2.20462 : null,//$37 Theo Weight Lb
      Item.prd_x12theoreticalweightum === 'KG' ? Item.prd_theoreticalweight : Item.prd_x12theoreticalweightum === 'LB' ? Item.prd_theoreticalweight / 2.20462 : null,//$38 Theo Weight Kg
      Item.prd_x12gaugeum.includes('ED', 'EM','E8') ? Item.prd_gaugesize : Item.prd_x12gaugeum.includes('MM', 'MZ','M2') ? Item.prd_gaugesize / 25.4 : null,//$39 Gauge Inches
      Item.prd_x12gaugeum.includes('MM', 'MZ','M2') ? Item.prd_gaugesize : Item.prd_x12gaugeum.includes('ED', 'EM','E8') ? Item.prd_gaugesize * 25.4 : null,//$40 Gauge MM
      null,//$41 Gauge Type
      Item.prd_x12lengthum === 'FT' ? Item.prd_length : Item.prd_x12lengthum === 'M' ? Item.prd_length * 3.28084 : null,//$42 Linear Feet
      Item.prd_x12lengthum === 'M' ? Item.prd_length : Item.prd_x12lengthum === 'FT' ? Item.prd_length / 3.28084 : null,//$43 Linear Meters
      Item.prd_x12lengthum === 'IN' ? Item.prd_length : Item.prd_x12lengthum === 'MM' ? Item.prd_length / 25.4 : null,//$44 Unit Length Inches
      Item.prd_x12lengthum === 'MM' ? Item.prd_length : Item.prd_x12lengthum === 'IN' ? Item.prd_length * 25.4 : null,//$45 Unit Length MM
      Item.prd_x12innerdiameterum === 'IN' ? Item.prd_innerdiameter : Item.prd_x12innerdiameterum === 'MM' ? Item.prd_innerdiameter / 25.4 : null,//$46 Inside Diameter Inches
      Item.prd_x12innerdiameterum === 'MM' ? Item.prd_innerdiameter : Item.prd_x12innerdiameterum === 'IN' ? Item.prd_innerdiameter * 25.4 : null,//$47 Inside Diameter MM
      Item.prd_x12outerdiameterum === 'IN' ? Item.prd_outerdiameter : Item.prd_x12outerdiameterum === 'MM' ? Item.prd_outerdiameter / 25.4 : null,//$48 Outside Diameter Inches
      Item.prd_x12outerdiameterum === 'MM' ? Item.prd_outerdiameter : Item.prd_x12outerdiameterum === 'IN' ? Item.prd_outerdiameter * 25.4 : null,//$49 Outside Diameter MM
      Item.prd_pieces ? Item.prd_pieces : null,//$50 Pieces
      Item.prd_opscurrentprocess,//$51 Process (AISI table 66)
      Item.prd_materialspecification,//$52 Material Classification (AISI table 67)
      Item.prd_materialstatus,//$53 Material Status (AISI table 70)
      null,//$54 Faults (AISI table 72)
      null,//$55 Damages (AISI table 73)
      null,//$56 Free format Comments
      null,//$57 Quality Status (AISI table 68)
      null,//$58 Commercial Status (AISI table 69)
      null,//$59 Line Item ID
      null,//$60 Quantity Ordered
      null,//$61 UOM
      null, //$62 RAN number
      null,//$63 Location  
      ymd, //$64 Date
      hms, //$65 Time
      'O870SNF', //$66 Program
      flag, //$67 Flow flag
      Item.prd_x12widthum === 'IN' ? Item.prd_width : null,//$68 Width Inches
      Item.prd_x12widthum === 'MM' ? Item.prd_width : null,//$69 Width MM



])

  } catch (error) {
    console.error(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }}


  module.exports = {
    LoadO870SNF
};
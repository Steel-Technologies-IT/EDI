// This module handles the insertion of parsed EDI 870 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.


const chopOffDecimals = require('../../functions/chopoffdecimals.js');
const limitDecimals = require('../../functions/limitDecimals.js');
const  readableErrors = require('../../functions/readableErrors.js');
const retrieveInboundASN = require('../../functions/retrieveInboundASN.js').retrieveInboundASN;
const retrieveMaterialStatus = require('../../functions/retrieveMaterialStatus.js').retrieveMaterialStatus;
const queryInvexDatabase = require('../../Invex/InvexConnection.js');
let ymd;
let hms;
async function LoadO870SNF(pool, InterchangeControl, TransactionSet, ProductionReportingHeader, InventoryAdjustments, HeaderInstructions, HeaderNameAddress, NonRecordedScrapItems,  ProductItem, ProductInstructions, ProductItemNameAddress, Damages, Errors, flag, filePath) {
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
      const key = await retrieveInboundASN(product.prd_customertagno, product.prd_heat, HeaderNameAddress[0] && HeaderNameAddress[0].hdna_identificationcode ? HeaderNameAddress[0].hdna_identificationcode : null);
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
  await InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ProductionReportingHeader, InventoryAdjustments, HeaderInstructions, HeaderNameAddress, NonRecordedScrapItems,  ProductItem, Damages, ProductInstructions, ProductItemNameAddress, orginalDetail, Errors, flag, filePath)
}

const getSentFlag = async (pool, TaglotID, OrderItemCode) => {
    
            if (OrderItemCode === 'C' || OrderItemCode === 'D') {
              try {
                        const sql = `With LatestProducts AS(Select prd_itm_ctl_no, prd_tag_no from INTPRD_REC 
                                      Where prd_tag_no = '${TaglotID}'
                                      Order by prd_upd_dtts desc
                                      Limit 1) 
                                      SELECT * FROM LatestProducts lp
                                      INNER JOIN injitd_rec lj ON lp.prd_itm_ctl_no = lj.itd_itm_ctl_no AND lj.itd_ref_pfx = 'RC'
                                      ORDER BY lj.itd_ref_no desc`;
                        const result = await queryInvexDatabase(sql); 
                        if (result.Data && result.Data.length > 0) {     
                        return 'Y';
                        }
                  } catch (error) {
                        console.error('Error querying Invex database for Material Class:', error);
                  }
            }
    try {
            const O870A_Key = await pool.query(
            `SELECT hdr_key FROM "870_SNF_Header" 
            INNER JOIN "870_SNF_ChgOutDtl" ON chgoutdtl_key = hdr_key            
            WHERE (hdr_ord_itm_cd = 'A' OR hdr_ord_itm_cd = 'B') AND hdr_sent_flag = 'Y'
              AND chgoutdtl_chrgouttag = '${TaglotID}'`
            );
            if (O870A_Key.rows && O870A_Key.rows.length > 0 && O870A_Key.rows[0].hdr_key) {
            return 'Y';
            } else {
            return 'N';
            }
        } catch (error) {
          console.error('Error querying postgress database for O870A:', error);
          return null;
        }
};
      

  async function InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ProductionReportingHeader, InventoryAdjustments, HeaderInstructions, HeaderNameAddress, NonRecordedScrapItems,  ProductItem, Damages, ProductInstructions, ProductItemNameAddress, orginalDetail, Errors, flag, filePath){
  // Charge In and Charge Out Counts
  //const ChargeInCnt = ProductItem.filter(m => m.prd_referencelinenumber.includes('0')).length;
  //const ChargeOutCnt = ProductItem.filter(m => m.prd_referencelinenumber.includes('1')).length;
  const ChargeInCnt = ProductItem.filter(m => ['0', '2'].includes(m.prd_referencelinenumber)).length;
  const ChargeOutCnt = ProductItem.filter(m => ['1'].includes(m.prd_referencelinenumber)).length;
  const scrapCnt = NonRecordedScrapItems ? NonRecordedScrapItems.length : 0;
  const InvAdjCnt = InventoryAdjustments ? InventoryAdjustments.length : 0;
  let ChargeInTag = ' ';
  const ChargeIn = ProductItem.filter(m => ['0', '2'].includes(m.prd_referencelinenumber));
  const ChargeOut = ProductItem.filter(m => ['1'].includes(m.prd_referencelinenumber));
  // Determine Order Item Code
  let OrderItemCode;
  let SentFlag = 'N';
  const LiftIdCnt = ProductItem.filter(product => product.prd_liftid != null && product.prd_referencelinenumber === '1').length;
  if (ChargeInCnt > 1 && LiftIdCnt > 1) {
      OrderItemCode = 'B'

      for (const ChgIn of ChargeIn) {
          SentFlag = await getSentFlag(pool, ChgIn.prd_taglotid, OrderItemCode);
          console.log('TaglotID', ChgIn.prd_taglotid, 'SentFlag', SentFlag);
          if (SentFlag === 'N') {
              break; // No need to check further if we found an 'N'
          }
      }

      //console.log('There are multiple unique prd_liftid values:', LiftIdCnt, OrderItemCode);
      // true: multiple unique lift IDs
  } else if (ChargeInCnt === 1 && ChargeOutCnt === 0 && ChargeIn[0].prd_referencelinenumber === '2' && InvAdjCnt > 0) {
      OrderItemCode = 'C';
      SentFlag = await getSentFlag(pool, ChargeIn[0].prd_taglotid, OrderItemCode);
      console.log('TaglotID', ChargeIn[0].prd_taglotid);
  } else if (ChargeInCnt === 1 && ChargeOutCnt === 1 && ChargeIn[0].prd_taglotid === ChargeOut[0].prd_taglotid) {
      OrderItemCode = 'D';
      SentFlag = await getSentFlag(pool, ChargeIn[0].prd_taglotid, OrderItemCode);
      console.log('TaglotID', ChargeIn[0].prd_taglotid);
    } else {
      OrderItemCode = 'A';
      SentFlag = 'Y';
      //console.log('No prd_liftid values found.', OrderItemCode);
  }
  console.log('Order Item Code:', OrderItemCode, 'SentFlag:', SentFlag);

  await insert870Header(pool, InterchangeControl, HeaderNameAddress, ProductionReportingHeader[0],  flag, filePath, ProductItem, OrderItemCode, SentFlag);
    // Address Insertion

  //Header Address Insertion
  if (OrderItemCode === 'C') {
    await Promise.all(ProductItemNameAddress.map(async address => {
    await insert870Names(pool, InterchangeControl, address,  flag, filePath);
  }));
  } else {
    await Promise.all(HeaderNameAddress.map(async address => {
    await insert870Names(pool, InterchangeControl, address,  flag, filePath);
  }));
 }
  // Order Details
  if (OrderItemCode === 'C') {
    await Promise.all(InventoryAdjustments.map(async (dtl, dtlIndex) => {
    const orgDetail = orginalDetail?.rows?.filter(od => od.dtl_heat === ChargeIn[0].prd_heat && od.dtl_mcoil === ChargeIn[0].prd_customertagno) || [];
    await insert870OrderDtlC(pool, InterchangeControl, dtl, dtlIndex, HeaderNameAddress, flag, filePath, orgDetail, ChargeIn[0].prd_externalorderrelease);
  }));
  } else {
    await Promise.all(ProductionReportingHeader.map(async (dtl, dtlIndex) => {
    const orgDetail = orginalDetail?.rows?.filter(od => od.dtl_heat === ChargeIn[0].prd_heat && od.dtl_mcoil === ChargeIn[0].prd_customertagno) || [];
    await insert870OrderDtl(pool, InterchangeControl, dtl, dtlIndex, HeaderNameAddress, flag, filePath, orgDetail);
  }))
  }

  // Charge In Details
  // let ChargeInTag = ' ';
  // const ChargeIn = ProductItem.filter(m => m.prd_referencelinenumber === '0');
  if (ChargeIn && ChargeIn.length > 0) {
    await Promise.all(ChargeIn.map(async (Item, ChargeInIndex) => {
    ChargeInTag = Item.prd_taglotid;
    const orgDetail = orginalDetail?.rows?.filter(od => od.dtl_heat === Item.prd_heat && od.dtl_mcoil === Item.prd_customertagno) || [];
    await insert870ChargeInDtl(pool, InterchangeControl, TransactionSet, Item, ProductionReportingHeader[0], flag, filePath, ChargeInIndex, ChargeInCnt, ChargeOutCnt, orgDetail);
  }))
  } else {
    console.warn('No product item found with reference line number 0');
  }

  // Charge Out Details
  //const ChargeOut = ProductItem.filter(m => m.prd_referencelinenumber === '1');
  if (OrderItemCode === 'B') {
  if (ChargeOut && ChargeOut.length > 0) {
    const totalPieces = ChargeOut.reduce((sum, item) => sum + (Number(item.prd_pieces) || 0), 0);
    const totalWeight = ChargeOut.reduce((sum, item) => sum + (Number(item.prd_actualweight) || 0), 0);
    const orgDetail = orginalDetail?.rows?.filter(od => od.dtl_heat === ChargeOut[0].prd_heat && od.dtl_mcoil === ChargeOut[0].prd_customertagno) || [];
    await insert870ChargeOutDtl(pool, InterchangeControl, TransactionSet, ChargeOut[0], ProductionReportingHeader[0], flag, filePath, 0, ChargeInCnt, ChargeOutCnt, orgDetail, ChargeInTag, OrderItemCode, totalPieces, totalWeight);      
  } else {
    console.warn('No product item found with reference line number 1');
  }
  } else {
  if (ChargeOut && ChargeOut.length > 0 && OrderItemCode !== 'C') {
  await Promise.all(ChargeOut.map(async (Item, ChargeOutIndex) => {
    const orgDetail = orginalDetail?.rows?.filter(od => od.dtl_heat === Item.prd_heat && od.dtl_mcoil === Item.prd_customertagno) || [];
    await insert870ChargeOutDtl(pool, InterchangeControl, TransactionSet, Item, ProductionReportingHeader[0], flag, filePath, ChargeOutIndex, ChargeInCnt, ChargeOutCnt, orgDetail, ChargeInTag, OrderItemCode);      
  }))
  } else {
    console.warn('No product item found with reference line number 1');
  }
  }

//Write code to insert nonrecorded scrap items as last charge out details
  if (NonRecordedScrapItems && NonRecordedScrapItems.length > 0) {
    await Promise.all(NonRecordedScrapItems.map(async (Item, NonRecordedScrapIndex) => {
      await insert870Scrap (pool, InterchangeControl, TransactionSet, Item, ProductionReportingHeader[0], flag, filePath, NonRecordedScrapIndex, ChargeInCnt, ChargeOutCnt, orginalDetail, ChargeInTag, scrapCnt, NonRecordedScrapIndex);
    }));
  }
}

  // //MARK: Header
// //870 Header Insert
async function insert870Header(pool, InterchangeControl, Address, ProductionReportingHeader, flag, filePath, ProductItem, OrderItemCode, SentFlag) {

try {
    await pool.query(`INSERT INTO public."870_SNF_Header"(
  hdr_type, hdr_key, hdr_isnd_id, hdr_gsnd_id, hdr_ircv_id, hdr_grcv_id, hdr_ictl_no, hdr_gctl_no, hdr_stctl_no, hdr_dsnt_no, hdr_tsnt_no, hdr_sts_rpt_cd, hdr_ord_itm_cd, hdr_ref_id, hdr_date, hdr_prd_dte_cd, hdr_loc_cd, hdr_time, hdr_prod_ref_id, hdr_tran_type, hdr_action_cd, hdr_pdte_no, hdr_ptme_no, hdr_ptmez_cd, hdr_stscd_no, hdr_ststm_no, hdr_stszn_cd, hdr_qltdte_no, hdr_qlttme_no, hdr_qltzne_cd, hdr_mfgidq_cd, hdr_mfgid_id, hdr_outprcq_cd, hdr_outprcid_id, hdr_sum_hl_seg, hdr_sum_hsh_ttl, hdr_sttx_locn, hdr_crt_dat, hdr_crt_tim, hdr_crt_pgm, hdr_isa_qual, hdr_ircv_qual, hdr_flow_flag, hdr_sent_flag)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44);`, 
  [
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
    hms.slice(0, 6), //$11 Time Sent
    OrderItemCode !== 'C' ? ProductionReportingHeader.prdhdr_statusreportcode : null, //$12 Status Report Code
    OrderItemCode, //$13 Order Item Code
    OrderItemCode !== 'C' ? ProductionReportingHeader.prdhdr_transactionreference : null, //$14 Transaction Reference
    String(ymd), //$15 
    null, //$16 Product Date Code
    null, //$17 Location Code
    String(hms), //$18 Time
    OrderItemCode !== 'C' ? ProductionReportingHeader.prdhdr_transactionreference : null, //$19 Production Reference ID
    OrderItemCode !== 'C' ? ProductionReportingHeader.prdhdr_opsprocess : null, //$20 Transaction Type
    null, //$21 Action Code
    OrderItemCode !== 'C' ? ProductionReportingHeader.prdhdr_updatedatetime ? ProductionReportingHeader.prdhdr_updatedatetime.slice(0, 8) : null : null, //$22 Production Date
    OrderItemCode !== 'C' ? ProductionReportingHeader.prdhdr_updatedatetime ? ProductionReportingHeader.prdhdr_updatedatetime.slice(8, 14) : null : null, //$23 Production Time
    'ET', //$24 Production Time Zone
    null, //$25 Status change date
    null, //$26 Status change time
    'ET', //$27 Status change time zone
    null, //$28 Quality rating date
    null, //$29 Quality rating time  
    null, //$30 Quality rating time zone  
    '1', //$31 Manufacturing ID qualifier 
    Address.find(Address => Address.hdna_identificationcodequalifier === 'M')?.hdna_identificationcode ? Address.find(Address => Address.hdna_identificationcodequalifier === 'M')?.hdna_identificationcode : null, //$32 Manufacturing ID
    '1', //$33 OU ID qualifier
    Address.find(Address => Address.hdna_identificationcodequalifier === 'U')?.hdna_identificationcode ? Address.find(Address => Address.hdna_identificationcodequalifier === 'U')?.hdna_identificationcode : null, //$34 OU ID
    (ProductItem ? ProductItem.length + 1 : 1), //$35 Number of HL segments
    null, //$36 Hash total
    null, //$37 Plant location
    ymd, // $38 Date
    hms, //$39 Time
    'O870SNF', //$40
    InterchangeControl.ictl_senderinterchangeidqualifier, //$41
    InterchangeControl.ictl_receiverinterchangeidqualifier, //$42  
    flag, //$43
    SentFlag, //$44
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

//MARK: Order Detail
//870 Detail Insert
async function insert870OrderDtl(pool, InterchangeControl, dtl, dtlIndex, HeaderNameAddress, flag, filePath, orginalDetail) {
try {
  await pool.query( `INSERT INTO public."870_SNF_OrderDtl"(
  ord_type, ord_key, ord_hlo, ord_po, ord_pol, ord_pod, ord_rls, ord_poc, ord_cont_no, ord_potype_cd, ord_cpo, ord_cpol, ord_cpart, ord_partd, ord_itm_lin_no, ord_qty_ord, ord_uom, ord_msa, ord_sttx_locn, ord_crt_dat, ord_crt_tim, ord_crt_pgm, ord_flow_flag, ord_ult_po, ord_ult_rls, ord_ult_cpart, ord_cust_po, ord_cust_rls)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28);`,
  [
    'O', //$1 Type
    InterchangeControl.ictl_edixcontrolnumber, //$2 Key
    dtlIndex + 1, //$3 HL*O For now assuming that it will be 1. won't be multiple.
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_po || orginalDetail[0].dtl_cpo || dtl.prdhdr_externalordernumber : dtl.prdhdr_externalordernumber, //$4 PO#
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_pol  && orginalDetail[0].dtl_pol !== '000' ? orginalDetail[0].dtl_pol : orginalDetail[0].dtl_cpol && orginalDetail[0].dtl_cpol !== '000' ? orginalDetail[0].dtl_cpol : null : null, //$5 PO Line number?
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_pod || orginalDetail[0].dtl_cpod || String(dtl.prdhdr_externalorderdate).slice(0, 8) : dtl.prdhdr_externalorderdate ? String(dtl.prdhdr_externalorderdate).slice(0, 8) : orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_cpod : null, //$6 PO date
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_rls || dtl.prdhdr_externalorderrelease : dtl.prdhdr_externalorderrelease, //$7 Release#
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_poc : null, //$8 Change Order Sequence Number
    dtl.prdhdr_externalcontractnumber, //$9 Contract Number
    null, //$10 PO Type
    dtl.prdhdr_enduserpo, //$11 Customer PO#
    null, //$12 Customer PO Line#
    null, //$13 Part Number
    null, //$14 Part Desc
    null, //$15 Order Item Line Number
    null, //$16 Quantity Ordered
    null, //$17 UOM
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_msa : null, //$18 MSA
    null, //$19 Location
    ymd, //$20 Date
    hms, //$21 Time
    'O870SNF', //$22 Program
    flag, //$23 Flow flag
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_po || orginalDetail[0].dtl_ucpo || orginalDetail[0].dtl_cpo : null, //$24 Ultimate PO
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_rls : null, //$25 Ultimate Release
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_cpart : null, //$26 Ultimate Contract Part
    dtl.prdhdr_externalordernumber, //$27 Customer PO
    dtl.prdhdr_externalorderrelease //$28 Customer Release
  ]);
}
catch (error) {
    console.error(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
}
}

//MARK: Order Detail for O870C
//870 Detail Insert
async function insert870OrderDtlC(pool, InterchangeControl, dtl, dtlIndex, HeaderNameAddress, flag, filePath, orginalDetail, externalorderrelease) {
try {
  //console.log('Inserting O870C Order Detail for Index:', orginalDetail);
  await pool.query( `INSERT INTO public."870_SNF_OrderDtl"(
  ord_type, ord_key, ord_hlo, ord_po, ord_pol, ord_pod, ord_rls, ord_poc, ord_cont_no, ord_potype_cd, ord_cpo, ord_cpol, ord_cpart, ord_partd, ord_itm_lin_no, ord_qty_ord, ord_uom, ord_msa, ord_sttx_locn, ord_crt_dat, ord_crt_tim, ord_crt_pgm, ord_flow_flag, ord_ult_po, ord_ult_rls, ord_ult_cpart, ord_cust_po, ord_cust_rls)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28);`,
  [
    'O', //$1 Type
    InterchangeControl.ictl_edixcontrolnumber, //$2 Key
    dtlIndex + 1, //$3 HL*O For now assuming that it will be 1. won't be multiple.
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_po || orginalDetail[0].dtl_cpo || dtl.invadj_externalordernumber : dtl.invadj_externalordernumber, //$4 PO#
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_pol  && orginalDetail[0].dtl_pol !== '000' ? orginalDetail[0].dtl_pol : orginalDetail[0].dtl_cpol && orginalDetail[0].dtl_cpol !== '000' ? orginalDetail[0].dtl_cpol : null : null, //$5 PO Line number?
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_pod || orginalDetail[0].dtl_cpod || String(dtl.invadj_externalorderdate).slice(0, 8) : dtl.invadj_externalorderdate? String(dtl.invadj_externalorderdate).slice(0, 8) : orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_cpod : null,  //$6 PO date
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_rls : null, //$7 Release# String(dtl.invadj_externalorderdate).slice(0, 8)
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_poc : null, //$8 Change Order Sequence Number
    null, //$9 Contract Number
    null, //$10 PO Type
    null, //$11 Customer PO#
    null, //$12 Customer PO Line#
    null, //$13 Part Number
    null, //$14 Part Desc
    null, //$15 Order Item Line Number
    null, //$16 Quantity Ordered
    null, //$17 UOM
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_msa : null, //$18 MSA
    null, //$19 Location
    ymd, //$20 Date
    hms, //$21 Time
    'O870SNF', //$22 Program
    flag, //$23 Flow flag
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_po || orginalDetail[0].dtl_ucpo || orginalDetail[0].dtl_cpo : null, //$24 Ultimate PO
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_rls : null, //$25 Ultimate Release
    orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_cpart : null, //$26 Ultimate Contract Part
    dtl.invadj_externalordernumber, //$27 Customer PO
    externalorderrelease //$28 Customer Release
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
  const ChgInTag = Item.prd_liftid ? Item.prd_liftid : Item.prd_taglotid;
  const materialStatus = ChgInTag ? await retrieveMaterialStatus(ChgInTag) : null;
  await pool.query(`INSERT INTO public."870_SNF_ChgInDtl"(
  chgindtl_type, chgindtl_key, chgindtl_hlo, chgindtl_hli, chgindtl_chrgintype, chgindtl_chrgintag, chgindtl_heat, chgindtl_mcoil, chgindtl_bpart, chgindtl_mo, chgindtl_mol, chgindtl_gc, chgindtl_msa, chgindtl_rpac, chgindtl_rpnc, chgindtl_stsdt, chgindtl_ststm, chgindtl_ststmz, chgindtl_prcdt, chgindtl_prctm, chgindtl_prctmz, chgindtl_qlydte, chgindtl_qlytme, chgindtl_qlytmz, chgindtl_po, chgindtl_rls, chgindtl_chgordseq, chgindtl_pod, chgindtl_pol, chgindtl_contractno, chgindtl_potypecd, chgindtl_awgtlb, chgindtl_awgtkg, chgindtl_twgtlb, chgindtl_twgtkg, chgindtl_gaugin, chgindtl_gaugmm, chgindtl_gaugt, chgindtl_widin, chgindtl_widmm, chgindtl_lnft, chgindtl_lnmt, chgindtl_ulenin, chgindtl_ulenmm, chgindtl_idin, chgindtl_idmm, chgindtl_odin, chgindtl_odmm, chgindtl_pcs, chgindtl_proc, chgindtl_mcls, chgindtl_msts, chgindtl_fault, chgindtl_dmg, chgindtl_fcmt, chgindtl_qsts, chgindtl_csts, chgindtl_linid, chgindtl_qtyord, chgindtl_uom, chgindtl_locn, chgindtl_crt_dat, chgindtl_crt_tim, chgindtl_crt_pgm, chgindtl_flow_flag, chgindtl_spart, chgindtl_spartd, chgindtl_scpo, chgindtl_coil_frm, chgindtl_ccoil, chgindtl_mltcoil_flg)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71);`,
  [
      'O', //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      ChargeInCnt>1 ? 1 : 1, //$3 HL*O assuming that it will always be 1. 
      ChargeInCnt>1 ? 2 : ChargeInIndex + 2, //$4 HL*I and for now assuming that it will be 1 HL*O.
      null, //'RAW', //$5 Charge In Type - Raw Material
      Item.prd_taglotid, //$6 Charge out Tag
      Item.prd_heat, //$7 Heat#
      Item.prd_customertagno, //$8 Mill Coil#
      orginalDetail?.[0]?.dtl_cpart ?? null, //$9 Buyer's Part Number
      orginalDetail?.[0]?.dtl_mo ? orginalDetail?.[0]?.dtl_mo : Item.prd_millorderno ? Item.prd_millorderno : null, //$10 Mill Order Number
      orginalDetail?.[0]?.dtl_mol ?? null, //$11 Mill Order Line
      Item.prd_grade, //$12 Grade Code
      null, //$13 MSA Code
      null, //$14 Responsible Party Alpha Code
      null, //$15 Responsible Party Code
      Item.prd_materialstatusdatetime ? Item.prd_materialstatusdatetime.slice(0,8) : null, //$16 Status Date
      Item.prd_materialstatusdatetime ? Item.prd_materialstatusdatetime.slice(8,14) : null, //$17 Status Time
      'ET', //$18 Status Time Zone
      Item.prd_processeddate ? String(Item.prd_processeddate).slice(0,8) : null, //$19 Process Date
      null, //$20 Process Time
      null, //$21 Process Time Zone
      null,//$22 Quality Date
      null,//$23 Quality Time
      null,//$24 Quality Time Zone
      orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_po || orginalDetail[0].dtl_cpo || Item.prd_externalordernumber: Item.prd_externalordernumber, //$25 PO Number
      Item.prdhdr_externalorderrelease ? Item.prdhdr_externalorderrelease : null,//$26 Release Number
      null,//$27 Change Order Sequence Number
      orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_pod || orginalDetail[0].dtl_cpod || Item.prd_externalorderdate : Item.prd_externalorderdate? Item.prd_externalorderdate : orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_cpod : null,//$28 PO Date
      orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_pol  && orginalDetail[0].dtl_pol !== '000' ? orginalDetail[0].dtl_pol : orginalDetail[0].dtl_cpol && orginalDetail[0].dtl_cpol !== '000' ? orginalDetail[0].dtl_cpol : Item.prd_externalorderitem : Item.prd_externalorderitem,//$29 PO Line Number
      Item.prd_externalcontractnumber ? Item.prd_externalcontractnumber : null,//$30 Contract Number
      null,//$31 PO Type Code
      Item.prd_x12actualweightum === 'LB' ? Item.prd_actualweight : Item.prd_x12actualweightum === 'KG' ? Item.prd_actualweight * 2.20462 : null,//$32 Actual Weight Lb
      Item.prd_x12actualweightum === 'KG' ? Item.prd_actualweight : Item.prd_x12actualweightum === 'LB' ? Item.prd_actualweight / 2.20462 : null,//$33 Actual Weight Kg
      Item.prd_x12theoreticalweightum === 'LB' ? Item.prd_theoreticalweight : Item.prd_x12theoreticalweightum === 'KG' ? Item.prd_theoreticalweight * 2.20462 : null,//$34 Theo Weight Lb
      Item.prd_x12theoreticalweightum === 'KG' ? Item.prd_theoreticalweight : Item.prd_x12theoreticalweightum === 'LB' ? Item.prd_theoreticalweight / 2.20462 : null,//$35 Theo Weight Kg
      ['ED', 'E8', 'EM', 'E7', 'IN'].includes(Item.prd_x12gaugeum) ? Item.prd_gaugesize : ['MM', 'MB', 'M2', 'MZ', 'MY'].includes(Item.prd_x12widthum) ? Item.prd_gaugesize / 25.4 : null, //36 Gauge Inches
      ['MM', 'MB', 'M2', 'MZ', 'MY'].includes(Item.prd_x12gaugeum) ? Item.prd_gaugesize : ['ED', 'E8', 'EM', 'E7', 'IN'].includes(Item.prd_x12widthum) ? Item.prd_gaugesize * 25.4 : null, //37 Gauge MM  
      ['ED', 'MB'].includes(Item.prd_x12gaugeum) ? 'NOM' : ['EM', 'MZ'].includes(Item.prd_x12gaugeum) ? 'MIN' : null, //$38 Gauge Type
      Item.prd_x12widthum === 'IN' ? Item.prd_width : Item.prd_x12widthum === 'MM' ? Item.prd_width / 25.4 : null,//$39 Width Inches
      Item.prd_x12widthum === 'MM' ? Item.prd_width : Item.prd_x12widthum === 'IN' ? Item.prd_width * 25.4 : null,//$40 Width MM
      ['FT', 'LF'].includes(Item.prd_x12coillengthum) && Item.prd_coillength > 0 ? Item.prd_coillength : ['MT', 'MR'].includes(Item.prd_x12coillengthum) && Item.prd_coillength > 0 ? Item.prd_coillength * 3.28084 : null, //41 Linear Feet
      ['MT', 'MR'].includes(Item.prd_x12coillengthum) && Item.prd_coillength > 0 ? Item.prd_coillength : ['FT', 'LF'].includes(Item.prd_x12coillengthum) && Item.prd_coillength > 0 ? Item.prd_coillength / 3.28084 : null, //42 Linear Meters
      Item.prd_x12lengthum === 'IN' && Item.prd_length > 0 ? Item.prd_length : Item.prd_x12lengthum === 'MM' && Item.prd_length > 0 ? Item.prd_length / 25.4 : null,//$43 Unit Length Inches
      Item.prd_x12lengthum === 'MM' && Item.prd_length > 0 ? Item.prd_length : Item.prd_x12lengthum === 'IN' && Item.prd_length > 0 ? Item.prd_length * 25.4 : null,//$44 Unit Length MM
      Item.prd_x12innerdiameterum === 'IN' && Item.prd_innerdiameter > 0 ? Item.prd_innerdiameter : Item.prd_x12innerdiameterum === 'MM' && Item.prd_innerdiameter > 0 ? Item.prd_innerdiameter / 25.4 : null, //$45 Inside Diameter Inches
      Item.prd_x12innerdiameterum === 'MM' && Item.prd_innerdiameter > 0 ? Item.prd_innerdiameter : Item.prd_x12innerdiameterum === 'IN' && Item.prd_innerdiameter > 0 ? Item.prd_innerdiameter * 25.4 : null,//$46 Inside Diameter MM
      Item.prd_x12outerdiameterum === 'IN' && Item.prd_outerdiameter > 0 ? Item.prd_outerdiameter : Item.prd_x12outerdiameterum === 'MM' && Item.prd_outerdiameter > 0 ? Item.prd_outerdiameter / 25.4 : null,//$47 Outside Diameter Inches
      Item.prd_x12outerdiameterum === 'MM' && Item.prd_outerdiameter > 0 ? Item.prd_outerdiameter : Item.prd_x12outerdiameterum === 'IN' && Item.prd_outerdiameter > 0 ? Item.prd_outerdiameter * 25.4 : null,//$48 Outside Diameter MM
      Item.prd_pieces ? Item.prd_pieces : null,//$49 Pieces
      Item.prd_opscurrentprocess,//$50 Process (AISI table 66)
      Item.prd_materialclassification,//$51 Material Classification (AISI table 67)
      materialStatus ? materialStatus : Item.prd_materialstatus,//$52 Material Status (AISI table 70)
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
      flag, //$65 Flow flag
      Item.prd_partnumber, //$66 Part Number
      Item.prd_partdescription, //$67 Part Description
      Item.prd_externalordernumber ? Item.prd_externalordernumber : null, //$68 PO Line Number
      Item.prd_coilform, //$69 Coil Form
      orginalDetail ?.[0]?.dtl_ccoil ?? null, //$70
      Item.prd_pieces > 1 ? 'Y' : 'N' //$71 Multi Coil Flag

  ]);
  } catch (error) {
    console.error(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }}

// 870 Charge Out details:
async function insert870ChargeOutDtl(pool, InterchangeControl, TransactionSet, Item, ProductionReportingHeader, flag, filePath, ChargeOutIndex, ChargeInCnt, ChargeOutCnt, orginalDetail, ChargeInTag, OrderItemCode, totalPieces, totalWeight) {
  const Weight = (OrderItemCode === 'B') ? totalWeight : Item.prd_actualweight;
  const Pieces = (OrderItemCode === 'B') ? totalPieces : Item.prd_pieces;
  const ChgOutTag = Item.prd_liftid ? Item.prd_liftid : Item.prd_taglotid;
  const materialStatus = ChgOutTag ? await retrieveMaterialStatus(ChgOutTag) : null;
  try {
  await pool.query(`INSERT INTO public."870_SNF_ChgOutDtl"(
  chgoutdtl_type, chgoutdtl_key, chgoutdtl_hlo, chgoutdtl_hli, chgoutdtl_hlf, chgoutdtl_chrgintype, chgoutdtl_chrgintag, chgoutdtl_chrgoutttyp, chgoutdtl_chrgouttag, chgoutdtl_heat, chgoutdtl_mcoil, chgoutdtl_bpart, chgoutdtl_mo, chgoutdtl_mol, chgoutdtl_gc, chgoutdtl_msa, chgoutdtl_rpac, chgoutdtl_rpnc, chgoutdtl_stsdt, chgoutdtl_ststm, chgoutdtl_ststmz, chgoutdtl_prcdt, chgoutdtl_prctm, chgoutdtl_prctmz, chgoutdtl_qlydte, chgoutdtl_qlytme, chgoutdtl_qlytmz, chgoutdtl_po, chgoutdtl_rls, chgoutdtl_chgordseq, chgoutdtl_pod, chgoutdtl_pol, chgoutdtl_contractno, chgoutdtl_potypecd, chgoutdtl_awgtlb, chgoutdtl_awgtkg, chgoutdtl_twgtlb, chgoutdtl_twgtkg, chgoutdtl_gaugin, chgoutdtl_gaugmm, chgoutdtl_gaugt, chgoutdtl_lnft, chgoutdtl_lnmt, chgoutdtl_ulenin, chgoutdtl_ulenmm, chgoutdtl_idin, chgoutdtl_idmm, chgoutdtl_odin, chgoutdtl_odmm, chgoutdtl_pcs, chgoutdtl_proc, chgoutdtl_mcls, chgoutdtl_msts, chgoutdtl_fault, chgoutdtl_dmg, chgoutdtl_fcmt, chgoutdtl_qsts, chgoutdtl_csts, chgoutdtl_linid, chgoutdtl_qtyord, chgoutdtl_uom, chgoutdtl_ran, chgoutdtl_locn, chgoutdtl_crt_dat, chgoutdtl_crt_tim, chgoutdtl_crt_pgm, chgoutdtl_flow_flag, chgoutdtl_widin, chgoutdtl_widmm, "chgoutdtl_spart ", chgoutdtl_spartd, chgoutdtl_scpo, chgoutdtl_coil_frm, chgoutdtl_ccoil, chgoutdtl_mltcoil_flg)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75);`,
  [
      'O', //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      ChargeInCnt>1 ? 1 : 1, //$3 HL*O assuming that it will always be 1. 
      ChargeInCnt>1 ? 2 : 2, //$4 HL*F and for now assuming that it will be 1 HL*O.
      ChargeInCnt>1 ? ChargeOutIndex + 2 : ChargeOutIndex + 3, //$5 HL*I and for now assuming that it will be 1 HL*O.
      null, //'RAW', //$6 Charge In Type - Raw Material
      ChargeInTag, //$7 Charge in Tag
      Item.prd_taglotid === '' ? 'SCR': null, //Item.prd_taglotid === '' ? 'SCR' : 'FG', //$8 Charge Out Type - Processed Waste/Retail
      OrderItemCode === 'B' || OrderItemCode === 'D' ? Item.prd_liftid : Item.prd_taglotid, //$9 Charge out Tag
      Item.prd_heat, //$10 Heat#
      Item.prd_customertagno, //$11 Mill Coil#
      orginalDetail?.[0]?.dtl_cpart ?? null, //$12 Buyer's Part Number
      orginalDetail?.[0]?.dtl_mo ? orginalDetail?.[0]?.dtl_mo : Item.prd_millorderno ? Item.prd_millorderno : null, //$13 Mill Order Number
      orginalDetail?.[0]?.dtl_mol ?? null, //$14 Mill Order Line
      Item.prd_grade, //$15 Grade Code
      null, //$16 MSA Code
      null, //$17 Responsible Party Alpha Code
      null, //$18 Responsible Party Code
      Item.prd_materialstatusdatetime ? Item.prd_materialstatusdatetime.slice(0,8) : null, //$19 Status Date
      Item.prd_materialstatusdatetime ? Item.prd_materialstatusdatetime.slice(8,14) : null, //$20 Status Time
      'ET', //$21 Status Time Zone
      Item.prd_processeddate ? String(Item.prd_processeddate).slice(0,8) : null, //$22 Process Date
      null, //$23 Process Time
      null, //$24 Process Time Zone
      null,//$25 Quality Date
      null,//$26 Quality Time
      null,//$27 Quality Time Zone
      orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_po || orginalDetail[0].dtl_cpo || Item.prd_externalordernumber : Item.prd_externalordernumber,//$28 PO Number
      Item.prdhdr_externalorderrelease ? Item.prdhdr_externalorderrelease : null,//$29 Release Number
      null,//$30 Change Order Sequence Number
      orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_pod || orginalDetail[0].dtl_cpod || Item.prd_externalorderdate : Item.prd_externalorderdate? Item.prd_externalorderdate : orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_cpod : null,//$31 PO Date
      orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_pol  && orginalDetail[0].dtl_pol !== '000' ? orginalDetail[0].dtl_pol : orginalDetail[0].dtl_cpol && orginalDetail[0].dtl_cpol !== '000' ? orginalDetail[0].dtl_cpol : Item.prd_externalorderitem : Item.prd_externalorderitem,//$32 PO Line Number
      Item.prd_externalcontractnumber ? Item.prd_externalcontractnumber : null,//$33 Contract Number
      null,//$34 PO Type Code
      Item.prd_x12actualweightum === 'LB' ? Weight : Item.prd_x12actualweightum === 'KG' ? Weight * 2.20462 : null,//$35 Actual Weight Lb
      Item.prd_x12actualweightum === 'KG' ? Weight : Item.prd_x12actualweightum === 'LB' ? Weight / 2.20462 : null,//$36 Actual Weight Kg
      Item.prd_x12theoreticalweightum === 'LB' ? Item.prd_theoreticalweight : Item.prd_x12theoreticalweightum === 'KG' ? Item.prd_theoreticalweight * 2.20462 : null,//$37 Theo Weight Lb
      Item.prd_x12theoreticalweightum === 'KG' ? Item.prd_theoreticalweight : Item.prd_x12theoreticalweightum === 'LB' ? Item.prd_theoreticalweight / 2.20462 : null,//$38 Theo Weight Kg
      ['ED', 'E8', 'EM', 'E7', 'IN'].includes(Item.prd_x12gaugeum) ? Item.prd_gaugesize : ['MM', 'MB', 'M2', 'MZ', 'MY'].includes(Item.prd_x12widthum) ? Item.prd_gaugesize / 25.4 : null, //39 Gauge Inches
      ['MM', 'MB', 'M2', 'MZ', 'MY'].includes(Item.prd_x12gaugeum) ? Item.prd_gaugesize : ['ED', 'E8', 'EM', 'E7', 'IN'].includes(Item.prd_x12widthum) ? Item.prd_gaugesize * 25.4 : null, //40 Gauge MM  
      ['ED', 'MB'].includes(Item.prd_x12gaugeum) ? 'NOM' : ['EM', 'MZ'].includes(Item.prd_x12gaugeum) ? 'MIN' : null, //$41 Gauge Type
      ['FT', 'LF'].includes(Item.prd_x12coillengthum) && Item.prd_coillength > 0 ? Item.prd_coillength : ['MT', 'MR'].includes(Item.prd_x12coillengthum) && Item.prd_coillength > 0 ? Item.prd_coillength * 3.28084 : null, //42 Linear Feet
      ['MT', 'MR'].includes(Item.prd_x12coillengthum) && Item.prd_coillength > 0 ? Item.prd_coillength : ['FT', 'LF'].includes(Item.prd_x12coillengthum) && Item.prd_coillength > 0 ? Item.prd_coillength / 3.28084 : null, //43 Linear Meters
      Item.prd_x12lengthum === 'IN' && Item.prd_length > 0 ? Item.prd_length : Item.prd_x12lengthum === 'MM' && Item.prd_length > 0 ? Item.prd_length / 25.4 : null,//$44 Unit Length Inches
      Item.prd_x12lengthum === 'MM' && Item.prd_length > 0 ? Item.prd_length : Item.prd_x12lengthum === 'IN' && Item.prd_length > 0 ? Item.prd_length * 25.4 : null,//$45 Unit Length MM
      Item.prd_x12innerdiameterum === 'IN' && Item.prd_innerdiameter > 0 ? Item.prd_innerdiameter : Item.prd_x12innerdiameterum === 'MM' && Item.prd_innerdiameter > 0 ? Item.prd_innerdiameter / 25.4 : null,//$46 Inside Diameter Inches
      Item.prd_x12innerdiameterum === 'MM' && Item.prd_innerdiameter > 0 ? Item.prd_innerdiameter : Item.prd_x12innerdiameterum === 'IN' && Item.prd_innerdiameter > 0 ? Item.prd_innerdiameter * 25.4 : null,//$47 Inside Diameter MM
      Item.prd_x12outerdiameterum === 'IN' && Item.prd_outerdiameter > 0 ? Item.prd_outerdiameter : Item.prd_x12outerdiameterum === 'MM' && Item.prd_outerdiameter > 0 ? Item.prd_outerdiameter / 25.4 : null,//$48 Outside Diameter Inches
      Item.prd_x12outerdiameterum === 'MM' && Item.prd_outerdiameter > 0 ? Item.prd_outerdiameter : Item.prd_x12outerdiameterum === 'IN' && Item.prd_outerdiameter > 0 ? Item.prd_outerdiameter * 25.4 : null,//$49 Outside Diameter MM
      Pieces ? Pieces : null,//$50 Pieces
      Item.prd_opscurrentprocess,//$51 Process (AISI table 66)
      Item.prd_materialclassification,//$52 Material Classification (AISI table 67)
      materialStatus ? materialStatus : Item.prd_materialstatus,//$53 Material Status (AISI table 70)
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
      Item.prd_x12widthum === 'IN' ? Item.prd_width : Item.prd_x12widthum === 'MM' ? Item.prd_width / 25.4 : null,//$68 Width Inches
      Item.prd_x12widthum === 'MM' ? Item.prd_width : Item.prd_x12widthum === 'IN' ? Item.prd_width * 25.4 : null,//$69 Width MM
      Item.prd_partnumber, //$70 Part Number
      Item.prd_partdescription, //$71 Part Description
      Item.prd_externalordernumber ? Item.prd_externalordernumber : null, //$72
      Item.prd_coilform, //$73 Coil Form
      orginalDetail ?.[0]?.dtl_ccoil ?? null, //$74
      Pieces > 1 ? 'Y' : 'N' //$75 Multi Coil Flag
  ]);
  } catch (error) {
    console.error(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }}

// 870 Non Recorded Scrap Charge Out details:
async function insert870Scrap (pool, InterchangeControl, TransactionSet, Item, ProductionReportingHeader, flag, filePath, NonRecordedScrapIndex, ChargeInCnt, ChargeOutCnt, orginalDetail, ChargeInTag, scrapCnt, NonRecordedScrapIndex){
  try {
  await pool.query(`INSERT INTO public."870_SNF_ChgOutDtl"(
  chgoutdtl_type, chgoutdtl_key, chgoutdtl_hlo, chgoutdtl_hli, chgoutdtl_hlf, chgoutdtl_chrgintype, chgoutdtl_chrgintag, chgoutdtl_chrgoutttyp, chgoutdtl_chrgouttag, chgoutdtl_heat, chgoutdtl_mcoil, chgoutdtl_bpart, chgoutdtl_mo, chgoutdtl_mol, chgoutdtl_gc, chgoutdtl_msa, chgoutdtl_rpac, chgoutdtl_rpnc, chgoutdtl_stsdt, chgoutdtl_ststm, chgoutdtl_ststmz, chgoutdtl_prcdt, chgoutdtl_prctm, chgoutdtl_prctmz, chgoutdtl_qlydte, chgoutdtl_qlytme, chgoutdtl_qlytmz, chgoutdtl_po, chgoutdtl_rls, chgoutdtl_chgordseq, chgoutdtl_pod, chgoutdtl_pol, chgoutdtl_contractno, chgoutdtl_potypecd, chgoutdtl_awgtlb, chgoutdtl_awgtkg, chgoutdtl_twgtlb, chgoutdtl_twgtkg, chgoutdtl_gaugin, chgoutdtl_gaugmm, chgoutdtl_gaugt, chgoutdtl_lnft, chgoutdtl_lnmt, chgoutdtl_ulenin, chgoutdtl_ulenmm, chgoutdtl_idin, chgoutdtl_idmm, chgoutdtl_odin, chgoutdtl_odmm, chgoutdtl_pcs, chgoutdtl_proc, chgoutdtl_mcls, chgoutdtl_msts, chgoutdtl_fault, chgoutdtl_dmg, chgoutdtl_fcmt, chgoutdtl_qsts, chgoutdtl_csts, chgoutdtl_linid, chgoutdtl_qtyord, chgoutdtl_uom, chgoutdtl_ran, chgoutdtl_locn, chgoutdtl_crt_dat, chgoutdtl_crt_tim, chgoutdtl_crt_pgm, chgoutdtl_flow_flag, chgoutdtl_widmm, chgoutdtl_widin, chgoutdtl_mltcoil_flg)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70);`,
  [
      'O', //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      ChargeInCnt>1 ? 1 : 1, //$3 HL*O assuming that it will always be 1. 
      ChargeInCnt>1 ? 1 : 2, //$4 HL*F and for now assuming that it will be 1 HL*O.
      ChargeInCnt>1 ? ChargeOutIndex + 2 : ChargeOutCnt + NonRecordedScrapIndex + 3, //$5 HL*I and for now assuming that it will be 1 HL*O.
      null, //'RAW', //$6 Charge In Type - Raw Material
      ChargeInTag, //$7 Charge in Tag
      'SCR', //$8 Charge Out Type - Processed Waste/Retail
      null, //$9 Charge out Tag Null for scrap
      null, //$10 Heat#
      null, //$11 Mill Coil#
      null, //$12 Buyer's Part Number
      null, //$13 Mill Order Number
      null, //$14 Mill Order Line
      null, //$15 Grade Code
      null, //$16 MSA Code
      null, //$17 Responsible Party Alpha Code
      null, //$18 Responsible Party Code
      null, //$19 Status Date
      null, //$20 Status Time
      null, //$21 Status Time Zone
      null, //$22 Process Date
      null, //$23 Process Time
      null, //$24 Process Time Zone
      null,//$25 Quality Date
      null,//$26 Quality Time
      null,//$27 Quality Time Zone
      orginalDetail && orginalDetail[0]  ? orginalDetail[0].dtl_po || orginalDetail[0].dtl_cpo || Item.prd_externalordernumber : Item.prd_externalordernumber,//$28 PO Number
      null,//$29 Release Number
      null,//$30 Change Order Sequence Number
      orginalDetail && orginalDetail[0]  ? orginalDetail[0].dtl_pod || orginalDetail[0].dtl_cpod || Item.prd_externalorderdate : Item.prd_externalorderdate? Item.prd_externalorderdate : orginalDetail && orginalDetail[0]  ? orginalDetail[0].dtl_cpod : null,//$31 PO Date
      orginalDetail && orginalDetail[0]  ? orginalDetail[0].dtl_pol  && orginalDetail[0].dtl_pol !== '000' ? orginalDetail[0].dtl_pol : orginalDetail[0].dtl_cpol && orginalDetail[0].dtl_cpol !== '000' ? orginalDetail[0].dtl_cpol : Item.prd_externalorderitem : Item.prd_externalorderitem,//$32 PO Line Number
      null,//$33 Contract Number
      null,//$34 PO Type Code
      Item.nrscr_x12weightum === 'LB' ? Item.nrscr_weight : Item.nrscr_x12weightum === 'KG' ? Item.nrscr_weight * 2.20462 : null,//$35 Actual Weight Lb
      Item.nrscr_x12weightum === 'KG' ? Item.nrscr_weight : Item.nrscr_x12weightum === 'LB' ? Item.nrscr_weight / 2.20462 : null,//$36 Actual Weight Kg
      null,//$37 Theo Weight Lb
      null,//$38 Theo Weight Kg
      null,//$39 Gauge Inches
      null,//$40 Gauge MM
      null,//$41 Gauge Type
      null,//$42 Linear Feet
      null,//$43 Linear Meters
      Item.nrscr_x12measurelengthum === 'IN' ? Item.nrscr_measurelength : Item.nrscr_x12measurelengthum === 'MM' ? Item.nrscr_measurelength / 25.4 : null,//$44 Unit Length Inches
      Item.nrscr_x12measurelengthum === 'MM' ? Item.nrscr_measurelength : Item.nrscr_x12measurelengthum === 'IN' ? Item.nrscr_measurelength * 25.4 : null,//$45 Unit Length MM
      null,//$46 Inside Diameter Inches
      null,//$47 Inside Diameter MM
      null,//$48 Outside Diameter Inches
      null,//$49 Outside Diameter MM
      Item.nrscr_pieces ? Item.nrscr_pieces : null,//$50 Pieces
      null,//$51 Process (AISI table 66)
      null,//$52 Material Classification (AISI table 67)
      null,//$53 Material Status (AISI table 70)
      null,//$54 Faults (AISI table 72)
      Item.nrscr_scrapdamagecode,//$55 Damages (AISI table 73)
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
      null,//$68 Width Inches
      null,//$69 Width MM
      Item.nrscr_pieces > 1 ? 'Y' : 'N' //$70 Multi Coil Flag
  ]);
  } catch (error) {
    console.error(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }}

  module.exports = {
    LoadO870SNF
};
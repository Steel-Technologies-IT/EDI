const trimZeros = require('../../functions/trimtrailingzeros.js');
const chopOffDecimals = require('../../functions/chopoffdecimals.js');
const retrieveTableCodeDesc = require('../../functions/retrieveTableCodeDesc.js').retrieveTableCodeDesc;
const { evaluatePriority, getPrioritySettings, getAddressPriority } = require('../../functions/evaluatePriority.js');
async function SNFCreateO870(pkey, pool, CustomerID, Branch, tradingPartner) {

  let headerResults = await pool.query('SELECT * FROM public."870_SNF_Header" WHERE hdr_key = $1', [pkey]);
  let Header = headerResults.rows[0];
  let orderdtlResults = await pool.query('SELECT * FROM "870_SNF_OrderDtl" WHERE ord_key = $1', [pkey]);
  let OrderDtl = orderdtlResults.rows;
  let namesResults = await pool.query('SELECT * FROM "870_SNF_Names" WHERE name_key = $1', [pkey]);
  let Names = namesResults.rows;
  let chgindtlResults = await pool.query('SELECT * FROM "870_SNF_ChgInDtl" WHERE chgindtl_key = $1', [pkey]);
  let ChgInDtl = chgindtlResults.rows;
  let chgoutdtlResults = await pool.query('SELECT * FROM "870_SNF_ChgOutDtl" WHERE chgoutdtl_key = $1', [pkey]);
  let ChgOutDtl = chgoutdtlResults.rows;

  console.log("tradingPartner:", tradingPartner, "Branch:", Branch);

   let multiSNFS = []
   console.log("Checking for multiple SNFs for pkey:", CustomerID);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_id);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_qual);
  //
   let RoutingSNFsResults = await pool.query(
  'SELECT rte_edi_acct_id FROM public."Routing_SNFs" WHERE rte_cus_id = $1 AND TRIM(rte_isa_id) LIKE $2 AND rte_isa_qual = $3 AND rte_transactions @> ARRAY[$4::varchar]',
  [CustomerID, `${Header.hdr_ircv_id.trim()}%`, Header.hdr_ircv_qual, '870']
);
console.log(RoutingSNFsResults.rows);

  // let multipleSNFs = multipleSNFsResults.rows;
if (tradingPartner && tradingPartner.length > 0) {
      let { address_priority_1, address_priority_2, address_priority_3, address_priority_4 } = await getAddressPriority(tradingPartner, Branch, '870', pool);
      let trading_partner_info_results = await pool.query(
        'SELECT * FROM public."EDI_Accounts" WHERE edia_edi_account_id = $1',
        [tradingPartner]
      );
      let trading_partner_info = trading_partner_info_results.rows[0];

      // // Attempt to find MF and OU addresses with branch code, then without branch code
      // let trading_partner_addr_results = await pool.query(
      //   'SELECT * FROM public."EDI_Account_Address_Types" WHERE ediaat_edi_account_id = $1',
      //   [tradingPartner]
      // );
      // let mf_id = (trading_partner_addr_results.rows.find(addr => addr.ediaat_addr_typ_cde === 'MF' && addr.ediaat_branch === Branch) || {}).ediaat_addr_id || 
      //       (trading_partner_addr_results.rows.find(addr => addr.ediaat_addr_typ_cde === 'MF') || {}).ediaat_addr_id || null;
      // let ou_id = (trading_partner_addr_results.rows.find(addr => addr.ediaat_addr_typ_cde === 'OU' && addr.ediaat_branch === Branch) || {}).ediaat_addr_id || 
      //       (trading_partner_addr_results.rows.find(addr => addr.ediaat_addr_typ_cde === 'OU') || {}).ediaat_addr_id || null;
      //     console.log("mf_id:", mf_id, "ou_id:", ou_id);

      let location = (Branch != null) ? Branch.toString().slice(-2) : '';
      let { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config } = await getPrioritySettings(tradingPartner, Branch, '870', pool);
      let snf = await writeSNF(pkey, pool, Header, OrderDtl, Names, ChgInDtl, ChgOutDtl, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location);
      multiSNFS.push(snf);
} else {
  if (RoutingSNFsResults.rows.length > 0) {
   await Promise.all(RoutingSNFsResults.rows.map(async row => {
  
      let { address_priority_1, address_priority_2, address_priority_3, address_priority_4 } = await getAddressPriority(row.rte_edi_acct_id, Branch, '870', pool);
      let trading_partner_info_results = await pool.query(
        'SELECT * FROM public."EDI_Accounts" WHERE edia_edi_account_id = $1',
      [row.rte_edi_acct_id]
      );
      let trading_partner_info = trading_partner_info_results.rows[0];

      // // Attempt to find MF and OU addresses with branch code, then without branch code
      // let trading_partner_addr_results = await pool.query(
      //   'SELECT * FROM public."EDI_Account_Address_Types" WHERE ediaat_edi_account_id = $1',
      // [row.rte_edi_acct_id]
      // );
      // let mf_id = (trading_partner_addr_results.rows.find(addr => addr.ediaat_addr_typ_cde === 'MF' && addr.ediaat_branch === Branch) || {}).ediaat_addr_id || 
      //       (trading_partner_addr_results.rows.find(addr => addr.ediaat_addr_typ_cde === 'MF') || {}).ediaat_addr_id || null;
      // let ou_id = (trading_partner_addr_results.rows.find(addr => addr.ediaat_addr_typ_cde === 'OU' && addr.ediaat_branch === Branch) || {}).ediaat_addr_id || 
      //       (trading_partner_addr_results.rows.find(addr => addr.ediaat_addr_typ_cde === 'OU') || {}).ediaat_addr_id || null;
      //     console.log("mf_id:", mf_id, "ou_id:", ou_id);
          
      let location = (Branch != null) ? Branch.toString().slice(-2) : '';
      let { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config } = await getPrioritySettings(row.rte_edi_acct_id, Branch, '870', pool);
      let snf = await writeSNF(pkey, pool, Header, OrderDtl, Names, ChgInDtl, ChgOutDtl, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location);
      multiSNFS.push(snf);
  }));
  }
}
 let suffixfor870 = Header.hdr_ord_itm_cd;
 let sentflag870 = Header.hdr_sent_flag;
  return {multiSNFS,suffixfor870,sentflag870};

}

async function writeSNF(pkey, pool, Header, OrderDtl, Names, ChgInDtl, ChgOutDtl, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location) {

  let outSNF = []
  console.log("Creating O870 for pkey:", pkey);
  let BuildupFlag = Header.hdr_ord_itm_cd;
  //MARK: CT Record
  let CT = {
      "RECORD TYPE INDICATOR" : "CT",
      "Record Key (10-digit integer)": pkey,
      "GS Functional Group ID": await evaluatePriority(priority_1, priority_2, "RS", 'GS Functional Group ID', 'CT'),
      "ISA Receiver ID Qualifier": await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_qual, 'ISA Receiver ID Qualifier', 'CT'),
      "ISA Receiver ID": await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_id, 'ISA Receiver ID', 'CT'),
      "GS Receiver ID": await evaluatePriority(priority_1, priority_2, Header.hdr_grcv_id, 'GS Receiver ID', 'CT'),
      "ST Transaction Set ID": '870',
      "Application System ID": 'INVEX',
      "Production/Test Flag" : 'P',
      "Type (T=Toll; M=Margin; D=Direct Ship)" : 'T'
      }
    CT.record_code = CT["RECORD TYPE INDICATOR"];
    await outSNF.push(CT);

const mfRows1 = (address_priority_1 || []).filter(row => row.ediaat_addr_typ_cde === 'MF');
const firstMfId1 = mfRows1[0]?.ediaat_addr_id;
const firstMfqual1 = mfRows1[0]?.ediaat_id_qual;
const ouRows1 = (address_priority_1 || []).filter(row => row.ediaat_addr_typ_cde === 'OU');
const firstOuId1 = ouRows1[0]?.ediaat_addr_id;
const firstOuqual1 = ouRows1[0]?.ediaat_id_qual;
console.log("Address Priority 1:","Mf ID:", firstMfId1, "Mf Qualifier:", firstMfqual1, "Ou ID:", firstOuId1, "Ou Qualifier:", firstOuqual1);
const mfRows2 = (address_priority_2 || []).filter(row => row.ediaat_addr_typ_cde === 'MF');
const firstMfId2 = mfRows2[0]?.ediaat_addr_id;
const firstMfqual2 = mfRows2[0]?.ediaat_id_qual;
const ouRows2 = (address_priority_2 || []).filter(row => row.ediaat_addr_typ_cde === 'OU');
const firstOuId2 = ouRows2[0]?.ediaat_addr_id;
const firstOuqual2 = ouRows2[0]?.ediaat_id_qual;
console.log("Address Priority 2:","Mf ID:", firstMfId2, "Mf Qualifier:", firstMfqual2, "Ou ID:", firstOuId2, "Ou Qualifier:", firstOuqual2);
const mfRows3 = (address_priority_3 || []).filter(row => row.ediaat_addr_typ_cde === 'MF');
const firstMfId3 = mfRows3[0]?.ediaat_addr_id;
const firstMfqual3 = mfRows3[0]?.ediaat_id_qual;
const ouRows3 = (address_priority_3 || []).filter(row => row.ediaat_addr_typ_cde === 'OU');
const firstOuId3 = ouRows3[0]?.ediaat_addr_id;
const firstOuqual3 = ouRows3[0]?.ediaat_id_qual;
console.log("Address Priority 3:","Mf ID:", firstMfId3, "Mf Qualifier:", firstMfqual3, "Ou ID:", firstOuId3, "Ou Qualifier:", firstOuqual3);
const mfRows4 = (address_priority_4 || []).filter(row => row.ediaat_addr_typ_cde === 'MF');
const firstMfId4 = mfRows4[0]?.ediaat_addr_id;
const firstMfqual4 = mfRows4[0]?.ediaat_id_qual;
const ouRows4 = (address_priority_4 || []).filter(row => row.ediaat_addr_typ_cde === 'OU');
const firstOuId4 = ouRows4[0]?.ediaat_addr_id;
const firstOuqual4 = ouRows4[0]?.ediaat_id_qual;
console.log("Address Priority 4:","Mf ID:", firstMfId4, "Mf Qualifier:", firstMfqual4, "Ou ID:", firstOuId4, "Ou Qualifier:", firstOuqual4);
const mfRows5 = (Names || []).filter(row => row.name_qual === 'MF');
const firstMfId5 = mfRows5[0]?.name_id;
const firstMfqual5 = mfRows5[0]?.name_qual_id;
const ouRows5 = (Names || []).filter(row => row.name_qual === 'OU');
const firstOuId5 = ouRows5[0]?.name_id;
const firstOuqual5 = ouRows5[0]?.name_qual_id;
console.log("JSON Names:","Mf ID:", firstMfId5, "Mf Qualifier:", firstMfqual5, "Ou ID:", firstOuId5, "Ou Qualifier:", firstOuqual5);
const mfId = firstMfId1 || firstMfId2 || firstMfId3 || firstMfId4 || firstMfId5 || null;
const ouId = firstOuId1 || firstOuId2 || firstOuId3 || firstOuId4 || firstOuId5 || null;
const mfQualifier = firstMfqual1 || firstMfqual2 || firstMfqual3 || firstMfqual4 || firstMfqual5 || null;
const ouQualifier = firstOuqual1 || firstOuqual2 || firstOuqual3 || firstOuqual4 || firstOuqual5 || null;
console.log("Final MF ID:", mfId, "Final MF Qualifier:", mfQualifier, "Final OU ID:", ouId, "Final OU Qualifier:", ouQualifier);

    //MARK: 10 Record
    let tenRecord = {
      "RECORD TYPE INDICATOR": "10",
      "Date Sent" : await evaluatePriority(priority_1, priority_2, Header.hdr_dsnt_no, 'Date Sent', '10'),
      "Time Sent" : await evaluatePriority(priority_1, priority_2, Header.hdr_tsnt_no, 'Time Sent', '10'),
      "Order/Item Code": await evaluatePriority(priority_1, priority_2, Header.hdr_ord_itm_cd, 'Order/Item Code', '10'),
      "Reference ID": await evaluatePriority(priority_1, priority_2, Header.hdr_ref_id, 'Reference ID', '10'),
      "Date": await evaluatePriority(priority_1, priority_2, Header.hdr_date, 'Date', '10'),
      "Time": await evaluatePriority(priority_1, priority_2, Header.hdr_time, 'Time', '10'),
      "Production Reference ID":  await evaluatePriority(priority_1, priority_2, Header.hdr_prod_ref_id, 'Production Reference ID', '10'),
      "Process Date" : await evaluatePriority(priority_1, priority_2, Header.hdr_dsnt_no, 'Process Date', '10'),
      "Process Time" : await evaluatePriority(priority_1, priority_2, Header.hdr_tsnt_no, 'Process Time', '10'),
      "Process Time Zone" : await evaluatePriority(priority_1, priority_2, Header.hdr_ptmez_cd, 'Process Time Zone', '10'),
      "Status Change Date" : await evaluatePriority(priority_1, priority_2, Header.hdr_dsnt_no, 'Status Change Date', '10'),
      "Status Change Time" : await evaluatePriority(priority_1, priority_2, Header.hdr_tsnt_no, 'Status Change Time', '10'),
      "Status Change Time Zone" : await evaluatePriority(priority_1, priority_2, Header.hdr_stszn_cd, 'Status Change Time Zone', '10'),
      "Manufacturer ID Qualifier" : await evaluatePriority(priority_1, priority_2, mfQualifier, 'Manufacturer ID Qualifier', '10'),
      "Manufacturer ID" : await evaluatePriority(priority_1, priority_2, mfId, 'Manufacturer ID', '10'),
      "Outside Processor ID Qualifier" : await evaluatePriority(priority_1, priority_2, ouQualifier, 'Outside Processor ID Qualifier', '10'),
      "Outside Processor ID" : await evaluatePriority(priority_1, priority_2, ouId, 'Outside Processor ID', '10'),
      "Responsible Party Alpha Code": await evaluatePriority(priority_1, priority_2, null, 'Responsible Party Alpha Code', '10'), //Customer Config
      "Responsible Party Number Code": await evaluatePriority(priority_1, priority_2, null, 'Responsible Party Number Code', '10') //Customer Config
    }
    tenRecord.record_code = tenRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(tenRecord);


//Overriding Addresses
let addressList = [];
address_priority_1 ? await Promise.all(address_priority_1.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde)) {
        addressList.push(Name.ediaat_addr_typ_cde);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID Qualifier": Name.ediaat_id_qual,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd

      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);
    }
    })) : null;

    address_priority_2 ? await Promise.all(address_priority_2.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde)) {
        addressList.push(Name.ediaat_addr_typ_cde);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID Qualifier": Name.ediaat_id_qual,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);
    }
    })) : null

    address_priority_3 ? await Promise.all(address_priority_3.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde)) {
        addressList.push(Name.ediaat_addr_typ_cde);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID Qualifier": Name.ediaat_id_qual,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);
    }
    })) : null;

    address_priority_4 ? await Promise.all(address_priority_4.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde)) {
        addressList.push(Name.ediaat_addr_typ_cde);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID Qualifier": Name.ediaat_id_qual,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);
    }
    })) : null;

//JSON Addresses
    await Promise.all(Names.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.name_qual)) {
        addressList.push(Name.name_qual);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.name_qual,
        "Address ID Qualifier": Name.name_qual_id,
        "Address ID": Name.name_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.name_state,
        "Postal Code": Name.name_zpcd,
        "Customer Country Code": Name.name_ctry_cd 
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);}
    }));

let overallindex = 0;
const uniqueHLOs = [...new Set(OrderDtl.map(d => d.ord_hlo))];    
for (const hlo of uniqueHLOs) {

 const Detail30 = OrderDtl.find(d => d.ord_hlo === hlo)
  let thirtyRecord = {
    "RECORD TYPE INDICATOR": "30",
    "Order HL ID": Detail30.ord_hlo,
    "HL Level Code": 'O',
    "HL Child Code": 1,
    "Purchase Order Number": await evaluatePriority(priority_1, priority_2, Detail30.ord_po, 'Purchase Order Number', '30'),
    "Release Number": await evaluatePriority(priority_1, priority_2, Detail30.ord_rls, 'Release Number', '30'),
    "Change Order Sequence Number": await evaluatePriority(priority_1, priority_2, Detail30.ord_poc, 'Change Order Sequence Number', '30'),
    "Purchase Order Date": await evaluatePriority(priority_1, priority_2, Detail30.ord_pod, 'Purchase Order Date', '30'),
    "Purchase Order Line Number": await evaluatePriority(priority_1, priority_2, Detail30.ord_pol, 'Purchase Order Line Number', '30'),
    "Ultimate Customer Order Number": await evaluatePriority(priority_1, priority_2, Detail30.ord_ult_po, 'Ultimate Customer Order Number', '30'),//Needs to be defined
    "Ultimate Customer Release Number": await evaluatePriority(priority_1, priority_2, Detail30.ord_ult_rls, 'Ultimate Customer Release Number', '30'),//Needs to be defined
    "Ultimate Customer Part Number": await evaluatePriority(priority_1, priority_2, Detail30.ord_ult_cpart, 'Ultimate Customer Part Number', '30'),//Needs to be defined
    "Ultimate Customer Item Number": await evaluatePriority(priority_1, priority_2, null, 'Ultimate Customer Item Number', '30'),//Needs to be defined
    "Material Specification Application (MSA#)": await evaluatePriority(priority_1, priority_2, Detail30.ord_msa, 'Material Specification Application (MSA#)', '30'),//Needs to be defined
    "Cust PO No Shop": await evaluatePriority(priority_1, priority_2, Detail30.ord_cust_po, 'Cust PO No Shop', '30'),//Needs to be defined
    "Cust Release No Shop": await evaluatePriority(priority_1, priority_2, Detail30.ord_cust_rls, 'Cust Release No Shop', '30'),//Needs to be defined
    "License Plate Number": await evaluatePriority(priority_1, priority_2, (ChgInDtl.length > 0 ? ChgInDtl[0].chgindtl_chrgintag : null), 'License Plate Number', '30'), //Needs to be defined

  };
  thirtyRecord.record_code = thirtyRecord["RECORD TYPE INDICATOR"];
  await outSNF.push(thirtyRecord);
  overallindex = overallindex + 1;
  // 40 Records for this hl1

  let Detail40s;
  if (BuildupFlag === 'B') { 
   // Buildup Logic
    Detail40s = ChgOutDtl.filter(out => out.chgoutdtl_hlo === hlo);
    //console.log("Buildup Detail40s:", Detail40s);
    for (const Detail40 of Detail40s) {
      let fortyRecord = {
        "RECORD TYPE INDICATOR": "40",
        "Item HL ID": overallindex + 1,
        "HL Parent ID": Detail40.chgoutdtl_hlo,
        "HL Level Code": 'F',
        "HL Child Code": 1,
        "Charge-In Tag Type" : await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_chrgoutttyp, 'Charge-In Tag Type', '40'),
        "Charge-In Tag ID" : await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_chrgouttag, 'Charge-In Tag ID', '40'),
        "Status (Outside Processor) Date": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_crt_dat, 'Status (Outside Processor) Date', '40'),
        "Status (Outside Processor) Time": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_crt_tim, 'Status (Outside Processor) Time', '40'),
        "Process Date": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_crt_dat, 'Process Date', '40'),
        "Process Time": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_crt_tim, 'Process Time', '40'),
        "Heat Number": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_heat, 'Heat Number', '40'),
        "Mill Coil Number": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_mcoil, 'Mill Coil Number', '40'),
        "Vendor (Mill) Order Number": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_mo, 'Vendor (Mill) Order Number', '40'),
        "Vendor (Mill) Item/Line Number": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_mol, 'Vendor (Mill) Item/Line Number', '40'),
        "Part Number": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_bpart, 'Part Number', '40'),
        "Grade Code": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_gc, 'Grade Code', '40'),
        "Part Number (from Shop Order)": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_spart, 'Part Number (from Shop Order)', '40'), //Needs to be defined
        "Part Description (from Shop Order)": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_spartd, 'Part Description (from Shop Order)', '40'), //Needs to be defined
        "Customer PO# (from Shop Order)": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_scpo, 'Customer PO# (from Shop Order)', '40'), //Needs to be defined
        "Special Data 1": await evaluatePriority(priority_1, priority_2, null, 'Special Data 1', '40'),//Needs to be defined
        "Special Data 2": await evaluatePriority(priority_1, priority_2, null, 'Special Data 2', '40'),//Needs to be defined
        "Override Part Number": await evaluatePriority(priority_1, priority_2, null, 'Override Part Number', '40'),//Needs to be defined
        "Override Customer PO#": await evaluatePriority(priority_1, priority_2, null, 'Override Customer PO#', '40'),//Needs to be defined
        "Override Supplier ID": await evaluatePriority(priority_1, priority_2, null, 'Override Supplier ID', '40'),//Needs to be defined
        "Consumed Coil": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_ccoil, 'Consumed Coil', '40'),//Needs to be defined
        "RTS Blanking part#": await evaluatePriority(priority_1, priority_2, null, 'RTS Blanking part#', '40'),//Needs to be defined
        "Tag Serial Build Layout": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_chrgouttag, 'Tag Serial Build Layout', '40'),//Needs to be defined
        "License Plate Number": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_chrgouttag, 'License Plate Number', '40'),//Needs to be defined
        "Multi-Coil Flag": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_mltcoil_flg, 'Multi-Coil Flag', '40'),//Needs to be defined
        "Previous RTS Tag": await evaluatePriority(priority_1, priority_2, null, 'Previous RTS Tag', '40'),//Needs to be defined
        "Customer Tag#": await evaluatePriority(priority_1, priority_2, null, 'Customer Tag#', '40'),//Needs to be defined
        "Commodity Form#": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_coil_frm, 'Commodity Form#', '40')//Needs to be defined
   };
    fortyRecord.record_code = fortyRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fortyRecord);
    overallindex = overallindex + 1;

     let fortytwoRecord = {
        "RECORD TYPE INDICATOR": "42",
        "Process Performed (AISI Table 66)": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_proc, 'Process Performed (AISI Table 66)', '42'),
        "Process Performed Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('66', Detail40.chgoutdtl_proc), 'Process Performed Description', '42'),
        "Material Classification (AISI Table 67)": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_mcls, 'Material Classification (AISI Table 67)', '42'),
        "Material Classification Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('67', Detail40.chgoutdtl_mcls), 'Material Classification Description', '42'),
        "Material Status (AISI Table 70)": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_msts, 'Material Status (AISI Table 70)', '42'),
        "Material Status Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('70', Detail40.chgoutdtl_msts), 'Material Status Description', '42'),
        "Reason/Fault Code (AISI Table 72)": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_fault, 'Reason/Fault Code (AISI Table 72)', '42'),
        "Reason/Fault Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('72', Detail40.chgoutdtl_fault), 'Reason/Fault Description', '42'),
        "Damage/Scrap Code (AISI Table 73)": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_dmg, 'Damage/Scrap Code (AISI Table 73)', '42'),
        "Damage/Scrap Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('73', Detail40.chgoutdtl_dmg), 'Damage/Scrap Description', '42'),
        "Quality Status Code (AISI Table 68)": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_qsts, 'Quality Status Code (AISI Table 68)', '42'),
        "Quality Status Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('68', Detail40.chgoutdtl_qsts), 'Quality Status Description', '42'),
        "Commercial Status Code (AISI Table 69)": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_csts, 'Commercial Status Code (AISI Table 69)', '42'),
        "Commercial Status Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('69', Detail40.chgoutdtl_csts), 'Commercial Status Description', '42')
   };
    fortytwoRecord.record_code = fortytwoRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fortytwoRecord);

     let fortyfiveRecord = {
        "RECORD TYPE INDICATOR": "45",
        "Actual Weight (LB)": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_awgtlb, 'Actual Weight (LB)', '45'),
        "Actual Weight (KG)": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_awgtkg, 'Actual Weight (KG)', '45'),
        "Theoretical Weight (LB)": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_twgtlb, 'Theoretical Weight (LB)', '45'),
        "Theoretical Weight (KG)": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_twgtkg, 'Theoretical Weight (KG)', '45'),
        "Gauge (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgoutdtl_gaugin), 'Gauge (IN)', '45'),
        "Gauge (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgoutdtl_gaugmm), 'Gauge (MM)', '45'),
        "Gauge Type (NOM/MIN/ACT)": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_gaugt, 'Gauge Type (NOM/MIN/ACT)', '45'),
        "Width (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgoutdtl_widin), 'Width (IN)', '45'),
        "Width (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgoutdtl_widmm), 'Width (MM)', '45'),
        "Linear Feet": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_lnft, 'Linear Feet', '45'),
        "Linear Meters": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_lnmt, 'Linear Meters', '45'),
        "Unit Length (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgoutdtl_ulenin), 'Unit Length (IN)', '45'),
        "Unit Length (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgoutdtl_ulenmm), 'Unit Length (MM)', '45'),
        "Inside Diameter (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgoutdtl_idin), 'Inside Diameter (IN)', '45'),
        "Inside Diameter (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgoutdtl_idmm), 'Inside Diameter (MM)', '45'),
        "Outside Diameter (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgoutdtl_odin), 'Outside Diameter (IN)', '45'),
        "Outside Diameter (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgoutdtl_odmm), 'Outside Diameter (MM)', '45'),
        "Pieces": await evaluatePriority(priority_1, priority_2, Detail40.chgoutdtl_pcs, 'Pieces', '45'),
        "Original I856 Gauge (IN)": await evaluatePriority(priority_1, priority_2, null, 'Original I856 Gauge (IN)', '45'), //Needs to be defined
        "Original I856 Gauge (MM)": await evaluatePriority(priority_1, priority_2, null, 'Original I856 Gauge (MM)', '45'), //Needs to be defined
        "Original I856 Gauge Type": await evaluatePriority(priority_1, priority_2, null, 'Original I856 Gauge Type', '45')
   };
    fortyfiveRecord.record_code = fortyfiveRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fortyfiveRecord);

    // Buildup Logic
    let matching50s = ChgInDtl.filter(In =>
       In.chgindtl_hli === Detail40.chgoutdtl_hlf //&& In.chgindtl_chrgintag === Detail40.chgoutdtl_chrgintag
    ).sort((a, b) => String(a.chgindtl_chrgintag).localeCompare(String(b.chgindtl_chrgintag)));
 
    for (const Detail50 of matching50s) {
      let fiftyRecord = {
        "RECORD TYPE INDICATOR": "50",
        "Component HL ID": overallindex + 1,
        "HL Parent ID": Detail50.chgindtl_hli,
        "HL Level Code": 'I',
        "HL Child Code": 0,
        "Charge-Out Tag Type" : await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_chrgintype, 'Charge-Out Tag Type', '50'),
        "Charge-Out Tag ID" : await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_chrgintag, 'Charge-Out Tag ID', '50'),
        "Status (Outside Processor) Date": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_crt_dat, 'Status (Outside Processor) Date', '50'),
        "Status (Outside Processor) Time": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_crt_tim, 'Status (Outside Processor) Time', '50'),
        "Process Date": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_crt_dat, 'Process Date', '50'),
        "Process Time": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_crt_tim, 'Process Time', '50'), 
        "Heat Number": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_heat, 'Heat Number', '50'),
        "Mill Coil Number": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_mcoil, 'Mill Coil Number', '50'),
        "Vendor (Mill) Order Number": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_mo, 'Vendor (Mill) Order Number', '50'),
        "Vendor (Mill) Item/Line Number": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_mol, 'Vendor (Mill) Item/Line Number', '50'),
        "Part Number": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_bpart, 'Part Number', '50'),
        "Grade Code": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_gc, 'Grade Code', '50'),
        "Shop Order Number": await evaluatePriority(priority_1, priority_2, null, 'Shop Order Number', '50'), //Needs to be defined
        "Part Number (from Shop Order)": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_spart, 'Part Number (from Shop Order)', '50'), //Needs to be defined
        "Part Description (from Shop Order)": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_spartd, 'Part Description (from Shop Order)', '50'), //Needs to be defined
        "Customer PO# (from Shop Order)": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_scpo, 'Customer PO# (from Shop Order)', '50'), //Needs to be defined
        "Special Data 1": await evaluatePriority(priority_1, priority_2, null, 'Special Data 1', '50'),//Needs to be defined
        "Special Data 2": await evaluatePriority(priority_1, priority_2, null, 'Special Data 2', '50'),//Needs to be defined
        "Override Part Number": await evaluatePriority(priority_1, priority_2, null, 'Override Part Number', '50'),//Needs to be defined
        "Override Customer PO#": await evaluatePriority(priority_1, priority_2, null, 'Override Customer PO#', '50'),//Needs to be defined
        "Override Supplier ID": await evaluatePriority(priority_1, priority_2, null, 'Override Supplier ID', '50'),//Needs to be defined
        "Actual weight LB": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_awgtlb, 'Actual weight LB', '50'),
        "Consumed Coil": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_coil_frm, 'Consumed Coil', '50'),//Needs to be defined
        "RTS Blanking part#": await evaluatePriority(priority_1, priority_2, null, 'RTS Blanking part#', '50'),//Needs to be defined
        "Tag Serial Build Layout": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_chrgintag, 'Tag Serial Build Layout', '50'),//Needs to be defined
        "Multi-Coil Flag": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_mltcoil_flg, 'Multi-Coil Flag', '50'),//Needs to be defined
        "Previous RTS Tag": await evaluatePriority(priority_1, priority_2, null, 'Previous RTS Tag', '50'),//Needs to be defined
        "License Plate Number": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_chrgintag, 'License Plate Number', '50'),//Needs to be defined
        "Customer Tag#": await evaluatePriority(priority_1, priority_2, null, 'Customer Tag#', '50'),//Needs to be defined
        "Commodity Form#": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_coil_frm, 'Commodity Form#', '50')//Needs to be defined
      };
      fiftyRecord.record_code = fiftyRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fiftyRecord);
      overallindex = overallindex + 1;

       let fiftytwoRecord = {
        "RECORD TYPE INDICATOR": "52",
        "Process Performed (AISI Table 66)": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_proc, 'Process Performed (AISI Table 66)', '52'),
        "Process Performed Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('66', Detail50.chgindtl_proc), 'Process Performed Description', '52'),
        "Material Classification (AISI Table 67)": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_mcls, 'Material Classification (AISI Table 67)', '52'),
        "Material Classification Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('67', Detail50.chgindtl_mcls), 'Material Classification Description', '52'),
        "Material Status (AISI Table 70)": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_msts, 'Material Status (AISI Table 70)', '52'),
        "Material Status Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('70', Detail50.chgindtl_msts), 'Material Status Description', '52'),
        "Reason/Fault Code (AISI Table 72)": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_fault, 'Reason/Fault Code (AISI Table 72)', '52'),
        "Reason/Fault Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('72', Detail50.chgindtl_fault), 'Reason/Fault Description', '52'),
        "Damage/Scrap Code (AISI Table 73)": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_dmg, 'Damage/Scrap Code (AISI Table 73)', '52'),
        "Damage/Scrap Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('73', Detail50.chgindtl_dmg), 'Damage/Scrap Description', '52'),
        "Quality Status Code (AISI Table 68)": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_qsts, 'Quality Status Code (AISI Table 68)', '52'),
        "Quality Status Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('68', Detail50.chgindtl_qsts), 'Quality Status Description', '52'),
        "Commercial Status Code (AISI Table 69)": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_csts, 'Commercial Status Code (AISI Table 69)', '52'),
        "Commercial Status Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('69', Detail50.chgindtl_csts), 'Commercial Status Description', '52')
   };
    fiftytwoRecord.record_code = fiftytwoRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fiftytwoRecord);

     let fiftyfiveRecord = {
        "RECORD TYPE INDICATOR": "55",
        "Actual Weight (LB)": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_awgtlb, 'Actual Weight (LB)', '55'),
        "Actual Weight (KG)": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_awgtkg, 'Actual Weight (KG)', '55'),
        "Theoretical Weight (LB)": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_twgtlb, 'Theoretical Weight (LB)', '55'),
        "Theoretical Weight (KG)": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_twgtkg, 'Theoretical Weight (KG)', '55'),
        "Gauge (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgindtl_gaugin), 'Gauge (IN)', '55'),
        "Gauge (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgindtl_gaugmm), 'Gauge (MM)', '55'),
        "Gauge Type (NOM/MIN/ACT)": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_gaugt, 'Gauge Type (NOM/MIN/ACT)', '55'),
        "Width (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgindtl_widin), 'Width (IN)', '55'),
        "Width (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgindtl_widmm), 'Width (MM)', '55'),
        "Linear Feet": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_lnft, 'Linear Feet', '55'),
        "Linear Meters": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_lnmt, 'Linear Meters', '55'),
        "Unit Length (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgindtl_ulenin), 'Unit Length (IN)', '55'),
        "Unit Length (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgindtl_ulenmm), 'Unit Length (MM)', '55'),
        "Inside Diameter (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgindtl_idin), 'Inside Diameter (IN)', '55'),
        "Inside Diameter (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgindtl_idmm), 'Inside Diameter (MM)', '55'),
        "Outside Diameter (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgindtl_odin), 'Outside Diameter (IN)', '55'),
        "Outside Diameter (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgindtl_odmm), 'Outside Diameter (MM)', '55'),
        "Pieces": await evaluatePriority(priority_1, priority_2, Detail50.chgindtl_pcs, 'Pieces', '55'),
        "Original I856 Gauge (IN)": await evaluatePriority(priority_1, priority_2, null, 'Original I856 Gauge (IN)', '55'), //Needs to be defined
        "Original I856 Gauge (MM)": await evaluatePriority(priority_1, priority_2, null, 'Original I856 Gauge (MM)', '55'), //Needs to be defined
        "Original I856 Gauge Type": await evaluatePriority(priority_1, priority_2, null, 'Original I856 Gauge Type', '55')
   };
    fiftyfiveRecord.record_code = fiftyfiveRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fiftyfiveRecord);
    }
}
  } else {

    // Non-Buildup Logic
  Detail40s = ChgInDtl.filter(d => d.chgindtl_hlo === hlo);
  for (const Detail40 of Detail40s) {
    let fortyRecord = {
        "RECORD TYPE INDICATOR": "40",
        "Item HL ID": Detail40.chgindtl_hli,
        "HL Parent ID": Detail40.chgindtl_hlo,
        "HL Level Code": 'I',
        "HL Child Code": 1,
        "Charge-In Tag Type" : await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_chrgintype, 'Charge-In Tag Type', '40'),
        "Charge-In Tag ID" : await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_chrgintag, 'Charge-In Tag ID', '40'),
        "Heat Number": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_heat, 'Heat Number', '40'),
        "Mill Coil Number": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_mcoil, 'Mill Coil Number', '40'),
        "Vendor (Mill) Order Number": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_mo, 'Vendor (Mill) Order Number', '40'),
        "Vendor (Mill) Item/Line Number": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_mol, 'Vendor (Mill) Item/Line Number', '40'),
        "Part Number": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_bpart, 'Part Number', '40'),
        "Grade Code": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_gc, 'Grade Code', '40'),
        "Part Number (from Shop Order)": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_spart, 'Part Number (from Shop Order)', '40'), //Needs to be defined
        "Part Description (from Shop Order)": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_spartd, 'Part Description (from Shop Order)', '40'), //Needs to be defined
        "Customer PO# (from Shop Order)": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_scpo, 'Customer PO# (from Shop Order)', '40'), //Needs to be defined
        "Special Data 1": await evaluatePriority(priority_1, priority_2, null, 'Special Data 1', '40'),//Needs to be defined
        "Special Data 2": await evaluatePriority(priority_1, priority_2, null, 'Special Data 2', '40'),//Needs to be defined
        "Override Part Number": await evaluatePriority(priority_1, priority_2, null, 'Override Part Number', '40'),//Needs to be defined
        "Override Customer PO#": await evaluatePriority(priority_1, priority_2, null, 'Override Customer PO#', '40'),//Needs to be defined
        "Override Supplier ID": await evaluatePriority(priority_1, priority_2, null, 'Override Supplier ID', '40'),//Needs to be defined
        "Consumed Coil": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_ccoil, 'Consumed Coil', '40'),//Needs to be defined
        "RTS Blanking part#": await evaluatePriority(priority_1, priority_2, null, 'RTS Blanking part#', '40'),//Needs to be defined
        "Tag Serial Build Layout": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_chrgintag, 'Tag Serial Build Layout', '40'),//Needs to be defined
        "License Plate Number": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_chrgintag, 'License Plate Number', '40'),//Needs to be defined
        "Multi-Coil Flag": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_mltcoil_flg, 'Multi-Coil Flag', '40'),//Needs to be defined
        "Previous RTS Tag": await evaluatePriority(priority_1, priority_2, null, 'Previous RTS Tag', '40'),//Needs to be defined
        "Customer Tag#": await evaluatePriority(priority_1, priority_2, null, 'Customer Tag#', '40'),//Needs to be defined
        "Commodity Form#": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_coil_frm, 'Commodity Form#', '40')//Needs to be defined
   };
    fortyRecord.record_code = fortyRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fortyRecord);
    overallindex = overallindex + 1;

     let fortytwoRecord = {
        "RECORD TYPE INDICATOR": "42",
        "Process Performed (AISI Table 66)": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_proc, 'Process Performed (AISI Table 66)', '42'),
        "Process Performed Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('66', Detail40.chgindtl_proc), 'Process Performed Description', '42'),
        "Material Classification (AISI Table 67)": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_mcls, 'Material Classification (AISI Table 67)', '42'),
        "Material Classification Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('67', Detail40.chgindtl_mcls), 'Material Classification Description', '42'),
        "Material Status (AISI Table 70)": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_msts, 'Material Status (AISI Table 70)', '42'),
        "Material Status Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('70', Detail40.chgindtl_msts), 'Material Status Description', '42'),
        "Reason/Fault Code (AISI Table 72)": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_fault, 'Reason/Fault Code (AISI Table 72)', '42'),
        "Reason/Fault Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('72', Detail40.chgindtl_fault), 'Reason/Fault Description', '42'),
        "Damage/Scrap Code (AISI Table 73)": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_dmg, 'Damage/Scrap Code (AISI Table 73)', '42'),
        "Damage/Scrap Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('73', Detail40.chgindtl_dmg), 'Damage/Scrap Description', '42'),
        "Quality Status Code (AISI Table 68)": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_qsts, 'Quality Status Code (AISI Table 68)', '42'),
        "Quality Status Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('68', Detail40.chgindtl_qsts), 'Quality Status Description', '42'),
        "Commercial Status Code (AISI Table 69)": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_csts, 'Commercial Status Code (AISI Table 69)', '42'),
        "Commercial Status Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('69', Detail40.chgindtl_csts), 'Commercial Status Description', '42')
   };
    fortytwoRecord.record_code = fortytwoRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fortytwoRecord);

     let fortyfiveRecord = {
        "RECORD TYPE INDICATOR": "45",
        "Actual Weight (LB)": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_awgtlb, 'Actual Weight (LB)', '45'),
        "Actual Weight (KG)": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_awgtkg, 'Actual Weight (KG)', '45'),
        "Theoretical Weight (LB)": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_twgtlb, 'Theoretical Weight (LB)', '45'),
        "Theoretical Weight (KG)": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_twgtkg, 'Theoretical Weight (KG)', '45'),
        "Gauge (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgindtl_gaugin), 'Gauge (IN)', '45'),
        "Gauge (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgindtl_gaugmm), 'Gauge (MM)', '45'),
        "Gauge Type (NOM/MIN/ACT)": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_gaugt, 'Gauge Type (NOM/MIN/ACT)', '45'),
        "Width (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgindtl_widin), 'Width (IN)', '45'),
        "Width (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgindtl_widmm), 'Width (MM)', '45'),
        "Linear Feet": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_lnft, 'Linear Feet', '45'),
        "Linear Meters": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_lnmt, 'Linear Meters', '45'),
        "Unit Length (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgindtl_ulenin), 'Unit Length (IN)', '45'),
        "Unit Length (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgindtl_ulenmm), 'Unit Length (MM)', '45'),
        "Inside Diameter (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgindtl_idin), 'Inside Diameter (IN)', '45'),
        "Inside Diameter (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgindtl_idmm), 'Inside Diameter (MM)', '45'),
        "Outside Diameter (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgindtl_odin), 'Outside Diameter (IN)', '45'),
        "Outside Diameter (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail40.chgindtl_odmm), 'Outside Diameter (MM)', '45'),
        "Pieces": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_pcs, 'Pieces', '45'),
        "Original I856 Gauge (IN)": await evaluatePriority(priority_1, priority_2, null, 'Original I856 Gauge (IN)', '45'), //Needs to be defined
        "Original I856 Gauge (MM)": await evaluatePriority(priority_1, priority_2, null, 'Original I856 Gauge (MM)', '45'), //Needs to be defined
        "Original I856 Gauge Type": await evaluatePriority(priority_1, priority_2, null, 'Original I856 Gauge Type', '45') //Needs to be defined
   };
    fortyfiveRecord.record_code = fortyfiveRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fortyfiveRecord);

    let matching50s = ChgOutDtl.filter(out =>
      out.chgoutdtl_hlo === Detail40.chgindtl_hlo && out.chgoutdtl_hli === Detail40.chgindtl_hli && out.chgoutdtl_chrgintag === Detail40.chgindtl_chrgintag
    ).sort((a, b) => a.chgoutdtl_hlf - b.chgoutdtl_hlf);
 
    for (const Detail50 of matching50s) {
      let fiftyRecord = {
        "RECORD TYPE INDICATOR": "50",
        "Component HL ID": Detail50.chgoutdtl_hlf,
        "HL Parent ID": Detail50.chgoutdtl_hli,
        "HL Level Code": 'F',
        "HL Child Code": 0,
        "Charge-Out Tag Type" : await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_chrgoutttyp, 'Charge-Out Tag Type', '50'),
        "Charge-Out Tag ID" : await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_chrgouttag, 'Charge-Out Tag ID', '50'),
        "Status (Outside Processor) Date": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_crt_dat, 'Status (Outside Processor) Date', '50'),
        "Status (Outside Processor) Time": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_crt_tim, 'Status (Outside Processor) Time', '50'),
        "Process Date": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_crt_dat, 'Process Date', '50'),
        "Process Time": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_crt_tim, 'Process Time', '50'), 
        "Heat Number": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_heat, 'Heat Number', '50'),
        "Mill Coil Number": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_mcoil, 'Mill Coil Number', '50'),
        "Vendor (Mill) Order Number": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_mo, 'Vendor (Mill) Order Number', '50'),
        "Vendor (Mill) Item/Line Number": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_mol, 'Vendor (Mill) Item/Line Number', '50'),
        "Part Number": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_bpart, 'Part Number', '50'),
        "Grade Code": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_gc, 'Grade Code', '50'),
        "Shop Order Number": await evaluatePriority(priority_1, priority_2, null, 'Shop Order Number', '50'), //Needs to be defined
        "Part Number (from Shop Order)": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_spart, 'Part Number (from Shop Order)', '50'), //Needs to be defined
        "Part Description (from Shop Order)": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_spartd, 'Part Description (from Shop Order)', '50'), //Needs to be defined
        "Customer PO# (from Shop Order)": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_scpo, 'Customer PO# (from Shop Order)', '50'), //Needs to be defined
        "Special Data 1": await evaluatePriority(priority_1, priority_2, null, 'Special Data 1', '50'),//Needs to be defined
        "Special Data 2": await evaluatePriority(priority_1, priority_2, null, 'Special Data 2', '50'),//Needs to be defined
        "Override Part Number": await evaluatePriority(priority_1, priority_2, null, 'Override Part Number', '50'),//Needs to be defined
        "Override Customer PO#": await evaluatePriority(priority_1, priority_2, null, 'Override Customer PO#', '50'),//Needs to be defined
        "Override Supplier ID": await evaluatePriority(priority_1, priority_2, null, 'Override Supplier ID', '50'),//Needs to be defined
        "Actual weight LB": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_awgtlb, 'Actual weight LB', '50'),
        "Consumed Coil": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_ccoil, 'Consumed Coil', '50'),//Needs to be defined
        "RTS Blanking part#": await evaluatePriority(priority_1, priority_2, null, 'RTS Blanking part#', '50'),//Needs to be defined
        "Tag Serial Build Layout": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_chrgoutttyp !== 'SCR' ? Detail50.chgoutdtl_chrgouttag : null, 'Tag Serial Build Layout', '50'),//Needs to be defined
        "Multi-Coil Flag": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_mltcoil_flg, 'Multi-Coil Flag', '50'),//Needs to be defined
        "Previous RTS Tag": await evaluatePriority(priority_1, priority_2, null, 'Previous RTS Tag', '50'),//Needs to be defined
        "License Plate Number": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_chrgoutttyp !== 'SCR' ? Detail50.chgoutdtl_chrgouttag : null, 'License Plate Number', '50'),//Needs to be defined
        "Customer Tag#": await evaluatePriority(priority_1, priority_2, null, 'Customer Tag#', '50'),//Needs to be defined
        "Commodity Form#": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_coil_frm, 'Commodity Form#', '50')//Needs to be defined
      };
      fiftyRecord.record_code = fiftyRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fiftyRecord);
      overallindex = overallindex + 1;

       let fiftytwoRecord = {
        "RECORD TYPE INDICATOR": "52",
        "Process Performed (AISI Table 66)": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_proc, 'Process Performed (AISI Table 66)', '52'),
        "Process Performed Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('66', Detail50.chgoutdtl_proc), 'Process Performed Description', '52'),
        "Material Classification (AISI Table 67)": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_mcls, 'Material Classification (AISI Table 67)', '52'),
        "Material Classification Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('67', Detail50.chgoutdtl_mcls), 'Material Classification Description', '52'),
        "Material Status (AISI Table 70)": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_msts, 'Material Status (AISI Table 70)', '52'),
        "Material Status Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('70', Detail50.chgoutdtl_msts), 'Material Status Description', '52'),
        "Reason/Fault Code (AISI Table 72)": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_fault, 'Reason/Fault Code (AISI Table 72)', '52'),
        "Reason/Fault Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('72', Detail50.chgoutdtl_fault), 'Reason/Fault Description', '52'),
        "Damage/Scrap Code (AISI Table 73)": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_dmg, 'Damage/Scrap Code (AISI Table 73)', '52'),
        "Damage/Scrap Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('73', Detail50.chgoutdtl_dmg), 'Damage/Scrap Description', '52'),
        "Quality Status Code (AISI Table 68)": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_qsts, 'Quality Status Code (AISI Table 68)', '52'),
        "Quality Status Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('68', Detail50.chgoutdtl_qsts), 'Quality Status Description', '52'),
        "Commercial Status Code (AISI Table 69)": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_csts, 'Commercial Status Code (AISI Table 69)', '52'),
        "Commercial Status Description": await evaluatePriority(priority_1, priority_2, await retrieveTableCodeDesc('69', Detail50.chgoutdtl_csts), 'Commercial Status Description', '52')
   };
    fiftytwoRecord.record_code = fiftytwoRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fiftytwoRecord);

     let fiftyfiveRecord = {
        "RECORD TYPE INDICATOR": "55",
        "Actual Weight (LB)": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_awgtlb, 'Actual Weight (LB)', '55'),
        "Actual Weight (KG)": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_awgtkg, 'Actual Weight (KG)', '55'),
        "Theoretical Weight (LB)": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_twgtlb, 'Theoretical Weight (LB)', '55'),
        "Theoretical Weight (KG)": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_twgtkg, 'Theoretical Weight (KG)', '55'),
        "Gauge (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgoutdtl_gaugin), 'Gauge (IN)', '55'),
        "Gauge (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgoutdtl_gaugmm), 'Gauge (MM)', '55'),
        "Gauge Type (NOM/MIN/ACT)": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_gaugt, 'Gauge Type (NOM/MIN/ACT)', '55'),
        "Width (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgoutdtl_widin), 'Width (IN)', '55'),
        "Width (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgoutdtl_widmm), 'Width (MM)', '55'),
        "Linear Feet": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_lnft, 'Linear Feet', '55'),
        "Linear Meters": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_lnmt, 'Linear Meters', '55'),
        "Unit Length (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgoutdtl_ulenin), 'Unit Length (IN)', '55'),
        "Unit Length (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgoutdtl_ulenmm), 'Unit Length (MM)', '55'),
        "Inside Diameter (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgoutdtl_idin), 'Inside Diameter (IN)', '55'),
        "Inside Diameter (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgoutdtl_idmm), 'Inside Diameter (MM)', '55'),
        "Outside Diameter (IN)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgoutdtl_odin), 'Outside Diameter (IN)', '55'),
        "Outside Diameter (MM)": await evaluatePriority(priority_1, priority_2, await trimZeros(Detail50.chgoutdtl_odmm), 'Outside Diameter (MM)', '55'),
        "Pieces": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_pcs, 'Pieces', '55'),
        "Original I856 Gauge (IN)": await evaluatePriority(priority_1, priority_2, null, 'Original I856 Gauge (IN)', '55'), //Needs to be defined
        "Original I856 Gauge (MM)": await evaluatePriority(priority_1, priority_2, null, 'Original I856 Gauge (MM)', '55'), //Needs to be defined
        "Original I856 Gauge Type": await evaluatePriority(priority_1, priority_2, null, 'Original I856 Gauge Type', '55')
   };
    fiftyfiveRecord.record_code = fiftyfiveRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fiftyfiveRecord);

    }
}

 
}
}


//MARK: 90 Record
  let ninetyRecord = {
    "RECORD TYPE INDICATOR": "90",
    "Number of Line Items": overallindex
  }
  ninetyRecord.record_code = ninetyRecord["RECORD TYPE INDICATOR"];
  outSNF.push(ninetyRecord);

  return outSNF
}

module.exports = {
  SNFCreateO870
}
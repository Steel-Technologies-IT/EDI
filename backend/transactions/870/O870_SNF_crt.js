const trimZeros = require('../../functions/trimtrailingzeros.js');
const chopOffDecimals = require('../../functions/chopoffdecimals.js');
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
  let chginmeasureResults = await pool.query('SELECT * FROM "870_SNF_ChgInMeasure" WHERE chginmsr_key = $1', [pkey]);
  let ChgInMeasure = chginmeasureResults.rows;
  let chginpidResults = await pool.query('SELECT * FROM "870_SNF_ChgInPID" WHERE chginpid_key = $1', [pkey]);
  let ChgInPID = chginpidResults.rows;
  let chgoutdtlResults = await pool.query('SELECT * FROM "870_SNF_ChgOutDtl" WHERE chgoutdtl_key = $1', [pkey]);
  let ChgOutDtl = chgoutdtlResults.rows;
  let chgoutmeasureResults = await pool.query('SELECT * FROM "870_SNF_ChgOutMeasure" WHERE chgoutmsr_key = $1', [pkey]);
  let ChgOutMeasure = chgoutmeasureResults.rows;
  let chgoutpidResults = await pool.query('SELECT * FROM "870_SNF_ChgOutPID" WHERE chgoutpid_key = $1', [pkey]);
  let ChgOutPID = chgoutpidResults.rows;

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
      let location = Branch.toString().slice(-2);
      let { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config } = await getPrioritySettings(tradingPartner, Branch, '870', pool);
      let snf = await writeSNF(pkey, pool, Header, OrderDtl, Names, ChgInDtl, ChgInMeasure, ChgInPID, ChgOutDtl, ChgOutMeasure, ChgOutPID, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location);
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
      let location = Branch.toString().slice(-2);
      let { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config } = await getPrioritySettings(row.rte_edi_acct_id, Branch, '870', pool);
      let snf = await writeSNF(pkey, pool, Header, OrderDtl, Names, ChgInDtl, ChgInMeasure, ChgInPID, ChgOutDtl, ChgOutMeasure, ChgOutPID, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location);
      multiSNFS.push(snf);
  }));
  }
}

  return multiSNFS;

}

async function writeSNF(pkey, pool, Header, OrderDtl, Names, ChgInDtl, ChgInMeasure, ChgInPID, ChgOutDtl, ChgOutMeasure, ChgOutPID, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location) {


  let outSNF = []
 console.log("Creating O870 for pkey:", pkey);
  //MARK: CT Record
  let CT = {
      "RECORD TYPE INDICATOR" : "CT",
      "Record Key (10-digit integer)": pkey,
      "GS Functional Group ID": "RS",
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

    //MARK: 10 Record
    let tenRecord = {
      "RECORD TYPE INDICATOR": "10",
      "Date Sent" : Header.hdr_dsnt_no,
      "Time Sent" : Header.hdr_dsnt_no,
      "Order/Item Code": Header.hdr_ord_itm_cd,
      "Reference ID": Header.hdr_ref_id,
      "Date": Header.hdr_date,
      "Time": Header.hdr_time,
      "Production Reference ID": Header.hdr_prod_ref_id,
      "Process Date" : Header.hdr_pdte_no,
      "Process Time" : Header.hdr_ptme_no,
      "Process Time Zone" : Header.hdr_ptmez_cd,
      "Status Change Date" : Header.hdr_stscd_no,
      "Status Change Time" : Header.hdr_ststm_no,
      "Status Change Time Zone" : Header.hdr_stszn_cd,
      "Manufacturer ID Qualifier" : Header.hdr_mfgidq_cd,
      "Manufacturer ID" : Header.hdr_mfgid_id,
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

let overallindex = 1;
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
    "Ultimate Customer Order Number": null,//Needs to be defined
    "Ultimate Customer Release Number": null,//Needs to be defined
    "Ultimate Customer Part Number": null,//Needs to be defined
    "Ultimate Customer Item Number": null,//Needs to be defined
    "Material Specification Application (MSA#)": null,//Needs to be defined
    "Cust PO No Shop": null,//Needs to be defined
    "Cust Release No Shop": null,//Needs to be defined
    "License Plate Number": null//Needs to be defined

  };
  thirtyRecord.record_code = thirtyRecord["RECORD TYPE INDICATOR"];
  await outSNF.push(thirtyRecord);
  overallindex = overallindex + 1;
  // 40 Records for this hl1

  const Detail40s = ChgInDtl.filter(d => d.chgindtl_hlo === hlo);
  for (const Detail40 of Detail40s) {
    let fortyRecord = {
        "RECORD TYPE INDICATOR": "40",
        "Item HL ID": Detail40.chgindtl_hli,
        "HL Parent ID": Detail40.chgindtl_hlo,
        "HL Level Code": 'I',
        "HL Child Code": 1,
        "Charge-In Tag Type" : Detail40.chgindtl_chrgintype,
        "Charge-In Tag ID" : Detail40.chgindtl_chrgintag,
        "Heat Number": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_heat, 'Heat Number', '40'),
        "Mill Coil Number": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_mcoil, 'Mill Coil Number', '40'),
        "Vendor (Mill) Order Number": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_mo, 'Vendor (Mill) Order Number', '40'),
        "Vendor (Mill) Item/Line Number": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_mol, 'Vendor (Mill) Item/Line Number', '40'),
        "Part Number": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_bpart, 'Part Number', '40'),
        "Grade Code": await evaluatePriority(priority_1, priority_2, Detail40.chgindtl_gc, 'Grade Code', '40'),
        "Part Number (from Shop Order)": null, //Needs to be defined
        "Part Description (from Shop Order)": null, //Needs to be defined
        "Customer PO# (from Shop Order)": null, //Needs to be defined
        "Special Data 1": null,//Needs to be defined
        "Special Data 2": null,//Needs to be defined
        "Override Part Number": null,//Needs to be defined
        "Override Customer PO#": null,//Needs to be defined
        "Override Supplier ID": null,//Needs to be defined
        "Consumed Coil": null,//Needs to be defined
        "RTS Blanking part#": null,//Needs to be defined
        "Tag Serial Build Layout": Detail40.chgindtl_chrgintag,//Needs to be defined
        "License Plate Number": null,//Needs to be defined
        "Multi-Coil Flag": 'N',//Needs to be defined
        "Previous RTS Tag": null,//Needs to be defined
        "Customer Tag#": null,//Needs to be defined
        "Commodity Form#": null//Needs to be defined
   };
    fortyRecord.record_code = fortyRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fortyRecord);
    overallindex = overallindex + 1;

     let fortytwoRecord = {
        "RECORD TYPE INDICATOR": "42",
        "Process Performed (AISI Table 66)": Detail40.chgindtl_proc,
        "Process Performed Description": null,
        "Material Classification (AISI Table 67)": Detail40.chgindtl_mcls,
        "Material Classification Description": null,
        "Material Status (AISI Table 70)": Detail40.chgindtl_msts,
        "Material Status Description": null,
        "Reason/Fault Code (AISI Table 72)": Detail40.chgindtl_fault,
        "Reason/Fault Description": null,
        "Damage/Scrap Code (AISI Table 73)": Detail40.chgindtl_dmg,
        "Damage/Scrap Description": null,
        "Quality Status Code (AISI Table 68)": Detail40.chgindtl_qsts,
        "Quality Status Description": null,
        "Commercial Status Code (AISI Table 69)": Detail40.chgindtl_csts,
        "Commercial Status Description": null
   };
    fortytwoRecord.record_code = fortytwoRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fortytwoRecord);

     let fortyfiveRecord = {
        "RECORD TYPE INDICATOR": "45",
        "Actual Weight (LB)": Detail40.chgindtl_awgtlb,
        "Actual Weight (KG)": Detail40.chgindtl_awgtkg,
        "Theoretical Weight (LB)": Detail40.chgindtl_twgtlb,
        "Theoretical Weight (KG)": Detail40.chgindtl_twgtkg,
        "Gauge (IN)": Detail40.chgindtl_gaugin,
        "Gauge (MM)": Detail40.chgindtl_gaugmm,
        "Gauge Type (NOM/MIN/ACT)": Detail40.chgindtl_gaugt,
        "Width (IN)": Detail40.chgindtl_widin,
        "Width (MM)": Detail40.chgindtl_widmm,
        "Linear Feet": Detail40.chgindtl_lnft,
        "Linear Meters": Detail40.chgindtl_lnmt,
        "Unit Length (IN)": Detail40.chgindtl_ulenin,
        "Unit Length (MM)": Detail40.chgindtl_ulenmm,
        "Inside Diameter (IN)": Detail40.chgindtl_idin,
        "Inside Diameter (MM)": Detail40.chgindtl_idmm,
        "Outside Diameter (IN)": Detail40.chgindtl_odin,
        "Outside Diameter (MM)": Detail40.chgindtl_odmm,
        "Pieces": Detail40.chgindtl_pcs,
        "Original I856 Gauge (IN)": null, //Needs to be defined
        "Original I856 Gauge (MM)": null, //Needs to be defined
        "Original I856 Gauge Type": null
   };
    fortyfiveRecord.record_code = fortyfiveRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fortyfiveRecord);

    // 50 Records for this 40 record (matching)
    const matching50s = ChgOutDtl.filter(out =>
      out.chgoutdtl_hlo === Detail40.chgindtl_hlo && out.chgoutdtl_hli === Detail40.chgindtl_hli && out.chgoutdtl_chrgintag === Detail40.chgindtl_chrgintag
    )
    for (const Detail50 of matching50s) {
      let fiftyRecord = {
        "RECORD TYPE INDICATOR": "50",
        "Component HL ID": Detail50.chgoutdtl_hlf,
        "HL Parent ID": Detail50.chgoutdtl_hli,
        "HL Level Code": 'F',
        "HL Child Code": 0,
        "Charge-Out Tag Type" : Detail50.chgoutdtl_chrgoutttyp,
        "Charge-Out Tag ID" : Detail50.chgoutdtl_chrgouttag,
        "Status (Outside Processor) Date": Detail50.chgoutdtl_stsdt,
        "Status (Outside Processor) Time": Detail50.chgoutdtl_ststm,
        "Process Date": Detail50.chgoutdtl_prcdt,
        "Process Time": Detail50.chgoutdtl_prctm, 
        "Heat Number": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_heat, 'Heat Number', '40'),
        "Mill Coil Number": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_mcoil, 'Mill Coil Number', '40'),
        "Vendor (Mill) Order Number": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_mo, 'Vendor (Mill) Order Number', '40'),
        "Vendor (Mill) Item/Line Number": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_mol, 'Vendor (Mill) Item/Line Number', '40'),
        "Part Number": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_bpart, 'Part Number', '40'),
        "Grade Code": await evaluatePriority(priority_1, priority_2, Detail50.chgoutdtl_gc, 'Grade Code', '40'),
        "Shop Order Number": null, //Needs to be defined
        "Part Number (from Shop Order)": null, //Needs to be defined
        "Part Description (from Shop Order)": null, //Needs to be defined
        "Customer PO# (from Shop Order)": null, //Needs to be defined
        "Special Data 1": null,//Needs to be defined
        "Special Data 2": null,//Needs to be defined
        "Override Part Number": null,//Needs to be defined
        "Override Customer PO#": null,//Needs to be defined
        "Override Supplier ID": null,//Needs to be defined
        "Actual weight LB": Detail50.chgoutdtl_awgtlb,
        "Consumed Coil": null,//Needs to be defined
        "RTS Blanking part#": null,//Needs to be defined
        "Tag Serial Build Layout": Detail50.chgoutdtl_chrgouttag,//Needs to be defined
        "Multi-Coil Flag": 'N',//Needs to be defined
        "Previous RTS Tag": null,//Needs to be defined
        "License Plate Number": null,//Needs to be defined
        "Customer Tag#": null,//Needs to be defined
        "Commodity Form#": null//Needs to be defined
      };
      fiftyRecord.record_code = fiftyRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fiftyRecord);
      overallindex = overallindex + 1;

       let fiftytwoRecord = {
        "RECORD TYPE INDICATOR": "52",
        "Process Performed (AISI Table 66)": Detail50.chgoutdtl_proc,
        "Process Performed Description": null,
        "Material Classification (AISI Table 67)": Detail50.chgoutdtl_mcls,
        "Material Classification Description": null,
        "Material Status (AISI Table 70)": Detail50.chgoutdtl_msts,
        "Material Status Description": null,
        "Reason/Fault Code (AISI Table 72)": Detail50.chgoutdtl_fault,
        "Reason/Fault Description": null,
        "Damage/Scrap Code (AISI Table 73)": Detail50.chgoutdtl_dmg,
        "Damage/Scrap Description": null,
        "Quality Status Code (AISI Table 68)": Detail50.chgoutdtl_qsts,
        "Quality Status Description": null,
        "Commercial Status Code (AISI Table 69)": Detail50.chgoutdtl_csts,
        "Commercial Status Description": null
   };
    fiftytwoRecord.record_code = fiftytwoRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fiftytwoRecord);

     let fiftyfiveRecord = {
        "RECORD TYPE INDICATOR": "55",
        "Actual Weight (LB)": Detail50.chgoutdtl_awgtlb,
        "Actual Weight (KG)": Detail50.chgoutdtl_awgtkg,
        "Theoretical Weight (LB)": Detail50.chgoutdtl_twgtlb,
        "Theoretical Weight (KG)": Detail50.chgoutdtl_twgtkg,
        "Gauge (IN)": Detail50.chgoutdtl_gaugin,
        "Gauge (MM)": Detail50.chgoutdtl_gaugmm,
        "Gauge Type (NOM/MIN/ACT)": Detail50.chgoutdtl_gaugt,
        "Width (IN)": Detail50.chgoutdtl_widin,
        "Width (MM)": Detail50.chgoutdtl_widmm,
        "Linear Feet": Detail50.chgoutdtl_lnft,
        "Linear Meters": Detail50.chgoutdtl_lnmt,
        "Unit Length (IN)": Detail50.chgoutdtl_ulenin,
        "Unit Length (MM)": Detail50.chgoutdtl_ulenmm,
        "Inside Diameter (IN)": Detail50.chgoutdtl_idin,
        "Inside Diameter (MM)": Detail50.chgoutdtl_idmm,
        "Outside Diameter (IN)": Detail50.chgoutdtl_odin,
        "Outside Diameter (MM)": Detail50.chgoutdtl_odmm,
        "Pieces": Detail50.chgoutdtl_pcs,
        "Original I856 Gauge (IN)": null, //Needs to be defined
        "Original I856 Gauge (MM)": null, //Needs to be defined
        "Original I856 Gauge Type": null
   };
    fiftyfiveRecord.record_code = fiftyfiveRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fiftyfiveRecord);

    }
}
}

//MARK: 90 Record
  let ninetyRecord = {
    "RECORD TYPE INDICATOR": "90",
    "No HL or LIN": overallindex,
    "Total Line Qtys": null
  }
  ninetyRecord.record_code = ninetyRecord["RECORD TYPE INDICATOR"];
  outSNF.push(ninetyRecord);

  return outSNF
}

module.exports = {
  SNFCreateO870
}
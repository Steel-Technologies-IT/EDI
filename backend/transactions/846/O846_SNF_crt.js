const trimTrailingZeros = require('../../functions/trimtrailingzeros.js');
const chopOffDecimals = require('../../functions/chopoffdecimals.js');
const { evaluatePriority, getPrioritySettings, getAddressPriority } = require('../../functions/evaluatePriority.js');
const retrieveInboundASN = require('../../functions/retrieveInboundASN.js').retrieveInboundASN;

async function SNFCreateO846(pkey, pool, CustomerID, Branch, Locn, tradingPartner) {

  let headerResults = await pool.query('SELECT * FROM public."846_SNF_Header" WHERE hdr_key = $1 AND hdr_sttx_locn = $2', [pkey, Locn.Location]);
  let Header = headerResults.rows[0];
  if (!Header) {
    throw new Error(`No header found for key: ${pkey}`);
  }
  let detailsResults = await pool.query('SELECT * FROM "846_SNF_Detail" WHERE dtl_key = $1 AND dtl_sttx_locn = $2 ORDER BY dtl_det_seq_no' , [pkey, Locn.Location]);
  let Detail = detailsResults.rows;
  
  let namesResults = await pool.query('SELECT * FROM "846_SNF_Names" WHERE name_key = $1 AND name_sttx_locn = $2', [pkey, Locn.Location]);
  let Names = namesResults.rows;
  

  //Load SNF Tables
     let multiSNFS = []
     console.log("Checking for multiple SNFs for pkey:", CustomerID);
     console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_id);
     console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_qual);
    //CustomerID=10000175;
    
    
     let RoutingSNFsResults = await pool.query(
    'SELECT rte_edi_acct_id FROM public."Routing_SNFs" WHERE rte_cus_id = $1 AND TRIM(rte_isa_id) LIKE $2 AND rte_isa_qual = $3 AND rte_transactions @> ARRAY[$4::varchar]',
    [CustomerID, `${Header.hdr_ircv_id.trim()}%`, Header.hdr_ircv_qual, '846']
  );
  console.log(RoutingSNFsResults.rows);
  
    // let multipleSNFs = multipleSNFsResults.rows;
  if (tradingPartner && tradingPartner.length > 0) {
        let { address_priority_1, address_priority_2, address_priority_3, address_priority_4 } = await getAddressPriority(tradingPartner, Branch, '846', pool);
        let trading_partner_info_results = await pool.query(
          'SELECT * FROM public."EDI_Accounts" WHERE edia_edi_account_id = $1',
          [tradingPartner]
        );
        let trading_partner_info = trading_partner_info_results.rows[0];
        let location = Branch.toString().slice(-2);
        let { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config } = await getPrioritySettings(tradingPartner, Branch, '846', pool);
        let snf = await writeSNF(pkey, pool, Header, Detail, Names, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, Locn.Location);
        multiSNFS.push(snf);
  } else {
    if (RoutingSNFsResults.rows.length > 0) {
     await Promise.all(RoutingSNFsResults.rows.map(async row => {
    
        let { address_priority_1, address_priority_2, address_priority_3, address_priority_4 } = await getAddressPriority(row.rte_edi_acct_id, Branch, '846', pool);
        let trading_partner_info_results = await pool.query(
    'SELECT * FROM public."EDI_Accounts" WHERE edia_edi_account_id = $1',
    [row.rte_edi_acct_id]
  );
        let trading_partner_info = trading_partner_info_results.rows[0];
        let location = Branch.toString().slice(-2);
        let { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config } = await getPrioritySettings(row.rte_edi_acct_id, Branch, '846', pool);
        let snf = await writeSNF(pkey, pool, Header, Detail, Names, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, Locn.Location);
        multiSNFS.push(snf);
    }));
    }
  }
  
    return multiSNFS;

}

async function writeSNF(pkey, pool, Header, Detail, Names, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, Locn) {

  let outSNF = [];
  let MF_addr_typ_cde;
  let MF_addr_id;
  let MF_name;
  let OU_addr_typ_cde;
  let OU_addr_id;
  let OU_name;
  let WH_addr_typ_cde;
  let WH_addr_id;
  let WH_name;


  console.log("Creating O846 for pkey:", pkey);
  //MARK: CT Record
  let CT = {
      "RECORD TYPE INDICATOR": "CT",
      "Record Key (10-digit integer)": pkey + Locn.toString(),
      "ISA Sender ID Qualifier": Header.hdr_isa_qual,
      "ISA Sender ID": Header.hdr_isnd_id,
      "GS Sender ID": Header.hdr_gsnd_id,
      "ISA Control Number": Header.hdr_ictl_no,
      "GS Functional Group ID": await evaluatePriority(priority_1, priority_2, "IB", 'GS Functional Group ID', 'CT'), // Hard coded in AS400 Header.hdr_func_no, 
      "GS Control Number": Header.hdr_gctl_no,
      "ISA Receiver ID Qualifier": await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_qual, 'ISA Receiver ID Qualifier', 'CT'), // Header.hdr_ircv_qual,
      "ISA Receiver ID": await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_id, 'ISA Receiver ID', 'CT'), // Header.hdr_ircv_id, 
      "GS Receiver ID": await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_id, 'GS Receiver ID', 'CT'), // Header.hdr_ircv_id,
      "ST Control Number": Header.hdr_stctl_no,
      "ST Transaction Set ID": "846",
      "Plant ID Code Qualifier": null,
      "Plant ID Code": null,
      "Application System ID": "INVEX",
      "Production/Test Flag": "P",
      "Type (T=Toll; M=Margin; D=Direct Ship)": "T", // Hard coded in AS400 Header.hdr_type
      }
    CT.record_code = CT["RECORD TYPE INDICATOR"];
       outSNF.push(CT);

       //MARK: 10 Record
    let tenRecord = {
      "RECORD TYPE INDICATOR": "10",
      "Date Sent": parseInt(Header.hdr_dsent) > 0 ? Header.hdr_dsent : null,
      "Time Sent" : Header.hdr_tsent.toString().padStart(6, '0'), // Header.hdr_tsent,
      "Transaction Set Purpose Code" : await evaluatePriority(priority_1, priority_2, Header.hdr_purpcode, 'Transaction Set Purpose Code', '10'), // Header.hdr_purpcode,
      "Report Type Code": Header.hdr_type,
      "Report Reference ID": Header.hdr_rptrefid,
      "Report Date" : parseInt(Header.hdr_dsent) > 0 ? Header.hdr_dsent : null,
      "Report Time" : Header.hdr_tsent.toString().padStart(6, '0'), // Header.hdr_tsent,
      "Action Code" : Header.hdr_actioncd,
      "Inventory Date" : parseInt(Header.hdr_dsent) > 0 ? Header.hdr_dsent : null,
      "Inventory Time" : Header.hdr_tsent.toString().padStart(6, '0'), // Header.hdr_tsent,
      "Inventory Time Zone" : "ET",
      "Manufacturer ID Qualifier" : Header.hdr_mfgidq,
      "Manufacturer ID" : Header.hdr_mfgid,
      "Outside Processor ID Qualifier" : Header.hdr_opidq,
      "Outside Processor ID" : Header.hdr_opid,
      }
    tenRecord.record_code = tenRecord["RECORD TYPE INDICATOR"];
        outSNF.push(tenRecord);

   //Overriding Addresses
let addressList = [];
address_priority_1 ? await Promise.all(address_priority_1.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde) && Name.ediaat_addr_id !== null) {
        addressList.push(Name.ediaat_addr_typ_cde);
      if (Name.ediaat_addr_id.trim() !== '') {  
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Contact Name": Name.ediaat_cont_name,
        "Contact Telephone": Name.ediaat_cont_phn,
        "Contact Email": Name.ediaat_cont_eml,
        "Address ID Qualifier": Name.ediaat_id_qual
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);

      if (Name.ediaat_addr_typ_cde === 'OU') {
      OU_addr_typ_cde = Name.ediaat_addr_typ_cde;
      OU_addr_id=Name.ediaat_addr_id;
      OU_name = Name.name_name;
      outSNF[1]['Outside Processor ID'] = OU_addr_id;
      outSNF[1]['Outside Processor ID Qualifier'] = OU_addr_typ_cde;
      } 
      if (Name.name_nameq === 'MF') {
      MF_addr_typ_cde = Name.ediaat_addr_typ_cde;
      MF_addr_id=Name.ediaat_addr_id;
      MF_name = Name.name_name;
      outSNF[1]['Manufacturer ID'] = MF_addr_id;
      outSNF[1]['Manufacturer ID Qualifier'] = MF_addr_typ_cde;
      }

    }}
    })) : null;

    address_priority_2 ? await Promise.all(address_priority_2.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde) && Name.ediaat_addr_id !== null) {
        addressList.push(Name.ediaat_addr_typ_cde);
         if (Name.ediaat_addr_id.trim() !== '') {  
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Contact Name": Name.ediaat_cont_name,
        "Contact Telephone": Name.ediaat_cont_phn,
        "Contact Email": Name.ediaat_cont_eml,
        "Address ID Qualifier": Name.ediaat_id_qual
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);

      if (Name.ediaat_addr_typ_cde === 'OU') {
      OU_addr_typ_cde = Name.ediaat_addr_typ_cde;
      OU_addr_id=Name.ediaat_addr_id;
      OU_name = Name.name_name;
      outSNF[1]['Outside Processor ID'] = OU_addr_id;
      outSNF[1]['Outside Processor ID Qualifier'] = OU_addr_typ_cde;
      } 
      if (Name.name_nameq === 'MF') {
      MF_addr_typ_cde = Name.ediaat_addr_typ_cde;
      MF_addr_id=Name.ediaat_addr_id;
      MF_name = Name.name_name;
      outSNF[1]['Manufacturer ID'] = MF_addr_id;
      outSNF[1]['Manufacturer ID Qualifier'] = MF_addr_typ_cde;
      }
    }}
    })) : null

    address_priority_3 ? await Promise.all(address_priority_3.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde) && Name.ediaat_addr_id !== null) {
        addressList.push(Name.ediaat_addr_typ_cde);
         if (Name.ediaat_addr_id.trim() !== '') {  
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Contact Name": Name.ediaat_cont_name,
        "Contact Telephone": Name.ediaat_cont_phn,
        "Contact Email": Name.ediaat_cont_eml,
        "Address ID Qualifier": Name.ediaat_id_qual
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);

      if (Name.ediaat_addr_typ_cde === 'OU') {
      OU_addr_typ_cde = Name.ediaat_addr_typ_cde;
      OU_addr_id=Name.ediaat_addr_id;
      OU_name = Name.name_name;
      outSNF[1]['Outside Processor ID'] = OU_addr_id;
      outSNF[1]['Outside Processor ID Qualifier'] = OU_addr_typ_cde;
      } 
      if (Name.name_nameq === 'MF') {
      MF_addr_typ_cde = Name.ediaat_addr_typ_cde;
      MF_addr_id=Name.ediaat_addr_id;
      MF_name = Name.name_name;
      outSNF[1]['Manufacturer ID'] = MF_addr_id;
      outSNF[1]['Manufacturer ID Qualifier'] = MF_addr_typ_cde;
      }
    }}
    })) : null;

    address_priority_4 ? await Promise.all(address_priority_4.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde) && Name.ediaat_addr_id !== null) {
        addressList.push(Name.ediaat_addr_typ_cde);
         if (Name.ediaat_addr_id.trim() !== '') {  
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Contact Name": Name.ediaat_cont_name,
        "Contact Telephone": Name.ediaat_cont_phn,
        "Contact Email": Name.ediaat_cont_eml,
        "Address ID Qualifier": Name.ediaat_id_qual
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);

      if (Name.ediaat_addr_typ_cde === 'OU') {
      OU_addr_typ_cde = Name.ediaat_addr_typ_cde;
      OU_addr_id=Name.ediaat_addr_id;
      OU_name = Name.name_name;
      outSNF[1]['Outside Processor ID'] = OU_addr_id;
      outSNF[1]['Outside Processor ID Qualifier'] = OU_addr_typ_cde;
      } 
      if (Name.name_nameq === 'MF') {
      MF_addr_typ_cde = Name.ediaat_addr_typ_cde;
      MF_addr_id=Name.ediaat_addr_id;
      MF_name = Name.name_name;
      outSNF[1]['Manufacturer ID'] = MF_addr_id;
      outSNF[1]['Manufacturer ID Qualifier'] = MF_addr_typ_cde;
      }
    }}
    })) : null;

//JSON Addresses
    await Promise.all(Names.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.name_nameq)  && Name.name_nameid !== null) {
        addressList.push(Name.name_nameq);
         if (Name.name_nameid !== '') {  
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.name_nameq, // Name.name_addresstype,
        "Address ID Qualifier": "1", // Hard coded in AS400 or comming from customer Function 68 in AS400 using program UT5000RG
        "Address ID": Name.name_nameid,
        "Name": Name.name_name,
        "Additional Name 1:": Name.name_name1,
        "Additional Name 2:": Name.name_name2,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.name_state,
        "Postal Code": Name.name_zpcd,
        "Customer Country Code": Name.name_ctry_cd,
        "Contact Name": Name.name_cont_name,
        "Contact Telephone": Name.name_cont_phn,
        "Contact Fax": Name.name_cont_fax,
        "Contact Email": Name.name_cont_eml,
        "Responsible Party Code": Name.name_resp_party_cd
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      outSNF.push(fifteenRecord);

      if (Name.name_nameq === 'OU') {
      OU_addr_typ_cde = Name.name_nameq;
      OU_addr_id=Name.name_nameid;
      OU_name = Name.name_name;
      outSNF[1]['Outside Processor ID'] = OU_addr_id;
      outSNF[1]['Outside Processor ID Qualifier'] = OU_addr_typ_cde;
      } 
      if (Name.name_nameq === 'MF') {
      MF_addr_typ_cde = Name.name_nameq;
      MF_addr_id=Name.name_nameid;
      MF_name = Name.name_name;
      outSNF[1]['Manufacturer ID'] = MF_addr_id;
      outSNF[1]['Manufacturer ID Qualifier'] = MF_addr_typ_cde;
      }

  }}}));
    

    //MARK: 30 Record

 for (Detail30 of Detail) {

//*let orginalDetail;
// let oldKey;
// try {
//        oldKey = await pool.query(`
//         SELECT dtl_key FROM "856_SNF_Detail" 
//         WHERE dtl_heat = $1 
//         AND dtl_mcoil = $2
//       `, [
//         Detail30.dtl_heat, 
//         Detail30.dtl_mcoil
//       ]);
      
    
// if (oldKey.rows.length > 0) {
// orginalDetail = await pool.query('SELECT * FROM "856_SNF_Detail" WHERE dtl_key = $1 AND dtl_mcoil = $2 AND dtl_heat = $3', [oldKey.rows[0].dtl_key, Detail30.dtl_mcoil, Detail30.dtl_heat]);
// }
//   // console.log('Found Previous ASN')
// } catch (error) {
//   // console.log("No previous ASN found:");
// }
//*
////////////
let orginalHeader;
let orginalDetail;
let orginalNames;
let orginalMeasure;
let uniqueKeys = []; // Array to store unique keys

try {
 // if (Detail && Array.isArray(Detail) && Detail.length > 0) {
    // for (const product of Detail30) {
      const key = await retrieveInboundASN(Detail30.dtl_mcoil.trim(), Detail30.dtl_heat.trim(), MF_addr_id ? MF_addr_id : null);
      //console.log('KEY', key.rows)
      
      // Check if we got a valid key and it's not already in our array
      if (key.rows && key.rows.length > 0 && key.rows[0].dtl_key) {
        const dtlKey = key.rows[0].dtl_key;
        
        // Only add if not already in the uniqueKeys array
        if (!uniqueKeys.includes(dtlKey)) {
          uniqueKeys.push(dtlKey);
        }
      }
    // }
 // }

//  console.log('Unique Keys:', uniqueKeys);

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
    //console.log("No previous ASN keys found");
  }

} catch (error) {
  console.log(error)
  console.log("Error retrieving previous ASN:");
}
///////////////

const CoilIdMM = Detail30.dtl_idin * 25.4;
const CoilOdMM = Detail30.dtl_odin * 25.4;
let MillOrder;
let MillOrderLine;
let TrimedMO = Detail30.dtl_mo.trim();
let TrimedMOL = Detail30.dtl_mol?Detail30.dtl_mol:'';
if (TrimedMO !== '') {
  MillOrder = Detail30.dtl_mo;
}else{
     MillOrder = orginalDetail.rows[0].dtl_mo;
}

if (TrimedMOL !== '') {
  MillOrderLine = Detail30.dtl_mol;
}else{
     MillOrderLine = orginalDetail.rows[0].dtl_mol;
}



      let thirtyRecord = {
      "RECORD TYPE INDICATOR": "30",
      "Assigned ID": Detail30.dtl_line_asd_id,
      "Vendor (Mill) Order Number": MillOrder,
      "Vendor (Mill) Item/Line Number": MillOrderLine,
      "Mill Coil Number": Detail30.dtl_mcoil,
      "Heat Number": Detail30.dtl_heat, 
      "Purchase Order Number": Detail30.dtl_po,
      "Purchase Order Line Number": Detail30.dtl_pol,
      "Buyer's Part Number": Detail30.dtl_bpart,
      "Other Value": Detail30.dtl_other,
      "Packing List Number": Detail30.dtl_plistno,
      "Tag Type": Detail30.dtl_tagtyp,
      "Tag ID": Detail30.dtl_tag,
      "Prior Processor Tag#": Detail30.dtl_prev,
      "Status Date": parseInt(Detail30.dtl_crt_dte) > 0 ? Detail30.dtl_crt_dte : null,
      "Status Time": Detail30.dtl_crt_tme.toString().padStart(6, '0'), // Detail30.dtl_crt_tme,
      "Status Time Zone": 'ET',
      "Inventory Date": parseInt(Detail30.dtl_crt_dte) > 0 ? Detail30.dtl_crt_dte : null,
      "Inventory Time": Detail30.dtl_crt_tme.toString().padStart(6, '0'), // Detail30.dtl_crt_tme,
      "Inventory Time Zone": 'ET',
      "Purchase Order Date": null, //Detail30.dtl_pod ? Detail30.dtl_pod : null,   // Comming from p#PODT EIOPRFRG in AS400
      "Purchase Order Date": parseInt(Detail30.dtl_pod) > 0 ? Detail30.dtl_pod  : null,   // Comming from p#PODT EIOPRFRG in AS400
      "Purchase Order Time": null,  // not populated in AS400
      "Purchase Order Time Zone": 'ET',  
      "Process Date": (parseInt(Detail30.dtl_crt_dte)> 0) ? (parseInt(Detail30.dtl_crt_dte)> 0): null,  //comming from TGHCRDT in AS400
      "Process Time": (parseInt(Detail30.dtl_crt_tme)> 0) ? (parseInt(Detail30.dtl_crt_tme)> 0): null,  // comming from TGHCRTM in AS400
      "Process Time Zone": 'ET',
      "Material Classification (AISI Table 67)": Detail30.dtl_mat_class ? Detail30.dtl_mat_class : '01',    //eiirapp1. Ermcls or EIIASNL3. E8mcls
      "Material Classification Description": null,  // comming from EITCP1. EITCD in AS400
      "Material Status (AISI Table 70)": Detail30.dtl_mat_sts, //If RAW/RTS Comming from EIMSTSLC . E1MSTS; If FG then '1', If WIP then '7' in AS400
      "Material Status Description": null,  // comming from EITCP1. EITCD in AS400
      "Actual Weight (LB)": Detail30.dtl_act_wgt,
      "Actual Weight (KG)": Detail30.dtl_act_wgt ? (Detail30.dtl_act_wgt * 2.20462) : null,
      "Theoretical Weight (LB)": null, //comming from TGCTWLB in AS400
      "Theoretical Weight (KG)": null, //comming from TGCTWKG in AS400
      "Gauge (IN)": Detail30.dtl_gauge,
      "Gauge (MM)": Detail30.dtl_gauge ? (Detail30.dtl_gauge * 25.4) : null, 
      "Gauge Type (NOM/MIN/ACT)": Detail30.dtl_gauge_tpe,
      "Width (IN)": Detail30.dtl_width,
      "Width (MM)": Detail30.dtl_width ? (Detail30.dtl_width * 25.4) : null, 
      "Linear Feet": Detail30.dtl_lin_ft,
      "Linear Meters": Detail30.dtl_lin_ft ? (Detail30.dtl_lin_ft / 3.281) : null,
      "Unit Length (IN)": (trimTrailingZeros(Detail30.dtl_unit_len) > 0) ? (trimTrailingZeros(Detail30.dtl_unit_len) > 0) : null,
      "Unit Length (MM)":  (trimTrailingZeros(Detail30.dtl_unit_len* 25.4) > 0) ? trimTrailingZeros((Detail30.dtl_unit_len * 25.4))>0 : null,
      "Pieces": Detail30.dtl_pcs,
      "Responsible Party Alpha Code": null, //Comming from customer Function 68 in AS400 using program UT5000RG
      "Responsible Party Number Code": null, //Comming from customer Function 68 in AS400 using program UT5000RG
      "MSA#": null, // Comming from multiple tables in AS400
      "Received/Created Date": parseInt(Detail30.dtl_rcv_dte) > 0 ? Detail30.dtl_rcv_dte : null,
      "Issue Date": parseInt(Detail30.dtl_iss_dte) > 0 ? Detail30.dtl_iss_dte : null,
      "Quality Rating Date": parseInt(Detail30.dtl_qty_rtg_dte) > 0 ? Detail30.dtl_qty_rtg_dte : null, 
      "Quality Rating Time": Detail30.dtl_qty_rtg_tme,
      "Quality Rating Time Zone": Detail30.dtl_qty_rtg_tme_zn,
      "Quantity Received": Detail30.dtl_rcv_qty,
      "Quantity Used": Detail30.dtl_use_qty,
      "Quantity On-Hand": Detail30.dtl_onhand_qty,
      "Bay Location ID": null,  // comming from TAGBAYLA. TGLBAYL in AS400
      "Bay Location Name": null, // comming from EILOCBP1. LBOVNM; I LBOVNM blanks then XDLOCA. Locnam  in AS400
      "Lot Number": Detail30.dtl_lot,
      "Vendor Product Number": Detail30.dtl_v_prod_no,
      "Consignment Classification ID": Detail30.dtl_cons_class,
      "Backout Procedure Code": Detail30.dtl_backout_cd,
      "Consignee Reference Number": Detail30.dtl_consignee_no,
      "Original I856 Gauge (IN)": orginalDetail ? orginalDetail.rows[0].dtl_gaugin : null, //comming from EIIASNL3. E8thck in AS400 
      "Original I856 Gauge (MM)": orginalDetail ? orginalDetail.rows[0].dtl_gaugmm : null,
      "Original I856 Gauge Type": orginalDetail ? orginalDetail.rows[0].dtl_gaugt : null, //Comming from EIIASNL3 in AS400 'NOM', 'MAX' & 'MIN' are the values 
      "Tag serial Build Layout": null, // Comming from TCF100RG; else k#T1Tag in AS400
      "License Plate Number": null, // Comming from MSBELCP2. MONUMB in AS400,
      "Inside Diameter (IN)": Detail30.dtl_idin, // Comming from TGCIDIN in AS400
      "Inside Diameter (MM)": CoilIdMM,
      "Outside Diameter (IN)": Detail30.dtl_odin, // Comming from TGCODIN in AS400
      "Outside Diameter (MM)": CoilOdMM,
    }
    thirtyRecord.record_code = thirtyRecord["RECORD TYPE INDICATOR"];
    outSNF.push(thirtyRecord);
   
 
  };    



  //MARK: 90 Record
  let ninetyRecord = {
    "RECORD TYPE INDICATOR": "90",
    "Number of Line Items": Header.hdr_sumlin,
    "Hash Total": Header.hdr_sumhash,
    "Weight": Header.hdr_sumhash,
  }
  ninetyRecord.record_code = ninetyRecord["RECORD TYPE INDICATOR"];
  outSNF.push(ninetyRecord);

  return outSNF
}

module.exports = {
  SNFCreateO846
}

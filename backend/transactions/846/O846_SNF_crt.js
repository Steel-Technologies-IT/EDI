const trimTrailingZeros = require('../../functions/trimtrailingzeros.js');
const chopOffDecimals = require('../../functions/chopoffdecimals.js');
const { evaluatePriority, getPrioritySettings, getAddressPriority } = require('../../functions/evaluatePriority.js');

async function SNFCreateO846(pkey, pool, CustomerID, Branch) {

  let headerResults = await pool.query('SELECT * FROM public."846_SNF_Header" WHERE hdr_key = $1', [pkey]);
  let Header = headerResults.rows[0];
  if (!Header) {
    throw new Error(`No header found for key: ${pkey}`);
  }
  let detailsResults = await pool.query('SELECT * FROM "846_SNF_Detail" WHERE dtl_key = $1 ORDER BY dlt_det_seq_no' , [pkey]);
  let Detail = detailsResults.rows;
  
  let namesResults = await pool.query('SELECT * FROM "846_SNF_Names" WHERE name_key = $1', [pkey]);
  let Names = namesResults.rows;
  
  let measurementsResults = await pool.query('SELECT * FROM "846_SNF_Measure" WHERE msr_key = $1', [pkey]);
  let Measurements = measurementsResults.rows;

  let PIDResults = await pool.query('SELECT * FROM "846_SNF_PID" WHERE pid_key = $1', [pkey]);
  let PIDs = PIDResults.rows;

  //Load SNF Tables
  let multiSNFS = []
   console.log("Checking for multiple SNFs for pkey:", CustomerID);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_id);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_qual);
  //
//    let RoutingSNFsResults = await pool.query(
//   'SELECT rte_edi_acct_id FROM public."Routing_SNFs" WHERE rte_cus_id = $1 AND TRIM(rte_isa_id) = $2 AND rte_isa_qual = $3 AND rte_transactions @> ARRAY[$4::varchar]',
//   [CustomerID, Header.hdr_ircv_id.trim(), Header.hdr_ircv_qual.trim(), '846']
// );
  // let multipleSNFs = multipleSNFsResults.rows;

  // if (RoutingSNFsResults.rows.length > 0) {
  //  await Promise.all(RoutingSNFsResults.rows.map(async row => {
  
  //     //await getAddressPriority(row.rte_edi_acct_id, Branch, '863', pool);
  //     let { address_priority_1, address_priority_2, address_priority_3, address_priority_4 } = await getAddressPriority(row.rte_edi_acct_id, Branch, '846', pool);

  //     let { priority_1, priority_2 } = await getPrioritySettings(row.rte_edi_acct_id, Branch, '846', pool);
  //     let snf = await writeSNF(pkey, pool, Header, Detail, Names, Measurements, PIDs, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4);
  //     multiSNFS.push(snf);
  // }));
  // }
      let snf = await writeSNF(pkey, pool, Header, Detail, Names, Measurements, PIDs);
      multiSNFS.push(snf);

  return multiSNFS;
  // let multipleSNFsResults = await pool.query('SELECT * FROM public."Duplicate_SNFs" WHERE dup_cus_id = $1', [global.CustomerID]);
  // let multipleSNFs = multipleSNFsResults.rows;
  // let snf = await writeSNF(pkey, pool, Header, Detail, Names, Measurements);
  // multiSNFS.push(snf);
  // if (multipleSNFs.length > 0) {
  //   Header.hdr_isa_qual = multipleSNFs[0].dup_isa_qual;
  //   Header.hdr_isnd_id = multipleSNFs[0].dup_isnd_id;
  //   let snf = await writeSNF(pkey, pool, Header, Detail, Names, Measurements);
  //   multiSNFS.push(snf);
  // }

  // return multiSNFS;

}

async function writeSNF(pkey, pool, Header, Detail, Names, Measurements, PIDs) {

  let outSNF = []
 console.log("Creating O846 for pkey:", pkey);
  //MARK: CT Record
  let CT = {
      "RECORD TYPE INDICATOR": "CT",
      "Record Key (10-digit integer)": pkey,
      "ISA Sender ID Qualifier": Header.hdr_isa_qual,
      "ISA Sender ID": Header.hdr_isnd_id,
      "GS Sender ID": Header.hdr_gsnd_id,
      "ISA Control Number": Header.hdr_ictl_no,
      "GS Functional Group ID": Header.hdr_func_no,
      "GS Control Number": Header.hdr_gctl_no,
      "ISA Receiver ID Qualifier": Header.hdr_ircv_qual,
      "ISA Receiver ID": Header.hdr_ircv_id,
      "GS Receiver ID": Header.hdr_ircv_id,
      "ST Control Number": Header.hdr_stctl_no,
      "ST Transaction Set ID": "846",
      "Plant ID Code Qualifier": null,
      "Plant ID Code": null,
      "Application System ID": "INVEX",
      "Production/Test Flag": "P",
      "Type (T=Toll; M=Margin; D=Direct Ship)": Header.hdr_type
      }
    CT.record_code = CT["RECORD TYPE INDICATOR"];
       outSNF.push(CT);

       //MARK: 10 Record
    let tenRecord = {
      "RECORD TYPE INDICATOR": "10",
      "Date Sent": Header.hdr_dsent,
      "Time Sent" : Header.hdr_tsent,
      "Transaction Set Purpose Code" : Header.hdr_purpcode,
  //    "Dock Code" : Header.hdr_dck_cd,  // Not in SNF format
      "Report Type Code": Header.hdr_type,
      "Report Reference ID": Header.hdr_rptrefid,
      "Report Date" : Header.hdr_dsent,
      "Report Time" : Header.hdr_tsent,
      "Action Code" : Header.hdr_actioncd,
      "Inventory Date" : Header.hdr_dsent,
      "Inventory Time" : Header.hdr_tsent,
      "Inventory Time Zone" : "ET",
      "Manufacturer ID Qualifier" : Header.hdr_mfgidq,
      "Manufacturer ID" : Header.hdr_mfgid,
      //"Equipment Number (suffix of \"Equip Initials\")" : Header.hdr_eq_nbr, // Not in SNF format
      "Outside Processor ID Qualifier" : Header.hdr_opidq,
      "Outside Processor ID" : Header.hdr_opid,
      }
    tenRecord.record_code = tenRecord["RECORD TYPE INDICATOR"];
        outSNF.push(tenRecord);

   //Overriding Addresses
let addressList = [];
// address_priority_1 ? await Promise.all(address_priority_1.map(async (Name) => {
//       //MARK: 11 Record
//       if (!addressList.includes(Name.ediaat_addr_typ_cde) && Name.ediaat_addr_id !== null) {
//         addressList.push(Name.ediaat_addr_typ_cde);
//       if (Name.ediaat_addr_id.trim() !== '') {  
//       let fifteenRecord = {
//         "RECORD TYPE INDICATOR": "15",
//         "AddressTypeCode": Name.ediaat_addr_typ_cde,
//         "Address ID": Name.ediaat_addr_id,
//         "Name": Name.name_name,
//         "Address Line 1": Name.name_addr1,
//         "Address Line 2": Name.name_addr2,
//         "City": Name.name_city,
//         "State/Province": Name.ediaat_state,
//         "Postal Code": Name.ediaat_zpcd,
//         "Customer Country Code": Name.ediaat_ctry_cd,
//         "Contact Name": Name.ediaat_cont_name,
//         "Contact Telephone": Name.ediaat_cont_phn,
//         "Contact Email": Name.ediaat_cont_eml,
//         "Address ID Qualifier": Name.ediaat_id_qual
//       }
//       fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
//       await outSNF.push(fifteenRecord);
//     }}
//     })) : null;

//     address_priority_2 ? await Promise.all(address_priority_2.map(async (Name) => {
//       //MARK: 11 Record
//       if (!addressList.includes(Name.ediaat_addr_typ_cde) && Name.ediaat_addr_id !== null) {
//         addressList.push(Name.ediaat_addr_typ_cde);
//          if (Name.ediaat_addr_id.trim() !== '') {  
//       let fifteenRecord = {
//         "RECORD TYPE INDICATOR": "15",
//         "AddressTypeCode": Name.ediaat_addr_typ_cde,
//         "Address ID": Name.ediaat_addr_id,
//         "Name": Name.name_name,
//         "Address Line 1": Name.name_addr1,
//         "Address Line 2": Name.name_addr2,
//         "City": Name.name_city,
//         "State/Province": Name.ediaat_state,
//         "Postal Code": Name.ediaat_zpcd,
//         "Customer Country Code": Name.ediaat_ctry_cd,
//         "Contact Name": Name.ediaat_cont_name,
//         "Contact Telephone": Name.ediaat_cont_phn,
//         "Contact Email": Name.ediaat_cont_eml,
//         "Address ID Qualifier": Name.ediaat_id_qual
//       }
//       fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
//       await outSNF.push(fifteenRecord);
//     }}
//     })) : null

//     address_priority_3 ? await Promise.all(address_priority_3.map(async (Name) => {
//       //MARK: 11 Record
//       if (!addressList.includes(Name.ediaat_addr_typ_cde) && Name.ediaat_addr_id !== null) {
//         addressList.push(Name.ediaat_addr_typ_cde);
//          if (Name.ediaat_addr_id.trim() !== '') {  
//       let fifteenRecord = {
//         "RECORD TYPE INDICATOR": "15",
//         "AddressTypeCode": Name.ediaat_addr_typ_cde,
//         "Address ID": Name.ediaat_addr_id,
//         "Name": Name.name_name,
//         "Address Line 1": Name.name_addr1,
//         "Address Line 2": Name.name_addr2,
//         "City": Name.name_city,
//         "State/Province": Name.ediaat_state,
//         "Postal Code": Name.ediaat_zpcd,
//         "Customer Country Code": Name.ediaat_ctry_cd,
//         "Contact Name": Name.ediaat_cont_name,
//         "Contact Telephone": Name.ediaat_cont_phn,
//         "Contact Email": Name.ediaat_cont_eml,
//         "Address ID Qualifier": Name.ediaat_id_qual
//       }
//       fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
//       await outSNF.push(fifteenRecord);
//     }}
//     })) : null;

//     address_priority_4 ? await Promise.all(address_priority_4.map(async (Name) => {
//       //MARK: 11 Record
//       if (!addressList.includes(Name.ediaat_addr_typ_cde) && Name.ediaat_addr_id !== null) {
//         addressList.push(Name.ediaat_addr_typ_cde);
//          if (Name.ediaat_addr_id.trim() !== '') {  
//       let fifteenRecord = {
//         "RECORD TYPE INDICATOR": "15",
//         "AddressTypeCode": Name.ediaat_addr_typ_cde,
//         "Address ID": Name.ediaat_addr_id,
//         "Name": Name.name_name,
//         "Address Line 1": Name.name_addr1,
//         "Address Line 2": Name.name_addr2,
//         "City": Name.name_city,
//         "State/Province": Name.ediaat_state,
//         "Postal Code": Name.ediaat_zpcd,
//         "Customer Country Code": Name.ediaat_ctry_cd,
//         "Contact Name": Name.ediaat_cont_name,
//         "Contact Telephone": Name.ediaat_cont_phn,
//         "Contact Email": Name.ediaat_cont_eml,
//         "Address ID Qualifier": Name.ediaat_id_qual
//       }
//       fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
//       await outSNF.push(fifteenRecord);
//     }}
//     })) : null;

//JSON Addresses
    await Promise.all(Names.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.name_nameq)  && Name.name_nameid !== null) {
        addressList.push(Name.name_nameq);
         if (Name.name_nameid !== '') {  
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.name_addresstype,
        "Address ID Qualifier": Name.name_nameq,
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
     }}}));
    

    //MARK: 30 Record
    const uniqueLines = [...new Set(Detail.map(d => d.dlt_det_seq_no))]; // .reverse();

for (const Lines of uniqueLines) {
// dtl_type, dtl_key, dlt_det_seq_no, dlt_line_asd_id, dlt_mo, dtl_mol, dtl_mcoil, dtl_heat, dtl_po, dtl_pol, dtl_pod, dtl_bpart, dtl_other, dtl_plistno, dtl_proc, dtl_prev, dtl_tagtyp, dtl_tag, dtl_lot, dtl_v_prod_no, dtl_cons_class, dtl_backout_cd, dtl_consignee_no, dtl_eff_dte, dtl_eff_tme, dtl_eff_tme_zn, dtl_inv_dte, dtl_inv_tme, dtl_inv_tme_zn, dtl_rcv_dte, dtl_iss_dte, dtl_qty_rtg_dte, dtl_qty_rtg_tme, dtl_qty_rtg_tme_zn, dtl_mat_class, dtl_mat_sts, dtl_act_wgt, dtl_gauge, dtl_gauge_tpe, dtl_width, dtl_lin_ft, dtl_unit_len, dtl_pcs, dtl_rcv_qty, dtl_use_qty, dtl_onhand_qty, dtl_sttx_locn, dtl_crt_dte, dtl_crt_tme, dtl_crt_pgm, dtl_flow_flag
  const Detail30 = Detail.find(d => d.dlt_det_seq_no === Lines)     
      let thirtyRecord = {
      "RECORD TYPE INDICATOR": "30",
      "Assigned ID": Detail30.dlt_line_asd_id,
      "Vendor (Mill) Order Number": Detail30.dlt_mo,
      "Vendor (Mill) Item/Line Number": Detail30.dtl_mol,
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
      "Status Date": Detail30.dtl_crt_dte,
      "Status Time": Detail30.dtl_crt_tme,
      "Status Time Zone": 'ET',
      "Inventory Date": Detail30.dtl_crt_dte,
      "Inventory Time": Detail30.dtl_crt_tme,
      "Inventory Time Zone": 'ET',
      "Purchase Order Date": Detail30.dtl_pod ? Detail30.dtl_pod : null,   // Comming from p#PODT EIOPRFRG in AS400
      "Purchase Order Time": null,  // not populated in AS400
      "Purchase Order Time Zone": 'ET',  
      "Process Date": null,  //comming from TGHCRDT in AS400
      "Process Time": null,  // comming from TGHCRTM in AS400
      "Process Time Zone": 'ET',
      "Material Classification (AISI Table 67)": Detail30.dtl_mat_class ? Detail30.dtl_mat_class : '01',    //eiirapp1. Ermcls or EIIASNL3. E8mcls
      "Material Classification Description": null,  // comming from EITCP1. EITCD in AS400
      "Material Status (AISI Table 70)": Detail30.dtl_mat_sts, //If RAW/RTS Comming from EIMSTSLC . E1MSTS; If FG then '1', If WIP then '7' in AS400
      "Material Status Description": null,  // comming from EITCP1. EITCD in AS400
      "Actual Weight (LB)": Detail30.dtl_act_wgt,
      "Actual Weight (KG)": null, // (Detail30.dtl_act_wgt * 2.20462) ? (Detail30.dtl_act_wgt * 2.20462) = 0 : null,
      "Theoretical Weight (LB)": null, //comming from TGCTWLB in AS400
      "Theoretical Weight (KG)": null, //comming from TGCTWKG in AS400
      "Gauge (IN)": Detail30.dtl_gauge,
      "Gauge (MM)": null, //(Detail30.dtl_gauge * 25.4) ? (Detail30.dtl_gauge * 25.4) = 0 : null, 
      "Gauge Type (NOM/MIN/ACT)": Detail30.dtl_gauge_tpe,
      "Width (IN)": Detail30.dtl_width,
      "Width (MM)": null, //(Detail30.dtl_width * 25.4) ? (Detail30.dtl_width * 25.4) = 0 : null, 
      "Linear Feet": Detail30.dtl_lin_ft,
      "Linear Meters": null, // (Detail30.dtl_lin_ft / 3.281) ? (Detail30.dtl_lin_ft / 3.281) = 0 : null,
      "Unit Length (IN)": Detail30.dtl_unit_len,
      "Unit Length (MM)":  null, //(Detail30.dtl_unit_len * 25.4) ? (Detail30.dtl_unit_len * 25.4) = 0 : null, 
      "Pieces": Detail30.dtl_pcs,
      "Responsible Party Alpha Code": null, //Comming from customer Function 68 in AS400 using program UT5000RG
      "Responsible Party Number Code": null, //Comming from customer Function 68 in AS400 using program UT5000RG
      "MSA#": null, // Comming from multiple tables in AS400
      "Received/Created Date": Detail30.dtl_rcv_dte,
      "Issue Date": Detail30.dtl_iss_dte,
      "Quality Rating Date": Detail30.dtl_qty_rtg_dte, 
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
      "Original I856 Gauge (IN)": null, //comming from EIIASNL3. E8thck in AS400 
      "Original I856 Gauge (MM)": null, 
      "Original I856 Gauge Type": null, //Comming from EIIASNL3 in AS400 'NOM', 'MAX' & 'MIN' are the values 
      "Tag serial Build Layout": null, // Comming from TCF100RG; else k#T1Tag in AS400
      "License Plate Number": null, // Comming from MSBELCP2. MONUMB in AS400,
      "Inside Diameter (IN)": null, // Comming from TGCIDIN in AS400
      "Inside Diameter (MM)": null,
      "Outside Diameter (IN)": null, // Comming from TGCODIN in AS400
      "Outside Diameter (MM)": null,
    }
    thirtyRecord.record_code = thirtyRecord["RECORD TYPE INDICATOR"];
    outSNF.push(thirtyRecord);
      // await Promise.all(Detail.map(async (Detail40) => {
    
    //MARK: 33 Record
  //   const MatchingPIDs = PIDs.filter(dn =>
  //     (dn.pid_dtl_seq_no === Detail30.dlt_det_seq_no)
  //   )

  //    for (const PIDSeg of MatchingPIDs) {
  //   let ThirtyThreeRecord = {
  //     "RECORD TYPE INDICATOR": "33",
  //     "Item Description Type": PIDSeg.pid_itm_dsc_typ,
  //     "Product/Process Characteristic Code": PIDSeg.pid_prd_char_cde,
  //     "Agency Qualifier Code": PIDSeg.pid_agencyqualcd,
  //     "Product Description Code": PIDSeg.pid_prddesccd,
  //     "Description": PIDSeg.pid_pid_desc,
  //     "Surface/Layer/Position Code": PIDSeg.pid_surfposcd,
  //     "Source Subqualifier": PIDSeg.pid_srcsubq,
  //     "Condition/Response Code": PIDSeg.pid_cond_rsp_cde,
  //     "Language Code": PIDSeg.pid_lang_cde,

 
  //   }
  //   ThirtyThreeRecord.record_code = ThirtyThreeRecord["RECORD TYPE INDICATOR"];
  //   outSNF.push(ThirtyThreeRecord);
  // };
        //MARK: 36 Record

//         const MatchingMEAs = Measurements.filter(ms =>
//       (ms.msr_dtl_seq_no === Detail30.dlt_det_seq_no)
//     )

//      for (const MEASeg of MatchingMEAs) {

//     let ThirtySixRecord = {
//       "RECORD TYPE INDICATOR": "36",
//       "Measurement Reference ID Code": MEASeg.msr_measr,
//       "Measurement Qualifier": MEASeg.msr_measq,
//       "Measurement Value": await trimTrailingZeros(MEASeg.msr_measval),
//       "Unit Of Measure": MEASeg.msr_measuom,
//       "Range Minimum": MEASeg.msr_mea3f,
//       "Range Maximum": MEASeg.msr_mea3t
//       }
//     ThirtySixRecord.record_code = ThirtySixRecord["RECORD TYPE INDICATOR"];
//     outSNF.push(ThirtySixRecord);
// };

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

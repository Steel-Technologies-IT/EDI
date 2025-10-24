const trimZeros = require('../../functions/trimtrailingzeros.js');
const chopOffDecimals = require('../../functions/chopoffdecimals.js');
const { evaluatePriority, getPrioritySettings, getAddressPriority } = require('../../functions/evaluatePriority.js');
const { get830forreference, get862forreference, get850forreference, get860forreference } = require('./O861_retrieve.js');
const as400Service = require('../../as400/callLoadNumber.js');
async function SNFCreateO861(pkey, pool, CustomerID, Branch ) {


  let headerResults = await pool.query('SELECT * FROM public."861_SNF_Header" WHERE hdr_key = $1', [pkey]);
  let Header = headerResults.rows[0];
  let detailsResults = await pool.query('SELECT * FROM "861_SNF_Detail" WHERE dtl_key = $1', [pkey]);
  let Detail = detailsResults.rows;
  let namesResults = await pool.query('SELECT * FROM "861_SNF_Names" WHERE name_key = $1', [pkey]);
  let Names = namesResults.rows;


   let _850_results = await get850forreference(pool, Detail[0].dtl_cpart, Detail[0].dtl_po, Detail[0].dtl_pol, Detail[0].dtl_rls, Header.hdr_isnd_id, '', null);
   let _850 = _850_results.rows;
   let _860_results = await get860forreference(pool, Detail[0].dtl_cpart, Detail[0].dtl_po, Detail[0].dtl_pol, Detail[0].dtl_rls, Header.hdr_isnd_id, '', null);
   let _860 = _860_results.rows;
   let _830_results = await get830forreference(pool, Detail[0].dtl_cpart, Header.crt_dte, Header.hdr_isnd_id);
   let _830 = _830_results.rows;
   let _862_results = await get862forreference(pool, Detail[0].dtl_cpart, Header.crt_dte, Header.hdr_isnd_id);
   let _862 = _862_results.rows;
   let _856_results = await get856forreference(pool, Detail[0].dtl_ccoil, Detail[0].dtl_olin01, Detail[0].dtl_ilin01);
   let _856 = _856_results.rows;

   let multiSNFs = []
   console.log("Checking for multiple SNFs for pkey:", CustomerID);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_id);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_qual);
  //
   let RoutingSNFsResults = await pool.query(
  'SELECT rte_edi_acct_id FROM public."Routing_SNFs" WHERE rte_cus_id = $1 AND TRIM(rte_isa_id) = $2 AND rte_isa_qual = $3 AND rte_transactions @> ARRAY[$4::varchar]',
  [CustomerID, Header.hdr_ircv_id.trim(), Header.hdr_ircv_qual, '861']
);
  // let multipleSNFs = multipleSNFsResults.rows;

  if (RoutingSNFsResults.rows.length > 0) {
   await Promise.all(RoutingSNFsResults.rows.map(async row => {

      let { address_priority_1, address_priority_2, address_priority_3, address_priority_4 } = await getAddressPriority(row.rte_edi_acct_id, Branch, '861', pool);
      let trading_partner_info_results = await pool.query(
  'SELECT * FROM public."EDI_Accounts" WHERE edia_edi_account_id = $1',
  [row.rte_edi_acct_id]
);
      let trading_partner_info = trading_partner_info_results.rows[0];
      let location = Branch.toString().slice(-2);
      let { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config } = await getPrioritySettings(row.rte_edi_acct_id, Branch, '861', pool);
      let snf = await writeSNF(pkey, pool, Header, Detail, Names, _830, _850, _862, _860, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location);
      multiSNFs.push(snf);
  }));
  }

  return multiSNFs;

}

async function writeSNF(pkey, pool, Header, Detail, Names, _830, _850, _862, _860, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location) {


  let outSNF = []
 console.log("Creating O861 for pkey:", pkey);
  //MARK: CT Record
  let CT = {
      "RECORD TYPE INDICATOR (\"CT\")" : "CT",
      "Record Key (10-digit integer)": pkey,
      "ISA Sender ID Qualifier": Header.hdr_isnd_qual,
      "ISA Sender ID": Header.hdr_isnd_id,
      "GS Sender ID": Header.hdr_gsnd_id,
      "ISA Control Number": Header.hdr_ictl_no,
      "GS Functional Group ID": await evaluatePriority(priority_1, priority_2, Header.hdr_func_no, 'GS Functional Group ID', 'CT'),
      "ISA Receiver ID Qualifier": await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_qual, 'ISA Receiver ID Qualifier', 'CT'),
      "ISA Receiver ID": await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_id, 'ISA Receiver ID', 'CT'),
      "GS Receiver ID": await evaluatePriority(priority_1, priority_2, Header.hdr_grcv_id, 'GS Receiver ID', 'CT'),
      "ST Control Number": await evaluatePriority(priority_1, priority_2, Header.hdr_stctl_no, 'ST Control Number', 'CT'),
      "ST Transaction Set ID": '861',
      "Plant ID Code Qualifier": await evaluatePriority(priority_1, priority_2, Header.hdr_plant_id_qual, 'Plant ID Code Qualifier', 'CT'),
      "Plant ID Code": await evaluatePriority(priority_1, priority_2, Header.hdr_plant_id, 'Plant ID Code', 'CT'),
      "Application System ID": 'INVEX',
      "Production/Test Flag" : 'P',
      "Type (T=Toll; M=Margin; D=Direct Ship)" : Header.hdr_type
    }
    CT.record_code = CT["RECORD TYPE INDICATOR (\"CT\")"];
    await outSNF.push(CT);

    //MARK: 10 Record
    let tenRecord = {
      "RECORD TYPE INDICATOR": "10",
      "Shipment ID":hdr_shp_no,
      "Receipt Date":hdr_rcpt_date,
      "Transaction Set Purpose Code":hdr_purp_cd,
      "Rcpt or Acceptance Type Code":hdr_rcpt_typ_cd,
      "Receipt Time":hdr_rcpt_time,
      "Bill Of Lading Number":hdr_bol_no,
      "Shipment Notice/Manifest Number":hdr_mbol_no,
      "Received Date":hdr_rcv_dte,
      "Received Time":hdr_rcv_time,
      "Received Time Zone":hdr_rcv_tme_zn,
      "Date Sent":hdr_date_sent,       
      "Time Sent":hdr_time_sent,
      "Shipped Date":await evaluatePriority(priority_1, priority_2, Header.hdr_shp_dte, 'Shipped Date', '10'),
      "Shipped Time":await evaluatePriority(priority_1, priority_2, Header.hdr_shp_tme, 'Shipped Time', '10'),
      "Shipped Time Zone":await evaluatePriority(priority_1, priority_2, Header.hdr_shp_tzn, 'Shipped Time Zone', '10'),
      "Process Date":await evaluatePriority(priority_1, priority_2, Header.hdr_prc_dte, 'Process Date', '10'),
      "Process Time":await evaluatePriority(priority_1, priority_2, Header.hdr_prc_tme, 'Process Time', '10'),
      "Process Time Zone":await evaluatePriority(priority_1, priority_2, Header.hdr_prc_tzn, 'Process Time Zone', '10'),
      "SCAC":await evaluatePriority(priority_1, priority_2, Header.hdr_scac, 'SCAC', '10'),
      "Trailer Number":await evaluatePriority(priority_1, priority_2, Header.hdr_trl_no, 'Trailer Number', '10'),
    }
    tenRecord.record_code = tenRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(tenRecord);
    

//Overriding Addresses
let addressList = [];
address_priority_1 ? await Promise.all(address_priority_1.map(async (Name) => {
      //MARK: 11 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde)) {
        addressList.push(Name.ediaat_addr_typ_cde);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID Qualifier": Name.ediaat_id_qual,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Additional Name 1": null,
        "Additional Name 2": null,
        "Address Line 1": Name.ediaat_addr_line1,
        "Address Line 2": Name.ediaat_addr_line2,
        "City": Name.ediaat_city,
        "State/Province": Name.ediaat_state_prov,
        "Postal Code": Name.ediaat_postal_cd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Contact Name": Name.ediaat_cont_name,
        "Contact Telephone": Name.ediaat_cont_phn,
        "Contact Fax": Name.ediaat_cont_fax,
        "Contact Email": Name.ediaat_cont_eml,
        "Responsible Party Code": Name.ediaat_resp_party_cd,
        "Vendor's DUNS Number": Name.ediaat_vendor_duns,
        "Vendor's Manufacturer's DUNS Number": Name.ediaat_vendor_manuf_duns

      }
      elevenRecord.record_code = elevenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(elevenRecord);
    }
    })) : null;

    address_priority_2 ? await Promise.all(address_priority_2.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde)) {
        addressList.push(Name.ediaat_addr_typ_cde);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Additional Name 1": null,
        "Additional Name 2": null,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Contact Name": Name.ediaat_cont_name,
        "Contact Telephone": Name.ediaat_cont_phn,
        "Contact Fax": Name.ediaat_cont_fax,
        "Contact Email": Name.ediaat_cont_eml,
        "Responsible Party Code": Name.ediaat_resp_party_cd,
        "Vendor's DUNS Number": Name.ediaat_vendor_duns,
        "Vendor's Manufacturer's DUNS Number": Name.ediaat_vendor_manuf_duns
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
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Additional Name 1": null,
        "Additional Name 2": null,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Contact Name": Name.ediaat_cont_name,
        "Contact Telephone": Name.ediaat_cont_phn,
        "Contact Fax": Name.ediaat_cont_fax,
        "Contact Email": Name.ediaat_cont_eml,
        "Responsible Party Code": Name.ediaat_resp_party_cd,
        "Vendor's DUNS Number": Name.ediaat_vendor_duns,
        "Vendor's Manufacturer's DUNS Number": Name.ediaat_vendor_manuf_duns
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
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Additional Name 1": null,
        "Additional Name 2": null,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Contact Name": Name.ediaat_cont_name,
        "Contact Telephone": Name.ediaat_cont_phn,
        "Contact Fax": Name.ediaat_cont_fax,
        "Contact Email": Name.ediaat_cont_eml,
        "Responsible Party Code": Name.ediaat_resp_party_cd,
        "Vendor's DUNS Number": Name.ediaat_vendor_duns,
        "Vendor's Manufacturer's DUNS Number": Name.ediaat_vendor_manuf_duns
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);
    }
    })) : null;


//JSON Addresses
    await Promise.all(Names.map(async (Name) => {
      //MARK: 11 Record
      if (!addressList.includes(Name.name_qual)) {
        addressList.push(Name.name_qual);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.name_qual,
        "Address ID": Name.name_id,
        "Name": Name.name_name,
        "Additional Name 1": null,
        "Additional Name 2": null,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.name_state,
        "Postal Code": Name.name_zpcd,
        "Customer Country Code": Name.name_ctry_cd,
        "Contact Name": Name.name_cont_name,
        "Contact Telephone": Name.name_cont_phn,
        "Contact Email": Name.name_cont_eml,
        "Responsible Party Code": Name.name_resp_party_cd,
        "Vendor's DUNS Number": Name.name_vendor_duns,
        "Vendor's Manufacturer's DUNS Number": Name.name_vendor_manuf_duns
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);}
    }));

    await Promise.all(thirtyRecord.map(async (thirtyRecord) => {
    let thirtyRecord = {
        "RECORD TYPE INDICATOR": "30",
        "Quantity of Units Received": Detail.dtl_rcv_qty,
        "Unit of Measure": Detail.dtl_uom,//-check1
        "Vendor (Mill) Order Number": Detail.dtl_mo,
        "Vendor (Mill) Item/Line Number": Detail.dtl_mol,
        "Heat Number": Detail.dtl_heat,
        "Mill Coil Number": Detail.dtl_mcoil,
        "Purchase Order Number": Detail.dtl_po,
        "Purchase Order Line Number": Detail.dtl_pol,
        "Part Number": Detail.dtl_cpart,
        "Grade Code": Detail.dtl_grcd,
        "Received As Tag Number": Detail.dtl_tag_lot,
        //"MSA#": Detail.dtl_msa_num,        
        "Delivery Order Number": null,
        "Next Identifier": null,
        "Material Classification (Table 67)": await evaluatePriority(priority_1, priority_2, Detail.dtl_mcls_67, 'Material Classification (table 67)', '30'),
        //"Material Classification Description": Detail.dtl_material_classification_desc, Need transalation rule ??
        "Material Status (Table 70)": Detail.dtl_msts70,
        //"Material Status Description": Detail.dtl_material_status_desc, Need transalation rule ??
        "Reason/Fault Code (Table 72)": Detail.dtl_falt72,
        //"Reason/Fault Description": Detail.dtl_reason_fault_desc, Need transalation rule ??
        "Reason/Damage Code (Table 73)": Detail.dtl_scr_73,
        //"Reason/Damage Description": Detail.dtl_reason_damage_desc, Need transalation rule ??
        "Number of Pieces": Detail.dtl_pcs,
        "Actual Weight (LB)": Detail.dtl_awgtlb,
        "Actual Weight (KG)": Detail.dtl_awgtkg,
        "Theoretical Weight (LB)": Detail.dtl_twgtlb,
        "Theoretical Weight (KG)": Detail.dtl_twgtkg,
        "Gauge (IN)": Detail.dtl_gaugin,
        "Gauge (MM)": Detail.dtl_gaugmm,
        "Gauge Type (NOM; MIN; blanks)": Detail.dtl_gaugt,
        "Width (IN)": Detail.dtl_widin,
        "Width (MM)": Detail.dtl_widmm, 
        "Unit Length (IN)": Detail.dtl_unit_length_in,
        "Unit Length (MM)": Detail.dtl_ulenmm, 
        "Lineal Feet (FT)": Detail.dtl_lnft,
        "Lineal Meters (MT)": Detail.dtl_lnmt,
        "Inside Diameter (IN)": Detail.dtl_idin,
        "Inside Diameter (MM)": Detail.dtl_idmm,
        "Outside Diameter (IN)": Detail.dtl_odin,
        "Outside Diameter (MM)": Detail.dtl_odmm,
        "Responsible Party Alpha Code": await evaluatePriority(priority_1, priority_2, null, 'Responsible Party Alpha Code', '30'), //Customer Config
        "Responsible Party Number Code": await evaluatePriority(priority_1, priority_2, null, 'Responsible Party Number Code', '30'), //Customer Config
        "Purchase Order Date": Detail.dtl_pod,
        "Change Order Sequence Number": Detail.dtl_prt_rev_no,
        "Release Number": Detail.dtl_rls,
        "(STTX) Tag Type": null,
        "(STTX) Tag Number": Detail.dtl_tag_lot, 
        //"Previous (processor) Coil ID": Detail.dtl_prev_processor_coil_id, "NOT in JSON??
        "Status Date": Detail.dtl_sts_dte,
        "Status Time": Detail.dtl_sts_tme,
        "Status Time Zone": Detail.dtl_sts_tme_zn,
        "Quality Rating Date": Detail.dtl_qua_rtg_dte,
        "Quality Rating Time": Detail.dtl_qua_rtg_tme,
        "Quality Rating Time Zone": Detail.dtl_qua_rtg_tme_zn,
        "Quantity of Units Returned": Detail.dtl_ret_qty,
        "Qty Returned UOM": Detail.dtl_dtl_ret_qty_uom,
        "Quantity in Question": Detail.dtl_qty_in_ques,
        "Qty in Question UOM": Detail.dtl_qty_in_ques_uom,
        "Receiving Condition Code": Detail.dtl_rcv_cond_cd,
        "Returnable Container Number": Detail.dtl_rtn_cnt_no,
        "Customer Reference Number": Detail.dtl_cst_ref_no,
        "Packing List Number": Detail.dtl_pck_lst_no,
        "Item Mill Order Number": Detail.dtl_mo,
        //"Override PO number": Detail.dtl_override_po_num, need to check JSON?? ASk?
        "Tag Serial Build Layout": Detail.dtl_tag_lot,
        "Consumed Coil ID from I856": Detail.dtl_ccoil,
        "I856 Order level line number LIN01": Detail.dtl_olin01, //"Need to pull from I856??" SNF_CRT/INSERT_SNF SNF table fetch logic. May be need to add field in 861 SNF"
        "I856 Item level line number LIN01": Detail.dtl_ilin01

    }
    thirtyRecord.record_code = thirtyRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(thirtyRecord);
  }));

//MARK: 90 Record
  let ninetyRecord = {
    "RECORD TYPE INDICATOR": "90",
    "Number of Line Items": Header.hdr_sum_rcd,
    "Hash Total": await evaluatePriority(priority_1, priority_2, Header.hdr_sum_hsh_ttl, 'Hash Total', '90'),
  }
  ninetyRecord.record_code = ninetyRecord["RECORD TYPE INDICATOR"];
  outSNF.push(ninetyRecord);

  return outSNF
}

module.exports = {
  SNFCreateO861
}
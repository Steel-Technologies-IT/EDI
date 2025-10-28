const trimZeros = require('../../functions/trimtrailingzeros.js');
const chopOffDecimals = require('../../functions/chopoffdecimals.js');
const { evaluatePriority, getPrioritySettings, getAddressPriority } = require('../../functions/evaluatePriority.js');
//const { get830forreference, get862forreference, get850forreference, get860forreference } = require('./O861_retrieve.js');
const as400Service = require('../../as400/callLoadNumber.js');
async function SNFCreateO861(pkey, pool, CustomerID, Branch, tradingPartner ) {


  let headerResults = await pool.query('SELECT * FROM public."861_SNF_Header" WHERE hdr_key = $1', [pkey]);
  let Header = headerResults.rows[0];
  let detailsResults = await pool.query('SELECT * FROM "861_SNF_Detail" WHERE dtl_key = $1', [pkey]);
  let Detail = detailsResults.rows;
  let namesResults = await pool.query('SELECT * FROM "861_SNF_Names" WHERE name_key = $1', [pkey]);
  let Names = namesResults.rows;


  //  let _850_results = await get850forreference(pool, Detail[0].dtl_cpart, Detail[0].dtl_po, Detail[0].dtl_pol, Detail[0].dtl_rls, Header.hdr_isnd_id, '', null);
  //  let _850 = _850_results.rows;
  //  let _860_results = await get860forreference(pool, Detail[0].dtl_cpart, Detail[0].dtl_po, Detail[0].dtl_pol, Detail[0].dtl_rls, Header.hdr_isnd_id, '', null);
  //  let _860 = _860_results.rows;
  //  let _830_results = await get830forreference(pool, Detail[0].dtl_cpart, Header.crt_dte, Header.hdr_isnd_id);
  //  let _830 = _830_results.rows;
  //  let _862_results = await get862forreference(pool, Detail[0].dtl_cpart, Header.crt_dte, Header.hdr_isnd_id);
  //  let _862 = _862_results.rows;


   let multiSNFS = []
   console.log("Checking for multiple SNFs for pkey:", CustomerID);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_id);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_qual);
  //
   let RoutingSNFsResults = await pool.query(
  'SELECT rte_edi_acct_id FROM public."Routing_SNFs" WHERE rte_cus_id = $1 AND TRIM(rte_isa_id) LIKE $2 AND rte_isa_qual = $3 AND rte_transactions @> ARRAY[$4::varchar]',
  [CustomerID, `${Header.hdr_ircv_id.trim()}%`, Header.hdr_ircv_qual, '861']
);
console.log(tradingPartner)
  // let multipleSNFs = multipleSNFsResults.rows;
if (tradingPartner && tradingPartner.length > 0) {
      let { address_priority_1, address_priority_2, address_priority_3, address_priority_4 } = await getAddressPriority(tradingPartner, Branch, '861', pool);

      let { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config } = await getPrioritySettings(tradingPartner, Branch, '861', pool);
      let snf = await writeSNF(pkey, pool, Header, Detail, Names, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config);
      multiSNFS.push(snf);
} else {
  if (RoutingSNFsResults.rows.length > 0) {
   await Promise.all(RoutingSNFsResults.rows.map(async row => {
  
      let { address_priority_1, address_priority_2, address_priority_3, address_priority_4 } = await getAddressPriority(row.rte_edi_acct_id, Branch, '861', pool);
      let trading_partner_info_results = await pool.query(
  'SELECT * FROM public."EDI_Accounts" WHERE edia_edi_account_id = $1',
  [row.rte_edi_acct_id]
);
      let trading_partner_info = trading_partner_info_results.rows[0];
      let location = Branch ? Branch.toString().slice(-2) : '';
      //let location = Branch.toString().slice(-2);
      let { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config } = await getPrioritySettings(row.rte_edi_acct_id, Branch, '861', pool);
      let snf = await writeSNF(pkey, pool, Header, Detail, Names, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location);
      multiSNFS.push(snf);
  }));
  }
}

  return multiSNFS;

}

async function writeSNF(pkey, pool, Header, Detail, Names, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location) {


  let outSNF = []
 console.log("Creating O861 for pkey:", pkey);
  //MARK: CT Record
  let CT = {
      "RECORD TYPE INDICATOR" : "CT",
      "Record Key (10-digit integer)": pkey,
      "ISA Sender ID Qualifier": Header.hdr_isnd_qual,
      "ISA Sender ID": Header.hdr_isnd_id,
      "GS Sender ID": Header.hdr_gsnd_id,
      "ISA Control Number": Header.hdr_ictl_no,
      "GS Functional Group ID": "RC",
      "ISA Receiver ID Qualifier": await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_qual, 'ISA Receiver ID Qualifier', 'CT'),
      "ISA Receiver ID": await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_id, 'ISA Receiver ID', 'CT'),
      "GS Receiver ID": await evaluatePriority(priority_1, priority_2, Header.hdr_grcv_id, 'GS Receiver ID', 'CT'),
      "ST Control Number": await evaluatePriority(priority_1, priority_2, Header.hdr_stctl_no, 'ST Control Number', 'CT'),
      "ST Transaction Set ID": '861',
      "Application System ID": 'INVEX',
      "Production/Test Flag" : 'P',
      "Type (T=Toll; M=Margin; D=Direct Ship)" : Header.hdr_type
    }
    CT.record_code = CT["RECORD TYPE INDICATOR"];
    await outSNF.push(CT);

    //MARK: 10 Record
    let tenRecord = {
      "RECORD TYPE INDICATOR": "10",
      "Shipment ID":Header.hdr_shp_no,
      "Receipt Date":Header.hdr_rcv_dte,
      "Transaction Set Purpose Code":Header.hdr_purp_cd,
      "Rcpt or Acceptance Type Code":Header.hdr_rcpt_typ_cd,
      "Receipt Time":Header.hdr_rcv_time,
      "Bill Of Lading Number":Header.hdr_bol_no,
      "Shipment Notice/Manifest Number":Header.hdr_mbol_no,
      "Received Date":Header.hdr_rcv_dte,
      "Received Time":Header.hdr_rcv_time,
      "Received Time Zone":Header.hdr_rcv_tme_zn,
      // "Shipped Date":await evaluatePriority(priority_1, priority_2, Header.hdr_shp_dte, 'Shipped Date', '10'),
      // "Shipped Time":await evaluatePriority(priority_1, priority_2, Header.hdr_shp_tme, 'Shipped Time', '10'),
      // "Shipped Time Zone":await evaluatePriority(priority_1, priority_2, Header.hdr_shp_tzn, 'Shipped Time Zone', '10'),
      // "Process Date":await evaluatePriority(priority_1, priority_2, Header.hdr_prc_dte, 'Process Date', '10'),
      // "Process Time":await evaluatePriority(priority_1, priority_2, Header.hdr_prc_tme, 'Process Time', '10'),
      // "Process Time Zone":await evaluatePriority(priority_1, priority_2, Header.hdr_prc_tzn, 'Process Time Zone', '10'),
      // "SCAC":await evaluatePriority(priority_1, priority_2, Header.hdr_scac, 'SCAC', '10'),
      // "Trailer Number":await evaluatePriority(priority_1, priority_2, Header.hdr_trl_no, 'Trailer Number', '10'),
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

   //MARK: 30 Record
    // Filter Detail for unique values based on all properties

 const uniqueLines = [...new Set(Detail.map(d => d.dtl_tag_lot))]; // .reverse();

for (const TagLots of uniqueLines) {

  const Detail30 = Detail.find(d => d.dtl_tag_lot === TagLots)
    let thirtyRecord = {
        "RECORD TYPE INDICATOR": "30",
        "Quantity of Units Received": Detail30.dtl_pcs,
        "Unit of Measure": Detail30.dtl_uom,//-check1
        "Vendor (Mill) Order Number": Detail30.dtl_mo,
        "Vendor (Mill) Item/Line Number": Detail30.dtl_mol,
        "Heat Number": Detail30.dtl_heat,
        "Mill Coil Number": Detail30.dtl_mcoil,
        "Purchase Order Number": Detail30.dtl_po,
        "Purchase Order Line Number": Detail30.dtl_pol,
        "Part Number": Detail30.dtl_cpart,
        "Grade Code": Detail30.dtl_grcd,
        //"Received As Tag Number": Detail.dtl_received_as_tag_num,
        //"MSA#": Detail.dtl_msa_num,
        //"Delivery Order Number": Detail.dtl_delivery_order_num,
        //"Next Identifier": Detail.dtl_next_identifier,
        "Material Classification (Table 67)": await evaluatePriority(priority_1, priority_2, Detail30.dtl_mcls_67, 'Material Classification (table 67)', '30'),
        //"Material Classification Description": Detail.dtl_material_classification_desc,
        "Material Status (Table 70)": Detail30.dtl_msts70,
        //"Material Status Description": Detail.dtl_material_status_desc,
        "Reason/Fault Code (Table 72)": Detail30.dtl_falt72,
        //"Reason/Fault Description": Detail.dtl_reason_fault_desc,
        "Reason/Damage Code (Table 73)": Detail30.dtl_scr_73,
        //"Reason/Damage Description": Detail.dtl_reason_damage_desc,
        //"Number of Pieces": Detail.dtl_num_pieces,
        "Actual Weight (LB)": Detail30.dtl_awgtlb,
        "Actual Weight (KG)": Detail30.dtl_awgtkg,
        "Theoretical Weight (LB)": Detail30.dtl_twgtlb,
        "Theoretical Weight (KG)": Detail30.dtl_twgtkg,
        "Gauge (IN)": Detail30.dtl_gaugin,
        "Gauge (MM)": Detail30.dtl_gaugmm,
        "Gauge Type (NOM; MIN; blanks)": Detail30.dtl_gaugt,
        "Width (IN)": Detail30.dtl_widin,
        //"Width (MM)": Detail.dtl_widmm,
        "Unit Length (IN)": Detail30.dtl_unit_length_in,
        //"Unit Length (MM)": Detail.dtl_ulenmm,
        "Lineal Feet (FT)": Detail30.dtl_lnft,
        "Lineal Meters (MT)": Detail30.dtl_lnmt,
        "Inside Diameter (IN)": Detail30.dtl_idin,
        "Inside Diameter (MM)": Detail30.dtl_idmm,
        "Outside Diameter (IN)": Detail30.dtl_odin,
        "Outside Diameter (MM)": Detail30.dtl_odmm,
        //"Responsible Party Alpha Code": Detail.dtl_resp_party_alpha_cd,
        //"Responsible Party Number Code": Detail.dtl_resp_party_num_cd,
        "Purchase Order Date": Detail30.dtl_pod,
        "Change Order Sequence Number": await evaluatePriority(priority_1, priority_2, Detail30.dtl_prt_rev_no, 'Change Order Sequence Number', '30'),
        "Release Number": Detail30.dtl_rls,
        //"(STTX) Tag Type": Detail.dtl_sttx_tag_type,
        //"(STTX) Tag Number": Detail.dtl_sttx_tag_num,
        //"Previous (processor) Coil ID": Detail.dtl_prev_processor_coil_id,
        "Status Date": Detail30.dtl_sts_dte,
        "Status Time": Detail30.dtl_sts_tme,
        "Status Time Zone": Detail30.dtl_sts_tme_zn,
        "Quality Rating Date": Detail30.dtl_qua_rtg_dte,
        "Quality Rating Time": Detail30.dtl_qua_rtg_tme,
        "Quality Rating Time Zone": Detail30.dtl_qua_rtg_tme_zn,
        "Quantity of Units Returned": Detail30.dtl_ret_qty,
        "Qty Returned UOM": Detail30.dtl_dtl_ret_qty_uom,
        "Quantity in Question": Detail30.dtl_qty_in_ques,
        "Qty in Question UOM": Detail30.dtl_qty_in_ques_uom,
        "Receiving Condition Code": Detail30.dtl_rcv_cond_cd,
        "Returnable Container Number": Detail30.dtl_rtn_cnt_no,
        "Customer Reference Number": Detail30.dtl_cst_ref_no,
        "Packing List Number": Detail30.dtl_pck_lst_no,
        "Item Mill Order Number": Detail30.dtl_mo,
        //"Override PO number": Detail.dtl_override_po_num,
        //"Tag Serial Build Layout": Detail.dtl_tag_serial_build_layout,
        //"Consumed Coil ID from I856": Detail.dtl_consumed_coil_id_i856,
        //"I856 Order level line number LIN01": Detail.dtl_i856_order_level_line_num_lin01,
        //"I856 Item level line number LIN01": Detail.dtl_i856_item_level_line_num_lin01
     };
  thirtyRecord.record_code = thirtyRecord["RECORD TYPE INDICATOR"];
  await outSNF.push(thirtyRecord);
  //_30index = overallindex;
  //overallindex = overallindex + 1;
}

//MARK: 80 Record
  let ninetyRecord = {
    "RECORD TYPE INDICATOR": "90",
    "Number of Line Items": "1",
    "Hash Total": await evaluatePriority(priority_1, priority_2, Header.hdr_sum_hsh_ttl, 'Hash Total', '90'), // Header.hdr_sum_hsh_ttl,
  }
  ninetyRecord.record_code = ninetyRecord["RECORD TYPE INDICATOR"];
  outSNF.push(ninetyRecord);


  return outSNF
}

module.exports = {
  SNFCreateO861
}
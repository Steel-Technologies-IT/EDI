const trimTrailingZeros = require('../../functions/trimtrailingzeros.js');


async function SNFCreateO861(pkey, pool) {

  let headerResults = await pool.query('SELECT * FROM public."861_SNF_Header" WHERE hdr_key = $1', [pkey]);
  let Header = headerResults.rows[0];
  let detailsResults = await pool.query('SELECT * FROM "861_SNF_Detail" WHERE dtl_key = $1', [pkey]);
  let Detail = detailsResults.rows;
  let namesResults = await pool.query('SELECT * FROM "861_SNF_Names" WHERE name_key = $1', [pkey]);
  let Names = namesResults.rows;


  //Load SNF Tables
  let multiSNFS = []
  let multipleSNFsResults = await pool.query('SELECT * FROM public."Duplicate_SNFs" WHERE dup_cus_id = $1', [global.CustomerID]);
  let multipleSNFs = multipleSNFsResults.rows;
  let snf = await writeSNF(pkey, pool, Header, Detail, Names);
  multiSNFS.push(snf);
  if (multipleSNFs.length > 0) {
    Header.hdr_isa_qual = multipleSNFs[0].dup_isa_qual;
    Header.hdr_isnd_id = multipleSNFs[0].dup_isnd_id;
    let snf = await writeSNF(pkey, pool, Header, Detail, Names);
    multiSNFS.push(snf);
  }

  return multiSNFS;

}

async function writeSNF(pkey, pool, Header, Detail, Names) {

  let outSNF = []
 console.log("Creating O861 for pkey:", pkey);
  //MARK: CT Record
  let CT = {
      "RECORD TYPE INDICATOR (\"CT\")" : "CT",
      "Record Key (10-digit integer)": pkey,
      "ISA Sender ID Qualifier": Header.hdr_isa_qual,
      "ISA Sender ID": Header.hdr_isnd_id,
      "GS Sender ID": Header.hdr_gsnd_id,
      "ISA Control Number": Header.hdr_ictl_no,
      "GS Functional Group ID": Header.hdr_func_no,
      "GS Control Number": Header.hdr_gctl_no,
      "ISA Receiver ID Qualifier": Header.hdr_ircv_qual,
      "ISA Receiver ID": Header.hdr_ircv_id,
      "GS Receiver ID": Header.hdr_grcv_id,
      "ST Control Number": Header.hdr_stctl_no,
      "ST Transaction Set ID": null,
      "Plant ID Code Qualifier": null,
      "Plant ID Code": null,
      "Application System ID": null,
      "Production/Test Flag": null,
      "Type (T=Toll; M=Margin; D=Direct Ship)": Header.hdr_type
      }
    CT.record_code = CT["RECORD TYPE INDICATOR (\"CT\")"];
    outSNF.push(CT);
    

    //MARK: 10 Record
    let tenRecord = {
      "RECORD TYPE INDICATOR": "10",
      "Shipment ID": Header.hdr_shp_no,
      "Receipt Date": Header.hdr_rcpt_date,
      "Transaction Set Purpose Code": Header.hdr_purp_cd,
      "Rcpt or Acceptance Type Code": Header.hdr_rcpt_typ_cd, 
      "Receipt Time": Header.hdr_rcpt_tme,
      "Bill Of Lading Number": Header.hdr_bol_no,
      "Shipment Notice/Manifest Number": Header.hdr_mbol_no,
      "Received Date": Header.hdr_rcv_dte,
      "Received Time": Header.hdr_rcv_tme,
      "Received Time Zone": Header.hdr_rcv_tme_zn,
      "Date Sent": Header.hdr_date_sent,
      "Time Sent": Header.hdr_time_sent,
      "Shipped Date": Header.hdr_shp_dte,
      "Shipped Time": Header.hdr_shp_tme,
      "Shipped Time Zone": Header.hdr_shp_tzn,
      "Process Date": Header.hdr_prc_dte,
      "Process Time": Header.hdr_prc_tme,
      "Process Time Zone": Header.hdr_prc_tzn,
      "SCAC": Header.hdr_scac,
      "Trailer Number": Header.hdr_trl_no
    }

    tenRecord.record_code = tenRecord["RECORD TYPE INDICATOR"];
    outSNF.push(tenRecord);


    await Promise.all(Names.map(async (Name) => {
      //MARK: 15 Record
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.name_qual,
        "Address ID Qualifier": Name.name_qual_id,
        "Address ID": Name.name_id,
        "Name": Name.name_name,
        "Additional Name 1": null,          //not populated in as400
        "Additional Name 2": null,          //not populated in as400  
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.name_state,
        "Postal Code": Name.name_zpcd,
        "Customer Country Code": Name.name_ctry_cd,
        "Contact Name": Name.name_cont_name,
        "Contact Telephone": Name.name_cont_phn,
        "Contact Fax": null,               //not populated in as400
        "Contact Email": Name.name_cont_eml,
        "Responsible Party Code": Name.name_resp_cd,
        "Vendor's DUNS Number": null,                 // PIVENA.Vendunnbr 
        "Vendor's Manufacturer's DUNS Number": null   // refer to SNF mapping document


      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      outSNF.push(fifteenRecord);
    }));
    
    
    //MARK: 30 Record
    // Filter Detail for unique values based on all properties
    // Get unique dtl_hl1 values for 30 records
const uniqueHL1s = [...new Set(Detail.map(d => d.dtl_hl1))];

for (const hl1 of uniqueHL1s) {
  // Find the first detail record for this hl1 (for 30 record fields)
  const Detail30 = Detail.find(d => d.dtl_hl1 === hl1);

  let thirtyRecord = {

    "RECORD TYPE INDICATOR": "30",
    "Quantity of Units Received": Detail30.dtl_rcv_qty,
    "Unit of Measure": Detail30.dtl_rcv_qty_uom,
    "Vendor (Mill) Order Number": Detail30.dtl_mo,
    "Vendor (Mill) Item/Line Number": Detail30.dtl_mol,
    "Heat Number": Detail30.dtl_heat,
    "Mill Coil Number": Detail30.dtl_mcoil,
    "Purchase Order Number": Detail30.dtl_po,
    "Purchase Order Line Number": Detail30.dtl_pol,
    "Part Number": Detail30.dtl_cpart,
    "Grade Code": Detail30.dtl_grcd,
    "Received As Tag Number": Detail30.dtl_proc,
   // "MSA#": Detail30.dtl_msa,
    // "Delivery Order Number": Detail30.dtl_don,
    //"Next Identifier": Detail30.dtl_nid,
    "Material Classification (Table 67)": Detail30.dtl_mcls67,
    //"Material Classification Description": Detail30.dtl_mcls_desc,
    "Material Status (Table 70)": Detail30.dtl_msts70,
   // "Material Status Description": Detail30.dtl_msts_desc,
    "Reason/Fault Code (Table 72)": Detail30.dtl_falt72,
    //"Reason/Fault Description": Detail30.dtl_rfd72,
    "Reason/Damage Code (Table 73)": Detail30.dtl_scr_73,
    //"Reason/Damage Description": Detail30.dtl_rdd73,
   // "Number of Pieces": Detail30.dtl_pcs,
    "Actual Weight (LB)": Detail30.dtl_awgtlb,
    "Actual Weight (KG)": Detail30.dtl_awgtkg,
    "Theoretical Weight (LB)": Detail30.dtl_twgtlb,
    "Theoretical Weight (KG)": Detail30.dtl_twgtkg,
    "Gauge (IN)": Detail30.dtl_gaugin,
    "Gauge (MM)": Detail30.dtl_gaugmm,
    "Gauge Type (NOM; MIN; blanks)": Detail30.dtl_gaugt,
    "Width (IN)": Detail30.dtl_widin,
    //"Width (KG)": Detail30.dtl_width_kg,
    "Unit Length (IN)": Detail30.dtl_ulenin,
    //"Unit Length (KG)": Detail30.dtl_length_kg,
    "Lineal Feet (FT)": Detail30.dtl_lnft,
    "Lineal Meters (MT)": Detail30.dtl_lnmt,
    "Inside Diameter (IN)": Detail30.dtl_idin,
    "Inside Diameter (MM)": Detail30.dtl_idmm,
    "Outside Diameter (IN)": Detail30.dtl_odin,
    "Outside Diameter (MM)": Detail30.dtl_odmm,
    //"Responsible Party Alpha Code": Detail30.dtl_resp_alpha,
    //"Responsible Party Number Code": Detail30.dtl_resp_num,
    "Purchase Order Date": Detail30.dtl_pod,
    //"Change Order Sequence Number": Detail30.dtl_cpoc,
    "Release Number": Detail30.dtl_rls,
    //"(STTX) Tag Type": Detail30.dtl_sttx_tag_type,
    //"(STTX) Tag Number": Detail30.dtl_sttx_tag_num,
    "Previous (processor) Coil ID": Detail30.dtl_prev,
    "Status Date": Detail30.dtl_sts_dte,
    "Status Time": Detail30.dtl_sts_tme,
    "Status Time Zone": Detail30.dtl_sts_tme_zn,
    "Quality Rating Date": Detail30.dtl_qua_rtg_dte,
    "Quality Rating Time": Detail30.dtl_qua_rtg_tme,
    "Quality Rating Time Zone": Detail30.dtl_qua_rtg_tme_zn,
    "Quantity of Units Returned": Detail30.dtl_ret_qty,
    "Qty Returned UOM": Detail30.dtl_ret_qty_uom,
    "Quantity in Question": Detail30.dtl_qty_in_ques,
    "Qty in Question UOM": Detail30.dtl_qty_in_ques_uom,
    "Receiving Condition Code": Detail30.dtl_rcv_cond_cd,
    "Returnable Container Number": Detail30.dtl_rtn_cnt_no,
    "Customer Reference Number": Detail30.dtl_cst_ref_no,
    "Packing List Number": Detail30.dtl_pck_lst_no,
    //"Item Mill Order Number": Detail30.dtl_item_mill_order_number,
    //"Override PO number": Detail30.dtl_override_po_number,
    //"Tag Serial Build Layout": Detail30.dtl_tag_serial_build_layout,
   // "Consumed Coil ID from I856": Detail30.dtl_consumed_coil_id,
    //"I856 Order level line number LIN01": Detail30.dtl_order_line_no,
   // "I856 Item level line number LIN01": Detail30.dtl_item_line_no

  };
  thirtyRecord.record_code = thirtyRecord["RECORD TYPE INDICATOR"];
  outSNF.push(thirtyRecord);

  // 40 Records for this hl1
  const detail40s = Detail.filter(d => d.dtl_hl1 === hl1);
  for (const Detail40 of detail40s) {
    let fortyRecord = {
      "RECORD TYPE INDICATOR": "40",
      "Item HL ID": Detail40.dtl_hl1,
      "HL Parent ID": Detail40.dtl_hl2,
      "HL Level Code": Detail40.dtl_hl3,
      "HL Child Code": Detail40.dtl_hl4,
      "Heat Number": Detail40.dtl_heat,
      "Mill Coil Number": Detail40.dtl_mcoil,
      "Previous/Processor Tag Nbr": Detail40.dtl_prev,
      "Item Mill Order Number": Detail40.dtl_mo,
      "PO No": Detail40.dtl_po,
      "Change Order Sequence Number": Detail40.dtl_poc,
      "PO Date": Detail40.dtl_pod,
      "PO Line No": Detail40.dtl_pol,
      "Release No": Detail40.dtl_rls,
      "Part Number5": Detail40.dtl_cpart,
      "Net Qty Ship": Detail40.dtl_pcs,
      "Qty UOM": Detail40.dtl_qtyuom,
      "Grade Code": Detail40.dtl_grcd,
      "Material Classification (AISI table 67)": Detail40.dtl_mcls_67,
      "Material Status - QA (AISI table 68)": Detail40.dtl_msts68,
      "Material Status (AISI table 70)": Detail40.dtl_msts70,
      "Edge Designation (AISI table 22)": Detail40.dtl_edge22,
      "Matl Specification Application Nbr": Detail40.dtl_msa,
      "Mill Create Date": Detail40.dtl_mdat,
      "Original Shipper's BOL Nbr": Detail40.dtl_osid,
      "Heat Treat (Cash) Date": Detail40.dtl_cshdt,
      "Lube Application Date": Detail40.dtl_lubdt,
      "Bake Hardening Date": Detail40.dtl_bhdt,
      "Consumed Coil ID": Detail40.dtl_ccoil,
      "Temper": Detail40.dtl_tmpr,
      "Line No": Detail40.dtl_olin01,
      "Country of origin (cast)": Detail40.dtl_corg,
      "Primary Country of Smelt": Detail40.dtl_smelt1,
      "Secondary Country of Smelt": Detail40.dtl_smelt2
    };
    fortyRecord.record_code = fortyRecord["RECORD TYPE INDICATOR"];
    outSNF.push(fortyRecord);


  }
}

  //MARK: 80 Record
  let eightyRecord = {
    "RECORD TYPE INDICATOR": "80",
    "No HL or LIN": Header.hdr_sum_hl_seg,
    "Total Line Qtys": Header.hdr_sum_hsh_ttl,
  }
  eightyRecord.record_code = eightyRecord["RECORD TYPE INDICATOR"];
  outSNF.push(eightyRecord);


  return outSNF
}

module.exports = {
  SNFCreateO856
}

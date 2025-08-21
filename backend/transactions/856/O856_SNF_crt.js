const trimTrailingZeros = require('../../functions/trimtrailingzeros.js');


async function SNFCreateO856(pkey, pool) {

  let headerResults = await pool.query('SELECT * FROM public."856_SNF_Header" WHERE hdr_key = $1', [pkey]);
  let Header = headerResults.rows[0];
  let detailsResults = await pool.query('SELECT * FROM "856_SNF_Detail" WHERE dtl_key = $1', [pkey]);
  let Detail = detailsResults.rows;
  let namesResults = await pool.query('SELECT * FROM "856_SNF_Names" WHERE name_key = $1', [pkey]);
  let Names = namesResults.rows;
  let measurementsResults = await pool.query('SELECT * FROM "856_SNF_Measure" WHERE msr_key = $1', [pkey]);
  let Measurements = measurementsResults.rows;

  //Load SNF Tables
  let multiSNFS = []
  let multipleSNFsResults = await pool.query('SELECT * FROM public."Duplicate_SNFs" WHERE dup_cus_id = $1', [global.CustomerID]);
  let multipleSNFs = multipleSNFsResults.rows;
  let snf = await writeSNF(pkey, pool, Header, Detail, Names, Measurements);
  multiSNFS.push(snf);
  if (multipleSNFs.length > 0) {
    Header.hdr_isa_qual = multipleSNFs[0].dup_isa_qual;
    Header.hdr_isnd_id = multipleSNFs[0].dup_isnd_id;
    let snf = await writeSNF(pkey, pool, Header, Detail, Names, Measurements);
    multiSNFS.push(snf);
  }

  return multiSNFS;

}

async function writeSNF(pkey, pool, Header, Detail, Names, Measurements) {

  let outSNF = []
 console.log("Creating O856 for pkey:", pkey);
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
    //MARK: 05 Record
    let fiveRecord = {
      "RECORD TYPE INDICATOR": "05",
      "Purpose Code": Header.hdr_bsn_cd,
      "ASN Number": Header.hdr_bsn_no,
      "ASN Date": Header.hdr_bsn_dte,
      "ASN Time": Header.hdr_bsn_tme,
      "Shipment Date": Header.shp_dte,
      "Shipment Time": Header.hdr_shp_tme,
      "Shipment Time Zone": Header.hdr_shp_tzn,
      "Secondary Date": null,
      "Secondary Time": null,
      "Secondary Time Zone": null,
      "Misc1": null,
      "Century": null,
      "Transaction Type": Header.hdr_tran_typ,
      "SCAC": null,
      "Metric Flag": null,
      "Shipment Level UOM": null,
      "Order Level UOM": null,
      "Item Level UOM": null,
      "Equipment Description Code": null,
      "Daylight Savings Time Flag": null
    }
    fiveRecord.record_code = fiveRecord["RECORD TYPE INDICATOR"];
    outSNF.push(fiveRecord);

    //MARK: 10 Record
    let tenRecord = {
      "RECORD TYPE INDICATOR": "10",
      "Bill Of Lading Number": Header.hdr_bol_no,
      "Master Bill Of Lading Number" : Header.hdr_mbol_no,
      "Packing Slip Number" : Header.hdr_pck_no,
      "Dock Code" : Header.hdr_dck_cd,
      "Shipment Gross Weight (LB)": Header.hdr_shp_grss_wgt_lb,
      "Shipment Gross Weight (KG)": Header.hdr_shp_grss_wgt_kg,
      "Shipment Gross Weight UOM" : Header.hdr_shp_grss_wgt_uom,
      "Shipment Net Weight (LB)" : Header.hdr_shp_net_wgt_lb,
      "Shipment Net Weight (KG)" : Header.hdr_shp_net_wgt_kg,
      "Shipment Net Weight UOM" : Header.hdr_shp_net_wgt_uom,
      "Shipment Total Piece Count" : Header.hdr_shp_ttl_pc_cnt,
      "Equipment Code (TL; RR)" : Header.hdr_eq_cd,
      "Equipment Initials (prefix of \"Equip Nbr\")" : Header.hdr_eq_init,
      "Equipment Number (suffix of \"Equip Initials\")" : Header.hdr_eq_nbr,
      "Shipment Method of Payment (FOB-01 value)" : Header.hdr_shp_mthd_pmnt,
      "Ship-From ID (N1-04 value from N1*SF segment)" : Header.hdr_sf_no,
      "Ship-To ID (N1-04 value from N1*ST segment)" : Header.hdr_st_no,
      "Shipment HL Level ID" : Header.hdr_shp_hl,
      "Shipment Parent HL Level ID" : Header.hdr_phl,
      "Shipment HL Level Code" : Header.hdr_shipment_hl_cd,
      "Shipment HL Child Code" : Header.hdr_shipment_hl_ccd
    }
    tenRecord.record_code = tenRecord["RECORD TYPE INDICATOR"];
    outSNF.push(tenRecord);

    await Promise.all(Names.map(async (Name) => {
      //MARK: 11 Record
      let elevenRecord = {
        "RECORD TYPE INDICATOR": "11",
        "AddressTypeCode": Name.name_qual,
        "AddressNo": Name.name_id,
        "Name": Name.name_name,
        "Line1": Name.name_addr1,
        "Line2": Name.name_addr2,
        "City": Name.name_city,
        "State": Name.name_state,
        "ZipCode": Name.name_zpcd,
        "CountryCode": Name.name_ctry_cd,
        "ContactName": Name.name_cont_name,
        "ContactPhone": Name.name_cont_phn,
        "ContactEmail": Name.name_cont_eml,
        "Address ID Qualifier": Name.name_qual_id
      }
      elevenRecord.record_code = elevenRecord["RECORD TYPE INDICATOR"];
      outSNF.push(elevenRecord);
    }));
    
    //MARK: 12 Record
    let twelveRecord = {
      "RECORD TYPE INDICATOR": "12",
      "Container Type": Header.hdr_shp_itm_typ,
      "Number of Containers": Header.hdr_shp_itm_cnt,
      "Weight Qual": 'G',
      "Weight": Header.hdr_shp_grss_wgt_lb ? Header.hdr_shp_grss_wgt_lb : Header.hdr_shp_grss_wgt_kg,
      "Weight Uom": Header.hdr_shp_grss_wgt_uom
    }
    twelveRecord.record_code = twelveRecord["RECORD TYPE INDICATOR"];
    outSNF.push(twelveRecord);

    //MARK: 12 Record
    let twelveRecord2 = {
      "RECORD TYPE INDICATOR": "12",
      "Container Type": Header.hdr_shp_itm_typ,
      "Number of Containers": Header.hdr_shp_itm_cnt,
      "Weight Qual": 'N',
      "Weight": Header.hdr_shp_net_wgt_lb ? Header.hdr_shp_net_wgt_lb : Header.hdr_shp_net_wgt_kg,
      "Weight Uom": Header.hdr_shp_net_wgt_uom
    }
    twelveRecord2.record_code = twelveRecord2["RECORD TYPE INDICATOR"];
    outSNF.push(twelveRecord2);


    //MARK: 14 Record
    let fourteenRecord = {
      "RECORD TYPE INDICATOR": "14",
      "Route Seq Code": Header.hdr_rte_sq_cd,
      "SCAC Code": Header.hdr_std_car_cd,
      "Transport Method": Header.hdr_tspt_mthd,
      "Transport Route": Header.hdr_tspt_rt_name,
      "Shipment/Order Status Code": Header.hdr_shp_ord_sts,
      "Location ID": Header.hdr_shp_loc_id
    }
    fourteenRecord.record_code = fourteenRecord["RECORD TYPE INDICATOR"];
    outSNF.push(fourteenRecord);


    //MARK: 30 Record
    // Filter Detail for unique values based on all properties
    const uniqueDetailsresults = await pool.query(
      'SELECT DISTINCT * FROM "856_SNF_Detail" WHERE dtl_key = $1', [pkey]
    );
    const uniqueDetails = uniqueDetailsresults.rows
    await Promise.all(uniqueDetails.map(async (Detail30) => {
      let thirtyRecord = {
      "RECORD TYPE INDICATOR": "30",
      "Mill Order Number": Detail30.dtl_mo,
      "Mill Order Line": Detail30.dtl_mol,
      "PO No": Detail30.dtl_cpo,
      "Customer PO Release Number": Detail30.dtl_cpor,
      "Change Order Sequence Number": Detail30.dtl_cpoc,
      "PO Date": Detail30.dtl_cpod,
      "Customer PO Line Number": Detail30.dtl_cpol,
      "Ultimate Customer PO Number": Detail30.dtl_ucpo,
      "Release No": Detail30.dtl_rls,
      "Customer Part No": Detail30.dtl_cpart,
      "Final Dest": Detail30.dtl_n1ma,
      "Order HL ID": Detail30.dtl_ohl1,
      "HL Parent ID": Detail30.dtl_ohl2,
      "HL Level Code": Detail30.dtl_ohl3,
      "HL Child Code": Detail30.dtl_ohl4,
      "Net Qty Shipped": Detail30.dtl_shp,
      "Qty UOM": Detail30.dtl_ouom,
      "Cum Qty Shipped": Detail30.dtl_cqty,
      "Alt Part No": Detail30.dtl_apart,
      "Part Description (Shop)": Detail30.dtl_partd,
      "Line Item No": Detail30.dtl_olin01,
      "Country of origin (cast)": Detail30.dtl_corg,
      "Primary Country of Smelt": Detail30.dtl_smelt1,
      "Secondary Country of Smelt": Detail30.dtl_smelt2
    }
    thirtyRecord.record_code = thirtyRecord["RECORD TYPE INDICATOR"];
    outSNF.push(thirtyRecord);
      await Promise.all(Detail.map(async (Detail40) => {
    
    //MARK: 40 Record
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
    }
    fortyRecord.record_code = fortyRecord["RECORD TYPE INDICATOR"];
    outSNF.push(fortyRecord);
  }))
  }));

    

    //MARK: 49 Record
    await Promise.all(Measurements.map(async (Measure) => {
    let fortyNineRecord = {
      "RECORD TYPE INDICATOR": "49",
      "Measurement Reference": Measure.msr_mea1,
      "Measurement Qualifier": Measure.msr_mea2,
      "Measurement Flag": Measure.msr_mea3f,
      "Measurement Value": await trimTrailingZeros(Measure.msr_mea3),
      "Measurement UOM": Measure.msr_mea4
    }
    fortyNineRecord.record_code = fortyNineRecord["RECORD TYPE INDICATOR"];
    outSNF.push(fortyNineRecord);
  }));

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

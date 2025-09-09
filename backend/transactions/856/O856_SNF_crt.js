const trimZeros = require('../../functions/trimtrailingzeros.js');


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
      "GS Functional Group ID": Header.hdr_func_no,  
      "ISA Receiver ID Qualifier": Header.hdr_ircv_qual, 
      "ISA Receiver ID": Header.hdr_ircv_id,
      "GS Receiver ID": Header.hdr_grcv_id,  //change for outbound
      "ST Transaction Set ID": '856',
      "Application System ID": 'Invex'
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
      "Shipment Date": Header.hdr_shp_dte,
      "Shipment Time": Header.hdr_shp_tme,
      "Shipment Time Zone": Header.hdr_shp_tzn,
      "Transaction Type": Header.hdr_tran_typ,
      "SCAC": Header.hdr_scac, 
      "Metric Flag": Header.hdr_shp_grss_wgt_uom === 'LB' ? 'N' : 'Y',
      "Shipment Level UOM": Header.hdr_shp_grss_wgt_uom,
      "Order Level UOM": Header.hdr_shp_grss_wgt_uom === 'LB' ? '01' : '50',
      "Item Level UOM":  Header.hdr_shp_grss_wgt_uom === 'LB' ? '01' : '50',
      "Equipment Description Code": Header.hdr_tspt_mthd,
      "Daylight Savings Time Flag": null  //Custom
    }
    fiveRecord.record_code = fiveRecord["RECORD TYPE INDICATOR"];
    outSNF.push(fiveRecord);

    //MARK: 10 Record
    let tenRecord = {
      "RECORD TYPE INDICATOR": "10",
      "Ship HL ID": '1',
      "HL Level Code": 'S',
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
      "Equipment Code (TL; RR)" : Header.hdr_tspt_mthd,
      "Conveyance No" : Header.hdr_eq_nbr,
      "Payment Method" : Header.hdr_shp_mthd_pmnt,
      "Equipment Initials (prefix of \"Equip Nbr\")" : Header.hdr_eq_init,
      "Equipment Number (suffix of \"Equip Initials\")" : Header.hdr_eq_nbr,
      "Shipment Method of Payment (FOB-01 value)" : Header.hdr_shp_mthd_pmnt,
      "Ship-From ID (N1-04 value from N1*SF segment)" : Header.hdr_sf_no,
      "Ship-To ID (N1-04 value from N1*ST segment)" : Header.hdr_st_no,
      "Shipment HL Level ID" : Header.hdr_shp_hl,
      "Shipment Parent HL Level ID" : Header.hdr_phl,
      "Shipment HL Level Code" : Header.hdr_shipment_hl_cd,
      "Shipment HL Child Code" : Header.hdr_shipment_hl_ccd,
      "Total Piece Count" : Header.hdr_shp_itm_cnt,
      "Count of Combined BOLs": Header.length,
      "Combined Load Total Tag Count" : Detail.length,
      "Alt UM Gross Weight": Header.hdr_shp_grss_wgt_uom === 'LB' ? Number(Header.hdr_shp_grss_wgt_lb) * 0.45359237 : Number(Header.hdr_shp_grss_wgt_kg) / 0.45359237,
      "Alt UM (for Gross Weight)": Header.hdr_shp_grss_wgt_uom === 'LB' ? 'KG' : 'LB',
      "Alt UM Net Weight": Header.hdr_shp_net_wgt_uom === 'LB' ? Number(Header.hdr_shp_net_wgt_lb) * 0.45359237 : Number(Header.hdr_shp_net_wgt_kg) / 0.45359237,
      "Alt UM (for Net Weight)": Header.hdr_shp_net_wgt_uom === 'LB' ? 'KG' : 'LB',
      "Combined Load Total Weight": Header.hdr_shp_grss_wgt_uom === 'LB' ? Number(Header.hdr_shp_grss_wgt_lb): Number(Header.hdr_shp_grss_wgt_kg),
      "Combined Load Total Weight UM": Header.hdr_shp_net_wgt_uom,
      "Combined Load Total Piece Count": Header.hdr_shp_itm_cnt,
      "Pieces in BOL (Y/N)" : Header.hdr_shp_itm_cnt > 1 ? 'Y' : 'N',
      "Responsible Party Alpha Code": null,   //Customer Config
      "Responsible Party Number Code": null,   //Customer Config
      "Load Number": null, //Customer Config
      "Mill Order Number": null,   //More Work
      "Customer Release Number" : null //More Work


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
      "Weight Uom": Header.hdr_shp_grss_wgt_uom,
      "Combined Load Total Weight": Header.hdr_shp_grss_wgt_uom === 'LB' ? Number(Header.hdr_shp_grss_wgt_lb): Number(Header.hdr_shp_grss_wgt_kg),
      "Combined Load Total Weight UM": Header.hdr_shp_net_wgt_uom,
      "Combined Load Total Piece Count": Header.hdr_shp_itm_cnt,
      "Combined Load Total Tag Count" : Detail.length
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
      "Weight Uom": Header.hdr_shp_net_wgt_uom,
      "Combined Load Total Weight": Header.hdr_shp_grss_wgt_uom === 'LB' ? Number(Header.hdr_shp_grss_wgt_lb): Number(Header.hdr_shp_grss_wgt_kg),
      "Combined Load Total Weight UM": Header.hdr_shp_net_wgt_uom,
      "Combined Load Total Piece Count": Header.hdr_shp_itm_cnt,
      "Combined Load Total Tag Count" : Detail.length
    }
    twelveRecord2.record_code = twelveRecord2["RECORD TYPE INDICATOR"];
    outSNF.push(twelveRecord2);


    //MARK: 14 Record
    let fourteenRecord = {
      "RECORD TYPE INDICATOR": "14",
      "Route Seq Code": Header.hdr_rte_sq_cd,
      "SCAC Code": Header.hdr_std_car_cd,
      "Transport Method": Header.hdr_tspt_mthd,
      "Transport Route": Header.hdr_tspt_rt_name
    }
    fourteenRecord.record_code = fourteenRecord["RECORD TYPE INDICATOR"];
    outSNF.push(fourteenRecord);


    //MARK: 30 Record
    // Filter Detail for unique values based on all properties
    // Get unique dtl_hl1 values for 30 records
const uniqueHL1s = [...new Set(Detail.map(d => d.dtl_hl1))];

for (const hl1 of uniqueHL1s) {
  // Find the first detail record for this hl1 (for 30 record fields)
  const Detail30 = Detail.find(d => d.dtl_hl1 === hl1);

  let thirtyRecord = {
    "RECORD TYPE INDICATOR": "30",
    "Order HL ID": Detail30.dtl_hl1,
    "HL Parent ID": 1,
    "HL Level Code": 'O',
    "HL Child Code": 1,
    "Part Qualifier": 'BP',
    "Customer Part No": Detail30.dtl_cpart,
    "PO No": Detail30.dtl_cpo,
    "PO Date": Detail30.dtl_cpod,
    "Alt Part No": Detail30.dtl_apart,
    "Release No": Detail30.dtl_rls,
    "Engineering Change No": null,  //Needs to be defined
    "Mill Order Number": Detail30.dtl_mo,
    "Mill Order Line": Detail30.dtl_mol,
    "Customer PO Release Number": Detail30.dtl_cpor,
    "Customer PO Line Number": Detail30.dtl_cpol,
   "Order Total Pieces": Header.hdr_shp_itm_cnt,      
   "Order Total Weight (LB)": Header.hdr_shp_grss_wgt_uom === 'LB' ? Number(Header.hdr_shp_grss_wgt_lb) : Number(Header.hdr_shp_grss_wgt_kg) / 0.45359237,
   "Order Total Weight (KG)": Header.hdr_shp_grss_wgt_uom === 'KG' ?  Number(Header.hdr_shp_grss_wgt_kg) : Number(Header.hdr_shp_grss_wgt_kg) / 0.45359237,
   "Pieces in Detail (Y/N)": Detail30.dtl_pcs ? 'Y' : 'N',
   "Prior Cumulative Piece Count": null,//Needs to be defined
   "Prior Cumulative Weight (LB)": null,//Needs to be defined
   "Prior Cumulative Weight (KG)": null,//Needs to be defined
   "New Cumulative Piece Count": null,//Needs to be defined
   "New Cumulative Weight (LB)": null,//Needs to be defined
   "New Cumulative Weight (KG)": null,//Needs to be defined
    "Change Order Sequence Number": null,//Needs to be defined
    "Special Data 1": null,//Needs to be defined
    "Special Data 2": null,//Needs to be defined
    "Responsible Party Alpha Code": null,//Needs to be defined
    "Responsible Party Number Code":null,//Needs to be defined
    "Override Part Number": null,//Needs to be defined
    "Override Customer PO#": null,//Needs to be defined
    "Override Supplier ID": null,//Needs to be defined
    "Ship-To Customer PO#": null,//Needs to be defined
    "Ship-To Customer PO Line#": null,//Needs to be defined
    "Cust PO# (Shop)": null,//Needs to be defined
    "Cust Release# (Shop)": null,//Needs to be defined
    "Cust Release# (Mtl Rls)": null,//Needs to be defined
    "REF*PO from Inb856 (to be sent back)": null,//Needs to be defined
    "Part Description (Shop)": Detail30.dtl_partd,
    "Internal (Shop) Order Number": null,//Needs to be defined
    "Part Total Pieces": null,//Needs to be defined
    "Part Total Weight (LB)":null,//Needs to be defined
    "Part Total Weight (KG)": null,//Needs to be defined
    "(I830-PS) Purchase Order#": null,//Needs to be defined
    "(I830-PS) Purchase Order Line#": null,//Needs to be defined
    "(I830-PS) Release#": null,//Needs to be defined
    "(I830-PS) Engineering Change#": null,//Needs to be defined
    "(I830-PS) MSA#": null,//Needs to be defined
    "(I830-PS) Create Date": null,//Needs to be defined
    "(I830-PS) Create Time": null,//Needs to be defined
    "(I862-SS) Purchase Order#": null,//Needs to be defined
    "(I862-SS) Purchase Order Line#": null,//Needs to be defined
    "(I862-SS) Release#":null,//Needs to be defined
    "(I862-SS) Engineering Change#": null,//Needs to be defined
    "(I862-SS) MSA#": null,//Needs to be defined
    "(I862-SS) Company Part#": null,//Needs to be defined
    "(I862-SS) Returnable Container#": null,//Needs to be defined
    "(I862-SS) HES Code": null,//Needs to be defined
    "(I862-SS) Prev Customer Reference": null,//Needs to be defined
    "(I862-SS) Create Date": null,//Needs to be defined
    "(I862-SS) Create Time": null,//Needs to be defined
    "(I830-PS) Delivery Order Number": null,//Needs to be defined
    "(I862-SS) Delivery Order Number": null,//Needs to be defined
    "Commodity Code": null,//Needs to be defined
    "Sold-To Customer PO# (from Mtl rls file)": null,//Needs to be defined
    "Sold-To PO Line# (from Mtl rls file)": null,//Needs to be defined
    "(I862-SS) Bill of Lading I862 REF*BM": null,//Needs to be defined
    "(I862-SS) Delivery reference number": null,//Needs to be defined
 
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
        "HL Level Code": 'I',
        "HL Child Code": '0',
        "Mill Coil Number": Detail40.dtl_mcoil,
        "Heat Number": Detail40.dtl_heat,
        "Grade Code": Detail40.dtl_grcd,
        "Previous/Processor Tag Nbr": Detail40.dtl_prev,
        "Net Qty Ship": Detail40.dtl_pcs,
        "Qty UOM": 'PC',
        "PO No": Detail40.dtl_po,
        "PO Date": Detail40.dtl_pod,
        "PO Line No": Detail40.dtl_pol,
        "Billed Weight": Detail40.dtl_awgtlb ? Detail40.dtl_awgtlb : Detail40.dtl_awgtkg ? Detail40.dtl_awgtkg : null,
        "Billed Wt UM": Detail40.dtl_awgtlb ? 'LB' : 'KG',
        "Material Classification (AISI table 67)": Detail40.dtl_mcls_67,
        "Material Status (AISI table 70)": '1',
        "Matl Specification Application Nbr": null,//Needs to be defined
        "(STTX) Tag Type": null,//Needs to be defined
        "(STTX) Tag Number": null,//Needs to be defined
        "RAN Number": null,//Needs to be defined
        "RAN Release Number": null,//Needs to be defined
        "Kanban Number": null,//Needs to be defined
        "Prior Cumulative Piece Count": null,//Needs to be defined
        "Prior Cumulative Weight (LB)": null,//Needs to be defined
        "Prior Cumulative Weight (KG)": null,//Needs to be defined
        "New Cumulative Piece Count": null,//Needs to be defined
        "New Cumulative Weight (LB)": null,//Needs to be defined
        "New Cumulative Weight (KG)": null,//Needs to be defined
        "Change Order Sequence Number": Detail40.dtl_poc,
        "Cust PO# (Bundle Tag/FG Override)": null,//Needs to be defined
        "Cust Rls# (Bundle Tag/FG Override)":null,//Needs to be defined
        "(STTX) Production Number":null,//Needs to be defined
        "Serial Build FG Tag ID": null,//Needs to be defined
        "Source Mill": (() => {
          const mill = Names.find(n => n.name_qual === 'MF');
          return mill ? mill.name_addr1 : null;
        })(),
        "Original I856 Gauge (IN)": null,//Needs to be defined
        "Original I856 Gauge (MM)": null,//Needs to be defined
        "Original I856 Gauge Type":null,//Needs to be defined
        "Price/CWT Adjust": null,//Needs to be defined
        "License Plate Number": Header.hdr_eq_nbr,
        "Temper": null,//Needs to be defined
        "Customer tag number": null,//Needs to be defined
        "Load Planning From INB 860/850":null,//Needs to be defined
        "Release# from INB 860/850": null,//Needs to be defined
        "PO Date from INB 860/850":null,//Needs to be defined
        "Line# from INB 860/850":null,//Needs to be defined
        "Part# from INB 860/850":null,//Needs to be defined
        "Alternate Part# from INB 860/850": null,//Needs to be defined
    };
    fortyRecord.record_code = fortyRecord["RECORD TYPE INDICATOR"];
    outSNF.push(fortyRecord);

    // 49 Records for this 40 record (matching measurements)
    const matchingMeasurements = Measurements.filter(m =>
      m.msr_bsn2 === Detail40.dtl_hl2 && m.msr_hl1 === hl1
    );
    for (const Measure of matchingMeasurements) {
      let fortyNineRecord = {
        "RECORD TYPE INDICATOR": "49",
        "Measurement Reference": Measure.msr_mea1,
        "Measurement Qualifier": Measure.msr_mea2,
        "Measurement Value": trimZeros(Measure.msr_mea3),
        "Measurement UOM": Measure.msr_mea4
      };
      fortyNineRecord.record_code = fortyNineRecord["RECORD TYPE INDICATOR"];
      outSNF.push(fortyNineRecord);
    }
  }
}



  return outSNF
}

module.exports = {
  SNFCreateO856
}

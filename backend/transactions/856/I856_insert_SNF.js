// This module handles the insertion of parsed EDI 856 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.


const cleo = require("../../db") 

async function LoadI856SNF(pool, records, flag) {
  // Group 40s with their associated 49s
  async function group40With49(records) {
    const result = [];
    let current40 = null;
    for (const rec of records) {
      if (rec.record_code === "40") {
        current40 = { ...rec, _49s: [] }; // Create a new object with all 40 fields and an empty _49s array
        result.push(current40);
      } else if (rec.record_code === "49" && current40) {
        current40._49s.push({ ...rec }); // Push the full 49 record, not just record_code
      } else if (rec.record_code === "80") {
        current40 = null;
      }
    }
    return result;
  }
  const getRecords = (code) => records.filter(r => r.record_code === code);

  // Extract records by code
  const CT = getRecords("CT")[0] || {};
  const five = getRecords("05")[0] || {};
  const ten = getRecords("10")[0] || {};
  const eleven = getRecords("11") || [];
  const twelve = getRecords("12") || [];
  const fourteen = getRecords("14")[0] || {};
  const thirty = getRecords("30") || [];
  const forty = getRecords("40") || [];
  const fortynine = getRecords("49") || [];
  const eighty = getRecords("80")[0] || {};
  
  
// Use grouped 40s with their 49s
  const groupedItems = await group40With49(records);

await pool.query('DELETE FROM public."856_SNF_Header" WHERE hdr_key = $1', [CT["Record Key (10-digit integer)"]]);
await pool.query('DELETE FROM public."856_Invex_InterchangeControl" WHERE ictl_key = $1', [CT["Record Key (10-digit integer)"]]);

//   Insert into 856 Tables
  await insert856Header(pool, CT, five, ten, twelve, fourteen, eighty, eleven, flag);

  // Insert names from the eleven records
    const namesPromises = eleven.map(async (address) => {
      await insert856Names(pool, CT, address, flag);
      return Promise.resolve();
    });

  await Promise.all(namesPromises);

  // Insert into detail table 
  const detailPromises = groupedItems.map(async (fortyRec, index) => {
    if (fortyRec._49s && fortyRec._49s.length > 0) {
      const singlethirty = thirty.find(thr => thr["Order HL ID"] === fortyRec["HL Parent ID"]);
      await insert856Detail(pool, CT, five, ten, singlethirty, [fortyRec], fortyRec._49s, eleven, flag);
    }
    return Promise.resolve();
  });

  // Await all detail inserts before proceeding
  await Promise.all(detailPromises);

  // Insert measurements for each 40 and its associated 49s using map
  const measurePromises = groupedItems.map(async(fortyRec, index) => {
    if (fortyRec._49s && fortyRec._49s.length > 0) {
      return Promise.all(
        fortyRec._49s.map(async(fortynineRec) => {
          const singlethirty = thirty.find(thr => thr["Order HL ID"] === fortyRec["HL Parent ID"]);
          await insert856Measure(pool, CT, fortyRec, five, ten, fortynineRec, singlethirty, eleven, flag);
        })
      );
    }
    return Promise.resolve();
  });

  // Await all measurement inserts
  await Promise.all(measurePromises);
}




function findGaugeType(fortynine) {
  // First search
  const found = fortynine.find(
    m =>
      ["GG", "TH"].includes(m["Measurement Qualifier"]) &&
      ["ED", "MB"].includes(m["Measurement UOM"])
  );
  if (found) return 'NOM';

  // Second search (example: change the logic as needed)
  const alt = fortynine.find(
    m =>
      ["GG", "TH"].includes(m["Measurement Qualifier"]) &&
      ["EM", "MZ"].includes(m["Measurement UOM"])
  );
  if (alt) return 'MIN'; // or return alt, or whatever you want

  // If nothing found
  return null;
}


//MARK: Header
//856 Header Insert
async function insert856Header(pool, CT, five, ten, twelve, fourteen, eighty, eleven, key) {
  try {
    const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');
    await pool.query(`
     INSERT INTO public."856_SNF_Header"(
      hdr_type, hdr_key, hdr_isa_qual, hdr_isnd_id, hdr_gsnd_id, hdr_ircv_id, hdr_grcv_id, hdr_ictl_no, hdr_func_no, hdr_gctl_no, hdr_ircv_qual, hdr_stctl_no, hdr_bsn_cd, hdr_bsn_no, hdr_bsn_dte, hdr_bsn_tme, hdr_tran_typ, hdr_shp_dte, hdr_shp_tme, hdr_shp_tzn, hdr_bol_no, hdr_mbol_no, hdr_pck_no, hdr_dck_cd, hdr_shp_grss_wgt_lb, hdr_shp_grss_wgt_kg, hdr_shp_grss_wgt_uom, hdr_shp_net_wgt_lb, hdr_shp_net_wgt_kg, hdr_shp_net_wgt_uom, hdr_shp_ttl_pc_cnt, hdr_shp_itm_typ, hdr_shp_itm_cnt, hdr_rte_sq_cd, hdr_std_car_cd, hdr_tspt_mthd, hdr_tspt_rt_name, hdr_shp_ord_sts, hdr_shp_loc_id, hdr_eq_cd, hdr_eq_init, hdr_eq_nbr, hdr_shp_mthd_pmnt, hdr_sf_no, hdr_st_no, hdr_shp_hl, hdr_shp_phl, hdr_shp_hl_cd, hdr_shp_hl_ccd, hdr_swgt_typ, hdr_swgt, hdr_swgt_uom, hdr_sum_hl_seg, hdr_sum_hsh_ttl, hdr_sttx_locn, hdr_crt_dat, hdr_crt_tim, hdr_crt_pgm, hdr_xref, hdr_flow_flag, hdr_bol_suffix
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
      $51, $52, $53, $54, $55, $56, $57, $58, $59, $60,
      $61)
    `, [
      CT["Type (T=Toll; M=Margin; D=Direct Ship)"],  //$1
      CT["Record Key (10-digit integer)"],           //$2
      CT["ISA Sender ID Qualifier"],            //$3  
      CT["ISA Sender ID"],                    //$4
      CT["GS Sender ID"],           //$5  
      CT["ISA Receiver ID"],        //$6
      CT["GS Receiver ID"],         //$7
      CT["ISA Control Number"],     //$8
      CT["GS Functional Group ID"], //$9
      CT["GS Control Number"],      //$10
      CT["ISA Receiver ID Qualifier"],  //$11
      CT["ST Control Number"],    //$12
      five["Purpose Code"],       //$13
      five["ASN Number"],     //$14
      five["ASN Date"] ? five["ASN Date"] : null,       //$15
      five["ASN Time"] ? five["ASN Time"] : null,       //$16
      five["Transaction Type"],   //$17
      five["Shipment Date"] ? five["Shipment Date"] : null,      //$18
      five["Shipment Time"],      //$19
      five["Shipment Time Zone"],   //$20
      ten["Bill of Lading"],      //$21
      ten["Mst Bill Lading"],     //$22
      ten["Packing Slip"],      //$23
      ten["Dock Code"],     //$24
      ten["Gross Weight"] ? ten["Gross Weight"] : null, //$25
      ten["Gross Weight"] ? ten["Gross Weight"] : null, //$26
      ten["Gross Wt UM"],  //$27
      ten["Net Weight"] ? ten["Net Weight"] : null,  //$28
      ten["Net Weight"] ? ten["Net Weight"] : null,  //$29
      ten["Net Wt UM"],    //$30
      ten["Total Piece Count"] ? ten["Total Piece Count"] : null ,  //$31
      twelve.length !== 0 ? twelve[0]["Container Type"] : null,  //$32
      twelve.length !== 0 && twelve[0]["Number of Containers"] && twelve[0]["Number of Containers"].trim() !== '' ? Number(twelve[0]["Number of Containers"]) : null,  //$33
      fourteen["Route Seq Code"] ? fourteen["Route Seq Code"] : null,  //$34
      fourteen["SCAC Code"] ? fourteen["SCAC Code"] : null,       //$35
      fourteen["Transport Method"] ? fourteen["Transport Method"] : null,  //$36
      fourteen["Transport Route"] ? fourteen["Transport Route"] : null,   //$37
      fourteen["Shipment/Order Status Code"] ? fourteen["Shipment/Order Status Code"] : null,  //$38
      fourteen["Ship Location ID"] ? fourteen["Ship Location ID"] : null,   //$39
      ten["Equipment Code"],     //$40
      ten["Equip SCAC Code"],  //$41
      ten["Conveyance No"],    //$42
      ten["Payment Method"],   //$43
      ten["Ship From ID"],     //$44
      ten["Ship To ID"],        //$45
      ten["Ship HL ID"],       //$46
      ten["HL Parent ID"],    //$47
      ten["HL Level Code"],   //$48
      ten["HL Child Code"],   //$49
      twelve.length !== 0 && twelve[0]["Weight Qual"] && twelve[0]["Weight Qual"].trim() !== '' ? twelve[0]["Weight Qual"] : null,   //$50
      twelve.length !== 0 && twelve[0]["Weight"] && twelve[0]["Weight"].trim() !== '' ? Number(twelve[0]["Weight"]) : null,     //$51
      twelve.length !== 0 && twelve[0]["Weight Uom"] && twelve[0]["Weight Uom"].trim() !== '' ? twelve[0]["Weight Uom"] : null,    //$52
      eighty["No HL or LIN"] ? eighty["No HL or LIN"] : null,     //$53
      eighty["Total Line Qtys"] ? eighty["Total Line Qtys"] : null,     //$54
      null,     //$55
      Number(ymd),    //$56
      Number(hms),   //$57
      "856i.js",    //$58
      null,   //$59
      key, //$60
      '0' //61 BOL Suffix, always '0' for inbound.
    ]);

    console.log('856 Header inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 856 Header Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }
};

//MARK: Names
  //856 Names Insert
async function insert856Names(pool, CT, eleven, key) {
 try {
  const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');
    await pool.query( `INSERT INTO public."856_SNF_Names"(
	name_typ, name_key, name_qual, name_qual_id, name_id, name_name, name_addr1, name_addr2, name_city, name_state, name_zpcd, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_crt_dte, name_crt_tme, name_crt_pgm, name_flow_flag, name_bol_suffix)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],          //$2
    eleven["AddressTypeCode"],                    //$3
    eleven["Address ID Qualifier"],           //$4  
    eleven["AddressNo"],            //$5  
    eleven["Name"],               //$6  
    eleven["Line1"],              //$7
    eleven["Line2"],              //$8
    eleven["City"],             //$9
    eleven["State"],            //$10
    eleven["ZipCode"],          //$11
    eleven["CountryCode"],        //$12
    eleven["ContactName"],        //$13
    eleven["ContactPhone"],       //$14
    eleven["ContactEmail"],       //$15
    Number(ymd),    //$16
    Number(hms),   //$17       
    "856_insert", //$18
    key, //$19
    '0' //20 BOL Suffix, always '0' for inbound.
  ]);

  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 856 Names Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }
}

//MARK: Detail
//856 Detail Insert
async function insert856Detail(pool, CT, five, ten, thirty, forty, fortynine, eleven, key) {
 try {
  const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');
   // Extract measurements logic from fortynine
  const WeightLB = fortynine.find(m => ["LB", "01"].includes(m["Measurement UOM"]) && m["Measurement Qualifier"] === "WT");
  const WeightKG = fortynine.find(m => ["KG", "50"].includes(m["Measurement UOM"]) && m["Measurement Qualifier"] === "WT");
  const WeightTLB = fortynine.find(m => m["Measurement UOM"] === "24" && m["Measurement Qualifier"] === "WT");
  const WeightTKG = fortynine.find(m => m["Measurement UOM"] === "53" && m["Measurement Qualifier"] === "WT");
  const GaugeType = findGaugeType(fortynine);
  const GaugeIN = fortynine.find(m => ["GG", "TH"].includes(m["Measurement Qualifier"]) && ["IN", "ED", "EM", "E8"].includes(m["Measurement UOM"]));
  const GaugeMM = fortynine.find(m => ["GG", "TH"].includes(m["Measurement Qualifier"]) && ["MM", "MB", "MZ", "M2"].includes(m["Measurement UOM"]));
  const WidthIN = fortynine.find(m => m["Measurement Qualifier"] === "WD" && ["IN", "ED", "EM", "E8"].includes(m["Measurement UOM"]));
  const WidthMM = fortynine.find(m => m["Measurement Qualifier"] === "WD" && ["MM", "MB", "MZ", "M2"].includes(m["Measurement UOM"]));
  const UnitLengthIN = fortynine.find(m => m["Measurement Qualifier"] === "LN" && ["IN", "ED", "EM", "E8"].includes(m["Measurement UOM"]));
  const UnitLengthMM = fortynine.find(m => m["Measurement Qualifier"] === "LN" && ["MM", "MB", "MZ", "M2"].includes(m["Measurement UOM"]));
  const LinearFT = fortynine.find(m => m["Measurement Qualifier"] === "LN" && ["FT", "LF"].includes(m["Measurement UOM"]));
  const LinearMT = fortynine.find(m => m["Measurement Qualifier"] === "LN" && ["MT", "LM"].includes(m["Measurement UOM"]));
  const InsideDiameterIN = fortynine.find(m => m["Measurement Qualifier"] === "ID" && ["IN", "ED", "EM", "E8"].includes(m["Measurement UOM"]));
  const InsideDiameterMM = fortynine.find(m => m["Measurement Qualifier"] === "ID" && ["MM", "MB", "MZ", "M2"].includes(m["Measurement UOM"]));
  const OutsideDiameterIN = fortynine.find(m => m["Measurement Qualifier"] === "OD" && ["IN", "ED", "EM", "E8"].includes(m["Measurement UOM"]));
  const OutsideDiameterMM = fortynine.find(m => m["Measurement Qualifier"] === "OD" && ["MM", "MB", "MZ", "M2"].includes(m["Measurement UOM"]));
  await pool.query(`INSERT INTO public."856_SNF_Detail"(
	dtl_type, dtl_key, dtl_hl1, dtl_hl2, dtl_hl3, dtl_hl4, dtl_bsn2, dtl_bol, dtl_heat, dtl_mcoil, dtl_prev, dtl_mo, dtl_mol, dtl_cpo, dtl_cpor, dtl_cpoc, dtl_cpod, dtl_cpol, dtl_ucpo, dtl_po, dtl_poc, dtl_pod, dtl_pol, dtl_rls, dtl_cpart, dtl_awgtlb, dtl_awgtkg, dtl_twgtlb, dtl_twgtkg, dtl_gaugin, dtl_gaugmm, dtl_gaugt, dtl_widin, dtl_widmm, dtl_ulenin, dtl_ulenmm, dtl_lnft, dtl_lnmt, dtl_idin, dtl_idmm, dtl_odin, dtl_odmm, dtl_pcs, dtl_qtyuom, dtl_grcd, dtl_mcls67, dtl_msts68, dtl_msts70, dtl_edge22, dtl_msa, dtl_n1sf, dtl_n1st, dtl_n1ma, dtl_ohl1, dtl_ohl2, dtl_ohl3, dtl_ohl4, dtl_shp, dtl_ouom, dtl_cqty, dtl_locn, dtl_odat, dtl_otim, dtl_opgm, dtl_apart, dtl_partd, dtl_mdat, dtl_osid, dtl_cshdt, dtl_lubdt, dtl_bhdt, dtl_xref, dtl_sttxpo, dtl_ccoil, dtl_tmpr, dtl_olin01, dtl_ilin01, dtl_corg, dtl_smelt1, dtl_smelt2, dtl_flow_flag, dtl_bol_suffix)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82)`,
[
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], 
    CT["Record Key (10-digit integer)"], 
    forty[0]["Item HL ID"], 
    forty[0]["HL Parent ID"],
    forty[0]["HL Level Code"],
    forty[0]["HL Child Code"],
    five["ASN Number"],
    ten["Bill of Lading"],
    forty[0]["Heat Number"],
    forty[0]["Mill Coil Number"],
    forty[0]["Previous/Processor Tag Nbr"],
    forty[0]["Item Mill Order Number"] ? forty[0]["Item Mill Order Number"] : thirty['Mill Order Number'] ? thirty['Mill Order Number'] : null,
    thirty["Mill Order Line"],
    thirty["PO No"],
    thirty["Customer PO Release Number"],
    thirty["Change Order Sequence Number"],
    thirty["PO Date"] ? thirty["PO Date"] : null,
    thirty["Customer PO Line Number"],
    thirty["Ultimate Customer PO Number"],
    forty[0]["PO No"],
    forty[0]["Change Order Sequence Number"],
    forty[0]["PO Date"] ? forty[0]["PO Date"] : null,
    (thirty['Customer PO Line Number'] ? thirty['Customer PO Line Number'] : forty[0]["PO Line No"] ? forty[0]["PO Line No"] : thirty['Customer PO Release Number']).toString().padStart(3, '0'),
    forty[0]["Release No"] ? forty[0]["Release No"] : thirty["Release No"],
    forty[0]["Part Number5"] ? forty[0]["Part Number5"] : thirty["Customer Part No"],
    WeightLB ? WeightLB["Measurement Value"] : null,
    WeightKG ? WeightKG["Measurement Value"] : null,
    WeightTLB ? WeightTLB["Measurement Value"] : null,
    WeightTKG ? WeightTKG["Measurement Value"] : null,
    GaugeIN ? GaugeIN["Measurement Value"] : null,
    GaugeMM ? GaugeMM["Measurement Value"] : null,
    GaugeType,
    WidthIN ? WidthIN["Measurement Value"] : null,
    WidthMM ? WidthMM["Measurement Value"] : null,
    UnitLengthIN ? UnitLengthIN["Measurement Value"] : null,
    UnitLengthMM ? UnitLengthMM["Measurement Value"] : null,
    LinearFT ? LinearFT["Measurement Value"] : null,
    LinearMT ? LinearMT["Measurement Value"] : null,
    InsideDiameterIN ? InsideDiameterIN["Measurement Value"] : null,
    InsideDiameterMM ? InsideDiameterMM["Measurement Value"] : null,
    OutsideDiameterIN ? OutsideDiameterIN["Measurement Value"] : null,
    OutsideDiameterMM ? OutsideDiameterMM["Measurement Value"] : null,
    forty[0]["Net Qty Ship"] ? forty[0]["Net Qty Ship"] : null,
    forty[0]["Qty UOM"],
    forty[0]["Grade Code"],
    forty[0]["Material Classification (AISI table 67)"],
    forty[0]["Material Status - QA (AISI table 68)"],
    forty[0]["Material Status (AISI table 70)"],
    forty[0]["Edge Designation (AISI table 22)"],
    forty[0]["Matl Specification Application Nbr"],
    ten["Ship From ID"],
    ten["Ship To ID"],
    thirty["Final Dest"],
    thirty["Order HL ID"],
    thirty["HL Parent ID"],
    thirty["HL Level Code"],
    thirty["HL Child Code"],
    thirty["Net Qty Shipped"] ? thirty["Net Qty Shipped"] : null,
    thirty["Qty UOM"] ? thirty["Qty UOM"] : null,
    thirty["Cum Qty Shipped"] ? thirty["Cum Qty Shipped"] : null,
    null,
    Number(ymd), 
    Number(hms),
    "856insert",
    thirty["Alt Part No"],
    thirty["Part Description (Shop)"],
    forty[0]["Mill Create Date"] ? forty[0]["Mill Create Date"] : null,
    forty[0]["Original Shipper's BOL Nbr"],
    forty[0]["Heat Treat (Cash) Date"] ? forty[0]["Heat Treat (Cash) Date"] : null,
    forty[0]["Lube Application Date"] ? forty[0]["Lube Application Date"] : null,
    forty[0]["Bake Hardening Date"] ? forty[0]["Bake Hardening Date"] : null,
    null,
    12345,
    forty[0]["Consumed Coil ID"],
    forty[0]["Temper"],
    thirty["Line Item No"],
    forty[0]["Line No"],
    forty[0]["Country of origin (cast)"] ? forty[0]["Country of origin (cast)"] : thirty["Country of origin (cast)"],
    forty[0]["Primary Country of Smelt"] ? forty[0]["Primary Country of Smelt"] : thirty["Primary Country of Smelt"],
    forty[0]["Secondary Country of Smelt"] ? forty[0]["Secondary Country of Smelt"] : thirty["Secondary Country of Smelt"],
    key,
    '0' //82 BOL Suffix, always '0' for inbound.
])
//console.log('856 Detail inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 856 Detail Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }}



//MARK: Measure
//856 Measure Insert
async function insert856Measure(pool, CT, forty, five, ten, fortynine, thirty, eleven, key) {
 try {
const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');
    await pool.query( `INSERT INTO public."856_SNF_Measure"(
    msr_type, msr_key, msr_hl1, msr_bsn2, msr_bol, msr_heat, msr_mcoil, msr_prev, msr_mea1, msr_mea2, msr_mea3f, msr_mea3, msr_mea4, msr_n1sf, msr_n1st, msr_n1ma, msr_locn, msr_odat, msr_otim, msr_opgm, msr_xref, msr_flow_flag, msr_bol_suffix)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], 
    CT["Record Key (10-digit integer)"],
    forty["Item HL ID"], 
    five["ASN Number"],
    ten["Bill of Lading"],
    forty["Heat Number"],
    forty["Mill Coil Number"],
    forty["Previous/Processor Tag Nbr"],
    fortynine["Measurement Reference"],
    fortynine["Measurement Qualifier"],
    fortynine["Measurement Flag"],
    fortynine["Measurement Value"] ? fortynine["Measurement Value"] : null,
    fortynine["Measurement UOM"],
    ten["Ship From ID"],
    ten["Ship To ID"],
    null,
    null,
      Number(ymd),
      Number(hms),
    "856i.js",
    null,
    key,
    '0' //23 BOL Suffix, always '0' for inbound.
  ]);


    //console.log('856 Measure inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 856 Measure Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }}




  module.exports = {
    LoadI856SNF
};

// This module handles the insertion of parsed EDI 861 records into the PostgreSQL database. 
// It exports functions to insert header, names and detail records into their respective tables.


async function LoadI861SNF(pool, records, flag) {
  // Implementation for loading data into the I861 SNF table
  const getRecords = (code) => records.filter(r => r.record_code === code);
  // Extract records by code
  const CT = getRecords("CT")[0] || {};
  const ten = getRecords("10")[0] || {};
  const fifteen = getRecords("15") || {};
  const thirty = getRecords("30") || [];
  const ninety = getRecords("90")[0] || {};
  //console.log(CT, ten, fifteen, thirty, ninety);
  //Insert into 861 Tables
  await insert861Header(pool, CT, ten, fifteen, ninety, flag);
 
  //Insert Into Name
  const namesPromises = fifteen.map(async (fifteen) => {
      await insert861Names(pool, CT, fifteen, flag);
      return Promise.resolve();
  });
  await Promise.all(namesPromises);

 //Insert Into Detail
  const detailPromises = thirty.map(async (thirty, index30) => {
      await insert861Detail(pool, CT, ten, thirty, index30, flag);
      return Promise.resolve();
  });
  await Promise.all(detailPromises);

  return null;

}

//MARK: Header
//861 Header Insert
async function insert861Header(pool, CT, ten, fifteen, ninety, flag) {
 const hdr_ou_line = fifteen.find(m => ["OU"].includes(m["AddressTypeCode"]));
 const hdr_st_line = fifteen.find(m => ["ST"].includes(m["AddressTypeCode"]));  
 const hdr_sf_line = fifteen.find(m => ["SF"].includes(m["AddressTypeCode"]));  
 const hdr_mf_line = fifteen.find(m => ["MF"].includes(m["AddressTypeCode"]));    
try {
    const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');

  await pool.query(`
  INSERT INTO public."861_SNF_Header"(
  hdr_type, hdr_key, hdr_isa_qual, hdr_isnd_id, hdr_gsnd_id, hdr_ircv_qual, hdr_ircv_id, hdr_grcv_id, hdr_ictl_no, hdr_gctl_no, hdr_stctl_no, hdr_date_sent, hdr_time_sent, hdr_shp_no, hdr_rcpt_date, hdr_purp_cd, hdr_rcpt_typ_cd, hdr_rcpt_tme, hdr_bol_no, hdr_mbol_no, hdr_rcv_dte, hdr_rcv_tme, hdr_rcv_tme_zn, hdr_shp_dte, hdr_shp_tme, hdr_shp_tzn, hdr_prc_dte, hdr_prc_tme, hdr_prc_tzn, hdr_scac, hdr_trl_no, hdr_op_qual, hdr_op_id, hdr_shpto_qual, hdr_shpto_id, hdr_shpfrm_qual, hdr_shpfrm_id, hdr_mfg_qual, hdr_mfg_id, hdr_sum_rcd, hdr_sum_hsh_ttl, hdr_sttx_locn, hdr_crt_dat, hdr_crt_tim, hdr_crt_pgm, hdr_flow_flag)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46)`, 
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"],  //$1
    CT["Record Key (10-digit integer)"],           //$2
    CT["ISA Sender ID Qualifier"],            //$3  
    CT["ISA Sender ID"],                    //$4
    CT["GS Sender ID"],           //$5
    CT["ISA Receiver ID Qualifier"],      //$6
    CT["ISA Receiver ID"],        //$7
    CT["GS Receiver ID"],         //$8
    CT["ISA Control Number"],     //$9
    CT["GS Control Number"],      //$10
    CT["ST Control Number"],    //$11
    ten["Date Sent"] ? ten["Date Sent"] : null,      //$12
    ten["Time Sent"] ? ten["Time Sent"] : null,      //$13
    ten["Shipment ID"],      //$14
    ten["Receipt Date"] ? ten["Receipt Date"] : null,     //$15
    ten["Transaction Set Purpose Code"],    //$16
    ten["Rcpt or Acceptance Type Code"],    //$17
    ten["Receipt Time"],    //$18
    ten["Bill Of Lading Number"],    //$19
    ten["Shipment Notice/Manifest Number"],     //$20
    ten["Received Date"] ? ten["Received Date"] : null,  //$21
    ten["Receipt Time"] ? ten["Receipt Time"] : null,  //$22
    ten["Received Time Zone"],   //$23
    ten["Shipped Date"] ? ten["Shipped Date"] : null,    //$24
    ten["Shipped Time"] ? ten["Shipped Time"] : null,    //$25
    ten["Shipped Time Zone"],    //$26
    ten["Process Date"] ? ten["Process Date"] : null,      //$27
    ten["Process Time"] ? ten["Process Time"] : null,      //$28
    ten["Process Time Zone"],     //$29
    ten["SCAC"],      //$30
    ten["Trailer Number"],      //$31
    hdr_ou_line ? hdr_ou_line["Address ID Qualifier"] : null,  //$32
    hdr_ou_line ? hdr_ou_line["Address ID"] : null,  //$33,
    hdr_st_line ? hdr_st_line["Address ID Qualifier"] : null,  //$34
    hdr_st_line ? hdr_st_line["Address ID"] : null,  //$35
    hdr_sf_line ? hdr_sf_line["Address ID Qualifier"] : null,  //$36
    hdr_sf_line ? hdr_sf_line["Address ID"] : null,  //$37
    hdr_mf_line ? hdr_mf_line["Address ID Qualifier"] : null,  //$38
    hdr_mf_line ? hdr_mf_line["Address ID"] : null,  //$38
    ninety["Number of Line Items"] ? ninety["Number of Line Items"] : null, //$40
    ninety["Hash Total"] ? ninety["Hash Total"] : null,   //$41
    null,     //$42
    Number(ymd),    //$43
    Number(hms),   //$44
    "861i.js",    //$45
    flag //$46
  ]);

    console.log('861 Header inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 861 Header Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }
};

//MARK: Names
  //861 Names Insert
async function insert861Names(pool, CT, fifteen, flag) {
try {
  await pool.query( `INSERT INTO public."861_SNF_Names"(
	name_type, name_key, name_qual, name_qual_id, name_id, name_name, name_addr1, name_addr2, name_city, name_state, name_zpcd, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_resp_cd, name_crt_dte, name_crt_tme, name_crt_pgm, name_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],          //$2
    fifteen["AddressTypeCode"],                    //$3
    fifteen["Address ID Qualifier"],           //$4  
    fifteen["Address ID"],            //$5  
    fifteen["Name"],               //$6  
    fifteen["Address Line 1"],             //$7
    fifteen["Address Line 2"],            //$8
    fifteen["City"],          //$9
    fifteen["State/Province"],        //$10
    fifteen["Postal Code"],        //$11
    fifteen["Customer Country Code"],       //$12
    fifteen["Contact Name"],       //$13
    fifteen["Contact Telephone"],       //$14
    fifteen["Contact Email"],       //$15
    fifteen["Responsible Party Code"],       //$16
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$17
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$18
    "861i.js",    //$19
    flag //$20
  ]);

  console.log('861 Names inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 861 Names Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }
}

//MARK: Detail
  //861 Detail Insert
async function insert861Detail(pool, CT, ten, thirty, index30, flag) {
 try {
  await pool.query( `INSERT INTO public."861_SNF_Detail"(
	dtl_type, dtl_key, dtl_line, dtl_shp_no, dtl_bol, dtl_mbol_no, dtl_rcv_dte, dtl_rcv_tme, dtl_rcv_tme_zn, dtl_rcv_qty, dtl_rcv_qty_uom, dtl_ret_qty, dtl_ret_qty_uom, dtl_qty_in_ques, dtl_qty_in_ques_uom, dtl_rcv_cond_cd, dtl_mo, dtl_mol, dtl_heat, dtl_mcoil, dtl_proc, dtl_prev, dtl_po, dtl_rls, dtl_pod, dtl_pol, dtl_cpart, dtl_apart, dtl_partd, dtl_grcd, dtl_rtn_cnt_no, dtl_cst_ref_no, dtl_pck_lst_no, dtl_awgtlb, dtl_awgtkg, dtl_twgtlb, dtl_twgtkg, dtl_gaugin, dtl_gaugmm, dtl_gaugt, dtl_widin, dtl_widmm, dtl_ulenin, dtl_ulenmm, dtl_lnft, dtl_lnmt, dtl_idin, dtl_idmm, dtl_odin, dtl_odmm, dtl_sts_dte, dtl_sts_tme, dtl_sts_tme_zn, dtl_qua_rtg_dte, dtl_qua_rtg_tme, dtl_qua_rtg_tme_zn, dtl_mcls67, dtl_msts70, dtl_falt72, dtl_scr_73, dtl_pcs, dtl_locn, dtl_odat, dtl_otim, dtl_opgm, dtl_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],          //$2
    index30 + 1,  //$3
    ten["Shipment ID"],      //$4
    ten["Bill Of Lading Number"],    //$5
    ten["Shipment Notice/Manifest Number"],     //$6
    ten["Received Date"] ? ten["Received Date"] : null,  //$7
    ten["Receipt Time"] ? ten["Receipt Time"] : null,  //$8
    ten["Received Time Zone"],   //$9
    thirty["Quantity of Units Received"] ? thirty["Quantity of Units Received"] : null,                    //$10
    thirty["Unit of Measure"],           //$11
    thirty["Quantity of Units Returned"] ? thirty["Quantity of Units Returned"] : null,                    //$12
    thirty["Qty Returned UOM"],           //$13
    thirty["Quantity in Question"] ? thirty["Quantity in Question"] : null,                    //$14
    thirty["Qty in Question UOM"],           //$15
    thirty["Receiving Condition Code"],           //$16 
    thirty["Vendor (Mill) Order Number"],            //$17  
    thirty["Vendor (Mill) Item/Line Number"],               //$18 
    thirty["Heat Number"],              //$19
    thirty["Mill Coil Number"],              //$20
    thirty["Received As Tag Number"],              //$21
    thirty["Previous (processor) Coil ID"],              //$22
    thirty["Purchase Order Number"],             //$23
    thirty["Release Number"],       //$24
    thirty["Purchase Order Date"] ? thirty["Purchase Order Date"] : null,       //$25
    thirty["Purchase Order Line Number"],            //$26
    thirty["Part Number"],          //$27
    null,      //$28
    null,      //$29
    thirty["Grade Code"],        //$30
    thirty["Returnable Container Number"],        //$31
    thirty["Customer Reference Number"],        //$32
    thirty["Packing List Number"],        //$33
    thirty["Actual Weight (LB)"] ? thirty["Actual Weight (LB)"] : null,       //$34
    thirty["Actual Weight (KG)"] ? thirty["Actual Weight (KG)"] : null,       //$35
    thirty["Theoretical Weight (LB)"] ? thirty["Theoretical Weight (LB)"] : null,       //$36
    thirty["Theoretical Weight (KG)"] ? thirty["Theoretical Weight (KG)"] : null,     //$37
    thirty["Gauge (IN)"] ? thirty["Gauge (IN)"] : null,       //$38
    thirty["Gauge (MM)"] ? thirty["Gauge (MM)"] : null,       //$39
    thirty["Gauge Type (NOM; MIN; blanks)"],       //$40
    thirty["Width (IN)"] ? thirty["Width (IN)"] : null,       //$41
    thirty["Width (KG)"] ? thirty["Width (KG)"] : null,       //$42
    thirty["Unit Length (IN)"] ? thirty["Unit Length (IN)"] : null,       //$43
    thirty["Unit Length (KG)"] ? thirty["Unit Length (KG)"] : null,       //$44
    thirty["Lineal Feet (FT)"] ? thirty["Lineal Feet (FT)"] : null,       //$45
    thirty["Lineal Meters (MT)"] ? thirty["Lineal Meters (MT)"] : null,       //$46
    thirty["Inside Diameter (IN)"] ? thirty["Inside Diameter (IN)"] : null,       //$47
    thirty["Inside Diameter (MM)"] ? thirty["Inside Diameter (MM)"] : null,       //$48
    thirty["Outside Diameter (IN)"] ? thirty["Outside Diameter (IN)"] : null,       //$49
    thirty["Outside Diameter (MM)"] ? thirty["Outside Diameter (MM)"] : null,       //$50
    thirty["Status Date"] ? thirty["Status Date"] : null,       //$51
    thirty["Status Time"] ? thirty["Status Time"] : null,       //$52
    thirty["Status Time Zone"],       //$53
    thirty["Quality Rating Date"] ? thirty["Quality Rating Date"] : null,       //$54
    thirty["Quality Rating Time"] ? thirty["Quality Rating Time"] : null,       //$55
    thirty["Quality Rating Time Zone"],       //$56
    thirty["Material Classification (Table 67)"],       //$57
    thirty["Material Status (Table 70)"],       //$58
    thirty["Reason/Fault Code (Table 72)"],       //$59  
    thirty["Reason/Damage Code (Table 73)"],       //$60 
    thirty["Number of Pieces"] ? thirty["Number of Pieces"] : null, // 61  
    null,     //$62
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$63
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$64
    "861i.js",    //$65
    flag //$66
  ]);

  console.log('861 Detail inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 861 Detail Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }
}

module.exports = {
  LoadI861SNF
};
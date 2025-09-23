// This module handles the insertion of parsed EDI 850 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.

//const cleo = require("../../db") 
//const  readableErrors  = require('../../functions/readableErrors.js');

async function LoadI850SNF(pool, records, flag) {

  // Group 30s with their associated 31s
  async function group30With31(records) {
    const result = [];
    let current30 = null;
    for (const rec of records) {
      if (rec.record_code === "30") {
        current30 = { ...rec, _31s: [] }; // Create a new object with all 30 fields and an empty _31s array
        result.push(current30);
      } else if (rec.record_code === "31" && current30) {
        current30._31s.push({ ...rec }); // Push the full 31 record, not just record_code
      } else if (rec.record_code === "40") {
          continue; // Skip 40 records
      } else if (rec.record_code === "90") {
        current30 = null;
      }
    }
    return result;
  }

  // Group 30s with their associated 40s
  async function group30With40(records) {
    const result = [];
    let current30 = null;
    for (const rec of records) {
      if (rec.record_code === "30") {
        current30 = { ...rec, _40s: [] }; // Create a new object with all 30 fields and an empty _40s array
        result.push(current30);
      } else if (rec.record_code === "31") {
      continue; // Skip 31 records
      }  else if (rec.record_code === "40" && current30) {
        current30._40s.push({ ...rec }); // Push the full 40 record, not just record_code
      } 
       else if (rec.record_code === "90") {
        current30 = null;
      }
    }
    return result;
    }


  const getRecords = (code) => records.filter(r => r.record_code === code);

  // Extract records by code
  const CT = getRecords("CT")[0] || {};
  const ten = getRecords("10")[0] || {};
  const eleven = getRecords("11") || [];
  const fifteen = getRecords("15") || [];
  const thirty = getRecords("30") || [];
  const thirtyone = getRecords("31") || [];
  const forty = getRecords("40") || [];
  const ninety = getRecords("90")[0] || {};
  
  
// Use grouped 30s with their 31s
  const group3031 = await group30With31(records);
// Use grouped 30s with their 31s
  const group3040 = await group30With40(records);

//   Insert into 850 Tables
  await insert850Header(pool, CT, ten, fifteen, ninety, flag);

// Insert notes from the eleven records
    const notesPromises = eleven.map(async (eleven, index) => {
      await insert850Notes(pool, CT, eleven, index, flag);
      return Promise.resolve();
    });

  await Promise.all(notesPromises);


  // Insert names from the fifteen records
    const namesPromises = fifteen.map(async (fifteen) => {
      await insert850Names(pool, CT, fifteen, flag);
      return Promise.resolve();
    });

  await Promise.all(namesPromises);

  // Insert into detail table 
  const detailPromises = thirty.map(async (thirty, index) => {
      await insert850Detail(pool, CT, ten, thirty, index, flag);
      return Promise.resolve();
  });
  // Await all detail inserts before proceeding
  await Promise.all(detailPromises);

// Insert detail notes from the thirty and thirtyone records
  const detailnotespromises = thirty.map(async (thirty, index30) => {
      group3031[index30]._31s.map(async (thirtyone, index31) => {
      await insert850DetailNotes(pool, CT, ten, thirty, index30, thirtyone, index31, flag);
    });
        return Promise.resolve();
      });
  await Promise.all(detailnotespromises);

  
// Insert detail shipping schedule from the thirty and forty records
  const ShipScheduledPomises = thirty.map(async (thirty, index30) => {
      group3040[index30]._40s[0] ? group3040[index30]._40s.map(async (forty, index40) => {
      await insert850ShipSchd(pool, CT, ten, thirty, index30, forty, index40, flag); }) : 
      await insert850ShipSchd(pool, CT, ten, thirty, index30, {}, -1, flag);
        return Promise.resolve();
      });
  await Promise.all(ShipScheduledPomises);

 }

//MARK: Header
//850 Header Insert
async function insert850Header(pool, CT, ten, fifteen, ninety, flag) {
  try {
    const N1SU = fifteen.find(name => name["AddressTypeCode"] === "SU");
    const N1ST = fifteen.find(name => name["AddressTypeCode"] === "ST");
    const N1BT = fifteen.find(name => name["AddressTypeCode"] === "BT");

    await pool.query(`
     INSERT INTO public."850_SNF_Header"(
      hdr_type,hdr_key,hdr_isnd_id,hdr_gsnd_id,hdr_ircv_id,hdr_grcv_id,hdr_ictl_no,hdr_gctl_no,
      hdr_stctl_no,hdr_sentdte,hdr_senttme,hdr_purp_cde,hdr_po_type,hdr_po_no,hdr_rls_no,
      hdr_po_dte,hdr_contr_no,hdr_ack_type,hdr_int_vend_id,hdr_fac_id,hdr_bkanban_no,hdr_other,
      hdr_buy_nam,hdr_buy_tel,hdr_exp_nme,hdr_exp_tel_no,hdr_shp_pay_meth,hdr_city,hdr_post_cd,hdr_del_loc,
      hdr_trans_term_q,hdr_trans_term,hdr_term_typ_c,hdr_term_base_dte_c,hdr_term_disc_p,hdr_term_disc_d,
      hdr_term_net_d,hdr_term_disc,hdr_pay_day_m,hdr_eff_dte,hdr_exp_dte,hdr_scac,hdr_trans_meth,hdr_rout,
      hdr_supp_id_q,hdr_supp_id,hdr_ship_id_q,hdr_ship_id,hdr_bill_id_q,hdr_bill_id,hdr_ctt01,hdr_ctt02,
      hdr_load_pln,hdr_sttx_locn,hdr_crt_dte,hdr_crt_tme,hdr_crt_pgm,hdr_flow_flag,hdr_prtfl
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59)
    `, [
      CT["Type (T=Toll; M=Margin; D=Direct Ship)"],  //$1
      CT["Record Key (10-digit integer)"],           //$2
      CT["ISA Sender ID"],                    //$3
      CT["GS Sender ID"],           //$4  
      CT["ISA Receiver ID"],        //$5
      CT["GS Receiver ID"],         //$6
      CT["ISA Control Number"],     //$7
      CT["GS Control Number"],      //$8
      CT["ST Control Number"],    //$9
      ten["Date Sent"] ? ten["Date Sent"] : null, //$10
      ten["Time Sent"]  ? ten["Time Sent"] : null, //$11
      ten["Transaction Set Purpose Code"], //$12
      ten["Purchase Order Type"], //$13
      ten["Purchase Order Number"], //$14
      ten["Release Number"], //$15
      ten["Purchase Order Date"] ? ten["Purchase Order Date"] : null, //$16    
      ten["Contract Number"],   //$17
      ten["Acknowledgment Type"], //$18
      ten["Internal Vendor Number"], //$19
      ten["Facility ID Number"],  //$20
      ten["Beginning Kanban Serial Number"], //$21
      ten["Other Reference"], //$22
      ten["Buyer Name"], //$23
      ten["Buyer Telephone Number"], //$24
      ten["Expeditor Name"], //$25
      ten["Expeditor Telephone Number"], //$26
      ten["Shipment Method of Payment"], //$27
      ten["FOB City/State"], //$28
      ten["FOB Postal Code"], //$29
      ten["FOB Delivery Location"], //$30
      ten["Transportation Terms Qualifier"], //$31
      ten["Transportation Terms"], //$32
      ten["Terms Type Code"], //$33   
      ten["Terms Basis Date Code"], //$34     
      ten["Terms Discount Percent"] ? ten["Terms Discount Percent"] : null, //$35
      ten["Terms Discount Days"] ? ten["Terms Discount Days"] : null, //$36
      ten["Terms Net Days"] ? ten["Terms Net Days"] : null, //$37
      ten["Terms Description"],   //$38
      ten["Day of Month"] ? ten["Day of Month"] : null, //$39
      ten["Effective Date"] ? ten["Effective Date"] : null, //$40
      ten["Expiration Date"]  ? ten["Expiration Date"] : null, //$41
      ten["Standard Carrier Alpha Code"],   //$42
      ten["Transportation Method"],   //$43
      ten["Routing"],   //$44
      N1SU ? N1SU["Address ID Qualifier"] : null,    //$45
      N1SU ? N1SU["Address ID"] : null,              //$46
      N1ST ? N1ST["Address ID Qualifier"] : null,    //$47
      N1ST ? N1ST["Address ID"] : null,              //$48
      N1BT ? N1BT["Address ID Qualifier"] : null,    //$49
      N1BT ? N1BT["Address ID"] : null,              //$50
      ninety["Number of Line Items"] ? ninety["Number of Line Items"] : null, //$51
      ninety["Hash Total"] ? ninety["Hash Total"] : null, //$52
      ten["Load Planning"], //$53
      null, // $54 Location
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$55 Creation Date
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$56 Creation Time
      "850_Insert",    //$57 Created by program
      flag, //$58 Flow Flag
      " " //$59 Print Flag
    ]);

  } catch (error) {
    // const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"]);
    // console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
      console.log(error);
  }
};


//MARK: Notes
  //850 Notes Insert
async function insert850Notes(pool, CT, eleven, index, flag) {
 try {
    await pool.query( `INSERT INTO public."850_SNF_Notes"(
	  note_type,note_key,note_n_seq_no,note_n_seg_id,note_n_id_cd,note_note,note_crt_dte,note_crt_tme,
    note_crt_pgm,note_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],          //$2
    index + 1,     //$3 Note Sequence Number
    eleven["Note Segment Used"], //$4 Note Segment ID
    eleven["Note ID Code"],      //$5 Note ID Code
    eleven["Free Form Text"],              //$6 Note text
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$7 Creation Date
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$8 Creation Time       
    "850_insert", //$9 Created by program
    flag //$10 Flow Flag
  ]);
  } catch (error) {
    // const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"]);
    // console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
    console.log(error);
  }
}

//MARK: Names
  //850 Names Insert
async function insert850Names(pool, CT, fifteen, flag) {
 try {
    await pool.query( `INSERT INTO public."850_SNF_Name"(
	  name_type,name_key,name_name_qual,name_name_id_qual,name_name_id,name_name,name_name2,name_name3,
    name_addr1,name_addr2,name_city,name_state,name_zpcd,name_ctry_cd,name_cont_name,name_cont_phn,
    name_cont_eml,name_resp_party_cd,name_crt_dte,name_crt_tme,name_crt_pgm,name_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],          //$2
    fifteen["AddressTypeCode"],                    //$3
    fifteen["Address ID Qualifier"],           //$4  
    fifteen["Address ID"],            //$5  
    fifteen["Name"],               //$6  
    fifteen["Additional Name 1"],              //$7
    fifteen["Additional Name 2"],              //$8
    fifteen["Address Line 1"],             //$9
    fifteen["Address Line 2"],            //$10
    fifteen["City"],          //$11
    fifteen["State/Province"],        //$12
    fifteen["Postal Code"],        //$13
    fifteen["Customer Country Code"],       //$14
    fifteen["Contact Name"],       //$15
    fifteen["Contact Telephone"],       //$16
    fifteen["Contact Email"],       //$17
    fifteen["Responsible Party Code"],       //$18
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$19 Creation Date
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$20 Creation Time       
    "850_insert", //$21 Created by program
    flag //$22 Flow Flag
  ]);
  } catch (error) {
    // const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"]);
    // console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
    console.log(error);
  }
}

//MARK: Detail
//850 Detail Insert
async function insert850Detail(pool, CT, ten, thirty, index, flag) {
  try {
   await pool.query(`INSERT INTO public."850_SNF_Detail"(
 	dtl_type,dtl_key,dtl_line,dtl_po,dtl_rls,dtl_po_dte,dtl_contr_no,dtl_pol,dtl_part,dtl_qty,dtl_qty_uom,
  dtl_unit_prc,dtl_unit_prc_b_uom,dtl_alt_part,dtl_part_desc,dtl_grd_cde,dtl_cos_inv_no,dtl_pur_opt_agr,
  dtl_eng_chg_lvl,dtl_fac_id_no,dtl_delv_dte,dtl_delv_tme,dtl_delv_tme_z,dtl_ship_dte,dtl_ship_tme,
  dtl_ship_tme_z,dtl_ship_to_q,dtl_ship_to_id,dtl_ship_to_nme,dtl_ship_to_city,dtl_ship_to_state,
  dtl_ship_to_zpcd,dtl_ship_to_cntry_cd,dtl_ship_to_addl_1,dtl_ship_to_addl_2,dtl_ship_to_add_line1,
  dtl_ship_to_add_line2,dtl_sttx_locn,dtl_crt_dte,dtl_crt_tme,dtl_crt_pgm,dtl_flow_flag)
 	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 
  $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42)`,
 [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],        //$2
    index + 1,  //$3 Line Item Number
    ten["Purchase Order Number"], //$4
    ten["Release Number"], //$5
    ten["Purchase Order Date"] ? ten["Purchase Order Date"] : null, //$6    
    ten["Contract Number"],   //$7
    thirty["PO Line Number"], //$8
    thirty["Part Number"], //$9
    thirty["Quantity Ordered"] ? thirty["Quantity Ordered"] : null, //$10
    thirty["Quantity Basis Code"], //$11
    thirty["Unit Price"] ? thirty["Unit Price"] : null, //$12
    thirty["Price Basis Code"], //$13
    thirty["Alternate (Vendor) Part Number"], //$14
    thirty["Part Description"], //$15
    thirty["Grade Code"], //$16
    thirty["Consignee's Invoice Number"], //$17   
    thirty["Purchase Option Agreement"], //$18 
    null,   //$19 Engineering Change Level
    thirty["Facility ID Number"],  //$20
    thirty["Requested Delivery Date"] ? thirty["Requested Delivery Date"] : null, //$21
    thirty["Requested Delivery Time"] ? thirty["Requested Delivery Time"] : null, //$22
    thirty["Requested Delivery Time Zone"], //$23
    thirty["Requested Ship Date"] ? thirty["Requested Ship Date"] : null, //$24
    thirty["Requested Ship Time"] ? thirty["Requested Ship Time"] : null, //$25
    thirty["Requested Ship Time Zone"], //$26
    thirty["Ship-To ID Qualifier"], //$27 
    thirty["Ship-To ID"], //$28
    thirty["Ship-To Name"], //$29
    thirty["Ship-To City"], //$30
    thirty["Ship-To State"], //$31
    thirty["Ship-To Postal Code"], //$32
    thirty["Ship-To Country Code"], //$33
    thirty["Ship-To Additional Name-1"], //$34
    thirty["Ship-To Additional Name-2"], //$35
    thirty["Ship-To Address Line-1"], //$36
    thirty["Ship-To Address Line-2"], //$37
    null, // $38 Location
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$39 Creation Date
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$40 Creation Time       
    "850_insert", //$41 Created by program
    flag //$42 Flow Flag
])
  
  } catch (error) {
    // const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"], filePath);
    // console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
    console.log(error);
   }}
  

//MARK: Detail Notes
  //850 DetailNotes Insert
async function insert850DetailNotes(pool, CT, ten, thirty, index30, thirtyone, index31, flag) {
 try {
    await pool.query( `INSERT INTO public."850_SNF_DetailNotes"(
	  dnte_type,dnte_key,dnte_line,dnte_seq_no,dnte_po,dnte_pol,dnte_part,dnte_note_seg,dnte_note_id_cd,
    dnte_note,dnte_sttx_locn,dnte_crt_dte,dnte_crt_tme,dnte_crt_pgm,dnte_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],          //$2
    index30 + 1,     //$3 Sequence Number
    index31 + 1,     //$4 Note Sequence Number
    ten["Purchase Order Number"], //$5
    thirty["PO Line Number"], //$6
    thirty["Part Number"], //$7
    thirtyone["Note Segment Used"], //$8 Note Segment ID
    thirtyone["Note ID Code"],    //$9 Note ID Code
    thirtyone["Free Form Text"],  //$10 Note text
    null, // $11 Location
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$12 Creation Date
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$13 Creation Time       
    "850_insert", //$14 Created by program
    flag //$15 Flow Flag
  ]);
  } catch (error) {
    // const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"]);
    // console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
    console.log(error);
  }
}

//MARK: Shipping Schedule
  //850 ShipSchd Insert
async function insert850ShipSchd(pool, CT, ten, thirty, index30, forty, index40, flag) {
 if (index40 === -1) 
  { 
  try {
    await pool.query( `INSERT INTO public."850_SNF_ShipSchd"(
	  shpscd_type,shpscd_key,shpscd_line,shpscd_seq_no,shpscd_po,shpscd_pol,shpscd_part,shpscd_shpqty,
    shpscd_shpqty_uom,shpscd_shpscd_del_dte,shpscd_shpscd_del_tme,shpscd_shpscd_del_tme_z,shpscd_shp_dte,
    shpscd_shp_tme,shpscd_shp_tme_z,shpscd_schd_id_no,shpscd_crt_dte,shpscd_crt_tme,shpscd_crt_pgm,
    shpscd_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],          //$2
    index30 + 1,     //$3 Sequence Number
    1,     //$4 Shipping Schedule Sequence Number
    ten["Purchase Order Number"], //$5
    thirty["PO Line Number"], //$6
    thirty["Part Number"], //$7
    thirty["Quantity Ordered"] ? thirty["Quantity Ordered"] : null, //$8
    thirty["Quantity Basis Code"], //$9
    thirty["Requested Delivery Date"] ? thirty["Requested Delivery Date"] : null, //$10
    thirty["Requested Delivery Time"] ? thirty["Requested Delivery Time"] : null, //$11
    thirty["Requested Delivery Time Zone"], //$12
    thirty["Requested Ship Date"] ? thirty["Requested Ship Date"] : null, //$13
    thirty["Requested Ship Time"] ? thirty["Requested Ship Time"] : null, //$14
    thirty["Requested Ship Time Zone"], //$15
    null, //$16 Schedule ID Number
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$17 Creation Date
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$18 Creation Time       
    "850_insert", //$19 Created by program
    flag //$20 Flow Flag
  ]);
  } catch (error) {
    // const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"]);
    // console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
    console.log(error);
  }
  } else {
    try {
    await pool.query( `INSERT INTO public."850_SNF_ShipSchd"(
	  shpscd_type,shpscd_key,shpscd_line,shpscd_seq_no,shpscd_po,shpscd_pol,shpscd_part,shpscd_shpqty,
    shpscd_shpqty_uom,shpscd_shpscd_del_dte,shpscd_shpscd_del_tme,shpscd_shpscd_del_tme_z,shpscd_shp_dte,
    shpscd_shp_tme,shpscd_shp_tme_z,shpscd_schd_id_no,shpscd_crt_dte,shpscd_crt_tme,shpscd_crt_pgm,
    shpscd_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],          //$2
    index30 + 1,     //$3 Sequence Number
    index40 + 1,     //$4 Shipping Schedule Sequence Number
    ten["Purchase Order Number"], //$5
    thirty["PO Line Number"], //$6
    thirty["Part Number"], //$7
    forty["Quantity"] ? forty["Quantity"] : null, //$8 
    forty["Quantity Basis Code"], //$9
    forty["Requested Delivery Date"] ? forty["Requested Delivery Date"] : null, //$10
    forty["Requested Delivery Time"] ? forty["Requested Delivery Time"] : null, //$11
    null, //$12 Requested Delivery Time Zone
    forty["Requested Ship Date"] ? forty["Requested Ship Date"] : null, //$13
    forty["Requested Ship Time"] ? forty["Requested Ship Time"] : null, //$14
    null, //$15 Requested Ship Time Zone
    forty["Schedule ID Number"], //$16 
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$17 Creation Date
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$18 Creation Time       
    "850_insert", //$19 Created by program
    flag //$20 Flow Flag
  ]);
  } catch (error) {
    // const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"]);
    // console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
    console.log(error);
  }
}
}

  module.exports = {
    LoadI850SNF
};
// End of module

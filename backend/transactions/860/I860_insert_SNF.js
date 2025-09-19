// This module handles the insertion of parsed EDI 860 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.

//const cleo = require("../../db") 
//const  readableErrors  = require('../../functions/readableErrors.js');

async function LoadI860SNF(pool, records, flag) {

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

//   Insert into 860 Tables
  await insert860Header(pool, CT, ten, fifteen, ninety, flag);

// Insert notes from the eleven records
    const notesPromises = eleven.map(async (eleven, index) => {
      await insert860Notes(pool, CT, eleven, index, flag);
      return Promise.resolve();
    });

  await Promise.all(notesPromises);


  // Insert names from the fifteen records
    const namesPromises = fifteen.map(async (fifteen) => {
      await insert860Names(pool, CT, fifteen, flag);
      return Promise.resolve();
    });

  await Promise.all(namesPromises);

  // Insert into detail table 
  const detailPromises = thirty.map(async (thirty, index) => {
      await insert860Detail(pool, CT, ten, thirty, index, flag);
      return Promise.resolve();
  });
  // Await all detail inserts before proceeding
  await Promise.all(detailPromises);

// Insert detail notes from the thirty and thirtyone records
  const detailnotespromises = thirty.map(async (thirty, index30) => {
      group3031[index30]._31s.map(async (thirtyone, index31) => {
      await insert860DetailNotes(pool, CT, ten, thirty, index30, thirtyone, index31, flag);
    });
        return Promise.resolve();
      });
  await Promise.all(detailnotespromises);

  
// Insert detail shipping schedule from the thirty and forty records
  const ShipScheduledPomises = thirty.map(async (thirty, index30) => {
      group3040[index30]._40s.map(async (forty, index40) => {
      await insert860ShipSchd(pool, CT, ten, thirty, index30, forty, index40, flag);
    });
        return Promise.resolve();
      });
  await Promise.all(ShipScheduledPomises);


 }


//MARK: Header
//860 Header Insert
async function insert860Header(pool, CT, ten, fifteen, ninety, flag) {
  try {
    const N1SU = fifteen.find(name => name["AddressTypeCode"] === "SU");
    const N1MP = fifteen.find(name => name["AddressTypeCode"] === "MP");
    const N1ST = fifteen.find(name => name["AddressTypeCode"] === "ST");
    const N1BT = fifteen.find(name => name["AddressTypeCode"] === "BT");

    await pool.query(`
     INSERT INTO public."860_SNF_Header"(
      hdr_type,hdr_key,hdr_isnd_id,hdr_gsnd_id,hdr_ircv_id,hdr_grcv_id,hdr_ictl_no,hdr_gctl_no,
      hdr_stctl_no,hdr_sentdte,hdr_senttme,hdr_purp_cde,hdr_po_type,hdr_po_no,hdr_rls_no,hdr_chg_ord_seq,
      hdr_po_dte,hdr_req_ref_no,hdr_contr_no,hdr_sell_ord_no,hdr_ack_type,hdr_curr_cde,hdr_shp_pay_meth,
      hdr_city,hdr_post_cd,hdr_del_loc,hdr_trans_term_q,hdr_trans_term,hdr_term_typ_c,hdr_term_base_dte_c,
      hdr_term_disc_p,hdr_term_disc_d,hdr_term_net_d,hdr_term_disc,hdr_pay_day_m,hdr_eff_dte,hdr_exp_dte,
      hdr_scac,hdr_trans_meth,hdr_rout,hdr_supp_id_q,hdr_supp_id,hdr_ship_id_q,hdr_ship_id,hdr_bill_id_q,
      hdr_bill_id,hdr_ctt01,hdr_ctt02,hdr_sttx_locn,hdr_load_pln,hdr_crt_dte,hdr_crt_tme,hdr_crt_pgm,
      hdr_prtfl,hdr_flow_flag
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55)
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
      ten["Change Order Sequence Number"], //$16
      ten["Purchase Order Date"] ? ten["Purchase Order Date"] : null, //$17    
      ten["Request Reference Number"], //$18
      ten["Contract Number"],   //$19
      ten["Seller's Order Number"], //$20  
      ten["Acknowledgment Type"], //$21
      ten["Currency Code"], //$22
      ten["Shipment Method of Payment"], //$23
      ten["FOB City/State"], //$24
      ten["FOB Postal Code"], //$25
      ten["FOB Delivery Location"], //$26
      ten["Transportation Terms Qualifier"], //$27
      ten["Transportation Terms"], //$28
      ten["Terms Type Code"], //$29
      ten["Terms Basis Date Code"], //$30     
      ten["Terms Discount Percent"] ? ten["Terms Discount Percent"] : null, //$31
      ten["Terms Discount Days"] ? ten["Terms Discount Days"] : null, //$32
      ten["Terms Net Days"] ? ten["Terms Net Days"] : null, //$33
      ten["Terms Description"],   //$34
      ten["Day of Month"] ? ten["Day of Month"] : null, //$35
      ten["Effective Date"] ? ten["Effective Date"] : null, //$36
      ten["Expiration Date"]  ? ten["Expiration Date"] : null, //$37
      ten["Standard Carrier Alpha Code"],   //$38
      ten["Transportation Method"],   //$39
      ten["Routing"],   //$40
      N1MP? N1MP["Address ID Qualifier"] : N1SU ? N1SU["Address ID Qualifier"] : null,    //$41
      N1MP? N1MP["Address ID"] : N1SU ? N1SU["Address ID"] : null,              //$42
      N1ST ? N1ST["Address ID Qualifier"] : null,    //$43
      N1ST ? N1ST["Address ID"] : null,              //$44
      N1BT ? N1BT["Address ID Qualifier"] : null,    //$45
      N1BT ? N1BT["Address ID"] : null,              //$46
      ninety["Number of Line Items"] ? ninety["Number of Line Items"] : null, //$47
      ninety["Hash Total"] ? ninety["Hash Total"] : null, //$48
      ten["Load Planning"], //$49
      null, // $50 Location
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$51 Creation Date
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$52 Creation Time
      "860_Insert",    //$53 Created by program
      " ", //$54 Print Flag
      flag //$55 Flow Flag
    ]);

    console.log('860 Header inserted successfully');
  } catch (error) {
    // const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"]);
    // console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
      console.log(error);
  }
};


//MARK: Notes
  //860 Notes Insert
async function insert860Notes(pool, CT, eleven, index, flag) {
 try {
    await pool.query( `INSERT INTO public."860_SNF_Notes"(
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
    "860_insert", //$9 Created by program
    flag //$10 Flow Flag
  ]);
  console.log('860 Notes inserted successfully');
  } catch (error) {
    // const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"]);
    // console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
    console.log(error);
  }
}

//MARK: Names
  //860 Names Insert
async function insert860Names(pool, CT, fifteen, flag) {
 try {
    await pool.query( `INSERT INTO public."860_SNF_Name"(
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
    "860_insert", //$21 Created by program
    flag //$22 Flow Flag
  ]);
  console.log('860 Names inserted successfully');
  } catch (error) {
    // const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"]);
    // console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
    console.log(error);
  }
}

//MARK: Detail
//860 Detail Insert
async function insert860Detail(pool, CT, ten, thirty, index, flag) {
  try {
   await pool.query(`INSERT INTO public."860_SNF_Detail"(
 	dtl_type,dtl_key,dtl_line,dtl_po,dtl_rls,dtl_chg_ord_seq_no,dtl_po_dte,dtl_contr_no,dtl_pol,
  dtl_chg_typ_code,dtl_part,dtl_qty,dtl_qty_uom,dtl_qty_left_rcv,dtl_unit_prc,dtl_unit_prc_b_uom,
  dtl_alt_part,dtl_part_desc,dtl_grd_cde,dtl_pur_opt_agr,dtl_drw_rev_no,dtl_eng_chg_lvl,dtl_chg_not_no,
  dtl_fac_id_no,dtl_pur_req_no,dtl_eff_dte,dtl_delv_dte,dtl_delv_tme,dtl_delv_tme_z,dtl_ship_dte,
  dtl_ship_tme,dtl_ship_tme_z,dtl_ship_to_q,dtl_ship_to_id,dtl_ship_to_nme,dtl_ship_to_city,dtl_ship_to_state,
  dtl_ship_to_zpcd,dtl_ship_cntry,dtl_sttx_locn,dtl_crt_dte,dtl_crt_tme,dtl_crt_pgm,dtl_flow_flag)
 	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 
  $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44)`,
 [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],        //$2
    index + 1,  //$3 Line Item Number
    ten["Purchase Order Number"], //$4
    ten["Release Number"], //$5
    ten["Change Order Sequence Number"], //$6
    ten["Purchase Order Date"] ? ten["Purchase Order Date"] : null, //$7  
    ten["Contract Number"],   //$8
    thirty["PO Line Number"], //$9
    thirty["Change Type Code"], //$10
    thirty["Part Number"], //$11
    thirty["Quantity Ordered"] ? thirty["Quantity Ordered"] : null, //$12
    thirty["Unit of Measure"], //$13
    thirty["Quantity Left to Receive"] ? thirty["Quantity Left to Receive"] : null, //$14
    thirty["Unit Price"] ? thirty["Unit Price"] : null, //$15
    thirty["Price Basis Code"], //$16
    thirty["Alternate (Vendor) Part Number"], //$17 Alternate Part Number
    thirty["Part Description"], //$18
    thirty["Grade Code"], //$19
    thirty["Purchase Option Agreement"], //$20   
    thirty["Drawing Revision Number"], //$21
    null,   //$22 Engineering Change Level
    thirty["Change Notice Number"], //$23
    thirty["Facility ID Number"],  //$24  
    thirty["Purchase Requisition Number"], //$25
    thirty["Effective Date"] ? thirty["Effective Date"] : null, //$26
    thirty["Requested Delivery Date"] ? thirty["Requested Delivery Date"] : null, //$27
    thirty["Requested Delivery Time"] ? thirty["Requested Delivery Time"] : null, //$28
    thirty["Requested Delivery Time Zone"], //$29
    thirty["Requested Ship Date"] ? thirty["Requested Ship Date"] : null, //$30
    thirty["Requested Ship Time"] ? thirty["Requested Ship Time"] : null, //$31
    thirty["Requested Ship Time Zone"], //$32
    thirty["Ship-To ID Qualifier"], //$33
    thirty["Ship-To ID"], //$34
    thirty["Ship-To Name"], //$35
    thirty["Ship-To City"], //$36
    thirty["Ship-To State"], //$37
    thirty["Ship-To Postal Code"], //$38
    thirty["Ship-To Country"], //$39
    null, // $40 Location
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$41 Creation Date
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$42 Creation Time       
    "860_insert", //$43 Created by program
    flag //$44 Flow Flag
])
  
console.log('860 Detail inserted successfully');
  } catch (error) {
    // const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"], filePath);
    // console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
    console.log(error);
   }}



//MARK: Detail Notes
  //860 DetailNotes Insert
async function insert860DetailNotes(pool, CT, ten, thirty, index30, thirtyone, index31, flag) {
 try {
    await pool.query( `INSERT INTO public."860_SNF_DetailNotes"(
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
    "860_insert", //$14 Created by program
    flag //$15 Flow Flag
  ]);
  console.log('860 Detail Notes inserted successfully');
  } catch (error) {
    // const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"]);
    // console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
    console.log(error);
  }
}

//MARK: Shipping Schedule
  //860 ShipSchd Insert
async function insert860ShipSchd(pool, CT, ten, thirty, index30, forty, index40, flag) {
 try {
    await pool.query( `INSERT INTO public."860_SNF_ShipSchd"(
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
    "860_insert", //$19 Created by program
    flag //$20 Flow Flag
  ]);
  console.log('860 Ship Schedule inserted successfully');
  } catch (error) {
    // const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"]);
    // console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
    console.log(error);
  }
}

  module.exports = {
    LoadI860SNF
};
// End of module
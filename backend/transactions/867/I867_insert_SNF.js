const queryInvexDatabase = require("../../Invex/InvexConnection");
const  readableErrors  = require('../../functions/readableErrors.js');

async function LoadI867SNF(pool, records, flag) {
  // Implementation for loading I867 SNF data
  async function group30With40and42(records) {
    const result = [];
    let current30 = null;
    let current40 = null;
    let index30 = 0;
    let index40 = 0;

    for (const rec of records) {
      if (rec.record_code === "30") {
        // New 30: increment index30 and reset indexes for 40
        index30 += 1;
        current30 = { ...rec, _40s: [], index30 }; // Create a new object with all 30 fields, index30, and an empty _40s array
        result.push(current30);
        current40 = null;
      } else if (rec.record_code === "40" && current30) {
        // New 40: increment index40
        index40 += 1;
        current40 = { ...rec, _42s: [], index40 }; // Create a new object with all 40 fields, index40 and an empty _42s array
        current30._40s.push(current40);
      } else if (rec.record_code === "42" && current40) {
        // Only push the first 42 record under the current 40
        if (current40._42s.length === 0) {
          current40._42s.push({ ...rec }); // Push only the first 42 record under the current 40
        }
      } else if (rec.record_code === "90") {
        // End of grouping: clear current pointers and indexes
        current30 = null;
        current40 = null;
        index40 = 0;
      }
    }
    return result;
  }

// Group 30s with their associated 43s
  async function group30With43(records) {
    const result = [];
    let current30 = null;
    let index30 = 0;
    let index40 = 0;
    let index43 = 0;
    for (const rec of records) {
      if (rec.record_code === "30") {
        index30 += 1;
        index43 = 0;
        current30 = { ...rec, _43s: [], index30 }; // Create a new object with all 30 fields, index30 and an empty _43s array
        result.push(current30);
      } else if (rec.record_code === "40" && current30) {
        index40 += 1;
        index43 = 0; // Reset index43 for each new 40
        continue;
      } else if (rec.record_code === "42" && current30) {
        continue;
      } else if (rec.record_code === "43" && current30) {
        index43 += 1;
        current30._43s.push({ ...rec, index40, index43 }); // Push the full 43 record with index43
      } else if (rec.record_code === "90") {
        current30 = null;
        index40 = 0;
        index43 = 0;
      }
    }
    return result;
    }

const getRecords = (code) => records.filter(r => r.record_code === code);

  // Extract records by code
  const CT = getRecords("CT")[0] || {};
  const ten = getRecords("10")[0] || {};
  const fifteen = getRecords("15") || [];
  const thirty = getRecords("30") || [];
  const forty = getRecords("40") || [];
  const fortytwo = getRecords("42") || [];
  const fortythree = getRecords("43") || [];
  const ninety = getRecords("90")[0] || {};
  
  
// Use grouped 30s with their 40s and 42s
  const group304042 = await group30With40and42(records);
// Use grouped 30s with their 43s
  const group3043 = await group30With43(records);

// MARK: Delete existing records for the given CT and flag
const result = await pool.query('SELECT COUNT(*) FROM public."867_SNF_Header" WHERE hdr_key = $1 and hdr_type = $2', [CT["Record Key (10-digit integer)"], CT["Type (T=Toll; M=Margin; D=Direct Ship)"]]);
if (result.rows[0].count > 0) {
  await pool.query('DELETE FROM public."867_SNF_Header" WHERE hdr_key = $1 and hdr_type = $2', [CT["Record Key (10-digit integer)"], CT["Type (T=Toll; M=Margin; D=Direct Ship)"]]);
  //await pool.query('DELETE FROM public."867_Invex_InterchangeControl" WHERE ictl_key = $1', [CT["Record Key (10-digit integer)"]]);
}

let SysDteYYYYMMDD = new Date().toLocaleDateString('en-CA').replaceAll('-', '');
let SysTimeHHMMSS = new Date().toTimeString().slice(0, 8).replaceAll(':', '').padStart(6, '0');

//   Insert into 867 Tables
  await insert867Header(pool, CT, ten, fifteen, ninety, flag);

// Insert names from the fifteen records
  const namesPromises = fifteen.map(async (fifteen) => {
      await insert867Names(pool, CT, fifteen, flag);
      return Promise.resolve();
    });

  await Promise.all(namesPromises);

// Insert details from the grouped 30s with their 40s and 42s
  const detailsPromises = group304042.flatMap((Thirty) =>
    Thirty._40s.map((Forty) => insert867Detail(pool, CT, Thirty, Forty, Forty._42s[0], flag))
  );

await Promise.all(detailsPromises);

// Insert 43 records from the grouped 30s with their 43s
  const PIDPromises = group3043.flatMap((Thirty) =>
    Thirty._43s.map((FortyThree) => insert867PID(pool, CT, Thirty, FortyThree, flag))
  );

  await Promise.all(PIDPromises);


  //MARK: Header
   // Header Insert
async function insert867Header(pool, CT, ten, fifteen, ninety, flag) {
  try {
    await pool.query(`
     INSERT INTO public."867_SNF_Header"(hdr_type, hdr_key, hdr_isnd_id, hdr_gsnd_id, hdr_ircv_id, hdr_grcv_id, hdr_ictl_no, hdr_gctl_no, hdr_stctl_no, hdr_snt_date, hdr_snt_time, hdr_bpt01, hdr_bpt02, hdr_bpt03, hdr_bpt04, hdr_bpt05, hdr_bpt06, hdr_bpt07, hdr_bpt08, hdr_bpt09, hdr_bpt10, hdr_effective_date, hdr_effective_time, hdr_effective_time_zone, hdr_manf_id_qual, hdr_manf_id, hdr_outside_proc_id_qual, hdr_outside_proc_id, hdr_supp_id_qual, hdr_supp_id, hdr_ult_end_cust_id_qual, hdr_ult_end_cust_id, hdr_ctt1, hdr_ctt2, hdr_sttx_locn, hdr_crt_date, hdr_crt_time, hdr_crt_pgm, hdr_acrj_flag, hdr_acrj_date, hdr_acrj_time, hdr_acrj_user, hdr_sent_flag, hdr_flow_flag)
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41, $42, $43, $44)
    `, [
      CT["Type (T=Toll; M=Margin; D=Direct Ship)"],  //$1 hdr_type
      CT["Record Key (10-digit integer)"],           //$2 hdr_key
      CT["ISA Sender ID"],        //$3 hdr_isnd_id
      CT["GS Sender ID"],         //$4 hdr_gsnd_id  
      CT["ISA Receiver ID"],       //$5 hdr_ircv_id
      CT["GS Receiver ID"],       //$6 hdr_grcv_id
      CT["ISA Control Number"],   //$7 hdr_ictl_no
      CT["GS Control Number"],    //$8 hdr_gctl_no
      CT["ST Control Number"],    //$9 hdr_stctl_no
      ten["Date Sent"] ? ten["Date Sent"] : null, //$10 hdr_snt_date
      ten["Time Sent"]  ? ten["Time Sent"].slice(0, 4) : null, //$11 hdr_snt_time
      ten["Transaction Set Purpose Code"], //$12 hdr_bpt01
      ten["ReApp Reference ID"], //$13 hdr_bpt02
      ten["ReApp Date"] ? ten["ReApp Date"] : null, //$14 hdr_bpt03
      ten["Report Type Code"], //$15 hdr_bpt04
      ten["Price Multiplier Qualifier"], //$16 hdr_bpt05    
      ten["Multiplier"] ? ten["Multiplier"] : null,   //$17 hdr_bpt06
      ten["Action Code"], //$18 hdr_bpt07
      ten["Time"] ? ten["Time"].slice(0, 4) : null, //$19 hdr_bpt08
      ten["Reference ID"],  //$20 hdr_bpt09
      ten["Security Level Code"], //$21 hdr_bpt10
      ten["Effective Date"] ? ten["Effective Date"] : null, //$22 hdr_effective_date
      ten["Effective Time"] ? ten["Effective Time"].slice(0, 6) : null, //$23 hdr_effective_time
      ten["Effective Time Zone"], //$24 hdr_effective_time_zone
      ten["Manufacturer ID Qualifier"], //$25 hdr_manf_id_qual
      ten["Manufacturer ID"], //$26 hdr_manf_id
      ten["Outside Processor ID Qualifier"], //$27 hdr_outside_proc_id_qual
      ten["Outside Processor ID"], //$28 hdr_outside_proc_id
      ten["Supplier ID Qualifier"], //$29 hdr_supp_id_qual
      ten["Supplier ID"], //$30 hdr_supp_id
      ten["Ultimate Customer ID Qualifier"], //$31 hdr_ult_end_cust_id_qual
      ten["Ultimate Customer ID"], //$32 hdr_ult_end_cust_id
      ninety["Number of Line Items"] ? ninety["Number of Line Items"] : null, //$33 hdr_ctt1   
      ninety["Hash Total"] ? ninety["Hash Total"] : null, //$34 hdr_ctt2     
      null, //$35 hdr_sttx_locn
      SysDteYYYYMMDD, //$36 hdr_crt_date
      SysTimeHHMMSS, //$37 hdr_crt_time
      "867_Insert",   //$38 hdr_crt_pgm
      null, //$39 hdr_acrj_flag
      null,    //$40 hdr_acrj_date
      null,   //$41 hdr_acrj_time
      null,    //$42 hdr_acrj_user
      null, //$43 hdr_sent_flag
      flag //$44 hdr_flow_flag
    ]);

  }  catch (err) {
    console.error("Error inserting 867 header:", err);
    throw new Error(readableErrors(err));
  }
}

//MARK: Names
  //867 Names Insert
async function insert867Names(pool, CT, fifteen, flag) {
 try {
    await pool.query( `INSERT INTO public."867_SNF_Names"(
	  name_type, name_key, name_qual, name_qual_id, name_id, name_name, name_addr1, name_addr2, name_city, name_state, name_zip, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_resp_party_cd, name_crt_dte, name_crt_tim, name_crt_pgm, name_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"],  //$1 name_type
    CT["Record Key (10-digit integer)"],           //$2 name_key
    fifteen["AddressTypeCode"],                    //$3 name_qual
    fifteen["Address ID Qualifier"],           //$4 name_qual_id
    fifteen["Address ID"],            //$5 name_id
    fifteen["Name"],               //$6 name_name
    fifteen["Address Line 1"],             //$7 name_addr1
    fifteen["Address Line 2"],            //$8 name_addr2
    fifteen["City"],          //$9 name_city
    fifteen["State/Province"],        //$10 name_state
    fifteen["Postal Code"],        //$11 name_zip
    fifteen["Customer Country Code"],       //$12 name_ctry_cd
    fifteen["Contact Name"],       //$13 name_cont_name
    fifteen["Contact Telephone"],       //$14 name_cont_phn
    fifteen["Contact Email"],       //$15 name_cont_eml
    fifteen["Responsible Party Code"],       //$16 name_resp_party_cd
    SysDteYYYYMMDD,    //$17 name_crt_dte
    SysTimeHHMMSS,   //$18 name_crt_tim       
    "867_Insert", //$19 name_crt_pgm
    flag //$20 name_flow_flag
  ]);
  } catch (error) {
    // const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"]);
    // console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
    console.log(error);
  }
}

//MARK: Details
  //867 Details Insert

async function insert867Detail(pool, CT, Thirty, Forty, FortyTwo, flag) {
  try {
    await pool.query(`
     INSERT INTO public."867_SNF_Detail"(dtl_type, dtl_key, dtl_seq_no, dtl_tfr_typ_code, dtl_price_mult_qual, dtl_mult, dtl_ref_id_qual, dtl_ref_id, dtl_tfr_mov_code, dtl_po_no, dtl_rls_no, dtl_chg_ord_seq_no, dtl_po_date, dtl_po_lin_no, dtl_contr_no, dtl_po_typ_code, dtl_ult_cust_po_no, dtl_part_no, dtl_sub_part_no, dtl_ult_end_cust_id_qual, dtl_ult_end_cust_id, dtl_discr_qty, dtl_itm_lin_no, dtl_mill_ord_no, dtl_mill_ord_lin_no, dtl_mill_coil_no, dtl_heat, dtl_buy_part_no, dtl_grade_code, dtl_tag_type, dtl_tag_id, dtl_eff_date, dtl_eff_time, dtl_eff_time_zn, dtl_mat_class, dtl_qual_sts, dtl_mat_sts, dtl_reapp_act, dtl_sttx_locn, dtl_crt_date, dtl_crt_time, dtl_crt_pgm, dtl_flow_flag)
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41, $42, $43)
    `, [
      CT["Type (T=Toll; M=Margin; D=Direct Ship)"],  //$1 dtl_type
      CT["Record Key (10-digit integer)"],           //$2 dtl_key
      Forty.index40,                         //$3 dtl_seq_no
      Thirty["Product Transfer Type Code"],                      //$4 dtl_tfr_typ_code
      Thirty["Price Multiplier Qualifier"],             //$5 dtl_price_mult_qual
      Thirty["Multiplier"] ? Thirty["Multiplier"] : null,   //$6 dtl_mult
      Thirty["Reference ID Qualifier"],                 //$7 dtl_ref_id_qual
      Thirty["Reference ID"],                            //$8 dtl_ref_id
      Thirty["Product Transfer Movement Type Code"],                  //$9 dtl_tfr_mov_code
      Thirty["Purchase Order Number"],                   //$10 dtl_po_no
      Thirty["Release Number"],                          //$11 dtl_rls_no
      Thirty["Change Order Sequence Number"],           //$12 dtl_chg_ord_seq_no
      Thirty["Purchase Order Date"] ? Thirty["Purchase Order Date"] : null,                     //$13 dtl_po_date
      Thirty["Purchase Order Line Number"],              //$14 dtl_po_lin_no
      Thirty["Contract Number"],                         //$15 dtl_contr_no
      Thirty["Purchase Order Type Code"],                //$16 dtl_po_typ_code
      Thirty["Ultimate Customer PO Number"],  //$17 dtl_ult_cust_po_no
      Thirty["Part Number"],                             //$18 dtl_part_no
      Thirty["Substitute Part Number"],                         //$19 dtl_sub_part_no
      Thirty["Ultimate Customer ID Qualifier"],       //$20 dtl_ult_end_cust_id_qual
      Thirty["Ultimate Customer ID"], //$21 dtl_ult_end_cust_id
      Forty["Quantity"] ? Forty["Quantity"] : null, //$22 dtl_discr_qty
      Forty["Item Line Number"], //$23 dtl_itm_lin_no
      Forty["Vendor (Mill) Order Number"], //$24 dtl_mill_ord_no
      Forty["Vendor (Mill) Item/Line Number"], //$25 dtl_mill_ord_lin_no
      Forty["Mill Coil Number"], //$26 dtl_mill_coil_no
      Forty["Heat Number"], //$27 dtl_heat
      Forty["Buyer's Part Number"], //$28 dtl_buy_part_no This needs to be renamed in the SNF Decoder
      Forty["Grade Code"], //$29 dtl_grade_code
      null, //$30 dtl_tag_type 
      Forty["Tag ID"], //$31 dtl_tag_id
      Forty["Effective Date"] ? Forty["Effective Date"] : null, //$32 dtl_eff_date
      Forty["Effective Time"] ? Forty["Effective Time"].slice(0, 6) : null, //$33 dtl_eff_time
      Forty["Effective Time Zone"], //$34 dtl_eff_time_zn
      FortyTwo ? FortyTwo["Material Classification (AISI Table 67)"] : null, //$35 dtl_mat_class
      FortyTwo ? FortyTwo["Quality Status Code (AISI Table 68)"] : null, //$36 dtl_qual_sts
      FortyTwo ? FortyTwo["Material Status (AISI Table 70)"] : null, //$37 dtl_mat_sts
      FortyTwo ? FortyTwo["ReApplication Action Code (AISI Table 75)"] : null, //$38 dtl_reapp_act
      null, //$39 dtl_sttx_locn
      SysDteYYYYMMDD, //$40 dtl_crt_date
      SysTimeHHMMSS, //$41 dtl_crt_time
      "867_Insert",   //$42 dtl_crt_pgm
      flag            //$43 dtl_flow_flag
    ]);

  }  catch (err) {
    console.error("Error inserting 867 header:", err);
    throw new Error(readableErrors(err));
  }
} 

// MARK: PID
  //867 PID Insert

async function insert867PID(pool, CT, Thirty,  FortyThree, flag) {
  try {
    await pool.query(`
     INSERT INTO public."867_SNF_PID"(pid_type, pid_key, pid_seq_no, pid_pid_seq_no, pid_itm_desc_typ, pid_prd_char_code, pid_agency_qual_code, pid_prod_desc_code, pid_desc, pid_surf_lay_pos_code, pid_source_subq, pid_cond_resp_code, pid_lang_code, pid_sttx_locn, pid_crt_dat, pid_crt_tim, pid_crt_pgm, pid_flow_flag)
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [
      CT["Type (T=Toll; M=Margin; D=Direct Ship)"],  //$1 pid_type
      CT["Record Key (10-digit integer)"],           //$2 pid_key
      FortyThree.index40,                         //$3 pid_seq_no
      FortyThree.index43, //$4 pid_pid_seq_no
      FortyThree["Item Description Type"], //$5 pid_itm_desc_typ
      FortyThree["Product/Process Characteristic Code"], //$6 pid_prd_char_code
      FortyThree["Agency Qualifier Code"], //$7 pid_agency_qual_code
      FortyThree["Product Description Code"], //$8 pid_prod_desc_code
      FortyThree["Description"], //$9 pid_desc
      FortyThree["Surface/Layer/Position Code"], //$10 pid_surf_lay_pos_code
      FortyThree["Source Subqualifier"], //$11 pid_source_subq
      FortyThree["Condition/Response Code"], //$12 pid_cond_resp_code
      FortyThree["Language Code"], //$13 pid_lang_code  
      null, //$14 pid_sttx_locn
      SysDteYYYYMMDD, //$15 pid_crt_date
      SysTimeHHMMSS, //$16 pid_crt_time
      "867_Insert",   //$17 pid_crt_pgm
      flag            //$18 pid_flow_flag
    ]);

  }  catch (err) {
    console.error("Error inserting 867 header:", err);
    throw new Error(readableErrors(err));
  }
} 














}

module.exports = {
  LoadI867SNF
};
     
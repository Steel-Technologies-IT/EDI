const cleo = require("../../db") 




async function LoadI863SNF(pool, records, flag) {

  const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');


  function group30With32(records) {
    const result = [];
    let current30 = null;
     for (const rec of records) {
      if (rec.record_code === "30") {
        current30 = { ...rec, _32s: [] }; // Create a new object with all 30 fields and an empty _32s array
        result.push(current30);
      } else if (rec.record_code === "32" && current30) {
        current30._32s.push({ ...rec }); // Push the full 32 record, not just record_code
      } else if (rec.record_code === "90") {
        current30 = null;
      }
      
    }
    return result;
  }

function group30With40(records) {
    const result = [];
    let current30 = null;
     for (const rec of records) {
      if (rec.record_code === "30") {
        current30 = { ...rec, _40s: [] }; // Create a new object with all 30 fields and an empty _40s array
        result.push(current30);
      } else if (rec.record_code === "40" && current30) {
        current30._40s.push({ ...rec }); // Push the full 40 record, not just record_code
      } else if (rec.record_code === "90") {
        current30 = null;
      }
      
    }
    return result;
  }



  // Implementation for loading I863 SNF data into the database
  const getRecords = (code) => records.filter(r => r.record_code === code);
   // Extract records by code
  const CT = getRecords("CT")[0] || {};
  const ten = getRecords("10")[0] || {};
  const eleven = getRecords("11") || [];
  const fifteen = getRecords("15") || [];
  const thirty = getRecords("30") || [];
  const thirtytwo = getRecords("32") || [];
  const forty = getRecords("40") || [];
  const ninety = getRecords("90")[0] || {};

// Use grouped 30s with their 32s
  const groupedItems30_32 = group30With32(records);

// Use grouped 30s with their 32s
  const groupedItems30_40 = group30With40(records);

  //Insert into tables functions
  //Insert into 863 Header
  await insert863Header(pool, CT, ten, fifteen, ninety, flag, ymd, hms);

  //Insert Into Header level Notes
  const hdrNotesPromises = eleven.map(async (eleven,index) => {
  await insert863Notes(pool, CT, eleven, index, flag, ymd, hms);
  return Promise.resolve();
  });
  await Promise.all(hdrNotesPromises);

  //Insert Into Name
  const namesPromises = fifteen.map(async (fifteen) => {
      await insert863Names(pool, CT, fifteen, flag, ymd, hms);
      return Promise.resolve();
  });
  await Promise.all(namesPromises);
  
  //Insert Into Detail
  const detailPromises = thirty.map(async (thirty,index30) => {
      await insert863Detail(pool, CT, fifteen, thirty, index30, flag, ymd, hms);
      return Promise.resolve();
  });
  await Promise.all(detailPromises);

  //Insert Into Measures
  const measurePromises = groupedItems30_40.map(async (thirty,index30) => {
    if (thirty._40s && thirty._40s.length > 0) {
      return Promise.all(
    thirty._40s.map(async(forty, index40) => {
    await insert863Measure(pool, CT, thirty, index30, forty, index40, flag, ymd, hms); 
    }) )}
    return Promise.resolve();
  });
  await Promise.all(measurePromises);

  //Insert Into Detail Notes
  const dtlNotesPromises = groupedItems30_32.map(async (thirty,index30) => {
     if (thirty._32s && thirty._32s.length > 0) {
    return Promise.all(
    thirty._32s.map(async(thirtytwo, index32) => {
    await insert63DetailNotes(pool, CT, index30, thirtytwo, index32, flag, ymd, hms); // Assuming you want to insert notes for the first 32 in each group
    }))
    }
    return Promise.resolve();
  });
  await Promise.all(dtlNotesPromises);

    return null; // Return null to indicate successful completion

}


//MARK: Header
// This function inserts the header record into the 863 SNF Header table
async function insert863Header(pool, CT, ten, fifteen, ninety, flag, ymd, hms) {
  try {
      const hdr_dest_line = fifteen.find(m => ["ST", "PT", "OU"].includes(m["AddressTypeCode"]));
      const hdr_buyer_line = fifteen.find(m => ["BY"].includes(m["AddressTypeCode"]));
    await pool.query(`
     INSERT INTO public."863_SNF_Header"(
	hdr_type, hdr_key, hdr_isnd_id, hdr_gsnd_id, hdr_ircv_id, hdr_grcv_id, hdr_ictl_no, hdr_gctl_no, hdr_stctl_no, hdr_bsn_cd, hdr_bsn_dte, hdr_bsn_tme, hdr_rtyp_cd, hdr_shpid, hdr_bol_no, hdr_mbol_no, hdr_shp_dte, hdr_shp_tme, hdr_shp_tzn, hdr_destid, hdr_byid, hdr_sum_hl_seg, hdr_sum_hsh_ttl, hdr_sum_wgt_ttl, hdr_sttx_locn, hdr_crt_dat, hdr_crt_tim, hdr_crt_pgm, hdr_flow_flag, hdr_isa_qual, hdr_ircv_qual, hdr_ref_id, hdr_ref_id_2)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33);
    `, [
      CT["Type (T=Toll; M=Margin; D=Direct Ship)"],  //$1
      CT["Record Key (10-digit integer)"],           //$2
      CT["ISA Sender ID"],          //$3
      CT["GS Sender ID"],           //$4  
      CT["ISA Receiver ID"],        //$5
      CT["GS Receiver ID"],         //$6
      CT["ISA Control Number"],     //$7
      CT["GS Control Number"],      //$8
      CT["ST Control Number"],      //$9
      ten["Transaction Purpose Code"],     //$10
      ten["Test Date"] ? ten["Test Date"] : null,       //$11
      ten["Test Time"] ? ten["Test Time"] : null,        //$12
      ten["Report Type Code"],     //$13
      ten["Shipment ID"],   //$14
      ten["Bill Of Lading Number"],     //$15
      ten["Shipment Notice/Manifest Number"],   //$16
      ten["Ship Date"]  ? ten["Ship Date"] : null,    //$17
      ten["Ship Time"] ? ten["Ship Time"] : null,    //$18
      ten["Ship Time Zone"], //$19
      hdr_dest_line ? hdr_dest_line["Address ID"] : null, //$20
      hdr_buyer_line ? hdr_buyer_line["Address ID"] : null, //$21 
      ninety["Number of Line Items"] ? ninety["Number of Line Items"] : null, //$22
      ninety["Hash Total"] ? ninety["Hash Total"] : null,   //$23
      ninety["Weight"] ? ninety["Weight"] : null,   //$24
      null,              //$25 Location
      Number(ymd),    //$26
      Number(hms),   //$27
      "863i.js",    //$28
      flag,  //$29
      CT["ISA Sender ID Qualifier"], //$30
      CT["ISA Receiver ID Qualifier"], //$31
      ten["Reference ID"], //$32
      ten["Reference ID 2"] //$33
       ]);

  } catch (error) {
    console.error('Error inserting 863 header record:', error);
  }
};

//MARK: Notes
  //This function inserts the notes records into the 863 SNF Notes table
async function insert863Notes(pool, CT, eleven, index, flag, ymd, hms) {
 try {
    await pool.query( `INSERT INTO public."863_SNF_Notes"(
	note_type, note_key, note_nref, note_seq, note_text, note_odat, note_tim, note_opgm, note_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],      //$2
    eleven["Note Reference Code"], // $3
    index + 1, // $4
    eleven["Note Text"], //$5
    Number(ymd),    //$6
    Number(hms),   //$7       
    "863i", //$8
    flag //$9
  ]);
  

  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 863 Notes Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }
}

//MARK: Names
// This function inserts the names records into the 863 SNF Names table
async function insert863Names(pool, CT, fifteen, flag, ymd, hms) {
 try {
      await pool.query( `INSERT INTO public."863_SNF_Names"(
	name_type, name_key, name_qual, name_qual_id, name_id, name_name, name_addr1, name_addr2, name_city, name_state, name_zip, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_resp, name_crt_dte, name_crt_tme, name_crt_pgm, name_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],          //$2
    fifteen["AddressTypeCode"],                    //$3
    fifteen["Address ID Qualifier"],           //$4  
    fifteen["Address ID"],            //$5  
    fifteen["Name"],               //$6  
    fifteen["Address Line 1"],              //$7
    fifteen["Address Line 2"],              //$8
    fifteen["City"],             //$9
    fifteen["State/Province"],            //$10
    fifteen["Postal Code"],          //$11
    fifteen["Customer Country Code"],        //$12
    fifteen["Contact Name"],        //$13
    fifteen["Contact Telephone"],       //$14
    fifteen["Contact Email"],       //$15
    fifteen["Responsible Party Code"], //$16
    Number(ymd),    //$17
    Number(hms),   //$18       
    "863i", //$19
    flag //$20
  ]);



  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 863 Names Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }
}

//MARK: Detail
// This function inserts the detail records into the 863 SNF Detail table
async function insert863Detail(pool, CT, fifteen, thirty, index30, flag, ymd, hms) {
  const hdr_mf_line = fifteen.find(m => ["MF", "SU", "PV", "SF"].includes(m["AddressTypeCode"]));
  try {
    await pool.query(`
      INSERT INTO public."863_SNF_Detail"(
	dtl_type, dtl_key, dtl_line, dtl_heat, dtl_mcoil, dtl_mo, dtl_mol, dtl_po, dtl_pol, dtl_pod, dtl_part, dtl_tst_unt, dtl_tdat, dtl_pdat, dtl_n1st, dtl_n1mf, dtl_locn, dtl_crt_dat, dtl_crt_tim, dtl_crt_pgm, dtl_flow_flag, dtl_prd_dte, dtl_shp_dte, dtl_heat_trt_csh_dte, dtl_lub_app_dte, dtl_prev_proc_tag_id)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26);
    `, [
      //variables
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],          //$2
    index30 + 1,  //$3
    thirty["Heat Number"],           //$4 
    thirty["Mill Coil Number"],   //$5
    thirty["Vendor (Mill) Order Number"],    //$6
    thirty["Vendor (Mill) Item/Line Number"],   //$7
    thirty["Purchase Order Number"],   //$8
    thirty["Purchase Order Line Number"], //$9
    thirty["Purchase Order Date"] ? thirty["Purchase Order Date"] : null,  //$10
    thirty["Part Number"],  //$11
    thirty["Tested Unit (Coil ID)"],   //$12
    thirty["Test Performed Date"] ? thirty["Test Performed Date"] : null,   //$13
    thirty["Process Date"] ? thirty["Process Date"] : null,   //$14
    thirty["Ship-To Idenfier"],  //$15
    hdr_mf_line ? hdr_mf_line["Address ID"] : null,  //$16
    null,   //$17
    Number(ymd),    //$18
    Number(hms),   //$19       
    "863i", //$20
    flag,  //$21
    thirty["Production Date (Mill Manufactured date)"] ? thirty["Production Date (Mill Manufactured date)"] : null,    //$22
    thirty["Shipment Date"] ? thirty["Shipment Date"] : null, //$23
    thirty["Heat Treat (CASH) Date"] ? thirty["Heat Treat (CASH) Date"] : null,   //$24
    thirty["Lube Application Date"] ? thirty["Lube Application Date"] : null,   //$25
    thirty["OP tag number / Previous ID"]  // $26
    ]);

  } catch (error) {
    console.error('Error inserting 863 Detail:', error);
  }
}

//MARK: Measures
// This function inserts the measurement records into the 863 SNF Measure table
async function insert863Measure(pool, CT, thirty, index30, forty, index40, flag, ymd, hms) {
    try {
    await pool.query(`
      INSERT INTO public."863_SNF_Measure"(
	msr_type, msr_key, msr_line, msr_heat, msr_mcoil, msr_mea1, msr_mea2, msr_mea3f, msr_mea3, msr_mea4, msr_mea9, msr_tdat, msr_pdat, msr_mchr, msr_spsc, msr_sdir, msr_posc, msr_meth, msr_agq, msr_dscd, msr_locn, msr_odat, msr_otim, msr_opgm, msr_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25);
    `, [
      //variables
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],          //$2
    index30 + 1,  //$3
    thirty["Heat Number"],           //$4 
    thirty["Mill Coil Number"],   //$5 
    forty["Measurement Reference"], // $6
    forty["Measurement Qualifier"],   //$7
    forty["Measurement Trace"],   //$8
    forty["Measurement Value"] ? forty["Measurement Value"] : null,   //$9
    forty["Measurement UOM"],   //$10
    forty["Surface/Layer/Position Code"],   //$11
    forty["Test Performed Date"] ? forty["Test Performed Date"] : null,    //$12
    forty["Process Date"] ? forty["Process Date"] : null,   //$13
    forty["Measurement Characteristic"],   //$14
    forty["Sample Process Status Code"],    //$15
    forty["Sample Direction Code"],   //$16
    forty["Position Code"],   //$17
    forty["Test Method Characteristic"],   //$18
    forty["Agency Qualifier Code"],   //$19
    forty["Test Description Code"],    //$20
    null,   //$21
    Number(ymd),    //$22
    Number(hms),   //$23       
    "863i", //$24
    flag //$25
    ]);


  } catch (error) {
    console.error('Error inserting 863 Measurement:', error);
  }
}


//MARK: Detail Notes
// This function inserts the detail notes records into the 863 SNF Notes table
async function insert63DetailNotes(pool, CT, index30, thirtytwo, index32, flag, ymd, hms) {
 try {
    await pool.query( `INSERT INTO public."863_SNF_DetailNotes"(
  dtln_type, dtln_key, dtln_line, dtln_seq, dtln_text, dtln_odat, dtln_otim, dtln_opgm, dtln_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],      //$2
    index30 + 1, // $3 
    index32 + 1, //$4 
    thirtytwo["Comment"], // $5
    Number(ymd),    //$6
    Number(hms),   //$7       
    "863i", //$8
    flag //$9
  ]);


  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 863 Detail Notes Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }
}



module.exports = {
    LoadI863SNF
}


// This module handles the insertion of parsed EDI 862 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.


const cleo = require("../../db") 

async function LoadI862SNF(pool, records, flag) {
  // Group 30s with their associated 40s
  async function group30With40(records) {
    const result = [];
    let current3040 = null;
    for (const rec of records) {
      if (rec.record_code === "30") {
        current3040 = { ...rec, _40s: [] }; // Create a new object with all 30 fields and an empty _40s array
        result.push(current3040);
      } else if (rec.record_code === "40" && current3040) {
        current3040._40s.push({ ...rec }); // Push the full 40 record, not just record_code
      } else if (rec.record_code === "50" || rec.record_code === "90") {
        current3040 = null;

      }
    }
    return result;
  }
  // Group 30s with their associated 50s
  async function group30With50(records) {
    const result = [];
    let current3050 = null;
    for (const rec of records) {
      if (rec.record_code === "30") {
        current3050 = { ...rec, _50s: [] }; // Create a new object with all 30 fields and an empty _50s array
        result.push(current3050);
      } else if (rec.record_code === "50" && current3050) {
        current3050._50s.push({ ...rec }); // Push the full 50 record, not just record_code
      } else if (rec.record_code === "40") {
        continue; // Skip 40 records
      } else if (rec.record_code === "90") {
        current3050 = null;
      }
    }
    return result;
  }
  const getRecords = (code) => records.filter(r => r.record_code === code);

  // Extract records by code
  const CT      = getRecords("CT")[0] || {};
  const ten     = getRecords("10")[0] || {};
  const eleven  = getRecords("11") || [];
  const fifteen = getRecords("15") || [];
  const thirty  = getRecords("30") || [];
  const forty   = getRecords("40") || [];
  const fifty   = getRecords("50") || [];
  const ninety  = getRecords("90")[0] || {};


// Use grouped 30s with their 40s
  const groupedItems3040 = await group30With40(records);
  //console.log('Group3040', groupedItems3040[0]._40s);

// Use grouped 30s with their 50s
  const groupedItems3050 = await group30With50(records);
  //console.log('Group3050', groupedItems3050[0]._50s);
  //exit;

// Insert into 862 Tables
  await insert862Header(pool, CT, ten, ninety, flag);

  // Insert names from the fifteen records
    const namesPromises = fifteen.map(async (address) => {
      await insert862Names(pool, CT, address, flag);
          return Promise.resolve();
    });

  await Promise.all(namesPromises);

  // Insert into 862 Tables
  // Insert Notes from the eleven records
    const notesPromises = eleven.map(async (note, index) => {
      await insert862Notes(pool, CT, note, index, flag);
      return Promise.resolve();
    });

  await Promise.all(notesPromises);

    const detailPromises = thirty.map(async (thirtyRec, index) => {
    await insert862Detail(pool, CT, thirtyRec, index, groupedItems3050, flag);
     return Promise.resolve();
  });

  await Promise.all(detailPromises);


    const detailForecastPromises = thirty.map(async (thirtyRec, index30) => {
      groupedItems3040[index30]._40s.map(async (fortyRec, index40) => {
      await insert862Forecast(pool, CT, thirtyRec, index30, fortyRec, index40, flag);
       return Promise.resolve();
    });
      
      });
  await Promise.all(detailForecastPromises);

   // Insert Detail Ship records
      const detailShipPromises = thirty.map(async (thirtyRec, index30) => {
        groupedItems3050[index30]._50s.map(async (fiftyRec, index50) => {
        await insert862DetailShip(pool, CT, thirtyRec, index30, fiftyRec, index50, flag);
});

        return Promise.resolve();
      });
  await Promise.all(detailShipPromises);
  
  function numOrNull(val) {
      return val === "" || val === undefined ? null : Number(val);
}
//MARK: Header
//862 Header Insert
async function insert862Header(pool, CT, ten, ninety, key) {
  try {

    await pool.query(`INSERT INTO public."862_SNF_Header"(
    hdr_type,
    hdr_key,
    hdr_isnd_id,
    hdr_gsnd_id,
    hdr_ircv_id,
    hdr_grcv_id,
    hdr_ictl_no,
    hdr_gctl_no,
    hdr_stctl_no,
    hdr_sentdte,
    hdr_senttme,
    hdr_purp_cde,
    hdr_sschd_ref,
    hdr_schd_iss_dte,
    hdr_schd_typ_q,
    hdr_schd_str_dte,
    hdr_schd_end_dte,
    hdr_rls_no,
    hdr_refid_two,
    hdr_contr_no,
    hdr_po_no,
    hdr_schd_qty_q,
    hdr_curr_rev_dte,
    hdr_curr_rev_tme,
    hdr_curr_rev_tme_z,
    hdr_supp_id_q,
    hdr_supp_id,
    hdr_ship_id_q,
    hdr_ship_id,
    hdr_bill_id_q,
    hdr_bill_id,
    hdr_mat_iss_q,
    hdr_mat_iss,
    hdr_ctt01,
    hdr_ctt02,
    hdr_sttx_locn,
    hdr_crt_dte,
    hdr_crt_tme,
    hdr_crt_pgm,
    hdr_flow_flag

      )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40)`, 
      [
      CT["Type (T=Toll; M=Margin; D=Direct Ship)"],
      CT["Record Key (10-digit integer)"],
      CT["ISA Sender ID"],
      CT["GS Sender ID"],
      CT["ISA Receiver ID"],
      CT["GS Receiver ID"],
      CT["ISA Control Number"],
      CT["GS Control Number"],
      CT["ST Control Number"],
      numOrNull(ten["Date Sent"]),
      numOrNull(ten["Time Sent"]),
      ten["Transaction Set Purpose Code"],
      ten["Schedule Reference ID"],
      numOrNull(ten["Schedule Issue Date"]),
      ten["Schedule Type Qualifier"],
      numOrNull(ten["Schedule Start Date"]),
      numOrNull(ten["Schedule End Date"]),
      ten["Release Number"],
      ten["Reference ID"],
      ten["Contract Number"],
      ten["Purchase Order Number"],
      ten["Schedule Quantity Qualifier"],
      numOrNull(ten["Current Revision Date"]),
      numOrNull(ten["Current Revision Time"]),
      ten["Current Revision Time Zone"],
      ten["Supplier/Processor/ShipFrom ID Qualifier"],
      ten["Supplier/Processor/ShipFrom ID"],
      ten["Ship-To ID Qualifier"],
      ten["Ship-To ID"],
      ten["Bill-To ID Qualifier"],
      ten["Bill-To ID"],
      ten["Material Issuer ID Qualifier"],
      ten["Material Issuer ID"],
      numOrNull(ninety["Number of Line Items"]),
      numOrNull(ninety["Hash Total"]),
      null,
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),
      "862i.js",
      key 
     ]);

    console.log('862 Header inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 862 Header Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }
};

  //862 Names Insert
async function insert862Names(pool, CT, fifteen, key) {
 try {
    
    await pool.query( `INSERT INTO public."862_SNF_Name"(
      name_type,
      name_key,
      name_name_qual,
      name_name_id_qual,
      name_name_id,
      name_name,
      name_addr1,
      name_addr2,
      name_city,
      name_state,
      name_zpcd,
      name_ctry_cd,
      name_cont_name,
      name_cont_phn,
      name_cont_eml,
      name_resp_party_cd,
      name_crt_dte,
      name_crt_tme,
      name_crt_pgm,
      name_flow_flag
)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"],
    CT["Record Key (10-digit integer)"],
    fifteen["AddressTypeCode"],
    fifteen["Address ID Qualifier"],
    fifteen["Address ID"],
    fifteen["Name"],
    fifteen["Address Line 1"],
    fifteen["Address Line 2"],
    fifteen["City"],
    fifteen["State/Province"],
    fifteen["Postal Code"],
    fifteen["Customer Country Code"],
    fifteen["Contact Name"],
    fifteen["Contact Telephone"],
    fifteen["Contact Email"],
    fifteen["Responsible Party Code"],
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),   
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),  
    "862_insert", 
    key
  ]);
    console.log('862 Names inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 862 Names Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }
}

//MARK: Detail
//862 Detail Insert
async function insert862Detail(pool, CT, thirty,index, groupedItems3050, key) {
 try {
  const DiscreteQty           = (groupedItems3050[index]._50s.find(m => ["01"].includes(m["Quantity Qualifier"])) || {})["Quantity"] || null;
  const CumulativeQty         = (groupedItems3050[index]._50s.find(m => ["02"].includes(m["Quantity Qualifier"])) || {})["Quantity"] || null;
  const CumulQtyShpShort      = (groupedItems3050[index]._50s.find(m => ["21"].includes(m["Quantity Qualifier"])) || {})["Quantity"] || null;
  const CumulQtyShplong       = (groupedItems3050[index]._50s.find(m => ["23"].includes(m["Quantity Qualifier"])) || {})["Quantity"] || null;
  const OrignalQty            = (groupedItems3050[index]._50s.find(m => ["28"].includes(m["Quantity Qualifier"])) || {})["Quantity"] || null;
  const shpId                 = (groupedItems3050[index]._50s.find(m => ["01"].includes(m["Quantity Qualifier"])) || {})["Shipment ID"] || null;

    // Use map for its 40 children

  await pool.query(`INSERT INTO public."862_SNF_Detail"(
	  dtl_type,
    dtl_key,
    dtl_scd_dtl_seq_n,
    dtl_line,
    dtl_part,
    dtl_po_no,
    dtl_pol,
    dtl_rls_no,
    dtl_eng_chg_l,
    dtl_part_desc,
    dtl_comp_part,
    dtl_rtn_cont_no,
    dtl_mat_spec_app_no,
    dtl_msa_no,
    dtl_hes_cd,
    dtl_surf_qlty,
    dtl_other,
    dtl_schd_uom,
    dtl_schd_unit_prc,
    dtl_schd_prc_uom,
    dtl_ul_in,
    dtl_ul_mm,
    dtl_width_in,
    dtl_width_mm,
    dtl_gauge_in,
    dtl_gauge_mm,
    dtl_uom,
    dtl_part_rls_sts_cde,
    dtl_part_rls_sts_dsc,
    dtl_rsp_pty_cstctr_alpha,
    dtl_rsp_pty_cstctr_no,
    dtl_prv_cust_ref_no,
    dtl_cust_ref_desc,
    dtl_schd_cont_nme,
    dtl_schd_cont_tele,
    dtl_shp_dlvy_cald_ptn_cde,
    dtl_shp_dlvy_patt_tme_cde,
    dtl_disc_qty,
    dtl_cum_qty,
    dtl_cum_qty_shp_short,
    dtl_cum_qty_shp_long,
    dtl_orig_qty,
    dtl_shp_id,
    dtl_sttx_locn,
    dtl_bol_no,
    dtl_crt_dte,
    dtl_crt_tme,
    dtl_crt_pgm,
    dtl_note,
    dtl_flow_flag
)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50)`,
[

  CT["Type (T=Toll; M=Margin; D=Direct Ship)"],
  CT["Record Key (10-digit integer)"],
  index + 1,
  thirty["Assigned ID"],
  thirty["Buyer's Part Number"],
  thirty["Purchase Order Number"],
  thirty["Purchase Order Line Number"],
  thirty["Release Number"],
  thirty["Engineering Change Level"],
  thirty["Part Description"],
  thirty["Company Part Number"],
  thirty["Returnable Container Number"],
  thirty["Material Specification Number (MSA#)"],
  thirty["MSA Reference Number"],
  thirty["HES Code"],
  thirty["Surface Quality"],
  thirty["Other Value"],
  thirty["Schedule Unit of Measure"],
  numOrNull(thirty["Schedule Unit Price"]),
  thirty["Schedule Price UOM"],
  numOrNull(thirty["Length (IN)"]),
  numOrNull(thirty["Length (MM)"]),
  numOrNull(thirty["Width (IN)"]),
  numOrNull(thirty["Width (MM)"]),
  numOrNull(thirty["Gauge (IN)"]),
  numOrNull(thirty["Gauge (MM)"]),
  thirty["Unit Of Measure"],
  thirty["Part Release Status Code"],
  thirty["Part Release Status Description"],
  thirty["Responsible Party/Cost Center Alpha"],
  thirty["Responsible Party/Cost Center Number"],
  thirty["Previous Customer Reference Number"],
  thirty["Previous Cust Reference Description"],
  thirty["Schedule Contact Name"],
  thirty["Schedule Contact Telephone"],
  thirty["Ship/Delivery or Calendar Pattern Code"],
  thirty["Ship/Delivery Pattern Time Code"],
  DiscreteQty,
  CumulativeQty,
  CumulQtyShpShort,
  CumulQtyShplong,
  OrignalQty,
  shpId ? numOrNull(shpId["Shipment ID"]) : null,
  null,
  thirty["Bill of Lading"],
  parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),
  parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),
  "862_insert",
  thirty["Notes/Comments"],
  key
]);
  console.log('862 SNF_Detail inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 862 SNF_Detail Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }
}

//MARK: Detail Forecast
//862 Detail Forecast Insert
async function insert862Forecast(pool, CT, thirtyRec, index30, fortyRec, index40, key) {
  try {
       
    // fcst_part: thirtyRec["Buyer's Part Number"], 
    // Use map for its 40 children
      await pool.query(`INSERT INTO public."862_SNF_Forecast"(
      fcst_type,
      fcst_key,
      fcst_sds_no,
      fcst_sdf_no,
      fcst_part,
      fcst_schd_uom,
      fcst_actqty,
      fcst_fqty,
      fcst_fqal,
      fcst_tqal,
      fcst_fdat,
      fcst_flxedt,
      fcst_dvytm,
      fcst_do,
      fcst_man_no,
      fcst_rls,
      fcst_schtyp,
      fcst_sttx_locn,
      fcst_dvy_ref,
      fcst_crt_dte,
      fcst_crt_tme,
      fcst_crt_pgm,
      fcst_flow_flag

      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23);`,
      [
        CT["Type (T=Toll; M=Margin; D=Direct Ship)"],
        CT["Record Key (10-digit integer)"],
        index30 + 1,
        index40 + 1,
        thirtyRec["Buyer's Part Number"],
        thirtyRec["Schedule Unit of Measure"],
        numOrNull(fortyRec["Actual Forecast Quantity"]),
        numOrNull(fortyRec["Forecast Quantity"]),
        fortyRec["Forecast Qualifier"],
        fortyRec["Forecast Timing Qualifier"],
        numOrNull(fortyRec["Forecast Date (start)"]),
        numOrNull(fortyRec["End Date for Flexible Forecast"]),
        numOrNull(fortyRec["Delivery Requested Time"]),
        fortyRec["Delivery Order Number"],
        fortyRec["Ship Notice/Manifest Number"],
        fortyRec["Release Number"],
        fortyRec["Plan Schedule Type Code"],
        null,
        fortyRec["Delivery Reference "],
        parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),
        parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),
        "862_insert",
        key
]);
  console.log('862 Forecast inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 862 Forecast Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  } 
}

//MARK: Detail Forecast
//862 Detail Forecast Insert
async function insert862DetailShip(pool, CT, thirtyRec, index30, fiftyRec, index50, key) {
  try {
      
    // Use map for its 40 children
      await pool.query(`INSERT INTO public."862_SNF_Schd_Ship"(
     ship_type,
     ship_key,
     ship_line,
     ship_lseq,
     ship_part,
     ship_uit1,
     ship_shp1,
     ship_shp2,
     ship_shp3,
     ship_shp4,
     ship_shp5,
     ship_shp6,
     ship_shp7,
     ship_sid,
     ship_crt_dte,
     ship_crt_tme,
     ship_crt_pgm,
     ship_flow_flag

      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18);`,
      [
        CT["Type (T=Toll; M=Margin; D=Direct Ship)"],
        CT["Record Key (10-digit integer)"],
        index30 + 1,
        index50 + 1,
        thirtyRec["Buyer's Part Number"],
        thirtyRec["Schedule Unit of Measure"],
        fiftyRec["Quantity Qualifier"],
        numOrNull(fiftyRec["Quantity"]),
        numOrNull(fiftyRec["Date/Time Qualifier"]),
        numOrNull(fiftyRec["Date"]),
        numOrNull(fiftyRec["Time"]),
        numOrNull(fiftyRec["Cumulative Quantity End Date"]),
        numOrNull(fiftyRec["Cumulative Quantity End Time"]),
        null,
        parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),
        parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),
        "862_insert",
        key
]);
  console.log('862_SNF_Schd_Ship inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 862 SNF_Schd_Ship Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  } 
}

// <-- Add this closing brace for LoadI862 SNF
} // <-- Properly close LoadI862SNF function

  module.exports = {
    LoadI862SNF
};


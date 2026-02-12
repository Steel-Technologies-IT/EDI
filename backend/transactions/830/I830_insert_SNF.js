// This module handles the insertion of parsed EDI 830 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.




async function LoadI830SNF(pool, records, flag) {
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

// Insert into 830 Tables
  await insert830Header(pool, CT, ten, ninety, flag);

  // Insert names from the fifteen records
    const namesPromises = fifteen.map(async (address) => {
      await insert830Names(pool, CT, address, flag);
          return Promise.resolve();
    });

  await Promise.all(namesPromises);

  // Insert into 830 Tables
 
  // Insert Notes from the eleven records
    const notesPromises = eleven.map(async (note, index) => {
      await insert830Notes(pool, CT, note, index, flag);
      return Promise.resolve();
    });

  await Promise.all(notesPromises);

    const detailPromises = thirty.map(async (thirtyRec, index) => {
    await insert830Detail(pool, CT, thirtyRec, index, groupedItems3050, flag);
     return Promise.resolve();
  });

  await Promise.all(detailPromises);

  // Insert Detail Forcast records
      // const detailForecastPromises = thirty.map(async (thirtyRec, index30) => {
      //   groupedItems3040[index30].map(async (fortyRec, index40) => {
      //   await insert830DetailForecast(pool, CT, thirtyRec, index30, fortyRec, index40, flag);
      //   });
    const detailForecastPromises = thirty.map(async (thirtyRec, index30) => {
      groupedItems3040[index30]._40s.map(async (fortyRec, index40) => {
      await insert830DetailForecast(pool, CT, thirtyRec, index30, fortyRec, index40, flag);
    });
        return Promise.resolve();
      });
  await Promise.all(detailForecastPromises);

   // Insert Detail Ship records
      const detailShipPromises = thirty.map(async (thirtyRec, index30) => {
        groupedItems3050[index30]._50s.map(async (fiftyRec, index50) => {
        await insert830DetailShip(pool, CT, thirtyRec, index30, fiftyRec, index50, flag);
});
        // groupedItems3050[index30].map(async (fiftyRec, index50) => {
        // await insert830DetailShip(pool, CT, thirtyRec, index30, fiftyRec, index50, flag);
        // });
        return Promise.resolve();
      });
  await Promise.all(detailShipPromises);
  
  function numOrNull(val) {
      return val === "" || val === undefined ? null : Number(val);
}
//MARK: Header
//830 Header Insert
async function insert830Header(pool, CT, ten, ninety, key) {
  try {
   
   await pool.query(`INSERT INTO public."830_SNF_Header"(
    hdr_type,
    hdr_key,
    hdr_isnd_id,
    hdr_gsnd_id,
    hdr_ircv_qual,
    hdr_ircv_id,
    hdr_ictl_no,
    hdr_gctl_no,
    hdr_stctl_no,
    hdr_sentdte,
    hdr_senttme,
    hdr_bfr01,
    hdr_bfr02,
    hdr_bfr03,
    hdr_bfr04,
    hdr_bfr05,
    hdr_bfr06,
    hdr_bfr07,
    hdr_bfr08,
    hdr_bfr09,
    hdr_bfr10,
    hdr_bfr11,
    hdr_bfr12,
    hdr_bfr13,
    hdr_rlsdt,
    hdr_rlstm,
    hdr_rlstmz,
    hdr_crtdt,
    hdr_crttm,
    hdr_crttmz,
    hdr_supidq,
    hdr_supid,
    hdr_shipfrmidq,
    hdr_shipfrmid,
    hdr_shiptoidq,
    hdr_shiptoid,
    hdr_billtoidq,
    hdr_billtoid,
    hdr_matissq,
    hdr_matissid,
    hdr_vendidq,
    hdr_vendid,
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
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41, $42, $43, $44, $45, $46, $47, $48, $49)
    `, [
      CT["Type (T=Toll; M=Margin; D=Direct Ship)"],
      CT["Record Key (10-digit integer)"],
      CT["ISA Sender ID"],
      CT["GS Sender ID"],
      CT["ISA Receiver ID"],
      CT["GS Receiver ID"],
      numOrNull(CT["ISA Control Number"]),
      numOrNull(CT["GS Control Number"]),
      numOrNull(CT["ST Control Number"]),
      numOrNull(ten["Date Sent"]),
      numOrNull(ten["Time Sent"]),
      ten["Transaction Set Purpose Code"],
      ten["Forecast Reference ID"],
      ten["Forecast Release Number"],
      ten["Schedule Type Qualifier"],
      ten["Schedule Qty Qualifier"],
      numOrNull(ten["Schedule Date"]),
      numOrNull(ten["Schedule Date"]),
      numOrNull(ten["Schedule Date"]),
      numOrNull(ten["Schedule Date"]),
      ten["Contract Number"],
      ten["Purchase Order Number"],
      ten["Planning Schedule Type Code"],
      ten["Action Code"],
      numOrNull(ten["Release Date"]),
      numOrNull(ten["Release Time"]),
      ten["Release Time Zone"],
      numOrNull(ten["Trans Create Date"]),
      numOrNull(ten["Trans Create Time"]),
      ten["Trans Create Time Zone"],
      ten["Suppier ID Qualifier"],
      ten["Supplier ID"],
      ten["Ship-From ID Qualifier"],
      ten["Ship-From ID"],
      ten["Ship-To ID Qualifier"],
      ten["Ship-To ID"],
      ten["Bill-To ID Qualifier"],
      ten["Bill-To ID"],
      ten["Issuer ID Qualifier"],
      ten["Issuer ID"],
      ten["Vendor ID Qualifier"],
      ten["Vendor ID"],
      numOrNull(ninety["Number of Line Items"]),
      numOrNull(ninety["Hash Total"]),
      null,
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),
      "830i.js",
      key 
     ]);

    //console.log('830 Header inserted successfully',);
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 830 Header Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }
};

  //830 Names Insert
async function insert830Names(pool, CT, fifteen, key) {
 try {
     await pool.query( `INSERT INTO public."830_SNF_Name"(
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
    "830_insert", 
    key
  ]);
    //console.log('830 Names inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 830 Names Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }
}

//Insert 830 Notes
async function insert830Notes(pool, CT, eleven,index, key) {
 try {
   await pool.query(`INSERT INTO public."830_SNF_DetailNotes"(
     dtln_type,
     dtln_key,
     dtln_nref,
     dtln_seq,
     dtln_text,
     dtln_crt_dte,
     dtln_crt_tme,
     dtln_crt_pgm,
     dtln_flow_flag
   )
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
   [
     CT["Type (T=Toll; M=Margin; D=Direct Ship)"],
     CT["Record Key (10-digit integer)"],
     eleven["Note/Comment Qualifier"],
     index + 1,
     eleven["Note/Comment Text"],
     parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),
     parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),
     "830_insert",
     key
   ]);
   //console.log('830 Notes inserted successfully');
 } catch (error) {
   console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 830 Notes Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
 }
}

//MARK: Detail
//830 Detail Insert
async function insert830Detail(pool, CT, thirty, index, groupedItems3050, key) {
 try {
  const DiscreteQty           = groupedItems3050[index]._50s.find(m => ["01"].includes(m["Quantity Qualifier"]));
  const CumulativeQty         = groupedItems3050[index]._50s.find(m => ["02"].includes(m["Quantity Qualifier"]));
  const QuantityRcvd          = groupedItems3050[index]._50s.find(m => ["87"].includes(m["Quantity Qualifier"]));
  const ShipNoticeQty         = groupedItems3050[index]._50s.find(m => ["12"].includes(m["Quantity Qualifier"]));
  const CumulativeQtyRejected = groupedItems3050[index]._50s.find(m => ["07"].includes(m["Quantity Qualifier"]));
  const PastDueQty            = groupedItems3050[index]._50s.find(m => ["64"].includes(m["Quantity Qualifier"]));
  const AcknowledgedQty       = groupedItems3050[index]._50s.find(m => ["90"].includes(m["Quantity Qualifier"]));

   await pool.query(`INSERT INTO public."830_SNF_Schd_Detail"(
	  dtl_type,
    dtl_key,
    dtl_line,
    dtl_id,
    dtl_part,
    dtl_vpart,
    dtl_partd,
    dtl_po,
    dtl_pol,
    dtl_rls,
    dtl_echg,
    dtl_grcd,
    dtl_fuse,
    dtl_msa_no,
    dtl_do,
    dtl_dock,
    dtl_n1stq,
    dtl_n1st,
    dtl_n1sfq,
    dtl_n1sf,
    dtl_n1maq,
    dtl_n1ma,
    dtl_n1miq,
    dtl_n1mi,
    dtl_n1suq,
    dtl_n1su,
    dtl_uit1,
    dtl_uit2,
    dtl_uit3,
    dtl_prs1,
    dtl_prs2,
    dtl_contnm,
    dtl_contph,
    dtl_rcqde,
    dtl_rcqc,
    dtl_rcqm,
    dtl_rcqds,
    dtl_fcqde,
    dtl_fcqc,
    dtl_fcqm,
    dtl_fcqds,
    dtl_mcqde,
    dtl_mcqc,
    dtl_mcqm,
    dtl_mcqds,
    dtl_disq,
    dtl_cumq,
    dtl_rcvq,
    dtl_shpq,
    dtl_rejq,
    dtl_lateq,
    dtl_ackq,
    dtl_sid,
    dtl_sttx_locn,
    dtl_crt_dte,
    dtl_crt_tme,
    dtl_crt_pgm,
    dtl_flow_flag
)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58)`,
[

  CT["Type (T=Toll; M=Margin; D=Direct Ship)"],
  CT["Record Key (10-digit integer)"],
  index + 1,
  thirty["Line Number/ID"],
  thirty["Buyer's Part Number"],
  thirty["Vendor's Part Number"],
  thirty["Part Description"],
  thirty["Purchase Order Number"],
  thirty["Purchase Order Line Number"],
  thirty["Release Number"],
  thirty["Engineering Change Level"],
  thirty["Grade Code"],
  thirty["Future LIN/REF value-2"],
  thirty["MSA#"],
  thirty["Delivery Order Number"],
  thirty["Dock Number"],
  thirty["Ship-To ID Qualifier"],
  thirty["Ship-To ID"],
  thirty["Ship-From ID Qualifier"],
  thirty["Ship-From ID"],
  thirty["Ultimate Customer ID Qualifier"],
  thirty["Ultimate Customer ID"],
  thirty["Issuer ID Qualifier"],
  thirty["Issuer ID"],
  thirty["Supplier ID Qualifier"],
  thirty["Supplier ID"],
  thirty["Schedule Unit-Of-Measure"],
  numOrNull(thirty["Schedule Unit Price"]),
  thirty["Schedule Price UOM"],
  thirty["Part Release Status Code"],
  thirty["Part Release Status Description"],
  thirty["Contact Name"],
  thirty["Contact Phone"],
  numOrNull(thirty["Required Cum Qty End Date"]),
  numOrNull(thirty["Required Cum Qty Current"]),
  numOrNull(thirty["Required Cum Qty Maximum"]),
  numOrNull(thirty["Required Cum Qty Start Date"]),
  numOrNull(thirty["Finished Cum Qty End Date"]),
  numOrNull(thirty["Finished Cum Qty Current"]),
  numOrNull(thirty["Finished Cum Qty Maximum"]), 
  numOrNull(thirty["Finished Cum Qty Start Date"]),
  numOrNull(thirty["Material Cum Qty End Date"]),
  numOrNull(thirty["Material Cum Qty Current"]),
  numOrNull(thirty["Material Cum Qty Maximum"]),
  numOrNull(thirty["Material Cum Qty Start Date"]),
  numOrNull(DiscreteQty ? DiscreteQty["Discrete Quantity"] : null),
  numOrNull(CumulativeQty ? CumulativeQty["Cumulative Quantity"] : null),
  numOrNull(QuantityRcvd ? QuantityRcvd["Quantity Received"] : null),
  numOrNull(ShipNoticeQty ? ShipNoticeQty["Ship Notice Quantity"] : null),
  numOrNull(CumulativeQtyRejected ? CumulativeQtyRejected["Cumulative Quantity - Rejected Material"] : null),
  numOrNull(PastDueQty ? PastDueQty["Past Due Quantity"] : null),
  numOrNull(AcknowledgedQty ? AcknowledgedQty["Acknowledged Quantity"] : null),
  numOrNull(fifty["Shipment ID"]),
  null,
  parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),
  parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),
  "830_insert",
   key
]);
  //console.log('830 SNF_Schd_Detail inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 830 SNF_Schd_Detail Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  } 
}

//MARK: Detail Forecast
//830 Detail Forecast Insert
async function insert830DetailForecast(pool, CT, thirtyRec, index30, fortyRec, index40, key) {
  try {
 
    // Use map for its 40 children
      await pool.query(`INSERT INTO public."830_SNF_Forecast"(
        fcst_type,
        fcst_key,
        fcst_line,
        fcst_lseq,
        fcst_part,
        fcst_uit1,
        fcst_sdp1,
        fcst_sdp2,
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
        fcst_crt_dte,
        fcst_crt_tme,
        fcst_crt_pgm,
        fcst_flow_flag
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24);`,
      [
        CT["Type (T=Toll; M=Margin; D=Direct Ship)"],
        CT["Record Key (10-digit integer)"],
        index30 + 1,
        index40 + 1,
        thirtyRec["Buyer's Part Number"],
        thirtyRec["Schedule Unit-Of-Measure"],
        fortyRec["Ship/Delivery or Calendar Pattern Code"],
        fortyRec["Ship/Delivery Pattern Time Code"],
        fortyRec["Actual Forecast Quantity"],
        fortyRec["Forecast Quantity"],
        fortyRec["Forecast Qualifier"],
        fortyRec["Forecast Timing Qualifier"],
        fortyRec["Forecast Date (start)"],
        fortyRec["End Date for Flexible Forecast"],
        fortyRec["Delivery Requested Time"],
        fortyRec["Delivery Order Number"],
        fortyRec["Ship Notice/Manifest Number"],
        fortyRec["Release Number"],
        fortyRec["Plan Schedule Type Code"],
        null,
        parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),
        parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),
        "830_insert",
        key
]);
  //console.log('830 Forecast inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 830 Forecast Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  } 
}

//MARK: Detail Forecast
//830 Detail Forecast Insert
async function insert830DetailShip(pool, CT, thirtyRec, index30, fiftyRec, index50, key) {
  try {

    // Use map for its 40 children
      await pool.query(`INSERT INTO public."830_SNF_Schd_Ship"(
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
        thirtyRec["Schedule Unit-Of-Measure"],
        fiftyRec["Quantity Qualifier"],
        fiftyRec["Quantity"],
        fiftyRec["Date/Time Qualifier"],
        fiftyRec["Date"],
        fiftyRec["Time"],
        fiftyRec["Cumulative Quantity End Date"],
        fiftyRec["Cumulative Quantity End Time"],
        null,
        parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),
        parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),
        "830_insert",
        key
]);
  //console.log('830_SNF_Schd_Ship inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 830 SNF_Schd_Ship Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  } 
}
  
  // <-- Add this closing brace for LoadI830SNF
} // <-- Properly close LoadI830SNF function

  module.exports = {
    LoadI830SNF
};

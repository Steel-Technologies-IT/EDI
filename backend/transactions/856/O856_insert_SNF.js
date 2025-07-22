// This module handles the insertion of parsed EDI 856 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.



const { readableErrors } = require('../../functions/readableErrors.js');

async function LoadO856SNF(pool, records, flag) {
  // Group 40s with their associated 49s
  function group40With49(records) {
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
  const groupedItems = group40With49(records);



//   Insert into 856 Tables
  await insert856Header(pool, CT, five, ten, twelve, fourteen, eighty, eleven, flag, filePath);

  // // Insert names from the eleven records
  for (const address of eleven) {
      await insert856Names(pool, CT, address, flag, filePath);
  }

//Insert into detail table
groupedItems.forEach(async (fortyRec, index) => {
  if (fortyRec._49s && fortyRec._49s.length > 0) {
    const singlethirty = thirty.find(thr => thr["Order HL ID"] === fortyRec["HL Parent ID"]);
    await insert856Detail(pool, CT, five, ten, singlethirty, [fortyRec], fortyRec._49s, eleven, flag, filePath);
  }
});

// Insert measurements for each 40 and its associated 49s using map
  const measurePromises = groupedItems.map(async(fortyRec, index) => {
    if (fortyRec._49s && fortyRec._49s.length > 0) {
      return Promise.all(
        fortyRec._49s.map(async(fortynineRec) => {
          const singlethirty = thirty.find(thr => thr["Order HL ID"] === fortyRec["HL Parent ID"]);
          await insert856Measure(pool, CT, fortyRec, five, ten, fortynineRec, singlethirty, eleven, flag, filePath);
        })
      );
    }
    return Promise.resolve();
  });

  // Await all measurement inserts
  await Promise.all(measurePromises);
}



//MARK: Header
//856 Header Insert
async function insert856Header(pool, CT, five, ten, twelve, fourteen, eighty, eleven, key, filePath) {
  try {
    
    await pool.query(`
     INSERT INTO public."856_SNF_Header"(
      hdr_type, hdr_key, hdr_isa_qual, hdr_isnd_id, hdr_gsnd_id, hdr_ircv_id, 
      hdr_grcv_id, hdr_ictl_no, hdr_func_no, hdr_gctl_no, hdr_ircv_qual, 
      hdr_stctl_no, hdr_bsn_cd, hdr_bsn_no, hdr_bsn_dte, hdr_bsn_tme, 
      hdr_tran_typ, hdr_shp_dte, hdr_shp_tme, hdr_shp_tzn, hdr_bol_no, 
      hdr_mbol_no, hdr_pck_no, hdr_dck_cd, hdr_shp_grss_wgt_lb, 
      hdr_shp_grss_wgt_kg, hdr_shp_grss_wgt_uom, hdr_shp_net_wgt_lb, 
      hdr_shp_net_wgt_kg, hdr_shp_net_wgt_uom, hdr_shp_ttl_pc_cnt, 
      hdr_shp_itm_typ, hdr_shp_itm_cnt, hdr_rte_sq_cd, hdr_std_car_cd, 
      hdr_tspt_mthd, hdr_tspt_rt_name, hdr_shp_ord_sts, hdr_shp_loc_id, 
      hdr_eq_cd, hdr_eq_init, hdr_eq_nbr, hdr_shp_mthd_pmnt, hdr_sf_no, 
      hdr_st_no, hdr_shp_hl, hdr_shp_phl, hdr_shp_hl_cd, hdr_shp_hl_ccd, 
      hdr_swgt_typ, hdr_swgt, hdr_swgt_uom, hdr_sum_hl_seg, hdr_sum_hsh_ttl, 
      hdr_sttx_locn, hdr_crt_dat, hdr_crt_tim, hdr_crt_pgm, hdr_xref, hdr_flow_flag
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
      $51, $52, $53, $54, $55, $56, $57, $58, $59, $60)
    `, [
      flag, //$1
      InterchangeControl.EDIXControlNumber, //$2
      InterchangeControl.SenderInterchangeIDQualifier, //$3
      InterchangeControl.SenderInterchangeID, //$4
      InterchangeControl.ReceiverInterchangeIDQualifier, //$5
      InterchangeControl.ReceiverInterchangeID, //$6
      InterchangeControl.AlternateInterchangeNumber, //$7
      InterchangeControl.InterchangeControlNumber, //$8 // Needs to be defined
      InterchangeControl.functionalgroupid, //$9 Needs to be defined
      InterchangeControl.gscontrolnumber, //$10 Needs to be defined
      InterchangeControl.ReceiverInterchangeIDQualifier, //$11
      InterchangeControl.InterchangeControlNumber, //$12 Needs to be defined
      InterchangeControl.BSNCode, //$13 Needs to be defined
      InterchangeControl.BSNNumber, //$14 Needs to be defined
      InterchangeControl.BSNDate, //$15 Needs to be defined
      InterchangeControl.BSNTime, //$16 Needs to be defined
      InterchangeControl.TransactionType, //$17 Needs to be defined
      ShipmentHeader.ShipmentDateTime.slice(0, 8), //$18 
      ShipmentHeader.ShipmentDateTime.slice(8, 14), //$19 
      InterchangeControl.TimeZone, //$20 Needs to be defined
      ShipmentHeader.ManifestReference, //$21 Might need to be switched with below
      ShipmentHeader.TransactionReference, // $22 Might need to be switched with above
      ShipmentHeader.PackingSlip, // $23 Needs to be defined
      ShipmentHeader.GateDock, //$24 
      ShipmentHeader.GrossWeight, //$25
      ShipmentHeader.GrossWeight, //$26
      ShipmentHeader.X12GrossWeightUM, //$27
      ShipmentHeader.NetWeight, //$28
      ShipmentHeader.NetWeight, //$29
      ShipmentHeader.X12NetWeightUM, //$30
      ShipmentHeader.TotalPieceCount, //$31 Needs to be defined
      ShipmentHeader.ShipmentItemType, //$32 Needs to be defined
      ShipmentHeader.ShipmentItemCount, //$33 Needs to be defined
      

    ]);


  } catch (error) {
    const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"], filePath);
    console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
   }
};

//MARK: Names
  //856 Names Insert
async function insert856Names(pool, CT, eleven, flag, filePath) {
 try {
    await pool.query( `INSERT INTO public."856_SNF_Names"(
	name_typ, name_key, name_qual, name_qual_id, name_id, name_name, name_addr1, name_addr2, name_city, name_state, name_zpcd, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_crt_dte, name_crt_tme, name_crt_pgm, name_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);`,
  [
    
  ]);

  } catch (error) {
    const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"], filePath);
    console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
  }
}

//MARK: Detail
//856 Detail Insert
async function insert856Detail(pool, CT, five, ten, thirty, forty, fortynine, eleven, flag, filePath) {
 try {
  
  await pool.query(`INSERT INTO public."856_SNF_Detail"(
	dtl_type, dtl_key, dtl_hl1, dtl_hl2, dtl_hl3, dtl_hl4, dtl_bsn2, dtl_bol, dtl_heat, dtl_mcoil, dtl_prev, dtl_mo, dtl_mol, dtl_cpo, dtl_cpor, dtl_cpoc, dtl_cpod, dtl_cpol, dtl_ucpo, dtl_po, dtl_poc, dtl_pod, dtl_pol, dtl_rls, dtl_cpart, dtl_awgtlb, dtl_awgtkg, dtl_twgtlb, dtl_twgtkg, dtl_gaugin, dtl_gaugmm, dtl_gaugt, dtl_widin, dtl_widmm, dtl_ulenin, dtl_ulenmm, dtl_lnft, dtl_lnmt, dtl_idin, dtl_idmm, dtl_odin, dtl_odmm, dtl_pcs, dtl_qtyuom, dtl_grcd, dtl_mcls67, dtl_msts68, dtl_msts70, dtl_edge22, dtl_msa, dtl_n1sf, dtl_n1st, dtl_n1ma, dtl_ohl1, dtl_ohl2, dtl_ohl3, dtl_ohl4, dtl_shp, dtl_ouom, dtl_cqty, dtl_locn, dtl_odat, dtl_otim, dtl_opgm, dtl_apart, dtl_partd, dtl_mdat, dtl_osid, dtl_cshdt, dtl_lubdt, dtl_bhdt, dtl_xref, dtl_sttxpo, dtl_ccoil, dtl_tmpr, dtl_olin01, dtl_ilin01, dtl_corg, dtl_smelt1, dtl_smelt2, dtl_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81)`,
[
   
])

  } catch (error) {
    const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"], filePath);
    console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
   }}



//MARK: Measure
//856 Measure Insert
async function insert856Measure(pool, CT, forty, five, ten, fortynine, thirty, eleven,  flag, filePath) {
 try {

    await pool.query( `INSERT INTO public."856_SNF_Measure"(
    msr_type, msr_key, msr_hl1, msr_bsn2, msr_bol, msr_heat, msr_mcoil, msr_prev, msr_mea1, msr_mea2, msr_mea3f, msr_mea3, msr_mea4, msr_n1sf, msr_n1st, msr_n1ma, msr_locn, msr_odat, msr_otim, msr_opgm, msr_xref, msr_flow_flag)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
  [
   
  ]);


   
  } catch (error) {
    const readableErrorMessage = readableErrors(error, CT["Record Key (10-digit integer)"], filePath);
    console.error('-', CT["Record Key (10-digit integer)"], '-\n', readableErrorMessage, '\n-', CT["Record Key (10-digit integer)"], '-');
  }}




  module.exports = {
    LoadO856SNF
};
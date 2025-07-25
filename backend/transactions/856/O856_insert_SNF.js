// This module handles the insertion of parsed EDI 856 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.


const  readableErrors = require('../../functions/readableErrors.js');

async function LoadO856SNF(pool, InterchangeControl, TransactionSet, ShipmentHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, Chemistries, Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath) {
  // If ProductItem is an array, process each one
let oldKey;
  if (Array.isArray(ProductItem)) {
    for (const product of ProductItem) {
       oldKey = await pool.query(`
        SELECT dtl_key FROM "856_SNF_Detail" 
        INNER JOIN "856_SNF_Names" names ON names.name_key = "856_SNF_Detail".dtl_key
        WHERE dtl_heat = $1 
        AND dtl_mcoil = $2 
        AND names.name_id = $3
      `, [
        product.prd_heat, 
        product.prd_customertagno, 
        ProductItemNameAddress[0].prna_identificationcode
      ]);
      if (oldKey.rows.length > 0) {
        break;
      }
      
    }
  } 

orginalHeader = await pool.query('SELECT * FROM "856_SNF_Header" WHERE hdr_key = $1', [oldKey.rows[0].dtl_key]);
orginalDetail = await pool.query('SELECT * FROM "856_SNF_Detail" WHERE dtl_key = $1', [oldKey.rows[0].dtl_key]);
orginalNames = await pool.query('SELECT * FROM "856_SNF_Names" WHERE name_key = $1', [oldKey.rows[0].dtl_key]);
orginalMeasure = await pool.query('SELECT * FROM "856_SNF_Measure" WHERE msr_key = $1', [oldKey.rows[0].dtl_key]);


//   //   Insert into 856 Tables
//   await insert856Header(pool, InterchangeControl, ShipmentHeader,  flag, filePath);

//   // Address Insertion
//   ProductItemNameAddress.map(async address => {
//       await insert856Names(pool, InterchangeControl, address, flag, filePath);
//   });

//   //Header Address Insertion
//   HeaderNameAddress.map(async address => {
//     await insert856Names(pool, InterchangeControl, address, flag, filePath);
//   });

//     Item.map(async Item => {
//       ProductItem.filter(ProductItem => ProductItem["HL Parent ID"] === Item["HL ID"]).map(async ProductItem => {
//     await insert856Detail(pool, InterchangeControl, Item, ProductItem, flag, filePath);
//     });
// });


//    Item.map(async Item => {
//       ProductItem.filter(ProductItem => ProductItem["HL Parent ID"] === Item["HL ID"]).map(async ProductItem => {
//     await insert856Measure(pool, InterchangeControl, Item, ProductItem, flag, filePath);
//       });
//    });



// //MARK: Header
// //856 Header Insert
async function insert856Header(pool, InterchangeControl, ShipmentHeader,  flag, filePath) {
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
      ShipmentHeader.RouteSequenceCode, //$34 Needs to be defined
      ShipmentHeader.StandardCarrierCode, //$35 Needs to be defined
      ShipmentHeader.X12TransportationMethod, //$36 
      ShipmentHeader.TransportRoute, //$37 
      ShipmentHeader.ShipmentStatus, //$38 Needs to be defined
      ShipmentHeader.ShipmentLocationID, //$39 Needs to be defined
      ShipmentHeader.EquipmentCode, //$40 Needs to be defined
      ShipmentHeader.EquipmentInitial, //$41 Needs to be defined
      ShipmentHeader.EquipmentNumber, //$42 Needs to be defined
      ShipmentHeader.X12ShipmentMethodofPayment, //$43
      ShipmentHeader.ShipmentHLLevelID, //$44 Needs to be defined
      ShipmentHeader.ShipmentParentHLLevelCodeID, //$45 Needs to be defined
      ShipmentHeader.ShipmentHLLevelCode, //$46 Needs to be defined
      ShipmentHeader.ShipmentChildHLLevelCode, //$47 Needs to be defined
      ShipmentHeader.ShipmentWeightType, //$48 Needs to be defined
      ShipmentHeader.ShipmentWeight, //$49 Needs to be defined 
      ShipmentHeader.ShipmentWeightUM, //$50 Needs to be defined
      ShipmentHeader.ShipmentSummaryHLSegment, //$51 Needs to be defined
      ShipmentHeader.ShipmentSummaryHashTotal, //$52 Needs to be defined
      ShipmentHeader.ShipmentLocation, //$53 Needs to be defined
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$54
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //55
      'O856_insert_SNF.js', //$56
      null,
      flag //$57
    ]);


  } catch (error) {
    const readableErrorMessage = readableErrors(error, InterchangeControl.EDIXControlNumber, filePath);
    console.error('-', InterchangeControl.EDIXControlNumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.EDIXControlNumber, '-');
   }
};

//MARK: Names
  //856 Names Insert
async function insert856Names(pool, InterchangeControl, Address, flag, filePath) {
 try {
    await pool.query( `INSERT INTO public."856_SNF_Names"(
	name_typ, name_key, name_qual, name_qual_id, name_id, name_name, name_addr1, name_addr2, name_city, name_state, name_zpcd, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_crt_dte, name_crt_tme, name_crt_pgm, name_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);`,
  [
    flag, //$1
    InterchangeControl.EDIXControlNumber, //$2
    Address.AddressType, //$3
    Address.IdentificationCodeQualifier, //$4
    Address.IdentificationCode, //$5
    Address.NameLine1, //$6
    Address.AddressLine1, //$7
    Address.AddressLine2, //$8
    Address.City, //$9
    Address.StateProvinceCode, //$10
    Address.PostalCode, //$11
    Address.CountryCode, //$12
    Address.ContactName, //$13 Needs to be defined
    Address.TelNumber, //$14
    Address.Email, //$15 Needs to be defined
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)), //$16
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)), //$17
    'O856_insert_SNF.js', //$18
    flag //$19
  ]);

  } catch (error) {
    const readableErrorMessage = readableErrors(error, InterchangeControl.EDIXControlNumber, filePath);
    console.error('-', InterchangeControl.EDIXControlNumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.EDIXControlNumber, '-');
  }
}

//MARK: Detail
//856 Detail Insert
async function insert856Detail(pool, InterchangeControl, Item, ProductItem, flag, filePath) {
 try {
  
  await pool.query(`INSERT INTO public."856_SNF_Detail"(
	dtl_type, dtl_key, dtl_hl1, dtl_hl2, dtl_hl3, dtl_hl4, dtl_bsn2, dtl_bol, dtl_heat, dtl_mcoil, dtl_prev, dtl_mo, dtl_mol, dtl_cpo, dtl_cpor, dtl_cpoc, dtl_cpod, dtl_cpol, dtl_ucpo, dtl_po, dtl_poc, dtl_pod, dtl_pol, dtl_rls, dtl_cpart, dtl_awgtlb, dtl_awgtkg, dtl_twgtlb, dtl_twgtkg, dtl_gaugin, dtl_gaugmm, dtl_gaugt, dtl_widin, dtl_widmm, dtl_ulenin, dtl_ulenmm, dtl_lnft, dtl_lnmt, dtl_idin, dtl_idmm, dtl_odin, dtl_odmm, dtl_pcs, dtl_qtyuom, dtl_grcd, dtl_mcls67, dtl_msts68, dtl_msts70, dtl_edge22, dtl_msa, dtl_n1sf, dtl_n1st, dtl_n1ma, dtl_ohl1, dtl_ohl2, dtl_ohl3, dtl_ohl4, dtl_shp, dtl_ouom, dtl_cqty, dtl_locn, dtl_odat, dtl_otim, dtl_opgm, dtl_apart, dtl_partd, dtl_mdat, dtl_osid, dtl_cshdt, dtl_lubdt, dtl_bhdt, dtl_xref, dtl_sttxpo, dtl_ccoil, dtl_tmpr, dtl_olin01, dtl_ilin01, dtl_corg, dtl_smelt1, dtl_smelt2, dtl_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81)`,
[
      flag, //$1
      InterchangeControl.EDIXControlNumber, //$2
      InterchangeControl.HL1, //$3 Need to be defined
      InterchangeControl.HL2, //$4 Need to be defined
      InterchangeControl.HL3, //$5 Need to be defined
      InterchangeControl.HL4, //$6 Need to be defined
      InterchangeControl.BSN2, //$7 Need to be defined
      InterchangeControl.BOL, //$8 Need to be defined
      ProductItem.Heat, //9
      ProductItem.MCoil, //10 Need to be defined
      ProductItem.Prev, //11 Need to be defined
      ProductItem.Mo, //12 Need to be defined
      ProductItem.Mol, //13 Need to be defined  
      ProductItem.EndUserPO, //14 
      ProductItem.CustPoreleasenumber, //15  Need to be defined
      ProductItem.CustPoChgOrdSeq, //16 Need to be defined
      ProductItem.CustPoDate, //17 Need to be defined
      ProductItem.CustPoLineItem, //18 Need to be defined
      ProductItem._2ndCustomer, //19 Need to be defined
      ProductItem.PO, //20 Need to be defined
      ProductItem.POC, //21 Need to be defined
      ProductItem.POD, //22 Need to be defined
      ProductItem.POL, //23 Need to be defined
      ProductItem.Rls, //24 Need to be defined
      ProductItem.PartNumber, //25 
      ProductItem.WeightType === 'A' && ProductItem.X12WeightUM === 'LB' ? ProductItem.Weight : null, //26
      ProductItem.WeightType === 'A' && ProductItem.X12WeightUM === 'KG' ? ProductItem.Weight : null, //27
      ProductItem.WeightType === 'T' && ProductItem.X12WeightUM === 'LB' ? ProductItem.Weight : null, //28
      ProductItem.WeightType === 'T' && ProductItem.X12WeightUM === 'KG' ? ProductItem.Weight : null, //29
      ProductItem.X12GaugeUM === 'EM' ? ProductItem.GaugeSize : null, //30
      ProductItem.GaugeSize  !== 'EM' ? ProductItem.GaugeSize : null, //31
      ProductItem.X12GaugeUM, //32
      ProductItem.X12WidthUM === 'IN' ? ProductItem.Width : null, //33
      ProductItem.X12WidthUM === 'MM' ? ProductItem.Width : null, //34
      ProductItem.X12LengthUM === 'IN' ? ProductItem.Length : null, //35
      ProductItem.X12LengthUM === 'MM' ? ProductItem.Length : null, //36
      ProductItem.LinearFeat, //37 Need to be defined
      ProductItem.LinearFeat_Meters, //38 Need to be defined
      ProductItem.X12InnerDiameterUM === 'IN' ? ProductItem.InnerDiameter : null, //39
      ProductItem.X12InnerDiameterUM === 'MM' ? ProductItem.InnerDiameter : null, //40
      ProductItem.X12OuterDiameterUM === 'IN' ? ProductItem.OuterDiameter : null, //41
      ProductItem.X12OuterDiameterUM === 'MM' ? ProductItem.OuterDiameter : null, //42
      ProductItem.Pieces, //43
      ProductItem.X12QtyUM, //44 need to be defined
      ProductItem.Grade, //45
      ProductItem.MaterialClassification, //46
      ProductItem.MaterialStatus, //47
      ProductItem.MaterialStatus, //48
      ProductItem.EdgeCondition, //49 Need to be defined
      ProductItem.MaterialSpecification, //50 Need to be defined
      HeaderNameAddress.find(name => name.AddressType === 'F')?.IdentificationCode || null, //51
      HeaderNameAddress.find(name => name.AddressType === 'S')?.IdentificationCode || null, //52
      ProductItem.UltimateIntendedId, //53 Need to be defined
      ProductItem.OrderHLLevelID, //54 Need to be defined
      ProductItem.OrderParentHLLevelID, //55 Need to be defined
      ProductItem.OrderHLLevelCode, //56 Need to be defined
      ProductItem.OrderHLChildCode, //57 Need to be defined
      ProductItem.Orderlevel, //58 Need to be defined
      ProductItem.X12OrderUM, //59 Need to be defined
      ProductItem.CumQty, //60 Need to be defined
      ProductItem.location, //61 Need to be defined
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$62
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //63
      'O856_insert_SNF.js', //$64
      ProductItem.AlternatePartNumber, //65 Need to be defined
      Item.PartDescription, //66
      ProductItem.ManufacturingDate, //67 Need to be defined
      ProductItem.OrderSID, //68 Need to be defined
      ProductItem.HeatTreatDte, //69 Need to be defined
      ProductItem.LubricationDte, //70 Need to be defined
      ProductItem.BakeHardeningDte, //71 Need to be defined
      null, //72 
      ProductItem.SteelTechnologiesPO, //73 Need to be defined
      Productitem.ConsumedCoil, //74 Need to be defined
      ProductItem.Temperature, //75 Need to be defined
      ProductItem.OLIN01, //76 Need to be defined
      ProductItem.ILIN01, //77 Need to be defined
      ProductItem.CORG, //78 Need to be defined
      ProductItem.Smelt1, //79 Need to be defined
      ProductItem.Smelt2, //80 Need to be defined
      flag //$81
])

  } catch (error) {
    const readableErrorMessage = readableErrors(error, InterchangeControl.EDIXControlNumber, filePath);
    console.error('-', InterchangeControl.EDIXControlNumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.EDIXControlNumber, '-');
   }}



//MARK: Measure
//856 Measure Insert
async function insert856Measure(pool, InterchangeControl, Item, ProductItem, flag, filePath) {
 try {

    await pool.query( `INSERT INTO public."856_SNF_Measure"(
    msr_type, msr_key, msr_hl1, msr_bsn2, msr_bol, msr_heat, msr_mcoil, msr_prev, msr_mea1, msr_mea2, msr_mea3f, msr_mea3, msr_mea4, msr_n1sf, msr_n1st, msr_n1ma, msr_locn, msr_odat, msr_otim, msr_opgm, msr_xref, msr_flow_flag)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
  [
    flag, //$1
    InterchangeControl.EDIXControlNumber, //$2
    ProductItem.OrderHLLevelID, //$3 Need to be defined
    ProductItem.BSN2, //$4 Need to be defined
    ProductItem.BOL, //$5 Need to be defined
    ProductItem.Heat, //$6 
    ProductItem.MCoil, //$7 Need to be defined
    ProductItem.Prev, //$8 Need to be defined
    ProductItem.Meas1, //$9 Need to be defined
    ProductItem.Meas2, //$10 Need to be defined
    ProductItem.Meas3F, //$11 Need to be defined
    ProductItem.Meas3, //$12 Need to be defined
    ProductItem.Meas4, //$13 Need to be defined
    ProductItem.N1SF, //$14 Need to be defined
    ProductItem.N1ST, //$15 Need to be defined
    ProductItem.N1MA, //$16 Need to be defined
    ProductItem.Locn, //$17 Need to be defined
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$62
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //63
    'O856_insert_SNF.js', //$64
    null, //$21
    flag //$22
  ]);


   
  } catch (error) {
    const readableErrorMessage = readableErrors(error, InterchangeControl.EDIXControlNumber, filePath);
    console.error('-', InterchangeControl.EDIXControlNumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.EDIXControlNumber, '-');
  }}


}

  module.exports = {
    LoadO856SNF
};
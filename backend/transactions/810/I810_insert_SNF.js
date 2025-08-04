async function LoadI810SNF(pool, records, flag) {
const getRecords = (code) => records.filter(r => r.record_code === code);

  // Extract records by code
  const CT = getRecords("CT")[0] || {};
  const ten = getRecords("10")[0] || {};
  const eleven = getRecords("11") || [];
  const twelve = getRecords("12") || [];
  const eighteen = getRecords("18")[0] || {};
  const nineteen = getRecords("19") || [];
  const thirty = getRecords("30") || [];
  const thirtyone = getRecords("31") || [];
  const thirtytwo = getRecords("32")[0] || {};
  const thirtyfive = getRecords("35") || [];
  const thirtyseven = getRecords("37") || [];
  const thirtyeight = getRecords("38") || [];
  const fortysix = getRecords("46") || [];
  const fortyeight = getRecords("48") || [];
  const ninety = getRecords("90") || [];
  const ninetyone = getRecords("91") || [];
  const ninetytwo = getRecords("92") || [];
  const ninetythree = getRecords("93") || [];


//Header Insert
//await insertHeader(pool, CT, ten, twelve, ninety, flag);

//Names Insert
const namesPromises = twelve.map(async address => {
    await insertNames(pool, CT, address);
    return Promise.resolve();
    });

  await Promise.all(namesPromises);

// //Detail Insert
// const detailPromises = thirty.map(async (thirty, index) => {
//     await insertDetail(pool, CT, ten, thirty, index + 1, flag);
//     return Promise.resolve();
//   });

//   await Promise.all(detailPromises);

// //Tag Insert

// const insertTagPromises = thirty.map(async (thirty, index) => {
//     const DTLindex = index + 1;
//   await insertTag(pool, CT, ten, thirty, thirtytwo, DTLindex, TagIndex, flag);
//   return Promise.resolve();
//   }
//   );
//   await Promise.all(insertTagPromises);

// //Tag MEA Insert
//   const tagMEAPromises = thirty.map(async (thirty, index) => {
//     const DTLindex = index + 1;
//     await insertTagMEA(pool, CT, ten, thirty, thirtytwo, DTLindex, TagIndex, flag);
//     return Promise.resolve();
//   });
//   await Promise.all(tagMEAPromises);

// //Allowances-Charges Insert
// const allowancesChargesPromises = thirty.map(async (thirty, index) => {
//     const DTLindex = index + 1;
//     await insertAllowancesCharges(pool, CT, ten, thirty, fortysix, ninetytwo, DTLindex, TagIndex, flag);
//     return Promise.resolve();
//   });
//   await Promise.all(allowancesChargesPromises);




}


//Header Insert Function
async function insertHeader(pool, CT, ten, twelve, ninety, flag) {
  await pool.query(`
    INSERT INTO public."810_SNF_Header"(
	hdr_type, hdr_key, hdr_isa_qual, hdr_isnd_id, hdr_gsnd_id, hdr_ircv_qual, hdr_ircv_id, hdr_grcv_id, hdr_ictl_no, hdr_gctl_no, hdr_stctl_no, hdr_inv_dte, hdr_inv_no, hdr_inv_amt, hdr_cur_cd, hdr_inv_due_dte, hdr_disc_amt, hdr_disc_due_dte, hdr_inv_tot_chg, hdr_po_no, hdr_po_dat, hdr_rls_no, hdr_chg_ord_seq, hdr_inv_typ, hdr_purp_cd, hdr_bol_no, hdr_ship_dat, hdr_ship_tme, hdr_ship_tme_zn, hdr_pkg_lst_nbr, hdr_prv_inv_no, hdr_fob_mthd, hdr_term_cd, hdr_term_bas_dte_cd, hdr_term_disc_pct, hdr_term_disc_due_dat, hdr_term_disc_due_day, hdr_term_net_due_dte, hdr_term_net_due_day, hdr_term_disc_amt, hdr_term_desc, hdr_term_day_mth, hdr_sum_amt_two, hdr_disc_inv_tot_amt, hdr_disc_amount, hdr_scac, hdr_net_sac_allow, hdr_remit_to_id_qual, hdr_remit_to_id, hdr_sttx_vend_no, hdr_rcv_sttx_locn, hdr_crt_dat, hdr_crt_tim, hdr_crt_pgm, hdr_hmz_sal_tax, hdr_hst_perc, hdr_doc_type, hdr_prf_cent, hdr_com_code, hdr_sap_vend_cd, hdr_sap_vend_nam, hdr_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62);
  `,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"],       //$1
    CT["Record Key (10-digit integer)"],      //$2
    CT["ISA Sender ID Qualifier"],    //$3
    CT["ISA Sender ID"],       //$4
    CT["GS Sender ID"],     //$5
    CT["ISA Receiver ID Qualifier"],   //$6
    CT["ISA Receiver ID"],         //$7
    CT["GS Receiver ID"],        //$8
    CT["ISA Control Number"],        //$9
    CT["GS Control Number"],        //$10
    CT["ST Control Number"],    //$11
    Number(ten["Invoice Date"]) ? Number(ten["Invoice Date"]) : null,    //$12
    ten["Invoice Number"],   //$13
    Number(ninety["Invoice Total Amount before Discount"]) ? Number(ninety["Invoice Total Amount before Discount"]) : null, //$14
    ten["Currency Code"],         //$15
    null,          //$16
    null,          //$17
    null,          //$18
    null,          //$19
    ten["Purchase Order Number"],    //$20
    Number(ten["Purchase Order Date"]) ? Number(ten["Purchase Order Date"]) : null,    //$21
    ten["Release Number"],    //$22
    ten["Change Order Sequence Number"],    //$23
    ten["Invoice Type"],            //$24
    ten["Transaction Purpose Code"],            //$25
    ten["Bill Of Lading Number"],            //$26
    Number(ten["Shipment Date"]) ? Number(ten["Shipment Date"]) : null,            //$27
    Number(ten["Shipment Time"]) ? Number(ten["Shipment Time"]) : null,            //$28
    ten["Shipment Time Code/Zone"],            //$29
    ten["PackagingSlipNo"],            //$30
    ten["Previous Invoice Number"],            //$31
    ten["FOB Method"],            //$32
    ten["Terms Code"],            //$33
    ten["Terms Basis Date Code"],            //$34
    Number(ten["Terms Discount Percent"]) ? Number(ten["Terms Discount Percent"]) : null,            //$35
    Number(ten["Terms Discount Due Date"]) ? Number(ten["Terms Discount Due Date"]) : null,            //$36
    Number(ten["Terms Discount Due Days"]) ? Number(ten["Terms Discount Due Days"]) : null,            //$37
    Number(ten["Terms Net Due Date"]) ? Number(ten["Terms Net Due Date"]) : null,            //$38
    Number(ten["Terms Net Due Day"]) ? Number(ten["Terms Net Due Day"]) : null,            //$39
    Number(ten["Terms Discount Amount"]) ? Number(ten["Terms Discount Amount"]) : null,            //$40
    ten["Terms Description"],            //$41
    Number(ten["Terms Day Month"]) ? Number(ten["Terms Day Month"]) : null,            //$42
    Number(ninety["Amount"]) ? Number(ninety["Amount"]) : null,        //$43
    Number(ninety["Discounted Invoice Total Amount"]) ? Number(ninety["Discounted Invoice Total Amount"]) : null,        //$44
    Number(ninety["Discount Amount"]) ? Number(ninety["Discount Amount"]) : null,        //$45
    ninety["Standard Carrier Alpha Code"],        //$46
    null,         //$47
    twelve["Address ID Qualifier"],      //$48
    twelve["Address ID"],     //$49
    null, //$50
    null, //$51
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$52
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$53
    "810i.js", //$54 
    Number(ten["HST (Harmonized Sales Tax)"]) ? Number(ten["HST (Harmonized Sales Tax)"]) : null, //$55
    Number(ten["HST Percentage"]) ? Number(ten["HST Percentage"]) : null, //$56
    ten["Document Type"], //$57
    ten["Profit Center"], //$58
    ten["Company Code"], //$59
    Number(ten["SAP Vendor Code"]) ? Number(ten["SAP Vendor Code"]) : null, //$60
    ten["SAP Vendor Name"], //$61
    flag // $62
  ]);

}

//Names Insert Function
async function insertNames(pool, CT, twelve, flag) {
  
    await pool.query(`
      INSERT INTO public."810_SNF_Name"(
	name_type, name_key, name_name_qual, name_nameid, name_id, name_name, name_name_two, name_name_three, name_addr1, name_addr2, name_city, name_state, name_zpcd, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_resp_party_cd, name_crt_dte, name_crt_tme, name_crt_pgm, name_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22);
    `,
    [
      CT["Type (T=Toll; M=Margin; D=Direct Ship)"],       //$1
      CT["Record Key (10-digit integer)"],      //$2
      twelve,
      twelve,
      twelve,
      twelve,
      twelve,
      twelve,
      twelve,
      twelve,
      twelve,
      twelve,
      twelve,
      twelve,
      twelve,
      twelve,
      twelve,
      twelve,
      null,
      null,
      null,
      flag
    ]);

}


//Detail Insert Function
async function insertDetail(pool, CT, ten, thirty, index, flag) {
  await pool.query(`
    INSERT INTO details (detail_field1, detail_field2, ...)
    VALUES ($1, $2, ...)
  `,
  [
    CT,
    CT,
    index,
    ten,
    thirty,
    null,
    thirty,
    thirty,
    thirty,
    thirty,
    thirty,
    thirty,
    thirty,
    thirty,
    thirty,
    thirty,
    thirty,
    thirty,
    thirty,
    thirty,
    thirty,
    thirty,
    null,
    null,
    null,
    thirty,
    null,
    null,
    null,
    null,
    flag

  ]);
}


//Tag Insert Function
async function insertTag(pool, CT, ten, thirty, thirtytwo, DTLindex, TagIndex, flag) {
  await pool.query(`
    INSERT INTO tags (tag_field1, tag_field2, ...)
    VALUES ($1, $2, ...)
  `,
  [
    CT,
    CT,
    DTLindex,
    TagIndex,
    ten,
    thirty,
    thirtytwo,
    null,
    thirtytwo,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    flag
  ]);

}


//Tag MEA Insert Function
async function insertTagMEA(pool, CT, ten, thirty, thirtyseven, DTLindex, TagIndex, MeasureIndex, flag) {
  await pool.query(`
    INSERT INTO tag_mea (mea_field1, mea_field2, ...)
    VALUES ($1, $2, ...)
  `,
  [
    CT,
    CT,
    DTLindex,
    TagIndex,
    MeasureIndex,
    ten,
    thirty,
    thirtyseven,
    thirtyseven,
    thirtyseven,
    thirtyseven,
    null,
    null,
    null,
    flag
  ]);
}


//Allowances-Charges Insert Function
async function insertAllowancesCharges(pool, CT, ten, thirty, fortysix, ninetytwo, DTLindex, TagIndex, flag) {
  await pool.query(`
    INSERT INTO allowances_charges (allowance_field1, allowance_field2, ...)
    VALUES ($1, $2, ...)
  `,
  [
    CT,
    CT,
    DTLindex,
    TagIndex,
    ChargeIndex,
    ten,
    thirty,
    fortysix ? fortysix : ninetytwo,
    fortysix ? fortysix : ninetytwo,
    fortysix ? fortysix : ninetytwo,
    fortysix ? fortysix : ninetytwo,
    fortysix ? fortysix : ninetytwo,
    fortysix ? fortysix : ninetytwo,
    fortysix ? fortysix : ninetytwo,
    null,
    null,
    null,
    null,
    flag
  ]);
}


  module.exports = { LoadI810SNF };

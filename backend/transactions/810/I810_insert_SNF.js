async function LoadI810SNF(pool, data, key) {
  // Implementation for loading I810 SNF data
  return data;
}

module.exports = {
  LoadI810SNF
};
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
  const ninety = getRecords("90")[0] || [];
  const ninetyone = getRecords("91") || [];
  const ninetytwo = getRecords("92") || [];
  const ninetythree = getRecords("93") || [];

  async function group30with32(records) {
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

  async function group30with32with37(records) {
    const result = [];
    let current30 = null;
    let current32 = null;

    for (const rec of records) {
      if (rec.record_code === "30") {
        current30 = { ...rec, _32s: [] };
        result.push(current30);
        current32 = null;
      } else if (rec.record_code === "32" && current30) {
        current32 = { ...rec, _37s: [] };
        current30._32s.push(current32);
      } else if (rec.record_code === "37" && current32) {
        current32._37s.push({ ...rec });
      } else if (rec.record_code === "90") {
        current30 = null;
        current32 = null;
      }
    }
    return result;
  }

  async function group30with32with46or92(records) {
    const result = [];
    let current30 = null;
    let current32 = null;

    for (const rec of records) {
      if (rec.record_code === "30") {
        current30 = { ...rec, _32s: [] };
        result.push(current30);
        current32 = null;
      } else if (rec.record_code === "32" && current30) {
        current32 = { ...rec, _46s: [], _92s: []};
        current30._32s.push(current32);
      } else if (rec.record_code === "46" && current32) {
        current32._46s.push({ ...rec });
      } else if (rec.record_code === "92" && current32) {
        current32._92s.push({ ...rec });
      } else if (rec.record_code === "90") {
        current30 = null;
        current32 = null;
      }
    }
    return result;
  }

  


  const thirtyGroupedthirtytwo = await group30with32(records);
  const thirtyGroupedthirtytwoWith37 = await group30with32with37(records);
  const thirtyGroupedthirtytwoWith46or92 = await group30with32with46or92(records);
 
  
const count = await pool.query(`SELECT COUNT(*) AS count FROM public."810_SNF_Header" WHERE hdr_key = $1`, [CT["Record Key (10-digit integer)"]]);
if (parseInt(count.rows[0].count, 10) > 0) {
  await pool.query(`DELETE FROM public."810_SNF_Header" WHERE hdr_key = $1`, [CT["Record Key (10-digit integer)"]]);
  await pool.query(`DELETE FROM public."810_Invex_VoucherHeader" WHERE vch_key = $1`, [CT["Record Key (10-digit integer)"]]);
}

//Header Insert
await insertHeader(pool, CT, ten, twelve, ninety, flag);

//Names Insert
const namesPromises = twelve.map(async address => {
    await insertNames(pool, CT, address);
    return Promise.resolve();
    });

  await Promise.all(namesPromises);

//Detail Insert
  const detailPromises = thirty.map(async (thirty, index) => {
    await insertDetail(pool, CT, ten, thirty, index + 1, flag);
    return Promise.resolve();
  });

  await Promise.all(detailPromises);

//Tag Insert
const insertTagPromises = thirtyGroupedthirtytwo.map(async (thirty, DTLindex) => { 
  if (thirty._32s && thirty._32s.length > 0) {
   
    return Promise.all(
      thirty._32s.map(async(thirtytwo, TagIndex) => {
        await insertTag(pool, CT, ten, thirty, thirtytwo, DTLindex + 1, TagIndex + 1, flag);
      })
    );
  }
  return Promise.resolve();
});
  await Promise.all(insertTagPromises);






//Tag MEA Insert
  const tagMEAPromises = thirtyGroupedthirtytwoWith37.map(async (thirty, dtlIndex) => {
    if (thirty._32s && thirty._32s.length > 0) {
      return Promise.all(
        thirty._32s.map(async (thirtytwo, TagIndex) => {
          if (thirtytwo._37s && thirtytwo._37s.length > 0) {
            return Promise.all(
              thirtytwo._37s.map(async (thirtyseven, MsrIndex) => {
                await insertTagMEA(pool, CT, ten, thirty, thirtyseven, dtlIndex + 1, TagIndex + 1, MsrIndex + 1, flag);
              })
            );
          }
        })
      );
    }
    return Promise.resolve();
  });
  await Promise.all(tagMEAPromises);

//Allowances-Charges Insert
const allowancesChargesPromises = thirtyGroupedthirtytwoWith46or92.map(async (thirty, DTLindex) => {
    if (thirty._32s && thirty._32s.length > 0) {
      return Promise.all(
        thirty._32s.map(async (thirtytwo, TagIndex) => {
          if (thirtytwo._46s && thirtytwo._46s.length > 0) {
            return Promise.all(
              thirtytwo._46s.map(async (fortysix, ChargeIndex) => {
                await insertAllowancesCharges(pool, CT, ten, thirty, fortysix, ninetytwo, DTLindex + 1, TagIndex + 1, ChargeIndex + 1, flag);
              })
            );
          } else if (thirtytwo._92s && thirtytwo._92s.length > 0) {
            return Promise.all(
              thirtytwo._92s.map(async (ninetytwo, ChargeIndex) => {
                await insertAllowancesCharges(pool, CT, ten, thirty, fortysix, ninetytwo, DTLindex + 1, TagIndex + 1, ChargeIndex + 1, flag);
              })
            );
          }

        })
      );
    }
        return Promise.resolve();
  });
  await Promise.all(allowancesChargesPromises);


}




//Header Insert Function
async function insertHeader(pool, CT, ten, twelve, ninety, flag) {

  // Add days to current date and return as YYYYMMDD number
      const formatAddDate = (days) => {
        if (days === null || days === undefined || days === '') return null;
        const daysInt = parseInt(days, 10);
        if (isNaN(daysInt)) return null;
        const d = new Date();
        d.setDate(d.getDate() + daysInt);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return parseInt(`${yyyy}${mm}${dd}`, 10);
      };

  const formatAmount = (amount) => {
        if (!amount) return null;
        const amountStr = String(amount);
        if (amountStr.length < 2) return `0.0${amountStr}`;
        if (amountStr.length === 2) return `0.${amountStr}`;
        const dollars = amountStr.slice(0, -2);
        const cents = amountStr.slice(-2);
        return `${dollars}.${cents}`;
    };

  const inv_amt = formatAmount(ninety["Invoice Total Amount before Discount"]? ninety["Invoice Total Amount before Discount"] : null);
  const _92_discount_amount = ninetytwo?.[1]?.AllowChgAmount ?? null
  const disc_amt = formatAmount(_92_discount_amount ?  _92_discount_amount : ninety["Discount Amount"] ? ninety["Discount Amount"] : null);
  const due_dte = ten["Terms Net Due Date"] !== '' ? Number(ten["Terms Net Due Date"]) : ten["Terms Net Due Days"] !== '' ? formatAddDate(ten["Terms Net Due Days"]) : null 
  console.log(due_dte, ten)
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
    inv_amt ? inv_amt : null, //$14
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
    due_dte,            //$38
    Number(ten["Terms Net Due Day"]) ? Number(ten["Terms Net Due Day"]) : null,            //$39
    Number(ten["Terms Discount Amount"]) ? Number(ten["Terms Discount Amount"]) : null,            //$40
    ten["Terms Description"],            //$41
    Number(ten["Terms Day Month"]) ? Number(ten["Terms Day Month"]) : null,            //$42
    Number(ninety["Amount"]) ? Number(ninety["Amount"]) : null,        //$43
    Number(ninety["Discounted Invoice Total Amount"]) ? Number(ninety["Discounted Invoice Total Amount"]) : null,        //$44
    disc_amt,        //$45
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
      twelve["AddressTypeCode"],       //$3
      twelve["Address ID Qualifier"],    //$4
      twelve["Address ID"],      //$5
      twelve["Name"],      //$6
      twelve["Additional Name 1"],     //$7
      twelve["Additional Name 2"],    //$8
      twelve["Address Line 1"],       //$9
      twelve["Address Line 2"],       //$10
      twelve["City"],                 //$11
      twelve["State/Province"],      //$12
      twelve["Postal Code"],         //$13
      twelve["Customer Country Code"],//$14
      twelve["Contact Name"],       //$15
      twelve["Contact Phone"],      //$16
      twelve["Contact Email"],      //$17
      twelve["Responsible Party Code"],//$18
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$19
      parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$20
      "810i.js", //$21
      flag  // $22
    ]);

}


//Detail Insert Function
async function insertDetail(pool, CT, ten, thirty, index, flag) {
  await pool.query(`
    INSERT INTO public."810_SNF_Detail"(
	dtl_type, dtl_key, dtl_seq_no, dtl_inv_no, dtl_inv_lin_no, dtl_lin_ext_amt, dtl_lin_wgt_lb, dtl_lin_wgt_kg, dtl_po_no, dtl_buyer_part_no, dtl_seller_part_no, dtl_mill_ord_no, dtl_mill_ord_lin, dtl_mill_coi_no, dtl_heat_no, dtl_tag_invoiced, dtl_quantity_inv, dtl_quantity_uom, dtl_unit_prc, dtl_unit_prc_uom, dtl_lineal_ft, dtl_lineal_meters, dtl_line_tot_chrg_amt, dtl_sttx_tag_type, dtl_sttx_tag_no, dtl_process_perf, dtl_sttx_locn, dtl_crt_dte, dtl_crt_tme, dtl_crt_pgm, dtl_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31);
  `,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"],       //$1
    CT["Record Key (10-digit integer)"],      //$2
    index,  //$3
    ten["Invoice Number"], //$4
    thirty["Invoice/Sales Order Line Number"], //$5
    null, //$6
    Number(thirty["Invoice Line (total) Weight - Actual LB"]) ? Number(thirty["Invoice Line (total) Weight - Actual LB"]) : null, //$7
    Number(thirty["Invoice Line (total) Weight - Actual KG"]) ? Number(thirty["Invoice Line (total) Weight - Actual KG"]) : null, //$8
    thirty["PO Number "], //$9
    thirty["Buyers Part Number"], //$10
    thirty["Sellers Part Number"], //$11
    thirty["Mill Order Number"], //$12
    thirty["Mill Order Line"], //$13
    thirty["Mill Coil Number"], //$14
    thirty["Heat Number"], //$15
    thirty["Tag Number"], //$16
    Number(thirty["Quantity Invoiced"]) ? Number(thirty["Quantity Invoiced"]) : null, //$17
    thirty["Quantity UOM"], //$18
    Number(thirty["Unit Price"]) ? Number(thirty["Unit Price"]) : null, //$19
    thirty["Price Basis Code"], //$20
    Number(thirty["Invoice Line (total) Lineal Feet"]) ? Number(thirty["Invoice Line (total) Lineal Feet"]) : null, //$21
    Number(thirty["Invoice Line (total) Lineal Meters"]) ? Number(thirty["Invoice Line (total) Lineal Meters"]) : null, //$22
    null, //$23
    null, //$24
    null, //$25
    thirty["Process Rendered"], //$26
    null, //$27
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$28
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$29
    "810i.js", //$30
    flag // $31

  ]);
}


//Tag Insert Function
async function insertTag(pool, CT, ten, thirty, thirtytwo, DTLindex, TagIndex, flag) {
  await pool.query(`
    INSERT INTO public."810_SNF_Tag"(
	tag_type, tag_key, tag_seq_no, tag_tag_seq_no, tag_inv_no, tag_inv_lin_no, tag_mill_coi_no, tag_heat_no, tag_tag_invoiced, tag_wgt_lb, tag_wgt_kg, tag_pcs, tag_tot_chg_amt, tag_sttx_tag_type, tag_sttx_tag_no, tag_sttx_locn, tag_crt_dte, tag_crt_tme, tag_crt_pgm, tag_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);
  `,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"],       //$1
    CT["Record Key (10-digit integer)"],       //$2
    DTLindex,  //$3
    TagIndex,  //$4
    ten["Invoice Number"], //$5
    thirty["Invoice/Sales Order Line Number"], //$6
    thirtytwo["Mill Coil Number"], //$7
    thirtytwo["Heat"], //$8
    null, //$9
    Number(thirtytwo["Weight"]) ? Number(thirtytwo["Weight"]) : null, //$10
    null, //$11
    null, //$12
    null, //$13
    null, //$14
    null, //$15
    null, //$16
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$17
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$18
    "810i.js", //$19
    flag // $20
  ]);

}


//Tag MEA Insert Function
async function insertTagMEA(pool, CT, ten, thirty, thirtyseven, DTLindex, TagIndex, MeasureIndex, flag) {
  await pool.query(`
    INSERT INTO public."810_SNF_MEA"(
	mea_type, mea_key, mea_seq_no, mea_tag_seq_no, mea_mseq_no, mea_inv_no, mea_inv_lin_no, mea_measr, mea_measq, mea_measf, mea_measuom, mea_sttx_locn, mea_crt_dte, mea_crt_tme, mea_crt_pgm, mea_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);
  `,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"],       //$1
    CT["Record Key (10-digit integer)"],       //$2
    DTLindex, //$3
    TagIndex, //$4
    MeasureIndex, //$5
    ten["Invoice Number"], //$6
    thirty["Invoice/Sales Order Line Number"], //$7
    thirtyseven["Measurement Reference"], //$8
    thirtyseven["Measurement Qualifier"], //$9
    Number(thirtyseven["Measurement Value"]) ? Number(thirtyseven["Measurement Value"]) : null, //$10
    thirtyseven["Measurement UOM"], //$11
    null, //$12
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$13
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$14
    "810i.js", //$15
    flag // $16
  ]);
}


//Allowances-Charges Insert Function
async function insertAllowancesCharges(pool, CT, ten, thirty, fortysix, ninetytwo, DTLindex, TagIndex, ChargeIndex, flag) {
  await pool.query(`
    INSERT INTO public."810_SNF_AllChg"(
	alc_type, alc_key, alc_seq_no, alc_tag_seq_no, alc_chg_seq_no, alc_inv_no, alc_inv_lin_no, alc_chg_type, alc_chg_cde, alc_chg_amt, alc_qty_uom, alc_qty, alc_chg_hdl_meth, alc_chg_desc, alc_sttx_locn, alc_crt_dte, alc_crt_tme, alc_crt_pgm, alc_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);
  `,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"],       //$1
    CT["Record Key (10-digit integer)"],       //$2
    DTLindex, //$3
    TagIndex, //$4
    ChargeIndex, //$5
    ten["Invoice Number"], //$6
    thirty["Invoice/Sales Order Line Number"], //$7
    fortysix ? fortysix["AllowChargeIndicator"] : ninetytwo["AllowChargeIndicator"], //$8
    fortysix ? fortysix["AllowChargeCode"] : ninetytwo["AllowChargeCode"], //$9
    fortysix ? fortysix["AllowChgAmount"] : ninetytwo["AllowChgAmount"], //$10
    fortysix ? fortysix["UnitofMeas"] : ninetytwo["UnitofMeas"], //$11
    fortysix ? Number(fortysix["AllowChgQty"]) : Number(ninetytwo["AllowChgQty"]), //$12
    fortysix ? fortysix["MethodHandling"] : ninetytwo["MethodHandling"], //$13
    fortysix ? fortysix["Desc"] : ninetytwo["Desc"], //$14
    null, //$15
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8)),    //$16
    parseInt(new Date().toISOString().replace(/\D/g, '').slice(8, 14)),   //$17
    "810i.js", //$18
    flag // $19
  ]);
}


  module.exports = { LoadI810SNF };
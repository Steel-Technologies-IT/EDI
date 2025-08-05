const pool2 = require("../../db2.js")
const queryInvexDatabase = require("../../Invex/InvexConnection.js");
const { get810InterchangeControl, get810TransactionSet } = require("./I810_retrieve.js");

// MARK: Invex Getters
async function getInvexRecords810(typePK, keyPK) {

  const interchangeControl = await get810Data(get810InterchangeControl, keyPK);
  const transactionSet = await get810ListData(get810TransactionSet, keyPK);
 
  return formatStructuredJSON(interchangeControl, transactionSet);
}

async function get810Data (fn, typePK, keyPK) {
  const results = await fn(pool2, typePK, keyPK);

  if (results) {
    return Object.entries(results)
      .filter(([key, value]) =>  value!= null)
      .map(([key, value]) => ([key.substring(key.indexOf('_')+1), value]));
  }

  return [];

}

async function get810ListData (fn, typePK, keyPK) {
  const results = await fn(pool2, typePK, keyPK);
  let dataList = [];

  for (let res in results) {
    dataList.push(Object.entries(results[res])
    .filter(([key, value]) =>  value!= null)
    .map(([key, value]) => ([key.substring(key.indexOf('_')+1), value])));
  }
  return dataList;
}


const formatStructuredJSON = (interchangeControlData, transactionSetData) => {

  const sql_query = `
  INSERT INTO APIGVC_REC (
    gvc_src_co_id, gvc_gat_ctl_no, gvc_vchr_pfx, gvc_ent_dt, gvc_ven_id, gvc_ven_inv_no, gvc_extl_ref, gvc_ven_inv_dt, gvc_po_pfx, gvc_po_no,
    gvc_po_itm, gvc_vchr_brh, gvc_ptx_vchr_amt, gvc_vchr_amt, gvc_dscb_amt, gvc_desc30, gvc_cry, gvc_exrt, gvc_pttrm, gvc_disc_trm, gvc_due_dt, gvc_disc_dt, gvc_disc_amt, gvc_chk_itm_rmk, gvc_pmt_typ, gvc_vchr_xref, gvc_auth_ref,
    gvc_vchr_cat, gvc_svc_ffm_dt, gvc_ppmt_elgbl, gvc_trs_sts_actn, gvc_trs_rsn, gvc_trs_sts, gvc_trs_sts_rmk, gvc_pmt_sts_actn, gvc_pmt_rsn, gvc_pmt_sts, gvc_pmt_sts_rmk
  ) VALUES (
    '${interchangeControlData.companyid}',
    '${interchangeControlData.edixcontrolnumber}',
    'VR',
    ${parseInt(new Date().toISOString().replace(/\\D/g, '').slice(0, 8))},
    '${transactionSetData.invexvendorid}',
    '${transactionSetData.vendorinvoicenumber}',
    '${transactionSetData.externalreference}',
    '${transactionSetData.vendorinvoicedate}',
    ${transactionSetData.purchaseorderitem ? "'PO'" : "NULL"},
    ${transactionSetData.purchaseorderitem ? `'${transactionSetData.purchaseordernumber}'` : "NULL"},
    ${transactionSetData.purchaseorderitem ? `'${transactionSetData.purchaseorderitem}'` : "NULL"},
    NULL,
    ${transactionSetData.pretaxamount || "NULL"},
    ${transactionSetData.amount || "NULL"},
    ${transactionSetData.discountableamount || "NULL"},
    '${transactionSetData.description}',
    '${transactionSetData.currency}',
    ${transactionSetData.exchangerate || "NULL"},
    '${transactionSetData.invexpaymentterm}',
    '${transactionSetData.discountterm}',
    '${transactionSetData.duedate}',
    '${transactionSetData.discountdate}',
    ${transactionSetData.discountamount || "NULL"},
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
  )
`;



  queryInvexDatabase(sql_query);

};

module.exports = { 
  getInvexRecords810
};
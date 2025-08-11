const pool2 = require("../../db2.js")
const queryInvexDatabase = require("../../Invex/InvexConnection.js");
const { get810APIGVC, get810SCIGAD, get810SCTITN, get810TCIGGD } = require("./I810_retrieve.js");

// MARK: Invex Getters
async function getInvexRecords810(typePK, keyPK) {

  //const interchangeControl = await get810Data(get810InterchangeControl, keyPK);
  //const transactionSet = await get810ListData(get810TransactionSet, keyPK);
 
  return formatStructuredJSON([],[]);
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


const formatStructuredJSON = async (SCTITN, APIGVC, TCIGGD, SCIGAD) => {


  //MARK: APIGVC Insert
  const sql_query = `
  INSERT INTO APIGVC_REC (
    gvc_src_co_id, gvc_gat_ctl_no, gvc_vchr_pfx, gvc_ent_dt, gvc_ven_id, gvc_ven_inv_no, gvc_extl_ref, gvc_ven_inv_dt, gvc_po_pfx, gvc_po_no,
    gvc_po_itm, gvc_vchr_brh, gvc_ptx_vchr_amt, gvc_vchr_amt, gvc_dscb_amt, gvc_desc30, gvc_cry, gvc_exrt, gvc_pttrm, gvc_disc_trm, gvc_due_dt, gvc_disc_dt, gvc_disc_amt, gvc_chk_itm_rmk, gvc_pmt_typ, gvc_vchr_xref, gvc_auth_ref,
    gvc_vchr_cat, gvc_svc_ffm_dt, gvc_ppmt_elgbl, gvc_trs_sts_actn, gvc_trs_rsn, gvc_trs_sts, gvc_trs_sts_rmk, gvc_pmt_sts_actn, gvc_pmt_rsn, gvc_pmt_sts, gvc_pmt_sts_rmk
  ) VALUES (
    '${APIGVC.gvc_src_co_id}',
    '${APIGVC.gvc_gat_ctl_no}',
    '${APIGVC.gvc_vchr_pfx}',
    '${APIGVC.gvc_ent_dt}',
    '${APIGVC.gvc_ven_id}',
    '${APIGVC.gvc_ven_inv_no}',
    '${APIGVC.gvc_extl_ref}',
    '${APIGVC.gvc_ven_inv_dt}',
    '${APIGVC.gvc_po_pfx}',
    '${APIGVC.gvc_po_no}',
    '${APIGVC.gvc_po_itm}',
    '${APIGVC.gvc_vchr_brh}',
    '${APIGVC.gvc_ptx_vchr_amt}',
    '${APIGVC.gvc_vchr_amt}',
    '${APIGVC.gvc_dscb_amt}',
    '${APIGVC.gvc_desc30}',
    '${APIGVC.gvc_cry}',
    '${APIGVC.gvc_exrt}',
    ${APIGVC.gvc_pttrm},
    '${APIGVC.gvc_disc_trm}',
    '${APIGVC.gvc_due_dt}',
    '${APIGVC.gvc_disc_dt}',
    '${APIGVC.gvc_disc_dt}',
    ${APIGVC.gvc_disc_amt},
    '${APIGVC.gvc_chk_itm_rmk}', 
    '${APIGVC.gvc_pmt_typ}', 
    '${APIGVC.gvc_vchr_xref}', 
    '${APIGVC.gvc_auth_ref}',
    '${APIGVC.gvc_vchr_cat}', 
    '${APIGVC.gvc_svc_ffm_dt}', 
    '${APIGVC.gvc_ppmt_elgbl}', 
    '${APIGVC.gvc_trs_sts_actn}', 
    '${APIGVC.gvc_trs_rsn}', 
    '${APIGVC.gvc_trs_sts}', 
    '${APIGVC.gvc_trs_sts_rmk}', 
    '${APIGVC.gvc_pmt_sts_actn}', 
    '${APIGVC.gvc_pmt_rsn}', 
    '${APIGVC.gvc_pmt_sts}', 
    '${APIGVC.gvc_pmt_sts_rmk}'
  )
`;

const sql_query2 = ` INSERT INTO TCIGGD_REC (
    ggd_src_co_id
ggd_gat_ctl_no
ggd_gat_seq_no
ggd_bsc_gl_acct
ggd_inbd_sacct
ggd_dr_amt
ggd_cr_amt
ggd_dist_rmk
   ) VALUES (
    '${TCIGGD.ggd_src_co_id}',
     ${TCIGGD.ggd_gat_ctl_no},
    '${TCIGGD.ggd_gat_seq_no}',
    '${TCIGGD.ggd_bsc_gl_acct}',
    '${TCIGGD.ggd_inbd_sacct}',
     ${TCIGGD.ggd_dr_amt},
     ${TCIGGD.ggd_cr_amt},
    '${TCIGGD.ggd_dist_rmk}'
  )
`;

const sql_query3 = ` INSERT INTO SCIGAD_REC (gad_src_co_id
gad_gat_ctl_no
gad_gat_seq_no
gad_acct_dist
gad_dr_amt
gad_cr_amt
) VALUES (
    '${SCIGAD.gad_src_co_id}',
    ${SCIGAD.gad_gat_ctl_no},
    '${SCIGAD.gad_gat_seq_no}',
    '${SCIGAD.gad_acct_dist}',
    ${SCIGAD.gad_dr_amt},
    ${SCIGAD.gad_cr_amt}
  )
`;

const sql_query4 = `INSERT INTO SCTITN_REC (
itn_src_co_id
itn_gat_ctl_no
itn_cmpy_id
itn_crtd_dtts
itn_crtd_dtms
itn_upd_dtts
itn_upd_dtms
itn_sts_cd
itn_ssn_log_ctl_no
itn_trs_cat
) VALUES (
    '${SCTITN.itn_src_co_id}',
    ${SCTITN.itn_gat_ctl_no},
    '${SCTITN.itn_cmpy_id}',
    '${SCTITN.itn_crtd_dtts}',
    '${SCTITN.itn_crtd_dtms}',
    '${SCTITN.itn_upd_dtts}',
    '${SCTITN.itn_upd_dtms}',
    '${SCTITN.itn_sts_cd}',
    ${SCTITN.itn_ssn_log_ctl_no},
    '${SCTITN.itn_trs_cat}'
  )`;

  await queryInvexDatabase(sql_query);
  await queryInvexDatabase(sql_query2);
  await queryInvexDatabase(sql_query3);
  await queryInvexDatabase(sql_query4);
};

module.exports = { 
  getInvexRecords810
};
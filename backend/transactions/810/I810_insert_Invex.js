const { head } = require("../../Postgres/TranslationTableCalls");

async function insert810InvexInbound(pool, Header, Details, Mea, Names, Tags, AllowancesCharges) {
    // Insert the transformed data into the respective output tables
    // Map SNF tables to Invex JSON Structure 
    const flow = "I"
    try {
        
        // MARK: Interchange Control Table
        //Invex Interchange Control Table
        await pool.query(`INSERT INTO public."810_Invex_SCTITN"(
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
)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`, 
        [
               header.hdr_isnd_id,
               header.hdr_key,
               "STX",
               header.hdr_crt_dat,
               String(header.hdr_crt_tim).padStart(6, '0'),
               null,
               null,
               null,  
               null,
               null, //voucher category
               
        ]);


        await pool.query(`INSERT INTO public."810_Invex_APIGVC"(
gvc_src_co_id
gvc_gat_ctl_no
gvc_vchr_pfx
gvc_ent_dt
gvc_ven_id
gvc_ven_inv_no
gvc_extl_ref
gvc_ven_inv_dt
gvc_po_pfx
gvc_po_no
gvc_po_itm
gvc_vchr_brh
gvc_ptx_vchr_amt
gvc_vchr_amt
gvc_dscb_amt
gvc_desc30
gvc_cry
gvc_exrt
gvc_pttrm
gvc_disc_trm
gvc_due_dt
gvc_disc_dt
gvc_disc_amt
gvc_chk_itm_rmk
gvc_pmt_typ
gvc_vchr_xref
gvc_auth_ref
gvc_vchr_cat
gvc_svc_ffm_dt
gvc_ppmt_elgbl
gvc_trs_sts_actn
gvc_trs_rsn
gvc_trs_sts
gvc_trs_sts_rmk
gvc_pmt_sts_actn
gvc_pmt_rsn
gvc_pmt_sts
gvc_pmt_sts_rmk) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38);`, 
        [
               header.hdr_isnd_id,
               header.hdr_key,
               null, //VR, DM, CM
               header.hdr_crt_dat,
               header.hdr_sap_vend_cd,  
               header.hdr_inv_no,
               null,     //tbd
               header.hdr_inv_dte,
               header.hdr_po_no ? 'PO' : null,
               header.hdr_po_no ? header.hdr_po_no : null,
               null, //po item
               null,  //voucher branch
               null,  //pre-tax amount
               null,  //voucher amount
               null, //discount amount
               null,  //description
               header.hdr_cur_cd,
               0, //exchange rate
               null, //payment term
                null, //discount term
                header.hdr_inv_due_dte,
                header.hdr_disc_due_dte,
                header.hdr_disc_amt,
                null, //check item remark
                null, //payment type
                null, //voucher cross reference
                null, //authorization reference
                null, //voucher category
                null, //service firm date
                null, //prepayment eligible
                null, //transaction status action
                null, //transaction reason
                null, //transaction status
                null, //transaction status remark
                null, //payment status action
                null, //payment reason
                null, //payment status
                null //payment status remark
        ]);

        await pool.query(`INSERT INTO public."810_Invex_TCIGGD"(
ggd_src_co_id
ggd_gat_ctl_no
ggd_gat_seq_no
ggd_bsc_gl_acct
ggd_inbd_sacct
ggd_dr_amt
ggd_cr_amt
ggd_dist_rmk) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`, 
        [
            header.hdr_isnd_id,
            header.hdr_key,
            null,
            null, //basic GL account
            null, //inbound subaccount
            null, //debit amount
            null, //credit amount
            null //distribution remark
        ]);

        await pool.query(`INSERT INTO public."810_Invex_SCIGAD"(
gad_src_co_id
gad_gat_ctl_no
gad_gat_seq_no
gad_acct_dist
gad_dr_amt
gad_cr_amt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`, 
        [
            header.hdr_isnd_id,
            header.hdr_key,
            null, //gate sequence number
            null, //account distribution
            null, //debit amount
            null //credit amount   
        ]);


    } catch (error) {
        console.error('-', header.hdr_key, '-\n',"Error in insert810InvexInbound:", error,'\n-', header.hdr_key, '-');
    }
}
module.exports = {
    insert810InvexInbound
};

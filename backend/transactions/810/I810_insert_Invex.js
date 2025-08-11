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
               header.hdr_type,
               header.hdr_key,
               "STX",
               header.hdr_isa_qual,
               header.hdr_isnd_id,
               header.hdr_key,  
               header.hdr_ircv_qual,
               header.hdr_ircv_id,
               header.hdr_crt_dat + String(header.hdr_crt_tim).padStart(6, '0'),
               flow
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
gvc_pmt_sts_rmk) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`, 
        [
               
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
               
        ]);

        await pool.query(`INSERT INTO public."810_Invex_SCIGAD"(
gad_src_co_id
gad_gat_ctl_no
gad_gat_seq_no
gad_acct_dist
gad_dr_amt
gad_cr_amt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`, 
        [
               
        ]);


    } catch (error) {
        console.error('-', header.hdr_key, '-\n',"Error in insert810InvexInbound:", error,'\n-', header.hdr_key, '-');
    }
}
module.exports = {
    insert810InvexInbound
};

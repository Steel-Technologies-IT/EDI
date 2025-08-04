async function insert810InvexInbound(pool, Header, Details, Mea, Names, Tags, AllowancesCharges) {
    // Insert the transformed data into the respective output tables
    // Map SNF tables to Invex JSON Structure 
    const flow = "I"
    try {
        
        // MARK: Interchange Control Table
        //Invex Interchange Control Table
        await pool.query(`INSERT INTO public."810_Invex_InterchangeControl"(
	ictl_type, ictl_key, ictl_companyid, ictl_senderinterchangeidqualifier, ictl_senderinterchangeid, ictl_edixcontrolnumber, ictl_receiverinterchangeidqualifier, ictl_receiverinterchangeid, ictl_createddatetime, ictl_alternateinterchangenumber, ictl_status, ictl_flow_flag)
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
                header.hdr_ictl_no,
                null,
                flow
        ]);


        // MARK: Transaction Set Table
       //Invex Transaction Set Table
        await pool.query(`INSERT INTO public."810_Invex_TransactionSet"(
	txs_type, txs_key, txs_transactionsetcontrolnumber, txs_edistandardsorganizationtransactionset, txs_edistandardsorganization, txs_status, txs_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7);`, [
                header.hdr_type,
                header.hdr_key,
                header.hdr_stctl_no,
                '810',
                'X',
                null,
                flow
        ]);


    } catch (error) {
        console.error('-', header.hdr_key, '-\n',"Error in insert810InvexInbound:", error,'\n-', header.hdr_key, '-');
    }
}
module.exports = {
    insert810InvexInbound
};

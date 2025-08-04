// This module handles the retrieval of parsed EDI 810 records from the PostgreSQL database. 
// It exports functions to retrieve control, transaction, shipment, instruction, chemistry, etc data from tables 



//810 Interchange Control
async function get810InterchangeControl(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            ictl_CompanyID, ictl_SenderInterchangeIDQualifier, ictl_SenderInterchangeID, ictl_EDIXControlNumber, 
            ictl_ReceiverInterchangeIDQualifier, ictl_ReceiverInterchangeID, ictl_CreatedDateTime, ictl_AlternateInterchangeNumber, ictl_Status
            FROM public."810_Invex_InterchangeControl" 
            WHERE ictl_Key = $1`, [keyPK]);

        structuredRes = results.rows[0];
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

//810 TransactionSet
async function get810TransactionSet(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            txs_TransactionSetControlNumber, txs_EDIStandardsOrganizationTransactionSet, txs_EDIStandardsOrganization, txs_Status
            FROM public."810_Invex_TransactionSet"
            WHERE  txs_Key = $1`, [keyPK]);

        structuredRes = results.rows;
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};


module.exports = {
    get810InterchangeControl: get810InterchangeControl,
    get810TransactionSet: get810TransactionSet
};
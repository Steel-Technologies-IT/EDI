// This module handles the retrieval of parsed EDI 810 records from the PostgreSQL database. 
// It exports functions to retrieve control, transaction, shipment, instruction, chemistry, etc data from tables 



//810 Interchange Control
async function get810SCTITN(pool, keyPK) {
    var structuredRes = {};
    try {

        const results = await pool.query(`SELECT 
            * FROM public."810_Invex_SCTITN" 
            WHERE itn_gat_ctl_no = $1`, [keyPK]);

        structuredRes = results.rows[0];
    } catch (error) {
        console.error('Error retrieving records:', error);
    }

    return structuredRes;
};

        //810 TransactionSet
        async function get810APIGVC(pool, keyPK) {
            var structuredRes = {};
            try {

                const results = await pool.query(`SELECT 
                    *
                    FROM public."810_Invex_APIGVC"
                    WHERE  gvc_gat_ctl_no = $1`, [keyPK]);

                structuredRes = results.rows;
            } catch (error) {
                console.error('Error retrieving records:', error);
            }

            return structuredRes;
        };


        //810 TransactionSet
        async function get810TCIGGD(pool, keyPK) {
            var structuredRes = {};
            try {

                const results = await pool.query(`SELECT 
                    * FROM public."810_Invex_TCIGGD"
                    WHERE  ggd_gat_ctl_no = $1`, [keyPK]);

                structuredRes = results.rows;
            } catch (error) {
                console.error('Error retrieving records:', error);
            }

            return structuredRes;
        };

        
        //810 TransactionSet
        async function get810SCIGAD(pool, keyPK) {
            var structuredRes = {};
            try {

                const results = await pool.query(`SELECT 
                    * FROM public."810_Invex_SCIGAD"
                    WHERE  gad_gat_ctl_no = $1`, [keyPK]);

                structuredRes = results.rows;
            } catch (error) {
                console.error('Error retrieving records:', error);
            }

            return structuredRes;
        };


module.exports = {
    get810SCTITN: get810SCTITN,
    get810APIGVC: get810APIGVC,
    get810TCIGGD: get810TCIGGD,
    get810SCIGAD: get810SCIGAD
};
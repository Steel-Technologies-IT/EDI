const express = require('express');
const router = express.Router();
const pool = require("../db2");
const queryInvexDatabase = require("../Invex/InvexConnection");
// Get all customers
router.get('/customers', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                edia_edi_account_id,
                edia_cust_name,
                edia_as400_xref,
                edia_crt_dte,
                edia_crt_tme,
                edia_crt_pgm,
                edia_crt_usr,
                edia_upd_dte,
                edia_upd_tme,
                edia_upd_pgm,
                edia_upd_usr,
                STRING_AGG(DISTINCT rte_cus_id::text, ', ' ORDER BY rte_cus_id::text) as invex_account_ids
            FROM public."EDI_Accounts"
            LEFT JOIN public."Routing_SNFs" ON edia_edi_account_id = rte_edi_acct_id
            GROUP BY 
                edia_edi_account_id,
                edia_cust_name,
                edia_as400_xref,
                edia_crt_dte,
                edia_crt_tme,
                edia_crt_pgm,
                edia_crt_usr,
                edia_upd_dte,
                edia_upd_tme,
                edia_upd_pgm,
                edia_upd_usr
            ORDER BY edia_edi_account_id
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error in GET /customers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search customers
router.get('/customers/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search term required' });
        }
        
        const result = await searchCustomers(q);
        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error in GET /customers/search:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get customer by ID
router.get('/customers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT * FROM public."EDI_Accounts" 
            WHERE edia_edi_account_id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update the POST route for creating customers
router.post('/customers', async (req, res) => {
    try {
        const { 
            ediCustomerNumber, 
            customerName,
            as400Xref,
            transaction,
            branch,
            addresses, 
            fieldConfiguration,
            gsReceiverId
        } = req.body;

        console.log(fieldConfiguration)
        // Basic validation
        if (!ediCustomerNumber) {
            return res.status(400).json({ error: 'Required fields missing: ediCustomerNumber' });
        }

        // Get current date and time for audit fields
        const now = new Date();
        const currentDate = now.getFullYear().toString().padStart(4, '0') +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0');
        const currentTime = now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0');
        const currentUser = 'SYSTEM';
        const currentProgram = 'SNF_GENERATOR';
        
        const result = await pool.query(`
            INSERT INTO public."EDI_Accounts"(
                edia_edi_account_id, 
                edia_cust_name,  
                edia_as400_xref, 
                edia_crt_dte, 
                edia_crt_tme, 
                edia_crt_pgm, 
                edia_crt_usr, 
                edia_upd_dte, 
                edia_upd_tme, 
                edia_upd_pgm, 
                edia_upd_usr
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            ediCustomerNumber,
            customerName || null,
            as400Xref || null,
            currentDate,
            currentTime,
            currentProgram,
            currentUser,
            currentDate,
            currentTime,
            currentProgram,
            currentUser
        ]);

        // Insert addresses
        addresses.map(async (address) => {
            console.log(address)
            
            let transactionValue = null;
            let branchValue = null;
            
            if (address.transaction && address.transaction !== '' && !isNaN(address.transaction)) {
                transactionValue = Number(address.transaction);
            }
            
            if (address.branch && address.branch !== '' && !isNaN(address.branch)) {
                branchValue = Number(address.branch);
            }
            
            await pool.query(`
                INSERT INTO public."EDI_Account_Address_Types"(
                    ediaat_edi_account_id, 
                    ediaat_branch, 
                    ediaat_edi_trans_tpe, 
                    ediaat_addr_typ_cde,
                    ediaat_addr_id, 
                    ediaat_id_qual, 
                    ediaat_crt_dte, 
                    ediaat_crt_tme, 
                    ediaat_crt_pgm, 
                    ediaat_crt_usr, 
                    ediaat_upd_dte, 
                    ediaat_upd_tme, 
                    ediaat_upd_pgm, 
                    ediaat_upd_user
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            `, [
                ediCustomerNumber,
                branchValue,
                transactionValue,
                address.addressType,
                address.addressIdentifier,
                address.addressCode || null, 
                currentDate,
                currentTime,
                currentProgram,
                currentUser,
                currentDate,
                currentTime,
                currentProgram,
                currentUser
            ]);
        });

        console.log('Field configuration received:', fieldConfiguration);
        
        // Insert field configurations with new structure including transaction field
        if (fieldConfiguration && Object.keys(fieldConfiguration).length > 0) {
            for (const [groupKey, groupData] of Object.entries(fieldConfiguration)) {
                if (groupData && typeof groupData === 'object') {
                    // Extract transaction and branch from groupData
                    const configTransaction = groupData.transaction;
                    const configBranch = groupData.branch;
                    const configData = groupData.data;

                    console.log("GroupData: ", groupData)
                    
                    // Convert transaction and branch values to numbers or null
                    let transactionValue = null;
                    let branchValue = null;
                    
                    if (configTransaction && configTransaction !== '' && !isNaN(configTransaction)) {
                        transactionValue = Number(configTransaction);
                    }
                    
                    if (configBranch && configBranch !== '' && !isNaN(configBranch)) {
                        branchValue = Number(configBranch);
                    }


                    
                    await pool.query(`
                        INSERT INTO public."EDI_Account_Config"(
                            ediac_edi_account_id, 
                            ediac_branch,
                            ediac_trans,
                            ediac_trans_cfg_settings, 
                            ediac_data, 
                            ediac_crt_dte, 
                            ediac_crt_tme, 
                            ediac_crt_pgm, 
                            ediac_crt_usr, 
                            ediac_upd_dte, 
                            ediac_upd_tme, 
                            ediac_upd_pgm, 
                            ediac_upd_usr
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    `, [
                        ediCustomerNumber,
                        branchValue, // Use processed branch value (numeric or null)
                        transactionValue, // Add transaction field
                        null, // transactionConfigSettings
                        configData, // Store the field configuration data
                        currentDate,
                        currentTime,
                        currentProgram,
                        currentUser,
                        currentDate,
                        currentTime,
                        currentProgram,
                        currentUser
                    ]);
                }
            }
        }
        
        res.status(201).json({
            message: 'Customer created successfully',
            customer: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating customer:', error);
        
        if (error.code === '23505') {
            return res.status(409).json({ 
                error: 'Customer with this EDI Account ID already exists' 
            });
        }
        
        if (error.code === '22P02') {
            return res.status(400).json({ 
                error: 'Invalid data format provided' 
            });
        }
        
        res.status(500).json({ 
            error: 'Internal server error: ' + error.message,
            details: error.detail || 'No additional details'
        });
    }
});

// Update the PUT route for updating customers
router.put('/customers/:id', async (req, res) => {
    try {
        const originalEdiAccountId = req.params.id;
        
        const { 
            ediCustomerNumber, 
            customerName,
            as400Xref,
            transaction,
            branch,
            addresses, 
            fieldConfiguration,
            gsReceiverId,
            originalInvexAccountId
        } = req.body;
        
        if (!ediCustomerNumber) {
            return res.status(400).json({ error: 'Required fields missing' });
        }

        // Check if the new EDI Account ID is different from the original and already exists
        if (ediCustomerNumber !== originalEdiAccountId) {
            const existingCustomer = await pool.query(`
                SELECT edia_edi_account_id FROM public."EDI_Accounts" 
                WHERE edia_edi_account_id = $1
            `, [ediCustomerNumber]);
            
            if (existingCustomer.rows.length > 0) {
                return res.status(409).json({ 
                    error: 'A customer with this EDI Account ID already exists' 
                });
            }
        }

        // Get current date and time for audit fields
        const now = new Date();
        const currentDate = now.getFullYear().toString().padStart(4, '0') +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0');
        const currentTime = now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0');
        const currentUser = 'SYSTEM';
        const currentProgram = 'SNF_GENERATOR';
        
        // Start transaction
        await pool.query('BEGIN');
        
        try {
            // Update main customer record using the ORIGINAL EDI Account ID
            const updateResult = await pool.query(`
                UPDATE public."EDI_Accounts" 
                SET 
                    edia_edi_account_id = $1,
                    edia_cust_name = $2,
                    edia_as400_xref = $3,
                    edia_upd_dte = $4,
                    edia_upd_tme = $5,
                    edia_upd_pgm = $6,
                    edia_upd_usr = $7
                WHERE edia_edi_account_id = $8
                RETURNING *
            `, [
                ediCustomerNumber,
                customerName || null,
                as400Xref || null,
                currentDate,
                currentTime,
                currentProgram,
                currentUser,
                originalEdiAccountId
            ]);

            if (updateResult.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({ error: 'Customer not found' });
            }

            // Delete existing addresses for this customer (use ORIGINAL ID)
            await pool.query(`
                DELETE FROM public."EDI_Account_Address_Types" 
                WHERE ediaat_edi_account_id = $1
            `, [originalEdiAccountId]);

            // Insert new addresses (use NEW ID if it changed)
            const addressEdiAccountId = ediCustomerNumber;
            if (addresses && addresses.length > 0) {
                for (const address of addresses) {
                    console.log(address);
                    
                    let transactionValue = null;
                    let branchValue = null;
                    
                    if (address.transaction && address.transaction !== '' && !isNaN(address.transaction)) {
                        transactionValue = Number(address.transaction);
                    }
                    
                    if (address.branch && address.branch !== '' && !isNaN(address.branch)) {
                        branchValue = Number(address.branch);
                    }
                    
                    console.log('Processed address values:', {
                        originalTransaction: address.transaction,
                        processedTransaction: transactionValue,
                        originalBranch: address.branch,
                        processedBranch: branchValue
                    });
                    
                    await pool.query(`
                        INSERT INTO public."EDI_Account_Address_Types"(
                            ediaat_edi_account_id, 
                            ediaat_branch, 
                            ediaat_edi_trans_tpe, 
                            ediaat_addr_typ_cde,
                            ediaat_addr_id, 
                            ediaat_id_qual, 
                            ediaat_crt_dte, 
                            ediaat_crt_tme, 
                            ediaat_crt_pgm, 
                            ediaat_crt_usr, 
                            ediaat_upd_dte, 
                            ediaat_upd_tme, 
                            ediaat_upd_pgm, 
                            ediaat_upd_user
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    `, [
                        addressEdiAccountId,
                        branchValue,
                        transactionValue,
                        address.addressType,
                        address.addressIdentifier,
                        address.addressCode, 
                        currentDate,
                        currentTime,
                        currentProgram,
                        currentUser,
                        currentDate,
                        currentTime,
                        currentProgram,
                        currentUser
                    ]);
                }
            }

            // Delete existing field configuration for this customer (use ORIGINAL ID)
            await pool.query(`
                DELETE FROM public."EDI_Account_Config" 
                WHERE ediac_edi_account_id = $1
            `, [originalEdiAccountId]);

           

            // Insert new field configurations with transaction field
            const configEdiAccountId = ediCustomerNumber;
            if (fieldConfiguration && Object.keys(fieldConfiguration).length > 0) {
                for (const [groupKey, groupData] of Object.entries(fieldConfiguration)) {
                    if (groupData && typeof groupData === 'object') {
                        // Extract transaction and branch from groupData
                        const configTransaction = groupData.transaction;
                        const configBranch = groupData.branch;
                        const configData = groupData.data;
                        const configCheckbox = groupData.checkboxData;
                        console.log("Group Data:", groupData);
                        
                        
                        // Convert transaction and branch values to numbers or null
                        let transactionValue = null;
                        let branchValue = null;
                        
                        if (configTransaction && configTransaction !== '' && !isNaN(configTransaction)) {
                            transactionValue = Number(configTransaction);
                        }
                        
                        if (configBranch && configBranch !== '' && !isNaN(configBranch)) {
                            branchValue = Number(configBranch);
                        }
                        
                        
                        
                        await pool.query(`
                            INSERT INTO public."EDI_Account_Config"(
                                ediac_edi_account_id, 
                                ediac_branch, 
                                ediac_trans,
                                ediac_trans_cfg_settings, 
                                ediac_data, 
                                ediac_crt_dte, 
                                ediac_crt_tme, 
                                ediac_crt_pgm, 
                                ediac_crt_usr, 
                                ediac_upd_dte, 
                                ediac_upd_tme, 
                                ediac_upd_pgm, 
                                ediac_upd_usr
                            )
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                        `, [
                            configEdiAccountId,
                            branchValue, // Use processed branch value (numeric or null)
                            transactionValue, // Add transaction field
                            configCheckbox, // transactionConfigSettings
                            configData, // Store the field configuration data
                            currentDate,
                            currentTime,
                            currentProgram,
                            currentUser,
                            currentDate,
                            currentTime,
                            currentProgram,
                            currentUser
                        ]);
                    }
                }
            }

            // Commit transaction
            await pool.query('COMMIT');
            
            res.status(200).json({
                message: 'Customer updated successfully',
                customer: updateResult.rows[0]
            });
            
        } catch (error) {
            // Rollback transaction on error
            await pool.query('ROLLBACK');
            throw error;
        }
        
    } catch (error) {
        console.error('Error updating customer:', error);
        
        if (error.code === '23505') {
            return res.status(409).json({ 
                error: 'Customer with this EDI Account ID already exists' 
            });
        }
        
        if (error.code === '22P02') {
            return res.status(400).json({ 
                error: 'Invalid data format provided' 
            });
        }
        
        res.status(500).json({ 
            error: 'Internal server error: ' + error.message,
            details: error.detail || 'No additional details'
        });
    }
});

// Delete customer
router.delete('/customers/:id', async (req, res) => {
    try {
        const customerId = parseInt(req.params.id);
        if (isNaN(customerId)) {
            return res.status(400).json({ error: 'Invalid customer ID' });
        }

       
        await pool.query(`
                DELETE FROM public."EDI_Accounts"
	WHERE edia_edi_account_id = $1`, [
                customerId
            ]);
            await pool.query(`
                DELETE FROM public."EDI_Account_Config"
	WHERE ediac_edi_account_id = $1`, [
                customerId
            ]);
            await pool.query(`
                DELETE FROM public."EDI_Account_Address_Types"
	WHERE ediaat_edi_account_id = $1`, [
                customerId
            ]);

        res.status(204).send();
    } catch (error) {
        console.error('Error in DELETE /customers/:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




router.get('/snf-decoder', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                snf_fieldtransaction as "fieldTransaction",
                snf_code as "snfCode",
                snf_description as "snfDescription",
                snf_position as "snfPosition",
                snf_length as "snfLength",
                snf_type as "snfType"
            FROM "SNFdecoder" 
            ORDER BY snf_fieldtransaction, snf_code
        `);
        
      
        
        // Return the rows directly, not checking for .success
        res.json({ rows: result.rows });
    } catch (error) {
        console.error('Error in GET /snf-decoder:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get addresses for a specific customer
router.get('/addresses/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        
        const result = await pool.query(`
            SELECT * FROM public."EDI_Account_Address_Types" 
            WHERE ediaat_edi_account_id = $1
        `, [customerId]);
        
        res.json({
            rows: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get field configuration for a specific customer
router.get('/field-config/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        
        const result = await pool.query(`
            SELECT * FROM public."EDI_Account_Config" 
            WHERE ediac_edi_account_id = $1
        `, [customerId]);
        
        res.json({
            rows: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching field configuration:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get transaction type options
router.get('/transaction-options', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
              AND table_name ~ '^[0-9]{3}'
        `);

        // Extract the three digit prefix from each table name
        const prefixes = result.rows
            .map(row => row.table_name.substring(0, 3))
            .filter(prefix => /^\d{3}$/.test(prefix));

        // Get distinct prefixes and sort by numeric value
        const distinctPrefixes = [...new Set(prefixes)]
            .sort((a, b) => parseInt(a) - parseInt(b)) // Sort numerically
            .map(prefix => ({
                value: prefix,
                label: prefix
            }));

        res.json({ rows: distinctPrefixes });
    } catch (error) {
        console.error('Error fetching transaction type options:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get branch options
router.get('/branch-options', async (req, res) => {
    try {
        const SQL = `SELECT brh_brh, brh_brh_nm FROM scrbrh_rec ORDER BY brh_brh`;
        const result = await queryInvexDatabase(SQL);

        
        // If no data from config table, provide default options
        let branchOptions = result.Data;

        
        res.json({
            rows: branchOptions
        });
        
    } catch (error) {
        console.error('Error fetching branch options:', error);
        
        
    }
});

router.post('/generate-edi-number', async (req, res) => {
    try {
        console.log('=== GENERATE EDI NUMBER ENDPOINT CALLED ===');
        console.log('Request headers:', req.headers);
        console.log('Request body:', req.body);
        
        // Get the largest existing EDI account ID
        const maxQuery = `
            SELECT MAX(CAST(edia_edi_account_id AS BIGINT)) as max_id 
            FROM public."EDI_Accounts"
            WHERE edia_edi_account_id ~ '^[0-9]+$'
        `;
        
        const maxResult = await pool.query(maxQuery);
        console.log('Max query result:', maxResult.rows);
        
        let nextNumber;
        
        if (maxResult.rows[0].max_id === null) {
            // No existing records or no numeric IDs found, start with a default number
            nextNumber = '1'; // 8-digit starting number
            console.log('No existing records found, starting with:', nextNumber);
        } else {
            // Add 1 to the maximum value
            const maxId = parseInt(maxResult.rows[0].max_id);
            nextNumber = (maxId + 1).toString();
            console.log(`Found max ID: ${maxId}, next number will be: ${nextNumber}`);
        }
        
        // Double-check that this number doesn't exist (safety check)
        const checkQuery = `
            SELECT 1 FROM public."EDI_Accounts"
            WHERE edia_edi_account_id = $1
            LIMIT 1
        `;
        
        const checkResult = await pool.query(checkQuery, [nextNumber]);
        
        if (checkResult.rows.length > 0) {
            console.error(`Generated number ${nextNumber} already exists!`);
            throw new Error(`Generated number ${nextNumber} already exists in database`);
        }
        
        console.log('=== SENDING RESPONSE ===');
        console.log('Next unique number:', nextNumber);
        
        res.json({
            success: true,
            ediNumber: nextNumber,
            message: `Generated sequential EDI number: ${nextNumber}`
        });
        
    } catch (error) {
        console.error('Error generating sequential EDI number:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate sequential EDI number'
        });
    }
});



module.exports = router;
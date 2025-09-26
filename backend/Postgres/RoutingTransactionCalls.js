const express = require("express");
const app = express.Router();
const pool = require("../db2");
const queryInvexDatabase = require("../Invex/InvexConnection");
// Get column information for the Routing_SNFs table
app.get("/Tables/:tableName/Columns", async(req, res) => {
    try {
        const { tableName } = req.params;
        
        // Validate table name to prevent SQL injection (only allow alphanumeric and underscores)
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        // For security, only allow access to the Routing_SNFs table
        if (tableName !== 'Routing_SNFs') {
            return res.status(403).json({ error: 'Access denied to this table' });
        }

        const result = await pool.query(`
            SELECT 
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.column_default,
                c.character_maximum_length,
                c.numeric_precision,
                c.numeric_scale,
                pgd.description as column_comment
            FROM information_schema.columns c
            LEFT JOIN pg_catalog.pg_statio_all_tables st 
                ON c.table_schema = st.schemaname AND c.table_name = st.relname
            LEFT JOIN pg_catalog.pg_description pgd 
                ON pgd.objoid = st.relid 
                AND pgd.objsubid = c.ordinal_position
            WHERE c.table_schema = 'public' 
              AND c.table_name = $1
            ORDER BY c.ordinal_position
        `, [tableName]);

        res.json({ 
            columns: result.rows,
            tableName: tableName
        });
    } catch (err) {
        console.error('Error fetching columns:', err.message);
        res.status(500).json({ error: 'Failed to fetch table columns' });
    }
});

app.get("/InvexCustomers", async(req, res) => {
    try {
        const sql = `
       SELECT eii_ichg_acct_typ, eii_ichg_acct_id, eii_edix_iiq, eii_edix_ichid, cus_cus_nm 
       FROM  edreii_rec
INNER JOIN arrcus_rec
ON cus_cus_id = eii_ichg_acct_id
ORDER BY eii_ichg_acct_typ
        `;
        const data = await queryInvexDatabase(sql);

        if (data) {
            res.json({ customers: data });
        } else {
            res.status(404).json({ error: 'No customers found' });
        }
    } catch (error) {
        console.error('Error fetching Invex customers:', error);
        res.status(500).json({ error: 'Failed to fetch Invex customers' });
    }
});

// Get all records from the Routing_SNFs table with filtering and pagination
app.get("/Tables/:tableName/Records", async(req, res) => {
    try {
        const { tableName } = req.params;
        const { limit = 12, offset = 0, searchColumn = '', searchTerm = '', columnFilters = '' } = req.query;
        
        // Validate table name to prevent SQL injection
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        // For security, only allow access to the Routing_SNFs table
        if (tableName !== 'Routing_SNFs') {
            return res.status(403).json({ error: 'Access denied to this table' });
        }

        // Parse column filters
        let parsedColumnFilters = {};
        if (columnFilters && columnFilters.trim() !== '') {
            try {
                parsedColumnFilters = JSON.parse(columnFilters);
            } catch (err) {
                return res.status(400).json({ error: 'Invalid column filters format' });
            }
        }

        // Map frontend field names to database column names for filtering
        const fieldMapping = {
            'customer_id': 'rte_cus_id',
            'isa_id': 'rte_isa_id', 
            'isa_qualifier': 'rte_isa_qual',
            'edi_account_id': 'rte_edi_acct_id'
        };

        // Convert frontend filters to database column names
        const dbColumnFilters = {};
        Object.entries(parsedColumnFilters).forEach(([frontendKey, value]) => {
            const dbKey = fieldMapping[frontendKey];
            if (dbKey) {
                dbColumnFilters[dbKey] = value;
            }
        });

        // Valid database columns for this table
        const validDbColumns = ['rte_cus_id', 'rte_isa_id', 'rte_isa_qual', 'rte_edi_acct_id'];

        // Map search column to database column
        const dbSearchColumn = fieldMapping[searchColumn] || searchColumn;

        // Validate search column
        if (dbSearchColumn && !validDbColumns.includes(dbSearchColumn)) {
            return res.status(400).json({ error: `Invalid search column: ${searchColumn}` });
        }
        
        // Support limit=all to return all records
        const limitStr = String(limit).toLowerCase();
        const lim = limitStr === 'all' ? null : Math.max(1, parseInt(limit));
        const off = Math.max(0, parseInt(offset));

        // Build WHERE conditions
        const whereConditions = [];
        const queryParams = [];
        let paramIndex = 1;

        // Add search condition
        if (dbSearchColumn && searchTerm && searchTerm.toString().trim() !== '') {
            whereConditions.push(`CAST("${dbSearchColumn}" AS TEXT) ILIKE $${paramIndex}`);
            queryParams.push(`%${searchTerm}%`);
            paramIndex++;
        }

        // Add column filter conditions
        Object.entries(dbColumnFilters).forEach(([colName, filterValue]) => {
            if (filterValue && filterValue.trim() !== '') {
                // Split by comma and create OR conditions for each value
                const values = filterValue.split(',').map(v => v.trim()).filter(Boolean);
                if (values.length > 0) {
                    const properOrConditions = values.map((value) => {
                        const condition = `CAST("${colName}" AS TEXT) ILIKE $${paramIndex}`;
                        queryParams.push(`%${value}%`);
                        paramIndex++;
                        return condition;
                    });
                    
                    whereConditions.push(`(${properOrConditions.join(' OR ')})`);
                }
            }
        });

        // Build the WHERE clause
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Build queries
        const countQuery = `SELECT COUNT(*) as total FROM public."${tableName}" ${whereClause}`;
        
        let recordsQuery;
        let recordsParams = [...queryParams];
        
        if (lim === null) {
            // No LIMIT/OFFSET when returning all
            recordsQuery = `SELECT * FROM public."${tableName}" ${whereClause} ORDER BY "rte_cus_id", "rte_isa_id", "rte_edi_acct_id"`;
        } else {
            recordsQuery = `SELECT * FROM public."${tableName}" ${whereClause} ORDER BY "rte_cus_id", "rte_isa_id", "rte_edi_acct_id" LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            recordsParams.push(lim, off);
        }

        // Execute the main query first
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        const recordsResult = await pool.query(recordsQuery, recordsParams);
        
        // Get customer names from Invex for the returned records
        const customerIds = [...new Set(recordsResult.rows.map(row => row.rte_cus_id).filter(Boolean))];
        let customerNameMap = {};
        
        if (customerIds.length > 0) {
            try {
                const placeholders = customerIds.map((_, index) => `'${customerIds[index]}'`).join(', ');
                const invexQuery = `
                    SELECT eii_ichg_acct_id, cus_cus_nm 
                    FROM edreii_rec
                    INNER JOIN arrcus_rec ON cus_cus_id = eii_ichg_acct_id
                    WHERE eii_ichg_acct_id IN (${placeholders})
                `;
                
                const invexData = await queryInvexDatabase(invexQuery);
                if (invexData && invexData.length > 0) {
                    invexData.forEach(customer => {
                        customerNameMap[customer.eii_ichg_acct_id] = customer.cus_cus_nm;
                    });
                }
            } catch (invexError) {
                console.error('Error fetching customer names:', invexError);
            }
        }
        
        // Reverse field mapping for response (database to frontend)
        const reverseFieldMapping = {
            'rte_cus_id': 'customer_id',
            'rte_isa_id': 'isa_id',
            'rte_isa_qual': 'isa_qualifier', 
            'rte_edi_acct_id': 'edi_account_id'
        };
        
        // Convert database records to frontend format and add customer names
        const recordsWithId = recordsResult.rows.map((row, index) => {
            const frontendRow = {};
            
            // Map database columns to frontend field names
            Object.entries(row).forEach(([dbKey, value]) => {
                const frontendKey = reverseFieldMapping[dbKey] || dbKey;
                frontendRow[frontendKey] = value;
            });
            
            // Add customer name from Invex lookup
            frontendRow.customer_name = customerNameMap[row.rte_cus_id] || null;
            
            // Add unique row ID using database column values
            frontendRow._row_id = `${row.rte_cus_id}_${row.rte_isa_id}_${row.rte_isa_qual}_${row.rte_edi_acct_id}`;
            
            return frontendRow;
        });
        
        res.json({ 
            records: recordsWithId,
            total: total,
            limit: lim === null ? total : lim,
            offset: lim === null ? 0 : off,
            hasMore: lim === null ? false : ((off + lim) < total),
            tableName: tableName
        });
    } catch (err) {
        console.error('Error fetching records:', err.message);
        res.status(500).json({ error: 'Failed to fetch table records' });
    }
});

// Add a new record to Routing_SNFs table
app.post("/Tables/:tableName/Records", async(req, res) => {
    try {
        const { tableName } = req.params;
        
        // Validate table name
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        // For security, only allow access to the Routing_SNFs table
        if (tableName !== 'Routing_SNFs') {
            return res.status(403).json({ error: 'Access denied to this table' });
        }

        const recordData = req.body;
        console.log('Adding record to', tableName, 'with data:', recordData);
        
        // Map frontend field names to database column names
        const fieldMapping = {
            'customer_id': 'rte_cus_id',
            'isa_id': 'rte_isa_id', 
            'isa_qualifier': 'rte_isa_qual',
            'edi_account_id': 'rte_edi_acct_id'
        };

        // Convert frontend data to database format
        const dbData = {};
        Object.entries(recordData).forEach(([frontendKey, value]) => {
            const dbKey = fieldMapping[frontendKey];
            if (dbKey) {
                dbData[dbKey] = value;
            }
        });

        console.log('Mapped database data:', dbData);

        // Define the columns for this table
        const validColumns = ['rte_cus_id', 'rte_isa_id', 'rte_isa_qual', 'rte_edi_acct_id'];
        const insertColumns = validColumns.filter(col => dbData.hasOwnProperty(col) && dbData[col] !== '');
        
        if (insertColumns.length === 0) {
            return res.status(400).json({ error: 'No valid data provided' });
        }

        // Check if record already exists (prevent duplicates)
        const existsQuery = `
            SELECT 1 FROM public."${tableName}" 
            WHERE "rte_cus_id" = $1 AND "rte_isa_id" = $2 AND "rte_isa_qual" = $3 AND "rte_edi_acct_id" = $4
        `;
        const existsResult = await pool.query(existsQuery, [
            dbData.rte_cus_id || null,
            dbData.rte_isa_id || null,
            dbData.rte_isa_qual || null,
            dbData.rte_edi_acct_id || null
        ]);

        if (existsResult.rowCount > 0) {
            return res.status(400).json({ error: 'A record with this combination already exists' });
        }

        const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
        const values = insertColumns.map(col => dbData[col] || null);
        
        const insertQuery = `
            INSERT INTO public."${tableName}" (${insertColumns.map(col => `"${col}"`).join(', ')})
            VALUES (${placeholders})
            RETURNING *
        `;

        console.log('Insert query:', insertQuery);
        console.log('Insert values:', values);

        const result = await pool.query(insertQuery, values);

        res.json({
            message: 'Record added successfully',
            record: result.rows[0]
        });
    } catch (err) {
        console.error('Error adding record:', err.message);
        res.status(500).json({ error: 'Failed to add record' });
    }
});

// Update a specific record in Routing_SNFs table
app.put("/Tables/:tableName/Records/:rowId", async(req, res) => {
    try {
        const { tableName, rowId } = req.params;
        
        // Validate table name
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        // For security, only allow access to the Routing_SNFs table
        if (tableName !== 'Routing_SNFs') {
            return res.status(403).json({ error: 'Access denied to this table' });
        }

        console.log('Attempting to update record with rowId:', rowId);

        // Parse the composite row ID - should have 4 parts
        const idParts = rowId.split('_');
        if (idParts.length !== 4) {
            return res.status(400).json({ error: `Invalid row ID format. Expected 4 parts, got ${idParts.length}` });
        }

        const [originalCusId, originalIsaId, originalIsaQual, originalEdiAcctId] = idParts;
        const recordData = req.body;
        
        console.log('Parsed original values:', { originalCusId, originalIsaId, originalIsaQual, originalEdiAcctId });
        console.log('Update data:', recordData);

        // Map frontend field names to database column names
        const fieldMapping = {
            'customer_id': 'rte_cus_id',
            'isa_id': 'rte_isa_id', 
            'isa_qualifier': 'rte_isa_qual',
            'edi_account_id': 'rte_edi_acct_id'
        };

        // Convert frontend data to database format
        const dbData = {};
        Object.entries(recordData).forEach(([frontendKey, value]) => {
            const dbKey = fieldMapping[frontendKey];
            if (dbKey) {
                dbData[dbKey] = value;
            }
        });

        console.log('Mapped database data:', dbData);

        // Define valid columns
        const validColumns = ['rte_cus_id', 'rte_isa_id', 'rte_isa_qual', 'rte_edi_acct_id'];
        const updateColumns = validColumns.filter(col => dbData.hasOwnProperty(col));
        
        if (updateColumns.length === 0) {
            return res.status(400).json({ error: 'No valid columns provided for update' });
        }

        const setClause = updateColumns.map((col, index) => `"${col}" = $${index + 1}`).join(', ');
        const values = updateColumns.map(col => dbData[col] || null);
        
        // Add original values for WHERE clause (these will be parameters starting after the SET values)
        const whereParamStart = values.length + 1;
        values.push(originalCusId === 'null' ? null : originalCusId);
        values.push(originalIsaId === 'null' ? null : originalIsaId);
        values.push(originalIsaQual === 'null' ? null : originalIsaQual);
        values.push(originalEdiAcctId === 'null' ? null : originalEdiAcctId);

        const updateQuery = `
            UPDATE public."${tableName}" 
            SET ${setClause}
            WHERE ("rte_cus_id" = $${whereParamStart} OR ("rte_cus_id" IS NULL AND $${whereParamStart} IS NULL))
              AND ("rte_isa_id" = $${whereParamStart + 1} OR ("rte_isa_id" IS NULL AND $${whereParamStart + 1} IS NULL))
              AND ("rte_isa_qual" = $${whereParamStart + 2} OR ("rte_isa_qual" IS NULL AND $${whereParamStart + 2} IS NULL))
              AND ("rte_edi_acct_id" = $${whereParamStart + 3} OR ("rte_edi_acct_id" IS NULL AND $${whereParamStart + 3} IS NULL))
            RETURNING *
        `;

        console.log('Update query:', updateQuery);
        console.log('Update values:', values);

        const result = await pool.query(updateQuery, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        // Convert database result back to frontend format
        const reverseFieldMapping = {
            'rte_cus_id': 'customer_id',
            'rte_isa_id': 'isa_id',
            'rte_isa_qual': 'isa_qualifier', 
            'rte_edi_acct_id': 'edi_account_id'
        };
        
        const frontendRecord = {};
        Object.entries(result.rows[0]).forEach(([dbKey, value]) => {
            const frontendKey = reverseFieldMapping[dbKey] || dbKey;
            frontendRecord[frontendKey] = value;
        });

        // Add the row ID to the response
        frontendRecord._row_id = `${result.rows[0].rte_cus_id}_${result.rows[0].rte_isa_id}_${result.rows[0].rte_isa_qual}_${result.rows[0].rte_edi_acct_id}`;

        console.log('Update successful:', frontendRecord);

        res.json({
            message: 'Record updated successfully',
            record: frontendRecord
        });
    } catch (err) {
        console.error('Error updating record:', err.message);
        res.status(500).json({ error: 'Failed to update record' });
    }
});

// Delete a specific record from Routing_SNFs table
app.delete("/Tables/:tableName/Records/:rowId", async(req, res) => {
    try {
        const { tableName, rowId } = req.params;
        
        // Validate table name
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        // For security, only allow access to the Routing_SNFs table
        if (tableName !== 'Routing_SNFs') {
            return res.status(403).json({ error: 'Access denied to this table' });
        }

        console.log('Attempting to delete record with rowId:', rowId);

        // Parse the composite row ID - should have 4 parts, not 5
        const idParts = rowId.split('_');
        if (idParts.length !== 4) {
            return res.status(400).json({ error: `Invalid row ID format. Expected 4 parts, got ${idParts.length}` });
        }

        // Destructure all 4 parts
        const [cusId, isaId, isaQual, ediAcctId] = idParts;

        console.log('Parsed ID parts:', { cusId, isaId, isaQual, ediAcctId });

        const deleteQuery = `
            DELETE FROM public."${tableName}" 
            WHERE ("rte_cus_id" = $1 OR ("rte_cus_id" IS NULL AND $1 IS NULL))
              AND ("rte_isa_id" = $2 OR ("rte_isa_id" IS NULL AND $2 IS NULL))
              AND ("rte_isa_qual" = $3 OR ("rte_isa_qual" IS NULL AND $3 IS NULL))
              AND ("rte_edi_acct_id" = $4 OR ("rte_edi_acct_id" IS NULL AND $4 IS NULL))
            RETURNING *
        `;

        const values = [
            cusId === 'null' ? null : cusId,
            isaId === 'null' ? null : isaId,
            isaQual === 'null' ? null : isaQual,
            ediAcctId === 'null' ? null : ediAcctId
        ];

        console.log('Delete query:', deleteQuery);
        console.log('Delete values:', values);

        const deleteResult = await pool.query(deleteQuery, values);

        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        console.log('Record deleted successfully:', deleteResult.rows[0]);

        res.json({ 
            message: 'Record deleted successfully',
            deletedRecord: deleteResult.rows[0]
        });
    } catch (err) {
        console.error('Error deleting record:', err.message);
        res.status(500).json({ error: 'Failed to delete record' });
    }
});

// Update your GET Records query to join with customer table:
app.get('/Records', async (req, res) => {
    try {
        console.log('Fetching routing records with customer names...');
        
        // First get the routing records
        const routingQuery = `
            SELECT 
                rte_cus_id as customer_id,
                rte_isa_id as isa_id,
                rte_isa_qual as isa_qualifier,
                rte_edi_acct_id as edi_account_id
            FROM public."routing_trans_table"
            ORDER BY rte_cus_id, rte_isa_id, rte_edi_acct_id
        `;
        const routingResult = await pool.query(routingQuery);
        
        console.log(`Found ${routingResult.rows.length} routing records`);
        
        // Get unique customer IDs to look up in Invex
        const customerIds = [...new Set(routingResult.rows.map(row => row.customer_id).filter(Boolean))];
        console.log('Unique customer IDs:', customerIds);
        
        // Query Invex database for customer names
        let customerNameMap = {};
        if (customerIds.length > 0) {
            try {
                // Create IN clause for the customer IDs
                const placeholders = customerIds.map((_, index) => `'${customerIds[index]}'`).join(', ');
                const invexQuery = `
                    SELECT eii_ichg_acct_id, cus_cus_nm 
                    FROM edreii_rec
                    INNER JOIN arrcus_rec ON cus_cus_id = eii_ichg_acct_id
                    WHERE eii_ichg_acct_id IN (${placeholders})
                `;
                
                console.log('Invex query:', invexQuery);
                const invexData = await queryInvexDatabase(invexQuery);
                
                if (invexData && invexData.length > 0) {
                    // Create a map of customer_id -> customer_name
                    invexData.forEach(customer => {
                        customerNameMap[customer.eii_ichg_acct_id] = customer.cus_cus_nm;
                    });
                    console.log('Customer name map:', customerNameMap);
                }
            } catch (invexError) {
                console.error('Error fetching customer names from Invex:', invexError);
                // Continue without customer names if Invex query fails
            }
        }
        
        // Transform the data to include customer names
        const frontendRows = routingResult.rows.map(row => ({
            customer_id: row.customer_id,
            isa_id: row.isa_id,
            isa_qualifier: row.isa_qualifier,
            edi_account_id: row.edi_account_id,
            customer_name: customerNameMap[row.customer_id] || null,
            _row_id: `${row.customer_id}_${row.isa_id}_${row.edi_account_id}`
        }));
        
        console.log(`Returning ${frontendRows.length} records with customer names`);
        res.json(frontendRows);
        
    } catch (error) {
        console.error('Error fetching routing records:', error);
        res.status(500).json({ error: 'Failed to fetch routing records' });
    }
});

module.exports = app;
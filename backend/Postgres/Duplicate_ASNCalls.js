const express = require("express");
const app = express.Router();
const pool = require("../db2");

// Get column information for the Duplicate_SNFs table
app.get("/Tables/:tableName/Columns", async(req, res) => {
    try {
        const { tableName } = req.params;
        
        // Validate table name to prevent SQL injection (only allow alphanumeric and underscores)
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        // For security, only allow access to the Duplicate_SNFs table
        if (tableName !== 'Duplicate_SNFs') {
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

// Get all records from the Duplicate_SNFs table with filtering and pagination
app.get("/Tables/:tableName/Records", async(req, res) => {
    try {
        const { tableName } = req.params;
        const { limit = 12, offset = 0, searchColumn = '', searchTerm = '', columnFilters = '' } = req.query;
        
        // Validate table name to prevent SQL injection
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        // For security, only allow access to the Duplicate_SNFs table
        if (tableName !== 'Duplicate_SNFs') {
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

        // Valid columns for this table
        const validColumns = ['dup_cus_id', 'dup_trans', 'dup_gs_id', 'dup_env'];

        // Validate search column
        if (searchColumn && !validColumns.includes(searchColumn)) {
            return res.status(400).json({ error: `Invalid search column: ${searchColumn}` });
        }

        // Validate filter columns
        for (const filterCol of Object.keys(parsedColumnFilters)) {
            if (!validColumns.includes(filterCol)) {
                return res.status(400).json({ error: `Invalid filter column: ${filterCol}` });
            }
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
        if (searchColumn && searchTerm && searchTerm.toString().trim() !== '') {
            whereConditions.push(`CAST("${searchColumn}" AS TEXT) ILIKE $${paramIndex}`);
            queryParams.push(`%${searchTerm}%`);
            paramIndex++;
        }

        // Add column filter conditions
        Object.entries(parsedColumnFilters).forEach(([colName, filterValue]) => {
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
            recordsQuery = `SELECT * FROM public."${tableName}" ${whereClause} ORDER BY "dup_cus_id", "dup_trans", "dup_gs_id"`;
        } else {
            recordsQuery = `SELECT * FROM public."${tableName}" ${whereClause} ORDER BY "dup_cus_id", "dup_trans", "dup_gs_id" LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            recordsParams.push(lim, off);
        }

        // Execute queries
        const countResult = await pool.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        const recordsResult = await pool.query(recordsQuery, recordsParams);
        
        // Add a unique identifier for each row (combination of key fields)
        const recordsWithId = recordsResult.rows.map((row, index) => ({
            ...row,
            _row_id: `${row.dup_cus_id}_${row.dup_trans}_${row.dup_gs_id}_${row.dup_env}`
        }));
        
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

// Add a new record to Duplicate_SNFs table
app.post("/Tables/:tableName/Records", async(req, res) => {
    try {
        const { tableName } = req.params;
        
        // Validate table name
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        // For security, only allow access to the Duplicate_SNFs table
        if (tableName !== 'Duplicate_SNFs') {
            return res.status(403).json({ error: 'Access denied to this table' });
        }

        const recordData = req.body;
        
        // Define the columns for this table
        const validColumns = ['dup_cus_id', 'dup_trans', 'dup_gs_id', 'dup_isnd_id', 'dup_env'];
        const insertColumns = validColumns.filter(col => recordData.hasOwnProperty(col) && recordData[col] !== '');
        
        if (insertColumns.length === 0) {
            return res.status(400).json({ error: 'No valid columns provided for insert' });
        }

        // Check if record already exists (prevent duplicates)
        const existsQuery = `
            SELECT 1 FROM public."${tableName}" 
            WHERE "dup_cus_id" = $1 AND "dup_trans" = $2 AND "dup_gs_id" = $3
        `;
        const existsResult = await pool.query(existsQuery, [
            recordData.dup_cus_id || null,
            recordData.dup_trans || null,
            recordData.dup_gs_id || null
        ]);

        if (existsResult.rowCount > 0) {
            return res.status(400).json({ error: 'A record with this combination already exists' });
        }

        const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
        const values = insertColumns.map(col => recordData[col] || null);
        
        const insertQuery = `
            INSERT INTO public."${tableName}" (${insertColumns.map(col => `"${col}"`).join(', ')})
            VALUES (${placeholders})
            RETURNING *
        `;

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

// Update a specific record in Duplicate_SNFs table
app.put("/Tables/:tableName/Records/:rowId", async(req, res) => {
    try {
        const { tableName, rowId } = req.params;
        
        // Validate table name
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        // For security, only allow access to the Duplicate_SNFs table
        if (tableName !== 'Duplicate_SNFs') {
            return res.status(403).json({ error: 'Access denied to this table' });
        }

        // Parse the composite row ID
        const idParts = rowId.split('_');
        if (idParts.length !== 5) {
            return res.status(400).json({ error: 'Invalid row ID format' });
        }

        const [originalCusId, originalTrans, originalGS, originalEnv] = idParts;
        const recordData = req.body;
        
        // Define valid columns
        const validColumns = ['dup_cus_id', 'dup_trans', 'dup_gs_id', 'dup_env'];
        const updateColumns = validColumns.filter(col => recordData.hasOwnProperty(col));
        
        if (updateColumns.length === 0) {
            return res.status(400).json({ error: 'No valid columns provided for update' });
        }

        const setClause = updateColumns.map((col, index) => `"${col}" = $${index + 1}`).join(', ');
        const values = updateColumns.map(col => recordData[col] || null);
        
        // Add original values for WHERE clause
        values.push(originalCusId === 'null' ? null : originalCusId);
        values.push(originalTrans === 'null' ? null : originalTrans);
        values.push(originalGS === 'null' ? null : originalGS);
        values.push(originalEnv === 'null' ? null : originalEnv);

        const updateQuery = `
            UPDATE public."${tableName}" 
            SET ${setClause}
            WHERE ("dup_cus_id" = $${values.length - 4} OR ("dup_cus_id" IS NULL AND $${values.length - 4} IS NULL))
              AND ("dup_trans" = $${values.length - 3} OR ("dup_trans" IS NULL AND $${values.length - 3} IS NULL))
              AND ("dup_gs_id" = $${values.length - 2} OR ("dup_gs_id" IS NULL AND $${values.length - 2} IS NULL))
              AND ("dup_env" = $${values.length} OR ("dup_env" IS NULL AND $${values.length} IS NULL))
            RETURNING *
        `;

        const result = await pool.query(updateQuery, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        res.json({
            message: 'Record updated successfully',
            record: result.rows[0]
        });
    } catch (err) {
        console.error('Error updating record:', err.message);
        res.status(500).json({ error: 'Failed to update record' });
    }
});

// Delete a specific record from Duplicate_SNFs table
app.delete("/Tables/:tableName/Records/:rowId", async(req, res) => {
    try {
        const { tableName, rowId } = req.params;
        
        // Validate table name
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        // For security, only allow access to the Duplicate_SNFs table
        if (tableName !== 'Duplicate_SNFs') {
            return res.status(403).json({ error: 'Access denied to this table' });
        }

        // Parse the composite row ID
        const idParts = rowId.split('_');
        if (idParts.length !== 5) {
            return res.status(400).json({ error: 'Invalid row ID format' });
        }

        const [cusId, trans, isaQual, isndId, env] = idParts;

        const deleteQuery = `
            DELETE FROM public."${tableName}" 
            WHERE ("dup_cus_id" = $1 OR ("dup_cus_id" IS NULL AND $1 IS NULL))
              AND ("dup_trans" = $2 OR ("dup_trans" IS NULL AND $2 IS NULL))
              AND ("dup_gs_id" = $3 OR ("dup_gs_id" IS NULL AND $3 IS NULL))
              AND ("dup_env" = $5 OR ("dup_env" IS NULL AND $5 IS NULL))
            RETURNING *
        `;

        const values = [
            cusId === 'null' ? null : cusId,
            trans === 'null' ? null : trans,
            isaQual === 'null' ? null : isaQual,
            isndId === 'null' ? null : isndId,
            env === 'null' ? null : env
        ];

        const deleteResult = await pool.query(deleteQuery, values);

        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        res.json({ 
            message: 'Record deleted successfully',
            deletedRecord: deleteResult.rows[0]
        });
    } catch (err) {
        console.error('Error deleting record:', err.message);
        res.status(500).json({ error: 'Failed to delete record' });
    }
});

module.exports = app;
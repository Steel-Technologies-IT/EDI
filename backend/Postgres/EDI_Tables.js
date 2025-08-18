const express = require("express");
const app = express.Router();
const pool = require("../db2");

// Get all user table names in the current schema
app.get("/Tables", async(req, res) => {
    try {
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
              AND table_name ~ '^[0-9]'
            ORDER BY table_name
        `);
        res.json({ tables: tables.rows.map(row => row.table_name) });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch table names' });
    }
});

// Get all records from a specific table
app.get("/Tables/:tableName/Records", async(req, res) => {
    try {
        const { tableName } = req.params;
    const { limit = 100, offset = 0, searchColumn = '', searchTerm = '' } = req.query;
        
        // Validate table name to prevent SQL injection (only allow alphanumeric and underscores)
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        // Optional: validate search column if provided, and ensure it belongs to the table
        let safeSearchColumn = '';
        let hasFilter = false;
        if (searchColumn && searchTerm && searchTerm.toString().trim() !== '') {
            if (!/^[a-zA-Z0-9_]+$/.test(searchColumn)) {
                return res.status(400).json({ error: 'Invalid column name' });
            }
            const colCheck = await pool.query(`
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
            `, [tableName, searchColumn]);
            if (colCheck.rowCount === 0) {
                return res.status(400).json({ error: 'Column does not exist on table' });
            }
            safeSearchColumn = searchColumn; // validated
            hasFilter = true;
        }
        
    // Support limit=all to return all records
    const limitStr = String(limit).toLowerCase();
    const lim = limitStr === 'all' ? null : Math.max(1, parseInt(limit));
        const off = Math.max(0, parseInt(offset));

        // Build queries
        let countQuery;
        let countParams = [];
        let recordsQuery;
        let recordsParams = [];

        if (hasFilter) {
            // Use CAST to text for generic search across types, and ILIKE for case-insensitive contains
            countQuery = `SELECT COUNT(*) as total FROM public."${tableName}" WHERE CAST("${safeSearchColumn}" AS TEXT) ILIKE $1`;
            countParams = [`%${searchTerm}%`];

            if (lim === null) {
                // No LIMIT/OFFSET when returning all
                recordsQuery = `SELECT * FROM public."${tableName}" WHERE CAST("${safeSearchColumn}" AS TEXT) ILIKE $1`;
                recordsParams = [`%${searchTerm}%`];
            } else {
                recordsQuery = `SELECT * FROM public."${tableName}" WHERE CAST("${safeSearchColumn}" AS TEXT) ILIKE $1 LIMIT $2 OFFSET $3`;
                recordsParams = [`%${searchTerm}%`, lim, off];
            }
        } else {
            countQuery = `SELECT COUNT(*) as total FROM public."${tableName}"`;
            if (lim === null) {
                recordsQuery = `SELECT * FROM public."${tableName}"`;
                recordsParams = [];
            } else {
                recordsQuery = `SELECT * FROM public."${tableName}" LIMIT $1 OFFSET $2`;
                recordsParams = [lim, off];
            }
        }

        // Execute queries
        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        const recordsResult = await pool.query(recordsQuery, recordsParams);
        
        res.json({ 
            records: recordsResult.rows,
            total: total,
            // If limit=all, echo back total as limit so clients can treat it as "all rows loaded"
            limit: lim === null ? total : lim,
            offset: lim === null ? 0 : off,
            hasMore: lim === null ? false : ((off + lim) < total)
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch table records' });
    }
});

// Get column information for a specific table
app.get("/Tables/:tableName/Columns", async(req, res) => {
    try {
        const { tableName } = req.params;
        
        // Validate table name
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }
        
        const columnsQuery = `
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default,
                ordinal_position
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
        `;
        const columnsResult = await pool.query(columnsQuery, [tableName]);
        
        res.json({ columns: columnsResult.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch table columns' });
    }
});

module.exports = app;
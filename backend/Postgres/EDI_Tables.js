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
              AND table_name ~ '^[0-9]
            ORDER BY table_name
        `);
        res.json({ tables: tables.rows.map(row => row.table_name) });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch table names' });
    }
});





module.exports = app;
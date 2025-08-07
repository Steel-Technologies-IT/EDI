const express = require("express");
const app = express.Router();
const pool = require("../db2");

//Post New Translation Rule
app.post("/Path/:name", async(req, res) => {
    try {
        
        const { name } = req.params
        const { path_role } = req.body;
        
        const AddRole = await pool.query("UPDATE pathaccess SET path_roles = array_append(path_roles, $2) WHERE path_name = $1", [name, path_role])

        res.json("Role Added")
    } catch (err) {
        console.error(err.message)
    }
})


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


// Get all column names for a given table
app.get("/Tables/:table/Fields", async(req, res) => {
    try {
        const { table } = req.params;
        const fields = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
        `, [table]);
        res.json({ fields: fields.rows.map(row => row.column_name) });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch field names' });
    }
});


// Get translation rules for a given table and field
app.get("/Rules", async (req, res) => {
    try {
        const { table, field } = req.query;
        if (!table || !field) {
            return res.status(400).json({ error: 'Missing table or field parameter' });
        }
        const rules = await pool.query(
            `SELECT trns_seq, trns_strt_dte, trns_end_dte, trns_output_value, trns_output_type
             FROM translations
             WHERE trns_trns_tbl = $1 AND trns_trns_fld = $2
             ORDER BY trns_seq`,
            [table, field]
        );
        res.json({ rules: rules.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch translation rules' });
    }
});

module.exports = app;
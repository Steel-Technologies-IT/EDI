const express = require("express");
const app = express.Router();
const pool = require("../db2");

//Post New Translation Rule
app.post("/NewRule", async(req, res) => {
    try {
        // Destructure all expected fields from req.body
        let {
            trns_trns_tbl,
            trns_trns_fld,
            trns_end_dte,
            trns_seq,
            trns_strt_dte,
            trns_source_comp,
            trns_operatione,
            trns_value,
            trns_output_value,
            trns_output_type,
            trns_crt_dte,
            trns_crt_tme
        } = req.body;

        // Convert start and end date to 8-digit character strings (YYYYMMDD)
        const to8Digit = d => {
            if (!d) return '';
            if (typeof d === 'string' && d.length === 8 && /^\d{8}$/.test(d)) return d;
            // Accept ISO date string (YYYY-MM-DD)
            if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
                return d.replace(/-/g, '');
            }
            // Accept Date object
            try {
                const date = new Date(d);
                if (!isNaN(date)) {
                    const y = date.getFullYear();
                    const m = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    return `${y}${m}${day}`;
                }
            } catch {}
            return d;
        };
        trns_strt_dte = to8Digit(trns_strt_dte);
        trns_end_dte = to8Digit(trns_end_dte);

        const AddRule = await pool.query(`
            INSERT INTO public."EDI_translations"(
                trns_trns_tbl, trns_trns_fld, trns_end_dte, trns_seq, trns_strt_dte, trns_source_comp, trns_operatione, trns_value, trns_output_value, trns_output_type, trns_crt_dte, trns_crt_usr, trns_crt_tme, trns_crt_pgm, trns_upd_dte, trns_upd_usr, trns_upd_tme, trns_upd_pgm
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, $12, NULL, NULL, NULL, NULL, NULL
            )
        `, [
            trns_trns_tbl,
            trns_trns_fld,
            trns_end_dte,
            trns_seq,
            trns_strt_dte,
            trns_source_comp,
            trns_operatione,
            trns_value,
            trns_output_value,
            trns_output_type,
            trns_crt_dte,
            trns_crt_tme
        ]);

        res.json({ message: "Rule Added" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to add rule' });
    }
})

//Update/Edit Translation Rule
app.put("/UpdateRule", async(req, res) => {
    try {
        // Destructure all expected fields from req.body
        let {
            trns_trns_tbl,
            trns_trns_fld,
            trns_end_dte,
            trns_seq,
            trns_strt_dte,
            trns_source_comp,
            trns_operatione,
            trns_value,
            trns_output_value,
            trns_output_type,
            trns_crt_dte,
            trns_crt_tme,
            original_seq, // Used to identify which rule to update
            original_trns_trns_tbl,
            original_trns_trns_fld,
            original_end_dte
        } = req.body;

        // Convert start and end date to 8-digit character strings (YYYYMMDD)
        const to8Digit = d => {
            if (!d) return '';
            if (typeof d === 'string' && d.length === 8 && /^\d{8}$/.test(d)) return d;
            // Accept ISO date string (YYYY-MM-DD)
            if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
                return d.replace(/-/g, '');
            }
            // Accept Date object
            try {
                const date = new Date(d);
                if (!isNaN(date)) {
                    const y = date.getFullYear();
                    const m = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    return `${y}${m}${day}`;
                }
            } catch {}
            return d;
        };
        trns_strt_dte = to8Digit(trns_strt_dte);
        trns_end_dte = to8Digit(trns_end_dte);
        const orig_end = to8Digit(original_end_dte);

        // Fallbacks: if original key parts not provided, use current
        const orig_tbl = original_trns_trns_tbl || trns_trns_tbl;
        const orig_fld = original_trns_trns_fld || trns_trns_fld;
        const orig_seq = original_seq || trns_seq;

        // Set update audit fields automatically
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const upd_dte = now.getFullYear().toString() + pad(now.getMonth() + 1) + pad(now.getDate());
        const upd_tme = pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());

        const UpdateRule = await pool.query(`
            UPDATE public."EDI_translations" 
            SET 
                trns_trns_tbl = $1,
                trns_trns_fld = $2,
                trns_end_dte = $3,
                trns_seq = $4,
                trns_strt_dte = $5,
                trns_source_comp = $6,
                trns_operatione = $7,
                trns_value = $8,
                trns_output_value = $9,
                trns_output_type = $10,
                trns_upd_dte = $11,
                trns_upd_tme = $12
            WHERE trns_trns_tbl = $13
              AND trns_trns_fld = $14
              AND trns_end_dte = $15
              AND trns_seq = $16
        `, [
            trns_trns_tbl,
            trns_trns_fld,
            trns_end_dte,
            trns_seq,
            trns_strt_dte,
            trns_source_comp,
            trns_operatione,
            trns_value,
            trns_output_value,
            trns_output_type,
            upd_dte,
            upd_tme,
            orig_tbl,
            orig_fld,
            orig_end,
            orig_seq
        ]);

        if (UpdateRule.rowCount === 0) {
            return res.status(404).json({ error: 'Rule not found or no changes made' });
        }

        res.json({ message: "Rule Updated" });
    } catch (err) {
        if (err && err.code === '23505') { // unique_violation
            return res.status(409).json({ error: 'A rule with this table/field/end date/sequence already exists.' });
        }
        console.error('UpdateRule error:', err);
        res.status(500).json({ error: 'Failed to update rule' });
    }
})

//Delete Translation Rule
app.delete("/DeleteRule", async(req, res) => {
    try {
        const { table, field, seq } = req.query;
        
        // Validate required parameters
        if (!table || !field || !seq) {
            return res.status(400).json({ error: 'Missing required parameters: table, field, and seq' });
        }

        const DeleteRule = await pool.query(`
            DELETE FROM public."EDI_translations" 
            WHERE trns_trns_tbl = $1 AND trns_trns_fld = $2 AND trns_seq = $3
        `, [table, field, seq]);

        if (DeleteRule.rowCount === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        res.json({ message: "Rule Deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to delete rule' });
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
              AND table_name ~ '^[0-9].*_SNF_'
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
        if (!table) {
            return res.status(400).json({ error: 'Missing table parameter' });
        }
        let query = `
            SELECT trns_seq, trns_trns_fld, trns_strt_dte, trns_end_dte, trns_source_comp, trns_operatione, trns_value, trns_output_value, trns_output_type
            FROM public."EDI_translations"
            WHERE trns_trns_tbl = $1
        `;
        const params = [table];
        if (field && field.trim() !== "") {
            query += " AND trns_trns_fld = $2";
            params.push(field);
        }
        query += " ORDER BY trns_seq";
        const rules = await pool.query(query, params);
        res.json({ rules: rules.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch translation rules' });
    }
});


// Get ALL translation rules (optionally filtered by table and/or field, with optional pagination)
app.get("/AllRules", async (req, res) => {
    try {
        const { table, field, limit, offset } = req.query;
        const params = [];
        let idx = 1;
        let sql = `
            SELECT 
                trns_trns_tbl, trns_trns_fld, trns_strt_dte, trns_end_dte, trns_seq,
                trns_source_comp, trns_operatione, trns_value, trns_output_value, trns_output_type
            FROM public."EDI_translations"
            WHERE 1=1
        `;
        if (table && table.trim() !== "") {
            sql += ` AND trns_trns_tbl = $${idx++}`;
            params.push(table.trim());
        }
        if (field && field.trim() !== "") {
            sql += ` AND trns_trns_fld = $${idx++}`;
            params.push(field.trim());
        }
        sql += ` ORDER BY trns_trns_tbl, trns_trns_fld, trns_seq`;

        // Optional pagination
        const lim = Number.isFinite(parseInt(limit)) ? Math.max(1, parseInt(limit)) : null;
        const off = Number.isFinite(parseInt(offset)) ? Math.max(0, parseInt(offset)) : null;
        if (lim !== null) {
            sql += ` LIMIT $${idx++}`;
            params.push(lim);
        }
        if (off !== null) {
            sql += ` OFFSET $${idx++}`;
            params.push(off);
        }

        const result = await pool.query(sql, params);
        res.json({ rules: result.rows });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch all translation rules' });
    }
});

// Bulk update sequence for rules (table, field, seq, endDate as PK)
app.put("/UpdateSequences", async (req, res) => {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Step 1: Assign temporary negative sequence numbers to avoid PK conflicts
        for (let i = 0; i < updates.length; i++) {
            const upd = updates[i];
            const { table, field, seq, endDate, oldSeq } = upd;
            if (Number(seq) !== Number(oldSeq)) {
                if (!table || !field || !endDate || typeof seq !== 'number') {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'Missing required fields in update' });
                }
                const tempSeq = -1000 - i; // Unique negative temp value
                const pkSeq =  oldSeq;
                const tempResult = await client.query(
                    `UPDATE public."EDI_translations"
                     SET trns_seq = $1
                     WHERE trns_trns_tbl = $2 AND trns_trns_fld = $3 AND trns_end_dte = $4 AND trns_seq = $5`,
                    [tempSeq, table, field, endDate, pkSeq]
                );
                if (tempResult.rowCount === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ error: `Rule not found for table ${table}, field ${field}, seq ${pkSeq}, endDate ${endDate} (temp step)` });
                }
                // Store tempSeq for next step
                upd._tempSeq = tempSeq;
                upd.seq = seq; // Ensure seq is a number
            }
        }

        // Step 2: Assign final sequence numbers
        for (const upd of updates) {
            const { table, field, seq, endDate, oldSeq, _tempSeq } = upd;
            if (Number(seq) !== Number(oldSeq)) {
                const fromSeq =  _tempSeq;
                const finalResult = await client.query(
                    `UPDATE public."EDI_translations"
                     SET trns_seq = $1
                     WHERE trns_trns_tbl = $2 AND trns_trns_fld = $3 AND trns_end_dte = $4 AND trns_seq = $5`,
                    [seq, table, field, endDate, fromSeq]
                );
                if (finalResult.rowCount === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ error: `Rule not found for table ${table}, field ${field}, seq ${fromSeq}, endDate ${endDate} (final step)` });
                }
            }
        }
        console.log('Bulk sequence update successful');
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Bulk sequence update error:', err);
        res.status(500).json({ error: 'Failed to update sequences' });
    } finally {
        client.release();
    }
});


module.exports = app;
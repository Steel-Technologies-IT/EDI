const express = require("express");
const app = express.Router();
const pool = require("../db2");

//Post New Translation Rule
app.post("/NewRule", async(req, res) => {
    try {
        let {
            trns_trns_tbl,
            trns_trns_fld,
            trns_seq,
            trns_source_comp,
            trns_operatione,
            trns_value,
            trns_output_value,
            trns_output_type,
            trns_crt_dte,
            trns_crt_tme,
            trns_current_user
        } = req.body;

        // Generate current date and time for update fields
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const upd_dte = now.getFullYear().toString() + pad(now.getMonth() + 1) + pad(now.getDate());
        const upd_tme = pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());

        await pool.query(`
            INSERT INTO public."EDI_translations"(
                trns_trns_tbl, trns_trns_fld, trns_seq, trns_source_comp, trns_operatione, trns_value, trns_output_value, trns_output_type, trns_crt_dte, trns_crt_usr, trns_crt_tme, trns_crt_pgm, trns_upd_dte, trns_upd_usr, trns_upd_tme, trns_upd_pgm
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $11, $10, NULL, $12, NULL, $13, NULL
            )
        `, [
            trns_trns_tbl,
            trns_trns_fld,
            trns_seq,
            trns_source_comp,
            trns_operatione,
            trns_value,
            trns_output_value,
            trns_output_type,
            trns_crt_dte,
            trns_crt_tme,
            trns_current_user,
            upd_dte,
            upd_tme
        ]);

        res.json({ message: "Rule Added" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to add rule' });
    }
})

// Add these endpoints to your backend API

// Check for existing inbound rule
app.get('/CheckRule', async (req, res) => {
    try {
        const { table, field, seq } = req.query;
        
        if (!table || !field || !seq) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const query = `
            SELECT COUNT(*) as count 
            FROM public."EDI_translations" 
            WHERE trns_trns_tbl = $1 
            AND trns_trns_fld = $2 
            AND trns_seq = $3
        `;
        
        const result = await pool.query(query, [table, field, seq]);
        const exists = parseInt(result.rows[0].count) > 0;
        
        res.json({ exists });
    } catch (error) {
        console.error('Error checking for existing rule:', error);
        res.status(500).json({ error: 'Failed to check for existing rule' });
    }
});

// Check for existing outbound rule
app.get('/CheckRuleOutbound', async (req, res) => {
    try {
        const { table, field, seq, cust_no } = req.query;
        
        if (!table || !field || !seq || !cust_no) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const query = `
            SELECT COUNT(*) as count 
            FROM public."EDI_Outbound_Translations" 
            WHERE trns_trns_tbl = $1 
            AND trns_trns_fld = $2 
            AND trns_seq = $3 
            AND trns_cust_no = $4
        `;
        
        const result = await pool.query(query, [table, field, seq, cust_no]);
        const exists = parseInt(result.rows[0].count) > 0;
        
        res.json({ exists });
    } catch (error) {
        console.error('Error checking for existing outbound rule:', error);
        res.status(500).json({ error: 'Failed to check for existing outbound rule' });
    }
});


//Update/Edit Translation Rule
app.put("/UpdateRule", async(req, res) => {
    try {
        // Destructure all expected fields from req.body
        let {
            trns_trns_tbl,
            trns_trns_fld,
            trns_seq,
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
            trns_current_user
        } = req.body;

        // REMOVE to8Digit and date conversion logic for trns_strt_dte and trns_end_dte

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
                trns_seq = $3,
                trns_source_comp = $4,
                trns_operatione = $5,
                trns_value = $6,
                trns_output_value = $7,
                trns_output_type = $8,
                trns_upd_dte = $9,
                trns_upd_tme = $10,
                trns_upd_usr = $11
            WHERE trns_trns_tbl = $12
              AND trns_trns_fld = $13
              AND trns_seq = $14
        `, [
            trns_trns_tbl,
            trns_trns_fld,
            trns_seq,
            trns_source_comp,
            trns_operatione,
            trns_value,
            trns_output_value,
            trns_output_type,
            upd_dte,
            upd_tme,
            trns_current_user,
            orig_tbl,
            orig_fld,
            orig_seq
        ]);

        if (UpdateRule.rowCount === 0) {
            return res.status(404).json({ error: 'Rule not found or no changes made' });
        }

        res.json({ message: "Rule Updated" });
    } catch (err) {
        if (err && err.code === '23505') { // unique_violation
            return res.status(409).json({ error: 'A rule with this table/field/sequence already exists.' });
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

// Get all user table names in the current schema
app.get("/InvexTables", async(req, res) => {
    try {
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
              AND table_name ~ '^[0-9].*_Invex_'
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
            SELECT trns_seq, trns_trns_fld, trns_source_comp, trns_operatione, trns_value, trns_output_value, trns_output_type
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
                trns_trns_tbl, trns_trns_fld, trns_seq,
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

// Bulk update sequence for rules (table, field, seq as PK)
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
            const { table, field, seq, oldSeq } = upd;
            if (Number(seq) !== Number(oldSeq)) {
                if (!table || !field || typeof seq !== 'number') {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'Missing required fields in update' });
                }
                const tempSeq = -1000 - i; // Unique negative temp value
                const pkSeq =  oldSeq;
                const tempResult = await client.query(
                    `UPDATE public."EDI_translations"
                     SET trns_seq = $1
                     WHERE trns_trns_tbl = $2 AND trns_trns_fld = $3 AND trns_seq = $4`,
                    [tempSeq, table, field, pkSeq]
                );
                if (tempResult.rowCount === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ error: `Rule not found for table ${table}, field ${field}, seq ${pkSeq} (temp step)` });
                }
                // Store tempSeq for next step
                upd._tempSeq = tempSeq;
                upd.seq = seq; // Ensure seq is a number
            }
        }

        // Step 2: Assign final sequence numbers
        for (const upd of updates) {
            const { table, field, seq, oldSeq, _tempSeq } = upd;
            if (Number(seq) !== Number(oldSeq)) {
                const fromSeq =  _tempSeq;
                const finalResult = await client.query(
                    `UPDATE public."EDI_translations"
                     SET trns_seq = $1
                     WHERE trns_trns_tbl = $2 AND trns_trns_fld = $3 AND trns_seq = $4`,
                    [seq, table, field, fromSeq]
                );
                if (finalResult.rowCount === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ error: `Rule not found for table ${table}, field ${field}, seq ${fromSeq} (final step)` });
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


// Outbound Translation: get rules for a table/field (optionally filter by customerNo)
app.get('/RulesOutbound', async (req, res) => {
  try {
        const { table, field } = req.query;
        if (!table) {
            return res.status(400).json({ error: 'Missing table parameter' });
        }
        let query = `
            SELECT trns_seq, trns_trns_fld, trns_cust_no, trns_source_comp, trns_operatione, trns_value, trns_output_value, trns_output_type
            FROM public."EDI_Outbound_Translations"
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

// Outbound Translation: insert new rule (mimic inbound insert pattern)
app.post('/NewRuleOutbound', async (req, res) => {
  try {
    const {
      trns_trns_tbl,
      trns_trns_fld,
      trns_seq,
      trns_cust_no,
      trns_source_comp,
      trns_operatione,
      trns_value,
      trns_output_value,
      trns_output_type,
      trns_crt_dte,
      trns_crt_tme
    } = req.body;

    // Generate current date and time for update fields
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const upd_dte = now.getFullYear().toString() + pad(now.getMonth() + 1) + pad(now.getDate());
    const upd_tme = pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());

    const sql = `
      INSERT INTO public."EDI_Outbound_Translations"(
        trns_trns_tbl, trns_trns_fld, trns_seq, trns_cust_no,
        trns_source_comp, trns_operatione, trns_value,
        trns_output_value, trns_output_type,
        trns_crt_dte, trns_crt_usr, trns_crt_tme, trns_crt_pgm,
        trns_upd_dte, trns_upd_usr, trns_upd_tme, trns_upd_pgm
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9,
        $10, NULL, $11, NULL,
        $12, NULL, $13, NULL
      )
    `;
    await pool.query(sql, [
      trns_trns_tbl,
      trns_trns_fld,
      trns_seq,
      trns_cust_no,    
      trns_source_comp,
      trns_operatione,
      trns_value,
      trns_output_value,
      trns_output_type,
      trns_crt_dte,
      trns_crt_tme,
      upd_dte,
      upd_tme
    ]);

    res.json({ message: 'Rule Added' });
  } catch (err) {
    console.error('POST /TranslationTable/NewRuleOutbound error:', err);
    res.status(500).json({ error: 'Failed to add rule' });
  }
});

// Outbound Translation: update existing rule (mimic inbound update pattern)
app.put('/UpdateRuleOutbound', async (req, res) => {
  try {
    const {
      trns_trns_tbl,
      trns_trns_fld,
      trns_seq,
      trns_cust_no,     // incoming field name
      trns_source_comp,
      trns_operatione,
      trns_value,
      trns_output_value,
      trns_output_type,
      // original identifiers
      original_trns_trns_tbl,
      original_trns_trns_fld,
      original_seq,
      original_customer_no
    } = req.body;

    if (!trns_trns_tbl || !trns_trns_fld || !trns_seq || !trns_cust_no) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Set update audit fields
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const upd_dte = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const upd_tme = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    // Fallbacks: if original key parts not provided, use current
    const orig_tbl = original_trns_trns_tbl || trns_trns_tbl;
    const orig_fld = original_trns_trns_fld || trns_trns_fld;
    const orig_seq = original_seq || trns_seq;
    const orig_cus = original_customer_no || trns_cust_no;

    const sql = `
      UPDATE public."EDI_Outbound_Translations"
      SET
        trns_trns_tbl = $1,
        trns_trns_fld = $2,
        trns_seq = $3,
        trns_cust_no = $4,
        trns_source_comp = $5,
        trns_operatione = $6,
        trns_value = $7,
        trns_output_value = $8,
        trns_output_type = $9,
        trns_upd_dte = $10,
        trns_upd_tme = $11
      WHERE trns_trns_tbl = $12
        AND trns_trns_fld = $13
        AND trns_seq = $14
        AND trns_cust_no = $15
    `;
    const result = await pool.query(sql, [
      trns_trns_tbl,
      trns_trns_fld,
      trns_seq,
      trns_cust_no,
      trns_source_comp,
      trns_operatione,
      trns_value,
      trns_output_value,
      trns_output_type,
      upd_dte,
      upd_tme,
      orig_tbl,
      orig_fld,
      orig_seq,
      orig_cus
    ]);

    if (result.rowCount === 0) return res.status(404).json({ error: 'Rule not found or no changes made' });
    res.json({ message: 'Rule Updated' });
  } catch (err) {
    console.error('PUT /TranslationTable/UpdateRuleOutbound error:', err);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// Optional: delete outbound rule (mimic inbound delete)
app.delete('/DeleteRuleOutbound', async (req, res) => {
  try {
    const { table, field, seq, customerNo } = req.query;
    if (!table || !field || !seq || !customerNo) {
      return res.status(400).json({ error: 'Missing required parameters: table, field, seq, customerNo' });
    }
    const result = await pool.query(`
      DELETE FROM public."EDI_Outbound_Translations"
      WHERE trns_trns_tbl = $1 AND trns_trns_fld = $2 AND trns_seq = $3 AND trns_cust_no = $4
    `, [table, field, seq, customerNo]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json({ message: 'Rule Deleted' });
  } catch (err) {
    console.error('DELETE /TranslationTable/DeleteRuleOutbound error:', err);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// Outbound: distinct tables
app.get('/TablesOutbound', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT trns_trns_tbl AS table
      FROM public."EDI_Outbound_Translations"
      ORDER BY 1
    `);
    res.json({ tables: rows.map(r => r.table) });
  } catch (err) {
    console.error('GET /TranslationTable/TablesOutbound error:', err);
    res.status(500).json({ error: 'Failed to fetch outbound tables', detail: err.message });
  }
});

// Outbound: distinct fields for a table
app.get('/TablesOutbound/:table/Fields', async (req, res) => {
  try {
    const { table } = req.params;
    const { rows } = await pool.query(`
      SELECT DISTINCT trns_trns_fld AS field
      FROM public."EDI_Outbound_Translations"
      WHERE trns_trns_tbl = $1
      ORDER BY 1
    `, [table]);
    res.json({ fields: rows.map(r => r.field) });
  } catch (err) {
    console.error('GET /TranslationTable/TablesOutbound/:table/Fields error:', err);
    res.status(500).json({ error: 'Failed to fetch outbound fields', detail: err.message });
  }
});

// Outbound: get all rules (optional filters)
app.get('/AllRulesOutbound', async (req, res) => {
  try {
    const { table, field, customerNo, limit } = req.query;
    const params = [];
    const where = [];
    if (table) { params.push(table); where.push(`trns_trns_tbl = $${params.length}`); }
    if (field) { params.push(field); where.push(`trns_trns_fld = $${params.length}`); }
    if (customerNo) { params.push(customerNo); where.push(`trns_cust_no = $${params.length}`); }

    const lim = Math.min(Math.max(parseInt(limit || '0', 10) || 0, 0), 10000); // cap at 10k
    const sql = `
      SELECT trns_trns_tbl, trns_trns_fld, trns_seq, trns_cust_no, trns_cust_no,
             trns_source_comp, trns_operatione, trns_value,
             trns_output_value, trns_output_type,
             trns_crt_dte, trns_crt_tme, trns_upd_dte, trns_upd_tme
      FROM public."EDI_Outbound_Translations"
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY trns_trns_tbl, trns_trns_fld, trns_seq
      ${lim ? `LIMIT ${lim}` : ''}
    `;
    const { rows } = await pool.query(sql, params);
    res.json({ rules: rows });
  } catch (err) {
    console.error('GET /TranslationTable/AllRulesOutbound error:', err);
    res.status(500).json({ error: 'Failed to fetch outbound rules', detail: err.message });
  }
});



module.exports = app;
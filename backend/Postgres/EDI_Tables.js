const express = require("express");
const app = express.Router();
const pool = require("../db2");
const { translations, transformMap, outboundtranslations, createSNF } = require('../transactions/registry.js');
const { writeStructuredJSON } = require('../writeJSON');
const { writeSNFFile } = require('../writeSNF');
const path = require('path');
const fs = require('fs');
const transformO856 = require('../transactions/856/O856_transform.js');
const SNFCreateO856 = require('../transactions/856/O856_SNF_crt.js');



// MARK: 5. Transform to Output Tables
async function resendtrans (key, fieldtransaction) {
    try {
        // Clean up existing records for this key in all 856_* tables
        const tablesQuery = `
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public' AND tablename LIKE '${fieldtransaction}_Invex_%'
        `;
        
        const tablesResult = await pool.query(tablesQuery);
        
        for (const table of tablesResult.rows) {
            const tableName = table.tablename;
            
            // Find a column ending in '_key'
            const columnQuery = `
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = $1
                  AND column_name LIKE '%\\_key' ESCAPE '\\'
                LIMIT 1
            `;
            
            const columnResult = await pool.query(columnQuery, [tableName]);
            
            if (columnResult.rows.length > 0) {
                const columnName = columnResult.rows[0].column_name;
                
                // Check if the key exists in that column
                const existsQuery = `SELECT EXISTS (SELECT 1 FROM public."${tableName}" WHERE "${columnName}" = $1)`;
                const existsResult = await pool.query(existsQuery, [key]);
                
                if (existsResult.rows[0].exists) {
                    // Delete rows that match the condition
                    const deleteQuery = `DELETE FROM public."${tableName}" WHERE "${columnName}" = $1`;
                    await pool.query(deleteQuery, [key]);
                    console.log(`Cleaned up records for key ${key} from table ${tableName}`);
                }
            }
        }
    } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
        // Continue with the function even if cleanup fails
    }

    // Original resendtrans logic continues here
    const code = String(fieldtransaction || '')
        .replace(/^I/i, '')
        .slice(0,3);
    const translationFunction = translations[code];
    
    if (translationFunction) {
        await translationFunction(pool, key, 'I');
    } else {
        console.error('-', key, '-\n', `No translation function found for field transaction: ${code}`,'\n-', key, '-');
        return;
    }
    
    // MARK: 6. Create JSON from Output Tables
    // Transform to structured JSON
    const invex_json = transformMap[code];
    if (!invex_json) {
        console.error(`Unsupported field transaction: ${code}`);
        return;
    }
    const structured = await invex_json('', key);
    return structured;
}

async function resendtransOutbound (key, fieldtransaction, tradingPartner) {
   const loadNumber = await pool.query('SELECT hdr_load_nbr FROM public."856_SNF_Header" WHERE hdr_key = $1', [key]);
    try {

        
        
        // Clean up existing records for this key in all 856_* tables
        const tablesQuery = `
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public' AND tablename LIKE '${fieldtransaction}_SNF_%'
        `;
        
        const tablesResult = await pool.query(tablesQuery);
        
        for (const table of tablesResult.rows) {
            const tableName = table.tablename;
            
            // Find a column ending in '_key'
            const columnQuery = `
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = $1
                  AND column_name LIKE '%\\_key' ESCAPE '\\'
                LIMIT 1
            `;
            
            const columnResult = await pool.query(columnQuery, [tableName]);
            
            if (columnResult.rows.length > 0) {
                const columnName = columnResult.rows[0].column_name;
                
                // Check if the key exists in that column
                const existsQuery = `SELECT EXISTS (SELECT 1 FROM public."${tableName}" WHERE "${columnName}" = $1)`;
                const existsResult = await pool.query(existsQuery, [key]);
                
                if (existsResult.rows[0].exists) {
                    // Delete rows that match the condition
                    const deleteQuery = `DELETE FROM public."${tableName}" WHERE "${columnName}" = $1`;
                    await pool.query(deleteQuery, [key]);
                    console.log(`Cleaned up records for key ${key} from table ${tableName}`);
                }
            }
        }
    } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
        // Continue with the function even if cleanup fails
    }

    // Original resendtrans logic continues here
    const code = String(fieldtransaction || '')
        .replace(/^I/i, '')
        .slice(0,3);
    console.log('Resend Outbound for code:', code);
    
   let CustomerID, Branch;
    const translationFunction = outboundtranslations[code];
    if (translationFunction) {
      ({ CustomerID, Branch } = await translationFunction(pool, key, 'O', 'Transform'));
    } else {
        console.error(`No outbound translation function found for code: ${code}`);
        return { flatFileString: null, newFileName: null };
    }
    
    // MARK 4. Call SNF_Crt function to create structure SNF data 
    const SNF_Crt = createSNF[fieldtransaction];
    if (!SNF_Crt) {
        console.error(`Unsupported field transaction for SNF creation: ${fieldtransaction}`);
        return { flatFileString: null, newFileName: null };
    }
    
    const snfdata = await SNF_Crt(key, pool, CustomerID, Branch, tradingPartner, loadNumber ? loadNumber.rows[0].hdr_load_nbr : null);
    
    if (!snfdata || !Array.isArray(snfdata) || snfdata.length === 0) {
        console.error('No SNF data returned');
        return { flatFileString: null, newFileName: null };
    }
    
    // Query layout from the database
    const { rows } = await pool.query(
        "SELECT snf_code, snf_description, snf_position, snf_length, snf_type, snf_id, snf_elem_id, snf_value, snf_tad_item, snf_codes_comments FROM \"SNFdecoder\" WHERE snf_fieldtransaction = $1 ORDER BY snf_code",
        [fieldtransaction]
    );

    const layout = rows.map(row => ({
        code: row.snf_code,
        description: row.snf_description,
        position: row.snf_position,
        length: row.snf_length
    }));

    // FIX: Process the SNF data correctly and return proper values
    let newFileName = null;
    let flatFileString = null;

    // Process the first SNF data array (assuming snfdata is an array of arrays)
    if (snfdata[0] && Array.isArray(snfdata[0])) {
        const firstSnfData = snfdata[0];
        
        // Generate filename from the first record
        if (firstSnfData.length > 0 && firstSnfData[0]['GS Receiver ID'] && firstSnfData[0]['Record Key (10-digit integer)']) {
            newFileName = 'O' + fieldtransaction + '_' + firstSnfData[0]['GS Receiver ID'] + '_' + firstSnfData[0]['Record Key (10-digit integer)'];
        }
        
        // Generate flat file string
        flatFileString = firstSnfData.map(record => {
            const recordCode = record.record_code;
            
            // Find all fields for this record code, sorted by position
            const fields = layout
                .filter(f => f.code.padStart(2, '0') === recordCode)
                .sort((a, b) => a.position - b.position);

            // Build the line by placing each field at its correct position/length
            let lineArr = [];
            for (const field of fields) {
                let value = record[field.description] ?? '';
                // Pad or trim the value to the field length
                value = value.toString().padEnd(field.length, ' ').slice(0, field.length);
                // Place the value at the correct position in the line
                const start = field.position - 1;
                for (let i = 0; i < field.length; i++) {
                    lineArr[start + i] = value[i];
                }
            }
            // Fill any undefined positions with spaces
            for (let i = 0; i < lineArr.length; i++) {
                if (typeof lineArr[i] === 'undefined') lineArr[i] = ' ';
            }
            return lineArr.join('');
        }).join('\n');
    }
    
    // FIX: Always return an object with flatFileString and newFileName
    return { 
        flatFileString: flatFileString || '', 
        newFileName: newFileName || `O${fieldtransaction}_${key}_${Date.now()}` 
    };
}
app.post("/ResendTransaction", async (req, res) => {
  const { key, fieldtransaction } = req.body;
  console.log('Resend Transaction:', key, fieldtransaction);
  const result = await resendtrans(key, fieldtransaction);
  await writeStructuredJSON(result, `I${fieldtransaction}_Resend_${key}`);
  if (result) {
    res.json(result);
  } else {
    res.status(400).json({ error: "Failed to resend transaction" });
  }
});

app.post("/ResendTransactionOutbound", async (req, res) => {
    const { key, fieldtransaction, tradingPartner } = req.body;
    console.log('Resend Transaction:', key, fieldtransaction, tradingPartner);
    
    try {
        const result = await resendtransOutbound(key, fieldtransaction, tradingPartner);
        
        if (!result) {
            return res.status(400).json({ error: "Failed to resend transaction - no result returned" });
        }
        
        const { flatFileString, newFileName } = result;
        
        if (!flatFileString) {
            return res.status(400).json({ error: "Failed to generate flat file string" });
        }
        
        if (!newFileName) {
            return res.status(400).json({ error: "Failed to generate file name" });
        }
    //     const localJsonDir = path.join(__dirname, './localStructuredJSON');
    // if (!fs.existsSync(localJsonDir)) {
    //   fs.mkdirSync(localJsonDir, { recursive: true });
    // }
    // console.log(newFileName)
    // // Change file extension to .json and write properly formatted JSON
    // const localJsonPath = path.join(localJsonDir, newFileName + '.txt');
    // fs.writeFileSync(localJsonPath, flatFileString, 'utf-8');
    // console.log(`SNF written locally to: ${localJsonPath}`);
        await writeSNFFile(flatFileString, newFileName);
        res.json({ flatFileString, newFileName });
        
    } catch (error) {
        console.error('Error in ResendTransactionOutbound:', error);
        res.status(500).json({ error: `Failed to resend transaction: ${error.message}` });
    }
});


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
        const { limit = 100, offset = 0, searchColumn = '', searchTerm = '', columnFilters = '' } = req.query;

        // Validate table name to prevent SQL injection
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
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

        // Validate columns
        const allColumnsToValidate = [];
        if (searchColumn && searchTerm && searchTerm.toString().trim() !== '') {
            allColumnsToValidate.push(searchColumn);
        }
        Object.keys(parsedColumnFilters).forEach(col => allColumnsToValidate.push(col));
        if (allColumnsToValidate.length > 0) {
            const uniqueColumns = [...new Set(allColumnsToValidate)];
            for (const col of uniqueColumns) {
                if (!/^[a-zA-Z0-9_]+$/.test(col)) {
                    return res.status(400).json({ error: `Invalid column name: ${col}` });
                }
                const colCheck = await pool.query(`
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
                `, [tableName, col]);
                if (colCheck.rowCount === 0) {
                    return res.status(400).json({ error: `Column does not exist on table: ${col}` });
                }
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

        // Add column filter conditions (cleaner mapping)
        Object.entries(parsedColumnFilters).forEach(([colName, filterValue]) => {
            if (filterValue && filterValue.trim() !== '') {
                // Split by comma and create OR conditions for each value
                const values = filterValue.split(',').map(v => v.trim()).filter(Boolean);
                if (values.length > 0) {
                    const orConditions = values.map((value) => {
                        const condition = `CAST("${colName}" AS TEXT) ILIKE $${paramIndex}`;
                        queryParams.push(`%${value}%`);
                        paramIndex++;
                        return condition;
                    });
                    whereConditions.push(`(${orConditions.join(' OR ')})`);
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
            recordsQuery = `SELECT * FROM public."${tableName}" ${whereClause}`;
        } else {
            recordsQuery = `SELECT * FROM public."${tableName}" ${whereClause} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            recordsParams.push(lim, off);
        }

        // Execute queries
        const countResult = await pool.query(countQuery, queryParams);
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


app.get("/Tables/:tableName/ColumnsInfo", async(req, res) => {
    try {
        const { tableName } = req.params;
        
        // Validate table name to prevent SQL injection (only allow alphanumeric and underscores)
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
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
module.exports = app;
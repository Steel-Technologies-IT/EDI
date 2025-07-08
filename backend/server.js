// Description: This is the main server file for the backend of the SNF Decoder application.
// It sets up an Express server, handles file uploads using Multer, processes Excel and flat files,
// and provides endpoints for generating JSON and decoding SNF files.

//Import required modules
const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const cors = require('cors');
const app = express();
const port = process.env.REACT_APP_Server1_Port? process.env.REACT_APP_Server1_Port : 5000;
const fs = require('fs');
const path = require('path');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const multiUpload = upload.fields([
  { name: 'layout', maxCount: 1 },
  { name: 'flatfile', maxCount: 1 }
]);



// Import functions and modules
const { writeStructuredJSON } = require('./writeJSON.js');
//856 functions
const { transformToStructuredJSON856, getInvexRecords856 } = require('./transactions/856/856json.js');
//863 functions
const { transformToStructuredJSON863 } = require('./transactions/863/863json.js');
//861 functions
const { transformToStructuredJSON861 } = require('./transactions/861/861json.js');
//870 functions
const { transformToStructuredJSON870 } = require('./transactions/870/870json.js');
//846 functions
const { transformToStructuredJSON846 } = require('./transactions/846/846json.js');
//810 functions
const { transformToStructuredJSON810 } = require('./transactions/810/810json.js');
//830 functions
const { transformToStructuredJSON830 } = require('./transactions/830/830json.js');
//862 functions
const { transformToStructuredJSON862 } = require('./transactions/862/862json.js');
//850 functions
const { transformToStructuredJSON850 } = require('./transactions/850/850json.js');
//867 functions
const { transformToStructuredJSON867 } = require('./transactions/867/867json.js');
//824 functions
const { transformToStructuredJSON824 } = require('./transactions/824/824json.js');
//860 functions
const { transformToStructuredJSON860 } = require('./transactions/860/860json.js');
//210 functions
const { transformToStructuredJSON210 } = require('./transactions/210/210json.js');

// Database connections 
const pool = require("./db")         //Cleo Harmony DB
const pool2 = require("./db2.js");   //Postgres DB for decoder table

const transformMap = {
  '856': transformToStructuredJSON856,
  '863': transformToStructuredJSON863,
  '861': transformToStructuredJSON861,
  '870': transformToStructuredJSON870,
  '846': transformToStructuredJSON846,
  '810': transformToStructuredJSON810,
  '830': transformToStructuredJSON830,
  '862': transformToStructuredJSON862,
  '850': transformToStructuredJSON850,
  '867': transformToStructuredJSON867,
  '824': transformToStructuredJSON824,
  '860': transformToStructuredJSON860,
  '210': transformToStructuredJSON210
};

const transformInvexMap = {
  '856': getInvexRecords856
  // '863': transformToStructuredJSON863,
  // '861': transformToStructuredJSON861,
  // '870': transformToStructuredJSON870,
  // '846': transformToStructuredJSON846,
  // '810': transformToStructuredJSON810,
  // '830': transformToStructuredJSON830,
  // '862': transformToStructuredJSON862,
  // '850': transformToStructuredJSON850,
  // '867': transformToStructuredJSON867,
  // '824': transformToStructuredJSON824,
  // '860': transformToStructuredJSON860,
  // '210': transformToStructuredJSON210
};


// Middleware setup
app.use(cors());
app.use(express.json());





app.post('/upload-excel', upload.single('excel'), async (req, res) => {
  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    // Insert each row into the database
    for (const row of rows) {
      await pool2.query(
        `INSERT INTO "decoder"
        (fieldtransaction, code, description, position, length, type, id, elem_id, value, tad_item, codes_comments)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (fieldtransaction, code, position) DO NOTHING`,
        [
          row.fieldtransaction,
          row.code,
          row.description,
          row.position,
          row.length,
          row.type,
          row.id,
          row.elem_id,
          row.value,
          row.tad_item,
          row.codes_comments
        ]
      );
    }
    res.json({ message: 'Excel data inserted successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to insert Excel data' });
  }
});
















//MARK: Decode SNF
//Decodes the SNF file and returns the structured JSON to CleoHarmony
app.post('/upload', multiUpload, async (req, res) => {
  try {
    const flatFileObj = req.files['flatfile'][0];
    const flatText = flatFileObj.buffer.toString('utf-8');

// Get the first 4 characters of the flat file name (without extension)
    const baseName = flatFileObj.originalname.split('.')[0];
    const fieldtransaction = baseName.substring(1, 4);

    // Query layout from the database
    const { rows } = await pool2.query(
      "SELECT code, description, position, length, type, id, elem_id, value, tad_item, codes_comments FROM decoder WHERE fieldtransaction = $1 ORDER BY code",
      [fieldtransaction]
    );

    // Map layout fields to a more accessible format
    const layout = rows.map(row => ({
      code: row.code,
      description: row.description,
      position: row.position,
      length: row.length
    }));

    // Parse flat file
    const lines = flatText.split(/\r?\n/).filter(Boolean);
    const parsed = [];
    for (const line of lines) {
      const recordCode = line.slice(0, 2).trim();
      const fields = layout.filter(f => f.code.padStart(2, '0') === recordCode);
      const parsedLine = { record_code: recordCode };
      for (const field of fields) {
        const start = field.position - 1;
        const end = start + field.length;
        parsedLine[field.description] = line.slice(start, end).trim();
      }
      parsed.push(parsedLine);
    }

    const fn = transformMap[fieldtransaction];
    if (!fn) {
      return res.status(400).json({ error: 'Unsupported field transaction' });
    }
    const structured = await fn(parsed);

    // Send structured JSON as a downloadable file
    const jsonString = JSON.stringify(structured, null, 2);
    console.log('Structured JSON:', jsonString);
    // res.setHeader('Content-Disposition', 'attachment; filename=output.json');
    // res.setHeader('Content-Type', 'application/json');
    // res.send(jsonString);

    // --- Start Generate and write structured JSON with flat file name to CleoHarmony Directory for Invex upload ---
    // try {
    //   writeStructuredJSON(structured, flatFileObj.originalname);
    // } catch (err) {
    //   console.error('Error writing structured JSON in /upload:', err);
    // }
    // --- END Send To CleoHarmony ---

    //res.json({ parsed });

  } catch (error) {
    console.error('Parsing error:', error);
    res.status(500).json({ error: 'Failed to parse files' });
  }
});

//MARK: Get Invex JSON File
app.get('/json', async (req, res) => {
  try {
    const body = req.body;
    const fn = transformInvexMap[body.fieldTransaction];
    
    if (!fn) {
      return res.status(400).json({ error: 'Unsupported field transaction' });
    }
    const structured = await fn(body.type, body.key);

    res.status(200).json(structured);
  } catch (error ) {
    console.error('Error getting stored data:', error);
    res.status(500).json({ error: 'Failed to generate stored JSON' });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});

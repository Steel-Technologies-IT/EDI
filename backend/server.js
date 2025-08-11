// Description: This is the main server file for the backend of the SNF Decoder application.
// It sets up an Express server, handles file uploads using Multer, processes Excel and flat files,
// and provides endpoints for generating JSON and decoding SNF files.

//Import required modules
const chokidar = require('chokidar');
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.REACT_APP_Server_Port? process.env.REACT_APP_Server_Port : 5000;
const fs = require('fs');
const path = require('path');
const readline = require('readline');


//FrontEnd
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
// Serve static assets from backend/public using absolute path; mount at root and /public
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.use('/public', express.static(publicDir));
// (Removed) Serving React build from API app to separate ports
// app.use(express.static(path.join(__dirname, '../frontend/build')))

const translation_table = require('./Postgres/TranslationTableCalls.js'); // Import translation table
const edi_tables = require('./Postgres/EDI_Tables.js'); // Import EDI tables

app.use('/TranslationTable', translation_table);
app.use('/EDI_Tables', edi_tables);


// Import functions and modules
// Send to cleo harmony
const { writeStructuredJSON } = require('./writeJSON.js');

//856 functions
const { getInvexRecords856 } = require('./transactions/856/I856_json_crt.js');
const { transformI856 } = require('./transactions/856/I856_transform.js');
const { LoadI856SNF } = require('./transactions/856/I856_insert_SNF.js');


//863 functions
const { getInvexRecords863 } = require('./transactions/863/I863_json_crt.js');
const { transformI863 } = require('./transactions/863/I863_transform.js');
const { LoadI863SNF } = require('./transactions/863/I863_insert_SNF.js');

// //861 functions
const { transformToStructuredJSON861 } = require('./transactions/861/I861_json_crt.js');
const { LoadI861SNF } = require('./transactions/861/I861_insert_SNF.js');

// //870 functions
const { transformToStructuredJSON870 } = require('./transactions/870/I870_json_crt.js');
const { LoadI870SNF } = require('./transactions/870/I870_insert_SNF.js');

// //846 functions
const { transformToStructuredJSON846 } = require('./transactions/846/I846_json_crt.js');
const { LoadI846SNF } = require('./transactions/846/I846_insert_SNF.js');

// //810 functions
const { transformToStructuredJSON810 } = require('./transactions/810/I810_json_crt.js');
const { LoadI810SNF } = require('./transactions/810/I810_insert_SNF.js');

// //830 functions
const { transformToStructuredJSON830 } = require('./transactions/830/I830_json_crt.js');
const { LoadI830SNF } = require('./transactions/830/I830_insert_SNF.js');

// //862 functions
const { transformToStructuredJSON862 } = require('./transactions/862/I862_json_crt.js');
const { LoadI862SNF } = require('./transactions/862/I862_insert_SNF.js');

// //850 functions
const { transformToStructuredJSON850 } = require('./transactions/850/I850_json_crt.js');
const { LoadI850SNF } = require('./transactions/850/I850_insert_SNF.js');

// //867 functions
const { transformToStructuredJSON867 } = require('./transactions/867/I867_json_crt.js');
const { LoadI867SNF } = require('./transactions/867/I867_insert_SNF.js');

// //824 functions
const { transformToStructuredJSON824 } = require('./transactions/824/I824_json_crt.js');
const { LoadI824SNF } = require('./transactions/824/I824_insert_SNF.js');

// //860 functions
const { transformToStructuredJSON860 } = require('./transactions/860/I860_json_crt.js');
const { LoadI860SNF } = require('./transactions/860/I860_insert_SNF.js');

// //210 functions
const { transformToStructuredJSON210 } = require('./transactions/210/I210_json_crt.js');
const { LoadI210SNF } = require('./transactions/210/I210_insert_SNF.js');





// Database connections 
const pool = require("./db")         //Cleo Harmony DB
const pool2 = require("./db2.js");   //Postgres DB for decoder table

// Mapping of transaction types to their JSON building function 
const transformMap = {
  '856': getInvexRecords856,
  '863': getInvexRecords863,
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

// Translation functions for each transaction type
// Allows for dynamic calls for translation based on transaction type.
const translations = {
  '856' : transformI856,
  '863' : transformI863,
}

// Input functions based on transaction type
// These functions will handle the insertion of parsed data into the respective input tables.
const inputTables = {
  '856' : LoadI856SNF,
  '863' : LoadI863SNF,
  '861' : LoadI861SNF,
  '870' : LoadI870SNF,
  '846' : LoadI846SNF,
  '810' : LoadI810SNF,
  '830' : LoadI830SNF,
  '862' : LoadI862SNF,
  '850' : LoadI850SNF,
  '867' : LoadI867SNF,
  '824' : LoadI824SNF,
  '860' : LoadI860SNF,
  '210' : LoadI210SNF
}


// Middleware setup
app.use(cors());
app.use(express.json());






// Folder to watch
const watchDir = path.join(__dirname, '../../../../../inboundSNF'); // Change as needed

// Initialize watcher
const watcher = chokidar.watch(watchDir, {
  persistent: true,
  ignoreInitial: true
});

watcher.on('add', filePath => {
  if (path.extname(filePath).toLowerCase() === '.tmp') {
    console.log(`Ignoring temporary file: ${filePath}`);
    return;
  }
  console.log(`File added: ${filePath}`);
  uploadFile(filePath)
    .catch(err => console.error('Upload failed:', err));
});

console.log(`Watching for files in ${watchDir}...`);

// MARK: Steps of EDI Decoding (Inbound)
//1. Read flat file
//2. Get layout from database
//3. Parse flat file based on layout
//4. Insert Parsed Data into Input Tables
//5. Translate Parsed Data Into Output Tables
//6. Create JSON from Output Tables
//7. Write structured JSON to CleoHarmony directory for Invex upload

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let recordCode;

// This function uploads a flat file, reads it, parses it according to the layout from the database, and then processes it into structured JSON.
// It also handles delays to ensure the database is ready for the next operation.
// The function is designed to be called when a new file is added to the watch directory.
// It reads the file, queries the database for the layout, parses the file according to that layout, and then processes the parsed data into input tables.
// The function also includes error handling to catch any issues that arise during the process.
async function uploadFile(filePath, delayMs = 500) {
    try {
      await wait(delayMs); 

      // MARK: 1. Read Flat file
      const fileBuffer = fs.readFileSync(filePath);
      const flatText = fileBuffer.toString('utf-8');

      // Get the first 4 characters of the flat file name (without extension)
      const baseName = path.basename(filePath).split('.')[0];
      const fieldtransaction = baseName.substring(1, 4);


      // MARK: 2. Get layout from database
      // Query layout from the database
      const { rows } = await pool2.query(
      "SELECT snf_code, snf_description, snf_position, snf_length, snf_type, snf_id, snf_elem_id, snf_value, snf_tad_item, snf_codes_comments FROM \"SNFdecoder\" WHERE snf_fieldtransaction = $1 ORDER BY snf_code",
      [fieldtransaction]
    );

      // Map layout fields to a more accessible format
      const layout = rows.map(row => ({
        code: row.snf_code,
        description: row.snf_description,
        position: row.snf_position,
        length: row.snf_length
      }));

      // MARK: 3. Parse flat file
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

      recordCode = parsed[0]["Record Key (10-digit integer)"]

      // MARK: 4. Insert Parsed Data into Input Tables
      const InputFunction = inputTables[fieldtransaction];
      if (InputFunction) {
        await InputFunction(pool2, parsed, 'I');
      }

      // MARK: 5. Transform to Output Tables
      const translationFunction = translations[fieldtransaction];
       if (translationFunction) {
         await translationFunction(pool2, parsed[0]["Record Key (10-digit integer)"], 'I');
       } else {
         console.error('-', recordCode, '-\n', `No translation function found for field transaction: ${fieldtransaction}`,'\n-', recordCode, '-');
         return;
       }
      
     
      // MARK: 6. Create JSON from Output Tables
      // //Transform to structured JSON
      const invex_json = transformMap[fieldtransaction];
      if (!invex_json) {
        console.error(`Unsupported field transaction: ${fieldtransaction}`);
        return;
      }
      const structured = await invex_json(parsed[0]["Type (T=Toll; M=Margin; D=Direct Ship)"], parsed[0]["Record Key (10-digit integer)"])
      // Write structured JSON to local disk for debugging or record-keeping
      const localJsonDir = path.join(__dirname, './localStructuredJSON');
      if (!fs.existsSync(localJsonDir)) {
        fs.mkdirSync(localJsonDir, { recursive: true });
      }
      const localJsonPath = path.join(localJsonDir, path.basename(filePath) + '.json');
      fs.writeFileSync(localJsonPath, JSON.stringify(structured, null, 2), 'utf-8');
      console.log(`Structured JSON written locally to: ${localJsonPath}`);


      // // Send structured JSON as a downloadable file, or write to disk, etc.
      //console.log('Structured JSON:', jsonString);
     
      // Optionally, write to a file:
      //fs.writeFileSync(path.join(__dirname, './SNF', path.basename(filePath) + '.json'), jsonString);

      // MARK: 7. Send Structured JSON to CleoHarmony Directory for Invex upload
      // Or call your writeStructuredJSON function:
      // writeStructuredJSON(structured, path.basename(filePath));


      // MARK: 8. Clean up
      // Move file to processed folder

      const originalFileName = path.basename(filePath);
      const folderName = originalFileName.split('_')[1]; 
      const date = parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8))
      const destDir = path.join(__dirname, `../../../../../processedSNF/${date}/${folderName}`); // Adjust as needed
      const destPath = path.join(destDir, path.basename(filePath));
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.renameSync(filePath, destPath);
      console.log(`✅ Successfully processed and moved file to: ${destPath}`);
      return; 
    } catch (error) {
      console.error('-', recordCode, '-\n', `'Parsing error in uploadFile:`, error, '\n-', recordCode, '-');
    }
  }




// MARK: Logging
const logFilePaths = [
  'C:\\Users\\GitHubLA\\.pm2\\logs\\Invex-Apps-error-0.log'
];

// Start watching each log file
logFilePaths.forEach(logFilePath => {
  if (fs.existsSync(logFilePath)) {
    fs.watchFile(logFilePath, { interval: 1000 }, (curr, prev) => { 
     
      
     
        const stream = fs.createReadStream(logFilePath, {
          start: prev.size,
          end: curr.size,
        });

        const rl = readline.createInterface({ input: stream });

        rl.on('line', async (line) => {
          const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}): (.*)$/);
          if (match) {
            const [, timestamp, message] = match;
            const level = 'INFO'; // Or parse a level if you have one
            try {
              await pool2.query(
                'INSERT INTO public.edi_pm2_logs (timestamp, level, message) VALUES ($1, $2, $3)',
                [new Date(timestamp), level, message]
              );
            } catch (err) {
              console.log('DB Insert Error:', err);
            }
          } else {
            console.log('No regex match for line:', line);
          }
        });
      });

    console.log('Watching log file for changes...', logFilePath);
  }
});

// Start a separate Express server to serve the React build on port 3000
const SPA_PORT = process.env.REACT_APP_FRONTEND_PORT ? parseInt(process.env.REACT_APP_FRONTEND_PORT) : 3000;
const spa = express();
spa.use(express.static(path.join(__dirname, '../frontend/build')));
spa.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/build', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend build not found.');
  }
});
// spa.listen(SPA_PORT, () => {
//   console.log(`✅ Frontend (build) served at http://localhost:${SPA_PORT}`);
// });

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});



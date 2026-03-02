// Description: This is the main server file for the backend of the SNF Decoder application.
// It sets up an Express server, handles file uploads using Multer, processes Excel and flat files,
// and provides endpoints for generating JSON and decoding SNF files.

// Load environment variables from .env file
require('dotenv').config();

//Import required modules
const chokidar = require('chokidar');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const app = express();
const PORT = process.env.REACT_APP_Server_Port? process.env.REACT_APP_Server_Port : 5000;
const fs = require('fs');
const path = require('path');
// Ensure a sensible default listen path so code using REACT_APP_LISTEN_PATH doesn't get 'undefined'
process.env.REACT_APP_LISTEN_PATH = process.env.REACT_APP_LISTEN_PATH || path.join(__dirname, 'watch');
const readline = require('readline');
const https = require('https');
const { processInvoiceToVoucher } = require('./transactions/810/I810_crt_vch.js');
const generateQueuedSNF = require('./generateQueuedSNF.js');

const populateSNF2 = require('./functions/populateSNF2.js');

//Error handling utility
const  readableErrors  = require('./functions/readableErrors.js');
const validateOPInbTransaction = require('./functions/validateOPInbTransaction.js');

// Send to cleo harmony
const { writeStructuredJSON2 } = require('./writeJSON2.js');
const { writeSNFFile2 } = require('./writeSNF2.js');

//856 functions
    //Inbound functions
const { getInvexRecords856 } = require('./transactions/856/I856_json_crt.js');
const { transformI856 } = require('./transactions/856/I856_transform.js');
const { LoadI856SNF } = require('./transactions/856/I856_insert_SNF.js');
    //Outbound functions
const { SNFCreateO846 } = require('./transactions/846/O846_SNF_crt.js');
const { insert846InvexOutbound } = require('./transactions/846/O846_insert_Invex.js');
const { transformO846 } = require('./transactions/846/O846_transform.js');
const { LoadO846SNF } = require('./transactions/846/O846_insert_SNF.js');

const { SNFCreateO856 } = require('./transactions/856/O856_SNF_crt.js');
const { insert856InvexOutbound } = require('./transactions/856/O856_insert_Invex.js');
const { transformO856 } = require('./transactions/856/O856_transform.js');
const { LoadO856SNF } = require('./transactions/856/O856_insert_SNF.js');

//863 functions
const { getInvexRecords863 } = require('./transactions/863/I863_json_crt.js');
const { transformI863 } = require('./transactions/863/I863_transform.js');
const { LoadI863SNF } = require('./transactions/863/I863_insert_SNF.js');

    //Outbound functions
const { SNFCreateO863 } = require('./transactions/863/O863_SNF_crt.js');
const { insert863InvexOutbound } = require('./transactions/863/O863_insert_invex.js');
const { transformO863 } = require('./transactions/863/O863_transform.js');
const { LoadO863SNF } = require('./transactions/863/O863_insert_SNF.js');

// //861 functions
const { getInvexRecords861 } = require('./transactions/861/I861_json_crt.js');
const { transformI861 } = require('./transactions/861/I861_transform.js');
const { LoadI861SNF } = require('./transactions/861/I861_insert_SNF.js');

    //Outbound functions
const { SNFCreateO861 } = require('./transactions/861/O861_SNF_crt.js');
const { insert861InvexOutbound } = require('./transactions/861/O861_insert_Invex.js');
const { transformO861 } = require('./transactions/861/O861_transform.js');
const { LoadO861SNF } = require('./transactions/861/O861_insert_SNF.js');

// //870 functions
const { transformToStructuredJSON870 } = require('./transactions/870/I870_json_crt.js');
const { LoadI870SNF } = require('./transactions/870/I870_insert_SNF.js');

// //846 functions
const { transformToStructuredJSON846 } = require('./transactions/846/I846_json_crt.js');
const { LoadI846SNF } = require('./transactions/846/I846_insert_SNF.js');

// //810 functions
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
const pool2 = require("./db2.js");   //Postgres DB for decoder table

const { transformMap, translations, outboundtranslations, createSNF, inputTablesOutbound, OutBoundInvexTables } = require('./transactions/registry.js');

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



//FrontEnd
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
// Serve static assets from backend/public using absolute path; mount at root and /public
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.use('/public', express.static(publicDir));


const translation_table = require('./Postgres/TranslationTableCalls.js'); // Import translation table
const edi_tables = require('./Postgres/EDI_Tables.js'); // Import EDI tables
const apiRouter = require('./api/api');
const voucher = require('./Postgres/VoucherCreateCalls.js'); // Import Voucher Create
//const duplicate_asn = require('./Postgres/Duplicate_ASNCalls.js'); // Import Duplicate ASN
const custConfig = require('./Postgres/customer_config_calls.js'); // Import Customer Config
const RoutingTrans = require('./Postgres/RoutingTransactionCalls.js'); // Import Routing Transaction
app.use('/CustomerConfiguration', custConfig);
app.use('/Voucher', voucher);
app.use('/RoutingTrans', RoutingTrans);
app.use('/TranslationTable', translation_table);
app.use('/EDI_Tables', edi_tables);
app.use('/api', apiRouter);

// Global unhandled rejection handler to log and avoid crash during development
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});

// Configure multer for file uploads (in-memory storage)
const upload = multer({ storage: multer.memoryStorage() });


// API endpoint to upload inbound SNF files
app.post('/upload/inbound', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = req.file.originalname;
    const fileContent = req.file.buffer.toString('utf-8');

    console.log(`📥 Received inbound file: ${fileName}`);

    // Process the file using the same logic as uploadIn()
    await processInboundFile(fileContent, fileName);

    res.json({ 
      success: true, 
      message: `File ${fileName} processed successfully` 
    });
  } catch (error) {
    console.error('Error processing inbound file:', error);
    res.status(500).json({ 
      error: 'File processing failed', 
      details: error.message 
    });
  }
});

// API endpoint to upload outbound JSON files
app.post('/upload/outbound', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = req.file.originalname;
    const fileContent = req.file.buffer.toString('utf-8');

    console.log(`📥 Received outbound file: ${fileName}`);

    // Process the file using the same logic as uploadOut()
    await processOutboundFile(fileContent, fileName);

    res.json({ 
      success: true, 
      message: `File ${fileName} processed successfully` 
    });
  } catch (error) {
    console.error('Error processing outbound file:', error);
    res.status(500).json({ 
      error: 'File processing failed', 
      details: error.message 
    });
  }
});

// Generate SNF for queued transactions every 10 minutes
// setInterval(() => {
//   generateQueuedSNF();
// }, 10 * 60 * 1000);


// 810 Queue Management
const queue810 = [];
let processing810 = false;

async function process810Queue() {
  if (processing810 || queue810.length === 0) {
    return;
  }
  
  processing810 = true;
  const filePath = queue810.shift();
  
  console.log(`🔄 Processing 810 from queue: ${path.basename(filePath)} (${queue810.length} remaining)`);
  
  try {
     const InbTransactionType = 'REG'; // Regular inbound transctions
    await uploadIn(filePath, InbTransactionType);
  } catch (err) {
    console.error(`❌ Error processing 810 file ${filePath}:`, err);
  } finally {
    processing810 = false;
    // Process next item in queue
    if (queue810.length > 0) {
      setImmediate(() => process810Queue());
    }
  }
}



// MARK: Process Inbound File (from API upload)
async function processInboundFile(flatText, fileName) {
  try {
    const baseName = fileName.split('.')[0];
    const fieldtransaction = baseName.substring(1, 4);

    // Get layout from database
    const { rows } = await pool2.query(
      "SELECT snf_code, snf_description, snf_position, snf_length FROM \"SNFdecoder\" WHERE snf_fieldtransaction = $1 ORDER BY snf_code",
      [fieldtransaction]
    );

    const layout = rows.map(row => ({
      code: row.snf_code,
      description: row.snf_description,
      position: row.snf_position,
      length: row.snf_length
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

    const recordKey = parsed[0]["Record Key (10-digit integer)"];

    // Insert into Input Tables
    const InputFunction = inputTables[fieldtransaction];
    if (InputFunction) {
      await InputFunction(pool2, parsed, 'I', baseName);
    }

    // Transform to Output Tables
    if (['863','856','861'].includes(fieldtransaction)) {
      const translationFunction = translations[fieldtransaction];
      if (translationFunction) {
        await translationFunction(pool2, recordKey, 'I', baseName);
      }
    
      // Create JSON from Output Tables
      const invex_json = transformMap[fieldtransaction];
      if (invex_json) {
        const structured = await invex_json(parsed[0]["Type (T=Toll; M=Margin; D=Direct Ship)"], recordKey);
        await writeStructuredJSON2(structured, fileName);
      }
    }

    console.log(`✅ Successfully processed inbound file: ${fileName}`);
  } catch (error) {
    const readableErrorMessage = readableErrors(error, recordCode, fileName);
    console.error(`❌ Error processing ${fileName}:`, readableErrorMessage);
    throw error;
  }
}

// MARK: Process Outbound File (from API upload)
async function processOutboundFile(flatText, fileName) {
  try {
    const baseName = fileName.split('.')[0];
    const fieldtransaction = baseName.substring(1, 4);

    // Insert into Invex Tables
    let key;
    const InputFunction = OutBoundInvexTables[fieldtransaction];
    if (InputFunction) {
      key = await InputFunction(pool2, flatText, 'O', baseName);
    }

    let CustomerID, Branch;
    // Translate Data then call Insert into SNF Tables
    const translationFunction = outboundtranslations[fieldtransaction];
    if (translationFunction) {
      ({ CustomerID, Branch } = await translationFunction(pool2, key, 'O', baseName));
    }

    // Call SNF_Crt function
    const SNF_Crt = createSNF[fieldtransaction];
    if (SNF_Crt) {
      const snfdata = await SNF_Crt(key, pool2, CustomerID, Branch);
      
      if (snfdata && snfdata.length > 0) {
        // Get layout from database
        const { rows } = await pool2.query(
          "SELECT snf_code, snf_description, snf_position, snf_length FROM \"SNFdecoder\" WHERE snf_fieldtransaction = $1 ORDER BY snf_code",
          [fieldtransaction]
        );

        const layout = rows.map(row => ({
          code: row.snf_code,
          description: row.snf_description,
          position: row.snf_position,
          length: row.snf_length
        }));

        // Build flat file for each record
        await Promise.all(snfdata.map(async (record) => {
          const newFileName = 'O'+ fieldtransaction +'_' + record[0]['GS Receiver ID'] + '_' + record[0]['Record Key (10-digit integer)'];
          
          const flatFileString = record.map(rec => {
            const recordCode = rec.record_code;
            const fields = layout
              .filter(f => f.code.padStart(2, '0') === recordCode)
              .sort((a, b) => a.position - b.position);

            let lineArr = [];
            for (const field of fields) {
              let value = rec[field.description] ?? '';
              value = value.toString().padEnd(field.length, ' ').slice(0, field.length);
              const start = field.position - 1;
              for (let i = 0; i < field.length; i++) {
                lineArr[start + i] = value[i];
              }
            }
            for (let i = 0; i < lineArr.length; i++) {
              if (typeof lineArr[i] === 'undefined') lineArr[i] = ' ';
            }
            return lineArr.join('');
          }).join('\n');

          await writeSNFFile2(flatFileString, newFileName);
        }));
      }
    }

    console.log(`✅ Successfully processed outbound file: ${fileName}`);
  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error);
    throw error;
  }
}

// Folder to watch
const baseListenPath = process.env.REACT_APP_LISTEN_PATH || path.join(__dirname, 'watch');
const watchDir = path.join(baseListenPath, 'inboundSNF'); // Change as needed

// ensure the directories exist so watchers and scans don't throw
try {
  fs.mkdirSync(watchDir, { recursive: true });
} catch (e) {
  console.error('Failed to create watchDir:', watchDir, e);
}

console.log(`📁 Setting up file watcher for: ${watchDir}`);

// Track processed files to avoid duplicate processing
const processedFiles = new Set();

// Initialize watcher
const watcher = chokidar.watch(watchDir, {
  persistent: true,
  ignoreInitial: false,    // Process existing files on startup
  usePolling: true,        // Required for network mounts (CIFS/SMB)
  interval: 2000,          // Poll every 2 seconds (more aggressive)
  binaryInterval: 3000,
  awaitWriteFinish: {
    stabilityThreshold: 2000,  // Wait 2s after last change
    pollInterval: 100          // Check every 100ms
  },
  depth: 1,
  alwaysStat: true,
  followSymlinks: false
});



watcher.on('ready', () => {
  console.log('✅ File watcher is ready for:', watchDir);
  
  // Backup polling mechanism - scan folder every 5 seconds
  console.log('🔄 Starting backup file scanner (every 5 seconds)...');
  setInterval(async () => {
    try {
      // console.log(`🔍 Scanning ${watchDir} for new files...`);
      const files = fs.readdirSync(watchDir);
      // console.log(`   Found ${files.length} files in directory`);
      
      for (const file of files) {
        if (file.endsWith('.tmp')) {
          // console.log(`   ⏭️  Skipping temp file: ${file}`);
          continue;
        }
        
        const filePath = path.join(watchDir, file);
        
        // Skip if already processed
        if (processedFiles.has(filePath)) {
          // console.log(`   ⏭️  Already processed: ${file}`);
          continue;
        }
        
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          console.log(`   ✨ NEW FILE DETECTED: ${file}`);
          console.log(`      File size: ${stats.size} bytes`);
          console.log(`      Modified: ${new Date(stats.mtimeMs).toISOString()}`);
          
          processedFiles.add(filePath);
          console.log(`   🚀 Processing ${file}...`);
          
          // Check if this is an 810 file
            const baseName = path.basename(filePath).split('.')[0];
            const fieldtransaction = baseName.substring(1, 4);
            
            if (fieldtransaction === '810') {
              console.log(`📥 810 file queued: ${path.basename(filePath)}`);
              queue810.push(filePath);
              process810Queue();
            } else {
              uploadIn(filePath).catch(err => {
                console.error(`❌ Upload failed for ${file}:`, err);
                // Remove from processed set so it can be retried
                processedFiles.delete(filePath);
              });
            }

          
          
        
      }}
    } catch (error) {
      console.error('❌ Backup scan error:', error);
    }
  }, 5000);
});

watcher.on('error', (error) => {
  console.error('❌ Watcher error:', error);
});

watcher.on('change', (filePath) => {
  console.log(`🔄 File changed: ${filePath}`);
});

watcher.on('add', filePath => {
  if (path.extname(filePath).toLowerCase() === '.tmp') {
    console.log(`⏭️  Ignoring temporary file: ${filePath}`);
    return;
  }
  
  // Skip if already processed
  if (processedFiles.has(filePath)) {
    console.log(`⏭️  Already processed: ${filePath}`);
    return;
  }
  
  console.log(`📂 File added via watcher: ${filePath}`);


  processedFiles.add(filePath);
  // Check if this is an 810 file
            const baseName = path.basename(filePath).split('.')[0];
            const fieldtransaction = baseName.substring(1, 4);
            
            if (fieldtransaction === '810') {
              console.log(`📥 810 file queued: ${path.basename(filePath)}`);
              queue810.push(filePath);
              process810Queue();
            } else {
               const InbTransactionType = 'REG'; // Regular inbound transctions
              uploadIn(filePath, InbTransactionType).catch(err => {
                console.error(`❌ Upload failed for ${file}:`, err);
                // Remove from processed set so it can be retried
                processedFiles.delete(filePath);
              });
            }
});

watcher.on('raw', (event, path, details) => {
  console.log(`🔧 Raw event: ${event} on ${path}`);
});

const watchDirOP = path.join(baseListenPath, 'inboundOPSNF'); // Change as needed
const watcherOP = chokidar.watch(watchDirOP, {
  persistent: true,
  ignoreInitial: false,    // Process existing files on startup
  usePolling: true,        // Required for network mounts (CIFS/SMB)
  interval: 2000,          // Poll every 2 seconds (more aggressive)
  binaryInterval: 3000,
  awaitWriteFinish: {
    stabilityThreshold: 2000,  // Wait 2s after last change
    pollInterval: 100          // Check every 100ms
  },
  depth: 1,
  alwaysStat: true,
  followSymlinks: false
});



watcherOP.on('ready', () => {
  console.log('✅ File watcher is ready for:', watchDirOP);
  
  // Backup polling mechanism - scan folder every 5 seconds
  console.log('🔄 Starting backup file scanner (every 5 seconds)...');
  setInterval(async () => {
    try {
      // console.log(`🔍 Scanning ${watchDir} for new files...`);
      const files = fs.readdirSync(watchDirOP);
      // console.log(`   Found ${files.length} files in directory`);
      
      for (const file of files) {
        if (file.endsWith('.tmp')) {
          // console.log(`   ⏭️  Skipping temp file: ${file}`);
          continue;
        }
        
        const filePath = path.join(watchDirOP, file);
        
        // Skip if already processed
        if (processedFiles.has(filePath)) {
          // console.log(`   ⏭️  Already processed: ${file}`);
          continue;
        }
        
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          console.log(`   ✨ NEW FILE DETECTED: ${file}`);
          console.log(`      File size: ${stats.size} bytes`);
          console.log(`      Modified: ${new Date(stats.mtimeMs).toISOString()}`);
          
          processedFiles.add(filePath);
          console.log(`   🚀 Processing ${file}...`);
          
          // Check if this is an 810 file
            const baseName = path.basename(filePath).split('.')[0];
            const fieldtransaction = baseName.substring(1, 4);
            
            if (fieldtransaction === '810') {
              console.log(`📥 810 file queued: ${path.basename(filePath)}`);
              queue810.push(filePath);
              process810Queue();
            } else {
              uploadIn(filePath).catch(err => {
                console.error(`❌ Upload failed for ${file}:`, err);
                // Remove from processed set so it can be retried
                processedFiles.delete(filePath);
              });
            }

          
          
        
      }}
    } catch (error) {
      console.error('❌ Backup scan error:', error);
    }
  }, 5000);
});

watcherOP.on('error', (error) => {
  console.error('❌ Watcher error:', error);
});

watcherOP.on('change', (filePath) => {
  console.log(`🔄 File changed: ${filePath}`);
});

watcherOP.on('add', filePath => {
  if (path.extname(filePath).toLowerCase() === '.tmp') {
    console.log(`⏭️  Ignoring temporary file: ${filePath}`);
    return;
  }
  
  // Skip if already processed
  if (processedFiles.has(filePath)) {
    console.log(`⏭️  Already processed: ${filePath}`);
    return;
  }
  
  console.log(`📂 File added via watcher: ${filePath}`);


  processedFiles.add(filePath);
  // Check if this is an 810 file
            const baseName = path.basename(filePath).split('.')[0];
            const fieldtransaction = baseName.substring(1, 4);
            const InbTransactionType = 'OP'; // OP inbound transctions
            
              uploadIn(filePath, InbTransactionType).catch(err => {
                console.error(`❌ Upload failed for ${file}:`, err);
                // Remove from processed set so it can be retried
                processedFiles.delete(filePath);
              });
});

watcherOP.on('raw', (event, path, details) => {
  console.log(`🔧 Raw event: ${event} on ${path}`);
});

console.log(`👀 Watching for files in ${watchDir}...`);

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
async function uploadIn(filePath, InbTransactionType, delayMs = 500) {
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
       let validOPtransaction = true;
       let I856po = null;
       let I856pol = null;

      if (['856'].includes(fieldtransaction) && InbTransactionType === 'OP' && parsed[0]["Type (T=Toll; M=Margin; D=Direct Ship)"] !== 'T')
      {
        // Write a new program, which will fetch the '30' leve PO details and then check PO.
        const result = await validateOPInbTransaction(pool2, parsed, 'I');
        validOPtransaction = result.validOPtransaction;
        I856po = result.Inb856PO;
        I856pol = result.Inb856POL;
      }

      if (validOPtransaction === true || InbTransactionType !== 'OP') {


      // MARK: 4. Insert Parsed Data into Input Tables
      let foundOPPO = false;
      const InputFunction = inputTables[fieldtransaction];
      if (InputFunction) {
          foundOPPO = await InputFunction(pool2, parsed, 'I', baseName, InbTransactionType, I856po, I856pol);
          if (foundOPPO === false) {validOPtransaction = false;}
      }

      if (InbTransactionType !== 'OP' || foundOPPO) {



      // MARK: 5. Transform to Output Tables
      if (['863','856','861', '810', '846','870'].includes(fieldtransaction)) {
      const translationFunction = translations[fieldtransaction];
       if (translationFunction) {
         await translationFunction(pool2, parsed[0]["Record Key (10-digit integer)"], 'I', baseName);
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
      // const localJsonDir = path.join(__dirname, './localStructuredJSON');
      // if (!fs.existsSync(localJsonDir)) {
      // fs.mkdirSync(localJsonDir, { recursive: true });
      //  }
      //  const localJsonPath = path.join(localJsonDir, path.basename(filePath) + '.json');
      //  fs.writeFileSync(localJsonPath, JSON.stringify(structured, null, 2), 'utf-8');
      //  console.log(`Structured JSON written locally to: ${localJsonPath}`);


      // MARK: 7. Send Structured JSON to CleoHarmony Directory for Invex upload
      // Or call your writeStructuredJSON function:
      fieldtransaction !== '810' ? await writeStructuredJSON2(structured, path.basename(filePath)) : null;

    }}}
          // MARK: 8. Clean up
          // Move file to processed folder
    
          const originalFileName = path.basename(filePath);
          const folderName = originalFileName.split('_')[1]; 
          const date = parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8))
          let destDir;
                if ( InbTransactionType === 'OP' && validOPtransaction !== true) {
                  destDir = path.join(process.env.REACT_APP_LISTEN_PATH, 'RejectedOPS', date.toString(), folderName); 
                } else {
                 destDir = path.join(process.env.REACT_APP_LISTEN_PATH, 'processedSNF', date.toString(), folderName); 
                }
          const destPath = path.join(destDir, path.basename(filePath));
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          fs.renameSync(filePath, destPath);
          console.log(`✅ Successfully processed and moved file to: ${destPath}`);
    
          return; 
    } catch (error) {
      
      console.error('-', recordCode, '-\n', error, '\n-', recordCode, '-');
    }
  }







  // Folder to watch
const watchDirO = path.join(process.env.REACT_APP_LISTEN_PATH, 'outboundJSON');

try {
  fs.mkdirSync(watchDirO, { recursive: true });
} catch (e) {
  console.error('Failed to create watchDirO:', watchDirO, e);
}

console.log(`📁 Setting up file watcher for: ${watchDirO}`);

// Initialize watcher
const watcherO = chokidar.watch(watchDirO, {
  persistent: true,
  ignoreInitial: false,    // Process existing files on startup
  usePolling: true,        // Required for network mounts (CIFS/SMB)
  interval: 2000,          // Poll every 2 seconds
  binaryInterval: 3000,
  awaitWriteFinish: {
    stabilityThreshold: 2000,  // Wait 2s after last change
    pollInterval: 100          // Check every 100ms
  },
  depth: 1,
  alwaysStat: true,
  followSymlinks: false
});


const processedFilesO = new Set();

watcherO.on('ready', () => {
  console.log('✅ File watcher is ready for:', watchDirO);
  
  // Backup polling mechanism - scan folder every 5 seconds
  console.log('🔄 Starting backup file scanner (every 5 seconds)...');
  setInterval(async () => {
    try {
      // console.log(`🔍 Scanning ${watchDirO} for new files...`);
      const files = fs.readdirSync(watchDirO);
      // console.log(`   Found ${files.length} files in directory`);
      
      for (const file of files) {
        if (file.endsWith('.tmp')) {
          // console.log(`   ⏭️  Skipping temp file: ${file}`);
          continue;
        }
        
        const filePath = path.join(watchDirO, file);
        
        // Skip if already processed
        if (processedFilesO.has(filePath)) {
          // console.log(`   ⏭️  Already processed: ${file}`);
          continue;
        }
        
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          console.log(`   ✨ NEW FILE DETECTED: ${file}`);
          console.log(`      File size: ${stats.size} bytes`);
          console.log(`      Modified: ${new Date(stats.mtimeMs).toISOString()}`);
          
          processedFilesO.add(filePath);
          console.log(`   🚀 Processing ${file}...`);
          


          uploadOut(filePath).catch(err => {
            console.error(`❌ Upload failed for ${file}:`, err);
            // Remove from processed set so it can be retried
            processedFilesO.delete(filePath);
          });
        }
      }
    } catch (error) {
      console.error('❌ Backup scan error:', error);
    }
  }, 5000);
});

watcherO.on('error', (error) => {
  console.error('❌ Watcher error:', error);
});

watcherO.on('change', (filePath) => {
  console.log(`🔄 File changed: ${filePath}`);
});

watcherO.on('add', filePath => {
  if (path.extname(filePath).toLowerCase() === '.tmp') {
    console.log(`⏭️  Ignoring temporary file: ${filePath}`);
    return;
  }
  
  // Skip if already processed
  if (processedFilesO.has(filePath)) {
    console.log(`⏭️  Already processed: ${filePath}`);
    return;
  }
  
  console.log(`📂 File added via watcher: ${filePath}`);


  processedFilesO.add(filePath);
  uploadOut(filePath)
    .catch(err => console.error('❌ Upload failed:', err));
});

watcherO.on('raw', (event, path, details) => {
  console.log(`🔧 Raw event: ${event} on ${path}`);
});

console.log(`👀 Watching for files in ${watchDirO}...`);

console.log(`Watching for files in ${watchDirO}...`);

//MARK: Outbound SNF File Creation
// This function creates an SNF file from the structured JSON data.
async function uploadOut(filePath, delayMs = 2000) {
  try {
   
    await wait(delayMs);

    // MARK: 1. Read JSON
    const fileBuffer = fs.readFileSync(filePath);
    const flatText = fileBuffer.toString('utf-8');
    
    // Get the first 4 characters of the flat file name (without extension)
    const baseName = path.basename(filePath).split('.')[0];
    const fieldtransaction = baseName.substring(1, 4);


    //Write json to structured file
    // // Parse the JSON content first
    let jsonData;
    try {
      jsonData = JSON.parse(flatText);
    } catch (parseError) {
      console.error(`Error parsing JSON from ${filePath}:`, parseError);
      return;
    }

    // // // Write formatted JSON to local directory
    // const localJsonDir = path.join(__dirname, './localStructuredJSON');
    // if (!fs.existsSync(localJsonDir)) {
    //   fs.mkdirSync(localJsonDir, { recursive: true });
    // }
    
    // // Change file extension to .json and write properly formatted JSON
    // const localJsonPath = path.join(localJsonDir, path.basename(filePath, path.extname(filePath)) + '.json');
    // fs.writeFileSync(localJsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
    // console.log(`Structured JSON written locally to: ${localJsonPath}`);

    // MARK: 2. Insert into Invex Tables
    let key;
    const InputFunction = OutBoundInvexTables[fieldtransaction];
    if (InputFunction) {
      key = await InputFunction(pool2, flatText, 'O', baseName);
    }

 let CustomerID, Branch, Transaction_Reference ;
    // MARK: 3. Translate Data then call Insert into SNF Tables
      const translationFunction = outboundtranslations[fieldtransaction];
     if (translationFunction) {
      if(fieldtransaction==='846'){
       ({ CustomerID, Branch, Transaction_Reference } = await translationFunction(pool2, key, 'O', filePath, baseName));
       } else {
       ({ CustomerID, Branch } = await translationFunction(pool2, key, 'O', baseName));
       }

      }

    // MARK 4. Call SNF_Crt function to create structure SNF data 
    console.log(`Creating SNF data for field transaction: ${fieldtransaction}, key: ${key}, CustomerID: ${CustomerID}, Branch: ${Branch}`);
    const SNF_Crt = createSNF[fieldtransaction];
    if (!SNF_Crt) {
      console.error(`Unsupported field transaction for SNF creation: ${fieldtransaction}`);
      return;
    }
let snfdata;
let suffixfor870 = '';
    if(fieldtransaction==='846'){

    for (record_code of Transaction_Reference) {
    snfdata = await SNF_Crt(key, pool2, CustomerID, Branch, record_code);
    populateSNF2(snfdata, pool2, fieldtransaction, suffixfor870);
    } /// Closing of for Loop for multiple SNFs
  } else if (fieldtransaction === '870') {
    const result = await SNF_Crt(key, pool2, CustomerID, Branch);
    snfdata = result.multiSNFS; 
    suffixfor870 = result.suffixfor870;
    sentflag870 = result.sentflag870;
    // Check if we have O870A or sent flag as Y then generate SNF
    if (sentflag870 === 'Y') {
        populateSNF2(snfdata, pool2, fieldtransaction, suffixfor870);  
    } else {
      console.log('O870A data not yet available. Keeping this transaction in queue until O870A is available.', key);
    }
  } else {
    snfdata = await SNF_Crt(key, pool2, CustomerID, Branch);
    populateSNF2(snfdata, pool2, fieldtransaction, suffixfor870);
  }
cleanupOutboundFile(filePath);
} catch (error) {
console.error('Error processing outbound file:', error);

}

}

async function cleanupOutboundFile(filePath) {
  
// MARK: 8. Clean up
// Move file to processed folder
const originalFileName = path.basename(filePath);
const folderName = originalFileName.split('_')[1];
const date = parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8))
const destDir = path.join(process.env.REACT_APP_LISTEN_PATH, 'processedJSON', date.toString(), folderName);
const destPath = path.join(destDir, path.basename(filePath));
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}
fs.renameSync(filePath, destPath);
console.log(`✅ Successfully processed and moved file to: ${destPath}`);
return;
} 


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
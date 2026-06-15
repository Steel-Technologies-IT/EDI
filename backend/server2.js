// Description: This is the main server file for the backend of the SNF Decoder application.
// It sets up an Express server, handles file uploads using Multer, processes Excel and flat files,
// and provides endpoints for generating JSON and decoding SNF files.

//Import required modules
const chokidar = require('chokidar');
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.REACT_APP_Server_Port? process.env.REACT_APP_Server_Port : 5000;
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const https = require('https');
const populateSNF2 = require('./functions/populateSNF2.js');
const generateQueuedSNF = require('./generateQueuedSNF.js');
const multer = require('multer');

//Error handling utility
const  readableErrors  = require('./functions/readableErrors.js');


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

    //Outbound functions
const { SNFCreateO870 } = require('./transactions/870/O870_SNF_crt.js');
const { insert870InvexOutbound } = require('./transactions/870/O870_insert_Invex.js');
const { transformO870 } = require('./transactions/870/O870_transform.js');
const { LoadO870SNF } = require('./transactions/870/O870_insert_SNF.js');

// //870 functions
const { transformToStructuredJSON870 } = require('./transactions/870/I870_json_crt.js');
const { LoadI870SNF } = require('./transactions/870/I870_insert_SNF.js');

// //846 functions
const { transformToStructuredJSON846 } = require('./transactions/846/I846_json_crt.js');
const { LoadI846SNF } = require('./transactions/846/I846_insert_SNF.js');

// //810 functions
const { LoadI810SNF } = require('./transactions/810/I810_insert_SNF.js');
const { processInvoiceToVoucher } = require('./transactions/810/I810_crt_vch.js');

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
setInterval(() => {
  generateQueuedSNF();
}, 10 * 60 * 1000);

const RECENT_FILE_TTL_MS = 2 * 60 * 1000;
const recentInboundFiles = new Map();
const recentOutboundFiles = new Map();

function normalizeForTracking(filePath) {
  return path.resolve(filePath).toLowerCase();
}

function pruneRecentFiles(recentMap) {
  const now = Date.now();
  for (const [key, timestamp] of recentMap.entries()) {
    if (now - timestamp > RECENT_FILE_TTL_MS) {
      recentMap.delete(key);
    }
  }
}

function claimFileForProcessing(filePath, inFlightSet, recentMap) {
  const normalizedPath = normalizeForTracking(filePath);
  if (inFlightSet.has(normalizedPath)) {
    return null;
  }

  let stats;
  try {
    stats = fs.statSync(filePath);
  } catch {
    return null;
  }

  const fingerprint = `${normalizedPath}|${stats.size}|${stats.mtimeMs}`;
  pruneRecentFiles(recentMap);

  if (recentMap.has(fingerprint)) {
    return null;
  }

  inFlightSet.add(normalizedPath);
  return { normalizedPath, fingerprint };
}

function completeFileProcessingClaim(token, inFlightSet, recentMap) {
  if (!token) {
    return;
  }
  inFlightSet.delete(token.normalizedPath);
  recentMap.set(token.fingerprint, Date.now());
}


// 810 Queue Management
const queue810 = [];
let processing810 = false;

async function process810Queue() {
  if (processing810 || queue810.length === 0) {
    return;
  }
  
  processing810 = true;
  const queuedItem = queue810.shift();
  const filePath = typeof queuedItem === 'string' ? queuedItem : queuedItem.filePath;
  const queueToken = typeof queuedItem === 'string' ? null : queuedItem.token;
  const queueInbTransactionType = typeof queuedItem === 'string' ? 'REG' : queuedItem.InbTransactionType;
  
  console.log(`🔄 Processing 810 from queue: ${path.basename(filePath)} (${queue810.length} remaining)`);
  
  try {
    await uploadIn(filePath, queueInbTransactionType, 500, queueToken);
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

// Track files currently being processed so the same file event is not handled twice concurrently
const processedFiles = new Set();

// Initialize watcher
const watcher = chokidar.watch(watchDir, {
  persistent: true,
  ignoreInitial: true,     // Startup files are handled by backup scan
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

function scheduleInboundProcessing(filePath, InbTransactionType, sourceLabel) {
  if (path.extname(filePath).toLowerCase() === '.tmp') {
    return;
  }

  let stats;
  try {
    stats = fs.statSync(filePath);
  } catch {
    return;
  }

  if (!stats.isFile()) {
    return;
  }

  const token = claimFileForProcessing(filePath, processedFiles, recentInboundFiles);
  if (!token) {
    return;
  }

  const fileName = path.basename(filePath);
  console.log(`📂 Inbound file claimed from ${sourceLabel}: ${filePath}`);
  console.log(`      File size: ${stats.size} bytes`);
  console.log(`      Modified: ${new Date(stats.mtimeMs).toISOString()}`);
  console.log(`   🚀 Processing ${fileName}...`);

  const baseName = fileName.split('.')[0];
  const fieldtransaction = baseName.substring(1, 4);

  if (fieldtransaction === '810') {
    console.log(`📥 810 file queued: ${fileName}`);
    queue810.push({ filePath, token, InbTransactionType });
    process810Queue();
    return;
  }

  uploadIn(filePath, InbTransactionType, 500, token)
    .catch(err => {
      console.error(`❌ Upload failed for ${fileName}:`, err);
    });
}

function runInboundBackupScan(scanDir, InbTransactionType) {
  try {
    const files = fs.readdirSync(scanDir);
    for (const file of files) {
      const filePath = path.join(scanDir, file);
      scheduleInboundProcessing(filePath, InbTransactionType, 'backup-scan');
    }
  } catch (error) {
    console.error('❌ Backup scan error:', error);
  }
}



watcher.on('ready', () => {
  console.log('✅ File watcher is ready for:', watchDir);
  
  // Backup polling mechanism - scan folder every 5 seconds
  console.log('🔄 Starting backup file scanner (every 5 seconds)...');
  runInboundBackupScan(watchDir, 'REG');
  setInterval(() => runInboundBackupScan(watchDir, 'REG'), 5000);
});

watcher.on('error', (error) => {
  console.error('❌ Watcher error:', error);
});

watcher.on('change', (filePath) => {
  console.log(`🔄 File changed: ${filePath}`);
});

watcher.on('add', filePath => {
  scheduleInboundProcessing(filePath, 'REG', 'watcher-add');
});

watcher.on('raw', (event, path, details) => {
  console.log(`🔧 Raw event: ${event} on ${path}`);
});

const watchDirOP = path.join(baseListenPath, 'inboundOPSNF'); // Change as needed

try {
  fs.mkdirSync(watchDirOP, { recursive: true });
} catch (e) {
  console.error('Failed to create watchDirOP:', watchDirOP, e);
}

const watcherOP = chokidar.watch(watchDirOP, {
  persistent: true,
  ignoreInitial: true,     // Startup files are handled by backup scan
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
  runInboundBackupScan(watchDirOP, 'OP');
  setInterval(() => runInboundBackupScan(watchDirOP, 'OP'), 5000);
});

watcherOP.on('error', (error) => {
  console.error('❌ Watcher error:', error);
});

watcherOP.on('change', (filePath) => {
  console.log(`🔄 File changed: ${filePath}`);
});

watcherOP.on('add', filePath => {
  scheduleInboundProcessing(filePath, 'OP', 'watcher-add');
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

function moveFileToDatedFolder(filePath, targetRootFolder, useDateAndCustomerFolder = true) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const originalFileName = path.basename(filePath);
  let destDir;
  if (useDateAndCustomerFolder) {
    const folderName = originalFileName.split('_')[1] || 'unknown';
    const date = parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8));
    destDir = path.join(process.env.REACT_APP_LISTEN_PATH, targetRootFolder, date.toString(), folderName);
  } else {
    destDir = path.join(process.env.REACT_APP_LISTEN_PATH, targetRootFolder);
  }
  const destPath = path.join(destDir, originalFileName);

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.renameSync(filePath, destPath);
  return destPath;
}

let recordCode;

// This function uploads a flat file, reads it, parses it according to the layout from the database, and then processes it into structured JSON.
// It also handles delays to ensure the database is ready for the next operation.
// The function is designed to be called when a new file is added to the watch directory.
// It reads the file, queries the database for the layout, parses the file according to that layout, and then processes the parsed data into input tables.
// The function also includes error handling to catch any issues that arise during the process.
async function uploadIn(filePath, InbTransactionType, delayMs = 500, processingToken = null) {
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
        await InputFunction(pool2, parsed, 'I', baseName);
      }


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

    }
          // MARK: 8. Clean up
          // Move file to processed folder
    
          const originalFileName = path.basename(filePath);
          const folderName = originalFileName.split('_')[1]; 
          const date = parseInt(new Date().toISOString().replace(/\D/g, '').slice(0, 8))
          const destDir = path.join(process.env.REACT_APP_LISTEN_PATH, 'processedSNF', date.toString(), folderName); 
                
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
  ignoreInitial: true,     // Startup files are handled by backup scan
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


const outboundInFlight = new Set();
const outboundRecentFingerprints = new Map();
const OUTBOUND_FINGERPRINT_TTL_MS = 10 * 60 * 1000;

function normalizePathForLock(filePath) {
  return path.normalize(filePath).toLowerCase();
}

function pruneExpiredOutboundFingerprints(now = Date.now()) {
  for (const [fingerprint, expiresAt] of outboundRecentFingerprints.entries()) {
    if (expiresAt <= now) {
      outboundRecentFingerprints.delete(fingerprint);
    }
  }
}

function buildOutboundFingerprint(filePath) {
  const stats = fs.statSync(filePath);
  return `${normalizePathForLock(filePath)}|${stats.size}|${stats.mtimeMs}`;
}

function claimOutboundFile(filePath) {
  const normalizedPath = normalizePathForLock(filePath);

  if (outboundInFlight.has(normalizedPath)) {
    return { claimed: false, reason: 'in-flight' };
  }

  let fingerprint;
  try {
    fingerprint = buildOutboundFingerprint(filePath);
  } catch (error) {
    return { claimed: false, reason: 'missing-or-stat-failed' };
  }

  const now = Date.now();
  pruneExpiredOutboundFingerprints(now);
  if (outboundRecentFingerprints.has(fingerprint)) {
    return { claimed: false, reason: 'recently-processed' };
  }

  outboundInFlight.add(normalizedPath);
  return { claimed: true, normalizedPath, fingerprint };
}

function releaseOutboundClaim(filePath, fingerprint, successful) {
  const normalizedPath = normalizePathForLock(filePath);
  outboundInFlight.delete(normalizedPath);

  if (successful && fingerprint) {
    outboundRecentFingerprints.set(
      fingerprint,
      Date.now() + OUTBOUND_FINGERPRINT_TTL_MS
    );
  }
}

function scheduleOutboundProcessing(filePath, sourceLabel) {
  if (path.extname(filePath).toLowerCase() === '.tmp') {
    return;
  }

  let stats;
  try {
    stats = fs.statSync(filePath);
  } catch {
    return;
  }

  if (!stats.isFile()) {
    return;
  }

  const claim = claimOutboundFile(filePath);
  if (!claim.claimed) {
    return;
  }

  const fileName = path.basename(filePath);
  console.log(`📂 Outbound file claimed from ${sourceLabel}: ${filePath}`);
  console.log(`      File size: ${stats.size} bytes`);
  console.log(`      Modified: ${new Date(stats.mtimeMs).toISOString()}`);
  console.log(`   🚀 Processing ${fileName}...`);

  uploadOut(filePath, 2000, claim.fingerprint).catch(err => {
    console.error(`❌ Upload failed for ${fileName}:`, err);
  });
}

function runOutboundBackupScan() {
  try {
    const files = fs.readdirSync(watchDirO);
    for (const file of files) {
      const filePath = path.join(watchDirO, file);
      scheduleOutboundProcessing(filePath, 'backup-scan');
    }
  } catch (error) {
    console.error('❌ Backup scan error:', error);
  }
}

watcherO.on('ready', () => {
  console.log('✅ File watcher is ready for:', watchDirO);
  
  // Backup polling mechanism - scan folder every 10 seconds
  console.log('🔄 Starting backup file scanner (every 10 seconds)...');
  runOutboundBackupScan();
  setInterval(runOutboundBackupScan, 10000);
});

watcherO.on('error', (error) => {
  console.error('❌ Watcher error:', error);
});

watcherO.on('change', (filePath) => {
  console.log(`🔄 File changed: ${filePath}`);
});

watcherO.on('add', filePath => {
  scheduleOutboundProcessing(filePath, 'watcher-add');
});

watcherO.on('raw', (event, path, details) => {
  console.log(`🔧 Raw event: ${event} on ${path}`);
});

console.log(`👀 Watching for files in ${watchDirO}...`);

console.log(`Watching for files in ${watchDirO}...`);

//MARK: Outbound SNF File Creation
// This function creates an SNF file from the structured JSON data.
async function uploadOut(filePath, delayMs = 2000, claimedFingerprint = null) {
  let successful = false;
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
  successful = true;
} catch (error) {
console.error('Error processing outbound file:', error);
cleanupErroredOutboundFile(filePath);
throw error;
} finally {
releaseOutboundClaim(filePath, claimedFingerprint, successful);
}

}

async function cleanupOutboundFile(filePath) {
const destPath = moveFileToDatedFolder(filePath, 'processedJSON');
if (destPath) {
  console.log(`✅ Successfully processed and moved file to: ${destPath}`);
}
return;
} 

function cleanupErroredOutboundFile(filePath) {
  const destPath = moveFileToDatedFolder(filePath, 'ErroredOutJSONs', false);
  if (destPath) {
    console.log(`❌ Moved errored outbound file to: ${destPath}`);
  }
}


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
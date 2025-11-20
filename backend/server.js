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
const https = require('https');



//Error handling utility
const  readableErrors  = require('./functions/readableErrors.js');


// Send to cleo harmony
const { writeStructuredJSON } = require('./writeJSON.js');
const { writeSNFFile } = require('./writeSNF.js');

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
const { insert861InvexOutbound } = require('./transactions/861/O861_insert_invex.js');
const { transformO861 } = require('./transactions/861/O861_transform.js');
const { LoadO861SNF } = require('./transactions/861/O861_insert_SNF.js');

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
//const duplicate_asn = require('./Postgres/Duplicate_ASNCalls.js'); // Import Duplicate ASN
const custConfig = require('./Postgres/customer_config_calls.js'); // Import Customer Config
const RoutingTrans = require('./Postgres/RoutingTransactionCalls.js'); // Import Routing Transaction
app.use('/CustomerConfiguration', custConfig);
app.use('/RoutingTrans', RoutingTrans);
app.use('/TranslationTable', translation_table);
app.use('/EDI_Tables', edi_tables);
app.use('/api', apiRouter);



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
  uploadIn(filePath)
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
async function uploadIn(filePath, delayMs = 500) {
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
      if (['863','856','861','846'].includes(fieldtransaction)) {
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
      await writeStructuredJSON(structured, path.basename(filePath));

    }
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
      const originalFileName = path.basename(filePath);
       const readableErrorMessage = readableErrors(error, recordCode, originalFileName);
      console.error('-', recordCode, 'here-\n', readableErrorMessage, '\n-', recordCode, '-');
    }
  }







  // Folder to watch
const watchDirO = path.join(__dirname, '../../../../../outboundJSON');

// Initialize watcher
const watcherO = chokidar.watch(watchDirO, {
  persistent: true,
  ignoreInitial: true
});

watcherO.on('add', filePath => {
  if (path.extname(filePath).toLowerCase() === '.tmp') {
    console.log(`Ignoring temporary file: ${filePath}`);
    return;
  }
  console.log(`File added: ${filePath}`);
  uploadOut(filePath)
    .catch(err => console.error('Upload failed:', err));
});

console.log(`Watching for files in ${watchDir}...`);

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
    // let jsonData;
    // try {
    //   jsonData = JSON.parse(flatText);
    // } catch (parseError) {
    //   console.error(`Error parsing JSON from ${filePath}:`, parseError);
    //   return;
    // }

    // // Write formatted JSON to local directory
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

 let CustomerID, Branch ;
    // MARK: 3. Translate Data then call Insert into SNF Tables
      const translationFunction = outboundtranslations[fieldtransaction];
     if (translationFunction) {
       ({ CustomerID, Branch } = await translationFunction(pool2, key, 'O', baseName));
      }

    // MARK 4. Call SNF_Crt function to create structure SNF data 
    const SNF_Crt = createSNF[fieldtransaction];
    if (!SNF_Crt) {
      console.error(`Unsupported field transaction for SNF creation: ${fieldtransaction}`);
      return;
    }
    const snfdata = await SNF_Crt(key, pool2, CustomerID, Branch);
    //MARK: Build flat file string from SNF data
    if (!snfdata || snfdata.length === 0) {
      cleanupOutboundFile(filePath);
      console.error('No SNF data found to create flat file.');
      return;
    }

    // Query layout from the database
    const { rows } = await pool2.query(
              "SELECT snf_code, snf_description, snf_position, snf_length, snf_type, snf_id, snf_elem_id, snf_value, snf_tad_item, snf_codes_comments FROM \"SNFdecoder\" WHERE snf_fieldtransaction = $1 ORDER BY snf_code",
              [fieldtransaction]
            );

              const layout = rows.map(row => ({
                code: row.snf_code,
                description: row.snf_description,
                position: row.snf_position,
                length: row.snf_length
              }));


        // Allow multiple snfs to be sent when multiple records are processed
        await Promise.all(snfdata.map(async (snfdata, index) => {
          let newFileName;
        const flatFileString = snfdata.map(record => {
          newFileName = 'O'+ fieldtransaction +'_' + snfdata[0]['GS Receiver ID'] + '_' + snfdata[0]['Record Key (10-digit integer)']
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

// const localJsonDir = path.join(__dirname, './localStructuredJSON');
//     if (!fs.existsSync(localJsonDir)) {
//       fs.mkdirSync(localJsonDir, { recursive: true });
//     }
//     console.log(newFileName)
//     // Change file extension to .json and write properly formatted JSON
//     const localJsonPath = path.join(localJsonDir, newFileName + '.txt');
//     fs.writeFileSync(localJsonPath, flatFileString, 'utf-8');
//     console.log(`SNF written locally to: ${localJsonPath}`);

// // MARK: 7. Write flat file
   writeSNFFile(flatFileString, newFileName);
}))

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
const destDir = path.join(__dirname, `../../../../../processedJSON/${date}/${folderName}`); // Adjust as needed
const destPath = path.join(destDir, path.basename(filePath));
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}
fs.renameSync(filePath, destPath);
console.log(`✅ Successfully processed and moved file to: ${destPath}`);
return;
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
              const readableErrorMessage = readableErrors(err, recordCode, logFilePath);
              console.error('-', recordCode, '-\n', readableErrorMessage, '\n-', recordCode, '-');
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
const frontend = express();
frontend.use(express.static(path.join(__dirname, '../frontend/build')));
frontend.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/build', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend build not found.');
  }
});


const options = {
  key: fs.readFileSync('../../../../WebApp_Cert/NewWebApp.key'),
  cert: fs.readFileSync('../../../../WebApp_Cert/WebAppCert.pem'),
  ca: fs.readFileSync('../../../../WebApp_Cert/NewWebAppChain.pem')
};

https.createServer(options, frontend).listen(SPA_PORT, () => {
  console.log(`✅ Frontend (build) served at https://localhost:${SPA_PORT}`);
});

https.createServer(options, app).listen(port, () => {
  console.log(`✅ Server running at https://localhost:${port}`);
});
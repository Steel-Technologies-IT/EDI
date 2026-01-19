 const { writeSNFFile } = require('../writeSNF.js');

async function populateSNF(snfdata, pool2, fieldtransaction) {
          //MARK: Build flat file string from SNF data
    if (!snfdata || snfdata.length === 0) {
      cleanupOutboundFile(filePath);
      console.error('No SNF data found to create flat file.');
      return;
    }
  //}
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
 // return populateSNF;
}

module.exports = populateSNF;
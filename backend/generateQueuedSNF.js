const populateSNF = require('./functions/populateSNF.js');
const pool2 = require("./db2.js");
const { transformMap, translations, outboundtranslations, createSNF, inputTablesOutbound, OutBoundInvexTables } = require('./transactions/registry.js');
const fieldtransaction = '870';
const SNF_Crt = createSNF[fieldtransaction];

if (!SNF_Crt) {
  console.error(`Unsupported field transaction for SNF creation: ${fieldtransaction}`);
  return;
}

(async () => {
  // Process 'B' records only if all corresponding 'A' records have been sent
  const O870_Key = await pool2.query(`
    SELECT DISTINCT hdr_key FROM "870_SNF_Header"
    INNER JOIN "870_SNF_ChgInDtl" ON chgindtl_key = hdr_key
    WHERE hdr_ord_itm_cd = 'B' AND hdr_sent_flag = 'N'`);
  let O870Bkey = O870_Key.rows;
  console.log('Found', O870Bkey.length, 'O870B records waiting for O870A');
  for (const O870B of O870Bkey) {
    let allBuildupTagsHaveO870A = 'Y';
    let chgindtlResults = await pool2.query('SELECT * FROM "870_SNF_ChgInDtl" WHERE chgindtl_key = $1', [O870B.hdr_key]);
    let ChgInDtl = chgindtlResults.rows;
    for (const ChgIn of ChgInDtl) {
      const exists = await checkCorrespondingRecord(pool2, ChgIn.chgindtl_chrgintag, 'A', 'Y');
      if (!exists) {
        console.log('O870A missing for buildup tag', ChgIn.chgindtl_chrgintag, 'in O870 key', O870B.hdr_key);
        allBuildupTagsHaveO870A = 'N';
        break;
      }
    }
    if (allBuildupTagsHaveO870A === 'Y') {
      console.log('Processing O870B', O870B.hdr_key);
      await processSNF(O870B.hdr_key, pool2, SNF_Crt, fieldtransaction);
    }
  }

  // Process 'C' and 'D' records only if at least one corresponding 'A' or 'B' record has been sent
  const O870CD_Key = await pool2.query(`
    SELECT DISTINCT hdr_key FROM "870_SNF_Header"
    INNER JOIN "870_SNF_ChgInDtl" ON chgindtl_key = hdr_key
    WHERE (hdr_ord_itm_cd = 'C' OR hdr_ord_itm_cd = 'D') AND hdr_sent_flag = 'N'`);
  let O870CDkey = O870CD_Key.rows;

  for (const O870CD of O870CDkey) {
    let chgindtlResults = await pool2.query('SELECT * FROM "870_SNF_ChgInDtl" WHERE chgindtl_key = $1', [O870CD.hdr_key]);
    let ChgInDtl = chgindtlResults.rows;
    const exists = await checkCorrespondingRecord(pool2, ChgInDtl[0].chgindtl_chrgintag, 'A', 'Y') ||
                  await checkCorrespondingRecord(pool2, ChgInDtl[0].chgindtl_chrgintag, 'B', 'Y');
    if (exists) {
      console.log('Processing O870CD', O870CD.hdr_key);
      await processSNF(O870CD.hdr_key, pool2, SNF_Crt, fieldtransaction);
    }
  }
})();

const checkCorrespondingRecord = async (pool2, tag, ordItmCd, sentFlag) => {
  const query = `
    SELECT hdr_key FROM "870_SNF_Header"
    INNER JOIN "870_SNF_ChgOutDtl" ON chgoutdtl_key = hdr_key
    WHERE hdr_ord_itm_cd = $1 AND hdr_sent_flag = $2
      AND chgoutdtl_chrgouttag = $3`;
  const result = await pool2.query(query, [ordItmCd, sentFlag, tag]);
  return result.rows && result.rows.length > 0 && result.rows[0].hdr_key;
};

const processSNF = async (hdr_key, pool2, SNF_Crt, fieldtransaction) => {
  const CustomerID = await pool2.query('SELECT prd_partcustomerid FROM "870_Invex_ProductItem" WHERE prd_key = $1 ORDER BY prd_itemnumber LIMIT 1', [hdr_key]);
  const Branch = await pool2.query('SELECT ictl_invexbranchcode FROM "870_Invex_InterchangeControl" WHERE ictl_key = $1 LIMIT 1', [hdr_key]);
  console.log('Generating SNF for header key', hdr_key, 'with CustomerID', CustomerID.rows[0].prd_partcustomerid, 'and Branch', Branch.rows[0].ictl_invexbranchcode);

  const result1 = await SNF_Crt(hdr_key, pool2, CustomerID.rows[0].prd_partcustomerid, Branch.rows[0].ictl_invexbranchcode);
  let snfdata1 = result1.multiSNFS;
  let suffixfor870 = result1.suffixfor870;
  populateSNF(snfdata1, pool2, fieldtransaction, suffixfor870);
  await pool2.query('UPDATE "870_SNF_Header" SET hdr_sent_flag = $1 WHERE hdr_key = $2', ['Y', hdr_key]);
};
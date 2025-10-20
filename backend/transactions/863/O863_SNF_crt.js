const trimZeros = require('../../functions/trimtrailingzeros.js');
const chopOffDecimals = require('../../functions/chopoffdecimals.js');
const { evaluatePriority, getPrioritySettings, getAddressPriority } = require('../../functions/evaluatePriority.js');

async function SNFCreateO863(pkey, pool, CustomerID, Branch) {

  let headerResults = await pool.query('SELECT * FROM public."863_SNF_Header" WHERE hdr_key = $1', [pkey]);
  let Header = headerResults.rows[0];
  let detailsResults = await pool.query('SELECT * FROM "863_SNF_Detail" WHERE dtl_key = $1', [pkey]);
  let Detail = detailsResults.rows;
  let namesResults = await pool.query('SELECT * FROM "863_SNF_Names" WHERE name_key = $1', [pkey]);
  let Names = namesResults.rows;
  let measurementsResults = await pool.query('SELECT * FROM "863_SNF_Measure" WHERE msr_key = $1', [pkey]);
  let Measurements = measurementsResults.rows;
  let notesResults = await pool.query('SELECT * FROM "863_SNF_Notes" WHERE note_key = $1', [pkey]);
  let Notes = notesResults.rows;
  let detailnotesResults = await pool.query('SELECT * FROM "863_SNF_DetailNotes" WHERE dtln_key = $1', [pkey]);
  let DetailNotes = detailnotesResults.rows;

  //Load SNF Tables
   let multiSNFS = []
   console.log("Checking for multiple SNFs for pkey:", CustomerID);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_id);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_qual);
  //
   let RoutingSNFsResults = await pool.query(
  'SELECT rte_edi_acct_id FROM public."Routing_SNFs" WHERE rte_cus_id = $1 AND TRIM(rte_isa_id) = $2 AND rte_isa_qual = $3 AND rte_transactions @> ARRAY[$4::varchar]',
  [CustomerID, Header.hdr_ircv_id.trim(), Header.hdr_ircv_qual.trim(), '863']
);
  // let multipleSNFs = multipleSNFsResults.rows;

  if (RoutingSNFsResults.rows.length > 0) {
   await Promise.all(RoutingSNFsResults.rows.map(async row => {
  
      //await getAddressPriority(row.rte_edi_acct_id, Branch, '863', pool);
      let { address_priority_1, address_priority_2, address_priority_3, address_priority_4 } = await getAddressPriority(row.rte_edi_acct_id, Branch, '863', pool);

      let { priority_1, priority_2 } = await getPrioritySettings(row.rte_edi_acct_id, Branch, '863', pool);
      let snf = await writeSNF(pkey, pool, Header, Detail, Names, Measurements, Notes, DetailNotes, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4);
      multiSNFS.push(snf);
  }));
  }


  return multiSNFS;

}

async function writeSNF(pkey, pool, Header, Detail, Names, Measurements, Notes, DetailNotes, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4) {

  let outSNF = []
 console.log("Creating O863 for pkey:", pkey);
  //MARK: CT Record
  let CT = {
      "RECORD TYPE INDICATOR" : "CT",
      "Record Key (10-digit integer)": pkey,
      //ISA Sender ID Qualifier: Not written by AS/400
      "ISA Sender ID": Header.hdr_isnd_id,
      "GS Sender ID": Header.hdr_gsnd_id,
      "ISA Control Number": Header.hdr_ictl_no,
      "GS Functional Group ID": await evaluatePriority(priority_1, priority_2, 'RT', 'GS Functional Group ID', 'CT'), //'RT',
      "GS Control Number": Header.hdr_gctl_no,
      "ISA Receiver ID Qualifier": await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_qual, 'ISA Receiver ID Qualifier', 'CT'), //Header.hdr_ircv_qual,  //ECTRADP1.TPISAQ
      "ISA Receiver ID": await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_id, 'ISA Receiver ID', 'CT'), //Header.hdr_ircv_id,      //ECTRADP1.TPISAI
      "GS Receiver ID": await evaluatePriority(priority_1, priority_2, Header.hdr_grcv_id, 'GS Receiver ID', 'CT'), // Header.hdr_grcv_id,       //ECTRADP1.TPGSID
      "ST Control Number": Header.hdr_stctl_no,   
      "ST Transaction Set ID": '863',
      "Plant ID Code Qualifier": null, // null, // 'Not populated via AS/400 program', // Not written by AS/400
      "Plant ID Code": null, // 'Not populated via AS/400 program', // Not written by AS/400
      "Application System ID":'INVEX',
      "Production/Test Flag": 'P', //P=Production; T=Test
      "Type (T=Toll; M=Margin; D=Direct Ship)" : Header.hdr_type

      }
    CT.record_code = CT["RECORD TYPE INDICATOR"];
    outSNF.push(CT);

    //MARK: 10 Record
    let tenRecord = {
      "RECORD TYPE INDICATOR": "10",
      "Transaction Purpose Code": await evaluatePriority(priority_1, priority_2, Header.hdr_bsn_cd, 'Transaction Purpose Code', '10'), //Header.hdr_bsn_cd,
      "Test Date": await evaluatePriority(priority_1, priority_2, Header.hdr_bsn_dte, 'Test Date', '10'), //Header.hdr_bsn_dte,
      "Test Time": await evaluatePriority(priority_1, priority_2, Header.hdr_bsn_tme.padStart(6, '0'), 'Test Time', '10'), //Header.hdr_bsn_tme,
      "Report Type Code": await evaluatePriority(priority_1, priority_2, Header.hdr_rtyp_cd, 'Report Type Code', '10'),//Header.hdr_rtyp_cd,
      "Reference ID": Header.hdr_shpid,
      "Reference ID-2": null, // 'Not populated via AS/400 program', // Not written by AS/400
      "Shipment ID": Header.hdr_shpid,
      "Shipment Notice/Manifest Number": await evaluatePriority(priority_1, priority_2, Header.hdr_mbol_no, 'Shipment Notice/Manifest Number', '10'),//Header.hdr_mbol_no,
      "Bill Of Lading Number": await evaluatePriority(priority_1, priority_2, Header.hdr_bol_no, 'Bill Of Lading Number', '10'),//Header.hdr_bol_no,
      "Ship Date": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_dte, 'Ship Date', '10'), //Header.hdr_shp_dte,
      "Ship Time": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_tme, 'Ship Time', '10'),// Header.hdr_shp_tme,
      "Ship Time Zone": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_tzn, 'Ship Time Zone', '10'), //Header.hdr_shp_tzn
    }
    tenRecord.record_code = tenRecord["RECORD TYPE INDICATOR"];
    outSNF.push(tenRecord);

    await Promise.all(Notes.map(async (Notes) => {
      //MARK: 11 Record
      let elevenRecord = {
        "RECORD TYPE INDICATOR": "11",
        "Note Reference Code": Notes.note_nref,
        "Note Text": Notes.note_text

      }
      elevenRecord.record_code = elevenRecord["RECORD TYPE INDICATOR"];
      outSNF.push(elevenRecord);
    }));
    
    //Overriding Addresses
let addressList = [];
address_priority_1 ? await Promise.all(address_priority_1.map(async (Name) => {
      //MARK: 11 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde) && Name.name_name.trim() !== '') {
        addressList.push(Name.ediaat_addr_typ_cde);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Contact Name": Name.ediaat_cont_name,
        "Contact Telephone": Name.ediaat_cont_phn,
        "Contact Email": Name.ediaat_cont_eml,
        "Address ID Qualifier": Name.ediaat_id_qual
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);
    }
    })) : null;

    address_priority_2 ? await Promise.all(address_priority_2.map(async (Name) => {
      //MARK: 11 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde) && Name.name_name.trim() !== '') {
        addressList.push(Name.ediaat_addr_typ_cde);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Contact Name": Name.ediaat_cont_name,
        "Contact Telephone": Name.ediaat_cont_phn,
        "Contact Email": Name.ediaat_cont_eml,
        "Address ID Qualifier": Name.ediaat_id_qual
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);
    }
    })) : null

    address_priority_3 ? await Promise.all(address_priority_3.map(async (Name) => {
      //MARK: 11 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde) && Name.name_name.trim() !== '') {
        addressList.push(Name.ediaat_addr_typ_cde);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Contact Name": Name.ediaat_cont_name,
        "Contact Telephone": Name.ediaat_cont_phn,
        "Contact Email": Name.ediaat_cont_eml,
        "Address ID Qualifier": Name.ediaat_id_qual
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);
    }
    })) : null;

    address_priority_4 ? await Promise.all(address_priority_4.map(async (Name) => {
      //MARK: 11 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde) && Name.name_name.trim() !== '') {
        addressList.push(Name.ediaat_addr_typ_cde);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Contact Name": Name.ediaat_cont_name,
        "Contact Telephone": Name.ediaat_cont_phn,
        "Contact Email": Name.ediaat_cont_eml,
        "Address ID Qualifier": Name.ediaat_id_qual
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);
    }
    })) : null;


//JSON Addresses
    await Promise.all(Names.map(async (Names) => {
    //MARK: 15 Record
    if (!addressList.includes(Names.name_qual)  && Names.name_name.trim() !== '') {
        addressList.push(Names.name_qual);
    let fifteenRecord = {
      "RECORD TYPE INDICATOR": "15",
      "AddressTypeCode": Names.name_qual,
      "Address ID Qualifier": Names.name_qual_id,
      "Address ID": Names.name_id,
      "Name": Names.name_name,
      "Additional Name 1":null, // 'Not populated via AS/400 program', // Not written by AS/400
      "Additional Name 2":null, // 'Not populated via AS/400 program', // Not written by AS/400
      "Address Line 1": Names.name_addr1,
      "Address Line 2": Names.name_addr2,
      "City": Names.name_city,
      "State/Province": Names.name_state,
      "Postal Code": Names.name_zip,
      "Customer Country Code": Names.name_ctry_cd,
      "Contact Name": Names.name_cont_name,
      "Contact Telephone": Names.name_cont_phn,
      "Contact Fax": null, // Populated as Blanks in AS/400 
      "Contact Email":Names.name_cont_eml,
      "Responsible Party Code": Names.name_resp
    }
    fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
    outSNF.push(fifteenRecord);
    }}));


    //MARK: 30 Record
    // Filter Detail for unique values based on all properties

 const uniqueLines = [...new Set(Detail.map(d => d.dtl_tag_lot))]; // .reverse();

for (const TagLots of uniqueLines) {

  const Detail30 = Detail.find(d => d.dtl_tag_lot === TagLots)

      let thirtyRecord = {
      "RECORD TYPE INDICATOR": "30",
      "Heat Number": Detail30.dtl_heat,
      "Mill Coil Number": Detail30.dtl_mcoil,
      "Vendor (Mill) Order Number": Detail30.dtl_mo,
      "Vendor (Mill) Item/Line Number": Detail30.dtl_mol,
      "Purchase Order Number": Detail30.dtl_po,
      "Purchase Order Line Number": Detail30.dtl_pol,
      "Part Number": Detail30.dtl_part,
      "Tested Unit (Coil ID)": Detail30.dtl_tst_unt,
      "Next Identifier":null, // 'Not populated via AS/400 program', // Not written by AS/400
      "Purchase Order Date": Detail30.dtl_pod, 
      "Test Performed Date": Detail30.dtl_tdat,
      "Process Date": Detail30.dtl_pdat,
      "Ship-To Idenfier Qualifier":null, // 'Not populated via AS/400 program', // Not written by AS/400
      "Ship-To Idenfier": Detail30.dtl_n1st,
      "Production Date (Mill Manufactured date)": Detail30.dtl_prd_dte,
      "Shipment Date": Detail30.dtl_shp_dte,
      "Material Spec Number":null, // 'Not populated via AS/400 program', // Not written by AS/400
      "Heat Treat (CASH) Date": Detail30.dtl_heat_trt_csh_dte,
      "Lube Application Date": Detail30.dtl_lub_app_dte,
      "Bake Hardening Date": null, // written by AS/400 from TCCHMDP1 . TCDBHDT
      "OP tag number / Previous ID": Detail30.dtl_prev_proc_tag_id,
      "STTX Tag type": await evaluatePriority(priority_1, priority_2, null, 'STTX Tag type', '30'), //null, // written by AS/400 from TCCHMDP1 . TCDSERTYP
      "STTX Tag": await evaluatePriority(priority_1, priority_2, Detail30.dtl_tag_lot, 'STTX Tag', '30'),// Detail30.dtl_tag_lot, // written by AS/400 from TCCHMDP1 . TCDSERN
      "STTX Alternate Tag": null, // written by AS/400 from TCF100RG.P#1RETN	EIO863P2.OTTAG	Serial build coming from TCF100RG
      "Shop order PO": Detail30.dtl_po, // written by AS/400 from SOSOP1P1.SBCUPO
      "Shop order Part": Detail30.dtl_part, // written by AS/400 from SOSOP1P1.SBPART
      "Override PO": null, // written by AS/400 from SOBARTP1.S@PART
      "Override part": null, // written by AS/400 from SOBARTP1.S@CUPO
      "License Plate Number": null, // written by AS/400 from MSBELCP2.MONUMB
      "RAN Number": null, // written by AS/400 from MSRANRP2.E$RAN#
      "RAN Release Number": null, // written by AS/400 from MSRANRP2.E$REL#
    }
    thirtyRecord.record_code = thirtyRecord["RECORD TYPE INDICATOR"];
    outSNF.push(thirtyRecord);

const matchingDetailNotes = DetailNotes.filter(dn =>
      (dn.dtln_tag_lot === Detail30.dtl_tag_lot)
    )

     for (const DetailNotes of matchingDetailNotes) {

   // await Promise.all(DetailNotes.map(async (DetailNotes) => {
      //MARK: 32 Record
      let thirtyTwoRecord = {
        "RECORD TYPE INDICATOR": "32",
        "Comment3": DetailNotes.dtln_text,
        "Comment83":null, // 'Not populated via AS/400 program', // Not written by AS/400
      }
      thirtyTwoRecord.record_code = thirtyTwoRecord["RECORD TYPE INDICATOR"];
      outSNF.push(thirtyTwoRecord);
     }

const matchingMeasurements = Measurements.filter(m =>  (m.msr_tag_lot === Detail30.dtl_tag_lot) )

    for (const Detail40 of matchingMeasurements) {
 
    //MARK: 40 Record
    let fortyRecord = {
      "RECORD TYPE INDICATOR": "40",
      "Measurement Characteristic": Detail40.msr_mchr,
      "Sample Process Status Code": Detail40.msr_spsc,
      "Sample Direction Code": Detail40.msr_sdir,
      "Position Code": Detail40.msr_posc,
      "Test Method Characteristic": Detail40.msr_meth,
      "Agency Qualifier Code": Detail40.msr_agq,
      "Test Description Code": Detail40.msr_dscd,
      "Measurement Reference": Detail40.msr_mea1,// Detail40.msr_mea1,
      "Measurement Qualifier": Detail40.msr_mea2, // Detail40.msr_mea2,
      "Measurement Value": await trimZeros(Detail40.msr_mea3), //Detail40.msr_mea3,
      "Measurement UOM": Detail40.msr_mea4, // Detail40.msr_mea4,
      "Measurement Trace": Detail40.msr_mea3f,
      "Surface/Layer/Position Code": Detail40.msr_mea9,
      "Test Performed Date": null,
      "Process Date": null,
      "Cert Flag (Y/N)": 'Y' // Respected values from file TCCERTLC is populated in AS/400
    }
    fortyRecord.record_code = fortyRecord["RECORD TYPE INDICATOR"];
    outSNF.push(fortyRecord);
  } // End of unique measurements loop

} // End of unique line loop

  //MARK: 80 Record
  let ninetyRecord = {
    "RECORD TYPE INDICATOR": "90",
    "Number of Line Items": Header.hdr_sum_hl_seg,
    "Hash Total": await evaluatePriority(priority_1, priority_2, Header.hdr_sum_hsh_ttl, 'Hash Total', '80'), // Header.hdr_sum_hsh_ttl,
    "Weight": Header.hdr_sum_wgt_ttl
  }
  ninetyRecord.record_code = ninetyRecord["RECORD TYPE INDICATOR"];
  outSNF.push(ninetyRecord);

  return outSNF
}

module.exports = {
  SNFCreateO863
}
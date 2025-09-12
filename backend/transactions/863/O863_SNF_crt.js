const trimTrailingZeros = require('../../functions/trimtrailingzeros.js');


async function SNFCreateO863(pkey, pool) {

  let headerResults = await pool.query('SELECT * FROM public."863_SNF_Header" WHERE hdr_key = $1', [pkey]);
  console.log("Header Results:", headerResults.rows);
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
  let multipleSNFsResults = await pool.query('SELECT * FROM public."Duplicate_SNFs" WHERE dup_cus_id = $1', [global.CustomerID]);
  let multipleSNFs = multipleSNFsResults.rows;
  let snf = await writeSNF(pkey, pool, Header, Detail, Names, Measurements, Notes, DetailNotes);
  multiSNFS.push(snf);
  if (multipleSNFs.length > 0) {
    Header.hdr_isa_qual = multipleSNFs[0].dup_isa_qual;
    Header.hdr_isnd_id = multipleSNFs[0].dup_isnd_id;
    let snf = await writeSNF(pkey, pool, Header, Detail, Names, Measurements, Notes, DetailNotes);
    multiSNFS.push(snf);
  }

  return multiSNFS;

}

async function writeSNF(pkey, pool, Header, Detail, Names, Measurements, Notes, DetailNotes) {

  let outSNF = []
 console.log("Creating O863 for pkey:", pkey);
  //MARK: CT Record
  console.log("O863 Header:", Header);
  let CT = {
      "RECORD TYPE INDICATOR (\"CT\")" : "CT",
      "Record Key (10-digit integer)": pkey,
      //ISA Sender ID Qualifier: Not written by AS/400
      "ISA Sender ID": Header.hdr_isnd_id,
      "GS Sender ID": Header.hdr_gsnd_id,
      "ISA Control Number": Header.hdr_ictl_no,
      "GS Functional Group ID": 'RT',
      "GS Control Number": Header.hdr_gctl_no,
      "ISA Receiver ID Qualifier": Header.hdr_ircv_qual,  //ECTRADP1.TPISAQ
      "ISA Receiver ID": Header.hdr_ircv_id,      //ECTRADP1.TPISAI
      "GS Receiver ID": Header.hdr_grcv_id,       //ECTRADP1.TPGSID
      "ST Control Number": Header.hdr_stctl_no,   
      "ST Transaction Set ID": '863',
      "Plant ID Code Qualifier": 'Not populated via AS/400 program', // Not written by AS/400
      "Plant ID Code": 'Not populated via AS/400 program', // Not written by AS/400
      "Application System ID":'INVEX',
      "Production/Test Flag": 'P', //P=Production; T=Test
      "Type (T=Toll; M=Margin; D=Direct Ship)" : Header.hdr_type

      }
    CT.record_code = CT["RECORD TYPE INDICATOR (\"CT\")"];
    outSNF.push(CT);

    //MARK: 10 Record
    let tenRecord = {
      "RECORD TYPE INDICATOR": "10",
      "Transaction Purpose Code": Header.hdr_bsn_cd,
      "Test Date": Header.hdr_bsn_dte,
      "Test Time": Header.hdr_bsn_tme,
      "Report Type Code": Header.hdr_rtyp_cd,
      "Reference ID": Header.hdr_shpid,
      "Reference ID-2": 'Not populated via AS/400 program', // Not written by AS/400
      "Shipment ID": Header.hdr_shpid,
      "Shipment Notice/Manifest Number": Header.hdr_mbol_no,
      "Bill Of Lading Number": Header.hdr_bol_no,
      "Ship Date": Header.hdr_shp_dte,
      "Ship Time": Header.hdr_shp_tme,
      "Ship Time Zone": Header.hdr_shp_tzn
    }
    tenRecord.record_code = tenRecord["RECORD TYPE INDICATOR"];
    outSNF.push(tenRecord);

    await Promise.all(Names.map(async (Name) => {
      //MARK: 11 Record
      let elevenRecord = {
        "RECORD TYPE INDICATOR": "11",
        "Note Reference Code": Notes.note_nref,
        "Note Text": Notes.note_text

      }
      elevenRecord.record_code = elevenRecord["RECORD TYPE INDICATOR"];
      outSNF.push(elevenRecord);
    }));
    
    //MARK: 15 Record
    let fifteenRecord = {
      "RECORD TYPE INDICATOR": "15",
      "AddressTypeCode": Names.name_qual,
      "Address ID Qualifier": Names.name_qual_id,
      "Address ID": Names.name_id,
      "Name": Names.name_name,
      "Additional Name 1":'Not populated via AS/400 program', // Not written by AS/400
      "Additional Name 2":'Not populated via AS/400 program', // Not written by AS/400
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


    //MARK: 14 -Record not in the SNF structure
    let fourteenRecord = {
      "RECORD TYPE INDICATOR": "14",
      "Route Seq Code": Header.hdr_rte_sq_cd,
      "SCAC Code": Header.hdr_std_car_cd,
      "Transport Method": Header.hdr_tspt_mthd,
      "Transport Route": Header.hdr_tspt_rt_name,
      "Shipment/Order Status Code": Header.hdr_shp_ord_sts,
      "Location ID": Header.hdr_shp_loc_id
    }
    fourteenRecord.record_code = fourteenRecord["RECORD TYPE INDICATOR"];
    outSNF.push(fourteenRecord);


    //MARK: 30 Record
    // Filter Detail for unique values based on all properties
    const uniqueDetailsresults = await pool.query(
      'SELECT DISTINCT * FROM "863_SNF_Detail" WHERE dtl_key = $1', [pkey]
    );
    const uniqueDetails = uniqueDetailsresults.rows
    await Promise.all(uniqueDetails.map(async (Detail30) => {
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
      "Next Identifier":'Not populated via AS/400 program', // Not written by AS/400
      "Purchase Order Date": Detail30.dtl_pod, 
      "Test Performed Date": Detail30.dtl_tdat,
      "Process Date": Detail30.dtl_pdat,
      "Ship-To Idenfier Qualifier":'Not populated via AS/400 program', // Not written by AS/400
      "Ship-To Idenfier": Detail30.dtl_n1st,
      "Production Date (Mill Manufactured date)": Detail30.dtl_prd_dte,
      "Shipment Date": Detail30.dtl_shp_dte,
      "Material Spec Number":'Not populated via AS/400 program', // Not written by AS/400
      "Heat Treat (CASH) Date": Detail30.dtl_heat_trt_csh_dte,
      "Lube Application Date": Detail30.dtl_lub_app_dte,
      "Bake Hardening Date": null, // written by AS/400 from TCCHMDP1 . TCDBHDT
      "OP tag number / Previous ID": Detail30.dtl_prev_proc_tag_id,
      "STTX Tag type": null, // written by AS/400 from TCCHMDP1 . TCDSERTYP
      "STTX Tag": null, // written by AS/400 from TCCHMDP1 . TCDSERN
      "STTX Alternate Tag": null, // written by AS/400 from TCF100RG.P#1RETN	EIO863P2.OTTAG	Serial build coming from TCF100RG
      "Shop order PO": null, // written by AS/400 from SOSOP1P1.SBCUPO
      "Shop order Part": null, // written by AS/400 from SOSOP1P1.SBPART
      "Override PO": null, // written by AS/400 from SOBARTP1.S@PART
      "Override part": null, // written by AS/400 from SOBARTP1.S@CUPO
      "License Plate Number": null, // written by AS/400 from MSBELCP2.MONUMB
      "RAN Number": null, // written by AS/400 from MSRANRP2.E$RAN#
      "RAN Release Number": null, // written by AS/400 from MSRANRP2.E$REL#
    }
    thirtyRecord.record_code = thirtyRecord["RECORD TYPE INDICATOR"];
    outSNF.push(thirtyRecord);

    await Promise.all(DetailNotes.map(async (DetailNotes) => {
      //MARK: 32 Record
      let thirtyTwoRecord = {
        "RECORD TYPE INDICATOR": "32",
        "Comment3": DetailNotes.dtln_text,
        "Comment83":'Not populated via AS/400 program', // Not written by AS/400
      }
      thirtyTwoRecord.record_code = thirtyTwoRecord["RECORD TYPE INDICATOR"];
      outSNF.push(thirtyTwoRecord);
    }));

    const uniqueDetailsresults40 = await pool.query(
      'SELECT DISTINCT * FROM "863_SNF_Measure" WHERE msr_key = $1', [pkey]
    );
    const uniqueDetails40 = uniqueDetailsresults40.rows
    await Promise.all(uniqueDetails40.map(async (Detail40) => {
    
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
      "Measurement Reference": Detail40.msr_mea1,
      "Measurement Qualifier": Detail40.msr_mea2,
      "Measurement Value": Detail40.msr_mea3,
      "Measurement UOM": Detail40.msr_mea4,
      "Measurement Trace": Detail40.msr_mea3f,
      "Surface/Layer/Position Code": Detail40.msr_mea9,
      "Test Performed Date": Detail40.msr_tdat,
      "Process Date": Detail40.msr_pdat,
      "Formal Sert Flag": "YES" // Respected values from file TCCERTLC is populated in AS/400
    }
    fortyRecord.record_code = fortyRecord["RECORD TYPE INDICATOR"];
    outSNF.push(fortyRecord);
  }))
  }));


  //MARK: 80 Record
  let ninetyRecord = {
    "RECORD TYPE INDICATOR": "90",
    "Number of Line Items": Header.hdr_sum_hl_seg,
    "Hash Total": Header.hdr_sum_hsh_ttl,
    "Weight": Header.hdr_sum_wgt_ttl
  }
  ninetyRecord.record_code = ninetyRecord["RECORD TYPE INDICATOR"];
  outSNF.push(ninetyRecord);

  return outSNF
}

module.exports = {
  SNFCreateO863
}
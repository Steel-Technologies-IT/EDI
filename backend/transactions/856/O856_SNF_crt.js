const trimZeros = require('../../functions/trimtrailingzeros.js');
const chopOffDecimals = require('../../functions/chopoffdecimals.js');
const { evaluatePriority, getPrioritySettings, getAddressPriority } = require('../../functions/evaluatePriority.js');
const { get830forreference, get862forreference, get850forreference, get860forreference } = require('./O856_retrieve.js');
async function SNFCreateO856(pkey, pool, CustomerID, Branch ) {

  console.log(pkey)
  let headerResults = await pool.query('SELECT * FROM public."856_SNF_Header" WHERE hdr_key = $1', [pkey]);
  let Header = headerResults.rows[0];
  let detailsResults = await pool.query('SELECT * FROM "856_SNF_Detail" WHERE dtl_key = $1', [pkey]);
  let Detail = detailsResults.rows;
  let namesResults = await pool.query('SELECT * FROM "856_SNF_Names" WHERE name_key = $1', [pkey]);
  let Names = namesResults.rows;
  let measurementsResults = await pool.query('SELECT * FROM "856_SNF_Measure" WHERE msr_key = $1', [pkey]);
  let Measurements = measurementsResults.rows;

   let _850_results = await get850forreference(pool, Detail[0].dtl_cpart, Detail[0].dtl_po, Detail[0].dtl_pol, Detail[0].dtl_rls, Header.hdr_isnd_id, '', null);
   let _850 = _850_results.rows;
   let _860_results = await get860forreference(pool, Detail[0].dtl_cpart, Detail[0].dtl_po, Detail[0].dtl_pol, Detail[0].dtl_rls, Header.hdr_isnd_id, '', null);
   let _860 = _860_results.rows;
   let _830_results = await get830forreference(pool, Detail[0].dtl_cpart, Header.crt_dte, Header.hdr_isnd_id);
   let _830 = _830_results.rows;
   let _862_results = await get862forreference(pool, Detail[0].dtl_cpart, Header.crt_dte, Header.hdr_isnd_id);
   let _862 = _862_results.rows;


   let multiSNFS = []
   console.log("Checking for multiple SNFs for pkey:", CustomerID);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_id);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_qual);
  //
   let RoutingSNFsResults = await pool.query(
  'SELECT rte_edi_acct_id FROM public."Routing_SNFs" WHERE rte_cus_id = $1 AND TRIM(rte_isa_id) = $2 AND rte_isa_qual = $3 AND rte_transactions @> ARRAY[$4::varchar]',
  [CustomerID, Header.hdr_ircv_id.trim(), Header.hdr_ircv_qual, '856']
);
  // let multipleSNFs = multipleSNFsResults.rows;

  if (RoutingSNFsResults.rows.length > 0) {
   await Promise.all(RoutingSNFsResults.rows.map(async row => {
  
      let { address_priority_1, address_priority_2, address_priority_3, address_priority_4 } = await getAddressPriority(row.rte_edi_acct_id, Branch, '856', pool);

      let { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config } = await getPrioritySettings(row.rte_edi_acct_id, Branch, '856', pool);
      let snf = await writeSNF(pkey, pool, Header, Detail, Names, Measurements, _830, _850, _862, _860, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config);
      multiSNFS.push(snf);
  }));
  }


  return multiSNFS;

}

async function writeSNF(pkey, pool, Header, Detail, Names, Measurements, _830, _850, _862, _860, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config) {


  let outSNF = []
 console.log("Creating O856 for pkey:", pkey);
  //MARK: CT Record
  let CT = {
      "RECORD TYPE INDICATOR (\"CT\")" : "CT",
      "Record Key (10-digit integer)": pkey,
      "GS Functional Group ID": await evaluatePriority(priority_1, priority_2, Header.hdr_func_no, 'GS Functional Group ID', 'CT'),
      "ISA Receiver ID Qualifier": await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_qual, 'ISA Receiver ID Qualifier', 'CT'),
      "ISA Receiver ID": await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_id, 'ISA Receiver ID', 'CT'),
      "GS Receiver ID": await evaluatePriority(priority_1, priority_2, Header.hdr_grcv_id, 'GS Receiver ID', 'CT'),
      "ST Transaction Set ID": '856',
      "Application System ID": 'INVEX',
      "Production/Test Flag" : 'P'
      }
    CT.record_code = CT["RECORD TYPE INDICATOR (\"CT\")"];
    await outSNF.push(CT);

    //MARK: 05 Record
    let fiveRecord = {
      "RECORD TYPE INDICATOR": "05",
      "Purpose Code": await evaluatePriority(priority_1, priority_2, Header.hdr_bsn_cd, 'Purpose Code', '05'),
      "ASN Number": await evaluatePriority(priority_1, priority_2, Header.hdr_bsn_no, 'ASN Number', '05'),
      "ASN Date": await evaluatePriority(priority_1, priority_2, Header.hdr_bsn_dte, 'ASN Date', '05'),
      "ASN Time": await evaluatePriority(priority_1, priority_2, Header.hdr_bsn_tme.padStart(6, '0'), 'ASN Time', '05'),
      "Shipment Date": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_dte, 'Shipment Date', '05'),
      "Shipment Time": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_tme, 'Shipment Time', '05'),
      "Shipment Time Zone": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_tzn, 'Shipment Time Zone', '05'),
      "Transaction Type": await evaluatePriority(priority_1, priority_2, Header.hdr_tran_typ, 'Transaction Type', '05'),
      "SCAC": await evaluatePriority(priority_1, priority_2, Header.hdr_scac, 'SCAC', '05'),
      "Metric Flag": await (priority_1_config?.includes('Metric Values') || 
                priority_2_config?.includes('Metric Values') || 
                priority_3_config?.includes('Metric Values')) ? 'Y' : 'N',
      "Shipment Level UOM": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom, 'Shipment Level UOM', '05'),
      "Order Level UOM": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom === 'LB' ? '01' : '50', 'Order Level UOM', '05'),
      "Item Level UOM":  await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom === 'LB' ? '01' : '50', 'Item Level UOM', '05'),
      "Equipment Description Code": await evaluatePriority(priority_1, priority_2, Header.hdr_eq_cd, 'Equipment Description Code', '05'),
      "Daylight Savings Time Flag": await evaluatePriority(priority_1, priority_2, null, 'Daylight Savings Time Flag', '05')
    }
    fiveRecord.record_code = fiveRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fiveRecord);
    //MARK: 10 Record
    let tenRecord = {
      "RECORD TYPE INDICATOR": "10",
      "Ship HL ID": '1',
      "HL Level Code": 'S',
      "Bill of Lading": await evaluatePriority(priority_1, priority_2, Header.hdr_bol_no, 'Bill of Lading', '10'),
      "Master Bill Of Lading Number" : await evaluatePriority(priority_1, priority_2, Header.hdr_mbol_no, 'Master Bill Of Lading Number', '10'),
      "Packing Slip Number" : await evaluatePriority(priority_1, priority_2, Header.hdr_pck_no, 'Packing Slip Number', '10'),
      "Dock Code" : await evaluatePriority(priority_1, priority_2, Header.hdr_dck_cd, 'Dock Code', '10'),
      "Shipment Gross Weight (LB)": await evaluatePriority(priority_1, priority_2, await chopOffDecimals(Header.hdr_shp_grss_wgt_lb), 'Shipment Gross Weight (LB)', '10'),
      "Gross Weight": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_lb ? await chopOffDecimals(Header.hdr_shp_grss_wgt_lb) : await chopOffDecimals(Header.hdr_shp_grss_wgt_kg), 'Gross Weight', '10'),
      "Gross Wt UM": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom, 'Gross Wt UM', '10'),
      "Net Weight": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_net_wgt_lb ? await chopOffDecimals(Header.hdr_shp_net_wgt_lb) : await chopOffDecimals(Header.hdr_shp_net_wgt_kg), 'Net Weight', '10'),
      "Net Wt UM": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_net_wgt_uom, 'Net Wt UM', '10'),
      "Shipment Gross Weight (KG)": await evaluatePriority(priority_1, priority_2, await chopOffDecimals(Header.hdr_shp_grss_wgt_kg), 'Shipment Gross Weight (KG)', '10'),
      "Shipment Gross Weight UOM" : await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom, 'Shipment Gross Weight UOM', '10'),
      "Shipment Net Weight (LB)" : await evaluatePriority(priority_1, priority_2, await chopOffDecimals(Header.hdr_shp_net_wgt_lb), 'Shipment Net Weight (LB)', '10'),
      "Shipment Net Weight (KG)" : await evaluatePriority(priority_1, priority_2, await chopOffDecimals(Header.hdr_shp_net_wgt_kg), 'Shipment Net Weight (KG)', '10'),
      "Shipment Net Weight UOM" : await evaluatePriority(priority_1, priority_2, Header.hdr_shp_net_wgt_uom, 'Shipment Net Weight UOM', '10'),
      "Shipment Total Piece Count" : await evaluatePriority(priority_1, priority_2, Header.hdr_shp_ttl_pc_cnt, 'Shipment Total Piece Count', '10'),
      "Equipment Code" : await evaluatePriority(priority_1, priority_2, Header.hdr_eq_cd, 'Equipment Code', '10'),
      "Conveyance No" : await evaluatePriority(priority_1, priority_2, Header.hdr_eq_nbr, 'Conveyance No', '10'),
      "Payment Method" : await evaluatePriority(priority_1, priority_2, Header.hdr_shp_mthd_pmnt, 'Payment Method', '10'),
      "Equipment Initials (prefix of \"Equip Nbr\")" : await evaluatePriority(priority_1, priority_2, Header.hdr_eq_init, 'Equipment Initials (prefix of \"Equip Nbr\")', '10'),
      "Equipment Number (suffix of \"Equip Initials\")" : await evaluatePriority(priority_1, priority_2, Header.hdr_eq_nbr, 'Equipment Number (suffix of \"Equip Initials\")', '10'),
      "Shipment Method of Payment (FOB-01 value)" : await evaluatePriority(priority_1, priority_2, Header.hdr_shp_mthd_pmnt, 'Shipment Method of Payment (FOB-01 value)', '10'),
      "Ship-From ID (N1-04 value from N1*SF segment)" : await evaluatePriority(priority_1, priority_2, Header.hdr_sf_no, 'Ship-From ID (N1-04 value from N1*SF segment)', '10'),
      "Ship-To ID (N1-04 value from N1*ST segment)" : await evaluatePriority(priority_1, priority_2, Header.hdr_st_no, 'Ship-To ID (N1-04 value from N1*ST segment)', '10'),
      "Shipment HL Level ID" : await evaluatePriority(priority_1, priority_2, Header.hdr_shp_hl, 'Shipment HL Level ID', '10'),
      "Shipment Parent HL Level ID" : await evaluatePriority(priority_1, priority_2, Header.hdr_phl, 'Shipment Parent HL Level ID', '10'),
      "Shipment HL Level Code" : await evaluatePriority(priority_1, priority_2, Header.hdr_shipment_hl_cd, 'Shipment HL Level Code', '10'),
      "Shipment HL Child Code" : await evaluatePriority(priority_1, priority_2, Header.hdr_shipment_hl_ccd, 'Shipment HL Child Code', '10'),
      "Total Piece Count" : await evaluatePriority(priority_1, priority_2, Header.hdr_shp_ttl_pc_cnt, 'Total Piece Count', '10'),
      "Count of Combined BOLs": 1,
      "Combined Load Total Tag Count" : Detail.length,
      "Alt UM Gross Weight": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom === 'LB' ? await chopOffDecimals(Number(Header.hdr_shp_grss_wgt_lb) * 0.45359237) : await chopOffDecimals(Number(Header.hdr_shp_grss_wgt_kg) / 0.45359237), 'Alt UM Gross Weight', '10'),
      "Alt UM (for Gross Weight)": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom === 'LB' ? 'KG' : 'LB', 'Alt UM (for Gross Weight)', '10'),
      "Alt UM Net Weight": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_net_wgt_uom === 'LB' ?  await chopOffDecimals(Number(Header.hdr_shp_net_wgt_lb) * 0.45359237) : await chopOffDecimals(Number(Header.hdr_shp_net_wgt_kg) / 0.45359237), 'Alt UM Net Weight', '10'),
      "Alt UM (for Net Weight)": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_net_wgt_uom === 'LB' ? 'KG' : 'LB', 'Alt UM (for Net Weight)', '10'),
      "Combined Load Total Weight": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom === 'LB' ? await chopOffDecimals(Number(Header.hdr_shp_grss_wgt_lb)) : await chopOffDecimals(Number(Header.hdr_shp_grss_wgt_kg)), 'Combined Load Total Weight', '10'),
      "Combined Load Total Weight UM": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_net_wgt_uom, 'Combined Load Total Weight UM', '10'),
      "Combined Load Total Piece Count": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_itm_cnt, 'Combined Load Total Piece Count', '10'),
      "Pieces in BOL (Y/N)" : Detail.dtl_coil_frm === '1' ? 'N' : 'Y',
      "Responsible Party Alpha Code": await evaluatePriority(priority_1, priority_2, null, 'Responsible Party Alpha Code', '10'), //Customer Config
      "Responsible Party Number Code": await evaluatePriority(priority_1, priority_2, null, 'Responsible Party Number Code', '10'), //Customer Config
      "Load Number": await evaluatePriority(priority_1, priority_2, null, 'Load Number', '10'), //Customer Config
      "Mill Order Number": await evaluatePriority(priority_1, priority_2, Detail[0].dtl_mo ? Detail[0].dtl_mo : null, 'Mill Order Number', '10'),
      "Customer Release Number" : await evaluatePriority(priority_1, priority_2, Detail[0].dtl_cpor ? Detail[0].dtl_cpor : null, 'Customer Release Number', '10')
    }
    tenRecord.record_code = tenRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(tenRecord);

//Overriding Addresses
let addressList = [];
address_priority_1 ? await Promise.all(address_priority_1.map(async (Name) => {
      //MARK: 11 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde)) {
        addressList.push(Name.ediaat_addr_typ_cde);
      let elevenRecord = {
        "RECORD TYPE INDICATOR": "11",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "AddressNo": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Line1": Name.name_addr1,
        "Line2": Name.name_addr2,
        "City": Name.name_city,
        "State": Name.ediaat_state,
        "ZipCode": Name.ediaat_zpcd,
        "CountryCode": Name.ediaat_ctry_cd,
        "ContactName": Name.ediaat_cont_name,
        "ContactPhone": Name.ediaat_cont_phn,
        "ContactEmail": Name.ediaat_cont_eml,
        "Address ID Qualifier": Name.ediaat_id_qual
      }
      elevenRecord.record_code = elevenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(elevenRecord);
    }
    })) : null;

    address_priority_2 ? await Promise.all(address_priority_2.map(async (Name) => {
      //MARK: 11 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde)) {
        addressList.push(Name.ediaat_addr_typ_cde);
      let elevenRecord = {
        "RECORD TYPE INDICATOR": "11",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "AddressNo": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Line1": Name.name_addr1,
        "Line2": Name.name_addr2,
        "City": Name.name_city,
        "State": Name.ediaat_state,
        "ZipCode": Name.ediaat_zpcd,
        "CountryCode": Name.ediaat_ctry_cd,
        "ContactName": Name.ediaat_cont_name,
        "ContactPhone": Name.ediaat_cont_phn,
        "ContactEmail": Name.ediaat_cont_eml,
        "Address ID Qualifier": Name.ediaat_id_qual
      }
      elevenRecord.record_code = elevenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(elevenRecord);
    }
    })) : null

    address_priority_3 ? await Promise.all(address_priority_3.map(async (Name) => {
      //MARK: 11 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde)) {
        addressList.push(Name.ediaat_addr_typ_cde);
      let elevenRecord = {
        "RECORD TYPE INDICATOR": "11",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "AddressNo": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Line1": Name.name_addr1,
        "Line2": Name.name_addr2,
        "City": Name.name_city,
        "State": Name.ediaat_state,
        "ZipCode": Name.ediaat_zpcd,
        "CountryCode": Name.ediaat_ctry_cd,
        "ContactName": Name.ediaat_cont_name,
        "ContactPhone": Name.ediaat_cont_phn,
        "ContactEmail": Name.ediaat_cont_eml,
        "Address ID Qualifier": Name.ediaat_id_qual
      }
      elevenRecord.record_code = elevenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(elevenRecord);
    }
    })) : null;

    address_priority_4 ? await Promise.all(address_priority_4.map(async (Name) => {
      //MARK: 11 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde)) {
        addressList.push(Name.ediaat_addr_typ_cde);
      let elevenRecord = {
        "RECORD TYPE INDICATOR": "11",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "AddressNo": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Line1": Name.name_addr1,
        "Line2": Name.name_addr2,
        "City": Name.name_city,
        "State": Name.ediaat_state,
        "ZipCode": Name.ediaat_zpcd,
        "CountryCode": Name.ediaat_ctry_cd,
        "ContactName": Name.ediaat_cont_name,
        "ContactPhone": Name.ediaat_cont_phn,
        "ContactEmail": Name.ediaat_cont_eml,
        "Address ID Qualifier": Name.ediaat_id_qual
      }
      elevenRecord.record_code = elevenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(elevenRecord);
    }
    })) : null;


//JSON Addresses
    await Promise.all(Names.map(async (Name) => {
      //MARK: 11 Record
      if (!addressList.includes(Name.name_qual)) {
        addressList.push(Name.name_qual);
      let elevenRecord = {
        "RECORD TYPE INDICATOR": "11",
        "AddressTypeCode": Name.name_qual,
        "AddressNo": Name.name_id,
        "Name": Name.name_name,
        "Line1": Name.name_addr1,
        "Line2": Name.name_addr2,
        "City": Name.name_city,
        "State": Name.name_state,
        "ZipCode": Name.name_zpcd,
        "CountryCode": Name.name_ctry_cd,
        "ContactName": Name.name_cont_name,
        "ContactPhone": Name.name_cont_phn,
        "ContactEmail": Name.name_cont_eml,
        "Address ID Qualifier": Name.name_qual_id
      }
      elevenRecord.record_code = elevenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(elevenRecord);}
    }));
    
    //MARK: 12 Record
    let twelveRecord = {
      "RECORD TYPE INDICATOR": "12",
      "Container Type": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_itm_typ, 'Container Type', '12'),
      "Number of Containers": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_ttl_pc_cnt, 'Number of Containers', '12'),
      "Weight Qual": 'G',
      "Weight": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_lb ? Header.hdr_shp_grss_wgt_lb : Header.hdr_shp_grss_wgt_kg, 'Weight', '12'),
      "Weight Uom": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom, 'Weight Uom', '12'),
      "Combined Load Total Weight": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom === 'LB' ? await chopOffDecimals(Number(Header.hdr_shp_grss_wgt_lb)) : await chopOffDecimals(Number(Header.hdr_shp_grss_wgt_kg)), 'Combined Load Total Weight', '12'),
      "Combined Load Total Weight UM": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_net_wgt_uom, 'Combined Load Total Weight UM', '12'),
      "Combined Load Total Piece Count": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_itm_cnt, 'Combined Load Total Piece Count', '12'),
      "Combined Load Total Tag Count" : Detail.length
    }
    twelveRecord.record_code = twelveRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(twelveRecord);

    //MARK: 12 Record
    let twelveRecord2 = {
      "RECORD TYPE INDICATOR": "12",
      "Container Type": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_itm_typ, 'Container Type', '12'),
      "Number of Containers": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_ttl_pc_cnt, 'Number of Containers', '12'),
      "Weight Qual": 'N',
      "Weight": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_net_wgt_lb ? await chopOffDecimals(Number(Header.hdr_shp_net_wgt_lb)) : await chopOffDecimals(Number(Header.hdr_shp_net_wgt_kg)), 'Weight', '12'),
      "Weight Uom": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_net_wgt_uom, 'Weight Uom', '12'),
      "Combined Load Total Weight": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_net_wgt_uom === 'LB' ? await chopOffDecimals(Number(Header.hdr_shp_net_wgt_lb)) : await chopOffDecimals(Number(Header.hdr_shp_net_wgt_kg)), 'Combined Load Total Weight', '12'),
      "Combined Load Total Weight UM": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_net_wgt_uom, 'Combined Load Total Weight UM', '12'),
      "Combined Load Total Piece Count": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_itm_cnt, 'Combined Load Total Piece Count', '12'),
      "Combined Load Total Tag Count" : Detail.length
    }
    twelveRecord2.record_code = twelveRecord2["RECORD TYPE INDICATOR"];
    await outSNF.push(twelveRecord2);


    //MARK: 14 Record
    let fourteenRecord = {
      "RECORD TYPE INDICATOR": "14",
      "Route Seq Code": await evaluatePriority(priority_1, priority_2, Header.hdr_rte_sq_cd, 'Route Seq Code', '14'),
      "SCAC Code": await evaluatePriority(priority_1, priority_2, Header.hdr_scac, 'SCAC Code', '14'),
      "Transport Method": await evaluatePriority(priority_1, priority_2, Header.hdr_tspt_mthd, 'Transport Method', '14'),
      "Transport Route": await evaluatePriority(priority_1, priority_2, Header.hdr_tspt_rt_name, 'Transport Route', '14')
    }
    fourteenRecord.record_code = fourteenRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fourteenRecord);


    //MARK: 30 Record
    // Filter Detail for unique values based on all properties
    // Get unique dtl_hl1 values for 30 records
const uniqueHL1s = [...new Set(Detail.map(d => d.dtl_hl1))].reverse();
let overallindex = 2;
let _30index = 0;




for (const hl1 of uniqueHL1s) {
  // Find the first detail record for this hl1 (for 30 record fields)
  const Detail30 = Detail.find(d => d.dtl_hl1 === hl1);
  const detail40s = Detail.filter(d => d.dtl_hl1 === hl1)
    .sort((a, b) => a.dtl_hl2 - b.dtl_hl2); // Sort ascending by Item HL ID
    let sumofpart = 0;
    for (const Detail40 of detail40s) {
      sumofpart += Detail40.dtl_pc_cnt ? Detail40.dtl_pc_cnt : 0;
    }
for (const Detail40 of detail40s) {
  let thirtyRecord = {
    "RECORD TYPE INDICATOR": "30",
    "Order HL ID": overallindex,
    "HL Parent ID": 1,
    "HL Level Code": 'O',
    "HL Child Code": 1,
    "Part Qualifier": 'BP',
    "Customer Part No": await evaluatePriority(priority_1, priority_2, Detail30.dtl_cpart, 'Customer Part No', '30'),
    "PO No": await evaluatePriority(priority_1, priority_2, Detail30.dtl_cpo, 'PO No', '30'),
    "PO Date": await evaluatePriority(priority_1, priority_2, Detail30.dtl_cpod, 'PO Date', '30'),
    "Alt Part No": await evaluatePriority(priority_1, priority_2, Detail30.dtl_apart, 'Alt Part No', '30'),
    "Release No": await evaluatePriority(priority_1, priority_2, Detail30.dtl_rls, 'Release No', '30'),
    "Engineering Change No": await evaluatePriority(priority_1, priority_2, _862 ? await evaluatePriority(priority_1, priority_2, _862.dtl_eng_chg_l, 'Engineering Change No', '30') : null, 'Engineering Change No', '30'),
    "Mill Order Number": await evaluatePriority(priority_1, priority_2, Detail30.dtl_mo, 'Mill Order Number', '30'),
    "Mill Order Line": await evaluatePriority(priority_1, priority_2, Detail30.dtl_mol, 'Mill Order Line', '30'),
    "Customer PO Release Number": await evaluatePriority(priority_1, priority_2, Detail30.dtl_cpor, 'Customer PO Release Number', '30'),
    "Customer PO Line Number": await evaluatePriority(priority_1, priority_2, Detail30.dtl_cpol, 'Customer PO Line Number', '30'),
   "Order Total Pieces": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_ttl_pc_cnt, 'Order Total Pieces', '30'),
   "Order Total Weight (LB)": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom === 'LB' ? await chopOffDecimals(Detail30.dtl_itm_ttl_weight) : await chopOffDecimals(Detail30.dtl_itm_ttl_weight * 2.20462262185), 'Order Total Weight (LB)', '30'),
   "Order Total Weight (KG)": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom === 'KG' ?  await chopOffDecimals(Detail30.dtl_itm_ttl_weight) : await chopOffDecimals(Detail30.dtl_itm_ttl_weight / 2.20462262185), 'Order Total Weight (KG)', '30'),
   "Pieces in Detail (Y/N)": Detail30.dtl_coil_frm === '1' ? 'N' : 'Y',
   "Prior Cumulative Piece Count": null,//Needs to be defined
   "Prior Cumulative Weight (LB)": null,//Needs to be defined
   "Prior Cumulative Weight (KG)": null,//Needs to be defined
   "New Cumulative Piece Count": null,//Needs to be defined
   "New Cumulative Weight (LB)": null,//Needs to be defined
   "New Cumulative Weight (KG)": null,//Needs to be defined
    "Change Order Sequence Number": await evaluatePriority(priority_1, priority_2, Detail30.dtl_prt_rev_no, 'Change Order Sequence Number', '30'),
    "Special Data 1": await evaluatePriority(priority_1, priority_2, Detail30.dtl_end_ref4, 'Special Data 1', '30'),
    "Special Data 2": await evaluatePriority(priority_1, priority_2, Detail30.dtl_end_ref5, 'Special Data 2', '30'),
    "Responsible Party Alpha Code": await evaluatePriority(priority_1, priority_2, null, 'Responsible Party Alpha Code', '30'),
    "Responsible Party Number Code": await evaluatePriority(priority_1, priority_2, null, 'Responsible Party Number Code', '30'),
    "Override Part Number": await evaluatePriority(priority_1, priority_2, Detail30.dtl_end_ref1, 'Override Part Number', '30'),
    "Override Customer PO#": await evaluatePriority(priority_1, priority_2, Detail30.dtl_end_ref2, 'Override Customer PO#', '30'),
    "Override Supplier ID":  await evaluatePriority(priority_1, priority_2, Detail30.dtl_end_ref3, 'Override Supplier ID', '30'),
    "Ship-To Customer PO#": await evaluatePriority(priority_1, priority_2, Detail30.dtl_po, 'Ship-To Customer PO#', '30'),
    "Ship-To Customer PO Line#": await evaluatePriority(priority_1, priority_2, Detail30.dtl_cpol, 'Ship-To Customer PO Line#', '30'),
    "Cust PO# (Shop)": await evaluatePriority(priority_1, priority_2, Detail30.dtl_po, 'Cust PO# (Shop)', '30'),
    "Cust Release# (Shop)": await evaluatePriority(priority_1, priority_2, Detail30.dtl_cpor, 'Cust Release# (Shop)', '30'),
    "Cust Release# (Mtl Rls)": await evaluatePriority(priority_1, priority_2, Detail30.dtl_cpor, 'Cust Release# (Mtl Rls)', '30'),
    "REF*PO from Inb856 (to be sent back)": null, //Needs to be defined from previous
    "Part Description (Shop)": await evaluatePriority(priority_1, priority_2, Detail30.dtl_partd, 'Part Description (Shop)', '30'),
    "Internal (Shop) Order Number": await evaluatePriority(priority_1, priority_2, (Detail30.dtl_invx_ref_pre || '') + '-' + (Detail30.dtl_invx_ref_no || ''), 'Internal (Shop) Order Number', '30'),
    "Part Total Pieces": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_ttl_pc_cnt, 'Part Total Pieces', '30'),
    "Part Total Weight (LB)": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom === 'LB' ? await chopOffDecimals(Detail30.dtl_prd_itm_weight) : await chopOffDecimals(Detail30.dtl_prd_itm_weight * 2.20462262185), 'Part Total Weight (LB)', '30'),
    "Part Total Weight (KG)": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom === 'KG' ?  await chopOffDecimals(Detail30.dtl_prd_itm_weight) : await chopOffDecimals(Detail30.dtl_prd_itm_weight / 2.20462262185), 'Part Total Weight (KG)', '30'),
    "(I830-PS) Purchase Order#": await evaluatePriority(priority_1, priority_2, _830 ? _830.dtl_po : null, '(I830-PS) Purchase Order#', '30'),
    "(I830-PS) Purchase Order Line#": await evaluatePriority(priority_1, priority_2, _830 ? _830.dtl_pol : null, '(I830-PS) Purchase Order Line#', '30'),
    "(I830-PS) Release#": await evaluatePriority(priority_1, priority_2, _830 ? _830.dtl_rls : null, '(I830-PS) Release#', '30'),
    "(I830-PS) Engineering Change#": await evaluatePriority(priority_1, priority_2, _830 ? _830.dtl_echg : null, '(I830-PS) Engineering Change#', '30'),
    "(I830-PS) MSA#": await evaluatePriority(priority_1, priority_2, _830 ? _830.dtl_msa_no : null, '(I830-PS) MSA#', '30'),
    "(I830-PS) Create Date": await evaluatePriority(priority_1, priority_2, _830 ? _830.dtl_crt_dte : null, '(I830-PS) Create Date', '30'),
    "(I830-PS) Create Time": await evaluatePriority(priority_1, priority_2, _830 ? _830.dtl_crt_tme : null, '(I830-PS) Create Time', '30'),
    "(I862-SS) Purchase Order#": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_po : null, '(I862-SS) Purchase Order#', '30'),
    "(I862-SS) Purchase Order Line#": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_pol : null, '(I862-SS) Purchase Order Line#', '30'),
    "(I862-SS) Release#": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_rls_no : null, '(I862-SS) Release#', '30'),
    "(I862-SS) Engineering Change#": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_eng_chg_l : null, '(I862-SS) Engineering Change#', '30'),
    "(I862-SS) MSA#": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_msa_no : null, '(I862-SS) MSA#', '30'),
    "(I862-SS) Company Part#": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_cpart : null, '(I862-SS) Company Part#', '30'),
    "(I862-SS) Returnable Container#": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_rtn_cont_no : null, '(I862-SS) Returnable Container#', '30'),
    "(I862-SS) HES Code": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_hes_code : null, '(I862-SS) HES Code', '30'),
    "(I862-SS) Prev Customer Reference": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_prv_cust_ref_no : null, '(I862-SS) Prev Customer Reference', '30'),
    "(I862-SS) Create Date": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_crt_dte : null, '(I862-SS) Create Date', '30'),
    "(I862-SS) Create Time": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_crt_tme : null, '(I862-SS) Create Time', '30'),
    "(I830-PS) Delivery Order Number": await evaluatePriority(priority_1, priority_2, _830 ? _830.fcst_do : null, '(I830-PS) Delivery Order Number', '30'),
    "(I862-SS) Delivery Order Number": await evaluatePriority(priority_1, priority_2, _862 ? _862.fcst_do : null, '(I862-SS) Delivery Order Number', '30'),
    "Commodity Code": await evaluatePriority(priority_1, priority_2, Detail30.dtl_coil_frm, 'Commodity Code', '30'),
    "Sold-To Customer PO# (from Mtl rls file)": await evaluatePriority(priority_1, priority_2, Detail30.dtl_po, 'Sold-To Customer PO# (from Mtl rls file)', '30'),
    "Sold-To PO Line# (from Mtl rls file)": await evaluatePriority(priority_1, priority_2, Detail30.dtl_cpol, 'Sold-To PO Line# (from Mtl rls file)', '30'),
    "(I862-SS) Bill of Lading I862 REF*BM": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_bol_no : null, '(I862-SS) Bill of Lading I862 REF*BM', '30'),
    "(I862-SS) Delivery reference number": await evaluatePriority(priority_1, priority_2, _862 ? _862.fcst_dvy_ref : null, '(I862-SS) Delivery reference number', '30'),

  };
  thirtyRecord.record_code = thirtyRecord["RECORD TYPE INDICATOR"];
  await outSNF.push(thirtyRecord);
  _30index = overallindex;
  overallindex = overallindex + 1;
  // 40 Records for this hl1

    let fortyRecord = {
        "RECORD TYPE INDICATOR": "40",
        "Item HL ID": overallindex,
        "HL Parent ID": _30index,
        "HL Level Code": 'I',
        "HL Child Code": 0,
        "Mill Coil Number": await evaluatePriority(priority_1, priority_2, Detail40.dtl_prev ? Detail40.dtl_prev : Detail40.dtl_mcoil, 'Mill Coil Number', '40'),
        "Heat Number": await evaluatePriority(priority_1, priority_2, Detail40.dtl_heat, 'Heat Number', '40'),
        "Grade Code": await evaluatePriority(priority_1, priority_2, Detail40.dtl_grcd, 'Grade Code', '40'),
        "Previous/Processor Tag Nbr": await evaluatePriority(priority_1, priority_2, Detail40.dtl_tag_lot, 'Previous/Processor Tag Nbr', '40'),
        "Net Qty Ship": await evaluatePriority(priority_1, priority_2, Detail40.dtl_pcs, 'Net Qty Ship', '40'),
        "Qty UOM": 'PC',
        "PO No": await evaluatePriority(priority_1, priority_2, Detail40.dtl_po, 'PO No', '40'),
        "PO Date": await evaluatePriority(priority_1, priority_2, Detail40.dtl_pod, 'PO Date', '40'),
        "PO Line No": await evaluatePriority(priority_1, priority_2, Detail40.dtl_pol, 'PO Line No', '40'),
        "Billed Weight": await evaluatePriority(priority_1, priority_2, Detail40.dtl_awgtlb ? await chopOffDecimals(Detail40.dtl_awgtlb) : Detail40.dtl_awgtkg ? await chopOffDecimals(Detail40.dtl_awgtkg) : null, 'Billed Weight', '40'),
        "Billed Wt UM": await evaluatePriority(priority_1, priority_2, Detail40.dtl_awgtlb ? 'LB' : 'KG', 'Billed Wt UM', '40'),
        "Material Classification (AISI table 67)": await evaluatePriority(priority_1, priority_2, Detail40.dtl_mcls_67, 'Material Classification (AISI table 67)', '40'),
        "Material Status (AISI table 70)": '1',
        "Matl Specification Application Nbr": await evaluatePriority(priority_1, priority_2, Detail40.dtl_itm_prt_no, 'Matl Specification Application Nbr', '40'),
        "(STTX) Tag Type": await evaluatePriority(priority_1, priority_2, null, '(STTX) Tag Type', '40'),
        "(STTX) Tag Number": await evaluatePriority(priority_1, priority_2, Detail40.dtl_tag_lot, '(STTX) Tag Number', '40'),
        "RAN Number": null,//Needs to be defined
        "RAN Release Number": null,//Needs to be defined
        "Kanban Number": _862 ? _862.dtl_rtn_cont_no : null,//Needs to be defined
        "Prior Cumulative Piece Count": null,//Needs to be defined
        "Prior Cumulative Weight (LB)": null,//Needs to be defined
        "Prior Cumulative Weight (KG)": null,//Needs to be defined
        "New Cumulative Piece Count": null,//Needs to be defined
        "New Cumulative Weight (LB)": null,//Needs to be defined
        "New Cumulative Weight (KG)": null,//Needs to be defined
        "Change Order Sequence Number": await evaluatePriority(priority_1, priority_2, Detail40.dtl_poc, 'Change Order Sequence Number', '40'),
        "Cust PO# (Bundle Tag/FG Override)": null,//Needs to be defined
        "Cust Rls# (Bundle Tag/FG Override)":null,//Needs to be defined
        "(STTX) Production Number": await evaluatePriority(priority_1, priority_2, Detail40.dtl_heat, '(STTX) Production Number', '40'),
        "Serial Build FG Tag ID": await evaluatePriority(priority_1, priority_2, Detail40.dtl_tag_lot, 'Serial Build FG Tag ID', '40'),
        "Source Mill": await evaluatePriority(priority_1, priority_2, (() => {
          const mill = Names.find(n => n.name_qual === 'MF');
          return mill ? mill.name_addr1 : null;
        })(), 'Source Mill', '40'),
        "Original I856 Gauge (IN)": null,//Needs to be defined    Original ASN
        "Original I856 Gauge (MM)": null,//Needs to be defined    Original ASN
        "Original I856 Gauge Type":null,//Needs to be defined     Original ASN
        "Price/CWT Adjust": null,//Needs to be defined
        "Consumed Coil ID": await evaluatePriority(priority_1, priority_2, Detail40.dtl_ccoil, 'Consumed Coil ID', '40'),
        "License Plate Number": await evaluatePriority(priority_1, priority_2, Detail40.dtl_tag_lot, 'License Plate Number', '40'),   
        "Customer tag number": await evaluatePriority(priority_1, priority_2, Detail40.dtl_tag_lot, 'Customer tag number', '40'),
        "Load Planning From INB 860/850":await evaluatePriority(priority_1, priority_2, _860 ? _860.hdr_load_pln : _850 ? _850.hdr_load_pln : null, 'Load Planning From INB 860/850', '40'),
        "Release# from INB 860/850": await evaluatePriority(priority_1, priority_2, _860 ? _860.dtl_rls : _850 ? _850.dtl_rls : null, 'Release# from INB 860/850', '40'),
        "PO Date from INB 860/850": await evaluatePriority(priority_1, priority_2, _860 ? _860.dtl_po_dte : _850 ? _850.dtl_po_dte : null, 'PO Date from INB 860/850', '40'),
        "Line# from INB 860/850": await evaluatePriority(priority_1, priority_2, _860 ? _860.dtl_line : _850 ? _850.dtl_line : null, 'Line# from INB 860/850', '40'),
        "Part# from INB 860/850": await evaluatePriority(priority_1, priority_2, _860 ? _860.dtl_part : _850 ? _850.dtl_part : null, 'Part# from INB 860/850', '40'),
        "Alternate Part# from INB 860/850": await evaluatePriority(priority_1, priority_2, _860 ? _860.dtl_alt_part : _850 ? _850.dtl_alt_part : null, 'Alternate Part# from INB 860/850', '40')
    };
    fortyRecord.record_code = fortyRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fortyRecord);
    overallindex = overallindex + 1;
    
    // 49 Records for this 40 record (matching measurements)
    const matchingMeasurements = Measurements.filter(m =>
      m.msr_bsn2 === Detail40.dtl_hl2 && m.msr_hl1 === hl1
    )
    
    
    for (const Measure of matchingMeasurements) {
     
      let fortyNineRecord = {
        "RECORD TYPE INDICATOR": "49",
        "Measurement Reference": await evaluatePriority(priority_1, priority_2, Measure.msr_mea1, 'Measurement Reference', '49'),
        "Measurement Qualifier": await evaluatePriority(priority_1, priority_2, Measure.msr_mea2, 'Measurement Qualifier', '49'),
        "Measurement Value": await trimZeros(Measure.msr_mea3),
        "Measurement UOM": await evaluatePriority(priority_1, priority_2, Measure.msr_mea4, 'Measurement UOM', '49')
      };
      fortyNineRecord.record_code = fortyNineRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fortyNineRecord);
    }
  }
}

//MARK: 80 Record
  let eightyRecord = {
    "RECORD TYPE INDICATOR": "80",
    "No HL or LIN": overallindex - 1,
    "Total Line Qtys": await evaluatePriority(priority_1, priority_2, Header.hdr_sum_hsh_ttl, 'Total Line Qtys', '80'),
  }
  eightyRecord.record_code = eightyRecord["RECORD TYPE INDICATOR"];
  outSNF.push(eightyRecord);


  return outSNF
}

module.exports = {
  SNFCreateO856
}

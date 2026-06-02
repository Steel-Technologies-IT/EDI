const trimZeros = require('../../functions/trimtrailingzeros.js');
const { evaluatePriority, getPrioritySettings, getAddressPriority } = require('../../functions/evaluatePriority.js');
const { get830forreference, get862forreference, get850forreference, get860forreference } = require('./O856_retrieve.js');
const as400Service = require('../../as400/callLoadNumber.js');
const getDSTFlag = require('../../functions/retrieveDST.js');

const toNum = (v) => {
      if (v === undefined || v === null || v === '') return 0;
      const n = Number(String(v).replace(/[^0-9.-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    }; 
const roundoff = v => Math.round(toNum(v));

async function SNFCreateO856(pkey, pool, CustomerID, Branch, tradingPartner, loadNumber) {

let multiSNFS = []
let headerset = await pool.query('SELECT * FROM public."856_SNF_Header" WHERE hdr_key = $1', [pkey]);
// Filter for unique headers based on hdr_bol_suffix, prioritizing '0' suffix
const uniqueHeaders = [];
let sawZeroSuffix = false;
for (const row of headerset.rows) {
  if (row.hdr_bol_suffix === '0') {
    if (!sawZeroSuffix) {
      uniqueHeaders.push(row);
      sawZeroSuffix = true;
    }
  } else {
    uniqueHeaders.push(row);
  }
}
if (uniqueHeaders.length > 0) {
  await Promise.all(uniqueHeaders.map(async snfset => {

  let headerResults = await pool.query('SELECT * FROM public."856_SNF_Header" WHERE hdr_key = $1 AND hdr_bol_suffix = $2', [pkey, snfset.hdr_bol_suffix]);
  let Header = headerResults.rows[0];
  let Headers = headerResults.rows;
  let detailsResults = await pool.query('SELECT * FROM "856_SNF_Detail" WHERE dtl_key = $1 AND dtl_bol_suffix = $2', [pkey, snfset.hdr_bol_suffix]);
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
  
   console.log("Checking for multiple SNFs for pkey:", CustomerID);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_id);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_qual);
  //
   let RoutingSNFsResults = await pool.query(
  'SELECT rte_edi_acct_id FROM public."Routing_SNFs" WHERE rte_cus_id = $1 AND TRIM(rte_isa_id) LIKE $2 AND rte_isa_qual = $3 AND rte_transactions @> ARRAY[$4::varchar]',
  [CustomerID, `${Header.hdr_ircv_id.trim()}%`, Header.hdr_ircv_qual, '856']
);
console.log(RoutingSNFsResults.rows);

  // let multipleSNFs = multipleSNFsResults.rows;
if (tradingPartner && tradingPartner.length > 0) {
      let { address_priority_1, address_priority_2, address_priority_3, address_priority_4 } = await getAddressPriority(tradingPartner, Branch, '856', pool);
      let trading_partner_info_results = await pool.query(
        'SELECT * FROM public."EDI_Accounts" WHERE edia_edi_account_id = $1',
        [tradingPartner]
      );
      let trading_partner_info = trading_partner_info_results.rows[0];
      let location = Branch.toString().slice(-2);
      let { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config } = await getPrioritySettings(tradingPartner, Branch, '856', pool);
      let splitFlag = await (priority_1_config?.includes('ASN/SNF Split at Sales Order/Line#') || 
                priority_2_config?.includes('ASN/SNF Split at Sales Order/Line#') || 
                priority_3_config?.includes('ASN/SNF Split at Sales Order/Line#')) ? 'Y' : 'N';
      // Get related transactions data   
      isa_rcv_id = await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_id, 'ISA Receiver ID', 'CT');
      let _862 = [];
      if ((splitFlag === 'N' && Header.hdr_bol_suffix === '0') || (splitFlag === 'Y' && Header.hdr_bol_suffix !== '0')) {

      let snf = await writeSNF(pkey, pool, Header, Detail, Names, Measurements, _830, _850, _862, _860, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location, loadNumber, Headers, splitFlag);
      multiSNFS.push(snf);
      }
} else {
  if (RoutingSNFsResults.rows.length > 0) {
   await Promise.all(RoutingSNFsResults.rows.map(async row => {
  
      let { address_priority_1, address_priority_2, address_priority_3, address_priority_4 } = await getAddressPriority(row.rte_edi_acct_id, Branch, '856', pool);
      let trading_partner_info_results = await pool.query(
  'SELECT * FROM public."EDI_Accounts" WHERE edia_edi_account_id = $1',
  [row.rte_edi_acct_id]
);
      let trading_partner_info = trading_partner_info_results.rows[0];
      let location = Branch.toString().slice(-2);
      let { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config } = await getPrioritySettings(row.rte_edi_acct_id, Branch, '856', pool);
      let splitFlag = await (priority_1_config?.includes('ASN/SNF Split at Sales Order/Line#') ||
                priority_2_config?.includes('ASN/SNF Split at Sales Order/Line#') ||
                priority_3_config?.includes('ASN/SNF Split at Sales Order/Line#')) ? 'Y' : 'N';
      // Get related transactions data   
      isa_rcv_id = await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_id, 'ISA Receiver ID', 'CT');
      let _862 = [];
      if ((splitFlag === 'N' && Header.hdr_bol_suffix === '0') || (splitFlag === 'Y' && Header.hdr_bol_suffix !== '0')) {
      let snf = await writeSNF(pkey, pool, Header, Detail, Names, Measurements, _830, _850, _862, _860, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location, loadNumber, Headers, splitFlag);
      multiSNFS.push(snf);
      }
  }));
  }
}

  }))}

  return multiSNFS;

}

function getValidDate(dateValue) {
    return (
        dateValue &&
        String(dateValue).trim() !== '' &&
        String(dateValue) !== '0' &&
        String(dateValue) !== '00000000'
    )
        ? dateValue
        : null;
}

async function writeSNF(pkey, pool, HeaderRcd, Detail, Names, Measurements, _830, _850, _862, _860, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location, loadNumber, Headers, splitFlag) {

  let outSNF = []
 console.log("Creating O856 for pkey:", pkey);
  //MARK: CT Record
  let CT = {
      "RECORD TYPE INDICATOR (\"CT\")" : "CT",
      "Record Key (10-digit integer)": pkey,
      "GS Functional Group ID": await evaluatePriority(priority_1, priority_2, HeaderRcd.hdr_func_no, 'GS Functional Group ID', 'CT'),
      "ISA Receiver ID Qualifier": await evaluatePriority(priority_1, priority_2, HeaderRcd.hdr_ircv_qual, 'ISA Receiver ID Qualifier', 'CT'),
      "ISA Receiver ID": await evaluatePriority(priority_1, priority_2, HeaderRcd.hdr_ircv_id, 'ISA Receiver ID', 'CT'),
      "GS Receiver ID": await evaluatePriority(priority_1, priority_2, HeaderRcd.hdr_grcv_id, 'GS Receiver ID', 'CT'),
      "ST Transaction Set ID": '856',
      "Application System ID": 'INVEX',
      "Production/Test Flag" : 'P'
      }
    CT.record_code = CT["RECORD TYPE INDICATOR (\"CT\")"];
    await outSNF.push(CT);

    // calculate combined weight for multiple BOLs if necessary
    // Calculate net weight in LB using dtl_awgtkg with KG to LB conversion, and sum it up for all details
    const getWeight = p => {
    const n = Number(p?.dtl_awgtkg||0)* 2.20462; //KG -> LB conversion
      return Number.isFinite(n) ? roundoff(n) : 0;
    };
    const DetailWeightLb = Array.isArray(Detail)
      ? Detail.reduce((sum, p) => sum + getWeight(p), 0)
      : getWeight(Detail);

    const HeaderWeightLb = Headers.reduce((sum, item) => sum + (Number(item.hdr_shp_net_wgt_lb) || 0), 0);

    const CombinedWeight = HeaderRcd.hdr_shp_net_wgt_uom === 'LB' ? await roundoff(Number(HeaderWeightLb)) : await roundoff(Number(DetailWeightLb)); 
    const CombinedPieces = Detail.reduce((sum, item) => sum + (Number(item.dtl_pcs) || 0), 0);
    const CombinedTags = Detail.length;
    const CombinedBOLCnt = splitFlag === 'Y' ? 1 : Headers.filter(h => h.hdr_bol_suffix === '0').length;
    console.log(`Combined Weight (LB) for all details: ${CombinedWeight}`, `Header Weight (LB): ${HeaderWeightLb}`, `Detail Weight (LB): ${DetailWeightLb}`);
    console.log(`Combined Pieces for all details: ${CombinedPieces}`);
    console.log(`Combined Tags for all details: ${CombinedTags}`);
    console.log(`Combined BOL Count: ${CombinedBOLCnt}`);

    const uniqueBSN_no = [...new Set(Headers.map(h => h.hdr_bsn_no))]
    .sort((a, b) => a.localeCompare(b));

    for (const BSN_no of uniqueBSN_no) {

    const Header = Headers.find(h => h.hdr_bsn_no === BSN_no);
    const DetailbyBsnNo = Detail.filter(d => d.dtl_bsn_no === Header.hdr_bsn_no); 
    const hdrNetWeightLB = Array.isArray(DetailbyBsnNo)
      ? DetailbyBsnNo.reduce((sum, p) => sum + getWeight(p), 0)
      : getWeight(DetailbyBsnNo);
    console.log(`Calculated Net Weight (LB) for BSN No ${Header.hdr_bsn_no}: ${hdrNetWeightLB} LB`);
  
      // Calculate net weight in KG using dtl_awgtlb with LB to KG conversion, and sum it up for all details
      const getWeightKG = p => {
      const n = Number(p?.dtl_awgtlb||0)* 0.453592; //LB -> KG conversion
      return Number.isFinite(n) ? roundoff(n) : 0;
    };
    const hdrNetWeightKG = Array.isArray(DetailbyBsnNo)
      ? DetailbyBsnNo.reduce((sum, p) => sum + getWeightKG(p), 0)
      : getWeightKG(DetailbyBsnNo);
    
    //MARK: 05 Record
    let fiveRecord = {
      "RECORD TYPE INDICATOR": "05",
      "Purpose Code": await evaluatePriority(priority_1, priority_2, Header.hdr_bsn_cd, 'Purpose Code', '05'),
      "ASN Number": await evaluatePriority(priority_1, priority_2, Header.hdr_bsn_no, 'ASN Number', '05'),
      "ASN Date": await evaluatePriority(priority_1, priority_2, await getValidDate(Header.hdr_bsn_dte), 'ASN Date', '05'),
      "ASN Time": await evaluatePriority(priority_1, priority_2, await getValidDate(Header.hdr_bsn_dte) ? String(Header.hdr_bsn_tme).padStart(6, '0') : null, 'ASN Time', '05'),
      "Shipment Date": await evaluatePriority(priority_1, priority_2, await getValidDate(Header.hdr_shp_dte), 'Shipment Date', '05'), 
      "Shipment Time": await evaluatePriority(priority_1, priority_2, await getValidDate(Header.hdr_shp_dte) ? String(Header.hdr_shp_tme).padStart(6, '0') : null, 'Shipment Time', '05'),
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
      "Daylight Savings Time Flag": await evaluatePriority(priority_1, priority_2, getDSTFlag(Header.hdr_crt_dat + String(Header.hdr_crt_tim).padStart(6, '0'), "America/New_York"), 'Daylight Savings Time Flag', '05')
    }
    fiveRecord.record_code = fiveRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fiveRecord);
    //MARK: 10 Record
    let tenRecordNetWeightLb = Header.hdr_shp_net_wgt_lb ? await roundoff(Header.hdr_shp_net_wgt_lb) : await roundoff(hdrNetWeightLB);
    let tenRecordGrossWeightLb = Header.hdr_shp_grss_wgt_lb ? await roundoff(Header.hdr_shp_grss_wgt_lb) : await roundoff(Number(Header.hdr_shp_grss_wgt_kg) * 2.20462);
    tenRecordGrossWeightLb = tenRecordNetWeightLb >= tenRecordGrossWeightLb - 11 ? tenRecordNetWeightLb : tenRecordGrossWeightLb; // If gross weight is less than 11 lbs above net weight, use net weight as gross weight to avoid discrepancies
    let tenRecordNetWeightKg = Header.hdr_shp_net_wgt_uom === 'LB' ?  await roundoff(hdrNetWeightKG) : await roundoff(Number(Header.hdr_shp_net_wgt_kg));
    let tenRecordGrossWeightKg = Header.hdr_shp_grss_wgt_uom === 'LB' ? await roundoff(Number(Header.hdr_shp_grss_wgt_lb) * 0.45359237) : await roundoff(Number(Header.hdr_shp_grss_wgt_kg));
    tenRecordGrossWeightKg = tenRecordNetWeightKg >= tenRecordGrossWeightKg - 5 ? tenRecordNetWeightKg : tenRecordGrossWeightKg; // If gross weight is less than 5 kg above net weight, use net weight as gross weight to avoid discrepancies
    let tenRecord = {
      "RECORD TYPE INDICATOR": "10",
      "Ship HL ID": '1',
      "HL Level Code": 'S',
      "Bill of Lading": await evaluatePriority(priority_1, priority_2, Header.hdr_bol_no, 'Bill of Lading', '10'),
      "Mst Bill Lading" : await evaluatePriority(priority_1, priority_2, Header.hdr_mbol_no, 'Master Bill Of Lading Number', '10'),
      "Packing Slip Number" : await evaluatePriority(priority_1, priority_2, Header.hdr_pck_no, 'Packing Slip Number', '10'),
      "Dock Code" : await evaluatePriority(priority_1, priority_2, Header.hdr_dck_cd, 'Dock Code', '10'),
      "Shipment Gross Weight (LB)": await evaluatePriority(priority_1, priority_2, await roundoff(Header.hdr_shp_grss_wgt_lb), 'Shipment Gross Weight (LB)', '10'),
      "Gross Weight": await evaluatePriority(priority_1, priority_2, tenRecordGrossWeightLb, 'Gross Weight', '10'),
      "Gross Wt UM": await evaluatePriority(priority_1, priority_2, 'LB', 'Gross Wt UM', '10'),
      "Net Weight": await evaluatePriority(priority_1, priority_2, tenRecordNetWeightLb, 'Net Weight', '10'),
      "Net Wt UM": await evaluatePriority(priority_1, priority_2, 'LB', 'Net Wt UM', '10'),
      "Shipment Gross Weight (KG)": await evaluatePriority(priority_1, priority_2, await roundoff(Header.hdr_shp_grss_wgt_kg), 'Shipment Gross Weight (KG)', '10'),
      "Shipment Gross Weight UOM" : await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom, 'Shipment Gross Weight UOM', '10'),
      "Shipment Net Weight (LB)" : await evaluatePriority(priority_1, priority_2, await roundoff(Header.hdr_shp_net_wgt_lb), 'Shipment Net Weight (LB)', '10'),
      "Shipment Net Weight (KG)" : await evaluatePriority(priority_1, priority_2, await roundoff(Header.hdr_shp_net_wgt_kg), 'Shipment Net Weight (KG)', '10'),
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
      "Count of Combined BOLs": CombinedBOLCnt,
      "Combined Load Total Tag Count" : CombinedTags,
      "Alt UM Gross Weight": await evaluatePriority(priority_1, priority_2, tenRecordGrossWeightKg, 'Alt UM Gross Weight', '10'),
      "Alt UM (for Gross Weight)": await evaluatePriority(priority_1, priority_2, 'KG','Alt UM (for Gross Weight)', '10'),
      "Alt UM Net Weight": await evaluatePriority(priority_1, priority_2, tenRecordNetWeightKg, 'Alt UM Net Weight', '10'),
      "Alt UM (for Net Weight)": await evaluatePriority(priority_1, priority_2,  'KG', 'Alt UM (for Net Weight)', '10'),
      "Combined Load Total Weight": await evaluatePriority(priority_1, priority_2, CombinedWeight, 'Combined Load Total Weight', '10'),
      "Combined Load Total Weight UM": await evaluatePriority(priority_1, priority_2, 'LB', 'Combined Load Total Weight UM', '10'),
      "Combined Load Total Piece Count": await evaluatePriority(priority_1, priority_2, CombinedPieces, 'Combined Load Total Piece Count', '10'),
      "Pieces in BOL (Y/N)" : Detail[0].dtl_coil_frm === '01' ? 'N' : 'Y',
      "Responsible Party Alpha Code": await evaluatePriority(priority_1, priority_2, null, 'Responsible Party Alpha Code', '10'), //Customer Config
      "Responsible Party Number Code": await evaluatePriority(priority_1, priority_2, null, 'Responsible Party Number Code', '10'), //Customer Config
      "Load Number": await (async () => {
        if (loadNumber) {
          return loadNumber;
        }
        if (priority_1_config?.includes('Mill Load Number') || 
            priority_2_config?.includes('Mill Load Number') || 
            priority_3_config?.includes('Mill Load Number')) {
          try {
            if(trading_partner_info) {
              const result = await as400Service.callLoadNumber(location, trading_partner_info.edia_as400_xref);
              console.log("AS400 result: ", result);
              await pool.query('UPDATE public."856_SNF_Header" SET hdr_load_nbr = $1 WHERE hdr_key = $2', [result.loadNumber, pkey]);
              return result.loadNumber;
            }
          } catch (error) {
            console.error('Error calling AS400 for load number:', error);
            return null; // Return null if AS400 call fails
          }
        }
        return null;
      })(), //Customer Config
      "Mill Order Number": await evaluatePriority(priority_1, priority_2, Detail[0].dtl_mo ? Detail[0].dtl_mo : null, 'Mill Order Number', '10'),
      "Customer Release Number" : await evaluatePriority(priority_1, priority_2, Detail[0].dtl_cpor ? Detail[0].dtl_cpor : null, 'Customer Release Number', '10')
    }
    tenRecord.record_code = tenRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(tenRecord);

//Address Processing Logic
let addressList = [];

// Process JSON Addresses as the base
await Promise.all(Names.map(async (Name) => {
  //MARK: 11 Record
  if (!addressList.includes(Name.name_qual)) {
    addressList.push(Name.name_qual);
    
    // Check for priority overrides in order: 1, 2, 3, 4
    let priorityOverride = null;
    
    // Priority 1 check
    if (address_priority_1) {
      priorityOverride = address_priority_1.find(addr => addr.ediaat_addr_typ_cde === Name.name_qual);
    }
    
    // Priority 2 check (if not found in priority 1)
    if (!priorityOverride && address_priority_2) {
      priorityOverride = address_priority_2.find(addr => addr.ediaat_addr_typ_cde === Name.name_qual);
    }
    
    // Priority 3 check (if not found in priority 1 or 2)
    if (!priorityOverride && address_priority_3) {
      priorityOverride = address_priority_3.find(addr => addr.ediaat_addr_typ_cde === Name.name_qual);
    }
    
    // Priority 4 check (if not found in priority 1, 2, or 3)
    if (!priorityOverride && address_priority_4) {
      priorityOverride = address_priority_4.find(addr => addr.ediaat_addr_typ_cde === Name.name_qual);
    }
    
    // Determine final values for AddressNo and Address ID Qualifier
    const finalAddressNo = priorityOverride ? priorityOverride.ediaat_addr_id : Name.name_id;
    const finalAddressIdQualifier = priorityOverride ? priorityOverride.ediaat_id_qual : Name.name_qual_id;
    
    // Skip record if AddressNo or Address ID Qualifier is null, undefined, or blank
    if (!finalAddressNo || finalAddressNo.toString().trim() === '' || 
        !finalAddressIdQualifier || finalAddressIdQualifier.toString().trim() === '') {
      console.log(`Skipping address record for ${Name.name_qual} - AddressNo or Address ID Qualifier is null/blank`);
      return; // Skip this record
    }
    
    let elevenRecord = {
      "RECORD TYPE INDICATOR": "11",
      "AddressTypeCode": Name.name_qual,
      "AddressNo": finalAddressNo,
      // Use JSON values for all other fields
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
      "Address ID Qualifier": finalAddressIdQualifier
    };
    
    elevenRecord.record_code = elevenRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(elevenRecord);
  }
}));

// Add any priority addresses that don't exist in JSON (for address types not in JSON)
const processRemainingPriorityAddresses = async (priorityAddresses) => {
  if (priorityAddresses) {
    await Promise.all(priorityAddresses.map(async (Name) => {
      if (!addressList.includes(Name.ediaat_addr_typ_cde)) {
        addressList.push(Name.ediaat_addr_typ_cde);
        
        // Skip record if AddressNo or Address ID Qualifier is null, undefined, or blank
        if (!Name.ediaat_addr_id || Name.ediaat_addr_id.toString().trim() === '' || 
            !Name.ediaat_id_qual || Name.ediaat_id_qual.toString().trim() === '') {
          console.log(`Skipping priority address record for ${Name.ediaat_addr_typ_cde} - AddressNo or Address ID Qualifier is null/blank`);
          return; // Skip this record
        }
        
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
        };
        elevenRecord.record_code = elevenRecord["RECORD TYPE INDICATOR"];
        await outSNF.push(elevenRecord);
      }
    }));
  }
};

// Process remaining addresses from priorities (address types not in JSON)
await processRemainingPriorityAddresses(address_priority_1);
await processRemainingPriorityAddresses(address_priority_2);
await processRemainingPriorityAddresses(address_priority_3);
await processRemainingPriorityAddresses(address_priority_4);
    
    //MARK: 12 Record
    let twelveRecordGrossWeight = Header.hdr_shp_grss_wgt_uom === 'LB' ? tenRecordGrossWeightLb : tenRecordGrossWeightKg;
    let twelveRecord = {
      "RECORD TYPE INDICATOR": "12",
      "Container Type": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_itm_typ, 'Container Type', '12'),
      "Number of Containers": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_ttl_pc_cnt, 'Number of Containers', '12'),
      "Weight Qual": 'G',
      "Weight": await evaluatePriority(priority_1, priority_2, twelveRecordGrossWeight, 'Weight', '12'),
      "Weight Uom": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_grss_wgt_uom, 'Weight Uom', '12'),
      "Combined Load Total Weight": await evaluatePriority(priority_1, priority_2, CombinedWeight, 'Combined Load Total Weight', '12'),
      "Combined Load Total Weight UM": await evaluatePriority(priority_1, priority_2, 'LB', 'Combined Load Total Weight UM', '12'),
      "Combined Load Total Piece Count": await evaluatePriority(priority_1, priority_2, CombinedPieces, 'Combined Load Total Piece Count', '12'),
      "Combined Load Total Tag Count" : CombinedTags
    }
    twelveRecord.record_code = twelveRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(twelveRecord);

    //MARK: 12 Record
    let twelveRecord2 = {
      "RECORD TYPE INDICATOR": "12",
      "Container Type": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_itm_typ, 'Container Type', '12'),
      "Number of Containers": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_ttl_pc_cnt, 'Number of Containers', '12'),
      "Weight Qual": 'N',
      "Weight": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_net_wgt_lb ? await roundoff(Number(Header.hdr_shp_net_wgt_lb)) : await roundoff(Number(Header.hdr_shp_net_wgt_kg)), 'Weight', '12'),
      "Weight Uom": await evaluatePriority(priority_1, priority_2, Header.hdr_shp_net_wgt_uom, 'Weight Uom', '12'),
      "Combined Load Total Weight": await evaluatePriority(priority_1, priority_2, CombinedWeight, 'Combined Load Total Weight', '12'),
      "Combined Load Total Weight UM": await evaluatePriority(priority_1, priority_2, 'LB', 'Combined Load Total Weight UM', '12'),
      "Combined Load Total Piece Count": await evaluatePriority(priority_1, priority_2, CombinedPieces, 'Combined Load Total Piece Count', '12'),
      "Combined Load Total Tag Count" : CombinedTags
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
//const uniqueHL1s = [...new Set(Detail.map(d => d.dtl_hl1))].reverse();
const uniqueHL1s = [...new Set(Detail.filter(d => d.dtl_bsn_no === Header.hdr_bsn_no).map(d => d.dtl_hl1))].reverse();
let overallindex = 2;
let _30index = 0;

let partTotals = {}
//const DetailbyBsnNo = Detail.filter(d => d.dtl_bsn_no === Header.hdr_bsn_no);
for (const Dtl of DetailbyBsnNo) {
  const matchingMeasurements = await Measurements.filter(m =>
      m.msr_bsn2 === Dtl.dtl_hl2 && m.msr_hl1 === Dtl.dtl_hl1 && m.msr_bsn_no === Dtl.dtl_bsn_no
    )
  partTotals[Dtl.dtl_cpart] = {
    ttl_pc: Number((partTotals[Dtl.dtl_cpart]?.ttl_pc || 0)) + Number(Dtl.dtl_pcs),
    ttl_wgt_lb: Number(partTotals[Dtl.dtl_cpart]?.ttl_wgt_lb || 0) + Number(matchingMeasurements.find(m => m.msr_mea4 === '01' && m.msr_mea1 === 'WT')?.msr_mea3 || 0),
    ttl_wgt_kg: Number(partTotals[Dtl.dtl_cpart]?.ttl_wgt_kg || 0) + Number(matchingMeasurements.find(m => m.msr_mea4 === '50' && m.msr_mea1 === 'WT')?.msr_mea3 || 0)
  };
}

let shopTotals = {}
for (const Dtl of DetailbyBsnNo) {
  const matchingMeasurements = await Measurements.filter(m =>
      m.msr_bsn2 === Dtl.dtl_hl2 && m.msr_hl1 === Dtl.dtl_hl1 && m.msr_bsn_no === Dtl.dtl_bsn_no
    )
    console.log('WEIGHTS', matchingMeasurements.find(m => m.msr_mea4 === '01' && m.msr_mea1 === 'WT')?.msr_mea3)
    console.log('WEIGHTS 2.0', Number(matchingMeasurements.find(m => m.msr_mea4 === '01' && m.msr_mea1 === 'WT')?.msr_mea3 || 0))
  shopTotals[Dtl.dtl_invx_ref_no + Dtl.dtl_cpart] = {
    ttl_pc: Number((shopTotals[Dtl.dtl_invx_ref_no + Dtl.dtl_cpart]?.ttl_pc || 0)) + Number(Dtl.dtl_pcs),
    ttl_wgt_lb: roundoff(Number(shopTotals[Dtl.dtl_invx_ref_no + Dtl.dtl_cpart]?.ttl_wgt_lb || 0)) + roundoff(Number(matchingMeasurements.find(m => m.msr_mea4 === '01' && m.msr_mea1 === 'WT')?.msr_mea3 || 0)),
    ttl_wgt_kg: roundoff(Number(shopTotals[Dtl.dtl_invx_ref_no + Dtl.dtl_cpart]?.ttl_wgt_kg || 0)) + roundoff(Number(matchingMeasurements.find(m => m.msr_mea4 === '50' && m.msr_mea1 === 'WT')?.msr_mea3 || 0))
  };
}


console.log("Part Totals", partTotals);
console.log("Shop Totals", shopTotals);
let prtnbr = [];
let shopnbr = [];
for (const hl1 of uniqueHL1s) {
  // Find the first detail record for this hl1 (for 30 record fields)
  const Detail30 = Detail.find(d => d.dtl_hl1 === hl1 && d.dtl_bsn_no === Header.hdr_bsn_no);
  const detail40s = Detail.filter(d => d.dtl_hl1 === hl1 && d.dtl_bsn_no === Header.hdr_bsn_no)
    .sort((a, b) => a.dtl_hl2 - b.dtl_hl2); // Sort ascending by Item HL ID
    let sumofpart = 0;
    for (const Detail40 of detail40s) {
      sumofpart += Detail40.dtl_pc_cnt ? Detail40.dtl_pc_cnt : 0;
    }
for (const Detail40 of detail40s) {

  // Get 862 data
      let _862_results = await get862forreference(pool, Detail30.dtl_cpart, Header.hdr_crt_dat, isa_rcv_id ); //Header.hdr_isnd_id);
      let _862 = _862_results.rows;
       _862 = _862_results[0];  
  
  let thirtyRecord = {
    "RECORD TYPE INDICATOR": "30",
    "Order HL ID": overallindex,
    "HL Parent ID": 1,
    "HL Level Code": 'O',
    "HL Child Code": 1,
    "Part Qualifier": 'BP',
    "Customer Part No": await evaluatePriority(priority_1, priority_2, Detail30.dtl_cpart, 'Customer Part No', '30'),
    "PO No": await evaluatePriority(priority_1, priority_2, Detail30.dtl_cpo, 'PO No', '30'),
    "PO Date": await evaluatePriority(priority_1, priority_2, getValidDate(Detail30.dtl_cpod), 'PO Date', '30'),
    "Alt Part No": await evaluatePriority(priority_1, priority_2, Detail30.dtl_apart, 'Alt Part No', '30'),
    "Release No": await evaluatePriority(priority_1, priority_2, Detail30.dtl_rls, 'Release No', '30'),
    "Engineering Change No": await evaluatePriority(priority_1, priority_2, _862 ? await evaluatePriority(priority_1, priority_2, _862.dtl_eng_chg_l, 'Engineering Change No', '30') : null, 'Engineering Change No', '30'),
    "Mill Order Number": await evaluatePriority(priority_1, priority_2, Detail30.dtl_mo, 'Mill Order Number', '30'),
    "Mill Order Line": await evaluatePriority(priority_1, priority_2, Detail30.dtl_mol, 'Mill Order Line', '30'),
    "Customer PO Release Number": await evaluatePriority(priority_1, priority_2, Detail30.dtl_cpor, 'Customer PO Release Number', '30'),
    "Customer PO Line Number": await evaluatePriority(priority_1, priority_2, Detail30.dtl_cpol, 'Customer PO Line Number', '30'),
   "Order Total Pieces": !shopnbr.includes((Detail30.dtl_invx_ref_no + Detail30.dtl_cpart)) ? await evaluatePriority(priority_1, priority_2, shopTotals[Detail30.dtl_invx_ref_no + Detail30.dtl_cpart].ttl_pc, 'Order Total Pieces', '30') : null,
   "Order Total Weight (LB)": !shopnbr.includes((Detail30.dtl_invx_ref_no + Detail30.dtl_cpart)) ? await evaluatePriority(priority_1, priority_2, await roundoff(shopTotals[Detail30.dtl_invx_ref_no + Detail30.dtl_cpart].ttl_wgt_lb), 'Order Total Weight (LB)', '30') : null,
   "Order Total Weight (KG)": !shopnbr.includes((Detail30.dtl_invx_ref_no + Detail30.dtl_cpart)) ? await evaluatePriority(priority_1, priority_2, await roundoff(shopTotals[Detail30.dtl_invx_ref_no + Detail30.dtl_cpart].ttl_wgt_kg), 'Order Total Weight (KG)', '30') : null,
   "Pieces in Detail (Y/N)": Detail30.dtl_coil_frm === '01' ? 'N' : 'Y',
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
    "Ship-To Customer PO#": await evaluatePriority(priority_1, priority_2, Detail30.dtl_attr_ship_to_po, 'Ship-To Customer PO#', '30'),
    "Ship-To Customer PO Line#": await evaluatePriority(priority_1, priority_2, Detail30.dtl_attr_ship_to_pol, 'Ship-To Customer PO Line#', '30'),
    "Cust PO# (Shop)": await evaluatePriority(priority_1, priority_2, Detail30.dtl_po, 'Cust PO# (Shop)', '30'),
    "Cust Release# (Shop)": await evaluatePriority(priority_1, priority_2, Detail30.dtl_cpor, 'Cust Release# (Shop)', '30'),
    "Cust Release# (Mtl Rls)": await evaluatePriority(priority_1, priority_2, Detail30.dtl_attr_cust_rls, 'Cust Release# (Mtl Rls)', '30'),
    "REF*PO from Inb856 (to be sent back)": Detail30.dtl_ucpo, //Needs to be defined from previous
    "Part Description (Shop)": await evaluatePriority(priority_1, priority_2, Detail30.dtl_partd, 'Part Description (Shop)', '30'),
    "Internal (Shop) Order Number": await evaluatePriority(priority_1, priority_2, (Detail30.dtl_invx_ref_pre || '') + '-' + (Detail30.dtl_invx_ref_no || ''), 'Internal (Shop) Order Number', '30'),
    "Part Total Pieces": !prtnbr.includes(Detail30.dtl_cpart) ? await evaluatePriority(priority_1, priority_2, partTotals[Detail30.dtl_cpart].ttl_pc, 'Part Total Pieces', '30') : null,
    "Part Total Weight (LB)": !prtnbr.includes(Detail30.dtl_cpart) ? await evaluatePriority(priority_1, priority_2,  await roundoff(partTotals[Detail30.dtl_cpart].ttl_wgt_lb), 'Part Total Weight (LB)', '30') : null,
    "Part Total Weight (KG)": !prtnbr.includes(Detail30.dtl_cpart) ? await evaluatePriority(priority_1, priority_2, await roundoff(partTotals[Detail30.dtl_cpart].ttl_wgt_kg), 'Part Total Weight (KG)', '30') : null,
    "(I830-PS) Purchase Order#": await evaluatePriority(priority_1, priority_2, _830 ? _830.dtl_po : null, '(I830-PS) Purchase Order#', '30'),
    "(I830-PS) Purchase Order Line#": await evaluatePriority(priority_1, priority_2, _830 ? _830.dtl_pol : null, '(I830-PS) Purchase Order Line#', '30'),
    "(I830-PS) Release#": await evaluatePriority(priority_1, priority_2, _830 ? _830.dtl_rls : null, '(I830-PS) Release#', '30'),
    "(I830-PS) Engineering Change#": await evaluatePriority(priority_1, priority_2, _830 ? _830.dtl_echg : null, '(I830-PS) Engineering Change#', '30'),
    "(I830-PS) MSA#": await evaluatePriority(priority_1, priority_2, _830 ? _830.dtl_msa_no : null, '(I830-PS) MSA#', '30'),
    "(I830-PS) Create Date": await evaluatePriority(priority_1, priority_2, _830 ? await getValidDate(_830.dtl_crt_dte) : null, '(I830-PS) Create Date', '30'),
    "(I830-PS) Create Time": await evaluatePriority(priority_1, priority_2, _830 ? (await getValidDate(_830.dtl_crt_dte) ? String(_830.dtl_crt_tme).padStart(6, '0').slice(0, 4) : null) : null, '(I830-PS) Create Time', '30'),
    "(I862-SS) Purchase Order#": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_po : null, '(I862-SS) Purchase Order#', '30'),
    "(I862-SS) Purchase Order Line#": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_pol : null, '(I862-SS) Purchase Order Line#', '30'),
    "(I862-SS) Release#": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_rls_no : null, '(I862-SS) Release#', '30'),
    "(I862-SS) Engineering Change#": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_eng_chg_l : null, '(I862-SS) Engineering Change#', '30'),
    "(I862-SS) MSA#": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_msa_no : null, '(I862-SS) MSA#', '30'),
    "(I862-SS) Company Part#": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_cpart : null, '(I862-SS) Company Part#', '30'),
    "(I862-SS) Returnable Container#": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_rtn_cont_no : null, '(I862-SS) Returnable Container#', '30'),
    "(I862-SS) HES Code": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_hes_code : null, '(I862-SS) HES Code', '30'),
    "(I862-SS) Prev Customer Reference": await evaluatePriority(priority_1, priority_2, _862 ? _862.dtl_prv_cust_ref_no : null, '(I862-SS) Prev Customer Reference', '30'),
    "(I862-SS) Create Date": await evaluatePriority(priority_1, priority_2, _862 ? await getValidDate(_862.dtl_crt_dte) : null, '(I862-SS) Create Date', '30'),
    "(I862-SS) Create Time": await evaluatePriority(priority_1, priority_2, _862 ? (await getValidDate(_862.dtl_crt_dte) ? String(_862.dtl_crt_tme).padStart(6, '0').slice(0, 4) : null) : null, '(I862-SS) Create Time', '30'),
    "(I830-PS) Delivery Order Number": await evaluatePriority(priority_1, priority_2, _830 ? _830.fcst_do : null, '(I830-PS) Delivery Order Number', '30'),
    "(I862-SS) Delivery Order Number": await evaluatePriority(priority_1, priority_2, _862 ? _862.fcst_do : null, '(I862-SS) Delivery Order Number', '30'),
    "Commodity Code": await evaluatePriority(priority_1, priority_2, Detail30.dtl_coil_frm, 'Commodity Code', '30'),
    "Sold-To Customer PO# (from Mtl rls file)": await evaluatePriority(priority_1, priority_2, Detail30.dtl_attr_sold_to_po, 'Sold-To Customer PO# (from Mtl rls file)', '30'),
    "Sold-To PO Line# (from Mtl rls file)": await evaluatePriority(priority_1, priority_2, Detail30.dtl_attr_sold_to_pol, 'Sold-To PO Line# (from Mtl rls file)', '30'),
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
        "Mill Coil Number": await evaluatePriority(priority_1, priority_2, Detail40.dtl_mcoil ? Detail40.dtl_mcoil : Detail40.dtl_prev, 'Mill Coil Number', '40'),
        "Heat Number": await evaluatePriority(priority_1, priority_2, Detail40.dtl_heat, 'Heat Number', '40'),
        "Grade Code": await evaluatePriority(priority_1, priority_2, Detail40.dtl_grcd, 'Grade Code', '40'),
        "Previous/Processor Tag Nbr": await evaluatePriority(priority_1, priority_2, Detail40.dtl_tag_lot, 'Previous/Processor Tag Nbr', '40'),
        "Net Qty Ship": await evaluatePriority(priority_1, priority_2, Detail40.dtl_pcs, 'Net Qty Ship', '40'),
        "Qty UOM": 'PC',
        "PO No": await evaluatePriority(priority_1, priority_2, Detail40.dtl_po, 'PO No', '40'),
        "PO Date": await evaluatePriority(priority_1, priority_2, getValidDate(Detail40.dtl_pod), 'PO Date', '40'),
        "PO Line No": await evaluatePriority(priority_1, priority_2, Detail40.dtl_pol, 'PO Line No', '40'),
        "Billed Weight": await evaluatePriority(priority_1, priority_2, Detail40.dtl_awgtlb ? await roundoff(Detail40.dtl_awgtlb) : Detail40.dtl_awgtkg ? await roundoff(Detail40.dtl_awgtkg) : null, 'Billed Weight', '40'),
        "Billed Wt UM": await evaluatePriority(priority_1, priority_2, Detail40.dtl_awgtlb ? 'LB' : 'KG', 'Billed Wt UM', '40'),
        "Material Classification (AISI table 67)": await evaluatePriority(priority_1, priority_2, Detail40.dtl_mcls67, 'Material Classification (AISI table 67)', '40'),
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
        "Original I856 Gauge (IN)": Detail40.dtl_org_gauge_in,
        "Original I856 Gauge (MM)": Detail40.dtl_org_gauge_mm,
        "Original I856 Gauge Type": Detail40.dtl_org_gauge_type,
        "Price/CWT Adjust": null,//Needs to be defined
        "Consumed Coil ID": await evaluatePriority(priority_1, priority_2, Detail40.dtl_ccoil, 'Consumed Coil ID', '40'),
        "License Plate Number": await evaluatePriority(priority_1, priority_2, Detail40.dtl_tag_lot, 'License Plate Number', '40'),   
        "Customer tag number": await evaluatePriority(priority_1, priority_2, Detail40.dtl_tag_lot, 'Customer tag number', '40'),
        "Load Planning From INB 860/850":await evaluatePriority(priority_1, priority_2, _860 ? _860.hdr_load_pln : _850 ? _850.hdr_load_pln : null, 'Load Planning From INB 860/850', '40'),
        "Release# from INB 860/850": await evaluatePriority(priority_1, priority_2, _860 ? _860.dtl_rls : _850 ? _850.dtl_rls : null, 'Release# from INB 860/850', '40'),
        "PO Date from INB 860/850": await evaluatePriority(priority_1, priority_2, _860 ? getValidDate(_860.dtl_po_dte) : _850 ? getValidDate(_850.dtl_po_dte) : null, 'PO Date from INB 860/850', '40'),
        "Line# from INB 860/850": await evaluatePriority(priority_1, priority_2, _860 ? _860.dtl_line : _850 ? _850.dtl_line : null, 'Line# from INB 860/850', '40'),
        "Part# from INB 860/850": await evaluatePriority(priority_1, priority_2, _860 ? _860.dtl_part : _850 ? _850.dtl_part : null, 'Part# from INB 860/850', '40'),
        "Alternate Part# from INB 860/850": await evaluatePriority(priority_1, priority_2, _860 ? _860.dtl_alt_part : _850 ? _850.dtl_alt_part : null, 'Alternate Part# from INB 860/850', '40')
    };
    fortyRecord.record_code = fortyRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(fortyRecord);
    overallindex = overallindex + 1;
    
    // 49 Records for this 40 record (matching measurements)
    const matchingMeasurements = Measurements.filter(m =>
      m.msr_bsn2 === Detail40.dtl_hl2 && m.msr_hl1 === hl1 && m.msr_bsn_no === Detail40.dtl_bsn_no
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
  prtnbr.push(Detail30.dtl_cpart);
  shopnbr.push((Detail30.dtl_invx_ref_no + Detail30.dtl_cpart));
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

}
  return outSNF
}

module.exports = {
  SNFCreateO856
}
const trimZeros = require('../../functions/trimtrailingzeros.js');
const chopOffDecimals = require('../../functions/chopoffdecimals.js');
const queryInvexDatabase = require('../../Invex/InvexConnection.js');
const { evaluatePriority, getPrioritySettings, getAddressPriority } = require('../../functions/evaluatePriority.js');
const as400Service = require('../../as400/callLoadNumber.js');
const retrieveInboundASN = require('../../functions/retrieveInboundASN.js').retrieveInboundASN;
async function SNFCreateO861(pkey, pool, CustomerID, Branch, tradingPartner ) {


  let headerResults = await pool.query('SELECT * FROM public."861_SNF_Header" WHERE hdr_key = $1', [pkey]);
  let Header = headerResults.rows[0];
  let detailsResults = await pool.query('SELECT * FROM "861_SNF_Detail" WHERE dtl_key = $1', [pkey]);
  let Detail = detailsResults.rows;
  let namesResults = await pool.query('SELECT * FROM "861_SNF_Names" WHERE name_key = $1', [pkey]);
  let Names = namesResults.rows;
  let ProductItemResults = await pool.query('SELECT * FROM "861_Invex_ProductItem" WHERE prd_key = $1', [pkey]);
  let ProductItem = ProductItemResults.rows;
  let ProductItemNameAddressResults = await pool.query('SELECT * FROM "861_Invex_ProductItemNameAddress" WHERE prna_key = $1', [pkey]);
  let ProductItemNameAddress = ProductItemNameAddressResults.rows;

let orginalNames;
let uniqueKeys = []; // Array to store unique keys
try {
  if (ProductItem && Array.isArray(ProductItem) && ProductItem.length > 0) {
    for (const product of ProductItem) {
      const key = await retrieveInboundASN(product.prd_customertagno, product.prd_heat, ProductItemNameAddress[0] && ProductItemNameAddress[0].prna_identificationcode ? ProductItemNameAddress[0].prna_identificationcode : null);
      console.log('KEY', key.rows)
      
      // Check if we got a valid key and it's not already in our array
      if (key.rows && key.rows.length > 0 && key.rows[0].dtl_key) {
        const dtlKey = key.rows[0].dtl_key;
        
        // Only add if not already in the uniqueKeys array
        if (!uniqueKeys.includes(dtlKey)) {
          uniqueKeys.push(dtlKey);
        }
      }
    }
  }
  console.log('Unique Keys:', uniqueKeys);

  // Now retrieve original data for all unique keys
  if (uniqueKeys.length > 0) {
    // For multiple keys, use IN clause with parameterized query
    const placeholders = uniqueKeys.map((_, i) => `$${i + 1}`).join(',');
    
    let orginalNamesResults = await pool.query(
      `SELECT * FROM "856_SNF_Names" WHERE name_key = ANY($1)`, 
      [uniqueKeys]
    );
    orginalNames = orginalNamesResults.rows;   

  } else {
    console.log("No previous ASN keys found");
  }

} catch (error) {
  console.log(error)
  console.log("Error retrieving previous ASN:");
}


   let multiSNFS = []
   console.log("Checking for multiple SNFs for pkey:", CustomerID);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_id);
   console.log("Checking for multiple SNFs for pkey:", Header.hdr_ircv_qual);
  //
   let RoutingSNFsResults = await pool.query(
  'SELECT rte_edi_acct_id FROM public."Routing_SNFs" WHERE rte_cus_id = $1 AND TRIM(rte_isa_id) LIKE $2 AND rte_isa_qual = $3 AND rte_transactions @> ARRAY[$4::varchar]',
  [CustomerID, `${Header.hdr_ircv_id.trim()}%`, Header.hdr_ircv_qual, '861']
);
console.log(tradingPartner)
  // let multipleSNFs = multipleSNFsResults.rows;
if (tradingPartner && tradingPartner.length > 0) {
      let { address_priority_1, address_priority_2, address_priority_3, address_priority_4 } = await getAddressPriority(tradingPartner, Branch, '861', pool);
      let trading_partner_info_results = await pool.query(
        'SELECT * FROM public."EDI_Accounts" WHERE edia_edi_account_id = $1',
        [tradingPartner]
      );
      let location = Branch ? Branch.toString().slice(-2) : '';
      let trading_partner_info = trading_partner_info_results.rows[0];
      let { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config } = await getPrioritySettings(tradingPartner, Branch, '861', pool);
      let snf = await writeSNF(pkey, pool, Header, Detail, Names, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location, orginalNames);
      multiSNFS.push(snf);
} else {
  if (RoutingSNFsResults.rows.length > 0) {
   await Promise.all(RoutingSNFsResults.rows.map(async row => {
  
      let { address_priority_1, address_priority_2, address_priority_3, address_priority_4 } = await getAddressPriority(row.rte_edi_acct_id, Branch, '861', pool);
      let trading_partner_info_results = await pool.query(
  'SELECT * FROM public."EDI_Accounts" WHERE edia_edi_account_id = $1',
  [row.rte_edi_acct_id]
);
      let trading_partner_info = trading_partner_info_results.rows[0];
      let location = Branch ? Branch.toString().slice(-2) : '';
      //let location = Branch.toString().slice(-2);
      let { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config } = await getPrioritySettings(row.rte_edi_acct_id, Branch, '861', pool);
      let snf = await writeSNF(pkey, pool, Header, Detail, Names, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location, orginalNames);
      multiSNFS.push(snf);
  }));
  }
}

  return multiSNFS;

}

const getMClassDesc = async (MClass) => {
        try {
          const sql = `SELECT * FROM INRINQ_REC INNER JOIN EDRXQL_REC ON INQ_INVT_QLTY = XQL_INVT_QLTY WHERE XQL_OPS_INVT_QLTY = '${MClass}'`;
          const result = await queryInvexDatabase(sql);      
          const returnMClassDsc = result.Data[0]['inq_desc15'].toUpperCase();
          return returnMClassDsc.trim();
        } catch (error) {
          console.error('Error querying Invex database for Material Class:', error);
          return null;
        }
      };

async function writeSNF(pkey, pool, Header, Detail, Names, priority_1, priority_2, address_priority_1, address_priority_2, address_priority_3, address_priority_4, priority_1_config, priority_2_config, priority_3_config, trading_partner_info, location, orginalNames) {


  orginalNames = Array.isArray(orginalNames) ? orginalNames : [];
  let outSNF = []
 console.log("Creating O861 for pkey:", pkey);
  //MARK: CT Record
  let CT = {
      "RECORD TYPE INDICATOR" : "CT",
      "Record Key (10-digit integer)": pkey,
      "GS Functional Group ID": "RC",
      "ISA Receiver ID Qualifier": await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_qual, 'ISA Receiver ID Qualifier', 'CT'),
      "ISA Receiver ID": await evaluatePriority(priority_1, priority_2, Header.hdr_ircv_id, 'ISA Receiver ID', 'CT'),
      "GS Receiver ID": await evaluatePriority(priority_1, priority_2, Header.hdr_grcv_id, 'GS Receiver ID', 'CT'),
      //"ST Control Number": await evaluatePriority(priority_1, priority_2, Header.hdr_stctl_no, 'ST Control Number', 'CT'),
      "ST Transaction Set ID": '861',
      "Application System ID": 'INVEX',
      "Production/Test Flag" : 'P',
      //"Type (T=Toll; M=Margin; D=Direct Ship)" : Header.hdr_type
    }
    CT.record_code = CT["RECORD TYPE INDICATOR"];
    await outSNF.push(CT);

const uniqueLines = [...new Set(Detail.map(d => d.dtl_tag_lot))]; // .reverse();
for (const TagLots of uniqueLines) {
    //MARK: 10 Record
    let tenRecord = {
      "RECORD TYPE INDICATOR": "10",
      "Shipment ID":Header.hdr_shp_no,
      "Receipt Date":Header.hdr_rcv_dte,
      "Transaction Set Purpose Code":Header.hdr_purp_cd,
      "Rcpt or Acceptance Type Code":Header.hdr_rcpt_typ_cd,
      "Receipt Time":Header.hdr_rcv_tme,
      "Bill Of Lading Number":Header.hdr_bol_no,
      //"Shipment Notice/Manifest Number":Header.hdr_mbol_no,
      "Received Date":Header.hdr_rcv_dte,
      "Received Time":Header.hdr_rcv_tme,
      "Received Time Zone":Header.hdr_rcv_tme_zn,
    }
    tenRecord.record_code = tenRecord["RECORD TYPE INDICATOR"];
    await outSNF.push(tenRecord);
    

//Overriding Addresses
let addressList = [];
address_priority_1 ? await Promise.all(address_priority_1.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde)) {
        addressList.push(Name.ediaat_addr_typ_cde);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID Qualifier": Name.ediaat_id_qual,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Vendor's DUNS Number": null,
        "Vendor's Manufacturer's DUNS Number": null

      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);
    }
    })) : null;

    address_priority_2 ? await Promise.all(address_priority_2.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde)) {
        addressList.push(Name.ediaat_addr_typ_cde);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID Qualifier": Name.ediaat_id_qual,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Vendor's DUNS Number": null,
        "Vendor's Manufacturer's DUNS Number": null
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);
    }
    })) : null

    address_priority_3 ? await Promise.all(address_priority_3.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde)) {
        addressList.push(Name.ediaat_addr_typ_cde);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID Qualifier": Name.ediaat_id_qual,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Vendor's DUNS Number": null,
        "Vendor's Manufacturer's DUNS Number": null
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);
    }
    })) : null;

    address_priority_4 ? await Promise.all(address_priority_4.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.ediaat_addr_typ_cde)) {
        addressList.push(Name.ediaat_addr_typ_cde);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.ediaat_addr_typ_cde,
        "Address ID Qualifier": Name.ediaat_id_qual,
        "Address ID": Name.ediaat_addr_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.ediaat_state,
        "Postal Code": Name.ediaat_zpcd,
        "Customer Country Code": Name.ediaat_ctry_cd,
        "Vendor's DUNS Number": null,
        "Vendor's Manufacturer's DUNS Number": null
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);
    }
    })) : null;

//I856 Addresses
    await Promise.all(orginalNames.map(async (orginalNames) => {
      //MARK: 15 Record
      if (!addressList.includes(orginalNames.name_qual)) {
        addressList.push(orginalNames.name_qual);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": orginalNames.name_qual,
        "Address ID": orginalNames.name_id,
        "Name": orginalNames.name_name,
        "Address Line 1": orginalNames.name_addr1,
        "Address Line 2": orginalNames.name_addr2,
        "City": orginalNames.name_city,
        "State/Province": orginalNames.name_state,
        "Postal Code": orginalNames.name_zpcd,
        "Customer Country Code": orginalNames.name_ctry_cd,
        "Vendor's DUNS Number": null,
        "Vendor's Manufacturer's DUNS Number": null,
        "Address ID Qualifier": orginalNames.name_qual_id
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);}
    }));


//JSON Addresses
    await Promise.all(Names.map(async (Name) => {
      //MARK: 15 Record
      if (!addressList.includes(Name.name_qual)) {
        addressList.push(Name.name_qual);
      let fifteenRecord = {
        "RECORD TYPE INDICATOR": "15",
        "AddressTypeCode": Name.name_qual,
        "Address ID": Name.name_id,
        "Name": Name.name_name,
        "Address Line 1": Name.name_addr1,
        "Address Line 2": Name.name_addr2,
        "City": Name.name_city,
        "State/Province": Name.name_state,
        "Postal Code": Name.name_zpcd,
        "Customer Country Code": Name.name_ctry_cd,
        "Vendor's DUNS Number": null,
        "Vendor's Manufacturer's DUNS Number": null,
        "Address ID Qualifier": Name.name_qual_id
      }
      fifteenRecord.record_code = fifteenRecord["RECORD TYPE INDICATOR"];
      await outSNF.push(fifteenRecord);}
    }));

   //MARK: 30 Record
    // Filter Detail for unique values based on all properties



  const Detail30 = Detail.find(d => d.dtl_tag_lot === TagLots)
    let thirtyRecord = {
        "RECORD TYPE INDICATOR": "30",
        "Quantity of Units Received": Detail30.dtl_pcs,
        "Unit of Measure": Detail30.dtl_rcv_qty_uom,//-check1
        "Vendor (Mill) Order Number": await evaluatePriority(priority_1, priority_2, Detail30.dtl_mo, 'Vendor (Mill) Order Number', '30'),
        "Vendor (Mill) Item/Line Number": await evaluatePriority(priority_1, priority_2, Detail30.dtl_mol, 'Vendor (Mill) Item/Line Number', '30'),
        "Heat Number": Detail30.dtl_heat,
        "Mill Coil Number": Detail30.dtl_mcoil,
        "Purchase Order Number": await evaluatePriority(priority_1, priority_2, Detail30.dtl_po ? Detail30.dtl_po : null, 'Purchase Order Number', '30'),
        "Purchase Order Line Number": await evaluatePriority(priority_1, priority_2, Detail30.dtl_pol ? Detail30.dtl_pol : null, 'Purchase Order Line Number', '30'),
        "Part Number": Detail30.dtl_cpart,
        "Grade Code": Detail30.dtl_grcd,
        "Received As Tag Number": Detail30.dtl_tag_lot,
        "MSA#": Detail30.dtl_msa,
        "Delivery Order Number": null,
        //"Next Identifier": Detail.dtl_next_identifier,
        "Material Classification (Table 67)": await evaluatePriority(priority_1, priority_2, Detail30.dtl_mcls67, 'Material Classification (table 67)', '30'),
        "Material Classification Description": await getMClassDesc(Detail30.dtl_mcls67),
        "Material Status (Table 70)": Detail30.dtl_msts70,
        "Material Status Description": null,
        "Reason/Fault Code (Table 72)": Detail30.dtl_falt72,
        "Reason/Fault Description": null,
        "Reason/Damage Code (Table 73)": Detail30.dtl_scr_73,
        "Reason/Damage Description": null,
        "Number of Pieces": Detail30.dtl_pcs,
        "Actual Weight (LB)": Detail30.dtl_awgtlb,
        "Actual Weight (KG)": Detail30.dtl_awgtkg,
        "Theoretical Weight (LB)": Detail30.dtl_twgtlb,
        "Theoretical Weight (KG)": Detail30.dtl_twgtkg,
        "Gauge (IN)": await trimZeros(Detail30.dtl_gaugin),
        "Gauge (MM)": await trimZeros(Detail30.dtl_gaugmm),
        "Gauge Type (NOM; MIN; blanks)": await trimZeros(Detail30.dtl_gaugt),
        "Width (IN)": await trimZeros(Detail30.dtl_widin),
        "Width (KG)": await trimZeros(Detail30.dtl_widmm),
        "Unit Length (IN)": await trimZeros(Detail30.dtl_ulenin),
        "Unit Length (KG)": await trimZeros(Detail30.dtl_ulenmm),
        "Lineal Feet (FT)": Detail30.dtl_lnft,
        "Lineal Meters (MT)": Detail30.dtl_lnmt,
        "Inside Diameter (IN)": await trimZeros(Detail30.dtl_idin),
        "Inside Diameter (MM)": await trimZeros(Detail30.dtl_idmm),
        "Outside Diameter (IN)": await trimZeros(Detail30.dtl_odin),
        "Outside Diameter (MM)": await trimZeros(Detail30.dtl_odmm),
        //"Responsible Party Alpha Code": Detail.dtl_resp_party_alpha_cd,
        //"Responsible Party Number Code": Detail.dtl_resp_party_num_cd,
        "Purchase Order Date": Detail30.dtl_pod,
        "Change Order Sequence Number": await evaluatePriority(priority_1, priority_2, Detail30.dtl_prt_rev_no, 'Change Order Sequence Number', '30'),
        "Release Number": Detail30.dtl_rls,
        "(STTX) Tag Type": await evaluatePriority(priority_1, priority_2, null, '(STTX) Tag Type', '30'),
        "(STTX) Tag Number": await evaluatePriority(priority_1, priority_2, Detail30.dtl_tag_lot, '(STTX) Tag Number', '30'),
        "Previous (processor) Coil ID": Detail30.dtl_prev,
        "Item Mill Order Number": Detail30.dtl_mo,
        "Tag Serial Build Layout": await evaluatePriority(priority_1, priority_2, Detail30.dtl_tag_lot, '(STTX) Tag Number', '30')
     };
  thirtyRecord.record_code = thirtyRecord["RECORD TYPE INDICATOR"];
  await outSNF.push(thirtyRecord);
  //_30index = overallindex;
  //overallindex = overallindex + 1;

//MARK: 80 Record
  let ninetyRecord = {
    "RECORD TYPE INDICATOR": "90",
    "Number of Line Items": "1",
    "Hash Total": await evaluatePriority(priority_1, priority_2, Detail30.dtl_pcs, 'Hash Total', '90'), // Header.hdr_sum_hsh_ttl,
  }
  ninetyRecord.record_code = ninetyRecord["RECORD TYPE INDICATOR"];
  outSNF.push(ninetyRecord);
}

  return outSNF
}

module.exports = {
  SNFCreateO861
}
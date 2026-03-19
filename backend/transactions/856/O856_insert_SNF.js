// This module handles the insertion of parsed EDI 856 records into the PostgreSQL database. 
// It exports functions to insert header, detail, measure, and names records into their respective tables.


const chopOffDecimals = require('../../functions/chopoffdecimals.js');
const limitDecimals = require('../../functions/limitDecimals.js');
const  readableErrors = require('../../functions/readableErrors.js');
const { evaluatePriority, getPrioritySettings, getAddressPriority } = require('../../functions/evaluatePriority.js');
const retrieveInboundASN = require('../../functions/retrieveInboundASN.js').retrieveInboundASN;
let ymd;
let hms;

const toNum = (v) => {
      if (v === undefined || v === null || v === '') return 0;
      const n = Number(String(v).replace(/[^0-9.-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    }; 
const roundoff = v => Math.round(toNum(v));

async function LoadO856SNF(pool, InterchangeControl, TransactionSet, ShipmentHeader, HeaderNameAddress, HeaderInstructions, Item, ItemInstructions, ProductItem, Chemistries, Damages, ProductInstructions, ProductItemNameAddress, Errors, CustomerID, flag, filePath) {
      // If ProductItem is an array, process each one

ymd = InterchangeControl.ictl_createddatetime.slice(0, 8);
hms = InterchangeControl.ictl_createddatetime.slice(8, 14);

// Check if the customer needs SNF split by SO and SO line.
let splitFlag = 'N'; //There is a possibility that one TP needs split and other doesn't.
let createSplitRecords = 'N'; // Create split records for the TP that wants split.
let createWholeRecord = 'N'; // Create the whole record for the TP that doesn't want split.

let RoutingSNFsResults = await pool.query(
  'SELECT rte_edi_acct_id FROM public."Routing_SNFs" WHERE rte_cus_id = $1 AND TRIM(rte_isa_id) LIKE $2 AND rte_isa_qual = $3 AND rte_transactions @> ARRAY[$4::varchar]',
  [CustomerID, `${InterchangeControl.ictl_receiverinterchangeid.trim()}%`, InterchangeControl.ictl_receiverinterchangeidqualifier, '856']
);

if (RoutingSNFsResults.rows.length > 0) {
   await Promise.all(RoutingSNFsResults.rows.map(async row => {
  
      let trading_partner_info_results = await pool.query(
  'SELECT * FROM public."EDI_Accounts" WHERE edia_edi_account_id = $1',
  [row.rte_edi_acct_id]
);
      const Branch = InterchangeControl.ictl_invexbranchcode || null;
      let trading_partner_info = trading_partner_info_results.rows[0];
      //let location = Branch.toString().slice(-2);
      let { priority_1, priority_2, priority_1_config, priority_2_config, priority_3_config } = await getPrioritySettings(row.rte_edi_acct_id, Branch, '856', pool);
      splitFlag = await (priority_1_config?.includes('ASN/SNF Split at Sales Order/Line#') || 
                priority_2_config?.includes('ASN/SNF Split at Sales Order/Line#') || 
                priority_3_config?.includes('ASN/SNF Split at Sales Order/Line#')) ? 'Y' : 'N';
      if (splitFlag === 'Y') {
        createSplitRecords = 'Y';
      } else {
        createWholeRecord = 'Y';
      }
    }));
  }

Item.forEach(obj => obj.suffix = ''); // Initialize suffix property)


  const ItemSortSplit = await Item.sort((a, b) => {
    // First Sort by shp_invexreferencenumber and shp_invexreferenceitem
    if (a.shp_invexreferencenumber !== b.shp_invexreferencenumber) {
      return a.shp_invexreferencenumber - b.shp_invexreferencenumber;
    }
    if (a.shp_invexreferenceitem !== b.shp_invexreferenceitem) {
      return a.shp_invexreferenceitem - b.shp_invexreferenceitem;
    }
    // Then sort by part number
    return a.shp_partnumber - b.shp_partnumber;

});

  const ItemSortWhole = await Item.sort((a, b) => {
   
  // First level: sort by shp_partnumber
   if (a.shp_partnumber !== b.shp_partnumber) {
     return a.shp_partnumber - b.shp_partnumber;
   }
   return a.shp_invexreferencenumber - b.shp_invexreferencenumber;
});


let currentSuffixIndex = -1;
let lastSO = null;
let lastSOLine = null;
const alphabets = 'abcdefghijklmnopqrstuvwxyz';

ItemSortSplit.forEach(item => { 
  if (item.shp_invexreferencenumber !== lastSO || item.shp_invexreferenceitem !== lastSOLine) 
  {
    currentSuffixIndex++;
    lastSO = item.shp_invexreferencenumber;
    lastSOLine = item.shp_invexreferenceitem;
  }
  item.suffix = alphabets.charAt(currentSuffixIndex);
  });






let orginalHeader;
let orginalDetail;
let orginalNames;
let orginalMeasure;
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
    
    orginalHeader = await pool.query(
      `SELECT * FROM "856_SNF_Header" WHERE hdr_key = ANY($1)`, 
      [uniqueKeys]
    );
    
    orginalDetail = await pool.query(
      `SELECT * FROM "856_SNF_Detail" WHERE dtl_key = ANY($1) ORDER BY dtl_key, dtl_hl1, dtl_hl2`, 
      [uniqueKeys]
    );
    
    orginalNames = await pool.query(
      `SELECT * FROM "856_SNF_Names" WHERE name_key = ANY($1)`, 
      [uniqueKeys]
    );
    
    orginalMeasure = await pool.query(
      `SELECT * FROM "856_SNF_Measure" WHERE msr_key = ANY($1)`, 
      [uniqueKeys]
    );

  } else {
    console.log("No previous ASN keys found");
  }

} catch (error) {
  console.log(error)
  console.log("Error retrieving previous ASN:");
}


//Weights for item and order level
let sumofproductweightsforsplit = {};
let sumofweightforsplit = 0;

try {
if (ProductItem && Item) {
    Item.forEach(Itm => {
        // Filter ProductItems to only those where prd_itemindex matches shp_itemindex
        const matchingProducts = ProductItem.filter(prod => prod.prd_itemindex === Itm.shp_itemindex);
        
        matchingProducts.forEach(prod => {
            const key = Itm.shp_invexreferencenumber + '-' + Itm.shp_invexreferenceprefix + '-' + Itm.shp_itemindex + '-' + prod.prd_partnumber;
            const weight = parseFloat(prod.prd_weight ? prod.prd_weight : 0);
            
            // If this key already exists, add to the existing weight
            if (sumofproductweightsforsplit[key]) {
                sumofproductweightsforsplit[key] += weight;
            } else {
                // First occurrence of this key
                sumofproductweightsforsplit[key] = weight;
            }
            
            // Also add to total weight
            sumofweightforsplit += weight;
        });
    });
    
    // Round all weights and chop off decimals
    for (const key of Object.keys(sumofproductweightsforsplit)) {
        sumofproductweightsforsplit[key] = await roundoff(sumofproductweightsforsplit[key]); // Add await
    }
    sumofweightforsplit = await roundoff(sumofweightforsplit); // Add await

    console.log('Sum of product weights by key:', sumofproductweightsforsplit);
    console.log('Total matched weight:', sumofweightforsplit);
}
} catch (error) {
    console.log(error);
}




let sumofproductweights = {};
let sumofweight = 0;

//Weights for part number level
try {
    
    
if (ProductItem) {
   ProductItem.forEach(prod => {
       const partNumber = prod.prd_partnumber;
       const weight = parseFloat(prod.prd_weight ? prod.prd_weight : 0);
        
        // If this part number already exists, add to the existing weight
        if (sumofproductweights[partNumber]) {
            sumofproductweights[partNumber] += weight;
        } else {
            // First occurrence of this part number
            sumofproductweights[partNumber] = weight;
        }
        
        // Also add to total weight
        sumofweight += weight;
    });

    // Round all weights to remove floating-point precision errors and chop off decimals
    for (const partNumber of Object.keys(sumofproductweights)) {
        sumofproductweights[partNumber] = await roundoff(sumofproductweights[partNumber]); // Add await
    }
    sumofweight = await roundoff(sumofweight); // Add await
    
    console.log('Sum of product weights by part number:', sumofproductweights);
    console.log('Total weight:', sumofweight);
}
} catch (error) {
    console.log(error);
}

let sumofitemweights = {};
let sumweight = 0;
try {
if (ProductItem && Item) {
    Item.forEach(Itm => {
        // Filter ProductItems to only those where prd_itemindex matches shp_itemindex
        const matchingProducts = ProductItem.filter(prod => prod.prd_itemindex === Itm.shp_itemindex);
        
        matchingProducts.forEach(prod => {
            const key = Itm.shp_invexreferencenumber + '-' + Itm.shp_invexreferenceprefix + '-' + Itm.shp_itemindex;
            const weight = parseFloat(prod.prd_weight ? prod.prd_weight : 0);
            
            // If this key already exists, add to the existing weight
            if (sumofitemweights[key]) {
                sumofitemweights[key] += weight;
            } else {
                // First occurrence of this key
                sumofitemweights[key] = weight;
            }
            
            // Also add to total weight
            sumweight += weight;
        });
    });
    
    // Round all weights and chop off decimals
    for (const key of Object.keys(sumofitemweights)) {
        sumofitemweights[key] = await roundoff(sumofitemweights[key]); // Add await
    }
    sumweight = await roundoff(sumweight); // Add await
    
    console.log('Sum of item weights by key:', sumofitemweights);
    console.log('Total matched weight:', sumweight);
}
} catch (error) {
    console.log(error);
}

  

    await InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ShipmentHeader, HeaderNameAddress, HeaderInstructions, Item, ItemSortSplit, ItemSortWhole, ItemInstructions, ProductItem, 
    Chemistries, Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath, orginalDetail, sumofproductweights, sumofproductweightsforsplit, sumofitemweights, orginalMeasure, createSplitRecords, createWholeRecord);
  }
      

  async function InsertIntoSNFTables(pool, InterchangeControl, TransactionSet, ShipmentHeader, HeaderNameAddress, HeaderInstructions, Item, ItemSortSplit, ItemSortWhole, ItemInstructions, ProductItem, Chemistries, Damages, ProductInstructions, ProductItemNameAddress, Errors, flag, filePath, orginalDetail, sumofproductweights, sumofproductweightsforsplit, sumofitemweights, orginalMeasure, createSplitRecords, createWholeRecord){
  if (createWholeRecord === 'Y') {   
  await insert856Header(pool, InterchangeControl, ShipmentHeader[0],  flag, filePath, ProductItem, null, 'N');
  }
  if (createSplitRecords === 'Y') {
    ItemSortSplit.map(async item => {
      const filteredProducts = ProductItem.filter(prod => prod.prd_itemindex === item.shp_itemindex);
  await insert856Header(pool, InterchangeControl, ShipmentHeader[0],  flag, filePath, filteredProducts, item, 'Y');
  })};
    // Address Insertion


  await Promise.all(ProductItemNameAddress.map(async address => {
      await insert856Names(pool, InterchangeControl, address, Item, flag, filePath, createWholeRecord);
  }));

  //Header Address Insertion
  await Promise.all(HeaderNameAddress.map(async address => {
    await insert856Names(pool, InterchangeControl, address, Item, flag, filePath, createWholeRecord);
  }));

// Moved ItemSort from here to above
  
  // Detail insertion
  if (createWholeRecord === 'Y') {
  await Promise.all(ItemSortWhole.map(async (Item, itemIndex) => {
    await Promise.all(ProductItem.filter(product => 
        product.prd_itemindex === Item.shp_itemindex // Correct property name
    ).map(async (ProductItem, productIndex) => {
        const orgDetail = orginalDetail?.rows?.filter(od => od.dtl_heat === ProductItem.prd_heat && od.dtl_mcoil === ProductItem.prd_customertagno) || [];
        await insert856Detail(pool, InterchangeControl, Item, ProductItem, ShipmentHeader[0], flag, filePath, itemIndex + 1, productIndex + 1, orgDetail, sumofproductweights, sumofitemweights, 'N');
    }));
}));
  }
  if (createSplitRecords === 'Y') {
  await Promise.all(ItemSortSplit.map(async (Item, itemIndex) => {
    await Promise.all(ProductItem.filter(product => 
        product.prd_itemindex === Item.shp_itemindex // Correct property name
    ).map(async (ProductItem, productIndex) => {
        const orgDetail = orginalDetail?.rows?.filter(od => od.dtl_heat === ProductItem.prd_heat && od.dtl_mcoil === ProductItem.prd_customertagno) || [];
        await insert856Detail(pool, InterchangeControl, Item, ProductItem, ShipmentHeader[0], flag, filePath, itemIndex + 1, productIndex + 1, orgDetail, sumofproductweightsforsplit, sumofitemweights, 'Y');
    }));
}));
  }

// Measure insertion
await Promise.all(Item.map(async (Item, itemIndex) => {
    await Promise.all(ProductItem.filter((product) => 
        product.prd_itemindex === Item.shp_itemindex // Correct property name
    ).map(async (ProductItem, index) => {
        const orgMeasure = orginalMeasure?.rows?.filter(om => om.msr_heat === ProductItem.prd_heat && om.msr_mcoil === ProductItem.prd_customertagno) || [];
        await insert856Measure(pool, InterchangeControl, Item, ProductItem, HeaderNameAddress, flag, filePath, index + 1, ShipmentHeader[0], itemIndex + 1, orgMeasure, createWholeRecord);
    }));
}));



// //MARK: Header
// //856 Header Insert
async function insert856Header(pool, InterchangeControl, ShipmentHeader, flag, filePath, ProductItem, item, isSplit) {
     
    const totalPieces = Array.isArray(ProductItem)
      ? ProductItem.reduce((sum, p) => sum + toNum(p?.prd_pieces ?? p?.prd_pcs ?? p?.pieces), 0)
      : toNum(ProductItem?.prd_pieces ?? ProductItem?.prd_pcs ?? ProductItem?.pieces);
    const hdrPieces = totalPieces > 0 ? totalPieces : null; 

    const getWeight = p => {
      const n = Number(p?.prd_weight);
      return Number.isFinite(n) ? roundoff(n) : 0;
    };
    const hdrNetWeight = Array.isArray(ProductItem)
      ? ProductItem.reduce((sum, p) => sum + getWeight(p), 0)
      : getWeight(ProductItem);
    
  try {
    // After requiring pg and creating your pool:
    await pool.query(`
     INSERT INTO public."856_SNF_Header"(
      	hdr_type, hdr_key, hdr_isa_qual, hdr_isnd_id, hdr_gsnd_id, hdr_ircv_id, hdr_grcv_id, 
        hdr_ictl_no, hdr_func_no, hdr_gctl_no, hdr_ircv_qual, hdr_stctl_no, hdr_bsn_cd, hdr_bsn_no, hdr_bsn_dte, hdr_bsn_tme, hdr_tran_typ, 
        hdr_shp_dte, hdr_shp_tme, hdr_shp_tzn, 
        hdr_bol_no, hdr_mbol_no, hdr_pck_no, hdr_dck_cd, hdr_shp_grss_wgt_lb, hdr_shp_grss_wgt_kg, 
        hdr_shp_grss_wgt_uom, hdr_shp_net_wgt_lb, hdr_shp_net_wgt_kg, hdr_shp_net_wgt_uom, 
        hdr_shp_ttl_pc_cnt, hdr_shp_itm_typ, hdr_shp_itm_cnt, hdr_rte_sq_cd, hdr_std_car_cd, 
        hdr_tspt_mthd, hdr_tspt_rt_name, hdr_shp_ord_sts, hdr_shp_loc_id, hdr_eq_cd, hdr_eq_init, 
        hdr_eq_nbr, hdr_shp_mthd_pmnt, hdr_sf_no, hdr_st_no, hdr_shp_hl, hdr_shp_phl, hdr_shp_hl_cd, 
        hdr_shp_hl_ccd, hdr_swgt_typ, hdr_swgt, hdr_swgt_uom, hdr_sum_hl_seg, hdr_sum_hsh_ttl, hdr_sttx_locn, 
        hdr_crt_dat, hdr_crt_tim, hdr_crt_pgm, hdr_xref, hdr_flow_flag, hdr_scac, hdr_bol_suffix)

    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
      $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62)
    `, [
      'O', //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      InterchangeControl.ictl_senderinterchangeidqualifier, //$3
      InterchangeControl.ictl_senderinterchangeid, //$4
      InterchangeControl.ictl_receiverinterchangeidqualifier, //$5  
      InterchangeControl.ictl_receiverinterchangeid, //$6
      InterchangeControl.ictl_receiverinterchangeid, //$7
      null, //$8 // hdr_ictl_no
      'SH', //$9 
      null, //$10 Needs to be defined
      InterchangeControl.ictl_receiverinterchangeidqualifier, //$11
      null, //$12 Needs to be defined
      '00', //$13
      isSplit === 'Y' ? ShipmentHeader.ish_transactionreference + '-' + item.suffix : ShipmentHeader.ish_transactionreference, //$14
      String(ymd), //$15
      String(hms), //$16
      ShipmentHeader.ish_shipmentqualifier ?? null, //$17
      ShipmentHeader.ish_shippingdatetime ? ShipmentHeader.ish_shippingdatetime.slice(0, 8) : null, //$18
      ShipmentHeader.ish_shippingdatetime ? ShipmentHeader.ish_shippingdatetime.slice(8, 14) : null, //$19
      'ET', //$20
      isSplit === 'Y' ? ShipmentHeader.ish_transactionreference + '-' + item.suffix : ShipmentHeader.ish_transactionreference, //$21
      ShipmentHeader.ish_manifestreference ?? null, //$22
      null, //$23 Needs to be defined pick no
      ShipmentHeader.ish_gatedock, //$24
      isSplit === 'Y' ? item.shp_x12grossweightum === 'LB' ? item.shp_grossweight : null : ShipmentHeader.ish_x12grossweightum === 'LB' ? ShipmentHeader.ish_grossweight : null, //$25
      isSplit === 'Y' ? item.shp_x12grossweightum === 'KG' ? item.shp_grossweight : null : ShipmentHeader.ish_x12grossweightum === 'KG' ? ShipmentHeader.ish_grossweight : null, //$26
      isSplit === 'Y' ? item.shp_x12grossweightum : ShipmentHeader.ish_x12grossweightum, //$27
      isSplit === 'Y' ? item.shp_x12netweightum === 'LB' ? hdrNetWeight: null : ShipmentHeader.ish_x12netweightum === 'LB' ? hdrNetWeight : null, //$28
      isSplit === 'Y' ? item.shp_x12netweightum === 'KG' ? hdrNetWeight: null : ShipmentHeader.ish_x12netweightum === 'KG' ? hdrNetWeight : null, //$29
      isSplit === 'Y' ? item.shp_x12netweightum : ShipmentHeader.ish_x12netweightum, //$30
      totalPieces, //$31 
      ProductItem[0].prd_coilform === '1' ? 'COL52' : 'LIF52', //$32
      ShipmentHeader.ish_numberofpackages, //$33
      'B', //$34
      ShipmentHeader.ish_shipmentqualifier === 'TS' || ShipmentHeader.ish_shipmentqualifier === 'O' ? 'SSSS' : ShipmentHeader.ish_carriercodequalifier === 2 ? ShipmentHeader.ish_carrieridentificationcode : '', //$35
      ShipmentHeader.ish_trans_method ?? null, //$36  here
      ShipmentHeader.ish_shipmentqualifier !== 'TS' ? ShipmentHeader.ish_carriername ?? null : null, //$37
      null, //$38 Needs to be defined
      null, //$39 Needs to be defined
      ShipmentHeader.ish_shipmentqualifier !== 'TS' ? ShipmentHeader.ish_equipment_cd : null, //$40
      null, //$41 Needs to be defined
      ShipmentHeader.ish_shipmentqualifier !== 'TS' ? ShipmentHeader.ish_vehicleinfo : null, //$42   here
      ShipmentHeader.ish_shipmentqualifier !== 'TS' ? ShipmentHeader.ish_x12shipmentmethodofpayment ?? null : null, //$43
      HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id || null, //44
      HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id || null, //45
      '1', //$46
      null, //$47 Needs to be defined
     'S', //$48
      null, //$49 Needs to be defined
      null, //$50
      null, //$51 
      null, //$52 
      null, //$53 Needs to be defined
      null, //$54 Needs to be defined
      null, //$55 Needs to be defined
      ymd,    //$56
      hms,   //$57
      'O856SNF', //$58
      null,
      flag, //$60
      ShipmentHeader.ish_shipmentqualifier !== 'TS' ? ShipmentHeader.ish_carrieridentificationcode ? ShipmentHeader.ish_carrieridentificationcode : 'STQK' : null, //61
      isSplit === 'Y' ? item.suffix : '0' //$62 Suffix for split records
    ]);


  } catch (error) {
    console.log(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }
};

//MARK: Names
  //856 Names Insert
async function insert856Names(pool, InterchangeControl, Address, Item, flag, filePath, createWholeRecord) {
 try {
    await pool.query( `INSERT INTO public."856_SNF_Names"(
  name_typ, name_key, name_qual, name_qual_id, name_id, name_name, name_addr1, name_addr2, name_city, name_state, name_zpcd, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_crt_dte, name_crt_tme, name_crt_pgm, name_flow_flag, name_bol_suffix)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
  [
    'O', //$1
    InterchangeControl.ictl_edixcontrolnumber, //$2
    Address.hdna_addresstype ? Address.hdna_addresstype : Address.prna_addresstype, //$3
    Address.hdna_identificationcodequalifier ? Address.hdna_identificationcodequalifier : Address.prna_identificationcodequalifier ? Address.prna_identificationcodequalifier : '01',
    Address.hdna_identificationcode ? Address.hdna_identificationcode : Address.prna_identificationcode ? Address.prna_identificationcode : " ", //$5
    Address.hdna_nameline1 ? Address.hdna_nameline1 : Address.prna_nameline1, //$6
    Address.hdna_addressline1 ? Address.hdna_addressline1 : Address.prna_addressline1, //$7
    Address.hdna_addressline2 ? Address.hdna_addressline2 : Address.prna_addressline2, //$8
    Address.hdna_city ? Address.hdna_city : Address.prna_city, //$9
    Address.hdna_stateprovincecode ? Address.hdna_stateprovincecode : Address.prna_stateprovincecode, //$10
    Address.hdna_postalcode ? Address.hdna_postalcode : Address.prna_postalcode, //$11
    Address.hdna_countrycode ? Address.hdna_countrycode : Address.prna_countrycode, //$12
    null,
    Address.hdna_telnumber ? Address.hdna_telnumber : Address.prna_telnumber, //$14
    null,
    ymd, //$16
    hms, //$17
    'O856SNF', //$18
    flag, //$19
    createWholeRecord === 'Y' ? '0' : Item[0].suffix //$20
  ]);
  } catch (error) {
    console.log(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
  }
}

//MARK: Detail
//856 Detail Insert

async function insert856Detail(pool, InterchangeControl, Item, ProductItem, ShipmentHeader, flag, filePath, itemIndex, productIndex, orginalDetail, sumofproductweights, sumofitemweights, isSplit) {
  let sumofproductweightsbypart = 0;
  if (isSplit === 'Y') {
   sumofproductweightsbypart = sumofproductweights[Item.shp_invexreferencenumber + '-' + Item.shp_invexreferenceprefix + '-' + Item.shp_itemindex + '-' + ProductItem.prd_partnumber] || 0;
  }
  else {
    sumofproductweightsbypart = sumofproductweights[ProductItem.prd_partnumber] || 0;
  }
  try {
  await pool.query(`INSERT INTO public."856_SNF_Detail"(
  dtl_type, dtl_key, dtl_hl1, dtl_hl2, dtl_hl3, dtl_hl4, dtl_bsn2, dtl_bol, dtl_heat, dtl_mcoil, dtl_prev, dtl_mo, dtl_mol, dtl_cpo, dtl_cpor, dtl_cpoc, dtl_cpod, dtl_cpol, dtl_ucpo, dtl_po, dtl_poc, dtl_pod, dtl_pol, dtl_rls, dtl_cpart, dtl_awgtlb, dtl_awgtkg, dtl_twgtlb, dtl_twgtkg, dtl_gaugin, dtl_gaugmm, dtl_gaugt, dtl_widin, dtl_widmm, dtl_ulenin, dtl_ulenmm, dtl_lnft, dtl_lnmt, dtl_idin, dtl_idmm, dtl_odin, dtl_odmm, dtl_pcs, dtl_qtyuom, dtl_grcd, dtl_mcls67, dtl_msts68, dtl_msts70, dtl_edge22, dtl_msa, dtl_n1sf, dtl_n1st, dtl_n1ma, dtl_ohl1, dtl_ohl2, dtl_ohl3, dtl_ohl4, dtl_shp, dtl_ouom, dtl_cqty, dtl_locn, dtl_odat, dtl_otim, dtl_opgm, dtl_apart, dtl_partd, dtl_mdat, dtl_osid, dtl_cshdt, dtl_lubdt, dtl_bhdt, dtl_xref, dtl_sttxpo, dtl_ccoil, dtl_tmpr, dtl_olin01, dtl_ilin01, dtl_corg, dtl_smelt1, dtl_smelt2, dtl_flow_flag, dtl_end_ref1, dtl_end_ref2, dtl_end_ref3, dtl_end_ref4, dtl_end_ref5, dtl_prt_rev_no, dtl_invx_ref_pre, dtl_invx_ref_no, dtl_tag_lot, dtl_itm_prt_no, dtl_coil_frm, dtl_prd_itm_weight, dtl_itm_ttl_weight, dtl_org_gauge_in, dtl_org_gauge_mm, dtl_org_gauge_type, dtl_attr_cust_rls, dtl_attr_ship_to_po, dtl_attr_ship_to_pol, dtl_attr_sold_to_po, dtl_attr_sold_to_pol, dtl_bol_suffix)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96, $97, $98, $99, $100, $101, $102, $103)`,
[
      'O', //$1
      InterchangeControl.ictl_edixcontrolnumber, //$2
      itemIndex, //$3
      productIndex, //$4
      'I',
      '0',
      isSplit === 'Y' ? ShipmentHeader.ish_transactionreference + '-' + Item.suffix : ShipmentHeader.ish_transactionreference, //7
      isSplit === 'Y' ? ShipmentHeader.ish_transactionreference + '-' + Item.suffix : ShipmentHeader.ish_transactionreference, //8
      ProductItem.prd_heat, //9
      ProductItem.prd_customertagno, //10
      ProductItem.prd_vendortagid, //11
      orginalDetail?.[0]?.dtl_mo ?? null, //12
      orginalDetail?.[0]?.dtl_mol ?? null, //13
      ProductItem.prd_asntype === 'T' && orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_cpo || orginalDetail[0].dtl_po || orginalDetail[0].dtl_ucpo || ProductItem.prd_externalordernumber : ProductItem.prd_externalordernumber, //14
      ProductItem.prd_externalorderrelease, //15
      null, //16
      ProductItem.prd_asntype === 'T' && orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_cpod || orginalDetail[0].dtl_pod || ProductItem.prd_externalorderdate : ProductItem.prd_externalorderdate ? ProductItem.prd_externalorderdate : orginalDetail ? orginalDetail[0].dtl_cpod : null, //17
      ProductItem.prd_asntype === 'T' && orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_cpol && orginalDetail[0].dtl_cpol !== '000' ? orginalDetail[0].dtl_cpol : orginalDetail[0].dtl_pol && orginalDetail[0].dtl_pol !== '000' ? orginalDetail[0].dtl_pol : null : ProductItem.prd_externalorderitem, //18
      orginalDetail?.[0]?.dtl_ucpo ?? null, //19
      ProductItem.prd_asntype === 'T' && orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_po || orginalDetail[0].dtl_cpo || ProductItem.prd_externalordernumber : ProductItem.prd_externalordernumber, //20
      null, //21
      ProductItem.prd_asntype === 'T' && orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_pod || orginalDetail[0].dtl_cpod || ProductItem.prd_externalorderdate : ProductItem.prd_externalorderdate? ProductItem.prd_externalorderdate : orginalDetail ? orginalDetail[0].dtl_cpod : null, //22
      ProductItem.prd_asntype === 'T' && orginalDetail && orginalDetail[0] ? orginalDetail[0].dtl_pol  && orginalDetail[0].dtl_pol !== '000' ? orginalDetail[0].dtl_pol : orginalDetail[0].dtl_cpol && orginalDetail[0].dtl_cpol !== '000' ? orginalDetail[0].dtl_cpol : ProductItem.prd_externalorderitem : ProductItem.prd_externalorderitem, //23
      ProductItem.prd_rls, //24 Need to be defined
      ProductItem.prd_partnumber, //25
      ProductItem.prd_weight_type === 'A' && ProductItem.prd_weight_um === 'LB' ? ProductItem.prd_weight : null, //26
      ProductItem.prd_weight_type === 'A' && ProductItem.prd_weight_um === 'KG' ? ProductItem.prd_weight : null, //27
      ProductItem.prd_weight_type === 'T' && ProductItem.prd_weight_um === 'LB' ? ProductItem.prd_weight : null, //28
      ProductItem.prd_weight_type === 'T' && ProductItem.prd_weight_um === 'KG' ? ProductItem.prd_weight : null, //29
      ProductItem.prd_x12gaugeum === 'ED' ? ProductItem.prd_gaugesize : null, //30
      ProductItem.prd_gaugesize !== 'MM' ? ProductItem.prd_gaugesize : null, //31
      ProductItem.prd_x12gaugeum, //32
      ProductItem.prd_x12widthum === 'IN' ? ProductItem.prd_width : null, //33
      ProductItem.prd_x12widthum === 'MM' ? ProductItem.prd_width : null, //34
      ProductItem.prd_x12lengthum === 'IN' ? ProductItem.prd_length : null, //35
      ProductItem.prd_x12lengthum === 'MM' ? ProductItem.prd_length : null, //36
       ProductItem.prd_x12lengthum === 'FT' ? ProductItem.prd_length : null, //37
      ProductItem.prd_x12lengthum === 'M' ? ProductItem.prd_length : null, //38
      ProductItem.prd_x12innerdiameterum === 'IN' ? ProductItem.prd_innerdiameter : null, //39
      ProductItem.prd_x12innerdiameterum === 'MM' ? ProductItem.prd_innerdiameter : null, //40
      ProductItem.prd_x12outerdiameterum === 'IN' ? ProductItem.prd_outerdiameter : null, //41
      ProductItem.prd_x12outerdiameterum === 'MM' ? ProductItem.prd_outerdiameter : null, //42
      ProductItem.prd_pieces, //43
      'PC', //44 
      ProductItem.prd_grade, //45
      ProductItem.prd_materialclassification, //46
      null, //47 
      ProductItem.prd_materialstatus, //48  
      null, //49 Need to be defined
      ProductItem.prd_materialspecification, //50 Need to be defined
      HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id || null, //51
      HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id || null, //52
      ProductItem.prd_ultimateintendedid, //53 Need to be defined
      productIndex, //54
      itemIndex, //55 
      '0', //56 
      '1', //57 
      null, //58 
      null, //59 
      null, //60 
      null, //61 
      ymd,    //$62
      hms,   //63
      'O856SNF', //$64
      orginalDetail?.[0]?.dtl_apart ?? null, //65 Need to be defined
      Item.shp_partdescription, //66
      null, //67 
      null, //68 
      null, //69 
      null, //70 
      null, //71 
      null, //72
      ProductItem.prd_steeltechnologiespo, //73 Need to be defined
      orginalDetail?.[0]?.dtl_ccoil ?? null, //74
      ProductItem.prd_temperature, //75 Need to be defined
      ProductItem.prd_olin01, //76 Need to be defined
      ProductItem.prd_ilin01, //77 Need to be defined
      null, //78
      null, //79
      null, //80 
      flag, //$81
      Item.shp_enduserreference1, //82
      Item.shp_enduserreference2, //83
      Item.shp_enduserreference3, //84
      Item.shp_enduserreference4, //85
      Item.shp_enduserreference5, //86
      Item.shp_partrevisionnumber, //87
      Item.shp_invexreferenceprefix, //88
      Item.shp_invexreferencenumber, //89
      ProductItem.prd_taglotid, //90
      Item.shp_partnumber,
      ProductItem.prd_coilform === '0' ? '06' : String(ProductItem.prd_coilform).padStart(2, '0'), //92
      sumofproductweightsbypart, //93
      sumofitemweights[Item.shp_invexreferencenumber + '-' + Item.shp_invexreferenceprefix + '-' + Item.shp_itemindex] || null, //94
      orginalDetail?.[0]?.dtl_gaugin ?? null, //95
      orginalDetail?.[0]?.dtl_gaugmm ?? null, //96
      orginalDetail?.[0]?.dtl_gaugt ?? null,  //97
      Item.shp_attr_cust_rls,
      Item.shp_attr_ship_to_po,
      Item.shp_attr_ship_to_pol,
      Item.shp_attr_sold_to_po,
      Item.shp_attr_sold_to_pol,
      isSplit === 'Y' ? Item.suffix : '0', //103 Suffix for split records
])

  } catch (error) {
    console.error(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
   }}



//MARK: Measure
//856 Measure Insert
async function insert856Measure(pool, InterchangeControl, Item, ProductItem, HeaderNameAddress, flag, filePath, index, ShipmentHeader, itemIndex, orginalMeasure, createWholeRecord) {
 try {

await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'CT','NL',null, ProductItem.prd_pieces,'PC',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag, createWholeRecord === 'Y' ? '0' : Item.suffix)

  //Weights
  //LB
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'WT','WT',null, ProductItem.prd_weight_um === 'LB' ? await roundoff(ProductItem.prd_weight) : await roundoff(ProductItem.prd_weight * 2.20462262185 ),'01',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag, createWholeRecord === 'Y' ? '0' : Item.suffix)
//KG
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'WT','WT',null,ProductItem.prd_weight_um === 'LB' ? await roundoff(ProductItem.prd_weight / 2.20462262185) : await roundoff(ProductItem.prd_weight),'50',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag, createWholeRecord === 'Y' ? '0' : Item.suffix)

//Theoretical Weights
if (orginalMeasure)
{
  const theo_lb = orginalMeasure.find(msr => msr.msr_mea4 === '24' && msr.msr_mea2 === 'WT' && msr.msr_mea1 === 'WT')
  const theo_kg = orginalMeasure.find(msr => msr.msr_mea4 === '53' && msr.msr_mea2 === 'WT' && msr.msr_mea1 === 'WT')
 
  if (theo_lb && theo_kg) {
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'WT','WT',null, await roundoff(theo_lb.msr_mea3) ,'24',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag, createWholeRecord === 'Y' ? '0' : Item.suffix)
//KG
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'WT','WT',null, await roundoff(theo_kg.msr_mea3) ,'53',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag, createWholeRecord === 'Y' ? '0' : Item.suffix)
}
}


//Gauges
 function convertGaugeUOM(x12gaugeum) {
  if (x12gaugeum === "MB") {
    return 'ED';
  } else if (x12gaugeum === "MZ") {
    return 'EM';
  } else if (x12gaugeum === "M2") {
    return 'E8';
  } else if (x12gaugeum === "MM") {
    return 'IN';
  } else {
    return x12gaugeum;
  }
}

// Function to convert from standard units to metric/imperial
function convertFromGaugeUOM(x12gaugeum) {
  if (x12gaugeum === "ED") {
    return 'MB';
  } else if (x12gaugeum === "EM") {
    return 'MZ';
  } else if (x12gaugeum === "E8") {
    return 'M2';
  } else if (x12gaugeum === "IN") {
    return 'MM';
  } else {
    return x12gaugeum;
  }
}

// First insertmeasures call - imperial units
await insertmeasures(
  pool, 
  InterchangeControl.ictl_edixcontrolnumber, 
  null, 
  null, 
  ShipmentHeader.transactionreference,
  ProductItem.prd_heat, 
  ProductItem.customertagno,
  ProductItem.vendortagid,
  'PD',
  'TH',
  null, 
  ["ED", "E8", "IN", "EM"].includes(ProductItem.prd_x12gaugeum) 
    ? await limitDecimals(ProductItem.prd_gaugesize, 4) 
    : await limitDecimals(ProductItem.prd_gaugesize / 25.4, 4), 
  await convertGaugeUOM(ProductItem.prd_x12gaugeum),
  HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id, 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id, 
  null, 
  null,
  flag,
  createWholeRecord === 'Y' ? '0' : Item.suffix
);

// Second insertmeasures call - metric units
await insertmeasures(
  pool, 
  InterchangeControl.ictl_edixcontrolnumber, 
  null, 
  null, 
  ShipmentHeader.transactionreference,
  ProductItem.prd_heat, 
  ProductItem.customertagno,
  ProductItem.vendortagid,
  'PD',
  'TH',
  null,
  ["M2", "MB", "MM", "MZ"].includes(ProductItem.prd_x12gaugeum) 
    ? await limitDecimals(ProductItem.prd_gaugesize, 4) 
    : await limitDecimals(ProductItem.prd_gaugesize * 25.4, 4),
  await convertFromGaugeUOM(ProductItem.prd_x12gaugeum),
  HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id, 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id, 
  null, 
  null,
  flag,
  createWholeRecord === 'Y' ? '0' : Item.suffix
);


//Width
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'PD','WD',null,ProductItem.prd_x12widthum === 'IN' ? ProductItem.prd_width * 25.4 : ProductItem.prd_width ,'MB',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag, createWholeRecord === 'Y' ? '0' : Item.suffix)

  await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
  ProductItem.vendortagid,'PD','WD',null,ProductItem.prd_x12widthum === 'IN' ? ProductItem.prd_width : ProductItem.prd_width  / 25.4 ,'ED',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
  HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag, createWholeRecord === 'Y' ? '0' : Item.suffix)
//UnitLength
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','LN',null,ProductItem.prd_x12coillengthum === 'FT' ? await roundoff(ProductItem.prd_coillength * .3048) : await roundoff(ProductItem.prd_coillength),'LM',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id ,
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag, createWholeRecord === 'Y' ? '0' : Item.suffix)
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','LN',null,ProductItem.prd_x12coillengthum === 'FT' ? await roundoff(ProductItem.prd_coillength) : await roundoff(ProductItem.prd_coillength * 3.28084) ,'LF',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id ,
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag, createWholeRecord === 'Y' ? '0' : Item.suffix)

//Inside Diameter
if (ProductItem.prd_innerdiameter && ProductItem.prd_innerdiameter != 0 && ProductItem.prd_innerdiameter != null && ProductItem.prd_innerdiameter != undefined) {
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','ID',null,ProductItem.prd_x12innerdiameterum === 'IN' ? await roundoff(ProductItem.prd_innerdiameter) : await roundoff(ProductItem.prd_innerdiameter / 25.4), 'ED',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag, createWholeRecord === 'Y' ? '0' : Item.suffix)

await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','ID',null,ProductItem.prd_x12innerdiameterum === 'IN' ? await roundoff(ProductItem.prd_innerdiameter * 25.4) : await roundoff(ProductItem.prd_innerdiameter), 'MB',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag, createWholeRecord === 'Y' ? '0' : Item.suffix)
}
//Outside Diameter
if (ProductItem.prd_outerdiameter && ProductItem.prd_outerdiameter != 0 && ProductItem.prd_outerdiameter != null && ProductItem.prd_outerdiameter != undefined) {
await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','OD',null,ProductItem.prd_x12outerdiameterum === 'IN' ? await roundoff(ProductItem.prd_outerdiameter) : await roundoff(ProductItem.prd_outerdiameter / 25.4), 'ED',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag, createWholeRecord === 'Y' ? '0' : Item.suffix)

await insertmeasures(pool, InterchangeControl.ictl_edixcontrolnumber, null, null, ShipmentHeader.transactionreference,ProductItem.prd_heat, ProductItem.customertagno,
ProductItem.vendortagid,'PD','OD',null,ProductItem.prd_x12outerdiameterum === 'IN' ? await roundoff(ProductItem.prd_outerdiameter * 25.4) : await roundoff(ProductItem.prd_outerdiameter), 'MB',HeaderNameAddress.find(name => name.name_qual === 'F')?.name_id , 
HeaderNameAddress.find(name => name.name_qual === 'S')?.name_id , null, null,flag, createWholeRecord === 'Y' ? '0' : Item.suffix)
}
async function insertmeasures(pool, key, hl1, bsn2, bol, heat, mcoil, prev, meas1, meas2, meas3f, meas3, meas4, n1sf, n1st, n1ma, locn, flag, suffix) {
  await pool.query( `INSERT INTO public."856_SNF_Measure"(
    msr_type, msr_key, msr_hl1, msr_bsn2, msr_bol, msr_heat, msr_mcoil, msr_prev, msr_mea1, msr_mea2, msr_mea3f, msr_mea3, msr_mea4, msr_n1sf, msr_n1st, msr_n1ma, msr_locn, msr_odat, msr_otim, msr_opgm, msr_xref, msr_flow_flag, msr_bol_suffix)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23);`,
  [
    'O', //$1
    key, //$2
    itemIndex, //$3
    index, //$4
    bol, //$5
    heat, //$6
    mcoil, //$7
    prev, //$8 
    meas1, //$9 
    meas2, //$10 
    meas3f, //$11 
    meas3 ? Number(meas3) : null, //$12 
    meas4, //$13 
    n1sf, //$14 
    n1st, //$15 
    n1ma, //$16 
    locn, //$17 
    ymd,    //$62
    hms,   //63
    'O856SNF', //$64
    null, //$21
    flag, //$22
    suffix //$23
  ]);
    }


   
  } catch (error) {
    console.log(error)
    const readableErrorMessage = readableErrors(error, InterchangeControl.ictl_edixcontrolnumber, filePath);
    console.error('-', InterchangeControl.ictl_edixcontrolnumber, '-\n', readableErrorMessage, '\n-', InterchangeControl.ictl_edixcontrolnumber, '-');
  }}


}

  module.exports = {
    LoadO856SNF
};
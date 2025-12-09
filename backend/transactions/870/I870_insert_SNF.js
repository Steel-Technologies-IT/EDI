// This module handles the insertion of parsed EDI 870 records into the PostgreSQL database. 
// It exports functions to insert header, order detail, measure, PID and names records into their respective tables.


const cleo = require("../../db") 

async function LoadI870SNF(pool, records, flag) {

  function group40With42and45(records) {
    const result = [];
    let current40 = null;
     for (const rec of records) {
      if (rec.record_code === "40") {
        current40 = { ...rec, _42s: [], _45s: [] }; // Create a new object with all 40 fields and an empty _42s _45s array
        result.push(current40);
      } else if (rec.record_code === "42" && current40) {
        current40._42s.push({ ...rec }); // Push the full 42 record, not just record_code
      } else if (rec.record_code === "45" && current40) {
        current40._45s.push({ ...rec }); // Push the full 45 record, not just record_code
      } else if (["30", "46", "50", "90"].includes(rec.record_code)) {
        current40 = null;
      }     
    }
    return result;
  }

  function group50With52and55(records) {
    const result = [];
    let current50 = null;
     for (const rec of records) {
      if (rec.record_code === "50") {
        current50 = { ...rec, _52s: [], _55s: [] }; // Create a new object with all 50 fields and an empty _52s _55s array
        result.push(current50);
      } else if (rec.record_code === "52" && current50) {
        current50._52s.push({ ...rec }); // Push the full 52 record, not just record_code
      } else if (rec.record_code === "55" && current50) {
        current50._55s.push({ ...rec }); // Push the full 55 record, not just record_code
      } else if (["30", "40", "56", "90"].includes(rec.record_code)) {
        current50 = null;
      }     
    }
    return result;
  }

function group40With43(records) {
    const result = [];
    let current40 = null;
     for (const rec of records) {
      if (rec.record_code === "40") {
        //current40 = null;
        current40 = { ...rec, _43s: [] }; // Create a new object with all 40 fields and an empty _43s array
        result.push(current40);

      } else if (rec.record_code === "43" && current40) {
        current40._43s.push({ ...rec }); // Push the full 43 record, not just record_code
      } 
       else if (["30", "45", "46", "50", "90"].includes(rec.record_code)) {
        current40 = null;
      }     
    }
    return result;
  }

 function group50With53(records) {
    const result = [];
    let current50 = null;
     for (const rec of records) {
      if (rec.record_code === "50") {
        //current50 = null;
        current50 = { ...rec, _53s: [] }; // Create a new object with all 50 fields and an empty _53s array
        result.push(current50);

      } else if (rec.record_code === "53" && current50) {
        current50._53s.push({ ...rec }); // Push the full 53 record, not just record_code
      } 
       else if (["30", "40", "55", "56", "90"].includes(rec.record_code)) {
        current50 = null;
      }     
    }
    return result;
  }

 function group40With46(records) {
    const result = [];
    let current40 = null;
     for (const rec of records) {
      if (rec.record_code === "40") {
        //current50 = null;
        current40 = { ...rec, _46s: [] }; // Create a new object with all 40 fields and an empty _46s array
        result.push(current40);

      } else if (rec.record_code === "46" && current40) {
        current40._46s.push({ ...rec }); // Push the full 46 record, not just record_code
      } 
       else if (["30", "50", "90"].includes(rec.record_code)) {
        current50 = null;
      }     
    }
    return result;
  }

  function group50With56(records) {
    const result = [];
    let current50 = null;
     for (const rec of records) {
      if (rec.record_code === "50") {
        //current50 = null;
        current50 = { ...rec, _56s: [] }; // Create a new object with all 50 fields and an empty _56s array
        result.push(current50);

      } else if (rec.record_code === "56" && current50) {
        current50._56s.push({ ...rec }); // Push the full 53 record, not just record_code
      } 
       else if (["30", "40", "90"].includes(rec.record_code)) {
        current50 = null;
      }     
    }
    return result;
  }


  const getRecords = (code) => records.filter(r => r.record_code === code);
  // Extract records by code
  const CT = getRecords("CT")[0] || {};
  const ten = getRecords("10")[0] || {};
  const fifteen = getRecords("15") || [];
  const thirty = getRecords("30") || [];
  const forty = getRecords("40") || [];
  const fortytwo = getRecords("42") || [];
  const fortythree = getRecords("43") || [];
  const fortyfive = getRecords("45") || [];
  const fortysix = getRecords("46") || [];
  const fifty = getRecords("50") || [];
  const fiftytwo = getRecords("52") || [];
  const fiftythree = getRecords("53") || [];
  const fiftyfive = getRecords("55") || [];
  const fiftysix = getRecords("56") || [];
  const ninety = getRecords("90")[0] || {};

  // Use grouped 40s with their 42s & 45s
  const groupedItems40_42_45 = group40With42and45(records);
  // Use grouped 40s with their 43s
  const groupedItems40_43 = group40With43(records);
  // Use grouped 40s with their 46s
  const groupedItems40_46 = group40With46(records);
  // Use grouped 50s with their 52s & 55s
  const groupedItems50_52_55 = group50With52and55(records);
  // Use grouped 50s with their 53s
  const groupedItems50_53 = group50With53(records);
  // Use grouped 50s with their 56s
  const groupedItems50_56 = group50With56(records);

  // Insert into 870 Tables
  await insert870Header(pool, CT, ten, ninety, flag);

  // Insert names from the fifteen records
    const namesPromises = fifteen.map(async (fifteen) => {
      await insert870Names(pool, CT, fifteen, flag);
      return Promise.resolve();
    });
  await Promise.all(namesPromises);

  //Insert Into Order Detail
  const OrderDtlPromises = thirty.map(async (thirty) => {
      await insert870OrderDtl(pool, CT, thirty, flag);
      return Promise.resolve();
  });
  await Promise.all(OrderDtlPromises);

//Insert Into ChgInDtl
  const ChgInDtlPromises = groupedItems40_42_45.map(async (forty) => {
  if (!forty) return;
  await insert870ChgInDtl(pool, CT, forty, forty._42s[0], forty._45s[0], flag);
  });
  await Promise.all(ChgInDtlPromises);

//Insert Into ChgInDtlMeasure
  const ChgInMeasurePromises = groupedItems40_46.map(async (forty, index40) => {
    if (forty._46s && forty._46s.length > 0) {
    return Promise.all(  
          forty._46s.map(async (fortysix, index46) => {
            await insert870ChgInMeasure(pool, CT, forty, fortysix, index46, flag);
          }))
    }
    return Promise.resolve();
  });
  await Promise.all(ChgInMeasurePromises);  

  //Insert Into ChgInPID
  const ChgInPIDPromises = groupedItems40_43.map(async (forty, index40) => {
    if (forty._43s && forty._43s.length > 0) {
    return Promise.all(  
          forty._43s.map(async (fortythree, index43) => {
            await insert870ChgInPID(pool, CT, forty, fortythree, index43, flag);
          }))
    }
    return Promise.resolve();
  });
  await Promise.all(ChgInPIDPromises);  

  //Insert Into ChgOutDtl
  const ChgOutDtlPromises = groupedItems50_52_55.map(async (fifty, index50) => {
    if (!fifty || !fifty["HL Parent ID"]) return;
        const singleforty = forty.find(forty => forty["Item HL ID"] === fifty["HL Parent ID"]);
        await insert870ChgOutDtl(pool, CT, singleforty, fifty, fifty._52s[0], fifty._55s[0], flag);
  });
  await Promise.all(ChgOutDtlPromises);

  //Insert Into ChgOutDtlMeasure
  const ChgOutMeasurePromises = groupedItems50_56.map(async (fifty, index50) => {
    if (fifty._56s && fifty._56s.length > 0) {
      return Promise.all(
        fifty._56s.map(async (fiftysix, index56) => {
            const singleforty = forty.find(forty => forty["Item HL ID"] === fifty["HL Parent ID"]);
            await insert870ChgOutMeasure(pool, CT, singleforty, fifty, fiftysix, index56, flag);
          })
      );
    }
    return Promise.resolve();
  });
  await Promise.all(ChgOutMeasurePromises);

  //Insert Into ChgOutPIDPromises
  const ChgOutPIDPromises = groupedItems50_53.map(async (fifty, index50) => {
    if (fifty._53s && fifty._53s.length > 0) {
      return Promise.all(
        fifty._53s.map(async (fiftythree, index53) => {
            const singleforty = forty.find(forty => forty["Item HL ID"] === fifty["HL Parent ID"]);
            await insert870ChgOutPID(pool, CT, singleforty, fifty, fiftythree, index53, flag);
          })
      );
    }
    return Promise.resolve();
  });
  await Promise.all(ChgOutPIDPromises);  

}


//MARK: Header
//870 Header Insert
async function insert870Header(pool, CT, ten, ninety, flag) {
  try {
    const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');
    await pool.query(`
     INSERT INTO public."870_SNF_Header"(
      hdr_type, hdr_key, hdr_isnd_id, hdr_gsnd_id, hdr_ircv_id, hdr_grcv_id, hdr_ictl_no, hdr_gctl_no, hdr_stctl_no, hdr_dsnt_no, hdr_tsnt_no, hdr_sts_rpt_cd, hdr_ord_itm_cd, hdr_ref_id, hdr_date, hdr_prd_dte_cd, hdr_loc_cd, hdr_time, hdr_prod_ref_id, hdr_tran_type, hdr_action_cd, hdr_pdte_no, hdr_ptme_no, hdr_ptmez_cd, hdr_stscd_no, hdr_ststm_no, hdr_stszn_cd, hdr_qltdte_no, hdr_qlttme_no, hdr_qltzne_cd, hdr_mfgidq_cd, hdr_mfgid_id, hdr_outprcq_cd, hdr_outprcid_id, hdr_sum_hl_seg, hdr_sum_hsh_ttl, hdr_sttx_locn, hdr_crt_dat, hdr_crt_tim, hdr_crt_pgm, hdr_isa_qual, hdr_ircv_qual, hdr_flow_flag)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43)
    `, [
      CT["Type (T=Toll; M=Margin; D=Direct Ship)"],  //$1
      CT["Record Key (10-digit integer)"],           //$2
      CT["ISA Sender ID"],            //$3  
      CT["GS Sender ID"],                    //$4
      CT["ISA Receiver ID"],           //$5  
      CT["GS Receiver ID"],        //$6
      CT["ISA Control Number"],         //$7
      CT["GS Control Number"],     //$8
      CT["ST Control Number"], //$9
      ten["Date Sent"] ? ten["Date Sent"] : null,      //$10 hdr_dsnt_no
      ten["Time Sent"] ? ten["Time Sent"] : null,  //$11
      ten["Status Report Code"],    //$12
      ten["Order/Item Code"],       //$13
      ten["Reference ID"],     //$14
      ten["Date"] ? ten["Date"] : null,       //$15
      ten["Product/Date Code"],       //$16
      ten["Location Code"],  //$17
      ten["Time"] ? ten["Time"] : null,      //$18
      ten["Production Reference ID"],     //$19
      ten["Transaction Set Purpose Code"],   //$20 hdr_tran_type
      ten["Action Code"],      //$21
      ten["Process Date"] ? ten["Process Date"] : null,     //$22
      ten["Process Time"] ? ten["Process Time"] : null,      //$23
      ten["Process Time Zone"],     //$24
      ten["Status Change Date"] ? ten["Status Change Date"] : null, //$25
      ten["Status Change Time"] ? ten["Status Change Time"] : null, //$26
      ten["Status Change Time Zone"],  //$27
      ten["Quality Rating Date"] ? ten["Quality Rating Date"] : null,  //$28
      ten["Quality Rating Time"] ? ten["Quality Rating Time"] : null,  //$29
      ten["Quality Rating Time Zone"],    //$30 hdr_qltzne_cd
      ten["Manufacturer ID Qualifier"],  //$31
      ten["Manufacturer ID"],  //$32
      ten["Outside Processor ID Qualifier"],  //$33
      ten["Outside Processor ID"],  //$34
      ninety["Number of Line Items"] ? ninety["Number of Line Items"] : null,       //$35 hdr_sum_hl_seg
      ninety["Hash Total"] ? ninety["Hash Total"] : null,  //$36 hdr_sum_hsh_ttl
      null,     //$37
      Number(ymd),    //$38
      Number(hms),   //$39
      "870i",    //$40
      CT["ISA Sender ID Qualifier"],   //$41
      CT["ISA Receiver ID Qualifier"],   //$42
      flag //$43
    ]);

    console.log('870 Header inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 870 Header Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }
};

//MARK: Names
  //870 Names Insert
async function insert870Names(pool, CT, fifteen, flag) {
 try {
  const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');
    await pool.query( `INSERT INTO public."870_SNF_Names"(
	name_typ, name_key, name_qual, name_qual_id, name_id, name_name, name_addr1, name_addr2, name_city, name_state, name_zpcd, name_ctry_cd, name_cont_name, name_cont_phn, name_cont_eml, name_resp_party_cd, name_crt_dte, name_crt_tme, name_crt_pgm, name_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"],          //$2
    fifteen["AddressTypeCode"],                    //$3
    fifteen["Address ID Qualifier"],           //$4  
    fifteen["Address ID"],            //$5  
    fifteen["Name"],               //$6  
    fifteen["Address Line 1"],              //$7
    fifteen["Address Line 2"],              //$8
    fifteen["City"],             //$9
    fifteen["State/Province"],            //$10
    fifteen["ZipCode"],          //$11
    fifteen["Customer Country Code"],        //$12
    fifteen["Contact Name"],        //$13
    fifteen["Contact Telephone"],       //$14
    fifteen["Contact Email"],       //$15
    fifteen["Responsible Party Code"], //$16
    Number(ymd),    //$17
    Number(hms),   //$18       
    "870i", //$19
    flag //$20
  ]);
  console.log('870 Names inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 870 Names Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }
}

//MARK: Detail
//870 Detail Insert
async function insert870OrderDtl(pool, CT, thirty, flag) {
 try {
  const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');
  await pool.query(`INSERT INTO public."870_SNF_OrderDtl"(
	ord_type, ord_key, ord_hlo, ord_po, ord_pol, ord_pod, ord_rls, ord_poc, ord_cont_no, ord_potype_cd, ord_cpo, ord_cpol, ord_cpart, ord_partd, ord_itm_lin_no, ord_qty_ord, ord_uom, ord_sttx_locn, ord_crt_dat, ord_crt_tim, ord_crt_pgm, ord_flow_flag)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
[
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], //$1
    CT["Record Key (10-digit integer)"], //$2
    thirty["Order HL ID"], //$3
    thirty["Purchase Order Number"], //$4
    thirty["Purchase Order Line Number"], //$5
    thirty["Purchase Order Date"] ? thirty["Purchase Order Date"] : null, //$6
    thirty["Release Number"], //$7
    thirty["Change Order Sequence Number"], //$8
    thirty["Contract Number"], //$9
    thirty["Purchase Order Type Code"], //$10
    thirty["Customer Order Number"], //$11
    thirty["Customer Order Line Number"], //$12
    thirty["Part Number"], //$13
    thirty["Part Description"], //$14
    thirty["Item Line Number"], //$15
    thirty["Quantity Ordered"] ? thirty["Quantity Ordered"] : null, //$16
    thirty["Unit Of Measure Code"], //$17
    null, //$18
    Number(ymd),   //$19 
    Number(hms), //$20
    "870i", //$21
    flag //$22
])
console.log('870 OrderDtl inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 870 Detail Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }}

  
//870 ChgInDtl Insert
async function insert870ChgInDtl(pool, CT, forty, fortytwo, fortyfive, flag) {
 try {
const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');
    await pool.query( `INSERT INTO public."870_SNF_ChgInDtl"(
    chgindtl_type, chgindtl_key, chgindtl_hlo, chgindtl_hli, chgindtl_chrgintype, chgindtl_chrgintag, chgindtl_heat, chgindtl_mcoil, chgindtl_bpart, chgindtl_mo, chgindtl_mol, chgindtl_gc, chgindtl_msa, chgindtl_rpac, chgindtl_rpnc, chgindtl_stsdt, chgindtl_ststm, chgindtl_ststmz, chgindtl_prcdt, chgindtl_prctm, chgindtl_prctmz, chgindtl_qlydte, chgindtl_qlytme, chgindtl_qlytmz, chgindtl_po, chgindtl_rls, chgindtl_chgordseq, chgindtl_pod, chgindtl_pol, chgindtl_contractno, chgindtl_potypecd, chgindtl_awgtlb, chgindtl_awgtkg, chgindtl_twgtlb, chgindtl_twgtkg, chgindtl_gaugin, chgindtl_gaugmm, chgindtl_gaugt, chgindtl_widin, chgindtl_widmm, chgindtl_lnft, chgindtl_lnmt, chgindtl_ulenin, chgindtl_ulenmm, chgindtl_idin, chgindtl_idmm, chgindtl_odin, chgindtl_odmm, chgindtl_pcs, chgindtl_proc, chgindtl_mcls, chgindtl_msts, chgindtl_fault, chgindtl_dmg, chgindtl_fcmt, chgindtl_qsts, chgindtl_csts, chgindtl_linid, chgindtl_qtyord, chgindtl_uom, chgindtl_locn, chgindtl_crt_dat, chgindtl_crt_tim, chgindtl_crt_pgm, chgindtl_flow_flag)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], 
    CT["Record Key (10-digit integer)"],
    forty["HL Parent ID"], 
    forty["Item HL ID"], 
    forty["Charge-In Tag Type"], 
    forty["Charge-In Tag ID"],
    forty["Heat Number"],
    forty["Mill Coil Number"],
    forty["Part Number"], 
    forty["Vendor (Mill) Order Number"], 
    forty["Vendor (Mill) Item/Line Number"], 
    forty["Grade Code"], 
    forty["Material Specification Application #"], 
    forty["Responsible Party Alpha Code"], 
    forty["Responsible Party Number Code"], 
    forty["Status (Outside Processor) Date"] ? forty["Status (Outside Processor) Date"] : null, 
    forty["Status (Outside Processor) Time"] ? forty["Status (Outside Processor) Time"] : null,
    forty["Status (Outside Processor) Time Zone"], 
    forty["Process Date"] ? forty["Process Date"] : null, 
    forty["Process Time"] ? forty["Process Time"] : null,
    forty["Process Time Zone"], 
    forty["Quality Rating Date"] ? forty["Quality Rating Date"] : null, 
    forty["Quality Rating Time"] ? forty["Quality Rating Time"] : null,
    forty["Quality Rating Time Zone"],
    forty["Purchase Order Number"],
    forty["Release Number"], 
    forty["Change Order Sequence Number"], 
    forty["Purchase Order Date"] ? forty["Purchase Order Date"] : null, 
    forty["Purchase Order Line Number"], 
    forty["Contract Number"], 
    forty["Purchase Order Type Code"], 
    fortyfive && fortyfive["Actual Weight (LB)"] ? fortyfive["Actual Weight (LB)"] : fortyfive && fortyfive["Actual Weight (KG)"] ? fortyfive["Actual Weight (KG)"] * 2.20462 : null,
    fortyfive && fortyfive["Actual Weight (KG)"] ? fortyfive["Actual Weight (KG)"] : fortyfive && fortyfive["Actual Weight (LB)"] ? fortyfive["Actual Weight (LB)"] * 0.453592 : null,
    fortyfive && fortyfive["Theoretical Weight (LB)"] ? fortyfive["Theoretical Weight (LB)"] : fortyfive && fortyfive["Theoretical Weight (KG)"] ? fortyfive["Theoretical Weight (KG)"] * 2.20462 : null,
    fortyfive && fortyfive["Theoretical Weight (KG)"] ? fortyfive["Theoretical Weight (KG)"] : fortyfive && fortyfive["Theoretical Weight (LB)"] ? fortyfive["Theoretical Weight (LB)"] * 0.453592 : null,
    fortyfive && fortyfive["Gauge (IN)"] ? fortyfive["Gauge (IN)"] : fortyfive && fortyfive["Gauge (MM)"] ? fortyfive["Gauge (MM)"] / 25.4 : null,
    fortyfive && fortyfive["Gauge (MM)"] ? fortyfive["Gauge (MM)"] : fortyfive && fortyfive["Gauge (IN)"] ? fortyfive["Gauge (IN)"] * 25.4 : null,
    fortyfive && fortyfive["Gauge Type (NOM/MIN/ACT)"] ? fortyfive["Gauge Type (NOM/MIN/ACT)"] : null, 
    fortyfive && fortyfive["Width (IN)"] ? fortyfive["Width (IN)"] : fortyfive && fortyfive["Width (MM)"] ? fortyfive["Width (MM)"] / 25.4 : null,
    fortyfive && fortyfive["Width (MM)"] ? fortyfive["Width (MM)"] : fortyfive && fortyfive["Width (IN)"] ? fortyfive["Width (IN)"] * 25.4 : null,
    fortyfive && fortyfive["Linear Feet"] ? fortyfive["Linear Feet"] : fortyfive && fortyfive["Linear Meters"] ? fortyfive["Linear Meters"] * 3.2808 : null,
    fortyfive && fortyfive["Linear Meters"] ? fortyfive["Linear Meters"] : fortyfive && fortyfive["Linear Feet"] ? fortyfive["Linear Feet"] / 3.2808 : null,
    fortyfive && fortyfive["Unit Length (IN)"] ? fortyfive["Unit Length (IN)"] : fortyfive && fortyfive["Unit Length (MM)"] ? fortyfive["Unit Length (MM)"] / 25.4 : null,
    fortyfive && fortyfive["Unit Length (MM)"] ? fortyfive["Unit Length (MM)"] : fortyfive && fortyfive["Unit Length (IN)"] ? fortyfive["Unit Length (IN)"] * 25.4 : null,
    fortyfive && fortyfive["Inside Diameter (IN)"] ? fortyfive["Inside Diameter (IN)"] : fortyfive && fortyfive["Inside Diameter (MM)"] ? fortyfive["Inside Diameter (MM)"] / 25.4 : null,
    fortyfive && fortyfive["Inside Diameter (MM)"] ? fortyfive["Inside Diameter (MM)"] : fortyfive && fortyfive["Inside Diameter (IN)"] ? fortyfive["Inside Diameter (IN)"] * 25.4 : null,
    fortyfive && fortyfive["Outside Diameter (IN)"] ? fortyfive["Outside Diameter (IN)"] : fortyfive && fortyfive["Outside Diameter (MM)"] ? fortyfive["Outside Diameter (MM)"] / 25.4 : null,
    fortyfive && fortyfive["Outside Diameter (MM)"] ? fortyfive["Outside Diameter (MM)"] : fortyfive && fortyfive["Outside Diameter (IN)"] ? fortyfive["Outside Diameter (IN)"] * 25.4 : null,
    fortyfive && fortyfive["Pieces"] ? fortyfive["Pieces"] : null, 
    fortytwo && fortytwo["Process Performed (AISI Table 66)"] ? fortytwo["Process Performed (AISI Table 66)"] : null, 
    fortytwo && fortytwo["Material Classification (AISI Table 67)"] ? fortytwo["Material Classification (AISI Table 67)"] : null, 
    fortytwo && fortytwo["Material Status (AISI Table 70)"] ? fortytwo["Material Status (AISI Table 70)"] : null, 
    fortytwo && fortytwo["Reason/Fault Code (AISI Table 72)"] ? fortytwo["Reason/Fault Code (AISI Table 72)"] : null, 
    fortytwo && fortytwo["Damage/Scrap Code (AISI Table 73)"] ? fortytwo["Damage/Scrap Code (AISI Table 73)"] : null, 
    fortytwo && fortytwo["Free-form Comment"] ? fortytwo["Free-form Comment"] : null, 
    fortytwo && fortytwo["Quality Status Code (AISI Table 68)"] ? fortytwo["Quality Status Code (AISI Table 68)"] : null, 
    fortytwo && fortytwo["Commercial Status Code (AISI Table 69)"] ? fortytwo["Commercial Status Code (AISI Table 69)"] : null, 
    forty["Item Line Number"], 
    forty["Quantity Ordered"] ? forty["Quantity Ordered"] : null, 
    forty["Unit Of Measure Code"], 
    null,
    Number(ymd),
    Number(hms),
    "870i",
    flag
  ]);
    console.log('870 ChgInDtl inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 870 ChgInDtl Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }}

//870 ChgInMeasure Insert
async function insert870ChgInMeasure(pool, CT, forty, fortysix, index46, flag) {
 try {
const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');
    await pool.query( `INSERT INTO public."870_SNF_ChgInMeasure"(
    chginmsr_type, chginmsr_key, chginmsr_hlo, chginmsr_hli, chginmsr_chrgintype, chginmsr_chrgintag, chginmsr_chginmeasq, chginmsr_heat, chginmsr_mcoil, chginmsr_measr, chginmsr_measq, chginmsr_measf, chginmsr_measval, chginmsr_measuom, chginmsr_measrmin, chginmsr_measrmax, chginmsr_crt_dat, chginmsr_crt_tim, chginmsr_crt_pgm, chginmsr_flow_flag)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], 
    CT["Record Key (10-digit integer)"],
    forty["HL Parent ID"], 
    forty["Item HL ID"], 
    forty["Charge-In Tag Type"], 
    forty["Charge-In Tag ID"],
    index46 + 1,
    forty["Heat Number"],
    forty["Mill Coil Number"],
    fortysix["Measurement Reference ID Code"], 
    fortysix["Measurement Qualifier"], 
    null, 
    fortysix["Measurement Value"] ? fortyfive["Measurement Value"] : null,
    fortysix["Unit Of Measure"], 
    fortysix["Range Minimum"] ? fortyfive["Range Minimum"] : null,
    fortysix["Range Maximum"] ? fortyfive["Range Maximum"] : null,
    Number(ymd),
    Number(hms),
    "870i",
    flag
  ]);
    console.log('870 ChgInMeasure inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 870 ChgInMeasure Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }}

//870 870_SNF_ChgInPID Insert
async function insert870ChgInPID(pool, CT, forty, fortythree, index43, flag) {
 try {
const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');
    await pool.query( `INSERT INTO public."870_SNF_ChgInPID"(
    chginpid_type, chginpid_key, chginpid_hlo, chginpid_hli, chginpid_chrgintype, chginpid_chrgintag, chginpid_chrginpidno, chginpid_heat, chginpid_mcoil, chginpid_desctyp, chginpid_prccharcd, chginpid_agencyqualcd, chginpid_prddesccd, chginpid_desc, chginpid_surfposcd, chginpid_srcsubq, chginpid_condrespcd, chginpid_langcd, chginpid_crt_dat, chgindtl_crt_tim, chginpid_crt_pgm, chginpid_flow_flag)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], 
    CT["Record Key (10-digit integer)"],
    forty["HL Parent ID"], 
    forty["Item HL ID"], 
    forty["Charge-In Tag Type"], 
    forty["Charge-In Tag ID"],
    index43 + 1,
    forty["Heat Number"],
    forty["Mill Coil Number"],
    fortythree["Item Description Type"], 
    fortythree["Product/Process Characteristic Code"], 
    fortythree["Agency Qualifier Code"], 
    fortythree["Product Description Code"], 
    fortythree["Description"], 
    fortythree["Surface/Layer/Position Code"], 
    fortythree["Source Subqualifier"], 
    fortythree["Condition/ Response Code"], 
    fortythree["Language Code"], 
    Number(ymd),
    Number(hms),
    "870i",
    flag
  ]);
    console.log('870 ChgInPID inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 870 ChgInPID Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }}  

  //870 ChgOutDtl Insert
async function insert870ChgOutDtl(pool, CT, forty, fifty, fiftytwo, fiftyfive, flag) {
 try {

  //console.log("insert870ChgOutDtl",fiftytwo,fiftyfive);
  //console.log(fiftytwo );
const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');
    await pool.query( `INSERT INTO public."870_SNF_ChgOutDtl"(
    chgoutdtl_type, chgoutdtl_key, chgoutdtl_hlo, chgoutdtl_hli, chgoutdtl_hlf, chgoutdtl_chrgintype, chgoutdtl_chrgintag, chgoutdtl_chrgoutttyp, chgoutdtl_chrgouttag, chgoutdtl_heat, chgoutdtl_mcoil, chgoutdtl_bpart, chgoutdtl_mo, chgoutdtl_mol, chgoutdtl_gc, chgoutdtl_msa, chgoutdtl_rpac, chgoutdtl_rpnc, chgoutdtl_stsdt, chgoutdtl_ststm, chgoutdtl_ststmz, chgoutdtl_prcdt, chgoutdtl_prctm, chgoutdtl_prctmz, chgoutdtl_qlydte, chgoutdtl_qlytme, chgoutdtl_qlytmz, chgoutdtl_po, chgoutdtl_rls, chgoutdtl_chgordseq, chgoutdtl_pod, chgoutdtl_pol, chgoutdtl_contractno, chgoutdtl_potypecd, chgoutdtl_awgtlb, chgoutdtl_awgtkg, chgoutdtl_twgtlb, chgoutdtl_twgtkg, chgoutdtl_gaugin, chgoutdtl_gaugmm, chgoutdtl_gaugt, chgoutdtl_widin, chgoutdtl_widmm, chgoutdtl_lnft, chgoutdtl_lnmt, chgoutdtl_ulenin, chgoutdtl_ulenmm, chgoutdtl_idin, chgoutdtl_idmm, chgoutdtl_odin, chgoutdtl_odmm, chgoutdtl_pcs, chgoutdtl_proc, chgoutdtl_mcls, chgoutdtl_msts, chgoutdtl_fault, chgoutdtl_dmg, chgoutdtl_fcmt, chgoutdtl_qsts, chgoutdtl_csts, chgoutdtl_linid, chgoutdtl_qtyord, chgoutdtl_uom, chgoutdtl_ran, chgoutdtl_locn, chgoutdtl_crt_dat, chgoutdtl_crt_tim, chgoutdtl_crt_pgm, chgoutdtl_flow_flag)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], 
    CT["Record Key (10-digit integer)"],
    forty["HL Parent ID"],   
    fifty["HL Parent ID"],
    fifty["Component HL ID"],
    forty["Charge-In Tag Type"], 
    forty["Charge-In Tag ID"],
    fifty["Charge-Out Tag Type"], 
    fifty["Charge-Out Tag ID"],
    fifty["Heat Number"],
    fifty["Mill Coil Number"],
    fifty["Part Number"], 
    fifty["Vendor (Mill) Order Number"], 
    fifty["Vendor (Mill) Item/Line Number"], 
    fifty["Grade Code"], 
    fifty["Material Specification Application #"], 
    fifty["Responsible Party Alpha Code"], 
    fifty["Responsible Party Number Code"], 
    fifty["Status (Outside Processor) Date"] ? fifty["Status (Outside Processor) Date"] : null, 
    fifty["Status (Outside Processor) Time"] ? fifty["Status (Outside Processor) Time"] : null,
    fifty["Status (Outside Processor) Time Zone"], 
    fifty["Process Date"] ? fifty["Process Date"] : null, 
    fifty["Process Time"] ? fifty["Process Time"] : null,
    fifty["Process Time Zone"], 
    fifty["Quality Rating Date"] ? fifty["Quality Rating Date"] : null, 
    fifty["Quality Rating Time"] ? fifty["Quality Rating Time"] : null,
    fifty["Quality Rating Time Zone"],
    fifty["Purchase Order Number"],
    fifty["Release Number"], 
    fifty["Change Order Sequence Number"], 
    fifty["Purchase Order Date"] ? fifty["Purchase Order Date"] : null, 
    fifty["Purchase Order Line Number"], 
    fifty["Contract Number"], 
    fifty["Purchase Order Type Code"], 
    fiftyfive && fiftyfive["Actual Weight (LB)"] ? fiftyfive["Actual Weight (LB)"] : fiftyfive && fiftyfive["Actual Weight (KG)"] ? fiftyfive["Actual Weight (KG)"] * 2.20462 : null,
    fiftyfive && fiftyfive["Actual Weight (KG)"] ? fiftyfive["Actual Weight (KG)"] : fiftyfive && fiftyfive["Actual Weight (LB)"] ? fiftyfive["Actual Weight (LB)"] * 0.453592 : null,
    fiftyfive && fiftyfive["Theoretical Weight (LB)"] ? fiftyfive["Theoretical Weight (LB)"] : fiftyfive && fiftyfive["Theoretical Weight (KG)"] ? fiftyfive["Theoretical Weight (KG)"] * 2.20462 : null,
    fiftyfive && fiftyfive["Theoretical Weight (KG)"] ? fiftyfive["Theoretical Weight (KG)"] : fiftyfive && fiftyfive["Theoretical Weight (LB)"] ? fiftyfive["Theoretical Weight (LB)"] * 0.453592 : null,
    fiftyfive && fiftyfive["Gauge (IN)"] ? fiftyfive["Gauge (IN)"] : fiftyfive && fiftyfive["Gauge (MM)"] ? fiftyfive["Gauge (MM)"] / 25.4 : null,
    fiftyfive && fiftyfive["Gauge (MM)"] ? fiftyfive["Gauge (MM)"] : fiftyfive && fiftyfive["Gauge (IN)"] ? fiftyfive["Gauge (IN)"] * 25.4 : null,
    fiftyfive && fiftyfive["Gauge Type (NOM/MIN/ACT)"] ? fiftyfive["Gauge Type (NOM/MIN/ACT)"] : null, 
    fiftyfive && fiftyfive["Width (IN)"] ? fiftyfive["Width (IN)"] : fiftyfive && fiftyfive["Width (MM)"] ? fiftyfive["Width (MM)"] / 25.4 : null,
    fiftyfive && fiftyfive["Width (MM)"] ? fiftyfive["Width (MM)"] : fiftyfive && fiftyfive["Width (IN)"] ? fiftyfive["Width (IN)"] * 25.4 : null,
    fiftyfive && fiftyfive["Linear Feet"] ? fiftyfive["Linear Feet"] : fiftyfive && fiftyfive["Linear Meters"] ? fiftyfive["Linear Meters"] * 3.2808 : null,
    fiftyfive && fiftyfive["Linear Meters"] ? fiftyfive["Linear Meters"] : fiftyfive && fiftyfive["Linear Feet"] ? fiftyfive["Linear Feet"] / 3.2808 : null,
    fiftyfive && fiftyfive["Unit Length (IN)"] ? fiftyfive["Unit Length (IN)"] : fiftyfive && fiftyfive["Unit Length (MM)"] ? fiftyfive["Unit Length (MM)"] / 25.4 : null,
    fiftyfive && fiftyfive["Unit Length (MM)"] ? fiftyfive["Unit Length (MM)"] : fiftyfive && fiftyfive["Unit Length (IN)"] ? fiftyfive["Unit Length (IN)"] * 25.4 : null,
    fiftyfive && fiftyfive["Inside Diameter (IN)"] ? fiftyfive["Inside Diameter (IN)"] : fiftyfive && fiftyfive["Inside Diameter (MM)"] ? fiftyfive["Inside Diameter (MM)"] / 25.4 : null,
    fiftyfive && fiftyfive["Inside Diameter (MM)"] ? fiftyfive["Inside Diameter (MM)"] : fiftyfive && fiftyfive["Inside Diameter (IN)"] ? fiftyfive["Inside Diameter (IN)"] * 25.4 : null,
    fiftyfive && fiftyfive["Outside Diameter (IN)"] ? fiftyfive["Outside Diameter (IN)"] : fiftyfive && fiftyfive["Outside Diameter (MM)"] ? fiftyfive["Outside Diameter (MM)"] / 25.4 : null,
    fiftyfive && fiftyfive["Outside Diameter (MM)"] ? fiftyfive["Outside Diameter (MM)"] : fiftyfive && fiftyfive["Outside Diameter (IN)"] ? fiftyfive["Outside Diameter (IN)"] * 25.4 : null,
    fiftyfive && fiftyfive["Pieces"] ? fiftyfive["Pieces"] : null, 
    fiftytwo && fiftytwo["Process Performed (AISI Table 66)"] ? fiftytwo["Process Performed (AISI Table 66)"] : null, 
    fiftytwo && fiftytwo["Material Classification (AISI Table 67)"] ? fiftytwo["Material Classification (AISI Table 67)"] : null, 
    fiftytwo && fiftytwo["Material Status (AISI Table 70)"] ? fiftytwo["Material Status (AISI Table 70)"] : null, 
    fiftytwo && fiftytwo["Reason/Fault Code (AISI Table 72)"] ? fiftytwo["Reason/Fault Code (AISI Table 72)"] : null, 
    fiftytwo && fiftytwo["Damage/Scrap Code (AISI Table 73)"] ? fiftytwo["Damage/Scrap Code (AISI Table 73)"] : null, 
    fiftytwo && fiftytwo["Free-form Comment"] ? fiftytwo["Free-form Comment"] : null, 
    fiftytwo && fiftytwo["Quality Status Code (AISI Table 68)"] ? fiftytwo["Quality Status Code (AISI Table 68)"] : null, 
    fiftytwo && fiftytwo["Commercial Status Code (AISI Table 69)"] ? fiftytwo["Commercial Status Code (AISI Table 69)"] : null, 
    fifty["Item Line Number"], 
    fifty["Quantity Ordered"] ? fifty["Quantity Ordered"] : null, 
    fifty["Unit Of Measure Code"], 
    fifty["RAN / KANBAN Number"],
    null,
    Number(ymd),
    Number(hms),
    "870i",
    flag
  ]);
    console.log('870 ChgOutDtl inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 870 ChgOutDtl Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }}

//870 ChgOutMeasure Insert
async function insert870ChgOutMeasure(pool, CT, forty, fifty, fiftysix, index56, flag) {
 try {
const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');
    await pool.query( `INSERT INTO public."870_SNF_ChgOutMeasure"(
    chgoutmsr_type, chgoutmsr_key, chgoutmsr_hlo, chgoutmsr_hli, chgoutmsr_hlf, chgoutmsr_chrginttyp, chgoutmsr_chrgintag, chgoutmsr_chrgoutttyp, chgoutmsr_chrgouttag, chgoutmsr_chrgoutmeas, chgoutmsr_heat, chgoutmsr_mcoil, chgoutmsr_measr, chgoutmsr_measq, chgoutmsr_measf, chgoutmsr_measval, chgoutmsr_measuom, chgoutmsr_measrmin, chgoutmsr_measrmax, chgoutmsr_crt_dat, chgoutmsr_crt_tim, chgoutmsr_crt_pgm, chgoutmsr_flow_flag)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], 
    CT["Record Key (10-digit integer)"],
    forty["HL Parent ID"], 
    fifty["HL Parent ID"],
    fifty["Component HL ID"],
    forty["Charge-In Tag Type"], 
    forty["Charge-In Tag ID"],
    fifty["Charge-Out Tag Type"], 
    fifty["Charge-Out Tag ID"],
    index56 + 1,
    fifty["Heat Number"],
    fifty["Mill Coil Number"],
    fiftysix["Measurement Reference ID Code"], 
    fiftysix["Measurement Qualifier"], 
    null, 
    fiftysix["Measurement Value"] ? fiftysix["Measurement Value"] : null,
    fiftysix["Unit Of Measure"], 
    fiftysix["Range Minimum"] ? fiftysix["Range Minimum"] : null,
    fiftysix["Range Maximum"] ? fiftysix["Range Maximum"] : null,
    Number(ymd),
    Number(hms),
    "870i",
    flag
  ]);
    console.log('870 ChgOutMeasure inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 870 ChgOutMeasure Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }}

//870 870_SNF_ChgOutPID Insert
async function insert870ChgOutPID(pool, CT, forty, fifty, fiftythree, index53, flag) {
 try {
const now = new Date();
const ymd = now.getFullYear().toString() +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0');
const hms = String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');
    await pool.query( `INSERT INTO public."870_SNF_ChgOutPID"(
    chgoutpid_type, chgoutpid_key, chgoutpid_hlo, chgoutpid_hli, chgoutpid_hlf, chgoutpid_chrginttyp, chgoutpid_chrgintag, chgoutpid_chrgoutttyp, chgoutpid_chrgouttag, chgoutpid_chrgoutpids, chgoutpid_heat, chgoutpid_mcoil, chgoutpid_desctyp, chgoutpid_prccharcd, chgoutpid_agencyqualcd, chgoutpid_prddesccd, chgoutpid_desc, chgoutpid_surfposcd, chgoutpid_srcsubq, chgoutpid_condrespcd, chgoutpid_langcd, chgoutpid_crt_dat, chgoutpid_crt_tim, chgoutpid_crt_pgm, chgoutpid_flow_flag)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25);`,
  [
    CT["Type (T=Toll; M=Margin; D=Direct Ship)"], 
    CT["Record Key (10-digit integer)"],
    forty["HL Parent ID"], 
    fifty["HL Parent ID"],
    fifty["Component HL ID"],
    forty["Charge-In Tag Type"], 
    forty["Charge-In Tag ID"],
    fifty["Charge-Out Tag Type"], 
    fifty["Charge-Out Tag ID"],
    index53 + 1,
    fifty["Heat Number"],
    fifty["Mill Coil Number"],
    fiftythree["Item Description Type"], 
    fiftythree["Product/Process Characteristic Code"], 
    fiftythree["Agency Qualifier Code"], 
    fiftythree["Product Description Code"], 
    fiftythree["Description"], 
    fiftythree["Surface/Layer/Position Code"], 
    fiftythree["Source Subqualifier"], 
    fiftythree["Condition/ Response Code"], 
    fiftythree["Language Code"], 
    Number(ymd),
    Number(hms),
    "870i",
    flag
  ]);
    console.log('870 ChgOutPID inserted successfully');
  } catch (error) {
    console.error('-', CT["Record Key (10-digit integer)"], '-\n',"Error inserting into 870 ChgOutPID Table", error,'\n-', CT["Record Key (10-digit integer)"], '-');
  }} 

  module.exports = {
    LoadI870SNF
};


async function validateOPInbTransaction(pool, records, flag) {

    const { ReturnPO } = require('./transformationInbound');
  
    let firstThirtyFlag = true; // Flag to track the first 30 record
    let firstFortyFlag = true; // Flag to track the first 40 record
    let firstThirty = null; // Variable to store the first 30 record
    let firstForty = null; // Variable to store the first 40 record
    let GaugeIN = null; // Variable to store Gauge in inches
    let WidthIN = null; // Variable to store Width in inches

    for (const rec of records) {
      
      if (rec.record_code === "30") {
        if (firstThirtyFlag) {
        firstThirty = rec; // Store the first 30 record for reference
        firstThirtyFlag = false; // Set the flag to false after processing the first 30 record
      }
      else { break;}}

     else if (rec.record_code === "40") {
        if (firstFortyFlag) {
        firstForty = rec; // Store the first 40 record for reference
        firstFortyFlag = false; // Set the flag to false after processing the first 40 record
        }
        else { break;}}

       else if (rec.record_code === "49") {
        
        if (["GG", "TH"].includes(rec["Measurement Qualifier"]) && ["IN", "ED", "EM", "E8"].includes(rec["Measurement UOM"])) {
          GaugeIN = rec["Measurement Value"];
        }
        if (rec["Measurement Qualifier"] === "WD" && ["IN", "ED", "EM", "E8"].includes(rec["Measurement UOM"])) {
          WidthIN = rec["Measurement Value"];
        }
      } else if (rec.record_code === "80") {
        break; // Stop processing further records after the first 80 record
      }
    }

  
const details = {
    dtl_cpo: firstThirty["PO No"] || null,
    dtl_pol: (firstThirty['Customer PO Line Number'] ? firstThirty['Customer PO Line Number'] : firstForty["PO Line No"] ? firstForty["PO Line No"] : firstThirty['Customer PO Release Number']).toString().padStart(3, '0'),
    dtl_gaugin: GaugeIN ? GaugeIN : null,
    dtl_widin: WidthIN ? WidthIN : null
}

const POwithPOL = await ReturnPO(details);
let validOPtransaction = false;
if (POwithPOL !== null && POwithPOL.substring(9,12) !== '000') {
    validOPtransaction = true;
}

return validOPtransaction;

}

module.exports = validateOPInbTransaction;
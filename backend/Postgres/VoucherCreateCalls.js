const express = require("express");
const app = express.Router();
const pool = require("../db2");
const { translations, transformMap} = require('../transactions/registry.js');
const path = require('path');
const fs = require('fs');
const processInvoiceToVoucher = require('../transactions/810/I810_crt_vch.js').processInvoiceToVoucher;





app.post("/CreateVoucher", async (req, res) => {
  const { key } = req.body;
  console.log('Creating Voucher:', key);
  await processInvoiceToVoucher('U', key)
  
  return res.status(200).json({ message: "Voucher created successfully" })
  }
);




// Get errored out vouchers (where vouchernumber is null)
app.get('/erroredVouchers', async (req, res) => {
  try {
    console.log('Fetching errored vouchers...');
    const result = await pool.query(`
      SELECT 
        vch_key,
        vch_type,
        vch_companyid,
        vch_voucherprefix,
        vch_entrydate,
        vch_vendorid,
        vch_vendorinvoicenumber,
        vch_externalreference,
        vch_vendorinvoicedate,
        vch_purchaseorderprefix,
        vch_purchaseordernumber,
        vch_purchaseorderitem,
        vch_voucheramount,
        vch_transactionstatus,
        vch_transactionstatusremarks,
        vch_discountableamount,
        vch_err_msg
      FROM public."810_Invex_VoucherHeader"
      WHERE vch_vouchernumber IS NULL
      ORDER BY vch_key DESC
    `);
    
    console.log(`Found ${result.rows.length} errored vouchers`);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching errored vouchers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});











module.exports = app;
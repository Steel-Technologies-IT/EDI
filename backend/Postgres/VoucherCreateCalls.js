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










module.exports = app;
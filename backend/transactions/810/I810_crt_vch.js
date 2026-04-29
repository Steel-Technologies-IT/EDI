const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { getSTARAuthToken } = require('../../getSTARAuthToken.js');
const pool = require("../../db2.js");

class VoucherCreator {
    constructor() {
        this.apiUrl = process.env.STAR_EDI_URL
    }


    async createVoucher(voucherData) {
        try {
            if (!this.apiUrl) {
                throw new Error('VOUCHER_API_URL (or VOUCHER_SERVICE_URL) is required for JSON voucher submission');
            }


            // Get authentication token from INVEX
            console.log('Obtaining authentication token from INVEX...');
            const authResult = await getSTARAuthToken();
            const tokenValue = authResult?.access_token || authResult?.raw?.data?.accessToken || authResult?.raw?.access_token;
            const tokenType = authResult?.token_type || authResult?.raw?.data?.tokenType || 'Bearer';

            if (!tokenValue) {
                throw new Error('OAuth token response did not include an access token');
            }
            
            console.log('Authentication successful');

            // Prepare the voucher object with formatted dates
            const voucher = { 
                headerInfo: {
                companyId: voucherData.companyId,
                vendorId: voucherData.vendorId,
                invoiceAmount: voucherData.invoiceAmount,
                invoiceDate: voucherData.invoiceDate,
                invoiceNumber: voucherData.invoiceNumber,
                }
            };

            // Add optional fields only if they have actual values
            if (voucherData.accountNumber) voucher.headerInfo.accountNumber = voucherData.accountNumber;
            if (voucherData.vendorName) voucher.headerInfo.vendorName = voucherData.vendorName;
            if (voucherData.externalReference) voucher.headerInfo.externalReference = voucherData.externalReference;

            if (voucherData.purchaseOrderNumber) voucher.headerInfo.purchaseOrderNumber = voucherData.purchaseOrderNumber;
            if (voucherData.purchaseOrderItem) voucher.headerInfo.purchaseOrderItem = voucherData.purchaseOrderItem;
            if (voucherData.salesOrderNumber) voucher.headerInfo.salesOrderNumber = voucherData.salesOrderNumber;
            if (voucherData.materialTransferNumber) voucher.headerInfo.materialTransferNumber = voucherData.materialTransferNumber;
            if (voucherData.voyageNumber) voucher.headerInfo.voyageNumber = voucherData.voyageNumber;
            
            if (voucherData.voucherBranch) voucher.headerInfo.voucherBranch = voucherData.voucherBranch;
            if (voucherData.serviceAddress) voucher.headerInfo.serviceAddress = voucherData.serviceAddress;
            if (voucherData.shippingAddress) voucher.headerInfo.shippingAddress = voucherData.shippingAddress;
            if (voucherData.billingAddress) voucher.headerInfo.billingAddress = voucherData.billingAddress;
            if (voucherData.companyAddress) voucher.headerInfo.companyAddress = voucherData.companyAddress;
            if (voucherData.vendorAddress) voucher.headerInfo.vendorAddress = voucherData.vendorAddress;
            
            if (voucherData.pretaxVoucherAmount) voucher.headerInfo.pretaxVoucherAmount = voucherData.pretaxVoucherAmount;
            if (voucherData.discountableAmount) voucher.headerInfo.discountableAmount = voucherData.discountableAmount;
            if (voucherData.taxAmount) voucher.headerInfo.taxAmount = voucherData.taxAmount;
            if (voucherData.taxPercent) voucher.headerInfo.taxPercent = voucherData.taxPercent;

            if (voucherData.currency) voucher.headerInfo.currency = voucherData.currency;
            if (voucherData.exchangeRate) voucher.headerInfo.exchangeRate = voucherData.exchangeRate;

            if (voucherData.checkItemRemarks) voucher.headerInfo.checkItemRemarks = voucherData.checkItemRemarks;
            if (voucherData.isTaxApplicable) voucher.headerInfo.isTaxApplicable = voucherData.isTaxApplicable;
            if (voucherData.category)  voucher.headerInfo.category = voucherData.category; 


            // Send voucher as JSON payload to target endpoint with OAuth bearer token.
            const response = await axios.post(this.apiUrl, voucher, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `${tokenType} ${tokenValue}`
                },
                timeout: 30000
            });

            console.log('Voucher JSON API response received successfully');
            console.log(response)
            // Parse the response
            const responseData = response?.data || {};
            const output = responseData.createVoucherOutput || responseData.data || responseData;
            console.log("Response Data:", responseData)
            return {
                success: true,
                voucherPrefix: output.voucherPrefix || voucher.voucherPrefix || null,
                voucherNumber: output.voucherNumber || null,
                sessionId: output.sessionId || null,
                rawResponse: responseData
            };

        } catch (error) {
            console.error('Error creating voucher:', error.message);

            if (error.response) {
                const responseData = error.response.data;
                console.error('Voucher API error response:', responseData);
                const apiMessage = responseData?.message || responseData?.error || responseData?.Error || JSON.stringify(responseData);
                throw new Error(`Voucher API request failed (${error.response.status}): ${apiMessage}`);
            }

            throw new Error(`Failed to create voucher: ${error.message}`);
        }
    }
}

function formatDate(date) {
    if (!date) return null;

    const value = String(date).trim();

    // Already in target format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        return value;
    }

    // Convert YYYYMMDD -> MM/DD/YYYY
    if (/^\d{8}$/.test(value)) {
        const yyyy = value.substring(0, 4);
        const mm = value.substring(4, 6);
        const dd = value.substring(6, 8);
        return `${mm}/${dd}/${yyyy}`;
    }

    // Normalize YYYY-MM-DD or other parseable inputs to MM/DD/YYYY
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getDate()).padStart(2, '0');
        const yyyy = parsed.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
    }

    return value;
}

async function processInvoiceToVoucher(type, key) {
    try {
        const voucherCreator = new VoucherCreator();
        
        // Retrieve voucher data from database
        const voucherDataRetrieve = await pool.query(
            'SELECT * FROM public."810_Invex_VoucherHeader" WHERE vch_key = $1', 
            [key]
        );

        // Check if record exists
        if (!voucherDataRetrieve.rows || voucherDataRetrieve.rows.length === 0) {
            console.error(`No voucher data found for key: ${key}`);
            return {
                success: false,
                error: 'Voucher record not found in database',
                key: key
            };
        }

        const record = voucherDataRetrieve.rows[0];

        // Validate required fields before attempting to create voucher
        const missingFields = [];
        if (!record.vch_companyid) missingFields.push('companyId');
        if (!record.vch_voucherprefix) missingFields.push('voucherPrefix');
        if (!record.vch_vendorid) missingFields.push('vendorId');
        if (!record.vch_voucheramount) missingFields.push('voucherAmount');
        if (!record.vch_vendorinvoicedate) missingFields.push('vendorInvoiceDate');

        if (missingFields.length > 0) {
            const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
            console.error(`Voucher validation failed for key ${key}:`, errorMsg);
            
            // Update database with error status
            await pool.query(
                `UPDATE public."810_Invex_VoucherHeader"
                 SET
                     vch_err_msg = $1
                 WHERE vch_key = $2`,
                [errorMsg, key]
            );

            return {
                success: false,
                error: errorMsg,
                missingFields: missingFields,
                key: key
            };
        }

        const voucherData = {
            companyId: record.vch_companyid,
            vendorId: record.vch_vendorid,
            vendorName: record.vch_vendorname,
            //accountNumber: record.vch_accountnumber,
            invoiceNumber: record.vch_vendorinvoicenumber,
            externalReference: record.vch_externalreference,
            invoiceDescription: record.vch_voucherdescription,
            // Order Details
            purchaseOrderNumber: record.vch_purchaseordernumber,
            purchaseOrderItem: record.vch_purchaseorderitem,
            salesOrderNumber: record.vch_salesordernumber,
            materialTransferNumber: record.vch_materialtransfernumber,
            voyageNumber: record.vch_voyagenumber,
            invoiceDate: formatDate(record.vch_vendorinvoicedate),
            // Branch / Location / Address
            branch: record.vch_voucherbranch,
            //serviceAddress: record.vch_serviceaddress,
            //shippingAddress: record.vch_shippingaddress,
            //companyAddress: record.vch_companyaddress,
            //vendorAddress: record.vch_vendoraddress,
            //billingAddress: record.vch_billingaddress,
            // Financial Amounts
            invoiceAmount: record.vch_voucheramount,
            preTaxInvoiceAmount: record.vch_pretaxvoucheramount,
            discountableAmount: record.vch_discountableamount,
            //taxPercent: record.vch_taxpercent,
            //taxAmount: record.vch_taxamount,
            // Currency & Exchange
            currency: record.vch_vouchercurrency,
            exchangeRate: record.vch_exchangerate,
            // Category & Misc
            category: record.vch_vouchercategory,
            checkItemRemarks: record.vch_checkitemremarks,
            isTaxApplicable: record.vch_istaxapplicable
        };

        console.log(voucherData)
        console.log(`Creating voucher for key: ${key}`);
        const voucherResponse = await voucherCreator.createVoucher(voucherData);
        console.log(`Voucher creation response for key ${key}:`, voucherResponse);
        if (voucherResponse.success) {
            // Update the database with the returned voucher number and prefix
            await pool.query(
                `UPDATE public."810_Invex_VoucherHeader"
                 SET 
                     vch_vouchernumber = $1,
                     vch_sessionid = $2,
                     vch_err_msg = $3
                 WHERE vch_key = $4 AND vch_voucherprefix = $5`,
                [
                    voucherResponse.voucherNumber,
                    voucherResponse.sessionId,
                    null,
                    key,
                    voucherResponse.voucherPrefix
                ]
            );

            console.log(`✓ Voucher created successfully: ${voucherResponse.voucherPrefix}-${voucherResponse.voucherNumber}`);
        }

        return voucherResponse;

    } catch (error) {
        console.error(`Error processing voucher for key ${key}:`, error.message);

        // Extract meaningful error message
        let errorMessage = error.message;
        let errorStatus = 'ERR';

        // Check for specific error types
        if (error.message.includes('Voucher validation failed')) {
            errorStatus = 'VAL';
            // Validation errors already include field names
        } else if (error.message.includes('Duplicate Invoice')) {
            errorStatus = 'DUP';
            // Extract voucher reference from duplicate error
            const voucherMatch = voucherData.vendorInvoiceNumber
            if (voucherMatch) {
                errorMessage = `Duplicate invoice - existing voucher already exists for invoice: ${voucherMatch}`;
            }
        } else if (error.message.includes('SOAP Fault')) {
            errorStatus = 'API';
        }

        // Update database with error information
        try {
            await pool.query(
                `UPDATE public."810_Invex_VoucherHeader"
                 SET 
                vch_err_msg = $1
                 WHERE vch_key = $2`,
                [errorMessage, key] // Limit message to 50 chars
            );
        } catch (dbError) {
            console.error(`Failed to update error status in database for key ${key}:`, dbError.message);
        }

        return {
            success: false,
            error: errorMessage,
            errorStatus: errorStatus,
            key: key
        };
    }
}

// Export the class - DO NOT CALL ANY FUNCTIONS HERE
module.exports = { VoucherCreator, processInvoiceToVoucher };
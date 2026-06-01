const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { getSTARAuthToken } = require('../../getSTARAuthToken.js');
const pool = require("../../db2.js");

class VoucherCreator {
    constructor() {
        this.apiUrl = process.env.STAR_EDI_URL
    }

    buildVoucherPayload(voucherData) {
        if (voucherData && voucherData.headerInfo) {
            const headerInfo = { ...voucherData.headerInfo };
            if (headerInfo.invoiceDate) {
                headerInfo.invoiceDate = formatDate(headerInfo.invoiceDate);
            }

            const payload = { headerInfo };
            if (Array.isArray(voucherData.additionalInfo) && voucherData.additionalInfo.length > 0) {
                payload.additionalInfo = voucherData.additionalInfo;
            }
            return payload;
        }

        const headerInfo = {
            companyId: voucherData.companyId,
            vendorId: voucherData.vendorId,
            invoiceAmount: voucherData.invoiceAmount,
            invoiceDate: formatDate(voucherData.invoiceDate),
            invoiceNumber: voucherData.invoiceNumber,
        };

        if (voucherData.accountNumber) headerInfo.accountNumber = voucherData.accountNumber;
        if (voucherData.vendorName) headerInfo.vendorName = voucherData.vendorName;
        if (voucherData.externalReference) headerInfo.externalReference = voucherData.externalReference;

        if (voucherData.purchaseOrderNumber) headerInfo.purchaseOrderNumber = voucherData.purchaseOrderNumber;
        if (voucherData.purchaseOrderItem) headerInfo.purchaseOrderItem = voucherData.purchaseOrderItem;
        if (voucherData.salesOrderNumber) headerInfo.salesOrderNumber = voucherData.salesOrderNumber;
        if (voucherData.materialTransferNumber) headerInfo.materialTransferNumber = voucherData.materialTransferNumber;
        if (voucherData.voyageNumber) headerInfo.voyageNumber = voucherData.voyageNumber;

        if (voucherData.branch) headerInfo.branch = voucherData.branch;
        if (voucherData.voucherBranch) headerInfo.voucherBranch = voucherData.voucherBranch;
        if (voucherData.serviceAddress) headerInfo.serviceAddress = voucherData.serviceAddress;
        if (voucherData.shippingAddress) headerInfo.shippingAddress = voucherData.shippingAddress;
        if (voucherData.billingAddress) headerInfo.billingAddress = voucherData.billingAddress;
        if (voucherData.companyAddress) headerInfo.companyAddress = voucherData.companyAddress;
        if (voucherData.vendorAddress) headerInfo.vendorAddress = voucherData.vendorAddress;

        if (voucherData.pretaxVoucherAmount) headerInfo.pretaxVoucherAmount = voucherData.invoiceAmount - voucherData.taxAmount;
        if (voucherData.preTaxInvoiceAmount) headerInfo.preTaxInvoiceAmount = voucherData.preTaxInvoiceAmount;
        if (voucherData.discountableAmount) headerInfo.discountableAmount = voucherData.discountableAmount;
        if (voucherData.taxAmount) headerInfo.taxAmount = voucherData.taxAmount;
        if (voucherData.taxPercent) headerInfo.taxPercent = voucherData.taxPercent;

        if (voucherData.currency) headerInfo.currency = voucherData.currency;
        if (voucherData.exchangeRate) headerInfo.exchangeRate = voucherData.exchangeRate;
        if (voucherData.freightAmount) headerInfo.freightAmount = voucherData.freightAmount;
        if (voucherData.freightTerm) headerInfo.freightTerm = voucherData.freightTerm;
        if (voucherData.checkItemRemarks) headerInfo.checkItemRemarks = voucherData.checkItemRemarks;
        if (voucherData.isTaxApplicable !== undefined) headerInfo.isTaxApplicable = voucherData.isTaxApplicable;
        if (voucherData.category)  headerInfo.category = voucherData.category;
        if (voucherData.invoiceDescription)  headerInfo.invoiceDescription = voucherData.invoiceDescription;
        if (voucherData.isaRcvrId) headerInfo.isaRcvrId = voucherData.isaRcvrId;
        if (voucherData.isaSndrId) headerInfo.isaSndrId = voucherData.isaSndrId;

        const payload = { headerInfo };
        if (Array.isArray(voucherData.additionalInfo) && voucherData.additionalInfo.length > 0) {
            payload.additionalInfo = voucherData.additionalInfo;
        }

        return payload;
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

            // Support both nested payloads ({ headerInfo, additionalInfo }) and legacy flat payloads.
            const voucher = this.buildVoucherPayload(voucherData);


            console.log('Constructed voucher payload:', JSON.stringify(voucher, null, 2));
       
            const requiredHeaderFields = ['companyId', 'vendorId', 'invoiceAmount', 'invoiceDate', 'invoiceNumber'];
            const missingHeaderFields = requiredHeaderFields.filter(
                field => !voucher?.headerInfo?.[field]
            );
            if (missingHeaderFields.length > 0) {
                throw new Error(`Voucher payload missing required headerInfo fields: ${missingHeaderFields.join(', ')}`);
            }
            
            // Send voucher as JSON payload to target endpoint with OAuth bearer token.
            const response = await axios.post(this.apiUrl, voucher, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `${tokenType} ${tokenValue}`
                },
                timeout: 30000
            });

         
            // Parse the response
            const responseData = response?.data || {};
            const output = responseData.createVoucherOutput || responseData.data || responseData;
           
            return {
                success: true,
                voucherPrefix: output.voucherPrefix || voucher.headerInfo?.voucherPrefix || null,
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
            headerInfo: {
                companyId: record.vch_companyid,
                vendorId: record.vch_vendorid,
                vendorName: record.vch_vendorname,
                invoiceNumber: record.vch_vendorinvoicenumber,
                externalReference: record.vch_externalreference,
                invoiceDescription: record.vch_voucherdescription,
                purchaseOrderNumber: record.vch_purchaseordernumber,
                purchaseOrderItem: record.vch_purchaseorderitem,
                salesOrderNumber: record.vch_salesordernumber,
                materialTransferNumber: record.vch_materialtransfernumber,
                voyageNumber: record.vch_voyagenumber,
                invoiceDate: formatDate(record.vch_vendorinvoicedate),
                branch: record.vch_voucherbranch,
                invoiceAmount: record.vch_voucheramount,
                preTaxInvoiceAmount: record.vch_voucheramount - record.vch_taxamount,
                discountableAmount: record.vch_discountableamount,
                freightAmount: record.vch_freightamount,
                currency: record.vch_vouchercurrency,
                exchangeRate: record.vch_exchangerate,
                category: record.vch_vouchercategory,
                checkItemRemarks: record.vch_checkitemremarks,
                isTaxApplicable: record.vch_istaxapplicable,
                voucherPrefix: record.vch_voucherprefix,
                billingAddress: record.vch_billtoaddress,
                shippingAddress: record.vch_shiptoaddress,
                taxAmount: record.vch_taxamount,
                discountAmount: record.vch_discountamount,
                isaRcvrId: record.vch_isa_rcvr_id,
                isaSndrId: record.vch_isa_sender_id,
                freightTerm: record.vch_freightterm
            },
            additionalInfo: []
        };

        const addinfo = await pool.query(`SELECT * FROM public."810_Star_AdditionalInfo" WHERE sai_key = $1`, [key]);

        if (addinfo.rows && addinfo.rows.length > 0) {
            addinfo.rows.forEach(row => {
                voucherData.additionalInfo.push({
                    purchaseOrderNumber: row.sai_purchaseordernumber,
            purchaseOrderItem: row.sai_purchaseorderitem,
            purchaseOrderSubItem: row.sai_purchaseordersubitem,
            externalReference: row.sai_externalreference,
            coilNo: row.sai_coilno,
            quantity: row.sai_quantity,
            unitPrice: row.sai_unitprice,
            unitOfMeasure: row.sai_unitofmeasure,
            lineTotal: row.sai_linetotal
                });
            });
        }

        
        console.log(`Creating voucher for key: ${key}`);
        const voucherResponse = await voucherCreator.createVoucher(voucherData);
        
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
            errorMessage = 'Duplicate invoice - existing voucher already exists';
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
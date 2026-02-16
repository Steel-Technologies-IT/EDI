const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { getAuthToken } = require('../../getAuthToken');
const pool = require("../../db2.js");
const queryInvexDatabase = require('../../Invex/InvexConnection.js');

class VoucherCreator {
    constructor() {
        this.serviceUrl = process.env.VOUCHER_SERVICE_URL || `https://steeltechnologies.invex.cloud/${process.env.REACT_APP_INV_ENV}-${process.env.REACT_APP_INV_CLASS}/webservices/gateway/vouchers/VoucherService`;
    }

    buildSoapEnvelope(voucher, authToken) {
        // Match the INVEX SOAP format exactly - voucher fields wrapped in <stratix:voucher>
        const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:stratix="http://stratix.invera.com/services">
    <soapenv:Header>
        <stratix:AuthenticationHeader>
            <username>${this.escapeXml(authToken.username)}</username>
            <value>${this.escapeXml(authToken.value)}</value>
        </stratix:AuthenticationHeader>
    </soapenv:Header>
    <soapenv:Body>
        <stratix:CreateVoucher>
            <stratix:voucher>
                <stratix:companyId>${this.escapeXml(voucher.companyId)}</stratix:companyId>
                <stratix:voucherPrefix>${this.escapeXml(voucher.voucherPrefix)}</stratix:voucherPrefix>
                ${voucher.entryDate ? `<stratix:entryDate>${this.escapeXml(voucher.entryDate)}</stratix:entryDate>` : ''}
                <stratix:vendorId>${this.escapeXml(voucher.vendorId)}</stratix:vendorId>
                ${voucher.vendorInvoiceNumber ? `<stratix:vendorInvoiceNumber>${this.escapeXml(voucher.vendorInvoiceNumber)}</stratix:vendorInvoiceNumber>` : ''}
                ${voucher.materialTransferNumber ? `<stratix:materialTransferNumber>${this.escapeXml(voucher.materialTransferNumber)}</stratix:materialTransferNumber>` : ''}
                ${voucher.voyageNumber ? `<stratix:voyageNumber>${this.escapeXml(voucher.voyageNumber)}</stratix:voyageNumber>` : ''}
                ${voucher.vendorInvoiceDate ? `<stratix:vendorInvoiceDate>${this.escapeXml(voucher.vendorInvoiceDate)}</stratix:vendorInvoiceDate>` : ''}
                ${voucher.voucherBranch ? `<stratix:voucherBranch>${this.escapeXml(voucher.voucherBranch)}</stratix:voucherBranch>` : ''}
                ${voucher.pretaxVoucherAmount ? `<stratix:pretaxVoucherAmount>${this.escapeXml(voucher.pretaxVoucherAmount)}</stratix:pretaxVoucherAmount>` : ''}
                <stratix:voucherAmount>${this.escapeXml(voucher.voucherAmount)}</stratix:voucherAmount>
                ${voucher.purchaseOrderPrefix ? `<stratix:purchaseOrderPrefix>${this.escapeXml(voucher.purchaseOrderPrefix)}</stratix:purchaseOrderPrefix>` : ''}
                ${voucher.purchaseOrderNumber ? `<stratix:purchaseOrderNumber>${this.escapeXml(voucher.purchaseOrderNumber)}</stratix:purchaseOrderNumber>` : ''}
                ${voucher.purchaseOrderItem ? `<stratix:purchaseOrderItem>${this.escapeXml(voucher.purchaseOrderItem)}</stratix:purchaseOrderItem>` : ''}
                ${voucher.discountableAmount ? `<stratix:discountableAmount>${this.escapeXml(voucher.discountableAmount)}</stratix:discountableAmount>` : ''}
                ${voucher.voucherDescription ? `<stratix:voucherDescription>${this.escapeXml(voucher.voucherDescription)}</stratix:voucherDescription>` : ''}
                ${voucher.voucherCurrency ? `<stratix:voucherCurrency>${this.escapeXml(voucher.voucherCurrency)}</stratix:voucherCurrency>` : ''}
                ${voucher.exchangeRate ? `<stratix:exchangeRate>${this.escapeXml(voucher.exchangeRate)}</stratix:exchangeRate>` : ''}
                ${voucher.paymentTerm ? `<stratix:paymentTerm>${this.escapeXml(voucher.paymentTerm)}</stratix:paymentTerm>` : ''}
                ${voucher.discountTerm ? `<stratix:discountTerm>${this.escapeXml(voucher.discountTerm)}</stratix:discountTerm>` : ''}
                ${voucher.dueDate ? `<stratix:dueDate>${this.escapeXml(voucher.dueDate)}</stratix:dueDate>` : ''}
                ${voucher.discountDate ? `<stratix:discountDate>${this.escapeXml(voucher.discountDate)}</stratix:discountDate>` : ''}
                ${voucher.discountAmount ? `<stratix:discountAmount>${this.escapeXml(voucher.discountAmount)}</stratix:discountAmount>` : ''}
                ${voucher.checkItemRemarks ? `<stratix:checkItemRemarks>${this.escapeXml(voucher.checkItemRemarks)}</stratix:checkItemRemarks>` : ''}
                ${voucher.paymentType ? `<stratix:paymentType>${this.escapeXml(voucher.paymentType)}</stratix:paymentType>` : ''}
                ${voucher.voucherCrossRefNo ? `<stratix:voucherCrossRefNo>${this.escapeXml(voucher.voucherCrossRefNo)}</stratix:voucherCrossRefNo>` : ''}
                ${voucher.authorizationReference ? `<stratix:authorizationReference>${this.escapeXml(voucher.authorizationReference)}</stratix:authorizationReference>` : ''}
                ${voucher.voucherCategory ? `<stratix:voucherCategory>${this.escapeXml(voucher.voucherCategory)}</stratix:voucherCategory>` : ''}
                ${voucher.serviceFulfillmentDate ? `<stratix:serviceFulfillmentDate>${this.escapeXml(voucher.serviceFulfillmentDate)}</stratix:serviceFulfillmentDate>` : ''}
                ${voucher.prepaymentEligibility !== undefined ? `<stratix:prepaymentEligibility>${this.escapeXml(voucher.prepaymentEligibility)}</stratix:prepaymentEligibility>` : ''}
                ${voucher.transactionStatusAction ? `<stratix:transactionStatusAction>${this.escapeXml(voucher.transactionStatusAction)}</stratix:transactionStatusAction>` : ''}
                ${voucher.transactionReason ? `<stratix:transactionReason>${this.escapeXml(voucher.transactionReason)}</stratix:transactionReason>` : ''}
                ${voucher.transactionStatus ? `<stratix:transactionStatus>${this.escapeXml(voucher.transactionStatus)}</stratix:transactionStatus>` : ''}
                ${voucher.transactionStatusRemarks ? `<stratix:transactionStatusRemarks>${this.escapeXml(voucher.transactionStatusRemarks)}</stratix:transactionStatusRemarks>` : ''}
                ${voucher.paymentStatusAction ? `<stratix:paymentStatusAction>${this.escapeXml(voucher.paymentStatusAction)}</stratix:paymentStatusAction>` : ''}
                ${voucher.paymentReason ? `<stratix:paymentReason>${this.escapeXml(voucher.paymentReason)}</stratix:paymentReason>` : ''}
                ${voucher.paymentStatus ? `<stratix:paymentStatus>${this.escapeXml(voucher.paymentStatus)}</stratix:paymentStatus>` : ''}
                ${voucher.paymentStatusRemarks ? `<stratix:paymentStatusRemarks>${this.escapeXml(voucher.paymentStatusRemarks)}</stratix:paymentStatusRemarks>` : ''}
            </stratix:voucher>
        </stratix:CreateVoucher>
    </soapenv:Body>
</soapenv:Envelope>`;
    
        return envelope;
    }

    escapeXml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }


    async createVoucher(voucherData) {
        try {
            // Validate required fields first
            if (!voucherData.companyId) {
                throw new Error('companyId is required');
            }
            if (!voucherData.voucherPrefix) {
                throw new Error('voucherPrefix is required');
            }
            if (!voucherData.vendorId) {
                throw new Error('vendorId is required');
            }
            if (!voucherData.voucherAmount) {
                throw new Error('voucherAmount is required');
            }
            if (!voucherData.vendorInvoiceDate) {
                throw new Error('vendorInvoiceDate is required');
            }

            // Validate voucherPrefix
            const validPrefixes = ['VR', 'DM', 'CM'];
            if (!validPrefixes.includes(voucherData.voucherPrefix)) {
                throw new Error('voucherPrefix must be one of: VR, DM, CM');
            }

            // Validate vendorInvoiceNumber for VR prefix
            if (voucherData.voucherPrefix === 'VR' && !voucherData.vendorInvoiceNumber) {
                throw new Error('vendorInvoiceNumber is required for Voucher Prefix VR');
            }

            // Get authentication token from INVEX
            console.log('Obtaining authentication token from INVEX...');
            const authResult = await getAuthToken();
            
            // Handle the response structure - extract from 'response' wrapper if present
            const auth = authResult.result.response || authResult;
            
            console.log('Authentication successful');
            

            // Extract just the base64 token (everything after the comma)
            const tokenValue = auth.authenticationToken.value;
            const actualToken = tokenValue.includes(',') 
                ? tokenValue.split(',')[1] 
                : tokenValue;

            // Create cleaned auth token object
            const cleanAuthToken = {
                username: auth.authenticationToken.username,
                value: actualToken
            };

            

            

            // Prepare the voucher object with formatted dates
            const voucher = {
                companyId: voucherData.companyId,
                voucherPrefix: voucherData.voucherPrefix,
                vendorId: voucherData.vendorId,
                voucherAmount: voucherData.voucherAmount,
                vendorInvoiceDate: voucherData.vendorInvoiceDate
            };

            // Add optional fields only if they have actual values
            if (voucherData.voucherNumber) voucher.voucherNumber = voucherData.voucherNumber;
            if (voucherData.sessionId) voucher.sessionId = voucherData.sessionId;
            if (voucherData.entryDate) voucher.entryDate = voucherData.entryDate;
            if (voucherData.vendorInvoiceNumber) voucher.vendorInvoiceNumber = voucherData.vendorInvoiceNumber;
            if (voucherData.externalReference) voucher.externalReference = voucherData.externalReference;
            if (voucherData.purchaseOrderPrefix) voucher.purchaseOrderPrefix = voucherData.purchaseOrderPrefix;
            if (voucherData.purchaseOrderNumber) voucher.purchaseOrderNumber = voucherData.purchaseOrderNumber;
            if (voucherData.purchaseOrderItem) voucher.purchaseOrderItem = voucherData.purchaseOrderItem;
            if (voucherData.voucherBranch) voucher.voucherBranch = voucherData.voucherBranch;
            if (voucherData.pretaxVoucherAmount) voucher.pretaxVoucherAmount = voucherData.pretaxVoucherAmount;
            if (voucherData.discountableAmount) voucher.discountableAmount = voucherData.discountableAmount;
            if (voucherData.voucherDescription) voucher.voucherDescription = voucherData.voucherDescription;
            if (voucherData.voucherCurrency) voucher.voucherCurrency = voucherData.voucherCurrency;
            if (voucherData.exchangeRate) voucher.exchangeRate = voucherData.exchangeRate;
            if (voucherData.paymentTerm) voucher.paymentTerm = voucherData.paymentTerm;
            if (voucherData.discountTerm) voucher.discountTerm = voucherData.discountTerm;
            if (voucherData.dueDate) voucher.dueDate = voucherData.dueDate;
            if (voucherData.discountDate) voucher.discountDate = voucherData.discountDate;
            if (voucherData.discountAmount) voucher.discountAmount = voucherData.discountAmount;
            if (voucherData.checkItemRemarks) voucher.checkItemRemarks = voucherData.checkItemRemarks;
            if (voucherData.paymentType) voucher.paymentType = voucherData.paymentType;
            if (voucherData.voucherCrossRefNo) voucher.voucherCrossRefNo = voucherData.voucherCrossRefNo;
            if (voucherData.authorizationReference) voucher.authorizationReference = voucherData.authorizationReference;
            if (voucherData.voucherCategory) voucher.voucherCategory = voucherData.voucherCategory;
            if (voucherData.serviceFulfillmentDate) voucher.serviceFulfillmentDate = voucherData.serviceFulfillmentDate;
            if (voucherData.prepaymentEligibility !== undefined) voucher.prepaymentEligibility = voucherData.prepaymentEligibility;
            if (voucherData.transactionStatusAction) voucher.transactionStatusAction = voucherData.transactionStatusAction;
            if (voucherData.transactionReason) voucher.transactionReason = voucherData.transactionReason;
            if (voucherData.transactionStatus) voucher.transactionStatus = voucherData.transactionStatus;
            if (voucherData.transactionStatusRemarks) voucher.transactionStatusRemarks = voucherData.transactionStatusRemarks;
            if (voucherData.paymentStatusAction) voucher.paymentStatusAction = voucherData.paymentStatusAction;
            if (voucherData.paymentReason) voucher.paymentReason = voucherData.paymentReason;
            if (voucherData.paymentStatus) voucher.paymentStatus = voucherData.paymentStatus;
            if (voucherData.paymentStatusRemarks) voucher.paymentStatusRemarks = voucherData.paymentStatusRemarks;



            
            // Build the SOAP envelope with the cleaned authentication token
            const soapEnvelope = this.buildSoapEnvelope(voucher, cleanAuthToken);
            console.log(soapEnvelope)
            // Log the SOAP request (with token partially redacted for security)
            const tokenPreview = actualToken.substring(0, 20) + '...' + 
                                actualToken.substring(actualToken.length - 20);
            

            // Create HTTPS agent
            const httpsAgent = new https.Agent({
                rejectUnauthorized: process.env.NODE_ENV === 'production'
            });

            // Make the SOAP request
            const response = await axios.post(this.serviceUrl, soapEnvelope, {
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': 'http://stratix.invera.com/services/CreateVoucher'
                },
                httpsAgent: httpsAgent
            });

            console.log('SOAP Response received successfully');

            // Parse the response
            const responseData = response.data;
            
            // Check if response is JSON
            if (typeof responseData === 'object' && !responseData.match) {
                
                
                return {
                    success: true,
                    voucherPrefix: responseData.createVoucherOutput?.voucherPrefix || responseData.voucherPrefix,
                    voucherNumber: responseData.createVoucherOutput?.voucherNumber || responseData.voucherNumber,
                    sessionId: responseData.createVoucherOutput?.sessionId || responseData.sessionId,
                    rawResponse: responseData
                };
            }
            
            // Parse as XML
            const voucherPrefixMatch = responseData.match(/<ns2:voucherPrefix>(.*?)<\/ns2:voucherPrefix>/);
            const voucherNumberMatch = responseData.match(/<ns2:voucherNumber>(.*?)<\/ns2:voucherNumber>/);
            const sessionIdMatch = responseData.match(/<ns2:sessionId>(.*?)<\/ns2:sessionId>/);

            return {
                success: true,
                voucherPrefix: voucherPrefixMatch ? voucherPrefixMatch[1] : null,
                voucherNumber: voucherNumberMatch ? voucherNumberMatch[1] : null,
                sessionId: sessionIdMatch ? sessionIdMatch[1] : null
            };

        } catch (error) {
            console.error('Error creating voucher:', error.message);

            if (error.response) {
                const responseData = error.response.data;
                console.error('SOAP Fault Response:', responseData);

                // Handle JSON error response
                if (typeof responseData === 'object' && responseData.Error) {
                    throw new Error(`API Error: ${responseData.Error}`);
                }

                // Handle XML error response
                if (typeof responseData === 'string') {
                    const faultStringMatch = responseData.match(/<faultstring>(.*?)<\/faultstring>/);
                    const faultString = faultStringMatch ? faultStringMatch[1] : 'Unknown error';
                    throw new Error(`SOAP Fault: ${faultString}`);
                }

                throw new Error(`Request failed with status ${error.response.status}: ${JSON.stringify(responseData)}`);
            }

            throw new Error(`Failed to create voucher: ${error.message}`);
        }
    }
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
            voucherPrefix: record.vch_voucherprefix,
            vendorId: record.vch_vendorid,
            vendorInvoiceNumber: record.vch_vendorinvoicenumber,
            externalReference: record.vch_externalreference,
            vendorInvoiceDate: record.vch_vendorinvoicedate,
            purchaseOrderPrefix: record.vch_purchaseorderprefix,
            purchaseOrderNumber: record.vch_purchaseordernumber,
            purchaseOrderItem: record.vch_purchaseorderitem,
            voucherAmount: record.vch_voucheramount,
            discountableAmount: record.vch_discountableamount,
            voucherDescription: record.vch_voucherdescription,
            voucherCurrency: record.vch_vouchercurrency,
            dueDate: record.vch_duedate,
            discountDate: record.vch_discountdate,
            discountAmount: record.vch_discountamount,
            paymentType: record.vch_paymenttype,
            voucherCategory: record.vch_vouchercategory,
            voucherBranch: record.vch_voucherbranch,
            transactionStatusAction: 'A',
            transactionStatus: 'APR'
        };

        console.log(voucherData)
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
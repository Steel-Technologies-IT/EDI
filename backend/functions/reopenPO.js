
const queryInvexDatabase = require('../Invex/InvexConnection');
const { getAuthToken } = require('../getAuthToken');
const axios = require('axios');
const https = require('https');

const padLeft = (value) => String(value).trim().padStart(8, '0');

class POStatusChecker {
    constructor() {
        this.serviceUrl =  `https://steeltechnologies.invex.cloud/${process.env.REACT_APP_INV_ENV}-${process.env.REACT_APP_INV_CLASS}/webservices/gateway/purchaseOrders/PurchaseOrderService`;
    }



    buildSoapEnvelope(PO, authToken) {
        // Match the INVEX SOAP format exactly - voucher fields wrapped in <stratix:voucher>
        const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ser="http://stratix.invera.com/services">
    <soapenv:Header>
        <ser:AuthenticationHeader>
            <username>${this.escapeXml(authToken.username)}</username>
            <value>${this.escapeXml(authToken.value)}</value>
        </ser:AuthenticationHeader>
    </soapenv:Header>
    <soapenv:Body>
        <ser:UpdateStatus>
            <purchaseOrderIdentity>${this.escapeXml(PO.purchaseOrderIdentity)}</purchaseOrderIdentity>
            <status>
                <statusType>${this.escapeXml(PO.statusType)}</statusType>

            <statusAction>A</statusAction>

            <reasonCode>APR</reasonCode>

            <statusCode>APR</statusCode>
         
            <remark>AUTOUPDATE</remark>
            </status>
        </ser:UpdateStatus>
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


    async updatePO(PONumber, statusType) {
        try {
            const username = 'wspoapr';
            const password = 'wspoaprp';

            // Get authentication token from INVEX
            console.log('Obtaining authentication token from INVEX...');
            const authResult = await getAuthToken(username, password);
            
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
            const PODATA = {
                purchaseOrderIdentity: 'PO-'+ PONumber,
                statusType: statusType
            };

            console.log('Prepared PO data for SOAP request:', PODATA);
            
            // Build the SOAP envelope with the cleaned authentication token
            const soapEnvelope = await this.buildSoapEnvelope(PODATA, cleanAuthToken);
            console.log("SOAP: ", soapEnvelope)
            

            // Create HTTPS agent
            const httpsAgent = new https.Agent({
                rejectUnauthorized: process.env.NODE_ENV === 'production'
            });

            
            // Make the SOAP request
            const response = await axios.post(this.serviceUrl, soapEnvelope, {
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': 'http://stratix.invera.com/services/UpdateStatus'
                },
                httpsAgent: httpsAgent
            });

            console.log('SOAP Response received successfully');

            // Parse the response
            const responseData = response.data;
            console.log("RESPONSE: ", responseData)
            // Check if response is JSON
            return responseData;
            
            
           

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


const checkPOStatus = async (poNo) => {
  try {
    const isPOinInvex = `SELECT COUNT(*) AS count FROM tcttsa_rec WHERE tsa_ref_pfx = 'PO' and tsa_ref_no = ${poNo}`;
    const checkResult = await queryInvexDatabase(isPOinInvex);
    const transLock = `SELECT COUNT(*) AS count from scttlk_rec WHERE tlk_trs_id = '${padLeft(poNo)}' AND tlk_ref_pfx = 'PO'`;
    const lockResult = await queryInvexDatabase(transLock);

    if (lockResult.Data?.[0]?.count !== '0') {
      return 'Transaction Locked';
    }
    if (checkResult.Data?.[0]?.count === '0') {
      return 'Not found in INVEX';
    }

    const sqlStatus = `WITH A AS (SELECT * FROM tcttsa_rec 
WHERE tsa_ref_pfx = 'PO'
and tsa_ref_no = ${poNo}
and tsa_ref_itm = 0
and tsa_ref_sbitm = 0
and  tsa_sts_typ = 'A'
ORDER BY 
tsa_lst_upd_dtts DESC, 
tsa_lst_upd_dtms DESC
LIMIT 1)
SELECT tsa_sts_actn, tsa_sts_typ FROM A`;

const sqlTransaction = `WITH A AS (SELECT * FROM tcttsa_rec 
WHERE tsa_ref_pfx = 'PO'
and tsa_ref_no = ${poNo}
and tsa_ref_itm = 0
and tsa_ref_sbitm = 0 
and tsa_sts_typ = 'T'
ORDER BY 
tsa_lst_upd_dtts DESC, 
tsa_lst_upd_dtms DESC
LIMIT 1)
SELECT tsa_sts_actn, tsa_sts_typ FROM A`;

    const result = await queryInvexDatabase(sqlStatus);
    const result2 = await queryInvexDatabase(sqlTransaction);

    
    
    if (result.Data[0].tsa_sts_actn === 'H') {
        const POStatus = new POStatusChecker();
        const status = await POStatus.updatePO(poNo, result.Data[0].tsa_sts_typ);
        console.log('PO status updated successfully:', status);
        
    } 
       
     
    if (result2.Data[0].tsa_sts_actn === 'H') {
        const POStatus = new POStatusChecker();
        const status = await POStatus.updatePO(poNo, result2.Data[0].tsa_sts_typ);
        console.log('PO status updated successfully:', status);
    } 


    return 'Completed';
        

    
  } catch (error) {
    console.error('Error checking PO status:', error);
    throw error;
  }
};


module.exports = checkPOStatus;
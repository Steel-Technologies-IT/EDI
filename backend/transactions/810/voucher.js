const axios = require('axios');
const xml2js = require('xml2js');

const createVoucher = async () => {
  const url = 'http://172.20.100.72:60722/webservices/gateway/vouchers/VoucherService';
  const soapAction = 'CreateVoucher';

  const xmlPayload = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:vou="http://example.com/voucher">
      <soapenv:Header/>
      <soapenv:Body>
        <vou:CreateVoucher>
          <vou:companyId>123</vou:companyId>
          <vou:voucherPrefix>VR</vou:voucherPrefix>
          <vou:vendorId>456789</vou:vendorId>
          <vou:vendorInvoiceNumber>INV12345</vou:vendorInvoiceNumber>
          <vou:vendorInvoiceDate>2025-07-31</vou:vendorInvoiceDate>
          <vou:voucherAmount>1000.00</vou:voucherAmount>
          <!-- Add other parameters as needed -->
        </vou:CreateVoucher>
      </soapenv:Body>
    </soapenv:Envelope>
  `;

  try {
    const response = await axios.post(url, xmlPayload, {
      headers: {
        'Content-Type': 'text/xml',
        SOAPAction: soapAction,
      },
    });

    // Parse the XML response
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
};

createVoucher();
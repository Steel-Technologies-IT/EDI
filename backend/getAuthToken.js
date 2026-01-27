const soap = require('soap');

/**
 * Authenticate with INVEX and get authentication token
 * @returns {Promise<Object>} Object containing authenticationToken, connectedServer, and connectedPort
 */
async function getAuthToken() {
  const qdn = 'steeltechnologies.invex.cloud';
  const username = 'wsedi1';
  const password = '3EbDA%SC^yn8';
  const environmentName = 'livstu';
  const environmentClass = 'LIV';
  const connectedAccessType = 'I';
  const forceDisconnect = true;

  const wsdlUrl = `https://${qdn}/auth/webservices/services/exec/AuthenticationService.wsdl`;
  const serviceUrl = `https://${qdn}/auth/webservices/exec/AuthenticationService`;

  try {
    // Create SOAP client
    const client = await soap.createClientAsync(wsdlUrl, {
      endpoint: serviceUrl,
      wsdl_options: {
        strictSSL: true
      }
    });

    // Parameters must be wrapped in an 'input' object
    const args = {
      input: {
        username: username,
        password: password,
        connectedAccessType: connectedAccessType,
        forceDisconnect: forceDisconnect,
        environmentName: environmentName,
        environmentClass: environmentClass
      }
    };

    console.log('Calling GatewayLogin...');

    const [result] = await client.GatewayLoginAsync(args);

    console.log('SOAP Result:', JSON.stringify(result, null, 2));
    
    return {
      result
    };
  } catch (error) {
    console.error('Authentication error:', error.message);
    if (error.body) {
      console.error('Response body:', error.body);
    }
    throw error;
  }
}

// ONLY export - DO NOT call the function here!
module.exports = { getAuthToken };
const axios = require('axios');
const https = require('https');
const config = require('../config/config');

// Create axios instance with SSL configuration for test environment
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({  
        rejectUnauthorized: false // Bypass SSL certificate validation for test
    }),
    timeout: 30000
});

async function debugSchema() {
    try {
        console.log('Debugging INVEX schema structure...');
        
        // Get a fresh token
        const token = await getToken();
        console.log('Using token:', token.substring(0, 20) + '...');
        
        // Try to fetch the HeaderDatatypes.xsd file
        const schemaUrl = `${config.invex.baseUrl}/webservices/services/gateway/vouchers/../../../schema/common/HeaderDatatypes.xsd`;
        console.log('Schema URL:', schemaUrl);
        
        try {
            const response = await axiosInstance.get(schemaUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...(config.invex.apiHeader && { [config.invex.apiHeader.name]: config.invex.apiHeader.value })
                }
            });
            
            console.log('HeaderDatatypes.xsd content:');
            console.log('================================');
            console.log(response.data);
            console.log('================================');
            
        } catch (schemaError) {
            console.log('Could not fetch HeaderDatatypes.xsd:', schemaError.response?.status, schemaError.response?.statusText);
            if (schemaError.response?.data) {
                console.log('Error response:', schemaError.response.data);
            }
        }
        
        // Try alternative schema locations
        const altUrls = [
            `${config.invex.baseUrl}/schema/common/HeaderDatatypes.xsd`,
            `${config.invex.baseUrl}/webservices/schema/common/HeaderDatatypes.xsd`,
            `${config.invex.baseUrl}/services/schema/common/HeaderDatatypes.xsd`,
            `${config.invex.baseUrl}/webservices/services/schema/common/HeaderDatatypes.xsd`,
            // Try with different base paths
            `https://steeltechnologies.invex.cloud/schema/common/HeaderDatatypes.xsd`,
            `https://steeltechnologies.invex.cloud/tststu-TST/schema/common/HeaderDatatypes.xsd`
        ];
        
        for (const url of altUrls) {
            try {
                console.log(`\nTrying alternative schema URL: ${url}`);
                const response = await axiosInstance.get(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        ...(config.invex.apiHeader && { [config.invex.apiHeader.name]: config.invex.apiHeader.value })
                    }
                });
                
                console.log('✅ Found schema at:', url);
                console.log('Content preview:', response.data.substring(0, 500) + '...');
                
                // Look for AuthenticationToken definition
                if (response.data.includes('AuthenticationToken')) {
                    console.log('\n🔍 AuthenticationToken definition found:');
                    const lines = response.data.split('\n');
                    let inAuthToken = false;
                    let authTokenLines = [];
                    
                    for (const line of lines) {
                        if (line.includes('AuthenticationToken')) {
                            inAuthToken = true;
                        }
                        if (inAuthToken) {
                            authTokenLines.push(line);
                            if (line.includes('</') && line.includes('AuthenticationToken')) {
                                break;
                            }
                        }
                    }
                    
                    console.log(authTokenLines.join('\n'));
                }
                
                break;
                
            } catch (error) {
                console.log(`❌ Not found at: ${url} (${error.response?.status || error.message})`);
            }
        }
        
        // Also try to get the WSDL and check for imports
        try {
            console.log('\n🔍 Checking WSDL for schema imports...');
            const wsdlUrl = `${config.invex.baseUrl}/webservices/services/gateway/vouchers/VoucherService.wsdl`;
            const wsdlResponse = await axiosInstance.get(wsdlUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...(config.invex.apiHeader && { [config.invex.apiHeader.name]: config.invex.apiHeader.value })
                }
            });
            
            console.log('WSDL content (first 1000 chars):');
            console.log(wsdlResponse.data.substring(0, 1000));
            
            // Look for schema imports
            const importMatches = wsdlResponse.data.match(/<xsd:import[^>]*schemaLocation="([^"]*)"[^>]*>/g);
            if (importMatches) {
                console.log('\nFound schema imports:');
                importMatches.forEach(match => {
                    const locationMatch = match.match(/schemaLocation="([^"]*)"/);
                    if (locationMatch) {
                        console.log('  -', locationMatch[1]);
                    }
                });
            } else {
                console.log('No schema imports found in WSDL');
            }
            
            // Look for any schema elements that might help
            const schemaElements = wsdlResponse.data.match(/<xsd:element[^>]*name="[^"]*"[^>]*>/g);
            if (schemaElements) {
                console.log('\nFound schema elements:');
                schemaElements.forEach(element => {
                    console.log('  -', element);
                });
            }
            
        } catch (wsdlError) {
            console.log('Could not fetch WSDL for schema analysis:', wsdlError.response?.status, wsdlError.message);
        }
        
    } catch (error) {
        console.error('Debug failed:', error.message);
    }
}

async function getToken() {
    try {
        console.log('Getting OAuth2 access token...');
        console.log('Auth URL:', config.invex.authUrl);
        console.log('Client ID:', config.invex.clientId);
        
        // Prepare OAuth2 request - using the same logic as your VoucherService
        const tokenRequest = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: config.invex.clientId,
            ...(config.invex.clientSecret && { client_secret: config.invex.clientSecret }),
            ...(config.invex.username && { username: config.invex.username }),
            ...(config.invex.password && { password: config.invex.password })
        });

        console.log('Token request parameters:', Object.fromEntries(tokenRequest.entries()));

        const response = await axiosInstance.post(config.invex.authUrl, tokenRequest.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(config.invex.apiHeader && { [config.invex.apiHeader.name]: config.invex.apiHeader.value })
            }
        });

        const token = response.data.access_token;
        
        if (!token) {
            console.log('Token response:', response.data);
            throw new Error('No access_token in response');
        }
        
        console.log('✅ Access token obtained');
        
        // Decode JWT to see what's in it
        if (token.includes('.')) {
            try {
                const tokenParts = token.split('.');
                const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                console.log('Token payload:', {
                    sub: payload.sub,
                    exp: new Date(payload.exp * 1000).toISOString(),
                    scope: payload.scope,
                    iss: payload.iss,
                    client_id: payload.client_id
                });
                
                // Check if token has the right scope
                if (payload.scope && !payload.scope.includes('write') && !payload.scope.includes('create')) {
                    console.log('⚠️  WARNING: Token scope is "read" only. May need "write" or "create" scope for voucher creation.');
                }
                
            } catch (tokenError) {
                console.log('Could not decode JWT token:', tokenError.message);
            }
        }
        
        return token;
        
    } catch (error) {
        console.error('❌ Failed to get access token:');
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('Response Data:', error.response?.data);
        console.error('Error Message:', error.message);
        
        if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN' || error.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
            console.log('\n🔧 SSL Certificate issue detected. The script is configured to bypass SSL validation for testing.');
        }
        
        throw new Error(`Authentication failed: ${error.response?.data?.error_description || error.message}`);
    }
}

debugSchema();
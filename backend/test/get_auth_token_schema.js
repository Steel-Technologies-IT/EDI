const axios = require('axios');
const https = require('https');
const config = require('../config/config');

// Create axios instance with SSL configuration
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({  
        rejectUnauthorized: false
    }),
    timeout: 30000
});

console.log(config)
async function getAuthTokenSchema() {
    try {
        console.log('Getting AuthenticationToken.xsd schema...');
        
        // Get token first
        const tokenRequest = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: config.invex.clientId,
            client_secret: config.invex.clientSecret,
            username: config.invex.username,
            password: config.invex.password
        });

        const tokenResponse = await axiosInstance.post(config.invex.authUrl, tokenRequest.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(config.invex.apiHeader && { [config.invex.apiHeader.name]: config.invex.apiHeader.value })
            }
        });

        const token = tokenResponse.data.access_token;
        console.log('Token obtained for schema fetch');
        
        // Try to get the AuthenticationToken.xsd
        const authTokenUrl = `${config.invex.baseUrl}/webservices/schema/common/datatypes/AuthenticationToken.xsd`;
        console.log('Fetching:', authTokenUrl);
        
        try {
            const response = await axiosInstance.get(authTokenUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...(config.invex.apiHeader && { [config.invex.apiHeader.name]: config.invex.apiHeader.value })
                }
            });
            
            console.log('✅ AuthenticationToken.xsd found:');
            console.log('================================');
            console.log(response.data);
            console.log('================================');
            
            // Parse the schema to understand the structure
            if (response.data.includes('AuthenticationToken')) {
                console.log('\n🔍 Analyzing AuthenticationToken structure...');
                const lines = response.data.split('\n');
                let inComplexType = false;
                let authTokenStructure = [];
                
                for (const line of lines) {
                    if (line.includes('complexType') && line.includes('AuthenticationToken')) {
                        inComplexType = true;
                    }
                    if (inComplexType) {
                        authTokenStructure.push(line.trim());
                        if (line.includes('</xs:complexType>')) {
                            break;
                        }
                    }
                }
                
                console.log('AuthenticationToken structure:');
                console.log(authTokenStructure.join('\n'));
            }
            
        } catch (error) {
            console.log('❌ Could not fetch AuthenticationToken.xsd:', error.response?.status);
            
            // Try alternative locations
            const altUrls = [
                `${config.invex.baseUrl}/schema/common/datatypes/AuthenticationToken.xsd`,
                `${config.invex.baseUrl}/webservices/services/schema/common/datatypes/AuthenticationToken.xsd`
            ];
            
            for (const url of altUrls) {
                try {
                    console.log(`Trying: ${url}`);
                    const altResponse = await axiosInstance.get(url, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            ...(config.invex.apiHeader && { [config.invex.apiHeader.name]: config.invex.apiHeader.value })
                        }
                    });
                    
                    console.log('✅ Found at alternative location:');
                    console.log(altResponse.data);
                    break;
                    
                } catch (altError) {
                    console.log(`❌ Not found at: ${url}`);
                }
            }
        }
        
    } catch (error) {
        console.error('Failed to get schema:', error.message);
    }
}

getAuthTokenSchema();
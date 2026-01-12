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

async function discoverScopes() {
    try {
        console.log('Discovering available OAuth2 scopes...');
        
        // First, try with no scope to see what the default is
        console.log('\n🧪 Test 1: Default scope (no scope parameter)');
        await testScope(null);
        
        // Try common OAuth2 scopes
        const commonScopes = [
            'read',
            'write',
            'transactions',
            'transactions/read',
            'vouchers',
            'vouchers/read',
            'vouchers/write',
            'vouchers/create',
            'api/read',
            'api/write',
            'invex/read',
            'invex/write',
            'all'
        ];
        
        console.log('\n🧪 Testing common scopes:');
        for (const scope of commonScopes) {
            await testScope(scope);
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between requests
        }
        
        // Try combinations
        console.log('\n🧪 Testing scope combinations:');
        const combinations = [
            'read write',
            'transactions vouchers',
            'transactions/read vouchers/read',
            'api/read api/write'
        ];
        
        for (const scope of combinations) {
            await testScope(scope);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
    } catch (error) {
        console.error('Scope discovery failed:', error.message);
    }
}

async function testScope(scope) {
    try {
        const tokenRequest = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: config.invex.clientId,
            client_secret: config.invex.clientSecret,
            ...(config.invex.username && { username: config.invex.username }),
            ...(config.invex.password && { password: config.invex.password }),
            ...(scope && { scope: scope })
        });

        const response = await axiosInstance.post(config.invex.authUrl, tokenRequest.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(config.invex.apiHeader && { [config.invex.apiHeader.name]: config.invex.apiHeader.value })
            }
        });

        const token = response.data.access_token;
        
        if (token && token.includes('.')) {
            const tokenParts = token.split('.');
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            console.log(`✅ Scope: "${scope || 'default'}" -> Granted: "${payload.scope}"`);
            
            // If this scope gives us write permissions, note it
            if (payload.scope && (payload.scope.includes('write') || payload.scope.includes('create'))) {
                console.log(`   🎯 POTENTIAL WRITE SCOPE FOUND: ${payload.scope}`);
            }
        } else {
            console.log(`✅ Scope: "${scope || 'default'}" -> Token received (can't decode)`);
        }
        
    } catch (error) {
        if (error.response?.data?.error === 'invalid_scope') {
            console.log(`❌ Scope: "${scope || 'default'}" -> Invalid scope`);
        } else {
            console.log(`❌ Scope: "${scope || 'default'}" -> Error: ${error.response?.data?.error || error.message}`);
        }
    }
}

discoverScopes();
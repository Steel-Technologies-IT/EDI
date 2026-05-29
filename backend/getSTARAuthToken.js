const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function getSTARAuthToken(options = {}) {
	const oauthUrl = options.oauthUrl || process.env.STAR_OAUTH_URL;
	const clientId = options.clientId || process.env.STAR_CLIENT_ID;
	const clientSecret = options.clientSecret || process.env.STAR_CLIENT_SECRET;
	const client = options.client || process.env.STAR_OAUTH_CLIENT;

	if (!oauthUrl || !clientId || !clientSecret) {
		throw new Error('Missing OAuth config. Required: STAR_OAUTH_URL, STAR_CLIENT_ID, STAR_CLIENT_SECRET');
	}

	const body = new URLSearchParams();
	body.append('grant_type', 'client_credentials');
	body.append('client_id', clientId);
	body.append('client_secret', clientSecret);
	body.append('client', client);
	

	try {
		const response = await axios.post(oauthUrl, body.toString(), {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			timeout: 30000
		});

		const tokenData = response.data || {};

		return {
			access_token: tokenData.data.accessToken,
			token_type: tokenData.data.tokenType,
			expires_in: tokenData.data.expiresIn,
			raw: tokenData
		};
	} catch (error) {
		const details = error.response?.data ? JSON.stringify(error.response.data) : error.message;
		throw new Error(`Failed to get STAR OAuth token: ${details}`);
	}
}

module.exports = { getSTARAuthToken };

const axios = require('axios');
const path = require('path');
const env = require('dotenv').config({

  path: path.resolve(__dirname, '..', '.env')

});

 

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// Replace these with your actual values
const AUTH_URL = 'https://csisteel.auth.ca-central-1.amazoncognito.com/oauth2/token';
const API_URL = process.env.REACT_APP_API_URL;
const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
const CLIENT_SECRET = process.env.REACT_APP_CLIENT_SECRET;

const DATABASE = process.env.REACT_APP_INVEX_DB; 

console.log(AUTH_URL, API_URL, CLIENT_ID, DATABASE)
// Step 1: Get access token using client credentials
async function getAccessToken() {
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);

  const response = await axios.post(AUTH_URL, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

console.log('Auth response:', response.data);
  return response.data.access_token;
}

// Step 2: POST to run the SQL query
async function queryInvexDatabase(SQL_QUERY) {
  try {
    if (!AUTH_URL || !API_URL || !CLIENT_ID || !CLIENT_SECRET || !DATABASE) {
      throw new Error('Invex connection configuration is incomplete');
    }

    const accessToken = await getAccessToken();

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'database': DATABASE
    };

    const response = await axios.post(API_URL, { sql: SQL_QUERY }, { headers });
    return response.data;
  } catch (error) {
    console.error('Error querying API:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = queryInvexDatabase;

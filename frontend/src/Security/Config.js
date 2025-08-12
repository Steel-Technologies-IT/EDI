
import { LogLevel } from '@azure/msal-browser';
import { PublicClientApplication } from '@azure/msal-browser';


/*
*     This file is the configuration file for Entra ID connection to our react
*     app, set the env variables in your .env file for local and set them in
*     your github secrets for other enviroments
*/

console.log('[Entra ENV] REACT_APP_Entra_ClientId:', process.env.REACT_APP_Entra_ClientId);
console.log('[Entra ENV] REACT_APP_Entra_Authority:', process.env.REACT_APP_Entra_Authority);
console.log('[Entra ENV] REACT_APP_Entra_Host:', process.env.REACT_APP_Entra_Host);
console.log('[Entra ENV] REACT_APP_Server1_Port:', process.env.REACT_APP_Server1_Port);

// Print window.crypto availability (should be true in browser)
if (typeof window !== 'undefined') {
  console.log('[Crypto check] window.crypto exists:', !!window.crypto);
  if (!window.crypto) {
    console.error('[Crypto check] window.crypto is missing! This will break MSAL.');
  }
} else {
  console.warn('[Crypto check] window is undefined. This is not a browser environment.');
}

export const msalConfig = {
    auth: {
        clientId: `${process.env.REACT_APP_Entra_ClientId}`, // This is the ONLY mandatory field that you need to supply.
        authority:`${process.env.REACT_APP_Entra_Authority}`,
        redirectUri: `http://localhost:3000/`,
        postLogoutRedirectUri: `http://localhost:3000/`,
    },
    cache: {
        cacheLocation: 'sessionStorage', // Configures cache location. "sessionStorage" is more secure, but "localStorage" gives you SSO between tabs.
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        return;
                    case LogLevel.Info:
                        //console.info(message);
                        return;
                    case LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
                        return;
                    default:
                        return;
                }
            },
        },
    },
};

let msalInstance;
try {
  msalInstance = new PublicClientApplication(msalConfig);
} catch (e) {
  if (e && e.message && e.message.includes('crypto_nonexistent')) {
    console.error('[MSAL ERROR] crypto_nonexistent:', e);
    console.error('[MSAL ERROR] Entra ClientId:', process.env.REACT_APP_Entra_ClientId);
    console.error('[MSAL ERROR] Entra Authority:', process.env.REACT_APP_Entra_Authority);
  } else {
    console.error('[MSAL ERROR] Unexpected:', e);
  }
  throw e;
}
export { msalInstance };

export const loginRequest = {
    scopes: ["User.Read", "GroupMember.Read.All"],
};

import { LogLevel } from '@azure/msal-browser';
import { PublicClientApplication } from '@azure/msal-browser';


/*
*     This file is the configuration file for Entra ID connection to our react
*     app, set the env variables in your .env file for local and set them in
*     your github secrets for other enviroments
*/

// Print window.crypto availability (should be true in browser)
if (typeof window !== 'undefined') {
  console.log('[Crypto check] window.crypto exists:', !!window.crypto);
  console.log('[Crypto check] window.isSecureContext:', window.isSecureContext);
  const hasSubtle = !!(window.crypto && window.crypto.subtle);
  console.log('[Crypto check] window.crypto.subtle exists:', hasSubtle);
  if (!hasSubtle) {
    console.error('[Crypto check] crypto.subtle is missing. PKCE requires a secure context (HTTPS). Localhost is exempt.');
  }
} else {
  console.warn('[Crypto check] window is undefined. This is not a browser environment.');
}

// Build redirect URIs dynamically so they match the deployed origin
const defaultRedirect = (typeof window !== 'undefined' && window.location && window.location.origin)
  ? `${window.location.origin}/`
  : (process.env.REACT_APP_REDIRECT_URI || 'https://az-cld-ivap-d1:3000/');

export const msalConfig = {
    auth: {
        clientId: `${process.env.REACT_APP_Entra_ClientId}`, // This is the ONLY mandatory field that you need to supply.
        authority:`${process.env.REACT_APP_Entra_Authority}`,
        // Use dynamic origin to avoid hardcoding localhost in prod
        redirectUri: defaultRedirect,
        postLogoutRedirectUri: defaultRedirect,
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
  if (typeof window === 'undefined') {
    console.warn('[MSAL INIT] Skipping MSAL init because window is undefined.');
  } else {
    msalInstance = new PublicClientApplication(msalConfig);
  }
} catch (e) {
  if (e && e.message && e.message.includes('crypto_nonexistent')) {
    console.error('[MSAL ERROR] crypto_nonexistent:', e);
    console.error('[MSAL ERROR] Entra ClientId:', process.env.REACT_APP_Entra_ClientId);
    console.error('[MSAL ERROR] Entra Authority:', process.env.REACT_APP_Entra_Authority);
    console.error('[MSAL ERROR] SecureContext:', typeof window !== 'undefined' ? window.isSecureContext : 'no-window');
  } else {
    console.error('[MSAL ERROR] Unexpected:', e);
  }
  throw e;
}
export { msalInstance };

export const loginRequest = {
    scopes: ["User.Read", "GroupMember.Read.All"],
};

import { redirect } from "react-router-dom";
import { LogLevel } from '@azure/msal-browser';
import { PublicClientApplication } from '@azure/msal-browser';

console.log('Initializing MSAL with config:', {
  clientId: process.env.REACT_APP_Entra_ClientId,
  authority: process.env.REACT_APP_Entra_Authority,
  redirectUri: process.env.REACT_APP_REDIRECT_URI,
  postLogoutRedirectUri: process.env.REACT_APP_REDIRECT_URI,
});
export const msalConfig = {
    auth: {
        clientId: `${process.env.REACT_APP_Entra_ClientId}`, // This is the ONLY mandatory field that you need to supply.
        authority:`${process.env.REACT_APP_Entra_Authority}`,
        redirectUri: `${process.env.REACT_APP_REDIRECT_URI}`,
        postLogoutRedirectUri: `${process.env.REACT_APP_REDIRECT_URI}`,
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
  scopes: ["User.Read", "Group.Read.All", "GroupMember.Read.All"], // Example: request user profile data
};
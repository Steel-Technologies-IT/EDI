
import { LogLevel } from '@azure/msal-browser';
import { PublicClientApplication } from '@azure/msal-browser';


/*
*     This file is the configuration file for Entra ID connection to our react
*     app, set the env variables in your .env file for local and set them in
*     your github secrets for other enviroments
*/


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
export const msalInstance = new PublicClientApplication(msalConfig);
async function initializeMsal() {
    await msalInstance.initialize();
    // Now you can call other MSAL methods
  }
  initializeMsal().catch(error => {
    console.error("MSAL initialization error:", error);
  });

export const loginRequest = {
    scopes: ["User.Read", "GroupMember.Read.All"],
};

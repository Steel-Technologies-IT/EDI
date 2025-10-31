import React from 'react';
import { HashRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './Security/Config';

import App from './App';

function RENDER () {
    return(
        <MsalProvider instance={msalInstance}>
            <HashRouter>
              <App/>
            </HashRouter>
        </MsalProvider>
    )
}

createRoot(document.getElementById('root')).render(<RENDER />);


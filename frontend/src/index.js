import React from 'react';
import { HashRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';


import App from './App';

function RENDER () {
    return(
        
            <HashRouter>
              <App/>
            </HashRouter>
       
    )
}

createRoot(document.getElementById('root')).render(<RENDER />);


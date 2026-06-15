import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./Security/Config";

const root = ReactDOM.createRoot(document.getElementById("root"));

const renderApp = () => {
  root.render(
    <MsalProvider instance={msalInstance}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MsalProvider>
  );
};

if (msalInstance && typeof msalInstance.initialize === 'function') {
  msalInstance
    .initialize()
    .then(() => renderApp())
    .catch((error) => {
      console.error('MSAL initialization failed:', error);
      renderApp();
    });
} else {
  renderApp();
}
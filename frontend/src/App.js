import React, { useState, useEffect} from "react";
import { Route, Routes, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
// MSAL React
import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate, useMsal, useIsAuthenticated } from '@azure/msal-react';
import { msalInstance, loginRequest } from './Security/Config';
import { FaSignOutAlt } from "react-icons/fa";
import { CheckAccount } from "./functions/getUserInfo";
//App Components Used for Routing

import TranslationTableRules from "./pages/translations/translationtablerules";
import TranslationHome from "./pages/translations/translationHome";
import TableView from "./pages/EDI_transactions/TableView";
import RulesSequenceChange from "./pages/translations/rulesSequenceChange";
import ResendTransaction from "./pages/EDI_transactions/ResendTransactionInbound";
import RoutingTransactionView from "./pages/Routing_SNF/routing_home.js";
import EDIPathWatcher from "./pages/path_watching/edi_path";
import ResendTransactionOutbound from "./pages/EDI_transactions/ResendTransactionOutbound.js";
import TPConfiguration from "./pages/Customer_Config/customer_config_home.js";
import TPModification from "./pages/Customer_Config/customer_modification.js";
import ErroredOutInvoices from "./pages/InvoiceDashboard/ErroredOutInvoices.js";

const App = () => {
  const [message, setMessage] = useState('');
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(true);

  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState('');
 
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();

  // Initialize state from sessionStorage on mount
  useEffect(() => {
    const storedUserInfo = sessionStorage.getItem('userInfo');
    const storedUserGroups = sessionStorage.getItem('userGroups');
    const storedCurrentUser = sessionStorage.getItem('currentUser');
    
    if (storedUserInfo) {
      setUserInfo(JSON.parse(storedUserInfo));
    }
    if (storedUserGroups) {
      setUserGroups(JSON.parse(storedUserGroups));
    }
    if (storedCurrentUser) {
      setCurrentUser(storedCurrentUser);
    }
    // If we have cached data, we don't need to show loading
    if (storedUserInfo || storedUserGroups || storedCurrentUser) {
      setIsLoadingUserInfo(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoadingUserInfo(false);
      return;
    }

    const account = accounts[0] || instance.getActiveAccount() || instance.getAllAccounts()[0];
    if (account) {
      setIsLoadingUserInfo(true);
      const fetchAccount = async () => {
        try {
          const result = await CheckAccount();
          if (result) {
            const { group = [], usr = {}, load = false } = result;
            setUserInfo(usr);
            setUserGroups(group || []);
            console.log('Fetched user info and groups:', { usr, group });
            // Store in sessionStorage
            sessionStorage.setItem('userInfo', JSON.stringify(usr));
            sessionStorage.setItem('userGroups', JSON.stringify(group || []));
            
            // Format user display name
            let user = usr.givenName && usr.surname 
              ? usr.givenName.charAt(0) + usr.surname 
              : usr.userPrincipalName || 'User';
            setCurrentUser(user);
            sessionStorage.setItem('currentUser', user);
          }
        } catch (error) {
          console.error('Error fetching account info:', error);
        } finally {
          setIsLoadingUserInfo(false);
        }
      };
      fetchAccount();
    } else {
      setIsLoadingUserInfo(false);
    }
  }, [isAuthenticated, accounts, instance]);
  
  /*-----------------------------------------FUNCTIONS--------------------------------------------- */

  // Logout handler using MSAL
  const handleLogout = () => {
    if (accounts.length > 0) {
      instance.logoutRedirect({ account: accounts[0] });
    } else {
      instance.logoutRedirect();
    }
  };

  // Check if user has required roles
  const isAuthorized = (requiredRoles) => {
    
    if (!requiredRoles || requiredRoles.length === 0) {return true}
    return requiredRoles.some(role => userGroups.includes(role));
  };

  // Login handler using MSAL
  const handleLogin = () => {
    console.log('Login button clicked');
    instance.loginRedirect(loginRequest).catch(error => {
      console.error('Login error:', error);
    });
  };


  // Resilient Home icon source with fallback
  const [homeSrc, setHomeSrc] = useState(`${process.env.REACT_APP_HOST}/Image/Icons/Home.png`);
  const onHomeImgError = (e) => {
    if (homeSrc.includes('/Image/Icons/')) {
      // try the /public mount as fallback
      setHomeSrc(`${process.env.REACT_APP_HOST}/public/Image/Icons/Home.png`);
    }
  };

const offCanvasOpen = () => {
  try {
    const bootstrap = require('bootstrap'); // Ensure bootstrap is required
    var offcanvasElement = document.getElementById('mainOffcanvas');
    if (offcanvasElement) {
      var offcanvas = new bootstrap.Offcanvas(offcanvasElement);
      offcanvas.show();
    } else {
      console.error('Offcanvas element not found');
    }
  } catch (error) {
    console.error('Error opening offcanvas:', error);
    // Fallback: try to trigger it manually with Bootstrap's data attributes
    const offcanvasElement = document.getElementById('mainOffcanvas');
    if (offcanvasElement) {
      offcanvasElement.classList.add('show');
      document.body.classList.add('offcanvas-backdrop');
    }
  }
}

const handleNav = (path) => {
  // Close the offcanvas first
  try {
    const bootstrap = require('bootstrap');
    const offcanvasElement = document.getElementById('mainOffcanvas');
    if (offcanvasElement) {
      const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement);
      if (offcanvas) {
        offcanvas.hide();
      }
    }
  } catch (error) {
    console.warn('Error closing offcanvas:', error);
  }
  
  // Navigate to the new path
  navigate(path);
}



  return (
    <>
    <AuthenticatedTemplate> 
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      <header style={{ background: '#282c34', color: '#fff', padding: 0, textAlign: 'center', fontSize: 28, fontWeight: 700, letterSpacing: 1, position: 'relative', minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          className="header_photos float-left"
          onClick={offCanvasOpen}
          alt="Home"
          src={homeSrc}
          onError={onHomeImgError}
          style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', height: 36, width: 36, cursor: 'pointer' }}
        />
        EDI Web Application Manager
       <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)' }}>
          <span style={{ marginRight: 12, fontSize: 18 }}>ENV: {process.env.REACT_APP_NODE_ENV || 'localhost'}</span>
          <SignOutButton />
        </div> 
      </header>

      {/* Offcanvas menu */}
      <div className="offcanvas offcanvas-start" tabIndex="-1" id="mainOffcanvas" aria-labelledby="mainOffcanvasLabel">
        <div className="offcanvas-header" style={{ background: '#282c34', color: '#fff' }}>
          <h5 className="offcanvas-title" id="mainOffcanvasLabel">Menu</h5>
          <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body" style={{ background: '#f5f5f5', padding: 0 }}>
          <ul className="list-group list-group-flush">
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/?mode=I')}>Translation Home Inbound</li>
            
              <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/TranslationTableInsert?mode=I')}>Insert Translation Rule Inbound</li>
            
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/?mode=O')}>Translation Home Outbound</li>
            
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/TranslationTableInsert?mode=O')}>Insert Translation Rule Outbound</li>
            
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/EDI_Transaction_Tables')}>View EDI Tables</li>
            
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/Sequence')}>Change Rules Sequence Order</li>
            
            {/* <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/ResendTransactionInbound')}>Resend Inbound Transaction</li> */}
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/ResendTransactionOutbound')}>Resend Outbound Transaction</li>
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/RoutingTransactions')}>Routing Transaction Configuration</li>

            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/TPConfiguration')}>Trading Partner Configuration</li>
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/EDIPathWatcher')}>EDI File Path Tracker</li>
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/810_Dashboard')}>810 Dashboard</li>
          </ul>
        </div>
      </div>

      <div style={{ flex: 1, width: '100%' }}>
        <Routes>
          <Route path="/" element={<TranslationHome />} />
          <Route path="/TranslationTableInsert" element={<TranslationTableRules />} />
          <Route path="/EDI_Transaction_Tables" element={<TableView />} />
          <Route path="/Sequence" element={<RulesSequenceChange />} />
          <Route path="/ResendTransactionInbound" element={<ResendTransaction />} />
          <Route path="/RoutingTransactions" element={<RoutingTransactionView />} />
          <Route path="/EDIPathWatcher" element={<EDIPathWatcher />} />
          <Route path="/ResendTransactionOutbound" element={<ResendTransactionOutbound />} />
          <Route path="/TPConfiguration" element={<TPConfiguration />} />
          <Route path="/TPConfiguration/:mode/:customerId?" element={<TPModification />} />
          <Route path="/810_Dashboard" element={<ErroredOutInvoices />} />
        </Routes>
      </div>
      <footer style={{ background: '#282c34', color: '#fff', padding: '12px 0', textAlign: 'center', fontSize: 16, letterSpacing: 0.5 }}>
        &copy; {new Date().getFullYear()} Steel Technologies - EDI Tools
      </footer>
    </div>
    </AuthenticatedTemplate> 
  <UnauthenticatedTemplate>
      <div style={{ padding: '40px', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f5f5f5' }}>
        <div style={{ background: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', maxWidth: '500px' }}>
          <h2 style={{ marginBottom: '20px', color: '#282c34' }}>Welcome to the Finance and Accounting Tools Portal</h2>
          <p style={{ marginBottom: '30px', color: '#666', fontSize: '16px' }}>Please sign in with your corporate account to access the tools.</p>
          <button
            onClick={ handleLogin }
            style={{
              background: '#0078d4',
              color: '#fff',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'background 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.background = '#106ebe'}
            onMouseOut={(e) => e.target.style.background = '#0078d4'}
          >
            Sign In with Microsoft
          </button>
        </div>
      </div>
    </UnauthenticatedTemplate></>
  );
};


//#endregion

export default App;

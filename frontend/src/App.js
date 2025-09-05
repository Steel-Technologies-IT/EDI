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
import ResendTransaction from "./pages/EDI_transactions/ResendTransaction";
import DuplicateASNView from "./pages/Duplicate_ASN/duplicate_asn.js";
const App = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState('');
  const isAuthenticated = useIsAuthenticated();

  useEffect(() => {
    if (isAuthenticated) {
      const fetchAccount = async () => {
        const result = await CheckAccount();
        const { group = [], usr = {}, load = false } = result || {};
        setUserInfo(usr);
        setUserGroups(group);

        // Store in sessionStorage
        sessionStorage.setItem('userInfo', JSON.stringify(usr));
        sessionStorage.setItem('userGroups', JSON.stringify(group));
        let user = usr.givenName ? usr.givenName.charAt(0) + usr.surname : '';
        setCurrentUser(user);
        sessionStorage.setItem('currentUser', JSON.stringify(user));
      };
      fetchAccount();
    }
  }, [isAuthenticated]);
  
      console.log(userGroups)
  /*-----------------------------------------FUNCTIONS--------------------------------------------- */

  // Simple Sign-In/Out buttons
  const SignInButton = () => {
    const { instance } = useMsal();
    const onSignIn = () => instance.loginRedirect(loginRequest);
    return (
      <button onClick={onSignIn} style={{ padding: '6px 12px', background: '#0078d4', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
        Sign in
      </button>
    );
  };

  const SignOutButton = () => {
    const { instance, accounts } = useMsal();
    const onSignOut = () => instance.logoutRedirect({ account: accounts[0] });
    return (
      <FaSignOutAlt
        onClick={onSignOut}
        style={{
          padding: '2px 8px',
          border: 'none',
          borderRadius: 2,
          cursor: 'pointer',
          fontSize: 50,
          minWidth: 0,
          background: 'transparent',
          color: 'white',
          
        }}
      />
        
    );
  };

  // Resilient Home icon source with fallback
  const [homeSrc, setHomeSrc] = useState(`https://${process.env.REACT_APP_HOST}:5000/Image/Icons/Home.png`);
  const onHomeImgError = (e) => {
    if (homeSrc.includes('/Image/Icons/')) {
      // try the /public mount as fallback
      setHomeSrc(`https://${process.env.REACT_APP_HOST}:5000/public/Image/Icons/Home.png`);
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







console.log(currentUser)

  return (
    <MsalProvider instance={msalInstance} >
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
        EDI Translation Table Manager
       <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)' }}>
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
            {userGroups.includes("EWATier1") && (
              <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/TranslationTableInsert?mode=I')}>Insert Translation Rule Inbound</li>
            )}
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/?mode=O')}>Translation Home Outbound</li>
            {userGroups.includes("EWATier1") && (
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/TranslationTableInsert?mode=O')}>Insert Translation Rule Outbound</li>
            )}
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/EDI_Transaction_Tables')}>View EDI Tables</li>
            {userGroups.includes("EWATier1") && (
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/Sequence')}>Change Rules Sequence Order</li>
            )}
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/ResendTransaction')}>Resend Transaction</li>
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/DuplicateASN')}>Duplicate ASN Configuration</li>

            {/* Add more menu items here as needed */}
          </ul>
        </div>
      </div>

      <div style={{ flex: 1, width: '100%' }}>
        <Routes>
          <Route path="/" element={<TranslationHome />} />
          <Route path="/TranslationTableInsert" element={<TranslationTableRules />} />
          <Route path="/EDI_Transaction_Tables" element={<TableView />} />
          <Route path="/Sequence" element={<RulesSequenceChange />} />
          <Route path="/ResendTransaction" element={<ResendTransaction />} />
          <Route path="/DuplicateASN" element={<DuplicateASNView />} />
        </Routes>
      </div>
      <footer style={{ background: '#282c34', color: '#fff', padding: '12px 0', textAlign: 'center', fontSize: 16, letterSpacing: 0.5 }}>
        &copy; {new Date().getFullYear()} Steel Technologies - EDI Tools
      </footer>
    </div>
      </AuthenticatedTemplate>
       <UnauthenticatedTemplate>
         <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
           <h3>Please sign in to continue</h3>
           <SignInButton />
         </div>
      </UnauthenticatedTemplate>
     </MsalProvider>
  );
};


//#endregion

export default App;

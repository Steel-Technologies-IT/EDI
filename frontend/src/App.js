import React, { useState, useEffect} from "react";
import { Route, Routes, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';


//App Components Used for Routing

import TranslationTableRules from "./pages/translations/translationtablerules";
import TranslationHome from "./pages/translations/translationHome";
import TableView from "./pages/EDI_transactions/TableView";



const App = () => {
  const navigate = useNavigate();

  /*-----------------------------------------FUNCTIONS--------------------------------------------- */
        
      
        

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      <header style={{ background: '#282c34', color: '#fff', padding: 0, textAlign: 'center', fontSize: 28, fontWeight: 700, letterSpacing: 1, position: 'relative', minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          className="header_photos float-left"
          onClick={offCanvasOpen}
          alt="Home"
          src={`http://localhost:5000/Image/Icons/Home.png`}
          style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', height: 36, width: 36, cursor: 'pointer' }}
        />
        EDI Translation Table Manager
      </header>

      {/* Offcanvas menu */}
      <div className="offcanvas offcanvas-start" tabIndex="-1" id="mainOffcanvas" aria-labelledby="mainOffcanvasLabel">
        <div className="offcanvas-header" style={{ background: '#282c34', color: '#fff' }}>
          <h5 className="offcanvas-title" id="mainOffcanvasLabel">Menu</h5>
          <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body" style={{ background: '#f5f5f5', padding: 0 }}>
          <ul className="list-group list-group-flush">
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/')}>Translation Home</li>
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/TranslationTableInsert')}>Insert Translation Rule</li>
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/EDI_Transaction_Tables')}>View EDI Tables</li>
            {/* Add more menu items here as needed */}
          </ul>
        </div>
      </div>

      <div style={{ flex: 1, width: '100%' }}>
        <Routes>
          <Route path="/" element={<TranslationHome />} />
          <Route path="/TranslationTableInsert" element={<TranslationTableRules />} />
          <Route path="/EDI_Transaction_Tables" element={<TableView />} />
        </Routes>
      </div>
      <footer style={{ background: '#282c34', color: '#fff', padding: '12px 0', textAlign: 'center', fontSize: 16, letterSpacing: 0.5 }}>
        &copy; {new Date().getFullYear()} Steel Technologies - EDI Tools
      </footer>
    </div>
  );
};


//#endregion

export default App;

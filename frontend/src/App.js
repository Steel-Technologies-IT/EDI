import React, { useState, useEffect} from "react";
import { Route, Routes, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';


//App Components Used for Routing

import TranslationTableRules from "./pages/translations/translationtablerules";
import TranslationHome from "./pages/translations/translationHome";




const App = () => {
  const navigate = useNavigate();

 const [apps, setApps] = useState([])
   

        /*-----------------------------------------FUNCTIONS--------------------------------------------- */
        
      
        

const offCanvasOpen =()=>{
     
      const bootstrap = require('bootstrap'); // Ensure bootstrap is required
      var offcanvasElement = document.getElementById('mainOffcanvas');
      var offcanvas = new bootstrap.Offcanvas(offcanvasElement);
      offcanvas.show();
    

}

const handleNav = (path) => {
  navigate(path);
}












  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      <header style={{ background: '#282c34', color: '#fff', padding: 0, textAlign: 'center', fontSize: 28, fontWeight: 700, letterSpacing: 1, position: 'relative', minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          className="header_photos float-left"
          type="button" data-bs-toggle="offcanvas" data-bs-target="#mainOffcanvas" aria-controls="mainOffcanvas"
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
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/')}>Home</li>
            <li className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => handleNav('/TranslationTableInsert')}>Insert Translation Rule</li>
            {/* Add more menu items here as needed */}
          </ul>
        </div>
      </div>

      <div style={{ flex: 1, width: '100%' }}>
        <Routes>
          <Route path="/" element={<TranslationHome />} />
          <Route path="/TranslationTableInsert" element={<TranslationTableRules />} />
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

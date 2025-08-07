import React, { useState, useEffect} from "react"
import './App.css';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate, useIsAuthenticated } from '@azure/msal-react';
import { CheckAccount } from "./GetUserInfo";

//App Components Used for Routing

import Home from "./pages/translationtablerules";




const App = () => {
  

  return (
   
                <Routes>
                  <Route path="/" element={<Home />} />
                </Routes>
       
      
  );
};


//#endregion

export default App;

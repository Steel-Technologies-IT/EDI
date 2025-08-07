import React, { useState, useEffect} from "react"

import { Route, Routes, useNavigate } from 'react-router-dom';


//App Components Used for Routing

import TranslationTableRules from "./pages/translationtablerules";




const App = () => {
  

  return (
                <Routes>
                  <Route path="/" element={<TranslationTableRules />} />
                </Routes>
       
      
  );
};


//#endregion

export default App;

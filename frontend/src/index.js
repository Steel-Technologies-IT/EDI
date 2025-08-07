import React from 'react';
import * as ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { HashRouter } from 'react-router-dom';



function RENDER () {
    return(
            <HashRouter>
                <App/>
            </HashRouter>
    )
}




ReactDOM.render(<RENDER />, document.getElementById('root'));


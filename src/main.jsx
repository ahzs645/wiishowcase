import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../Wii.css/dist/wii.css';
import '../Wii.css/js/wii-banner.js';
import '../Wii.css/js/wii-channel-holder.js';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

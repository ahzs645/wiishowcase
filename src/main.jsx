import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../Wii.css/dist/wii.css';
import '../Wii.css/js/wii-banner.js';
import '../Wii.css/js/wii-channel-holder.js';
import '../Wii.css/js/wii-calendar.js';
import './App.css';
import './layout/menu.generated.css';
import './layout/system.generated.css';
import './system-interface.css';
import './system-adapters.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

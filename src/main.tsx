import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';
import '../Wii.css/dist/wii.css';
import '../Wii.css/js/wii-banner.js';
import '../Wii.css/js/wii-channel-holder.js';
import '../Wii.css/js/wii-calendar.js';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

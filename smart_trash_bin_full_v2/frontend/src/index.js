import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Ini memanggil file App.js kamu

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
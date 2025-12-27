import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // This imports Tailwind and global styles

/**
 * ENTRY POINT: Word to IJSR PDF Converter
 * 
 * This file bootstraps the React 18 application.
 * It renders the App component within StrictMode to highlight 
 * potential problems during development.
 */

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

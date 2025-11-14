import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Import the main Tailwind CSS file

/**
 * The entry point of the React application.
 * It renders the main App component into the root element defined in index.html.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

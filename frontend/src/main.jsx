
import React from 'react'
console.log("MAIN LOADED ✅", new Date().toISOString());
import { createRoot } from 'react-dom/client'
import App from './App'
import ErrorBoundary from './ErrorBoundary.jsx';
import TestScreen from './TestScreen.jsx';
import './styles.css'
console.log("MOUNTING REACT ✅", document.getElementById("root"));

const SHOW_TEST_SCREEN = true; // depois volta para false

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {SHOW_TEST_SCREEN ? <TestScreen /> : (
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    )}
  </React.StrictMode>
)


import React from 'react'
console.log("MAIN LOADED ✅", new Date().toISOString());
import { createRoot } from 'react-dom/client'
import App from './App'
import ErrorBoundary from './ErrorBoundary.jsx';
import './styles.css'
console.log("MOUNTING REACT ✅", document.getElementById("root"));

// ...existing code...

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

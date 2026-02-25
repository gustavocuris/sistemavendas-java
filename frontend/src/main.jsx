import * as ReactNS from 'react'
console.log('REACT MODULE', ReactNS, ReactNS?.useState)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './ErrorBoundary.jsx'
import './styles.css'

console.log("MAIN LOADED ✅", new Date().toISOString())
console.log("MOUNTING REACT ✅", document.getElementById("root"))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

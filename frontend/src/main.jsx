import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './ErrorBoundary.jsx'
import './styles.css'

import { useState, useEffect } from 'react';

function ErrorBoundaryWithReset() {
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => {
    // Escuta login/logout ou troca de tela principal
    const handler = () => setResetKey((k) => k + 1);
    window.addEventListener('reset-error-boundary', handler);
    return () => window.removeEventListener('reset-error-boundary', handler);
  }, []);
  return (
    <ErrorBoundary resetKey={resetKey}>
      <App />
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundaryWithReset />
  </StrictMode>
)

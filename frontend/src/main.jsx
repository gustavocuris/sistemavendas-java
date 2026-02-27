import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './ErrorBoundary.jsx'
import './styles.css'

import { useState, useEffect } from 'react';


function ErrorBoundaryWithReset() {
  const [resetKey, setResetKey] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  useEffect(() => {
    const handler = () => {
      setTransitioning(true);
      setTimeout(() => {
        setResetKey((k) => k + 1);
        setTransitioning(false);
      }, 100); // 100ms para evitar flash
    };
    window.addEventListener('reset-error-boundary', handler);
    return () => window.removeEventListener('reset-error-boundary', handler);
  }, []);
  if (transitioning) return null;
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

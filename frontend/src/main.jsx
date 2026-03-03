import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './ErrorBoundary.jsx'
import './styles.css'

import { useState, useEffect } from 'react';



// Move user loading and transition logic here
function ErrorBoundaryWithUserLoad() {
  const [resetKey, setResetKey] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      const user = saved ? JSON.parse(saved) : null;
      if (user?.id === '1' && String(user?.role || '').toLowerCase() === 'admin') {
        const normalized = { ...user, id: 'adm' };
        localStorage.setItem('currentUser', JSON.stringify(normalized));
        return normalized;
      }
      return user;
    } catch {
      return null;
    }
  });

  // Listen for user change events (login/logout)
  useEffect(() => {
    const handler = () => {
      setTransitioning(true);
      setTimeout(() => {
        setResetKey((k) => k + 1);
        // Re-read user from localStorage
        try {
          const saved = localStorage.getItem('currentUser');
          const user = saved ? JSON.parse(saved) : null;
          if (user?.id === '1' && String(user?.role || '').toLowerCase() === 'admin') {
            const normalized = { ...user, id: 'adm' };
            localStorage.setItem('currentUser', JSON.stringify(normalized));
            setCurrentUser(normalized);
          } else {
            setCurrentUser(user);
          }
        } catch {
          setCurrentUser(null);
        }
        setTransitioning(false);
        setLoadingUser(false);
      }, 100);
      setLoadingUser(true);
    };
    window.addEventListener('reset-error-boundary', handler);
    return () => window.removeEventListener('reset-error-boundary', handler);
  }, []);

  // On mount, simulate initial user load
  useEffect(() => {
    setLoadingUser(true);
    setTimeout(() => {
      setLoadingUser(false);
    }, 100);
  }, []);

  if (transitioning || loadingUser) return null;
  return (
    <ErrorBoundary resetKey={resetKey}>
      <App currentUser={currentUser} loadingUser={loadingUser} />
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundaryWithUserLoad />
  </StrictMode>
)

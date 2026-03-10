import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './ErrorBoundary.jsx'
import './styles.css'

import { useState, useEffect } from 'react';

function sanitizeMojibakeInDom(rootNode = document.body) {
  if (!rootNode) return

  const replacements = [
    [/Mar\\u00E7o/g, 'Março'],
    [/Mar\\u00e7o/g, 'Março'],
    [/MarÃ§o/g, 'Março'],
    [/MÃªs/g, 'Mês'],
    [/PrÃ³ximo/g, 'Próximo'],
    [/â€¢/g, '|'],
    [/âœ•/g, 'X'],
    [/âœ“/g, 'OK'],
    [/â€”/g, '-'],
    [/â€“/g, '-']
  ]

  const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT)
  const touched = []
  while (walker.nextNode()) {
    const node = walker.currentNode
    const original = node.nodeValue || ''
    let sanitized = original
    for (const [pattern, replacement] of replacements) {
      sanitized = sanitized.replace(pattern, replacement)
    }
    if (sanitized !== original) {
      touched.push([node, sanitized])
    }
  }

  touched.forEach(([node, value]) => {
    node.nodeValue = value
  })
}


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

sanitizeMojibakeInDom()

const observer = new MutationObserver(() => {
  sanitizeMojibakeInDom()
})

observer.observe(document.body, {
  subtree: true,
  childList: true,
  characterData: true
})

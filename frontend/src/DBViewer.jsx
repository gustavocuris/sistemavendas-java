import React, { useState, useEffect } from 'react';

function DBViewer({ isOpen, onClose }) {
  const [dbData, setDbData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detecta dark mode do documento
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.body.classList.contains('dark-mode'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadDatabase();
    }
  }, [isOpen]);

  const loadDatabase = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/database`);
      if (!response.ok) throw new Error('Erro ao carregar banco de dados');
      const data = await response.json();
      setDbData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{...styles.modal, backgroundColor: isDarkMode ? '#1a1a1a' : '#fff', color: isDarkMode ? '#fff' : '#1a1a1a'}} onClick={(e) => e.stopPropagation()}>
        <div style={{...styles.header, borderBottomColor: isDarkMode ? '#333' : '#e2e8f0'}}>
          <h2 style={styles.title}>📊 Visualizar Banco de Dados</h2>
          <button style={{...styles.closeBtn, color: isDarkMode ? '#aaa' : '#666'}} onClick={onClose}>✕</button>
        </div>

        <div style={styles.content}>
          {loading ? (
            <p style={styles.loading}>Carregando...</p>
          ) : error ? (
            <p style={{...styles.error, color: '#ef4444'}}>Erro: {error}</p>
          ) : dbData ? (
            <pre style={{...styles.code, backgroundColor: isDarkMode ? '#0a0a0a' : '#f5f5f5', color: isDarkMode ? '#e0e0e0' : '#1a1a1a'}}>
              {JSON.stringify(dbData, null, 2)}
            </pre>
          ) : (
            <p>Sem dados</p>
          )}
        </div>

        <div style={{...styles.footer, borderTopColor: isDarkMode ? '#333' : '#e2e8f0'}}>
          <button style={{...styles.reloadBtn, backgroundColor: isDarkMode ? '#2d5a3d' : '#4a7c59'}} onClick={loadDatabase}>
            🔄 Recarregar
          </button>
          <button style={{...styles.closeButton, backgroundColor: isDarkMode ? '#333' : '#e2e8f0', color: isDarkMode ? '#fff' : '#1a1a1a'}} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    width: '90%',
    maxWidth: '900px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    color: '#1a1a1a',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 20px',
  },
  code: {
    backgroundColor: '#f5f5f5',
    padding: '12px',
    borderRadius: '4px',
    overflow: 'auto',
    fontFamily: 'Courier New, monospace',
    fontSize: '13px',
    lineHeight: '1.5',
    margin: 0,
  },
  footer: {
    display: 'flex',
    gap: '8px',
    padding: '12px 20px',
    borderTop: '1px solid #e2e8f0',
    justifyContent: 'flex-end',
  },
  reloadBtn: {
    padding: '8px 16px',
    backgroundColor: '#4a7c59',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  closeButton: {
    padding: '8px 16px',
    backgroundColor: '#e2e8f0',
    color: '#1a1a1a',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

export default DBViewer;

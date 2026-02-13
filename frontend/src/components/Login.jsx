import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function Login({ onLogin, primaryColor, darkMode }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved === 'true'
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('intercappneus@gmail.com')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState('')
  const [resetToken, setResetToken] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('token') || ''
  })
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')

  const API = `${import.meta.env.VITE_API_URL}/api`

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const response = await axios.post(`${API}/login`, {
        username: username.trim(),
        password
      })

      if (response.status === 200) {
        setSuccess('Login realizado com sucesso! ✓')
        // Chama onLogin imediatamente sem delay
        onLogin()
      }
    } catch (err) {
      setIsLoading(false)
      setError(err.response?.data?.message || 'Login ou senha incorretos')
      setPassword('')
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setForgotError('')
    setForgotSuccess('')
    setForgotLoading(true)

    try {
      if (!forgotEmail.includes('@')) {
        setForgotError('Por favor, insira um email válido')
        setForgotLoading(false)
        return
      }

      const response = await axios.post(`${API}/forgot-password`, {
        email: forgotEmail
      })

      if (response.status === 200) {
        setForgotSuccess('Email enviado com sucesso! Verifique sua caixa de entrada.')
        setTimeout(() => {
          setShowForgotPassword(false)
          setForgotSuccess('')
        }, 3000)
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Erro ao processar solicitação. Tente novamente.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setResetError('')
    setResetSuccess('')

    if (resetPassword.length < 6) {
      setResetError('A nova senha deve ter pelo menos 6 caracteres')
      return
    }

    if (resetPassword !== resetConfirm) {
      setResetError('As senhas nao conferem')
      return
    }

    setResetLoading(true)

    try {
      const response = await axios.post(`${API}/reset-password`, {
        token: resetToken,
        newPassword: resetPassword
      })

      if (response.status === 200) {
        setResetSuccess('Senha alterada com sucesso!')
        setResetPassword('')
        setResetConfirm('')
        setTimeout(() => {
          setResetToken('')
          const newUrl = window.location.pathname
          window.history.replaceState({}, '', newUrl)
        }, 1200)
      }
    } catch (err) {
      setResetError(err.response?.data?.message || 'Erro ao alterar senha')
    } finally {
      setResetLoading(false)
    }
  }

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
    // Salvar preferência de dark mode no localStorage
    localStorage.setItem('darkMode', isDarkMode.toString())
  }, [isDarkMode])

  return (
      <div className={`login-container ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Dark Mode Toggle */}
      <button className="dark-mode-toggle" onClick={() => {
        setIsDarkMode(!isDarkMode);
      }}>
        {isDarkMode ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        )}
      </button>

      {/* Animated Van Gogh style background */}
      <div className="starry-background"></div>
      <div className="dark-overlay"></div>
      
      {/* Swirling orbs */}
      <div className="swirl-container">
        <div className="swirl swirl-1"></div>
        <div className="swirl swirl-2"></div>
        <div className="swirl swirl-3"></div>
        <div className="swirl swirl-4"></div>
        <div className="swirl swirl-5"></div>
        <div className="swirl swirl-6"></div>
      </div>

      <div className="login-box">
        {/* Header Section */}
        <div className="login-header">
          <img src="/logo-intercap.svg" alt="Intercap Pneus" className="login-logo" />
          <h1 className="login-title">SISTEMA DE VENDAS</h1>
          <div className="login-subtitle">Acesse sua conta</div>
        </div>

        {/* Login Form */}
        {resetToken ? (
          <form onSubmit={handleResetPassword} className="login-form login-form-reset">
            <div className="forgot-password-header">
              <h2>Nova Senha</h2>
            </div>

            <p className="forgot-password-description">
              Informe uma nova senha para o sistema.
            </p>

            <div className="form-group">
              <label htmlFor="newPassword">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Nova Senha
              </label>
              <input
                id="newPassword"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Nova senha"
                required
                autoFocus
                className="login-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Confirmar Senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                placeholder="Confirmar senha"
                required
                className="login-input"
              />
            </div>

            {resetError && (
              <div className="login-alert login-alert-error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="login-alert login-alert-success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {resetSuccess}
              </div>
            )}

            <button
              type="submit"
              className="btn-login"
              disabled={resetLoading}
            >
              {resetLoading ? (
                <>
                  <span className="spinner"></span>
                  Salvando...
                </>
              ) : (
                <>Salvar nova senha</>
              )}
            </button>
          </form>
        ) : (!showForgotPassword ? (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Login
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder=""
                required
                autoFocus
                className="login-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Senha
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  required
                  className="login-input"
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-alert login-alert-error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div className="login-alert login-alert-success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {success}
              </div>
            )}

            <button 
              type="submit" 
              className="btn-login"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  Entrando...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10 17 15 12 10 7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                  </svg>
                  Entrar no Sistema
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-forgot-password"
              onClick={() => setShowForgotPassword(true)}
            >
              Esqueci minha senha
            </button>
          </form>
        ) : (
          /* Forgot Password Form */
          <form onSubmit={handleForgotPassword} className="login-form">
            <div className="forgot-password-header">
              <button
                type="button"
                className="btn-back-forgot"
                onClick={() => {
                  setShowForgotPassword(false)
                  setForgotEmail('intercappneus@gmail.com')
                  setForgotError('')
                  setForgotSuccess('')
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
              </button>
              <h2>Recuperar Senha</h2>
            </div>

            <p className="forgot-password-description">
              O email de recuperacao sera enviado para intercappneus@gmail.com.
            </p>

            <div className="form-group">
              <label htmlFor="email">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22 6 12 13 2 6"></polyline>
                </svg>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="intercappneus@gmail.com"
                required
                className="login-input"
              />
            </div>

            {forgotError && (
              <div className="login-alert login-alert-error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div className="login-alert login-alert-success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {forgotSuccess}
              </div>
            )}

            <button
              type="submit"
              className="btn-login"
              disabled={forgotLoading}
            >
              {forgotLoading ? (
                <>
                  <span className="spinner"></span>
                  Enviando...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12a8 8 0 0 0 8 8c3.3 0 6.2-1.6 8-4"></path>
                    <path d="M20 12a8 8 0 0 0-8-8c-3.3 0-6.2 1.6-8 4"></path>
                  </svg>
                  Enviar Link de Recuperação
                </>
              )}
            </button>
          </form>
        ))}

        {/* Footer */}
        <div className="login-footer">
          <div className="login-footer-content">
            <div className="footer-row">
              <div className="footer-system">
                <strong>SV SISTEMA DE VENDAS 2026</strong>
              </div>
              <div className="footer-divider">•</div>
              <div className="footer-security">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>Security and Privacy Protected</span>
              </div>
            </div>
            <div className="footer-author">
              Developed by <strong>Gustavo Curis de Francisco</strong>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        .login-container {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e8e8e8;
          position: relative;
          overflow: hidden;
          --primary-color: #2ecc71;
          --primary-light: #52ffa3;
          --primary-dark: #27ae60;
          transition: background 0.3s ease;
        }

        .login-container.dark-mode {
          background: #000000;
        }

        .dark-mode-toggle {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 1000;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .dark-mode-toggle:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .dark-mode .dark-mode-toggle {
          background: #1a1a1a;
          border-color: #ffffff;
          box-shadow: 0 2px 8px rgba(255, 255, 255, 0.3);
        }

        .dark-mode-toggle svg {
          color: #333;
        }

        .dark-mode .dark-mode-toggle svg {
          color: #ffffff;
        }

        /* Van Gogh Starry Night inspired background */
        .starry-background {
          display: none;
        }

        /* Dark overlay */
        .dark-overlay {
          display: none;
        }

        /* Swirling effects */
        .swirl-container {
          display: none;
        }

        .login-box {
          position: relative;
          z-index: 100;
          width: 100%;
          max-width: 420px;
          padding: 50px 40px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 
            0 2px 16px rgba(0, 0, 0, 0.08),
            0 0 1px rgba(0, 0, 0, 0.1);
          animation: boxEntry 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes boxEntry {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .login-box .login-header {
          flex: initial;
          background: none;
          padding: 0;
          display: block;
          color: #333;
          text-align: center;
          margin-bottom: 40px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .login-title {
          font-size: 32px;
          font-weight: 700;
          font-family: 'Inter', 'Segoe UI', 'Roboto', sans-serif;
          letter-spacing: 0px;
          color: #000;
          margin-bottom: 10px;
          text-shadow: none;
        }

        .login-subtitle {
          font-size: 14px;
          color: #999;
          font-weight: 400;
          letter-spacing: 0px;
        }

        .login-form {
          flex: initial;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 0;
        }

        .login-form-reset {
          flex: initial;
          padding: 0;
        }

        .login-container::before {
          content: '';
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(14, 194, 88, 0.1) 0%, transparent 70%);
          border-radius: 50%;
          top: -100px;
          right: -50px;
          animation: float 8s ease-in-out infinite, pulse-large 6s ease-in-out infinite;
        }

        .login-container::after {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(52, 228, 0, 0.08) 0%, transparent 70%);
          border-radius: 50%;
          bottom: -80px;
          left: -50px;
          animation: float 10s ease-in-out infinite reverse, pulse-large 8s ease-in-out infinite reverse;
        }
        .login-box {
          background: #ffffff;
          border-radius: 4px;
          width: 100%;
          max-width: 500px;
          padding: 40px 50px;
          animation: slideUp 0.6s ease-out;
          position: relative;
          z-index: 10;
          transition: all 0.3s ease;
        }

        .dark-mode .login-box {
          background: #1a1a1a;
        }

        @keyframes glow-pulse {
          0%, 100% { }
          50% { }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
          position: relative;
        }

        .login-logo {
          display: block;
          height: 60px;
          width: auto;
          max-width: 280px;
          margin: 0 auto 16px auto;
          filter: drop-shadow(0 2px 8px rgba(46, 204, 113, 0.2));
          transition: filter 0.3s ease;
        }

        .dark-mode .login-logo {
          filter: drop-shadow(0 2px 12px rgba(255, 255, 255, 0.3)) brightness(1.1);
        }

        @keyframes breathing {
          0% { transform: scale(1); }
          25% { transform: scale(1.08); }
          50% { transform: scale(0.95); }
          75% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .login-header h1 {
          margin: 12px 0 8px 0;
          font-size: 28px;
          font-weight: 700;
          color: #1e7e34;
          letter-spacing: -0.5px;
        }

        .dark-mode .login-header h1 {
          color: #229954;
        }

        .login-subtitle {
          color: #666;
          font-size: 14px;
          margin-bottom: 32px;
        }

        .dark-mode .login-subtitle {
          color: #ccc;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 12px;
          background: linear-gradient(135deg, #27ae60 0%, #229954 50%, #1e7e34 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.3s ease;
        }

        .dark-mode .form-group label {
          background: linear-gradient(135deg, #27ae60 0%, #229954 50%, #1e7e45 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .form-group label svg {
          width: 16px;
          height: 16px;
          stroke: #229954;
          transition: all 0.3s ease;
        }

        .form-group:focus-within label svg {
          stroke: #27ae60;
        }

        .login-input {
          width: 100%;
          padding: 12px 14px;
          background: #f5f5f5;
          border: 1px solid #999;
          border-radius: 8px;
          color: #333;
          font-size: 14px;
          font-weight: 500;
          outline: none;
          transition: all 0.2s ease;
        }

        .dark-mode .login-input {
          background: #1a1a1a;
          border-color: #555;
          color: #ffffff;
        }

        .login-input::placeholder {
          color: #bbb;
        }

        .login-input:focus {
          background: #ffffff;
          border-color: #1e7e34;
          box-shadow: 0 0 0 3px rgba(30, 126, 52, 0.1);
        }

        .dark-mode .login-input:focus {
          background: #1a1a1a;
          border-color: #229954;
          box-shadow: 0 0 0 3px rgba(34, 153, 84, 0.15);
        }

        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .password-input-wrapper .login-input {
          width: 100%;
          padding-right: 45px;
        }

        .btn-toggle-password {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
          transition: all 0.2s ease;
          border-radius: 4px;
        }

        .btn-toggle-password:hover {
          color: #2ecc71;
          background: rgba(46, 204, 113, 0.08);
        }

        .dark-mode .btn-toggle-password {
          color: #888;
        }

        .dark-mode .btn-toggle-password:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }

        .btn-toggle-password:active {
          background: rgba(46, 204, 113, 0.15);
        }

        .login-alert {
          padding: 14px 18px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          font-weight: 600;
          animation: alertSlide 0.3s ease-out;
        }

        @keyframes alertSlide {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-alert-error {
          background: rgba(231, 76, 60, 0.15);
          color: #e74c3c;
          border: 1px solid rgba(231, 76, 60, 0.3);
        }

        .dark-mode .login-alert-error {
          background: rgba(231, 76, 60, 0.2);
          color: #ff6b6b;
          border-color: rgba(231, 76, 60, 0.4);
        }

        .login-alert-success {
          background: rgba(46, 204, 113, 0.15);
          color: var(--primary-light);
          border: 1px solid rgba(46, 204, 113, 0.3);
        }

        .dark-mode .login-alert-success {
          background: rgba(46, 204, 113, 0.2);
          color: #2ecc71;
          border-color: rgba(46, 204, 113, 0.4);
        }

        .btn-login {
          width: 100%;
          padding: 12px;
          background: #1e7e34;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          margin-top: 24px;
          box-shadow: 0 2px 8px rgba(30, 126, 52, 0.3);
        }

        .btn-login:disabled {
          opacity: 0.8;
          cursor: not-allowed;
        }

        .btn-login::before {
          display: none;
        }

        .btn-login:hover::before {
          display: none;
        }

        .btn-login:hover {
          background: #155d27;
          box-shadow: 0 4px 12px rgba(30, 126, 52, 0.4);
        }

        .btn-login:active {
          transform: scale(0.98);
        }

        .btn-forgot-password {
          background: none;
          border: none;
          color: #1e7e34;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-align: center;
          padding: 12px;
          transition: all 0.3s ease;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .btn-forgot-password:hover {
          color: #155d27;
          text-decoration-thickness: 2px;
        }

        .dark-mode .btn-forgot-password {
          color: #2ecc71;
        }

        .dark-mode .btn-forgot-password:hover {
          color: #52ffa3;
        }

        .forgot-password-header {
          margin-bottom: 32px;
        }

        .forgot-password-header h2 {
          font-size: 26px;
          color: #2ecc71;
          margin-bottom: 8px;
          font-weight: 700;
        }

        .btn-back-forgot {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: #2ecc71;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          transition: all 0.3s ease;
          margin-bottom: 16px;
        }

        .btn-back-forgot:hover {
          background: rgba(46, 204, 113, 0.1);
          color: #27ae60;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-footer {
          margin-top: 20px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.3);
          border-top: 1px solid rgba(203, 213, 225, 0.4);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .dark-mode .login-footer {
          background: rgba(26, 26, 26, 0.3);
          border-top: 1px solid rgba(61, 61, 61, 0.4);
        }

        .login-footer-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #64748b;
        }

        .footer-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .dark-mode .login-footer-content {
          color: #94a3b8;
        }

        .footer-security,
        .footer-author,
        .footer-system {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .footer-system strong {
          color: #1e7145;
          font-weight: 900;
          letter-spacing: 0.5px;
          font-size: 14px;
        }

        .dark-mode .footer-system strong {
          color: #1e7145;
        }

        .footer-security svg {
          color: #1e7145;
          opacity: 0.8;
        }

        .footer-divider {
          color: #cbd5e1;
          font-weight: bold;
        }

        .dark-mode .footer-divider {
          color: #475569;
        }

        .footer-author strong {
          color: #1e7145;
          font-weight: 700;
        }

        @media (max-width: 768px) {
          .footer-row {
            flex-direction: column;
            gap: 6px;
            text-align: center;
          }
          
          .footer-divider {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .login-box {
            max-width: 90%;
            padding: 30px 30px;
          }

          .login-title {
            font-size: 28px;
          }

          .login-input {
            padding: 11px 13px;
            font-size: 13px;
          }

          .btn-login {
            padding: 11px;
            font-size: 13px;
            margin-top: 20px;
          }
        }
      `}</style>
    </div>
  )
}
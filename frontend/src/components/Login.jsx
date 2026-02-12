import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function Login({ onLogin, primaryColor, darkMode }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

    try {
      const response = await axios.post(`${API}/login`, {
        username,
        password
      })

      if (response.status === 200) {
        setSuccess('Login realizado com sucesso! ✓')
        setTimeout(() => {
          onLogin()
        }, 500)
      }
    } catch (err) {
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
    if (darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }, [darkMode])

  return (
      <div className={`login-container ${darkMode ? 'dark-mode' : ''}`}>
      {/* Background decoration */}
      <div className="login-background">
        <div className="login-blob login-blob-1"></div>
        <div className="login-blob login-blob-2"></div>
      </div>

      <div className="login-box">
        {/* Logo/Header */}
        <div className="login-header">
          <img className="login-logo" src="/login-logo.svg" alt="SV" />
          <p>Sistema de Gestão de Vendas</p>
        </div>

        {/* Login Form */}
        {resetToken ? (
          <form onSubmit={handleResetPassword} className="login-form">
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
                placeholder="Intercap Pneus"
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
              <div className="password-input">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
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

            <button type="submit" className="btn-login">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Entrar no Sistema
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
          <p>Sistema de Gestão de Vendas • v1.0</p>
          <p className="login-footer-secondary">Intercap Pneus © 2026</p>
        </div>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f6b3a 0%, #0b4f2a 50%, #073a1f 100%);
          padding: 20px;
          position: relative;
          overflow: hidden;
          --primary-color: #16a34a;
        }

        .login-container.dark-mode {
          background: linear-gradient(135deg, #0a1117 0%, #0d1218 50%, #010409 100%);
        }

        .login-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
          overflow: hidden;
        }

        .login-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
        }

        .login-blob-1 {
          width: 500px;
          height: 500px;
          background: rgba(255, 255, 255, 0.3);
          top: -200px;
          right: -100px;
        }

        .login-blob-2 {
          width: 400px;
          height: 400px;
          background: rgba(19, 157, 88, 0.2);
          bottom: -150px;
          left: -50px;
        }

        .login-box {
          background: white;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
          width: 100%;
          max-width: 450px;
          padding: 48px 40px;
          animation: slideUp 0.5s ease-out;
          position: relative;
          z-index: 10;
          backdrop-filter: blur(10px);
        }

        .dark-mode .login-box {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
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
          margin-bottom: 36px;
        }

        .login-logo {
          display: block;
          height: 56px;
          width: auto;
          margin: 0 auto 12px;
        }

        .login-header h1 {
          margin: 12px 0 8px 0;
          font-size: 32px;
          font-weight: 800;
          color: #0a3d62;
          letter-spacing: -0.5px;
        }

        .dark-mode .login-header h1 {
          color: #ffffff;
        }

        .login-header p {
          margin: 0;
          font-size: 15px;
          color: #666;
          font-weight: 500;
        }

        .dark-mode .login-header p {
          color: #aaa;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 14px;
          color: #0a3d62;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .dark-mode .form-group label {
          color: #e0e0e0;
        }

        .form-group label svg {
          color: var(--primary-color);
          flex-shrink: 0;
        }

        .login-input {
          padding: 14px 18px;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          font-size: 16px;
          transition: all 0.3s;
          background: white;
          color: #1a1a1a;
          font-weight: 500;
        }

        .dark-mode .login-input {
          background: #0a1217;
          border-color: #3a3a3a;
          color: #e0e0e0;
        }

        .login-input::placeholder {
          color: #999;
        }

        .login-input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 4px rgba(22, 126, 219, 0.15);
          background: #f8f9ff;
        }

        .dark-mode .login-input:focus {
          background: #0f1419;
          box-shadow: 0 0 0 4px rgba(22, 126, 219, 0.25);
        }

        .password-input {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-input .login-input {
          padding-right: 48px;
        }

        .btn-toggle-password {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          cursor: pointer;
          color: #999;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          border-radius: 6px;
        }

        .btn-toggle-password:hover {
          color: var(--primary-color);
          background: rgba(22, 126, 219, 0.1);
        }

        .dark-mode .btn-toggle-password:hover {
          background: rgba(22, 126, 219, 0.2);
        }

        .login-alert {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-alert-error {
          background: #fff5f5;
          border: 2px solid #fc8181;
          color: #c53030;
        }

        .dark-mode .login-alert-error {
          background: #4a1a1a;
          border-color: #7a3333;
          color: #ff8888;
        }

        .login-alert-error svg {
          color: #c53030;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .dark-mode .login-alert-error svg {
          color: #ff8888;
        }

        .login-alert-success {
          background: #f0fdf4;
          border: 2px solid #86efac;
          color: #166534;
        }

        .dark-mode .login-alert-success {
          background: #1a3a1a;
          border-color: #4a7c4e;
          color: #86efac;
        }

        .login-alert-success svg {
          color: #166534;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .dark-mode .login-alert-success svg {
          color: #86efac;
        }

        .btn-login {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px 24px;
          background: linear-gradient(135deg, var(--primary-color) 0%, #0a5ba6 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 15px rgba(22, 126, 219, 0.3);
          position: relative;
          overflow: hidden;
        }

        .btn-login:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(22, 126, 219, 0.4);
        }

        .btn-login:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-login:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-login svg {
          width: 20px;
          height: 20px;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .btn-forgot-password {
          background: none;
          border: none;
          color: var(--primary-color);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          padding: 8px 0;
          text-align: center;
        }

        .btn-forgot-password:hover {
          color: #0a5ba6;
          text-decoration: underline;
        }

        .dark-mode .btn-forgot-password {
          color: #5eb3ff;
        }

        .dark-mode .btn-forgot-password:hover {
          color: #7ec9ff;
        }

        .forgot-password-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          position: relative;
        }

        .btn-back-forgot {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--primary-color);
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .btn-back-forgot:hover {
          background: rgba(22, 126, 219, 0.1);
          transform: translateX(-2px);
        }

        .dark-mode .btn-back-forgot:hover {
          background: rgba(22, 126, 219, 0.2);
        }

        .forgot-password-header h2 {
          margin: 0;
          font-size: 24px;
          color: #0a3d62;
          flex: 1;
          text-align: center;
        }

        .dark-mode .forgot-password-header h2 {
          color: #ffffff;
        }

        .forgot-password-description {
          text-align: center;
          font-size: 14px;
          color: #666;
          margin: 0 0 24px 0;
          line-height: 1.6;
        }

        .dark-mode .forgot-password-description {
          color: #aaa;
        }

        .login-footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
        }

        .dark-mode .login-footer {
          border-top-color: #3a3a3a;
        }

        .login-footer p {
          margin: 6px 0;
          font-size: 13px;
          color: #999;
        }

        .login-footer-secondary {
          font-size: 12px;
          color: #ccc;
        }

        .dark-mode .login-footer-secondary {
          color: #777;
        }

        @media (max-width: 480px) {
          .login-box {
            padding: 32px 24px;
          }

          .login-header h1 {
            font-size: 28px;
          }

          .login-logo {
            height: 48px;
            width: auto;
          }

          .btn-login {
            padding: 14px 20px;
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  )
}

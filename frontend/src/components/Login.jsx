import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function Login({ onLogin, primaryColor, darkMode }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
        {/* Modern Header with gradient text */}
        <div className="login-header">
          <h1 className="login-title">SISTEMA DE VENDAS</h1>
          <div className="login-subtitle">Acesse sua conta</div>
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
              <input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                required
                className="login-input"
              />
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
          <p>Sistema e vendas 2026</p>
        </div>
      </div>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .login-container {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a1a0f;
          position: relative;
          overflow: hidden;
          --primary-color: #2ecc71;
          --primary-light: #52ffa3;
          --primary-dark: #27ae60;
        }

        /* Van Gogh Starry Night inspired background */
        .starry-background {
          position: absolute;
          top: -10%;
          left: -10%;
          width: 120%;
          height: 120%;
          background: 
            radial-gradient(circle at 20% 30%, rgba(180, 255, 100, 0.4) 0%, transparent 8%),
            radial-gradient(circle at 80% 20%, rgba(150, 255, 120, 0.35) 0%, transparent 10%),
            radial-gradient(circle at 60% 60%, rgba(200, 255, 80, 0.3) 0%, transparent 12%),
            radial-gradient(circle at 30% 80%, rgba(160, 255, 110, 0.4) 0%, transparent 9%),
            radial-gradient(circle at 85% 75%, rgba(170, 255, 90, 0.35) 0%, transparent 11%),
            radial-gradient(circle at 15% 50%, rgba(190, 255, 100, 0.3) 0%, transparent 7%),
            linear-gradient(135deg, #0d3b1a 0%, #1a5c2e 30%, #0f4d23 60%, #08341a 100%);
          animation: starryMove 60s ease-in-out infinite;
          filter: blur(1px);
        }

        @keyframes starryMove {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          25% { transform: translate(-3%, 2%) rotate(1deg) scale(1.05); }
          50% { transform: translate(2%, -3%) rotate(-1deg) scale(1.08); }
          75% { transform: translate(-2%, 3%) rotate(0.5deg) scale(1.03); }
        }

        /* Dark overlay */
        .dark-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.65);
          z-index: 1;
        }

        /* Swirling effects */
        .swirl-container {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 2;
          overflow: hidden;
        }

        .swirl {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(180, 255, 120, 0.15) 0%, transparent 70%);
          filter: blur(40px);
        }

        .swirl-1 {
          width: 300px;
          height: 300px;
          top: 15%;
          left: 20%;
          animation: swirlRotate1 25s ease-in-out infinite;
        }

        .swirl-2 {
          width: 250px;
          height: 250px;
          top: 20%;
          right: 15%;
          animation: swirlRotate2 30s ease-in-out infinite reverse;
        }

        .swirl-3 {
          width: 350px;
          height: 350px;
          bottom: 20%;
          left: 10%;
          animation: swirlRotate1 35s ease-in-out infinite;
        }

        .swirl-4 {
          width: 200px;
          height: 200px;
          bottom: 15%;
          right: 20%;
          animation: swirlRotate2 28s ease-in-out infinite;
        }

        .swirl-5 {
          width: 280px;
          height: 280px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: swirlRotate1 32s ease-in-out infinite reverse;
        }

        .swirl-6 {
          width: 180px;
          height: 180px;
          top: 10%;
          left: 50%;
          animation: swirlRotate2 22s ease-in-out infinite;
        }

        @keyframes swirlRotate1 {
          0%, 100% { transform: rotate(0deg) scale(1); opacity: 0.3; }
          25% { transform: rotate(90deg) scale(1.2); opacity: 0.5; }
          50% { transform: rotate(180deg) scale(1.1); opacity: 0.4; }
          75% { transform: rotate(270deg) scale(1.15); opacity: 0.45; }
        }

        @keyframes swirlRotate2 {
          0%, 100% { transform: rotate(360deg) scale(1); opacity: 0.35; }
          33% { transform: rotate(240deg) scale(1.15); opacity: 0.5; }
          66% { transform: rotate(120deg) scale(1.08); opacity: 0.42; }
        }

        .login-box {
          position: relative;
          z-index: 100;
          width: 100%;
          max-width: 480px;
          padding: 60px 50px;
          background: rgba(15, 20, 28, 0.9);
          backdrop-filter: blur(25px);
          border: 1px solid rgba(46, 204, 113, 0.3);
          border-radius: 24px;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.7),
            0 0 80px rgba(46, 204, 113, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          animation: boxEntry 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes boxEntry {
          0% { opacity: 0; transform: translateY(30px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .login-header {
          text-align: center;
          margin-bottom: 48px;
        }

        .login-title {
          font-size: 42px;
          font-weight: 900;
          letter-spacing: 2px;
          background: linear-gradient(135deg, #52ffa3 0%, #2ecc71 50%, #1abc9c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 12px;
          animation: titleGlow 3s ease-in-out infinite;
          text-shadow: 0 0 40px rgba(46, 204, 113, 0.3);
        }

        @keyframes titleGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }

        .login-subtitle {
          font-size: 14px;
          color: rgba(46, 204, 113, 0.8);
          font-weight: 500;
          letter-spacing: 3px;
          text-transform: uppercase;
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
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          box-shadow: 0 8px 32px 0 rgba(14, 194, 88, 0.2), 0 0 0 1px rgba(14, 194, 88, 0.1);
          width: 100%;
          max-width: 500px;
          padding: 60px 50px;
          animation: slideUp 0.6s ease-out, glow-pulse 4s ease-in-out infinite;
          position: relative;
          z-index: 10;
          border: 1px solid rgba(14, 194, 88, 0.1);
        }

        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 8px 32px 0 rgba(14, 194, 88, 0.2), 0 0 0 1px rgba(14, 194, 88, 0.1); }
          50% { box-shadow: 0 8px 40px 0 rgba(14, 194, 88, 0.35), 0 0 0 1px rgba(14, 194, 88, 0.2); }
        }

        .dark-mode .login-box {
          background: rgba(26, 26, 46, 0.95);
          box-shadow: 0 8px 32px 0 rgba(14, 194, 88, 0.15), 0 0 0 1px rgba(14, 194, 88, 0.2);
          border: 1px solid rgba(14, 194, 88, 0.15);
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
          margin-bottom: 48px;
          position: relative;
        }

        .login-logo {
          display: block;
          height: 160px;
          width: auto;
          max-width: 360px;
          margin: 0 auto;
          filter: drop-shadow(0 6px 20px rgba(14, 194, 88, 0.3));
          animation: fadeInScale 0.8s ease-out, breathing 6s ease-in-out infinite;
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
          font-size: 32px;
          font-weight: 800;
          color: #0ec258;
          letter-spacing: -0.5px;
        }

        .dark-mode .login-header h1 {
          color: #ffffff;
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

        .form-group label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          font-size: 13px;
          color: var(--primary-color);
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.3s ease;
        }

        .form-group label svg {
          width: 18px;
          height: 18px;
          stroke: var(--primary-color);
          transition: all 0.3s ease;
        }

        .form-group:focus-within label {
          color: var(--primary-light);
        }

        .form-group:focus-within label svg {
          stroke: var(--primary-light);
          transform: scale(1.1);
        }

        .login-input {
          width: 100%;
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(46, 204, 113, 0.2);
          border-radius: 12px;
          color: #ffffff;
          font-size: 15px;
          font-weight: 500;
          outline: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .login-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .login-input:focus {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--primary-light);
          box-shadow: 0 0 0 4px rgba(46, 204, 113, 0.1), 0 0 20px rgba(46, 204, 113, 0.2);
          transform: translateY(-2px);
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

        .login-alert-success {
          background: rgba(46, 204, 113, 0.15);
          color: var(--primary-light);
          border: 1px solid rgba(46, 204, 113, 0.3);
        }

        .btn-login {
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-top: 12px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
        }

        .btn-login::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .btn-login:hover::before {
          left: 100%;
        }

        .btn-login:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(46, 204, 113, 0.4);
        }

        .btn-login:active {
          transform: translateY(0);
        }

        .btn-forgot-password {
          background: none;
          border: none;
          color: var(--primary-color);
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
          color: var(--primary-light);
          text-decoration-thickness: 2px;
        }

        .forgot-password-header {
          margin-bottom: 32px;
        }

        .forgot-password-header h2 {
          font-size: 26px;
          color: var(--primary-light);
          margin-bottom: 8px;
          font-weight: 700;
        }

        .btn-back-forgot {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: var(--primary-color);
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
          color: var(--primary-light);
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
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: rgba(46, 204, 113, 0.5);
          font-weight: 500;
          letter-spacing: 1px;
        }

        @media (max-width: 480px) {
          .login-box {
            padding: 40px 30px;
            margin: 20px;
            border-radius: 20px;
          }

          .login-title {
            font-size: 32px;
          }

          .login-subtitle {
            font-size: 12px;
          }

          .login-input {
            padding: 14px 16px;
            font-size: 14px;
          }

          .btn-login {
            padding: 16px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  )
}
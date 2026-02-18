import React, { useState } from 'react'

export default function LoginManager({
  isOpen,
  onClose,
  adminCredentials,
  onCreateUser,
  onDeleteUser,
  onRefresh,
  adminLoading,
  darkMode,
}) {
  const [showPassword, setShowPassword] = useState({})
  const [newUserForm, setNewUserForm] = useState({
    displayName: '',
    username: '',
    password: '',
  })

  if (!isOpen) return null

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!newUserForm.displayName || !newUserForm.username || !newUserForm.password) {
      alert('Preencha nome, login e senha')
      return
    }
    await onCreateUser(newUserForm)
    setNewUserForm({ displayName: '', username: '', password: '' })
  }

  const togglePasswordVisibility = (credId) => {
    setShowPassword((prev) => ({
      ...prev,
      [credId]: !prev[credId],
    }))
  }

  const handleDelete = (credId) => {
    if (window.confirm('Tem certeza que quer deletar esta conta?')) {
      onDeleteUser(credId)
    }
  }

  return (
    <div className="login-manager-overlay">
      <div className={`login-manager-modal ${darkMode ? 'dark-mode' : ''}`}>
        <div className="login-manager-header">
          <h2>Gerenciar Contas</h2>
          <button className="login-manager-close" onClick={onClose} title="Fechar">
            ✕
          </button>
        </div>

        <div className="login-manager-content">
          {/* Contas Ativas */}
          <div className="login-manager-section">
            <h3>Contas Ativas</h3>
            <div className="login-manager-list">
              {adminCredentials && adminCredentials.length > 0 ? (
                adminCredentials.map((cred) => (
                  <div key={cred.id} className="login-manager-card">
                    <div className="login-manager-card-header">
                      <span className="login-manager-name">{cred.displayName}</span>
                      <div className="login-manager-actions">
                        <button
                          className="btn-eye-sm"
                          onClick={() => togglePasswordVisibility(cred.id)}
                          title="Mostrar/Ocultar senha"
                        >
                          {showPassword[cred.id] ? '🙈' : '👁️'}
                        </button>
                        <button
                          className="btn-delete-sm"
                          onClick={() => handleDelete(cred.id)}
                          disabled={adminLoading}
                          title="Deletar conta"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="login-manager-details">
                      <div className="login-manager-row">
                        <label>Login:</label>
                        <span className="login-manager-value">{cred.username}</span>
                      </div>
                      <div className="login-manager-row">
                        <label>Senha:</label>
                        <span className="login-manager-value">
                          {showPassword[cred.id]
                            ? cred.password || 'Não disponível'
                            : '••••••••••'}
                        </span>
                      </div>
                      <div className="login-manager-row">
                        <label>Função:</label>
                        <span className="login-manager-value">
                          {cred.role === 'admin' ? 'Administrador' : 'Vendedor'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="login-manager-empty">Nenhuma conta disponível.</p>
              )}
            </div>
          </div>

          {/* Criar Nova Conta */}
          <div className="login-manager-section">
            <h3>Criar Nova Conta</h3>
            <form className="login-manager-form" onSubmit={handleCreateSubmit}>
              <div className="login-manager-form-group">
                <label>Nome de referência</label>
                <input
                  type="text"
                  value={newUserForm.displayName}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  placeholder="Ex: João Silva"
                  required
                />
              </div>

              <div className="login-manager-form-group">
                <label>Login</label>
                <input
                  type="text"
                  value={newUserForm.username}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="Ex: joao.silva"
                  required
                />
              </div>

              <div className="login-manager-form-group">
                <label>Senha</label>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>

              <button
                type="submit"
                className="login-manager-btn-create"
                disabled={adminLoading}
              >
                {adminLoading ? 'Criando...' : 'Criar Conta'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

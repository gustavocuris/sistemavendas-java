import { useState } from 'react'

const MONTH_LABELS = {
  '01': 'JAN',
  '02': 'FEV',
  '03': 'MAR',
  '04': 'ABR',
  '05': 'MAI',
  '06': 'JUN',
  '07': 'JUL',
  '08': 'AGO',
  '09': 'SET',
  '10': 'OUT',
  '11': 'NOV',
  '12': 'DEZ',
}

const formatBRL = (value) => Number(value || 0).toLocaleString('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export default function LoginManager({
  isOpen,
  onClose,
  adminCredentials,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onViewUserSales,
  onViewUserCommission,
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
  
  // Modal de edição
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({
    displayName: '',
    username: '',
    password: '',
  })

  // Modal de confirmação de deleção
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    id: null,
    displayName: '',
    confirmText: '',
  })

  const [commissionModal, setCommissionModal] = useState({
    open: false,
    displayName: '',
    credential: null,
    loading: false,
    error: '',
    rates: { new: 5, recap: 8, recapping: 10, service: 0 },
    byYearMonth: {},
    summary: { new: 0, recap: 0, recapping: 0, service: 0, total: 0 },
    selectedYear: '',
    selectedMonth: '',
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

  const openEditModal = (cred) => {
    setEditingId(cred.id)
    setEditForm({
      displayName: cred.displayName,
      username: cred.username,
      password: cred.password || '',
    })
  }

  const closeEditModal = () => {
    setEditingId(null)
    setEditForm({ displayName: '', username: '', password: '' })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editForm.displayName || !editForm.username) {
      alert('Preencha nome e login')
      return
    }
    await onUpdateUser(editingId, editForm)
    closeEditModal()
  }

  const openDeleteConfirm = (cred) => {
    setDeleteConfirm({
      open: true,
      id: cred.id,
      displayName: cred.displayName,
      confirmText: '',
    })
  }

  const closeDeleteConfirm = () => {
    setDeleteConfirm({
      open: false,
      id: null,
      displayName: '',
      confirmText: '',
    })
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.confirmText !== 'EXCLUIR CONTA') {
      alert('Digite "EXCLUIR CONTA" para confirmar a exclusão')
      return
    }
    await onDeleteUser(deleteConfirm.id)
    closeDeleteConfirm()
  }

  const openCommissionModal = async (cred) => {
    setCommissionModal({
      open: true,
      displayName: cred.displayName,
      credential: cred,
      loading: true,
      error: '',
      rates: { new: 5, recap: 8, recapping: 10, service: 0 },
      byYearMonth: {},
      summary: { new: 0, recap: 0, recapping: 0, service: 0, total: 0 },
      selectedYear: '',
      selectedMonth: '',
    })

    try {
      if (typeof onViewUserCommission !== 'function') {
        throw new Error('Falha ao abrir comissão: função de consulta indisponível.')
      }
      const payload = await onViewUserCommission(cred)
      const years = Object.keys(payload?.byYearMonth || {}).sort((a, b) => Number(b) - Number(a))
      const selectedYear = years[0] || ''
      const months = selectedYear
        ? Object.keys(payload?.byYearMonth?.[selectedYear] || {}).sort((a, b) => Number(b) - Number(a))
        : []
      const selectedMonth = months[0] || ''

      let selectedSummary = payload?.summary || { new: 0, recap: 0, recapping: 0, service: 0, total: 0 }
      if (selectedYear && selectedMonth) {
        selectedSummary = payload?.byYearMonth?.[selectedYear]?.[selectedMonth] || selectedSummary
      }

      if (selectedYear && selectedMonth) {
        try {
          const filteredPayload = await onViewUserCommission(cred, {
            year: Number(selectedYear),
            month: Number(selectedMonth)
          })
          selectedSummary = filteredPayload?.summary || selectedSummary
        } catch {
          // Keep local summary fallback if filtered request fails.
        }
      }

      setCommissionModal((prev) => ({
        ...prev,
        loading: false,
        error: '',
        rates: payload?.rates || { new: 5, recap: 8, recapping: 10, service: 0 },
        byYearMonth: payload?.byYearMonth || {},
        summary: selectedSummary,
        selectedYear,
        selectedMonth,
      }))
    } catch (error) {
      console.error('Erro ao abrir comissao:', error)
      setCommissionModal((prev) => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar comissão desta conta. Tente novamente.',
        rates: prev.rates || { new: 5, recap: 8, recapping: 10, service: 0 },
        byYearMonth: prev.byYearMonth || {},
        summary: prev.summary || { new: 0, recap: 0, recapping: 0, service: 0, total: 0 },
        selectedYear: prev.selectedYear || '',
        selectedMonth: prev.selectedMonth || '',
      }))
    }
  }

  const reloadCommissionByFilter = async ({ year = null, month = null, selectedYear = '', selectedMonth = '', credentialOverride = null }) => {
    setCommissionModal((prev) => ({ ...prev, loading: true, error: '' }))
    try {
      if (typeof onViewUserCommission !== 'function') {
        throw new Error('Falha ao atualizar comissão: função de consulta indisponível.')
      }
      const credentialForRequest = credentialOverride || commissionModal.credential
      const payload = await onViewUserCommission(credentialForRequest, { year, month })
      setCommissionModal((prev) => ({
        ...prev,
        loading: false,
        error: '',
        rates: payload?.rates || prev.rates,
        summary: payload?.summary || { new: 0, recap: 0, recapping: 0, service: 0, total: 0 },
        selectedYear,
        selectedMonth,
      }))
    } catch (error) {
      console.error('Erro ao filtrar comissao:', error)
      setCommissionModal((prev) => ({
        ...prev,
        loading: false,
        error: 'Erro ao atualizar comissão desta conta. Tente novamente.',
      }))
    }
  }

  const closeCommissionModal = () => {
    setCommissionModal({
      open: false,
      displayName: '',
      credential: null,
      loading: false,
      error: '',
      rates: { new: 5, recap: 8, recapping: 10, service: 0 },
      byYearMonth: {},
      summary: { new: 0, recap: 0, recapping: 0, service: 0, total: 0 },
      selectedYear: '',
      selectedMonth: '',
    })
  }

  const handleViewSalesFromCommission = async () => {
    const credential = commissionModal.credential
    if (!credential || typeof onViewUserSales !== 'function') return

    closeCommissionModal()
    await onViewUserSales(credential.id, credential.displayName)
  }

  const commissionYears = Object.keys(commissionModal.byYearMonth || {}).sort((a, b) => Number(b) - Number(a))
  const commissionMonths = commissionModal.selectedYear
    ? Object.keys(commissionModal.byYearMonth?.[commissionModal.selectedYear] || {}).sort((a, b) => Number(b) - Number(a))
    : []

  const commissionTotals = commissionModal.summary || { new: 0, recap: 0, recapping: 0, service: 0, total: 0 }

  const hasCommissionData = commissionYears.length > 0

  return (
    <div className="login-manager-overlay">
      <div className={`login-manager-modal ${darkMode ? 'dark-mode' : ''}`}>
        <div className="login-manager-header">
          <h2>Gerenciar Contas</h2>
          <button className="login-manager-close" onClick={onClose} title="Fechar">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </svg>
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
                          {showPassword[cred.id] ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                              <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          )}
                        </button>
                        <button
                          className="btn-edit-sm"
                          onClick={() => openEditModal(cred)}
                          disabled={adminLoading}
                          title="Editar conta"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 2 21l1.5-5L16.5 3.5z"></path>
                          </svg>
                        </button>
                        {cred.role !== 'admin' && (
                          <button
                            className="btn-table-sm"
                            onClick={() => onViewUserSales(cred.id, cred.displayName)}
                            disabled={adminLoading}
                            title="Visualizar vendas"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="20" x2="18" y2="10"></line>
                              <line x1="12" y1="20" x2="12" y2="4"></line>
                              <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                          </button>
                        )}
                        {cred.role !== 'admin' && (
                          <button
                            className="btn-commission-sm"
                            onClick={() => openCommissionModal(cred)}
                            disabled={adminLoading}
                            title="Visualizar comissão"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="19" y1="5" x2="5" y2="19"></line>
                              <circle cx="7.5" cy="7.5" r="2.5"></circle>
                              <circle cx="16.5" cy="16.5" r="2.5"></circle>
                            </svg>
                          </button>
                        )}
                        {cred.role !== 'admin' && (
                          <button
                            className="btn-delete-sm"
                            onClick={() => openDeleteConfirm(cred)}
                            disabled={adminLoading}
                            title="Deletar conta"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        )}
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
                            : '**********'}
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

      {/* Modal de Edição */}
      {editingId && (
        <div className="login-manager-overlay">
          <div className={`login-manager-modal-edit ${darkMode ? 'dark-mode' : ''}`}>
            <div className="login-manager-header">
              <h2>Editar Conta</h2>
              <button className="login-manager-close" onClick={closeEditModal} title="Fechar">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              </button>
            </div>

            <form className="login-manager-form" onSubmit={handleEditSubmit}>
              <div className="login-manager-form-group">
                <label>Nome de referência</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) =>
                    setEditForm((prev) => ({
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
                  value={editForm.username}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="Ex: joao.silva"
                  required
                />
              </div>

              <div className="login-manager-form-group">
                <label>Senha (deixe vazio para não alterar)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Nova senha"
                />
              </div>

              <div className="login-manager-form-actions">
                <button
                  type="submit"
                  className="login-manager-btn-save"
                  disabled={adminLoading}
                >
                  {adminLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button
                  type="button"
                  className="login-manager-btn-cancel"
                  onClick={closeEditModal}
                  disabled={adminLoading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {commissionModal.open && (
        <div className="login-manager-overlay">
          <div className={`login-manager-modal-edit ${darkMode ? 'dark-mode' : ''}`}>
            <div className="login-manager-header">
              <h2>Comissão de {commissionModal.displayName}</h2>
              <button className="login-manager-close" onClick={closeCommissionModal} title="Fechar">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              </button>
            </div>

            <div className="login-manager-commission-grid">
              {commissionModal.loading ? (
                <p className="login-manager-empty">Carregando comissão...</p>
              ) : commissionModal.error ? (
                <p className="login-manager-empty">{commissionModal.error}</p>
              ) : (
                <>
                  <div className="login-manager-commission-filters">
                    <select
                      value={commissionModal.selectedYear}
                      onChange={async (e) => {
                        const nextYear = e.target.value
                        const nextMonths = Object.keys(commissionModal.byYearMonth?.[nextYear] || {}).sort((a, b) => Number(b) - Number(a))
                        const nextMonth = nextMonths[0] || ''
                        const yearValue = Number(nextYear)
                        const monthValue = Number(nextMonth)
                        await reloadCommissionByFilter({
                          year: Number.isInteger(yearValue) ? yearValue : null,
                          month: Number.isInteger(monthValue) ? monthValue : null,
                          selectedYear: nextYear,
                          selectedMonth: nextMonth,
                        })
                      }}
                    >
                      {commissionYears.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <select
                      value={commissionModal.selectedMonth}
                      onChange={async (e) => {
                        const nextMonth = e.target.value
                        const yearValue = Number(commissionModal.selectedYear)
                        const monthValue = Number(nextMonth)
                        await reloadCommissionByFilter({
                          year: Number.isInteger(yearValue) ? yearValue : null,
                          month: Number.isInteger(monthValue) ? monthValue : null,
                          selectedYear: commissionModal.selectedYear,
                          selectedMonth: nextMonth
                        })
                      }}
                      disabled={!hasCommissionData || !commissionModal.selectedYear}
                    >
                      {commissionMonths.map((month) => (
                        <option key={month} value={month}>{MONTH_LABELS[month] || month}</option>
                      ))}
                    </select>
                  </div>

                  <div className="login-manager-commission-item">
                    <span>PNEU NOVO ({commissionModal.rates.new}%)</span>
                    <strong>R$ {formatBRL(commissionTotals.new)}</strong>
                  </div>
                  <div className="login-manager-commission-item">
                    <span>PNEU RECAPADO ({commissionModal.rates.recap}%)</span>
                    <strong>R$ {formatBRL(commissionTotals.recap)}</strong>
                  </div>
                  <div className="login-manager-commission-item">
                    <span>RECAPAGEM ({commissionModal.rates.recapping}%)</span>
                    <strong>R$ {formatBRL(commissionTotals.recapping)}</strong>
                  </div>
                  <div className="login-manager-commission-item">
                    <span>SV BORRACHARIA ({commissionModal.rates.service}%)</span>
                    <strong>R$ {formatBRL(commissionTotals.service)}</strong>
                  </div>
                  <div className="login-manager-commission-item total">
                    <span>TOTAL GERAL</span>
                    <strong>R$ {formatBRL(commissionTotals.total)}</strong>
                    <button
                      type="button"
                      className="login-manager-commission-link"
                      onClick={handleViewSalesFromCommission}
                      disabled={commissionModal.loading || !commissionModal.credential}
                    >
                      VER VENDAS
                    </button>
                  </div>

                  {!hasCommissionData && (
                    <p className="login-manager-empty">Sem vendas registradas para este funcionario.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Deleção */}
      {deleteConfirm.open && (
        <div className="login-manager-overlay">
          <div className={`login-manager-modal-delete ${darkMode ? 'dark-mode' : ''}`}>
            <div className="login-manager-header">
              <h2>Excluir Conta</h2>
              <button className="login-manager-close" onClick={closeDeleteConfirm} title="Fechar">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              </button>
            </div>

            <div className="login-manager-delete-content">
              <p className="delete-warning">
                Tem certeza que quer deletar a conta <strong>{deleteConfirm.displayName}</strong>?
              </p>
              <p className="delete-instruction">
                Esta ação é irreversível. Digite <strong>"EXCLUIR CONTA"</strong> para confirmar:
              </p>

              <input
                type="text"
                value={deleteConfirm.confirmText}
                onChange={(e) =>
                  setDeleteConfirm((prev) => ({
                    ...prev,
                    confirmText: e.target.value,
                  }))
                }
                placeholder="Digite EXCLUIR CONTA"
                className="delete-confirm-input"
                autoFocus
              />

              <div className="login-manager-form-actions">
                <button
                  className="login-manager-btn-delete-confirm"
                  onClick={handleDeleteConfirm}
                  disabled={adminLoading || deleteConfirm.confirmText !== 'EXCLUIR CONTA'}
                >
                  {adminLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
                <button
                  className="login-manager-btn-cancel"
                  onClick={closeDeleteConfirm}
                  disabled={adminLoading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

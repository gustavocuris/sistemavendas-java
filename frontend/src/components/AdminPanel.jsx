import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API = `${import.meta.env.VITE_API_URL}/api`

const emptyCreate = {
  username: '',
  password: '',
  displayName: '',
  role: 'user'
}

const emptyEdit = {
  id: '',
  username: '',
  password: '',
  displayName: '',
  role: 'user'
}

const emptyCommissions = {
  new: 5,
  recap: 8,
  recapping: 10,
  service: 0
}

export default function AdminPanel({ isOpen, onClose, users, onUsersRefresh, selectedUserId, onSelectUser }) {
  const [activeTab, setActiveTab] = useState('users')
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [editForm, setEditForm] = useState(emptyEdit)
  const [commissionsForm, setCommissionsForm] = useState(emptyCommissions)
  const [searchFilters, setSearchFilters] = useState({ q: '', userId: '', month: '' })
  const [summaryFilters, setSummaryFilters] = useState({ monthFrom: '', monthTo: '', userId: '' })
  const [searchResults, setSearchResults] = useState([])
  const [summaryData, setSummaryData] = useState({ grandTotal: 0, users: [] })
  const [loading, setLoading] = useState(false)

  const usersMap = useMemo(() => new Map((users || []).map((user) => [user.id, user])), [users])
  const selectedUser = usersMap.get(selectedUserId)

  useEffect(() => {
    if (!selectedUser) return
    setEditForm({
      id: selectedUser.id,
      username: selectedUser.username,
      password: '',
      displayName: selectedUser.displayName || selectedUser.username,
      role: selectedUser.role || 'user'
    })
    loadUserCommissions(selectedUser.id)
  }, [selectedUserId, users])

  if (!isOpen) return null

  const loadUserCommissions = async (userId) => {
    if (!userId) return
    try {
      const response = await axios.get(`${API}/commissions?userId=${encodeURIComponent(userId)}`)
      setCommissionsForm({
        new: Number(response.data?.new ?? 5),
        recap: Number(response.data?.recap ?? 8),
        recapping: Number(response.data?.recapping ?? 10),
        service: Number(response.data?.service ?? 0)
      })
    } catch (error) {
      console.error('Erro ao carregar comissões do usuário:', error)
    }
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      await axios.post(`${API}/admin/users`, createForm)
      setCreateForm(emptyCreate)
      await onUsersRefresh()
      alert('Usuário criado com sucesso!')
    } catch (error) {
      alert(error.response?.data?.message || 'Erro ao criar usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveUser = async (event) => {
    event.preventDefault()
    if (!editForm.id) return

    setLoading(true)
    try {
      const payload = {
        username: editForm.username,
        displayName: editForm.displayName,
        role: editForm.role
      }
      if (editForm.password.trim()) {
        payload.password = editForm.password
      }

      await axios.put(`${API}/admin/users/${editForm.id}`, payload)
      await onUsersRefresh()
      setEditForm((prev) => ({ ...prev, password: '' }))
      alert('Usuário atualizado com sucesso!')
    } catch (error) {
      alert(error.response?.data?.message || 'Erro ao atualizar usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!userId) return
    if (!window.confirm('Deseja realmente remover esta conta?')) return

    setLoading(true)
    try {
      await axios.delete(`${API}/admin/users/${userId}`)
      await onUsersRefresh()
      alert('Usuário removido com sucesso!')
    } catch (error) {
      alert(error.response?.data?.message || 'Erro ao remover usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCommissions = async (event) => {
    event.preventDefault()
    if (!editForm.id) return

    setLoading(true)
    try {
      await axios.put(`${API}/admin/users/${editForm.id}`, {
        commissions: {
          new: Number(commissionsForm.new),
          recap: Number(commissionsForm.recap),
          recapping: Number(commissionsForm.recapping),
          service: Number(commissionsForm.service)
        }
      })
      alert('Comissões atualizadas com sucesso!')
    } catch (error) {
      alert(error.response?.data?.message || 'Erro ao salvar comissões')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSales = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchFilters.q) params.append('q', searchFilters.q)
      if (searchFilters.userId) params.append('userId', searchFilters.userId)
      if (searchFilters.month) params.append('month', searchFilters.month)

      const response = await axios.get(`${API}/admin/sales/search?${params.toString()}`)
      setSearchResults(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      alert(error.response?.data?.message || 'Erro ao buscar vendas')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSummary = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (summaryFilters.monthFrom) params.append('monthFrom', summaryFilters.monthFrom)
      if (summaryFilters.monthTo) params.append('monthTo', summaryFilters.monthTo)
      if (summaryFilters.userId) params.append('userId', summaryFilters.userId)

      const response = await axios.get(`${API}/admin/sales/summary?${params.toString()}`)
      setSummaryData(response.data || { grandTotal: 0, users: [] })
    } catch (error) {
      alert(error.response?.data?.message || 'Erro ao carregar resumo')
    } finally {
      setLoading(false)
    }
  }

  const chartData = (summaryData.users || []).map((item) => ({
    name: item.userName,
    total: Number(item.total || 0)
  }))

  return (
    <div className="admin-panel-overlay" onClick={onClose}>
      <div className="admin-panel" onClick={(event) => event.stopPropagation()}>
        <div className="admin-panel-header">
          <h2>Painel Administrativo</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="admin-tabs">
          <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Usuários</button>
          <button className={`admin-tab ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>Busca de Vendas</button>
          <button className={`admin-tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Gráfico Total</button>
        </div>

        {activeTab === 'users' && (
          <div className="admin-grid">
            <div className="admin-card">
              <h3>Criar Conta</h3>
              <form onSubmit={handleCreateUser} className="admin-form">
                <input value={createForm.displayName} onChange={(e) => setCreateForm((p) => ({ ...p, displayName: e.target.value }))} placeholder="Nome de referência" required />
                <input value={createForm.username} onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))} placeholder="Login" required />
                <input type="password" value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} placeholder="Senha" required />
                <select value={createForm.role} onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}>
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
                <button type="submit" disabled={loading}>Criar Usuário</button>
              </form>
            </div>

            <div className="admin-card">
              <h3>Contas Cadastradas</h3>
              <div className="admin-users-list">
                {(users || []).map((user) => (
                  <div key={user.id} className={`admin-user-item ${selectedUserId === user.id ? 'active' : ''}`}>
                    <button className="admin-user-main" onClick={() => {
                      onSelectUser(user.id)
                      setEditForm({
                        id: user.id,
                        username: user.username,
                        password: '',
                        displayName: user.displayName || user.username,
                        role: user.role || 'user'
                      })
                    }}>
                      <strong>{user.displayName}</strong>
                      <span>{user.username} • {user.role}</span>
                    </button>
                    <button className="btn-danger-inline" onClick={() => handleDeleteUser(user.id)} disabled={user.id === 'adm'}>Excluir</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card">
              <h3>Editar Conta Selecionada</h3>
              <form onSubmit={handleSaveUser} className="admin-form">
                <input value={editForm.displayName} onChange={(e) => setEditForm((p) => ({ ...p, displayName: e.target.value }))} placeholder="Nome de referência" required />
                <input value={editForm.username} onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))} placeholder="Login" required />
                <input type="password" value={editForm.password} onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))} placeholder="Nova senha (opcional)" />
                <select value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))} disabled={editForm.id === 'adm'}>
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
                <button type="submit" disabled={!editForm.id || loading}>Salvar Conta</button>
              </form>

              <h3 style={{ marginTop: 16 }}>Comissão do Usuário</h3>
              <form onSubmit={handleSaveCommissions} className="admin-form admin-commissions">
                <label>Novo (%)<input type="number" value={commissionsForm.new} onChange={(e) => setCommissionsForm((p) => ({ ...p, new: e.target.value }))} /></label>
                <label>Recap (%)<input type="number" value={commissionsForm.recap} onChange={(e) => setCommissionsForm((p) => ({ ...p, recap: e.target.value }))} /></label>
                <label>Recapping (%)<input type="number" value={commissionsForm.recapping} onChange={(e) => setCommissionsForm((p) => ({ ...p, recapping: e.target.value }))} /></label>
                <label>Serviço (%)<input type="number" value={commissionsForm.service} onChange={(e) => setCommissionsForm((p) => ({ ...p, service: e.target.value }))} /></label>
                <button type="submit" disabled={!editForm.id || loading}>Salvar Comissão</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="admin-card">
            <h3>Buscar vendas por nome, número ou produto</h3>
            <form onSubmit={handleSearchSales} className="admin-search-form">
              <input value={searchFilters.q} onChange={(e) => setSearchFilters((p) => ({ ...p, q: e.target.value }))} placeholder="Nome, telefone, produto ou ID" />
              <input type="month" value={searchFilters.month} onChange={(e) => setSearchFilters((p) => ({ ...p, month: e.target.value }))} />
              <select value={searchFilters.userId} onChange={(e) => setSearchFilters((p) => ({ ...p, userId: e.target.value }))}>
                <option value="">Todos usuários</option>
                {(users || []).map((user) => <option key={user.id} value={user.id}>{user.displayName}</option>)}
              </select>
              <button type="submit" disabled={loading}>Buscar</button>
            </form>

            <div className="admin-results-table-wrap">
              <table className="admin-results-table">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Mês</th>
                    <th>Cliente</th>
                    <th>Telefone</th>
                    <th>Produto</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((sale, index) => (
                    <tr key={`${sale.userId}-${sale.month}-${sale.id}-${index}`}>
                      <td>{sale.userName}</td>
                      <td>{sale.month}</td>
                      <td>{sale.client}</td>
                      <td>{sale.phone || '-'}</td>
                      <td>{sale.product}</td>
                      <td>R$ {Number(sale.total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="admin-card">
            <h3>Resumo total de vendas</h3>
            <form onSubmit={handleLoadSummary} className="admin-search-form">
              <input type="month" value={summaryFilters.monthFrom} onChange={(e) => setSummaryFilters((p) => ({ ...p, monthFrom: e.target.value }))} />
              <input type="month" value={summaryFilters.monthTo} onChange={(e) => setSummaryFilters((p) => ({ ...p, monthTo: e.target.value }))} />
              <select value={summaryFilters.userId} onChange={(e) => setSummaryFilters((p) => ({ ...p, userId: e.target.value }))}>
                <option value="">Todos usuários</option>
                {(users || []).map((user) => <option key={user.id} value={user.id}>{user.displayName}</option>)}
              </select>
              <button type="submit" disabled={loading}>Aplicar Filtros</button>
            </form>

            <p className="admin-total-label">Total Geral: <strong>R$ {Number(summaryData.grandTotal || 0).toFixed(2)}</strong></p>

            <div className="admin-chart-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" height={72} />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                  <Bar dataKey="total" fill="var(--primary-color)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import SaleForm from './components/SaleForm'
import SaleList from './components/SaleList'
import CommissionSummary from './components/CommissionSummary'
import ChartView from './components/ChartView'
import NotesPanel from './NotesPanel'
import Login from './components/Login'
import AdminPanel from './components/AdminPanel'

const API = `${import.meta.env.VITE_API_URL}/api`

const PRESET_COLORS = [
  { name: 'Verde', hex: '#1e7145', dark: '#0f4620', light: '#4ade80' },
  { name: 'Azul', hex: '#0d47a1', dark: '#051541', light: '#2196f3' },
  { name: 'Vermelho', hex: '#d32f2f', dark: '#7f1d1d', light: '#ef4444' },
  { name: 'Roxo', hex: '#6a1b9a', dark: '#360853', light: '#9c27b0' },
  { name: 'Rosa Pink', hex: '#ec4899', dark: '#be185d', light: '#f472b6' },
  { name: 'All Black', hex: '#1a1a1a', dark: '#0d0d0d', light: '#2d2d2d' }
]

const emptyNewUser = {
  displayName: '',
  username: '',
  password: ''
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('authenticated') === 'true')
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const isAdmin = currentUser?.role === 'admin'

  const [adminUsers, setAdminUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [adminSearch, setAdminSearch] = useState('')
  const [adminSales, setAdminSales] = useState([])
  const [adminSummary, setAdminSummary] = useState({ grandTotal: 0, users: [] })
  const [adminAnnual, setAdminAnnual] = useState({ year: new Date().getFullYear(), months: [] })
  const [adminCredentials, setAdminCredentials] = useState([])
  const [activeLoginId, setActiveLoginId] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [newUserForm, setNewUserForm] = useState(emptyNewUser)
  const [adminLoading, setAdminLoading] = useState(false)

  const [sales, setSales] = useState([])
  const [editing, setEditing] = useState(null)
  const [copiedSale, setCopiedSale] = useState(null)
  const [pastedSale, setPastedSale] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [commissions, setCommissions] = useState({ new: 5, recap: 8, recapping: 10, service: 0 })
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')
  const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem('primaryColor') || PRESET_COLORS[0].hex)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [availableMonths, setAvailableMonths] = useState([])
  const [monthsWithData, setMonthsWithData] = useState([])
  const [currentMonth, setCurrentMonth] = useState(() => {
    const saved = localStorage.getItem('currentMonth')
    if (saved) return saved
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [showMonthSelector, setShowMonthSelector] = useState(false)
  const [selectedYear, setSelectedYear] = useState(() => {
    const saved = localStorage.getItem('currentMonth')
    return saved ? parseInt(saved.split('-')[0]) : new Date().getFullYear()
  })
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('currentMonth')
    return saved ? parseInt(saved.split('-')[1]) : new Date().getMonth() + 1
  })
  const [showChart, setShowChart] = useState(false)
  const [chartRefresh, setChartRefresh] = useState(0)
  const [showNotes, setShowNotes] = useState(false)
  const [confirmState, setConfirmState] = useState({ open: false, message: '', onConfirm: null })

  const hexToRgbString = (hex) => {
    if (!hex) return '0, 0, 0'
    const raw = hex.replace('#', '')
    const full = raw.length === 3 ? raw.split('').map((c) => `${c}${c}`).join('') : raw
    const intValue = parseInt(full, 16)
    if (Number.isNaN(intValue)) return '0, 0, 0'
    const r = (intValue >> 16) & 255
    const g = (intValue >> 8) & 255
    const b = intValue & 255
    return `${r}, ${g}, ${b}`
  }

  const normalizeHex = (value) => (value || '').toLowerCase()
  const normalizeThemeName = (value) => (value || '').toLowerCase().replace(/\s+/g, '-')

  const applyColorTheme = (hex) => {
    const preset = PRESET_COLORS.find((c) => c.hex.toLowerCase() === normalizeHex(hex))
    const resolvedPreset = preset || PRESET_COLORS[0]
    const baseHex = resolvedPreset.hex
    const darkHex = resolvedPreset.dark || baseHex
    const lightHex = resolvedPreset.light || baseHex

    document.body.dataset.theme = normalizeThemeName(resolvedPreset.name)
    document.documentElement.style.setProperty('--primary-color', baseHex)
    document.documentElement.style.setProperty('--primary-dark', darkHex)
    document.documentElement.style.setProperty('--primary-light', lightHex)
    document.documentElement.style.setProperty('--primary-color-rgb', hexToRgbString(baseHex))
    document.documentElement.style.setProperty('--primary-dark-rgb', hexToRgbString(darkHex))
    document.documentElement.style.setProperty('--primary-light-rgb', hexToRgbString(lightHex))
  }

  const load = async () => {
    try {
      setIsLoading(true)
      const res = await axios.get(`${API}/sales?month=${currentMonth}`)
      setSales(res.data)
      if (res.data.length > 0) {
        setMonthsWithData((prev) => (prev.includes(currentMonth) ? prev : [...prev, currentMonth]))
      }
    } catch (err) {
      console.error('Erro ao carregar vendas:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMonths = async () => {
    const res = await axios.get(`${API}/months`)
    setAvailableMonths(res.data)
  }

  const loadCommissions = async () => {
    const res = await axios.get(`${API}/commissions`)
    setCommissions(res.data)
  }

  const loadAdminUsers = async () => {
    if (!isAdmin) return
    const res = await axios.get(`${API}/admin/users`)
    const users = Array.isArray(res.data) ? res.data : []
    setAdminUsers(users)

    if (!selectedUserId || !users.some((user) => user.id === selectedUserId)) {
      const defaultUser = users.find((user) => user.role !== 'admin') || users[0]
      setSelectedUserId(defaultUser?.id || '')
    }

    if (!activeLoginId || !users.some((user) => user.id === activeLoginId)) {
      const defaultLogin = users.find((user) => user.username === 'Intercap Pneus') || users[0]
      setActiveLoginId(defaultLogin?.id || '')
    }
  }

  const loadAdminSales = async (query = '') => {
    if (!isAdmin) return
    const params = new URLSearchParams()
    if (query.trim()) params.append('q', query.trim())
    const url = `${API}/admin/sales/search${params.toString() ? `?${params.toString()}` : ''}`
    const res = await axios.get(url)
    const list = Array.isArray(res.data) ? res.data : []
    const sorted = [...list].sort((a, b) => {
      const dateA = new Date(a.date || a.created_at || 0).getTime()
      const dateB = new Date(b.date || b.created_at || 0).getTime()
      return dateB - dateA
    })
    setAdminSales(sorted)
  }

  const loadAdminSummary = async () => {
    if (!isAdmin) return
    const res = await axios.get(`${API}/admin/sales/summary`)
    setAdminSummary(res.data || { grandTotal: 0, users: [] })
  }

  const loadAdminAnnual = async () => {
    if (!isAdmin) return
    const year = new Date().getFullYear()
    const res = await axios.get(`${API}/admin/sales/annual?year=${year}`)
    setAdminAnnual(res.data || { year, months: [] })
  }

  const loadAdminCredentials = async () => {
    if (!isAdmin) return
    const res = await axios.get(`${API}/admin/users/credentials`)
    const list = Array.isArray(res.data) ? res.data : []
    setAdminCredentials(list)

    if (!activeLoginId || !list.some((item) => item.id === activeLoginId)) {
      const defaultLogin = list.find((item) => item.username === 'Intercap Pneus') || list[0]
      setActiveLoginId(defaultLogin?.id || '')
    }
  }

  const handleAdminQuickCreate = async (event) => {
    event.preventDefault()
    if (!newUserForm.displayName || !newUserForm.username || !newUserForm.password) {
      alert('Preencha nome, login e senha')
      return
    }

    setAdminLoading(true)
    try {
      await axios.post(`${API}/admin/users`, {
        displayName: newUserForm.displayName,
        username: newUserForm.username,
        password: newUserForm.password,
        role: 'user'
      })
      setNewUserForm(emptyNewUser)
      await loadAdminUsers()
      await loadAdminCredentials()
      alert('Usuário criado com sucesso!')
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao criar usuário')
    } finally {
      setAdminLoading(false)
    }
  }

  const handleLogin = (user) => {
    setIsAuthenticated(true)
    localStorage.setItem('authenticated', 'true')

    const resolvedUser = user || { id: 'adm', username: 'ADM', displayName: 'Administrador', role: 'admin' }
    setCurrentUser(resolvedUser)
    localStorage.setItem('currentUser', JSON.stringify(resolvedUser))
    axios.defaults.headers.common['x-user-id'] = resolvedUser.id
  }

  const handleLogout = () => {
    openConfirm('Deseja realmente sair do sistema?', () => {
      setIsAuthenticated(false)
      setCurrentUser(null)
      setAdminUsers([])
      setAdminSales([])
      setAdminSummary({ grandTotal: 0, users: [] })
      setAdminAnnual({ year: new Date().getFullYear(), months: [] })
      setAdminCredentials([])
      setActiveLoginId('')
      setShowPassword(false)
      localStorage.removeItem('authenticated')
      localStorage.removeItem('currentUser')
      delete axios.defaults.headers.common['x-user-id']
    })
  }

  const openConfirm = (message, onConfirm) => setConfirmState({ open: true, message, onConfirm })
  const closeConfirm = () => setConfirmState({ open: false, message: '', onConfirm: null })

  const handleConfirm = async () => {
    if (confirmState.onConfirm) await confirmState.onConfirm()
    closeConfirm()
  }

  useEffect(() => {
    if (!isAuthenticated) {
      delete axios.defaults.headers.common['x-user-id']
      return
    }

    const resolvedUser = currentUser || { id: 'adm', username: 'ADM', displayName: 'Administrador', role: 'admin' }
    axios.defaults.headers.common['x-user-id'] = resolvedUser.id

    if (!currentUser) {
      setCurrentUser(resolvedUser)
      localStorage.setItem('currentUser', JSON.stringify(resolvedUser))
    }
  }, [isAuthenticated, currentUser])

  useEffect(() => {
    if (!isAuthenticated) return

    if (isAdmin) {
      loadAdminUsers()
      loadAdminSales(adminSearch)
      loadAdminSummary()
      loadAdminAnnual()
      loadAdminCredentials()
      return
    }

    load()
    loadCommissions()
    loadMonths()
  }, [isAuthenticated, isAdmin, currentUser?.id])

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      load()
    }
  }, [currentMonth, isAuthenticated, isAdmin])

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
    applyColorTheme(primaryColor)
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
    localStorage.setItem('darkMode', darkMode.toString())
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('currentMonth', currentMonth)
  }, [currentMonth])

  useEffect(() => {
    applyColorTheme(primaryColor)
    localStorage.setItem('primaryColor', primaryColor)
  }, [primaryColor])

  useEffect(() => {
    if (!isAuthenticated) return

    const INACTIVITY_TIME = 10 * 60 * 1000
    let inactivityTimer

    const resetTimer = () => {
      clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => {
        setIsAuthenticated(false)
        setCurrentUser(null)
        setAdminUsers([])
        setAdminSales([])
        setAdminSummary({ grandTotal: 0, users: [] })
        setAdminAnnual({ year: new Date().getFullYear(), months: [] })
        setAdminCredentials([])
        setActiveLoginId('')
        setShowPassword(false)
        localStorage.removeItem('authenticated')
        localStorage.removeItem('currentUser')
        delete axios.defaults.headers.common['x-user-id']
        alert('Sessão encerrada por inatividade.')
      }, INACTIVITY_TIME)
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach((event) => document.addEventListener(event, resetTimer, true))
    resetTimer()

    return () => {
      clearTimeout(inactivityTimer)
      events.forEach((event) => document.removeEventListener(event, resetTimer, true))
    }
  }, [isAuthenticated])

  const applyColor = (colorHex) => setPrimaryColor(colorHex)
  const handleColorSelect = (colorHex) => applyColor(colorHex)

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} primaryColor={primaryColor} darkMode={darkMode} />
  }

  const create = async (payload) => {
    await axios.post(`${API}/sales`, { ...payload, month: currentMonth })
    setMonthsWithData((prev) => (prev.includes(currentMonth) ? prev : [...prev, currentMonth]))
    await load()
    await loadMonths()
    setChartRefresh((prev) => prev + 1)
  }

  const update = async (id, payload) => {
    await axios.put(`${API}/sales/${id}`, { ...payload, month: currentMonth })
    setEditing(null)
    await load()
    setChartRefresh((prev) => prev + 1)
  }

  const remove = (id) => {
    openConfirm('Deseja realmente apagar essa venda?', async () => {
      try {
        await axios.delete(`${API}/sales/${id}?month=${currentMonth}`)
      } catch (err) {
        console.error('Erro ao deletar venda:', err)
        alert('Erro ao deletar venda. Tente novamente.')
        return
      }
      await load()
      const res = await axios.get(`${API}/sales?month=${currentMonth}`)
      if (res.data.length === 0) {
        setMonthsWithData((prev) => prev.filter((m) => m !== currentMonth))
      }
      setChartRefresh((prev) => prev + 1)
    })
  }

  const handleCopy = (sale) => {
    const { id, ...saleData } = sale
    setCopiedSale(saleData)
  }

  const handlePaste = () => {
    if (copiedSale) {
      setEditing(null)
      setPastedSale({ ...copiedSale, date: '' })
      setCopiedSale(null)
    }
  }

  const createNewMonth = async (monthNum, year) => {
    const monthStr = `${year}-${String(monthNum).padStart(2, '0')}`
    try {
      await axios.post(`${API}/months`, { month: monthStr })
      await loadMonths()
      setCurrentMonth(monthStr)
    } catch (err) {
      console.error('Erro ao criar mês:', err)
    }
  }

  const handlePrevYear = () => setSelectedYear((prev) => Math.max(2026, prev - 1))
  const handleNextYear = () => setSelectedYear((prev) => prev + 1)

  const handleSelectMonth = (monthNum) => {
    const monthStr = `${selectedYear}-${String(monthNum).padStart(2, '0')}`
    if (!availableMonths.includes(monthStr)) {
      createNewMonth(monthNum, selectedYear)
    } else {
      setCurrentMonth(monthStr)
    }
    setShowMonthSelector(false)
  }

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  const formatMonthName = (monthStr) => {
    const [year, month] = monthStr.split('-')
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  const handleCommissionChange = (updatedCommissions) => setCommissions(updatedCommissions)

  const adminChartData = useMemo(() => {
    return (adminAnnual.months || []).map((item) => {
      const monthNumber = String(item.month || '').split('-')[1] || '01'
      const label = monthNames[Number(monthNumber) - 1]?.substring(0, 3) || item.month
      return {
        name: label,
        month: item.month,
        total: Number(item.total || 0)
      }
    })
  }, [adminAnnual])

  const activeCredential = useMemo(() => {
    return adminCredentials.find((item) => item.id === activeLoginId) || null
  }, [adminCredentials, activeLoginId])

  return (
    <div className={`container ${darkMode ? 'dark-mode' : ''}`}>
      <div className="header-top">
        <div className="theme-controls">
          <button className="btn-theme" onClick={() => setDarkMode(!darkMode)} title="Alternar tema">
            {darkMode ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
          <button className="btn-theme" onClick={() => setShowColorPicker(!showColorPicker)} title="Personalizar cores">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
          </button>
          {isAdmin ? (
            <button className="btn-chart" onClick={() => setShowAdminPanel(true)} title="Gerenciar logins e contas">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h18v4H3z"></path>
                <path d="M3 10h18v4H3z"></path>
                <path d="M3 17h18v4H3z"></path>
              </svg>
            </button>
          ) : (
            <>
              <button className="btn-chart" onClick={() => setShowChart(true)} title="Gráfico de vendas anuais">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </button>
              <button className="btn-chart" onClick={() => setShowNotes(true)} title="Anotações de clientes">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </>
          )}
          <button className="btn-logout" onClick={handleLogout} title="Sair do sistema">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>

          {showColorPicker && (
            <div className="color-picker-dropdown">
              <div className="color-picker-header">
                <span>Escolher cor principal</span>
                <button onClick={() => setShowColorPicker(false)}>✕</button>
              </div>
              <div className="color-presets">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    className={`color-preset-btn ${primaryColor === color.hex ? 'active' : ''}`}
                    onClick={() => handleColorSelect(color.hex)}
                    title={color.name}
                    style={{ background: `linear-gradient(135deg, ${color.hex} 0%, ${color.dark} 100%)` }}
                  >
                    <span className="color-name">{color.name}</span>
                    {primaryColor === color.hex && <span className="color-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <h1>{isAdmin ? 'ÁREA ADMINISTRADOR' : 'Tabela de Vendas'}</h1>

        {!isAdmin && (
          <div className="month-controls">
            <button className="btn-month" onClick={() => setShowMonthSelector(!showMonthSelector)} title="Selecionar mês">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{formatMonthName(currentMonth)}</span>
            </button>
            {showMonthSelector && (
              <div className="month-selector-dropdown">
                <div className="month-selector-header">
                  <button className="btn-arrow" onClick={handlePrevYear} title="Ano anterior">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                  <span className="year-display">{selectedYear}</span>
                  <button className="btn-arrow" onClick={handleNextYear} title="Próximo ano">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                  <button onClick={() => setShowMonthSelector(false)}>✕</button>
                </div>

                <div className="months-grid">
                  {monthNames.map((monthName, index) => {
                    const monthNum = index + 1
                    const monthStr = `${selectedYear}-${String(monthNum).padStart(2, '0')}`
                    const hasData = monthsWithData.includes(monthStr)
                    return (
                      <button
                        key={monthNum}
                        className={`month-button ${hasData ? 'exists' : ''} ${currentMonth === monthStr ? 'active' : ''}`}
                        onClick={() => handleSelectMonth(monthNum)}
                        title={`${monthName} ${selectedYear}`}
                      >
                        <span className="month-label">{monthName.substring(0, 3)}</span>
                        <span className="month-indicator">{hasData ? '✓' : '+'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isAdmin ? (
        <div className="admin-home-layout">
          <div className="admin-home-card admin-home-sales-top">
            <div className="admin-home-row-head">
              <h3>Últimas vendas feitas</h3>
              <div className="admin-home-search-row">
                <input
                  className="admin-home-search"
                  value={adminSearch}
                  onChange={(event) => setAdminSearch(event.target.value)}
                  placeholder="Buscar últimas vendas"
                />
                <button className="admin-home-btn" onClick={() => loadAdminSales(adminSearch)} disabled={adminLoading}>Buscar</button>
              </div>
            </div>

            <div className="admin-home-table-wrap">
              <table className="admin-home-table">
                <thead>
                  <tr>
                    <th>CLIENTE</th>
                    <th>PRODUTO</th>
                    <th>QUANTIDADE</th>
                    <th>VALOR DA VENDA</th>
                    <th>CONTA</th>
                  </tr>
                </thead>
                <tbody>
                  {adminSales.slice(0, 12).map((sale, index) => (
                    <tr key={`${sale.userId}-${sale.id}-${index}`}>
                      <td>{sale.client}</td>
                      <td>{sale.product}</td>
                      <td>{sale.quantity || '-'}</td>
                      <td>R$ {Number(sale.total || 0).toFixed(2)}</td>
                      <td>{sale.userName}</td>
                    </tr>
                  ))}
                  {adminSales.length === 0 && (
                    <tr>
                      <td colSpan={5}>Nenhuma venda encontrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-home-card admin-home-chart-full">
            <h3>Gráfico anual de vendas mensais totais ({adminAnnual.year || new Date().getFullYear()})</h3>
            <p className="admin-home-total">Total geral: <strong>R$ {Number(adminSummary.grandTotal || 0).toFixed(2)}</strong></p>
            <div className="admin-home-chart-wrap full-width">
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={adminChartData} margin={{ top: 12, right: 16, left: 0, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} labelFormatter={(label, payload) => payload?.[0]?.payload?.month || label} />
                  <Bar dataKey="total" fill="var(--primary-color)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="admin-home-card admin-home-login-card">
            <div className="admin-login-head">
              <h3>Login ativo</h3>
              <button className="btn-eye" onClick={() => setShowPassword((prev) => !prev)} title="Desmascarar senha">
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            <select
              className="admin-user-select"
              value={activeLoginId}
              onChange={(event) => setActiveLoginId(event.target.value)}
            >
              {adminCredentials.map((cred) => (
                <option key={cred.id} value={cred.id}>{cred.displayName} ({cred.username})</option>
              ))}
            </select>

            {activeCredential ? (
              <div className="admin-login-details">
                <p><strong>Login:</strong> {activeCredential.username}</p>
                <p><strong>Senha:</strong> {showPassword ? (activeCredential.password || 'Não disponível') : '••••••••••'}</p>
                <p className="admin-login-note">Clique no olho para desmascarar.</p>
              </div>
            ) : (
              <p>Nenhum login disponível.</p>
            )}

            <h4>criar mais contas</h4>
            <form className="admin-home-user-form" onSubmit={handleAdminQuickCreate}>
              <input
                value={newUserForm.displayName}
                onChange={(event) => setNewUserForm((prev) => ({ ...prev, displayName: event.target.value }))}
                placeholder="Nome de referência"
                required
              />
              <input
                value={newUserForm.username}
                onChange={(event) => setNewUserForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="Login"
                required
              />
              <input
                type="password"
                value={newUserForm.password}
                onChange={(event) => setNewUserForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Senha"
                required
              />
              <button type="submit" className="admin-home-btn" disabled={adminLoading}>Criar usuário</button>
            </form>

            <button className="admin-home-btn admin-home-btn-secondary" onClick={() => setShowAdminPanel(true)}>
              Gerenciar contas avançado
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid">
            <SaleForm
              onCreate={create}
              onUpdate={update}
              editing={editing}
              currentMonth={currentMonth}
              copiedSale={copiedSale}
              pastedSale={pastedSale}
              onPasteApplied={() => setPastedSale(null)}
              onPaste={handlePaste}
            />
            <SaleList sales={sales} onEdit={setEditing} onDelete={remove} onCopy={handleCopy} />
          </div>
          <CommissionSummary sales={sales} commissions={commissions} onCommissionChange={handleCommissionChange} />
          {showChart && <ChartView year={selectedYear} onClose={() => setShowChart(false)} refreshKey={chartRefresh} primaryColor={primaryColor} darkMode={darkMode} />}
          <NotesPanel isOpen={showNotes} onClose={() => setShowNotes(false)} darkMode={darkMode} currentMonth={currentMonth} onSaleAdded={load} onMonthChange={setCurrentMonth} />
        </>
      )}

      {showAdminPanel && isAdmin && (
        <AdminPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          users={adminUsers}
          onUsersRefresh={loadAdminUsers}
          selectedUserId={selectedUserId}
          onSelectUser={setSelectedUserId}
        />
      )}

      {confirmState.open && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className="modal-header">
              <h3 id="confirm-title">CONFIRMAÇÃO</h3>
              <button className="modal-close" onClick={closeConfirm} aria-label="Fechar">✕</button>
            </div>
            <div className="modal-body">
              <p>{confirmState.message}</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" type="button" onClick={closeConfirm}>CANCELAR</button>
              <button className="btn-primary" type="button" onClick={handleConfirm}>SIM</button>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <div className="footer-content">
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
          <div className="footer-divider">•</div>
          <div className="footer-author">
            Developed by <strong>Gustavo Curis de Francisco</strong>
          </div>
        </div>
      </footer>
    </div>
  )
}

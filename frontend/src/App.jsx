import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import SaleForm from './components/SaleForm';
import SaleList from './components/SaleList';
import CommissionSummary from './components/CommissionSummary';
import ChartView from './components/ChartView';
import NotesPanel from './NotesPanel';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import LoginManager from './components/LoginManager';

// Corrige erro de referência: define emptyNewUser
const emptyNewUser = { displayName: '', username: '', password: '' };

// Interceptor global para garantir x-user-id do usuário logado
axios.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem("currentUser");
    const user = raw ? JSON.parse(raw) : null;
    if (user?.id) {
      config.headers = config.headers || {};
      config.headers["x-user-id"] = user.id;
    }
  } catch {}
  return config;
});

// Função para formatar números
function formatReal(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Spinner de backup
function BackupSpinner({ visible }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed',
      right: 24,
      bottom: 24,
      zIndex: 9999,
      background: 'rgba(30,113,69,0.92)',
      borderRadius: '50%',
      padding: 16,
      boxShadow: '0 2px 12px rgba(0,0,0,0.18)'
    }}>
      <div
        className="backup-spinner"
        style={{
          width: 32,
          height: 32,
          border: '4px solid #fff',
          borderTop: '4px solid #4ade80',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite'
        }}
      />
    </div>
  );
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API = `${API_BASE_URL}/api`;

const PRESET_COLORS = [
  { name: 'Verde', hex: '#1e7145', dark: '#0f4620', light: '#4ade80' },
  { name: 'Azul', hex: '#0d47a1', dark: '#051541', light: '#2196f3' },
  { name: 'Vermelho', hex: '#d32f2f', dark: '#7f1d1d', light: '#ef4444' },
  { name: 'Roxo', hex: '#6a1b9a', dark: '#360853', light: '#9c27b0' },
  { name: 'Rosa Pink', hex: '#ec4899', dark: '#be185d', light: '#f472b6' },
  { name: 'All Black', hex: '#1a1a1a', dark: '#0d0d0d', light: '#2d2d2d' }
];

const TIRE_TYPE_LABELS = {
  'new': 'NOVO',
  'recap': 'RECAPADO',
  'recapping': 'RECAPAGEM',
  'sv_borracharia': 'SV BORRACHARIA'
}

const getTireTypeLabel = (type) => {
  return TIRE_TYPE_LABELS[type] || (type || '-').toUpperCase()
}

export default function App() {
  const [showBackupSpinner, setShowBackupSpinner] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('authenticated') === 'true')
  const [authKey, setAuthKey] = useState(0)
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
  const [showLoginManager, setShowLoginManager] = useState(false)
  const [adminSearch, setAdminSearch] = useState('')
  const [adminSales, setAdminSales] = useState([])
  const [adminSummary, setAdminSummary] = useState({ grandTotal: 0, users: [] })
  const [adminLatestSales, setAdminLatestSales] = useState([])
  const [adminAnnual, setAdminAnnual] = useState([]) // para gráfico anual (12 meses)
  const [adminCredentials, setAdminCredentials] = useState([])
  const [activeLoginId, setActiveLoginId] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [newUserForm, setNewUserForm] = useState(emptyNewUser)
  const [adminLoading, setAdminLoading] = useState(false)
  const [viewUserSalesId, setViewUserSalesId] = useState(null)
  const [viewUserSalesData, setViewUserSalesData] = useState(null)
  const [selectedSalesYear, setSelectedSalesYear] = useState(null)
  const [selectedSalesMonth, setSelectedSalesMonth] = useState(null)

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

  const hexToRgb = (hex) => {
    if (!hex) return { r: 0, g: 0, b: 0 }
    const raw = hex.replace('#', '')
    const full = raw.length === 3 ? raw.split('').map((c) => `${c}${c}`).join('') : raw
    const intValue = parseInt(full, 16)
    if (Number.isNaN(intValue)) return { r: 0, g: 0, b: 0 }
    return {
      r: (intValue >> 16) & 255,
      g: (intValue >> 8) & 255,
      b: intValue & 255
    }
  }

  const rgbToHex = (r, g, b) => {
    const toHex = (value) => value.toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  const blendWithWhite = (hex, amount) => {
    const { r, g, b } = hexToRgb(hex)
    const mix = (value) => Math.round(value + (255 - value) * amount)
    return rgbToHex(mix(r), mix(g), mix(b))
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

  const getRequestHeaders = () => {
    const userId = currentUser?.id
    if (userId) return { 'x-user-id': userId }

    try {
      const savedUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
      if (savedUser?.id) return { 'x-user-id': savedUser.id }
    } catch {
      return undefined
    }

    return undefined
  }

  const load = async (monthOverride = null) => {
    try {
      setIsLoading(true)
      const monthToUse = monthOverride || currentMonth
      if (!monthToUse) {
        setSales([])
        return
      }
      const res = await axios.get(`${API}/sales?month=${monthToUse}`, {
        headers: getRequestHeaders()
      })
      setSales(res.data)
      if (res.data.length > 0) {
        setMonthsWithData((prev) => (prev.includes(monthToUse) ? prev : [...prev, monthToUse]))
      }
    } catch (err) {
      console.error('Erro ao carregar vendas:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMonths = async () => {
    const res = await axios.get(`${API}/months`, {
      headers: getRequestHeaders()
    })
    const months = Array.isArray(res.data) ? res.data : []
    setAvailableMonths(months)
    return months
  }

  const loadMonthsWithSales = async () => {
    try {
      const res = await axios.get(`${API}/months-with-sales`, {
        headers: getRequestHeaders()
      })
      const months = Array.isArray(res.data) ? res.data : []
      setMonthsWithData(months)
      return months
    } catch (err) {
      setMonthsWithData([])
      return []
    }
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
  }


  // Admin: buscar últimas vendas (limit 5)
  const loadAdminLatestSales = useCallback(async () => {
    const url = `${API}/admin/sales/latest?limit=5`;
    const res = await axios.get(url);
    setAdminLatestSales(Array.isArray(res.data) ? res.data : []);
  }, [isAdmin]);

  // Admin: buscar gráfico anual
  const loadAdminAnnual = useCallback(async (year) => {
    const yearFinal = year || new Date().getFullYear();
    const url = `${API}/admin/sales/annual?year=${yearFinal}`;
    const res = await axios.get(url);
    setAdminAnnual(res.data);
  }, [isAdmin]);

  // Admin: buscar vendas (com busca)
  const loadAdminSales = useCallback(async (search = '') => {
    const url = `${API}/admin/sales/search?q=${encodeURIComponent(search)}`;
    const res = await axios.get(url);
    setAdminSales(Array.isArray(res.data) ? res.data : []);
  }, [isAdmin]);

  // Polling admin dashboard: últimas vendas e gráfico anual
  useEffect(() => {
    if (!isAdmin) return;
    loadAdminLatestSales();
    loadAdminAnnual(new Date().getFullYear());
    const t = setInterval(() => {
      loadAdminLatestSales();
      loadAdminAnnual(new Date().getFullYear());
    }, 10000);
    return () => clearInterval(t);
  }, [isAdmin, loadAdminLatestSales, loadAdminAnnual]);

  const loadAdminSummary = async () => {
    if (!isAdmin) return
    const res = await axios.get(`${API}/admin/sales/summary`)
    setAdminSummary(res.data || { grandTotal: 0, users: [] })
  }

// ...existing code...

  const loadAdminCredentials = async () => {
    if (!isAdmin) return
    const res = await axios.get(`${API}/admin/users/credentials`)
    const list = Array.isArray(res.data) ? res.data : []
    setAdminCredentials(list)
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

  const createUser = async (userData) => {
    setAdminLoading(true)
    try {
      await axios.post(`${API}/admin/users`, {
        displayName: userData.displayName,
        username: userData.username,
        password: userData.password,
        role: 'user'
      })
      await loadAdminUsers()
      await loadAdminCredentials()
      alert('Usuário criado com sucesso!')
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao criar usuário')
    } finally {
      setAdminLoading(false)
    }
  }

  const deleteUser = async (userId) => {
    setAdminLoading(true)
    try {
      await axios.delete(`${API}/admin/users/${userId}`)
      await loadAdminUsers()
      await loadAdminCredentials()
      alert('Usuário deletado com sucesso!')
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao deletar usuário')
    } finally {
      setAdminLoading(false)
    }
  }

  const updateUser = async (userId, userData) => {
    setAdminLoading(true)
    try {
      await axios.put(`${API}/admin/users/${userId}`, {
        username: userData.username,
        password: userData.password,
        displayName: userData.displayName
      })
      await loadAdminUsers()
      await loadAdminCredentials()
      alert('Usuário atualizado com sucesso!')
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao atualizar usuário')
    } finally {
      setAdminLoading(false)
    }
  }

  const loadUserSalesAndYears = async (userId, userName) => {
    setAdminLoading(true)
    try {
      const res = await axios.get(`${API}/admin/user-sales/${userId}`)
      const allSales = Array.isArray(res.data) ? res.data : []

      // Agrupar vendas por ano e mês
      const salesByYearMonth = {}
      allSales.forEach((sale) => {
        const saleDate = new Date(sale.date || sale.created_at)
        const year = saleDate.getFullYear()
        const month = String(saleDate.getMonth() + 1).padStart(2, '0')
        const monthName = saleDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

        if (!salesByYearMonth[year]) {
          salesByYearMonth[year] = {}
        }
        if (!salesByYearMonth[year][month]) {
          salesByYearMonth[year][month] = {
            monthName,
            sales: [],
            total: 0
          }
        }
        salesByYearMonth[year][month].sales.push(sale)
        salesByYearMonth[year][month].total += Number(sale.total || 0)
      })

      // Inicializar ano/mês selecionados
      const years = Object.keys(salesByYearMonth).sort((a, b) => Number(b) - Number(a))
      const firstYear = years.length > 0 ? years[0] : null
      const firstMonth = firstYear ? Object.keys(salesByYearMonth[firstYear]).sort((a, b) => Number(b) - Number(a))[0] : null

      setViewUserSalesId(userId)
      setViewUserSalesData({
        userName,
        salesByYearMonth,
        allSales
      })
      setSelectedSalesYear(firstYear)
      setSelectedSalesMonth(firstMonth)
    } catch (err) {
      alert('Erro ao carregar vendas do usuário: ' + (err.response?.data?.message || err.message))
    } finally {
      setAdminLoading(false)
    }
  }

  const handleLogin = (user) => {
    const resolvedUser = user || { id: 'adm', username: 'ADM', displayName: 'Administrador', role: 'admin' };

    setIsAuthenticated(true);
    localStorage.setItem('authenticated', 'true');

    setCurrentUser(resolvedUser);
    localStorage.setItem('currentUser', JSON.stringify(resolvedUser));

    axios.defaults.headers.common['x-user-id'] = resolvedUser.id;
    setAuthKey((prev) => prev + 1);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('authenticated');

    setCurrentUser(null);
    localStorage.removeItem('currentUser');

    delete axios.defaults.headers.common['x-user-id'];

    setAdminUsers([]);
    setAdminSales([]);
    setAdminSummary({ grandTotal: 0, users: [] });
    setAdminAnnual({ year: new Date().getFullYear(), months: [] });
    setAdminCredentials([]);

    setAuthKey((prev) => prev + 1);
  };

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

    // Carregar dados APÓS settar o header
    const loadAfterAuth = async () => {
      const isAdminUser = resolvedUser.role === 'admin'
      
      if (isAdminUser) {
        await Promise.all([
          loadAdminUsers(),
          loadAdminSales(adminSearch),
          loadAdminSummary(),
          loadAdminAnnual(),
          loadAdminCredentials()
        ])
      } else {
        await loadCommissions()
        const [months, monthsWithSales] = await Promise.all([loadMonths(), loadMonthsWithSales()])
        console.log('DEBUG loadAfterAuth: months=', months, 'monthsWithSales=', monthsWithSales)
        
        // Preferir mês salvo no localStorage se tiver vendas, senão ir pro primeiro com vendas
        let targetMonth = currentMonth
        if (monthsWithSales.length > 0) {
          if (!monthsWithSales.includes(currentMonth)) {
            targetMonth = monthsWithSales[0]
            setCurrentMonth(targetMonth)
          }
        } else if (months.length > 0) {
          targetMonth = months[0]
          setCurrentMonth(targetMonth)
        }
        await load(targetMonth)
      }
    }

    loadAfterAuth()
  }, [isAuthenticated, currentUser])
  useEffect(() => {
    if (isAuthenticated && !isAdmin && currentMonth) {
      load()
    }
  }, [currentMonth, isAuthenticated, isAdmin])

  useEffect(() => {
    if (!currentMonth) return
    const [year, month] = currentMonth.split('-')
    const parsedYear = Number(year)
    const parsedMonth = Number(month)
    if (!Number.isNaN(parsedYear)) setSelectedYear(parsedYear)
    if (!Number.isNaN(parsedMonth)) setSelectedMonth(parsedMonth)
  }, [currentMonth])

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

  // LOG AUTH para debug
  console.log("AUTH", isAuthenticated, currentUser, isAdmin);

  // Fallback visual obrigatório se autenticado mas sem usuário
  const mustShowFallback = isAuthenticated && !currentUser;
  if (mustShowFallback) {
    return <div style={{ padding: 24 }}>Carregando usuário...</div>;
  }

  if (!isAuthenticated) {
    return <Login key={`login-${authKey}`} onLogin={handleLogin} primaryColor={primaryColor} darkMode={darkMode} />;
  }

  // Função create corrigida
  const create = async (payload) => {
    await axios.post(`${API}/sales`, { ...payload, month: currentMonth })
    setMonthsWithData((prev) => (prev.includes(currentMonth) ? prev : [...prev, currentMonth]))
    await load()
    await loadMonths()
    if (isAdmin) {
      await loadAdminLatestSales()
      await loadAdminAnnual(new Date().getFullYear())
    }
    setChartRefresh((prev) => prev + 1)
  }

  // --- RETURN PRINCIPAL DO APP ---
  return (
    <div className="app-container">
      <div className="header-top">
        <h1>{isAdmin ? 'ÁREA ADMINISTRADOR' : 'Tabela de Vendas'}</h1>
      </div>
      <div className="main-content">
        {isLoading && <div style={{ padding: 16 }}>Carregando...</div>}
        {isAdmin ? (
          <div style={{ padding: 16 }}>
            <h2>Bem-vindo, {currentUser?.displayName || 'Admin'}!</h2>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button onClick={() => setShowAdminPanel(true)}>Abrir AdminPanel</button>
              <button onClick={() => setShowLoginManager(true)}>Abrir LoginManager</button>
            </div>
            <div style={{ marginTop: 16 }}>
              <p>Últimas vendas: {adminLatestSales?.length || 0}</p>
            </div>
            <div style={{marginTop:24}}>
              <AdminPanel
                isOpen={showAdminPanel}
                onClose={() => setShowAdminPanel(false)}
                users={adminUsers}
                onUsersRefresh={loadAdminUsers}
                selectedUserId={selectedUserId}
                onSelectUser={setSelectedUserId}
                onSalesChanged={async () => {
                  await loadAdminSales(adminSearch);
                  await loadAdminSummary();
                  await loadAdminAnnual();
                  setChartRefresh((prev) => prev + 1);
                }}
              />
              <LoginManager
                isOpen={showLoginManager}
                onClose={() => setShowLoginManager(false)}
                users={adminUsers}
                onUsersRefresh={loadAdminUsers}
              />
            </div>
          </div>
        ) : (
          <>
            <SaleForm onCreate={create} onUpdate={() => {}} editing={editing} currentMonth={currentMonth} />
            <SaleList sales={sales} onEdit={setEditing} onDelete={() => {}} onCopy={() => {}} />
            <CommissionSummary sales={sales} commissions={commissions} onCommissionChange={() => {}} />
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
// import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import SaleForm from './components/SaleForm';
import SaleList from './components/SaleList';
import CommissionSummary from './components/CommissionSummary';
import ChartView from './components/ChartView';
import NotesPanel from './NotesPanel';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import LoginManager from './components/LoginManager';
import { YearSalesChartWithBoundary } from './components/YearSalesChart';
import { normalizeMojibakeText } from './utils/text';
import { getMonthlyTotalsFromActiveAccounts } from './utils/adminMonthlyTotals';

const SAFE_EMPTY_NEW_USER = { displayName: '', username: '', password: '' };

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

const API_BASE_URL = 'https://sistemavendas-backend-intercap.onrender.com';
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
  'recap': 'PNEU RECAPADO',
  'recapping': 'RECAPAGEM',
  'sv_borracharia': 'SV BORRACHARIA',
  'service': 'SV BORRACHARIA'
}

const getTireTypeLabel = (type) => {
  return TIRE_TYPE_LABELS[type] || (type || '-').toUpperCase()
}

export default function App() {


  const [showBackupSpinner, setShowBackupSpinner] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('authenticated') === 'true');
  const [authKey, setAuthKey] = useState(0);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const isAdmin = currentUser?.role === 'admin';
  const [adminUsers, setAdminUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showLoginManager, setShowLoginManager] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminSales, setAdminSales] = useState([]);
  const [adminSummary, setAdminSummary] = useState({ grandTotal: 0, users: [] });
  const [adminLatestSales, setAdminLatestSales] = useState([]);
  const [adminAnnual, setAdminAnnual] = useState({ year: new Date().getFullYear(), months: [] });
  const [adminCredentials, setAdminCredentials] = useState([]);
  const [activeLoginId, setActiveLoginId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newUserForm, setNewUserForm] = useState(SAFE_EMPTY_NEW_USER);
  const [adminLoading, setAdminLoading] = useState(false);
  const [viewUserSalesId, setViewUserSalesId] = useState(null);
  const [viewUserSalesData, setViewUserSalesData] = useState(null);
  const [adminViewSalesByUser, setAdminViewSalesByUser] = useState({});
  const [selectedSalesYear, setSelectedSalesYear] = useState(null);
  const [selectedSalesMonth, setSelectedSalesMonth] = useState(null);
  const [sales, setSales] = useState([]);
  const [editing, setEditing] = useState(null);
  const [copiedSale, setCopiedSale] = useState(null);
  const [pastedSale, setPastedSale] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [commissions, setCommissions] = useState({ new: 5, recap: 8, recapping: 10, service: 0 });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem('primaryColor') || PRESET_COLORS[0].hex);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [monthsWithData, setMonthsWithData] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const saved = localStorage.getItem('currentMonth');
    if (saved) return saved;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => {
    const saved = localStorage.getItem('currentMonth');
    return saved ? parseInt(saved.split('-')[0]) : new Date().getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('currentMonth');
    return saved ? parseInt(saved.split('-')[1]) : new Date().getMonth() + 1;
  });
  const [showChart, setShowChart] = useState(false);
  const [chartRefresh, setChartRefresh] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, message: '', onConfirm: null });

  // Admin polling functions as useCallback
  const loadAdminLatestSales = useCallback(async () => {
    const url = `${API}/admin/sales/latest?limit=5`;
    const res = await axios.get(url);
    setAdminLatestSales(Array.isArray(res.data) ? res.data : []);
  }, []);

  const loadAdminAnnual = useCallback(async (year) => {
    const y = year || new Date().getFullYear();
    const url = `${API}/admin/sales/annual?year=${y}`;
    const res = await axios.get(url);
    setAdminAnnual(res.data || { year: y, months: [] });
  }, []);

  const loadAdminSummary = useCallback(async () => {
    const res = await axios.get(`${API}/admin/sales/summary`);
    setAdminSummary(res.data || { grandTotal: 0, users: [] });
  }, []);

  // Polling useEffect
  useEffect(() => {
    if (!isAuthenticated || !isAdmin || !currentUser?.id) return;
    loadAdminLatestSales();
    loadAdminAnnual(new Date().getFullYear());
    loadAdminSummary();
    const t = setInterval(() => {
      loadAdminLatestSales();
      loadAdminAnnual(new Date().getFullYear());
      loadAdminSummary();
    }, 10000);
    return () => clearInterval(t);
  }, [isAuthenticated, isAdmin, currentUser?.id, loadAdminLatestSales, loadAdminAnnual, loadAdminSummary]);

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

  // Função correta para carregar vendas admin
  const loadAdminSales = useCallback(async (search = '') => {
    if (!isAdmin) return;
    const qs = search ? `?q=${encodeURIComponent(search)}` : '';
    const res = await axios.get(`${API}/admin/sales/search${qs}`);
    setAdminSales(Array.isArray(res.data) ? res.data : []);
  }, [isAdmin]);

// Deploy trigger: alteração mínima para forçar rebuild (2)

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
      setNewUserForm(SAFE_EMPTY_NEW_USER)
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


  const buildSalesByYearMonthFromSales = (allSales) => {
    const safeSales = Array.isArray(allSales) ? allSales : []
    const salesByYearMonth = {}

    safeSales.forEach((sale) => {
      const saleDate = new Date(sale.date || sale.created_at)
      if (Number.isNaN(saleDate.getTime())) return

      const year = String(saleDate.getFullYear())
      const month = String(saleDate.getMonth() + 1).padStart(2, '0')
      const monthName = saleDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

      if (!salesByYearMonth[year]) {
        salesByYearMonth[year] = {}
      }
      if (!salesByYearMonth[year][month]) {
        salesByYearMonth[year][month] = {
          monthName,
          sales: [],
          total: 0,
          count: 0
        }
      }

      salesByYearMonth[year][month].sales.push(sale)
      salesByYearMonth[year][month].total += Number(sale.total || 0)
      salesByYearMonth[year][month].count += 1
    })

    return salesByYearMonth
  }

  const loadAdminViewTotalsForUser = useCallback(async (userId) => {
    try {
      const res = await axios.get(`${API}/admin/user-sales/${userId}`)
      const allSales = Array.isArray(res.data) ? res.data : []
      const salesByYearMonth = buildSalesByYearMonthFromSales(allSales)

      setAdminViewSalesByUser((prev) => ({
        ...prev,
        [userId]: salesByYearMonth
      }))

      return { allSales, salesByYearMonth }
    } catch (err) {
      console.error('Erro ao carregar totais da vis�o admin por usu�rio:', err)
      return { allSales: [], salesByYearMonth: {} }
    }
  }, [])
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


  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return

    const activeUsers = (adminUsers || []).filter((user) => user?.active !== false && user?.role !== 'admin')
    if (activeUsers.length === 0) {
      setAdminViewSalesByUser({})
      return
    }

    const loadAllActive = async () => {
      await Promise.allSettled(activeUsers.map((user) => loadAdminViewTotalsForUser(user.id)))
    }

    loadAllActive()
  }, [isAuthenticated, isAdmin, adminUsers, loadAdminViewTotalsForUser])
  const handleLogin = (user) => {
    setIsAuthenticated(true)
    localStorage.setItem('authenticated', 'true')

    const resolvedUser = user || { id: 'adm', username: 'ADM', displayName: 'Administrador', role: 'admin' }
    setCurrentUser(resolvedUser)
    localStorage.setItem('currentUser', JSON.stringify(resolvedUser))
    axios.defaults.headers.common['x-user-id'] = resolvedUser.id
    setAuthKey((prev) => prev + 1)
    // Força reload para garantir atualização total
    window.location.reload()
  }

  const handleLogout = () => {
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
    setAuthKey((prev) => prev + 1)
    // Força reload para garantir atualização total
    window.location.reload()
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

  if (!isAuthenticated) {
    return <Login key={`login-${authKey}`} onLogin={handleLogin} primaryColor={primaryColor} darkMode={darkMode} />
  }

  const create = useCallback(async (payload) => {
    await axios.post(`${API}/sales`, { ...payload, month: currentMonth });
    setMonthsWithData((prev) => (prev.includes(currentMonth) ? prev : [...prev, currentMonth]));
    await load();
    await loadMonths();
    if (currentUser?.role === "admin") {
      await loadAdminLatestSales();
      await loadAdminAnnual(new Date().getFullYear());
    }
    setChartRefresh((prev) => prev + 1);
  }, [currentMonth, currentUser, load, loadMonths, loadAdminLatestSales, loadAdminAnnual]);

  const update = async (id, payload) => {
    await axios.put(`${API}/sales/${id}`, { ...payload, month: currentMonth })
    setEditing(null)
    await load()
    // Sempre atualiza área admin
    await loadAdminSales(adminSearch)
    await loadAdminSummary()
    await loadAdminAnnual()
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
      // Sempre atualiza área admin
      await loadAdminSales(adminSearch)
      await loadAdminSummary()
      await loadAdminAnnual()
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

  const handlePrevYear = () => setSelectedYear((prev) => prev - 1)
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

  const activeAccountsAdminView = useMemo(
    () => (adminUsers || [])
      .filter((user) => user?.active !== false && user?.role !== 'admin')
      .map((user) => ({
        ...user,
        salesByYearMonth: adminViewSalesByUser[user.id] || {}
      })),
    [adminUsers, adminViewSalesByUser]
  )

  const monthlyTotalsFromAdminView = useMemo(
    () => getMonthlyTotalsFromActiveAccounts({
      users: activeAccountsAdminView,
      year: adminAnnual?.year || new Date().getFullYear()
    }),
    [activeAccountsAdminView, adminAnnual?.year]
  )

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('TOTALS FROM ADMIN VIEW', monthlyTotalsFromAdminView)
    }
  }, [monthlyTotalsFromAdminView])

  // Gr�fico anual (jan-dez) usando os mesmos totais da tela "Visualizar Vendas"
  const adminChartData = useMemo(() => {
    const year = Number(adminAnnual?.year || new Date().getFullYear())
    const yearTotals = Array.isArray(monthlyTotalsFromAdminView) ? monthlyTotalsFromAdminView : []

    return yearTotals.map((item, index) => {
      const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`
      return {
        name: item.month,
        month: monthKey,
        total: Number(item.total || 0),
        count: Number(item.count || 0)
      }
    })
  }, [monthlyTotalsFromAdminView, adminAnnual?.year]);

  const adminChartColors = useMemo(() => {
    const base = primaryColor || PRESET_COLORS[0].hex
    return monthNames.map((_, index) => blendWithWhite(base, 0.05 + (index / 11) * 0.55))
  }, [primaryColor, monthNames])

  const adminChartTotal = useMemo(
    () => (adminChartData || []).reduce((sum, month) => sum + Number(month.total || 0), 0),
    [adminChartData]
  )

  // Proteção: garantir arrays/objetos válidos
  const safeAdminSales = Array.isArray(adminSales) ? adminSales : [];
  const safeAdminUsers = Array.isArray(adminUsers) ? adminUsers : [];
  const safeAdminAnnual = adminAnnual && typeof adminAnnual === 'object' ? adminAnnual : { year: new Date().getFullYear(), months: [] };

  // Filtra vendas TESTE do frontend
  // Últimas vendas ADM já vêm limitadas do backend
  const adminRecentSales = adminLatestSales;
  // ...existing code...
  // Remover return duplicado
  // O return correto está no final do arquivo
  return (
    <>
      {/* Proteção global: mensagem de erro amigável se algum dado essencial estiver ausente */}
      {(!safeAdminSales || !safeAdminUsers || !safeAdminAnnual) && (
        <div style={{color: 'red', padding: 20, fontWeight: 'bold'}}>Erro crítico: Dados essenciais não carregados. Tente recarregar a página ou contate o suporte.</div>
      )}
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
          {!isAdmin && (
            <>
              <button className="btn-theme" onClick={() => setShowChart(true)} title="Ver gráfico de vendas">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="12" width="3" height="7"/>
                  <rect x="9" y="8" width="3" height="11"/>
                  <rect x="15" y="4" width="3" height="15"/>
                </svg>
              </button>
              <button className="btn-theme" onClick={() => setShowNotes(true)} title="Ver rascunhos e anotações">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                  <line x1="8" y1="8" x2="16" y2="8"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                  <line x1="8" y1="16" x2="12" y2="16"/>
                </svg>
              </button>
              <button className="btn-logout" onClick={() => openConfirm('Deseja realmente sair do sistema?', handleLogout)} title="Sair do sistema">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </>
          )}
          {/* Botão de sair do sistema agora é o último */}
          {isAdmin && (
            <>
              <button className="btn-theme" onClick={() => setShowAdminPanel(true)} title="Gerenciar contas (painel)">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 9h6v6H9z"/>
                </svg>
              </button>
              <button className="btn-theme" onClick={() => setShowLoginManager(true)} title="Gerenciar contas (modal)">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 2 21l1.5-5L16.5 3.5z"/>
                </svg>
              </button>
              <button className="btn-logout" onClick={() => openConfirm('Deseja realmente sair do sistema?', handleLogout)} title="Sair do sistema">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </>
          )}
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

        <h1>{isAdmin ? '\u00C1REA ADMINISTRADOR' : 'Tabela de Vendas'}</h1>

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
            <div className="list">
              <div className="list-header-with-sort">
                <h2>�LTIMAS VENDAS FEITAS</h2>
              </div>
              <div className="list-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Conta</th>
                      <th>Data</th>
                      <th>Cliente</th>
                      <th>PRODUTO/SERVI�O</th>
                      <th>Unit.</th>
                      <th>Qtd</th>
                      <th>Tipo de Venda</th>
                      <th>Desfecho</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminLatestSales.map((sale) => (
                      <tr key={`${sale.userId}-${sale.month}-${sale.id}-${sale.createdAt || sale.date}`}>
                        <td>{normalizeMojibakeText(sale.userName || adminUsers.find((u) => u.id === sale.userId)?.displayName || adminUsers.find((u) => u.id === sale.userId)?.username || sale.userId || '-')}</td>
                        <td>{sale.date ? (typeof sale.date === 'string' && sale.date.includes('-') ? sale.date.split('-').reverse().join('/') : sale.date) : '-'}</td>
                        <td>{normalizeMojibakeText(sale.client) || '-'}</td>
                        <td>{normalizeMojibakeText(sale.product) || '-'}</td>
                        <td>{sale.unit_price ? Number(sale.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                        <td>{sale.quantity ? Number(sale.quantity).toLocaleString('pt-BR') : '-'}</td>
                        <td>{getTireTypeLabel(sale.tire_type)}</td>
                        <td>{sale.desfecho ? normalizeMojibakeText(sale.desfecho).toUpperCase() : '-'}</td>
                        <td>{sale.total ? `R$ ${Number(sale.total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="admin-home-card admin-home-chart-full" style={{ background: darkMode ? '#111' : '#fff', color: darkMode ? '#fff' : '#222', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 900, margin: 0 }}>{`GR\u00C1FICO ANUAL DE VENDAS MENSAIS TOTAIS (${adminAnnual.year || new Date().getFullYear()})`}</h3>
            <p className="admin-home-total" style={{ textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>VENDAS TOTAL: <strong>R$ {adminChartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
            <div className="admin-home-chart-wrap full-width" style={{ height: 360, width: '100%', margin: 0 }}>
              <YearSalesChartWithBoundary monthlyTotals={monthlyTotalsFromAdminView} darkMode={darkMode} year={adminAnnual.year || new Date().getFullYear()} />
            </div>
          </div>

        </div>
      ) :(
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
          onSalesChanged={async () => {
            await loadAdminSales(adminSearch);
            await loadAdminSummary();
            await loadAdminAnnual();
            setChartRefresh((prev) => prev + 1);
          }}
        />
      )}

      {showLoginManager && isAdmin && (
        <LoginManager
          isOpen={showLoginManager}
          onClose={() => setShowLoginManager(false)}
          adminCredentials={adminCredentials}
          onCreateUser={createUser}
          onUpdateUser={updateUser}
          onDeleteUser={deleteUser}
          onViewUserSales={loadUserSalesAndYears}
          onRefresh={loadAdminCredentials}
          adminLoading={adminLoading}
          darkMode={darkMode}
          onSalesChanged={async () => {
            await loadAdminSales(adminSearch);
            await loadAdminSummary();
            await loadAdminAnnual();
            setChartRefresh((prev) => prev + 1);
          }}
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

      {/* Modal de Vendas do Usuário */}
      {viewUserSalesData && (
        <div className="login-manager-overlay">
          <div className={`user-sales-modal ${darkMode ? 'dark-mode' : ''}`}>
            <div className="login-manager-header">
              <h2>Vendas de {viewUserSalesData.userName}</h2>
              <button 
                className="login-manager-close" 
                onClick={() => { 
                  setViewUserSalesId(null)
                  setViewUserSalesData(null)
                  setSelectedSalesYear(null)
                  setSelectedSalesMonth(null)
                }}
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="user-sales-controls">
              <div className="user-sales-select-group">
                <label htmlFor="year-select">Ano:</label>
                <select 
                  id="year-select"
                  className="user-sales-select"
                  value={selectedSalesYear || ''}
                  onChange={(e) => {
                    const year = e.target.value
                    setSelectedSalesYear(year)
                    // Auto-select first month of the selected year
                    const months = Object.keys(viewUserSalesData.salesByYearMonth[year] || {}).sort((a, b) => Number(b) - Number(a))
                    setSelectedSalesMonth(months.length > 0 ? months[0] : null)
                  }}
                >
                  <option value="">Selecione um ano</option>
                  {Object.keys(viewUserSalesData.salesByYearMonth)
                    .sort((a, b) => Number(b) - Number(a))
                    .map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                </select>
              </div>

              {selectedSalesYear && (
                <div className="user-sales-select-group">
                  <label htmlFor="month-select">Mês:</label>
                  <select 
                    id="month-select"
                    className="user-sales-select"
                    value={selectedSalesMonth || ''}
                    onChange={(e) => setSelectedSalesMonth(e.target.value)}
                  >
                    <option value="">Selecione um mês</option>
                    {Object.keys(viewUserSalesData.salesByYearMonth[selectedSalesYear] || {})
                      .sort((a, b) => Number(b) - Number(a))
                      .map((month) => {
                        const monthData = viewUserSalesData.salesByYearMonth[selectedSalesYear][month]
                        return (
                          <option key={`${selectedSalesYear}-${month}`} value={month}>
                            {monthData.monthName}
                          </option>
                        )
                      })}
                  </select>
                </div>
              )}
            </div>

            <div className="user-sales-content">
              {Object.keys(viewUserSalesData.salesByYearMonth).length === 0 ? (
                <p className="user-sales-empty">Nenhuma venda encontrada</p>
              ) : selectedSalesYear && selectedSalesMonth ? (
                (() => {
                  const monthData = viewUserSalesData.salesByYearMonth[selectedSalesYear]?.[selectedSalesMonth]
                  if (!monthData) {
                    return <p className="user-sales-empty">Nenhuma venda neste mês</p>
                  }
                  return (
                    <div className="user-sales-month-single">
                      <div className="user-sales-month-header">
                        <h4>{monthData.monthName}</h4>
                        <span className="user-sales-month-total">
                          Total: R$ {formatReal(monthData.total)}
                        </span>
                      </div>
                      <table className="user-sales-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Produto</th>
                            <th>Tipo</th>
                            <th>Valor</th>
                            <th>Quantidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthData.sales.map((sale, idx) => {
                            const saleDate = new Date(sale.date || sale.created_at)
                            const formattedDate = saleDate.toLocaleDateString('pt-BR')
                            return (
                              <tr key={`${selectedSalesYear}-${selectedSalesMonth}-${idx}`}>
                                <td>{formattedDate}</td>
                                <td>{sale.product || '-'}</td>
                                <td>{getTireTypeLabel(sale.tire_type)}</td>
                                <td>R$ {formatReal(sale.total)}</td>
                                <td>{sale.quantity || '-'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })()
              ) : (
                <p className="user-sales-empty">Selecione um ano e mês para visualizar</p>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}




















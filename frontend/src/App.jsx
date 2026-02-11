import React, { useEffect, useState } from 'react'
import axios from 'axios'
import SaleForm from './components/SaleForm'
import SaleList from './components/SaleList'
import CommissionSummary from './components/CommissionSummary'
import ChartView from './components/ChartView'
import NotesPanel from './NotesPanel'
import Login from './components/Login'

const API = `${import.meta.env.VITE_API_URL}/api`

const PRESET_COLORS = [
  { name: 'Verde', hex: '#1e7145', dark: '#0f4620', light: '#4ade80' },
  { name: 'Azul', hex: '#0d47a1', dark: '#051541', light: '#2196f3' },
  { name: 'Vermelho', hex: '#d32f2f', dark: '#7f1d1d', light: '#ef4444' },
  { name: 'Roxo', hex: '#6a1b9a', dark: '#360853', light: '#9c27b0' },
  { name: 'All Black', hex: '#1a1a1a', dark: '#0d0d0d', light: '#2d2d2d' },
]

export default function App(){
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('authenticated') === 'true'
  })
  const [sales, setSales] = useState([])
  const [editing, setEditing] = useState(null)
  const [copiedSale, setCopiedSale] = useState(null)
  const [pastedSale, setPastedSale] = useState(null)
  const [commissions, setCommissions] = useState({ new: 5, recap: 8, recapping: 10, service: 0 })
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved === 'true'
  })
  const [primaryColor, setPrimaryColor] = useState(() => {
    const saved = localStorage.getItem('primaryColor')
    return saved || PRESET_COLORS[0].hex
  })
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [availableMonths, setAvailableMonths] = useState([])
  const [monthsWithData, setMonthsWithData] = useState([])
  const [currentMonth, setCurrentMonth] = useState(() => {
    const saved = localStorage.getItem('currentMonth')
    if (saved) {
      return saved
    }
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  })
  const [showMonthSelector, setShowMonthSelector] = useState(false)
  const [selectedYear, setSelectedYear] = useState(() => {
    const saved = localStorage.getItem('currentMonth')
    if (saved) {
      return parseInt(saved.split('-')[0])
    }
    return new Date().getFullYear()
  })
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('currentMonth')
    if (saved) {
      return parseInt(saved.split('-')[1])
    }
    return new Date().getMonth() + 1
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

  const handleLogin = () => {
    setIsAuthenticated(true)
    localStorage.setItem('authenticated', 'true')
    // Recarregar dados após login
    setTimeout(() => {
      load()
      loadCommissions()
      loadMonths()
    }, 0)
  }

  const handleLogout = () => {
    openConfirm('Deseja realmente sair do sistema?', () => {
      setIsAuthenticated(false)
      localStorage.removeItem('authenticated')
    })
  }

  const openConfirm = (message, onConfirm) => {
    setConfirmState({ open: true, message, onConfirm })
  }

  const closeConfirm = () => {
    setConfirmState({ open: false, message: '', onConfirm: null })
  }

  const handleConfirm = async () => {
    if (confirmState.onConfirm) {
      await confirmState.onConfirm()
    }
    closeConfirm()
  }

  // Se não estiver autenticado, mostra tela de login
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} primaryColor={primaryColor} darkMode={darkMode} />
  }

  const load = async ()=>{
    const res = await axios.get(`${API}/sales?month=${currentMonth}`)
    setSales(res.data)
    // Atualiza lista de meses com dados
    if (res.data.length > 0) {
      setMonthsWithData(prev => 
        prev.includes(currentMonth) ? prev : [...prev, currentMonth]
      )
    }
  }

  const loadMonths = async () => {
    const res = await axios.get(`${API}/months`)
    setAvailableMonths(res.data)
  }

  const loadCommissions = async ()=>{
    const res = await axios.get(`${API}/commissions`)
    setCommissions(res.data)
  }

  useEffect(()=>{ 
    if (isAuthenticated) {
      load()
      loadCommissions()
      loadMonths()
    }
  }, [isAuthenticated])

  // Aplicar estilos imediatamente na montagem
  useEffect(() => {
    // Aplicar modo escuro
    if (darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
    
    // Aplicar cor primária
    applyColorTheme(primaryColor)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      load()
    }
  }, [currentMonth])

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
    // Encontrar a cor presente para obter variações
    applyColorTheme(primaryColor)
    
    localStorage.setItem('primaryColor', primaryColor)
  }, [primaryColor])

  const applyColor = (colorHex) => {
    setPrimaryColor(colorHex)
  }

  const handleColorSelect = (colorHex) => {
    applyColor(colorHex)
  }

  const create = async (payload)=>{
    await axios.post(`${API}/sales`, { ...payload, month: currentMonth })
    // Marca mês como tendo dados
    setMonthsWithData(prev => 
      prev.includes(currentMonth) ? prev : [...prev, currentMonth]
    )
    await load()
    await loadMonths()
    setChartRefresh(prev => prev + 1)
  }
  const update = async (id, payload)=>{
    await axios.put(`${API}/sales/${id}`, { ...payload, month: currentMonth })
    setEditing(null)
    await load()
    setChartRefresh(prev => prev + 1)
  }
  const remove = (id)=>{
    openConfirm('Deseja realmente apagar essa venda?', async () => {
      await axios.delete(`${API}/sales/${id}?month=${currentMonth}`)
      await load()
      // Após deletar, recarrega para verificar se ficou vazio
      const res = await axios.get(`${API}/sales?month=${currentMonth}`)
      if (res.data.length === 0) {
        setMonthsWithData(prev => prev.filter(m => m !== currentMonth))
      }
      setChartRefresh(prev => prev + 1)
    })
  }

  const handleCopy = (sale) => {
    // Remove id e mantém os outros dados
    const { id, ...saleData } = sale
    setCopiedSale(saleData)
  }

  const handlePaste = () => {
    if (copiedSale) {
      // Preenche o formulário com os dados copiados (sem id, para criar nova venda)
      setEditing(null)
      setPastedSale({ ...copiedSale, date: currentMonth + '-01' })
      // Remove o copiedSale após colar para que o botão desapareça
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

  const handleYearChange = (year) => {
    setSelectedYear(year)
    const monthStr = `${year}-${String(selectedMonth).padStart(2, '0')}`
    if (availableMonths.includes(monthStr)) {
      setCurrentMonth(monthStr)
    }
  }

  const handlePrevYear = () => {
    setSelectedYear(prev => Math.max(2026, prev - 1))
  }

  const handleNextYear = () => {
    setSelectedYear(prev => prev + 1)
  }

  const handleSelectMonth = (monthNum) => {
    const monthStr = `${selectedYear}-${String(monthNum).padStart(2, '0')}`
    setCurrentMonth(monthStr)
    setShowMonthSelector(false)
  }

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  const formatMonthName = (monthStr) => {
    const [year, month] = monthStr.split('-')
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  const handleCommissionChange = (updatedCommissions) => {
    setCommissions(updatedCommissions)
  }

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
                    style={{
                      background: `linear-gradient(135deg, ${color.hex} 0%, ${color.dark} 100%)`,
                    }}
                  >
                    <span className="color-name">{color.name}</span>
                    {primaryColor === color.hex && <span className="color-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <h1>Tabela de Vendas</h1>
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
      </div>
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
      {confirmState.open && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className="modal-header">
              <h3 id="confirm-title">CONFIRMAÇÃO</h3>
              <button className="modal-close" onClick={closeConfirm} aria-label="Fechar">
                ✕
              </button>
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
    </div>
  )
}

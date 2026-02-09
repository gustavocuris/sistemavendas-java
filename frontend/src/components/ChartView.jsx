import React, { useEffect, useState } from 'react'
import axios from 'axios'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const API = `${import.meta.env.VITE_API_URL}/api`

// Função para converter HEX para RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 }
}

// Função para converter RGB para HEX
const rgbToHex = (r, g, b) => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

// Função para converter RGB para HSL
const rgbToHsl = (r, g, b) => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
      default: h = 0
    }
  }
  return { h, s, l }
}

// Função para converter HSL para RGB
const hslToRgb = (h, s, l) => {
  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

// Função melhorada para gerar tons de uma cor
const generateColorTones = (baseColor, count = 12) => {
  const rgb = hexToRgb(baseColor)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const colors = []
  
  // Gera tons variando a luminosidade mantendo o hue e saturation
  for (let i = 0; i < count; i++) {
    // Varia a luminosidade de 35% a 75%
    const lightness = 0.35 + (i / (count - 1)) * 0.4
    const newRgb = hslToRgb(hsl.h, hsl.s, lightness)
    colors.push(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
  }
  
  return colors
}

const ChartView = ({ year, onClose, refreshKey, primaryColor, darkMode }) => {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(darkMode || false)

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]

  useEffect(() => {
    setIsDarkMode(document.body.classList.contains('dark-mode'))
    
    // Observer para detectar mudanças de tema
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.body.classList.contains('dark-mode'))
    })
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    })
    
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    loadChartData()
  }, [year, refreshKey])

  const loadChartData = async () => {
    setLoading(true)
    try {
      const data = []

      for (let month = 1; month <= 12; month++) {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`
        try {
          const res = await axios.get(`${API}/sales?month=${monthStr}`)
          const sales = res.data || []

          let totalAmount = 0
          if (Array.isArray(sales)) {
            totalAmount = sales.reduce((sum, sale) => {
              // Tenta acessar 'total' ou 'amount' dependendo da estrutura dos dados
              const saleAmount = typeof sale.total === 'number' 
                ? sale.total
                : typeof sale.total === 'string' 
                  ? parseFloat(sale.total.replace(/[^0-9.,]/g, '').replace(',', '.'))
                  : typeof sale.amount === 'number'
                    ? sale.amount
                    : typeof sale.amount === 'string'
                      ? parseFloat(sale.amount.replace(/[^0-9.,]/g, '').replace(',', '.'))
                      : 0
              return sum + (isNaN(saleAmount) ? 0 : saleAmount)
            }, 0)
          }

          data.push({
            month: monthNames[month - 1],
            monthShort: monthNames[month - 1].substring(0, 3),
            sales: Array.isArray(sales) ? sales.length : 0,
            amount: isNaN(totalAmount) ? 0 : parseFloat(totalAmount.toFixed(2)),
            monthNum: month,
          })
        } catch (monthErr) {
          console.warn(`Erro ao carregar mês ${monthStr}:`, monthErr)
          data.push({
            month: monthNames[month - 1],
            monthShort: monthNames[month - 1].substring(0, 3),
            sales: 0,
            amount: 0,
            monthNum: month,
          })
        }
      }

      setChartData(data)
    } catch (err) {
      console.error('Erro ao carregar dados do gráfico:', err)
      setChartData([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="chart-overlay">
        <div className="chart-modal">
          <div className="chart-header">
            <h2>Carregando gráfico...</h2>
            <button className="chart-close-btn" onClick={onClose} title="Fechar gráfico">
              ✕
            </button>
          </div>
          <div style={{ padding: '40px', textAlign: 'center', color: isDarkMode ? '#e0e0e0' : '#2d3748' }}>
            <p style={{ fontSize: '1.1em', fontWeight: 600 }}>Carregando dados de vendas...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-overlay">
        <div className="chart-modal">
          <div className="chart-header">
            <h2>Gráfico de Vendas - {year}</h2>
            <button className="chart-close-btn" onClick={onClose} title="Fechar gráfico">
              ✕
            </button>
          </div>
          <div style={{ padding: '40px', textAlign: 'center', color: isDarkMode ? '#e0e0e0' : '#2d3748' }}>
            <p style={{ fontSize: '1.1em', fontWeight: 600 }}>Nenhum dado de vendas disponível para {year}</p>
          </div>
        </div>
      </div>
    )
  }

  const maxAmount = Math.max(...chartData.map((d) => d.amount), 1)
  
  // Gera tons dinâmicos da cor principal escolhida
  const colors = generateColorTones(primaryColor || '#1e7145', 12)
  
  const gridStroke = isDarkMode ? '#444444' : '#e0e0e0'
  const axisColor = isDarkMode ? '#e0e0e0' : '#2d3748'
  const tooltipBgColor = isDarkMode ? '#1a1a1a' : '#ffffff'
  const tooltipBorderColor = isDarkMode ? '#555555' : '#e0e0e0'
  const tooltipTextColor = isDarkMode ? '#e0e0e0' : '#2d3748'

  return (
    <div className="chart-overlay">
      <div className="chart-modal">
        <div className="chart-header">
          <h2>Gráfico de Vendas - {year}</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              className="chart-refresh-btn" 
              onClick={loadChartData} 
              title="Recarregar dados"
              disabled={loading}
            >
              {loading ? '⟳' : '↻'}
            </button>
            <button className="chart-close-btn" onClick={onClose} title="Fechar gráfico">
              ✕
            </button>
          </div>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="monthShort"
                tick={{ fontSize: 14, fontWeight: 600, fill: axisColor }}
              />
              <YAxis
                tick={{ fontSize: 12, fontWeight: 600, fill: axisColor }}
                label={{ value: 'Valor Total (R$)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12, fontWeight: 600, fill: axisColor } }}
              />
              <Tooltip
                formatter={(value) => [
                  typeof value === 'number' ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value,
                ]}
                labelFormatter={(label) => `Mês: ${label}`}
                contentStyle={{
                  backgroundColor: tooltipBgColor,
                  border: `2px solid ${tooltipBorderColor}`,
                  borderRadius: '8px',
                  padding: '12px',
                  boxShadow: isDarkMode ? '0 4px 12px rgba(0, 0, 0, 0.5)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: tooltipTextColor,
                }}
                cursor={{ fill: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 14, fontWeight: 600, paddingTop: 20, color: axisColor }}
                formatter={() => 'Total de Vendas'}
              />
              <Bar dataKey="amount" fill="#1e7145" radius={[8, 8, 0, 0]} isAnimationActive={true}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-stats">
          <div className="stat-item">
            <span className="stat-label">Total Geral:</span>
            <span className="stat-value">
              {chartData.reduce((sum, d) => sum + d.amount, 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Média Mensal:</span>
            <span className="stat-value">
              {(chartData.reduce((sum, d) => sum + d.amount, 0) / 12).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total de Transações:</span>
            <span className="stat-value">{chartData.reduce((sum, d) => sum + d.sales, 0)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChartView

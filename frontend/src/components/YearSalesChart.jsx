import React, { Component, useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { getAllVisibleSales, getVisibleSalesForUser } from '../utils/visibleSales'

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const createEmptyTotals = () => MONTH_LABELS.map((month) => ({ month, total: 0, count: 0 }))

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const normalizeHex = (hex) => {
  if (typeof hex !== 'string') return null
  const cleaned = hex.trim().replace('#', '')
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const expanded = cleaned.split('').map((char) => `${char}${char}`).join('')
    return `#${expanded.toLowerCase()}`
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) return `#${cleaned.toLowerCase()}`
  return null
}

const hexToRgb = (hex) => {
  const normalized = normalizeHex(hex)
  if (!normalized) return null
  const raw = normalized.slice(1)
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16)
  }
}

const rgbToHex = ({ r, g, b }) => {
  const toHex = (channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const rgbToHsl = ({ r, g, b }) => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
  }

  h = Math.round(h * 60)
  if (h < 0) h += 360

  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

  return { h, s, l }
}

const hslToRgb = ({ h, s, l }) => {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let rn = 0
  let gn = 0
  let bn = 0

  if (h >= 0 && h < 60) {
    rn = c; gn = x; bn = 0
  } else if (h < 120) {
    rn = x; gn = c; bn = 0
  } else if (h < 180) {
    rn = 0; gn = c; bn = x
  } else if (h < 240) {
    rn = 0; gn = x; bn = c
  } else if (h < 300) {
    rn = x; gn = 0; bn = c
  } else {
    rn = c; gn = 0; bn = x
  }

  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255)
  }
}

const mixHex = (baseHex, targetHex, amount) => {
  const base = hexToRgb(baseHex)
  const target = hexToRgb(targetHex)
  if (!base || !target) return baseHex
  const t = clamp(amount, 0, 1)
  return rgbToHex({
    r: base.r + (target.r - base.r) * t,
    g: base.g + (target.g - base.g) * t,
    b: base.b + (target.b - base.b) * t
  })
}

const readCssPrimaryColor = () => {
  if (typeof window === 'undefined' || !window.getComputedStyle) return null
  const cssValue = window.getComputedStyle(document.documentElement).getPropertyValue('--primary-color')
  return normalizeHex(cssValue)
}

const resolveBaseColor = (primaryColor, darkMode) => {
  const normalized = normalizeHex(primaryColor)
  if (normalized) return normalized
  const cssPrimary = readCssPrimaryColor()
  if (cssPrimary) return cssPrimary
  return darkMode ? '#4ade80' : '#1e7145'
}

const buildBarColors = (baseColor, count, darkMode) => {
  if (!Number.isFinite(count) || count <= 0) return [baseColor]
  if (count === 1) return [baseColor]

  const baseRgb = hexToRgb(baseColor)
  if (!baseRgb) return Array.from({ length: count }, () => baseColor)

  const { h, s, l } = rgbToHsl(baseRgb)
  const isRedOrPink = h <= 20 || h >= 315
  const minL = clamp((darkMode
    ? (isRedOrPink ? l - 0.24 : l - 0.12)
    : l + 0.06), 0.12, 0.92)
  const maxL = clamp((darkMode
    ? (isRedOrPink ? l - 0.06 : l + 0.12)
    : l + 0.34), 0.30, 0.97)
  const safeMaxL = Math.max(minL + 0.01, maxL)

  return Array.from({ length: count }, (_, index) => {
    const position = index / (count - 1)
    const lightness = minL + (safeMaxL - minL) * position
    return rgbToHex(hslToRgb({ h, s, l: lightness }))
  })
}

const yearMonthFromAny = (rawMonth, rawDate) => {
  const monthText = String(rawMonth || '').trim()
  if (monthText) {
    const fromDash = monthText.match(/^(\d{4})-(\d{2})$/)
    if (fromDash) {
      const year = Number(fromDash[1])
      const month = Number(fromDash[2])
      if (Number.isFinite(year) && month >= 1 && month <= 12) {
        return { year, monthIndex: month - 1 }
      }
    }
  }

  const dateValue = rawDate || null
  const parsedDate = dateValue ? new Date(dateValue) : null
  if (parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime())) {
    return { year: parsedDate.getFullYear(), monthIndex: parsedDate.getMonth() }
  }

  return { year: null, monthIndex: -1 }
}

const accumulateSale = (totals, saleLike, targetYear) => {
  const { year, monthIndex } = yearMonthFromAny(saleLike?.month, saleLike?.date || saleLike?.created_at)
  if (Number.isFinite(targetYear) && year !== targetYear) return
  if (monthIndex < 0 || monthIndex > 11) return
  totals[monthIndex].total += toNumber(saleLike?.total)
  totals[monthIndex].count += 1
}

const buildMonthTotalsFromSales = (sales, targetYear) => {
  const totals = createEmptyTotals()
  const safeSales = Array.isArray(sales) ? sales : []
  safeSales.forEach((sale) => accumulateSale(totals, sale, targetYear))
  return totals
}

const collectVisibleSales = (allUsersData, users) => {
  if (!allUsersData) return []

  if (users && Array.isArray(users)) {
    return getAllVisibleSales({ users, sales: allUsersData })
  }

  if (Array.isArray(allUsersData)) {
    return getVisibleSalesForUser(allUsersData)
  }

  return getAllVisibleSales(allUsersData)
}

const monthDiffRows = (tableTotals, chartTotals) => {
  return MONTH_LABELS.map((label, index) => {
    const totalTabela = toNumber(tableTotals[index]?.total)
    const totalGrafico = toNumber(chartTotals[index]?.total)
    return {
      month: label,
      totalTabela,
      totalGrafico,
      diferenca: Number((totalTabela - totalGrafico).toFixed(2))
    }
  })
}

const buildMonthIdsFromSales = (sales, targetYear) => {
  const idsByMonth = MONTH_LABELS.map(() => new Set())
  const safeSales = Array.isArray(sales) ? sales : []

  safeSales.forEach((sale) => {
    const { year, monthIndex } = yearMonthFromAny(sale?.month, sale?.date || sale?.created_at)
    if (Number.isFinite(targetYear) && year !== targetYear) return
    if (monthIndex < 0 || monthIndex > 11) return

    const saleId = String(sale?.id || '')
    if (saleId) idsByMonth[monthIndex].add(saleId)
  })

  return idsByMonth
}

const logChartDebugDiffs = (allUsersData, users, targetYear, chartTotals) => {
  if (!import.meta.env.DEV) return

  try {
    const visibleAllSales = collectVisibleSales(allUsersData, users)
    const tableTotalsAll = buildMonthTotalsFromSales(visibleAllSales, targetYear)
    const diffAll = monthDiffRows(tableTotalsAll, chartTotals)
    console.table(diffAll.map((row) => ({ escopo: 'todos', ...row })))

    const tableIdsByMonth = buildMonthIdsFromSales(visibleAllSales, targetYear)
    const chartIdsByMonth = buildMonthIdsFromSales(visibleAllSales, targetYear)
    diffAll.forEach((row, index) => {
      if (row.diferenca === 0) return
      const idsGraficoNaoTabela = [...chartIdsByMonth[index]].filter((id) => !tableIdsByMonth[index].has(id))
      console.warn('[CHART_DIFF_ALL]', {
        month: row.month,
        totalTabela: row.totalTabela,
        totalGrafico: row.totalGrafico,
        diferenca: row.diferenca,
        idsGraficoNaoTabela
      })
    })

    const firstUserId = String(visibleAllSales.find((sale) => sale?.userId)?.userId || '')
    if (!firstUserId) return

    const oneUserSales = visibleAllSales.filter((sale) => String(sale?.userId || '') === firstUserId)
    const tableTotalsOne = buildMonthTotalsFromSales(oneUserSales, targetYear)
    const chartTotalsOne = buildMonthTotalsFromSales(oneUserSales, targetYear)
    const diffOne = monthDiffRows(tableTotalsOne, chartTotalsOne)
    console.table(diffOne.map((row) => ({ escopo: `usuario:${firstUserId}`, ...row })))

    const tableIdsByMonthOne = buildMonthIdsFromSales(oneUserSales, targetYear)
    const chartIdsByMonthOne = buildMonthIdsFromSales(oneUserSales, targetYear)
    diffOne.forEach((row, index) => {
      if (row.diferenca === 0) return
      const idsGraficoNaoTabela = [...chartIdsByMonthOne[index]].filter((id) => !tableIdsByMonthOne[index].has(id))
      console.warn('[CHART_DIFF_USER]', {
        userId: firstUserId,
        month: row.month,
        totalTabela: row.totalTabela,
        totalGrafico: row.totalGrafico,
        diferenca: row.diferenca,
        idsGraficoNaoTabela
      })
    })
  } catch (error) {
    console.error('Erro no debug de conferência do gráfico:', error)
  }
}

export function getYearTotals(allUsersData, targetYear, users) {
  try {
    const visibleSales = collectVisibleSales(allUsersData, users)
    return buildMonthTotalsFromSales(visibleSales, targetYear)
  } catch (error) {
    console.error('Erro ao calcular totais anuais:', error)
    return createEmptyTotals()
  }
}

function YearSalesChart({ allUsersData, darkMode = false, year, users, monthlyTotals, primaryColor }) {
  const safeYear = Number.isFinite(Number(year)) ? Number(year) : new Date().getFullYear()
  const [activePrimaryColor, setActivePrimaryColor] = useState(() => resolveBaseColor(primaryColor, darkMode))

  useEffect(() => {
    setActivePrimaryColor(resolveBaseColor(primaryColor, darkMode))
  }, [primaryColor, darkMode])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return undefined

    const refreshColor = () => {
      setActivePrimaryColor(resolveBaseColor(primaryColor, darkMode))
    }

    const observer = new MutationObserver(refreshColor)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] })

    return () => observer.disconnect()
  }, [primaryColor, darkMode])

  const totals = useMemo(() => {
    if (Array.isArray(monthlyTotals) && monthlyTotals.length > 0) {
      return monthlyTotals
    }
    return getYearTotals(allUsersData, safeYear, users)
  }, [monthlyTotals, allUsersData, safeYear, users])

  const barColors = useMemo(() => {
    const baseColor = resolveBaseColor(activePrimaryColor, darkMode)
    return buildBarColors(baseColor, Array.isArray(totals) ? totals.length : 0, darkMode)
  }, [activePrimaryColor, darkMode, totals])

  useEffect(() => {
    logChartDebugDiffs(allUsersData, users, safeYear, totals)
  }, [allUsersData, users, safeYear, totals])

  const hasData = Array.isArray(totals)
    && totals.length === 12
    && totals.some((item) => toNumber(item?.total) > 0 || toNumber(item?.count) > 0)

  if (!hasData) {
    return <div style={{ padding: 16, fontWeight: 700 }}>Sem dados no período</div>
  }

  return (
    <div style={{ width: '100%', height: 360 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={totals} margin={{ top: 10, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'} vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={90}
            tickFormatter={(value) => `R$ ${toNumber(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'total') return [`R$ ${toNumber(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Total']
              return [toNumber(value), 'Vendas']
            }}
          />
          <Bar dataKey="total" name="total" fill={barColors[0]} radius={[6, 6, 0, 0]}>
            {totals.map((entry, index) => (
              <Cell key={`bar-${entry?.month || index}`} fill={barColors[index % barColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Erro ao carregar gráfico', error)
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 16, fontWeight: 700 }}>Erro ao carregar gráfico</div>
    }

    return this.props.children
  }
}

export function YearSalesChartWithBoundary(props) {
  return (
    <ChartErrorBoundary>
      <YearSalesChart {...props} />
    </ChartErrorBoundary>
  )
}

export default YearSalesChart

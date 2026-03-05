import React, { Component, useEffect, useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { getVisibleSales } from '../utils/visibleSales'

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const createEmptyTotals = () => MONTH_LABELS.map((month) => ({ month, total: 0, count: 0 }))

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
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

const collectVisibleSales = (allUsersData) => {
  if (!allUsersData) return []

  if (Array.isArray(allUsersData)) {
    if (allUsersData.length === 0) return []

    const firstItem = allUsersData[0]
    const looksLikeSalesArray = typeof firstItem === 'object' && firstItem !== null
      && (Object.prototype.hasOwnProperty.call(firstItem, 'total')
        || Object.prototype.hasOwnProperty.call(firstItem, 'date')
        || Object.prototype.hasOwnProperty.call(firstItem, 'created_at')
        || Object.prototype.hasOwnProperty.call(firstItem, 'month'))

    if (looksLikeSalesArray) return getVisibleSales(allUsersData)

    return allUsersData.flatMap((userData) => getVisibleSales(userData))
  }

  if (typeof allUsersData === 'object' && allUsersData.months && typeof allUsersData.months === 'object') {
    return getVisibleSales(allUsersData)
  }

  if (typeof allUsersData === 'object') {
    return Object.values(allUsersData).flatMap((userData) => getVisibleSales(userData))
  }

  return []
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

const logChartDebugDiffs = (allUsersData, targetYear, chartTotals) => {
  if (!import.meta.env.DEV) return

  try {
    const visibleAllSales = collectVisibleSales(allUsersData)
    const tableTotalsAll = buildMonthTotalsFromSales(visibleAllSales, targetYear)
    const diffAll = monthDiffRows(tableTotalsAll, chartTotals)
    console.table(diffAll.map((row) => ({ escopo: 'todos', ...row })))

    const firstUserId = String(visibleAllSales.find((sale) => sale?.userId)?.userId || '')
    if (!firstUserId) return

    const oneUserSales = visibleAllSales.filter((sale) => String(sale?.userId || '') === firstUserId)
    const tableTotalsOne = buildMonthTotalsFromSales(oneUserSales, targetYear)
    const chartTotalsOne = buildMonthTotalsFromSales(oneUserSales, targetYear)
    const diffOne = monthDiffRows(tableTotalsOne, chartTotalsOne)
    console.table(diffOne.map((row) => ({ escopo: `usuario:${firstUserId}`, ...row })))
  } catch (error) {
    console.error('Erro no debug de conferência do gráfico:', error)
  }
}

export function getYearTotals(allUsersData, targetYear) {
  try {
    const visibleSales = collectVisibleSales(allUsersData)
    return buildMonthTotalsFromSales(visibleSales, targetYear)
  } catch (error) {
    console.error('Erro ao calcular totais anuais:', error)
    return createEmptyTotals()
  }
}

function YearSalesChart({ allUsersData, darkMode = false, year }) {
  const safeYear = Number.isFinite(Number(year)) ? Number(year) : new Date().getFullYear()
  const totals = useMemo(() => getYearTotals(allUsersData, safeYear), [allUsersData, safeYear])

  useEffect(() => {
    logChartDebugDiffs(allUsersData, safeYear, totals)
  }, [allUsersData, safeYear, totals])

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
          <Bar dataKey="total" name="total" fill={darkMode ? '#4ade80' : '#1e7145'} radius={[6, 6, 0, 0]} />
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

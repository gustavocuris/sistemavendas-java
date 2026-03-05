import React, { Component, useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

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

const monthIndexFromAny = (rawMonth, rawDate) => {
  const monthText = String(rawMonth || '').trim()
  if (monthText) {
    const fromDash = monthText.match(/^\d{4}-(\d{2})$/)
    if (fromDash) {
      const monthNumber = Number(fromDash[1])
      if (monthNumber >= 1 && monthNumber <= 12) return monthNumber - 1
    }

    const onlyMonth = monthText.match(/^(\d{2})$/)
    if (onlyMonth) {
      const monthNumber = Number(onlyMonth[1])
      if (monthNumber >= 1 && monthNumber <= 12) return monthNumber - 1
    }
  }

  const dateValue = rawDate || null
  const parsedDate = dateValue ? new Date(dateValue) : null
  if (parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime())) {
    return parsedDate.getMonth()
  }

  return -1
}

const accumulateSale = (totals, saleLike, targetYear) => {
  const { year, monthIndex } = yearMonthFromAny(saleLike?.month, saleLike?.date || saleLike?.created_at)
  if (Number.isFinite(targetYear) && year !== targetYear) return
  if (monthIndex < 0 || monthIndex > 11) return
  totals[monthIndex].total += toNumber(saleLike?.total)
  totals[monthIndex].count += 1
}

export function getYearTotals(allUsersData, targetYear) {
  const totals = createEmptyTotals()

  try {
    if (!allUsersData) return totals

    if (Array.isArray(allUsersData)) {
      allUsersData.forEach((item) => {
        if (!item) return

        if (Array.isArray(item?.sales)) {
          item.sales.forEach((sale) => accumulateSale(totals, sale, targetYear))
          return
        }

        if (item?.months && typeof item.months === 'object' && !Array.isArray(item.months)) {
          Object.entries(item.months).forEach(([monthKey, monthData]) => {
            const sales = Array.isArray(monthData?.sales) ? monthData.sales : []
            sales.forEach((sale) => accumulateSale(totals, { ...sale, month: monthKey }, targetYear))
          })
          return
        }

        if (item?.month && Object.prototype.hasOwnProperty.call(item, 'total')) {
          const { year, monthIndex } = yearMonthFromAny(item.month, null)
          if (Number.isFinite(targetYear) && year !== targetYear) return
          if (monthIndex < 0 || monthIndex > 11) return
          totals[monthIndex].total += toNumber(item.total)
          totals[monthIndex].count += toNumber(item.count)
          return
        }

        if (Object.prototype.hasOwnProperty.call(item, 'total')) {
          accumulateSale(totals, item, targetYear)
        }
      })

      return totals
    }

    if (allUsersData && typeof allUsersData === 'object') {
      Object.values(allUsersData).forEach((userData) => {
        const months = userData?.months
        if (!months || typeof months !== 'object') return

        Object.entries(months).forEach(([monthKey, monthData]) => {
          const sales = Array.isArray(monthData?.sales) ? monthData.sales : []
          sales.forEach((sale) => accumulateSale(totals, { ...sale, month: monthKey }, targetYear))
        })
      })
    }
  } catch (error) {
    console.error('Erro ao calcular totais anuais:', error)
    return createEmptyTotals()
  }

  return totals
}

function YearSalesChart({ allUsersData, darkMode = false, year }) {
  const safeYear = Number.isFinite(Number(year)) ? Number(year) : new Date().getFullYear()
  const totals = useMemo(() => getYearTotals(allUsersData, safeYear), [allUsersData, safeYear])

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

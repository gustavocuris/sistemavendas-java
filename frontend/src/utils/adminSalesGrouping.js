function getSaleDate(value) {
  if (typeof value === 'string') {
    const normalized = value.trim()

    const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/)
    if (isoMatch) {
      const year = Number(isoMatch[1])
      const month = Number(isoMatch[2])
      const day = Number(isoMatch[3])
      return new Date(year, month - 1, day, 12, 0, 0)
    }

    const brMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (brMatch) {
      const day = Number(brMatch[1])
      const month = Number(brMatch[2])
      const year = Number(brMatch[3])
      return new Date(year, month - 1, day, 12, 0, 0)
    }
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function resolveSaleTotal(sale) {
  const explicitTotal = Number(sale?.total || 0)
  if (explicitTotal > 0) return explicitTotal

  const quantity = Number(sale?.quantity || 0)
  const unitPrice = Number(sale?.unit_price || sale?.unitPrice || 0)
  const calculated = quantity * unitPrice
  return Number.isFinite(calculated) ? calculated : 0
}

export function groupSalesByYearMonth(allSales) {
  const sales = Array.isArray(allSales) ? allSales : []
  const grouped = {}

  sales.forEach((sale) => {
    const date = getSaleDate(sale?.__dateValue || sale?.date || sale?.created_at || sale?.createdAt)
    if (!date) return

    const year = String(date.getFullYear())
    const monthKey = String(date.getMonth() + 1).padStart(2, '0')
    const monthName = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    const total = resolveSaleTotal(sale)

    if (!grouped[year]) {
      grouped[year] = {
        year,
        total: 0,
        count: 0,
        months: {}
      }
    }

    if (!grouped[year].months[monthKey]) {
      grouped[year].months[monthKey] = {
        key: monthKey,
        monthName,
        total: 0,
        count: 0,
        sales: []
      }
    }

    grouped[year].total += total
    grouped[year].count += 1

    grouped[year].months[monthKey].total += total
    grouped[year].months[monthKey].count += 1
    grouped[year].months[monthKey].sales.push({
      ...sale,
      __groupDate: date
    })
  })

  return Object.values(grouped)
    .sort((a, b) => Number(b.year) - Number(a.year))
    .map((yearGroup) => ({
      ...yearGroup,
      months: Object.values(yearGroup.months)
        .sort((a, b) => Number(b.key) - Number(a.key))
        .map((monthGroup) => ({
          ...monthGroup,
          sales: [...monthGroup.sales].sort((a, b) => b.__groupDate - a.__groupDate)
        }))
    }))
}

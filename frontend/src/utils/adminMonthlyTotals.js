const MONTHS = [
  { key: '01', label: 'Jan' },
  { key: '02', label: 'Fev' },
  { key: '03', label: 'Mar' },
  { key: '04', label: 'Abr' },
  { key: '05', label: 'Mai' },
  { key: '06', label: 'Jun' },
  { key: '07', label: 'Jul' },
  { key: '08', label: 'Ago' },
  { key: '09', label: 'Set' },
  { key: '10', label: 'Out' },
  { key: '11', label: 'Nov' },
  { key: '12', label: 'Dez' }
]

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const parseSaleCalendarDate = (value) => {
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

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const resolveSaleTotal = (sale) => {
  const explicit = toNumber(sale?.total)
  if (explicit > 0) return explicit

  const quantity = toNumber(sale?.quantity)
  const unitPrice = toNumber(sale?.unit_price ?? sale?.unitPrice)
  const calculated = quantity * unitPrice
  return Number.isFinite(calculated) ? calculated : 0
}

export function getMonthlyTotalsFromActiveAccounts(allUsers) {
  try {
    const users = Array.isArray(allUsers?.users)
      ? allUsers.users
      : Array.isArray(allUsers)
        ? allUsers
        : []

    const targetYear = String(allUsers?.year || new Date().getFullYear())
    const activeUsers = users.filter((user) => user && user.active !== false && user.role !== 'admin')

    const monthMap = MONTHS.reduce((acc, item) => {
      acc[item.key] = { month: item.label, total: 0, count: 0 }
      return acc
    }, {})

    activeUsers.forEach((user) => {
      const yearsMap = user?.salesByYearMonth && typeof user.salesByYearMonth === 'object'
        ? user.salesByYearMonth
        : {}

      const monthsMap = yearsMap[targetYear] && typeof yearsMap[targetYear] === 'object'
        ? yearsMap[targetYear]
        : {}

      const seenSales = new Set()

      Object.entries(monthsMap).forEach(([monthKeyFromGroup, monthData]) => {
        const sales = Array.isArray(monthData?.sales) ? monthData.sales : []

        if (sales.length === 0) {
          const safeMonth = String(monthKeyFromGroup).padStart(2, '0')
          if (monthMap[safeMonth]) {
            monthMap[safeMonth].total += toNumber(monthData?.total)
            monthMap[safeMonth].count += toNumber(monthData?.count)
          }
          return
        }

        sales.forEach((sale) => {
          const monthKey = String(monthKeyFromGroup).padStart(2, '0')

          if (!monthMap[monthKey]) return

          const uniqueKey = sale?.id
            ? `${String(user?.id || user?.username || '')}::${String(sale.id)}`
            : `${String(user?.id || user?.username || '')}::${String(sale?.date || sale?.created_at || sale?.createdAt || '')}::${String(sale?.client || '')}::${String(sale?.product || '')}::${String(sale?.quantity || '')}::${String(sale?.unit_price || sale?.unitPrice || '')}::${String(sale?.total || '')}`

          if (seenSales.has(uniqueKey)) return
          seenSales.add(uniqueKey)

          monthMap[monthKey].total += resolveSaleTotal(sale)
          monthMap[monthKey].count += 1
        })
      })
    })

    return MONTHS.map(({ key }) => monthMap[key])
  } catch (error) {
    console.error('Erro ao calcular totais mensais das contas ativas:', error)
    return MONTHS.map(({ label }) => ({ month: label, total: 0, count: 0 }))
  }
}

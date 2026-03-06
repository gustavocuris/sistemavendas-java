import { normalizeMojibakeText } from './text'
import { isSaleVisible } from './visibleSales'

const MONTHS = [
  { key: '01', shortLabel: 'Jan' },
  { key: '02', shortLabel: 'Fev' },
  { key: '03', shortLabel: 'Mar' },
  { key: '04', shortLabel: 'Abr' },
  { key: '05', shortLabel: 'Mai' },
  { key: '06', shortLabel: 'Jun' },
  { key: '07', shortLabel: 'Jul' },
  { key: '08', shortLabel: 'Ago' },
  { key: '09', shortLabel: 'Set' },
  { key: '10', shortLabel: 'Out' },
  { key: '11', shortLabel: 'Nov' },
  { key: '12', shortLabel: 'Dez' }
]

function resolveSaleTotal(sale) {
  const explicit = Number(sale?.total || 0)
  if (explicit > 0) return explicit

  const quantity = Number(sale?.quantity || 0)
  const unitPrice = Number(sale?.unit_price || sale?.unitPrice || 0)
  const calculated = quantity * unitPrice
  return Number.isFinite(calculated) ? calculated : 0
}

function resolveSeller(account, sale) {
  return normalizeMojibakeText(account?.displayName || account?.username || sale?.userName || sale?.seller || '-')
}

function buildSaleUniqueKey(accountKey, sale, normalizedDate) {
  if (sale?.id != null) {
    return `${accountKey}::${String(sale.id)}`
  }

  const dateStamp = normalizedDate
    ? `${normalizedDate.getFullYear()}-${String(normalizedDate.getMonth() + 1).padStart(2, '0')}-${String(normalizedDate.getDate()).padStart(2, '0')}`
    : String(sale?.date || sale?.created_at || sale?.createdAt || '')

  return `${accountKey}::${dateStamp}::${String(sale?.client || '')}::${String(sale?.product || '')}::${String(sale?.quantity || '')}::${String(sale?.unit_price || sale?.unitPrice || '')}::${String(sale?.total || '')}`
}

export function normalizeSaleDate(saleOrRaw) {
  if (typeof saleOrRaw === 'object' && saleOrRaw !== null) {
    const sourceYear = String(saleOrRaw.__sourceYear || '').trim()
    const sourceMonth = String(saleOrRaw.__sourceMonth || '').trim()
    if (sourceYear && sourceMonth) {
      const year = Number(sourceYear)
      const month = Number(sourceMonth)
      if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
        return new Date(year, month - 1, 1, 12, 0, 0)
      }
    }
  }

  const raw = typeof saleOrRaw === 'object' && saleOrRaw !== null
    ? saleOrRaw.__dateValue || saleOrRaw.date || saleOrRaw.created_at || saleOrRaw.createdAt
    : saleOrRaw

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate(), 12, 0, 0)
  }

  if (typeof raw === 'string') {
    const normalized = raw.trim()

    const brMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (brMatch) {
      const day = Number(brMatch[1])
      const month = Number(brMatch[2])
      const year = Number(brMatch[3])
      return new Date(year, month - 1, day, 12, 0, 0)
    }

    const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/)
    if (isoMatch) {
      const year = Number(isoMatch[1])
      const month = Number(isoMatch[2])
      const day = Number(isoMatch[3])
      return new Date(year, month - 1, day, 12, 0, 0)
    }
  }

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0)
  }

  return null
}

export function getSaleMonthIndex(saleDate) {
  if (!(saleDate instanceof Date) || Number.isNaN(saleDate.getTime())) return null
  return saleDate.getMonth() + 1
}

export function getSaleYear(saleDate) {
  if (!(saleDate instanceof Date) || Number.isNaN(saleDate.getTime())) return null
  return saleDate.getFullYear()
}

export function getAllValidSalesFromActiveAccounts(allAccounts) {
  const accounts = Array.isArray(allAccounts) ? allAccounts : []
  const validAccounts = accounts.filter((account) => account && account.active !== false && String(account.role || '').toLowerCase() !== 'admin')
  const merged = []
  const seenSales = new Set()

  validAccounts.forEach((account) => {
    const accountKey = String(account?.id || account?.username || account?.displayName || '')
    const accountLabel = normalizeMojibakeText(account?.displayName || account?.username || accountKey || '-')

    const yearsMap = account?.salesByYearMonth && typeof account.salesByYearMonth === 'object'
      ? account.salesByYearMonth
      : {}

    Object.entries(yearsMap).forEach(([yearKey, monthsMap]) => {
      if (!monthsMap || typeof monthsMap !== 'object') return

      Object.entries(monthsMap).forEach(([monthKey, monthData]) => {
        const sales = Array.isArray(monthData?.sales) ? monthData.sales : []

        sales.forEach((sale) => {
          if (!isSaleVisible(sale)) return

          const saleWithSource = {
            ...sale,
            __sourceYear: String(yearKey || ''),
            __sourceMonth: String(monthKey || '').padStart(2, '0'),
            __dateValue: sale?.date || sale?.created_at || sale?.createdAt || `${yearKey}-${String(monthKey).padStart(2, '0')}-01`
          }

          const normalizedDate = normalizeSaleDate(saleWithSource)
          if (!normalizedDate) return

          const uniqueKey = buildSaleUniqueKey(accountKey, saleWithSource, normalizedDate)
          if (seenSales.has(uniqueKey)) return
          seenSales.add(uniqueKey)

          merged.push({
            ...saleWithSource,
            __normalizedDate: normalizedDate,
            __sellerName: resolveSeller(account, saleWithSource),
            __accountKey: accountKey,
            __accountLabel: accountLabel,
            __totalValue: resolveSaleTotal(saleWithSource)
          })
        })
      })
    })
  })

  return merged
}

export function groupSalesByYearAndMonth(validSales) {
  const sales = Array.isArray(validSales) ? validSales : []
  const grouped = {}

  sales.forEach((sale) => {
    const normalizedDate = normalizeSaleDate(sale)
    if (!normalizedDate) return

    const yearNumber = getSaleYear(normalizedDate)
    const monthIndex = getSaleMonthIndex(normalizedDate)
    if (!yearNumber || !monthIndex) return

    const year = String(yearNumber)
    const monthKey = String(monthIndex).padStart(2, '0')
    const monthName = new Date(yearNumber, monthIndex - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

    if (!grouped[year]) {
      grouped[year] = { year, total: 0, count: 0, months: {} }
    }

    if (!grouped[year].months[monthKey]) {
      grouped[year].months[monthKey] = {
        key: monthKey,
        monthIndex,
        monthName,
        total: 0,
        count: 0,
        sales: []
      }
    }

    grouped[year].total += Number(sale?.__totalValue || 0)
    grouped[year].count += 1

    grouped[year].months[monthKey].total += Number(sale?.__totalValue || 0)
    grouped[year].months[monthKey].count += 1
    grouped[year].months[monthKey].sales.push({
      ...sale,
      __normalizedDate: normalizedDate
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
          sales: [...monthGroup.sales].sort((a, b) => {
            const aTime = a?.__normalizedDate instanceof Date ? a.__normalizedDate.getTime() : 0
            const bTime = b?.__normalizedDate instanceof Date ? b.__normalizedDate.getTime() : 0
            return bTime - aTime
          })
        }))
    }))
}

export function getMonthlyTotalsForYear(groupedSales, year) {
  const targetYear = String(year || new Date().getFullYear())
  const yearGroup = (Array.isArray(groupedSales) ? groupedSales : []).find((item) => String(item?.year) === targetYear)
  const monthsMap = (yearGroup?.months || []).reduce((acc, month) => {
    acc[String(month.key)] = month
    return acc
  }, {})

  return MONTHS.map(({ key, shortLabel }) => {
    const month = monthsMap[key]
    return {
      month: shortLabel,
      total: Number(month?.total || 0),
      count: Number(month?.count || 0)
    }
  })
}

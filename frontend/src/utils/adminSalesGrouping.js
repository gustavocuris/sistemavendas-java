import { normalizeMojibakeText } from './text'
import { isSaleVisible } from './visibleSales'

function toMiddayDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
}

function parseMonthKey(monthKey) {
  const parsed = Number(String(monthKey || '').trim())
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) return null
  return parsed
}

function resolveStoreName(account, sale) {
  return normalizeMojibakeText(
    sale?.store ||
    sale?.loja ||
    sale?.store_name ||
    account?.store ||
    account?.loja ||
    account?.displayName ||
    account?.username ||
    '-'
  )
}

export function normalizeSaleDate(sale, monthKey, year) {
  const raw = sale?.date || sale?.created_at || sale?.createdAt || sale?.__dateValue

  if (raw instanceof Date) {
    const normalized = toMiddayDate(raw)
    if (normalized) return normalized
  }

  if (typeof raw === 'string') {
    const normalized = raw.trim()

    const brMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (brMatch) {
      const day = Number(brMatch[1])
      const month = Number(brMatch[2])
      const parsedYear = Number(brMatch[3])
      const parsed = toMiddayDate(new Date(parsedYear, month - 1, day, 12, 0, 0))
      if (parsed) return parsed
    }

    const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/)
    if (isoMatch) {
      const parsedYear = Number(isoMatch[1])
      const month = Number(isoMatch[2])
      const day = Number(isoMatch[3])
      const parsed = toMiddayDate(new Date(parsedYear, month - 1, day, 12, 0, 0))
      if (parsed) return parsed
    }

    const parsed = toMiddayDate(new Date(normalized))
    if (parsed) return parsed
  }

  const fallbackYear = Number(String(year || sale?.__sourceYear || '').trim())
  const fallbackMonth = parseMonthKey(monthKey || sale?.__sourceMonth)
  if (Number.isFinite(fallbackYear) && fallbackYear > 0 && fallbackMonth) {
    return new Date(fallbackYear, fallbackMonth - 1, 1, 12, 0, 0)
  }

  return null
}

export function getAllSalesFromAllActiveAccounts(allAccounts) {
  const accounts = Array.isArray(allAccounts) ? allAccounts : []
  const merged = []
  const uniqueSales = new Set()

  accounts.forEach((account) => {
    if (!account || account.active === false || String(account.role || '').toLowerCase() === 'admin') return

    const accountId = String(account?.id || account?.username || account?.displayName || '')
    const sellerName = normalizeMojibakeText(account?.displayName || account?.username || '-')
    const yearsMap = account?.salesByYearMonth && typeof account.salesByYearMonth === 'object'
      ? account.salesByYearMonth
      : {}

    Object.entries(yearsMap).forEach(([yearKey, monthsMap]) => {
      if (!monthsMap || typeof monthsMap !== 'object') return

      Object.entries(monthsMap).forEach(([monthKeyRaw, monthData]) => {
        const monthKey = String(monthKeyRaw || '').padStart(2, '0')
        const sales = Array.isArray(monthData?.sales) ? monthData.sales : []
        const sourceYear = Number(String(yearKey || '').trim())
        const sourceMonthIndex = parseMonthKey(monthKey)
        if (!Number.isFinite(sourceYear) || sourceYear <= 0 || !sourceMonthIndex) return

        sales.forEach((sale) => {
          if (!isSaleVisible(sale)) return

          const normalizedDate = normalizeSaleDate(sale, monthKey, yearKey)
          if (!normalizedDate) return

          const year = sourceYear
          const monthIndex = sourceMonthIndex
          const normalizedMonthKey = monthKey

          const uniqueKey = sale?.id != null
            ? `${accountId}::${String(sale.id)}`
            : `${accountId}::${String(yearKey)}-${String(monthKey)}::${String(sale?.client || '')}::${String(sale?.product || '')}::${String(sale?.quantity || '')}::${String(sale?.unit_price || sale?.unitPrice || '')}::${String(sale?.total || '')}`

          if (uniqueSales.has(uniqueKey)) return
          uniqueSales.add(uniqueKey)

          merged.push({
            ...sale,
            accountId,
            sellerName,
            storeName: resolveStoreName(account, sale),
            year,
            monthKey: normalizedMonthKey,
            monthIndex,
            normalizedDate,
            __accountKey: accountId,
            __sellerName: sellerName,
            __storeName: resolveStoreName(account, sale),
            __sourceYear: String(sourceYear),
            __sourceMonth: String(monthKey),
            __dateValue: normalizedDate
          })
        })
      })
    })
  })

  return merged
}

export const getAllSalesFromActiveAccounts = getAllSalesFromAllActiveAccounts

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
    const sourceYear = Number(sale?.year || sale?.__sourceYear)
    const sourceMonth = parseMonthKey(sale?.monthIndex || sale?.monthKey || sale?.__sourceMonth)
    const date = normalizeSaleDate(sale, sourceMonth, sourceYear)
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

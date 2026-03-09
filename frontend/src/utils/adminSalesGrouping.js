import { normalizeMojibakeText } from './text'
import { isSaleVisible } from './visibleSales'

const MONTH_NAMES_FULL = ['Janeiro', 'Fevereiro', 'Mar\u00E7o', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function formatMonthYearLabel(year, monthIndex) {
  const safeYear = Number(year)
  const safeMonth = Number(monthIndex)
  if (!Number.isFinite(safeYear) || !Number.isFinite(safeMonth) || safeMonth < 1 || safeMonth > 12) return ''
  return `${MONTH_NAMES_FULL[safeMonth - 1]} ${safeYear}`
}

function toMiddayDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
}

function parseMonthKey(monthKey) {
  const raw = String(monthKey || '').trim().toLowerCase()
  if (!raw) return null

  const numeric = Number(raw)
  if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 12) {
    return numeric
  }

  const monthMap = {
    jan: 1,
    janeiro: 1,
    fev: 2,
    fevereiro: 2,
    mar: 3,
    marco: 3,
    março: 3,
    apr: 4,
    abr: 4,
    abril: 4,
    may: 5,
    mai: 5,
    maio: 5,
    jun: 6,
    junho: 6,
    jul: 7,
    julho: 7,
    aug: 8,
    ago: 8,
    agosto: 8,
    sep: 9,
    set: 9,
    setembro: 9,
    oct: 10,
    out: 10,
    outubro: 10,
    nov: 11,
    novembro: 11,
    dec: 12,
    dez: 12,
    dezembro: 12
  }

  return monthMap[raw] || null
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
        const sourceMonthKey = String(monthKeyRaw || '').trim()
        const sales = Array.isArray(monthData?.sales) ? monthData.sales : []
        const sourceYear = Number(String(yearKey || '').trim())
        const sourceMonthIndex = parseMonthKey(sourceMonthKey)
        if (!Number.isFinite(sourceYear) || sourceYear <= 0 || !sourceMonthIndex) return

        sales.forEach((sale) => {
          if (!isSaleVisible(sale)) return

          const normalizedDate = normalizeSaleDate(sale, sourceMonthIndex, sourceYear)
          if (!normalizedDate) return

          const normalizedYear = normalizedDate.getFullYear()
          const normalizedMonth = normalizedDate.getMonth() + 1
          const monthKeyNormalized = String(sourceMonthIndex).padStart(2, '0')

          if (import.meta.env.DEV && (normalizedYear !== sourceYear || normalizedMonth !== sourceMonthIndex)) {
            console.warn('MONTH MISMATCH', {
              saleId: sale?.id,
              rawDate: sale?.date || sale?.created_at || sale?.createdAt,
              normalizedDate,
              normalizedMonth,
              sourceYear,
              sourceMonthKey,
              sourceMonthIndex
            })
          }

          const uniqueKey = sale?.id != null
            ? `${accountId}::${String(sourceYear)}-${monthKeyNormalized}::${String(sale.id)}`
            : `${accountId}::${String(sourceYear)}-${monthKeyNormalized}::${String(sale?.client || '')}::${String(sale?.product || '')}::${String(sale?.quantity || '')}::${String(sale?.unit_price || sale?.unitPrice || '')}::${String(sale?.total || '')}`

          if (uniqueSales.has(uniqueKey)) return
          uniqueSales.add(uniqueKey)

          merged.push({
            ...sale,
            accountId,
            accountName: sellerName,
            sellerName,
            storeName: resolveStoreName(account, sale),
            sourceYear,
            sourceMonthKey,
            sourceMonthIndex,
            year: sourceYear,
            monthKey: monthKeyNormalized,
            monthIndex: sourceMonthIndex,
            normalizedDate,
            __accountKey: accountId,
            __sellerName: sellerName,
            __storeName: resolveStoreName(account, sale),
            __sourceYear: String(sourceYear),
            __sourceMonth: monthKeyNormalized,
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

export function groupSalesBySourceYearMonth(allSales) {
  const sales = Array.isArray(allSales) ? allSales : []
  const grouped = {}

  sales.forEach((sale) => {
    const sourceYear = Number(sale?.sourceYear || sale?.year || sale?.__sourceYear)
    const sourceMonth = parseMonthKey(sale?.sourceMonthIndex || sale?.monthIndex || sale?.sourceMonthKey || sale?.monthKey || sale?.__sourceMonth)
    const date = normalizeSaleDate(sale, sourceMonth, sourceYear)
    if (!date || !sourceYear || !sourceMonth) return

    const year = String(sourceYear)
    const monthKey = String(sourceMonth).padStart(2, '0')
    const monthName = formatMonthYearLabel(sourceYear, sourceMonth)
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

export const groupSalesByYearMonth = groupSalesBySourceYearMonth

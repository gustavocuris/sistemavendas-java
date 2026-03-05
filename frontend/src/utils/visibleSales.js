export function isSaleVisible(sale) {
  if (!sale || typeof sale !== 'object') return false

  const status = String(sale.status || '').toLowerCase().trim()

  if (sale.deleted === true) return false
  if (sale.isDeleted === true) return false
  if (sale.active === false) return false
  if (sale.removedAt != null) return false
  if (status === 'deleted' || status === 'removed') return false

  return true
}

export function getVisibleSales(userDataOrSales) {
  try {
    if (!userDataOrSales) return []

    if (Array.isArray(userDataOrSales)) {
      return userDataOrSales.filter(isSaleVisible)
    }

    if (typeof userDataOrSales === 'object' && userDataOrSales.months && typeof userDataOrSales.months === 'object') {
      const merged = []
      Object.entries(userDataOrSales.months).forEach(([monthKey, monthData]) => {
        const sales = Array.isArray(monthData?.sales) ? monthData.sales : []
        sales.forEach((sale) => {
          merged.push({ ...sale, month: sale?.month || monthKey })
        })
      })
      return merged.filter(isSaleVisible)
    }

    return []
  } catch (error) {
    console.error('Erro ao aplicar getVisibleSales:', error)
    return []
  }
}

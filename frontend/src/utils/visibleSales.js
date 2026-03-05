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

export function getActiveUsers(allUsersData) {
  try {
    const users = Array.isArray(allUsersData)
      ? allUsersData
      : Array.isArray(allUsersData?.users)
        ? allUsersData.users
        : []

    return users.filter((user) => user && user.active !== false)
  } catch (error) {
    console.error('Erro ao aplicar getActiveUsers:', error)
    return []
  }
}

export function getVisibleSalesForUser(userData) {
  try {
    if (!userData) return []

    if (Array.isArray(userData)) {
      return userData.filter(isSaleVisible)
    }

    if (Array.isArray(userData?.sales)) {
      return userData.sales.filter(isSaleVisible)
    }

    if (typeof userData === 'object' && userData.months && typeof userData.months === 'object') {
      const merged = []
      Object.entries(userData.months).forEach(([monthKey, monthData]) => {
        const sales = Array.isArray(monthData?.sales) ? monthData.sales : []
        sales.forEach((sale) => {
          merged.push({ ...sale, month: sale?.month || monthKey })
        })
      })
      return merged.filter(isSaleVisible)
    }

    return []
  } catch (error) {
    console.error('Erro ao aplicar getVisibleSalesForUser:', error)
    return []
  }
}

export function getAllVisibleSales(allUsersData) {
  try {
    if (!allUsersData) return []

    if (Array.isArray(allUsersData)) {
      return getVisibleSalesForUser(allUsersData)
    }

    const activeUsers = getActiveUsers(allUsersData)
    const activeIds = new Set(activeUsers.map((user) => String(user?.id || '')))

    if (Array.isArray(allUsersData?.sales)) {
      return getVisibleSalesForUser(allUsersData.sales).filter((sale) => {
        if (activeIds.size === 0) return true
        return activeIds.has(String(sale?.userId || ''))
      })
    }

    if (allUsersData?.userData && typeof allUsersData.userData === 'object') {
      const allByUser = Object.entries(allUsersData.userData).flatMap(([userId, userData]) => {
        if (activeIds.size > 0 && !activeIds.has(String(userId))) return []
        return getVisibleSalesForUser(userData).map((sale) => ({ ...sale, userId: sale?.userId || userId }))
      })
      return allByUser
    }

    if (typeof allUsersData === 'object') {
      return Object.entries(allUsersData).flatMap(([userId, userData]) => {
        if (activeIds.size > 0 && !activeIds.has(String(userId))) return []
        return getVisibleSalesForUser(userData).map((sale) => ({ ...sale, userId: sale?.userId || userId }))
      })
    }

    return []
  } catch (error) {
    console.error('Erro ao aplicar getAllVisibleSales:', error)
    return []
  }
}

export function getVisibleSales(userDataOrSales) {
  return getVisibleSalesForUser(userDataOrSales)
}

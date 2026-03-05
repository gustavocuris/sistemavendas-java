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

export function getMonthlyTotalsFromActiveAccounts(allUsers) {
  try {
    const users = Array.isArray(allUsers?.users)
      ? allUsers.users
      : Array.isArray(allUsers)
        ? allUsers
        : []

    const targetYear = String(allUsers?.year || new Date().getFullYear())
    const activeUsers = users.filter((user) => user && user.active !== false && user.role !== 'admin')

    return MONTHS.map(({ key, label }) => {
      const total = activeUsers.reduce((sum, user) => {
        const monthData = user?.salesByYearMonth?.[targetYear]?.[key]
        return sum + toNumber(monthData?.total)
      }, 0)

      const count = activeUsers.reduce((sum, user) => {
        const monthData = user?.salesByYearMonth?.[targetYear]?.[key]
        return sum + toNumber(monthData?.count)
      }, 0)

      return { month: label, total, count }
    })
  } catch (error) {
    console.error('Erro ao calcular totais mensais das contas ativas:', error)
    return MONTHS.map(({ label }) => ({ month: label, total: 0, count: 0 }))
  }
}

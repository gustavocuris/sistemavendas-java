import { useEffect, useMemo, useState } from 'react'
import { normalizeMojibakeText } from '../utils/text'
import { getAllValidSalesFromActiveAccounts, groupSalesByYearAndMonth, normalizeSaleDate } from '../utils/adminSalesData'

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDate(value) {
  const date = normalizeSaleDate(value)
  if (!date) return '-'
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${day}/${month}/${year}`
}

function resolveAccountLabel(user) {
  return normalizeMojibakeText(user?.displayName || user?.username || '-')
}

function resolveProductMeasure(sale) {
  const product = normalizeMojibakeText(sale?.product || '-')
  const tread = normalizeMojibakeText(sale?.tread_type || sale?.treadType || '').toUpperCase().trim()
  if (!tread) return product
  return `${product} (${tread})`
}

function resolveDesfecho(sale) {
  const value = normalizeMojibakeText(sale?.desfecho || sale?.outcome || '')
  return value ? value.toUpperCase() : '-'
}

function resolvePhone(sale) {
  const value = normalizeMojibakeText(
    sale?.phone || sale?.telefone || sale?.celular || sale?.cell || sale?.whatsapp || ''
  )
  return value || '-'
}

export default function AdminAllSalesView({ isOpen, onClose, activeAccounts, darkMode }) {
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const allSales = useMemo(() => getAllValidSalesFromActiveAccounts(activeAccounts), [activeAccounts])

  const accountOptions = useMemo(() => {
    const users = Array.isArray(activeAccounts) ? activeAccounts : []
    return users
      .filter((user) => user && String(user.role || '').toLowerCase() !== 'admin')
      .map((user) => ({
        value: String(user.id || user.username || user.displayName || ''),
        label: resolveAccountLabel(user)
      }))
      .filter((item) => item.value)
  }, [activeAccounts])

  const accountFilteredSales = useMemo(() => {
    return selectedAccount === 'all'
      ? allSales
      : allSales.filter((sale) => String(sale.__accountKey || '') === String(selectedAccount))
  }, [allSales, selectedAccount])

  const filteredSales = useMemo(() => {
    if (selectedAccount === 'all') return allSales

    const term = normalizeMojibakeText(searchTerm || '').toLowerCase().trim()
    if (!term) return accountFilteredSales

    return accountFilteredSales.filter((sale) => {
      const searchableParts = [
        sale?.client,
        sale?.phone,
        sale?.telefone,
        sale?.whatsapp,
        sale?.cell,
        sale?.celular,
        sale?.product,
        sale?.tread_type,
        sale?.treadType,
        sale?.desfecho,
        sale?.observation,
        sale?.obs,
        sale?.notes,
        sale?.userName,
        sale?.seller,
        sale?.__sellerName,
        sale?.__accountKey,
        sale?.date,
        sale?.created_at,
        sale?.createdAt,
        sale?.plate,
        sale?.placa
      ]

      const haystack = normalizeMojibakeText(searchableParts.filter(Boolean).join(' ')).toLowerCase()
      return haystack.includes(term)
    })
  }, [allSales, accountFilteredSales, searchTerm, selectedAccount])

  const groupedData = useMemo(() => groupSalesByYearAndMonth(filteredSales), [filteredSales])

  const availableYears = useMemo(() => groupedData.map((yearGroup) => String(yearGroup.year)), [groupedData])

  const monthsForSelectedYear = useMemo(() => {
    if (!selectedYear) return []
    const yearGroup = groupedData.find((item) => String(item.year) === String(selectedYear))
    return yearGroup?.months || []
  }, [groupedData, selectedYear])

  const selectedMonthGroup = useMemo(
    () => monthsForSelectedYear.find((month) => String(month.key) === String(selectedMonth)) || null,
    [monthsForSelectedYear, selectedMonth]
  )

  const selectedYearTotals = useMemo(() => {
    const yearGroup = groupedData.find((item) => String(item.year) === String(selectedYear))
    return yearGroup || null
  }, [groupedData, selectedYear])

  useEffect(() => {
    if (availableYears.length === 0) {
      setSelectedYear('')
      setSelectedMonth('')
      return
    }

    if (!selectedYear || !availableYears.includes(String(selectedYear))) {
      setSelectedYear(availableYears[0])
    }
  }, [availableYears, selectedYear])

  useEffect(() => {
    if (monthsForSelectedYear.length === 0) {
      setSelectedMonth('')
      return
    }

    const hasSelectedMonth = monthsForSelectedYear.some((month) => String(month.key) === String(selectedMonth))
    if (!hasSelectedMonth) {
      setSelectedMonth(String(monthsForSelectedYear[0].key))
    }
  }, [monthsForSelectedYear, selectedMonth])

  useEffect(() => {
    if (selectedAccount === 'all') return
    const exists = accountOptions.some((item) => String(item.value) === String(selectedAccount))
    if (!exists) {
      setSelectedAccount('all')
    }
  }, [accountOptions, selectedAccount])

  if (!isOpen) return null

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value)
  }

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value)
  }

  const handleAccountChange = (event) => {
    const nextValue = event.target.value
    setSelectedAccount(nextValue)
    if (nextValue === 'all') {
      setSearchTerm('')
    }
  }

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value)
  }

  return (
    <div className="admin-all-sales-overlay">
      <div className={`admin-all-sales-modal ${darkMode ? 'dark-mode' : ''}`}>
        <div className="admin-all-sales-header">
          <h2>Todas as vendas das contas ativas</h2>
          <button type="button" className="admin-all-sales-close" onClick={onClose} title="Fechar">✕</button>
        </div>

        <div className="admin-all-sales-content">
          {groupedData.length === 0 ? (
            <p className="admin-all-sales-empty">Nenhuma venda válida encontrada para contas ativas.</p>
          ) : (
            <section className="admin-all-sales-year-block">
              <div className="admin-all-sales-filters">
                <label className="admin-all-sales-filter-group">
                  <span>Ano</span>
                  <select value={selectedYear} onChange={handleYearChange}>
                    {availableYears.map((yearValue) => (
                      <option key={yearValue} value={yearValue}>{yearValue}</option>
                    ))}
                  </select>
                </label>

                <label className="admin-all-sales-filter-group">
                  <span>Mês</span>
                  <select value={selectedMonth} onChange={handleMonthChange}>
                    {monthsForSelectedYear.map((month) => (
                      <option key={month.key} value={month.key}>{month.monthName}</option>
                    ))}
                  </select>
                </label>

                <label className="admin-all-sales-filter-group">
                  <span>Conta/Vendedor</span>
                  <select value={selectedAccount} onChange={handleAccountChange}>
                    <option value="all">TODAS</option>
                    {accountOptions.map((account) => (
                      <option key={account.value} value={account.value}>{account.label}</option>
                    ))}
                  </select>
                </label>

                <label className="admin-all-sales-filter-group admin-all-sales-search-group">
                  <span>Buscar Venda</span>
                  <input
                    type="text"
                    className="admin-all-sales-search-input"
                    placeholder="NOME, TELEFONE, PRODUTO..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                </label>
              </div>

              {selectedYearTotals && (
                <div className="admin-all-sales-year-head">
                  <h3>{selectedYearTotals.year}</h3>
                </div>
              )}

              {selectedMonthGroup && (
                <article className="admin-all-sales-month-block">
                  <div className="admin-all-sales-month-head is-open">
                    <h4>{selectedMonthGroup.monthName}</h4>
                    <span>
                      Total R$ {formatMoney(selectedMonthGroup.total)}
                    </span>
                  </div>

                  <div className="admin-all-sales-table-wrap">
                    <table className="admin-all-sales-table">
                      <colgroup>
                        <col className="admin-all-sales-col-date" />
                        <col className="admin-all-sales-col-seller" />
                        <col className="admin-all-sales-col-client" />
                        <col className="admin-all-sales-col-phone" />
                        <col className="admin-all-sales-col-product" />
                        <col className="admin-all-sales-col-outcome" />
                        <col className="admin-all-sales-col-value" />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Vendedor</th>
                          <th>Cliente</th>
                          <th>Telefone</th>
                          <th>Produto/Medida</th>
                          <th>Desfecho</th>
                          <th>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedMonthGroup.sales.map((sale, index) => (
                          <tr key={`${selectedYear}-${selectedMonthGroup.key}-${sale?.id || index}`}>
                            <td>{formatDate(sale.__dateValue)}</td>
                            <td>{sale.__sellerName || '-'}</td>
                            <td>{normalizeMojibakeText(sale?.client) || '-'}</td>
                            <td>{resolvePhone(sale)}</td>
                            <td>{resolveProductMeasure(sale)}</td>
                            <td>{resolveDesfecho(sale)}</td>
                            <td>R$ {formatMoney(sale.__totalValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

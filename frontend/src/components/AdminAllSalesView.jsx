import { useMemo } from 'react'
import { normalizeMojibakeText } from '../utils/text'
import { isSaleVisible } from '../utils/visibleSales'
import { groupSalesByYearMonth } from '../utils/adminSalesGrouping'

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('pt-BR')
}

function resolveSeller(user, sale) {
  return normalizeMojibakeText(sale?.userName || user?.displayName || user?.username || sale?.seller || '-')
}

function resolveAccount(user, sale) {
  return normalizeMojibakeText(user?.displayName || user?.username || sale?.store || sale?.account || sale?.userId || '-')
}

function resolveProductMeasure(sale) {
  const product = normalizeMojibakeText(sale?.product || '-')
  const tread = normalizeMojibakeText(sale?.tread_type || sale?.treadType || '').toUpperCase().trim()
  if (!tread) return product
  return `${product} (${tread})`
}

function resolveObservation(sale) {
  const value = normalizeMojibakeText(sale?.observation || sale?.notes || sale?.obs || '')
  return value || '-'
}

function resolveTotal(sale) {
  const explicit = Number(sale?.total || 0)
  if (explicit > 0) return explicit
  const quantity = Number(sale?.quantity || 0)
  const unitPrice = Number(sale?.unit_price || sale?.unitPrice || 0)
  const calculated = quantity * unitPrice
  return Number.isFinite(calculated) ? calculated : 0
}

function buildAllVisibleSales(activeAccounts) {
  const users = Array.isArray(activeAccounts) ? activeAccounts : []
  const merged = []

  users.forEach((user) => {
    if (!user || user.active === false || String(user.role || '').toLowerCase() === 'admin') return

    const yearsMap = user?.salesByYearMonth && typeof user.salesByYearMonth === 'object'
      ? user.salesByYearMonth
      : {}

    Object.values(yearsMap).forEach((monthsMap) => {
      if (!monthsMap || typeof monthsMap !== 'object') return

      Object.values(monthsMap).forEach((monthData) => {
        const sales = Array.isArray(monthData?.sales) ? monthData.sales : []

        sales.forEach((sale) => {
          if (!isSaleVisible(sale)) return

          merged.push({
            ...sale,
            __sellerName: resolveSeller(user, sale),
            __accountName: resolveAccount(user, sale),
            __totalValue: resolveTotal(sale),
            __dateValue: sale?.date || sale?.created_at || sale?.createdAt
          })
        })
      })
    })
  })

  return merged
}

export default function AdminAllSalesView({ isOpen, onClose, activeAccounts, darkMode }) {
  const allSales = useMemo(() => buildAllVisibleSales(activeAccounts), [activeAccounts])

  const groupedData = useMemo(() => groupSalesByYearMonth(allSales), [allSales])

  if (!isOpen) return null

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
            groupedData.map((yearGroup) => (
              <section key={yearGroup.year} className="admin-all-sales-year-block">
                <div className="admin-all-sales-year-head">
                  <h3>{yearGroup.year}</h3>
                  <span>
                    {yearGroup.count} venda(s) • Total R$ {formatMoney(yearGroup.total)}
                  </span>
                </div>

                {yearGroup.months.map((monthGroup) => (
                  <article key={`${yearGroup.year}-${monthGroup.key}`} className="admin-all-sales-month-block">
                    <div className="admin-all-sales-month-head">
                      <h4>{monthGroup.monthName}</h4>
                      <span>
                        {monthGroup.count} venda(s) • Total R$ {formatMoney(monthGroup.total)}
                      </span>
                    </div>

                    <div className="admin-all-sales-table-wrap">
                      <table className="admin-all-sales-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Vendedor</th>
                            <th>Loja/Conta</th>
                            <th>Cliente</th>
                            <th>Produto/Medida</th>
                            <th>Valor</th>
                            <th>Observação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthGroup.sales.map((sale, index) => (
                            <tr key={`${yearGroup.year}-${monthGroup.key}-${sale?.id || index}`}>
                              <td>{formatDate(sale.__dateValue)}</td>
                              <td>{sale.__sellerName || '-'}</td>
                              <td>{sale.__accountName || '-'}</td>
                              <td>{normalizeMojibakeText(sale?.client) || '-'}</td>
                              <td>{resolveProductMeasure(sale)}</td>
                              <td>R$ {formatMoney(sale.__totalValue)}</td>
                              <td>{resolveObservation(sale)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                ))}
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

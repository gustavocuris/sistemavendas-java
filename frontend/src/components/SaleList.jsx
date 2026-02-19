import React, { useState } from 'react'

const tireTypeLabel = { new: 'Novo', recap: 'Recapado', recapping: 'Recapagem', service: 'Sv Borracharia' }
const desfechoLabel = { entrega: 'Entrega ao Cliente', piratininga: 'Coleta Piratininga', belavista: 'Coleta Bela Vista' }

const getTireTypeNode = (sale) => {
  const baseLabel = tireTypeLabel[sale.tire_type] || sale.tire_type
  if (sale.tire_type === 'recap' && sale.base_trade) {
    return (
      <span className="tire-type-with-bt">
        {baseLabel} <span className="bt-badge">BT</span>
      </span>
    )
  }
  return baseLabel
}

const formatBRL = (value) => {
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatProduct = (sale) => {
  const base = sale.product || ''
  if (!sale.tread_type) return base
  return `${base} (${sale.tread_type})`
}

// Formata data: YYYY-MM-DD → dd/mm/yyyy
const formatDate = (value) => {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

// Formata data por extenso: YYYY-MM-DD → "6 de Fevereiro de 2026"
const formatDateFull = (value) => {
  if (!value) return ''
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const [year, month, day] = value.split('-')
  const monthName = months[parseInt(month) - 1]
  return `${parseInt(day)} de ${monthName} de ${year}`
}

export default function SaleList({ sales, onEdit, onDelete, onCopy }){
  const [isAscending, setIsAscending] = useState(false)
  
  const sortedSales = [...sales].sort((a, b) => {
    // Converte YYYY-MM-DD para timestamp para comparação
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    
    if (isAscending) {
      return dateA - dateB // Antigas para novas
    } else {
      return dateB - dateA // Novas para antigas
    }
  })
  
  const displaySales = sortedSales
  const totalAll = sortedSales.reduce((s,i)=>s+Number(i.total||0),0)
  return (
    <div className="list">
      <div className="list-header-with-sort">
        <h2>Vendas</h2>
        <button 
          onClick={() => setIsAscending(!isAscending)}
          className="btn-sort"
          title={isAscending ? "Ordenar: Novas para Antigas" : "Ordenar: Antigas para Novas"}
        >
          {isAscending ? '↑' : '↓'}
        </button>
      </div>
      <div className="list-wrapper">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>PRODUTO/SERVIÇO</th>
              <th>Unit.</th>
              <th>Qtd</th>
              <th>Tipo de Venda</th>
              <th>Desfecho</th>
              <th>Total</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {displaySales.map(s=> (
              <tr key={s.id}>
                <td title={formatDateFull(s.date)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button onClick={()=>onCopy(s)} className="btn-copy-mini" title="Copiar registro">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                    <span>{formatDate(s.date)}</span>
                  </div>
                </td>
                <td>{s.client}</td>
                <td>{s.phone}</td>
                <td>{formatProduct(s)}</td>
                <td>{formatBRL(s.unit_price)}</td>
                <td>{s.quantity}</td>
                <td>{getTireTypeNode(s)}</td>
                <td>{desfechoLabel[s.desfecho] || s.desfecho || '-'}</td>
                <td>{formatBRL(s.total)}</td>
                <td className="actions-cell">
                  <button onClick={()=>onEdit(s)} className="btn-edit-icon" title="Editar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button onClick={()=>onDelete(s.id)} className="btn-delete-icon" title="Excluir">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} className="total-label">FATURAMENTO TOTAL :</td>
              <td colSpan={3} className="total-amount">R$ {formatBRL(totalAll)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

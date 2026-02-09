import React from 'react'

const tireTypeLabel = { new: 'Novo', recap: 'Recapado', recapping: 'Recapagem', service: 'Sv Borracharia' }
const desfechoLabel = { entrega: 'Entrega ao Cliente', piratininga: 'Coleta Piratininga', belavista: 'Coleta Bela Vista' }

const formatBRL = (value) => {
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

export default function SaleList({ sales, onEdit, onDelete }){
  const totalAll = sales.reduce((s,i)=>s+Number(i.total||0),0)
  return (
    <div className="list">
      <h2>Vendas</h2>
      <div className="list-wrapper">
        <table>
          <thead>
            <tr><th>ID</th><th>Data</th><th>Cliente</th><th>Telefone</th><th>Produto</th><th>Unit.</th><th>Qtd</th><th>Tipo de Venda</th><th>Desfecho</th><th>Total</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {sales.map(s=> (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td title={formatDateFull(s.date)}>{formatDate(s.date)}</td>
                <td>{s.client}</td>
                <td>{s.phone}</td>
                <td>{s.product}</td>
                <td>{formatBRL(s.unit_price)}</td>
                <td>{s.quantity}</td>
                <td>{tireTypeLabel[s.tire_type] || s.tire_type}</td>
                <td>{desfechoLabel[s.desfecho] || s.desfecho || '-'}</td>
                <td>{formatBRL(s.total)}</td>
                <td className="actions-cell">
                  <button onClick={()=>onEdit(s)} className="btn-edit">Editar</button>
                  <button onClick={()=>onDelete(s.id)} className="btn-delete">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={9} className="total-label">VALOR TOTAL</td>
              <td colSpan={2} className="total-amount">{formatBRL(totalAll)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

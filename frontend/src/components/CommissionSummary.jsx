import React, { useMemo, useState } from 'react'
import axios from 'axios'

const formatBRL = (value) => {
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CommissionSummary({ sales, commissions, onCommissionChange }) {
  const [editingType, setEditingType] = useState(null)
  const [tempValue, setTempValue] = useState('')
  const [localCommissions, setLocalCommissions] = useState(commissions)

  // Atualizar quando commissions externas mudam
  React.useEffect(() => {
    setLocalCommissions(commissions)
  }, [commissions])

  const commissionData = useMemo(() => {
    if (!sales || !localCommissions) return { byType: {}, total: 0 }

    const byType = {
      new: { count: 0, total: 0, percent: localCommissions.new || 0 },
      recap: { count: 0, total: 0, percent: localCommissions.recap || 0 },
      recapping: { count: 0, total: 0, percent: localCommissions.recapping || 0 },
      service: { count: 0, total: 0, percent: localCommissions.service || 0 }
    }

    let grandTotal = 0

    sales.forEach(sale => {
      const type = sale.tire_type || 'new'
      const commission = (sale.total * (localCommissions[type] || 0)) / 100
      
      if (byType[type]) {
        byType[type].count += sale.quantity
        byType[type].total += commission
      }
      
      grandTotal += commission
    })

    return { byType, total: grandTotal }
  }, [sales, localCommissions])

  const getTireTypeName = (type) => {
    const names = {
      new: 'PNEU NOVO',
      recap: 'PNEU RECAPADO',
      recapping: 'RECAPAGEM DE PNEU',
      service: 'SERVIÇO DE BORRACHARIA'
    }
    return names[type] || type
  }

  const handlePercentClick = (type) => {
    setEditingType(type)
    setTempValue(String(localCommissions[type] || 0))
  }

  const handlePercentChange = (e) => {
    let value = e.target.value.replace(/[^0-9.]/g, '')
    if (value.length > 5) value = value.slice(0, 5)
    setTempValue(value)
  }

  const handlePercentSave = async (type) => {
    const numValue = parseFloat(tempValue) || 0
    
    if (numValue < 0 || numValue > 100) {
      alert('Porcentagem deve estar entre 0 e 100')
      handlePercentCancel()
      return
    }

    const updated = { ...localCommissions, [type]: numValue }

    try {
      const payload = {
        new: updated.new,
        recap: updated.recap,
        recapping: updated.recapping,
        service: updated.service
      }
      await axios.put(`${import.meta.env.VITE_API_URL}/api/commissions`, payload)
      setLocalCommissions(updated)
      if (onCommissionChange) {
        onCommissionChange(updated)
      }
    } catch (err) {
      console.error('Erro ao salvar comissão', err)
      alert('Erro ao salvar comissão')
    }

    setEditingType(null)
    setTempValue('')
  }

  const handlePercentCancel = () => {
    setEditingType(null)
    setTempValue('')
  }

  return (
    <div className="commission-summary">
      <h2>Comissões de Venda</h2>
      <div className="commission-table">
        <div className="commission-header">
          <div>Tipo de Pneu</div>
          <div>% (clique para editar)</div>
          <div>Unidades</div>
          <div>Comissão Total</div>
        </div>
        {Object.entries(commissionData.byType).map(([type, data]) => (
          <div key={type} className="commission-row">
            <div className="cell-name">{getTireTypeName(type)}</div>
            <div className="cell-percent">
              {editingType === type ? (
                <div className="percent-input-group">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tempValue}
                    onChange={handlePercentChange}
                    placeholder="0"
                    autoFocus
                    maxLength="5"
                    className="percent-input"
                  />
                  <span className="percent-sign-input">%</span>
                  <button 
                    className="btn-confirm"
                    onClick={() => handlePercentSave(type)}
                  >
                    ✓
                  </button>
                  <button 
                    className="btn-cancel"
                    onClick={handlePercentCancel}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <span 
                  className="percent-value"
                  onClick={() => handlePercentClick(type)}
                  title="Clique para editar"
                >
                  {data.percent}%
                </span>
              )}
            </div>
            <div className="cell-units">{data.count}</div>
            <div className="cell-amount">R$ {formatBRL(data.total)}</div>
          </div>
        ))}
        <div className="commission-footer">
          <div colSpan="3" className="label">Total Comissões:</div>
          <div className="amount-total">R$ {formatBRL(commissionData.total)}</div>
        </div>
      </div>
    </div>
  )
}

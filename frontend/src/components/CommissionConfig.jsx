import { useState, useEffect } from 'react'
import api from '../api/api'
import { endpoint } from '../utils/api'

export default function CommissionConfig({ isOpen, onClose }) {
  const [commissions, setCommissions] = useState({ new: 5, recap: 8, recapping: 10 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadCommissions()
    }
  }, [isOpen])

  const loadCommissions = async () => {
    try {
      const res = await api.get(endpoint('commissions'))
      setCommissions(res.data)
    } catch (err) {
      console.error('Erro ao carregar comissões', err)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const payload = {
        new: Number(commissions.new),
        recap: Number(commissions.recap),
        recapping: Number(commissions.recapping)
      }
      await api.put(endpoint('commissions'), payload)
      onClose()
    } catch (err) {
      console.error('Erro ao salvar comissões', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal">
        <div className="modal-header">
          <h3>Configurar Comissões (%)</h3>
          <button className="modal-close" onClick={onClose} aria-label="Fechar" title="Fechar">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="commission-group">
            <label>Pneu Novo</label>
            <input 
              type="number" 
              min="0" 
              max="100" 
              step="0.5"
              value={commissions.new} 
              onChange={e => setCommissions({...commissions, new: e.target.value})}
            />
            <span className="percent-sign">%</span>
          </div>
          <div className="commission-group">
            <label>Pneu Recapado</label>
            <input 
              type="number" 
              min="0" 
              max="100" 
              step="0.5"
              value={commissions.recap} 
              onChange={e => setCommissions({...commissions, recap: e.target.value})}
            />
            <span className="percent-sign">%</span>
          </div>
          <div className="commission-group">
            <label>Recapagem de Pneu</label>
            <input 
              type="number" 
              min="0" 
              max="100" 
              step="0.5"
              value={commissions.recapping} 
              onChange={e => setCommissions({...commissions, recapping: e.target.value})}
            />
            <span className="percent-sign">%</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </>
  )
}

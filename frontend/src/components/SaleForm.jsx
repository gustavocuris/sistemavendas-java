import React, { useEffect, useState } from 'react'
import DatePicker from './DatePicker'

const DESFECHO_OPTIONS = [
  { value: 'entrega', label: 'ENTREGA AO CLIENTE' },
  { value: 'piratininga', label: 'MONTADO NA LOJA DO PIRATININGA' },
  { value: 'belavista', label: 'MONTADO NA LOJA DO BELA VISTA' }
];

const empty = { date:'', client:'', phone:'', product:'', unit_price:0, quantity:1, tire_type:'new', desfecho:'', base_trade: false, tread_type: '' }

export default function SaleForm({ onCreate, onUpdate, editing, currentMonth, copiedSale, onPaste }) {
  const [form, setForm] = useState(empty)
  const [priceDisplay, setPriceDisplay] = useState('0,00')
  const [items, setItems] = useState([]) // Múltiplos itens para salvar juntos

  useEffect(() => {
    if (editing) {
      setForm(editing)
      setPriceDisplay(formatPrice(Math.round(editing.unit_price * 100)))
      setItems([]) // Limpar itens ao editar
    } else {
      setForm(empty)
      setPriceDisplay('0,00')
      setItems([])
    }
  }, [editing])

  // Formata número como moeda com 2 casas decimais e ponto de milhares: 5 = 0,05 | 250 = 2,50 | 1250 = 12,50 | 125000 = 1.250,00
  const formatPrice = (value) => {
  const nums = value.toString().replace(/\D/g, '')
  if (!nums) return '0,00'
  
  let formatted
  if (nums.length === 1) {
    formatted = `0,0${nums}`
  } else if (nums.length === 2) {
    formatted = `0,${nums}`
  } else {
    const cents = nums.slice(-2)
    const reais = parseInt(nums.slice(0, -2)).toString() // Remove zeros iniciais
    // Adiciona ponto de milhar se > 3 dígitos
    const reaisFormatted = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    formatted = `${reaisFormatted},${cents}`
  }
  return formatted
}

// Converte string digitada para float: "250" = 2.50 | "1250" = 12.50
const parsePrice = (value) => {
  const nums = value.toString().replace(/\D/g, '')
  if (!nums) return 0
  if (nums.length <= 2) return parseInt(nums) / 100
  const cents = nums.slice(-2)
  const reais = nums.slice(0, -2)
  return parseFloat(`${reais}.${cents}`)
}

// Formata data manualmente: dd/mm/yyyy
const formatDateInput = (value) => {
  const nums = value.replace(/\D/g, '')
  if (!nums) return ''
  if (nums.length > 8) return '' // máximo 8 dígitos para ddmmyyyy
  
  if (nums.length <= 2) return nums
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4, 8)}`
}

// Converte dd/mm/yyyy para YYYY-MM-DD para enviar ao backend
const parseDateInput = (value) => {
  const parts = value.split('/')
  if (parts.length !== 3) return ''
  const [day, month, year] = parts
  
  // Validar valores
  const d = parseInt(day);
  const m = parseInt(month);
  const y = parseInt(year);
  
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) return ''
  
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
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

  const addItem = () => {
    // Validar campos necessários
    if (!form.date) {
      alert('Data inválida. Selecione uma data no calendário')
      return
    }
    if (!form.client.trim()) {
      alert('Cliente é obrigatório')
      return
    }
    const phoneNums = form.phone.replace(/\D/g, '')
    if (phoneNums.length < 10 || phoneNums.length > 11) {
      alert('Telefone inválido. Deve ter DDD (2 dígitos) + 8 ou 9 dígitos')
      return
    }
    if (!form.product.trim()) {
      alert('Produto é obrigatório')
      return
    }
    if (['new', 'recap', 'recapping'].includes(form.tire_type) && !form.tread_type) {
      alert('Selecione o tipo de desenho (Liso, Misto ou Borrachudo)')
      return
    }
    if (parsePrice(priceDisplay) <= 0) {
      alert('Valor unitário deve ser maior que zero')
      return
    }

    // Adicionar item à lista
    const newItem = {
      ...form,
      unit_price: parsePrice(priceDisplay),
      quantity: Number(form.quantity)
    }
    setItems([...items, newItem])

    // Resetar apenas produto, preço e quantidade (mantém data, cliente, telefone, tipo e desfecho)
    setForm({
      ...form,
      product: '',
      unit_price: 0,
      quantity: 1
    })
    setPriceDisplay('0,00')
  }

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const submit = (e)=>{
    e.preventDefault()
    
    // Se não houver itens acumulados, salvar apenas o atual
    if (items.length === 0) {
      // Validar data
      if (!form.date) {
        alert('Data inválida. Selecione uma data no calendário')
        return
      }
      
      // Validar telefone (10-11 dígitos)
      const phoneNums = form.phone.replace(/\D/g, '')
      if (phoneNums.length < 10 || phoneNums.length > 11) {
        alert('Telefone inválido. Deve ter DDD (2 dígitos) + 8 ou 9 dígitos')
        return
      }

      if (['new', 'recap', 'recapping'].includes(form.tire_type) && !form.tread_type) {
        alert('Selecione o tipo de desenho (Liso, Misto ou Borrachudo)')
        return
      }
      
      const payload = { ...form, unit_price: parsePrice(priceDisplay), quantity: Number(form.quantity), month: currentMonth }
      if(editing) onUpdate(editing.id, payload); else onCreate(payload)
      setForm(empty)
      setPriceDisplay('0,00')
    } else {
      // Salvar todos os itens acumulados + o atual (se preenchido)
      let allItems = [...items]
      
      // Se o formulário atual estiver preenchido, incluir também
      if (form.product.trim() && parsePrice(priceDisplay) > 0) {
        if (['new', 'recap', 'recapping'].includes(form.tire_type) && !form.tread_type) {
          alert('Selecione o tipo de desenho (Liso, Misto ou Borrachudo)')
          return
        }
        allItems.push({
          ...form,
          unit_price: parsePrice(priceDisplay),
          quantity: Number(form.quantity)
        })
      }

      // Salvar todos
      allItems.forEach(item => {
        const payload = { ...item, month: currentMonth }
        onCreate(payload)
      })

      // Limpar tudo
      setItems([])
      setForm(empty)
      setPriceDisplay('0,00')
    }
  }

  const handlePriceChange = (e) => {
    const input = e.target.value
    const formatted = formatPrice(input)
    setPriceDisplay(formatted)
  }

  const handlePhoneChange = (e) => {
    const input = e.target.value
    const nums = input.replace(/\D/g, '')
    if (nums.length > 11) return // Máximo 11 dígitos
    
    if (nums.length <= 2) {
      setForm({...form, phone: `(${nums}`})
      return
    }
    
    const areaCode = nums.slice(0, 2)
    const rest = nums.slice(2)
    const maxRest = rest[0] === '9' ? 9 : 8
    const limitedRest = rest.slice(0, maxRest)
    
    if (limitedRest.length <= 4) {
      setForm({...form, phone: `(${areaCode}) ${limitedRest}`})
    } else {
      const part1 = limitedRest.slice(0, limitedRest.length - 4)
      const part2 = limitedRest.slice(-4)
      setForm({...form, phone: `(${areaCode}) ${part1}-${part2}`})
    }
  }

  const clearForm = () => {
    setForm(empty);
    setPriceDisplay('0,00');
    setItems([]);
  };

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-header">
        <h2>{editing? 'Editar venda':'Nova venda'}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {copiedSale && (
            <button type="button" onClick={onPaste} className="btn-paste-form" title="Colar registro copiado">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
            </button>
          )}
          <button type="button" onClick={clearForm} className="btn-clear-form" title="Limpar formulário">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          </button>
        </div>
      </div>
      <div className="form-group">
        <label>Data</label>
        <DatePicker value={form.date||''} onChange={(date) => setForm({...form, date})} currentMonth={currentMonth} />
      </div>
      <div className="form-group">
        <label>Cliente</label>
        <input value={form.client} onChange={e=>setForm({...form,client:e.target.value})} required/>
      </div>
      <div className="form-group">
        <label>Telefone</label>
        <input type="text" inputMode="numeric" value={form.phone} onChange={handlePhoneChange} placeholder="(XX) XXXXX-XXXX" required/>
      </div>
      <div className="form-group">
        <label>PRODUTO/SERVIÇO</label>
        <input value={form.product} onChange={e=>setForm({...form,product:e.target.value})} required/>
      </div>
      <div className="form-group">
        <label>Valor Unitário (R$)</label>
        <input type="text" inputMode="numeric" value={priceDisplay} onChange={handlePriceChange} placeholder="0" required/>
      </div>
      <div className="form-group">
        <label>Quantidade</label>
        <input type="number" min="1" step="1" value={form.quantity} onChange={e=>{
          const val = Math.max(1, parseInt(e.target.value) || 1);
          setForm({...form,quantity:val})
        }} required/>
      </div>
      <div className="form-group">
        <label>Tipo de Venda</label>
        <div className="tire-type-buttons">
          <button
            type="button"
            className={`tire-type-btn ${form.tire_type === 'new' ? 'active' : ''}`}
            onClick={() => setForm({...form, tire_type: 'new', base_trade: false})}
            title="Pneu Novo"
          >
            Pneu Novo
          </button>
          <button
            type="button"
            className={`tire-type-btn ${form.tire_type === 'recap' ? 'active' : ''}`}
            onClick={() => setForm({...form, tire_type: 'recap'})}
            title="Pneu Recapado"
          >
            Pneu Recapado
          </button>
          <button
            type="button"
            className={`tire-type-btn ${form.tire_type === 'recapping' ? 'active' : ''}`}
            onClick={() => setForm({...form, tire_type: 'recapping', base_trade: false})}
            title="Recapagem de Pneu"
          >
            Recapagem
          </button>
          <button
            type="button"
            className={`tire-type-btn ${form.tire_type === 'service' ? 'active' : ''}`}
            onClick={() => setForm({...form, tire_type: 'service', base_trade: false, tread_type: ''})}
            title="Serviço Borracharia"
          >
            SV Borracharia
          </button>
        </div>
      </div>
      {form.tire_type === 'recap' && (
        <div className="recap-trade">
          <button
            type="button"
            className={`trade-toggle ${form.base_trade ? 'active' : ''}`}
            onClick={() => setForm({ ...form, base_trade: !form.base_trade })}
            title="Pneu a base de troca"
            aria-pressed={!!form.base_trade}
          >
            <span className="trade-check">✓</span>
            <span className="trade-text">Pneu a base de troca</span>
          </button>
        </div>
      )}
      {['new', 'recap', 'recapping'].includes(form.tire_type) && (
        <div className="form-group">
          <label>DESENHO DO PNEU</label>
          <select
            value={form.tread_type}
            onChange={(e) => setForm({ ...form, tread_type: e.target.value })}
            required
          >
            <option value="" disabled hidden>SELECIONE</option>
            <option value="LISO">LISO</option>
            <option value="MISTO">MISTO</option>
            <option value="BORRACHUDO">BORRACHUDO</option>
          </select>
        </div>
      )}
      <div className="form-group">
        <label>DESFECHO</label>
        <select value={form.desfecho} onChange={e=>setForm({...form,desfecho:e.target.value})} required>
          <option value="" disabled hidden>SELECIONE</option>
          {DESFECHO_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>
      <div className="actions">
        <button type="submit" className="btn-primary">{editing? 'Salvar': items.length > 0 ? 'Salvar Todos' : 'Adicionar'}</button>
        {!editing && <button type="button" onClick={addItem} className="btn-primary" title="Adicionar mais um item para o mesmo cliente">+ Itens</button>}
      </div>
      
      {items.length > 0 && (
        <div className="items-preview">
          <h3>Itens a serem salvos ({items.length})</h3>
          <div className="items-list">
            {items.map((item, idx) => (
              <div key={idx} className="item-preview">
                <div className="item-info">
                  <strong>{item.product}</strong>
                  <span>{item.quantity}x R$ {formatPrice(Math.round(item.unit_price * 100))}</span>
                </div>
                <button type="button" onClick={() => removeItem(idx)} className="btn-remove-item" title="Remover item">×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  )
}

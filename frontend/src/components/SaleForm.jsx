import React, { useEffect, useState } from 'react'
import DatePicker from './DatePicker'

const DESFECHO_OPTIONS = [
  { value: 'entrega', label: 'Entrega ao Cliente' },
  { value: 'piratininga', label: 'Coleta na Loja do Piratininga' },
  { value: 'belavista', label: 'Coleta na Loja do Bela Vista' }
];

const empty = { date:'', client:'', phone:'', product:'', unit_price:0, quantity:1, tire_type:'new', desfecho:'entrega' }

export default function SaleForm({ onCreate, onUpdate, editing, currentMonth }) {
  const [form, setForm] = useState(empty)
  const [priceDisplay, setPriceDisplay] = useState('0,00')

  useEffect(() => {
    if (editing) {
      setForm(editing)
      setPriceDisplay(formatPrice(Math.round(editing.unit_price * 100)))
    } else {
      setForm(empty)
      setPriceDisplay('0,00')
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

  const submit = (e)=>{
    e.preventDefault()
    
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
    
    const payload = { ...form, unit_price: parsePrice(priceDisplay), quantity: Number(form.quantity) }
    if(editing) onUpdate(editing.id, payload); else onCreate(payload)
    setForm(empty)
    setPriceDisplay('0,00')
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

  return (
    <form className="form" onSubmit={submit}>
      <h2>{editing? 'Editar venda':'Nova venda'}</h2>
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
        <label>Produto</label>
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
            onClick={() => setForm({...form, tire_type: 'new'})}
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
            onClick={() => setForm({...form, tire_type: 'recapping'})}
            title="Recapagem de Pneu"
          >
            Recapagem
          </button>
          <button
            type="button"
            className={`tire-type-btn ${form.tire_type === 'service' ? 'active' : ''}`}
            onClick={() => setForm({...form, tire_type: 'service'})}
            title="Serviço Borracharia"
          >
            SV Borracharia
          </button>
        </div>
      </div>
      <div className="form-group">
        <label>Desfecho</label>
        <select value={form.desfecho} onChange={e=>setForm({...form,desfecho:e.target.value})} required>
          {DESFECHO_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>
      <div className="actions">
        <button type="submit" className="btn-primary">{editing? 'Salvar':'Adicionar'}</button>
        <button type="button" onClick={()=>setForm(empty)} className="btn-secondary">Limpar</button>
      </div>
    </form>
  )
}

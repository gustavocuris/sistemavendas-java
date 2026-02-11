import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = `${import.meta.env.VITE_API_URL}/api`;

const TIRE_TYPES = [
  { value: 'new', label: 'Pneu Novo' },
  { value: 'recap', label: 'Recapado' },
  { value: 'recapping', label: 'Recapagem' },
  { value: 'service', label: 'SV Borracharia' }
];

const DESFECHO_OPTIONS = [
  { value: 'entrega', label: 'Entrega ao Cliente' },
  { value: 'piratininga', label: 'Montado na Loja do Piratininga' },
  { value: 'belavista', label: 'Montado na Loja do Bela Vista' }
];

function NotesPanel({ isOpen, onClose, darkMode, currentMonth, onSaleAdded, onMonthChange }) {
  const [tab, setTab] = useState('comprar');
  const [comprarDepois, setComprarDepois] = useState([]);
  const [faltaPagar, setFaltaPagar] = useState([]);

  const [formComprar, setFormComprar] = useState({
    client: '', phone: '', product: '', tire_type: 'new', unit_price: '', quantity: '1', desfecho: 'entrega', base_trade: false
  });
  const [priceDisplayComprar, setPriceDisplayComprar] = useState('0,00');
  const [editingComprar, setEditingComprar] = useState(null);

  const [formPagar, setFormPagar] = useState({
    client: '', phone: '', product: '', tire_type: 'new', unit_price: '', quantity: '1', date: '', desfecho: 'entrega', base_trade: false
  });
  const [priceDisplayPagar, setPriceDisplayPagar] = useState('0,00');
  const [editingPagar, setEditingPagar] = useState(null);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [comprarRes, pagarRes] = await Promise.all([
        axios.get(`${API}/comprar-depois`),
        axios.get(`${API}/falta-pagar`)
      ]);
      setComprarDepois(comprarRes.data);
      setFaltaPagar(pagarRes.data);
    } catch (err) {
      console.error('Erro ao carregar:', err);
    }
  };

  const formatPrice = (value) => {
    const nums = value.toString().replace(/\D/g, '');
    if (!nums) return '0,00';
    let formatted;
    if (nums.length === 1) formatted = `0,0${nums}`;
    else if (nums.length === 2) formatted = `0,${nums}`;
    else {
      const cents = nums.slice(-2);
      const reais = parseInt(nums.slice(0, -2)).toString();
      const reaisFormatted = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      formatted = `${reaisFormatted},${cents}`;
    }
    return formatted;
  };

  const parsePrice = (value) => {
    const nums = value.toString().replace(/\D/g, '');
    if (!nums) return 0;
    if (nums.length <= 2) return parseInt(nums) / 100;
    const cents = nums.slice(-2);
    const reais = nums.slice(0, -2);
    return parseFloat(`${reais}.${cents}`);
  };

  const formatPhone = (value) => {
    const nums = value.replace(/\D/g, '');
    if (nums.length > 11) return '';
    if (nums.length <= 2) return `(${nums}`;
    const areaCode = nums.slice(0, 2);
    const rest = nums.slice(2);
    const maxRest = rest[0] === '9' ? 9 : 8;
    const limitedRest = rest.slice(0, maxRest);
    if (limitedRest.length <= 4) return `(${areaCode}) ${limitedRest}`;
    const part1 = limitedRest.slice(0, limitedRest.length - 4);
    const part2 = limitedRest.slice(-4);
    return `(${areaCode}) ${part1}-${part2}`;
  };

  // VAI COMPRAR
  const handleAddComprar = async (e) => {
    e.preventDefault();
    if (!formComprar.client.trim()) { alert('Preencha o cliente'); return; }
    const phoneNums = formComprar.phone.replace(/\D/g, '');
    if (phoneNums.length < 10 || phoneNums.length > 11) { alert('Telefone: DDD + 8/9 dígitos'); return; }
    if (!formComprar.product.trim()) { alert('Preencha o produto'); return; }
    if (!priceDisplayComprar || priceDisplayComprar === '0,00') { alert('Preencha o valor'); return; }

    try {
      const payload = { ...formComprar, unit_price: parsePrice(priceDisplayComprar), quantity: Number(formComprar.quantity) };
      if (editingComprar) { await axios.put(`${API}/comprar-depois/${editingComprar}`, payload); setEditingComprar(null); }
      else { await axios.post(`${API}/comprar-depois`, payload); }
      setFormComprar({ client: '', phone: '', product: '', tire_type: 'new', unit_price: '', quantity: '1', desfecho: 'entrega', base_trade: false });
      setPriceDisplayComprar('0,00');
      await loadData();
    } catch (err) { alert('Erro ao salvar'); }
  };

  const handleEditComprar = (item) => {
    setFormComprar({ ...item, base_trade: !!item.base_trade, unit_price: item.unit_price, quantity: item.quantity || '1' });
    setPriceDisplayComprar(formatPrice(Math.round(item.unit_price * 100)));
    setEditingComprar(item.id);
  };

  const handleDeleteComprar = async (id) => {
    if (window.confirm('Deletar?')) {
      try { await axios.delete(`${API}/comprar-depois/${id}`); await loadData(); } catch (err) { }
    }
  };

  const handleMoveToFaltaPagar = async (item) => {
    try { await axios.post(`${API}/comprar-depois/${item.id}/move-to-pagar`); await loadData(); } catch (err) { alert('Erro'); }
  };

  // FALTA PAGAR
  const handleAddPagar = async (e) => {
    e.preventDefault();
    if (!formPagar.client.trim()) { alert('Preencha o cliente'); return; }
    const phoneNums = formPagar.phone.replace(/\D/g, '');
    if (phoneNums.length < 10 || phoneNums.length > 11) { alert('Telefone: DDD + 8/9 dígitos'); return; }
    if (!formPagar.product.trim()) { alert('Preencha o produto'); return; }
    if (!priceDisplayPagar || priceDisplayPagar === '0,00') { alert('Preencha o valor'); return; }
    if (!formPagar.date) { alert('Selecione a data'); return; }

    try {
      const payload = { ...formPagar, unit_price: parsePrice(priceDisplayPagar), quantity: Number(formPagar.quantity) };
      if (editingPagar) { await axios.put(`${API}/falta-pagar/${editingPagar}`, payload); setEditingPagar(null); }
      else { await axios.post(`${API}/falta-pagar`, payload); }
      setFormPagar({ client: '', phone: '', product: '', tire_type: 'new', unit_price: '', quantity: '1', date: '', desfecho: 'entrega', base_trade: false });
      setPriceDisplayPagar('0,00');
      await loadData();
    } catch (err) { alert('Erro ao salvar'); }
  };

  const handleEditPagar = (item) => {
    setFormPagar({ ...item, base_trade: !!item.base_trade, quantity: item.quantity || '1' });
    setPriceDisplayPagar(formatPrice(Math.round(item.unit_price * 100)));
    setEditingPagar(item.id);
  };

  const handleDeletePagar = async (id) => {
    if (window.confirm('Deletar?')) {
      try { await axios.delete(`${API}/falta-pagar/${id}`); await loadData(); } catch (err) { }
    }
  };

  const handleMarkAsPaid = async (item) => {
    if (!window.confirm(`Marcar como PAGO e adicionar àtabela de vendas?\n\nCliente: ${item.client}\nValor: R$ ${formatPrice(Math.round(item.unit_price * 100))}`)) return;
    try { 
      // Get the month from the item's date
      const saleMonth = item.date.substring(0, 7); // YYYY-MM from item.date
      
      // Convert the item to a sale
      const response = await axios.post(`${API}/falta-pagar/${item.id}/convert-to-sale`); 
      
      // Reload falta-pagar data (to refresh the list and remove the converted item)
      await loadData(); 
      
      // Change to the month where the sale was added and reload sales
      if (onMonthChange) {
        onMonthChange(saleMonth);
      }
      
      // If already in the same month, also call onSaleAdded to refresh sales
      if (saleMonth === currentMonth && onSaleAdded) {
        onSaleAdded();
      }
      
      alert('✅ Venda adicionada com sucesso!');
    } catch (err) { 
      console.error(err);
      alert('Erro ao marcar como pago: ' + (err.response?.data?.error || err.message)); 
    }
  };

  const getTireTypeLabel = (type) => TIRE_TYPES.find(t => t.value === type)?.label || type;

  const getTireTypeBadge = (item) => {
    const type = item?.tire_type || 'new';
    const badges = {
      'new': { label: 'Pneu Novo', color: '#10b981' },
      'recap': { label: 'Recapado', color: '#3b82f6' },
      'recapping': { label: 'Recapagem', color: '#f59e0b' },
      'service': { label: 'SV Borracharia', color: '#8b5cf6' }
    };
    const badge = badges[type] || badges['new'];
    if (type === 'recap' && item?.base_trade) return `${badge.label} BT`;
    return badge.label;
  };

  const getDesfechoLabel = (value) => DESFECHO_OPTIONS.find(d => d.value === value)?.label || value;

  if (!isOpen) return null;

  const modeClass = darkMode ? 'dark-mode' : '';
  
  const formatMonthDisplay = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]}/${year}`;
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="flow-overlay" onClick={onClose}>
      <div className={`flow-modal ${modeClass}`} onClick={(e) => e.stopPropagation()}>
        <div className="flow-header">
          <div>
            <h2>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              Fluxo de Vendas
            </h2>
            {currentMonth && <p className="flow-month-indicator">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Mês selecionado: <strong>{formatMonthDisplay(currentMonth)}</strong>
            </p>}
          </div>
          <button className="flow-close" onClick={onClose}>✕</button>
        </div>

        <div className="flow-tabs">
          <button className={`flow-tab ${tab === 'comprar' ? 'active' : ''}`} onClick={() => setTab('comprar')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            Em Negociação ({comprarDepois.length})
          </button>
          <button className={`flow-tab ${tab === 'pagar' ? 'active' : ''}`} onClick={() => setTab('pagar')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Finalização ({faltaPagar.length})
          </button>
        </div>

        <div className="flow-content">
          {tab === 'comprar' && (
            <>
              <form className="flow-form" onSubmit={handleAddComprar}>
                <input type="text" placeholder="Cliente" value={formComprar.client} onChange={(e) => setFormComprar({ ...formComprar, client: e.target.value })} />
                <input type="tel" placeholder="(XX) XXXXX-XXXX" value={formComprar.phone} onChange={(e) => setFormComprar({ ...formComprar, phone: formatPhone(e.target.value) })} />
                <input type="text" placeholder="PRODUTO/SERVIÇO" value={formComprar.product} onChange={(e) => setFormComprar({ ...formComprar, product: e.target.value })} />
                <select value={formComprar.tire_type} onChange={(e) => {
                  const nextType = e.target.value;
                  setFormComprar({ ...formComprar, tire_type: nextType, base_trade: nextType === 'recap' ? !!formComprar.base_trade : false });
                }}>
                  {TIRE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {formComprar.tire_type === 'recap' && (
                  <button
                    type="button"
                    className={`flow-bt trade-toggle ${formComprar.base_trade ? 'active' : ''}`}
                    onClick={() => setFormComprar({ ...formComprar, base_trade: !formComprar.base_trade })}
                    title="Pneu a base de troca"
                    aria-pressed={!!formComprar.base_trade}
                  >
                    <span className="trade-check">✓</span>
                    <span className="trade-text">Pneu a base de troca</span>
                  </button>
                )}
                <input type="text" placeholder="Valor (R$)" value={priceDisplayComprar} onChange={(e) => setPriceDisplayComprar(formatPrice(e.target.value))} />
                <input type="number" placeholder="Quantidade" value={formComprar.quantity} onChange={(e) => setFormComprar({ ...formComprar, quantity: e.target.value })} min="1" />
                <select value={formComprar.desfecho} onChange={(e) => setFormComprar({ ...formComprar, desfecho: e.target.value })}>
                  {DESFECHO_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <div className="flow-form-actions">
                  <button type="submit" className="flow-btn-submit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                      {editingComprar ? <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path> : <><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></>}
                    </svg>
                    {editingComprar ? 'Atualizar' : 'Adicionar'}
                  </button>
                  {editingComprar && (
                    <button type="button" className="flow-btn-cancel" onClick={() => { setEditingComprar(null); setFormComprar({ client: '', phone: '', product: '', tire_type: 'new', unit_price: '', quantity: '1', desfecho: 'entrega', base_trade: false }); setPriceDisplayComprar('0,00'); }}>
                      ✕ Cancelar
                    </button>
                  )}
                </div>
              </form>

              <div className="flow-table-wrapper">
                {comprarDepois.length === 0 ? (
                  <p className="flow-empty">Nenhum registro</p>
                ) : (
                  <table className="flow-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Cliente</th>
                        <th>Telefone</th>
                        <th>PRODUTO/SERVIÇO</th>
                        <th>Tipo</th>
                        <th style={{ minWidth: '100px' }}>Valor</th>
                        <th style={{ width: '60px' }}>Qtd</th>
                        <th>Desfecho</th>
                        <th style={{ width: '150px' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comprarDepois.map((item) => (
                        <tr key={item.id}>
                          <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--primary-color)' }}>{item.id}</td>
                          <td>{item.client}</td>
                          <td>{item.phone}</td>
                          <td>{item.product}</td>
                          <td><span className="flow-badge">{getTireTypeBadge(item)}</span></td>
                          <td style={{ textAlign: 'right', fontWeight: '700' }}>R$ {formatPrice(Math.round(item.unit_price * 100))}</td>
                          <td style={{ textAlign: 'center', fontWeight: '700' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'center' }}><span className="flow-badge">{getDesfechoLabel(item.desfecho)}</span></td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="flow-action-btn flow-btn-move" onClick={() => handleMoveToFaltaPagar(item)} title="Mover para Finalização">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                              </svg>
                            </button>
                            <button className="flow-action-btn" onClick={() => handleEditComprar(item)} title="Editar">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button className="flow-action-btn" onClick={() => handleDeleteComprar(item.id)} title="Deletar">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {tab === 'pagar' && (
            <>
              <form className="flow-form" onSubmit={handleAddPagar}>
                <input type="text" placeholder="Cliente" value={formPagar.client} onChange={(e) => setFormPagar({ ...formPagar, client: e.target.value })} />
                <input type="tel" placeholder="(XX) XXXXX-XXXX" value={formPagar.phone} onChange={(e) => setFormPagar({ ...formPagar, phone: formatPhone(e.target.value) })} />
                <input type="text" placeholder="PRODUTO/SERVIÇO" value={formPagar.product} onChange={(e) => setFormPagar({ ...formPagar, product: e.target.value })} />
                <select value={formPagar.tire_type} onChange={(e) => {
                  const nextType = e.target.value;
                  setFormPagar({ ...formPagar, tire_type: nextType, base_trade: nextType === 'recap' ? !!formPagar.base_trade : false });
                }}>
                  {TIRE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {formPagar.tire_type === 'recap' && (
                  <button
                    type="button"
                    className={`flow-bt trade-toggle ${formPagar.base_trade ? 'active' : ''}`}
                    onClick={() => setFormPagar({ ...formPagar, base_trade: !formPagar.base_trade })}
                    title="Pneu a base de troca"
                    aria-pressed={!!formPagar.base_trade}
                  >
                    <span className="trade-check">✓</span>
                    <span className="trade-text">Pneu a base de troca</span>
                  </button>
                )}
                <input type="text" placeholder="Valor (R$)" value={priceDisplayPagar} onChange={(e) => setPriceDisplayPagar(formatPrice(e.target.value))} />
                <input type="number" placeholder="Quantidade" value={formPagar.quantity} onChange={(e) => setFormPagar({ ...formPagar, quantity: e.target.value })} min="1" />
                <input type="date" placeholder="Data" value={formPagar.date} onChange={(e) => setFormPagar({ ...formPagar, date: e.target.value })} />
                <select value={formPagar.desfecho} onChange={(e) => setFormPagar({ ...formPagar, desfecho: e.target.value })}>
                  {DESFECHO_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <div className="flow-form-actions">
                  <button type="submit" className="flow-btn-submit flow-btn-danger">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                      {editingPagar ? <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path> : <><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></>}
                    </svg>
                    {editingPagar ? 'Atualizar' : 'Adicionar'}
                  </button>
                  {editingPagar && (
                    <button type="button" className="flow-btn-cancel" onClick={() => { setEditingPagar(null); setFormPagar({ client: '', phone: '', product: '', tire_type: 'new', unit_price: '', quantity: '1', date: '', desfecho: 'entrega', base_trade: false }); setPriceDisplayPagar('0,00'); }}>
                      ✕ Cancelar
                    </button>
                  )}
                </div>
              </form>

              <div className="flow-table-wrapper">
                {faltaPagar.length === 0 ? (
                  <p className="flow-empty">Nenhum registro</p>
                ) : (
                  <table className="flow-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Cliente</th>
                        <th>Telefone</th>
                        <th>PRODUTO/SERVIÇO</th>
                        <th>Tipo</th>
                        <th style={{ minWidth: '100px' }}>Valor</th>
                        <th style={{ width: '60px' }}>Qtd</th>
                        <th style={{ width: '120px' }}>Data</th>
                        <th>Desfecho</th>
                        <th style={{ width: '150px' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faltaPagar.map((item) => (
                        <tr key={item.id}>
                          <td style={{ textAlign: 'center', fontWeight: '700', color: '#ef4444' }}>{item.id}</td>
                          <td>{item.client}</td>
                          <td>{item.phone}</td>
                          <td>{item.product}</td>
                          <td><span className="flow-badge">{getTireTypeBadge(item)}</span></td>
                          <td style={{ textAlign: 'right', fontWeight: '700' }}>R$ {formatPrice(Math.round(item.unit_price * 100))}</td>
                          <td style={{ textAlign: 'center', fontWeight: '700' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'center' }}><span className="flow-date-badge">{formatDateDisplay(item.date)}</span></td>
                          <td style={{ textAlign: 'center' }}><span className="flow-badge">{getDesfechoLabel(item.desfecho)}</span></td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="flow-action-btn flow-btn-paid" onClick={() => handleMarkAsPaid(item)} title="Marcar como Pago">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </button>
                            <button className="flow-action-btn" onClick={() => handleEditPagar(item)} title="Editar">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button className="flow-action-btn" onClick={() => handleDeletePagar(item.id)} title="Deletar">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotesPanel;

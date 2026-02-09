import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js';

dotenv.config();

const app = express();

// Configuração de CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(url => url.trim())
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Helper to get current month in YYYY-MM format
function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Renumber IDs sequentially in a month (1, 2, 3, ...)
function renumberIdsForMonth(monthData) {
  monthData.sales.forEach((sale, index) => {
    sale.id = index + 1;
  });
}

// Get all available months
app.get('/api/months', (req, res) => {
  const months = Object.keys(db.data.months || {}).sort().reverse();
  res.json(months);
});

// Create a new month
app.post('/api/months', async (req, res) => {
  const { month } = req.body;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
  }
  
  if (db.data.months[month]) {
    return res.status(400).json({ error: 'Month already exists' });
  }
  
  db.data.months[month] = {
    sales: []
  };
  await db.write();
  res.status(201).json({ month, created: true });
});

// List sales for a specific month
app.get('/api/sales', (req, res) => {
  const month = req.query.month || getCurrentMonth();
  const monthData = db.data.months[month];
  
  if (!monthData) {
    return res.json([]);
  }
  
  const sorted = (monthData.sales || []).sort((a, b) => b.id - a.id);
  res.json(sorted);
});

// Create sale
app.post('/api/sales', async (req, res) => {
  const { date, client, phone, product, unit_price, quantity, tire_type, desfecho, month } = req.body;
  if (!date || !client || !product || unit_price == null || quantity == null || !tire_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    return res.status(400).json({ error: 'Quantity must be a positive integer (minimum 1)' });
  }
  
  const targetMonth = month || getCurrentMonth();
  
  // Ensure month exists
  if (!db.data.months[targetMonth]) {
    db.data.months[targetMonth] = {
      sales: []
    };
  }
  
  const monthData = db.data.months[targetMonth];
  const id = monthData.sales.length + 1;
  const total = Number(unit_price) * qty;
  const sale = {
    id,
    date,
    client,
    phone: phone || '',
    product,
    unit_price: Number(unit_price),
    quantity: qty,
    tire_type,
    desfecho: desfecho || 'entrega',
    total
  };
  monthData.sales.push(sale);
  await db.write();
  res.status(201).json(sale);
});

// Update sale
app.put('/api/sales/:id', async (req, res) => {
  const { id } = req.params;
  const { date, client, phone, product, unit_price, quantity, tire_type, desfecho, month } = req.body;
  
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    return res.status(400).json({ error: 'Quantity must be a positive integer (minimum 1)' });
  }
  
  const targetMonth = month || getCurrentMonth();
  const monthData = db.data.months[targetMonth];
  
  if (!monthData) {
    return res.status(404).json({ error: 'Month not found' });
  }
  
  const total = Number(unit_price) * qty;
  const saleIndex = monthData.sales.findIndex(s => s.id == id);
  if (saleIndex === -1) return res.status(404).json({ error: 'Not found' });
  
  monthData.sales[saleIndex] = {
    id: Number(id),
    date,
    client,
    phone: phone || '',
    product,
    unit_price: Number(unit_price),
    quantity: qty,
    tire_type,
    desfecho: desfecho || 'entrega',
    total
  };
  
  // Renumber all IDs to be sequential (1, 2, 3, ...)
  renumberIdsForMonth(monthData);
  
  await db.write();
  // Return the updated sale with new ID
  const updatedSale = monthData.sales[monthData.sales.length - 1];
  res.json(updatedSale);
});

// Delete sale
app.delete('/api/sales/:id', async (req, res) => {
  const { id } = req.params;
  const month = req.query.month || getCurrentMonth();
  const monthData = db.data.months[month];
  
  if (!monthData) {
    return res.status(404).json({ error: 'Month not found' });
  }
  
  const index = monthData.sales.findIndex(s => s.id == id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  monthData.sales.splice(index, 1);
  
  // Renumber all IDs to be sequential (1, 2, 3, ...)
  renumberIdsForMonth(monthData);
  
  await db.write();
  res.status(204).end();
});

// Get commissions config
app.get('/api/commissions', (req, res) => {
  res.json(db.data.commissions || { new: 5, recap: 8, recapping: 10, service: 0 });
});

// Update commissions config
app.put('/api/commissions', async (req, res) => {
  try {
    const body = req.body;
    const newVal = body.new !== undefined ? Number(body.new) : null;
    const recapVal = body.recap !== undefined ? Number(body.recap) : null;
    const recappingVal = body.recapping !== undefined ? Number(body.recapping) : null;
    const serviceVal = body.service !== undefined ? Number(body.service) : 0;

    if (newVal === null || newVal === undefined || recapVal === null || recapVal === undefined || recappingVal === null || recappingVal === undefined) {
      return res.status(400).json({ error: 'Missing commission values' });
    }

    db.data.commissions = { 
      new: newVal, 
      recap: recapVal, 
      recapping: recappingVal,
      service: serviceVal
    };
    await db.write();
    res.json(db.data.commissions);
  } catch (err) {
    console.error('Erro ao atualizar comissões:', err);
    res.status(500).json({ error: 'Erro ao salvar comissões' });
  }
});

// ===== FLUXO DE VENDAS =====

// ===== VAI COMPRAR (DEPOIS) =====
app.get('/api/comprar-depois', (req, res) => {
  const comprar = db.data.comprarDepois || [];
  const sorted = comprar.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(sorted);
});

app.post('/api/comprar-depois', async (req, res) => {
  const { client, phone, product, tire_type, unit_price, quantity, desfecho } = req.body;
  if (!client || !product || !tire_type || unit_price == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!Array.isArray(db.data.comprarDepois)) {
    db.data.comprarDepois = [];
  }

  const item = {
    id: db.data.comprarDepois.length + 1,
    client,
    phone: phone || '',
    product,
    tire_type,
    unit_price: Number(unit_price),
    quantity: Number(quantity) || 1,
    desfecho: desfecho || 'entrega',
    created_at: new Date().toISOString()
  };

  db.data.comprarDepois.push(item);
  await db.write();
  res.status(201).json(item);
});

app.put('/api/comprar-depois/:id', async (req, res) => {
  const { id } = req.params;
  const { client, phone, product, tire_type, unit_price, quantity, desfecho } = req.body;

  const comprar = db.data.comprarDepois || [];
  const itemIndex = comprar.findIndex(i => i.id == id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item não encontrado' });
  }

  comprar[itemIndex] = {
    ...comprar[itemIndex],
    client,
    phone: phone || '',
    product,
    tire_type,
    unit_price: Number(unit_price),
    quantity: Number(quantity) || 1,
    desfecho: desfecho || 'entrega'
  };

  await db.write();
  res.json(comprar[itemIndex]);
});

app.delete('/api/comprar-depois/:id', async (req, res) => {
  const { id } = req.params;

  const comprar = db.data.comprarDepois || [];
  const itemIndex = comprar.findIndex(i => i.id == id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item não encontrado' });
  }

  comprar.splice(itemIndex, 1);

  // Renumber IDs
  comprar.forEach((i, index) => {
    i.id = index + 1;
  });

  await db.write();
  res.status(204).end();
});

// Move from comprar-depois to falta-pagar
app.post('/api/comprar-depois/:id/move-to-pagar', async (req, res) => {
  const { id } = req.params;
  const { date } = req.body;
  const comprar = db.data.comprarDepois || [];
  const itemIndex = comprar.findIndex(i => i.id == id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item não encontrado' });
  }

  const item = comprar[itemIndex];

  // Add to falta pagar
  if (!Array.isArray(db.data.faltaPagar)) {
    db.data.faltaPagar = [];
  }

  const pagarItem = {
    id: db.data.faltaPagar.length + 1,
    client: item.client,
    phone: item.phone,
    product: item.product,
    tire_type: item.tire_type,
    unit_price: item.unit_price,
    quantity: item.quantity,
    desfecho: item.desfecho || 'entrega',
    date: date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };

  db.data.faltaPagar.push(pagarItem);

  // Remove from comprar
  comprar.splice(itemIndex, 1);
  comprar.forEach((i, index) => {
    i.id = index + 1;
  });

  await db.write();
  res.status(201).json({ item: pagarItem, message: 'Movido para falta pagar' });
});

// ===== FALTA PAGAR/ENTREGAR =====
app.get('/api/falta-pagar', (req, res) => {
  const pagar = db.data.faltaPagar || [];
  const sorted = pagar.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(sorted);
});

app.post('/api/falta-pagar', async (req, res) => {
  const { client, phone, product, tire_type, unit_price, quantity, date, desfecho } = req.body;
  if (!client || !product || !tire_type || unit_price == null || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!Array.isArray(db.data.faltaPagar)) {
    db.data.faltaPagar = [];
  }

  const item = {
    id: db.data.faltaPagar.length + 1,
    client,
    phone: phone || '',
    product,
    tire_type,
    unit_price: Number(unit_price),
    quantity: Number(quantity) || 1,
    desfecho: desfecho || 'entrega',
    date,
    created_at: new Date().toISOString()
  };

  db.data.faltaPagar.push(item);
  await db.write();
  res.status(201).json(item);
});

app.put('/api/falta-pagar/:id', async (req, res) => {
  const { id } = req.params;
  const { client, phone, product, tire_type, unit_price, quantity, date, desfecho } = req.body;

  const pagar = db.data.faltaPagar || [];
  const itemIndex = pagar.findIndex(i => i.id == id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item não encontrado' });
  }

  pagar[itemIndex] = {
    ...pagar[itemIndex],
    client,
    phone: phone || '',
    product,
    tire_type,
    unit_price: Number(unit_price),
    quantity: Number(quantity) || 1,
    desfecho: desfecho || 'entrega',
    date
  };

  await db.write();
  res.json(pagar[itemIndex]);
});

app.delete('/api/falta-pagar/:id', async (req, res) => {
  const { id } = req.params;

  const pagar = db.data.faltaPagar || [];
  const itemIndex = pagar.findIndex(i => i.id == id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item não encontrado' });
  }

  pagar.splice(itemIndex, 1);

  // Renumber IDs
  pagar.forEach((i, index) => {
    i.id = index + 1;
  });

  await db.write();
  res.status(204).end();
});

// Convert falta-pagar to sale
app.post('/api/falta-pagar/:id/convert-to-sale', async (req, res) => {
  const { id } = req.params;
  const pagar = db.data.faltaPagar || [];
  const itemIndex = pagar.findIndex(i => i.id == id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item não encontrado' });
  }

  const pagarItem = pagar[itemIndex];
  
  // Get the sale date - prioritize date field, then use today
  let saleDate = pagarItem.date || new Date().toISOString().split('T')[0];
  
  // Validate date format (YYYY-MM-DD)
  if (!saleDate || !/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) {
    saleDate = new Date().toISOString().split('T')[0];
  }
  
  const monthToUse = saleDate.substring(0, 7); // Gets YYYY-MM
  
  // Validate month format
  if (!monthToUse || !/^\d{4}-\d{2}$/.test(monthToUse)) {
    return res.status(400).json({ error: 'Data inválida no item' });
  }

  // Ensure month exists
  if (!db.data.months[monthToUse]) {
    db.data.months[monthToUse] = { sales: [] };
  }

  const monthData = db.data.months[monthToUse];
  const saleId = monthData.sales.length + 1;
  const total = pagarItem.unit_price * pagarItem.quantity;

  // Create sale
  const sale = {
    id: saleId,
    date: saleDate,
    client: pagarItem.client,
    phone: pagarItem.phone || '',
    product: pagarItem.product,
    unit_price: pagarItem.unit_price,
    quantity: pagarItem.quantity,
    tire_type: pagarItem.tire_type,
    desfecho: pagarItem.desfecho || 'entrega',
    total
  };

  monthData.sales.push(sale);

  // Remove from falta pagar
  pagar.splice(itemIndex, 1);
  pagar.forEach((i, index) => {
    i.id = index + 1;
  });

  await db.write();
  res.status(201).json({ sale, monthToUse, message: 'Convertido em venda' });
});

// Get full database (debug/view)
app.get('/api/database', (req, res) => {
  res.json(db.data);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

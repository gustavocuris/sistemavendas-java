import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

dotenv.config();

const mongoUri = (
  process.env.MONGODB_URI ||
  process.env.MONGODB_URL ||
  process.env.DATABASE_URL ||
  process.env.MONGO_URL ||
  ''
).trim();

if (mongoUri && !process.env.MONGODB_URI) {
  process.env.MONGODB_URI = mongoUri;
}

const shouldUseMongo = Boolean(mongoUri);
let db;

try {
  ({ default: db } = await import(shouldUseMongo ? './db-mongo.js' : './db.js'));
  console.log(`DB source: ${shouldUseMongo ? 'mongodb' : 'file'}`);
} catch (error) {
  console.error('Failed to initialize MongoDB, falling back to file DB.', error);
  ({ default: db } = await import('./db.js'));
}

const app = express();

// Configuração de CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(url => url.trim())
  : [
      'http://localhost:5173', 
      'http://localhost:5174',
      'https://sistemavendas-frontend-intercap.onrender.com'
    ];

app.use(cors({
  origin: '*',
  credentials: false
}));

app.use(express.json());

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const DEFAULT_ADMIN = {
  id: 'adm',
  username: 'ADM',
  displayName: 'Administrador',
  role: 'admin',
  passwordPlain: 'ADM@Sv2026',
  passwordHash: hashPassword('ADM@Sv2026'),
  resetToken: null,
  resetTokenExpires: null,
  createdAt: new Date().toISOString()
};

function defaultCommissions() {
  return { new: 5, recap: 8, recapping: 10, service: 0 };
}

function createDefaultUserData() {
  return {
    months: {},
    commissions: defaultCommissions(),
    comprarDepois: [],
    faltaPagar: []
  };
}

function normalizeRole(role) {
  return role === 'admin' ? 'admin' : 'user';
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    role: normalizeRole(user.role)
  };
}

function ensureDataStructures() {
  if (!db.data.months) db.data.months = {};
  if (!db.data.commissions) db.data.commissions = defaultCommissions();
  if (!Array.isArray(db.data.comprarDepois)) db.data.comprarDepois = [];
  if (!Array.isArray(db.data.faltaPagar)) db.data.faltaPagar = [];
  if (!db.data.userData) db.data.userData = {};
}

function ensureUserData(userId) {
  ensureDataStructures();
  if (!db.data.userData[userId]) {
    db.data.userData[userId] = createDefaultUserData();
  }

  const userData = db.data.userData[userId];
  if (!userData.months) userData.months = {};
  if (!userData.commissions) userData.commissions = defaultCommissions();
  if (!Array.isArray(userData.comprarDepois)) userData.comprarDepois = [];
  if (!Array.isArray(userData.faltaPagar)) userData.faltaPagar = [];

  return userData;
}

function hasBusinessData(userData) {
  if (!userData) return false;

  const hasSales = Object.values(userData.months || {}).some((monthData) => {
    const sales = monthData?.sales || [];
    return Array.isArray(sales) && sales.length > 0;
  });

  return hasSales || (userData.comprarDepois || []).length > 0 || (userData.faltaPagar || []).length > 0;
}

function migrateLegacyDataToAdmin() {
  ensureDataStructures();
  const adminData = ensureUserData(DEFAULT_ADMIN.id);

  Object.entries(db.data.months || {}).forEach(([monthKey, monthData]) => {
    const rootSales = monthData?.sales || [];
    const adminMonth = adminData.months?.[monthKey];
    const adminSales = adminMonth?.sales || [];

    if (rootSales.length === 0) return;

    if (!adminMonth || adminSales.length === 0) {
      adminData.months[monthKey] = {
        sales: JSON.parse(JSON.stringify(rootSales))
      };
    }
  });

  if ((adminData.comprarDepois || []).length === 0 && (db.data.comprarDepois || []).length > 0) {
    adminData.comprarDepois = JSON.parse(JSON.stringify(db.data.comprarDepois));
  }

  if ((adminData.faltaPagar || []).length === 0 && (db.data.faltaPagar || []).length > 0) {
    adminData.faltaPagar = JSON.parse(JSON.stringify(db.data.faltaPagar));
  }

  if (!adminData.commissions && db.data.commissions) {
    adminData.commissions = { ...db.data.commissions };
  }
}

async function resolveRequestContext(req) {
  const authData = await getAuthData();
  const users = authData.users || [];

  const headerUserId = String(req.headers['x-user-id'] || '').trim();
  const requester = users.find((u) => u.id === headerUserId) || users.find((u) => u.id === DEFAULT_ADMIN.id) || users[0];
  const requesterRole = normalizeRole(requester?.role);
  const isAdmin = requesterRole === 'admin';

  const requestedUserId = String(req.query.userId || req.headers['x-target-user-id'] || '').trim();
  const hasRequestedUser = requestedUserId && users.some((u) => u.id === requestedUserId);
  let targetUserId = isAdmin && hasRequestedUser ? requestedUserId : (requester?.id || DEFAULT_ADMIN.id);

  let userData = ensureUserData(targetUserId);

  if (!isAdmin && !hasBusinessData(userData)) {
    const adminData = ensureUserData(DEFAULT_ADMIN.id);
    if (hasBusinessData(adminData)) {
      targetUserId = DEFAULT_ADMIN.id;
      userData = adminData;
    }
  }

  return {
    authData,
    requester,
    isAdmin,
    targetUserId,
    userData,
    users
  };
}

async function getAuthData() {
  let authData = await db.getAuth();
  if (!authData) {
    authData = {
      username: 'Intercap Pneus',
      passwordHash: hashPassword('IPN2026@'),
      resetToken: null,
      resetTokenExpires: null,
      users: [
        { ...DEFAULT_ADMIN },
        {
          id: 'user-intercap',
          username: 'Intercap Pneus',
          displayName: 'Intercap Pneus',
          role: 'user',
          passwordPlain: 'IPN2026@',
          passwordHash: hashPassword('IPN2026@'),
          resetToken: null,
          resetTokenExpires: null,
          createdAt: new Date().toISOString()
        }
      ]
    };
    await db.setAuth(authData);
  }

  const authObj = typeof authData.toObject === 'function' ? authData.toObject() : authData;

  if (!Array.isArray(authObj.users)) {
    authObj.users = [];
  }

  if (!authObj.users.some((u) => u.username === DEFAULT_ADMIN.username)) {
    authObj.users.unshift({ ...DEFAULT_ADMIN });
  }

  if (authObj.username && authObj.passwordHash) {
    const hasLegacyAsUser = authObj.users.some((u) => u.username === authObj.username);
    if (!hasLegacyAsUser) {
      authObj.users.push({
        id: `user-${Date.now()}`,
        username: authObj.username,
        displayName: authObj.username,
        role: 'user',
        passwordPlain: authObj.username === 'Intercap Pneus' ? 'IPN2026@' : null,
        passwordHash: authObj.passwordHash,
        resetToken: authObj.resetToken || null,
        resetTokenExpires: authObj.resetTokenExpires || null,
        createdAt: new Date().toISOString()
      });
    }
  }

  authObj.users = authObj.users.map((u, index) => ({
    id: u.id || `user-${index + 1}`,
    username: String(u.username || '').trim(),
    displayName: String(u.displayName || u.username || '').trim(),
    role: normalizeRole(u.role),
    passwordPlain: u.passwordPlain || null,
    passwordHash: u.passwordHash,
    resetToken: u.resetToken || null,
    resetTokenExpires: u.resetTokenExpires || null,
    createdAt: u.createdAt || new Date().toISOString()
  })).filter((u) => u.username && u.passwordHash);

  authObj.users.sort((a, b) => (a.id === DEFAULT_ADMIN.id ? -1 : b.id === DEFAULT_ADMIN.id ? 1 : 0));

  const persisted = {
    username: authObj.username || 'Intercap Pneus',
    passwordHash: authObj.passwordHash || hashPassword('IPN2026@'),
    resetToken: authObj.resetToken || null,
    resetTokenExpires: authObj.resetTokenExpires || null,
    users: authObj.users
  };

  await db.setAuth(persisted);
  return persisted;
}

async function saveAuth(authData) {
  await db.setAuth({
    username: authData.username,
    passwordHash: authData.passwordHash,
    resetToken: authData.resetToken || null,
    resetTokenExpires: authData.resetTokenExpires || null,
    users: Array.isArray(authData.users) ? authData.users : []
  });
}

if (typeof db.init === 'function') {
  await db.init();
}

await db.read();
await getAuthData();
migrateLegacyDataToAdmin();
await db.write();

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
app.get('/api/months', async (req, res) => {
  const ctx = await resolveRequestContext(req);
  const months = Object.keys(ctx.userData.months || {}).sort().reverse();
  res.json(months);
});

// Get only months that contain sales
app.get('/api/months-with-sales', async (req, res) => {
  const ctx = await resolveRequestContext(req);
  const monthsWithSales = Object.entries(ctx.userData.months || {})
    .filter(([, monthData]) => Array.isArray(monthData?.sales) && monthData.sales.length > 0)
    .map(([month]) => month)
    .sort()
    .reverse();

  res.json(monthsWithSales);
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'Login e senha sao obrigatorios' });
  }

  const authData = await getAuthData();
  const passwordHash = hashPassword(password);

  const user = (authData.users || []).find((u) => u.username === username && u.passwordHash === passwordHash);

  if (user) {
    ensureUserData(user.id);
    return res.status(200).json({
      success: true,
      user: sanitizeUser(user)
    });
  }

  return res.status(401).json({ message: 'Login ou senha incorretos' });
});

// Create a new month
app.post('/api/months', async (req, res) => {
  const { month } = req.body;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
  }

  const ctx = await resolveRequestContext(req);
  
  if (ctx.userData.months[month]) {
    return res.status(400).json({ error: 'Month already exists' });
  }
  
  ctx.userData.months[month] = {
    sales: []
  };
  await db.write();
  res.status(201).json({ month, created: true });
});

// List sales for a specific month
app.get('/api/sales', async (req, res) => {
  const month = req.query.month || getCurrentMonth();
  const ctx = await resolveRequestContext(req);

  if (ctx.isAdmin && String(req.query.allUsers || '') === 'true') {
    const aggregated = [];
    const usersMap = new Map((ctx.authData.users || []).map((u) => [u.id, u]));
    Object.entries(db.data.userData || {}).forEach(([userId, userData]) => {
      const monthData = userData?.months?.[month];
      const user = usersMap.get(userId);
      (monthData?.sales || []).forEach((sale) => {
        aggregated.push({
          ...sale,
          userId,
          userName: user?.displayName || user?.username || userId
        });
      });
    });
    return res.json(aggregated.sort((a, b) => b.id - a.id));
  }

  const monthData = ctx.userData.months[month];
  
  if (!monthData) {
    return res.json([]);
  }
  
  const sorted = (monthData.sales || []).sort((a, b) => b.id - a.id);
  res.json(sorted);
});

// Create sale
app.post('/api/sales', async (req, res) => {
  const { date, client, phone, product, unit_price, quantity, tire_type, desfecho, month, base_trade, tread_type } = req.body;
  if (!date || !client || !product || unit_price == null || quantity == null || !tire_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (['new', 'recap', 'recapping'].includes(tire_type) && !tread_type) {
    return res.status(400).json({ error: 'Tread type is required for this tire type' });
  }
  
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    return res.status(400).json({ error: 'Quantity must be a positive integer (minimum 1)' });
  }
  
  const targetMonth = month || getCurrentMonth();
  
  const ctx = await resolveRequestContext(req);

  // Ensure month exists
  if (!ctx.userData.months[targetMonth]) {
    ctx.userData.months[targetMonth] = {
      sales: []
    };
  }
  
  const monthData = ctx.userData.months[targetMonth];
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
    base_trade: !!base_trade,
    tread_type: tread_type || '',
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
  const { date, client, phone, product, unit_price, quantity, tire_type, desfecho, month, base_trade, tread_type } = req.body;
  
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    return res.status(400).json({ error: 'Quantity must be a positive integer (minimum 1)' });
  }
  
  const targetMonth = month || getCurrentMonth();
  const ctx = await resolveRequestContext(req);
  const monthData = ctx.userData.months[targetMonth];
  
  if (!monthData) {
    return res.status(404).json({ error: 'Month not found' });
  }
  
  const total = Number(unit_price) * qty;
  const saleIndex = monthData.sales.findIndex(s => s.id == id);
  if (saleIndex === -1) return res.status(404).json({ error: 'Not found' });

  if (['new', 'recap', 'recapping'].includes(tire_type) && !tread_type) {
    return res.status(400).json({ error: 'Tread type is required for this tire type' });
  }
  
  monthData.sales[saleIndex] = {
    id: Number(id),
    date,
    client,
    phone: phone || '',
    product,
    unit_price: Number(unit_price),
    quantity: qty,
    tire_type,
    base_trade: !!base_trade,
    tread_type: tread_type || '',
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
  const ctx = await resolveRequestContext(req);
  const monthData = ctx.userData.months[month];
  
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
app.get('/api/commissions', async (req, res) => {
  const ctx = await resolveRequestContext(req);
  res.json(ctx.userData.commissions || defaultCommissions());
});

// Update commissions config
app.put('/api/commissions', async (req, res) => {
  try {
    const ctx = await resolveRequestContext(req);
    const body = req.body;
    const newVal = body.new !== undefined ? Number(body.new) : null;
    const recapVal = body.recap !== undefined ? Number(body.recap) : null;
    const recappingVal = body.recapping !== undefined ? Number(body.recapping) : null;
    const serviceVal = body.service !== undefined ? Number(body.service) : 0;

    if (newVal === null || newVal === undefined || recapVal === null || recapVal === undefined || recappingVal === null || recappingVal === undefined) {
      return res.status(400).json({ error: 'Missing commission values' });
    }

    ctx.userData.commissions = { 
      new: newVal, 
      recap: recapVal, 
      recapping: recappingVal,
      service: serviceVal
    };
    await db.write();
    res.json(ctx.userData.commissions);
  } catch (err) {
    console.error('Erro ao atualizar comissões:', err);
    res.status(500).json({ error: 'Erro ao salvar comissões' });
  }
});

// ===== FLUXO DE VENDAS =====

// ===== VAI COMPRAR (DEPOIS) =====
app.get('/api/comprar-depois', async (req, res) => {
  const ctx = await resolveRequestContext(req);
  const comprar = ctx.userData.comprarDepois || [];
  const sorted = comprar.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(sorted);
});

app.post('/api/comprar-depois', async (req, res) => {
  const { client, phone, product, tire_type, unit_price, quantity, desfecho, base_trade } = req.body;
  if (!client || !product || !tire_type || unit_price == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const ctx = await resolveRequestContext(req);

  if (!Array.isArray(ctx.userData.comprarDepois)) {
    ctx.userData.comprarDepois = [];
  }

  const item = {
    id: ctx.userData.comprarDepois.length + 1,
    client,
    phone: phone || '',
    product,
    tire_type,
    base_trade: !!base_trade,
    unit_price: Number(unit_price),
    quantity: Number(quantity) || 1,
    desfecho: desfecho || 'entrega',
    created_at: new Date().toISOString()
  };

  ctx.userData.comprarDepois.push(item);
  await db.write();
  res.status(201).json(item);
});

app.put('/api/comprar-depois/:id', async (req, res) => {
  const { id } = req.params;
  const { client, phone, product, tire_type, unit_price, quantity, desfecho, base_trade } = req.body;

  const ctx = await resolveRequestContext(req);
  const comprar = ctx.userData.comprarDepois || [];
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
    base_trade: !!base_trade,
    unit_price: Number(unit_price),
    quantity: Number(quantity) || 1,
    desfecho: desfecho || 'entrega'
  };

  await db.write();
  res.json(comprar[itemIndex]);
});

app.delete('/api/comprar-depois/:id', async (req, res) => {
  const { id } = req.params;

  const ctx = await resolveRequestContext(req);
  const comprar = ctx.userData.comprarDepois || [];
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
  const ctx = await resolveRequestContext(req);
  const comprar = ctx.userData.comprarDepois || [];
  const itemIndex = comprar.findIndex(i => i.id == id);

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item não encontrado' });
  }

  const item = comprar[itemIndex];

  // Add to falta pagar
  if (!Array.isArray(ctx.userData.faltaPagar)) {
    ctx.userData.faltaPagar = [];
  }

  const pagarItem = {
    id: ctx.userData.faltaPagar.length + 1,
    client: item.client,
    phone: item.phone,
    product: item.product,
    tire_type: item.tire_type,
    base_trade: !!item.base_trade,
    unit_price: item.unit_price,
    quantity: item.quantity,
    desfecho: item.desfecho || 'entrega',
    date: date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };

  ctx.userData.faltaPagar.push(pagarItem);

  // Remove from comprar
  comprar.splice(itemIndex, 1);
  comprar.forEach((i, index) => {
    i.id = index + 1;
  });

  await db.write();
  res.status(201).json({ item: pagarItem, message: 'Movido para falta pagar' });
});

// ===== FALTA PAGAR/ENTREGAR =====
app.get('/api/falta-pagar', async (req, res) => {
  const ctx = await resolveRequestContext(req);
  const pagar = ctx.userData.faltaPagar || [];
  const sorted = pagar.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(sorted);
});

app.post('/api/falta-pagar', async (req, res) => {
  const { client, phone, product, tire_type, unit_price, quantity, date, desfecho, base_trade } = req.body;
  if (!client || !product || !tire_type || unit_price == null || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const ctx = await resolveRequestContext(req);

  if (!Array.isArray(ctx.userData.faltaPagar)) {
    ctx.userData.faltaPagar = [];
  }

  const item = {
    id: ctx.userData.faltaPagar.length + 1,
    client,
    phone: phone || '',
    product,
    tire_type,
    base_trade: !!base_trade,
    unit_price: Number(unit_price),
    quantity: Number(quantity) || 1,
    desfecho: desfecho || 'entrega',
    date,
    created_at: new Date().toISOString()
  };

  ctx.userData.faltaPagar.push(item);
  await db.write();
  res.status(201).json(item);
});

app.put('/api/falta-pagar/:id', async (req, res) => {
  const { id } = req.params;
  const { client, phone, product, tire_type, unit_price, quantity, date, desfecho, base_trade } = req.body;

  const ctx = await resolveRequestContext(req);
  const pagar = ctx.userData.faltaPagar || [];
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
    base_trade: !!base_trade,
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

  const ctx = await resolveRequestContext(req);
  const pagar = ctx.userData.faltaPagar || [];
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
  const ctx = await resolveRequestContext(req);
  const pagar = ctx.userData.faltaPagar || [];
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
  if (!ctx.userData.months[monthToUse]) {
    ctx.userData.months[monthToUse] = { sales: [] };
  }

  const monthData = ctx.userData.months[monthToUse];
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
    base_trade: !!pagarItem.base_trade,
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

// Email configuration for password recovery
function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD
    }
  });
}

// Forgot password endpoint
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASSWORD) {
      return res.status(500).json({
        message: 'Email nao configurado. Defina GMAIL_USER e GMAIL_PASSWORD no backend/.env'
      });
    }

    const authData = await getAuthData();

    // Gerar token simples (tempo + random)
    const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const resetExpires = Date.now() + (2 * 60 * 60 * 1000);
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/?token=${resetToken}`;

    authData.resetToken = resetToken;
    authData.resetTokenExpires = resetExpires;
    await saveAuth(authData);

    const transporter = createTransporter();

    // Preparar email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: '🔐 Recuperação de Senha - Intercap Pneus',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #167edb 0%, #0a3d62 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">🚗 Intercap Pneus</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px;">Sistema de Gestão de Vendas</p>
          </div>

          <div style="background: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #0a3d62; margin-top: 0;">Recuperação de Senha</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Recebemos uma solicitação para recuperar sua senha. Se você não fez essa solicitação, ignore este email.
            </p>

            <p style="color: #666; line-height: 1.6;">
              Para redefinir sua senha, clique no botão abaixo:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="
                display: inline-block;
                background: linear-gradient(135deg, #167edb 0%, #0a5ba6 100%);
                color: white;
                text-decoration: none;
                padding: 14px 32px;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
              ">
                Redefinir Senha
              </a>
            </div>

            <p style="color: #999; font-size: 13px; line-height: 1.6;">
              Ou copie este link no seu navegador:<br>
              <code style="background: #f5f5f5; padding: 8px 12px; border-radius: 4px; word-break: break-all;">
                ${resetLink}
              </code>
            </p>

            <p style="color: #999; font-size: 13px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
              Este link expira em 2 horas.<br>
              Se você não fez esta solicitação, ignore este email ou entre em contato com o administrador.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
            <p>© 2026 Intercap Pneus. Todos os direitos reservados.</p>
          </div>
        </div>
      `
    };

    // Enviar email
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: 'Email enviado com sucesso! Verifique sua caixa de entrada.',
      success: true
    });

  } catch (error) {
    console.error('Erro ao enviar email:', error);
    res.status(500).json({
      message: 'Erro ao processar solicitação. Tente novamente mais tarde.',
      error: error.message
    });
  }
});

// Reset password endpoint
app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token e nova senha sao obrigatorios' });
  }

  const authData = await getAuthData();

  if (!authData.resetToken || authData.resetToken !== token) {
    return res.status(400).json({ message: 'Token invalido' });
  }

  if (!authData.resetTokenExpires || Date.now() > authData.resetTokenExpires) {
    return res.status(400).json({ message: 'Token expirado' });
  }

  authData.passwordHash = hashPassword(newPassword);
  authData.resetToken = null;
  authData.resetTokenExpires = null;
  await saveAuth(authData);

  return res.status(200).json({ success: true, message: 'Senha alterada com sucesso' });
});

function requireAdmin(ctx, res) {
  if (!ctx.isAdmin) {
    res.status(403).json({ message: 'Apenas administrador pode acessar este recurso' });
    return false;
  }
  return true;
}

app.get('/api/admin/users', async (req, res) => {
  const ctx = await resolveRequestContext(req);
  if (!requireAdmin(ctx, res)) return;

  return res.json((ctx.authData.users || []).map(sanitizeUser));
});

app.post('/api/admin/users', async (req, res) => {
  const ctx = await resolveRequestContext(req);
  if (!requireAdmin(ctx, res)) return;

  const { username, password, displayName, role } = req.body || {};
  const safeUsername = String(username || '').trim();
  const safePassword = String(password || '').trim();
  const safeDisplayName = String(displayName || safeUsername).trim();

  if (!safeUsername || !safePassword) {
    return res.status(400).json({ message: 'Username e password são obrigatórios' });
  }

  if ((ctx.authData.users || []).some((u) => u.username === safeUsername)) {
    return res.status(409).json({ message: 'Já existe usuário com este login' });
  }

  const newUser = {
    id: `user-${Date.now()}`,
    username: safeUsername,
    displayName: safeDisplayName,
    role: normalizeRole(role),
    passwordPlain: safePassword,
    passwordHash: hashPassword(safePassword),
    resetToken: null,
    resetTokenExpires: null,
    createdAt: new Date().toISOString()
  };

  ctx.authData.users.push(newUser);
  ensureUserData(newUser.id);
  await saveAuth(ctx.authData);
  await db.write();

  return res.status(201).json({ user: sanitizeUser(newUser) });
});

app.put('/api/admin/users/:id', async (req, res) => {
  const ctx = await resolveRequestContext(req);
  if (!requireAdmin(ctx, res)) return;

  const targetId = req.params.id;
  const targetUser = (ctx.authData.users || []).find((u) => u.id === targetId);
  if (!targetUser) {
    return res.status(404).json({ message: 'Usuário não encontrado' });
  }

  const { username, password, displayName, role, commissions } = req.body || {};

  if (username !== undefined) {
    const safeUsername = String(username).trim();
    if (!safeUsername) {
      return res.status(400).json({ message: 'Login inválido' });
    }
    const duplicate = (ctx.authData.users || []).find((u) => u.id !== targetId && u.username === safeUsername);
    if (duplicate) {
      return res.status(409).json({ message: 'Já existe usuário com este login' });
    }
    targetUser.username = safeUsername;
  }

  if (displayName !== undefined) {
    targetUser.displayName = String(displayName || targetUser.username).trim() || targetUser.username;
  }

  if (password !== undefined && String(password).trim()) {
    targetUser.passwordPlain = String(password);
    targetUser.passwordHash = hashPassword(String(password));
  }

  if (role !== undefined && targetUser.id !== DEFAULT_ADMIN.id) {
    targetUser.role = normalizeRole(role);
  }

  if (commissions && typeof commissions === 'object') {
    const userData = ensureUserData(targetId);
    userData.commissions = {
      new: Number(commissions.new ?? userData.commissions.new ?? 5),
      recap: Number(commissions.recap ?? userData.commissions.recap ?? 8),
      recapping: Number(commissions.recapping ?? userData.commissions.recapping ?? 10),
      service: Number(commissions.service ?? userData.commissions.service ?? 0)
    };
  }

  await saveAuth(ctx.authData);
  await db.write();

  return res.json({ user: sanitizeUser(targetUser) });
});

app.delete('/api/admin/users/:id', async (req, res) => {
  const ctx = await resolveRequestContext(req);
  if (!requireAdmin(ctx, res)) return;

  const targetId = req.params.id;
  if (targetId === DEFAULT_ADMIN.id) {
    return res.status(400).json({ message: 'Conta ADM padrão não pode ser removida' });
  }

  const beforeCount = (ctx.authData.users || []).length;
  ctx.authData.users = (ctx.authData.users || []).filter((u) => u.id !== targetId);
  if (ctx.authData.users.length === beforeCount) {
    return res.status(404).json({ message: 'Usuário não encontrado' });
  }

  if (db.data.userData && db.data.userData[targetId]) {
    delete db.data.userData[targetId];
  }

  await saveAuth(ctx.authData);
  await db.write();

  return res.status(204).end();
});

app.get('/api/admin/sales/search', async (req, res) => {
  const ctx = await resolveRequestContext(req);
  if (!requireAdmin(ctx, res)) return;

  const q = String(req.query.q || '').toLowerCase().trim();
  const month = String(req.query.month || '').trim();
  const onlyUserId = String(req.query.userId || '').trim();
  const usersMap = new Map((ctx.authData.users || []).map((u) => [u.id, u]));
  const result = [];

  Object.entries(db.data.userData || {}).forEach(([userId, userData]) => {
    if (onlyUserId && userId !== onlyUserId) return;

    Object.entries(userData.months || {}).forEach(([monthKey, monthData]) => {
      if (month && month !== monthKey) return;

      (monthData.sales || []).forEach((sale) => {
        const haystack = [sale.client, sale.phone, sale.product, String(sale.id)].join(' ').toLowerCase();
        if (!q || haystack.includes(q)) {
          result.push({
            ...sale,
            month: monthKey,
            userId,
            userName: usersMap.get(userId)?.displayName || usersMap.get(userId)?.username || userId
          });
        }
      });
    });
  });

  return res.json(result);
});

app.get('/api/admin/user-sales/:userId', async (req, res) => {
  const ctx = await resolveRequestContext(req);
  if (!requireAdmin(ctx, res)) return;

  const userId = String(req.params.userId).trim();
  if (!userId) {
    return res.status(400).json({ message: 'userId é obrigatório' });
  }

  const result = [];
  
  // Verificar vendas em userData[userId]
  const userData = db.data.userData?.[userId];
  if (userData) {
    Object.entries(userData.months || {}).forEach(([monthKey, monthData]) => {
      (monthData.sales || []).forEach((sale) => {
        result.push({
          ...sale,
          month: monthKey,
          userId,
        });
      });
    });
  }

  // Se for "Intercap Pneus" ou admin com dados legados, também verificar db.data.months
  // Isso suporta dados migrados do sistema antigo
  const user = (ctx.authData.users || []).find((u) => u.id === userId);
  if (userId === 'adm' || (user && user.username === 'Intercap Pneus')) {
    Object.entries(db.data.months || {}).forEach(([monthKey, monthData]) => {
      (monthData.sales || []).forEach((sale) => {
        // Verificar se já foi adicionado para evitar duplicatas
        if (!result.some((r) => r.id === sale.id && r.month === monthKey)) {
          result.push({
            ...sale,
            month: monthKey,
            userId,
          });
        }
      });
    });
  }

  return res.json(result);
});

app.get('/api/admin/sales/summary', async (req, res) => {
  const ctx = await resolveRequestContext(req);
  if (!requireAdmin(ctx, res)) return;

  const monthFrom = String(req.query.monthFrom || '').trim();
  const monthTo = String(req.query.monthTo || '').trim();
  const onlyUserId = String(req.query.userId || '').trim();
  const usersMap = new Map((ctx.authData.users || []).map((u) => [u.id, u]));

  const perUser = {};
  let grandTotal = 0;

  Object.entries(db.data.userData || {}).forEach(([userId, userData]) => {
    if (onlyUserId && userId !== onlyUserId) return;

    Object.entries(userData.months || {}).forEach(([monthKey, monthData]) => {
      if (monthFrom && monthKey < monthFrom) return;
      if (monthTo && monthKey > monthTo) return;

      const monthTotal = (monthData.sales || []).reduce((acc, sale) => acc + Number(sale.total || 0), 0);
      if (!perUser[userId]) {
        perUser[userId] = {
          userId,
          userName: usersMap.get(userId)?.displayName || usersMap.get(userId)?.username || userId,
          total: 0,
          months: {}
        };
      }
      perUser[userId].total += monthTotal;
      perUser[userId].months[monthKey] = (perUser[userId].months[monthKey] || 0) + monthTotal;
      grandTotal += monthTotal;
    });
  });

  return res.json({
    grandTotal,
    users: Object.values(perUser)
  });
});

app.get('/api/admin/sales/annual', async (req, res) => {
  const ctx = await resolveRequestContext(req);
  if (!requireAdmin(ctx, res)) return;

  const year = Number(req.query.year || new Date().getFullYear());
  const fromMonth = `${year}-01`;
  const toMonth = `${year}-12`;

  const monthTotals = {};
  const usersMap = new Map((ctx.authData.users || []).map((u) => [u.id, u]));

  Object.entries(db.data.userData || {}).forEach(([userId, userData]) => {
    Object.entries(userData.months || {}).forEach(([monthKey, monthData]) => {
      if (monthKey < fromMonth || monthKey > toMonth) return;
      const total = (monthData.sales || []).reduce((acc, sale) => acc + Number(sale.total || 0), 0);
      if (!monthTotals[monthKey]) {
        monthTotals[monthKey] = {
          month: monthKey,
          total: 0,
          users: {}
        };
      }
      monthTotals[monthKey].total += total;
      const userName = usersMap.get(userId)?.displayName || usersMap.get(userId)?.username || userId;
      monthTotals[monthKey].users[userName] = (monthTotals[monthKey].users[userName] || 0) + total;
    });
  });

  const list = Object.values(monthTotals).sort((a, b) => a.month.localeCompare(b.month));
  return res.json({ year, months: list });
});

app.get('/api/admin/users/credentials', async (req, res) => {
  const ctx = await resolveRequestContext(req);
  if (!requireAdmin(ctx, res)) return;

  const credentials = (ctx.authData.users || []).map((user) => ({
    id: user.id,
    displayName: user.displayName || user.username,
    username: user.username,
    role: normalizeRole(user.role),
    password: user.passwordPlain || null
  }));

  return res.json(credentials);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

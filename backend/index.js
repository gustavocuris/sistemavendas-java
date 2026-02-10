import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import db from './db-mongo.js';

dotenv.config();

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

async function getAuthData() {
  let authData = await db.getAuth();
  if (!authData) {
    authData = {
      username: 'Intercap Pneus',
      passwordHash: hashPassword('IPN2026@'),
      resetToken: null,
      resetTokenExpires: null
    };
    await db.setAuth(authData);
  }
  return authData;
}

async function saveAuth(authData) {
  await db.setAuth({
    username: authData.username,
    passwordHash: authData.passwordHash,
    resetToken: authData.resetToken || null,
    resetTokenExpires: authData.resetTokenExpires || null
  });
}

await db.read();
await getAuthData();

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

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'Login e senha sao obrigatorios' });
  }

  const authData = await getAuthData();
  const passwordHash = hashPassword(password);

  console.log('=== LOGIN DEBUG ===');
  console.log('Username recebido:', username);
  console.log('Username esperado:', authData.username);
  console.log('Hash recebido:', passwordHash);
  console.log('Hash esperado:', authData.passwordHash);
  console.log('Match username:', username === authData.username);
  console.log('Match hash:', passwordHash === authData.passwordHash);
  console.log('==================');

  if (username === authData.username && passwordHash === authData.passwordHash) {
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ message: 'Login ou senha incorretos' });
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
  const { date, client, phone, product, unit_price, quantity, tire_type, desfecho, month, base_trade } = req.body;
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
    base_trade: !!base_trade,
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
  const { date, client, phone, product, unit_price, quantity, tire_type, desfecho, month, base_trade } = req.body;
  
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
    base_trade: !!base_trade,
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

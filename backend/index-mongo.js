import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { Auth, Sale, Commission, ComprarDepois, FaltaPagar, initDB } from './db-mongo.js';

dotenv.config();

const app = express();

// Configuração de CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(url => url.trim())
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: function (origin, callback) {
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

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// ========== AUTH ==========

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: 'Login e senha sao obrigatorios' });
    }

    const authData = await Auth.findOne();
    if (!authData) {
      return res.status(500).json({ message: 'Erro ao carregar dados de autenticação' });
    }

    const passwordHash = hashPassword(password);

    if (username === authData.username && passwordHash === authData.passwordHash) {
      return res.status(200).json({ success: true });
    }

    return res.status(401).json({ message: 'Login ou senha incorretos' });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// ========== MESES ==========

app.get('/api/months', async (req, res) => {
  try {
    const sales = await Sale.distinct('month');
    const sorted = sales.sort((a, b) => b.localeCompare(a));
    res.json(sorted);
  } catch (error) {
    console.error('Erro ao buscar meses:', error);
    res.status(500).json({ error: 'Erro ao buscar meses' });
  }
});

app.post('/api/months', async (req, res) => {
  try {
    const { month } = req.body;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
    }
    
    const exists = await Sale.findOne({ month });
    if (exists) {
      return res.status(400).json({ error: 'Month already exists' });
    }
    
    res.status(201).json({ month, created: true });
  } catch (error) {
    console.error('Erro ao criar mês:', error);
    res.status(500).json({ error: 'Erro ao criar mês' });
  }
});

// ========== VENDAS ==========

app.get('/api/sales', async (req, res) => {
  try {
    const month = req.query.month || getCurrentMonth();
    const sales = await Sale.find({ month }).lean().sort({ _id: -1 });
    res.json(sales);
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    res.status(500).json({ error: 'Erro ao buscar vendas' });
  }
});

app.post('/api/sales', async (req, res) => {
  try {
    const { date, client, phone, product, unit_price, quantity, tire_type, desfecho, month } = req.body;
    
    if (!date || !client || !product || unit_price == null || quantity == null || !tire_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ error: 'Quantity must be a positive integer (minimum 1)' });
    }
    
    const targetMonth = month || getCurrentMonth();
    const total = Number(unit_price) * qty;
    
    const sale = new Sale({
      date,
      client,
      phone: phone || '',
      product,
      unit_price: Number(unit_price),
      quantity: qty,
      tire_type,
      desfecho: desfecho || 'entrega',
      total,
      month: targetMonth
    });
    
    const saved = await sale.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    res.status(500).json({ error: 'Erro ao criar venda' });
  }
});

app.put('/api/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, client, phone, product, unit_price, quantity, tire_type, desfecho, month } = req.body;
    
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ error: 'Quantity must be a positive integer (minimum 1)' });
    }
    
    const targetMonth = month || getCurrentMonth();
    const total = Number(unit_price) * qty;
    
    const updated = await Sale.findByIdAndUpdate(id, {
      date,
      client,
      phone: phone || '',
      product,
      unit_price: Number(unit_price),
      quantity: qty,
      tire_type,
      desfecho: desfecho || 'entrega',
      total,
      month: targetMonth
    }, { new: true });
    
    if (!updated) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar venda:', error);
    res.status(500).json({ error: 'Erro ao atualizar venda' });
  }
});

app.delete('/api/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Sale.findByIdAndDelete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao deletar venda:', error);
    res.status(500).json({ error: 'Erro ao deletar venda' });
  }
});

// ========== COMISSÕES ==========

app.get('/api/commissions', async (req, res) => {
  try {
    const commission = await Commission.findOne().lean();
    if (!commission) {
      return res.json({ new: 5, recap: 8, recapping: 10, service: 0 });
    }
    const result = {
      new: commission.new,
      recap: commission.recap,
      recapping: commission.recapping,
      service: commission.service
    };
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar comissões:', error);
    res.status(500).json({ error: 'Erro ao buscar comissões' });
  }
});

app.put('/api/commissions', async (req, res) => {
  try {
    const { new: newVal, recap, recapping, service } = req.body;
    
    if (newVal === null || newVal === undefined || recap === null || recap === undefined || 
        recapping === null || recapping === undefined) {
      return res.status(400).json({ error: 'Missing commission values' });
    }
    
    let commission = await Commission.findOne();
    if (!commission) {
      commission = new Commission();
    }
    
    commission.new = newVal;
    commission.recap = recap;
    commission.recapping = recapping;
    commission.service = service || 0;
    
    await commission.save();
    
    const result = {
      new: commission.new,
      recap: commission.recap,
      recapping: commission.recapping,
      service: commission.service
    };
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao atualizar comissões:', error);
    res.status(500).json({ error: 'Erro ao salvar comissões' });
  }
});

// ========== COMPRAR DEPOIS ==========

app.get('/api/comprar-depois', async (req, res) => {
  try {
    const items = await ComprarDepois.find().lean().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error('Erro ao buscar comprar-depois:', error);
    res.status(500).json({ error: 'Erro ao buscar itens' });
  }
});

app.post('/api/comprar-depois', async (req, res) => {
  try {
    const { client, phone, product, tire_type, unit_price, quantity, desfecho } = req.body;
    
    if (!client || !product || !tire_type || unit_price == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const item = new ComprarDepois({
      client,
      phone: phone || '',
      product,
      tire_type,
      unit_price: Number(unit_price),
      quantity: Number(quantity) || 1,
      desfecho: desfecho || 'entrega'
    });
    
    const saved = await item.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Erro ao criar comprar-depois:', error);
    res.status(500).json({ error: 'Erro ao criar item' });
  }
});

app.put('/api/comprar-depois/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { client, phone, product, tire_type, unit_price, quantity, desfecho } = req.body;
    
    const updated = await ComprarDepois.findByIdAndUpdate(id, {
      client,
      phone: phone || '',
      product,
      tire_type,
      unit_price: Number(unit_price),
      quantity: Number(quantity) || 1,
      desfecho: desfecho || 'entrega'
    }, { new: true });
    
    if (!updated) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar comprar-depois:', error);
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

app.delete('/api/comprar-depois/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await ComprarDepois.findByIdAndDelete(id);
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao deletar comprar-depois:', error);
    res.status(500).json({ error: 'Erro ao deletar item' });
  }
});

// ========== FALTA PAGAR ==========

app.get('/api/falta-pagar', async (req, res) => {
  try {
    const items = await FaltaPagar.find().lean().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error('Erro ao buscar falta-pagar:', error);
    res.status(500).json({ error: 'Erro ao buscar itens' });
  }
});

app.post('/api/falta-pagar', async (req, res) => {
  try {
    const { client, phone, product, tire_type, unit_price, quantity, date, desfecho } = req.body;
    
    if (!client || !product || !tire_type || unit_price == null || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const item = new FaltaPagar({
      client,
      phone: phone || '',
      product,
      tire_type,
      unit_price: Number(unit_price),
      quantity: Number(quantity) || 1,
      desfecho: desfecho || 'entrega',
      date
    });
    
    const saved = await item.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Erro ao criar falta-pagar:', error);
    res.status(500).json({ error: 'Erro ao criar item' });
  }
});

app.put('/api/falta-pagar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { client, phone, product, tire_type, unit_price, quantity, date, desfecho } = req.body;
    
    const updated = await FaltaPagar.findByIdAndUpdate(id, {
      client,
      phone: phone || '',
      product,
      tire_type,
      unit_price: Number(unit_price),
      quantity: Number(quantity) || 1,
      desfecho: desfecho || 'entrega',
      date
    }, { new: true });
    
    if (!updated) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }
    
    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar falta-pagar:', error);
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

app.delete('/api/falta-pagar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await FaltaPagar.findByIdAndDelete(id);
    res.status(204).end();
  } catch (error) {
    console.error('Erro ao deletar falta-pagar:', error);
    res.status(500).json({ error: 'Erro ao deletar item' });
  }
});

// ========== EMAIL ==========

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

    const authData = await Auth.findOne();
    const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const resetExpires = Date.now() + (2 * 60 * 60 * 1000);
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/?token=${resetToken}`;

    await Auth.updateOne({}, {
      resetToken,
      resetTokenExpires: new Date(resetExpires)
    });

    const transporter = createTransport();
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: '🔐 Recuperação de Senha - Intercap Pneus',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Recuperação de Senha</h1>
          <p><a href="${resetLink}">Clique aqui para redefinir sua senha</a></p>
          <p>Este link expira em 2 horas.</p>
        </div>
      `
    });

    res.status(200).json({ message: 'Email enviado com sucesso!', success: true });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token e nova senha sao obrigatorios' });
    }

    const authData = await Auth.findOne();

    if (!authData.resetToken || authData.resetToken !== token) {
      return res.status(400).json({ message: 'Token invalido' });
    }

    if (!authData.resetTokenExpires || new Date() > authData.resetTokenExpires) {
      return res.status(400).json({ message: 'Token expirado' });
    }

    await Auth.updateOne({}, {
      passwordHash: hashPassword(newPassword),
      resetToken: null,
      resetTokenExpires: null
    });

    return res.status(200).json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ message: 'Erro ao resetar senha' });
  }
});

// ========== DEBUG ==========

app.get('/api/database', async (req, res) => {
  try {
    const sales = await Sale.find().lean();
    const auth = await Auth.findOne().lean();
    const commissions = await Commission.findOne().lean();
    const comprarDepois = await ComprarDepois.find().lean();
    const faltaPagar = await FaltaPagar.find().lean();
    
    res.json({
      sales,
      auth: { username: auth?.username },
      commissions,
      comprarDepois,
      faltaPagar
    });
  } catch (error) {
    console.error('Erro ao buscar banco:', error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

// ========== STARTUP ==========

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await initDB();
    app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();

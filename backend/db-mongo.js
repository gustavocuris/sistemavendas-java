import mongoose from 'mongoose';

// Schemas
const authSchema = new mongoose.Schema({
  username: { type: String, unique: true, default: 'Intercap Pneus' },
  passwordHash: String,
  resetToken: String,
  resetTokenExpires: Date
});

const saleSchema = new mongoose.Schema({
  date: String,
  client: String,
  phone: String,
  product: String,
  unit_price: Number,
  quantity: Number,
  tire_type: String,
  desfecho: String,
  total: Number,
  month: String, // YYYY-MM
  createdAt: { type: Date, default: Date.now }
});

const commissionSchema = new mongoose.Schema({
  new: { type: Number, default: 5 },
  recap: { type: Number, default: 8 },
  recapping: { type: Number, default: 10 },
  service: { type: Number, default: 0 }
});

const comprarDepoisSchema = new mongoose.Schema({
  client: String,
  phone: String,
  product: String,
  tire_type: String,
  unit_price: Number,
  quantity: Number,
  desfecho: String,
  createdAt: { type: Date, default: Date.now }
});

const faltaPagarSchema = new mongoose.Schema({
  date: String,
  client: String,
  phone: String,
  product: String,
  tire_type: String,
  unit_price: Number,
  quantity: Number,
  desfecho: String,
  createdAt: { type: Date, default: Date.now }
});

// Models
const Auth = mongoose.model('Auth', authSchema);
const Sale = mongoose.model('Sale', saleSchema);
const Commission = mongoose.model('Commission', commissionSchema);
const ComprarDepois = mongoose.model('ComprarDepois', comprarDepoisSchema);
const FaltaPagar = mongoose.model('FaltaPagar', faltaPagarSchema);

export { Auth, Sale, Commission, ComprarDepois, FaltaPagar };

export async function initDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB conectado com sucesso');
    
    // Inicializar dados padrão se não existirem
    const authCount = await Auth.countDocuments();
    if (authCount === 0) {
      const crypto = await import('crypto');
      const hashPassword = (password) => crypto.default.createHash('sha256').update(password).digest('hex');
      
      await Auth.create({
        username: 'Intercap Pneus',
        passwordHash: hashPassword('IPN2026@')
      });
      console.log('Usuário padrão criado');
    }
    
    const commCount = await Commission.countDocuments();
    if (commCount === 0) {
      await Commission.create({
        new: 5,
        recap: 8,
        recapping: 10,
        service: 0
      });
      console.log('Comissões padrão criadas');
    }
  } catch (error) {
    console.error('Erro ao inicializar MongoDB:', error);
    throw error;
  }
}

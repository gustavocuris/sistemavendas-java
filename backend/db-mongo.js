import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = (
  process.env.MONGODB_URI ||
  process.env.MONGODB_URL ||
  process.env.DATABASE_URL ||
  process.env.MONGO_URL ||
  'mongodb://localhost:27017/sistemavendas'
).trim();

let mongoReady = false;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB conectado');
    mongoReady = true;
  })
  .catch(err => {
    console.error('Erro MongoDB:', err);
    mongoReady = true;
  });

const appDataSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const authSchema = new mongoose.Schema({
  _type: { type: String, default: 'main', unique: true },
  username: String,
  passwordHash: String,
  resetToken: String,
  resetTokenExpires: Date,
  users: [
    {
      id: String,
      username: String,
      displayName: String,
      role: String,
      passwordPlain: String,
      passwordHash: String,
      resetToken: String,
      resetTokenExpires: Date,
      createdAt: Date
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

const AppData = mongoose.model('AppData', appDataSchema);
const Auth = mongoose.model('Auth', authSchema);

class DB {
  constructor() {
    this.data = {
      nextId: 1,
      months: {},
      commissions: {
        new: 5,
        recap: 8,
        recapping: 10,
        service: 0
      },
      comprarDepois: [],
      faltaPagar: []
    };
  }

  async load() {
    try {
      const doc = await AppData.findOne({ key: 'main' });
      if (doc && doc.data) {
        this.data = doc.data;
      } else {
        await AppData.create({ key: 'main', data: this.data });
      }

      if (!this.data.commissions) {
        this.data.commissions = { new: 5, recap: 8, recapping: 10, service: 0 };
      }
      if (!this.data.months) this.data.months = {};
      if (!Array.isArray(this.data.comprarDepois)) this.data.comprarDepois = [];
      if (!Array.isArray(this.data.faltaPagar)) this.data.faltaPagar = [];

      if (!this.data.nextId) {
        let maxId = 0;
        Object.values(this.data.months || {}).forEach(monthData => {
          monthData.sales.forEach(sale => {
            maxId = Math.max(maxId, sale.id || 0);
          });
        });
        this.data.nextId = maxId + 1;
      }

      await this.save();
      console.log('Dados carregados do MongoDB');
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  async save() {
    try {
      await AppData.findOneAndUpdate(
        { key: 'main' },
        { data: this.data, updatedAt: new Date() },
        { upsert: true }
      );
      console.log('Dados salvos no MongoDB');
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
    }
  }

  async write() {
    await this.save();
  }

  async read() {
    await this.load();
  }

  async getAuth() {
    try {
      const auth = await Auth.findOne({ _type: 'main' });
      return auth || null;
    } catch (error) {
      console.error('Erro ao carregar auth:', error);
      return null;
    }
  }

  async setAuth(authData) {
    try {
      await Auth.findOneAndUpdate(
        { _type: 'main' },
        authData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log('Autenticacao salva no MongoDB');
    } catch (error) {
      console.error('Erro ao salvar auth:', error);
      throw error;
    }
  }

  async init() {
    try {
      // Aguardar conexão estar pronta
      let timeout = 0;
      while (!mongoReady && timeout < 5000) {
        await new Promise(resolve => setTimeout(resolve, 100));
        timeout += 100;
      }

      if (!mongoReady) {
        console.warn('MongoDB não está pronto para inicialização');
        return;
      }

      // Remover índice antigo duplicado se existir
      try {
        const authIndexes = await Auth.collection.getIndexes();
        if (authIndexes.username_1) {
          await Auth.collection.dropIndex('username_1');
          console.log('Índice antigo username_1 removido');
        }
      } catch (err) {
        // Ignorar se não existir
      }

      // Verificar e limpar duplicatas
      const auths = await Auth.find().exec();
      if (auths.length > 0) {
        console.log(`Encontradas ${auths.length} autenticações no Mongo`);
        // Manter apenas um registro com _type: 'main'
        const mainAuth = auths.find(a => a._type === 'main');
        if (mainAuth && auths.length > 1) {
          const toDelete = auths.filter(a => a._id.toString() !== mainAuth._id.toString());
          await Auth.deleteMany({ _id: { $in: toDelete.map(a => a._id) } });
          console.log(`Removidas ${toDelete.length} autenticações duplicadas`);
        }
      }
    } catch (error) {
      console.error('Erro ao inicializar:', error);
    }
  }
}

const db = new DB();
export default db;

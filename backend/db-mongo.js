import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sistemavendas';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Erro MongoDB:', err));

const appDataSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const authSchema = new mongoose.Schema({
  username: { type: String, unique: true },
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
      const auth = await Auth.findOne();
      return auth || null;
    } catch (error) {
      console.error('Erro ao carregar auth:', error);
      return null;
    }
  }

  async setAuth(authData) {
    try {
      await Auth.deleteMany({});
      await Auth.create(authData);
      console.log('Autenticacao salva no MongoDB');
    } catch (error) {
      console.error('Erro ao salvar auth:', error);
      throw error;
    }
  }
}

const db = new DB();
export default db;

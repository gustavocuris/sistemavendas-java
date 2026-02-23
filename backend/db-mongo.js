dotenv.config();

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

let connected = false;

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

const AppData = mongoose.models.AppData || mongoose.model('AppData', appDataSchema);
const Auth = mongoose.models.Auth || mongoose.model('Auth', authSchema);

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

  async init() {
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;
    try {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
      console.log('MongoDB conectado');
    } catch (error) {
      console.error('Erro MongoDB:', error);
      throw error;
    }
  }

  async read() {
    await this.init();
    const doc = await AppData.findOne({ key: 'main' }).lean();
    if (doc?.data) this.data = doc.data;
  }

  async write() {
    await this.init();
    await AppData.updateOne(
      { key: 'main' },
      { $set: { data: this.data, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  async getAuth() {
    await this.init();
    return await Auth.findOne({ _type: 'main' }).lean();
  }

  async setAuth(authData) {
    await this.init();
    await Auth.updateOne(
      { _type: 'main' },
      { $set: { ...authData, _type: 'main' } },
      { upsert: true }
    );
  }
}
}

const db = new DB();
export default db;

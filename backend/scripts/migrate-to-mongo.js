#!/usr/bin/env node

/**
 * Script para migrar dados de JSON para MongoDB
 * Uso: node migrate-to-mongo.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const salesJsonFile = path.join(__dirname, '..', 'data', 'sales.json');

// Conectar MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sistemavendas';

await mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

console.log('✅ MongoDB conectado');

const appDataSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const AppData = mongoose.model('AppData', appDataSchema);

async function migrateData() {
  try {
    if (!fs.existsSync(salesJsonFile)) {
      console.log('⚠️ Arquivo sales.json não encontrado');
      return;
    }

    const jsonData = JSON.parse(fs.readFileSync(salesJsonFile, 'utf-8'));

    await AppData.findOneAndUpdate(
      { key: 'main' },
      { data: jsonData, updatedAt: new Date() },
      { upsert: true }
    );

    console.log('Migracao completa! Dados transferidos para MongoDB');
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await mongoose.disconnect();
  }
}

migrateData();

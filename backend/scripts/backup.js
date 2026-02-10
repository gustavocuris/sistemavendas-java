#!/usr/bin/env node

/**
 * Script de Backup Manual para Sistema de Vendas
 * Copia dados principais para arquivo de backup com timestamp
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const backupDir = path.join(dataDir, 'backups');

// Criar pasta de backups se não existir
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Timestamp para nome do arquivo
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupFile = path.join(backupDir, `sales-backup-${timestamp}.json`);

try {
  const salesPath = path.join(dataDir, 'sales.json');
  
  if (fs.existsSync(salesPath)) {
    const data = fs.readFileSync(salesPath, 'utf-8');
    fs.writeFileSync(backupFile, data);
    console.log(`✅ Backup criado com sucesso: ${backupFile}`);
  } else {
    console.warn('⚠️  Arquivo sales.json não encontrado');
  }
} catch (error) {
  console.error('❌ Erro ao criar backup:', error.message);
  process.exit(1);
}

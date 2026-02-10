#!/usr/bin/env node

/**
 * Script de Restore para Sistema de Vendas
 * Restaura dados de um backup específico
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const backupDir = path.join(dataDir, 'backups');
const salesFile = path.join(dataDir, 'sales.json');

// Listar backups disponíveis
const backupFiles = fs.readdirSync(backupDir)
  .filter(f => f.startsWith('sales-backup-') && f.endsWith('.json'))
  .sort()
  .reverse();

if (backupFiles.length === 0) {
  console.error('❌ Nenhum backup encontrado');
  process.exit(1);
}

console.log('Backups disponíveis:');
backupFiles.forEach((file, idx) => {
  console.log(`${idx}: ${file}`);
});

// Usar o mais recente ou argumento da CLI
const backupIndex = parseInt(process.argv[2] || '0');
const selectedBackup = backupFiles[backupIndex];

if (!selectedBackup) {
  console.error(`❌ Backup inválido: ${backupIndex}`);
  process.exit(1);
}

try {
  const backupPath = path.join(backupDir, selectedBackup);
  const backupData = fs.readFileSync(backupPath, 'utf-8');
  
  // Validar JSON
  JSON.parse(backupData);
  
  // Fazer backup do arquivo atual antes de restaurar
  if (fs.existsSync(salesFile)) {
    const currentBackup = path.join(backupDir, `sales-backup-pre-restore-${Date.now()}.json`);
    fs.copyFileSync(salesFile, currentBackup);
    console.log(`✅ Backup dos dados atuais criado: sales-backup-pre-restore-...`);
  }
  
  // Restaurar
  fs.writeFileSync(salesFile, backupData);
  console.log(`✅ Dados restaurados de: ${selectedBackup}`);
} catch (error) {
  console.error('❌ Erro ao restaurar:', error.message);
  process.exit(1);
}

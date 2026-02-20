// Script de backup automático dos dados do sistema
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const FILES_TO_BACKUP = ['auth.json', 'initial-data.json', 'sales.json'];

function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-');
}

function backupFile(file) {
  const src = path.join(DATA_DIR, file);
  if (!fs.existsSync(src)) return;
  const dest = path.join(BACKUP_DIR, `${file.replace('.json', '')}_${getTimestamp()}.json`);
  fs.copyFileSync(src, dest);
}

function runBackup() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  FILES_TO_BACKUP.forEach(backupFile);
  console.log(`[BACKUP] Backup realizado em ${new Date().toLocaleString()}`);
}

runBackup();

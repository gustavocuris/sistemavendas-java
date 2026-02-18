import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const filePath = path.join(dataDir, 'sales.json');
const backupDir = path.join(dataDir, 'backups');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Simple JSON file storage
class DB {
  constructor(filePath) {
    this.filePath = filePath;
    this.saveCount = 0; // Counter para auto-backup a cada 10 saves
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
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const loaded = JSON.parse(content);
        
        // Se o arquivo existe mas está vazio/sem dados, tenta restaurar do backup
        if (!loaded.months || Object.keys(loaded.months).length === 0) {
          console.log('⚠️ sales.json vazio, tentando restaurar do backup...');
          this.restoreFromBackup();
          return;
        }
        
        // Migration: convert old format (flat sales) to new format (monthly)
        if (loaded.sales && !loaded.months) {
          console.log('Migrating data to monthly format...');
          this.data = {
            nextId: loaded.nextId || 1,
            months: {
              '2026-01': {
                sales: loaded.sales || []
              }
            },
            commissions: loaded.commissions || { new: 5, recap: 8, recapping: 10, service: 0 }
          };
          this.save();
        } else {
          this.data = loaded;
          
          // Ensure nextId exists at root level
          if (!this.data.nextId) {
            let maxId = 0;
            // Calculate max ID from all months
            Object.values(this.data.months || {}).forEach(monthData => {
              monthData.sales.forEach(sale => {
                maxId = Math.max(maxId, sale.id || 0);
              });
            });
            this.data.nextId = maxId + 1;
          }
          
          // Remove nextId from individual months (migrate to global)
          Object.values(this.data.months || {}).forEach(monthData => {
            delete monthData.nextId;
          });
          
          // Ensure commissions object exists with all types
          if (!this.data.commissions) {
            this.data.commissions = { new: 5, recap: 8, recapping: 10, service: 0 };
          } else {
            if (!this.data.commissions.service) this.data.commissions.service = 0;
          }
          
          // Ensure months object exists
          if (!this.data.months) {
            this.data.months = {};
          }
          this.save();
        }
      } else {
        console.log('sales.json não encontrado, restaurando do backup...');
        this.restoreFromBackup();
      }
    } catch (err) {
      console.log('Erro ao carregar dados:', err);
      console.log('Tentando restaurar do backup...');
      this.restoreFromBackup();
    }
  }

  restoreFromBackup() {
    const backupPath = path.join(path.dirname(this.filePath), 'initial-data.json');
    try {
      if (fs.existsSync(backupPath)) {
        console.log('✅ Restaurando dados do backup...');
        const backupContent = fs.readFileSync(backupPath, 'utf-8');
        this.data = JSON.parse(backupContent);
        this.save();
        console.log('✅ Dados restaurados com sucesso!');
      } else {
        console.log('❌ Arquivo de backup não encontrado: ' + backupPath);
        this.save();
      }
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      this.save();
    }
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    
    // Auto-backup a cada 10 saves
    this.saveCount++;
    if (this.saveCount % 10 === 0) {
      this.createAutoBackup();
    }
  }

  createAutoBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupFile = path.join(backupDir, `auto-backup-${timestamp}.json`);
      fs.copyFileSync(this.filePath, backupFile);
      console.log(`✅ Auto-backup criado: auto-backup-${timestamp}.json`);
    } catch (error) {
      console.error('Erro ao criar auto-backup:', error);
    }
  }

  async write() {
    this.save();
  }

  async read() {
    this.load();
  }

  async getAuth() {
    const authPath = path.join(dataDir, 'auth.json');
    try {
      if (fs.existsSync(authPath)) {
        const content = fs.readFileSync(authPath, 'utf-8');
        return JSON.parse(content);
      }
      return null;
    } catch (error) {
      console.error('Erro ao carregar auth:', error);
      return null;
    }
  }

  async setAuth(authData) {
    const authPath = path.join(dataDir, 'auth.json');
    try {
      fs.writeFileSync(authPath, JSON.stringify(authData, null, 2), 'utf-8');
      console.log('Autenticacao salva');
    } catch (error) {
      console.error('Erro ao salvar auth:', error);
      throw error;
    }
  }
}

const db = new DB(filePath);

export default db;

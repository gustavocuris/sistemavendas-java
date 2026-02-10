import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const filePath = path.join(dataDir, 'sales.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Simple JSON file storage
class DB {
  constructor(filePath) {
    this.filePath = filePath;
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
  }

  async write() {
    this.save();
  }

  async read() {
    this.load();
  }
}

const db = new DB(filePath);

export default db;

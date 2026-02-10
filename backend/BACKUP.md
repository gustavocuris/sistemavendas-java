# 🔄 Sistema de Backup e Restore

## 📋 Resumo

O sistema agora tem proteção automática contra perda de dados:

1. **Auto-backup automático**: A cada 10 salvamentos, cria um backup com timestamp
2. **Restore automático**: Se `sales.json` desaparecer, restaura automaticamente de `initial-data.json`
3. **Backup manual**: Scripts para fazer backup/restore manualmente quando necessário

## 🔧 Como Usar

### Auto-Backup (Automático)
Já está funcionando! A cada 10 salvamentos de dados, um backup é criado automaticamente em:
```
backend/data/backups/auto-backup-YYYY-MM-DD-HH-mm-ss.json
```

### Backup Manual
Para criar um backup manual agora:
```bash
npm run backup
```
Cria arquivo: `backend/data/backups/sales-backup-YYYY-MM-DD-HH-mm-ss.json`

### Restore Manual
Para listar e restaurar de um backup:
```bash
npm run restore
```

Ou restaurar um backup específico:
```bash
npm run restore 5    # Restaura o 5º backup mais recente
```

## 🛡️ Proteção em Produção (Render)

No Render, o sistema funciona assim:

1. **Durante uso normal**: Dados salvos em `sales.json` (na memória/disco do container)
2. **Ao detectar perda**: Se `sales.json` desaparecer, restaura de `initial-data.json` (rastreado no Git)
3. **Backup automático**: A cada 10 saves, cria backup em `backups/` (pode ser sincronizado com Git)

## 📊 Estrutura de Dados

```
backend/data/
├── sales.json                 # Dados principais (em uso)
├── auth.json                  # Autenticação (rastreado no Git)
├── initial-data.json          # Backup inicial (rastreado no Git)
└── backups/                   # Backup automáticos
    ├── auto-backup-YYYY-MM-DD-...json
    ├── sales-backup-YYYY-MM-DD-...json
    └── sales-backup-pre-restore-....json
```

## 🚨 Para Recuperar Dados Perdidos

Se você perdeu dados de Janeiro/Fevereiro:

1. **Opção 1 - Restaurar de backup automático:**
   ```bash
   npm run restore
   # Seleciona o backup mais próximo da data
   ```

2. **Opção 2 - Atualizar `initial-data.json`:**
   - Editar `backend/data/initial-data.json` com os dados históricos
   - Fazer commit e push: `git add backend/data/initial-data.json && git push`
   - Sistema vai restaurar automaticamente

3. **Opção 3 - Re-inserir manualmente:**
   - Usar o sistema para inserir novamente os dados de Jan/Feb
   - Sistema vai criar backups automaticamente

## ✅ Checklist de Deploye

- ✅ Auto-backup implementado (a cada 10 saves)
- ✅ Auto-restore implementado (detecta arquivo vazio)
- ✅ Scripts de backup/restore criados
- ✅ Pasta `backups/` criada automaticamente
- ✅ `initial-data.json` rastreado no Git (backup seguro)
- ✅ `auth.json` rastreado no Git (autenticação segura)

## 🔐 Segurança

- ✅ Dados sensíveis (`auth.json`) rastreados no Git (seguro para CI/CD)
- ✅ Dados voláteis (`sales.json`) têm backup automático
- ✅ Histórico de backups mantido em `backups/`
- ✅ Restore automático garante continuidade

## 📱 Próximas Melhorias

- [ ] Implementar backup em S3/Cloud Storage
- [ ] Sincronizar backups com repositório Git automaticamente
- [ ] Dashboard para visualizar histórico de backups
- [ ] Agendador de backups periódicos

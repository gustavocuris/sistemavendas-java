# Backup Automático do Sistema de Vendas

## Como funciona
- O script `scripts/auto-backup.js` faz backup dos arquivos principais de dados (`auth.json`, `initial-data.json`, `sales.json`) para a pasta `data/backups`.
- O nome do backup inclui data e hora, permitindo múltimos backups sem sobrescrever.

## Como rodar manualmente
- Pelo Windows (cmd):
  ```
  cd backend
  auto-backup-task.bat
  ```
- Pelo PowerShell:
  ```
  cd backend
  ./auto-backup-task.ps1
  ```
- Ou diretamente pelo Node.js:
  ```
  cd backend
  node scripts/auto-backup.js
  ```

## Como agendar backups automáticos
- **Windows:**
  - Use o Agendador de Tarefas do Windows para rodar `auto-backup-task.bat` ou `auto-backup-task.ps1` a cada X minutos/horas.
- **Linux/Servidor:**
  - Use cron para rodar `node scripts/auto-backup.js` periodicamente.

## Recomendações
- Faça backup pelo menos a cada 1 hora em produção.
- Mantenha backups em local seguro.
- Limpe backups antigos periodicamente para não encher o disco.

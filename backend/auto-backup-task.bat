@echo off
:: Executa o backup automático dos dados do sistema
cd /d %~dp0
node scripts/auto-backup.js

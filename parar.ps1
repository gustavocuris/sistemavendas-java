$ErrorActionPreference = "SilentlyContinue"

Write-Host "============================================" -ForegroundColor Red
Write-Host "   PARANDO SISTEMA DE VENDAS" -ForegroundColor Red
Write-Host "============================================" -ForegroundColor Red
Write-Host ""

Write-Host "Encerrando processos Node..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host ""
Write-Host "✓ Todos os processos foram encerrados." -ForegroundColor Green
Write-Host ""

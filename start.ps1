# Script de Inicialização - Sistema de Vendas

# IMPORTANTE: Execute este script na raiz do projeto!
# PowerShell: .\start.ps1

Write-Host "🚀 Iniciando Sistema de Vendas..." -ForegroundColor Green
Write-Host ""

# Verifica se está na raiz do projeto
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "❌ ERRO: Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

# Backend
Write-Host "📦 Iniciando Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host '🔧 Backend rodando em http://localhost:3001' -ForegroundColor Green; node index.js"

Start-Sleep -Seconds 3

# Frontend
Write-Host "📦 Iniciando Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host '🌐 Frontend rodando em http://localhost:5173' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "✅ Sistema iniciado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 URLs:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Para parar: Feche as janelas do terminal abertas" -ForegroundColor Yellow

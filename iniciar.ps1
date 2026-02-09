$ErrorActionPreference = "SilentlyContinue"

Write-Host "============================================" -ForegroundColor Green
Write-Host "   SISTEMA DE VENDAS - PNEUS" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

Write-Host "Matando processos Node anteriores..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

Write-Host "[1/3] Iniciando Backend (porta 3001)..." -ForegroundColor Cyan
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm start" -PassThru -WindowStyle Normal

Write-Host "Aguardando backend iniciar..." -ForegroundColor Yellow
for ($i = 1; $i -le 15; $i++) {
    Write-Host "." -NoNewline -ForegroundColor Yellow
    Start-Sleep -Seconds 1
    
    # Tenta conectar ao backend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/sales?month=2026-02" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host " ✓ Backend pronto!" -ForegroundColor Green
            break
        }
    } catch { }
}

Write-Host ""
Write-Host "[2/3] Iniciando Frontend (porta 5174)..." -ForegroundColor Cyan
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -PassThru -WindowStyle Normal

Write-Host "Aguardando frontend iniciar..." -ForegroundColor Yellow
for ($i = 1; $i -le 15; $i++) {
    Write-Host "." -NoNewline -ForegroundColor Yellow
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host ""
Write-Host "[3/3] Abrindo navegador..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
Start-Process "http://localhost:5174"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   ✓ SISTEMA INICIADO COM SUCESSO!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:5174" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3001/api/sales" -ForegroundColor Cyan
Write-Host ""
Write-Host "Feche as janelas do PowerShell para parar o sistema." -ForegroundColor Yellow
Write-Host "Ou execute: parar.ps1" -ForegroundColor Yellow
Write-Host ""

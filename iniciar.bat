@echo off
chcp 65001 >nul
color 0A
cls

echo ============================================
echo   SISTEMA DE VENDAS - PNEUS
echo ============================================
echo.
echo Encerrando processos anteriores...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak

echo Iniciando Backend e Frontend...
echo.

REM Inicia o Backend
echo.
echo [1/2] Iniciando Backend (porta 3001)...
cd /d "%~dp0backend"
start "Backend - Sistema de Vendas" cmd /k "npm start"

REM Aguarda o backend iniciar
echo Aguardando backend iniciar (10 segundos)...
timeout /t 10 /nobreak

REM Inicia o Frontend
echo.
echo [2/2] Iniciando Frontend (porta 5174)...
cd /d "%~dp0frontend"
start "Frontend - Sistema de Vendas" cmd /k "npm run dev"

REM Aguarda o frontend estar pronto
echo Aguardando frontend iniciar (8 segundos)...
timeout /t 8 /nobreak

REM Abre o navegador
echo.
echo ============================================
echo ✓ SISTEMA INICIADO COM SUCESSO!
echo ============================================
echo.
echo Frontend: http://localhost:5174
echo Backend:  http://localhost:3001
echo.
echo Abrindo navegador...
timeout /t 2 /nobreak
start http://localhost:5174

echo.
echo Sistema rodando! Feche as janelas do Backend e Frontend para parar.
echo Ou execute: parar.bat
echo.
pause


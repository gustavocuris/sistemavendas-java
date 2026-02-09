@echo off
chcp 65001 >nul
color 0C
cls

echo ============================================
echo   PARANDO SISTEMA DE VENDAS
echo ============================================
echo.

taskkill /F /IM node.exe

echo.
echo ✓ Todos os processos foram encerrados.
echo.
pause

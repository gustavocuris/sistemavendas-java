#!/bin/bash
# Script de Inicialização - Sistema de Vendas (Linux/Mac)

echo "🚀 Iniciando Sistema de Vendas..."
echo ""

# Verifica se está na raiz do projeto
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ ERRO: Execute este script na raiz do projeto!"
    exit 1
fi

# Backend
echo "📦 Iniciando Backend em http://localhost:3001..."
cd backend
node index.js &
BACKEND_PID=$!

sleep 2

# Frontend
echo "📦 Iniciando Frontend em http://localhost:5173..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Sistema iniciado com sucesso!"
echo ""
echo "📊 URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo ""
echo "⚠️  Para parar: Pressione Ctrl+C"
echo ""

# Aguarda interrupção
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait

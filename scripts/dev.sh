#!/usr/bin/env bash
# scripts/dev.sh
# Inicia todos os serviços necessários do projeto Aranduê em paralelo:
# 1. Backend Node.js (Porta 3001)
# 2. Microserviço Python AI-Service (Porta 8001)
# 3. Frontend React / Vite (Porta 3000)

set -e

# Ao sair (Ctrl+C), encerra todos os processos em background iniciados por este script
trap 'echo -e "\n🛑 Encerrando todos os serviços..."; kill 0' SIGINT SIGTERM EXIT

echo "🚀 Iniciando ambiente de desenvolvimento Aranduê..."

# 1. Backend Node.js
echo "📦 [1/3] Iniciando Backend Node.js na porta 3001..."
npm --prefix backend run dev &

# 2. Microserviço de IA Python
echo "🤖 [2/3] Iniciando AI Service FastAPI na porta 8001..."
.venv/bin/uvicorn app.main:app --app-dir ai-service --reload --port 8001 &

# Aguarda 2 segundos para os serviços subirem antes de disparar o frontend
sleep 2

# 3. Frontend React / Vite
echo "🌐 [3/3] Iniciando Frontend React na porta 3000..."
npm --prefix frontend run dev

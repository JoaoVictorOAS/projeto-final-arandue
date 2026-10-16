#!/usr/bin/env bash
# scripts/dev.sh
# Inicia todos os serviços necessários do projeto Aranduê em paralelo:
# 1. Backend Node.js (Porta 3001)
# 2. Microserviço Python AI-Service (Porta 8001)
# 3. Frontend React / Vite (Porta 3000)

set -e

echo "🚀 Iniciando ambiente de desenvolvimento Aranduê..."

# 0. Verificação de portas antes de iniciar os serviços
echo "🔍 Verificando disponibilidade das portas (3000, 3001, 8001)..."
ports_occupied=0

check_port() {
  local port=$1
  local service_name=$2
  local pid=""

  if command -v lsof >/dev/null 2>&1; then
    pid=$(lsof -ti :"$port" 2>/dev/null | xargs)
  elif command -v fuser >/dev/null 2>&1; then
    pid=$(fuser "$port/tcp" 2>/dev/null | xargs)
  fi

  if [ -n "$pid" ]; then
    echo "❌ Erro: Porta $port ($service_name) já está em uso pelo(s) processo(s) PID: $pid"
    echo "   Comando para liberar: kill -9 $pid"
    ports_occupied=1
    return 1
  fi

  if command -v python3 >/dev/null 2>&1; then
    if python3 -c "import socket, sys; s = socket.socket(); sys.exit(0 if s.connect_ex(('127.0.0.1', int(sys.argv[1]))) == 0 else 1)" "$port" 2>/dev/null; then
      echo "❌ Erro: Porta $port ($service_name) já está ocupada por outro serviço."
      ports_occupied=1
      return 1
    fi
  fi

  return 0
}

check_port 3001 "Backend Node.js" || true
check_port 8001 "AI Service FastAPI" || true
check_port 3000 "Frontend React / Vite" || true

if [ "$ports_occupied" -ne 0 ]; then
  echo -e "\n⚠️  Conflito de portas detectado! Encerre os processos acima antes de rodar 'npm run dev'."
  echo "   Dica rápida para liberar: kill -9 \$(lsof -ti :3000,:3001,:8001 2>/dev/null) 2>/dev/null || true"
  exit 1
fi

# Verifica integridade do ambiente virtual Python
if [ ! -f ".venv/bin/uvicorn" ]; then
  if [ -n "$ARANDUE_VENV_PATH" ] && [ -x "$ARANDUE_VENV_PATH/bin/uvicorn" ]; then
    echo "🔗 Restaurando link simbólico do ambiente virtual .venv a partir de ARANDUE_VENV_PATH..."
    ln -sfn "$ARANDUE_VENV_PATH" .venv
  elif [ -x "/home/JoaoVictor/dados/venvs/mei-arandue/bin/uvicorn" ]; then
    echo "🔗 Restaurando link simbólico do ambiente virtual .venv..."
    ln -sfn /home/JoaoVictor/dados/venvs/mei-arandue .venv
  else
    echo "❌ Erro: Ambiente virtual Python (.venv) ou uvicorn não encontrado!"
    echo "   Crie o ambiente com: python3 -m venv .venv && .venv/bin/pip install -r ai-service/requirements.txt"
    exit 1
  fi
fi

# Ao sair (Ctrl+C ou fechamento), encerra todos os processos em background iniciados por este script
trap 'echo -e "\n🛑 Encerrando todos os serviços..."; kill 0' SIGINT SIGTERM EXIT

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

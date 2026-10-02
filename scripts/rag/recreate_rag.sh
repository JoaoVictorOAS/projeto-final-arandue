#!/usr/bin/env bash
# Script para deletar e recriar o banco vetorial ChromaDB com base em docs/perguntaomei.pdf

set -e
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔄 Deletando e recriando o banco vetorial de regras do MEI (ChromaDB)..."
TMPDIR=/home/JoaoVictor/dados/tmp .venv/bin/python scripts/rag/index_mei.py --recreate

echo "✅ Banco vetorial recriado com sucesso em data/chroma_db!"
echo "💡 Para consultar: .venv/bin/python scripts/rag/query_mei.py \"sua pergunta aqui\""

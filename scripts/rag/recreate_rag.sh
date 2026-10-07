#!/usr/bin/env bash
# Script para deletar e recriar o banco vetorial ChromaDB com base em docs/perguntaomei.pdf usando e5-small

set -e
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔄 Deletando e recriando o banco vetorial de regras do MEI (ChromaDB com e5-small)..."
.venv/bin/python ai-service/scripts/index_corpus.py --targets chroma

echo "✅ Banco vetorial recriado com sucesso em data/chroma_db com a coleção regras_mei_e5!"
echo "💡 Para consultar: .venv/bin/python scripts/rag/query_mei.py \"sua pergunta aqui\""

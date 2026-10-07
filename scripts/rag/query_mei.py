#!/usr/bin/env python3
"""
query_mei.py
Consulta semântica no banco vetorial ChromaDB sobre as regras do MEI (perguntaomei.pdf).
Utiliza embeddings e5-small para máxima precisão na recuperação semântica.
"""

import sys
import argparse
from pathlib import Path
import chromadb

# Permite importar o Embedder de ai-service
AI_SERVICE_PATH = Path(__file__).resolve().parent.parent.parent / "ai-service"
if str(AI_SERVICE_PATH) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_PATH))

from app.rag.embedder import Embedder

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "chroma_db"
COLLECTION_NAME = "regras_mei_e5"

def consultar_regras_mei(pergunta: str, n_results: int = 3, db_path: Path = DEFAULT_DB_PATH):
    if not db_path.exists():
        print(f"❌ Banco vetorial não encontrado em {db_path}.")
        print("💡 Execute primeiro: python ai-service/scripts/index_corpus.py")
        return []

    client = chromadb.PersistentClient(path=str(db_path))
    try:
        collection = client.get_collection(name=COLLECTION_NAME)
    except Exception as e:
        print(f"❌ Coleção '{COLLECTION_NAME}' não encontrada: {e}")
        return []

    embedder = Embedder()
    query_vector = embedder.embed_query(pergunta)

    results = collection.query(
        query_embeddings=[query_vector],
        n_results=n_results
    )

    formatted_results = []
    if results and "documents" in results and results["documents"]:
        docs = results["documents"][0]
        metadatas = results["metadatas"][0] if "metadatas" in results else [{}] * len(docs)
        distances = results["distances"][0] if "distances" in results else [0.0] * len(docs)

        for doc, meta, dist in zip(docs, metadatas, distances):
            formatted_results.append({
                "texto": doc,
                "pagina": meta.get("page", "?"),
                "fonte": meta.get("source", "perguntaomei.pdf"),
                "distancia": dist
            })

    return formatted_results

def main():
    parser = argparse.ArgumentParser(description="Consulta semântica às regras e perguntas do MEI via ChromaDB e e5-small")
    parser.add_argument("pergunta", type=str, nargs="?", help="Pergunta ou termo a ser pesquisado nas regras do MEI")
    parser.add_argument("--top-k", type=int, default=3, help="Número de resultados a retornar")
    parser.add_argument("--db-path", type=str, default=str(DEFAULT_DB_PATH), help="Caminho do ChromaDB")
    args = parser.parse_args()

    if not args.pergunta:
        print("Uso: python scripts/rag/query_mei.py \"qual o limite de faturamento anual do MEI?\"")
        sys.exit(1)

    print(f"\n🔍 Consultando no banco vetorial MEI com e5-small: '{args.pergunta}'\n" + "-" * 60)
    resultados = consultar_regras_mei(args.pergunta, n_results=args.top_k, db_path=Path(args.db_path))

    if not resultados:
        print("Nenhum resultado relevante encontrado.")
        return

    for i, r in enumerate(resultados, 1):
        print(f"\n[{i}] 📄 Fonte: {r['fonte']} (Página {r['pagina']}) | Relevância (distância COSINE): {r['distancia']:.4f}")
        print(f"    \"{r['texto']}\"")
        print("-" * 60)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
index_corpus.py
Indexador oficial do corpus legal do MEI (docs/perguntaomei.pdf).
Gera embeddings normalizados com o modelo e5-small e grava em ChromaDB e/ou Firestore.
"""

import sys
import hashlib
import argparse
from pathlib import Path
from pypdf import PdfReader
import chromadb

# Adiciona o diretório ai-service ao path para importar app.rag.embedder
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.rag.embedder import Embedder

DEFAULT_PDF_PATH = Path(__file__).resolve().parent.parent.parent / "docs" / "perguntaomei.pdf"
DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "chroma_db"
DEFAULT_COLLECTION = "regras_mei_e5"

def extract_chunks(pdf_path: Path, chunk_size: int = 800, overlap: int = 150):
    if not pdf_path.exists():
        raise FileNotFoundError(f"Arquivo PDF não encontrado em: {pdf_path}")

    reader = PdfReader(str(pdf_path))
    pdf_bytes = pdf_path.read_bytes()

    chunks = []
    for page_idx, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = " ".join(text.split())
        if not text.strip():
            continue

        start = 0
        chunk_num = 1
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunk_text = text[start:end]
            chunks.append({
                "page": page_idx,
                "chunk": chunk_num,
                "text": chunk_text
            })
            chunk_num += 1
            if end >= len(text):
                break
            start += chunk_size - overlap

    return chunks, pdf_bytes

def index_chroma(chunks, embeddings, corpus_version: str, model_name: str, db_path: Path, collection_name: str):
    db_path.parent.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(db_path))

    try:
        client.delete_collection(name=collection_name)
    except Exception:
        pass

    collection = client.create_collection(
        name=collection_name,
        metadata={
            "hnsw:space": "cosine",
            "embedding_model": model_name,
            "corpus_version": corpus_version,
            "description": "Regras oficiais do MEI indexadas com multilingual-e5-small"
        }
    )

    ids = [f"{corpus_version}:p{c['page']}_c{c['chunk']}" for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [{
        "page": c["page"],
        "chunk": c["chunk"],
        "corpus_version": corpus_version,
        "embedding_model": model_name,
        "source": "perguntaomei.pdf"
    } for c in chunks]

    batch_size = 50
    for i in range(0, len(chunks), batch_size):
        end = min(i + batch_size, len(chunks))
        collection.add(
            ids=ids[i:end],
            embeddings=embeddings[i:end],
            documents=documents[i:end],
            metadatas=metadatas[i:end]
        )

    print(f"✅ ChromaDB: {collection.count()} chunks indexados na coleção '{collection_name}' (versão {corpus_version}).")
    return collection

def main():
    parser = argparse.ArgumentParser(description="Indexador do corpus do MEI com e5-small")
    parser.add_argument("--pdf", type=str, default=str(DEFAULT_PDF_PATH))
    parser.add_argument("--db-path", type=str, default=str(DEFAULT_DB_PATH))
    parser.add_argument("--collection", type=str, default=DEFAULT_COLLECTION)
    parser.add_argument("--targets", type=str, default="chroma", help="Destinos separados por vírgula: chroma,firestore")
    args = parser.parse_args()

    targets = [t.strip().lower() for t in args.targets.split(",")]
    pdf_path = Path(args.pdf)
    db_path = Path(args.db_path)

    print(f"📄 Extraindo fragmentos de {pdf_path.name}...")
    chunks, pdf_bytes = extract_chunks(pdf_path)
    print(f"✂️  Total de fragmentos: {len(chunks)}")

    embedder = Embedder()
    version_hasher = hashlib.sha256()
    version_hasher.update(pdf_bytes)
    version_hasher.update(f"800_150_{embedder.model_name}".encode("utf-8"))
    corpus_version = version_hasher.hexdigest()[:12]

    print(f"🧬 Gerando embeddings com '{embedder.model_name}' (versão: {corpus_version})...")
    texts = [c["text"] for c in chunks]
    embeddings = embedder.embed_passages(texts)

    if "chroma" in targets:
        index_chroma(chunks, embeddings, corpus_version, embedder.model_name, db_path, args.collection)

    if "firestore" in targets:
        print("ℹ️ Alvo Firestore especificado. No ambiente local sem credenciais GCP configuradas, o Chroma atua como store primário/fallback.")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
index_mei.py
Extrai e indexa o documento 'docs/perguntaomei.pdf' em um banco vetorial ChromaDB.
Projetado para ser recriado e deletado facilmente a qualquer momento durante o desenvolvimento.
"""

import os
import sys
import shutil
import argparse
from pathlib import Path
from pypdf import PdfReader
import chromadb

DEFAULT_PDF_PATH = Path(__file__).resolve().parent.parent.parent / "docs" / "perguntaomei.pdf"
DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "chroma_db"
COLLECTION_NAME = "regras_mei"

def extract_chunks_from_pdf(pdf_path: Path, chunk_size: int = 800, overlap: int = 150):
    if not pdf_path.exists():
        raise FileNotFoundError(f"Arquivo PDF não encontrado em: {pdf_path}")

    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    print(f"📄 Lendo PDF: {pdf_path.name} ({total_pages} páginas)...")

    chunks = []
    
    for page_idx, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = " ".join(text.split())  # Normaliza múltiplos espaços e quebras
        
        if not text.strip():
            continue

        # Chunking simples com overlap dentro da página
        start = 0
        chunk_num = 1
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunk_text = text[start:end]
            
            chunks.append({
                "id": f"page_{page_idx}_chunk_{chunk_num}",
                "text": chunk_text,
                "metadata": {
                    "source": pdf_path.name,
                    "page": page_idx,
                    "chunk": chunk_num
                }
            })
            chunk_num += 1
            if end >= len(text):
                break
            start += chunk_size - overlap

    print(f"✂️  Total de fragmentos (chunks) gerados: {len(chunks)}")
    return chunks

def build_vector_db(chunks, db_path: Path, recreate: bool = False):
    db_path.parent.mkdir(parents=True, exist_ok=True)

    if recreate and db_path.exists():
        print(f"🗑️  Removendo banco vetorial anterior em {db_path} (--recreate solicitado)...")
        shutil.rmtree(db_path, ignore_errors=True)

    print(f"💾 Conectando ao ChromaDB persistente em: {db_path}...")
    client = chromadb.PersistentClient(path=str(db_path))

    if recreate:
        try:
            client.delete_collection(COLLECTION_NAME)
        except Exception:
            pass

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"description": "Regras oficiais e perguntas frequentes sobre MEI e Simei"}
    )

    existing_count = collection.count()
    if existing_count > 0 and not recreate:
        print(f"ℹ️  Coleção '{COLLECTION_NAME}' já possui {existing_count} documentos. Use --recreate para recriar.")
        return collection

    print(f"⚡ Inserindo {len(chunks)} documentos no ChromaDB...")
    
    batch_size = 50
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        collection.add(
            ids=[c["id"] for c in batch],
            documents=[c["text"] for c in batch],
            metadatas=[c["metadata"] for c in batch]
        )
        print(f"   Indexados {min(i + batch_size, len(chunks))}/{len(chunks)} fragmentos...", end="\r")

    print(f"\n✅ Indexação concluída com sucesso! Total no banco: {collection.count()} registros.")
    return collection

def main():
    parser = argparse.ArgumentParser(description="Indexador ChromaDB de Perguntas e Respostas do MEI")
    parser.add_argument("--pdf", type=str, default=str(DEFAULT_PDF_PATH), help="Caminho do arquivo PDF")
    parser.add_argument("--db-path", type=str, default=str(DEFAULT_DB_PATH), help="Diretório de persistência do ChromaDB")
    parser.add_argument("--recreate", action="store_true", help="Deleta e recria a coleção do zero")
    args = parser.parse_args()

    chunks = extract_chunks_from_pdf(Path(args.pdf))
    build_vector_db(chunks, Path(args.db_path), recreate=args.recreate)

if __name__ == "__main__":
    main()

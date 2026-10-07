from pathlib import Path
from typing import List, Dict, Any, Optional
import chromadb
from app.rag.stores.base import Trecho, VectorStore

class ChromaStore:
    def __init__(self, db_path: str = "../data/chroma_db", collection_name: str = "regras_mei_e5"):
        self.db_path = Path(db_path).resolve()
        self.collection_name = collection_name
        self._client = chromadb.PersistentClient(path=str(self.db_path))
        self._collection = self._client.get_collection(name=self.collection_name)

    def search(self, vector: List[float], k: int = 4, max_distance: float = 0.35) -> List[Trecho]:
        results = self._collection.query(
            query_embeddings=[vector],
            n_results=k
        )

        trechos: List[Trecho] = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metadatas = results["metadatas"][0] if "metadatas" in results else [{}] * len(docs)
            distances = results["distances"][0] if "distances" in results else [0.0] * len(docs)
            ids = results["ids"][0] if "ids" in results else [""] * len(docs)

            for doc_id, doc, meta, dist in zip(ids, docs, metadatas, distances):
                if dist <= max_distance:
                    trechos.append(Trecho(
                        id=doc_id,
                        texto=doc,
                        pagina=meta.get("page", 1),
                        distancia=float(dist)
                    ))

        return trechos

    def info(self) -> Dict[str, Any]:
        meta = self._collection.metadata or {}
        return {
            "embedding_model": meta.get("embedding_model", "unknown"),
            "corpus_version": meta.get("corpus_version", "unknown"),
            "count": self._collection.count()
        }

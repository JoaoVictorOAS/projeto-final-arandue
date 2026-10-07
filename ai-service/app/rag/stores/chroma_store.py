from pathlib import Path
from typing import List, Dict, Any, Optional
import chromadb
from app.rag.stores.base import Trecho, VectorStore

class ChromaStore:
    def __init__(self, db_path: str = "data/chroma_db", collection_name: str = "regras_mei_e5"):
        repo_root = Path(__file__).resolve().parent.parent.parent.parent.parent
        repo_data_db = repo_root / "data" / "chroma_db"
        cwd_candidate = Path(db_path)

        if cwd_candidate.is_absolute() and cwd_candidate.exists():
            self.db_path = cwd_candidate
        elif repo_data_db.exists():
            self.db_path = repo_data_db
        elif cwd_candidate.exists():
            self.db_path = cwd_candidate.resolve()
        else:
            self.db_path = (repo_root / db_path).resolve()

        self.collection_name = collection_name
        self._client = chromadb.PersistentClient(path=str(self.db_path))
        self._collection = self._client.get_collection(name=self.collection_name)

    def search(
        self,
        vector: List[float],
        k: int = 4,
        max_distance: float = 0.35,
        min_score: Optional[float] = None
    ) -> List[Trecho]:
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
                dist_val = float(dist)
                score_val = round(max(0.0, 1.0 - dist_val), 4)
                if dist_val <= max_distance and (min_score is None or score_val >= min_score):
                    trechos.append(Trecho(
                        id=doc_id,
                        texto=doc,
                        pagina=meta.get("page", 1),
                        distancia=dist_val,
                        score=score_val
                    ))

        return trechos

    def info(self) -> Dict[str, Any]:
        meta = self._collection.metadata or {}
        return {
            "embedding_model": meta.get("embedding_model", "unknown"),
            "corpus_version": meta.get("corpus_version", "unknown"),
            "count": self._collection.count()
        }

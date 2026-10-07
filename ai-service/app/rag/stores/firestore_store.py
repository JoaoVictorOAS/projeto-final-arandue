from typing import List, Dict, Any, Optional
from app.rag.stores.base import Trecho, VectorStore

try:
    from google.cloud import firestore
    from google.cloud.firestore_v1.base_vector_query import DistanceMeasure
    from google.cloud.firestore_v1.vector import Vector
    FIRESTORE_AVAILABLE = True
except ImportError:
    FIRESTORE_AVAILABLE = False

class FirestoreStore:
    def __init__(self, project_id: Optional[str] = None, collection_name: str = "regras_mei_chunks", corpus_version: Optional[str] = None):
        if not FIRESTORE_AVAILABLE:
            raise RuntimeError("Biblioteca google-cloud-firestore não disponível.")
        if not project_id:
            raise RuntimeError("FIRESTORE_PROJECT_ID não configurado.")

        self.project_id = project_id
        self.collection_name = collection_name
        self.corpus_version = corpus_version
        self._db = firestore.Client(project=self.project_id)
        self._collection = self._db.collection(self.collection_name)

    def search(self, vector: List[float], k: int = 4, max_distance: float = 0.35) -> List[Trecho]:
        query = self._collection
        if self.corpus_version:
            query = query.where("corpus_version", "==", self.corpus_version)

        vector_query = query.find_nearest(
            vector_field="embedding",
            query_vector=Vector(vector),
            distance_measure=DistanceMeasure.COSINE,
            limit=k,
            distance_result_field="distancia",
            distance_threshold=max_distance
        )

        results = vector_query.get()
        trechos: List[Trecho] = []
        for doc in results:
            d = doc.to_dict()
            trechos.append(Trecho(
                id=doc.id,
                texto=d.get("texto", ""),
                pagina=d.get("pagina", 1),
                distancia=float(d.get("distancia", 0.0))
            ))
        return trechos

    def info(self) -> Dict[str, Any]:
        meta_doc = self._collection.document("_meta/atual").get()
        if meta_doc.exists:
            d = meta_doc.to_dict()
            return {
                "embedding_model": d.get("embedding_model", "unknown"),
                "corpus_version": d.get("corpus_version", "unknown"),
                "count": d.get("count", 0)
            }
        return {
            "embedding_model": "unknown",
            "corpus_version": self.corpus_version or "unknown",
            "count": 0
        }

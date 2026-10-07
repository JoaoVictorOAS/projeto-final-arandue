from typing import List
from sentence_transformers import SentenceTransformer

MODEL_NAME = "intfloat/multilingual-e5-small"
EMBEDDING_DIM = 384

class Embedder:
    def __init__(self, model_name: str = MODEL_NAME):
        self.model_name = model_name
        self.dim = EMBEDDING_DIM
        self._model = SentenceTransformer(self.model_name)

    def embed_query(self, text: str) -> List[float]:
        """Gera embedding normalizado para uma consulta do usuário (prefixo query: )."""
        formatted = f"query: {text.strip()}"
        embedding = self._model.encode(formatted, normalize_embeddings=True)
        return embedding.tolist()

    def embed_passages(self, texts: List[str]) -> List[List[float]]:
        """Gera embeddings normalizados para fragmentos de documentos (prefixo passage: )."""
        formatted = [f"passage: {t.strip()}" for t in texts]
        embeddings = self._model.encode(formatted, normalize_embeddings=True)
        return [e.tolist() for e in embeddings]

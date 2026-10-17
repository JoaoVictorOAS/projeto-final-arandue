import os
from typing import List

# Previne que bibliotecas HuggingFace tentem escrever logs na pasta HOME que e read-only no Vercel/Lambda
if not os.environ.get("HF_HOME"):
    os.environ["HF_HOME"] = "/tmp/huggingface"
if not os.environ.get("FASTEMBED_CACHE_PATH"):
    os.environ["FASTEMBED_CACHE_PATH"] = "/tmp/fastembed_cache"
os.environ["HF_HUB_DISABLE_XET"] = "1"
os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "0"

from fastembed import TextEmbedding
from fastembed.common.model_description import PoolingType, ModelSource

MODEL_NAME = "intfloat/multilingual-e5-small"
EMBEDDING_DIM = 384

try:
    TextEmbedding.add_custom_model(
        model=MODEL_NAME,
        pooling=PoolingType.MEAN,
        normalization=True,
        sources=ModelSource(hf=MODEL_NAME),
        dim=EMBEDDING_DIM,
        model_file="onnx/model.onnx"
    )
except ValueError:
    pass


class Embedder:
    def __init__(self, model_name: str = MODEL_NAME):
        self.model_name = model_name
        self.dim = EMBEDDING_DIM
        self._model = TextEmbedding(model_name=self.model_name)

    def embed_query(self, text: str) -> List[float]:
        """Gera embedding normalizado para uma consulta do usuário (prefixo query: )."""
        formatted = f"query: {text.strip()}"
        embeddings = list(self._model.embed([formatted]))
        return embeddings[0].tolist()

    def embed_passages(self, texts: List[str]) -> List[List[float]]:
        """Gera embeddings normalizados para fragmentos de documentos (prefixo passage: )."""
        formatted = [f"passage: {t.strip()}" for t in texts]
        embeddings = list(self._model.embed(formatted))
        return [e.tolist() for e in embeddings]

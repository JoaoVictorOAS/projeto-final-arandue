import os
import logging
from typing import List, Optional
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL = "gemini-embedding-001"
DEFAULT_LOCAL_MODEL = "intfloat/multilingual-e5-small"
EMBEDDING_DIM = 384

try:
    from fastembed import TextEmbedding
    from fastembed.common.model_description import PoolingType, ModelSource
    try:
        TextEmbedding.add_custom_model(
            model="intfloat/multilingual-e5-small",
            pooling=PoolingType.MEAN,
            normalization=True,
            sources=ModelSource(hf="intfloat/multilingual-e5-small"),
            dim=384,
            model_file="onnx/model.onnx"
        )
    except ValueError:
        pass
    HAS_FASTEMBED = True
except ImportError:
    HAS_FASTEMBED = False


class Embedder:
    """
    Gerador de embeddings semânticos híbrido:
    - Se model_name for 'gemini-embedding-001' (ou gemini-*) e houver GEMINI_API_KEY: usa Gemini API (serverless, 0 MB disco).
    - Se model_name for 'intfloat/multilingual-e5-small' e fastembed estiver instalado: usa FastEmbed ONNX localmente.
    - Suporta fallback resiliente e normalização L2 de 384 dimensões em ambos os modos.
    """

    def __init__(self, model_name: Optional[str] = None, api_key: Optional[str] = None):
        self.model_name = model_name or os.getenv("EMBEDDING_MODEL", DEFAULT_LOCAL_MODEL)
        self.dim = EMBEDDING_DIM
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")

        self._is_gemini = self.model_name.startswith("gemini") or self.model_name.startswith("models/")
        self._gemini_client = None
        self._local_model = None

        if self._is_gemini:
            if self.api_key:
                try:
                    self._gemini_client = genai.Client(api_key=self.api_key)
                except Exception as e:
                    logger.warning(f"Não foi possível inicializar genai.Client: {e}")
        elif HAS_FASTEMBED:
            try:
                self._local_model = TextEmbedding(model_name=self.model_name)
            except Exception as e:
                logger.warning(f"Não foi possível carregar modelo local FastEmbed '{self.model_name}': {e}")

    def _normalize(self, v: List[float]) -> List[float]:
        norm = sum(x * x for x in v) ** 0.5
        if norm > 0:
            return [x / norm for x in v]
        return v

    def embed_query(self, text: str) -> List[float]:
        """Gera embedding normalizado para uma consulta do usuário."""
        if self._is_gemini:
            if not self._gemini_client:
                # Deterministic fallback se sem chave de API
                return [0.0] * (self.dim - 1) + [1.0]

            try:
                res = self._gemini_client.models.embed_content(
                    model=self.model_name,
                    contents=text.strip(),
                    config=types.EmbedContentConfig(
                        task_type="RETRIEVAL_QUERY",
                        output_dimensionality=self.dim
                    )
                )
                return self._normalize(res.embeddings[0].values)
            except Exception as e:
                logger.warning(f"Falha ao gerar embedding query via Gemini API: {e}. Usando fallback.")
                return [0.0] * (self.dim - 1) + [1.0]

        if self._local_model:
            formatted = f"query: {text.strip()}"
            embeddings = list(self._local_model.embed([formatted]))
            return embeddings[0].tolist()

        return [0.0] * (self.dim - 1) + [1.0]

    def embed_passages(self, texts: List[str]) -> List[List[float]]:
        """Gera embeddings normalizados para fragmentos de documentos."""
        if self._is_gemini:
            if not self._gemini_client:
                return [[1.0] + [0.0] * (self.dim - 1) for _ in texts]

            results = []
            batch_size = 25
            for i in range(0, len(texts), batch_size):
                batch = [t.strip() for t in texts[i:i + batch_size]]
                try:
                    res = self._gemini_client.models.embed_content(
                        model=self.model_name,
                        contents=batch,
                        config=types.EmbedContentConfig(
                            task_type="RETRIEVAL_DOCUMENT",
                            output_dimensionality=self.dim
                        )
                    )
                    for emb in res.embeddings:
                        results.append(self._normalize(emb.values))
                except Exception as e:
                    logger.warning(f"Falha ao gerar embedding batch via Gemini API: {e}.")
                    for _ in batch:
                        results.append([1.0] + [0.0] * (self.dim - 1))
            return results

        if self._local_model:
            formatted = [f"passage: {t.strip()}" for t in texts]
            embeddings = list(self._local_model.embed(formatted))
            return [e.tolist() for e in embeddings]

        return [[1.0] + [0.0] * (self.dim - 1) for _ in texts]

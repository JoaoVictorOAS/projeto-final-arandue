import time
import asyncio
import logging
from typing import List, Tuple, Optional
from app.rag.stores.base import Trecho, VectorStore

logger = logging.getLogger(__name__)

class FallbackRetriever:
    def __init__(
        self,
        embedder,
        primary_store: VectorStore,
        fallback_store: Optional[VectorStore] = None,
        primary_name: str = "firestore",
        fallback_name: str = "chroma",
        primary_timeout_s: float = 1.5,
        breaker_failures: int = 3,
        breaker_reset_s: float = 60.0,
        top_k: int = 4,
        max_distance: float = 0.35
    ):
        self.embedder = embedder
        self.primary_store = primary_store
        self.fallback_store = fallback_store
        self.primary_name = primary_name
        self.fallback_name = fallback_name
        self.primary_timeout_s = primary_timeout_s
        self.breaker_failures = breaker_failures
        self.breaker_reset_s = breaker_reset_s
        self.top_k = top_k
        self.max_distance = max_distance

        # Circuit breaker state
        self._consecutive_failures = 0
        self._breaker_opened_at: Optional[float] = None

    def _is_breaker_open(self) -> bool:
        if self._consecutive_failures >= self.breaker_failures:
            if self._breaker_opened_at and (time.time() - self._breaker_opened_at) > self.breaker_reset_s:
                # Reset temporário (half-open)
                self._consecutive_failures = 0
                self._breaker_opened_at = None
                return False
            return True
        return False

    def _record_failure(self):
        self._consecutive_failures += 1
        if self._consecutive_failures >= self.breaker_failures and not self._breaker_opened_at:
            self._breaker_opened_at = time.time()
            logger.warning(f"Circuit breaker aberto para o store primário '{self.primary_name}' ({self._consecutive_failures} falhas consecutivas).")

    def _record_success(self):
        self._consecutive_failures = 0
        self._breaker_opened_at = None

    async def retrieve(self, pergunta: str) -> Tuple[List[Trecho], str]:
        """
        Executa busca vetorial semântica resiliente.
        Retorna (lista_trechos, backend_utilizado).
        backend_utilizado pode ser: 'firestore', 'chroma' ou 'none'.
        """
        query_vec = await asyncio.to_thread(self.embedder.embed_query, pergunta)

        # 1. Tenta store primário caso circuit breaker não esteja aberto
        if self.primary_store and not self._is_breaker_open():
            try:
                trechos = await asyncio.wait_for(
                    asyncio.to_thread(self.primary_store.search, query_vec, self.top_k, self.max_distance),
                    timeout=self.primary_timeout_s
                )
                self._record_success()
                return trechos, self.primary_name
            except Exception as e:
                logger.warning(f"Falha no store primário '{self.primary_name}': {e}. Acionando fallback...")
                self._record_failure()

        # 2. Tenta store de fallback se disponível
        if self.fallback_store:
            try:
                trechos = await asyncio.to_thread(
                    self.fallback_store.search, query_vec, self.top_k, self.max_distance
                )
                return trechos, self.fallback_name
            except Exception as e:
                logger.error(f"Falha também no store de fallback '{self.fallback_name}': {e}")

        # 3. Ambos falharam
        return [], "none"

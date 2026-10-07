import pytest
import asyncio
from typing import List, Dict, Any, Optional
from app.rag.stores.base import Trecho, VectorStore
from app.rag.retriever import FallbackRetriever

class MockStore:
    def __init__(self, name: str, should_fail: bool = False, delay: float = 0.0, results: List[Trecho] = None):
        self.name = name
        self.should_fail = should_fail
        self.delay = delay
        self.results = results or []
        self.calls = 0

    def search(self, vector: List[float], k: int = 4, max_distance: float = 0.35, min_score: Optional[float] = None) -> List[Trecho]:
        self.calls += 1
        if self.delay > 0:
            import time
            time.sleep(self.delay)
        if self.should_fail:
            raise ConnectionError(f"Falha simulada no {self.name}")
        if min_score is not None:
            return [t for t in self.results if t.score >= min_score]
        return self.results

    def info(self) -> Dict[str, Any]:
        return {"embedding_model": "test", "corpus_version": "v1", "count": len(self.results)}

class MockEmbedder:
    def embed_query(self, text: str) -> List[float]:
        return [0.1] * 384

@pytest.mark.asyncio
async def test_retriever_primary_success():
    trecho = Trecho(id="t1", texto="Regra MEI", pagina=4, distancia=0.1)
    primary = MockStore("firestore", results=[trecho])
    fallback = MockStore("chroma")
    embedder = MockEmbedder()

    retriever = FallbackRetriever(
        embedder=embedder,
        primary_store=primary,
        fallback_store=fallback,
        primary_name="firestore",
        fallback_name="chroma",
        primary_timeout_s=1.0
    )

    trechos, backend = await retriever.retrieve("limite mei")
    assert backend == "firestore"
    assert len(trechos) == 1
    assert trechos[0].id == "t1"
    assert primary.calls == 1
    assert fallback.calls == 0

@pytest.mark.asyncio
async def test_retriever_primary_failure_fallback_success():
    trecho = Trecho(id="t2", texto="Regra Fallback", pagina=5, distancia=0.12)
    primary = MockStore("firestore", should_fail=True)
    fallback = MockStore("chroma", results=[trecho])
    embedder = MockEmbedder()

    retriever = FallbackRetriever(
        embedder=embedder,
        primary_store=primary,
        fallback_store=fallback,
        primary_name="firestore",
        fallback_name="chroma",
        primary_timeout_s=1.0
    )

    trechos, backend = await retriever.retrieve("limite mei")
    assert backend == "chroma"
    assert len(trechos) == 1
    assert trechos[0].id == "t2"
    assert primary.calls == 1
    assert fallback.calls == 1

@pytest.mark.asyncio
async def test_retriever_primary_timeout_fallback_success():
    trecho = Trecho(id="t3", texto="Regra Fallback Timeout", pagina=6, distancia=0.15)
    primary = MockStore("firestore", delay=0.5)
    fallback = MockStore("chroma", results=[trecho])
    embedder = MockEmbedder()

    retriever = FallbackRetriever(
        embedder=embedder,
        primary_store=primary,
        fallback_store=fallback,
        primary_name="firestore",
        fallback_name="chroma",
        primary_timeout_s=0.1  # timeout muito curto para disparar fallback
    )

    trechos, backend = await retriever.retrieve("limite mei")
    assert backend == "chroma"
    assert len(trechos) == 1
    assert trechos[0].id == "t3"
    assert fallback.calls == 1

@pytest.mark.asyncio
async def test_retriever_both_fail_returns_none():
    primary = MockStore("firestore", should_fail=True)
    fallback = MockStore("chroma", should_fail=True)
    embedder = MockEmbedder()

    retriever = FallbackRetriever(
        embedder=embedder,
        primary_store=primary,
        fallback_store=fallback,
        primary_name="firestore",
        fallback_name="chroma"
    )

    trechos, backend = await retriever.retrieve("limite mei")
    assert backend == "none"
    assert trechos == []

@pytest.mark.asyncio
async def test_retriever_empty_results_does_not_trigger_fallback():
    primary = MockStore("firestore", results=[])  # resultado vazio válido
    fallback = MockStore("chroma", results=[Trecho("fb", "fallback", 1, 0.1)])
    embedder = MockEmbedder()

    retriever = FallbackRetriever(
        embedder=embedder,
        primary_store=primary,
        fallback_store=fallback,
        primary_name="firestore",
        fallback_name="chroma"
    )

    trechos, backend = await retriever.retrieve("termo obscuro sem match")
    assert backend == "firestore"
    assert trechos == []
    assert fallback.calls == 0  # Fallback NÃO deve ser chamado em resultado vazio legítimo

@pytest.mark.asyncio
async def test_retriever_circuit_breaker():
    primary = MockStore("firestore", should_fail=True)
    fallback = MockStore("chroma", results=[Trecho("fb", "texto", 1, 0.1)])
    embedder = MockEmbedder()

    retriever = FallbackRetriever(
        embedder=embedder,
        primary_store=primary,
        fallback_store=fallback,
        primary_name="firestore",
        fallback_name="chroma",
        breaker_failures=2,
        breaker_reset_s=10.0
    )

    # Chamada 1: falha 1
    await retriever.retrieve("q1")
    assert primary.calls == 1

    # Chamada 2: falha 2 (atinge limite)
    await retriever.retrieve("q2")
    assert primary.calls == 2

    # Chamada 3: circuit breaker aberto, pula direto para o fallback sem chamar o primário
    trechos, backend = await retriever.retrieve("q3")
    assert backend == "chroma"
    assert primary.calls == 2  # Não incrementou, o breaker evitou a chamada

@pytest.mark.asyncio
async def test_retriever_applies_min_score():
    t_relevante = Trecho(id="t1", texto="Relevante", pagina=1, distancia=0.1, score=0.90)
    t_irrelevante = Trecho(id="t2", texto="Irrelevante", pagina=2, distancia=0.2, score=0.80)
    primary = MockStore("chroma", results=[t_relevante, t_irrelevante])
    embedder = MockEmbedder()

    retriever = FallbackRetriever(
        embedder=embedder,
        primary_store=primary,
        primary_name="chroma",
        min_score=0.865
    )

    trechos, backend = await retriever.retrieve("qualquer pergunta")
    assert backend == "chroma"
    assert len(trechos) == 1
    assert trechos[0].id == "t1"
    assert trechos[0].score >= 0.865


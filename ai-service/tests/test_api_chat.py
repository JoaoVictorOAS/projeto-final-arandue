import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock
from contextlib import asynccontextmanager
from app.main import app, state
from app.llm.orchestrator import RespostaLLM
from app.rag.stores.base import Trecho

@pytest.mark.asyncio
async def test_health_check_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "embedding_model" in data

@pytest.mark.asyncio
async def test_chat_unauthorized_without_secret():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/chat", json={
            "tenant_id": 1,
            "tenant_token": "token",
            "mensagem": "olá"
        })
        assert resp.status_code == 401

@pytest.mark.asyncio
async def test_chat_invalid_payload():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/chat",
            headers={"X-Internal-Secret": "super_secreto_interno_arandue_2026"},
            json={"tenant_id": "invalido"}
        )
        assert resp.status_code == 422

@pytest.mark.asyncio
async def test_chat_success_with_mocked_llm():
    # Mock do retriever e orchestrator
    mock_trecho = Trecho(id="t1", texto="Regra oficial do MEI", pagina=4, distancia=0.1)
    state["retriever"] = AsyncMock()
    state["retriever"].retrieve = AsyncMock(return_value=([mock_trecho], "chroma"))

    state["orchestrator"] = AsyncMock()
    state["orchestrator"].responder = AsyncMock(return_value=RespostaLLM(
        resposta="O limite é R$ 81.000 (pág. 4).",
        tools_usadas=["obter_resumo_caixa"],
        modelo="gemini-3.5-flash-lite"
    ))

    # Mock do async context manager do MCP pool session
    mock_session = AsyncMock()
    @asynccontextmanager
    async def mock_session_cm(tenant_id, tenant_token):
        yield mock_session

    state["mcp_pool"] = MagicMock()
    state["mcp_pool"].session = mock_session_cm

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/chat",
            headers={"X-Internal-Secret": "super_secreto_interno_arandue_2026"},
            json={
                "tenant_id": 42,
                "tenant_token": "jwt_token_valido",
                "mensagem": "qual o limite de faturamento?",
                "historico": [{"papel": "usuario", "texto": "oi"}]
            }
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["resposta"] == "O limite é R$ 81.000 (pág. 4)."
        assert data["rag_backend"] == "chroma"
        assert len(data["fontes"]) == 1
        assert data["fontes"][0]["pagina"] == 4
        assert data["tools_usadas"] == ["obter_resumo_caixa"]
        assert data["modelo"] == "gemini-3.5-flash-lite"
        assert data["latencia_ms"] >= 0

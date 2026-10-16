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
        assert data["fontes"][0]["score"] == 0.9
        assert data["tools_usadas"] == ["obter_resumo_caixa"]
        assert data["modelo"] == "gemini-3.5-flash-lite"
        assert data["latencia_ms"] >= 0


@pytest.mark.asyncio
async def test_chat_success_with_multimodal_media():
    mock_trecho = Trecho(id="t2", texto="Texto regra fiscal", pagina=2, distancia=0.05)
    state["retriever"] = AsyncMock()
    state["retriever"].retrieve = AsyncMock(return_value=([mock_trecho], "chroma"))

    state["orchestrator"] = AsyncMock()
    state["orchestrator"].responder = AsyncMock(return_value=RespostaLLM(
        resposta="Imagem analisada: comprovante de R$ 50,00 registrado com sucesso.",
        tools_usadas=["registrar_despesa"],
        modelo="gemini-3-flash-preview"
    ))

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
                "mensagem": "Lança essa despesa pra mim",
                "midia": {
                    "tipo": "imagem",
                    "dados_base64": "aGVsbG93b3JsZA==",
                    "mime_type": "image/jpeg"
                }
            }
        )

        assert resp.status_code == 200
        data = resp.json()
        assert "registrado com sucesso" in data["resposta"]
        assert "registrar_despesa" in data["tools_usadas"]
        # Garante que o orchestrator recebeu midia
        call_kwargs = state["orchestrator"].responder.call_args.kwargs
        assert call_kwargs["midia"]["tipo"] == "imagem"
        assert call_kwargs["midia"]["dados_base64"] == "aGVsbG93b3JsZA=="


@pytest.mark.asyncio
async def test_audio_transcrever_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Sem header secreto -> 401
        res_unauth = await client.post("/audio/transcrever", json={"audio_base64": "dGVzdGU="})
        assert res_unauth.status_code == 401

        # 2. Modo demonstração (sem client real)
        state["orchestrator"] = None
        res_demo = await client.post(
            "/audio/transcrever",
            headers={"X-Internal-Secret": "super_secreto_interno_arandue_2026"},
            json={"audio_base64": "dGVzdGU=", "mime_type": "audio/ogg"}
        )
        assert res_demo.status_code == 200
        data_demo = res_demo.json()
        assert data_demo["sucesso"] is True
        assert "combustível" in data_demo["transcricao"]

        # 3. Com orchestrator e client mockado
        mock_orch = MagicMock()
        mock_orch.model_name = "gemini-3-flash-preview"
        mock_response = MagicMock()
        mock_response.text = "Registrar venda de bolo de pote por 15 reais."
        mock_orch._client.models.generate_content.return_value = mock_response
        state["orchestrator"] = mock_orch

        res_mock = await client.post(
            "/audio/transcrever",
            headers={"X-Internal-Secret": "super_secreto_interno_arandue_2026"},
            json={"audio_base64": "dGVzdGU=", "mime_type": "audio/ogg"}
        )
        assert res_mock.status_code == 200
        data_mock = res_mock.json()
        assert data_mock["sucesso"] is True
        assert data_mock["transcricao"] == "Registrar venda de bolo de pote por 15 reais."


@pytest.mark.asyncio
async def test_imagem_analisar_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Sem header secreto -> 401
        res_unauth = await client.post("/imagem/analisar", json={"imagem_base64": "dGVzdGU="})
        assert res_unauth.status_code == 401

        # 2. Modo demonstração (sem client real)
        state["orchestrator"] = None
        res_demo = await client.post(
            "/imagem/analisar",
            headers={"X-Internal-Secret": "super_secreto_interno_arandue_2026"},
            json={
                "imagem_base64": "dGVzdGU=",
                "mime_type": "image/jpeg",
                "instrucao": "Identificar recibo"
            }
        )
        assert res_demo.status_code == 200
        data_demo = res_demo.json()
        assert data_demo["sucesso"] is True
        assert data_demo["tipo_detectado"] == "recibo"
        assert "dados_estruturados" in data_demo
        assert data_demo["sugestao_acao"] == "registrar_despesa"

        # 3. Com orchestrator e client mockado
        mock_orch = MagicMock()
        mock_orch.model_name = "gemini-3-flash-preview"
        mock_response = MagicMock()
        mock_response.text = '{"tipo_detectado": "comprovante_pix", "descricao": "Transferencia Pix de 120 reais recebida", "dados_estruturados": {"valor": 120.0}, "sugestao_acao": "registrar_receita"}'
        mock_orch._client.models.generate_content.return_value = mock_response
        state["orchestrator"] = mock_orch

        res_mock = await client.post(
            "/imagem/analisar",
            headers={"X-Internal-Secret": "super_secreto_interno_arandue_2026"},
            json={
                "imagem_base64": "dGVzdGU=",
                "mime_type": "image/jpeg"
            }
        )
        assert res_mock.status_code == 200
        data_mock = res_mock.json()
        assert data_mock["sucesso"] is True
        assert data_mock["tipo_detectado"] == "comprovante_pix"
        assert data_mock["sugestao_acao"] == "registrar_receita"

        # 4. Falha na API do Gemini -> 502 sem vazar detalhes internos
        mock_orch._client.models.generate_content.side_effect = Exception("Falha de conexão com a API interna do Gemini")
        res_error = await client.post(
            "/imagem/analisar",
            headers={"X-Internal-Secret": "super_secreto_interno_arandue_2026"},
            json={
                "imagem_base64": "dGVzdGU=",
                "mime_type": "image/jpeg"
            }
        )
        assert res_error.status_code == 502
        assert res_error.json()["detail"] == "Não foi possível processar a análise da imagem no momento."
        assert "Falha de conexão" not in res_error.text


@pytest.mark.asyncio
async def test_audio_transcrever_gemini_error_raises_502():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        mock_orch = MagicMock()
        mock_orch.model_name = "gemini-3-flash-preview"
        mock_orch._client.models.generate_content.side_effect = Exception("Erro interno sensível do Gemini")
        state["orchestrator"] = mock_orch

        res = await client.post(
            "/audio/transcrever",
            headers={"X-Internal-Secret": "super_secreto_interno_arandue_2026"},
            json={"audio_base64": "dGVzdGU=", "mime_type": "audio/ogg"}
        )
        assert res.status_code == 502
        assert res.json()["detail"] == "Não foi possível processar a transcrição de áudio no momento."
        assert "Erro interno" not in res.text



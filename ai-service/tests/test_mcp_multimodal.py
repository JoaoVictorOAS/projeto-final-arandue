import inspect
import pytest
from unittest.mock import patch, AsyncMock

from mcp_server.server import (
    transcrever_audio,
    analisar_imagem_documento,
)


@pytest.fixture(autouse=True)
def setup_env(monkeypatch):
    monkeypatch.setenv("TENANT_ID", "42")
    monkeypatch.setenv("TENANT_TOKEN", "fake_jwt_token_for_tenant_42")
    monkeypatch.setenv("NODE_API_URL", "http://test-node:3001/api")


@pytest.mark.asyncio
async def test_transcrever_audio_mcp():
    mock_resp = {
        "sucesso": True,
        "transcricao": "Registrar pagamento de 100 reais.",
        "duracao_estimada_s": 3.0
    }
    with patch("mcp_server.server._post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        res = await transcrever_audio(audio_base64="YXVkaW9fZGF0YQ==", mime_type="audio/ogg")
        assert res == mock_resp
        mock_post.assert_called_once_with(
            "/assistente/audio/transcrever",
            {"audio_base64": "YXVkaW9fZGF0YQ==", "mime_type": "audio/ogg"}
        )


@pytest.mark.asyncio
async def test_analisar_imagem_documento_mcp():
    mock_resp = {
        "sucesso": True,
        "tipo_detectado": "recibo",
        "descricao": "Recibo de despesa de R$ 50,00",
        "dados_estruturados": {"valor": 50.0},
        "sugestao_acao": "registrar_despesa"
    }
    with patch("mcp_server.server._post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        res = await analisar_imagem_documento(
            imagem_base64="aW1hZ2VfZGF0YQ==",
            mime_type="image/jpeg",
            instrucao="Verificar valor"
        )
        assert res == mock_resp
        mock_post.assert_called_once_with(
            "/assistente/imagem/analisar",
            {
                "imagem_base64": "aW1hZ2VfZGF0YQ==",
                "mime_type": "image/jpeg",
                "instrucao": "Verificar valor"
            }
        )


def test_mcp_security_no_tenant_parameters_multimodal():
    """Valida que nenhuma ferramenta MCP multimodal expõe parâmetros de tenant."""
    for tool_func in [
        transcrever_audio,
        analisar_imagem_documento,
    ]:
        sig = inspect.signature(tool_func)
        param_names = list(sig.parameters.keys())
        assert "tenant_id" not in param_names, f"Falha de segurança: {tool_func.__name__} expõe tenant_id"
        assert "usuario_id" not in param_names, f"Falha de segurança: {tool_func.__name__} expõe usuario_id"

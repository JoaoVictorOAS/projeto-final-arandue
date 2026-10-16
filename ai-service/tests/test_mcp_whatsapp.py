import inspect
import pytest
from unittest.mock import patch, AsyncMock

from mcp_server.server import (
    consultar_status_whatsapp,
    vincular_whatsapp,
    reiniciar_sessao_whatsapp,
)


@pytest.fixture(autouse=True)
def setup_env(monkeypatch):
    monkeypatch.setenv("TENANT_ID", "42")
    monkeypatch.setenv("TENANT_TOKEN", "fake_jwt_token_for_tenant_42")
    monkeypatch.setenv("NODE_API_URL", "http://test-node:3001/api")


@pytest.mark.asyncio
async def test_consultar_status_whatsapp_mcp():
    mock_resp = {
        "bot": {
            "status": "conectado",
            "conectado": True,
            "numero": "5511999990000",
            "qrCode": None,
        },
        "usuario_whatsapp": "5511987654321",
        "usuario_whatsapp_verificado": True,
    }
    with patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_resp
        res = await consultar_status_whatsapp()
        assert res == mock_resp
        mock_fetch.assert_called_once_with("/assistente/whatsapp/status")


@pytest.mark.asyncio
async def test_vincular_whatsapp_mcp():
    mock_resp = {
        "sucesso": True,
        "dados": {
            "whatsapp": "5511987654321",
            "formatado": "+55 (11) 98765-4321",
            "whatsapp_verificado": True,
        },
    }
    with patch("mcp_server.server._post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        res = await vincular_whatsapp(telefone="(11) 98765-4321")
        assert res.get("sucesso") is True
        assert res["dados"]["whatsapp"] == "5511987654321"
        mock_post.assert_called_once_with(
            "/assistente/whatsapp/vincular",
            {"telefone": "(11) 98765-4321"},
        )


@pytest.mark.asyncio
async def test_reiniciar_sessao_whatsapp_mcp():
    mock_resp = {
        "sucesso": True,
        "dados": {
            "status": "aguardando_qr",
            "conectado": False,
            "numero": None,
            "qrCode": "mock_qr_code",
        },
    }
    with patch("mcp_server.server._post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        res = await reiniciar_sessao_whatsapp()
        assert res.get("sucesso") is True
        assert res["dados"]["status"] == "aguardando_qr"
        mock_post.assert_called_once_with("/assistente/whatsapp/resetar", {})


def test_mcp_security_no_tenant_parameters_whatsapp():
    """Valida que nenhuma ferramenta MCP de WhatsApp expõe parâmetros de tenant."""
    for tool_func in [
        consultar_status_whatsapp,
        vincular_whatsapp,
        reiniciar_sessao_whatsapp,
    ]:
        params = inspect.signature(tool_func).parameters.keys()
        for forbidden in ["tenant", "tenant_id", "usuario", "usuario_id", "user_id"]:
            assert (
                forbidden not in params
            ), f"Tool {tool_func.__name__} expõe parâmetro proibido '{forbidden}'"

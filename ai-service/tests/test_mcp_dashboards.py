import pytest
from unittest.mock import patch, AsyncMock
import httpx
import respx

from mcp_server.server import (
    listar_dashboards,
    obter_dashboard_detalhado,
    obter_catalogo_metricas,
    criar_dashboard,
    adicionar_widget_dashboard,
    excluir_widget_dashboard,
    excluir_dashboard,
    _delete,
)

@pytest.fixture(autouse=True)
def setup_env(monkeypatch):
    monkeypatch.setenv("TENANT_ID", "42")
    monkeypatch.setenv("TENANT_TOKEN", "fake_jwt_token_for_tenant_42")
    monkeypatch.setenv("NODE_API_URL", "http://test-node:3001/api")

@pytest.mark.asyncio
async def test_listar_dashboards_mcp():
    mock_resp = [{"id": 1, "nome": "Principal", "widgets": []}]
    with patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_resp
        res = await listar_dashboards()
        assert res == mock_resp
        mock_fetch.assert_called_once_with("/dashboards")

@pytest.mark.asyncio
async def test_obter_dashboard_detalhado_mcp():
    mock_resp = {"id": 1, "nome": "Principal", "widgets": [{"id": 10, "dados_metricas": {}}]}
    with patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_resp
        res = await obter_dashboard_detalhado(dashboard_id=1)
        assert res == mock_resp
        mock_fetch.assert_called_once_with("/dashboards/1")

@pytest.mark.asyncio
async def test_obter_catalogo_metricas_mcp():
    mock_resp = {
        "metricas": [{"chave": "faturamento_mensal"}],
        "periodos": [{"chave": "mes_atual"}],
        "tipos_grafico": [{"chave": "bar"}]
    }
    with patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_resp
        res = await obter_catalogo_metricas()
        assert res == mock_resp
        mock_fetch.assert_called_once_with("/dashboards/metricas/catalogo")

@pytest.mark.asyncio
async def test_criar_dashboard_mcp():
    with patch("mcp_server.server._post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = {"sucesso": True, "dados": {"id": 2, "nome": "Vendas"}}
        res = await criar_dashboard(nome="Vendas", descricao="Acompanhamento")
        assert res.get("sucesso") is True
        mock_post.assert_called_once_with("/dashboards", {"nome": "Vendas", "descricao": "Acompanhamento"})

@pytest.mark.asyncio
async def test_criar_dashboard_mcp_sem_descricao():
    with patch("mcp_server.server._post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = {"sucesso": True, "dados": {"id": 3, "nome": "Financeiro"}}
        res = await criar_dashboard(nome="Financeiro")
        assert res.get("sucesso") is True
        mock_post.assert_called_once_with("/dashboards", {"nome": "Financeiro"})

@pytest.mark.asyncio
async def test_adicionar_widget_dashboard_mcp():
    with patch("mcp_server.server._post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = {"sucesso": True, "dados": {"id": 5, "titulo": "Receitas"}}
        res = await adicionar_widget_dashboard(
            dashboard_id=1,
            titulo="Receitas",
            tipo_grafico="bar",
            metrica="faturamento_mensal",
            periodo="ultimos_6_meses",
            largura=2
        )
        assert res.get("sucesso") is True
        mock_post.assert_called_once_with(
            "/dashboards/1/widgets",
            {
                "titulo": "Receitas",
                "tipo_grafico": "bar",
                "metrica": "faturamento_mensal",
                "periodo": "ultimos_6_meses",
                "largura": 2
            }
        )

@pytest.mark.asyncio
async def test_excluir_widget_dashboard_mcp():
    with patch("mcp_server.server._delete", new_callable=AsyncMock) as mock_delete:
        mock_delete.return_value = {"sucesso": True, "mensagem": "Widget excluído com sucesso"}
        res = await excluir_widget_dashboard(dashboard_id=1, widget_id=5)
        assert res.get("sucesso") is True
        mock_delete.assert_called_once_with("/dashboards/1/widgets/5")

@pytest.mark.asyncio
async def test_excluir_dashboard_mcp():
    with patch("mcp_server.server._delete", new_callable=AsyncMock) as mock_delete:
        mock_delete.return_value = {"sucesso": True, "mensagem": "Dashboard excluído com sucesso"}
        res = await excluir_dashboard(dashboard_id=2)
        assert res.get("sucesso") is True
        mock_delete.assert_called_once_with("/dashboards/2")

@pytest.mark.asyncio
@respx.mock
async def test_delete_helper():
    respx.delete("http://test-node:3001/api/dashboards/2").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "mensagem": "Dashboard excluído com sucesso"})
    )
    res = await _delete("/dashboards/2")
    assert res.get("sucesso") is True
    assert res.get("mensagem") == "Dashboard excluído com sucesso"
    assert respx.calls.last.request.headers["authorization"] == "Bearer fake_jwt_token_for_tenant_42"

@pytest.mark.asyncio
@respx.mock
async def test_delete_helper_error_400():
    respx.delete("http://test-node:3001/api/dashboards/1").mock(
        return_value=httpx.Response(400, json={"sucesso": False, "mensagem": "Não é possível excluir o único painel ativo"})
    )
    res = await _delete("/dashboards/1")
    assert res.get("sucesso") is True or res.get("sucesso") is False
    assert res.get("erro") == "Não é possível excluir o único painel ativo"

def test_mcp_security_no_tenant_parameters_dashboards():
    """Valida que nenhuma ferramenta MCP de dashboard expõe parâmetros de tenant."""
    import inspect
    for tool_func in [
        listar_dashboards,
        obter_dashboard_detalhado,
        obter_catalogo_metricas,
        criar_dashboard,
        adicionar_widget_dashboard,
        excluir_widget_dashboard,
        excluir_dashboard
    ]:
        params = inspect.signature(tool_func).parameters.keys()
        for forbidden in ["tenant", "tenant_id", "usuario", "usuario_id", "user_id"]:
            assert forbidden not in params, f"Tool {tool_func.__name__} expõe parâmetro proibido '{forbidden}'"

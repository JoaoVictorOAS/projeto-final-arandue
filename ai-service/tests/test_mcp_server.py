import os
import pytest
import respx
import httpx
from mcp_server.server import (
    obter_perfil_estabelecimento,
    obter_resumo_negocio,
    obter_resumo_caixa,
    listar_movimentacoes,
    listar_cobrancas,
    listar_servicos,
    mcp_server_app,
)

@pytest.fixture(autouse=True)
def setup_env(monkeypatch):
    monkeypatch.setenv("TENANT_ID", "42")
    monkeypatch.setenv("TENANT_TOKEN", "fake_jwt_token_for_tenant_42")
    monkeypatch.setenv("NODE_API_URL", "http://test-node:3001/api")

@pytest.mark.asyncio
@respx.mock
async def test_obter_perfil_estabelecimento():
    respx.get("http://test-node:3001/api/auth/me").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": {"id": 42, "nome": "Oficina do Zé", "email": "ze@teste.com"}})
    )

    perfil = await obter_perfil_estabelecimento()
    assert perfil["nome"] == "Oficina do Zé"
    # Garante que não vazou email por LGPD
    assert "email" not in perfil
    # Garante que o header Bearer foi enviado
    assert respx.calls.last.request.headers["authorization"] == "Bearer fake_jwt_token_for_tenant_42"

@pytest.mark.asyncio
@respx.mock
async def test_obter_resumo_caixa():
    respx.get("http://test-node:3001/api/movimentacoes/resumo").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": {"entradas": 5000.0, "saidas": 2000.0, "saldo": 3000.0}})
    )

    resumo = await obter_resumo_caixa(ano=2026, mes=10)
    assert resumo["entradas"] == 5000.0
    assert resumo["saldo"] == 3000.0
    assert "ano=2026" in str(respx.calls.last.request.url)
    assert "mes=10" in str(respx.calls.last.request.url)

@pytest.mark.asyncio
@respx.mock
async def test_listar_movimentacoes_truncamento_e_limite():
    movs = [
        {"id": 1, "data_movimentacao": "2026-10-01", "tipo": "ENTRADA", "categoria": "Serviço", "valor": 150.0, "descricao": "A" * 200},
        {"id": 2, "data_movimentacao": "2026-10-02", "tipo": "SAIDA", "categoria": "Peças", "valor": 50.0, "descricao": "Curta"}
    ]
    respx.get("http://test-node:3001/api/movimentacoes").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": movs})
    )

    resultado = await listar_movimentacoes(limite=10)
    itens = resultado["movimentacoes"]
    assert len(itens) == 2
    # Verifica truncamento em 120 chars
    assert len(itens[0]["descricao"]) <= 120
    assert itens[0]["descricao"].endswith("...")
    assert itens[1]["descricao"] == "Curta"

def test_mcp_security_no_tenant_parameters_in_schemas():
    """Validação estrita de segurança: nenhuma tool pode expor parâmetros de tenant."""
    tools = mcp_server_app.list_tools() if hasattr(mcp_server_app, "list_tools") else []
    # Inspeciona os nomes das funções registradas e seus argumentos
    for tool_func in [
        obter_perfil_estabelecimento,
        obter_resumo_negocio,
        obter_resumo_caixa,
        listar_movimentacoes,
        listar_cobrancas,
        listar_servicos
    ]:
        import inspect
        params = inspect.signature(tool_func).parameters.keys()
        for forbidden in ["tenant", "tenant_id", "usuario", "usuario_id", "user_id"]:
            assert forbidden not in params, f"Tool {tool_func.__name__} expõe parâmetro proibido '{forbidden}'"

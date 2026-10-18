import os
import inspect
import pytest
import respx
import httpx
from mcp_server.server import (
    cadastrar_servico,
    listar_assinaturas,
    cadastrar_assinatura,
    atualizar_status_assinatura,
    gerar_cobranca_assinatura,
)

@pytest.fixture(autouse=True)
def setup_env(monkeypatch):
    monkeypatch.setenv("TENANT_ID", "42")
    monkeypatch.setenv("TENANT_TOKEN", "fake_jwt_token_for_tenant_42")
    monkeypatch.setenv("NODE_API_URL", "http://test-node:3001/api")

@pytest.mark.asyncio
@respx.mock
async def test_cadastrar_servico_recorrente():
    respx.post("http://test-node:3001/api/servicos").mock(
        return_value=httpx.Response(
            201,
            json={
                "sucesso": True,
                "dados": {
                    "id": 10,
                    "nome": "Manutenção Mensal TI",
                    "preco": 250.0,
                    "categoria": "Suporte",
                    "recorrente": 1,
                    "periodicidade": "MENSAL",
                    "dia_vencimento_padrao": 15,
                },
            },
        )
    )

    resp = await cadastrar_servico(
        nome="Manutenção Mensal TI",
        preco=250.0,
        categoria="Suporte",
        recorrente=True,
        periodicidade="MENSAL",
        dia_vencimento_padrao=15,
    )

    assert resp["servico_id"] == 10
    assert resp["recorrente"] is True
    assert resp["periodicidade"] == "MENSAL"
    assert resp["dia_vencimento_padrao"] == 15

    # Valida payload enviado
    req = respx.calls.last.request
    body = httpx.Response(200, content=req.content).json()
    assert body["recorrente"] is True
    assert body["periodicidade"] == "MENSAL"
    assert body["dia_vencimento_padrao"] == 15

@pytest.mark.asyncio
@respx.mock
async def test_listar_assinaturas_com_mrr():
    respx.get("http://test-node:3001/api/servicos/assinaturas").mock(
        return_value=httpx.Response(
            200,
            json={
                "sucesso": True,
                "dados": [
                    {
                        "id": 1,
                        "cliente_id": 5,
                        "cliente_nome": "Empresa Alfa",
                        "servico_id": 10,
                        "servico_nome": "Plano Mensal",
                        "valor": 300.0,
                        "periodicidade": "MENSAL",
                        "dia_vencimento": 10,
                        "data_inicio": "2026-10-01",
                        "proximo_vencimento": "2026-11-10",
                        "status": "ATIVA",
                    },
                    {
                        "id": 2,
                        "cliente_id": 8,
                        "cliente_nome": "Empresa Beta",
                        "servico_id": 12,
                        "servico_nome": "Plano Trimestral",
                        "valor": 600.0,
                        "periodicidade": "TRIMESTRAL",
                        "dia_vencimento": 15,
                        "data_inicio": "2026-10-01",
                        "proximo_vencimento": "2027-01-15",
                        "status": "ATIVA",
                    },
                    {
                        "id": 3,
                        "cliente_id": 9,
                        "cliente_nome": "Empresa Gama",
                        "servico_id": 10,
                        "servico_nome": "Plano Mensal",
                        "valor": 200.0,
                        "periodicidade": "MENSAL",
                        "dia_vencimento": 5,
                        "status": "PAUSADA",
                    },
                ],
            },
        )
    )

    resp = await listar_assinaturas()
    assert resp["sucesso"] is True
    assert resp["total_assinaturas"] == 3
    assert resp["total_ativas"] == 2
    # MRR = 300 (mensal) + 600/3 (trimestral = 200) = 500.0
    assert resp["mrr_estimado"] == 500.0
    assert len(resp["assinaturas"]) == 3

@pytest.mark.asyncio
@respx.mock
async def test_cadastrar_assinatura():
    respx.post("http://test-node:3001/api/servicos/assinaturas").mock(
        return_value=httpx.Response(
            201,
            json={
                "sucesso": True,
                "dados": {
                    "id": 1,
                    "cliente_id": 5,
                    "cliente_nome": "Cliente VIP",
                    "servico_id": 10,
                    "servico_nome": "Hospedagem",
                    "valor": 80.0,
                    "periodicidade": "MENSAL",
                    "dia_vencimento": 10,
                    "data_inicio": "2026-10-18",
                    "proximo_vencimento": "2026-11-10",
                    "status": "ATIVA",
                },
            },
        )
    )

    resp = await cadastrar_assinatura(
        cliente_id=5,
        servico_id=10,
        valor=80.0,
        periodicidade="MENSAL",
        dia_vencimento=10,
    )

    assert resp["assinatura_id"] == 1
    assert resp["valor"] == 80.0
    assert resp["status"] == "ATIVA"

@pytest.mark.asyncio
@respx.mock
async def test_atualizar_status_assinatura():
    respx.patch("http://test-node:3001/api/servicos/assinaturas/1/status").mock(
        return_value=httpx.Response(
            200,
            json={
                "sucesso": True,
                "dados": {"id": 1, "status": "PAUSADA"},
            },
        )
    )

    resp = await atualizar_status_assinatura(assinatura_id=1, status="PAUSADA")
    assert resp["status"] == "PAUSADA"
    assert "atualizada para status 'PAUSADA'" in resp["mensagem"]

    # Rejeição de status inválido
    resp_invalido = await atualizar_status_assinatura(assinatura_id=1, status="STATUS_LOUCO")
    assert "erro" in resp_invalido

@pytest.mark.asyncio
@respx.mock
async def test_gerar_cobranca_assinatura():
    respx.post("http://test-node:3001/api/servicos/assinaturas/1/gerar-cobranca").mock(
        return_value=httpx.Response(
            200,
            json={
                "sucesso": True,
                "dados": {
                    "cobranca": {
                        "id": 99,
                        "valor": 150.0,
                        "vencimento": "2026-11-10",
                        "status": "PENDENTE",
                    },
                    "proximo_vencimento": "2026-12-10",
                },
            },
        )
    )

    resp = await gerar_cobranca_assinatura(assinatura_id=1)
    assert resp["cobranca_id"] == 99
    assert resp["valor"] == 150.0
    assert resp["vencimento_cobranca"] == "2026-11-10"
    assert resp["novo_proximo_vencimento"] == "2026-12-10"

def test_mcp_security_no_tenant_parameters_in_assinaturas():
    """Garante que nenhuma ferramenta de assinatura expõe parâmetros de tenant (usuario_id / tenant_id)."""
    ferramentas = [
        cadastrar_servico,
        listar_assinaturas,
        cadastrar_assinatura,
        atualizar_status_assinatura,
        gerar_cobranca_assinatura,
    ]
    for fn in ferramentas:
        params = inspect.signature(fn).parameters
        assert "usuario_id" not in params, f"{fn.__name__} expõe usuario_id"
        assert "tenant_id" not in params, f"{fn.__name__} expõe tenant_id"

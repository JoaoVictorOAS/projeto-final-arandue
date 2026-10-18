import os
import pytest
import respx
import httpx
from mcp_server.server import (
    listar_cobrancas,
    registrar_pagamento_cobranca,
    excluir_cobranca,
    listar_agendamentos,
    atualizar_status_agendamento,
    registrar_movimentacao_caixa,
    atualizar_cliente,
    inativar_cliente,
    atualizar_servico,
    inativar_servico,
    gerar_relatorio_receitas_mei,
    consultar_guias_das,
    registrar_pagamento_das,
    gerar_pix_cobranca,
    enviar_lembrete_cobranca_whatsapp,
    compartilhar_orcamento,
    obter_insights_proativos,
    lancar_comprovante_caixa,
    mcp_server_app,
)

@pytest.fixture(autouse=True)
def setup_env(monkeypatch):
    monkeypatch.setenv("TENANT_ID", "42")
    monkeypatch.setenv("TENANT_TOKEN", "fake_jwt_token_for_tenant_42")
    monkeypatch.setenv("NODE_API_URL", "http://test-node:3001/api")

@pytest.mark.asyncio
@respx.mock
async def test_listar_cobrancas_com_id_e_cliente_nome():
    respx.get("http://test-node:3001/api/cobrancas").mock(
        return_value=httpx.Response(200, json={
            "sucesso": True,
            "dados": [
                {
                    "id": 101,
                    "cliente_nome": "Maria Silva",
                    "valor": 250.0,
                    "vencimento": "2026-11-20",
                    "status": "PENDENTE",
                    "data_pagamento": None
                }
            ]
        })
    )
    res = await listar_cobrancas()
    assert res["total"] == 1
    item = res["cobrancas"][0]
    assert item["id"] == 101
    assert item["cliente_nome"] == "Maria Silva"
    assert item["valor"] == 250.0

@pytest.mark.asyncio
@respx.mock
async def test_registrar_pagamento_e_excluir_cobranca():
    respx.patch("http://test-node:3001/api/cobrancas/101/pagar").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": {"id": 101, "status": "PAGO"}})
    )
    res_pag = await registrar_pagamento_cobranca(cobranca_id=101, gerar_movimentacao_caixa=True)
    assert res_pag["sucesso"] is True
    assert "paga com sucesso" in res_pag["mensagem"]

    respx.delete("http://test-node:3001/api/cobrancas/101").mock(
        return_value=httpx.Response(204)
    )
    res_del = await excluir_cobranca(cobranca_id=101)
    assert res_del["sucesso"] is True

@pytest.mark.asyncio
@respx.mock
async def test_agendamentos_listar_e_atualizar_status():
    respx.get("http://test-node:3001/api/agendamentos").mock(
        return_value=httpx.Response(200, json={
            "sucesso": True,
            "dados": [
                {
                    "id": 15,
                    "cliente_id": 2,
                    "cliente_nome": "Carlos",
                    "servico_id": 1,
                    "servico_nome": "Manutenção",
                    "data_hora": "2026-11-05 14:00",
                    "status": "PENDENTE",
                    "observacoes": "Urgente"
                }
            ]
        })
    )
    res_list = await listar_agendamentos(status="PENDENTE")
    assert res_list["total"] == 1
    assert res_list["agendamentos"][0]["cliente_nome"] == "Carlos"

    respx.patch("http://test-node:3001/api/agendamentos/15/status").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": {"id": 15, "status": "CONFIRMADO"}})
    )
    res_up = await atualizar_status_agendamento(agendamento_id=15, status="CONFIRMADO")
    assert res_up["sucesso"] is True
    assert res_up["status"] == "CONFIRMADO" or "CONFIRMADO" in str(res_up)

@pytest.mark.asyncio
@respx.mock
async def test_registrar_movimentacao_caixa():
    respx.post("http://test-node:3001/api/movimentacoes").mock(
        return_value=httpx.Response(201, json={"sucesso": True, "dados": {"id": 88, "tipo": "ENTRADA", "valor": 300.0}})
    )
    res = await registrar_movimentacao_caixa(tipo="ENTRADA", valor=300.0, descricao="Serviço extra", categoria="Serviços")
    assert res["sucesso"] is True

@pytest.mark.asyncio
@respx.mock
async def test_clientes_atualizar_e_inativar():
    respx.put("http://test-node:3001/api/clientes/5").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": {"id": 5, "nome": "Ana Atualizada"}})
    )
    res_up = await atualizar_cliente(cliente_id=5, nome="Ana Atualizada", telefone="11999998888")
    assert res_up["sucesso"] is True

    respx.delete("http://test-node:3001/api/clientes/5").mock(
        return_value=httpx.Response(204)
    )
    res_del = await inativar_cliente(cliente_id=5)
    assert res_del["sucesso"] is True

@pytest.mark.asyncio
@respx.mock
async def test_servicos_atualizar_e_inativar():
    respx.put("http://test-node:3001/api/servicos/2").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": {"id": 2, "nome": "Consultoria VIP", "preco": 250.0}})
    )
    res_up = await atualizar_servico(servico_id=2, nome="Consultoria VIP", preco=250.0)
    assert res_up["sucesso"] is True

    respx.delete("http://test-node:3001/api/servicos/2").mock(
        return_value=httpx.Response(204)
    )
    res_del = await inativar_servico(servico_id=2)
    assert res_del["sucesso"] is True

@pytest.mark.asyncio
@respx.mock
async def test_novas_funcionalidades_fiscais_e_pix_whatsapp():
    respx.get("http://test-node:3001/api/notas-fiscais/relatorio-receitas").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": {"comercio": 10000.0, "servicos": 25000.0, "total": 35000.0}})
    )
    res_rec = await gerar_relatorio_receitas_mei(ano=2026)
    assert res_rec["total"] == 35000.0

    respx.get("http://test-node:3001/api/notas-fiscais/das").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": [{"mes": 1, "status": "PAGO"}]})
    )
    res_das = await consultar_guias_das(ano=2026)
    assert isinstance(res_das, list) or "dados" in res_das or "mes" in str(res_das)

    respx.post("http://test-node:3001/api/notas-fiscais/das/pagar").mock(
        return_value=httpx.Response(201, json={"sucesso": True, "dados": {"mes": 2, "status": "PAGO"}})
    )
    res_p_das = await registrar_pagamento_das(mes=2, ano=2026, valor=75.0)
    assert res_p_das["sucesso"] is True

    respx.get("http://test-node:3001/api/cobrancas/101/pix").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": {"qrcode": "data:image/png;base64,...", "copia_e_cola": "000201..."}})
    )
    res_pix = await gerar_pix_cobranca(cobranca_id=101)
    assert "copia_e_cola" in res_pix or "qrcode" in res_pix

    respx.post("http://test-node:3001/api/cobrancas/101/lembrete-whatsapp").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": {"enviado": True}})
    )
    res_wpp = await enviar_lembrete_cobranca_whatsapp(cobranca_id=101)
    assert res_wpp["sucesso"] is True

    respx.get("http://test-node:3001/api/orcamentos/10/compartilhar").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": {"link": "https://arandue.app/orcamento/10"}})
    )
    res_orc = await compartilhar_orcamento(orcamento_id=10)
    assert "link" in res_orc

    respx.get("http://test-node:3001/api/dashboard/insights").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": [{"titulo": "Atenção ao Caixa"}]})
    )
    res_ins = await obter_insights_proativos()
    assert isinstance(res_ins, list) or "dados" in res_ins or "titulo" in str(res_ins)

    respx.post("http://test-node:3001/api/assistente/imagem/lancar-comprovante").mock(
        return_value=httpx.Response(201, json={"sucesso": True, "dados": {"id": 999, "valor": 45.0}})
    )
    res_comp = await lancar_comprovante_caixa(valor=45.0, descricao="Conta de Luz", tipo="SAIDA", categoria="Despesas Fixas")
    assert res_comp["sucesso"] is True

def test_security_no_tenant_parameters_new_tools():
    import inspect
    new_tools = [
        registrar_pagamento_cobranca,
        excluir_cobranca,
        listar_agendamentos,
        atualizar_status_agendamento,
        registrar_movimentacao_caixa,
        atualizar_cliente,
        inativar_cliente,
        atualizar_servico,
        inativar_servico,
        gerar_relatorio_receitas_mei,
        consultar_guias_das,
        registrar_pagamento_das,
        gerar_pix_cobranca,
        enviar_lembrete_cobranca_whatsapp,
        compartilhar_orcamento,
        obter_insights_proativos,
        lancar_comprovante_caixa
    ]
    for tool in new_tools:
        params = inspect.signature(tool).parameters.keys()
        for forbidden in ["tenant", "tenant_id", "usuario", "usuario_id", "user_id", "cnpj"]:
            assert forbidden not in params, f"Nova tool {tool.__name__} expõe parâmetro proibido '{forbidden}'"

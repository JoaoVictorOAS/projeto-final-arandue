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
    cadastrar_cliente,
    listar_clientes,
    cadastrar_cobranca,
    cadastrar_servico,
    cadastrar_agendamento,
    cadastrar_orcamento,
    listar_orcamentos,
    atualizar_status_orcamento,
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
        listar_servicos,
        cadastrar_cliente,
        listar_clientes,
        cadastrar_cobranca,
        cadastrar_servico,
        cadastrar_agendamento,
        cadastrar_orcamento,
        listar_orcamentos,
        atualizar_status_orcamento
    ]:
        import inspect
        params = inspect.signature(tool_func).parameters.keys()
        for forbidden in ["tenant", "tenant_id", "usuario", "usuario_id", "user_id"]:
            assert forbidden not in params, f"Tool {tool_func.__name__} expõe parâmetro proibido '{forbidden}'"

@pytest.mark.asyncio
@respx.mock
async def test_cadastrar_cliente():
    from mcp_server.server import cadastrar_cliente
    respx.post("http://test-node:3001/api/clientes").mock(
        return_value=httpx.Response(201, json={"sucesso": True, "dados": {"id": 99, "nome": "Jefferson"}})
    )

    resultado = await cadastrar_cliente(nome="Jefferson", telefone="11988887777")
    assert resultado["cliente_id"] == 99
    assert resultado["nome"] == "Jefferson"
    assert "cadastrado com sucesso" in resultado["mensagem"]
    # Verifica header
    assert respx.calls.last.request.headers["authorization"] == "Bearer fake_jwt_token_for_tenant_42"

@pytest.mark.asyncio
@respx.mock
async def test_orcamento_tools_e_fluxo_integrado():
    from mcp_server.server import (
        cadastrar_orcamento,
        listar_orcamentos,
        atualizar_status_orcamento,
        cadastrar_agendamento,
        cadastrar_cobranca
    )

    # 1. Cadastrar Orçamento
    respx.post("http://test-node:3001/api/orcamentos").mock(
        return_value=httpx.Response(201, json={
            "sucesso": True,
            "dados": {
                "id": 10,
                "cliente_id": 99,
                "status": "RASCUNHO",
                "subtotal": 500.0,
                "desconto": 50.0,
                "total": 450.0
            }
        })
    )
    res_orc = await cadastrar_orcamento(
        cliente_id=99,
        itens=[{"servico_id": 1, "quantidade": 1, "preco_unitario": 500.0}],
        desconto=50.0
    )
    assert res_orc["orcamento_id"] == 10
    assert res_orc["total"] == 450.0
    assert "cadastrado com sucesso" in res_orc["mensagem"]

    # 2. Aprovar Orçamento
    respx.patch("http://test-node:3001/api/orcamentos/10/status").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": {"id": 10, "status": "APROVADO"}})
    )
    res_status = await atualizar_status_orcamento(orcamento_id=10, status="APROVADO")
    assert res_status["status"] == "APROVADO"
    assert "alterado para 'APROVADO'" in res_status["mensagem"]

    # 3. Listar Orçamentos
    respx.get("http://test-node:3001/api/orcamentos").mock(
        return_value=httpx.Response(200, json={
            "sucesso": True,
            "dados": [{"id": 10, "cliente_id": 99, "cliente_nome": "Jefferson", "status": "APROVADO", "total": 450.0}]
        })
    )
    res_list = await listar_orcamentos(status="APROVADO")
    assert res_list["total"] == 1
    assert res_list["orcamentos"][0]["id"] == 10

    # 4. Cadastrar Agendamento com orcamento_id
    respx.post("http://test-node:3001/api/agendamentos").mock(
        return_value=httpx.Response(201, json={
            "sucesso": True,
            "dados": {"id": 20, "orcamento_id": 10, "data_hora": "2026-11-01 10:00", "status": "PENDENTE"}
        })
    )
    res_ag = await cadastrar_agendamento(cliente_id=99, servico_id=1, data_hora="2026-11-01 10:00", orcamento_id=10)
    assert res_ag["agendamento_id"] == 20
    assert res_ag["orcamento_id"] == 10

    # 5. Cadastrar Cobrança vinculada a agendamento e orçamento
    respx.post("http://test-node:3001/api/cobrancas").mock(
        return_value=httpx.Response(201, json={
            "sucesso": True,
            "dados": {"id": 30, "valor": 450.0, "vencimento": "2026-11-10", "status": "PENDENTE"}
        })
    )
    res_cob = await cadastrar_cobranca(cliente_id=99, valor=450.0, vencimento="2026-11-10", orcamento_id=10, agendamento_id=20)
    assert res_cob["cobranca_id"] == 30


@pytest.mark.asyncio
async def test_cadastrar_cobranca_bloqueia_data_alucinada_do_treinamento():
    """Garante que datas alucinadas do treinamento (ex: '2025-03-30') ou ausentes são bloqueadas antes de chegar ao backend."""
    res_alucinada = await cadastrar_cobranca(
        cliente_id=786,
        valor=300.0,
        vencimento="2025-03-30",
        orcamento_id=1009
    )
    assert res_alucinada.get("sucesso") is False
    assert "passado" in res_alucinada.get("erro", "").lower()
    assert "2025-03-30" in res_alucinada.get("erro", "")

    res_sem_data = await cadastrar_cobranca(
        cliente_id=786,
        valor=300.0,
        vencimento=None,
        orcamento_id=1009
    )
    assert res_sem_data.get("sucesso") is False
    assert "não foi informado" in res_sem_data.get("erro", "").lower()


@pytest.mark.asyncio
async def test_cadastrar_agendamento_bloqueia_data_alucinada():
    res_ag = await cadastrar_agendamento(
        cliente_id=786,
        servico_id=1,
        data_hora="2025-03-30 14:00",
        orcamento_id=1009
    )
    assert res_ag.get("sucesso") is False
    assert "passado" in res_ag.get("erro", "").lower()


def test_runtime_context_pack_e_prompts_temporais():
    from datetime import datetime
    from app.llm.prompts import build_runtime_context_pack, build_system_prompt, build_context_prompt

    dt_fixa = datetime(2026, 10, 15, 23, 15, 0)
    pack = build_runtime_context_pack(now=dt_fixa)
    assert "<contexto_sistema>" in pack
    assert "2026-10-15" in pack
    assert "15/10/2026" in pack
    assert "Quinta-feira" in pack
    assert "Outubro de 2026" in pack
    assert "2026-10-16" in pack  # Amanhã
    assert "2026-10-22" in pack  # +7 dias
    assert "2026-11-14" in pack  # +30 dias
    assert "2026-10-31" in pack  # Último dia do mês

    sys_prompt = build_system_prompt(now=dt_fixa)
    assert "<contexto_sistema>" in sys_prompt
    assert "2026-10-15" in sys_prompt

    ctx_prompt = build_context_prompt("Qual meu saldo?", [], "chroma", now=dt_fixa)
    assert "2026-10-15" in ctx_prompt
    assert "Não invente datas nem utilize datas de 2025" in ctx_prompt



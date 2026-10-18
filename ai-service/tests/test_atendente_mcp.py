import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from mcp_server.server import (
    obter_configuracoes_atendente,
    configurar_atendente_cliente,
    atendente_consultar_catalogo,
    atendente_verificar_disponibilidade,
    atendente_realizar_agendamento,
    atendente_fechar_orcamento_cliente,
)
from app.llm.orchestrator import Orchestrator
from app.llm.prompts import build_attendant_system_prompt


@pytest.mark.asyncio
async def test_mcp_obter_e_configurar_atendente():
    with patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("mcp_server.server._put", new_callable=AsyncMock) as mock_put:
        mock_fetch.return_value = {
            "nome_atendente": "Bia",
            "tom_voz": "AMIGAVEL",
            "orcamento_min_valor": 100.0,
            "orcamento_max_valor": 800.0,
            "desconto_max_percentual": 10.0,
        }
        res_get = await obter_configuracoes_atendente()
        assert res_get["nome_atendente"] == "Bia"
        mock_fetch.assert_awaited_once_with("/atendente/config")

        mock_put.return_value = {
            "sucesso": True,
            "dados": {
                "nome_atendente": "Bia Consultora",
                "tom_voz": "CONSULTIVO",
                "permite_fechar_orcamento": True,
                "orcamento_min_valor": 150.0,
                "orcamento_max_valor": 1200.0,
                "desconto_max_percentual": 15.0,
            },
        }
        res_put = await configurar_atendente_cliente(
            nome_atendente="Bia Consultora",
            tom_voz="CONSULTIVO",
            permite_fechar_orcamento=True,
            orcamento_min_valor=150.0,
            orcamento_max_valor=1200.0,
            desconto_max_percentual=15.0,
        )
        assert res_put["sucesso"] is True
        assert res_put["dados"]["tom_voz"] == "CONSULTIVO"
        mock_put.assert_awaited_once()


@pytest.mark.asyncio
async def test_mcp_atendente_fechar_orcamento_cliente():
    with patch("mcp_server.server._post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = {
            "sucesso": True,
            "dados": {
                "orcamento": {"id": 99, "status": "APROVADO", "total": 250.0},
                "aprovado_automaticamente": True,
                "motivo_alcada": "Orçamento fechado dentro da alçada",
            },
        }
        res = await atendente_fechar_orcamento_cliente(
            nome_cliente="Carlos",
            telefone_cliente="11999998888",
            itens=[{"servico_id": 1, "quantidade": 1}],
            desconto=0.0,
            fechar_automaticamente=True,
        )
        assert res["sucesso"] is True
        assert res["dados"]["aprovado_automaticamente"] is True
        mock_post.assert_awaited_once()


@pytest.mark.asyncio
async def test_orchestrator_filters_tools_for_customer_attendant():
    orch = Orchestrator(api_key="fake-key")

    tool_catalogo = MagicMock()
    tool_catalogo.name = "atendente_consultar_catalogo"
    tool_catalogo.description = "Catálogo"
    tool_catalogo.inputSchema = {"properties": {}, "required": []}

    tool_agendar = MagicMock()
    tool_agendar.name = "atendente_realizar_agendamento"
    tool_agendar.description = "Agendar"
    tool_agendar.inputSchema = {"properties": {}, "required": []}

    tool_orcamento = MagicMock()
    tool_orcamento.name = "atendente_fechar_orcamento_cliente"
    tool_orcamento.description = "Orçamento"
    tool_orcamento.inputSchema = {"properties": {}, "required": []}

    tool_caixa_proibida = MagicMock()
    tool_caixa_proibida.name = "consultar_resumo_caixa"
    tool_caixa_proibida.description = "Caixa interno do MEI"
    tool_caixa_proibida.inputSchema = {"properties": {}, "required": []}

    mock_session = AsyncMock()
    mock_list_res = MagicMock()
    mock_list_res.tools = [tool_catalogo, tool_agendar, tool_orcamento, tool_caixa_proibida]
    mock_session.list_tools.return_value = mock_list_res

    # Caso 1: permite_consultar_catalogo=True, mas permite_agendar=False e permite_gerar_orcamento=False
    decls = await orch._mcp_tools_to_declarations(
        mock_session,
        allowed_tools={"atendente_consultar_catalogo"}
    )
    nomes = [d.name for d in decls]
    assert nomes == ["atendente_consultar_catalogo"]
    assert "consultar_resumo_caixa" not in nomes


def test_build_attendant_system_prompt_contains_tone_and_budget_guardrails():
    prompt = build_attendant_system_prompt(
        config_atendente={
            "nome_atendente": "Lia",
            "tom_voz": "DESCONTRAIDO",
            "orcamento_min_valor": 120.0,
            "orcamento_max_valor": 750.0,
            "desconto_max_percentual": 8.0,
            "permite_fechar_orcamento": True,
            "instrucoes_customizadas": "Ofereça café na visita presencial.",
        },
        cliente_contexto={"nome_cliente": "Maria", "telefone_cliente": "11988887777"},
    )
    assert "Lia" in prompt
    assert "DESCONTRAIDO" in prompt
    assert "120.00" in prompt
    assert "750.00" in prompt
    assert "8.0%" in prompt or "8%" in prompt
    assert "Ofereça café" in prompt


@pytest.mark.asyncio
async def test_mcp_limites_agendamento_e_transbordo_humano():
    from mcp_server.server import (
        atendente_solicitar_humano,
        listar_atendimentos_pendentes,
        resolver_atendimento_pendente,
    )

    with patch("mcp_server.server._put", new_callable=AsyncMock) as mock_put, \
         patch("mcp_server.server._post", new_callable=AsyncMock) as mock_post, \
         patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("mcp_server.server._patch", new_callable=AsyncMock) as mock_patch:

        mock_put.return_value = {"sucesso": True, "dados": {"antecedencia_minima_dias": 3}}
        res_cfg = await configurar_atendente_cliente(
            antecedencia_minima_dias=3,
            antecedencia_maxima_dias=45,
            transbordo_automatico=True,
            condicoes_retorno_humano="Urgências no mesmo dia",
        )
        assert res_cfg["sucesso"] is True
        mock_put.assert_awaited_once_with(
            "/atendente/config",
            {
                "antecedencia_minima_dias": 3,
                "antecedencia_maxima_dias": 45,
                "transbordo_automatico": True,
                "condicoes_retorno_humano": "Urgências no mesmo dia",
            },
        )

        mock_post.return_value = {
            "sucesso": True,
            "dados": {
                "atendimento_pendente": {"id": 501, "status": "PENDENTE"},
                "notificacao_mobile": {"titulo": "Atendimento pendente"},
            },
        }
        res_hum = await atendente_solicitar_humano(
            nome_cliente="Lucas",
            motivo="Cliente pediu horário no domingo fora do expediente",
            resumo_conversa="Cliente quer atendimento de emergência no domingo",
            telefone_cliente="11944443333",
        )
        assert res_hum["sucesso"] is True
        assert res_hum["dados"]["notificacao_mobile"]["titulo"] == "Atendimento pendente"

        mock_fetch.return_value = {"total_pendentes": 1, "itens": [{"id": 501, "nome_cliente": "Lucas"}]}
        res_list = await listar_atendimentos_pendentes(status="PENDENTE")
        assert res_list["total_pendentes"] == 1

        mock_patch.return_value = {"sucesso": True, "dados": {"id": 501, "status": "CONCLUIDO"}}
        res_resolv = await resolver_atendimento_pendente(atendimento_id=501, status="CONCLUIDO")
        assert res_resolv["sucesso"] is True


def test_build_attendant_system_prompt_includes_scheduling_limits_and_handoff():
    prompt = build_attendant_system_prompt(
        config_atendente={
            "nome_atendente": "Lia",
            "tom_voz": "AMIGAVEL",
            "antecedencia_minima_dias": 3,
            "antecedencia_maxima_dias": 30,
            "condicoes_retorno_humano": "Qualquer pedido de encaixe urgente ou serviço fora da tabela",
            "alcadas_por_servico": [
                {
                    "servico_id": 10,
                    "nome_servico": "Instalação Completa",
                    "permite_fechar_orcamento": True,
                    "orcamento_min_valor": 400.0,
                    "orcamento_max_valor": 1500.0,
                    "desconto_max_percentual": 15.0,
                }
            ],
        },
        cliente_contexto={"nome_cliente": "Roberto"},
    )
    assert "3 dia(s)" in prompt
    assert "atendente_solicitar_humano" in prompt
    assert "Qualquer pedido de encaixe urgente" in prompt
    assert "Instalação Completa" in prompt
    assert "400.00" in prompt
    assert "1500.00" in prompt


@pytest.mark.asyncio
async def test_mcp_configurar_alcada_servico_atendente():
    from mcp_server.server import configurar_alcada_servico_atendente

    with patch("mcp_server.server._put", new_callable=AsyncMock) as mock_put:
        mock_put.return_value = {"sucesso": True, "dados": {"alcadas_por_servico": [{"servico_id": 10}]}}
        res = await configurar_alcada_servico_atendente(
            servico_id=10,
            orcamento_min_valor=400.0,
            orcamento_max_valor=1500.0,
            desconto_max_percentual=15.0,
            permite_fechar_orcamento=True,
            nome_servico="Instalação Completa",
        )
        assert res["sucesso"] is True
        mock_put.assert_awaited_once_with(
            "/atendente/config/servico/10",
            {
                "servico_id": 10,
                "orcamento_min_valor": 400.0,
                "orcamento_max_valor": 1500.0,
                "desconto_max_percentual": 15.0,
                "permite_fechar_orcamento": True,
                "nome_servico": "Instalação Completa",
                "remover": False,
            },
        )


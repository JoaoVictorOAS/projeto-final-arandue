import inspect
import pytest
import respx
import httpx
from mcp_server.server import (
    listar_insumos_estoque,
    cadastrar_insumo,
    registrar_compra_insumo,
    obter_ficha_tecnica_e_custo,
    definir_ficha_tecnica,
    registrar_lote_producao,
    simular_producao,
    consultar_historico_estoque,
)

@pytest.fixture(autouse=True)
def setup_env(monkeypatch):
    monkeypatch.setenv("TENANT_ID", "42")
    monkeypatch.setenv("TENANT_TOKEN", "fake_jwt_token_for_tenant_42")
    monkeypatch.setenv("NODE_API_URL", "http://test-node:3001/api")

def test_mcp_estoque_security_no_tenant_parameters():
    """Validação de segurança estrita: nenhuma ferramenta de estoque pode expor parâmetros de tenant."""
    ferramentas = [
        listar_insumos_estoque,
        cadastrar_insumo,
        registrar_compra_insumo,
        obter_ficha_tecnica_e_custo,
        definir_ficha_tecnica,
        registrar_lote_producao,
        simular_producao,
        consultar_historico_estoque,
    ]
    for func in ferramentas:
        params = inspect.signature(func).parameters.keys()
        for forbidden in ["tenant", "tenant_id", "usuario", "usuario_id", "user_id"]:
            assert forbidden not in params, f"Ferramenta {func.__name__} expõe parâmetro proibido '{forbidden}'"

@pytest.mark.asyncio
@respx.mock
async def test_listar_insumos_estoque_sem_filtros():
    resposta_api = {
        "sucesso": True,
        "dados": [
            {
                "id": 1,
                "nome": "Farinha de Trigo",
                "unidade_base": "g",
                "quantidade_atual": 5000,
                "estoque_minimo": 1000,
                "custo_unitario": 0.005,
            }
        ]
    }
    respx.get("http://test-node:3001/api/estoque/insumos").mock(
        return_value=httpx.Response(200, json=resposta_api)
    )

    resultado = await listar_insumos_estoque()

    assert resultado["total"] == 1
    assert resultado["insumos"][0]["nome"] == "Farinha de Trigo"
    assert resultado["insumos"][0]["quantidade_atual"] == 5000

    req = respx.calls.last.request
    assert req.headers["authorization"] == "Bearer fake_jwt_token_for_tenant_42"
    assert "busca" not in req.url.query.decode()
    assert "apenas_abaixo_minimo" not in req.url.query.decode()

@pytest.mark.asyncio
@respx.mock
async def test_listar_insumos_estoque_com_filtros():
    resposta_api = {
        "sucesso": True,
        "dados": [
            {
                "id": 2,
                "nome": "Frango Desfiado",
                "unidade_base": "g",
                "quantidade_atual": 300,
                "estoque_minimo": 500,
                "custo_unitario": 0.015,
            }
        ]
    }
    respx.get("http://test-node:3001/api/estoque/insumos").mock(
        return_value=httpx.Response(200, json=resposta_api)
    )

    resultado = await listar_insumos_estoque(busca="Frango", apenas_abaixo_minimo=True)

    assert resultado["total"] == 1
    assert resultado["insumos"][0]["nome"] == "Frango Desfiado"

    req = respx.calls.last.request
    query_str = req.url.query.decode()
    assert "busca=Frango" in query_str
    assert "apenas_abaixo_minimo=true" in query_str

@pytest.mark.asyncio
@respx.mock
async def test_cadastrar_insumo_sucesso():
    resposta_api = {
        "sucesso": True,
        "dados": {
            "id": 10,
            "nome": "Açúcar Cristal",
            "unidade_base": "g",
            "quantidade_atual": 0,
            "estoque_minimo": 500,
            "custo_unitario": 0.004,
        }
    }
    respx.post("http://test-node:3001/api/estoque/insumos").mock(
        return_value=httpx.Response(201, json=resposta_api)
    )

    resultado = await cadastrar_insumo(
        nome="Açúcar Cristal",
        unidade_base="g",
        estoque_minimo=500.0,
        custo_unitario=0.004,
    )

    assert resultado["sucesso"] is True
    assert resultado["dados"]["id"] == 10
    assert resultado["dados"]["nome"] == "Açúcar Cristal"

    req = respx.calls.last.request
    assert req.headers["authorization"] == "Bearer fake_jwt_token_for_tenant_42"
    payload = req.read().decode()
    assert "Açúcar Cristal" in payload

@pytest.mark.asyncio
@respx.mock
async def test_registrar_compra_insumo_por_id_numerico():
    resposta_api = {
        "sucesso": True,
        "dados": {
            "insumo_id": 5,
            "saldo_atual": 3000,
            "custo_medio_unitario": 0.025,
            "movimentacao_financeira_id": 99,
        }
    }
    respx.post("http://test-node:3001/api/estoque/insumos/entrada").mock(
        return_value=httpx.Response(200, json=resposta_api)
    )

    resultado = await registrar_compra_insumo(
        nome_ou_id=5,
        quantidade=2.0,
        unidade="kg",
        custo_total=50.0,
        lancar_no_caixa=True,
    )

    assert resultado["sucesso"] is True
    assert resultado["dados"]["insumo_id"] == 5

    req = respx.calls.last.request
    req_json = req.read().decode()
    assert '"insumo_id": 5' in req_json or '"insumo_id":5' in req_json
    assert '"custo_total": 50.0' in req_json or '"custo_total":50' in req_json
    assert '"lancar_no_caixa": true' in req_json or '"lancar_no_caixa":true' in req_json

@pytest.mark.asyncio
@respx.mock
async def test_registrar_compra_insumo_por_id_string_numerica():
    resposta_api = {
        "sucesso": True,
        "dados": {
            "insumo_id": 12,
            "saldo_atual": 4000,
            "custo_medio_unitario": 0.010,
        }
    }
    respx.post("http://test-node:3001/api/estoque/insumos/entrada").mock(
        return_value=httpx.Response(200, json=resposta_api)
    )

    resultado = await registrar_compra_insumo(
        nome_ou_id="12",
        quantidade=1.5,
        unidade="kg",
    )

    assert resultado["sucesso"] is True
    req = respx.calls.last.request
    req_json = req.read().decode()
    assert '"insumo_id": 12' in req_json or '"insumo_id":12' in req_json

@pytest.mark.asyncio
@respx.mock
async def test_registrar_compra_insumo_por_nome():
    resposta_api = {
        "sucesso": True,
        "dados": {
            "insumo_id": 3,
            "saldo_atual": 5000,
            "custo_medio_unitario": 0.005,
        }
    }
    respx.post("http://test-node:3001/api/estoque/insumos/entrada").mock(
        return_value=httpx.Response(200, json=resposta_api)
    )

    resultado = await registrar_compra_insumo(
        nome_ou_id="Farinha de Trigo",
        quantidade=5.0,
        unidade="kg",
        lancar_no_caixa=False,
    )

    assert resultado["sucesso"] is True
    req = respx.calls.last.request
    req_json = req.read().decode()
    assert '"nome": "Farinha de Trigo"' in req_json or '"nome":"Farinha de Trigo"' in req_json
    assert '"lancar_no_caixa": false' in req_json or '"lancar_no_caixa":false' in req_json
    assert "custo_total" not in req_json

@pytest.mark.asyncio
@respx.mock
async def test_obter_ficha_tecnica_e_custo():
    resposta_api = {
        "sucesso": True,
        "dados": {
            "servico_id": 7,
            "custo_ingredientes": 17.00,
            "ingredientes": [
                {
                    "insumo_id": 1,
                    "nome_insumo": "Farinha",
                    "quantidade_necessaria": 1000,
                    "unidade_base": "g",
                    "custo_unitario": 0.005,
                },
                {
                    "insumo_id": 2,
                    "nome_insumo": "Frango",
                    "quantidade_necessaria": 800,
                    "unidade_base": "g",
                    "custo_unitario": 0.015,
                },
            ],
        }
    }
    respx.get("http://test-node:3001/api/estoque/fichas-tecnicas/7").mock(
        return_value=httpx.Response(200, json=resposta_api)
    )

    resultado = await obter_ficha_tecnica_e_custo(servico_id=7)

    assert resultado["servico_id"] == 7
    assert resultado["custo_ingredientes"] == 17.00
    assert len(resultado["ingredientes"]) == 2

@pytest.mark.asyncio
@respx.mock
async def test_definir_ficha_tecnica():
    resposta_api = {
        "sucesso": True,
        "dados": [
            {"servico_id": 7, "insumo_id": 1, "quantidade_necessaria": 1000},
            {"servico_id": 7, "insumo_id": 2, "quantidade_necessaria": 800},
        ]
    }
    respx.post("http://test-node:3001/api/estoque/fichas-tecnicas").mock(
        return_value=httpx.Response(200, json=resposta_api)
    )

    ingredientes = [
        {"insumo_id": 1, "quantidade_necessaria": 1000},
        {"insumo_id": 2, "quantidade_necessaria": 800},
    ]
    resultado = await definir_ficha_tecnica(servico_id=7, ingredientes=ingredientes)

    assert resultado["sucesso"] is True
    assert len(resultado["dados"]) == 2

    req = respx.calls.last.request
    req_json = req.read().decode()
    assert '"servico_id": 7' in req_json or '"servico_id":7' in req_json

@pytest.mark.asyncio
@respx.mock
async def test_registrar_lote_producao():
    resposta_api = {
        "sucesso": True,
        "dados": {
            "servico_id": 7,
            "quantidade_produzida": 3,
            "status": "CONCLUIDO",
        }
    }
    respx.post("http://test-node:3001/api/estoque/producao").mock(
        return_value=httpx.Response(200, json=resposta_api)
    )

    resultado = await registrar_lote_producao(servico_id=7, quantidade=3)

    assert resultado["sucesso"] is True
    assert resultado["dados"]["quantidade_produzida"] == 3

    req = respx.calls.last.request
    req_json = req.read().decode()
    assert '"servico_id": 7' in req_json or '"servico_id":7' in req_json
    assert '"quantidade": 3' in req_json or '"quantidade":3' in req_json

@pytest.mark.asyncio
@respx.mock
async def test_simular_producao_usando_estoque_atual():
    resposta_api = {
        "sucesso": True,
        "dados": {
            "rendimentoMaximo": 3,
            "insumoLimitante": {
                "insumo_id": 2,
                "nome": "Frango Peito",
                "faltaFormatada": "600 g",
            },
            "custoUnitario": 17.00,
            "custoTotalProducao": 51.00,
        }
    }
    respx.post("http://test-node:3001/api/estoque/simulacao").mock(
        return_value=httpx.Response(200, json=resposta_api)
    )

    resultado = await simular_producao(servico_id=7, usar_estoque_atual=True)

    assert resultado["sucesso"] is True
    assert resultado["dados"]["rendimentoMaximo"] == 3
    assert resultado["dados"]["insumoLimitante"]["nome"] == "Frango Peito"

    req = respx.calls.last.request
    req_json = req.read().decode()
    assert '"usar_estoque_atual": true' in req_json or '"usar_estoque_atual":true' in req_json

@pytest.mark.asyncio
@respx.mock
async def test_simular_producao_com_insumos_informados():
    resposta_api = {
        "sucesso": True,
        "dados": {
            "rendimentoMaximo": 2,
            "insumoLimitante": {
                "insumo_id": 1,
                "nome": "Farinha",
                "faltaFormatada": "500 g",
            },
        }
    }
    respx.post("http://test-node:3001/api/estoque/simulacao").mock(
        return_value=httpx.Response(200, json=resposta_api)
    )

    insumos = [
        {"insumo_id": 1, "quantidade_base": 2000},
        {"insumo_id": 2, "quantidade_base": 3000},
    ]
    resultado = await simular_producao(
        servico_id=7,
        insumos_informados=insumos,
        usar_estoque_atual=False,
    )

    assert resultado["sucesso"] is True
    assert resultado["dados"]["rendimentoMaximo"] == 2

    req = respx.calls.last.request
    req_json = req.read().decode()
    assert "insumos_informados" in req_json

@pytest.mark.asyncio
@respx.mock
async def test_consultar_historico_estoque():
    resposta_api = {
        "sucesso": True,
        "dados": [
            {
                "id": 1,
                "tipo": "ENTRADA_COMPRA",
                "quantidade": 5000,
                "custo_total": 25.0,
                "motivo": "Entrada de 5 kg",
            },
            {
                "id": 2,
                "tipo": "SAIDA_VENDA",
                "quantidade": 2000,
                "motivo": "Venda via orcamento #10",
            },
        ]
    }
    respx.get("http://test-node:3001/api/estoque/movimentacoes").mock(
        return_value=httpx.Response(200, json=resposta_api)
    )

    resultado = await consultar_historico_estoque(limite=10)

    assert isinstance(resultado, list)
    assert len(resultado) == 2
    assert resultado[0]["tipo"] == "ENTRADA_COMPRA"

    req = respx.calls.last.request
    query_str = req.url.query.decode()
    assert "limite=10" in query_str

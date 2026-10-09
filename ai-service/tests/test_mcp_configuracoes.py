import inspect
import json
import pytest
import respx
import httpx
from mcp_server.server import (
    obter_configuracoes_mei,
    atualizar_configuracoes_mei,
    consultar_dados_cnpj,
)

@pytest.fixture(autouse=True)
def setup_env(monkeypatch):
    monkeypatch.setenv("TENANT_ID", "42")
    monkeypatch.setenv("TENANT_TOKEN", "fake_jwt_token_for_tenant_42")
    monkeypatch.setenv("NODE_API_URL", "http://test-node:3001/api")

def test_mcp_configuracoes_security_no_tenant_parameters():
    """Validação de segurança estrita: nenhuma ferramenta de configuração pode expor parâmetros de tenant."""
    ferramentas = [
        obter_configuracoes_mei,
        atualizar_configuracoes_mei,
        consultar_dados_cnpj,
    ]
    for func in ferramentas:
        params = inspect.signature(func).parameters.keys()
        for forbidden in ["tenant", "tenant_id", "usuario", "usuario_id", "user_id"]:
            assert forbidden not in params, f"Ferramenta {func.__name__} expõe parâmetro proibido '{forbidden}'"

@pytest.mark.asyncio
@respx.mock
async def test_obter_configuracoes_mei_sucesso():
    resposta_api = {
        "sucesso": True,
        "mensagem": "Configurações obtidas com sucesso",
        "dados": {
            "id": 1,
            "razao_social": "JOAO DA SILVA 12345678900",
            "nome_fantasia": "SILVA REPAROS",
            "cnpj": "12345678000195",
            "inscricao_estadual": "ISENTO",
            "inscricao_municipal": "987654",
            "cep": "01001000",
            "logradouro": "Praça da Sé",
            "numero": "100",
            "complemento": "Apto 12",
            "bairro": "Sé",
            "municipio": "São Paulo",
            "uf": "SP",
            "codigo_municipio_ibge": "3550308",
            "email_comercial": "joao@silva.com",
            "telefone_comercial": "11988887777",
            "ambiente_fiscal": "HOMOLOGACAO",
            "serie_nfse": 1,
            "serie_nfe": 1,
            "serie_nfce": 1,
            "configurado": True
        }
    }
    respx.get("http://test-node:3001/api/configuracoes").mock(
        return_value=httpx.Response(200, json=resposta_api)
    )

    resultado = await obter_configuracoes_mei()

    assert resultado["razao_social"] == "JOAO DA SILVA 12345678900"
    assert resultado["cnpj"] == "12345678000195"
    assert resultado["uf"] == "SP"
    assert resultado["municipio"] == "São Paulo"
    assert resultado["configurado"] is True

    req = respx.calls.last.request
    assert req.headers["authorization"] == "Bearer fake_jwt_token_for_tenant_42"

@pytest.mark.asyncio
@respx.mock
async def test_obter_configuracoes_mei_erro_autorizacao():
    respx.get("http://test-node:3001/api/configuracoes").mock(
        return_value=httpx.Response(401, json={"sucesso": False, "mensagem": "Token inválido"})
    )

    resultado = await obter_configuracoes_mei()
    assert "erro" in resultado
    assert "não autorizado" in resultado["erro"].lower() or "sessão expirada" in resultado["erro"].lower()

@pytest.mark.asyncio
@respx.mock
async def test_atualizar_configuracoes_mei_sucesso():
    resposta_api = {
        "sucesso": True,
        "mensagem": "Configurações salvas com sucesso",
        "dados": {
            "id": 1,
            "razao_social": "JOAO DA SILVA 12345678900",
            "nome_fantasia": "SILVA REPAROS",
            "cnpj": "12345678000195",
            "inscricao_estadual": "ISENTO",
            "inscricao_municipal": "987654",
            "cep": "01001000",
            "logradouro": "Praça da Sé",
            "numero": "100",
            "complemento": "Apto 12",
            "bairro": "Sé",
            "municipio": "São Paulo",
            "uf": "SP",
            "codigo_municipio_ibge": "3550308",
            "email_comercial": "joao@silva.com",
            "telefone_comercial": "11988887777",
            "ambiente_fiscal": "HOMOLOGACAO",
            "serie_nfse": 1,
            "serie_nfe": 1,
            "serie_nfce": 1,
            "configurado": True
        }
    }
    respx.put("http://test-node:3001/api/configuracoes").mock(
        return_value=httpx.Response(200, json=resposta_api)
    )

    resultado = await atualizar_configuracoes_mei(
        razao_social="JOAO DA SILVA 12345678900",
        cnpj="12345678000195",
        uf="SP",
        municipio="São Paulo",
        cep="01001000",
        logradouro="Praça da Sé",
        numero="100",
        complemento="Apto 12",
        bairro="Sé",
        inscricao_estadual="ISENTO",
        inscricao_municipal="987654",
        email_comercial="joao@silva.com",
        telefone_comercial="11988887777",
        ambiente_fiscal="HOMOLOGACAO",
    )

    assert "sucesso" in resultado.get("mensagem", "").lower() or resultado.get("sucesso") is True
    assert resultado["dados"]["razao_social"] == "JOAO DA SILVA 12345678900"
    assert resultado["dados"]["cnpj"] == "12345678000195"

    req = respx.calls.last.request
    assert req.headers["authorization"] == "Bearer fake_jwt_token_for_tenant_42"
    payload_enviado = json.loads(req.content)
    assert payload_enviado["razao_social"] == "JOAO DA SILVA 12345678900"
    assert payload_enviado["cnpj"] == "12345678000195"
    assert payload_enviado["uf"] == "SP"

@pytest.mark.asyncio
@respx.mock
async def test_atualizar_configuracoes_mei_erro_validacao():
    respx.put("http://test-node:3001/api/configuracoes").mock(
        return_value=httpx.Response(400, json={
            "sucesso": False,
            "mensagem": "CNPJ inválido. Forneça 14 dígitos numéricos"
        })
    )

    resultado = await atualizar_configuracoes_mei(
        razao_social="JOAO DA SILVA",
        cnpj="123",
        uf="SP",
        municipio="São Paulo",
        cep="01001000",
    )

    assert "erro" in resultado
    assert "CNPJ inválido" in resultado["erro"]

@pytest.mark.asyncio
@respx.mock
async def test_consultar_dados_cnpj_sucesso():
    resposta_api = {
        "sucesso": True,
        "dados": {
            "cnpj": "12345678000195",
            "razao_social": "EMPRESA EXEMPLO LTDA",
            "nome_fantasia": "EXEMPLO",
            "cep": "01001000",
            "logradouro": "Praça da Sé",
            "numero": "100",
            "complemento": "",
            "bairro": "Sé",
            "municipio": "São Paulo",
            "uf": "SP",
            "codigo_municipio_ibge": "3550308",
            "telefone": "1133334444",
            "email": "contato@exemplo.com"
        }
    }
    respx.get("http://test-node:3001/api/configuracoes/cnpj/12345678000195").mock(
        return_value=httpx.Response(200, json=resposta_api)
    )

    resultado = await consultar_dados_cnpj(cnpj="12.345.678/0001-95")

    assert resultado["cnpj"] == "12345678000195"
    assert resultado["razao_social"] == "EMPRESA EXEMPLO LTDA"
    assert resultado["uf"] == "SP"

    req = respx.calls.last.request
    assert req.headers["authorization"] == "Bearer fake_jwt_token_for_tenant_42"

@pytest.mark.asyncio
@respx.mock
async def test_consultar_dados_cnpj_nao_encontrado():
    respx.get("http://test-node:3001/api/configuracoes/cnpj/00000000000000").mock(
        return_value=httpx.Response(404, json={
            "sucesso": False,
            "mensagem": "CNPJ não encontrado na base da Receita Federal"
        })
    )

    resultado = await consultar_dados_cnpj(cnpj="00000000000000")

    assert "erro" in resultado
    assert "não encontrado" in resultado["erro"].lower()

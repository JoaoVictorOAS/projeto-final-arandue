import inspect
import pytest
import respx
import httpx
from mcp_server.server import (
    emitir_nfse_nacional,
    emitir_nfe_produtos,
    emitir_nfce_consumidor,
    listar_notas_fiscais,
    consultar_nota_fiscal,
    cancelar_nota_fiscal,
)

@pytest.fixture(autouse=True)
def setup_env(monkeypatch):
    monkeypatch.setenv("TENANT_ID", "42")
    monkeypatch.setenv("TENANT_TOKEN", "fake_jwt_token_for_tenant_42")
    monkeypatch.setenv("NODE_API_URL", "http://test-node:3001/api")

def test_mcp_fiscal_security_no_tenant_parameters():
    """Validação de segurança estrita: nenhuma ferramenta fiscal pode expor parâmetros de tenant."""
    ferramentas = [
        emitir_nfse_nacional,
        emitir_nfe_produtos,
        emitir_nfce_consumidor,
        listar_notas_fiscais,
        consultar_nota_fiscal,
        cancelar_nota_fiscal,
    ]
    for func in ferramentas:
        params = inspect.signature(func).parameters.keys()
        for forbidden in ["tenant", "tenant_id", "usuario", "usuario_id", "user_id"]:
            assert forbidden not in params, f"Ferramenta {func.__name__} expõe parâmetro proibido '{forbidden}'"

@pytest.mark.asyncio
@respx.mock
async def test_emitir_nfse_nacional_sucesso():
    resposta_api = {
        "sucesso": True,
        "mensagem": "NFS-e emitida com sucesso",
        "dados": {
            "id": 10,
            "tipo": "NFSE",
            "status": "EMITIDA",
            "serie": 1,
            "numero": 101,
            "chave_acesso": "DPS3550308001000000101",
            "protocolo_autorizacao": "NFSE2026000000101",
            "valor_total": 350.0,
            "valor_liquido": 350.0,
            "destinatario_nome": "Carlos Cliente",
            "destinatario_documento": "12345678909"
        }
    }
    respx.post("http://test-node:3001/api/notas-fiscais/nfse").mock(
        return_value=httpx.Response(201, json=resposta_api)
    )

    resultado = await emitir_nfse_nacional(
        destinatario_nome="Carlos Cliente",
        destinatario_documento="123.456.789-09",
        discriminacao_servico="Manutenção e suporte técnico",
        valor=350.0,
        codigo_tributacao_nacional="01.07.01",
        destinatario_email="carlos@cliente.com",
        gerar_caixa=True
    )

    assert resultado["nota_id"] == 10
    assert resultado["numero"] == 101
    assert resultado["serie"] == 1
    assert resultado["chave_acesso"] == "DPS3550308001000000101"
    assert resultado["protocolo"] == "NFSE2026000000101"
    assert resultado["valor"] == 350.0
    assert "sucesso" in resultado["mensagem"].lower()

    # Validação do cabeçalho JWT
    req = respx.calls.last.request
    assert req.headers["authorization"] == "Bearer fake_jwt_token_for_tenant_42"

@pytest.mark.asyncio
@respx.mock
async def test_emitir_nfe_produtos_sucesso():
    resposta_api = {
        "sucesso": True,
        "mensagem": "NF-e emitida com sucesso",
        "dados": {
            "id": 11,
            "tipo": "NFE",
            "status": "EMITIDA",
            "serie": 1,
            "numero": 202,
            "chave_acesso": "35261012345678000195550010000002021123456784",
            "protocolo_autorizacao": "135261000000202",
            "valor_total": 120.0,
            "valor_liquido": 120.0
        }
    }
    respx.post("http://test-node:3001/api/notas-fiscais/nfe").mock(
        return_value=httpx.Response(201, json=resposta_api)
    )

    itens = [
        {"descricao": "Parafuso Sextavado", "quantidade": 10, "valor_unitario": 2.0},
        {"descricao": "Chave de Fenda", "quantidade": 2, "valor_unitario": 50.0}
    ]
    resultado = await emitir_nfe_produtos(
        destinatario_nome="Empresa Compradora Ltda",
        destinatario_documento="98.765.432/0001-98",
        itens=itens,
        natureza_operacao="Venda de mercadorias",
        gerar_caixa=True
    )

    assert resultado["nota_id"] == 11
    assert resultado["numero"] == 202
    assert resultado["chave_acesso"] == "35261012345678000195550010000002021123456784"
    assert resultado["valor_total"] == 120.0
    assert "sucesso" in resultado["mensagem"].lower()

@pytest.mark.asyncio
@respx.mock
async def test_emitir_nfce_consumidor_sucesso():
    resposta_api = {
        "sucesso": True,
        "mensagem": "NFC-e emitida com sucesso",
        "dados": {
            "id": 12,
            "tipo": "NFCE",
            "status": "EMITIDA",
            "serie": 1,
            "numero": 303,
            "chave_acesso": "35261012345678000195650010000003031123456784",
            "protocolo_autorizacao": "135261000000303",
            "valor_total": 45.0,
            "forma_pagamento": "PIX"
        }
    }
    respx.post("http://test-node:3001/api/notas-fiscais/nfce").mock(
        return_value=httpx.Response(201, json=resposta_api)
    )

    itens = [{"descricao": "Café Especial", "quantidade": 1, "valor_unitario": 45.0}]
    resultado = await emitir_nfce_consumidor(
        itens=itens,
        forma_pagamento="PIX",
        destinatario_cpf="11122233344",
        gerar_caixa=True
    )

    assert resultado["nota_id"] == 12
    assert resultado["numero"] == 303
    assert resultado["valor_total"] == 45.0
    assert resultado["forma_pagamento"] == "PIX"
    assert "sucesso" in resultado["mensagem"].lower()

@pytest.mark.asyncio
@respx.mock
async def test_listar_notas_fiscais_sucesso():
    notas = [
        {
            "id": 10,
            "tipo": "NFSE",
            "status": "EMITIDA",
            "serie": 1,
            "numero": 101,
            "chave_acesso": "DPS3550308001000000101",
            "destinatario_nome": "Carlos Cliente",
            "valor_total": 350.0,
            "valor_liquido": 350.0,
            "data_emissao": "2026-10-08 14:00:00"
        },
        {
            "id": 11,
            "tipo": "NFE",
            "status": "EMITIDA",
            "serie": 1,
            "numero": 202,
            "chave_acesso": "35261012345678000195550010000002021123456784",
            "destinatario_nome": "Empresa Compradora Ltda",
            "valor_total": 120.0,
            "valor_liquido": 120.0,
            "data_emissao": "2026-10-08 15:00:00"
        }
    ]
    respx.get("http://test-node:3001/api/notas-fiscais").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": notas})
    )

    resultado = await listar_notas_fiscais(tipo="NFSE", status="EMITIDA", limite=10)
    assert resultado["total"] == 2
    assert len(resultado["notas"]) == 2
    assert resultado["notas"][0]["id"] == 10
    assert resultado["notas"][0]["tipo"] == "NFSE"
    assert resultado["notas"][0]["valor"] == 350.0

    url_chamada = str(respx.calls.last.request.url)
    assert "tipo=NFSE" in url_chamada
    assert "status=EMITIDA" in url_chamada
    assert "limite=10" in url_chamada

@pytest.mark.asyncio
@respx.mock
async def test_consultar_nota_fiscal_por_id():
    dados_nota = {
        "id": 10,
        "tipo": "NFSE",
        "status": "EMITIDA",
        "serie": 1,
        "numero": 101,
        "chave_acesso": "DPS3550308001000000101",
        "protocolo_autorizacao": "NFSE2026000000101",
        "destinatario_nome": "Carlos Cliente",
        "destinatario_documento": "12345678909",
        "valor_total": 350.0,
        "valor_liquido": 350.0,
        "data_emissao": "2026-10-08 14:00:00",
        "itens": [],
        "danfe": "<html>DANFE NFS-e</html>"
    }
    respx.get("http://test-node:3001/api/notas-fiscais/10").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": dados_nota})
    )

    resultado = await consultar_nota_fiscal(nota_id=10)
    assert resultado["nota_id"] == 10
    assert resultado["chave_acesso"] == "DPS3550308001000000101"
    assert resultado["danfe_simplificado"] == "<html>DANFE NFS-e</html>"

@pytest.mark.asyncio
@respx.mock
async def test_consultar_nota_fiscal_por_chave():
    chave = "35261012345678000195550010000002021123456784"
    dados_nota = {
        "id": 11,
        "tipo": "NFE",
        "status": "EMITIDA",
        "serie": 1,
        "numero": 202,
        "chave_acesso": chave,
        "protocolo_autorizacao": "135261000000202",
        "destinatario_nome": "Empresa Compradora Ltda",
        "destinatario_documento": "98765432000198",
        "valor_total": 120.0,
        "valor_liquido": 120.0,
        "data_emissao": "2026-10-08 15:00:00",
        "itens": [{"descricao": "Chave de Fenda", "quantidade": 2, "valor_unitario": 50.0}],
        "danfe": "<html>DANFE NF-e</html>"
    }
    respx.get(f"http://test-node:3001/api/notas-fiscais/{chave}").mock(
        return_value=httpx.Response(200, json={"sucesso": True, "dados": dados_nota})
    )

    resultado = await consultar_nota_fiscal(chave_acesso=chave)
    assert resultado["nota_id"] == 11
    assert resultado["chave_acesso"] == chave
    assert len(resultado["itens"]) == 1

@pytest.mark.asyncio
async def test_consultar_nota_fiscal_sem_parametros():
    resultado = await consultar_nota_fiscal()
    assert "erro" in resultado
    assert "nota_id" in resultado["erro"] or "chave_acesso" in resultado["erro"]

@pytest.mark.asyncio
@respx.mock
async def test_cancelar_nota_fiscal_sucesso():
    resposta_api = {
        "sucesso": True,
        "mensagem": "Nota fiscal cancelada com sucesso",
        "dados": {
            "id": 10,
            "tipo": "NFSE",
            "status": "CANCELADA",
            "serie": 1,
            "numero": 101,
            "motivo_cancelamento": "Cancelamento solicitado pelo cliente formalmente",
            "data_cancelamento": "2026-10-08 16:00:00"
        }
    }
    respx.post("http://test-node:3001/api/notas-fiscais/10/cancelar").mock(
        return_value=httpx.Response(200, json=resposta_api)
    )

    resultado = await cancelar_nota_fiscal(
        nota_id=10,
        motivo="Cancelamento solicitado pelo cliente formalmente"
    )

    assert resultado["nota_id"] == 10
    assert resultado["status"] == "CANCELADA"
    assert resultado["motivo"] == "Cancelamento solicitado pelo cliente formalmente"
    assert "cancelada com sucesso" in resultado["mensagem"].lower()

@pytest.mark.asyncio
@respx.mock
async def test_emitir_nfse_nacional_erro_backend():
    respx.post("http://test-node:3001/api/notas-fiscais/nfse").mock(
        return_value=httpx.Response(
            400,
            json={"sucesso": False, "mensagem": "Documento do destinatário/tomador é obrigatório e deve ser CPF ou CNPJ válido"}
        )
    )

    resultado = await emitir_nfse_nacional(
        destinatario_nome="Carlos Cliente",
        destinatario_documento="000",
        discriminacao_servico="Serviço",
        valor=100.0
    )

    assert "erro" in resultado
    assert "CPF ou CNPJ válido" in resultado["erro"]

@pytest.mark.asyncio
@respx.mock
async def test_cancelar_nota_fiscal_motivo_curto_erro_backend():
    respx.post("http://test-node:3001/api/notas-fiscais/10/cancelar").mock(
        return_value=httpx.Response(
            400,
            json={"sucesso": False, "mensagem": "O motivo do cancelamento deve conter no mínimo 15 caracteres."}
        )
    )

    resultado = await cancelar_nota_fiscal(nota_id=10, motivo="Curto")
    assert "erro" in resultado
    assert "15 caracteres" in resultado["erro"]

@pytest.mark.asyncio
@respx.mock
async def test_consultar_nota_fiscal_nao_encontrada():
    respx.get("http://test-node:3001/api/notas-fiscais/999").mock(
        return_value=httpx.Response(
            404,
            json={"sucesso": False, "mensagem": "Nota fiscal não encontrada ou não pertence a este usuário."}
        )
    )

    resultado = await consultar_nota_fiscal(nota_id=999)
    assert "erro" in resultado
    assert "não encontrada" in resultado["erro"]

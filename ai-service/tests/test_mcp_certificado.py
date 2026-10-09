import pytest
from mcp_server.server import mcp_server_app

@pytest.mark.asyncio
async def test_mcp_obter_status_certificado_digital(respx_mock):
    respx_mock.get("http://localhost:3000/api/configuracoes/certificado").respond(
        200,
        json={
            "sucesso": True,
            "dados": {
                "configurado": True,
                "cnpj": "12345678000195",
                "razaoSocial": "MEI TESTE LTDA",
                "validoAte": "2027-10-09T18:00:00Z",
                "diasRestantes": 365,
                "ativo": True,
                "nomeArquivo": "cert.pfx"
            }
        }
    )
    tools = await mcp_server_app.list_tools()
    tool_names = [t.name for t in tools]
    assert "obter_status_certificado_digital" in tool_names
    assert "alternar_transmissao_sefaz" in tool_names

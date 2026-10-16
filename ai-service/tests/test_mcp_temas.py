import pytest
from unittest.mock import patch, AsyncMock
from mcp_server.server import listar_temas, ativar_tema, gerar_tema_ia


@pytest.mark.asyncio
async def test_listar_temas_mcp():
    mock_retorno = [
        {"id": 1, "nome": "Claro Aranduê", "eh_ativo": True},
        {"id": 2, "nome": "Noturno Corporativo", "eh_ativo": False},
    ]
    with patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_retorno
        res = await listar_temas()
        assert res["sucesso"] is True
        assert len(res["temas"]) == 2
        mock_fetch.assert_called_once_with("/configuracoes/temas")


@pytest.mark.asyncio
async def test_listar_temas_mcp_erro():
    with patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = {"erro": "Falha de conexão com a API"}
        res = await listar_temas()
        assert res["sucesso"] is False
        assert "Falha de conexão com a API" in res["mensagem"]


@pytest.mark.asyncio
async def test_ativar_tema_mcp():
    with patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("mcp_server.server._put", new_callable=AsyncMock) as mock_put:
        mock_fetch.return_value = [{"id": 2, "nome": "Noturno Corporativo", "eh_ativo": False}]
        mock_put.return_value = {"sucesso": True, "dados": {"nome": "Noturno Corporativo", "eh_ativo": True}}
        res = await ativar_tema(tema_id_ou_nome="Noturno Corporativo")
        assert res["sucesso"] is True
        assert "Noturno Corporativo" in res["mensagem"]
        mock_put.assert_called_once_with("/configuracoes/temas/2/ativar", {})


@pytest.mark.asyncio
async def test_ativar_tema_mcp_por_id():
    with patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("mcp_server.server._put", new_callable=AsyncMock) as mock_put:
        mock_fetch.return_value = [
            {"id": 1, "nome": "Claro Aranduê", "eh_ativo": True},
            {"id": 2, "nome": "Noturno Corporativo", "eh_ativo": False},
        ]
        mock_put.return_value = {"sucesso": True, "dados": {"nome": "Noturno Corporativo", "eh_ativo": True}}
        res = await ativar_tema(tema_id_ou_nome="2")
        assert res["sucesso"] is True
        assert "Noturno Corporativo" in res["mensagem"]
        mock_put.assert_called_once_with("/configuracoes/temas/2/ativar", {})


@pytest.mark.asyncio
async def test_ativar_tema_mcp_nao_encontrado():
    with patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = [
            {"id": 1, "nome": "Claro Aranduê", "slug": "claro-arandue", "eh_ativo": True},
        ]
        res = await ativar_tema(tema_id_ou_nome="Tema Inexistente")
        assert res["sucesso"] is False
        assert "Tema 'Tema Inexistente' não encontrado" in res["mensagem"]
        assert "'Claro Aranduê'" in res["mensagem"]


@pytest.mark.asyncio
async def test_gerar_tema_ia_mcp():
    with patch("mcp_server.server._post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = {"sucesso": True, "dados": {"id": 10, "nome": "Tema Barbearia"}}
        res = await gerar_tema_ia(descricao="Tema escuro com dourado para barbearia", modo="dark")
        assert res["sucesso"] is True
        assert "cores" in res
        assert res["cores"]["bgApp"] != "#000000"
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert args[0] == "/configuracoes/temas/upload"
        payload = args[1]
        assert payload["ativar"] is True
        assert payload["modo"] == "dark"
        assert "cores" in payload


@pytest.mark.asyncio
async def test_gerar_tema_ia_mcp_falha_persist():
    with patch("mcp_server.server._post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = {"sucesso": False, "mensagem": "Erro de validação de cores"}
        res = await gerar_tema_ia(descricao="Tema inválido", modo="dark")
        assert res["sucesso"] is False
        assert "Erro de validação de cores" in res["mensagem"]


@pytest.mark.asyncio
async def test_ativar_tema_mcp_erro_fetch():
    with patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = {"erro": "Conexão recusada"}
        res = await ativar_tema(tema_id_ou_nome="Noturno")
        assert res["sucesso"] is False
        assert "Conexão recusada" in res["mensagem"]


def test_system_prompt_contem_diretrizes_de_temas():
    from app.llm.prompts import SYSTEM_PROMPT
    assert "listar_temas" in SYSTEM_PROMPT
    assert "ativar_tema" in SYSTEM_PROMPT
    assert "gerar_tema_ia" in SYSTEM_PROMPT
    assert "DIRETRIZ DE APARÊNCIA E TEMAS" in SYSTEM_PROMPT


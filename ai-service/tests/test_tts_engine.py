import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.tts.engine import limpar_texto_para_tts, sintetizar_audio_mp3

def test_limpar_texto_para_tts():
    texto_md = "Olá **João**! Veja o link [aqui](http://exemplo.com) e o código `SELECT * FROM caixa`.\n### Título\n* Item 1\n- Item 2 😊"
    limpo = limpar_texto_para_tts(texto_md)
    assert "**" not in limpo
    assert "[" not in limpo
    assert "]" not in limpo
    assert "http" not in limpo
    assert "`" not in limpo
    assert "###" not in limpo
    assert "😊" not in limpo
    assert "Olá João!" in limpo
    assert "Veja o link aqui" in limpo
    assert "Item 1" in limpo
    assert "Item 2" in limpo

@pytest.mark.asyncio
async def test_sintetizar_audio_mp3_sucesso():
    resultado = await sintetizar_audio_mp3(
        texto="Olá! Sou a assistente virtual Aranduê.",
        voz="pt-BR-FranciscaNeural"
    )
    assert resultado["sucesso"] is True
    assert isinstance(resultado["audio_base64"], str)
    assert len(resultado["audio_base64"]) > 50
    assert resultado["mime_type"] == "audio/mp3"
    assert resultado["voz_utilizada"] == "pt-BR-FranciscaNeural"
    assert resultado["duracao_estimada_s"] > 0

@pytest.mark.asyncio
async def test_endpoint_sintetizar_audio_unauthorized():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/audio/sintetizar",
            json={"texto": "Teste sem secret", "voz": "pt-BR-FranciscaNeural"}
        )
        assert resp.status_code == 401

@pytest.mark.asyncio
async def test_endpoint_sintetizar_audio_sucesso():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/audio/sintetizar",
            headers={"X-Internal-Secret": "super_secreto_interno_arandue_2026"},
            json={"texto": "Teste de voz do assistente Aranduê.", "voz": "pt-BR-AntonioNeural"}
        )
        assert resp.status_code == 200
        dados = resp.json()
        assert dados["sucesso"] is True
        assert "audio_base64" in dados
        assert len(dados["audio_base64"]) > 50
        assert dados["mime_type"] == "audio/mp3"
        assert dados["voz_utilizada"] == "pt-BR-AntonioNeural"
        assert dados["duracao_estimada_s"] > 0

@pytest.mark.asyncio
async def test_sintetizar_audio_elevenlabs_sucesso(monkeypatch):
    import httpx
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test_elevenlabs_key_123")

    fake_mp3_bytes = b"ID3\x04\x00\x00\x00\x00\x00#TSSE\x00\x00\x00\x0f\x00\x00\x03Lavf58.29.100\x00" + b"\xff\xfb\x90\x00" * 30

    async def mock_post(self, url, *args, **kwargs):
        return httpx.Response(200, content=fake_mp3_bytes, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    resultado = await sintetizar_audio_mp3(
        texto="Olá! Teste com ElevenLabs sintetizado.",
        voz="21m00Tcm4TlvDq8ikWAM",
        provedor="elevenlabs"
    )

    assert resultado["sucesso"] is True
    assert resultado["provedor_utilizado"] == "elevenlabs"
    assert resultado["voz_utilizada"] == "21m00Tcm4TlvDq8ikWAM"
    assert len(resultado["audio_base64"]) > 20

@pytest.mark.asyncio
async def test_sintetizar_audio_elevenlabs_fallback_quando_sem_chave(monkeypatch):
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)

    # Sem chave de API, deve acionar fallback resiliente para Edge-TTS
    resultado = await sintetizar_audio_mp3(
        texto="Fallback para Edge TTS.",
        voz="21m00Tcm4TlvDq8ikWAM",
        provedor="elevenlabs"
    )

    assert resultado["sucesso"] is True
    assert resultado["provedor_utilizado"] == "edge-tts"
    assert resultado["fallback_ativado"] is True
    assert len(resultado["audio_base64"]) > 50

@pytest.mark.asyncio
async def test_sintetizar_audio_elevenlabs_fallback_quando_erro_api(monkeypatch):
    import httpx
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test_elevenlabs_invalid_key")

    async def mock_post_error(self, url, *args, **kwargs):
        return httpx.Response(401, json={"detail": "Unauthorized"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post_error)

    resultado = await sintetizar_audio_mp3(
        texto="Fallback após erro 401 na ElevenLabs.",
        voz="21m00Tcm4TlvDq8ikWAM",
        provedor="elevenlabs"
    )

    assert resultado["sucesso"] is True
    assert resultado["provedor_utilizado"] == "edge-tts"
    assert resultado["fallback_ativado"] is True
    assert len(resultado["audio_base64"]) > 50


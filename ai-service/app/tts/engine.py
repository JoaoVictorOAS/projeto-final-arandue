import os
import re
import base64
import logging
from typing import Dict, Any, Optional
import httpx
import edge_tts

logger = logging.getLogger("ai-service.tts")

VOZES_EDGE = {
    "pt-BR-FranciscaNeural": "Francisca - Edge Neural (Feminina, acolhedora)",
    "pt-BR-AntonioNeural": "Antonio - Edge Neural (Masculina, profissional)",
    "pt-BR-ThalitaNeural": "Thalita - Edge Neural (Feminina, jovem)"
}

VOZES_ELEVENLABS = {
    "21m00Tcm4TlvDq8ikWAM": "Rachel - ElevenLabs (Feminina, calma e expressiva)",
    "pNInz6obpgDQGcFmaJgB": "Adam - ElevenLabs (Masculina, firme e confiável)",
    "AZnzlk1XvdvUeBnXmlld": "Domi - ElevenLabs (Feminina, jovem e enérgica)",
    "ErXwobaYiN019PkySvjV": "Antoni - ElevenLabs (Masculina, equilibrada e clara)",
    "JBFqnCBsd6RMkjVDRZzb": "George - ElevenLabs (Masculina, acolhedora e confiável)",
    "EXAVITQu4vr4xnSDxMaL": "Bella - ElevenLabs (Feminina, suave)",
    "TxGEqnHWrfWFTfGW9XjX": "Josh - ElevenLabs (Masculina, dinâmica)"
}

VOZES_PERMITIDAS = {**VOZES_EDGE, **VOZES_ELEVENLABS}

VOZ_PADRAO = "pt-BR-FranciscaNeural"
VOZ_PADRAO_ELEVENLABS = "JBFqnCBsd6RMkjVDRZzb"

ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech"

# Regex para limpar emojis
RE_EMOJI = re.compile(
    r"[\U00010000-\U0010ffff]|[\u2600-\u27bf]|[\ud83c\ud000-\ud83e\uddff]",
    flags=re.UNICODE
)

def limpar_texto_para_tts(texto: str) -> str:
    """
    Remove marcações de formatação Markdown, URLs, blocos de código e emojis
    para garantir uma leitura contínua, natural e fluida no motor de TTS neural.
    """
    if not texto or not texto.strip():
        return "Nenhum conteúdo para síntese."

    limpo = texto

    # Remove blocos de código ```linguagem ... ```
    limpo = re.sub(r'```[\s\S]*?```', '', limpo)

    # Converte links markdown [texto](url) -> texto
    limpo = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', limpo)

    # Remove links de imagem ![alt](url)
    limpo = re.sub(r'!\[([^\]]*)\]\([^)]+\)', '', limpo)

    # Remove URLs soltas
    limpo = re.sub(r'https?://\S+', '', limpo)

    # Remove crases de código inline `codigo`
    limpo = re.sub(r'`([^`]+)`', r'\1', limpo)

    # Remove negrito e itálico (**texto**, *texto*, __texto__, _texto_)
    limpo = re.sub(r'[*_]{1,3}', '', limpo)

    # Remove marcadores de cabeçalho (#, ##, ###)
    limpo = re.sub(r'#+\s*', '', limpo)

    # Remove marcadores de citação (> texto)
    limpo = re.sub(r'^>\s*', '', limpo, flags=re.MULTILINE)

    # Remove marcadores de lista (- item, * item, + item)
    limpo = re.sub(r'^[\*\-\+]\s+', '', limpo, flags=re.MULTILINE)

    # Remove emojis que causam ruídos ou pausas artificiais na leitura
    limpo = RE_EMOJI.sub('', limpo)

    # Remove múltiplos espaços em branco e quebras excessivas de linha
    limpo = re.sub(r'[ \t]+', ' ', limpo)
    limpo = re.sub(r'\n\s*\n+', '\n', limpo)

    limpo = limpo.strip()
    return limpo if limpo else "Nenhum conteúdo legível para reprodução."

async def _sintetizar_edge_tts(texto_limpo: str, voz_escolhida: str) -> Dict[str, Any]:
    """Sintetiza áudio via Microsoft Edge Neural TTS."""
    voz_final = voz_escolhida if voz_escolhida in VOZES_EDGE else VOZ_PADRAO
    communicate = edge_tts.Communicate(text=texto_limpo, voice=voz_final)
    audio_stream = bytearray()

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_stream.extend(chunk["data"])

    if not audio_stream:
        raise RuntimeError("Nenhum dado de áudio retornado pelo Edge-TTS.")

    total_palavras = len(texto_limpo.split())
    duracao_estimada = max(1.0, round(total_palavras / 2.5, 1))
    audio_b64 = base64.b64encode(audio_stream).decode("utf-8")

    return {
        "sucesso": True,
        "audio_base64": audio_b64,
        "mime_type": "audio/mp3",
        "duracao_estimada_s": duracao_estimada,
        "voz_utilizada": voz_final,
        "provedor_utilizado": "edge-tts"
    }

async def _sintetizar_elevenlabs(texto_limpo: str, voz_escolhida: str, api_key: str) -> Dict[str, Any]:
    """Sintetiza áudio via ElevenLabs API (eleven_multilingual_v2)."""
    voice_id = voz_escolhida if voz_escolhida in VOZES_ELEVENLABS else VOZ_PADRAO_ELEVENLABS
    url = f"{ELEVENLABS_API_URL}/{voice_id}"

    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
    }

    payload = {
        "text": texto_limpo,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            raise RuntimeError(f"ElevenLabs API retornou status {resp.status_code}: {resp.text}")

        audio_bytes = resp.content
        if not audio_bytes:
            raise RuntimeError("ElevenLabs retornou payload de áudio vazio.")

    total_palavras = len(texto_limpo.split())
    duracao_estimada = max(1.0, round(total_palavras / 2.5, 1))
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    return {
        "sucesso": True,
        "audio_base64": audio_b64,
        "mime_type": "audio/mp3",
        "duracao_estimada_s": duracao_estimada,
        "voz_utilizada": voice_id,
        "provedor_utilizado": "elevenlabs"
    }

async def sintetizar_audio_mp3(
    texto: str,
    voz: str = VOZ_PADRAO,
    provedor: str = "auto"
) -> Dict[str, Any]:
    """
    Sintetiza um texto em áudio MP3 utilizando ElevenLabs ou Edge Neural TTS.
    Se o provedor for 'elevenlabs' ou 'auto' com chave disponível, tenta ElevenLabs primeiro.
    Caso a chave não esteja presente ou ocorra erro/limite de cota, ativa fallback automático para Edge-TTS.
    """
    texto_limpo = limpar_texto_para_tts(texto)
    eleven_key = os.getenv("ELEVENLABS_API_KEY", "").strip()

    deve_tentar_elevenlabs = (
        provedor == "elevenlabs" or
        (provedor == "auto" and (voz in VOZES_ELEVENLABS or eleven_key))
    )

    if deve_tentar_elevenlabs:
        if eleven_key:
            try:
                return await _sintetizar_elevenlabs(texto_limpo, voz, eleven_key)
            except Exception as e:
                logger.warning(
                    f"Falha ao sintetizar com ElevenLabs (voz={voz}): {e}. "
                    "Ativando fallback resiliente para Edge-TTS."
                )
        else:
            logger.info("Chave ELEVENLABS_API_KEY não configurada. Usando fallback para Edge-TTS.")

        # Fallback resiliente para Edge-TTS
        fallback_voz = voz if voz in VOZES_EDGE else VOZ_PADRAO
        res = await _sintetizar_edge_tts(texto_limpo, fallback_voz)
        res["fallback_ativado"] = True
        return res

    # Modo direto Edge-TTS
    voz_edge = voz if voz in VOZES_EDGE else VOZ_PADRAO
    return await _sintetizar_edge_tts(texto_limpo, voz_edge)

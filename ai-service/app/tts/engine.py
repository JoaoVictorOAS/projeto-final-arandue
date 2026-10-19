import re
import base64
import logging
from typing import Dict, Any
import edge_tts

logger = logging.getLogger("ai-service.tts")

VOZES_PERMITIDAS = {
    "pt-BR-FranciscaNeural": "Feminina, natural e acolhedora (Padrão)",
    "pt-BR-AntonioNeural": "Masculina, profissional e firme",
    "pt-BR-ThalitaNeural": "Feminina, jovem e dinâmica"
}

VOZ_PADRAO = "pt-BR-FranciscaNeural"

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

async def sintetizar_audio_mp3(texto: str, voz: str = VOZ_PADRAO) -> Dict[str, Any]:
    """
    Sintetiza um texto em áudio MP3 utilizando o serviço Edge Neural TTS da Microsoft.
    Retorna o áudio codificado em Base64, sua duração estimada e a voz utilizada.
    """
    voz_escolhida = voz if voz in VOZES_PERMITIDAS else VOZ_PADRAO
    texto_limpo = limpar_texto_para_tts(texto)

    try:
        communicate = edge_tts.Communicate(text=texto_limpo, voice=voz_escolhida)
        audio_stream = bytearray()

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.extend(chunk["data"])

        if not audio_stream:
            raise RuntimeError("Nenhum dado de áudio retornado pelo motor TTS.")

        # Duração estimada: ~2.5 palavras por segundo ou ~4000 bytes/s para 32kbps MP3
        total_palavras = len(texto_limpo.split())
        duracao_estimada = max(1.0, round(total_palavras / 2.5, 1))

        audio_b64 = base64.b64encode(audio_stream).decode("utf-8")

        return {
            "sucesso": True,
            "audio_base64": audio_b64,
            "mime_type": "audio/mp3",
            "duracao_estimada_s": duracao_estimada,
            "voz_utilizada": voz_escolhida
        }
    except Exception as e:
        logger.error(f"Erro ao sintetizar áudio com edge-tts (voz={voz_escolhida}): {e}")
        raise

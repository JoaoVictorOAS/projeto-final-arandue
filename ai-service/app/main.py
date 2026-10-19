import time
import asyncio
import logging
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.config import settings
from app.security import verify_internal_secret
from app.rag.embedder import Embedder
from app.rag.stores.chroma_store import ChromaStore
from app.rag.stores.firestore_store import FirestoreStore
from app.rag.retriever import FallbackRetriever
from app.mcp_pool.pool import TenantMcpPool
from app.llm.orchestrator import Orchestrator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai-service")

# Estado global da aplicação
state: Dict[str, Any] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Inicializando ai-service...")

    # 1. Embedder
    embedder = None
    try:
        embedder = Embedder(model_name=settings.EMBEDDING_MODEL, api_key=settings.GEMINI_API_KEY)
    except Exception as e:
        logger.warning(f"Não foi possível inicializar Embedder: {e}. O serviço continuará sem RAG local.")
    state["embedder"] = embedder

    # 2. Stores de vetores
    primary_store = None
    fallback_store = None

    if settings.VECTOR_PRIMARY == "firestore":
        try:
            primary_store = FirestoreStore(
                project_id=settings.FIRESTORE_PROJECT_ID,
                collection_name=settings.FIRESTORE_COLLECTION,
                corpus_version=settings.CORPUS_VERSION
            )
        except Exception as e:
            logger.warning(f"Não foi possível inicializar Firestore primário: {e}")

    if settings.VECTOR_PRIMARY == "chroma" or settings.VECTOR_FALLBACK == "chroma":
        try:
            c_store = ChromaStore(
                db_path=settings.CHROMA_PATH,
                collection_name=settings.CHROMA_COLLECTION
            )
            if settings.VECTOR_PRIMARY == "chroma":
                primary_store = c_store
            else:
                fallback_store = c_store
        except Exception as e:
            logger.warning(f"Não foi possível inicializar ChromaStore: {e}")

    # Validação no startup de integridade do modelo de embedding
    if primary_store and embedder:
        p_info = primary_store.info()
        stored_model = p_info.get("embedding_model")
        if stored_model and stored_model != "unknown" and stored_model != settings.EMBEDDING_MODEL:
            raise RuntimeError(
                f"Divergência de modelo de embedding! Store possui '{stored_model}', mas a configuração exige '{settings.EMBEDDING_MODEL}'."
            )

    state["primary_store"] = primary_store
    state["fallback_store"] = fallback_store

    # 3. Fallback Retriever
    retriever = FallbackRetriever(
        embedder=embedder,
        primary_store=primary_store,
        fallback_store=fallback_store,
        primary_name=settings.VECTOR_PRIMARY,
        fallback_name=settings.VECTOR_FALLBACK,
        primary_timeout_s=settings.RAG_PRIMARY_TIMEOUT_S,
        breaker_failures=settings.RAG_BREAKER_FAILURES,
        breaker_reset_s=settings.RAG_BREAKER_RESET_S,
        top_k=settings.RAG_TOP_K,
        max_distance=settings.RAG_MAX_DISTANCE,
        min_score=settings.RAG_MIN_SCORE
    )
    state["retriever"] = retriever

    # 4. MCP Pool
    mcp_pool = TenantMcpPool(
        node_api_url=settings.node_api_base_url,
        max_pool=settings.MCP_POOL_MAX,
        idle_ttl_s=settings.MCP_IDLE_TTL_S
    )
    state["mcp_pool"] = mcp_pool

    # 5. Orchestrator
    orchestrator = Orchestrator(
        api_key=settings.GEMINI_API_KEY,
        model_name=settings.GEMINI_MODEL,
        max_tool_calls=settings.LLM_MAX_TOOL_CALLS
    )
    state["orchestrator"] = orchestrator

    logger.info("ai-service inicializado com sucesso!")
    yield

    # Cleanup
    logger.info("Encerrando ai-service...")
    if "mcp_pool" in state:
        await state["mcp_pool"].shutdown()

app = FastAPI(title="Aranduê AI Service", lifespan=lifespan)

class HistoricoItem(BaseModel):
    papel: str = Field(..., description="'usuario' ou 'assistente'")
    texto: str

class MidiaPayload(BaseModel):
    tipo: str = Field(..., description="'audio' ou 'imagem'")
    dados_base64: str = Field(..., description="Conteúdo em base64 da mídia")
    mime_type: str = Field(default="image/jpeg", description="MIME type (ex: image/jpeg, audio/ogg)")

class ChatRequest(BaseModel):
    tenant_id: int
    tenant_token: str
    mensagem: str = Field(..., min_length=1, max_length=2000)
    historico: List[HistoricoItem] = Field(default_factory=list)
    midia: Optional[MidiaPayload] = None

class FonteItem(BaseModel):
    pagina: int
    trecho: str
    distancia: float
    score: float = 0.0

class ChatResponse(BaseModel):
    resposta: str
    fontes: List[FonteItem]
    tools_usadas: List[str]
    rag_backend: str
    modelo: str
    latencia_ms: int

@app.get("/health")
async def health_check():
    primary_info = state["primary_store"].info() if state.get("primary_store") else {"ok": False}
    fallback_info = state["fallback_store"].info() if state.get("fallback_store") else {"ok": False}

    return {
        "status": "ok",
        "embedding_model": settings.EMBEDDING_MODEL if state.get("embedder") else "disabled",
        "primary": primary_info,
        "fallback": fallback_info
    }

@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(verify_internal_secret)])
async def chat_endpoint(payload: ChatRequest):
    inicio = time.time()
    retriever: FallbackRetriever = state["retriever"]
    mcp_pool: TenantMcpPool = state["mcp_pool"]
    orchestrator: Orchestrator = state["orchestrator"]

    # 1. Recuperação Semântica Determinística RAG
    trechos, rag_backend = await retriever.retrieve(payload.mensagem)

    # 2. Orquestração com LLM e Sessão MCP do Tenant
    try:
        async with mcp_pool.session(payload.tenant_id, payload.tenant_token) as mcp_session:
            resposta_llm = await asyncio.wait_for(
                orchestrator.responder(
                    mensagem=payload.mensagem,
                    historico=[h.model_dump() for h in payload.historico],
                    trechos=trechos,
                    rag_backend=rag_backend,
                    mcp_session=mcp_session,
                    midia=payload.midia.model_dump() if payload.midia else None
                ),
                timeout=settings.LLM_TIMEOUT_S
            )
    except asyncio.TimeoutError:
        logger.error(f"Timeout de {settings.LLM_TIMEOUT_S}s ao gerar resposta para o tenant {payload.tenant_id}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Tempo limite excedido ao consultar o modelo de inteligência artificial."
        )
    except Exception as e:
        logger.error(f"Erro na orquestração LLM para o tenant {payload.tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Assistente IA temporariamente indisponível: {str(e)}"
        )

    latencia_ms = int((time.time() - inicio) * 1000)

    fontes = [
        FonteItem(
            pagina=t.pagina,
            trecho=t.texto[:180] + "...",
            distancia=t.distancia,
            score=t.score
        )
        for t in trechos
    ]

    return ChatResponse(
        resposta=resposta_llm.resposta,
        fontes=fontes,
        tools_usadas=resposta_llm.tools_usadas,
        rag_backend=rag_backend,
        modelo=resposta_llm.modelo,
        latencia_ms=latencia_ms
    )


class AtendenteChatRequest(BaseModel):
    tenant_id: int
    tenant_token: str
    mensagem: str = Field(..., min_length=1, max_length=2000)
    historico: List[HistoricoItem] = Field(default_factory=list)
    config_atendente: Dict[str, Any] = Field(default_factory=dict)
    cliente_contexto: Dict[str, Any] = Field(default_factory=dict)


@app.post("/chat/atendente", response_model=ChatResponse, dependencies=[Depends(verify_internal_secret)])
async def chat_atendente_endpoint(payload: AtendenteChatRequest):
    """Endpoint ultra-rápido para o Agente Pessoal de Atendimento ao Cliente do MEI.
    Não executa RAG de legislação fiscal (zero latência vetorial) e filtra estritamente as tools MCP autorizadas.
    """
    from app.llm.prompts import build_attendant_system_prompt

    inicio = time.time()
    mcp_pool: TenantMcpPool = state["mcp_pool"]
    orchestrator: Orchestrator = state["orchestrator"]

    cfg = payload.config_atendente or {}
    allowed_tools = set()
    if cfg.get("permite_consultar_catalogo", True):
        allowed_tools.add("atendente_consultar_catalogo")
    if cfg.get("permite_agendar", True):
        allowed_tools.add("atendente_verificar_disponibilidade")
        allowed_tools.add("atendente_realizar_agendamento")
    if cfg.get("permite_gerar_orcamento", True) or cfg.get("permite_fechar_orcamento", False):
        allowed_tools.add("atendente_fechar_orcamento_cliente")
    if cfg.get("transbordo_automatico", True):
        allowed_tools.add("atendente_solicitar_humano")

    custom_prompt = build_attendant_system_prompt(
        config_atendente=cfg,
        cliente_contexto=payload.cliente_contexto,
    )

    # Usa chave de pool segregada (negativa) para nunca colidir o token atendente:customer com o token assistente:operator do dono
    attendant_pool_key = -abs(int(payload.tenant_id)) - 100000

    try:
        async with mcp_pool.session(attendant_pool_key, payload.tenant_token) as mcp_session:
            resposta_llm = await asyncio.wait_for(
                orchestrator.responder(
                    mensagem=payload.mensagem,
                    historico=[h.model_dump() for h in payload.historico],
                    trechos=[],
                    rag_backend="attendant_direct",
                    mcp_session=mcp_session,
                    allowed_tools=allowed_tools,
                    custom_system_prompt=custom_prompt,
                ),
                timeout=settings.LLM_TIMEOUT_S,
            )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Tempo limite excedido no atendente virtual."
        )
    except Exception as e:
        logger.error(f"Erro no atendente virtual do tenant {payload.tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Atendente virtual temporariamente indisponível: {str(e)}"
        )

    latencia_ms = int((time.time() - inicio) * 1000)
    return ChatResponse(
        resposta=resposta_llm.resposta,
        fontes=[],
        tools_usadas=resposta_llm.tools_usadas,
        rag_backend="attendant_direct",
        modelo=resposta_llm.modelo,
        latencia_ms=latencia_ms,
    )


class OcrItem(BaseModel):
    nome: str
    quantidade: float = 1.0
    unidade: str = "un"
    valor_unitario: Optional[float] = 0.0
    valor_total: Optional[float] = 0.0


class OcrNotaFiscalRequest(BaseModel):
    imagem_base64: str
    mime_type: str = "image/jpeg"


class OcrNotaFiscalResponse(BaseModel):
    sucesso: bool
    fornecedor: Optional[str] = None
    numero_documento: Optional[str] = None
    data_emissao: Optional[str] = None
    valor_total: float = 0.0
    itens: List[OcrItem] = []
    mensagem: Optional[str] = None


@app.post("/ocr/nota-fiscal", response_model=OcrNotaFiscalResponse, dependencies=[Depends(verify_internal_secret)])
async def ocr_nota_fiscal_endpoint(payload: OcrNotaFiscalRequest):
    orchestrator: Orchestrator = state.get("orchestrator")
    if not orchestrator or not orchestrator._client:
        return OcrNotaFiscalResponse(
            sucesso=True,
            fornecedor="Distribuidora de Alimentos (Simulado)",
            numero_documento="NF-Simulada",
            valor_total=120.0,
            itens=[
                OcrItem(nome="Farinha de Trigo Especial", quantidade=10.0, unidade="kg", valor_total=50.0),
                OcrItem(nome="Óleo de Soja", quantidade=10.0, unidade="un", valor_total=70.0)
            ],
            mensagem="Nota fiscal processada em modo de demonstração local."
        )

    try:
        import base64
        import json
        img_str = payload.imagem_base64
        if "," in img_str:
            img_str = img_str.split(",", 1)[1]
        image_bytes = base64.b64decode(img_str)

        prompt_ocr = """Você é um especialista em OCR e documentos fiscais brasileiros (DANFE, NFC-e, Cupom Fiscal, Recibos).
Analise com atenção a imagem desta nota fiscal de compra e extraia em JSON estrito (sem markdown extra, apenas o objeto JSON):
{
  "fornecedor": "Razão social ou nome fantasia do fornecedor/emitente",
  "numero_documento": "Número da nota fiscal ou cupom",
  "data_emissao": "AAAA-MM-DD",
  "valor_total": 0.00,
  "itens": [
    {
      "nome": "Nome claro do produto ou matéria-prima",
      "quantidade": 1.0,
      "unidade": "kg, g, l, ml, un ou cx",
      "valor_unitario": 0.00,
      "valor_total": 0.00
    }
  ]
}
Se algum dado não for visível, tente deduzir com base no contexto ou deixe null. Responda APENAS o JSON."""

        from google.genai import types

        response = await asyncio.to_thread(
            orchestrator._client.models.generate_content,
            model=orchestrator.model_name,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=payload.mime_type),
                prompt_ocr
            ]
        )

        texto_limpo = response.text.strip()
        if texto_limpo.startswith("```json"):
            texto_limpo = texto_limpo[7:]
        if texto_limpo.startswith("```"):
            texto_limpo = texto_limpo[3:]
        if texto_limpo.endswith("```"):
            texto_limpo = texto_limpo[:-3]
        texto_limpo = texto_limpo.strip()

        dados = json.loads(texto_limpo)
        itens_obj = [
            OcrItem(
                nome=it.get("nome", "Item sem nome"),
                quantidade=float(it.get("quantidade", 1.0)),
                unidade=str(it.get("unidade", "un")),
                valor_unitario=float(it.get("valor_unitario", 0.0)) if it.get("valor_unitario") else None,
                valor_total=float(it.get("valor_total", 0.0)) if it.get("valor_total") else None
            )
            for it in dados.get("itens", [])
        ]

        return OcrNotaFiscalResponse(
            sucesso=True,
            fornecedor=dados.get("fornecedor"),
            numero_documento=str(dados.get("numero_documento", "")),
            data_emissao=dados.get("data_emissao"),
            valor_total=float(dados.get("valor_total", 0.0)),
            itens=itens_obj
        )
    except Exception as e:
        logger.error(f"Erro ao processar OCR multimodal de nota fiscal: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Não foi possível extrair os dados da nota fiscal pela foto no momento."
        )


class TranscricaoAudioRequest(BaseModel):
    audio_base64: str
    mime_type: str = "audio/ogg"


class TranscricaoAudioResponse(BaseModel):
    sucesso: bool
    transcricao: str
    duracao_estimada_s: Optional[float] = None
    modelo: Optional[str] = None
    mensagem: Optional[str] = None


@app.post("/audio/transcrever", response_model=TranscricaoAudioResponse, dependencies=[Depends(verify_internal_secret)])
async def transcrever_audio_endpoint(payload: TranscricaoAudioRequest):
    orchestrator: Orchestrator = state.get("orchestrator")
    if not orchestrator or not orchestrator._client:
        return TranscricaoAudioResponse(
            sucesso=True,
            transcricao="Registrar despesa de cinquenta reais com combustível.",
            duracao_estimada_s=3.0,
            modelo="simulado",
            mensagem="Áudio processado em modo de demonstração local."
        )

    try:
        import base64
        audio_str = payload.audio_base64
        if "," in audio_str:
            audio_str = audio_str.split(",", 1)[1]
        audio_bytes = base64.b64decode(audio_str)

        prompt_transcricao = """Você é um especialista em transcrição de áudio em português brasileiro para Microempreendedores Individuais (MEI).
Transcreva com alta fidelidade o áudio recebido.
Preserve comandos de negócios, valores monetários, nomes de clientes e pontuação correta.
Responda APENAS com o texto transcrito, sem aspas e sem introduções adicionais."""

        from google.genai import types

        response = await asyncio.to_thread(
            orchestrator._client.models.generate_content,
            model=orchestrator.model_name,
            contents=[
                types.Part.from_bytes(data=audio_bytes, mime_type=payload.mime_type),
                prompt_transcricao
            ]
        )
        if asyncio.iscoroutine(response):
            response = await response

        texto_transcrito = response.text.strip() if response.text else ""
        return TranscricaoAudioResponse(
            sucesso=True,
            transcricao=texto_transcrito,
            modelo=orchestrator.model_name
        )
    except Exception as e:
        logger.error(f"Erro ao transcrever áudio com Gemini: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Não foi possível processar a transcrição de áudio no momento."
        )


class AnaliseImagemRequest(BaseModel):
    imagem_base64: str
    mime_type: str = "image/jpeg"
    instrucao: Optional[str] = None


class AnaliseImagemResponse(BaseModel):
    sucesso: bool
    tipo_detectado: str = "documento"
    descricao: str
    dados_estruturados: Dict[str, Any] = {}
    sugestao_acao: Optional[str] = None
    mensagem: Optional[str] = None


@app.post("/imagem/analisar", response_model=AnaliseImagemResponse, dependencies=[Depends(verify_internal_secret)])
async def analisar_imagem_endpoint(payload: AnaliseImagemRequest):
    orchestrator: Orchestrator = state.get("orchestrator")
    if not orchestrator or not orchestrator._client:
        return AnaliseImagemResponse(
            sucesso=True,
            tipo_detectado="recibo",
            descricao="Comprovante de pagamento no valor de R$ 85,00 referente a materiais de escritório.",
            dados_estruturados={"valor": 85.0, "estabelecimento": "Papelaria Central", "data": "2026-10-15"},
            sugestao_acao="registrar_despesa",
            mensagem="Análise visual processada em modo de demonstração local."
        )

    try:
        import base64
        import json
        img_str = payload.imagem_base64
        if "," in img_str:
            img_str = img_str.split(",", 1)[1]
        image_bytes = base64.b64decode(img_str)

        prompt_analise = f"""Você é um assistente visual para Microempreendedores Individuais (MEI) brasileiros.
Analise a imagem enviada (recibo, comprovante Pix, nota fiscal, produto, estoque, cartão de visita, tabela de preços, anotação).
Instrução adicional do usuário: {payload.instrucao or 'Nenhuma'}

Responda em formato JSON estrito (sem markdown extra, apenas o objeto JSON):
{{
  "tipo_detectado": "recibo | comprovante_pix | nota_fiscal | cartao_visita | produto | estoque | outro",
  "descricao": "Resumo claro e conciso do que a imagem retrata para o MEI",
  "dados_estruturados": {{
    "valor": 0.00,
    "estabelecimento_ou_pessoa": "Nome se visível",
    "data": "AAAA-MM-DD se visível",
    "itens": ["item 1", "item 2"]
  }},
  "sugestao_acao": "registrar_despesa | registrar_receita | cadastrar_cliente | registrar_entrada_estoque | nenhuma"
}}
Responda APENAS o JSON."""

        from google.genai import types

        response = await asyncio.to_thread(
            orchestrator._client.models.generate_content,
            model=orchestrator.model_name,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=payload.mime_type),
                prompt_analise
            ]
        )
        if asyncio.iscoroutine(response):
            response = await response

        texto_limpo = response.text.strip()
        if texto_limpo.startswith("```json"):
            texto_limpo = texto_limpo[7:]
        if texto_limpo.startswith("```"):
            texto_limpo = texto_limpo[3:]
        if texto_limpo.endswith("```"):
            texto_limpo = texto_limpo[:-3]
        texto_limpo = texto_limpo.strip()

        dados = json.loads(texto_limpo)

        return AnaliseImagemResponse(
            sucesso=True,
            tipo_detectado=dados.get("tipo_detectado", "documento"),
            descricao=dados.get("descricao", "Documento analisado com sucesso."),
            dados_estruturados=dados.get("dados_estruturados", {}),
            sugestao_acao=dados.get("sugestao_acao")
        )
    except Exception as e:
        logger.error(f"Erro ao analisar imagem com Gemini: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Não foi possível processar a análise da imagem no momento."
        )


class SintetizarAudioRequest(BaseModel):
    texto: str = Field(..., description="Texto a ser sintetizado em voz")
    voz: Optional[str] = Field("pt-BR-FranciscaNeural", description="Identificador da voz neural (Francisca, Antonio, Thalita)")


class SintetizarAudioResponse(BaseModel):
    sucesso: bool
    audio_base64: str
    mime_type: str = "audio/mp3"
    duracao_estimada_s: float
    voz_utilizada: str


@app.post(
    "/audio/sintetizar",
    response_model=SintetizarAudioResponse,
    dependencies=[Depends(verify_internal_secret)],
    summary="Sintetiza texto em voz neural brasileira (MP3)"
)
async def sintetizar_audio(payload: SintetizarAudioRequest):
    try:
        from app.tts.engine import sintetizar_audio_mp3
        resultado = await sintetizar_audio_mp3(texto=payload.texto, voz=payload.voz or "pt-BR-FranciscaNeural")
        return SintetizarAudioResponse(**resultado)
    except Exception as e:
        logger.error(f"Erro no endpoint de síntese de áudio: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha ao sintetizar áudio: {str(e)}"
        )



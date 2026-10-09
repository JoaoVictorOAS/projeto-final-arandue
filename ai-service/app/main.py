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
    embedder = Embedder(model_name=settings.EMBEDDING_MODEL)
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
    if primary_store:
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
        node_api_url=settings.NODE_API_URL,
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

class ChatRequest(BaseModel):
    tenant_id: int
    tenant_token: str
    mensagem: str = Field(..., min_length=1, max_length=2000)
    historico: List[HistoricoItem] = Field(default_factory=list)

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
        "embedding_model": settings.EMBEDDING_MODEL,
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
                    mcp_session=mcp_session
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
        return OcrNotaFiscalResponse(
            sucesso=False,
            mensagem=f"Não foi possível extrair dados da nota fiscal pela foto: {str(e)}"
        )


import os
import pytest
from pathlib import Path
from app.rag.embedder import Embedder
from app.rag.stores.chroma_store import ChromaStore
from app.rag.retriever import FallbackRetriever

CHROMA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "chroma_db"

GOLDEN_SET = [
    # (pergunta, páginas esperadas no PDF oficial)
    ("Quem pode optar pelo Simei e qual o limite de receita bruta?", [4, 5, 21]),
    ("Que tributos estão incluídos no Simei e na guia fixa mensal?", [10, 11]),
    ("O MEI inativo está desobrigado de pagar o valor fixo mensal?", [12]),
    ("O MEI é obrigado a emitir nota fiscal para consumidor?", [13]),
    ("Qual o prazo para a entrega da declaração anual DASN-Simei?", [13, 14]),
    ("Existe multa pelo descumprimento do prazo para transmitir a DASN-Simei?", [14]),
    ("Posso parcelar os débitos apurados pelo Simei como INSS, ISS e ICMS?", [15, 16]),
    ("Para solicitar a restituição é necessário informar a conta bancária?", [18]),
    ("Como efetuar o desenquadramento do Simei no Portal do Simples Nacional?", [20, 21]),
    ("Em que situações ocorre o desenquadramento automático do Simei?", [22, 23, 24]),
]

@pytest.mark.asyncio
async def test_rag_golden_set_recall_at_3():
    """
    Validação oficial do Golden Set RAG:
    Garante que a recuperação semântica usando o modelo multilingual-e5-small
    atinge Recall@3 >= 0.80 sobre o corpus legal do MEI (docs/perguntaomei.pdf).
    """
    if not CHROMA_PATH.exists():
        pytest.skip(f"Diretório do ChromaDB não encontrado em {CHROMA_PATH}")

    embedder = Embedder("intfloat/multilingual-e5-small")
    store = ChromaStore(db_path=str(CHROMA_PATH), collection_name="regras_mei_e5")
    retriever = FallbackRetriever(
        embedder=embedder,
        primary_store=store,
        primary_name="chroma",
        max_distance=0.45
    )

    acertos = 0
    for query, expected_pages in GOLDEN_SET:
        trechos, backend = await retriever.retrieve(query)
        top3_pages = [t.pagina for t in trechos[:3]]
        hit = any(p in expected_pages for p in top3_pages)
        if hit:
            acertos += 1

    recall = acertos / len(GOLDEN_SET)
    print(f"\n[Golden Set RAG] Recall@3 obtido: {recall:.2f} (meta >= 0.80)")
    assert recall >= 0.80, f"Recall@3 insuficiente: {recall:.2f} < 0.80"

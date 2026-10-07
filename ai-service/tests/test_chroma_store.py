import pytest
from app.rag.embedder import Embedder
from app.rag.stores.chroma_store import ChromaStore

def test_chroma_store_real_search():
    store = ChromaStore(db_path="data/chroma_db", collection_name="regras_mei_e5")
    info = store.info()
    assert info["count"] == 81
    assert info["embedding_model"] == "intfloat/multilingual-e5-small"

    embedder = Embedder()
    vec = embedder.embed_query("qual o limite de faturamento anual do MEI")
    trechos = store.search(vec, k=3, max_distance=0.35)

    assert len(trechos) > 0
    # Verifica que os trechos relevantes sobre limite de faturamento (pág 4 ou 5) foram recuperados
    assert any(t.pagina in [4, 5] for t in trechos)
    # Verifica que as menções financeiras aos limites (81.000 ou 251.600) estão presentes nos resultados
    textos_combinados = " ".join([t.texto for t in trechos])
    assert "81.000" in textos_combinados or "251.600" in textos_combinados

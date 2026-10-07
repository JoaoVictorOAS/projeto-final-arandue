import pytest
from app.rag.embedder import Embedder

def test_embedder_dimensions_and_normalization():
    embedder = Embedder()
    vec = embedder.embed_query("como declarar venda")
    assert len(vec) == 384
    # Norma L2 deve ser aproximadamente 1.0 (vetores normalizados)
    norm = sum(x**2 for x in vec) ** 0.5
    assert pytest.approx(norm, rel=1e-3) == 1.0

def test_embedder_prefixes():
    embedder = Embedder()
    # Verifica que query e passage geram representações distintas devido ao prefixo obrigatório
    v_query = embedder.embed_query("teste de prefixo e5")
    v_doc = embedder.embed_passages(["teste de prefixo e5"])[0]
    assert len(v_query) == 384
    assert len(v_doc) == 384
    assert v_query != v_doc

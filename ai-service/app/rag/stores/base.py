from dataclasses import dataclass
from typing import Protocol, List, Dict, Any, Optional

@dataclass
class Trecho:
    id: str
    texto: str
    pagina: int
    distancia: float

class VectorStore(Protocol):
    def search(self, vector: List[float], k: int = 4, max_distance: float = 0.35) -> List[Trecho]:
        """Busca os k vizinhos mais próximos respeitando o limiar max_distance."""
        ...

    def info(self) -> Dict[str, Any]:
        """Retorna metadados do store: { 'embedding_model', 'corpus_version', 'count' }."""
        ...

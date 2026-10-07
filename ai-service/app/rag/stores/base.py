from dataclasses import dataclass
from typing import Protocol, List, Dict, Any, Optional

@dataclass
class Trecho:
    id: str
    texto: str
    pagina: int
    distancia: float
    score: float = 0.0

    def __post_init__(self):
        if not self.score and self.distancia is not None:
            self.score = round(max(0.0, 1.0 - float(self.distancia)), 4)

class VectorStore(Protocol):
    def search(
        self,
        vector: List[float],
        k: int = 4,
        max_distance: float = 0.35,
        min_score: Optional[float] = None
    ) -> List[Trecho]:
        """Busca os k vizinhos mais próximos respeitando max_distance e min_score."""
        ...

    def info(self) -> Dict[str, Any]:
        """Retorna metadados do store: { 'embedding_model', 'corpus_version', 'count' }."""
        ...

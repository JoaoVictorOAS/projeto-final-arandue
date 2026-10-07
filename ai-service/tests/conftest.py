import sys
from pathlib import Path

# Garante que o diretório ai-service esteja no PYTHONPATH para todos os testes pytest
AI_SERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_DIR))

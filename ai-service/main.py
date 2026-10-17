"""
Ponto de entrada ASGI para o microserviço ai-service no Vercel e outros ambientes.
Reexporta a instância FastAPI de app.main.
"""
from app.main import app

__all__ = ["app"]

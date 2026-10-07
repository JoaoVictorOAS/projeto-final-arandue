from typing import Optional
from fastapi import Header, HTTPException, status
from app.config import settings

async def verify_internal_secret(x_internal_secret: Optional[str] = Header(default=None)):
    """Valida o segredo compartilhado entre o backend Node e o ai-service na rede interna."""
    if not x_internal_secret or x_internal_secret != settings.INTERNAL_SERVICE_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Segredo interno de serviço inválido ou não fornecido."
        )
    return True

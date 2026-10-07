import os
import sys
import time
import asyncio
import logging
from pathlib import Path
from typing import Dict, Optional, AsyncGenerator
from contextlib import AsyncExitStack, asynccontextmanager

import jwt
from mcp.client.stdio import stdio_client, StdioServerParameters
from mcp.client.session import ClientSession

logger = logging.getLogger(__name__)

class PoolEntry:
    def __init__(self, tenant_id: int, tenant_token: str, token_exp: float, session: ClientSession, exit_stack: AsyncExitStack):
        self.tenant_id = tenant_id
        self.tenant_token = tenant_token
        self.token_exp = token_exp
        self.session = session
        self.exit_stack = exit_stack
        self.last_used = time.time()
        self.lock = asyncio.Lock()

class TenantMcpPool:
    def __init__(
        self,
        node_api_url: str = "http://localhost:3001/api",
        max_pool: int = 50,
        idle_ttl_s: float = 600.0,
        python_executable: Optional[str] = None
    ):
        self.node_api_url = node_api_url
        self.max_pool = max_pool
        self.idle_ttl_s = idle_ttl_s
        self.python_executable = python_executable or sys.executable
        self._pool: Dict[int, PoolEntry] = {}
        self._global_lock = asyncio.Lock()
        self._spawn_semaphore = asyncio.Semaphore(5)

    def _extract_token_exp(self, token: str) -> float:
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            return float(payload.get("exp", time.time() + 900))
        except Exception:
            return time.time() + 900

    def _build_safe_env(self, tenant_id: int, tenant_token: str) -> Dict[str, str]:
        """Cria ambiente estritamente isolado sem vazar segredos do processo pai."""
        ai_service_dir = str(Path(__file__).resolve().parent.parent.parent)
        safe_env = {
            "TENANT_ID": str(tenant_id),
            "TENANT_TOKEN": tenant_token,
            "NODE_API_URL": self.node_api_url,
            "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
            "PYTHONPATH": ai_service_dir,
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", "")
        }
        return {k: v for k, v in safe_env.items() if v}

    async def _close_entry(self, entry: PoolEntry):
        try:
            await entry.exit_stack.aclose()
        except Exception as e:
            logger.warning(f"Erro ao encerrar processo MCP do tenant {entry.tenant_id}: {e}")

    async def _evict_lru_if_needed(self):
        if len(self._pool) >= self.max_pool:
            oldest_tenant = min(self._pool.keys(), key=lambda t: self._pool[t].last_used)
            logger.info(f"Evicting LRU MCP process para o tenant {oldest_tenant}")
            entry = self._pool.pop(oldest_tenant)
            await self._close_entry(entry)

    async def cleanup_idle(self):
        """Limpa processos ociosos acima do TTL."""
        now = time.time()
        to_remove = []
        async with self._global_lock:
            for t_id, entry in list(self._pool.items()):
                if now - entry.last_used > self.idle_ttl_s and not entry.lock.locked():
                    to_remove.append(t_id)

            for t_id in to_remove:
                entry = self._pool.pop(t_id, None)
                if entry:
                    logger.info(f"Encerrando processo MCP ocioso do tenant {t_id}")
                    await self._close_entry(entry)

    async def _spawn_session(self, tenant_id: int, tenant_token: str) -> PoolEntry:
        token_exp = self._extract_token_exp(tenant_token)
        safe_env = self._build_safe_env(tenant_id, tenant_token)
        server_params = StdioServerParameters(
            command=self.python_executable,
            args=["-m", "mcp_server.server"],
            env=safe_env
        )

        exit_stack = AsyncExitStack()
        try:
            read_stream, write_stream = await exit_stack.enter_async_context(
                stdio_client(server_params)
            )
            session = await exit_stack.enter_async_context(
                ClientSession(read_stream, write_stream)
            )
            await session.initialize()
            entry = PoolEntry(
                tenant_id=tenant_id,
                tenant_token=tenant_token,
                token_exp=token_exp,
                session=session,
                exit_stack=exit_stack
            )
            return entry
        except Exception as e:
            await exit_stack.aclose()
            raise RuntimeError(f"Falha ao inicializar processo MCP para tenant {tenant_id}: {e}")

    @asynccontextmanager
    async def session(self, tenant_id: int, tenant_token: str) -> AsyncGenerator[ClientSession, None]:
        entry = None
        now = time.time()

        async with self._global_lock:
            existing = self._pool.get(tenant_id)
            # Reutiliza se o processo existe e o token tem mais de 300s de validade
            if existing and (existing.token_exp - now) > 300:
                entry = existing
            else:
                if existing:
                    # Token prestes a expirar ou já expirado: descarta sessão antiga
                    self._pool.pop(tenant_id, None)
                    await self._close_entry(existing)

                await self._evict_lru_if_needed()

        if entry is None:
            async with self._spawn_semaphore:
                entry = await self._spawn_session(tenant_id, tenant_token)
                async with self._global_lock:
                    self._pool[tenant_id] = entry

        async with entry.lock:
            entry.last_used = time.time()
            try:
                yield entry.session
            finally:
                entry.last_used = time.time()

    async def shutdown(self):
        """Encerra graciosamente todos os processos MCP ativos do pool."""
        async with self._global_lock:
            for t_id, entry in list(self._pool.items()):
                await self._close_entry(entry)
            self._pool.clear()
        logger.info("Todos os processos MCP do pool foram encerrados.")

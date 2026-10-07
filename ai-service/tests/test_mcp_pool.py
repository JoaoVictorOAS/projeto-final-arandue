import os
import time
import pytest
import jwt
from app.mcp_pool.pool import TenantMcpPool

@pytest.mark.asyncio
async def test_mcp_pool_spawn_and_list_tools():
    # Cria token mock para teste usando PyJWT encode
    token = jwt.encode({"id": 99, "scope": "assistente:read", "exp": time.time() + 1000}, "segredo", algorithm="HS256")
    pool = TenantMcpPool(max_pool=5, idle_ttl_s=60)

    try:
        async with pool.session(tenant_id=99, tenant_token=token) as session:
            tools_result = await session.list_tools()
            tool_names = [t.name for t in tools_result.tools]
            assert "obter_perfil_estabelecimento" in tool_names
            assert "obter_resumo_caixa" in tool_names
            assert "listar_movimentacoes" in tool_names
            assert "listar_cobrancas" in tool_names
            assert "listar_servicos" in tool_names
            assert "obter_resumo_negocio" in tool_names
    finally:
        await pool.shutdown()

@pytest.mark.asyncio
async def test_mcp_pool_safe_env_no_secrets_leaked():
    pool = TenantMcpPool()
    os.environ["GEMINI_API_KEY"] = "super_secret_gemini"
    os.environ["INTERNAL_SERVICE_SECRET"] = "super_secret_internal"

    safe_env = pool._build_safe_env(tenant_id=123, tenant_token="token_abc")
    assert "GEMINI_API_KEY" not in safe_env
    assert "INTERNAL_SERVICE_SECRET" not in safe_env
    assert safe_env["TENANT_ID"] == "123"
    assert safe_env["TENANT_TOKEN"] == "token_abc"

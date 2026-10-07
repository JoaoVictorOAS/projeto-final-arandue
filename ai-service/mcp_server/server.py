import os
import sys
from typing import Optional, Dict, Any, List
import httpx
from mcp.server.mcpserver import MCPServer

mcp_server_app = MCPServer("arandue-mcp-tenant")

def _get_env_config():
    node_url = os.environ.get("NODE_API_URL", "http://localhost:3001/api").rstrip("/")
    token = os.environ.get("TENANT_TOKEN", "")
    tenant_id = os.environ.get("TENANT_ID", "")
    return node_url, token, tenant_id

async def _fetch(endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    node_url, token, _ = _get_env_config()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    url = f"{node_url}{endpoint}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, headers=headers, params=params)
            if resp.status_code == 401 or resp.status_code == 403:
                # Token expirado ou sem permissão
                return {"erro": "Acesso não autorizado ou sessão expirada no backend"}
            if resp.status_code != 200:
                return {"erro": f"Erro do servidor (status {resp.status_code})"}
            data = resp.json()
            return data.get("dados", {})
        except Exception as e:
            return {"erro": f"Falha de conexão com a API: {str(e)}"}

@mcp_server_app.tool()
async def obter_perfil_estabelecimento() -> Dict[str, Any]:
    """Obtém o nome e identificação básica do MEI logado."""
    dados = await _fetch("/auth/me")
    if isinstance(dados, dict) and "erro" in dados:
        return dados
    return {
        "nome": dados.get("nome", "Empreendedor")
    }

@mcp_server_app.tool()
async def obter_resumo_negocio() -> Dict[str, Any]:
    """Obtém métricas consolidadas do negócio (faturamento do mês, despesas, saldo, valores a receber)."""
    return await _fetch("/dashboard/resumo")

@mcp_server_app.tool()
async def obter_resumo_caixa(ano: int, mes: Optional[int] = None) -> Dict[str, Any]:
    """Obtém faturamento, despesas e saldo apurado no livro caixa para um ano e mês específicos."""
    params = {"ano": ano}
    if mes is not None:
        params["mes"] = mes
    return await _fetch("/movimentacoes/resumo", params=params)

@mcp_server_app.tool()
async def listar_movimentacoes(
    tipo: Optional[str] = None,
    categoria: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    limite: int = 20
) -> Dict[str, Any]:
    """Lista lançamentos do livro caixa (entradas ou saídas). As descrições são encurtadas para preservar contexto."""
    limite = min(max(1, limite), 50)
    params = {}
    if tipo:
        params["tipo"] = tipo
    if categoria:
        params["categoria"] = categoria
    if data_inicio:
        params["data_inicio"] = data_inicio
    if data_fim:
        params["data_fim"] = data_fim

    dados = await _fetch("/movimentacoes", params=params)
    if isinstance(dados, dict) and "erro" in dados:
        return dados

    lista = dados if isinstance(dados, list) else []
    itens_filtrados = []
    for item in lista[:limite]:
        desc = item.get("descricao") or ""
        if len(desc) > 120:
            desc = desc[:117] + "..."
        itens_filtrados.append({
            "data_movimentacao": item.get("data_movimentacao"),
            "tipo": item.get("tipo"),
            "categoria": item.get("categoria"),
            "valor": float(item.get("valor", 0)),
            "descricao": desc
        })

    return {
        "total": len(lista),
        "movimentacoes": itens_filtrados
    }

@mcp_server_app.tool()
async def listar_cobrancas(status: Optional[str] = None, limite: int = 20) -> Dict[str, Any]:
    """Lista cobranças emitidas para clientes com seus status (PENDENTE, PAGO, ATRASADO)."""
    limite = min(max(1, limite), 50)
    params = {}
    if status:
        params["status"] = status

    dados = await _fetch("/cobrancas", params=params)
    if isinstance(dados, dict) and "erro" in dados:
        return dados

    lista = dados if isinstance(dados, list) else []
    itens = []
    for item in lista[:limite]:
        itens.append({
            "valor": float(item.get("valor", 0)),
            "vencimento": item.get("vencimento"),
            "status": item.get("status"),
            "data_pagamento": item.get("data_pagamento")
        })

    return {
        "total": len(lista),
        "cobrancas": itens
    }

@mcp_server_app.tool()
async def listar_servicos() -> Dict[str, Any]:
    """Lista o catálogo de serviços e produtos cadastrados pelo MEI."""
    dados = await _fetch("/servicos")
    if isinstance(dados, dict) and "erro" in dados:
        return dados

    lista = dados if isinstance(dados, list) else []
    servicos = []
    for item in lista:
        servicos.append({
            "nome": item.get("nome"),
            "preco": float(item.get("preco", 0)),
            "ativo": bool(item.get("ativo", True))
        })
    return {"servicos": servicos}

if __name__ == "__main__":
    mcp_server_app.run()

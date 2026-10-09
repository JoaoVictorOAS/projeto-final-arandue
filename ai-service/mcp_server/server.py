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
                try:
                    err_data = resp.json()
                    if isinstance(err_data, dict) and err_data.get("mensagem"):
                        return {"erro": err_data.get("mensagem")}
                except Exception:
                    pass
                return {"erro": f"Erro do servidor (status {resp.status_code})"}
            data = resp.json()
            return data.get("dados", {})
        except Exception as e:
            return {"erro": f"Falha de conexão com a API: {str(e)}"}

async def _post(endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    node_url, token, _ = _get_env_config()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    url = f"{node_url}{endpoint}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 401 or resp.status_code == 403:
                return {"sucesso": False, "erro": "Acesso não autorizado ou sessão expirada no backend"}
            data = resp.json()
            if resp.status_code not in (200, 201):
                return {"sucesso": False, "erro": data.get("mensagem") or f"Erro do servidor (status {resp.status_code})"}
            return {"sucesso": True, "dados": data.get("dados", {})}
        except Exception as e:
            return {"sucesso": False, "erro": f"Falha de conexão com a API: {str(e)}"}

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

@mcp_server_app.tool()
async def cadastrar_cliente(
    nome: str,
    telefone: Optional[str] = "",
    email: Optional[str] = "",
    endereco: Optional[str] = "",
    observacoes: Optional[str] = ""
) -> Dict[str, Any]:
    """Cadastra um novo cliente para o MEI autenticado no sistema."""
    payload = {
        "nome": nome.strip(),
        "telefone": (telefone or "").strip(),
        "email": (email or "").strip(),
        "endereco": (endereco or "").strip(),
        "observacoes": (observacoes or "").strip()
    }
    res = await _post("/clientes", payload)
    if not res.get("sucesso"):
        return {"erro": res.get("erro", "Erro ao cadastrar cliente")}
    cliente = res.get("dados", {})
    return {
        "mensagem": f"Cliente '{cliente.get('nome')}' cadastrado com sucesso!",
        "cliente_id": cliente.get("id"),
        "nome": cliente.get("nome")
    }

@mcp_server_app.tool()
async def listar_clientes(busca: Optional[str] = None, limite: int = 20) -> Dict[str, Any]:
    """Lista clientes cadastrados pelo MEI permitindo busca por nome."""
    limite = min(max(1, limite), 50)
    params = {}
    if busca:
        params["busca"] = busca
    dados = await _fetch("/clientes", params=params)
    if isinstance(dados, dict) and "erro" in dados:
        return dados
    lista = dados if isinstance(dados, list) else []
    clientes_resumidos = [
        {"id": c.get("id"), "nome": c.get("nome"), "telefone": c.get("telefone")}
        for c in lista[:limite]
    ]
    return {"total": len(lista), "clientes": clientes_resumidos}

@mcp_server_app.tool()
async def cadastrar_cobranca(
    cliente_id: int,
    valor: float,
    vencimento: str,
    observacoes: Optional[str] = ""
) -> Dict[str, Any]:
    """Cadastra uma nova cobrança/recebimento para um cliente (formato de vencimento: YYYY-MM-DD)."""
    payload = {
        "cliente_id": cliente_id,
        "valor": float(valor),
        "vencimento": vencimento,
        "observacoes": observacoes or ""
    }
    res = await _post("/cobrancas", payload)
    if not res.get("sucesso"):
        return {"erro": res.get("erro", "Erro ao cadastrar cobrança")}
    cobranca = res.get("dados", {})
    return {
        "mensagem": "Cobrança cadastrada com sucesso!",
        "cobranca_id": cobranca.get("id"),
        "valor": float(cobranca.get("valor", valor)),
        "vencimento": cobranca.get("vencimento"),
        "status": cobranca.get("status")
    }

@mcp_server_app.tool()
async def cadastrar_servico(
    nome: str,
    preco: float,
    categoria: Optional[str] = "Geral",
    descricao: Optional[str] = ""
) -> Dict[str, Any]:
    """Cadastra um novo serviço ou produto no catálogo do MEI."""
    payload = {
        "nome": nome.strip(),
        "preco": float(preco),
        "categoria": categoria or "Geral",
        "descricao": descricao or ""
    }
    res = await _post("/servicos", payload)
    if not res.get("sucesso"):
        return {"erro": res.get("erro", "Erro ao cadastrar serviço")}
    servico = res.get("dados", {})
    return {
        "mensagem": f"Serviço '{servico.get('nome')}' cadastrado com sucesso!",
        "servico_id": servico.get("id"),
        "nome": servico.get("nome"),
        "preco": float(servico.get("preco", preco))
    }

@mcp_server_app.tool()
async def cadastrar_agendamento(
    cliente_id: int,
    servico_id: int,
    data_hora: str,
    observacoes: Optional[str] = ""
) -> Dict[str, Any]:
    """Agenda um atendimento com um cliente para um serviço cadastrado (data_hora no formato YYYY-MM-DD HH:MM)."""
    payload = {
        "cliente_id": cliente_id,
        "servico_id": servico_id,
        "data_hora": data_hora,
        "observacoes": observacoes or ""
    }
    res = await _post("/agendamentos", payload)
    if not res.get("sucesso"):
        return {"erro": res.get("erro", "Erro ao criar agendamento")}
    agendamento = res.get("dados", {})
    return {
        "mensagem": "Agendamento registrado com sucesso!",
        "agendamento_id": agendamento.get("id"),
        "data_hora": agendamento.get("data_hora"),
        "status": agendamento.get("status")
    }

@mcp_server_app.tool()
async def emitir_nfse_nacional(
    destinatario_nome: str,
    destinatario_documento: str,
    discriminacao_servico: str,
    valor: float,
    codigo_tributacao_nacional: str = "01.07.01",
    destinatario_email: str = "",
    gerar_caixa: bool = True
) -> Dict[str, Any]:
    """Emite uma Nota Fiscal de Serviços Eletrônica (NFS-e Padrão Nacional) e opcionalmente registra no livro caixa."""
    payload = {
        "destinatario_nome": destinatario_nome.strip(),
        "destinatario_documento": destinatario_documento.strip(),
        "discriminacao_servico": discriminacao_servico.strip(),
        "valor": float(valor),
        "codigo_tributacao_nacional": (codigo_tributacao_nacional or "01.07.01").strip(),
        "destinatario_email": (destinatario_email or "").strip(),
        "gerar_caixa": bool(gerar_caixa)
    }
    res = await _post("/notas-fiscais/nfse", payload)
    if not res.get("sucesso"):
        return {"erro": res.get("erro", "Erro ao emitir NFS-e")}
    dados = res.get("dados", {})
    return {
        "mensagem": f"NFS-e emitida com sucesso! (Número: {dados.get('numero')}, Série: {dados.get('serie')})",
        "nota_id": dados.get("id"),
        "tipo": "NFSE",
        "numero": dados.get("numero"),
        "serie": dados.get("serie"),
        "chave_acesso": dados.get("chave_acesso"),
        "protocolo": dados.get("protocolo_autorizacao"),
        "valor": float(dados.get("valor_liquido", dados.get("valor_total", valor)) or valor),
        "status": dados.get("status", "EMITIDA")
    }

@mcp_server_app.tool()
async def emitir_nfe_produtos(
    destinatario_nome: str,
    destinatario_documento: str,
    itens: List[Dict[str, Any]],
    natureza_operacao: str = "Venda de mercadorias",
    gerar_caixa: bool = True
) -> Dict[str, Any]:
    """Emite uma Nota Fiscal Eletrônica de Produtos (NF-e Modelo 55) com detalhamento de itens."""
    payload = {
        "destinatario_nome": destinatario_nome.strip(),
        "destinatario_documento": destinatario_documento.strip(),
        "itens": itens if isinstance(itens, list) else [],
        "natureza_operacao": (natureza_operacao or "Venda de mercadorias").strip(),
        "gerar_caixa": bool(gerar_caixa)
    }
    res = await _post("/notas-fiscais/nfe", payload)
    if not res.get("sucesso"):
        return {"erro": res.get("erro", "Erro ao emitir NF-e")}
    dados = res.get("dados", {})
    return {
        "mensagem": f"NF-e emitida com sucesso! (Número: {dados.get('numero')}, Série: {dados.get('serie')})",
        "nota_id": dados.get("id"),
        "tipo": "NFE",
        "numero": dados.get("numero"),
        "serie": dados.get("serie"),
        "chave_acesso": dados.get("chave_acesso"),
        "protocolo": dados.get("protocolo_autorizacao"),
        "valor_total": float(dados.get("valor_total", 0) or 0),
        "status": dados.get("status", "EMITIDA")
    }

@mcp_server_app.tool()
async def emitir_nfce_consumidor(
    itens: List[Dict[str, Any]],
    forma_pagamento: str = "DINHEIRO",
    destinatario_cpf: str = "",
    gerar_caixa: bool = True
) -> Dict[str, Any]:
    """Emite uma Nota Fiscal de Consumidor Eletrônica (NFC-e Modelo 65) no varejo."""
    payload = {
        "itens": itens if isinstance(itens, list) else [],
        "forma_pagamento": (forma_pagamento or "DINHEIRO").strip(),
        "destinatario_cpf": (destinatario_cpf or "").strip(),
        "destinatario_documento": (destinatario_cpf or "").strip(),
        "gerar_caixa": bool(gerar_caixa)
    }
    res = await _post("/notas-fiscais/nfce", payload)
    if not res.get("sucesso"):
        return {"erro": res.get("erro", "Erro ao emitir NFC-e")}
    dados = res.get("dados", {})
    return {
        "mensagem": f"NFC-e emitida com sucesso! (Número: {dados.get('numero')}, Série: {dados.get('serie')})",
        "nota_id": dados.get("id"),
        "tipo": "NFCE",
        "numero": dados.get("numero"),
        "serie": dados.get("serie"),
        "chave_acesso": dados.get("chave_acesso"),
        "protocolo": dados.get("protocolo_autorizacao"),
        "valor_total": float(dados.get("valor_total", 0) or 0),
        "forma_pagamento": dados.get("forma_pagamento", forma_pagamento),
        "status": dados.get("status", "EMITIDA")
    }

@mcp_server_app.tool()
async def listar_notas_fiscais(
    tipo: Optional[str] = None,
    status: Optional[str] = None,
    limite: int = 20
) -> Dict[str, Any]:
    """Lista histórico de notas fiscais emitidas pelo MEI com filtros opcionais por tipo (NFSE, NFE, NFCE) e status."""
    limite = min(max(1, limite), 50)
    params = {"limite": limite}
    if tipo:
        params["tipo"] = tipo.strip().upper()
    if status:
        params["status"] = status.strip().upper()

    dados = await _fetch("/notas-fiscais", params=params)
    if isinstance(dados, dict) and "erro" in dados:
        return dados

    lista = dados if isinstance(dados, list) else []
    notas_resumidas = []
    for n in lista[:limite]:
        notas_resumidas.append({
            "id": n.get("id"),
            "tipo": n.get("tipo"),
            "numero": n.get("numero"),
            "serie": n.get("serie"),
            "status": n.get("status"),
            "destinatario": n.get("destinatario_nome"),
            "valor": float(n.get("valor_liquido", n.get("valor_total", 0)) or 0),
            "data_emissao": str(n.get("data_emissao", "")),
            "chave_acesso": n.get("chave_acesso")
        })
    return {
        "total": len(lista),
        "notas": notas_resumidas
    }

@mcp_server_app.tool()
async def consultar_nota_fiscal(
    nota_id: Optional[Any] = None,
    chave_acesso: Optional[str] = None
) -> Dict[str, Any]:
    """Consulta os dados detalhados de uma nota fiscal por ID ou chave de acesso, incluindo itens e DANFE."""
    identificador = str(nota_id).strip() if nota_id is not None and str(nota_id).strip() else (chave_acesso or "").strip()
    if not identificador:
        return {"erro": "É necessário informar nota_id ou chave_acesso para consulta"}

    dados = await _fetch(f"/notas-fiscais/{identificador}")
    if isinstance(dados, dict) and "erro" in dados:
        return dados

    return {
        "nota_id": dados.get("id"),
        "tipo": dados.get("tipo"),
        "status": dados.get("status"),
        "numero": dados.get("numero"),
        "serie": dados.get("serie"),
        "chave_acesso": dados.get("chave_acesso"),
        "protocolo": dados.get("protocolo_autorizacao"),
        "destinatario_nome": dados.get("destinatario_nome"),
        "destinatario_documento": dados.get("destinatario_documento"),
        "valor_total": float(dados.get("valor_total", 0) or 0),
        "valor_liquido": float(dados.get("valor_liquido", 0) or 0),
        "data_emissao": str(dados.get("data_emissao", "")),
        "itens": dados.get("itens", []),
        "danfe_simplificado": dados.get("danfe")
    }

@mcp_server_app.tool()
async def cancelar_nota_fiscal(nota_id: Any, motivo: str) -> Dict[str, Any]:
    """Cancela uma nota fiscal autorizada informando a justificativa legal (mínimo de 15 caracteres)."""
    if not nota_id:
        return {"erro": "Identificador da nota fiscal é obrigatório para cancelamento"}

    payload = {"motivo": (motivo or "").strip()}
    res = await _post(f"/notas-fiscais/{nota_id}/cancelar", payload)
    if not res.get("sucesso"):
        return {"erro": res.get("erro", "Erro ao cancelar nota fiscal")}
    dados = res.get("dados", {})
    return {
        "mensagem": f"Nota fiscal #{dados.get('numero', nota_id)} cancelada com sucesso!",
        "nota_id": dados.get("id", nota_id),
        "status": dados.get("status", "CANCELADA"),
        "motivo": dados.get("motivo_cancelamento", motivo),
        "data_cancelamento": str(dados.get("data_cancelamento", ""))
    }

@mcp_server_app.tool()
async def listar_insumos_estoque(busca: Optional[str] = None, apenas_abaixo_minimo: bool = False) -> Dict[str, Any]:
    """Lista matérias-primas e insumos cadastrados, seus saldos atuais e alertas de estoque mínimo."""
    params = {}
    if busca:
        params["busca"] = busca
    if apenas_abaixo_minimo:
        params["apenas_abaixo_minimo"] = "true"

    dados = await _fetch("/estoque/insumos", params=params)
    if isinstance(dados, dict) and "erro" in dados:
        return dados
    lista = dados if isinstance(dados, list) else []
    return {
        "total": len(lista),
        "insumos": lista
    }

@mcp_server_app.tool()
async def cadastrar_insumo(
    nome: str,
    unidade_base: str,
    estoque_minimo: float = 0.0,
    custo_unitario: float = 0.0
) -> Dict[str, Any]:
    """Cadastra um novo insumo/ingrediente. Unidade base deve ser 'g' (gramas), 'ml' (mililitros) ou 'un' (unidades)."""
    payload = {
        "nome": nome.strip(),
        "unidade_base": unidade_base.strip().lower(),
        "estoque_minimo": float(estoque_minimo),
        "custo_unitario": float(custo_unitario)
    }
    return await _post("/estoque/insumos", payload)

@mcp_server_app.tool()
async def registrar_compra_insumo(
    nome_ou_id: Any,
    quantidade: float,
    unidade: str,
    custo_total: Optional[float] = None,
    lancar_no_caixa: bool = True
) -> Dict[str, Any]:
    """Registra uma entrada/compra de insumo com conversão automática de unidades e opção de lançar despesa no Livro Caixa."""
    payload = {
        "quantidade": float(quantidade),
        "unidade": unidade,
        "lancar_no_caixa": bool(lancar_no_caixa)
    }
    if custo_total is not None:
        payload["custo_total"] = float(custo_total)

    if isinstance(nome_ou_id, int) and not isinstance(nome_ou_id, bool):
        payload["insumo_id"] = int(nome_ou_id)
    elif isinstance(nome_ou_id, str) and nome_ou_id.strip().isdigit():
        payload["insumo_id"] = int(nome_ou_id.strip())
    else:
        payload["nome"] = str(nome_ou_id).strip()

    return await _post("/estoque/insumos/entrada", payload)

@mcp_server_app.tool()
async def obter_ficha_tecnica_e_custo(servico_id: int) -> Dict[str, Any]:
    """Consulta os ingredientes e o custo total de confecção (CMV) de um produto do catálogo."""
    return await _fetch(f"/estoque/fichas-tecnicas/{servico_id}")

@mcp_server_app.tool()
async def definir_ficha_tecnica(servico_id: int, ingredientes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Define ou substitui a receita de um produto com os insumos necessários e suas quantidades na unidade base."""
    payload = {
        "servico_id": int(servico_id),
        "ingredientes": ingredientes
    }
    return await _post("/estoque/fichas-tecnicas", payload)

@mcp_server_app.tool()
async def registrar_lote_producao(servico_id: int, quantidade: int) -> Dict[str, Any]:
    """Registra a produção de um lote de produtos prontos, dando baixa automática nos insumos correspondentes."""
    payload = {
        "servico_id": int(servico_id),
        "quantidade": int(quantidade)
    }
    return await _post("/estoque/producao", payload)

@mcp_server_app.tool()
async def simular_producao(
    servico_id: int,
    insumos_informados: Optional[List[Dict[str, Any]]] = None,
    usar_estoque_atual: bool = False
) -> Dict[str, Any]:
    """Simula capacidade produtiva ('Com tanto de X e Y, quantos Z consigo fazer?'), identificando o ingrediente limitante e sobras."""
    payload = {
        "servico_id": int(servico_id),
        "usar_estoque_atual": bool(usar_estoque_atual)
    }
    if insumos_informados is not None:
        payload["insumos_informados"] = insumos_informados
    return await _post("/estoque/simulacao", payload)

@mcp_server_app.tool()
async def consultar_historico_estoque(limite: int = 20) -> Dict[str, Any]:
    """Consulta o histórico recente de entradas, saídas e movimentações do estoque."""
    return await _fetch("/estoque/movimentacoes", params={"limite": min(max(1, int(limite)), 50)})

@mcp_server_app.tool()
async def processar_xml_nota_fiscal(xml: str) -> Dict[str, Any]:
    """Lê o XML de uma nota fiscal eletrônica (NF-e) de compra e extrai emitente, totais e itens de insumos para conferência."""
    return await _post("/estoque/insumos/parse-xml", {"xml": xml})

@mcp_server_app.tool()
async def registrar_entrada_por_nota(
    itens: List[Dict[str, Any]],
    fornecedor: Optional[str] = None,
    numero_documento: Optional[str] = None,
    lancar_no_caixa: bool = True
) -> Dict[str, Any]:
    """Registra a entrada em lote de múltiplos insumos a partir de uma nota fiscal ou cupom de compra, com opção de registrar despesa no Livro Caixa."""
    payload = {
        "itens": itens,
        "lancar_no_caixa": bool(lancar_no_caixa)
    }
    if fornecedor:
        payload["fornecedor"] = fornecedor
    if numero_documento:
        payload["numero_documento"] = str(numero_documento)
    return await _post("/estoque/insumos/entrada-nota", payload)

if __name__ == "__main__":
    mcp_server_app.run()

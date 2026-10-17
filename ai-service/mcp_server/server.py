import os
import sys
from datetime import datetime, date
from zoneinfo import ZoneInfo
from typing import Optional, Dict, Any, List, Tuple
import httpx
from mcp.server.mcpserver import MCPServer

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from app.utils.color_engine import synthesize_theme

mcp_server_app = MCPServer("arandue-mcp-tenant")


def _obter_data_atual_br() -> date:
    """Retorna a data atual real no fuso horário de Brasília (America/Sao_Paulo)."""
    try:
        return datetime.now(ZoneInfo("America/Sao_Paulo")).date()
    except Exception:
        return datetime.now().date()


def _validar_data_nao_alucinada(
    data_str: Optional[str],
    nome_campo: str = "vencimento"
) -> Tuple[Optional[str], Optional[str]]:
    """Valida se a data informada existe, está em formato válido e não é uma data alucinada no passado (ex: 2025-03-30 do treinamento do LLM)."""
    hoje = _obter_data_atual_br()
    if not data_str or not str(data_str).strip():
        return None, (
            f"O campo '{nome_campo}' não foi informado. É EXPRESSAMENTE PROIBIDO inventar uma data "
            f"quando o usuário não especificou quando ocorrerá o {nome_campo}. "
            f"Pergunte ao usuário qual a data desejada (data atual do sistema: {hoje.isoformat()})."
        )

    texto = str(data_str).strip()
    parte_data = texto[:10]
    try:
        data_parsed = datetime.strptime(parte_data, "%Y-%m-%d").date()
    except ValueError:
        return None, (
            f"Formato inválido para '{nome_campo}': '{texto}'. Utilize o formato YYYY-MM-DD "
            f"(data atual do sistema: {hoje.isoformat()})."
        )

    if data_parsed < hoje:
        return None, (
            f"Data '{texto}' rejeitada para '{nome_campo}' pois está no passado! "
            f"A data atual real do sistema é {hoje.isoformat()} (ano {hoje.year}). "
            f"É TERMINANTEMENTE PROIBIDO usar datas do corte de treinamento do modelo (como 2024 ou 2025) ou datas inventadas. "
            f"Se o usuário não informou a data de {nome_campo} na mensagem, NÃO chame esta ferramenta: "
            f"pergunte ao usuário qual a data desejada. Se o usuário informou um prazo relativo (ex: 'hoje', 'amanhã', 'mês que vem'), "
            f"recalcule a partir de {hoje.isoformat()}."
        )

    return texto, None


def _get_env_config():
    raw_node_url = os.environ.get("NODE_API_URL") or os.environ.get("BACKEND_URL") or "http://localhost:3001/api"
    node_url = raw_node_url.rstrip("/")
    if not node_url.endswith("/api"):
        node_url = f"{node_url}/api"
    token = os.environ.get("TENANT_TOKEN", "")
    tenant_id = os.environ.get("TENANT_ID", "")
    return node_url, token, tenant_id


def _format_url(node_url: str, endpoint: str) -> str:
    clean_endpoint = "/" + endpoint.lstrip("/")
    return f"{node_url}{clean_endpoint}"


async def _fetch(endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    node_url, token, _ = _get_env_config()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    url = _format_url(node_url, endpoint)
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
    url = _format_url(node_url, endpoint)
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

async def _put(endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    node_url, token, _ = _get_env_config()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    url = _format_url(node_url, endpoint)
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.put(url, headers=headers, json=payload)
            if resp.status_code == 401 or resp.status_code == 403:
                return {"sucesso": False, "erro": "Acesso não autorizado ou sessão expirada no backend"}
            data = resp.json()
            if resp.status_code not in (200, 201):
                return {"sucesso": False, "erro": data.get("mensagem") or f"Erro do servidor (status {resp.status_code})"}
            return {"sucesso": True, "dados": data.get("dados", {})}
        except Exception as e:
            return {"sucesso": False, "erro": f"Falha de conexão com a API: {str(e)}"}

async def _patch(endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    node_url, token, _ = _get_env_config()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    url = _format_url(node_url, endpoint)
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.patch(url, headers=headers, json=payload)
            if resp.status_code == 401 or resp.status_code == 403:
                return {"sucesso": False, "erro": "Acesso não autorizado ou sessão expirada no backend"}
            data = resp.json()
            if resp.status_code not in (200, 201):
                return {"sucesso": False, "erro": data.get("mensagem") or f"Erro do servidor (status {resp.status_code})"}
            return {"sucesso": True, "dados": data.get("dados", {})}
        except Exception as e:
            return {"sucesso": False, "erro": f"Falha de conexão com a API: {str(e)}"}

async def _delete(endpoint: str) -> Dict[str, Any]:
    node_url, token, _ = _get_env_config()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    url = _format_url(node_url, endpoint)
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.delete(url, headers=headers)
            if resp.status_code == 401 or resp.status_code == 403:
                return {"sucesso": False, "erro": "Acesso não autorizado ou sessão expirada no backend"}
            if resp.status_code == 204:
                return {"sucesso": True}
            try:
                data = resp.json()
            except Exception:
                data = {}
            if resp.status_code != 200:
                return {"sucesso": False, "erro": data.get("mensagem") or f"Erro do servidor (status {resp.status_code})"}
            return data
        except Exception as e:
            return {"sucesso": False, "erro": f"Falha de conexão com a API: {str(e)}"}

@mcp_server_app.tool()
async def obter_configuracoes_mei() -> Dict[str, Any]:
    """Obtém os dados cadastrais e fiscais do MEI (razão social, nome fantasia, CNPJ, endereço completo, UF, ambiente fiscal e séries de notas)."""
    return await _fetch("/configuracoes")

@mcp_server_app.tool()
async def atualizar_configuracoes_mei(
    razao_social: str,
    cnpj: str,
    uf: str,
    municipio: str,
    cep: str,
    logradouro: str = "",
    numero: str = "S/N",
    complemento: str = "",
    bairro: str = "",
    inscricao_estadual: str = "ISENTO",
    inscricao_municipal: str = "",
    email_comercial: str = "",
    telefone_comercial: str = "",
    ambiente_fiscal: str = "HOMOLOGACAO",
    nome_fantasia: str = ""
) -> Dict[str, Any]:
    """Atualiza as configurações cadastrais e fiscais do MEI (endereço, CNPJ, UF emissora da SEFAZ, ambiente fiscal)."""
    payload = {
        "razao_social": (razao_social or "").strip(),
        "cnpj": (cnpj or "").strip(),
        "uf": (uf or "").strip().upper(),
        "municipio": (municipio or "").strip(),
        "cep": (cep or "").strip(),
        "logradouro": (logradouro or "").strip(),
        "numero": (numero or "S/N").strip(),
        "complemento": (complemento or "").strip(),
        "bairro": (bairro or "").strip(),
        "inscricao_estadual": (inscricao_estadual or "ISENTO").strip(),
        "inscricao_municipal": (inscricao_municipal or "").strip(),
        "email_comercial": (email_comercial or "").strip(),
        "telefone_comercial": (telefone_comercial or "").strip(),
        "ambiente_fiscal": (ambiente_fiscal or "HOMOLOGACAO").strip().upper(),
    }
    if nome_fantasia:
        payload["nome_fantasia"] = nome_fantasia.strip()

    res = await _put("/configuracoes", payload)
    if not res.get("sucesso"):
        return {"sucesso": False, "erro": res.get("erro", "Erro ao atualizar configurações do MEI")}
    return {
        "sucesso": True,
        "mensagem": "Configurações do MEI atualizadas com sucesso!",
        "dados": res.get("dados", {})
    }

@mcp_server_app.tool()
async def consultar_dados_cnpj(cnpj: str) -> Dict[str, Any]:
    """Consulta os dados cadastrais públicos de um CNPJ na Receita Federal / BrasilAPI (razão social, nome fantasia, endereço, etc.)."""
    cnpj_limpo = "".join(c for c in str(cnpj) if c.isdigit())
    if not cnpj_limpo:
        cnpj_limpo = str(cnpj).strip()
    return await _fetch(f"/configuracoes/cnpj/{cnpj_limpo}")

@mcp_server_app.tool()
async def obter_status_certificado_digital() -> Dict[str, Any]:
    """Consulta o status e validade do Certificado Digital ICP-Brasil A1 do MEI (CNPJ, Razão Social, data de expiração, dias restantes e se a transmissão oficial à SEFAZ está ativa)."""
    return await _fetch("/configuracoes/certificado")

@mcp_server_app.tool()
async def alternar_transmissao_sefaz(ativo: bool) -> Dict[str, Any]:
    """Ativa (True) ou desativa (False) a transmissão oficial de notas fiscais com Certificado Digital A1 aos servidores de Homologação da SEFAZ."""
    return await _patch("/configuracoes/certificado/toggle", {"ativo": ativo})


# ==========================================
# TEMAS VISUAIS DINÂMICOS
# ==========================================

@mcp_server_app.tool()
async def listar_temas() -> Dict[str, Any]:
    """Lista todos os temas visuais disponíveis na biblioteca do MEI e identifica qual está atualmente ativo."""
    dados = await _fetch("/configuracoes/temas")
    if isinstance(dados, dict) and "erro" in dados:
        return {"sucesso": False, "mensagem": dados["erro"]}
    return {
        "sucesso": True,
        "temas": dados if isinstance(dados, list) else [],
    }


@mcp_server_app.tool()
async def ativar_tema(tema_id_ou_nome: str) -> Dict[str, Any]:
    """Ativa um tema visual da biblioteca do MEI pelo nome (ex: 'Noturno Corporativo', 'Esmeralda MEI') ou ID numérico."""
    temas_resp = await _fetch("/configuracoes/temas")
    if not isinstance(temas_resp, list):
        mensagem = temas_resp.get("erro") if isinstance(temas_resp, dict) and "erro" in temas_resp else "Não foi possível carregar a lista de temas do sistema."
        return {"sucesso": False, "mensagem": mensagem}

    busca = str(tema_id_ou_nome).strip().lower()
    alvo = None
    for t in temas_resp:
        if str(t.get("id")) == busca or t.get("nome", "").lower() == busca or t.get("slug", "").lower() == busca:
            alvo = t
            break

    if not alvo:
        # Busca aproximada por inclusão
        for t in temas_resp:
            if busca in t.get("nome", "").lower() or busca in t.get("slug", "").lower():
                alvo = t
                break

    if not alvo:
        nomes_disponiveis = ", ".join([f"'{t.get('nome')}'" for t in temas_resp])
        return {
            "sucesso": False,
            "mensagem": f"Tema '{tema_id_ou_nome}' não encontrado. Temas disponíveis: {nomes_disponiveis}.",
        }

    res = await _put(f"/configuracoes/temas/{alvo['id']}/ativar", {})
    if not res.get("sucesso", True):
        return {"sucesso": False, "mensagem": res.get("mensagem") or res.get("erro", "Falha ao ativar tema no sistema.")}

    return {
        "sucesso": True,
        "mensagem": f"Tema '{alvo.get('nome')}' ({alvo.get('modo')}) ativado com sucesso em todo o sistema!",
        "tema": alvo,
    }


@mcp_server_app.tool()
async def gerar_tema_ia(descricao: str, modo: Optional[str] = "dark", cor_base_hex: Optional[str] = None) -> Dict[str, Any]:
    """Gera um tema visual harmônico e acessível com IA baseado na descrição do MEI (ex: 'tema escuro para oficina', 'tema verde para floricultura').
    Aplica regras estritas de Teoria das Cores: proporção 60-30-10, matiz oposta para acentos, contraste WCAG 2.1 (AA/AAA) e escalas de cinza com tinted neutrals.
    Salva e ativa automaticamente o tema no sistema.
    """
    sintese = synthesize_theme(description=descricao, mode=modo or "dark", base_color=cor_base_hex)
    payload = {
        "nome": sintese["nome"],
        "modo": sintese["modo"],
        "descricao": sintese["descricao"],
        "cores": sintese["cores"],
        "ativar": True,
    }

    res = await _post("/configuracoes/temas/upload", payload)
    if not res.get("sucesso", False):
        return {"sucesso": False, "mensagem": res.get("mensagem") or res.get("erro", "Erro ao persistir tema gerado pela IA.")}

    return {
        "sucesso": True,
        "mensagem": f"Tema '{sintese['nome']}' gerado e ativado com sucesso! Proporção 60-30-10 e contraste WCAG {sintese.get('contraste_texto_wcag')}:1 aprovados.",
        "cores": sintese["cores"],
        "modo": sintese["modo"],
        "contraste_wcag": sintese.get("contraste_texto_wcag"),
    }


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
async def obter_resumo_caixa(ano: Optional[int] = None, mes: Optional[int] = None) -> Dict[str, Any]:
    """Obtém faturamento, despesas e saldo apurado no livro caixa para um ano e mês específicos. Se 'ano' for omitido, assume automaticamente o ano atual."""
    hoje = _obter_data_atual_br()
    ano_consulta = int(ano) if ano is not None else hoje.year
    params: Dict[str, Any] = {"ano": ano_consulta}
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
            "id": item.get("id"),
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
    vencimento: Optional[str] = None,
    observacoes: Optional[str] = "",
    orcamento_id: Optional[int] = None,
    agendamento_id: Optional[int] = None
) -> Dict[str, Any]:
    """Cadastra uma nova cobrança/recebimento para um cliente (formato de vencimento: YYYY-MM-DD), podendo vincular a um atendimento (agendamento_id) ou orçamento (orcamento_id). ATENÇÃO: NUNCA invente a data de vencimento e NUNCA utilize datas do treinamento do modelo (ex: 2025). Se o usuário não informou quando a cobrança vence, NÃO chame esta ferramenta e pergunte o vencimento ao usuário."""
    vencimento_valido, erro_data = _validar_data_nao_alucinada(vencimento, "vencimento")
    if erro_data:
        return {"sucesso": False, "erro": erro_data}

    payload = {
        "cliente_id": cliente_id,
        "valor": float(valor),
        "vencimento": vencimento_valido,
        "observacoes": observacoes or ""
    }
    if orcamento_id is not None:
        payload["orcamento_id"] = int(orcamento_id)
    if agendamento_id is not None:
        payload["agendamento_id"] = int(agendamento_id)

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
async def cadastrar_orcamento(
    cliente_id: int,
    itens: List[Dict[str, Any]],
    desconto: float = 0.0,
    data_emissao: Optional[str] = None,
    validade: Optional[str] = None,
    status: str = "RASCUNHO",
    observacoes: Optional[str] = ""
) -> Dict[str, Any]:
    """Cadastra uma proposta comercial / Ordem de Serviço (Orçamento) para um cliente. Itens é lista de objetos contendo: servico_id, quantidade, preco_unitario."""
    payload = {
        "cliente_id": int(cliente_id),
        "itens": itens if isinstance(itens, list) else [],
        "desconto": float(desconto or 0.0),
        "status": (status or "RASCUNHO").strip().upper(),
        "observacoes": (observacoes or "").strip()
    }
    if data_emissao:
        payload["data_emissao"] = data_emissao.strip()
    if validade:
        payload["validade"] = validade.strip()

    res = await _post("/orcamentos", payload)
    if not res.get("sucesso"):
        return {"erro": res.get("erro", "Erro ao cadastrar orçamento/OS")}
    orcamento = res.get("dados", {})
    return {
        "mensagem": f"Orçamento/OS #{orcamento.get('id')} cadastrado com sucesso!",
        "orcamento_id": orcamento.get("id"),
        "cliente_id": orcamento.get("cliente_id"),
        "status": orcamento.get("status"),
        "total": float(orcamento.get("total", 0.0)),
        "subtotal": float(orcamento.get("subtotal", 0.0)),
        "desconto": float(orcamento.get("desconto", 0.0))
    }

@mcp_server_app.tool()
async def listar_orcamentos(
    status: Optional[str] = None,
    cliente_id: Optional[int] = None,
    limite: int = 20
) -> Dict[str, Any]:
    """Lista propostas comerciais e Ordens de Serviço (Orçamentos) com filtros por status (RASCUNHO, ENVIADO, APROVADO, RECUSADO, CANCELADO) ou cliente."""
    limite = min(max(1, limite), 50)
    params = {}
    if status:
        params["status"] = status.strip().upper()
    if cliente_id:
        params["cliente_id"] = cliente_id

    dados = await _fetch("/orcamentos", params=params)
    if isinstance(dados, dict) and "erro" in dados:
        return dados

    lista = dados if isinstance(dados, list) else []
    orcamentos_resumidos = []
    for o in lista[:limite]:
        orcamentos_resumidos.append({
            "id": o.get("id"),
            "cliente_id": o.get("cliente_id"),
            "cliente_nome": o.get("cliente_nome"),
            "status": o.get("status"),
            "total": float(o.get("total", 0.0)),
            "data_emissao": str(o.get("data_emissao", "")),
            "itens_count": len(o.get("itens", [])) if isinstance(o.get("itens"), list) else 0
        })

    return {
        "total": len(lista),
        "orcamentos": orcamentos_resumidos
    }

@mcp_server_app.tool()
async def atualizar_status_orcamento(
    orcamento_id: int,
    status: str
) -> Dict[str, Any]:
    """Atualiza o status de uma proposta/OS (Orçamento). Use 'APROVADO' para fechar negócio e liberar agendamento, baixa de insumos e cobrança."""
    status_limpo = status.strip().upper()
    payload = {"status": status_limpo}
    res = await _patch(f"/orcamentos/{orcamento_id}/status", payload)
    if not res.get("sucesso"):
        return {"erro": res.get("erro", "Erro ao atualizar status do orçamento")}
    return {
        "mensagem": f"Status do orçamento #{orcamento_id} alterado para '{status_limpo}' com sucesso!",
        "orcamento_id": orcamento_id,
        "status": status_limpo
    }

@mcp_server_app.tool()
async def cadastrar_agendamento(
    cliente_id: int,
    servico_id: int,
    data_hora: str,
    orcamento_id: Optional[int] = None,
    observacoes: Optional[str] = ""
) -> Dict[str, Any]:
    """Agenda um atendimento com um cliente para um serviço cadastrado vinculado a um orçamento aprovado (data_hora no formato YYYY-MM-DD HH:MM). ATENÇÃO: NUNCA invente a data/hora do agendamento e NUNCA utilize datas de 2025."""
    data_hora_valida, erro_data = _validar_data_nao_alucinada(data_hora, "data_hora")
    if erro_data:
        return {"sucesso": False, "erro": erro_data}

    payload = {
        "cliente_id": cliente_id,
        "servico_id": servico_id,
        "data_hora": data_hora_valida,
        "observacoes": observacoes or ""
    }
    if orcamento_id is not None:
        payload["orcamento_id"] = int(orcamento_id)

    res = await _post("/agendamentos", payload)
    if not res.get("sucesso"):
        return {"erro": res.get("erro", "Erro ao criar agendamento")}
    agendamento = res.get("dados", {})
    return {
        "mensagem": "Agendamento registrado com sucesso!",
        "agendamento_id": agendamento.get("id"),
        "orcamento_id": agendamento.get("orcamento_id"),
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
    gerar_caixa: bool = True,
    cliente_id: Optional[int] = None,
    orcamento_id: Optional[int] = None
) -> Dict[str, Any]:
    """Emite uma Nota Fiscal de Serviços Eletrônica (NFS-e Padrão Nacional). ATENÇÃO: destinatario_documento deve ser um CPF ou CNPJ REAL informado pelo usuário. É EXPRESSAMENTE PROIBIDO inventar '00000000000' ou dados fictícios. Se o usuário não informou o documento, NÃO chame esta ferramenta e pergunte o CPF/CNPJ antes."""
    dest_doc_limpo = "".join(c for c in str(destinatario_documento or "") if c.isdigit())
    if not dest_doc_limpo or len(set(dest_doc_limpo)) == 1 or len(dest_doc_limpo) not in (11, 14):
        return {
            "sucesso": False,
            "erro": "Documento (CPF/CNPJ) do tomador inválido, zerado ou não informado. É terminantemente proibido utilizar documentos fictícios como '00000000000'. Solicite o CPF ou CNPJ real do cliente ao usuário antes de emitir a nota fiscal."
        }

    if cliente_id is not None and orcamento_id is not None:
        orc = await _fetch(f"/orcamentos/{int(orcamento_id)}")
        if isinstance(orc, dict) and orc.get("sucesso"):
            orc_dados = orc.get("dados") or {}
            if orc_dados.get("cliente_id") and int(orc_dados.get("cliente_id")) != int(cliente_id):
                return {
                    "sucesso": False,
                    "erro": f"O orçamento #{orcamento_id} pertence a outro cliente e não ao cliente #{cliente_id} informado."
                }

    payload = {
        "destinatario_nome": destinatario_nome.strip(),
        "destinatario_documento": dest_doc_limpo,
        "discriminacao_servico": discriminacao_servico.strip(),
        "valor": float(valor),
        "codigo_tributacao_nacional": (codigo_tributacao_nacional or "01.07.01").strip(),
        "destinatario_email": (destinatario_email or "").strip(),
        "gerar_caixa": bool(gerar_caixa)
    }
    if cliente_id is not None:
        payload["cliente_id"] = int(cliente_id)
    if orcamento_id is not None:
        payload["orcamento_id"] = int(orcamento_id)

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
    gerar_caixa: bool = True,
    cliente_id: Optional[int] = None,
    orcamento_id: Optional[int] = None
) -> Dict[str, Any]:
    """Emite uma Nota Fiscal Eletrônica de Produtos (NF-e Modelo 55) com detalhamento de itens. ATENÇÃO: destinatario_documento deve ser um CPF ou CNPJ REAL informado pelo usuário. É EXPRESSAMENTE PROIBIDO inventar '00000000000' ou dados fictícios. Se o usuário não informou o documento, NÃO chame esta ferramenta e pergunte o CPF/CNPJ antes."""
    dest_doc_limpo = "".join(c for c in str(destinatario_documento or "") if c.isdigit())
    if not dest_doc_limpo or len(set(dest_doc_limpo)) == 1 or len(dest_doc_limpo) not in (11, 14):
        return {
            "sucesso": False,
            "erro": "Documento (CPF/CNPJ) do destinatário inválido, zerado ou não informado. É terminantemente proibido utilizar documentos fictícios como '00000000000'. Solicite o CPF ou CNPJ real do cliente ao usuário antes de emitir a nota fiscal."
        }

    if cliente_id is not None and orcamento_id is not None:
        orc = await _fetch(f"/orcamentos/{int(orcamento_id)}")
        if isinstance(orc, dict) and orc.get("sucesso"):
            orc_dados = orc.get("dados") or {}
            if orc_dados.get("cliente_id") and int(orc_dados.get("cliente_id")) != int(cliente_id):
                return {
                    "sucesso": False,
                    "erro": f"O orçamento #{orcamento_id} pertence a outro cliente e não ao cliente #{cliente_id} informado."
                }

    payload = {
        "destinatario_nome": destinatario_nome.strip(),
        "destinatario_documento": dest_doc_limpo,
        "itens": itens if isinstance(itens, list) else [],
        "natureza_operacao": (natureza_operacao or "Venda de mercadorias").strip(),
        "gerar_caixa": bool(gerar_caixa)
    }
    if cliente_id is not None:
        payload["cliente_id"] = int(cliente_id)
    if orcamento_id is not None:
        payload["orcamento_id"] = int(orcamento_id)

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

@mcp_server_app.tool()
async def listar_dashboards() -> Any:
    """Lista todos os dashboards configurados para o MEI com seus respectivos widgets e status."""
    return await _fetch("/dashboards")

@mcp_server_app.tool()
async def obter_dashboard_detalhado(dashboard_id: int) -> Dict[str, Any]:
    """Obtém os detalhes de um dashboard específico, incluindo os dados calculados de suas métricas e gráficos."""
    return await _fetch(f"/dashboards/{int(dashboard_id)}")

@mcp_server_app.tool()
async def obter_catalogo_metricas() -> Dict[str, Any]:
    """Retorna o catálogo completo de métricas disponíveis para montagem de gráficos nos dashboards, incluindo tipos de gráficos e períodos suportados."""
    return await _fetch("/dashboards/metricas/catalogo")

@mcp_server_app.tool()
async def criar_dashboard(nome: str, descricao: Optional[str] = None) -> Dict[str, Any]:
    """Cria um novo painel de dashboard personalizado para o MEI."""
    payload: Dict[str, Any] = {"nome": str(nome).strip()}
    if descricao is not None:
        payload["descricao"] = str(descricao).strip()
    return await _post("/dashboards", payload)

@mcp_server_app.tool()
async def adicionar_widget_dashboard(
    dashboard_id: int,
    titulo: str,
    tipo_grafico: str,
    metrica: str,
    periodo: str = "ultimos_6_meses",
    largura: int = 1
) -> Dict[str, Any]:
    """Adiciona um widget gráfico a um painel de dashboard existente.
    
    Parâmetros:
    - metrica: 'projecao_financeira' (previsão de entradas futuras por cobranças a vencer e serviços agendados), 'fluxo_caixa', 'limite_mei', 'despesas_categoria', 'top_servicos', 'cobrancas_status', 'funil_orcamentos', 'novos_clientes'.
    - periodo: aceita períodos paramétricos futuros ou passados como 'proximos_30_dias', 'proximos_3_meses', 'proximos_6_meses', 'proximos_1_ano', 'ultimos_12_meses', além dos legados 'mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'ano_atual', 'historico_total'.
    - tipo_grafico: 'bar', 'line', 'area', 'donut', 'pie', 'radial_gauge', 'kpi'.
    - largura: 1 (metade da grade) ou 2 (largura total).
    """
    payload = {
        "titulo": str(titulo).strip(),
        "tipo_grafico": str(tipo_grafico).strip(),
        "metrica": str(metrica).strip(),
        "periodo": str(periodo).strip(),
        "largura": int(largura)
    }
    return await _post(f"/dashboards/{int(dashboard_id)}/widgets", payload)

@mcp_server_app.tool()
async def excluir_widget_dashboard(dashboard_id: int, widget_id: int) -> Dict[str, Any]:
    """Remove um widget gráfico de um painel de dashboard."""
    return await _delete(f"/dashboards/{int(dashboard_id)}/widgets/{int(widget_id)}")

@mcp_server_app.tool()
async def excluir_dashboard(dashboard_id: int) -> Dict[str, Any]:
    """Exclui um painel de dashboard e todos os seus widgets associados."""
    return await _delete(f"/dashboards/{int(dashboard_id)}")

# ==========================================
# MÓDULO: INTEGRAÇÃO WHATSAPP (PARIDADE MCP)
# ==========================================

@mcp_server_app.tool()
async def consultar_status_whatsapp() -> Dict[str, Any]:
    """Consulta o status da conexão do Gateway WhatsApp Web e verifica o número de WhatsApp vinculado à conta do MEI."""
    return await _fetch("/assistente/whatsapp/status")

@mcp_server_app.tool()
async def vincular_whatsapp(telefone: str) -> Dict[str, Any]:
    """Vincula ou atualiza o número de telefone celular/WhatsApp do MEI para atendimento pelo assistente via WhatsApp."""
    payload = {"telefone": str(telefone).strip()}
    return await _post("/assistente/whatsapp/vincular", payload)


# ==========================================
# MÓDULO: MULTIMODAL (ÁUDIO E IMAGEM)
# ==========================================

@mcp_server_app.tool()
async def transcrever_audio(audio_base64: str, mime_type: Optional[str] = "audio/ogg") -> Dict[str, Any]:
    """Transcreve um áudio gravado em base64 (voz do MEI ou cliente) com alta fidelidade em português brasileiro."""
    payload = {
        "audio_base64": str(audio_base64).strip(),
        "mime_type": str(mime_type or "audio/ogg").strip()
    }
    return await _post("/assistente/audio/transcrever", payload)


@mcp_server_app.tool()
async def analisar_imagem_documento(
    imagem_base64: str,
    mime_type: Optional[str] = "image/jpeg",
    instrucao: Optional[str] = None
) -> Dict[str, Any]:
    """Analisa visualmente uma imagem (recibo, comprovante Pix, nota fiscal, produto, estoque ou cartão) extraindo dados e sugerindo ações operacionais."""
    payload: Dict[str, Any] = {
        "imagem_base64": str(imagem_base64).strip(),
        "mime_type": str(mime_type or "image/jpeg").strip()
    }
    if instrucao:
        payload["instrucao"] = str(instrucao).strip()
    return await _post("/assistente/imagem/analisar", payload)


if __name__ == "__main__":
    mcp_server_app.run()

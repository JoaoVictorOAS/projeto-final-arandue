# MEI — Gestão Simplificada para Microempreendedores Individuais

> **Projeto Final • Formação Recode Pro AI**  
> Plataforma integrada de gestão operacional e financeira para Microempreendedores Individuais (MEI), potencializada por um **Assistente Virtual de Inteligência Artificial** com RAG semântico e Model Context Protocol (MCP) multi-tenant.

---

## 📌 Sumário
- [1. Visão Geral da Solução](#1-visão-geral-da-solução)
- [2. Topologia de Infraestrutura](#2-topologia-de-infraestrutura)
- [3. Arquitetura do Microserviço de IA](#3-arquitetura-do-microserviço-de-ia)
  - [3.1 Orquestração LLM & Gemini](#31-orquestração-llm--gemini)
  - [3.2 Recuperação Semântica RAG com Score Mínimo](#32-recuperação-semântica-rag-com-score-mínimo)
  - [3.3 Armazenamento Vetorial Híbrido & Resiliência](#33-armazenamento-vetorial-híbrido--resiliência)
  - [3.4 MCP Multi-Tenant (Leitura e Ações Operacionais)](#34-mcp-multi-tenant-leitura-e-ações-operacionais)
- [4. Segurança e Isolamento Multi-Tenancy](#4-segurança-e-isolamento-multi-tenancy)
- [5. Serviços, Portas e Variáveis de Ambiente](#5-serviços-portas-e-variáveis-de-ambiente)
- [6. Guia de Execução e Deploy Local](#6-guia-de-execução-e-deploy-local)
- [7. Suíte de Testes Automatizados](#7-suíte-de-testes-automatizados)
- [8. API RESTful — Endpoints Principais](#8-api-restful--endpoints-principais)
- [9. Modelo de Dados Relacional](#9-modelo-de-dados-relacional)

---

## 1. Visão Geral da Solução

O **MEI** unifica o fluxo comercial, financeiro e operacional do microempreendedor em uma única plataforma web:

$$\text{Cliente} \longrightarrow \text{Orçamento} \longrightarrow \text{Agendamento} \longrightarrow \text{Cobrança} \longrightarrow \text{Pagamento} \longrightarrow \text{Caixa}$$

Além dos módulos operacionais tradicionais, o sistema incorpora um **Assistente Virtual Inteligente** capaz de:
1. Tirar dúvidas fiscais e tributárias com base estrita na legislação oficial do MEI (citando páginas de referência oficiais);
2. Consultar o saldo, faturamento e cobranças do estabelecimento do próprio usuário em tempo real;
3. **Executar ações e cadastros operacionais via linguagem natural** (ex.: cadastrar clientes, registrar serviços, gerar cobranças e agendar compromissos).

---

## 2. Topologia de Infraestrutura

A infraestrutura do sistema é distribuída em três camadas de execução desacopladas:

```mermaid
flowchart TD
    subgraph Client["Cliente / Navegador"]
        Browser["Interface Web (SPA React)"]
    end

    subgraph FrontendServer["Frontend • Porta 3000"]
        Vite["Vite Dev Server / Nginx Estático"]
    end

    subgraph BackendGateway["Backend Gateway • Porta 3001"]
        Express["API Node.js / Express"]
        AuthMid["JWT Auth & Scoped Token Issuer"]
        DBPool["MySQL Pool (mysql2)"]
    end

    subgraph AIService["AI Microservice • Porta 8001"]
        FastAPI["FastAPI / Uvicorn Server"]
        Orchestrator["LLM Orchestrator (Gemini)"]
        Retriever["FallbackRetriever + Circuit Breaker"]
        McpPool["TenantMcpPool (Process Manager)"]
    end

    subgraph MCPServer["MCP Subprocesses (Sob Demanda)"]
        TenantMCP["MCP Server Instance (Python)"]
    end

    subgraph Storage["Armazenamento & Vetores"]
        MySQL[("MySQL 8.x • Porta 3306\nmei_db")]
        Chroma[("ChromaDB (Local)\ndata/chroma_db")]
        Firestore[("Firestore Vector Search\n(Cloud/Prod)")]
    end

    Browser <-->|HTTP / WebSocket| Vite
    Vite <-->|Proxy /api| Express
    Express <-->|SQL Parametrizado| MySQL
    Express <-->|HTTP POST /chat\n(X-Internal-Secret)| FastAPI

    FastAPI <-->|RAG Query| Retriever
    Retriever <-->|Primary / Dev| Chroma
    Retriever <-->|Fallback / Prod| Firestore

    FastAPI <-->|Adquire Sessão| McpPool
    McpPool -.->|Spawns stdio| TenantMCP
    TenantMCP <-->|REST API\n(Scoped JWT: assistente:access)| Express
    Orchestrator <-->|Function Calling| TenantMCP
```

---

## 3. Arquitetura do Microserviço de IA

O microserviço de inteligência artificial (`ai-service/`) roda em **Python 3.12+ com FastAPI e Uvicorn**, gerenciando a integração entre modelos de linguagem (LLM), banco vetorial e execução de ferramentas corporativas.

### 3.1 Orquestração LLM & Gemini
- **Modelo:** Google Gemini (`gemini-3.5-flash-lite`), configurável via variável de ambiente `GEMINI_MODEL`.
- **Estratégia de Execução:** Loop iterativo de *Tool Use / Function Calling* com limite máximo de 5 iterações (`LLM_MAX_TOOL_CALLS`) e timeout de 30 segundos (`LLM_TIMEOUT_S`).
- **Prompt com Governança:** O system prompt instrui o modelo a consultar ferramentas operacionais para dados do usuário, usar estritamente o contexto documental para dúvidas de lei e ignorar instruções arbitrárias contidas em dados externos.

### 3.2 Recuperação Semântica RAG com Score Mínimo
- **Corpus Oficial:** Perguntas e Respostas oficiais do Portal do Empreendedor e Simples Nacional (`docs/perguntaomei.pdf`), segmentadas em chunks com overlap e metadados de página.
- **Modelo de Embedding:** `intfloat/multilingual-e5-small` (384 dimensões), com normalização L2 e prefixos obrigatórios `query: ` e `passage: `.
- **Threshold de Score Mínimo (`RAG_MIN_SCORE = 0.865` / `RAG_MAX_DISTANCE = 0.135`):**
  - **Consultas Normativas/Fiscais:** Atingem similaridade por cosseno entre `0.875` e `0.920` (Recall@3 de 90% no Golden Set oficial), sendo injetadas no bloco `<documento>` com suas páginas de origem e expostas no frontend com badges como `pág. 4 (90%)`.
  - **Comandos Operacionais & Diálogo:** Solicitações como *"cadastra um cliente pra mim..."* ou *"olá, bom dia"* obtêm pontuação inferior a `0.860`. O filtro semântico descarta automaticamente os trechos, impedindo a injeção de contexto legal irrelevante no prompt.

### 3.3 Armazenamento Vetorial Híbrido & Resiliência
O sistema adota o padrão **Fallback com Circuit Breaker** (`FallbackRetriever`):
- **Primário:** Google Cloud Firestore Vector Search (em produção) ou ChromaDB local persistente (em desenvolvimento em `data/chroma_db`).
- **Fallback:** ChromaDB local como contingência transparente caso o serviço de nuvem fique inacessível ou exceda `1.5s` de timeout.
- **Circuit Breaker:** Abre após 3 falhas consecutivas, direcionando imediatamente as requisições ao store secundário por 60 segundos antes de tentar reestabelecer o primário.

### 3.4 MCP Multi-Tenant (Leitura e Ações Operacionais)
A ponte de integração entre o assistente e as regras do sistema utiliza o **Model Context Protocol (MCP)**:
- **Isolamento de Processos:** Para cada tenant ativo, o `TenantMcpPool` gerencia instâncias dedicadas do processo MCP Server via `stdio`, reutilizando-as em pool com TTL de inatividade de 600 segundos (`MCP_IDLE_TTL_S`).
- **Ferramentas de Leitura:**
  - `obter_resumo_caixa`: saldo atual, total de entradas e saídas.
  - `consultar_faturamento_atual`: receita acumulada no mês e no ano vigente.
  - `listar_cobrancas_pendentes`: relação de valores a receber com vencimentos.
  - `listar_clientes`: busca de clientes cadastrados por nome.
  - `listar_servicos`: catálogo de serviços cadastrados com preços.
  - `consultar_agendamentos`: compromissos marcados por período.
- **Ferramentas de Mutação Operacional:**
  - `cadastrar_cliente`: cria um novo cliente no banco (nome, telefone, email).
  - `cadastrar_servico`: adiciona um novo serviço com descrição e preço.
  - `cadastrar_cobranca`: emite uma cobrança vinculada a um cliente com data e valor.
  - `cadastrar_agendamento`: agenda um atendimento para um cliente e serviço.

---

## 4. Segurança e Isolamento Multi-Tenancy

1. **Tokens Scoped Efêmeros (`assistente:access`):** O backend Node.js emite um JWT temporário contendo apenas `usuario_id` e o escopo restrito do assistente para cada requisição de chat.
2. **Prevenção de Cross-Tenant Leak:** As definições de ferramentas MCP **não expõem o campo `tenant_id` nos esquemas de parâmetros**. O identificador da empresa é injetado diretamente pelo servidor local de MCP a partir do token da sessão, impedindo ataques de prompt injection para consultar dados de terceiros.
3. **Autenticação Inter-Serviços:** A comunicação entre o Backend Express e o AI Service exige o cabeçalho `X-Internal-Secret` com validação em tempo constante.
4. **Armazenamento Seguro de Credenciais:** Senhas com salt e hash via `bcrypt` e proteção relacional no MySQL através de Foreign Keys vinculadas ao `usuario_id`.

---

## 5. Serviços, Portas e Variáveis de Ambiente

| Serviço | Tecnologia | Porta | Responsabilidade |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 18 + Vite | `3000` | SPA do usuário, interface do assistente |
| **Backend Gateway** | Node.js + Express | `3001` | API REST, regras de negócio e auth |
| **AI Service** | FastAPI + Uvicorn | `8001` | Orquestração LLM, RAG e pool MCP |
| **Banco de Dados** | MySQL 8.x | `3306` | Banco relacional multi-tenant (`mei_db`) |
| **Vector Store** | ChromaDB / Firestore | Local / Cloud | Base vetorial da legislação do MEI |

### Variáveis de Ambiente Essenciais

#### Backend (`backend/.env`):
```env
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=mei_db
DB_PORT=3306
JWT_SECRET=sua_chave_jwt_super_secreta
AI_SERVICE_URL=http://localhost:8001
INTERNAL_SERVICE_SECRET=super_secreto_interno_arandue_2026
```

#### Microserviço de IA (`ai-service/.env`):
```env
GEMINI_API_KEY=sua_chave_api_do_google_gemini
GEMINI_MODEL=gemini-3.5-flash-lite
EMBEDDING_MODEL=intfloat/multilingual-e5-small

# Vector Store (dev: chroma | prod: firestore)
VECTOR_PRIMARY=chroma
VECTOR_FALLBACK=none
CHROMA_PATH=../data/chroma_db
CHROMA_COLLECTION=regras_mei_e5

# Limiares RAG
RAG_TOP_K=4
RAG_MAX_DISTANCE=0.135
RAG_MIN_SCORE=0.865

# Segurança e Gateway
INTERNAL_SERVICE_SECRET=super_secreto_interno_arandue_2026
NODE_API_URL=http://localhost:3001/api
PORT=8001
```

---

## 6. Guia de Execução e Deploy Local

### Pré-requisitos
- **Node.js:** v18.x ou superior e **npm**
- **Python:** v3.10 ou superior com ambiente virtual (`.venv`)
- **MySQL:** v8.0 em execução na porta 3306 com o banco `mei_db` criado

### 1. Instalação de Dependências
```bash
# Na raiz do repositório:
npm install
npm --prefix backend install
npm --prefix frontend install

# Ambiente virtual Python:
python3 -m venv .venv
.venv/bin/pip install -r ai-service/requirements.txt
```

### 2. Banco de Dados e Carga Inicial
```bash
# Executa migrações estruturais e seed de demonstração
npm run db:seed
```

### 3. Inicialização dos Serviços
Você pode iniciar **todos os 3 serviços em paralelo** com um único comando:
```bash
npm run dev
```
*(O script `scripts/dev.sh` inicia o backend na porta 3001, o AI service na porta 8001 e o frontend na porta 3000 com encerramento gracioso via `Ctrl+C`).*

Alternativamente, execute em terminais separados:
```bash
# Terminal 1 - Backend Node.js
npm run dev:backend

# Terminal 2 - AI Service Python
npm run dev:ai

# Terminal 3 - Frontend React
npm run dev:frontend
```

---

## 7. Suíte de Testes Automatizados

O projeto conta com mais de **240 testes automatizados** distribuídos entre as três camadas:

```bash
# Executar todas as suítes de teste (Backend + Frontend + IA):
npm test
```

### Execução Individual:
- **Backend (Jest):** `npm run test:backend` — 180 testes cobrindo autenticação, isolamento multi-tenant, CRUDs, integridade de chaves estrangeiras e integridade de saldo no caixa.
- **Frontend (Vitest):** `npm run test:frontend` — 37 testes cobrindo navegação, modais, formulários, chat do assistente e badges de fontes consultadas.
- **AI Service (Pytest):** `npm run test:ai` — 23 testes validando endpoints da API, filtragem por score do RAG, Golden Set com Recall@3 $\ge 0.80$, circuit breaker e subprocessos de MCP.

---

## 8. API RESTful — Endpoints Principais

Todas as rotas de negócio exigem autenticação via cabeçalho `Authorization: Bearer <token_jwt>`.

| Módulo | Método | Rota | Descrição |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Cadastro de novo MEI |
| **Auth** | `POST` | `/api/auth/login` | Login e emissão de token JWT |
| **Clientes** | `GET`, `POST` | `/api/clientes` | Listagem e cadastro de clientes |
| **Clientes** | `PUT`, `DELETE` | `/api/clientes/:id` | Atualização e inativação de cliente |
| **Serviços** | `GET`, `POST` | `/api/servicos` | Listagem e inclusão de itens do catálogo |
| **Agenda** | `GET`, `POST` | `/api/agendamentos` | Listagem e agendamento com validação de horário |
| **Orçamentos**| `GET`, `POST` | `/api/orcamentos` | Criação e gestão de propostas comerciais |
| **Cobranças** | `GET`, `POST` | `/api/cobrancas` | Emissão e acompanhamento de cobranças |
| **Cobranças** | `POST` | `/api/cobrancas/:id/baixar` | Baixa de pagamento com reflexo no livro caixa |
| **Caixa** | `GET`, `POST` | `/api/movimentacoes` | Lançamentos manuais e extrato do livro caixa |
| **Dashboard** | `GET` | `/api/dashboard` | Métricas de faturamento, saldo e pendências |
| **Assistente**| `GET`, `POST` | `/api/assistente/conversas`| Gestão de threads de conversa do assistente |
| **Assistente**| `POST` | `/api/assistente/mensagens` | Envio de mensagem com orquestração RAG e MCP |

---

## 9. Modelo de Dados Relacional

O banco de dados relacional utiliza o MySQL 8.x com chaves estrangeiras (`ON DELETE CASCADE / RESTRICT`) garantindo integridade estrita e isolamento de tenants:

```
[usuarios] (id, nome, email, senha, criado_em)
    │
    ├──< [clientes] (id, usuario_id, nome, telefone, email, ativo)
    │       │
    │       ├──< [agendamentos] (id, usuario_id, cliente_id, servico_id, data_hora, status)
    │       ├──< [orcamentos] (id, usuario_id, cliente_id, total, status, validade)
    │       │       └──< [orcamento_itens] (id, orcamento_id, servico_id, quantidade, subtotal)
    │       └──< [cobrancas] (id, usuario_id, cliente_id, orcamento_id, valor, vencimento, status)
    │               └─── [movimentacoes] (id, usuario_id, cobranca_id, tipo, categoria, valor)
    │
    ├──< [servicos] (id, usuario_id, nome, descricao, preco, ativo)
    │
    └──< [conversas] (id, usuario_id, titulo, criado_em, atualizado_em)
            └──< [mensagens] (id, conversa_id, papel, conteudo, fontes, tools_usadas, rag_backend)
```

---

<p align="center">
  <b>Aranduê • MEI</b> — Desenvolvido com foco em usabilidade, segurança corporativa e inteligência aplicada ao pequeno empreendedor.
</p>

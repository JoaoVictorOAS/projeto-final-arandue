# Graph Report - projeto-final-arandue  (2026-10-07)

## Corpus Check
- 131 files · ~117,399 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 6, .example 3, .sqlite3 1)

## Summary
- 722 nodes · 1299 edges · 45 communities (42 shown, 3 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 84 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ebc8859e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Entidade MySQL: clientes
- Embedder
- authService.js
- backend/package.json
- devDependencies
- Visão Geral do Projeto MEI
- financeiroService.js
- scripts
- agendamentoService.js
- Google Skill Finder
- supertest
- app.js
- App.jsx
- authMiddleware.js
- main.py
- clienteRoutes.js
- express
- dashboardController.js
- servicoRoutes.js
- agendamentoRoutes.js
- Trecho
- test_mcp_server.py
- orcamentoRoutes.js
- Especificação de Design — Assistente IA do MEI (RAG + MCP por Estabelecimento)
- Especificação de Design — Integração do Fluxo Ponta a Ponta: Orçamento ➔ Agendamento ➔ Cobrança ➔ Livro Caixa
- Global Constraints
- TenantMcpPool
- assistenteService.js
- backend/tests/e2e-assistente-multitenant.test.js
- cobrancaService.js
- orcamentoService.js
- pipeline-financeiro.test.js
- database.js
- clienteRepository.js
- servicoRepository.js
- agendamentos.test.js
- dependencies
- scripts
- clientes.test.js
- dashboard.test.js
- orcamentos.test.js
- servicos.test.js

## God Nodes (most connected - your core abstractions)
1. `react` - 30 edges
2. `Trecho` - 28 edges
3. `FallbackRetriever` - 26 edges
4. `TenantMcpPool` - 22 edges
5. `react-router-dom` - 17 edges
6. `api` - 17 edges
7. `Embedder` - 16 edges
8. `App()` - 15 edges
9. `lucide-react` - 14 edges
10. `scripts` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Task 4: Orquestrador Gemini e Endpoint `/chat` no `ai-service`` --references--> `TenantMcpPool`  [INFERRED]
  docs/superpowers/plans/2026-10-07-assistente-ia-rag-mcp.md → ai-service/app/mcp_pool/pool.py
- `6.3 `FallbackRetriever`` --references--> `FallbackRetriever`  [INFERRED]
  docs/superpowers/specs/2026-10-07-assistente-ia-rag-mcp-design.md → ai-service/app/rag/retriever.py
- `Plano de Implementação — Assistente IA do MEI (RAG + MCP por Estabelecimento)` --references--> `TenantMcpPool`  [INFERRED]
  docs/superpowers/plans/2026-10-07-assistente-ia-rag-mcp.md → ai-service/app/mcp_pool/pool.py
- `Task 3: Servidor MCP Multi-tenant e `TenantMcpPool`` --references--> `TenantMcpPool`  [INFERRED]
  docs/superpowers/plans/2026-10-07-assistente-ia-rag-mcp.md → ai-service/app/mcp_pool/pool.py
- `11. Fases de Implementação` --references--> `TenantMcpPool`  [INFERRED]
  docs/superpowers/specs/2026-10-07-assistente-ia-rag-mcp-design.md → ai-service/app/mcp_pool/pool.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Suíte RAG ChromaDB para Regras do MEI** — scripts_rag_index_mei, scripts_rag_query_mei, docs_perguntaomei_regras_gerais [EXTRACTED 1.00]
- **Fluxo Operacional Integrado do MEI** — docs_modelo_dados_clientes, docs_modelo_dados_orcamentos, docs_modelo_dados_agendamentos, docs_modelo_dados_cobrancas, docs_modelo_dados_movimentacoes [INFERRED 0.95]

## Communities (45 total, 3 thin omitted)

### Community 0 - "Entidade MySQL: clientes"
Cohesion: 0.09
Nodes (22): Endpoint REST: /api/agendamentos, Endpoint REST: /api/auth, Endpoint REST: /api/clientes, Endpoint REST: /api/cobrancas, Endpoint REST: /api/dashboard, Endpoint REST: /api/movimentacoes, Endpoint REST: /api/orcamentos, Endpoint REST: /api/servicos (+14 more)

### Community 1 - "Embedder"
Cohesion: 0.07
Nodes (17): Embedder, ChromaStore, extract_chunks(), index_chroma(), main(), test_chroma_store_real_search(), test_embedder_dimensions_and_normalization(), test_embedder_prefixes() (+9 more)

### Community 2 - "authService.js"
Cohesion: 0.18
Nodes (8): authController, authService, pool, usuarioRepository, authService, bcrypt, jwt, usuarioRepository

### Community 3 - "backend/package.json"
Cohesion: 0.05
Nodes (31): dependencies, bcryptjs, cors, dotenv, express, jsonwebtoken, mysql2, description (+23 more)

### Community 4 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, autoprefixer, jsdom, postcss, tailwindcss, @testing-library/jest-dom, @testing-library/react, vite (+2 more)

### Community 5 - "Visão Geral do Projeto MEI"
Cohesion: 0.33
Nodes (6): Fase 6: Validação E2E da Jornada, Arquitetura React + Node.js + MySQL, Jornada Integrada do MEI, ODS 1 Erradicação da Pobreza, ODS 8 Trabalho Decente e Crescimento Econômico, Visão Geral do Projeto MEI

### Community 6 - "financeiroService.js"
Cohesion: 0.15
Nodes (10): financeiroService, movimentacaoController, clienteRepository, cobrancaRepository, financeiroService, movimentacaoRepository, orcamentoRepository, pool (+2 more)

### Community 7 - "scripts"
Cohesion: 0.09
Nodes (21): author, description, keywords, license, name, private, scripts, build:frontend (+13 more)

### Community 8 - "agendamentoService.js"
Cohesion: 0.17
Nodes (9): agendamentoRepository, pool, agendamentoRepository, agendamentoService, clienteRepository, orcamentoRepository, pool, servicoRepository (+1 more)

### Community 9 - "Google Skill Finder"
Cohesion: 0.40
Nodes (4): Google Skill Finder, Rules, When the fetch fails, Workflow

### Community 12 - "supertest"
Cohesion: 0.12
Nodes (12): app, pool, request, app, pool, request, app, pool (+4 more)

### Community 13 - "app.js"
Cohesion: 0.14
Nodes (13): agendamentoRoutes, app, assistenteRoutes, authMiddleware, authRoutes, clienteRoutes, cobrancaRoutes, cors (+5 more)

### Community 14 - "App.jsx"
Cohesion: 0.07
Nodes (68): Task 6: Frontend React — Aba do Assistente, name, private, type, version, App(), FormField(), Layout() (+60 more)

### Community 15 - "authMiddleware.js"
Cohesion: 0.20
Nodes (8): jwt, authController, authMiddleware, express, router, authMiddleware, jwt, jsonwebtoken

### Community 16 - "main.py"
Cohesion: 0.07
Nodes (16): Settings, Orchestrator, RespostaLLM, build_context_prompt(), chat_endpoint(), ChatRequest, ChatResponse, FonteItem (+8 more)

### Community 17 - "clienteRoutes.js"
Cohesion: 0.40
Nodes (4): authMiddleware, clienteController, express, router

### Community 18 - "express"
Cohesion: 0.12
Nodes (13): assistenteController, express, router, cobrancaController, express, router, dashboardController, express (+5 more)

### Community 19 - "dashboardController.js"
Cohesion: 0.33
Nodes (4): dashboardController, dashboardService, dashboardService, pool

### Community 20 - "servicoRoutes.js"
Cohesion: 0.40
Nodes (4): authMiddleware, express, router, servicoController

### Community 21 - "agendamentoRoutes.js"
Cohesion: 0.29
Nodes (5): agendamentoController, agendamentoService, agendamentoController, express, router

### Community 22 - "Trecho"
Cohesion: 0.08
Nodes (25): FallbackRetriever, Trecho, VectorStore, FirestoreStore, MockEmbedder, MockStore, test_retriever_both_fail_returns_none(), test_retriever_circuit_breaker() (+17 more)

### Community 23 - "test_mcp_server.py"
Cohesion: 0.15
Nodes (15): _fetch(), _get_env_config(), listar_cobrancas(), listar_movimentacoes(), listar_servicos(), obter_perfil_estabelecimento(), obter_resumo_caixa(), obter_resumo_negocio() (+7 more)

### Community 24 - "orcamentoRoutes.js"
Cohesion: 0.29
Nodes (5): orcamentoController, orcamentoService, express, orcamentoController, router

### Community 25 - "Especificação de Design — Assistente IA do MEI (RAG + MCP por Estabelecimento)"
Cohesion: 0.07
Nodes (25): Task 1: Scaffolding do `ai-service/`, Embedder e5-small e Reindexação do Corpus, 10. Estratégia de Testes, 12. Critérios de Aceite, 1.1 Decisões tomadas, 1.2 Fora de escopo (YAGNI), 1.3 Problema pré-existente a corrigir, 1. Visão Geral e Objetivo, 2.1 Fluxo de uma pergunta (+17 more)

### Community 26 - "Especificação de Design — Integração do Fluxo Ponta a Ponta: Orçamento ➔ Agendamento ➔ Cobrança ➔ Livro Caixa"
Cohesion: 0.11
Nodes (18): 1. Visão Geral e Objetivo, 2. Diagrama de Estados e Ciclo de Vida do Negócio, 3.1. Tabela `agendamentos`, 3.2. Tabela `cobrancas`, 3.3. Tabela `movimentacoes`, 3. Modelo de Dados Relacional (MySQL InnoDB), 4.1. `orcamentoService.js`, 4.2. `agendamentoService.js` (+10 more)

### Community 27 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Integração do Fluxo Ponta a Ponta: Orçamento ➔ Agendamento ➔ Cobrança ➔ Caixa — Plano de Implementação, Task 1: Migração do Banco de Dados e Atualização de Seeds, Task 2: Backend — Regras de Negócio e Serviços Integrados, Task 3: Backend — Atualização dos Controllers e Suítes de Teste Legadas, Task 4: Frontend — Orçamentos e Agenda (`Orcamentos.jsx` & `Agenda.jsx`), Task 5: Frontend — Cobranças e Livro Caixa (`Cobrancas.jsx` & `Caixa.jsx`), Task 6: Validação Geral, Build e Atualização do Knowledge Graph

### Community 28 - "TenantMcpPool"
Cohesion: 0.14
Nodes (5): PoolEntry, TenantMcpPool, test_mcp_pool_safe_env_no_secrets_leaked(), test_mcp_pool_spawn_and_list_tools(), 4.3 `TenantMcpPool`

### Community 29 - "assistenteService.js"
Cohesion: 0.15
Nodes (9): assistenteController, assistenteService, conversaRepository, pool, aiServiceClient, assistenteService, conversaRepository, jwt (+1 more)

### Community 30 - "backend/tests/e2e-assistente-multitenant.test.js"
Cohesion: 0.15
Nodes (10): aiServiceClient, aiServiceClient, app, pool, request, aiServiceClient, app, jwt (+2 more)

### Community 31 - "cobrancaService.js"
Cohesion: 0.17
Nodes (9): cobrancaController, cobrancaService, financeiroService, cobrancaRepository, pool, cobrancaRepository, cobrancaService, financeiroService (+1 more)

### Community 32 - "orcamentoService.js"
Cohesion: 0.17
Nodes (8): orcamentoRepository, pool, clienteRepository, orcamentoRepository, orcamentoService, pool, servicoRepository, STATUS_PERMITIDOS

### Community 33 - "pipeline-financeiro.test.js"
Cohesion: 0.18
Nodes (8): bcrypt, pool, agendamentoService, bcrypt, cobrancaService, orcamentoService, pool, bcryptjs

### Community 34 - "database.js"
Cohesion: 0.22
Nodes (6): mysql, path, pool, movimentacaoRepository, pool, pool

### Community 35 - "clienteRepository.js"
Cohesion: 0.33
Nodes (4): clienteController, clienteRepository, clienteRepository, pool

### Community 36 - "servicoRepository.js"
Cohesion: 0.33
Nodes (4): servicoController, servicoRepository, pool, servicoRepository

### Community 37 - "agendamentos.test.js"
Cohesion: 0.40
Nodes (4): app, criarOrcamentoAprovado(), pool, request

### Community 38 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, axios, lucide-react, react, react-dom, react-router-dom

### Community 39 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, test

### Community 40 - "clientes.test.js"
Cohesion: 0.50
Nodes (3): app, pool, request

### Community 41 - "dashboard.test.js"
Cohesion: 0.50
Nodes (3): app, pool, request

### Community 42 - "orcamentos.test.js"
Cohesion: 0.50
Nodes (3): app, pool, request

### Community 43 - "servicos.test.js"
Cohesion: 0.50
Nodes (3): app, pool, request

## Knowledge Gaps
- **297 isolated node(s):** `name`, `version`, `description`, `main`, `start` (+292 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 376 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `authMiddleware()` connect `Trecho` to `authMiddleware.js`?**
  _High betweenness centrality (0.402) - this node is a cross-community bridge._
- **Why does `Global Constraints` connect `Trecho` to `Especificação de Design — Assistente IA do MEI (RAG + MCP por Estabelecimento)`, `App.jsx`, `test_mcp_server.py`?**
  _High betweenness centrality (0.276) - this node is a cross-community bridge._
- **Why does `11. Fases de Implementação` connect `Trecho` to `Especificação de Design — Assistente IA do MEI (RAG + MCP por Estabelecimento)`, `TenantMcpPool`?**
  _High betweenness centrality (0.272) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `Trecho` (e.g. with `Orchestrator` and `build_context_prompt()`) actually correct?**
  _`Trecho` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `FallbackRetriever` (e.g. with `chat_endpoint()` and `lifespan()`) actually correct?**
  _`FallbackRetriever` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `TenantMcpPool` (e.g. with `chat_endpoint()` and `lifespan()`) actually correct?**
  _`TenantMcpPool` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _297 weakly-connected nodes found - possible documentation gaps or missing edges._
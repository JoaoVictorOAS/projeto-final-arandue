# Graph Report - projeto-final-arandue  (2026-10-02)

## Corpus Check
- 88 files · ~66,347 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 6, .example 2, .css 1)

## Summary
- 401 nodes · 669 edges · 25 communities (23 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3d243b66`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Entidade MySQL: clientes
- index_mei.py
- App.jsx
- backend/package.json
- frontend/package.json
- Visão Geral do Projeto MEI
- financeiroService.js
- scripts
- agendamentoService.js
- Google Skill Finder
- database.js
- app.js
- react
- authService.js
- migrate.js
- authRoutes.js
- clienteRoutes.js
- express
- servicoRoutes.js
- agendamentoRoutes.js
- cobrancaRoutes.js
- movimentacaoRoutes.js
- orcamentoRoutes.js

## God Nodes (most connected - your core abstractions)
1. `react` - 27 edges
2. `api` - 15 edges
3. `App()` - 14 edges
4. `lucide-react` - 13 edges
5. `react-router-dom` - 13 edges
6. `FormField()` - 13 edges
7. `Modal()` - 13 edges
8. `useAuth()` - 13 edges
9. `Orcamentos()` - 12 edges
10. `StatusBadge()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Obrigações Tributárias: DAS e Relatório Mensal` --conceptually_related_to--> `Entidade MySQL: movimentacoes (Livro Caixa)`  [INFERRED]
  docs/perguntaomei.pdf → docs/modelo-dados.md
- `Fase 1: Base e Autenticação JWT` --implements--> `Endpoint REST: /api/auth`  [EXTRACTED]
  plan.md → docs/api.md
- `Fase 2: Cadastros Clientes e Serviços` --implements--> `Endpoint REST: /api/clientes`  [EXTRACTED]
  plan.md → docs/api.md
- `Fase 3: Operação Orçamentos e Agenda` --implements--> `Endpoint REST: /api/orcamentos`  [EXTRACTED]
  plan.md → docs/api.md
- `Fase 4: Financeiro Cobranças e Livro Caixa` --implements--> `Endpoint REST: /api/cobrancas`  [EXTRACTED]
  plan.md → docs/api.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Suíte RAG ChromaDB para Regras do MEI** — scripts_rag_index_mei, scripts_rag_query_mei, docs_perguntaomei_regras_gerais [EXTRACTED 1.00]
- **Fluxo Operacional Integrado do MEI** — docs_modelo_dados_clientes, docs_modelo_dados_orcamentos, docs_modelo_dados_agendamentos, docs_modelo_dados_cobrancas, docs_modelo_dados_movimentacoes [INFERRED 0.95]

## Communities (25 total, 2 thin omitted)

### Community 0 - "Entidade MySQL: clientes"
Cohesion: 0.09
Nodes (22): Endpoint REST: /api/agendamentos, Endpoint REST: /api/auth, Endpoint REST: /api/clientes, Endpoint REST: /api/cobrancas, Endpoint REST: /api/dashboard, Endpoint REST: /api/movimentacoes, Endpoint REST: /api/orcamentos, Endpoint REST: /api/servicos (+14 more)

### Community 1 - "index_mei.py"
Cohesion: 0.13
Nodes (8): Limite de Faturamento e Enquadramento MEI, Perguntas e Respostas MEI e Simei (Receita Federal), build_vector_db(), extract_chunks_from_pdf(), main(), consultar_regras_mei(), main(), recreate_rag.sh script

### Community 2 - "App.jsx"
Cohesion: 0.19
Nodes (17): App(), Layout(), Navbar(), PrivateRoute(), NAV_ITEMS, Sidebar(), AuthContext, AuthProvider() (+9 more)

### Community 3 - "backend/package.json"
Cohesion: 0.08
Nodes (23): dependencies, bcryptjs, cors, dotenv, express, jsonwebtoken, mysql2, description (+15 more)

### Community 4 - "frontend/package.json"
Cohesion: 0.06
Nodes (34): dependencies, axios, lucide-react, react, react-dom, react-router-dom, devDependencies, autoprefixer (+26 more)

### Community 5 - "Visão Geral do Projeto MEI"
Cohesion: 0.33
Nodes (6): Fase 6: Validação E2E da Jornada, Arquitetura React + Node.js + MySQL, Jornada Integrada do MEI, ODS 1 Erradicação da Pobreza, ODS 8 Trabalho Decente e Crescimento Econômico, Visão Geral do Projeto MEI

### Community 6 - "financeiroService.js"
Cohesion: 0.05
Nodes (29): clienteController, clienteRepository, cobrancaController, financeiroService, financeiroService, movimentacaoController, orcamentoController, orcamentoService (+21 more)

### Community 7 - "scripts"
Cohesion: 0.12
Nodes (16): author, description, keywords, license, name, private, scripts, build:frontend (+8 more)

### Community 8 - "agendamentoService.js"
Cohesion: 0.11
Nodes (13): agendamentoController, agendamentoService, servicoController, servicoRepository, agendamentoRepository, pool, pool, servicoRepository (+5 more)

### Community 9 - "Google Skill Finder"
Cohesion: 0.40
Nodes (4): Google Skill Finder, Rules, When the fetch fails, Workflow

### Community 12 - "database.js"
Cohesion: 0.05
Nodes (32): mysql, path, pool, dashboardController, dashboardService, dashboardService, pool, app (+24 more)

### Community 13 - "app.js"
Cohesion: 0.15
Nodes (12): agendamentoRoutes, app, authMiddleware, authRoutes, clienteRoutes, cobrancaRoutes, cors, dashboardRoutes (+4 more)

### Community 14 - "react"
Cohesion: 0.14
Nodes (33): FormField(), Modal(), STATUS_CONFIG, StatusBadge(), Agenda(), formatDateTime(), getDefaultDateTimeLocal(), Caixa() (+25 more)

### Community 15 - "authService.js"
Cohesion: 0.17
Nodes (9): authController, authService, pool, usuarioRepository, authService, bcrypt, jwt, usuarioRepository (+1 more)

### Community 16 - "migrate.js"
Cohesion: 0.15
Nodes (8): fs, mysql, path, app, path, fs, path, mysql2

### Community 17 - "authRoutes.js"
Cohesion: 0.22
Nodes (6): jwt, authController, authMiddleware, express, router, jsonwebtoken

### Community 18 - "clienteRoutes.js"
Cohesion: 0.40
Nodes (4): authMiddleware, clienteController, express, router

### Community 19 - "express"
Cohesion: 0.40
Nodes (4): dashboardController, express, router, express

### Community 20 - "servicoRoutes.js"
Cohesion: 0.40
Nodes (4): authMiddleware, express, router, servicoController

### Community 21 - "agendamentoRoutes.js"
Cohesion: 0.50
Nodes (3): agendamentoController, express, router

### Community 22 - "cobrancaRoutes.js"
Cohesion: 0.50
Nodes (3): cobrancaController, express, router

### Community 23 - "movimentacaoRoutes.js"
Cohesion: 0.50
Nodes (3): express, movimentacaoController, router

### Community 24 - "orcamentoRoutes.js"
Cohesion: 0.50
Nodes (3): express, orcamentoController, router

## Knowledge Gaps
- **212 isolated node(s):** `name`, `version`, `description`, `main`, `start` (+207 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 233 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `express` to `backend/package.json`, `app.js`, `authRoutes.js`, `clienteRoutes.js`, `servicoRoutes.js`, `agendamentoRoutes.js`, `cobrancaRoutes.js`, `movimentacaoRoutes.js`, `orcamentoRoutes.js`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `mysql2` connect `migrate.js` to `backend/package.json`, `database.js`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `App.jsx`, `frontend/package.json`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _212 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Entidade MySQL: clientes` be split into smaller, more focused modules?**
  _Cohesion score 0.08615384615384615 - nodes in this community are weakly interconnected._
- **Should `index_mei.py` be split into smaller, more focused modules?**
  _Cohesion score 0.12554112554112554 - nodes in this community are weakly interconnected._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
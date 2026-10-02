# Graph Report - projeto-final-arandue  (2026-10-02)

## Corpus Check
- 89 files · ~66,969 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 6, .example 2, .css 1)

## Summary
- 405 nodes · 675 edges · 23 communities (21 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d41c9cf0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Entidade MySQL: clientes
- index_mei.py
- supertest
- backend/package.json
- frontend/package.json
- Visão Geral do Projeto MEI
- financeiroService.js
- scripts
- agendamentoService.js
- Google Skill Finder
- database.js
- app.js
- App.jsx
- agendamentos.test.js
- migrate.js
- auth.test.js
- dashboard.test.js
- express
- e2e-jornada.test.js
- orcamentos.test.js
- servicos.test.js

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

## Communities (23 total, 2 thin omitted)

### Community 0 - "Entidade MySQL: clientes"
Cohesion: 0.09
Nodes (22): Endpoint REST: /api/agendamentos, Endpoint REST: /api/auth, Endpoint REST: /api/clientes, Endpoint REST: /api/cobrancas, Endpoint REST: /api/dashboard, Endpoint REST: /api/movimentacoes, Endpoint REST: /api/orcamentos, Endpoint REST: /api/servicos (+14 more)

### Community 1 - "index_mei.py"
Cohesion: 0.13
Nodes (8): Limite de Faturamento e Enquadramento MEI, Perguntas e Respostas MEI e Simei (Receita Federal), build_vector_db(), extract_chunks_from_pdf(), main(), consultar_regras_mei(), main(), recreate_rag.sh script

### Community 2 - "supertest"
Cohesion: 0.25
Nodes (6): app, pool, request, app, request, supertest

### Community 3 - "backend/package.json"
Cohesion: 0.05
Nodes (38): dependencies, bcryptjs, cors, dotenv, express, jsonwebtoken, mysql2, description (+30 more)

### Community 4 - "frontend/package.json"
Cohesion: 0.05
Nodes (34): dependencies, axios, lucide-react, react, react-dom, react-router-dom, devDependencies, autoprefixer (+26 more)

### Community 5 - "Visão Geral do Projeto MEI"
Cohesion: 0.33
Nodes (6): Fase 6: Validação E2E da Jornada, Arquitetura React + Node.js + MySQL, Jornada Integrada do MEI, ODS 1 Erradicação da Pobreza, ODS 8 Trabalho Decente e Crescimento Econômico, Visão Geral do Projeto MEI

### Community 6 - "financeiroService.js"
Cohesion: 0.06
Nodes (27): clienteController, clienteRepository, clienteRepository, pool, cobrancaRepository, pool, movimentacaoRepository, pool (+19 more)

### Community 7 - "scripts"
Cohesion: 0.12
Nodes (16): author, description, keywords, license, name, private, scripts, build:frontend (+8 more)

### Community 8 - "agendamentoService.js"
Cohesion: 0.07
Nodes (20): agendamentoController, agendamentoService, servicoController, servicoRepository, agendamentoRepository, pool, pool, servicoRepository (+12 more)

### Community 9 - "Google Skill Finder"
Cohesion: 0.40
Nodes (4): Google Skill Finder, Rules, When the fetch fails, Workflow

### Community 12 - "database.js"
Cohesion: 0.20
Nodes (7): mysql, path, pool, app, pool, request, pool

### Community 13 - "app.js"
Cohesion: 0.15
Nodes (12): agendamentoRoutes, app, authMiddleware, authRoutes, clienteRoutes, cobrancaRoutes, cors, dashboardRoutes (+4 more)

### Community 14 - "App.jsx"
Cohesion: 0.10
Nodes (50): App(), FormField(), Layout(), Modal(), Navbar(), PrivateRoute(), NAV_ITEMS, Sidebar() (+42 more)

### Community 15 - "agendamentos.test.js"
Cohesion: 0.50
Nodes (3): app, pool, request

### Community 16 - "migrate.js"
Cohesion: 0.15
Nodes (8): fs, mysql, path, app, path, fs, path, mysql2

### Community 17 - "auth.test.js"
Cohesion: 0.50
Nodes (3): app, pool, request

### Community 18 - "dashboard.test.js"
Cohesion: 0.50
Nodes (3): app, pool, request

### Community 19 - "express"
Cohesion: 0.06
Nodes (23): cobrancaController, financeiroService, dashboardController, dashboardService, financeiroService, movimentacaoController, orcamentoController, orcamentoService (+15 more)

### Community 20 - "e2e-jornada.test.js"
Cohesion: 0.50
Nodes (3): app, pool, request

### Community 21 - "orcamentos.test.js"
Cohesion: 0.50
Nodes (3): app, pool, request

### Community 22 - "servicos.test.js"
Cohesion: 0.50
Nodes (3): app, pool, request

## Knowledge Gaps
- **215 isolated node(s):** `name`, `version`, `description`, `main`, `start` (+210 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 236 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `express` to `agendamentoService.js`, `backend/package.json`, `app.js`, `financeiroService.js`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `mysql2` connect `migrate.js` to `backend/package.json`, `database.js`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `react` connect `App.jsx` to `frontend/package.json`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _215 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Entidade MySQL: clientes` be split into smaller, more focused modules?**
  _Cohesion score 0.08615384615384615 - nodes in this community are weakly interconnected._
- **Should `index_mei.py` be split into smaller, more focused modules?**
  _Cohesion score 0.12554112554112554 - nodes in this community are weakly interconnected._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.046464646464646465 - nodes in this community are weakly interconnected._
# Graph Report - projeto-final-arandue  (2026-10-06)

## Corpus Check
- 96 files · ~100,042 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 6, .example 2, .css 1)

## Summary
- 461 nodes · 752 edges · 28 communities (26 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8f4d539a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Entidade MySQL: clientes
- index_mei.py
- authService.js
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
- authRoutes.js
- migrate.js
- clienteRoutes.js
- express
- dashboardController.js
- servicoRoutes.js
- agendamentoRoutes.js
- cobrancaRoutes.js
- movimentacaoRoutes.js
- orcamentoRoutes.js
- App.jsx
- Especificação de Design — Integração do Fluxo Ponta a Ponta: Orçamento ➔ Agendamento ➔ Cobrança ➔ Livro Caixa
- Global Constraints

## God Nodes (most connected - your core abstractions)
1. `react` - 28 edges
2. `react-router-dom` - 17 edges
3. `api` - 15 edges
4. `App()` - 14 edges
5. `lucide-react` - 13 edges
6. `FormField()` - 13 edges
7. `Modal()` - 13 edges
8. `Orcamentos()` - 12 edges
9. `scripts` - 12 edges
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

## Communities (28 total, 2 thin omitted)

### Community 0 - "Entidade MySQL: clientes"
Cohesion: 0.09
Nodes (21): Endpoint REST: /api/agendamentos, Endpoint REST: /api/auth, Endpoint REST: /api/clientes, Endpoint REST: /api/cobrancas, Endpoint REST: /api/dashboard, Endpoint REST: /api/movimentacoes, Endpoint REST: /api/orcamentos, Endpoint REST: /api/servicos (+13 more)

### Community 1 - "index_mei.py"
Cohesion: 0.12
Nodes (9): Limite de Faturamento e Enquadramento MEI, Obrigações Tributárias: DAS e Relatório Mensal, Perguntas e Respostas MEI e Simei (Receita Federal), build_vector_db(), extract_chunks_from_pdf(), main(), consultar_regras_mei(), main() (+1 more)

### Community 2 - "authService.js"
Cohesion: 0.12
Nodes (11): authController, authService, bcrypt, pool, pool, usuarioRepository, authService, bcrypt (+3 more)

### Community 3 - "backend/package.json"
Cohesion: 0.08
Nodes (23): dependencies, bcryptjs, cors, dotenv, express, jsonwebtoken, mysql2, description (+15 more)

### Community 4 - "frontend/package.json"
Cohesion: 0.06
Nodes (33): dependencies, axios, lucide-react, react, react-dom, react-router-dom, devDependencies, autoprefixer (+25 more)

### Community 5 - "Visão Geral do Projeto MEI"
Cohesion: 0.33
Nodes (6): Fase 6: Validação E2E da Jornada, Arquitetura React + Node.js + MySQL, Jornada Integrada do MEI, ODS 1 Erradicação da Pobreza, ODS 8 Trabalho Decente e Crescimento Econômico, Visão Geral do Projeto MEI

### Community 6 - "financeiroService.js"
Cohesion: 0.08
Nodes (21): cobrancaController, cobrancaService, financeiroService, financeiroService, movimentacaoController, cobrancaRepository, pool, movimentacaoRepository (+13 more)

### Community 7 - "scripts"
Cohesion: 0.10
Nodes (19): author, description, keywords, license, name, private, scripts, build:frontend (+11 more)

### Community 8 - "agendamentoService.js"
Cohesion: 0.04
Nodes (34): agendamentoController, agendamentoService, clienteController, clienteRepository, orcamentoController, orcamentoService, servicoController, servicoRepository (+26 more)

### Community 9 - "Google Skill Finder"
Cohesion: 0.40
Nodes (4): Google Skill Finder, Rules, When the fetch fails, Workflow

### Community 12 - "database.js"
Cohesion: 0.05
Nodes (32): mysql, path, pool, app, criarOrcamentoAprovado(), pool, request, app (+24 more)

### Community 13 - "app.js"
Cohesion: 0.15
Nodes (12): agendamentoRoutes, app, authMiddleware, authRoutes, clienteRoutes, cobrancaRoutes, cors, dashboardRoutes (+4 more)

### Community 14 - "react"
Cohesion: 0.12
Nodes (38): FormField(), Modal(), STATUS_CONFIG, StatusBadge(), Agenda(), formatBRL(), formatDateTime(), getDefaultDateTimeLocal() (+30 more)

### Community 15 - "authRoutes.js"
Cohesion: 0.22
Nodes (6): jwt, authController, authMiddleware, express, router, jsonwebtoken

### Community 16 - "migrate.js"
Cohesion: 0.15
Nodes (8): fs, mysql, path, app, path, fs, path, mysql2

### Community 17 - "clienteRoutes.js"
Cohesion: 0.40
Nodes (4): authMiddleware, clienteController, express, router

### Community 18 - "express"
Cohesion: 0.40
Nodes (4): dashboardController, express, router, express

### Community 19 - "dashboardController.js"
Cohesion: 0.33
Nodes (4): dashboardController, dashboardService, dashboardService, pool

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

### Community 25 - "App.jsx"
Cohesion: 0.21
Nodes (15): App(), Layout(), Logo(), Navbar(), PrivateRoute(), NAV_ITEMS, Sidebar(), AuthContext (+7 more)

### Community 26 - "Especificação de Design — Integração do Fluxo Ponta a Ponta: Orçamento ➔ Agendamento ➔ Cobrança ➔ Livro Caixa"
Cohesion: 0.11
Nodes (18): 1. Visão Geral e Objetivo, 2. Diagrama de Estados e Ciclo de Vida do Negócio, 3.1. Tabela `agendamentos`, 3.2. Tabela `cobrancas`, 3.3. Tabela `movimentacoes`, 3. Modelo de Dados Relacional (MySQL InnoDB), 4.1. `orcamentoService.js`, 4.2. `agendamentoService.js` (+10 more)

### Community 27 - "Global Constraints"
Cohesion: 0.22
Nodes (8): Global Constraints, Integração do Fluxo Ponta a Ponta: Orçamento ➔ Agendamento ➔ Cobrança ➔ Caixa — Plano de Implementação, Task 1: Migração do Banco de Dados e Atualização de Seeds, Task 2: Backend — Regras de Negócio e Serviços Integrados, Task 3: Backend — Atualização dos Controllers e Suítes de Teste Legadas, Task 4: Frontend — Orçamentos e Agenda (`Orcamentos.jsx` & `Agenda.jsx`), Task 5: Frontend — Cobranças e Livro Caixa (`Cobrancas.jsx` & `Caixa.jsx`), Task 6: Validação Geral, Build e Atualização do Knowledge Graph

## Knowledge Gaps
- **252 isolated node(s):** `name`, `version`, `description`, `main`, `start` (+247 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 278 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `express` to `backend/package.json`, `app.js`, `authRoutes.js`, `clienteRoutes.js`, `servicoRoutes.js`, `agendamentoRoutes.js`, `cobrancaRoutes.js`, `movimentacaoRoutes.js`, `orcamentoRoutes.js`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `mysql2` connect `migrate.js` to `backend/package.json`, `database.js`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `App.jsx`, `frontend/package.json`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _252 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Entidade MySQL: clientes` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `index_mei.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11857707509881422 - nodes in this community are weakly interconnected._
- **Should `authService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
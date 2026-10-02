# Graph Report - projeto-final-arandue  (2026-10-02)

## Corpus Check
- 43 files · ~28,694 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 6, .example 2, .css 1)

## Summary
- 215 nodes · 314 edges · 12 communities (10 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dddac64e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Entidade MySQL: clientes
- index_mei.py
- App.jsx
- backend/package.json
- frontend/package.json
- Visão Geral do Projeto MEI
- migrate.js
- scripts
- devDependencies
- Google Skill Finder

## God Nodes (most connected - your core abstractions)
1. `react` - 18 edges
2. `App()` - 14 edges
3. `useAuth()` - 13 edges
4. `lucide-react` - 12 edges
5. `react-router-dom` - 9 edges
6. `scripts` - 9 edges
7. `scripts` - 5 edges
8. `Layout()` - 5 edges
9. `Login()` - 5 edges
10. `Entidade MySQL: clientes` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Obrigações Tributárias: DAS e Relatório Mensal` --conceptually_related_to--> `Entidade MySQL: movimentacoes (Livro Caixa)`  [INFERRED]
  docs/perguntaomei.pdf → docs/modelo-dados.md
- `Fase 2: Cadastros Clientes e Serviços` --implements--> `Endpoint REST: /api/clientes`  [EXTRACTED]
  plan.md → docs/api.md
- `Fase 3: Operação Orçamentos e Agenda` --implements--> `Endpoint REST: /api/orcamentos`  [EXTRACTED]
  plan.md → docs/api.md
- `Fase 4: Financeiro Cobranças e Livro Caixa` --implements--> `Endpoint REST: /api/cobrancas`  [EXTRACTED]
  plan.md → docs/api.md
- `Fase 1: Base e Autenticação JWT` --implements--> `Endpoint REST: /api/auth`  [EXTRACTED]
  plan.md → docs/api.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Suíte RAG ChromaDB para Regras do MEI** — scripts_rag_index_mei, scripts_rag_query_mei, docs_perguntaomei_regras_gerais [EXTRACTED 1.00]
- **Fluxo Operacional Integrado do MEI** — docs_modelo_dados_clientes, docs_modelo_dados_orcamentos, docs_modelo_dados_agendamentos, docs_modelo_dados_cobrancas, docs_modelo_dados_movimentacoes [INFERRED 0.95]

## Communities (12 total, 2 thin omitted)

### Community 0 - "Entidade MySQL: clientes"
Cohesion: 0.09
Nodes (21): Endpoint REST: /api/agendamentos, Endpoint REST: /api/auth, Endpoint REST: /api/clientes, Endpoint REST: /api/cobrancas, Endpoint REST: /api/dashboard, Endpoint REST: /api/movimentacoes, Endpoint REST: /api/orcamentos, Endpoint REST: /api/servicos (+13 more)

### Community 1 - "index_mei.py"
Cohesion: 0.12
Nodes (9): Limite de Faturamento e Enquadramento MEI, Obrigações Tributárias: DAS e Relatório Mensal, Perguntas e Respostas MEI e Simei (Receita Federal), build_vector_db(), extract_chunks_from_pdf(), main(), consultar_regras_mei(), main() (+1 more)

### Community 2 - "App.jsx"
Cohesion: 0.16
Nodes (22): App(), Layout(), Navbar(), PrivateRoute(), NAV_ITEMS, Sidebar(), AuthContext, AuthProvider() (+14 more)

### Community 3 - "backend/package.json"
Cohesion: 0.06
Nodes (32): dependencies, bcryptjs, cors, dotenv, express, jsonwebtoken, mysql2, description (+24 more)

### Community 4 - "frontend/package.json"
Cohesion: 0.07
Nodes (27): dependencies, axios, lucide-react, react, react-dom, react-router-dom, name, private (+19 more)

### Community 5 - "Visão Geral do Projeto MEI"
Cohesion: 0.33
Nodes (6): Fase 6: Validação E2E da Jornada, Arquitetura React + Node.js + MySQL, Jornada Integrada do MEI, ODS 1 Erradicação da Pobreza, ODS 8 Trabalho Decente e Crescimento Econômico, Visão Geral do Projeto MEI

### Community 6 - "migrate.js"
Cohesion: 0.11
Nodes (12): mysql, path, pool, fs, mysql, path, app, path (+4 more)

### Community 7 - "scripts"
Cohesion: 0.12
Nodes (16): author, description, keywords, license, name, private, scripts, build:frontend (+8 more)

### Community 8 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, autoprefixer, jsdom, postcss, tailwindcss, @testing-library/jest-dom, @testing-library/react, vite (+2 more)

### Community 9 - "Google Skill Finder"
Cohesion: 0.40
Nodes (4): Google Skill Finder, Rules, When the fetch fails, Workflow

## Knowledge Gaps
- **97 isolated node(s):** `name`, `version`, `description`, `main`, `start` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 114 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.jsx` to `frontend/package.json`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `frontend/package.json`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `Entidade MySQL: movimentacoes (Livro Caixa)` connect `Entidade MySQL: clientes` to `index_mei.py`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Entidade MySQL: clientes` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `index_mei.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11857707509881422 - nodes in this community are weakly interconnected._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06050420168067227 - nodes in this community are weakly interconnected._
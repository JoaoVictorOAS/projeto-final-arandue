# Graph Report - projeto-final-arandue  (2026-10-02)

## Corpus Check
- 49 files · ~30,276 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 6, .example 2, .css 1)

## Summary
- 239 nodes · 345 edges · 13 communities (11 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0cf41d3a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Entidade MySQL: clientes
- index_mei.py
- App.jsx
- backend/package.json
- frontend/package.json
- Visão Geral do Projeto MEI
- database.js
- scripts
- devDependencies
- Google Skill Finder
- dependencies

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

## Communities (13 total, 2 thin omitted)

### Community 0 - "Entidade MySQL: clientes"
Cohesion: 0.09
Nodes (22): Endpoint REST: /api/agendamentos, Endpoint REST: /api/auth, Endpoint REST: /api/clientes, Endpoint REST: /api/cobrancas, Endpoint REST: /api/dashboard, Endpoint REST: /api/movimentacoes, Endpoint REST: /api/orcamentos, Endpoint REST: /api/servicos (+14 more)

### Community 1 - "index_mei.py"
Cohesion: 0.13
Nodes (8): Limite de Faturamento e Enquadramento MEI, Perguntas e Respostas MEI e Simei (Receita Federal), build_vector_db(), extract_chunks_from_pdf(), main(), consultar_regras_mei(), main(), recreate_rag.sh script

### Community 2 - "App.jsx"
Cohesion: 0.15
Nodes (24): App(), Layout(), Navbar(), PrivateRoute(), NAV_ITEMS, Sidebar(), AuthContext, AuthProvider() (+16 more)

### Community 3 - "backend/package.json"
Cohesion: 0.05
Nodes (40): description, devDependencies, jest, nodemon, supertest, main, name, scripts (+32 more)

### Community 4 - "frontend/package.json"
Cohesion: 0.07
Nodes (25): dependencies, axios, lucide-react, react, react-dom, react-router-dom, name, private (+17 more)

### Community 5 - "Visão Geral do Projeto MEI"
Cohesion: 0.33
Nodes (6): Fase 6: Validação E2E da Jornada, Arquitetura React + Node.js + MySQL, Jornada Integrada do MEI, ODS 1 Erradicação da Pobreza, ODS 8 Trabalho Decente e Crescimento Econômico, Visão Geral do Projeto MEI

### Community 6 - "database.js"
Cohesion: 0.09
Nodes (14): mysql, path, pool, fs, mysql, path, pool, usuarioRepository (+6 more)

### Community 7 - "scripts"
Cohesion: 0.12
Nodes (16): author, description, keywords, license, name, private, scripts, build:frontend (+8 more)

### Community 8 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, autoprefixer, jsdom, postcss, tailwindcss, @testing-library/jest-dom, @testing-library/react, vite (+2 more)

### Community 9 - "Google Skill Finder"
Cohesion: 0.40
Nodes (4): Google Skill Finder, Rules, When the fetch fails, Workflow

### Community 12 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, bcryptjs, cors, dotenv, express, jsonwebtoken, mysql2

## Knowledge Gaps
- **112 isolated node(s):** `name`, `version`, `description`, `main`, `start` (+107 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 130 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.jsx` to `frontend/package.json`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `frontend/package.json`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _112 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Entidade MySQL: clientes` be split into smaller, more focused modules?**
  _Cohesion score 0.08615384615384615 - nodes in this community are weakly interconnected._
- **Should `index_mei.py` be split into smaller, more focused modules?**
  _Cohesion score 0.12554112554112554 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14878048780487804 - nodes in this community are weakly interconnected._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0467687074829932 - nodes in this community are weakly interconnected._
# Graph Report - projeto-final-arandue  (2026-10-02)

## Corpus Check
- Corpus is ~20,149 words - fits in a single context window. You may not need a graph.

## Summary
- 54 nodes · 63 edges · 6 communities (5 shown, 1 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.92)
- Token cost: 1,500 input · 2,500 output

## Community Hubs (Navigation)
- Operação Comercial e Cobranças
- Indexador RAG ChromaDB
- Consulta Semântica RAG
- Gestão Cadastral e Agenda
- Finanças e Legislação do MEI
- Visão Geral, ODS e Jornada

## God Nodes (most connected - your core abstractions)
1. `Entidade MySQL: clientes` - 5 edges
2. `Visão Geral do Projeto MEI` - 4 edges
3. `Entidade MySQL: usuarios` - 4 edges
4. `Entidade MySQL: servicos` - 4 edges
5. `Entidade MySQL: orcamentos` - 4 edges
6. `Entidade MySQL: cobrancas` - 4 edges
7. `Entidade MySQL: movimentacoes (Livro Caixa)` - 4 edges
8. `Perguntas e Respostas MEI e Simei (Receita Federal)` - 4 edges
9. `extract_chunks_from_pdf()` - 3 edges
10. `build_vector_db()` - 3 edges

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
- **Fluxo Operacional Integrado do MEI** — docs_modelo_dados_clientes, docs_modelo_dados_orcamentos, docs_modelo_dados_agendamentos, docs_modelo_dados_cobrancas, docs_modelo_dados_movimentacoes [INFERRED 0.95]
- **Suíte RAG ChromaDB para Regras do MEI** — scripts_rag_index_mei, scripts_rag_query_mei, docs_perguntaomei_regras_gerais [EXTRACTED 1.00]

## Communities (6 total, 1 thin omitted)

### Community 0 - "Operação Comercial e Cobranças"
Cohesion: 0.18
Nodes (10): Endpoint REST: /api/clientes, Endpoint REST: /api/cobrancas, Endpoint REST: /api/orcamentos, Entidade MySQL: clientes, Entidade MySQL: cobrancas, Entidade MySQL: orcamento_itens, Entidade MySQL: orcamentos, Fase 2: Cadastros Clientes e Serviços (+2 more)

### Community 1 - "Indexador RAG ChromaDB"
Cohesion: 0.24
Nodes (4): build_vector_db(), extract_chunks_from_pdf(), main(), recreate_rag.sh script

### Community 3 - "Gestão Cadastral e Agenda"
Cohesion: 0.22
Nodes (7): Endpoint REST: /api/agendamentos, Endpoint REST: /api/auth, Endpoint REST: /api/servicos, Entidade MySQL: agendamentos, Entidade MySQL: servicos, Entidade MySQL: usuarios, Fase 1: Base e Autenticação JWT

### Community 4 - "Finanças e Legislação do MEI"
Cohesion: 0.29
Nodes (7): Endpoint REST: /api/dashboard, Endpoint REST: /api/movimentacoes, Entidade MySQL: movimentacoes (Livro Caixa), Limite de Faturamento e Enquadramento MEI, Obrigações Tributárias: DAS e Relatório Mensal, Perguntas e Respostas MEI e Simei (Receita Federal), Fase 5: Dashboard e Métricas Consolidadas

### Community 5 - "Visão Geral, ODS e Jornada"
Cohesion: 0.33
Nodes (6): Fase 6: Validação E2E da Jornada, Arquitetura React + Node.js + MySQL, Jornada Integrada do MEI, ODS 1 Erradicação da Pobreza, ODS 8 Trabalho Decente e Crescimento Econômico, Visão Geral do Projeto MEI

## Knowledge Gaps
- **13 isolated node(s):** `recreate_rag.sh script`, `ODS 8 Trabalho Decente e Crescimento Econômico`, `ODS 1 Erradicação da Pobreza`, `Arquitetura React + Node.js + MySQL`, `Endpoint REST: /api/servicos` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 23 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Entidade MySQL: movimentacoes (Livro Caixa)` connect `Finanças e Legislação do MEI` to `Operação Comercial e Cobranças`?**
  _High betweenness centrality (0.448) - this node is a cross-community bridge._
- **Why does `Entidade MySQL: cobrancas` connect `Operação Comercial e Cobranças` to `Finanças e Legislação do MEI`?**
  _High betweenness centrality (0.429) - this node is a cross-community bridge._
- **Why does `Perguntas e Respostas MEI e Simei (Receita Federal)` connect `Finanças e Legislação do MEI` to `Indexador RAG ChromaDB`, `Consulta Semântica RAG`?**
  _High betweenness centrality (0.419) - this node is a cross-community bridge._
- **What connects `recreate_rag.sh script`, `ODS 8 Trabalho Decente e Crescimento Econômico`, `ODS 1 Erradicação da Pobreza` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
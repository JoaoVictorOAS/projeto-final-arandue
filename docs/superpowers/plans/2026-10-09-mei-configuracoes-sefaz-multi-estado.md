# Plano de Implementação: Configurações do MEI e Integração SEFAZ Multi-Estado (27 UFs)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. Os passos utilizam a sintaxe de checkbox (`- [ ]`) para rastreamento.

**Goal:** Permitir a qualquer MEI configurar seu perfil cadastral e fiscal (com busca automática por CNPJ) e emitir notas fiscais sincronizadas com as regras e autorizadores SEFAZ de qualquer um dos 27 estados brasileiros.

**Architecture:** Módulo central de registros SEFAZ (`sefazRegistry.js`) com as 27 UFs e seus códigos `cUF`, autorizadores (próprios, SVRS ou SVAN) e portais de consulta; tabela relacional MySQL `mei_configuracoes` isolada por `usuario_id`; endpoints REST protegidos por JWT e integração com a BrasilAPI; ferramentas MCP para IA com paridade total e interface no React com busca por CNPJ e indicador em tempo real da SEFAZ ativa.

**Tech Stack:** Node.js, Express, MySQL 8.x, Jest, Supertest, Python 3.12, FastAPI, MCP SDK, Pytest, React 18, Vite, Tailwind CSS, Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-09-mei-configuracoes-sefaz-multi-estado-design.md`](file:///home/JoaoVictor/projetos/projeto-final-arandue/docs/superpowers/specs/2026-10-09-mei-configuracoes-sefaz-multi-estado-design.md)

## Global Constraints
- Isolamento absoluto multi-tenant por `usuario_id` via JWT decodificado no backend (nunca via payload do cliente).
- Paridade total REST ↔ MCP: Toda capacidade das rotas de configurações e fiscal deve ser acessível via ferramentas MCP sem expor `usuario_id` na assinatura.
- Suporte a todas as 27 UFs brasileiras (AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO).
- Todas as suítes de testes (`npm test`, `npm run test:backend`, `npm run test:frontend`, `npm run test:ai`) devem se manter 100% verdes a cada etapa.

---

### Task 1: Módulo Canônico de Estados SEFAZ (`sefazRegistry.js`) e Migração de Dados MySQL

**Files:**
- Create: `backend/src/services/fiscal/sefazRegistry.js`
- Create: `backend/src/database/migrations/007_mei_configuracoes.sql`
- Modify: `backend/src/database/schema.sql`
- Test: `backend/tests/unit/sefazRegistry.test.js`

**Interfaces:**
- Produz: `obterDadosSefazPorUf(uf: string): Object`
- Produz: `listarTodasUfs(): Array<Object>`
- Produz: `determinarCfopOperacao(ufEmitente: string, ufDestinatario: string): string`

- [ ] **Step 1: Escrever teste unitário para sefazRegistry**

Criar `backend/tests/unit/sefazRegistry.test.js` cobrindo todas as 27 UFs, seus códigos `cUF`, autorizadores (SP, RJ, MG, RS, SVRS, SVAN), URLs de consulta e determinação de CFOP (5102 interno vs 6102 interestadual).

- [ ] **Step 2: Rodar teste para verificar que falha**

Executar: `npm --prefix backend test tests/unit/sefazRegistry.test.js`
Esperado: FAIL (módulo ainda não existente).

- [ ] **Step 3: Implementar sefazRegistry.js**

Criar `backend/src/services/fiscal/sefazRegistry.js` com o mapa canônico das 27 UFs, normalização de siglas, busca por IBGE ou sigla e determinação de CFOP.

- [ ] **Step 4: Criar migration 007_mei_configuracoes.sql e atualizar schema.sql**

Criar arquivo SQL com tabela `mei_configuracoes` e executar `ALTER/CREATE` no banco local.

- [ ] **Step 5: Rodar testes unitários para verificar aprovação**

Executar: `npm --prefix backend test tests/unit/sefazRegistry.test.js`
Esperado: PASS (100% aprovado).

- [ ] **Step 6: Commit**

`git add backend/src/services/fiscal/sefazRegistry.js backend/src/database/migrations/007_mei_configuracoes.sql backend/src/database/schema.sql backend/tests/unit/sefazRegistry.test.js`  
`git commit -m "feat(fiscal): adiciona sefazRegistry das 27 UFs e migration da tabela mei_configuracoes"`

---

### Task 2: Endpoints REST de Configurações do MEI & Integração BrasilAPI

**Files:**
- Create: `backend/src/controllers/configuracoesController.js`
- Create: `backend/src/routes/configuracoesRoutes.js`
- Modify: `backend/src/app.js`
- Test: `backend/tests/integration/configuracoes.test.js`

**Interfaces:**
- Consumes: `sefazRegistry.js`, `pool` MySQL
- Produz:
  - `GET /api/configuracoes`
  - `PUT /api/configuracoes`
  - `GET /api/configuracoes/cnpj/:cnpj`
  - `GET /api/configuracoes/estados`

- [ ] **Step 1: Escrever testes de integração para as rotas de configurações**

Criar `backend/tests/integration/configuracoes.test.js` testando:
- Leitura de configurações padrão para novo usuário
- Atualização e persistência de dados cadastrais
- Rejeição de UF inválida
- Consulta de CNPJ com mock e sanitização
- Listagem das 27 UFs disponíveis

- [ ] **Step 2: Rodar testes para verificar falha**

Executar: `npm --prefix backend test tests/integration/configuracoes.test.js`
Esperado: FAIL (rotas ainda não implementadas).

- [ ] **Step 3: Implementar configuracoesController.js e configuracoesRoutes.js**

Implementar lógica de obtenção/atualização com isolamento multi-tenant por `req.usuario.id`, busca de CNPJ via BrasilAPI com fallback e sanitização de dados.

- [ ] **Step 4: Registrar rotas em backend/src/app.js**

Adicionar `app.use('/api/configuracoes', authMiddleware, configuracoesRoutes);`

- [ ] **Step 5: Rodar testes para verificar aprovação**

Executar: `npm --prefix backend test tests/integration/configuracoes.test.js`
Esperado: PASS.

- [ ] **Step 6: Commit**

`git add backend/src/controllers/configuracoesController.js backend/src/routes/configuracoesRoutes.js backend/src/app.js backend/tests/integration/configuracoes.test.js`  
`git commit -m "feat(backend): implementa endpoints REST de configuracoes do MEI e consulta CNPJ"`

---

### Task 3: Integração no Motor Fiscal (`fiscalEngine.js`) para Emissão Dinâmica por Estado

**Files:**
- Modify: `backend/src/services/fiscal/fiscalEngine.js`
- Modify: `backend/src/services/fiscal/geradorDanfeSimplificado.js`
- Test: `backend/tests/unit/fiscalEngineSefazEstados.test.js`

**Interfaces:**
- Consumes: `sefazRegistry.js`, tabela `mei_configuracoes`
- Produz: Notas emitidas com a UF, `cUF` e autorizador SEFAZ do MEI cadastrado.

- [ ] **Step 1: Escrever teste de emissão multi-estado**

Criar `backend/tests/unit/fiscalEngineSefazEstados.test.js` validando emissão de notas para MEIs configurados em SP (cUF 35), RJ (cUF 33), MG (cUF 31) e SC (cUF 42 / SVRS), verificando chaves de acesso geradas e links no DANFE.

- [ ] **Step 2: Rodar teste para verificar falha**

Executar: `npm --prefix backend test tests/unit/fiscalEngineSefazEstados.test.js`
Esperado: FAIL.

- [ ] **Step 3: Atualizar obterDadosEmitente e emissões em fiscalEngine.js**

Alterar `obterDadosEmitente` para ler `mei_configuracoes` com prioridade, e parametrizar `cUF` e autorizadores em `emitirNfse`, `emitirNfe` e `emitirNfce`.

- [ ] **Step 4: Atualizar geradorDanfeSimplificado.js**

Configurar link de consulta pública do DANFE apontando para a SEFAZ estadual correspondente à UF do MEI.

- [ ] **Step 5: Rodar testes para verificar aprovação**

Executar: `npm --prefix backend test tests/unit/fiscalEngineSefazEstados.test.js`
Esperado: PASS.

- [ ] **Step 6: Commit**

`git add backend/src/services/fiscal/fiscalEngine.js backend/src/services/fiscal/geradorDanfeSimplificado.js backend/tests/unit/fiscalEngineSefazEstados.test.js`  
`git commit -m "feat(fiscal): conecta emissao fiscal SEFAZ com estado cadastrado do MEI"`

---

### Task 4: Paridade Total no Servidor MCP (`server.py`)

**Files:**
- Modify: `ai-service/mcp_server/server.py`
- Test: `ai-service/tests/test_mcp_configuracoes.py`

**Interfaces:**
- Produz: `@mcp_server_app.tool() obter_configuracoes_mei()`
- Produz: `@mcp_server_app.tool() atualizar_configuracoes_mei(...)`
- Produz: `@mcp_server_app.tool() consultar_dados_cnpj(cnpj: str)`

- [ ] **Step 1: Escrever testes unitários MCP em pytest**

Criar `ai-service/tests/test_mcp_configuracoes.py` mockando respostas da API Node e validando as novas ferramentas MCP e ausência de vazamento de `usuario_id`.

- [ ] **Step 2: Rodar teste para verificar falha**

Executar: `npm run test:ai -- -k configuracoes`
Esperado: FAIL.

- [ ] **Step 3: Implementar ferramentas MCP em server.py**

Adicionar as ferramentas com docstrings completas, consumo seguro via `_fetch` e `_put` e tratamento amigável de erros.

- [ ] **Step 4: Rodar testes MCP para verificar aprovação**

Executar: `npm run test:ai -- -k configuracoes`
Esperado: PASS.

- [ ] **Step 5: Commit**

`git add ai-service/mcp_server/server.py ai-service/tests/test_mcp_configuracoes.py`  
`git commit -m "feat(mcp): adiciona ferramentas de configuracao do MEI e consulta de CNPJ"`

---

### Task 5: Frontend — Página de Configurações (`Configuracoes.jsx`), Roteamento e Indicador SEFAZ

**Files:**
- Create: `frontend/src/pages/Configuracoes.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/pages/NotasFiscais.jsx`
- Test: `frontend/src/pages/Configuracoes.test.jsx`

**Interfaces:**
- Consumes: `/api/configuracoes`, `/api/configuracoes/cnpj/:cnpj`, `/api/configuracoes/estados`

- [ ] **Step 1: Escrever teste de renderização e interação para Configuracoes.test.jsx**

Testar carregamento inicial de dados, busca de CNPJ via mock de API, seleção de UF e submissão com sucesso.

- [ ] **Step 2: Rodar teste para verificar falha**

Executar: `npm --prefix frontend test src/pages/Configuracoes.test.jsx`
Esperado: FAIL.

- [ ] **Step 3: Implementar a página Configuracoes.jsx**

Criar a página com os 3 cards, autocompletar de CNPJ, seletor das 27 UFs com badge de SEFAZ e salvamento de configurações.

- [ ] **Step 4: Atualizar App.jsx, Sidebar.jsx e NotasFiscais.jsx**

Adicionar rota `/configuracoes`, item no menu lateral e link de atalho na página de notas fiscais.

- [ ] **Step 5: Rodar testes do frontend para verificar aprovação**

Executar: `npm run test:frontend`
Esperado: PASS (todos os testes verdes).

- [ ] **Step 6: Commit**

`git add frontend/src/pages/Configuracoes.jsx frontend/src/App.jsx frontend/src/components/Sidebar.jsx frontend/src/pages/NotasFiscais.jsx frontend/src/pages/Configuracoes.test.jsx`  
`git commit -m "feat(frontend): adiciona pagina de configuracoes do MEI com busca CNPJ e sincronizacao SEFAZ"`

---

### Task 6: Verificação Completa e Integração Final

**Files:**
- Review: Todos os arquivos criados e modificados

- [ ] **Step 1: Executar a suíte de testes global**

Executar `npm test` na raiz do projeto (backend, frontend e ai-service).
Esperado: Todos os testes das 3 frentes aprovados com 100% de sucesso.

- [ ] **Step 2: Testar fluxo completo de ponta a ponta**

Executar teste funcional via script verificando:
1. Atualização do MEI para estado de MG (`UF: MG`, `cUF: 31`, `Belo Horizonte`)
2. Emissão de NF-e e conferência de que a chave inicia com `31...` e o DANFE referencia SEFAZ-MG
3. Consulta das configurações via ferramenta MCP simulada.

- [ ] **Step 3: Commit final de encerramento**

`git commit --allow-empty -m "chore: homologacao completa da integracao SEFAZ 27 UFs e configuracoes MEI"`

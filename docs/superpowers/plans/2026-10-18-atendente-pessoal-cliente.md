# Agente Pessoal de Atendimento ao Cliente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que cada MEI crie e configure (via UI ou via seu Assistente de IA) um Agente Pessoal de Atendimento ao Cliente ultra-rápido, com ajuste de tom, ferramentas MCP restritas e limites financeiros determinísticos (faixa de orçamento em R$ e desconto máximo) para fechar negócios diretamente com o cliente.

**Architecture:** Arquitetura desacoplada REST ↔ MCP com separação estrita de escopos JWT (`assistente:operator` para o dono do MEI configurar os limites do atendente; `atendente:customer` para o atendente operar apenas ferramentas autorizadas com guardrails matemáticos no Backend Express) e pool HTTP/2 persistente no `ai-service` para alta densidade no Railway.

**Tech Stack:** Node.js + Express + MySQL (`backend/`), Python 3 + FastAPI + FastMCP + Google GenAI SDK (`ai-service/`), React 18 + Tailwind CSS (`frontend/`), Jest & Pytest.

**Spec:** `docs/superpowers/specs/2026-10-18-atendente-pessoal-cliente-design.md`

## Global Constraints

- Paridade Total REST ↔ MCP: toda capacidade operacional deve existir na API REST do Backend Express e no MCP Server (`ai-service/mcp_server/server.py`).
- Isolamento Multi-Tenant absoluto por `usuario_id` extraído do JWT: nenhuma tool MCP pode expor `usuario_id` ou `tenant_id` em seus argumentos.
- Guardrails Financeiros Determinísticos: limites de orçamento (`orcamento_min_valor` a `orcamento_max_valor`) e `desconto_max_percentual` são validados matematicamente no Backend Express antes de aprovar qualquer orçamento.

## Review Focus

1. **Orçamento fora da faixa (R$) via Atendente:** Quando o cliente solicita fechar um orçamento cujo total é menor que `orcamento_min_valor` ou maior que `orcamento_max_valor`, o sistema nunca deve salvá-lo como `APROVADO`, mas sim como `ENVIADO` (pendente de aprovação do MEI), informando o motivo na resposta.
2. **Desconto acima do teto configurado:** Quando o desconto solicitado ultrapassa `desconto_max_percentual`, o backend deve rejeitar (HTTP 400) ou limitar ao teto autorizado.
3. **Tentativa de uso de ferramenta desativada pelo MEI:** Se `permite_agendar` ou `permite_fechar_orcamento` estiver `false` (`0`), nem o Orquestrador deve expor a tool ao LLM nem o Backend Express deve permitir a mutação com token `scope: 'atendente:customer'`.
4. **Isolamento de Dados Sensíveis do MEI:** Um token com `scope: 'atendente:customer'` jamais pode acessar movimentações de caixa, notas fiscais ou configurações fiscais do MEI.
5. **Configuração via Assistente Copiloto:** O MEI deve conseguir alterar parcial ou totalmente os limites do seu atendente conversando com o Assistente (`configurar_atendente_cliente`) sem perder as demais configurações já salvas.

---

### Task 1: Repositório e Regras de Negócio de Configuração e Operação do Atendente (`backend/`)

**Files:**
- Create: `backend/src/repositories/atendenteRepository.js`
- Create: `backend/src/services/atendenteService.js`
- Test: `backend/tests/atendenteService.test.js`

**Interfaces:**
- Consumes: `backend/src/config/database.js` (`pool.execute`), `backend/src/services/orcamentoService.js`
- Produces:
  - `atendenteRepository.obterOuCriarConfig(usuario_id)`
  - `atendenteRepository.atualizarConfig(usuario_id, dados)`
  - `atendenteRepository.buscarConfigPorSlug(slug_publico)`
  - `atendenteService.obterConfiguracao(usuario_id)`
  - `atendenteService.atualizarConfiguracao(usuario_id, payload)`
  - `atendenteService.proporOuFecharOrcamentoCliente(usuario_id, { nome_cliente, telefone_cliente, itens, desconto, fechar_automaticamente })`

- [ ] **Step 1: Write the failing test in `backend/tests/atendenteService.test.js`**

Testar:
1. `atualizarConfiguracao` valida `tom_voz` (`FORMAL`, `AMIGAVEL`, `DESCONTRAIDO`, `CONSULTIVO`, `DIRETO`) e garante `orcamento_min_valor <= orcamento_max_valor` e `0 <= desconto_max_percentual <= 100`.
2. `proporOuFecharOrcamentoCliente` aprova automaticamente (`status: 'APROVADO'`) quando `permite_fechar_orcamento = 1`, `fechar_automaticamente = true`, desconto dentro de `desconto_max_percentual` e `total` entre `orcamento_min_valor` e `orcamento_max_valor`.
3. `proporOuFecharOrcamentoCliente` mantém `status: 'ENVIADO'` e `aprovado_automaticamente: false` quando o valor total ultrapassa `orcamento_max_valor` ou fica abaixo de `orcamento_min_valor`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:backend -- tests/atendenteService.test.js`
Expected: FAIL (`Cannot find module '../src/services/atendenteService'`)

- [ ] **Step 3: Implement `atendenteRepository.js` and `atendenteService.js`**

Criar auto-migração segura (`CREATE TABLE IF NOT EXISTS atendente_configuracoes`) no repositório e implementar as regras determinísticas de faixa de valor e desconto no `atendenteService.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:backend -- tests/atendenteService.test.js`
Expected: PASS

---

### Task 2: Rotas e Controllers REST do Atendente (`backend/`)

**Files:**
- Create: `backend/src/controllers/atendenteController.js`
- Create: `backend/src/routes/atendenteRoutes.js`
- Modify: `backend/src/app.js`
- Test: `backend/tests/atendenteRoutes.test.js`

**Interfaces:**
- Consumes: `atendenteService`
- Produces:
  - `GET /api/atendente/config`
  - `PUT /api/atendente/config`
  - `GET /api/atendente/operacional/catalogo`
  - `GET /api/atendente/operacional/disponibilidade`
  - `POST /api/atendente/operacional/agendar`
  - `POST /api/atendente/operacional/orcamento`
  - `POST /api/atendente/publico/:slug/mensagem`

- [ ] **Step 1: Write the failing integration tests in `backend/tests/atendenteRoutes.test.js`**

Testar os endpoints `/api/atendente/config` (leitura e atualização de tom/limites pelo MEI ou Assistente) e `/api/atendente/operacional/*` (bloqueio quando permissão MCP está desativada e sucesso dentro da alçada).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:backend -- tests/atendenteRoutes.test.js`
Expected: FAIL (404 Not Found nas rotas `/api/atendente/*`)

- [ ] **Step 3: Implement `atendenteController.js`, `atendenteRoutes.js` and mount in `backend/src/app.js`**

Montar `app.use('/api/atendente', atendenteRoutes)` em `backend/src/app.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:backend -- tests/atendenteRoutes.test.js`
Expected: PASS

---

### Task 3: Pool HTTP Persistente, Tools MCP do Atendente e Orquestração Multi-Persona (`ai-service/`)

**Files:**
- Modify: `ai-service/mcp_server/server.py`
- Modify: `ai-service/app/llm/prompts.py`
- Modify: `ai-service/app/llm/orchestrator.py`
- Modify: `ai-service/app/main.py`
- Test: `ai-service/tests/test_atendente_mcp.py`

**Interfaces:**
- Consumes: Rotas `/api/atendente/*` do Backend Express
- Produces:
  - Tools para o Assistente do MEI: `obter_configuracoes_atendente()`, `configurar_atendente_cliente(...)`
  - Tools restritas para o Atendente do Cliente: `atendente_consultar_catalogo()`, `atendente_verificar_disponibilidade(data)`, `atendente_realizar_agendamento(...)`, `atendente_fechar_orcamento_cliente(...)`
  - Filtro de tools por `allowed_tools` e `agent_config` no `Orchestrator.responder(...)` e endpoint `POST /chat/atendente` no `ai-service/app/main.py`.

- [ ] **Step 1: Write the failing tests in `ai-service/tests/test_atendente_mcp.py`**

Testar:
1. `obter_configuracoes_atendente` e `configurar_atendente_cliente` no `server.py`.
2. `atendente_fechar_orcamento_cliente` respeitando retorno de alçada automática vs encaminhamento ao MEI.
3. Filtragem estrita de `FunctionDeclaration` no `Orchestrator` quando `agent_config` restringe capacidades do atendente.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:ai`
Expected: FAIL (`ImportError` ou funções ausentes em `mcp_server.server`)

- [ ] **Step 3: Implement persistent `httpx.AsyncClient` pool, MCP tools in `server.py`, and Attendant persona in `orchestrator.py` & `main.py`**

Reutilizar cliente `httpx.AsyncClient` com keep-alive para reduzir latência no Railway, registrar as tools no `server.py` e adicionar suporte a `agent_config` no `orchestrator.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:ai`
Expected: PASS

---

### Task 4: Painel de Configuração e Simulador/Link Público do Atendente no Frontend (`frontend/`)

**Files:**
- Create: `frontend/src/pages/AtendenteIA.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Layout.jsx`

**Interfaces:**
- Consumes: `GET /api/atendente/config`, `PUT /api/atendente/config`, `POST /api/atendente/publico/:slug/mensagem`
- Produces: Tela de configuração de Tom de Voz, Capacidades MCP, Limites de Orçamento (R$ mín/máx e % desconto) e Simulador de Chat ao vivo com o Atendente do Cliente.

- [ ] **Step 1: Create `frontend/src/pages/AtendenteIA.jsx` and wire route in `App.jsx` & `Layout.jsx`**
- [ ] **Step 2: Run full test suite (`npm test`) to verify zero regressions across Backend, AI-Service, and Frontend**

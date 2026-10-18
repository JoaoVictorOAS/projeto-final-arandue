# Limites de Agendamento, Transbordo Humano e Notificação Mobile ("Atendimento Pendente") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task with TDD (`superpowers:test-driven-development`).

**Goal:** Permitir que o MEI defina limites de antecedência para agendamentos (ex: mínimo de 1 ou 3 dias de antecedência) e regras de retorno ao humano (transbordo automático quando qualquer solicitação fugir da capacidade/horário/alçada do agente), gerando registro e notificação no mobile ("Atendimento pendente") com total paridade REST ↔ MCP.

**Architecture:**
- **Backend (`backend/`):**
  - Evolução de `atendente_configuracoes` com `antecedencia_minima_dias`, `antecedencia_maxima_dias`, `transbordo_automatico` e `condicoes_retorno_humano`.
  - Nova tabela `atendimentos_pendentes` em `atendenteRepository.js` para armazenar os pedidos de transbordo humano (`nome_cliente`, `telefone_cliente`, `motivo`, `resumo_conversa`, `status`, `lido_mobile`).
  - Guardrail determinístico em `atendenteService.js`:
    - `consultarDisponibilidadeAgenda` e `agendarAtendimentoCliente` validam se a data respeita `antecedencia_minima_dias` e `antecedencia_maxima_dias`, além do expediente (`horario_inicio` a `horario_fim`) e conflito de agenda.
    - Caso o agendamento solicitado pelo cliente viole a antecedência mínima, caia fora dos horários disponíveis ou o orçamento extrapole a alçada sem fechamento automático (quando `transbordo_automatico = true`), o serviço registra automaticamente um **Atendimento Pendente** para o MEI humano.
    - Endpoint dedicado `POST /api/atendente/operacional/solicitar-humano` para que o atendente acione o transbordo em qualquer situação fora de sua capacidade.
    - Endpoints de gestão do MEI: `GET /api/atendente/pendencias` e `PATCH /api/atendente/pendencias/:id/status`.
- **AI-Service & MCP (`ai-service/`):**
  - Atualização de `configurar_atendente_cliente` no `mcp_server/server.py` com `antecedencia_minima_dias`, `antecedencia_maxima_dias`, `transbordo_automatico` e `condicoes_retorno_humano`.
  - Novas tools MCP para o Assistente do MEI: `listar_atendimentos_pendentes` e `resolver_atendimento_pendente`.
  - Nova tool MCP para o Atendente do Cliente: `atendente_solicitar_humano`.
  - Atualização de `build_attendant_system_prompt` em `prompts.py` e `main.py` para instruir o atendente sobre a antecedência mínima de agendamento e as regras de retorno ao humano.
- **Frontend & Mobile (`frontend/`):**
  - Notificação mobile/web de **"Atendimento pendente"** em `Layout.jsx` e badge em `Sidebar.jsx` (com disparo na API nativa de Notificações quando suportado no mobile/WebView).
  - Seção de **Limites de Agendamento & Retorno ao Humano** e **Fila de Atendimentos Pendentes** em `AtendenteIA.jsx`.

---

### Task 1: Repositório, Serviço e Rotas Backend (Limites de Agendamento + Transbordo Humano)

**Files:**
- Modify: `backend/src/repositories/atendenteRepository.js`
- Modify: `backend/src/services/atendenteService.js`
- Modify: `backend/src/controllers/atendenteController.js`
- Modify: `backend/src/routes/atendenteRoutes.js`
- Modify: `backend/tests/atendenteService.test.js`
- Modify: `backend/tests/atendenteRoutes.test.js`

**Interfaces:**
- Consumes: `atendente_configuracoes`, `atendimentos_pendentes`
- Produces:
  - `PUT /api/atendente/config` suportando `antecedencia_minima_dias`, `antecedencia_maxima_dias`, `transbordo_automatico`, `condicoes_retorno_humano`
  - `POST /api/atendente/operacional/solicitar-humano`
  - `GET /api/atendente/pendencias`
  - `PATCH /api/atendente/pendencias/:id/status`

- [ ] **Step 1: Write failing tests in `backend/tests/atendenteService.test.js` and `backend/tests/atendenteRoutes.test.js`**
- [ ] **Step 2: Run backend tests to verify RED**
- [ ] **Step 3: Implement repository, service, controller and routes**
- [ ] **Step 4: Run backend tests to verify GREEN**

---

### Task 2: Paridade MCP Server, Prompts e Orquestrador (`ai-service/`)

**Files:**
- Modify: `ai-service/mcp_server/server.py`
- Modify: `ai-service/app/llm/prompts.py`
- Modify: `ai-service/app/llm/orchestrator.py`
- Modify: `ai-service/app/main.py`
- Modify: `ai-service/tests/test_atendente_mcp.py`

**Interfaces:**
- Consumes: `/api/atendente/config`, `/api/atendente/operacional/solicitar-humano`, `/api/atendente/pendencias`
- Produces:
  - MCP Tools (MEI Assistant): `configurar_atendente_cliente` (com limites de antecedência e retorno humano), `listar_atendimentos_pendentes`, `resolver_atendimento_pendente`
  - MCP Tool (Customer Attendant): `atendente_solicitar_humano`

- [ ] **Step 1: Write failing tests in `ai-service/tests/test_atendente_mcp.py`**
- [ ] **Step 2: Run pytest to verify RED**
- [ ] **Step 3: Implement MCP tools, prompt rules and `/chat/atendente` wiring**
- [ ] **Step 4: Run pytest to verify GREEN**

---

### Task 3: Interface de Limites de Agendamento, Fila de Transbordo e Notificação Mobile ("Atendimento pendente") (`frontend/`)

**Files:**
- Modify: `frontend/src/pages/AtendenteIA.jsx`
- Modify: `frontend/src/components/Layout.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/pages/AtendenteIA.test.jsx`

**Interfaces:**
- Consumes: `GET /api/atendente/config`, `PUT /api/atendente/config`, `GET /api/atendente/pendencias`, `PATCH /api/atendente/pendencias/:id/status`
- Produces: Configuração de antecedência mínima/máxima e condições de retorno ao humano, fila de "Atendimento pendente" com ação de conclusão/WhatsApp e notificação flutuante mobile ("Atendimento pendente").

- [ ] **Step 1: Write failing frontend tests in `frontend/src/pages/AtendenteIA.test.jsx`**
- [ ] **Step 2: Run vitest to verify RED**
- [ ] **Step 3: Implement UI controls, pending queue and mobile notification banner**
- [ ] **Step 4: Run full test suite (`npm test`) to verify GREEN**

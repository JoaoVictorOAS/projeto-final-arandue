# Geração de Áudio (TTS), Ajuste de Voz e Modos de Retorno Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar síntese de voz (TTS) no servidor com vozes neurais brasileiras ajustáveis (Francisca, Antonio e Thalita), três modos de retorno configuráveis (Apenas Texto, Apenas Áudio e Ambos), envio de áudio nativo (PTT) no WhatsApp e player de áudio com transcrição colapsável na Web.

**Architecture:** O microserviço FastAPI (`ai-service`) sintetiza áudio MP3 via `edge-tts` e expõe `POST /audio/sintetizar`. O Gateway Express (`backend`) consome a síntese quando a preferência do MEI for `audio` ou `ambos`, armazena os bytes no MySQL (`mensagens.audio_base64`), despacha notas de voz PTT pelo Baileys no WhatsApp e entrega o áudio no Chat Web para reprodução no player customizado com transcrição sob demanda.

**Tech Stack:** Python 3.12, FastAPI, `edge-tts`, Node.js Express, `@whiskeysockets/baileys`, MySQL 8.x, React 19, Tailwind CSS.

**Spec:** [`docs/superpowers/specs/2026-10-19-assistente-audio-tts-design.md`](file:///home/JoaoVictor/projetos/projeto-final-arandue/docs/superpowers/specs/2026-10-19-assistente-audio-tts-design.md)

## Global Constraints

- Isolamento multi-tenant obrigatório por `usuario_id` via JWT; ferramentas MCP nunca recebem `usuario_id`.
- Paridade total entre API REST e ferramentas do MCP (`server.py`).
- Consistência de temas no Frontend: uso estrito de variáveis CSS (`var(--bg-surface)`, `var(--border-color)`, `var(--color-primary)`, `badge-theme-subtle`), sem classes Tailwind de cores estáticas.
- Testes automatizados obrigatórios (TDD: RED -> GREEN -> REFACTOR) para backend (Jest), ai-service (Pytest) e frontend (Vitest).

---

### Task 1: Microserviço `ai-service` — Motor TTS (`edge-tts`) e Endpoint `POST /audio/sintetizar`

**Files:**
- Create: `ai-service/app/tts/engine.py`
- Modify: `ai-service/requirements.txt`
- Modify: `ai-service/app/main.py:410-460`
- Test: `ai-service/tests/test_tts_engine.py`

**Interfaces:**
- Produces: `POST /audio/sintetizar` (headers: `X-Internal-Secret`, body: `{ texto: str, voz: str }`, returns `{ sucesso: bool, audio_base64: str, mime_type: str, duracao_estimada_s: float, voz_utilizada: str }`).

- [ ] **Step 1: Instalar dependência `edge-tts` no ambiente do microserviço e registrar no requirements.txt**
  Adicionar `edge-tts>=7.0.0` no arquivo `ai-service/requirements.txt` e rodar `.venv/bin/pip install edge-tts`.

- [ ] **Step 2: Escrever o teste que falha para o motor de TTS (RED)**
  Criar `ai-service/tests/test_tts_engine.py` testando a sanitização de markdown e o endpoint `/audio/sintetizar`:
  ```python
  import pytest
  from httpx import AsyncClient
  from app.main import app
  from app.tts.engine import limpar_texto_para_tts

  def test_limpar_texto_para_tts():
      texto_md = "Olá **João**! Veja o link [aqui](http://exemplo.com) e o código `SELECT * FROM caixa`."
      limpo = limpar_texto_para_tts(texto_md)
      assert "**" not in limpo
      assert "[" not in limpo
      assert "`" not in limpo
      assert "Olá João! Veja o link aqui" in limpo

  @pytest.mark.asyncio
  async def test_endpoint_sintetizar_audio_sucesso():
      async with AsyncClient(app=app, base_url="http://test") as ac:
          resp = await ac.post(
              "/audio/sintetizar",
              headers={"X-Internal-Secret": "dev-internal-secret"},
              json={"texto": "Teste de voz do assistente Aranduê.", "voz": "pt-BR-FranciscaNeural"}
          )
          assert resp.status_code == 200
          dados = resp.json()
          assert dados["sucesso"] is True
          assert "audio_base64" in dados
          assert dados["mime_type"] == "audio/mp3"
          assert dados["voz_utilizada"] == "pt-BR-FranciscaNeural"
  ```

- [ ] **Step 3: Executar o teste para verificar a falha (Verify RED)**
  Executar: `.venv/bin/pytest ai-service/tests/test_tts_engine.py`
  Esperado: FAIL com `ModuleNotFoundError: No module named 'app.tts'`.

- [ ] **Step 4: Implementar o módulo `ai-service/app/tts/engine.py` e o endpoint em `ai-service/app/main.py`**
  Criar `ai-service/app/tts/engine.py` com sanitização regex para markdown e síntese via `edge_tts.Communicate`.
  Criar schemas `SintetizarAudioRequest` e `SintetizarAudioResponse` e expor `POST /audio/sintetizar` protegido por `verify_internal_secret`.

- [ ] **Step 5: Executar o teste para verificar o sucesso (Verify GREEN)**
  Executar: `.venv/bin/pytest ai-service/tests/test_tts_engine.py`
  Esperado: PASS.

- [ ] **Step 6: Commit**
  ```bash
  git add ai-service/requirements.txt ai-service/app/tts/engine.py ai-service/app/main.py ai-service/tests/test_tts_engine.py
  git commit -m "feat(ai-service): adicionar endpoint POST /audio/sintetizar com edge-tts"
  ```

---

### Task 2: Banco de Dados & Migração 016 (`mei_configuracoes` e `mensagens`)

**Files:**
- Create: `backend/src/database/migrations/016_voz_e_modos_audio_assistente.sql`
- Modify: `backend/src/database/schema.sql:200-220, 400-425`
- Test: `backend/tests/database.test.js`

**Interfaces:**
- Produces: Colunas `preferencia_resposta ENUM('texto', 'audio', 'ambos')` e `voz_assistente VARCHAR(50)` em `mei_configuracoes`, e `audio_base64 MEDIUMTEXT NULL` em `mensagens`.

- [ ] **Step 1: Criar o arquivo de migração `backend/src/database/migrations/016_voz_e_modos_audio_assistente.sql`**
  ```sql
  -- Migração 016: Suporte a Voz Configurável e Modo Ambos de Resposta
  ALTER TABLE mei_configuracoes
      MODIFY COLUMN preferencia_resposta ENUM('texto', 'audio', 'ambos') NOT NULL DEFAULT 'texto',
      ADD COLUMN voz_assistente VARCHAR(50) NOT NULL DEFAULT 'pt-BR-FranciscaNeural' AFTER preferencia_resposta;

  ALTER TABLE mensagens
      ADD COLUMN audio_base64 MEDIUMTEXT NULL AFTER midia_mime_type;
  ```

- [ ] **Step 2: Atualizar o arquivo canônico `backend/src/database/schema.sql`**
  Atualizar a definição da tabela `mei_configuracoes` e `mensagens` com os novos campos.

- [ ] **Step 3: Executar a migração no banco de dados local**
  Executar: `npm run db:migrate`.
  Esperado: `✓ Migração aplicada: 016_voz_e_modos_audio_assistente.sql`.

- [ ] **Step 4: Executar testes de banco para verificar integridade**
  Executar: `npm --prefix backend test -- tests/database.test.js`.
  Esperado: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/database/migrations/016_voz_e_modos_audio_assistente.sql backend/src/database/schema.sql
  git commit -m "feat(db): migracao 016 para suporte a voz_assistente, modo ambos e audio_base64"
  ```

---

### Task 3: Backend Express (`configuracoesController`) e Paridade MCP Server (`server.py`)

**Files:**
- Modify: `backend/src/controllers/configuracoesController.js:40-60, 80-95, 120-135, 180-250, 345-370`
- Modify: `ai-service/mcp_server/server.py:270-325`
- Test: `backend/tests/integration/configuracoes.test.js`
- Test: `ai-service/tests/test_mcp_configuracoes.py`

**Interfaces:**
- Consumes: Migração 016.
- Produces: `GET /api/configuracoes` e `PUT /api/configuracoes` suportando `preferencia_resposta` (`texto`, `audio`, `ambos`) e `voz_assistente`; MCP `@mcp_server_app.tool() atualizar_configuracoes_mei` espelhando os parâmetros.

- [ ] **Step 1: Escrever testes que falham para modo 'ambos' e 'voz_assistente' (RED)**
  Em `backend/tests/integration/configuracoes.test.js`:
  - Testar persistência de `preferencia_resposta: 'ambos'` e `voz_assistente: 'pt-BR-AntonioNeural'`.
  Em `ai-service/tests/test_mcp_configuracoes.py`:
  - Testar chamada da tool `atualizar_configuracoes_mei` repassando `preferencia_resposta="ambos"` e `voz_assistente="pt-BR-ThalitaNeural"`.

- [ ] **Step 2: Executar testes para verificar a falha (Verify RED)**
  Executar:
  - `npm --prefix backend test -- tests/integration/configuracoes.test.js`
  - `.venv/bin/pytest ai-service/tests/test_mcp_configuracoes.py`
  Esperado: FAIL com asserções de `voz_assistente` ou parâmetros desconhecidos.

- [ ] **Step 3: Implementar suporte em `configuracoesController.js` e `ai-service/mcp_server/server.py`**
  - Em `configuracoesController.js`:
    - Sanitizar `preferencia_resposta`: aceitar `'texto'`, `'audio'` ou `'ambos'`.
    - Sanitizar `voz_assistente`: aceitar `'pt-BR-FranciscaNeural'`, `'pt-BR-AntonioNeural'`, `'pt-BR-ThalitaNeural'` com fallback para `'pt-BR-FranciscaNeural'`.
    - Incluir nos inserts, updates e retornos da API.
  - Em `server.py`:
    - Adicionar `voz_assistente: Optional[str] = None` em `atualizar_configuracoes_mei` e repassar para a API REST.

- [ ] **Step 4: Executar testes para verificar sucesso (Verify GREEN)**
  Executar:
  - `npm --prefix backend test -- tests/integration/configuracoes.test.js`
  - `.venv/bin/pytest ai-service/tests/test_mcp_configuracoes.py`
  Esperado: PASS em ambos.

- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/controllers/configuracoesController.js ai-service/mcp_server/server.py backend/tests/integration/configuracoes.test.js ai-service/tests/test_mcp_configuracoes.py
  git commit -m "feat(configuracoes): paridade REST e MCP para modo ambos e voz_assistente"
  ```

---

### Task 4: Pipeline de Síntese de Áudio (`assistenteService`) e Envio PTT no WhatsApp (`whatsappService`)

**Files:**
- Modify: `backend/src/services/aiServiceClient.js`
- Modify: `backend/src/services/assistenteService.js`
- Modify: `backend/src/repositories/conversaRepository.js`
- Modify: `backend/src/services/whatsappService.js`
- Test: `backend/tests/unit/whatsappService.test.js`
- Test: `backend/tests/assistente.test.js`

**Interfaces:**
- Consumes: `ai-service POST /audio/sintetizar`.
- Produces: Mensagens salvas com `audio_base64`, áudio enviado como PTT via Baileys no WhatsApp.

- [ ] **Step 1: Escrever testes unitários que falham para o envio PTT no WhatsApp (RED)**
  Em `backend/tests/unit/whatsappService.test.js`:
  - Testar envio de `{ audio: Buffer, mimetype: 'audio/mp4; codecs=opus', ptt: true }` quando a preferência do MEI for `audio`.
  - Testar envio de áudio seguido de texto quando a preferência for `ambos`.

- [ ] **Step 2: Executar teste do WhatsApp para verificar falha (Verify RED)**
  Executar: `npm --prefix backend test -- tests/unit/whatsappService.test.js`.
  Esperado: FAIL.

- [ ] **Step 3: Implementar `sintetizarAudio` no `aiServiceClient.js`, integrar no `assistenteService.js` e atualizar `whatsappService.js`**
  - Em `aiServiceClient.js`: adicionar `sintetizarAudio({ texto, voz })` chamando `POST /audio/sintetizar`.
  - Em `conversaRepository.js`: incluir coluna `audio_base64` no insert e no update de mensagens.
  - Em `assistenteService.js`: ao obter a resposta do assistente, se a preferência for `audio` ou `ambos`, chamar `sintetizarAudio`, salvar `audio_base64` e definir `tipo_midia = (preferencia === 'audio') ? 'audio' : 'texto'`.
  - Em `whatsappService.js`: verificar se há `resultado.mensagem.audio_base64`. Se houver e o modo for `audio`, enviar via `sock.sendMessage(jid, { audio: Buffer.from(audio_base64, 'base64'), mimetype: 'audio/mp4; codecs=opus', ptt: true })`. Se for `ambos`, enviar áudio e texto.

- [ ] **Step 4: Executar testes para verificar sucesso (Verify GREEN)**
  Executar:
  - `npm --prefix backend test -- tests/unit/whatsappService.test.js`
  - `npm --prefix backend test -- tests/assistente.test.js`
  Esperado: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/services/aiServiceClient.js backend/src/services/assistenteService.js backend/src/repositories/conversaRepository.js backend/src/services/whatsappService.js backend/tests/unit/whatsappService.test.js backend/tests/assistente.test.js
  git commit -m "feat(assistente): sintese de audio e envio nativo de nota de voz PTT no WhatsApp"
  ```

---

### Task 5: Frontend — Seletor de 3 Modos e Escolha de Voz com Teste em Configurações (`Configuracoes.jsx`)

**Files:**
- Modify: `frontend/src/pages/Configuracoes.jsx`
- Test: `frontend/src/pages/Configuracoes.test.jsx`

**Interfaces:**
- Consumes: `GET /api/configuracoes`, `PUT /api/configuracoes`, `POST /api/assistente/audio/sintetizar` (ou reprodução demonstrativa).
- Produces: UI para escolher entre Texto, Áudio e Ambos, e entre as vozes Francisca, Antonio e Thalita, com botão de demonstrar voz.

- [ ] **Step 1: Escrever teste no frontend para o novo seletor de 3 modos e seletor de vozes (RED)**
  Em `frontend/src/pages/Configuracoes.test.jsx`:
  - Verificar renderização dos 3 modos de resposta: Apenas Texto, Apenas Áudio e Texto e Áudio (Ambos).
  - Verificar renderização das vozes: Francisca, Antonio e Thalita.
  - Testar seleção de modo "Ambos" e voz "Antonio", e verificar payload enviado em `api.put`.

- [ ] **Step 2: Executar teste para verificar falha (Verify RED)**
  Executar: `npm --prefix frontend test -- src/pages/Configuracoes.test.jsx`.
  Esperado: FAIL.

- [ ] **Step 3: Atualizar `Configuracoes.jsx`**
  - Adicionar `voz_assistente` no estado inicial do formulário (`pt-BR-FranciscaNeural`).
  - Atualizar card de Preferência do Assistente com 3 opções em grid responsivo.
  - Adicionar grupo de seleção de Voz do Assistente com cards estilizados (`var(--bg-surface)`, `var(--color-primary)`).
  - Adicionar botão "Ouvir demonstração" ao lado de cada voz (utilizando prévia de áudio sintetizada ou áudio de exemplo da voz).

- [ ] **Step 4: Executar teste para verificar sucesso (Verify GREEN)**
  Executar: `npm --prefix frontend test -- src/pages/Configuracoes.test.jsx`.
  Esperado: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/pages/Configuracoes.jsx frontend/src/pages/Configuracoes.test.jsx
  git commit -m "feat(frontend): seletores de 3 modos de retorno e vozes neurais em Configuracoes"
  ```

---

### Task 6: Frontend — Player de Áudio Interativo e Transcrição Colapsável no Chat (`Assistente.jsx` & `ChatContext.jsx`)

**Files:**
- Modify: `frontend/src/context/ChatContext.jsx`
- Modify: `frontend/src/pages/Assistente.jsx`
- Test: `frontend/src/pages/Assistente.test.jsx`

**Interfaces:**
- Consumes: Mensagens da API contendo `audio_base64`, `tipo_midia`, `conteudo`, `transcricao_audio`.
- Produces: Player de áudio moderno no balão da mensagem, botão "Ver transcrição" colapsável quando o modo for "Apenas Áudio", e reprodução automática ao receber resposta.

- [ ] **Step 1: Escrever teste no frontend para o player de áudio e botão de transcrição (RED)**
  Em `frontend/src/pages/Assistente.test.jsx`:
  - Mock de mensagem do assistente com `tipo_midia: 'audio'` e `audio_base64: 'fake-audio'`.
  - Verificar presença do player de áudio e do botão "Ver transcrição".
  - Testar clique em "Ver transcrição" para expandir e colapsar o texto da resposta.

- [ ] **Step 2: Executar teste para verificar falha (Verify RED)**
  Executar: `npm --prefix frontend test -- src/pages/Assistente.test.jsx`.
  Esperado: FAIL.

- [ ] **Step 3: Implementar o componente de player de áudio e toggle de transcrição**
  - Em `Assistente.jsx`:
    - Quando `msg.audio_base64` ou `msg.tipo_midia === 'audio'`:
      - Renderizar player de áudio com botão play/pause, controle de progresso e duração estimada.
      - Se for modo "Apenas Áudio" (`msg.tipo_midia === 'audio'` e não houver layout duplo): colapsar o texto sob o botão interativo `[📄 Ver transcrição]` / `[Ocultar transcrição]`.
      - Se for modo "Ambos": exibir o player de áudio e o texto formatado integralmente.
      - Auto-play: se a mensagem acabou de ser concluída via polling/resposta e a preferência for `audio` ou `ambos`, iniciar reprodução automaticamente.

- [ ] **Step 4: Executar testes do assistente para verificar sucesso (Verify GREEN)**
  Executar: `npm --prefix frontend test -- src/pages/Assistente.test.jsx`.
  Esperado: PASS.

- [ ] **Step 5: Executar todas as suítes de teste para verificação final**
  Executar:
  - `npm run test:backend`
  - `npm run test:frontend`
  - `.venv/bin/pytest ai-service/tests/test_tts_engine.py ai-service/tests/test_mcp_configuracoes.py`
  Esperado: Todos os testes verdes.

- [ ] **Step 6: Commit**
  ```bash
  git add frontend/src/context/ChatContext.jsx frontend/src/pages/Assistente.jsx frontend/src/pages/Assistente.test.jsx
  git commit -m "feat(frontend): player de audio e transcricao colapsavel no chat do assistente"
  ```

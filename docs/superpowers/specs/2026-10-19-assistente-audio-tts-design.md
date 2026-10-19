# Design Doc: Geração de Áudio (TTS) com Seleção de Voz e Modos de Retorno (Texto, Áudio e Ambos)

## 1. Visão Geral e Objetivos

Este documento especifica a arquitetura e os contratos para suporte completo a respostas em áudio sintetizadas no servidor (TTS - Text-to-Speech), seleção de voz do assistente e personalização do formato de entrega em três modos:
1. **Apenas Texto (Padrão):** O assistente responde exclusivamente por texto.
2. **Apenas Áudio:** O assistente gera e envia o áudio da resposta; o texto fica armazenado como transcrição (colapsada no chat web, e no WhatsApp é enviada uma nota de voz PTT nativa).
3. **Texto e Áudio (Ambos):** O assistente envia tanto o áudio quanto a mensagem de texto com as informações detalhadas.

Além disso, o usuário pode configurar sua preferência de voz entre opções neurais de alta fidelidade em português brasileiro (Francisca, Antonio e Thalita), com teste prévio da voz na tela de configurações.

---

## 2. Arquitetura e Fluxo de Dados

```
[Usuário Web / WhatsApp]
          │
          ▼
   [Backend Express] ─────────► [MySQL (mei_db)]
          │                     - mei_configuracoes (preferencia_resposta, voz_assistente)
          │                     - mensagens (audio_base64, tipo_midia, conteudo, transcricao_audio)
          ▼
   [ai-service (FastAPI)] ────► [Gemini 3.0 / RAG / MCP Tools]
          │
     (Gera Texto)
          │
          ▼
 [edge-tts / Google GenAI]
    (Sintetiza MP3)
          │
          ▼
   [Retorna Áudio]
          │
   ┌──────┴────────────────────────┐
   ▼                               ▼
[WhatsApp]                      [Web Chat]
(Áudio PTT nativo               (Player de Áudio customizado
 + Texto se 'ambos')            + Transcrição colapsável se 'audio')
```

---

## 3. Modelo de Dados e Migrações (MySQL)

### Migração `016_voz_e_modos_audio_assistente.sql`

```sql
-- 1. Ampliação do ENUM de preferência de resposta e inclusão de voz configurável
ALTER TABLE mei_configuracoes
    MODIFY COLUMN preferencia_resposta ENUM('texto', 'audio', 'ambos') NOT NULL DEFAULT 'texto',
    ADD COLUMN voz_assistente VARCHAR(50) NOT NULL DEFAULT 'pt-BR-FranciscaNeural' AFTER preferencia_resposta;

-- 2. Suporte a armazenamento do áudio sintetizado na tabela de mensagens
ALTER TABLE mensagens
    ADD COLUMN audio_base64 MEDIUMTEXT NULL AFTER midia_mime_type;
```

---

## 4. Microserviço de IA (`ai-service` - FastAPI)

### 4.1 Nova Dependência
- `edge-tts>=7.0.0` adicionada ao `requirements.txt`.

### 4.2 Vozes Oferecidas
1. `pt-BR-FranciscaNeural`: Feminina, natural e acolhedora (Padrão).
2. `pt-BR-AntonioNeural`: Masculina, profissional e corporativa.
3. `pt-BR-ThalitaNeural`: Feminina, jovem e dinâmica.

### 4.3 Endpoint `POST /audio/sintetizar`
- **Headers:** `X-Internal-Secret: <INTERNAL_SERVICE_SECRET>`
- **Request Body:**
  ```json
  {
    "texto": "Olá! Seu saldo em caixa é de R$ 1.500,00.",
    "voz": "pt-BR-FranciscaNeural"
  }
  ```
- **Processamento:**
  - Remove sintaxes do Markdown (blocos de código, asteriscos, títulos `#`, links) para garantir pronúncia fluida e natural.
  - Executa síntese assíncrona via `edge-tts.Communicate`.
  - Fallback: caso `edge-tts` falhe, tenta síntese alternativa ou retorna erro amigável.
- **Response Body:**
  ```json
  {
    "sucesso": true,
    "audio_base64": "SUQzBAAAAAAAI1RTU0U...",
    "mime_type": "audio/mp3",
    "duracao_estimada_s": 3.2,
    "voz_utilizada": "pt-BR-FranciscaNeural"
  }
  ```

---

## 5. Backend Gateway Express (`backend`)

### 5.1 `aiServiceClient.js`
- Adiciona o método `sintetizarAudio({ texto, voz })` chamando `POST /audio/sintetizar`.

### 5.2 `assistenteService.js`
- Ao processar mensagem concluída:
  - Busca as preferências do MEI em `mei_configuracoes` (`preferencia_resposta`, `voz_assistente`).
  - Se `preferencia_resposta` for `'audio'` ou `'ambos'`:
    - Chama `aiServiceClient.sintetizarAudio` passando o texto da resposta e a voz selecionada.
    - Salva na tabela `mensagens`:
      - Se `audio`: `tipo_midia = 'audio'`, `audio_base64 = dados.audio_base64`, `midia_mime_type = 'audio/mp3'`, `transcricao_audio = texto`, `conteudo = texto`.
      - Se `ambos`: `tipo_midia = 'texto'`, `audio_base64 = dados.audio_base64`, `midia_mime_type = 'audio/mp3'`, `conteudo = texto`.
  - Retorna `audio_base64` junto ao objeto da mensagem na resposta HTTP e no polling de status.

### 5.3 `whatsappService.js`
- Ao responder mensagens para usuários com número vinculado:
  - Se `preferencia_resposta === 'audio'`:
    - Envia áudio como nota de voz nativa:
      ```javascript
      await this.sock.sendMessage(jid, {
        audio: Buffer.from(resultado.mensagem.audio_base64, 'base64'),
        mimetype: 'audio/mp4; codecs=opus',
        ptt: true
      });
      ```
  - Se `preferencia_resposta === 'ambos'`:
    - Envia primeiro o áudio nativo PTT e em seguida o texto detalhado formatado.
  - Se `preferencia_resposta === 'texto'`:
    - Envia apenas a mensagem de texto tradicional.

### 5.4 Paridade Total MCP Server (`ai-service/mcp_server/server.py`)
- Em `atualizar_configuracoes_mei`:
  - `preferencia_resposta`: aceita `'texto'`, `'audio'` ou `'ambos'`.
  - `voz_assistente`: aceita o identificador da voz (ex: `'pt-BR-FranciscaNeural'`, `'pt-BR-AntonioNeural'`, `'pt-BR-ThalitaNeural'`).
- Em `obter_configuracoes_mei`:
  - Retorna os campos `preferencia_resposta` e `voz_assistente`.

---

## 6. Frontend SPA React

### 6.1 `Configuracoes.jsx`
- **Seletor de Modo de Resposta (3 Opções):**
  1. 📝 **Apenas Texto (Padrão):** Respostas em texto no chat e no WhatsApp.
  2. 🔊 **Apenas Áudio:** Respostas em áudio/voz com transcrição guardada.
  3. 💬🔊 **Texto e Áudio (Ambos):** Receba tanto o áudio falado quanto o texto na íntegra.
- **Seletor de Voz do Assistente:**
  - 👩 **Francisca** (Feminina, acolhedora e natural)
  - 👨 **Antonio** (Masculino, corporativo e seguro)
  - 👧 **Thalita** (Feminina, jovem e dinâmica)
- **Botão "Demonstrar Voz":** Reproduz um trecho curto gerado com a voz selecionada via API para que o usuário sinta a entonação antes de salvar.

### 6.2 `Assistente.jsx` & `ChatContext.jsx`
- Componente `<AudioPlayer mensagem={msg} />`:
  - Player moderno estilizado com as CSS variables do tema ativo (`var(--bg-surface)`, `var(--color-primary)`).
  - Controles: Reproduzir/Pausar, barra de progresso, tempo decorrido/total e controle de velocidade (1x, 1.25x, 1.5x).
- **Tratamento por Modo:**
  - Quando a mensagem for do tipo `'audio'` (modo "Apenas Áudio"): o player é o elemento principal; abaixo dele há um botão colapsável `[📄 Ver transcrição]` que exibe o texto ao ser clicado.
  - Quando a mensagem tiver áudio e texto (modo "Ambos"): o player de áudio fica no topo do balão e o texto já vem expandido.
  - Auto-play: se a mensagem acabou de chegar do assistente e a preferência for áudio/ambos, reproduz automaticamente.

---

## 7. Estratégia de Testes

1. **Testes do Backend (Jest):**
   - Validação e persistência dos 3 modos (`texto`, `audio`, `ambos`) e das vozes no `configuracoesController`.
   - Síntese e repasse de áudio em `assistenteService.test.js`.
   - Envio de PTT no `whatsappService.test.js` para `audio` e `ambos`.
2. **Testes do MCP Server (Pytest):**
   - Paridade de leitura e atualização de `voz_assistente` e `preferencia_resposta` em `test_mcp_configuracoes.py`.
   - Teste do endpoint `/audio/sintetizar` em `test_api_chat.py`.
3. **Testes do Frontend (Vitest):**
   - Seleção de modo e voz em `Configuracoes.test.jsx`.
   - Renderização do player de áudio e toggle de transcrição em `Assistente.test.jsx`.

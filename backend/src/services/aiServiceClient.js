const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'super_secreto_interno_arandue_2026';
const AI_SERVICE_TIMEOUT_MS = parseInt(process.env.AI_SERVICE_TIMEOUT_MS, 10) || 130000;

const aiServiceClient = {
  /**
   * Envia uma mensagem para o microserviço Python ai-service.
   * @param {Object} payload
   * @param {number} payload.tenant_id
   * @param {string} payload.tenant_token
   * @param {string} payload.mensagem
   * @param {Array} payload.historico
   * @returns {Promise<Object>}
   */
  async enviarMensagem({ tenant_id, tenant_token, mensagem, historico = [], midia = null }) {
    const url = `${AI_SERVICE_URL.replace(/\/$/, '')}/chat`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);

    try {
      const bodyPayload = {
        tenant_id,
        tenant_token,
        mensagem,
        historico
      };
      if (midia) {
        bodyPayload.midia = midia;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SERVICE_SECRET
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const erro = new Error(errorData.detail || `Falha no serviço de IA (status ${response.status})`);
        erro.statusCode = response.status === 401 ? 500 : (response.status || 503);
        throw erro;
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        const erroTimeout = new Error('Tempo limite excedido ao comunicar com o assistente IA');
        erroTimeout.statusCode = 504;
        throw erroTimeout;
      }
      throw err;
    }
  },

  /**
   * Transcreve áudio com alta fidelidade usando o modelo de IA.
   * @param {Object} payload
   * @param {string} payload.audio_base64
   * @param {string} [payload.mime_type='audio/ogg']
   * @returns {Promise<Object>}
   */
  async transcreverAudio({ audio_base64, mime_type = 'audio/ogg' }) {
    const url = `${AI_SERVICE_URL.replace(/\/$/, '')}/audio/transcrever`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SERVICE_SECRET
        },
        body: JSON.stringify({
          audio_base64,
          mime_type
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const erro = new Error(errorData.detail || `Falha na transcrição de áudio (status ${response.status})`);
        erro.statusCode = response.status || 500;
        throw erro;
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        const erroTimeout = new Error('Tempo limite excedido na transcrição do áudio');
        erroTimeout.statusCode = 504;
        throw erroTimeout;
      }
      throw err;
    }
  },

  /**
   * Analisa visualmente uma imagem para extração de dados e sugestão de ação.
   * @param {Object} payload
   * @param {string} payload.imagem_base64
   * @param {string} [payload.mime_type='image/jpeg']
   * @param {string} [payload.instrucao]
   * @returns {Promise<Object>}
   */
  async analisarImagem({ imagem_base64, mime_type = 'image/jpeg', instrucao = null }) {
    const url = `${AI_SERVICE_URL.replace(/\/$/, '')}/imagem/analisar`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SERVICE_SECRET
        },
        body: JSON.stringify({
          imagem_base64,
          mime_type,
          instrucao
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const erro = new Error(errorData.detail || `Falha na análise visual de imagem (status ${response.status})`);
        erro.statusCode = response.status || 500;
        throw erro;
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        const erroTimeout = new Error('Tempo limite excedido na análise da imagem');
        erroTimeout.statusCode = 504;
        throw erroTimeout;
      }
      throw err;
    }
  },

  /**
   * Extrai fornecedor, número e lista de itens a partir de imagem/foto de nota fiscal.
   * @param {Object} payload
   * @param {string} payload.imagem_base64
   * @param {string} [payload.mime_type='image/jpeg']
   * @returns {Promise<Object>}
   */
  async extrairDadosNotaFiscal({ imagem_base64, mime_type = 'image/jpeg' }) {
    const url = `${AI_SERVICE_URL.replace(/\/$/, '')}/ocr/nota-fiscal`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SERVICE_SECRET
        },
        body: JSON.stringify({
          imagem_base64,
          mime_type
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const erro = new Error(errorData.detail || `Falha no OCR de nota fiscal (status ${response.status})`);
        erro.statusCode = response.status || 500;
        throw erro;
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        const erroTimeout = new Error('Tempo limite excedido na análise visual da nota fiscal');
        erroTimeout.statusCode = 504;
        throw erroTimeout;
      }
      throw err;
    }
  }
};

module.exports = aiServiceClient;

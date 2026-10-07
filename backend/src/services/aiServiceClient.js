const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'super_secreto_interno_arandue_2026';

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
  async enviarMensagem({ tenant_id, tenant_token, mensagem, historico = [] }) {
    const url = `${AI_SERVICE_URL.replace(/\/$/, '')}/chat`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SERVICE_SECRET
        },
        body: JSON.stringify({
          tenant_id,
          tenant_token,
          mensagem,
          historico
        }),
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
  }
};

module.exports = aiServiceClient;

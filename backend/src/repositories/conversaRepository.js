const pool = require('../config/database');

const conversaRepository = {
  /**
   * Cria uma nova conversa vinculada ao usuário.
   */
  async criarConversa(usuario_id, titulo) {
    const sql = `
      INSERT INTO conversas (usuario_id, titulo)
      VALUES (?, ?)
    `;
    const [result] = await pool.execute(sql, [usuario_id, titulo]);
    return result.insertId;
  },

  /**
   * Lista todas as conversas do usuário ordenadas pela data da última interação.
   */
  async listarConversasPorUsuario(usuario_id) {
    const sql = `
      SELECT id, titulo, criado_em, atualizado_em
      FROM conversas
      WHERE usuario_id = ?
      ORDER BY atualizado_em DESC
    `;
    const [rows] = await pool.execute(sql, [usuario_id]);
    return rows;
  },

  /**
   * Busca uma conversa por ID garantindo isolamento por usuario_id.
   */
  async buscarConversaPorId(conversa_id, usuario_id) {
    const sql = `
      SELECT id, usuario_id, titulo, criado_em, atualizado_em
      FROM conversas
      WHERE id = ? AND usuario_id = ?
    `;
    const [rows] = await pool.execute(sql, [conversa_id, usuario_id]);
    return rows[0] || null;
  },

  /**
   * Exclui uma conversa do usuário (mensagens excluídas por ON DELETE CASCADE).
   */
  async excluirConversa(conversa_id, usuario_id) {
    const sql = `
      DELETE FROM conversas
      WHERE id = ? AND usuario_id = ?
    `;
    const [result] = await pool.execute(sql, [conversa_id, usuario_id]);
    return result.affectedRows > 0;
  },

  /**
   * Salva uma mensagem em uma conversa e atualiza o atualizado_em da conversa pai.
   */
  async salvarMensagem(conversa_id, papel, conteudo, fontes = null, tools_usadas = null, rag_backend = null) {
    const sql = `
      INSERT INTO mensagens (conversa_id, papel, conteudo, fontes, tools_usadas, rag_backend)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const fontesJson = fontes ? JSON.stringify(fontes) : null;
    const toolsJson = tools_usadas ? JSON.stringify(tools_usadas) : null;

    const [result] = await pool.execute(sql, [
      conversa_id,
      papel,
      conteudo,
      fontesJson,
      toolsJson,
      rag_backend
    ]);

    // Atualiza timestamp da conversa
    await pool.execute('UPDATE conversas SET atualizado_em = NOW() WHERE id = ?', [conversa_id]);

    return result.insertId;
  },

  /**
   * Lista todas as mensagens de uma conversa pertencente ao usuário.
   */
  async listarMensagensPorConversa(conversa_id, usuario_id) {
    const conversa = await this.buscarConversaPorId(conversa_id, usuario_id);
    if (!conversa) {
      return null;
    }

    const sql = `
      SELECT id, papel, conteudo, fontes, tools_usadas, rag_backend, criado_em
      FROM mensagens
      WHERE conversa_id = ?
      ORDER BY criado_em ASC
    `;
    const [rows] = await pool.execute(sql, [conversa_id]);

    return rows.map(r => ({
      ...r,
      fontes: typeof r.fontes === 'string' ? JSON.parse(r.fontes) : r.fontes,
      tools_usadas: typeof r.tools_usadas === 'string' ? JSON.parse(r.tools_usadas) : r.tools_usadas
    }));
  }
};

module.exports = conversaRepository;

const pool = require('../config/database');

const conversaRepository = {
  /**
   * Cria uma nova conversa vinculada ao usuário com suporte a canal (web ou whatsapp).
   */
  async criarConversa(usuario_id, titulo, canal = 'web') {
    const sql = `
      INSERT INTO conversas (usuario_id, titulo, canal)
      VALUES (?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [usuario_id, titulo, canal]);
    return result.insertId;
  },

  /**
   * Busca a conversa ativa mais recente para um determinado canal (ex: 'whatsapp').
   */
  async buscarConversaAtivaPorCanal(usuario_id, canal = 'whatsapp') {
    const sql = `
      SELECT id, usuario_id, titulo, canal, criado_em, atualizado_em
      FROM conversas
      WHERE usuario_id = ? AND canal = ?
      ORDER BY atualizado_em DESC
      LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [usuario_id, canal]);
    return rows[0] || null;
  },

  /**
   * Lista todas as conversas do usuário ordenadas pela data da última interação.
   */
  async listarConversasPorUsuario(usuario_id, canal = null) {
    let sql = `
      SELECT id, titulo, canal, criado_em, atualizado_em
      FROM conversas
      WHERE usuario_id = ?
    `;
    const params = [usuario_id];
    if (canal) {
      sql += ' AND canal = ?';
      params.push(canal);
    }
    sql += ' ORDER BY atualizado_em DESC';

    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  /**
   * Busca uma conversa por ID garantindo isolamento por usuario_id.
   */
  async buscarConversaPorId(conversa_id, usuario_id) {
    const sql = `
      SELECT id, usuario_id, titulo, canal, criado_em, atualizado_em
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
  async salvarMensagem(
    conversa_id,
    papel,
    conteudo,
    fontes = null,
    tools_usadas = null,
    rag_backend = null,
    status = 'concluida',
    erro_mensagem = null
  ) {
    const sql = `
      INSERT INTO mensagens (conversa_id, papel, conteudo, status, erro_mensagem, fontes, tools_usadas, rag_backend)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const fontesJson = fontes ? JSON.stringify(fontes) : null;
    const toolsJson = tools_usadas ? JSON.stringify(tools_usadas) : null;

    const [result] = await pool.execute(sql, [
      conversa_id,
      papel,
      conteudo,
      status,
      erro_mensagem,
      fontesJson,
      toolsJson,
      rag_backend
    ]);

    // Atualiza timestamp da conversa
    await pool.execute('UPDATE conversas SET atualizado_em = NOW() WHERE id = ?', [conversa_id]);

    return result.insertId;
  },

  /**
   * Atualiza uma mensagem existente (ex: transição de 'processando' para 'concluida' ou 'erro').
   */
  async atualizarMensagem(
    mensagem_id,
    {
      conteudo = null,
      fontes = null,
      tools_usadas = null,
      rag_backend = null,
      status = 'concluida',
      erro_mensagem = null
    }
  ) {
    const sql = `
      UPDATE mensagens
      SET conteudo = ?,
          status = ?,
          erro_mensagem = ?,
          fontes = ?,
          tools_usadas = ?,
          rag_backend = ?
      WHERE id = ?
    `;
    const fontesJson = fontes ? JSON.stringify(fontes) : null;
    const toolsJson = tools_usadas ? JSON.stringify(tools_usadas) : null;

    const [result] = await pool.execute(sql, [
      conteudo,
      status,
      erro_mensagem,
      fontesJson,
      toolsJson,
      rag_backend,
      mensagem_id
    ]);

    // Atualiza timestamp da conversa associada
    await pool.execute(`
      UPDATE conversas c
      INNER JOIN mensagens m ON m.conversa_id = c.id
      SET c.atualizado_em = NOW()
      WHERE m.id = ?
    `, [mensagem_id]);

    return result.affectedRows > 0;
  },

  /**
   * Busca uma mensagem por ID garantindo isolamento por usuario_id.
   */
  async buscarMensagemPorId(mensagem_id, usuario_id) {
    const sql = `
      SELECT m.id, m.conversa_id, m.papel, m.conteudo, m.status, m.erro_mensagem, m.fontes, m.tools_usadas, m.rag_backend, m.criado_em
      FROM mensagens m
      INNER JOIN conversas c ON c.id = m.conversa_id
      WHERE m.id = ? AND c.usuario_id = ?
    `;
    const [rows] = await pool.execute(sql, [mensagem_id, usuario_id]);
    if (!rows[0]) return null;

    const m = rows[0];
    return {
      ...m,
      fontes: typeof m.fontes === 'string' ? JSON.parse(m.fontes) : m.fontes,
      tools_usadas: typeof m.tools_usadas === 'string' ? JSON.parse(m.tools_usadas) : m.tools_usadas
    };
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
      SELECT id, papel, conteudo, status, erro_mensagem, fontes, tools_usadas, rag_backend, criado_em
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

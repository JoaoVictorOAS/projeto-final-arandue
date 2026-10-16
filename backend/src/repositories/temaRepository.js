const pool = require('../database/connection');

const TEMAS_PADRAO = [
  {
    id: 'padrao-claro',
    slug: 'claro-arandue',
    nome: 'Claro Aranduê',
    modo: 'light',
    descricao: 'Tema padrão claro equilibrado para alta legibilidade durante o dia',
    eh_sistema: true,
    origem: 'SISTEMA',
    tokens: {
      bgApp: '#f8fafc',
      bgSurface: '#ffffff',
      bgSurfaceHover: '#f1f5f9',
      border: '#e2e8f0',
      textMain: '#0f172a',
      textSecondary: '#64748b',
      textMuted: '#94a3b8',
      primary: '#4f46e5',
      primaryHover: '#4338ca',
      primaryText: '#ffffff',
      accent: '#f59e0b',
      status: { success: '#10b981', danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6' },
    },
  },
  {
    id: 'padrao-dark',
    slug: 'noturno-corporativo',
    nome: 'Noturno Corporativo',
    modo: 'dark',
    descricao: 'Tema escuro profissional com base Dark Slate para redução de fadiga visual',
    eh_sistema: true,
    origem: 'SISTEMA',
    tokens: {
      bgApp: '#0f172a',
      bgSurface: '#1e293b',
      bgSurfaceHover: '#334155',
      border: '#334155',
      textMain: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      primary: '#6366f1',
      primaryHover: '#4f46e5',
      primaryText: '#ffffff',
      accent: '#38bdf8',
      status: { success: '#34d399', danger: '#f87171', warning: '#fbbf24', info: '#60a5fa' },
    },
  },
  {
    id: 'padrao-esmeralda',
    slug: 'esmeralda-mei',
    nome: 'Esmeralda MEI',
    modo: 'light',
    descricao: 'Paleta inspirada na sustentabilidade com acentos verdes e alto frescor visual',
    eh_sistema: true,
    origem: 'SISTEMA',
    tokens: {
      bgApp: '#f0fdf4',
      bgSurface: '#ffffff',
      bgSurfaceHover: '#dcfce7',
      border: '#bbf7d0',
      textMain: '#064e3b',
      textSecondary: '#047857',
      textMuted: '#6ee7b7',
      primary: '#059669',
      primaryHover: '#047857',
      primaryText: '#ffffff',
      accent: '#d97706',
      status: { success: '#10b981', danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6' },
    },
  },
  {
    id: 'padrao-oceano',
    slug: 'oceano-indigo',
    nome: 'Oceano Índigo',
    modo: 'dark',
    descricao: 'Tema noturno navy profundo com acentos em ciano vibrante para foco e contraste',
    eh_sistema: true,
    origem: 'SISTEMA',
    tokens: {
      bgApp: '#0b1329',
      bgSurface: '#152244',
      bgSurfaceHover: '#1e3260',
      border: '#1e3260',
      textMain: '#f1f5f9',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryText: '#ffffff',
      accent: '#f97316',
      status: { success: '#34d399', danger: '#f87171', warning: '#fbbf24', info: '#60a5fa' },
    },
  },
  {
    id: 'padrao-ambar',
    slug: 'ambar-cafe',
    nome: 'Âmbar & Café',
    modo: 'light',
    descricao: 'Tema claro em tons terrosos acolhedores para gastronomia e serviços artesanais',
    eh_sistema: true,
    origem: 'SISTEMA',
    tokens: {
      bgApp: '#faf5ee',
      bgSurface: '#ffffff',
      bgSurfaceHover: '#f5ebe0',
      border: '#e6ccb2',
      textMain: '#43281c',
      textSecondary: '#7f4f24',
      textMuted: '#a68a72',
      primary: '#b45309',
      primaryHover: '#92400e',
      primaryText: '#ffffff',
      accent: '#0284c7',
      status: { success: '#10b981', danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6' },
    },
  },
];

let tabelaVerificada = false;

const temaRepository = {
  /**
   * Retorna cópia dos 5 temas padrão do sistema
   */
  obterTemasPadrao() {
    return JSON.parse(JSON.stringify(TEMAS_PADRAO));
  },

  /**
   * Garante a criação da tabela temas_usuario se ainda não existir
   */
  async garantirTabelaExiste() {
    if (tabelaVerificada) return;

    const sql = `
      CREATE TABLE IF NOT EXISTS temas_usuario (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        nome VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL,
        modo ENUM('light', 'dark') NOT NULL DEFAULT 'light',
        descricao VARCHAR(255) NULL,
        eh_ativo TINYINT(1) NOT NULL DEFAULT 0,
        eh_sistema TINYINT(1) NOT NULL DEFAULT 0,
        origem ENUM('SISTEMA', 'UPLOAD', 'IA', 'CUSTOMIZADO') NOT NULL DEFAULT 'CUSTOMIZADO',
        tokens JSON NOT NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_temas_usuario (usuario_id),
        INDEX idx_temas_ativo (usuario_id, eh_ativo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.query(sql);
    tabelaVerificada = true;
  },

  /**
   * Retorna os temas do usuário. Se for a primeira consulta, semeia os 5 padrões oficiais.
   */
  async obterTemasPorUsuario(usuarioId) {
    await this.garantirTabelaExiste();
    const [rows] = await pool.query(
      'SELECT * FROM temas_usuario WHERE usuario_id = ? ORDER BY criado_em ASC',
      [usuarioId]
    );

    if (rows.length === 0) {
      // Injeta os 5 temas padrão para o usuário
      for (let i = 0; i < TEMAS_PADRAO.length; i++) {
        const t = TEMAS_PADRAO[i];
        const ehAtivo = i === 0 ? 1 : 0;
        await pool.query(
          `INSERT INTO temas_usuario (usuario_id, nome, slug, modo, descricao, eh_ativo, eh_sistema, origem, tokens)
           VALUES (?, ?, ?, ?, ?, ?, 1, 'SISTEMA', ?)`,
          [usuarioId, t.nome, t.slug, t.modo, t.descricao, ehAtivo, JSON.stringify(t.tokens)]
        );
      }
      const [novasRows] = await pool.query(
        'SELECT * FROM temas_usuario WHERE usuario_id = ? ORDER BY criado_em ASC',
        [usuarioId]
      );
      return novasRows.map(this._formatar);
    }

    return rows.map(this._formatar);
  },

  /**
   * Retorna o tema atualmente ativo do usuário
   */
  async obterTemaAtivo(usuarioId) {
    const temas = await this.obterTemasPorUsuario(usuarioId);
    return temas.find((t) => t.eh_ativo) || temas[0] || TEMAS_PADRAO[0];
  },

  /**
   * Ativa um tema por ID ou slug para o usuário
   */
  async ativarTema(usuarioId, temaIdOuSlug) {
    await this.garantirTabelaExiste();
    await this.obterTemasPorUsuario(usuarioId);

    const isNumericId = typeof temaIdOuSlug === 'number' || (typeof temaIdOuSlug === 'string' && /^\d+$/.test(String(temaIdOuSlug).trim()));
    const sqlVerifica = isNumericId
      ? 'SELECT * FROM temas_usuario WHERE usuario_id = ? AND id = ?'
      : 'SELECT * FROM temas_usuario WHERE usuario_id = ? AND slug = ?';
    const paramsVerifica = [usuarioId, isNumericId ? Number(temaIdOuSlug) : String(temaIdOuSlug).trim()];

    const [rows] = await pool.query(sqlVerifica, paramsVerifica);
    if (!rows || rows.length === 0) {
      throw new Error(`Tema '${temaIdOuSlug}' não encontrado para este usuário.`);
    }

    const temaParaAtivar = rows[0];

    await pool.query('UPDATE temas_usuario SET eh_ativo = 0 WHERE usuario_id = ?', [usuarioId]);
    await pool.query('UPDATE temas_usuario SET eh_ativo = 1 WHERE usuario_id = ? AND id = ?', [
      usuarioId,
      temaParaAtivar.id,
    ]);

    return this.obterTemaAtivo(usuarioId);
  },

  /**
   * Cria um tema customizado associado ao usuário
   */
  async criarTema(usuarioId, dados) {
    await this.garantirTabelaExiste();
    const slug = dados.slug || dados.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const tokensJson = typeof dados.tokens === 'string' ? dados.tokens : JSON.stringify(dados.tokens || {});
    const [result] = await pool.query(
      `INSERT INTO temas_usuario (usuario_id, nome, slug, modo, descricao, eh_ativo, eh_sistema, origem, tokens)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        usuarioId,
        dados.nome,
        slug,
        dados.modo || 'dark',
        dados.descricao || '',
        dados.ativar ? 1 : 0,
        dados.origem || 'CUSTOMIZADO',
        tokensJson,
      ]
    );

    if (dados.ativar) {
      await pool.query(
        'UPDATE temas_usuario SET eh_ativo = 0 WHERE usuario_id = ? AND id != ?',
        [usuarioId, result.insertId]
      );
    }

    const [rows] = await pool.query('SELECT * FROM temas_usuario WHERE id = ?', [result.insertId]);
    return this._formatar(rows[0]);
  },

  /**
   * Exclui um tema customizado do usuário. Bloqueia a exclusão de temas padrão do sistema.
   */
  async excluirTema(usuarioId, temaId) {
    await this.garantirTabelaExiste();
    const [rows] = await pool.query(
      'SELECT * FROM temas_usuario WHERE id = ? AND usuario_id = ?',
      [temaId, usuarioId]
    );
    if (!rows.length) return false;
    if (rows[0].eh_sistema) {
      throw new Error('Não é permitido excluir temas padrão do sistema.');
    }
    const estavaAtivo = Boolean(rows[0].eh_ativo);
    await pool.query('DELETE FROM temas_usuario WHERE id = ? AND usuario_id = ?', [temaId, usuarioId]);
    if (estavaAtivo) {
      // Reativa o primeiro tema do sistema caso o ativo tenha sido excluído
      await pool.query(
        'UPDATE temas_usuario SET eh_ativo = 1 WHERE usuario_id = ? AND eh_sistema = 1 ORDER BY id ASC LIMIT 1',
        [usuarioId]
      );
    }
    return true;
  },

  _formatar(row) {
    if (!row) return null;
    return {
      ...row,
      eh_ativo: Boolean(row.eh_ativo),
      eh_sistema: Boolean(row.eh_sistema),
      tokens: typeof row.tokens === 'string' ? JSON.parse(row.tokens) : row.tokens,
    };
  },
};

module.exports = temaRepository;

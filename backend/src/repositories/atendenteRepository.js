const pool = require('../config/database');

let tabelaGarantida = false;

async function garantirTabela() {
  if (tabelaGarantida) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS atendente_configuracoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL UNIQUE,
        slug_publico VARCHAR(80) UNIQUE,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        nome_atendente VARCHAR(100) NOT NULL DEFAULT 'Atendente Virtual',
        tom_voz VARCHAR(30) NOT NULL DEFAULT 'AMIGAVEL',
        instrucoes_customizadas TEXT NULL,
        mensagem_boas_vindas VARCHAR(500) NULL,
        permite_agendar TINYINT(1) NOT NULL DEFAULT 1,
        permite_consultar_catalogo TINYINT(1) NOT NULL DEFAULT 1,
        permite_gerar_orcamento TINYINT(1) NOT NULL DEFAULT 1,
        permite_fechar_orcamento TINYINT(1) NOT NULL DEFAULT 0,
        permite_gerar_cobranca_pix TINYINT(1) NOT NULL DEFAULT 0,
        orcamento_min_valor DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        orcamento_max_valor DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
        desconto_max_percentual DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        exigir_aprovacao_acima_limite TINYINT(1) NOT NULL DEFAULT 1,
        horario_inicio VARCHAR(10) NOT NULL DEFAULT '08:00',
        horario_fim VARCHAR(10) NOT NULL DEFAULT '18:00',
        dias_funcionamento VARCHAR(50) NOT NULL DEFAULT '1,2,3,4,5',
        antecedencia_minima_dias INT NOT NULL DEFAULT 0,
        antecedencia_maxima_dias INT NOT NULL DEFAULT 60,
        transbordo_automatico TINYINT(1) NOT NULL DEFAULT 1,
        condicoes_retorno_humano TEXT NULL,
        alcadas_por_servico TEXT NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const colunasExtras = [
      'ALTER TABLE atendente_configuracoes ADD COLUMN antecedencia_minima_dias INT NOT NULL DEFAULT 0',
      'ALTER TABLE atendente_configuracoes ADD COLUMN antecedencia_maxima_dias INT NOT NULL DEFAULT 60',
      'ALTER TABLE atendente_configuracoes ADD COLUMN transbordo_automatico TINYINT(1) NOT NULL DEFAULT 1',
      'ALTER TABLE atendente_configuracoes ADD COLUMN condicoes_retorno_humano TEXT NULL',
      'ALTER TABLE atendente_configuracoes ADD COLUMN alcadas_por_servico TEXT NULL'
    ];
    for (const ddl of colunasExtras) {
      try {
        await pool.execute(ddl);
      } catch (_) {}
    }

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS atendimentos_pendentes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        nome_cliente VARCHAR(120) NOT NULL DEFAULT 'Cliente',
        telefone_cliente VARCHAR(40) NULL,
        motivo VARCHAR(500) NOT NULL,
        resumo_conversa TEXT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
        lido_mobile TINYINT(1) NOT NULL DEFAULT 0,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_atend_pend_usuario_status (usuario_id, status)
      )
    `);

    tabelaGarantida = true;
  } catch (err) {
    // Em ambientes de mock ou testes sem DB ativo, ignora falha de DDL
  }
}

function parseAlcadasPorServico(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function normalizarLinha(row, usuario_id) {
  const uid = Number(row?.usuario_id || usuario_id);
  return {
    id: row?.id || null,
    usuario_id: uid,
    slug_publico: row?.slug_publico || `atendimento-mei-${uid}`,
    ativo: row?.ativo !== undefined ? Boolean(Number(row.ativo)) : true,
    nome_atendente: row?.nome_atendente || 'Atendente Virtual',
    tom_voz: (row?.tom_voz || 'AMIGAVEL').toUpperCase(),
    instrucoes_customizadas: row?.instrucoes_customizadas || '',
    mensagem_boas_vindas:
      row?.mensagem_boas_vindas ||
      'Olá! Sou o atendente virtual do estabelecimento. Posso consultar preços, horários disponíveis ou montar seu orçamento!',
    permite_agendar: row?.permite_agendar !== undefined ? Boolean(Number(row.permite_agendar)) : true,
    permite_consultar_catalogo:
      row?.permite_consultar_catalogo !== undefined ? Boolean(Number(row.permite_consultar_catalogo)) : true,
    permite_gerar_orcamento:
      row?.permite_gerar_orcamento !== undefined ? Boolean(Number(row.permite_gerar_orcamento)) : true,
    permite_fechar_orcamento:
      row?.permite_fechar_orcamento !== undefined ? Boolean(Number(row.permite_fechar_orcamento)) : false,
    permite_gerar_cobranca_pix:
      row?.permite_gerar_cobranca_pix !== undefined ? Boolean(Number(row.permite_gerar_cobranca_pix)) : false,
    orcamento_min_valor: row?.orcamento_min_valor !== undefined ? Number(row.orcamento_min_valor) : 0.0,
    orcamento_max_valor: row?.orcamento_max_valor !== undefined ? Number(row.orcamento_max_valor) : 500.0,
    desconto_max_percentual:
      row?.desconto_max_percentual !== undefined ? Number(row.desconto_max_percentual) : 0.0,
    exigir_aprovacao_acima_limite:
      row?.exigir_aprovacao_acima_limite !== undefined ? Boolean(Number(row.exigir_aprovacao_acima_limite)) : true,
    horario_inicio: String(row?.horario_inicio || '08:00').slice(0, 5),
    horario_fim: String(row?.horario_fim || '18:00').slice(0, 5),
    dias_funcionamento: row?.dias_funcionamento || '1,2,3,4,5',
    antecedencia_minima_dias:
      row?.antecedencia_minima_dias !== undefined ? Number(row.antecedencia_minima_dias) : 0,
    antecedencia_maxima_dias:
      row?.antecedencia_maxima_dias !== undefined ? Number(row.antecedencia_maxima_dias) : 60,
    transbordo_automatico:
      row?.transbordo_automatico !== undefined ? Boolean(Number(row.transbordo_automatico)) : true,
    condicoes_retorno_humano: row?.condicoes_retorno_humano || '',
    alcadas_por_servico: parseAlcadasPorServico(row?.alcadas_por_servico),
    criado_em: row?.criado_em || null,
    atualizado_em: row?.atualizado_em || null
  };
}

const atendenteRepository = {
  async obterOuCriarConfig(usuario_id) {
    await garantirTabela();
    const uid = Number(usuario_id);
    const slugPadrao = `atendimento-mei-${uid}`;

    const [rows] = await pool.execute(
      'SELECT * FROM atendente_configuracoes WHERE usuario_id = ? LIMIT 1',
      [uid]
    );

    if (rows && rows.length > 0) {
      return normalizarLinha(rows[0], uid);
    }

    try {
      await pool.execute(
        `INSERT INTO atendente_configuracoes (usuario_id, slug_publico) VALUES (?, ?)`,
        [uid, slugPadrao]
      );
      const [novasRows] = await pool.execute(
        'SELECT * FROM atendente_configuracoes WHERE usuario_id = ? LIMIT 1',
        [uid]
      );
      if (novasRows && novasRows.length > 0) {
        return normalizarLinha(novasRows[0], uid);
      }
    } catch (err) {
      // Fallback seguro caso ocorra corrida ou banco mockado
    }

    return normalizarLinha(null, uid);
  },

  async buscarConfigPorSlug(slug_publico) {
    await garantirTabela();
    if (!slug_publico || typeof slug_publico !== 'string') return null;
    const slugLimpo = slug_publico.trim().toLowerCase();

    const [rows] = await pool.execute(
      'SELECT * FROM atendente_configuracoes WHERE slug_publico = ? LIMIT 1',
      [slugLimpo]
    );
    if (rows && rows.length > 0) {
      return normalizarLinha(rows[0], rows[0].usuario_id);
    }

    const match = slugLimpo.match(/^atendimento-mei-(\d+)$/);
    if (match) {
      const uid = Number(match[1]);
      return await this.obterOuCriarConfig(uid);
    }

    return null;
  },

  async atualizarConfig(usuario_id, dados) {
    await garantirTabela();
    const uid = Number(usuario_id);
    const atual = await this.obterOuCriarConfig(uid);

    const mesclado = {
      ...atual,
      ...dados,
      usuario_id: uid
    };

    const alcadasJson = JSON.stringify(parseAlcadasPorServico(mesclado.alcadas_por_servico));

    const query = `
      INSERT INTO atendente_configuracoes (
        usuario_id, slug_publico, ativo, nome_atendente, tom_voz,
        instrucoes_customizadas, mensagem_boas_vindas,
        permite_agendar, permite_consultar_catalogo, permite_gerar_orcamento,
        permite_fechar_orcamento, permite_gerar_cobranca_pix,
        orcamento_min_valor, orcamento_max_valor, desconto_max_percentual,
        exigir_aprovacao_acima_limite, horario_inicio, horario_fim, dias_funcionamento,
        antecedencia_minima_dias, antecedencia_maxima_dias, transbordo_automatico,
        condicoes_retorno_humano, alcadas_por_servico
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        slug_publico = VALUES(slug_publico),
        ativo = VALUES(ativo),
        nome_atendente = VALUES(nome_atendente),
        tom_voz = VALUES(tom_voz),
        instrucoes_customizadas = VALUES(instrucoes_customizadas),
        mensagem_boas_vindas = VALUES(mensagem_boas_vindas),
        permite_agendar = VALUES(permite_agendar),
        permite_consultar_catalogo = VALUES(permite_consultar_catalogo),
        permite_gerar_orcamento = VALUES(permite_gerar_orcamento),
        permite_fechar_orcamento = VALUES(permite_fechar_orcamento),
        permite_gerar_cobranca_pix = VALUES(permite_gerar_cobranca_pix),
        orcamento_min_valor = VALUES(orcamento_min_valor),
        orcamento_max_valor = VALUES(orcamento_max_valor),
        desconto_max_percentual = VALUES(desconto_max_percentual),
        exigir_aprovacao_acima_limite = VALUES(exigir_aprovacao_acima_limite),
        horario_inicio = VALUES(horario_inicio),
        horario_fim = VALUES(horario_fim),
        dias_funcionamento = VALUES(dias_funcionamento),
        antecedencia_minima_dias = VALUES(antecedencia_minima_dias),
        antecedencia_maxima_dias = VALUES(antecedencia_maxima_dias),
        transbordo_automatico = VALUES(transbordo_automatico),
        condicoes_retorno_humano = VALUES(condicoes_retorno_humano),
        alcadas_por_servico = VALUES(alcadas_por_servico),
        atualizado_em = NOW()
    `;

    await pool.execute(query, [
      uid,
      mesclado.slug_publico,
      mesclado.ativo ? 1 : 0,
      mesclado.nome_atendente,
      mesclado.tom_voz,
      mesclado.instrucoes_customizadas || null,
      mesclado.mensagem_boas_vindas || null,
      mesclado.permite_agendar ? 1 : 0,
      mesclado.permite_consultar_catalogo ? 1 : 0,
      mesclado.permite_gerar_orcamento ? 1 : 0,
      mesclado.permite_fechar_orcamento ? 1 : 0,
      mesclado.permite_gerar_cobranca_pix ? 1 : 0,
      Number(mesclado.orcamento_min_valor || 0),
      Number(mesclado.orcamento_max_valor || 0),
      Number(mesclado.desconto_max_percentual || 0),
      mesclado.exigir_aprovacao_acima_limite ? 1 : 0,
      mesclado.horario_inicio,
      mesclado.horario_fim,
      mesclado.dias_funcionamento,
      Number(mesclado.antecedencia_minima_dias ?? 0),
      Number(mesclado.antecedencia_maxima_dias ?? 60),
      mesclado.transbordo_automatico ? 1 : 0,
      mesclado.condicoes_retorno_humano || null,
      alcadasJson
    ]);

    return await this.obterOuCriarConfig(uid);
  },

  async criarAtendimentoPendente({
    usuario_id,
    nome_cliente,
    telefone_cliente,
    motivo,
    resumo_conversa
  }) {
    await garantirTabela();
    const uid = Number(usuario_id);
    const nome = String(nome_cliente || 'Cliente').trim().slice(0, 120);
    const tel = telefone_cliente ? String(telefone_cliente).trim().slice(0, 40) : null;
    const mot = String(motivo || 'Solicitação fora da alçada do atendente').trim().slice(0, 500);
    const resumo = resumo_conversa ? String(resumo_conversa).trim().slice(0, 4000) : null;

    const [result] = await pool.execute(
      `INSERT INTO atendimentos_pendentes (usuario_id, nome_cliente, telefone_cliente, motivo, resumo_conversa, status, lido_mobile)
       VALUES (?, ?, ?, ?, ?, 'PENDENTE', 0)`,
      [uid, nome, tel, mot, resumo]
    );

    const id = result?.insertId || Date.now();
    return {
      id,
      usuario_id: uid,
      nome_cliente: nome,
      telefone_cliente: tel,
      motivo: mot,
      resumo_conversa: resumo,
      status: 'PENDENTE',
      lido_mobile: false,
      criado_em: new Date().toISOString()
    };
  },

  async listarAtendimentosPendentes(usuario_id, { status } = {}) {
    await garantirTabela();
    const uid = Number(usuario_id);
    let sql = 'SELECT * FROM atendimentos_pendentes WHERE usuario_id = ?';
    const params = [uid];

    if (status) {
      sql += ' AND status = ?';
      params.push(String(status).trim().toUpperCase());
    }
    sql += ' ORDER BY criado_em DESC LIMIT 50';

    const [rows] = await pool.execute(sql, params);
    return (rows || []).map((r) => ({
      id: r.id,
      usuario_id: Number(r.usuario_id),
      nome_cliente: r.nome_cliente,
      telefone_cliente: r.telefone_cliente || '',
      motivo: r.motivo,
      resumo_conversa: r.resumo_conversa || '',
      status: r.status || 'PENDENTE',
      lido_mobile: Boolean(Number(r.lido_mobile)),
      criado_em: r.criado_em,
      atualizado_em: r.atualizado_em
    }));
  },

  async atualizarStatusAtendimentoPendente(usuario_id, id, { status, lido_mobile } = {}) {
    await garantirTabela();
    const uid = Number(usuario_id);
    const pid = Number(id);
    const novoStatus = status ? String(status).trim().toUpperCase() : 'CONCLUIDO';
    const lido = lido_mobile !== undefined ? (lido_mobile ? 1 : 0) : 1;

    await pool.execute(
      `UPDATE atendimentos_pendentes
       SET status = ?, lido_mobile = ?, atualizado_em = NOW()
       WHERE id = ? AND usuario_id = ?`,
      [novoStatus, lido, pid, uid]
    );

    const [rows] = await pool.execute(
      'SELECT * FROM atendimentos_pendentes WHERE id = ? AND usuario_id = ? LIMIT 1',
      [pid, uid]
    );

    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      usuario_id: Number(r.usuario_id),
      nome_cliente: r.nome_cliente,
      telefone_cliente: r.telefone_cliente || '',
      motivo: r.motivo,
      resumo_conversa: r.resumo_conversa || '',
      status: r.status,
      lido_mobile: Boolean(Number(r.lido_mobile)),
      criado_em: r.criado_em,
      atualizado_em: r.atualizado_em
    };
  }
};

module.exports = atendenteRepository;

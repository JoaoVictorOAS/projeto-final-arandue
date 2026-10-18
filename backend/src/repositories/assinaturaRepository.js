const pool = require('../config/database');

/**
 * Funções auxiliares para cálculo de datas de vencimento de assinaturas recorrentes
 */
function formatarDataYMD(data) {
  if (!data) return null;
  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}/.test(data)) {
    return data.slice(0, 10);
  }
  const d = new Date(data);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function calcularProximoVencimento(dataAtualYMD, periodicidade, diaVencimento = null) {
  const [ano, mes, dia] = String(dataAtualYMD).slice(0, 10).split('-').map(Number);
  const p = (periodicidade || 'MENSAL').toUpperCase();

  if (p === 'SEMANAL') {
    const data = new Date(ano, mes - 1, dia + 7);
    return formatarDataYMD(data);
  }
  if (p === 'QUINZENAL') {
    const data = new Date(ano, mes - 1, dia + 15);
    return formatarDataYMD(data);
  }

  let mesesAdicionar = 1;
  if (p === 'TRIMESTRAL') mesesAdicionar = 3;
  else if (p === 'SEMESTRAL') mesesAdicionar = 6;
  else if (p === 'ANUAL') mesesAdicionar = 12;

  const targetAno = ano + Math.floor((mes - 1 + mesesAdicionar) / 12);
  const targetMes = (mes - 1 + mesesAdicionar) % 12; // 0-indexed

  const diaAlvo = diaVencimento ? Number(diaVencimento) : dia;
  const ultimoDiaMes = new Date(targetAno, targetMes + 1, 0).getDate();
  const diaFinal = Math.min(diaAlvo, ultimoDiaMes);

  const novaData = new Date(targetAno, targetMes, diaFinal);
  return formatarDataYMD(novaData);
}

function calcularVencimentoInicial(dataInicioYMD, diaVencimento, periodicidade) {
  const p = (periodicidade || 'MENSAL').toUpperCase();
  const [ano, mes, dia] = String(dataInicioYMD).slice(0, 10).split('-').map(Number);

  if (p === 'SEMANAL') {
    const d = new Date(ano, mes - 1, dia + 7);
    return formatarDataYMD(d);
  }
  if (p === 'QUINZENAL') {
    const d = new Date(ano, mes - 1, dia + 15);
    return formatarDataYMD(d);
  }

  const diaDesejado = diaVencimento ? Number(diaVencimento) : 10;
  let targetAno = ano;
  let targetMes = mes - 1; // 0-indexed

  if (diaDesejado < dia) {
    // Dia de vencimento no mês atual já passou da data de início, primeiro vencimento no próximo mês
    targetMes += 1;
    if (targetMes > 11) {
      targetAno += 1;
      targetMes = 0;
    }
  }

  const ultimoDiaMes = new Date(targetAno, targetMes + 1, 0).getDate();
  const diaFinal = Math.min(diaDesejado, ultimoDiaMes);

  const novaData = new Date(targetAno, targetMes, diaFinal);
  return formatarDataYMD(novaData);
}

function calcularMRR(assinaturasAtivas) {
  let mrr = 0;
  for (const ass of assinaturasAtivas) {
    const valor = Number(ass.valor) || 0;
    const p = (ass.periodicidade || 'MENSAL').toUpperCase();
    switch (p) {
      case 'SEMANAL':
        mrr += valor * (52 / 12);
        break;
      case 'QUINZENAL':
        mrr += valor * 2;
        break;
      case 'MENSAL':
        mrr += valor;
        break;
      case 'TRIMESTRAL':
        mrr += valor / 3;
        break;
      case 'SEMESTRAL':
        mrr += valor / 6;
        break;
      case 'ANUAL':
        mrr += valor / 12;
        break;
      default:
        mrr += valor;
    }
  }
  return Number(mrr.toFixed(2));
}

/**
 * Repositório para operações de Assinaturas (Serviços Recorrentes) com isolamento multi-tenant.
 */
const assinaturaRepository = {
  formatarDataYMD,
  calcularProximoVencimento,
  calcularVencimentoInicial,
  calcularMRR,

  /**
   * Lista assinaturas de um MEI com filtros opcionais.
   * @param {number} usuario_id
   * @param {Object} [filtros={}]
   * @param {string} [filtros.status]
   * @param {number|string} [filtros.cliente_id]
   * @returns {Promise<Array>}
   */
  async listar(usuario_id, { status, cliente_id } = {}) {
    let sql = `
      SELECT 
        a.id, a.usuario_id, a.cliente_id, a.servico_id,
        a.valor, a.periodicidade, a.dia_vencimento,
        DATE_FORMAT(a.data_inicio, '%Y-%m-%d') AS data_inicio,
        DATE_FORMAT(a.proximo_vencimento, '%Y-%m-%d') AS proximo_vencimento,
        a.status, a.observacoes, a.criado_em, a.atualizado_em,
        c.nome AS cliente_nome, c.telefone AS cliente_telefone, c.email AS cliente_email,
        s.nome AS servico_nome, s.categoria AS servico_categoria
      FROM assinaturas a
      INNER JOIN clientes c ON c.id = a.cliente_id AND c.usuario_id = a.usuario_id
      INNER JOIN servicos s ON s.id = a.servico_id AND s.usuario_id = a.usuario_id
      WHERE a.usuario_id = ?
    `;
    const params = [usuario_id];

    if (status && typeof status === 'string' && status.trim() && status.trim().toUpperCase() !== 'TODAS') {
      sql += ' AND a.status = ?';
      params.push(status.trim().toUpperCase());
    }

    if (cliente_id) {
      sql += ' AND a.cliente_id = ?';
      params.push(Number(cliente_id));
    }

    sql += ' ORDER BY a.proximo_vencimento ASC, a.id DESC';

    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  /**
   * Obtém resumo métrico das assinaturas (total ativas, pausadas, canceladas, MRR e vencimentos em 30d).
   * @param {number} usuario_id
   * @returns {Promise<Object>}
   */
  async obterResumo(usuario_id) {
    const todas = await this.listar(usuario_id);
    const ativas = todas.filter(a => a.status === 'ATIVA');
    const pausadas = todas.filter(a => a.status === 'PAUSADA');
    const canceladas = todas.filter(a => a.status === 'CANCELADA');

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite30d = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

    const proximos30d = ativas.filter(a => {
      if (!a.proximo_vencimento) return false;
      const d = new Date(a.proximo_vencimento + 'T00:00:00');
      return d >= hoje && d <= limite30d;
    });

    const mrr = calcularMRR(ativas);

    return {
      total_assinaturas: todas.length,
      total_ativas: ativas.length,
      total_pausadas: pausadas.length,
      total_canceladas: canceladas.length,
      mrr,
      proximos_vencimentos_30d: proximos30d.length
    };
  },

  /**
   * Busca uma assinatura por ID garantindo isolamento multi-tenant.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object|null} [connection]
   * @returns {Promise<Object|null>}
   */
  async buscarPorId(id, usuario_id, connection = null) {
    const exec = connection || pool;
    const sql = `
      SELECT 
        a.id, a.usuario_id, a.cliente_id, a.servico_id,
        a.valor, a.periodicidade, a.dia_vencimento,
        DATE_FORMAT(a.data_inicio, '%Y-%m-%d') AS data_inicio,
        DATE_FORMAT(a.proximo_vencimento, '%Y-%m-%d') AS proximo_vencimento,
        a.status, a.observacoes, a.criado_em, a.atualizado_em,
        c.nome AS cliente_nome, c.telefone AS cliente_telefone, c.email AS cliente_email,
        s.nome AS servico_nome, s.categoria AS servico_categoria
      FROM assinaturas a
      INNER JOIN clientes c ON c.id = a.cliente_id AND c.usuario_id = a.usuario_id
      INNER JOIN servicos s ON s.id = a.servico_id AND s.usuario_id = a.usuario_id
      WHERE a.id = ? AND a.usuario_id = ?
    `;
    const [rows] = await exec.execute(sql, [id, usuario_id]);
    return rows[0] || null;
  },

  /**
   * Cria uma nova assinatura vinculando cliente e serviço.
   * @param {Object} dados
   * @param {Object|null} [connection]
   * @returns {Promise<Object>}
   */
  async criar(
    {
      usuario_id,
      cliente_id,
      servico_id,
      valor = 0.0,
      periodicidade = 'MENSAL',
      dia_vencimento = 10,
      data_inicio,
      proximo_vencimento,
      observacoes = null,
      status = 'ATIVA'
    },
    connection = null
  ) {
    const exec = connection || pool;
    const dataInicioFinal = formatarDataYMD(data_inicio || new Date());
    const diaVencFinal = Math.max(1, Math.min(31, Number(dia_vencimento) || 10));
    const perFinal = (periodicidade || 'MENSAL').trim().toUpperCase();

    const proxVencFinal = proximo_vencimento 
      ? formatarDataYMD(proximo_vencimento) 
      : calcularVencimentoInicial(dataInicioFinal, diaVencFinal, perFinal);

    const [result] = await exec.execute(
      `INSERT INTO assinaturas 
        (usuario_id, cliente_id, servico_id, valor, periodicidade, dia_vencimento, data_inicio, proximo_vencimento, status, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario_id,
        cliente_id,
        servico_id,
        Number(valor) || 0.00,
        perFinal,
        diaVencFinal,
        dataInicioFinal,
        proxVencFinal,
        status || 'ATIVA',
        observacoes || null
      ]
    );

    return await this.buscarPorId(result.insertId, usuario_id, connection);
  },

  /**
   * Atualiza dados de uma assinatura existente.
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {Object} dados
   * @param {Object|null} [connection]
   * @returns {Promise<Object|null>}
   */
  async atualizar(id, usuario_id, dados, connection = null) {
    const exec = connection || pool;
    const campos = [];
    const valores = [];

    if (dados.valor !== undefined) {
      campos.push('valor = ?');
      valores.push(Number(dados.valor));
    }
    if (dados.periodicidade !== undefined) {
      campos.push('periodicidade = ?');
      valores.push(dados.periodicidade.trim().toUpperCase());
    }
    if (dados.dia_vencimento !== undefined) {
      campos.push('dia_vencimento = ?');
      valores.push(Math.max(1, Math.min(31, Number(dados.dia_vencimento))));
    }
    if (dados.data_inicio !== undefined) {
      campos.push('data_inicio = ?');
      valores.push(formatarDataYMD(dados.data_inicio));
    }
    if (dados.proximo_vencimento !== undefined) {
      campos.push('proximo_vencimento = ?');
      valores.push(formatarDataYMD(dados.proximo_vencimento));
    }
    if (dados.status !== undefined) {
      campos.push('status = ?');
      valores.push(dados.status.trim().toUpperCase());
    }
    if (dados.observacoes !== undefined) {
      campos.push('observacoes = ?');
      valores.push(dados.observacoes && dados.observacoes.trim() ? dados.observacoes.trim() : null);
    }

    if (campos.length === 0) {
      return this.buscarPorId(id, usuario_id, connection);
    }

    valores.push(id, usuario_id);

    const [result] = await exec.execute(
      `UPDATE assinaturas SET ${campos.join(', ')} WHERE id = ? AND usuario_id = ?`,
      valores
    );

    if (result.affectedRows === 0) {
      const existe = await this.buscarPorId(id, usuario_id, connection);
      if (!existe) return null;
    }

    return this.buscarPorId(id, usuario_id, connection);
  },

  /**
   * Atualiza o status de uma assinatura (ATIVA, PAUSADA, CANCELADA).
   * @param {number|string} id
   * @param {number} usuario_id
   * @param {string} status
   * @returns {Promise<Object|null>}
   */
  async atualizarStatus(id, usuario_id, status) {
    const statusLimpo = (status || '').trim().toUpperCase();
    if (!['ATIVA', 'PAUSADA', 'CANCELADA'].includes(statusLimpo)) {
      throw new Error(`Status inválido: ${status}. Os status permitidos são ATIVA, PAUSADA ou CANCELADA.`);
    }

    return await this.atualizar(id, usuario_id, { status: statusLimpo });
  }
};

module.exports = assinaturaRepository;

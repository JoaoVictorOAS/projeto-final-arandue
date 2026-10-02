const pool = require('../config/database');

/**
 * Serviço responsável por consolidar métricas e KPIs para o Dashboard do MEI.
 */
const dashboardService = {
  /**
   * Obtém o resumo consolidado de métricas financeiras e operacionais para o MEI autenticado.
   * @param {number} usuario_id
   * @returns {Promise<Object>}
   */
  async obterResumo(usuario_id) {
    if (!usuario_id) {
      const erro = new Error('Identificação do usuário é obrigatória');
      erro.statusCode = 401;
      throw erro;
    }

    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth() + 1;
    const hojeIso = agora.toISOString().slice(0, 10);
    const agoraIso = agora.toISOString().slice(0, 19).replace('T', ' ');

    // Executa todas as consultas do Dashboard em paralelo para alta performance
    const [
      [movimentacoesRows],
      [cobrancasRows],
      [agendamentosHojeRows],
      [proximosAgendamentosRows],
      [orcamentosRows],
      [clientesRows],
    ] = await Promise.all([
      // 1. Métricas do Mês Corrente (Livro Caixa)
      pool.execute(
        `SELECT 
          COALESCE(SUM(CASE WHEN tipo = 'ENTRADA' THEN valor ELSE 0 END), 0) AS entradas_mes,
          COALESCE(SUM(CASE WHEN tipo = 'SAIDA' THEN valor ELSE 0 END), 0) AS saidas_mes
        FROM movimentacoes
        WHERE usuario_id = ?
          AND (
            (YEAR(data_movimentacao) = YEAR(CURDATE()) AND MONTH(data_movimentacao) = MONTH(CURDATE()))
            OR
            (YEAR(data_movimentacao) = ? AND MONTH(data_movimentacao) = ?)
          )`,
        [usuario_id, anoAtual, mesAtual]
      ),

      // 2. Cobranças a receber pendentes (PENDENTE ou ATRASADO)
      pool.execute(
        `SELECT 
          COALESCE(SUM(valor), 0) AS a_receber_pendente
        FROM cobrancas
        WHERE usuario_id = ?
          AND status IN ('PENDENTE', 'ATRASADO')`,
        [usuario_id]
      ),

      // 3. Agendamentos de Hoje (status != CANCELADO)
      pool.execute(
        `SELECT COUNT(*) AS total
        FROM agendamentos
        WHERE usuario_id = ?
          AND (DATE(data_hora) = CURDATE() OR DATE(data_hora) = ?)
          AND status != 'CANCELADO'`,
        [usuario_id, hojeIso]
      ),

      // 4. Próximos 5 agendamentos a partir de agora
      pool.execute(
        `SELECT 
          a.id,
          a.usuario_id,
          a.cliente_id,
          c.nome AS cliente_nome,
          c.telefone AS cliente_telefone,
          a.servico_id,
          s.nome AS servico_nome,
          s.preco AS servico_preco,
          a.data_hora,
          a.status,
          a.observacoes
        FROM agendamentos a
        INNER JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.usuario_id = ?
          AND (a.data_hora >= NOW() OR a.data_hora >= ?)
          AND a.status != 'CANCELADO'
        ORDER BY a.data_hora ASC
        LIMIT 5`,
        [usuario_id, agoraIso]
      ),

      // 5. Orçamentos pendentes (ENVIADO ou RASCUNHO)
      pool.execute(
        `SELECT COUNT(*) AS total
        FROM orcamentos
        WHERE usuario_id = ?
          AND status IN ('ENVIADO', 'RASCUNHO')`,
        [usuario_id]
      ),

      // 6. Total de clientes ativos
      pool.execute(
        `SELECT COUNT(*) AS total
        FROM clientes
        WHERE usuario_id = ?
          AND ativo = 1`,
        [usuario_id]
      ),
    ]);

    const entradas_mes = Number(movimentacoesRows[0]?.entradas_mes || 0);
    const saidas_mes = Number(movimentacoesRows[0]?.saidas_mes || 0);
    const saldo_mes = Number((entradas_mes - saidas_mes).toFixed(2));
    const a_receber_pendente = Number(cobrancasRows[0]?.a_receber_pendente || 0);
    const agendamentos_hoje = Number(agendamentosHojeRows[0]?.total || 0);
    const orcamentos_pendentes = Number(orcamentosRows[0]?.total || 0);
    const total_clientes = Number(clientesRows[0]?.total || 0);

    return {
      // Propriedades diretas no primeiro nível (retrocompatibilidade e conveniência)
      saldo_mes,
      entradas_mes,
      saidas_mes,
      a_receber_pendente,
      agendamentos_hoje,
      proximos_agendamentos: proximosAgendamentosRows,
      orcamentos_pendentes,
      total_clientes,

      // Agrupamentos estruturados
      financeiro: {
        entradas_mes,
        saidas_mes,
        saldo_mes,
        a_receber_pendente,
      },
      operacional: {
        agendamentos_hoje,
        proximos_agendamentos: proximosAgendamentosRows,
        orcamentos_pendentes,
        total_clientes,
      },
    };
  }
};

module.exports = dashboardService;

import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, LineChart, Gauge, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import Modal from '../Modal';

const CATALOGO_PADRAO = [
  {
    chave: 'fluxo_caixa',
    nome: 'Fluxo de Caixa (Entradas vs Saídas)',
    descricao: 'Comparativo cronológico de receitas e despesas do livro caixa.',
    tipos_grafico_compativeis: ['bar', 'area', 'line'],
    periodos_compativeis: ['mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'ano_atual', 'historico_total'],
  },
  {
    chave: 'limite_mei',
    nome: 'Faturamento vs Teto MEI',
    descricao: 'Acompanhamento do teto anual de faturamento do MEI (R$ 81.000).',
    tipos_grafico_compativeis: ['radial_gauge', 'kpi'],
    periodos_compativeis: ['ano_atual'],
  },
  {
    chave: 'despesas_categoria',
    nome: 'Despesas por Categoria',
    descricao: 'Distribuição dos gastos cadastrados por centro de custo/categoria.',
    tipos_grafico_compativeis: ['donut', 'pie', 'bar'],
    periodos_compativeis: ['mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'ano_atual', 'historico_total'],
  },
  {
    chave: 'top_servicos',
    nome: 'Serviços / Produtos Mais Vendidos',
    descricao: 'Ranking de serviços e produtos mais demandados por receita e volume.',
    tipos_grafico_compativeis: ['bar', 'pie', 'donut'],
    periodos_compativeis: ['mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'ano_atual', 'historico_total'],
  },
  {
    chave: 'cobrancas_status',
    nome: 'Distribuição de Cobranças',
    descricao: 'Situação de recebimentos agrupados por status (Pago, Pendente, Atrasado).',
    tipos_grafico_compativeis: ['donut', 'pie', 'bar'],
    periodos_compativeis: ['mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'ano_atual', 'historico_total'],
  },
  {
    chave: 'funil_orcamentos',
    nome: 'Taxa de Conversão de Orçamentos',
    descricao: 'Distribuição de orçamentos por status (Rascunho, Enviado, Aprovado).',
    tipos_grafico_compativeis: ['bar', 'donut'],
    periodos_compativeis: ['mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'ano_atual', 'historico_total'],
  },
  {
    chave: 'novos_clientes',
    nome: 'Novos Clientes Cadastrados',
    descricao: 'Evolução cronológica no cadastro de novos clientes da sua base.',
    tipos_grafico_compativeis: ['line', 'bar', 'area'],
    periodos_compativeis: ['mes_atual', 'ultimos_3_meses', 'ultimos_6_meses', 'ano_atual', 'historico_total'],
  },
  {
    chave: 'projecao_financeira',
    nome: 'Projeção Financeira e Recebimentos Futuros',
    descricao: 'Previsão de entradas futuras com base em cobranças a vencer e atendimentos agendados.',
    tipos_grafico_compativeis: ['bar', 'area', 'line', 'kpi'],
    periodos_compativeis: [
      'proximos_30_dias',
      'proximos_60_dias',
      'proximos_3_meses',
      'proximos_6_meses',
      'proximos_12_meses',
      'proximos_1_ano',
    ],
  },
];

const NOMES_TIPOS = {
  bar: 'Gráfico de Barras',
  line: 'Gráfico de Linha',
  area: 'Gráfico de Área',
  donut: 'Gráfico de Rosca',
  pie: 'Gráfico de Pizza',
  radial_gauge: 'Termômetro (Teto MEI)',
  kpi: 'Cartão de Indicador (KPI)',
};

const NOMES_PERIODOS = {
  mes_atual: 'Mês Atual',
  ultimos_3_meses: 'Últimos 3 Meses',
  ultimos_6_meses: 'Últimos 6 Meses',
  ultimos_12_meses: 'Últimos 12 Meses',
  ano_atual: 'Ano Atual',
  historico_total: 'Histórico Total',
  proximos_30_dias: 'Próximos 30 Dias',
  proximos_60_dias: 'Próximos 60 Dias',
  proximos_3_meses: 'Próximos 3 Meses',
  proximos_6_meses: 'Próximos 6 Meses',
  proximos_12_meses: 'Próximos 12 Meses',
  proximos_1_ano: 'Próximo 1 Ano',
};

/**
 * Modal intuitivo para criação de novos widgets gráficos analíticos.
 */
export default function ModalNovoWidget({
  isOpen,
  onClose,
  onSalvar,
  dashboardId,
  metricasDisponiveis = CATALOGO_PADRAO,
}) {
  const [titulo, setTitulo] = useState('');
  const [metrica, setMetrica] = useState('fluxo_caixa');
  const [tipoGrafico, setTipoGrafico] = useState('bar');
  const [periodo, setPeriodo] = useState('ultimos_6_meses');
  const [largura, setLargura] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const metricas = metricasDisponiveis.length > 0 ? metricasDisponiveis : CATALOGO_PADRAO;
  const metricaAtual = metricas.find((m) => m.chave === metrica) || metricas[0];
  const tiposCompativeis = metricaAtual?.tipos_grafico_compativeis || ['bar'];
  const periodosCompativeis = metricaAtual?.periodos_compativeis || ['ultimos_6_meses'];

  // Ajusta automaticamente tipo e período compatíveis se a métrica mudar
  useEffect(() => {
    if (metricaAtual) {
      if (!tiposCompativeis.includes(tipoGrafico)) {
        setTipoGrafico(tiposCompativeis[0]);
      }
      if (!periodosCompativeis.includes(periodo)) {
        setPeriodo(periodosCompativeis[0]);
      }
      if (!titulo || metricas.some((m) => m.nome === titulo)) {
        setTitulo(metricaAtual.nome);
      }
    }
  }, [metrica]);

  // Reseta estado ao abrir
  useEffect(() => {
    if (isOpen) {
      setMetrica('fluxo_caixa');
      setTipoGrafico('bar');
      setPeriodo('ultimos_6_meses');
      setLargura(1);
      setTitulo('Fluxo de Caixa (Entradas vs Saídas)');
      setErro('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErro('Por favor, defina um título para o gráfico.');
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      await onSalvar({
        titulo: titulo.trim(),
        tipo_grafico: tipoGrafico,
        metrica,
        periodo,
        largura: Number(largura),
      });
      onClose();
    } catch (err) {
      setErro(err?.response?.data?.mensagem || err?.message || 'Erro ao adicionar gráfico');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Gráfico"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {erro && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {erro}
          </div>
        )}

        {/* Título do Gráfico */}
        <div>
          <label htmlFor="widget-titulo" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Título do Gráfico
          </label>
          <input
            id="widget-titulo"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Entradas vs Saídas do Mês"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            required
          />
        </div>

        {/* Métrica Analítica */}
        <div>
          <label htmlFor="widget-metrica" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Métrica Analítica
          </label>
          <select
            id="widget-metrica"
            value={metrica}
            onChange={(e) => setMetrica(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
          >
            {metricas.map((m) => (
              <option key={m.chave} value={m.chave}>
                {m.nome}
              </option>
            ))}
          </select>
          {metricaAtual?.descricao && (
            <p className="text-xs text-gray-500 mt-1 italic">{metricaAtual.descricao}</p>
          )}
        </div>

        {/* Tipo de Gráfico e Período */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="widget-tipo" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Tipo de Gráfico
            </label>
            <select
              id="widget-tipo"
              value={tipoGrafico}
              onChange={(e) => setTipoGrafico(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              {tiposCompativeis.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {NOMES_TIPOS[tipo] || tipo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="widget-periodo" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Período
            </label>
            <select
              id="widget-periodo"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              {periodosCompativeis.map((p) => (
                <option key={p} value={p}>
                  {NOMES_PERIODOS[p] || p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Largura no Grid */}
        <div>
          <label htmlFor="widget-largura" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Largura do Card
          </label>
          <select
            id="widget-largura"
            value={largura}
            onChange={(e) => setLargura(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
          >
            <option value={1}>1 Coluna (Metade da Tela em Telas Grandes)</option>
            <option value={2}>2 Colunas (Largura Completa)</option>
          </select>
        </div>

        {/* Rodapé / Botões */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Salvar Gráfico
          </button>
        </div>
      </form>
    </Modal>
  );
}

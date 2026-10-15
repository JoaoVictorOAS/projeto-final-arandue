import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  FileText,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Activity,
  UserPlus,
  BarChart3,
  LayoutDashboard,
} from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import DynamicWidgetCard from '../components/dashboard/DynamicWidgetCard';
import ModalNovoDashboard from '../components/dashboard/ModalNovoDashboard';
import ModalNovoWidget from '../components/dashboard/ModalNovoWidget';

const formatMoney = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
  } catch {}
  return String(dateStr).split('T')[0];
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
  } catch {}
  return '';
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState({
    saldo_mes: 0,
    entradas_mes: 0,
    saidas_mes: 0,
    a_receber_pendente: 0,
    agendamentos_hoje: 0,
    proximos_agendamentos: [],
  });

  const [dashboards, setDashboards] = useState([]);
  const [activeDashboardId, setActiveDashboardId] = useState(null);
  const [activeDashboard, setActiveDashboard] = useState(null);
  const [loadingWidgets, setLoadingWidgets] = useState(false);
  const [modalNovoDashboardAberto, setModalNovoDashboardAberto] = useState(false);
  const [modalNovoWidgetAberto, setModalNovoWidgetAberto] = useState(false);
  const [metricasCatalogo, setMetricasCatalogo] = useState([]);

  const fetchDashboardDetalhes = useCallback(async (id, currentList = []) => {
    const listToSearch = currentList.length > 0 ? currentList : dashboards;
    const dashFromList = listToSearch.find((d) => d.id === id);
    if (dashFromList) {
      setActiveDashboard(dashFromList);
    }
    setLoadingWidgets(true);
    try {
      const res = await api.get(`/dashboards/${id}`);
      const dados = res?.data?.dados || res?.data;
      if (dados && dados.id) {
        setActiveDashboard(dados);
        setDashboards((prev) =>
          prev.map((d) => (d.id === dados.id ? { ...d, ...dados } : d))
        );
      }
    } catch (err) {
      if (!dashFromList) {
        console.error('Erro ao carregar detalhes do dashboard:', err);
      }
    } finally {
      setLoadingWidgets(false);
    }
  }, [dashboards]);

  const fetchDashboards = useCallback(async (preferredId = null) => {
    try {
      const res = await api.get('/dashboards');
      const lista = res?.data?.dados || (Array.isArray(res?.data) ? res?.data : []);
      setDashboards(lista);

      if (lista.length > 0) {
        const targetId =
          preferredId ||
          activeDashboardId ||
          (lista.find((d) => d.eh_padrao)?.id || lista[0].id);
        setActiveDashboardId(targetId);
        await fetchDashboardDetalhes(targetId, lista);
      }
    } catch (err) {
      console.error('Erro ao listar dashboards:', err);
    }
  }, [activeDashboardId, fetchDashboardDetalhes]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/resumo');
      const dados = res?.data?.dados || res?.data || {};
      const fin = dados.financeiro || {};
      const op = dados.operacional || {};

      let proximos =
        dados.proximos_agendamentos ??
        op.proximos_agendamentos ??
        dados.proximos_atendimentos ??
        dados.agendamentos ??
        [];

      // Se o endpoint não retornou a lista nem chave de agendamentos, tenta fallback
      const hasAgendamentosKey =
        dados.proximos_agendamentos !== undefined ||
        op.proximos_agendamentos !== undefined;

      if (!hasAgendamentosKey && (!Array.isArray(proximos) || proximos.length === 0)) {
        try {
          const resAgend = await api.get('/agendamentos');
          const listaAgend = Array.isArray(resAgend?.data?.dados)
            ? resAgend.data.dados
            : Array.isArray(resAgend?.data)
            ? resAgend.data
            : [];
          if (listaAgend.length > 0) {
            proximos = listaAgend.slice(0, 5);
          }
        } catch {
          // ignore fallback error
        }
      }

      const entradas = Number(
        dados.entradas_mes ??
        fin.entradas_mes ??
        dados.entradas ??
        dados.total_entradas ??
        0
      );

      const saidas = Number(
        dados.saidas_mes ??
        fin.saidas_mes ??
        dados.saidas ??
        dados.total_saidas ??
        0
      );

      const saldo =
        dados.saldo_mes !== undefined
          ? Number(dados.saldo_mes)
          : fin.saldo_mes !== undefined
          ? Number(fin.saldo_mes)
          : dados.saldo !== undefined
          ? Number(dados.saldo)
          : Number((entradas - saidas).toFixed(2));

      const aReceber = Number(
        dados.a_receber_pendente ??
        fin.a_receber_pendente ??
        dados.a_receber ??
        dados.cobrancas_pendentes ??
        0
      );

      const agendHoje = Number(
        dados.agendamentos_hoje ??
        op.agendamentos_hoje ??
        dados.atendimentos_hoje ??
        0
      );

      setResumo({
        saldo_mes: saldo,
        entradas_mes: entradas,
        saidas_mes: saidas,
        a_receber_pendente: aReceber,
        agendamentos_hoje: agendHoje,
        proximos_agendamentos: Array.isArray(proximos) ? proximos : [],
      });
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchDashboards();

    api
      .get('/dashboards/metricas/catalogo')
      .then((res) => {
        const cats = res?.data?.dados?.metricas || res?.data?.metricas;
        if (Array.isArray(cats) && cats.length > 0) {
          setMetricasCatalogo(cats);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectDashboard = async (id) => {
    setActiveDashboardId(id);
    await fetchDashboardDetalhes(id, dashboards);
  };

  const handleCriarDashboard = async ({ nome, descricao }) => {
    const res = await api.post('/dashboards', { nome, descricao });
    const novo = res?.data?.dados || res?.data;
    const novoId = novo?.id;
    await fetchDashboards(novoId);
  };

  const handleAdicionarWidget = async (dadosWidget) => {
    if (!activeDashboardId) return;
    await api.post(`/dashboards/${activeDashboardId}/widgets`, dadosWidget);
    await fetchDashboardDetalhes(activeDashboardId, dashboards);
  };

  const handleToggleWidth = async (widget) => {
    const novaLargura = Number(widget.largura) === 2 ? 1 : 2;
    setActiveDashboard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: (prev.widgets || []).map((w) =>
          w.id === widget.id ? { ...w, largura: novaLargura } : w
        ),
      };
    });
    try {
      await api.put(`/dashboards/${activeDashboardId}/widgets/${widget.id}`, {
        largura: novaLargura,
      });
    } catch (err) {
      console.error('Erro ao atualizar largura do widget:', err);
      await fetchDashboardDetalhes(activeDashboardId, dashboards);
    }
  };

  const handleChangePeriod = async (widget, novoPeriodo) => {
    try {
      await api.put(`/dashboards/${activeDashboardId}/widgets/${widget.id}`, {
        periodo: novoPeriodo,
      });
      await fetchDashboardDetalhes(activeDashboardId, dashboards);
    } catch (err) {
      console.error('Erro ao atualizar período do widget:', err);
    }
  };

  const handleDeleteWidget = async (widget) => {
    setActiveDashboard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: (prev.widgets || []).filter((w) => w.id !== widget.id),
      };
    });
    try {
      await api.delete(`/dashboards/${activeDashboardId}/widgets/${widget.id}`);
    } catch (err) {
      console.error('Erro ao excluir widget:', err);
      await fetchDashboardDetalhes(activeDashboardId, dashboards);
    }
  };

  const kpis = [
    {
      title: 'Saldo do Mês',
      value: formatMoney(resumo.saldo_mes),
      desc: 'Resultado líquido do período',
      icon: Wallet,
      color: 'bg-indigo-600',
      textColor: resumo.saldo_mes >= 0 ? 'text-indigo-600' : 'text-rose-600',
      link: '/caixa',
      labelTest: 'kpi-saldo-mes',
    },
    {
      title: 'Entradas do Mês',
      value: formatMoney(resumo.entradas_mes),
      desc: 'Receitas e pagamentos recebidos',
      icon: TrendingUp,
      color: 'bg-emerald-600',
      textColor: 'text-emerald-600',
      link: '/caixa',
      labelTest: 'kpi-entradas-mes',
    },
    {
      title: 'Saídas do Mês',
      value: formatMoney(resumo.saidas_mes),
      desc: 'Custos operacionais e despesas',
      icon: TrendingDown,
      color: 'bg-rose-600',
      textColor: 'text-rose-600',
      link: '/caixa',
      labelTest: 'kpi-saidas-mes',
    },
    {
      title: 'A Receber Pendente',
      value: formatMoney(resumo.a_receber_pendente),
      desc: 'Cobranças emitidas a liquidar',
      icon: CreditCard,
      color: 'bg-amber-600',
      textColor: 'text-amber-600',
      link: '/cobrancas',
      labelTest: 'kpi-a-receber-pendente',
    },
    {
      title: 'Agendamentos Hoje',
      value: String(resumo.agendamentos_hoje),
      desc: 'Atendimentos para o dia atual',
      icon: Calendar,
      color: 'bg-sky-600',
      textColor: 'text-sky-700',
      link: '/agenda',
      labelTest: 'kpi-agendamentos-hoje',
    },
  ];

  const acoesRapidas = [
    {
      titulo: 'Novo Cliente',
      descricao: 'Cadastrar contato',
      icone: UserPlus,
      link: '/clientes?novo=true',
      cor: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    },
    {
      titulo: 'Novo Orçamento',
      descricao: 'Emitir proposta',
      icone: FileText,
      link: '/orcamentos?novo=true',
      cor: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    },
    {
      titulo: 'Novo Agendamento',
      descricao: 'Marcar atendimento',
      icone: Calendar,
      link: '/agenda?novo=true',
      cor: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    },
    {
      titulo: 'Nova Cobrança',
      descricao: 'Registrar pagamento',
      icone: CreditCard,
      link: '/cobrancas?novo=true',
      cor: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    },
    {
      titulo: 'Lançar Despesa',
      descricao: 'Saída no livro caixa',
      icone: ArrowUpRight,
      link: '/caixa?nova_saida=true',
      cor: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Seção de Ações Rápidas */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {acoesRapidas.map((acao) => {
            const Icon = acao.icone;
            return (
              <Link
                key={acao.titulo}
                to={acao.link}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-150 group ${acao.cor}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-white/80 shadow-xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                </div>
                <div>
                  <p className="font-bold text-xs leading-snug">{acao.titulo}</p>
                  <p className="text-[11px] opacity-80 mt-0.5">{acao.descricao}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.title}
              to={kpi.link}
              data-testid={kpi.labelTest}
              className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {kpi.title}
                  </p>
                  <p className={`text-2xl font-extrabold mt-2 ${kpi.textColor}`}>
                    {loading ? '—' : kpi.value}
                  </p>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl ${kpi.color} text-white flex items-center justify-center shadow-md flex-shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span className="truncate">{kpi.desc}</span>
                <span className="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5 ml-2 flex-shrink-0">
                  Ver <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Seção de Painéis Analíticos & Gráficos Dinâmicos */}
      <div className="space-y-4">
        {/* Barra de Abas e Ações do Painel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:px-5 sm:py-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
          {/* Abas */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl">
              {dashboards.map((dash) => {
                const isActive = dash.id === activeDashboardId;
                return (
                  <button
                    key={dash.id}
                    type="button"
                    onClick={() => handleSelectDashboard(dash.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-indigo-700 shadow-xs border border-gray-200/70'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                    }`}
                  >
                    <span>{dash.nome}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setModalNovoDashboardAberto(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-indigo-600 hover:bg-white/80 transition flex items-center gap-1 whitespace-nowrap"
                title="Criar novo painel"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Painel</span>
              </button>
            </div>
          </div>

          {/* Ações da Aba Ativa */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setModalNovoWidgetAberto(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Adicionar Gráfico</span>
            </button>
          </div>
        </div>

        {/* Grid de Widgets do Painel Ativo */}
        {loadingWidgets ? (
          <div className="p-12 bg-white rounded-2xl border border-gray-200/80 text-center">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-500">Atualizando gráficos...</p>
          </div>
        ) : !activeDashboard?.widgets || activeDashboard.widgets.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-200/80 text-center">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-800">
              Nenhum gráfico cadastrado neste painel
            </p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              Adicione gráficos e indicadores customizados para acompanhar o desempenho do seu MEI.
            </p>
            <button
              type="button"
              onClick={() => setModalNovoWidgetAberto(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Adicionar Gráfico
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeDashboard.widgets.map((widget) => (
              <DynamicWidgetCard
                key={widget.id}
                widget={widget}
                onToggleWidth={handleToggleWidth}
                onChangePeriod={handleChangePeriod}
                onDelete={handleDeleteWidget}
              />
            ))}
          </div>
        )}
      </div>

      {/* Seção Próximos Atendimentos */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Próximos Atendimentos
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Compromissos agendados na sua agenda de serviços
            </p>
          </div>

          <Link
            to="/agenda"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
          >
            <span>Ver Agenda Completa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-500">Carregando agendamentos...</p>
          </div>
        ) : resumo.proximos_agendamentos.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-gray-800">
              Nenhum agendamento futuro no momento
            </p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              Agende novos atendimentos com seus clientes para organizar sua rotina de trabalho.
            </p>
            <Link
              to="/agenda?novo=true"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              <Calendar className="w-3.5 h-3.5" />
              Agendar Atendimento
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {resumo.proximos_agendamentos.map((agendamento) => {
              const dataFormatada = formatDate(
                agendamento.data_hora || agendamento.data || agendamento.horario
              );
              const horaFormatada = formatTime(agendamento.data_hora) || agendamento.horario || '';
              const cliNome =
                agendamento.cliente_nome ||
                agendamento.cliente?.nome ||
                'Cliente não especificado';
              const servNome =
                agendamento.servico_nome ||
                agendamento.servico?.nome ||
                'Serviço geral';

              return (
                <div
                  key={agendamento.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50/70 transition"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex flex-col items-center justify-center flex-shrink-0 text-center font-bold text-xs border border-indigo-100">
                      <Clock className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{cliNome}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-gray-700">{servNome}</span>
                        <span>•</span>
                        <span>{dataFormatada}</span>
                        {horaFormatada && (
                          <>
                            <span>às</span>
                            <span className="font-semibold text-gray-700">{horaFormatada}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <StatusBadge status={agendamento.status || 'PENDENTE'} />
                    <Link
                      to="/agenda"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      title="Ver na Agenda"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Novo Dashboard */}
      <ModalNovoDashboard
        isOpen={modalNovoDashboardAberto}
        onClose={() => setModalNovoDashboardAberto(false)}
        onSalvar={handleCriarDashboard}
      />

      {/* Modal Novo Widget */}
      <ModalNovoWidget
        isOpen={modalNovoWidgetAberto}
        onClose={() => setModalNovoWidgetAberto(false)}
        onSalvar={handleAdicionarWidget}
        dashboardId={activeDashboardId}
        metricasDisponiveis={metricasCatalogo}
      />
    </div>
  );
}

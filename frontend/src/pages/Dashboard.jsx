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
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  RefreshCw,
  Activity,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

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
  const { usuario } = useAuth();

  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState({
    saldo_mes: 0,
    entradas_mes: 0,
    saidas_mes: 0,
    a_receber_pendente: 0,
    agendamentos_hoje: 0,
    proximos_agendamentos: [],
  });

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
  }, [fetchDashboard]);

  const nomeExibicao = usuario?.nome ? usuario.nome.split(' ')[0] : 'Empreendedor';

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
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-800 via-indigo-700 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-100">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Painel Consolidado
              </span>
              <span
                data-testid="status-sistema"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 text-xs font-medium"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Sistema Operacional
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Olá, {nomeExibicao}! 👋
            </h1>

            <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
              Aqui está a visão consolidada com indicadores do seu negócio MEI em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/10"
              title="Atualizar indicadores"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <Link
              to="/orcamentos?novo=true"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 text-xs font-bold hover:bg-indigo-50 transition shadow-md"
            >
              <FileText className="w-4 h-4" />
              Novo Orçamento
            </Link>
          </div>
        </div>
      </div>

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
    </div>
  );
}

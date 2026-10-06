import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Search,
  Filter,
  Calendar,
  Tag,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Loader2,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
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
  const clean = String(dateStr).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
};

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const CATEGORIAS_SUGERIDAS = {
  ENTRADA: [
    'Recebimento de Cliente',
    'Prestação de Serviço',
    'Venda de Mercadoria',
    'Aporte Próprio',
    'Rendimento / Outros',
  ],
  SAIDA: [
    'DAS-MEI (Imposto Mensal)',
    'Materiais & Insumos',
    'Aluguel & Contas Básicas',
    'Transporte & Combustível',
    'Ferramentas & Equipamentos',
    'Alimentação Operacional',
    'Pró-Labore / Retirada',
    'Outras Despesas',
  ],
};

export default function Caixa() {
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  // Filters
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroMes, setFiltroMes] = useState('TODOS');
  const [termoBusca, setTermoBusca] = useState('');

  // Modal: Novo Lançamento
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [formNovo, setFormNovo] = useState({
    tipo: 'ENTRADA',
    categoria: '',
    valor: '',
    data_movimentacao: getTodayDateString(),
    descricao: '',
  });
  const [errosForm, setErrosForm] = useState({});
  const [salvando, setSalvando] = useState(false);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    if (type === 'success') {
      setTimeout(() => {
        setFeedback((prev) => (prev.message === message ? { type: null, message: '' } : prev));
      }, 4000);
    }
  };

  const fetchMovimentacoes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/movimentacoes');
      const dados = Array.isArray(res?.data?.dados)
        ? res.data.dados
        : Array.isArray(res?.data)
        ? res.data
        : [];

      // Sort by date descending
      dados.sort((a, b) => {
        const dataA = a.data_movimentacao || a.data || a.criado_em || '';
        const dataB = b.data_movimentacao || b.data || b.criado_em || '';
        return String(dataB).localeCompare(String(dataA));
      });

      setMovimentacoes(dados);
    } catch (err) {
      console.error('Erro ao buscar movimentações de caixa:', err);
      showFeedback('error', 'Falha ao carregar o livro caixa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovimentacoes();
  }, [fetchMovimentacoes]);

  // Open modal if URL has ?novo=true or ?nova_saida=true or ?nova_entrada=true
  useEffect(() => {
    const isNovaSaida = searchParams.get('nova_saida') === 'true';
    const isNovo = searchParams.get('novo') === 'true';
    const isNovaEntrada = searchParams.get('nova_entrada') === 'true';

    if (isNovaSaida || isNovo || isNovaEntrada) {
      setFormNovo({
        tipo: isNovaSaida ? 'SAIDA' : 'ENTRADA',
        categoria: isNovaSaida ? 'DAS-MEI (Imposto Mensal)' : 'Recebimento de Cliente',
        valor: '',
        data_movimentacao: getTodayDateString(),
        descricao: '',
      });
      setErrosForm({});
      setModalNovoAberto(true);

      // Clean search parameters
      searchParams.delete('nova_saida');
      searchParams.delete('novo');
      searchParams.delete('nova_entrada');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Available months extracted from data
  const mesesDisponiveis = useMemo(() => {
    const set = new Set();
    movimentacoes.forEach((item) => {
      const d = item.data_movimentacao || item.data;
      if (d && typeof d === 'string') {
        const [ano, mes] = d.split('T')[0].split('-');
        if (ano && mes) {
          set.add(`${ano}-${mes}`);
        }
      }
    });
    return Array.from(set).sort().reverse();
  }, [movimentacoes]);

  // Summary Totals
  const totais = useMemo(() => {
    let entradas = 0;
    let saidas = 0;

    movimentacoes.forEach((item) => {
      const val = Number(item.valor) || 0;
      const tipo = (item.tipo || '').toUpperCase();
      if (tipo === 'ENTRADA') {
        entradas += val;
      } else if (tipo === 'SAIDA') {
        saidas += val;
      }
    });

    const saldo = entradas - saidas;
    return {
      entradas,
      saidas,
      saldo,
    };
  }, [movimentacoes]);

  // Filtered List
  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter((item) => {
      const tipo = (item.tipo || '').toUpperCase();
      if (filtroTipo !== 'TODOS' && tipo !== filtroTipo) {
        return false;
      }

      const dataStr = item.data_movimentacao || item.data || '';
      if (filtroMes !== 'TODOS' && dataStr) {
        const itemAnoMes = dataStr.slice(0, 7);
        if (itemAnoMes !== filtroMes) return false;
      }

      if (termoBusca.trim()) {
        const q = termoBusca.toLowerCase().trim();
        const desc = (item.descricao || '').toLowerCase();
        const cat = (item.categoria || '').toLowerCase();
        const val = String(item.valor);
        return desc.includes(q) || cat.includes(q) || val.includes(q);
      }

      return true;
    });
  }, [movimentacoes, filtroTipo, filtroMes, termoBusca]);

  // Open modal with pre-selected type
  const handleAbrirModal = (tipoPredefinido = 'SAIDA') => {
    setFormNovo({
      tipo: tipoPredefinido,
      categoria: tipoPredefinido === 'ENTRADA' ? 'Recebimento de Cliente' : 'DAS-MEI (Imposto Mensal)',
      valor: '',
      data_movimentacao: getTodayDateString(),
      descricao: '',
    });
    setErrosForm({});
    setModalNovoAberto(true);
  };

  // Submit Novo Lançamento
  const handleSalvarLancamento = async (e) => {
    e.preventDefault();
    const erros = {};

    if (!formNovo.tipo) {
      erros.tipo = 'Selecione o tipo de movimentação.';
    }
    if (!formNovo.valor || Number(formNovo.valor) <= 0) {
      erros.valor = 'Informe um valor válido maior que zero.';
    }
    if (!formNovo.data_movimentacao) {
      erros.data_movimentacao = 'Informe a data da movimentação.';
    }
    if (!formNovo.descricao || !formNovo.descricao.trim()) {
      erros.descricao = 'Informe uma descrição para o lançamento.';
    }

    if (Object.keys(erros).length > 0) {
      setErrosForm(erros);
      return;
    }

    setSalvando(true);
    setErrosForm({});
    try {
      const payload = {
        tipo: formNovo.tipo,
        categoria: formNovo.categoria || (formNovo.tipo === 'ENTRADA' ? 'Recebimento' : 'Geral'),
        valor: Number(formNovo.valor),
        data_movimentacao: formNovo.data_movimentacao,
        data: formNovo.data_movimentacao,
        descricao: formNovo.descricao.trim(),
      };

      await api.post('/movimentacoes', payload);

      showFeedback(
        'success',
        `${formNovo.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} lançada com sucesso no Livro Caixa!`
      );
      setModalNovoAberto(false);
      fetchMovimentacoes();
    } catch (err) {
      console.error('Erro ao registrar lançamento:', err);
      const msg =
        err?.response?.data?.message || 'Falha ao registrar movimentação. Verifique os dados e tente novamente.';
      showFeedback('error', msg);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback.message && (
        <div
          role="alert"
          className={`flex items-center justify-between p-4 rounded-xl text-sm font-medium border animate-fadeIn ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            ) : (
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback({ type: null, message: '' })}
            className="p-1 rounded-lg hover:bg-black/5 transition"
            aria-label="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-indigo-600" />
            Livro Caixa & Finanças
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Controle entradas, saídas operacionais e apure o saldo líquido do seu negócio MEI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchMovimentacoes}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
            title="Atualizar lançamentos"
            aria-label="Atualizar lançamentos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => handleAbrirModal('SAIDA')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <ArrowUpRight className="w-4 h-4" />
            Nova Saída
          </button>
        </div>
      </div>

      {/* Cards de Resumo Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Entradas */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total de Entradas
            </span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {formatMoney(totais.entradas)}
            </p>
            <div className="flex items-center gap-1 text-xs text-emerald-700 mt-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Recebimentos e faturamento</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        {/* Saídas */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total de Saídas
            </span>
            <p className="text-2xl font-bold text-rose-600 mt-1">
              {formatMoney(totais.saidas)}
            </p>
            <div className="flex items-center gap-1 text-xs text-rose-700 mt-1 font-medium">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Custos, DAS e despesas</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Saldo Líquido */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Saldo Atual Líquido
            </span>
            <p
              className={`text-2xl font-bold mt-1 ${
                totais.saldo >= 0 ? 'text-indigo-600' : 'text-rose-600'
              }`}
            >
              {formatMoney(totais.saldo)}
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 font-medium">
              <span>Posição consolidada líquida</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por descrição, categoria ou valor..."
            aria-label="Buscar movimentações"
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
          {termoBusca && (
            <button
              type="button"
              onClick={() => setTermoBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtros: Tipo e Mês */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Filtro Mês */}
          {mesesDisponiveis.length > 0 && (
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              aria-label="Filtrar por mês"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="TODOS">Todos os Meses</option>
              {mesesDisponiveis.map((m) => {
                const [ano, mes] = m.split('-');
                return (
                  <option key={m} value={m}>
                    {mes}/{ano}
                  </option>
                );
              })}
            </select>
          )}

          {/* Filtro Tipo */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'ENTRADA', label: 'Entradas' },
              { id: 'SAIDA', label: 'Saídas' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFiltroTipo(item.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  filtroTipo === item.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Extrato Cronológico Detalhado */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Carregando extrato do caixa...</p>
        </div>
      ) : movimentacoesFiltradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            {movimentacoes.length === 0
              ? 'Nenhuma movimentação financeira'
              : 'Nenhum lançamento encontrado'}
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
            {movimentacoes.length === 0
              ? 'Ao marcar cobranças de atendimentos como pagas, as receitas entram automaticamente aqui. Você pode registrar despesas operacionais manuais (DAS-MEI, materiais, etc.).'
              : 'Nenhuma movimentação corresponde aos filtros informados. Tente selecionar outro mês ou limpar a busca.'}
          </p>
          {movimentacoes.length === 0 && (
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => handleAbrirModal('SAIDA')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
              >
                <ArrowUpRight className="w-4 h-4" />
                Lançar Saída
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Extrato Detalhado de Movimentações
            </h2>
            <span className="text-xs font-semibold text-gray-500">
              {movimentacoesFiltradas.length} {movimentacoesFiltradas.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4 text-right">Valor (BRL)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {movimentacoesFiltradas.map((item) => {
                  const tipo = (item.tipo || 'ENTRADA').toUpperCase();
                  const isEntrada = tipo === 'ENTRADA';
                  const dataFmt = formatDate(item.data_movimentacao || item.data);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/60 transition group"
                    >
                      {/* Data */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{dataFmt}</span>
                        </div>
                      </td>

                      {/* Descrição */}
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        <div className="flex flex-col">
                          <span>{item.descricao}</span>
                          {item.cobranca_id && (
                            <span className="text-xs text-indigo-600 font-medium inline-flex items-center gap-1 mt-0.5">
                              Origem: Cobrança #{String(item.cobranca_id).padStart(4, '0')}
                              {item.agendamento_id && ` (Agendamento #${item.agendamento_id})`}
                              {item.orcamento_id && ` [Orçamento #${item.orcamento_id}]`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          <Tag className="w-3 h-3 text-gray-400" />
                          {item.categoria || 'Geral'}
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={tipo} />
                      </td>

                      {/* Valor formatado em BRL (+ verde ou - vermelho) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            isEntrada ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isEntrada ? '+' : '-'} {formatMoney(item.valor)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Novo Lançamento */}
      <Modal
        isOpen={modalNovoAberto}
        onClose={() => {
          if (!salvando) {
            setModalNovoAberto(false);
          }
        }}
        title="Novo Lançamento Financeiro"
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              type="button"
              disabled={salvando}
              onClick={() => setModalNovoAberto(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-novo-lancamento"
              disabled={salvando}
              className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-xl transition shadow-sm disabled:opacity-50 ${
                formNovo.tipo === 'ENTRADA'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Registrar {formNovo.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                </>
              )}
            </button>
          </>
        }
      >
        <form id="form-novo-lancamento" onSubmit={handleSalvarLancamento} className="space-y-4">
          {/* Seletor Tipo (Entrada ou Saída) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Tipo de Movimentação <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormNovo({
                    ...formNovo,
                    tipo: 'ENTRADA',
                    categoria: CATEGORIAS_SUGERIDAS.ENTRADA[0],
                  });
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition ${
                  formNovo.tipo === 'ENTRADA'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                Entrada (Receita)
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormNovo({
                    ...formNovo,
                    tipo: 'SAIDA',
                    categoria: CATEGORIAS_SUGERIDAS.SAIDA[0],
                  });
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition ${
                  formNovo.tipo === 'SAIDA'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                Saída (Despesa)
              </button>
            </div>
            {errosForm.tipo && (
              <p className="text-xs text-rose-600 mt-1">{errosForm.tipo}</p>
            )}
          </div>

          {/* Categoria */}
          <FormField
            label="Categoria"
            id="categoria"
            name="categoria"
            as="select"
            value={formNovo.categoria}
            onChange={(e) => setFormNovo({ ...formNovo, categoria: e.target.value })}
            helpText="Escolha a categoria que melhor descreve esta transação."
          >
            {(formNovo.tipo === 'ENTRADA'
              ? CATEGORIAS_SUGERIDAS.ENTRADA
              : CATEGORIAS_SUGERIDAS.SAIDA
            ).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </FormField>

          {/* Valor e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Valor (R$)"
              id="valor"
              name="valor"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0,00"
              value={formNovo.valor}
              onChange={(e) => setFormNovo({ ...formNovo, valor: e.target.value })}
              error={errosForm.valor}
            />

            <FormField
              label="Data da Movimentação"
              id="data_movimentacao"
              name="data_movimentacao"
              type="date"
              required
              value={formNovo.data_movimentacao}
              onChange={(e) => setFormNovo({ ...formNovo, data_movimentacao: e.target.value })}
              error={errosForm.data_movimentacao}
            />
          </div>

          {/* Descrição */}
          <FormField
            label="Descrição do Lançamento"
            id="descricao"
            name="descricao"
            as="textarea"
            rows={3}
            required
            placeholder={
              formNovo.tipo === 'ENTRADA'
                ? 'Ex: Pagamento referente ao serviço prestado para o cliente...'
                : 'Ex: Pagamento do DAS do mês ou compra de insumos...'
            }
            value={formNovo.descricao}
            onChange={(e) => setFormNovo({ ...formNovo, descricao: e.target.value })}
            error={errosForm.descricao}
          />
        </form>
      </Modal>
    </div>
  );
}

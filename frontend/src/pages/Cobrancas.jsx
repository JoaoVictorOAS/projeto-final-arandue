import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  MessageCircle,
  Calendar,
  DollarSign,
  Copy,
  ExternalLink,
  Check,
  RefreshCw,
  Loader2,
  X,
  FileText,
  User,
  ArrowRight,
  Filter,
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

export default function Cobrancas() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Data state
  const [cobrancas, setCobrancas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  // Filters state
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [termoBusca, setTermoBusca] = useState('');

  // Modal: Nova Cobrança
  const [modalNovaAberta, setModalNovaAberta] = useState(false);
  const [formNova, setFormNova] = useState({
    cliente_id: '',
    valor: '',
    vencimento: '',
    observacoes: '',
  });
  const [errosFormNova, setErrosFormNova] = useState({});
  const [salvandoNova, setSalvandoNova] = useState(false);

  // Modal: Dar Baixa
  const [modalBaixaAberta, setModalBaixaAberta] = useState(false);
  const [cobrancaBaixa, setCobrancaBaixa] = useState(null);
  const [dataPagamentoBaixa, setDataPagamentoBaixa] = useState(getTodayDateString());
  const [lancarCaixaBaixa, setLancarCaixaBaixa] = useState(true);
  const [salvandoBaixa, setSalvandoBaixa] = useState(false);

  // Modal: Cobrar via WhatsApp
  const [modalWhatsAberta, setModalWhatsAberta] = useState(false);
  const [cobrancaWhats, setCobrancaWhats] = useState(null);
  const [textoWhatsCopiado, setTextoWhatsCopiado] = useState(false);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    if (type === 'success') {
      setTimeout(() => {
        setFeedback((prev) => (prev.message === message ? { type: null, message: '' } : prev));
      }, 4000);
    }
  };

  // Fetch cobrancas and clientes
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resCobrancas, resClientes] = await Promise.all([
        api.get('/cobrancas'),
        api.get('/clientes').catch(() => ({ data: { dados: [] } })),
      ]);

      const listaCobrancas = Array.isArray(resCobrancas?.data?.dados)
        ? resCobrancas.data.dados
        : Array.isArray(resCobrancas?.data)
        ? resCobrancas.data
        : [];

      const listaClientes = Array.isArray(resClientes?.data?.dados)
        ? resClientes.data.dados
        : Array.isArray(resClientes?.data)
        ? resClientes.data
        : [];

      setCobrancas(listaCobrancas);
      setClientes(listaClientes);
    } catch (err) {
      console.error('Erro ao buscar cobranças/clientes:', err);
      showFeedback('error', 'Falha ao carregar as cobranças. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open modal if URL has ?novo=true
  useEffect(() => {
    if (searchParams.get('novo') === 'true') {
      setModalNovaAberta(true);
      // Clean query parameter
      searchParams.delete('novo');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Map client ID to client object for easy lookup
  const clientesMap = useMemo(() => {
    const map = new Map();
    clientes.forEach((cli) => {
      map.set(Number(cli.id), cli);
    });
    return map;
  }, [clientes]);

  // Helper to get client info for a cobranca
  const getClienteInfo = useCallback(
    (cobranca) => {
      if (cobranca.cliente_nome) {
        return {
          nome: cobranca.cliente_nome,
          telefone: cobranca.cliente_telefone || '',
        };
      }
      if (cobranca.cliente && cobranca.cliente.nome) {
        return {
          nome: cobranca.cliente.nome,
          telefone: cobranca.cliente.telefone || '',
        };
      }
      const cli = clientesMap.get(Number(cobranca.cliente_id));
      if (cli) {
        return {
          nome: cli.nome,
          telefone: cli.telefone || '',
        };
      }
      return { nome: `Cliente #${cobranca.cliente_id || '—'}`, telefone: '' };
    },
    [clientesMap]
  );

  // Compute status taking into account due date
  const computeStatus = useCallback((cobranca) => {
    const rawStatus = (cobranca.status || 'PENDENTE').toUpperCase();
    if (rawStatus === 'PAGO' || rawStatus === 'CANCELADO') {
      return rawStatus;
    }
    const venc = cobranca.vencimento || cobranca.data_vencimento;
    if (venc) {
      const hoje = getTodayDateString();
      const vencFormat = String(venc).split('T')[0];
      if (vencFormat < hoje) {
        return 'ATRASADO';
      }
    }
    return rawStatus;
  }, []);

  // Summary indicators
  const indicadores = useMemo(() => {
    let totalPendente = 0;
    let totalAtrasado = 0;
    let totalPago = 0;
    let totalGeral = 0;

    cobrancas.forEach((c) => {
      const val = Number(c.valor) || 0;
      totalGeral += val;
      const st = computeStatus(c);
      if (st === 'PAGO') {
        totalPago += val;
      } else if (st === 'ATRASADO') {
        totalAtrasado += val;
      } else if (st === 'PENDENTE') {
        totalPendente += val;
      }
    });

    return {
      totalPendente,
      totalAtrasado,
      totalPago,
      totalGeral,
    };
  }, [cobrancas, computeStatus]);

  // Filtered list
  const cobrancasFiltradas = useMemo(() => {
    return cobrancas.filter((item) => {
      const st = computeStatus(item);
      if (filtroStatus !== 'TODOS') {
        if (filtroStatus === 'PENDENTE' && st !== 'PENDENTE') return false;
        if (filtroStatus === 'PAGO' && st !== 'PAGO') return false;
        if (filtroStatus === 'ATRASADO' && st !== 'ATRASADO') return false;
        if (filtroStatus === 'CANCELADO' && st !== 'CANCELADO') return false;
      }

      if (termoBusca.trim()) {
        const query = termoBusca.toLowerCase().trim();
        const cliInfo = getClienteInfo(item);
        const matchCliente = cliInfo.nome.toLowerCase().includes(query);
        const matchObs = (item.observacoes || '').toLowerCase().includes(query);
        const matchId = String(item.id).includes(query);
        const matchValor = String(item.valor).includes(query);
        return matchCliente || matchObs || matchId || matchValor;
      }

      return true;
    });
  }, [cobrancas, filtroStatus, termoBusca, computeStatus, getClienteInfo]);

  // Open "Dar Baixa" Modal
  const handleAbrirBaixa = (cobranca) => {
    setCobrancaBaixa(cobranca);
    setDataPagamentoBaixa(getTodayDateString());
    setLancarCaixaBaixa(true);
    setModalBaixaAberta(true);
  };

  // Submit "Dar Baixa"
  const handleConfirmarBaixa = async (e) => {
    e.preventDefault();
    if (!cobrancaBaixa) return;

    setSalvandoBaixa(true);
    try {
      await api.patch(`/cobrancas/${cobrancaBaixa.id}/pagar`, {
        data_pagamento: dataPagamentoBaixa || getTodayDateString(),
        gerar_movimentacao_caixa: lancarCaixaBaixa,
      });

      showFeedback(
        'success',
        `Cobrança #${cobrancaBaixa.id} dada como paga com sucesso!${
          lancarCaixaBaixa ? ' Lançamento registrado no Caixa.' : ''
        }`
      );
      setModalBaixaAberta(false);
      setCobrancaBaixa(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao dar baixa na cobrança:', err);
      const msg =
        err?.response?.data?.message || 'Falha ao confirmar recebimento. Verifique e tente novamente.';
      showFeedback('error', msg);
    } finally {
      setSalvandoBaixa(false);
    }
  };

  // Open "Cobrar via WhatsApp" Modal
  const handleAbrirWhatsApp = (cobranca) => {
    setCobrancaWhats(cobranca);
    setTextoWhatsCopiado(false);
    setModalWhatsAberta(true);
  };

  // Generate WhatsApp friendly message
  const gerarMensagemWhatsApp = (cobranca) => {
    if (!cobranca) return '';
    const cliInfo = getClienteInfo(cobranca);
    const valorFmt = formatMoney(cobranca.valor);
    const vencFmt = formatDate(cobranca.vencimento || cobranca.data_vencimento);

    return `Olá, ${cliInfo.nome}! Tudo bem? 😊\n\nPassando para enviar o lembrete da sua cobrança referente aos nossos serviços:\n• Valor: ${valorFmt}\n• Vencimento: ${vencFmt}\n\nVocê pode efetuar o pagamento via Pix ou transferência. Se precisar da nossa chave Pix ou de informações adicionais, é só nos avisar por aqui!\n\n(Caso já tenha efetuado o pagamento, por favor desconsidere este aviso). Obrigado pela confiança!`;
  };

  const handleCopiarMensagem = async () => {
    const texto = gerarMensagemWhatsApp(cobrancaWhats);
    try {
      await navigator.clipboard.writeText(texto);
      setTextoWhatsCopiado(true);
      setTimeout(() => setTextoWhatsCopiado(false), 3000);
    } catch {
      // Fallback
      setTextoWhatsCopiado(true);
    }
  };

  const handleEnviarWhatsAppWeb = () => {
    if (!cobrancaWhats) return;
    const cliInfo = getClienteInfo(cobrancaWhats);
    const texto = encodeURIComponent(gerarMensagemWhatsApp(cobrancaWhats));
    const telNumeros = (cliInfo.telefone || '').replace(/\D/g, '');

    let url = '';
    if (telNumeros.length >= 10) {
      // Include Brazil country code 55 if not present
      const phoneWithCountry = telNumeros.startsWith('55') ? telNumeros : `55${telNumeros}`;
      url = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${texto}`;
    } else {
      url = `https://api.whatsapp.com/send?text=${texto}`;
    }
    window.open(url, '_blank');
  };

  // Submit "Nova Cobrança"
  const handleSalvarNova = async (e) => {
    e.preventDefault();
    const erros = {};

    if (!formNova.cliente_id) {
      erros.cliente_id = 'Selecione um cliente.';
    }
    if (!formNova.valor || Number(formNova.valor) <= 0) {
      erros.valor = 'Informe um valor válido maior que zero.';
    }
    if (!formNova.vencimento) {
      erros.vencimento = 'Informe a data de vencimento.';
    }

    if (Object.keys(erros).length > 0) {
      setErrosFormNova(erros);
      return;
    }

    setSalvandoNova(true);
    setErrosFormNova({});
    try {
      await api.post('/cobrancas', {
        cliente_id: Number(formNova.cliente_id),
        valor: Number(formNova.valor),
        vencimento: formNova.vencimento,
        data_vencimento: formNova.vencimento,
        observacoes: formNova.observacoes || null,
      });

      showFeedback('success', 'Nova cobrança emitida com sucesso!');
      setModalNovaAberta(false);
      setFormNova({
        cliente_id: '',
        valor: '',
        vencimento: '',
        observacoes: '',
      });
      fetchData();
    } catch (err) {
      console.error('Erro ao emitir cobrança:', err);
      const msg =
        err?.response?.data?.message || 'Falha ao registrar cobrança. Verifique os dados e tente novamente.';
      showFeedback('error', msg);
    } finally {
      setSalvandoNova(false);
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
            <CreditCard className="w-7 h-7 text-indigo-600" />
            Controle de Cobranças
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Acompanhe pagamentos pendentes, vencidos e pagos com baixa automática no fluxo de caixa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
            title="Atualizar listagem"
            aria-label="Atualizar listagem"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setFormNova({
                cliente_id: '',
                valor: '',
                vencimento: getTodayDateString(),
                observacoes: '',
              });
              setErrosFormNova({});
              setModalNovaAberta(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Nova Cobrança
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pendentes */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">A Vencer / Pendentes</p>
            <p className="text-xl font-bold text-amber-700 mt-1">
              {formatMoney(indicadores.totalPendente)}
            </p>
          </div>
        </div>

        {/* Vencidas / Atrasadas */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Atrasadas</p>
            <p className="text-xl font-bold text-rose-600 mt-1">
              {formatMoney(indicadores.totalAtrasado)}
            </p>
          </div>
        </div>

        {/* Recebidas / Pagas */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Recebidas / Pagas</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">
              {formatMoney(indicadores.totalPago)}
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por cliente, ID ou observação..."
            aria-label="Buscar cobranças"
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

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'PENDENTE', label: 'Pendentes' },
            { id: 'ATRASADO', label: 'Atrasados' },
            { id: 'PAGO', label: 'Pagos' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFiltroStatus(item.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                filtroStatus === item.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Table / Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Carregando cobranças...</p>
        </div>
      ) : cobrancasFiltradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            {cobrancas.length === 0 ? 'Nenhuma cobrança registrada' : 'Nenhuma cobrança encontrada'}
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
            {cobrancas.length === 0
              ? 'Gere cobranças a partir de orçamentos aprovados ou cadastre cobranças avulsas para seus clientes.'
              : 'Nenhum resultado corresponde aos filtros selecionados. Tente ajustar a busca.'}
          </p>
          {cobrancas.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setFormNova({
                  cliente_id: '',
                  valor: '',
                  vencimento: getTodayDateString(),
                  observacoes: '',
                });
                setErrosFormNova({});
                setModalNovaAberta(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Lançar Primeira Cobrança
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Valor</th>
                  <th className="py-3.5 px-4">Vencimento</th>
                  <th className="py-3.5 px-4">Data Pagamento</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Observações</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {cobrancasFiltradas.map((item) => {
                  const status = computeStatus(item);
                  const cliInfo = getClienteInfo(item);
                  const vencimentoFmt = formatDate(item.vencimento || item.data_vencimento);
                  const pagamentoFmt = formatDate(item.data_pagamento);
                  const isPago = status === 'PAGO';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/60 transition group"
                    >
                      {/* ID */}
                      <td className="py-3.5 px-4 font-mono font-medium text-gray-500 text-xs whitespace-nowrap">
                        #{String(item.id).padStart(4, '0')}
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        <div className="flex flex-col">
                          <span>{cliInfo.nome}</span>
                          {cliInfo.telefone && (
                            <span className="text-xs text-gray-400 font-normal">
                              {cliInfo.telefone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Valor formatado BRL */}
                      <td className="py-3.5 px-4 font-bold text-gray-900 whitespace-nowrap">
                        {formatMoney(item.valor)}
                      </td>

                      {/* Vencimento */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 ${
                            status === 'ATRASADO' ? 'text-rose-600 font-semibold' : 'text-gray-600'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {vencimentoFmt}
                        </span>
                      </td>

                      {/* Data de Pagamento */}
                      <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                        {isPago ? (
                          <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            {pagamentoFmt}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Pendente</span>
                        )}
                      </td>

                      {/* StatusBadge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={status} />
                      </td>

                      {/* Observações */}
                      <td className="py-3.5 px-4 text-gray-500 text-xs max-w-xs truncate" title={item.observacoes || ''}>
                        {item.observacoes || '—'}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPago && status !== 'CANCELADO' ? (
                            <>
                              {/* Dar Baixa */}
                              <button
                                type="button"
                                onClick={() => handleAbrirBaixa(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium text-xs border border-emerald-200 transition"
                                title="Confirmar recebimento / Dar Baixa"
                                aria-label={`Dar baixa na cobrança ${item.id}`}
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                Dar Baixa
                              </button>

                              {/* Cobrar WhatsApp */}
                              <button
                                type="button"
                                onClick={() => handleAbrirWhatsApp(item)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium text-xs border border-green-200 transition"
                                title="Enviar lembrete pelo WhatsApp"
                                aria-label={`Cobrar via WhatsApp cobrança ${item.id}`}
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                                <span className="hidden md:inline">WhatsApp</span>
                              </button>
                            </>
                          ) : isPago ? (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                              Recebido
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Cancelado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Dar Baixa */}
      <Modal
        isOpen={modalBaixaAberta}
        onClose={() => {
          if (!salvandoBaixa) {
            setModalBaixaAberta(false);
            setCobrancaBaixa(null);
          }
        }}
        title="Confirmar Recebimento / Dar Baixa"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              disabled={salvandoBaixa}
              onClick={() => {
                setModalBaixaAberta(false);
                setCobrancaBaixa(null);
              }}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-dar-baixa"
              disabled={salvandoBaixa}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
            >
              {salvandoBaixa ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirmar Baixa
                </>
              )}
            </button>
          </>
        }
      >
        {cobrancaBaixa && (
          <form id="form-dar-baixa" onSubmit={handleConfirmarBaixa} className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Cobrança #{String(cobrancaBaixa.id).padStart(4, '0')}</span>
                <span>Vencimento: {formatDate(cobrancaBaixa.vencimento || cobrancaBaixa.data_vencimento)}</span>
              </div>
              <p className="text-sm font-bold text-gray-900">
                {getClienteInfo(cobrancaBaixa).nome}
              </p>
              <p className="text-2xl font-extrabold text-emerald-600">
                {formatMoney(cobrancaBaixa.valor)}
              </p>
            </div>

            <FormField
              label="Data do Pagamento"
              id="data_pagamento"
              name="data_pagamento"
              type="date"
              required
              value={dataPagamentoBaixa}
              onChange={(e) => setDataPagamentoBaixa(e.target.value)}
              helpText="Data em que o valor entrou na conta."
            />

            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-3">
              <input
                type="checkbox"
                id="gerar_movimentacao_caixa"
                checked={lancarCaixaBaixa}
                onChange={(e) => setLancarCaixaBaixa(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="gerar_movimentacao_caixa" className="text-xs text-gray-700 cursor-pointer">
                <span className="font-semibold block text-indigo-900">
                  Lançar automaticamente no Livro Caixa
                </span>
                Gera um registro de entrada financeira com categoria de recebimento vinculada a esta cobrança.
              </label>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: Cobrar via WhatsApp */}
      <Modal
        isOpen={modalWhatsAberta}
        onClose={() => {
          setModalWhatsAberta(false);
          setCobrancaWhats(null);
        }}
        title="Cobrar via WhatsApp"
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setModalWhatsAberta(false);
                setCobrancaWhats(null);
              }}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleCopiarMensagem}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
            >
              {textoWhatsCopiado ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Mensagem
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleEnviarWhatsAppWeb}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir WhatsApp
            </button>
          </>
        }
      >
        {cobrancaWhats && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Mensagem amigável pronta para envio ao cliente com os dados da cobrança:
            </p>

            <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 font-sans text-sm text-gray-800 whitespace-pre-line leading-relaxed">
              {gerarMensagemWhatsApp(cobrancaWhats)}
            </div>

            <div className="text-xs text-gray-500 flex items-center justify-between">
              <span>
                Destinatário:{' '}
                <strong className="text-gray-700">
                  {getClienteInfo(cobrancaWhats).nome}
                </strong>
              </span>
              <span>
                Telefone:{' '}
                <strong className="text-gray-700">
                  {getClienteInfo(cobrancaWhats).telefone || 'Não cadastrado'}
                </strong>
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: Nova Cobrança */}
      <Modal
        isOpen={modalNovaAberta}
        onClose={() => {
          if (!salvandoNova) {
            setModalNovaAberta(false);
          }
        }}
        title="Emitir Nova Cobrança"
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              type="button"
              disabled={salvandoNova}
              onClick={() => setModalNovaAberta(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-nova-cobranca"
              disabled={salvandoNova}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
            >
              {salvandoNova ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Emitindo...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Emitir Cobrança
                </>
              )}
            </button>
          </>
        }
      >
        <form id="form-nova-cobranca" onSubmit={handleSalvarNova} className="space-y-4">
          <FormField
            label="Cliente"
            id="cliente_id"
            name="cliente_id"
            as="select"
            required
            value={formNova.cliente_id}
            onChange={(e) => setFormNova({ ...formNova, cliente_id: e.target.value })}
            error={errosFormNova.cliente_id}
          >
            <option value="">Selecione um cliente...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} {c.telefone ? `(${c.telefone})` : ''}
              </option>
            ))}
          </FormField>

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
              value={formNova.valor}
              onChange={(e) => setFormNova({ ...formNova, valor: e.target.value })}
              error={errosFormNova.valor}
            />

            <FormField
              label="Data de Vencimento"
              id="vencimento"
              name="vencimento"
              type="date"
              required
              value={formNova.vencimento}
              onChange={(e) => setFormNova({ ...formNova, vencimento: e.target.value })}
              error={errosFormNova.vencimento}
            />
          </div>

          <FormField
            label="Observações / Descrição"
            id="observacoes"
            name="observacoes"
            as="textarea"
            rows={3}
            placeholder="Ex: Pagamento referente ao serviço de consultoria ou produto X..."
            value={formNova.observacoes}
            onChange={(e) => setFormNova({ ...formNova, observacoes: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}

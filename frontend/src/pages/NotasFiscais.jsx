import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Eye,
  Ban,
  Download,
  Building,
  UserCheck,
  ShoppingBag,
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';

export const formatCurrency = (val) => {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const TIPO_LABELS = {
  NFSE: { label: 'NFS-e (Serviço)', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  NFE: { label: 'NF-e (Mercadorias)', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  NFCE: { label: 'NFC-e (Consumidor)', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function NotasFiscais() {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  // Filtros
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('TODOS');
  const [tipoFiltro, setTipoFiltro] = useState('TODOS');

  // Modais
  const [modalEmissaoAberto, setModalEmissaoAberto] = useState(false);
  const [modalDanfeAberto, setModalDanfeAberto] = useState(false);
  const [modalCancelarAberto, setModalCancelarAberto] = useState(false);

  // Estado do DANFE
  const [danfeHtml, setDanfeHtml] = useState('');
  const [loadingDanfe, setLoadingDanfe] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState(null);

  // Estado do Cancelamento
  const [notaParaCancelar, setNotaParaCancelar] = useState(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [cancelando, setCancelando] = useState(false);

  // Form de Emissão
  const [tipoEmissao, setTipoEmissao] = useState('NFSE'); // 'NFSE', 'NFE', 'NFCE'
  const [formEmissao, setFormEmissao] = useState({
    tomador_nome: '',
    tomador_documento: '',
    tomador_email: '',
    descricao_servico: '',
    valor_total: '',
    gerar_caixa: true,
    itens: [{ descricao: '', quantidade: 1, valor_unitario: '' }],
  });
  const [emitindo, setEmitindo] = useState(false);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    if (type === 'success') {
      setTimeout(() => {
        setFeedback((prev) => (prev.message === message ? { type: null, message: '' } : prev));
      }, 4000);
    }
  };

  // Carrega notas fiscais
  const carregarNotas = useCallback(async () => {
    try {
      const params = {};
      if (busca.trim()) params.busca = busca.trim();
      if (statusFiltro !== 'TODOS') params.status = statusFiltro;
      if (tipoFiltro !== 'TODOS') params.tipo = tipoFiltro;

      const res = await api.get('/notas-fiscais', { params });
      const dados = res?.data?.dados || res?.data || [];
      setNotas(Array.isArray(dados) ? dados : []);
    } catch (err) {
      console.error('Erro ao buscar notas fiscais:', err);
      showFeedback('error', 'Falha ao carregar as notas fiscais.');
    } finally {
      setLoading(false);
    }
  }, [busca, statusFiltro, tipoFiltro]);

  useEffect(() => {
    carregarNotas();
  }, [carregarNotas]);

  // Visualizar DANFE
  const handleVerDanfe = async (nota) => {
    setNotaSelecionada(nota);
    setModalDanfeAberto(true);
    setLoadingDanfe(true);
    setDanfeHtml('');
    try {
      const res = await api.get(`/notas-fiscais/${nota.id}/danfe`);
      const html = typeof res.data === 'string' ? res.data : res.data?.dados || '';
      setDanfeHtml(html);
    } catch (err) {
      console.error('Erro ao carregar DANFE:', err);
      showFeedback('error', 'Não foi possível carregar o DANFE da nota fiscal.');
    } finally {
      setLoadingDanfe(false);
    }
  };

  // Submeter Emissão de Nota Fiscal
  const handleEmitirNota = async (e) => {
    e.preventDefault();
    setEmitindo(true);

    try {
      if (tipoEmissao === 'NFSE') {
        if (!formEmissao.descricao_servico.trim()) {
          showFeedback('error', 'A descrição do serviço é obrigatória.');
          setEmitindo(false);
          return;
        }
        if (!formEmissao.valor_total || parseFloat(formEmissao.valor_total) <= 0) {
          showFeedback('error', 'Informe um valor total válido para a NFS-e.');
          setEmitindo(false);
          return;
        }

        await api.post('/notas-fiscais/nfse', {
          tomador_nome: formEmissao.tomador_nome.trim() || 'Cliente Não Identificado',
          tomador_documento: formEmissao.tomador_documento.trim() || null,
          tomador_email: formEmissao.tomador_email.trim() || null,
          descricao_servico: formEmissao.descricao_servico.trim(),
          valor_total: parseFloat(formEmissao.valor_total),
          gerar_caixa: formEmissao.gerar_caixa,
        });

        showFeedback('success', 'NFS-e emitida e autorizada com sucesso!');
      } else {
        // NFE ou NFCE
        const itensValidados = formEmissao.itens
          .filter((it) => it.descricao.trim())
          .map((it) => ({
            descricao: it.descricao.trim(),
            quantidade: parseFloat(it.quantidade) || 1,
            valor_unitario: parseFloat(it.valor_unitario) || 0,
          }));

        if (itensValidados.length === 0) {
          showFeedback('error', 'Adicione pelo menos um item válido na nota.');
          setEmitindo(false);
          return;
        }

        const endpoint = tipoEmissao === 'NFE' ? '/notas-fiscais/nfe' : '/notas-fiscais/nfce';
        await api.post(endpoint, {
          destinatario_nome: formEmissao.tomador_nome.trim() || 'Consumidor Final',
          destinatario_documento: formEmissao.tomador_documento.trim() || null,
          itens: itensValidados,
          gerar_caixa: formEmissao.gerar_caixa,
        });

        showFeedback('success', `${tipoEmissao} emitida e autorizada com sucesso!`);
      }

      setModalEmissaoAberto(false);
      setFormEmissao({
        tomador_nome: '',
        tomador_documento: '',
        tomador_email: '',
        descricao_servico: '',
        valor_total: '',
        gerar_caixa: true,
        itens: [{ descricao: '', quantidade: 1, valor_unitario: '' }],
      });
      await carregarNotas();
    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao emitir nota fiscal.';
      showFeedback('error', msg);
    } finally {
      setEmitindo(false);
    }
  };

  // Cancelar Nota Fiscal
  const handleCancelarNota = async (e) => {
    e.preventDefault();
    if (!motivoCancelamento.trim() || motivoCancelamento.trim().length < 15) {
      showFeedback('error', 'O motivo do cancelamento deve conter no mínimo 15 caracteres (exigência fiscal).');
      return;
    }
    setCancelando(true);
    try {
      await api.post(`/notas-fiscais/${notaParaCancelar.id}/cancelar`, {
        motivo: motivoCancelamento.trim(),
      });
      showFeedback('success', `Nota Fiscal #${notaParaCancelar.numero} cancelada com sucesso.`);
      setModalCancelarAberto(false);
      setMotivoCancelamento('');
      setNotaParaCancelar(null);
      await carregarNotas();
    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao cancelar nota fiscal.';
      showFeedback('error', msg);
    } finally {
      setCancelando(false);
    }
  };

  // Métricas
  const totalEmitido = useMemo(
    () =>
      notas
        .filter((n) => n.status === 'EMITIDA')
        .reduce((acc, curr) => acc + (parseFloat(curr.valor_total) || 0), 0),
    [notas]
  );

  const totalNotas = notas.length;
  const totalCanceladas = useMemo(() => notas.filter((n) => n.status === 'CANCELADA').length, [notas]);

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedback.message && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between transition-all ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
          role="alert"
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            ) : (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback({ type: null, message: '' })}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-600" />
            Notas Fiscais (NFS-e / NF-e / NFC-e)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Emissão simplificada padrão MEI, geração de DANFE e integração automática com o Livro Caixa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalEmissaoAberto(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Emitir Nova Nota
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Faturado em Notas</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalEmitido)}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notas Emitidas</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalNotas}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notas Canceladas</p>
            <p className={`text-2xl font-bold mt-1 ${totalCanceladas > 0 ? 'text-red-600' : 'text-gray-700'}`}>
              {totalCanceladas}
            </p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <Ban className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, documento ou número..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="TODOS">Todos os Modelos</option>
            <option value="NFSE">NFS-e (Serviços)</option>
            <option value="NFE">NF-e (Mercadorias)</option>
            <option value="NFCE">NFC-e (Consumidor)</option>
          </select>

          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="EMITIDA">Emitidas</option>
            <option value="CANCELADA">Canceladas</option>
          </select>

          <button
            type="button"
            onClick={carregarNotas}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Recarregar notas"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabela de Notas Fiscais */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-sm">Carregando documentos fiscais...</p>
          </div>
        ) : notas.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-800">Nenhuma nota fiscal encontrada</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Emita sua primeira nota fiscal de serviço ou venda em poucos segundos com validação MEI.
            </p>
            <button
              type="button"
              onClick={() => setModalEmissaoAberto(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Emitir Primeira Nota
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5">Número / Série</th>
                  <th className="px-6 py-3.5">Tipo</th>
                  <th className="px-6 py-3.5">Tomador / Destinatário</th>
                  <th className="px-6 py-3.5">Emissão</th>
                  <th className="px-6 py-3.5">Valor Total</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {notas.map((n) => {
                  const tipoInfo = TIPO_LABELS[n.tipo] || {
                    label: n.tipo,
                    badge: 'bg-gray-50 text-gray-700 border-gray-200',
                  };

                  return (
                    <tr key={n.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">
                        #{n.numero}
                        <span className="text-xs text-gray-400 font-normal ml-1">
                          (Série {n.serie})
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tipoInfo.badge}`}
                        >
                          {tipoInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-800 font-medium">
                        {n.tomador_nome || n.destinatario_nome || 'Consumidor Final'}
                        {(n.tomador_documento || n.destinatario_documento) && (
                          <span className="block text-xs text-gray-400 font-normal">
                            Doc: {n.tomador_documento || n.destinatario_documento}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{formatDate(n.data_emissao)}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {formatCurrency(n.valor_total)}
                      </td>
                      <td className="px-6 py-4">
                        {n.status === 'EMITIDA' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Emitida
                          </span>
                        ) : n.status === 'CANCELADA' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                            <Ban className="w-3.5 h-3.5" />
                            Cancelada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                            {n.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleVerDanfe(n)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          title="Visualizar DANFE"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          DANFE
                        </button>

                        {n.status === 'EMITIDA' && (
                          <button
                            type="button"
                            onClick={() => {
                              setNotaParaCancelar(n);
                              setModalCancelarAberto(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            title="Cancelar nota fiscal"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Emissão de Nota Fiscal */}
      <Modal
        isOpen={modalEmissaoAberto}
        onClose={() => setModalEmissaoAberto(false)}
        title="Emitir Novo Documento Fiscal (MEI)"
      >
        <form onSubmit={handleEmitirNota} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Modelo do Documento:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipoEmissao('NFSE')}
                className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                  tipoEmissao === 'NFSE'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                NFS-e (Serviço)
              </button>
              <button
                type="button"
                onClick={() => setTipoEmissao('NFE')}
                className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                  tipoEmissao === 'NFE'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                NF-e (Mercadorias)
              </button>
              <button
                type="button"
                onClick={() => setTipoEmissao('NFCE')}
                className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                  tipoEmissao === 'NFCE'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                NFC-e (Consumidor)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Nome do Tomador / Cliente"
              id="tomador-nome"
              value={formEmissao.tomador_nome}
              onChange={(e) => setFormEmissao({ ...formEmissao, tomador_nome: e.target.value })}
              placeholder="Ex: João da Silva"
            />

            <FormField
              label="CPF ou CNPJ (Opcional para PF)"
              id="tomador-doc"
              value={formEmissao.tomador_documento}
              onChange={(e) => setFormEmissao({ ...formEmissao, tomador_documento: e.target.value })}
              placeholder="000.000.000-00"
            />
          </div>

          {tipoEmissao === 'NFSE' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição dos Serviços Prestados:
                </label>
                <textarea
                  rows={3}
                  value={formEmissao.descricao_servico}
                  onChange={(e) =>
                    setFormEmissao({ ...formEmissao, descricao_servico: e.target.value })
                  }
                  placeholder="Ex: Prestação de serviços de manutenção elétrica residencial."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <FormField
                label="Valor Total do Serviço (R$)"
                id="valor-total-nfse"
                type="number"
                step="0.01"
                value={formEmissao.valor_total}
                onChange={(e) => setFormEmissao({ ...formEmissao, valor_total: e.target.value })}
                placeholder="Ex: 150.00"
                required
              />
            </>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Itens / Produtos da Nota:
              </label>
              {formEmissao.itens.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="text"
                    placeholder="Descrição do produto"
                    value={it.descricao}
                    onChange={(e) => {
                      const novo = [...formEmissao.itens];
                      novo[idx].descricao = e.target.value;
                      setFormEmissao({ ...formEmissao, itens: novo });
                    }}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qtd"
                    value={it.quantidade}
                    onChange={(e) => {
                      const novo = [...formEmissao.itens];
                      novo[idx].quantidade = e.target.value;
                      setFormEmissao({ ...formEmissao, itens: novo });
                    }}
                    className="w-16 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="R$ Unit"
                    value={it.valor_unitario}
                    onChange={(e) => {
                      const novo = [...formEmissao.itens];
                      novo[idx].valor_unitario = e.target.value;
                      setFormEmissao({ ...formEmissao, itens: novo });
                    }}
                    className="w-24 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                  {formEmissao.itens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormEmissao({
                          ...formEmissao,
                          itens: formEmissao.itens.filter((_, i) => i !== idx),
                        });
                      }}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setFormEmissao({
                    ...formEmissao,
                    itens: [...formEmissao.itens, { descricao: '', quantidade: 1, valor_unitario: '' }],
                  })
                }
                className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Outro Item
              </button>
            </div>
          )}

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={formEmissao.gerar_caixa}
                onChange={(e) => setFormEmissao({ ...formEmissao, gerar_caixa: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-medium">Lançar recebimento automaticamente no Livro Caixa</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Registra uma receita na data de emissão correspondente ao valor total desta nota fiscal.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalEmissaoAberto(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={emitindo}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {emitindo && <Loader2 className="w-4 h-4 animate-spin" />}
              Autorizar e Emitir Nota
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Visualização do DANFE */}
      <Modal
        isOpen={modalDanfeAberto}
        onClose={() => setModalDanfeAberto(false)}
        title={`DANFE Simplificado — Nota #${notaSelecionada?.numero || ''}`}
      >
        <div className="space-y-4">
          {loadingDanfe ? (
            <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="text-sm">Carregando layout oficial do DANFE...</p>
            </div>
          ) : danfeHtml ? (
            <div
              className="border border-gray-200 rounded-lg p-4 bg-white max-h-[70vh] overflow-y-auto text-xs"
              dangerouslySetInnerHTML={{ __html: danfeHtml }}
            />
          ) : (
            <p className="text-sm text-gray-500 py-6 text-center">DANFE indisponível para esta nota.</p>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              Protocolo SEFAZ: {notaSelecionada?.protocolo_autorizacao || 'Autorizado'}
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Imprimir / Salvar PDF
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Cancelamento de Nota */}
      <Modal
        isOpen={modalCancelarAberto}
        onClose={() => setModalCancelarAberto(false)}
        title={`Cancelar Nota Fiscal #${notaParaCancelar?.numero || ''}`}
      >
        <form onSubmit={handleCancelarNota} className="space-y-4">
          <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs leading-relaxed">
            ⚠️ O cancelamento de documento fiscal é irreversível e exige um motivo formal com no mínimo 15 caracteres para transmissão aos órgãos fiscais.
          </div>

          <div>
            <label htmlFor="motivo-cancelamento" className="block text-sm font-semibold text-gray-700 mb-1">
              Justificativa / Motivo do Cancelamento:
            </label>
            <textarea
              id="motivo-cancelamento"
              rows={3}
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              placeholder="Ex: Erro no preenchimento do valor do serviço prestado pelo emitente."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Caracteres: {motivoCancelamento.trim().length} / 15 mínimos.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalCancelarAberto(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={cancelando || motivoCancelamento.trim().length < 15}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {cancelando && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar Cancelamento
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

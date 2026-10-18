import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X,
  Layers,
  Repeat,
  Calendar,
  DollarSign,
  Users,
  Play,
  Pause,
  Ban,
  Receipt,
  Clock,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import FormField from '../components/FormField';

const CATEGORIAS_PADRAO = [
  'Serviço',
  'Produto',
  'Mão de Obra',
  'Consultoria',
  'Manutenção',
  'Outro',
];

const PERIODICIDADES = [
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'QUINZENAL', label: 'Quinzenal' },
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'SEMESTRAL', label: 'Semestral' },
  { value: 'ANUAL', label: 'Anual' },
];

const INITIAL_FORM = {
  nome: '',
  categoria: 'Serviço',
  preco: '',
  descricao: '',
  ativo: 1,
  recorrente: false,
  periodicidade: 'MENSAL',
  dia_vencimento_padrao: 10,
};

const INITIAL_ASSINATURA_FORM = {
  cliente_id: '',
  servico_id: '',
  valor: '',
  periodicidade: 'MENSAL',
  dia_vencimento: 10,
  data_inicio: new Date().toISOString().slice(0, 10),
  observacoes: '',
};

export const formatCurrency = (val) => {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

export default function Servicos() {
  const [abaAtiva, setAbaAtiva] = useState('catalogo'); // 'catalogo' | 'assinaturas'

  // Catálogo State
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODAS');
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  // Modals Catálogo
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingServico, setEditingServico] = useState(null);
  const [deletingServico, setDeletingServico] = useState(null);

  // Form Catálogo
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});

  // Assinaturas State
  const [assinaturas, setAssinaturas] = useState([]);
  const [resumoAssinaturas, setResumoAssinaturas] = useState({
    total_assinaturas: 0,
    total_ativas: 0,
    total_pausadas: 0,
    total_canceladas: 0,
    mrr: 0,
    proximos_vencimentos_30d: 0,
  });
  const [loadingAssinaturas, setLoadingAssinaturas] = useState(false);
  const [filtroStatusAssinatura, setFiltroStatusAssinatura] = useState('TODAS');
  const [clientes, setClientes] = useState([]);
  const [modalAssinaturaOpen, setModalAssinaturaOpen] = useState(false);
  const [formAssinatura, setFormAssinatura] = useState(INITIAL_ASSINATURA_FORM);
  const [formAssinaturaErrors, setFormAssinaturaErrors] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    if (type === 'success') {
      setTimeout(() => {
        setFeedback((prev) => (prev.message === message ? { type: null, message: '' } : prev));
      }, 4000);
    }
  };

  const fetchServicos = useCallback(async (termoBusca = '') => {
    setLoading(true);
    setFeedback({ type: null, message: '' });
    try {
      const params = {};
      if (termoBusca && termoBusca.trim()) {
        params.busca = termoBusca.trim();
      }

      const res = await api.get('/servicos', { params });
      let lista = [];
      if (Array.isArray(res?.data?.dados)) {
        lista = res.data.dados;
      } else if (Array.isArray(res?.data)) {
        lista = res.data;
      } else if (res?.data?.servicos && Array.isArray(res.data.servicos)) {
        lista = res.data.servicos;
      } else if (res?.data?.data && Array.isArray(res.data.data)) {
        lista = res.data.data;
      }
      setServicos(lista);
    } catch (err) {
      console.error('Erro ao carregar serviços:', err);
      showFeedback('error', 'Não foi possível carregar o catálogo de serviços. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssinaturas = useCallback(async () => {
    setLoadingAssinaturas(true);
    try {
      const params = {};
      if (filtroStatusAssinatura && filtroStatusAssinatura !== 'TODAS') {
        params.status = filtroStatusAssinatura;
      }
      const res = await api.get('/servicos/assinaturas', { params });
      const lista = Array.isArray(res?.data?.dados) ? res.data.dados : [];
      setAssinaturas(lista);
      if (res?.data?.resumo) {
        setResumoAssinaturas(res.data.resumo);
      }
    } catch (err) {
      console.error('Erro ao carregar assinaturas:', err);
      showFeedback('error', 'Não foi possível carregar as assinaturas recorrentes.');
    } finally {
      setLoadingAssinaturas(false);
    }
  }, [filtroStatusAssinatura]);

  const fetchClientes = useCallback(async () => {
    try {
      const res = await api.get('/clientes');
      const lista = Array.isArray(res?.data?.dados) ? res.data.dados : (Array.isArray(res?.data) ? res.data : []);
      setClientes(lista);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    }
  }, []);

  const isFirstRender = React.useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchServicos('');
      return;
    }

    const timer = setTimeout(() => {
      fetchServicos(busca);
    }, 300);

    return () => clearTimeout(timer);
  }, [busca, fetchServicos]);

  useEffect(() => {
    if (abaAtiva === 'assinaturas') {
      fetchAssinaturas();
      fetchClientes();
    }
  }, [abaAtiva, fetchAssinaturas, fetchClientes]);

  // Modal Novo / Editar Serviço Handlers
  const handleOpenCreateModal = () => {
    setEditingServico(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEditModal = (servico) => {
    setEditingServico(servico);
    setFormData({
      nome: servico.nome || '',
      categoria: servico.categoria || 'Serviço',
      preco: servico.preco !== undefined ? String(servico.preco) : '',
      descricao: servico.descricao || '',
      ativo: servico.ativo !== undefined ? (servico.ativo ? 1 : 0) : 1,
      recorrente: Boolean(servico.recorrente),
      periodicidade: servico.periodicidade || 'MENSAL',
      dia_vencimento_padrao: servico.dia_vencimento_padrao || 10,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenDeleteModal = (servico) => {
    setDeletingServico(servico);
    setDeleteModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.nome || !formData.nome.trim()) {
      errors.nome = 'O nome do serviço/produto é obrigatório.';
    }

    if (formData.preco === '' || isNaN(Number(formData.preco)) || Number(formData.preco) < 0) {
      errors.preco = 'Informe um preço válido (maior ou igual a 0).';
    }

    if (formData.recorrente) {
      const dia = Number(formData.dia_vencimento_padrao);
      if (isNaN(dia) || dia < 1 || dia > 31) {
        errors.dia_vencimento_padrao = 'O dia de vencimento padrão deve ser entre 1 e 31.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        nome: formData.nome.trim(),
        categoria: formData.categoria || 'Geral',
        preco: parseFloat(formData.preco) || 0,
        descricao: formData.descricao?.trim() || null,
        ativo: Number(formData.ativo),
        recorrente: Boolean(formData.recorrente),
        periodicidade: formData.recorrente ? formData.periodicidade : null,
        dia_vencimento_padrao: formData.recorrente ? Number(formData.dia_vencimento_padrao) : null,
      };

      if (editingServico) {
        await api.put(`/servicos/${editingServico.id}`, payload);
        showFeedback('success', 'Serviço atualizado com sucesso!');
      } else {
        await api.post('/servicos', payload);
        showFeedback('success', 'Serviço cadastrado com sucesso!');
      }

      setModalOpen(false);
      fetchServicos(busca);
    } catch (err) {
      console.error('Erro ao salvar serviço:', err);
      const msg = err.response?.data?.mensagem || err.response?.data?.error || 'Falha ao salvar os dados do serviço.';
      setFormErrors((prev) => ({ ...prev, geral: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingServico) return;

    setSubmitting(true);
    try {
      await api.delete(`/servicos/${deletingServico.id}`);
      showFeedback('success', `Serviço "${deletingServico.nome}" excluído com sucesso!`);
      setDeleteModalOpen(false);
      setDeletingServico(null);
      fetchServicos(busca);
    } catch (err) {
      console.error('Erro ao excluir serviço:', err);
      const msg = err.response?.data?.mensagem || err.response?.data?.error || 'Falha ao excluir o serviço.';
      showFeedback('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Modal Nova Assinatura Handlers
  const handleOpenModalAssinatura = () => {
    setFormAssinatura(INITIAL_ASSINATURA_FORM);
    setFormAssinaturaErrors({});
    fetchClientes();
    setModalAssinaturaOpen(true);
  };

  const handleAssinaturaInputChange = (e) => {
    const { name, value } = e.target;
    setFormAssinatura((prev) => {
      const updated = { ...prev, [name]: value };

      // Se mudou de serviço, preenche os dados padrão do serviço
      if (name === 'servico_id') {
        const servicoSelecionado = servicos.find((s) => String(s.id) === String(value));
        if (servicoSelecionado) {
          updated.valor = servicoSelecionado.preco !== undefined ? String(servicoSelecionado.preco) : prev.valor;
          if (servicoSelecionado.periodicidade) {
            updated.periodicidade = servicoSelecionado.periodicidade;
          }
          if (servicoSelecionado.dia_vencimento_padrao) {
            updated.dia_vencimento = servicoSelecionado.dia_vencimento_padrao;
          }
        }
      }

      return updated;
    });

    if (formAssinaturaErrors[name]) {
      setFormAssinaturaErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateAssinaturaForm = () => {
    const errors = {};
    if (!formAssinatura.cliente_id) errors.cliente_id = 'Selecione o cliente.';
    if (!formAssinatura.servico_id) errors.servico_id = 'Selecione o serviço.';
    if (formAssinatura.valor === '' || isNaN(Number(formAssinatura.valor)) || Number(formAssinatura.valor) < 0) {
      errors.valor = 'Informe um valor válido maior ou igual a zero.';
    }
    const dia = Number(formAssinatura.dia_vencimento);
    if (isNaN(dia) || dia < 1 || dia > 31) {
      errors.dia_vencimento = 'O dia de vencimento deve estar entre 1 e 31.';
    }
    if (!formAssinatura.data_inicio) errors.data_inicio = 'Informe a data de início.';

    setFormAssinaturaErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAssinaturaSubmit = async (e) => {
    e.preventDefault();
    if (!validateAssinaturaForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        cliente_id: Number(formAssinatura.cliente_id),
        servico_id: Number(formAssinatura.servico_id),
        valor: parseFloat(formAssinatura.valor) || 0,
        periodicidade: formAssinatura.periodicidade || 'MENSAL',
        dia_vencimento: Number(formAssinatura.dia_vencimento) || 10,
        data_inicio: formAssinatura.data_inicio,
        observacoes: formAssinatura.observacoes?.trim() || null,
      };

      await api.post('/servicos/assinaturas', payload);
      showFeedback('success', 'Assinatura recorrente contratada com sucesso!');
      setModalAssinaturaOpen(false);
      fetchAssinaturas();
    } catch (err) {
      console.error('Erro ao cadastrar assinatura:', err);
      const msg = err.response?.data?.mensagem || err.response?.data?.error || 'Falha ao cadastrar a assinatura.';
      setFormAssinaturaErrors((prev) => ({ ...prev, geral: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGerarCobranca = async (assinaturaId) => {
    setActionLoadingId(assinaturaId);
    try {
      const res = await api.post(`/servicos/assinaturas/${assinaturaId}/gerar-cobranca`);
      const proxVenc = res?.data?.dados?.proximo_vencimento;
      showFeedback(
        'success',
        `Cobrança gerada com sucesso! Próximo ciclo agendado para ${proxVenc ? proxVenc.split('-').reverse().join('/') : 'o próximo vencimento'}.`
      );
      fetchAssinaturas();
    } catch (err) {
      console.error('Erro ao gerar cobrança:', err);
      const msg = err.response?.data?.mensagem || err.response?.data?.error || 'Erro ao gerar cobrança do ciclo.';
      showFeedback('error', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAlterarStatusAssinatura = async (assinaturaId, novoStatus) => {
    setActionLoadingId(assinaturaId);
    try {
      await api.patch(`/servicos/assinaturas/${assinaturaId}/status`, { status: novoStatus });
      showFeedback('success', `Assinatura ${novoStatus === 'ATIVA' ? 'reativada' : novoStatus.toLowerCase()} com sucesso!`);
      fetchAssinaturas();
    } catch (err) {
      console.error('Erro ao alterar status da assinatura:', err);
      const msg = err.response?.data?.mensagem || err.response?.data?.error || 'Erro ao alterar status.';
      showFeedback('error', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter list by category locally
  const servicosFiltrados = servicos.filter((s) => {
    if (categoriaFiltro === 'TODAS') return true;
    return s.categoria === categoriaFiltro;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-indigo-600" />
            Serviços e Assinaturas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie o catálogo de serviços, produtos e contratos periódicos com seus clientes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {abaAtiva === 'catalogo' ? (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              Novo Serviço
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenModalAssinatura}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              Nova Assinatura
            </button>
          )}
        </div>
      </div>

      {/* Navegação entre Abas */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setAbaAtiva('catalogo')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold transition border-b-2 ${
            abaAtiva === 'catalogo'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Catálogo de Serviços
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('assinaturas')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold transition border-b-2 ${
            abaAtiva === 'assinaturas'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Repeat className="w-4 h-4" />
          Assinaturas Recorrentes
          {resumoAssinaturas.total_ativas > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 font-bold">
              {resumoAssinaturas.total_ativas}
            </span>
          )}
        </button>
      </div>

      {/* Feedback Alerts */}
      {feedback.message && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-sm flex items-start justify-between gap-3 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <p className="font-medium">{feedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setFeedback({ type: null, message: '' })}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Fechar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ABA 1: CATÁLOGO DE SERVIÇOS */}
      {abaAtiva === 'catalogo' && (
        <div className="space-y-6">
          {/* Filter / Search Bar */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar serviço por nome ou descrição..."
                  className="w-full pl-10 pr-9 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                {busca && (
                  <button
                    type="button"
                    onClick={() => setBusca('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    aria-label="Limpar busca"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="sm:w-48">
                <select
                  value={categoriaFiltro}
                  onChange={(e) => setCategoriaFiltro(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  aria-label="Filtrar por categoria"
                >
                  <option value="TODAS">Todas Categorias</option>
                  {CATEGORIAS_PADRAO.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchServicos(busca)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition disabled:opacity-60 self-end sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              Atualizar
            </button>
          </div>

          {/* Content Area */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-sm font-medium text-gray-500">Carregando catálogo de serviços...</p>
              </div>
            </div>
          ) : servicosFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {busca || categoriaFiltro !== 'TODAS'
                  ? 'Nenhum serviço encontrado para o filtro aplicado'
                  : 'Catálogo Vazio'}
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
                {busca || categoriaFiltro !== 'TODAS'
                  ? 'Tente alterar os termos de busca ou o filtro de categoria para encontrar o serviço desejado.'
                  : 'Cadastre seus serviços e valores de referência para incluir facilmente nos orçamentos e agendamentos.'}
              </p>
              {busca || categoriaFiltro !== 'TODAS' ? (
                <button
                  type="button"
                  onClick={() => {
                    setBusca('');
                    setCategoriaFiltro('TODAS');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition"
                >
                  Limpar Filtros
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Primeiro Serviço
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {servicosFiltrados.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <Tag className="w-3 h-3 text-indigo-500" />
                          {s.categoria || 'Geral'}
                        </span>
                        {s.recorrente ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Repeat className="w-3 h-3 text-purple-600" />
                            Assinatura • {s.periodicidade ? s.periodicidade.charAt(0) + s.periodicidade.slice(1).toLowerCase() : 'Mensal'}
                          </span>
                        ) : null}
                        {s.ativo === 0 || s.ativo === false ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            Inativo
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(s)}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Editar Serviço"
                          aria-label={`Editar ${s.nome}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(s)}
                          className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir Serviço"
                          aria-label={`Excluir ${s.nome}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-gray-900 leading-snug">{s.nome}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[2rem]">
                        {s.descricao || 'Nenhuma descrição detalhada informada.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-gray-400 block uppercase tracking-wider">
                        {s.recorrente ? 'Valor do Ciclo' : 'Preço Padrão'}
                      </span>
                      <span className="text-lg font-bold text-indigo-600">
                        {formatCurrency(s.preco)}
                      </span>
                    </div>
                    {s.recorrente && s.dia_vencimento_padrao && (
                      <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                        Venc. dia {s.dia_vencimento_padrao}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: ASSINATURAS RECORRENTES */}
      {abaAtiva === 'assinaturas' && (
        <div className="space-y-6">
          {/* Cards de Resumo Métrico */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assinaturas Ativas</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{resumoAssinaturas.total_ativas}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {resumoAssinaturas.total_assinaturas} contrato(s) no total
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Receita Mensal Recorrente (MRR)</p>
                <p className="text-2xl font-bold text-emerald-600 mt-0.5">{formatCurrency(resumoAssinaturas.mrr)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Faturamento previsível / mês</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Próximos Vencimentos</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{resumoAssinaturas.proximos_vencimentos_30d}</p>
                <p className="text-xs text-gray-400 mt-0.5">Nos próximos 30 dias</p>
              </div>
            </div>
          </div>

          {/* Filtros de Assinaturas */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-gray-500 uppercase">Filtrar por Status:</span>
              <select
                value={filtroStatusAssinatura}
                onChange={(e) => setFiltroStatusAssinatura(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="TODAS">Todas as Assinaturas</option>
                <option value="ATIVA">Ativas</option>
                <option value="PAUSADA">Pausadas</option>
                <option value="CANCELADA">Canceladas</option>
              </select>
            </div>

            <button
              type="button"
              onClick={fetchAssinaturas}
              disabled={loadingAssinaturas}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition disabled:opacity-60 self-end sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAssinaturas ? 'animate-spin text-indigo-600' : ''}`} />
              Atualizar
            </button>
          </div>

          {/* Lista de Assinaturas */}
          {loadingAssinaturas ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">Carregando assinaturas recorrentes...</p>
            </div>
          ) : assinaturas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Repeat className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Nenhuma assinatura contratada</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
                Crie contratos de recorrência vinculando seus clientes aos seus serviços periódicos para automação de cobranças.
              </p>
              <button
                type="button"
                onClick={handleOpenModalAssinatura}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Criar Primeira Assinatura
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {assinaturas.map((ass) => (
                <div
                  key={ass.id}
                  className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          ass.status === 'ATIVA'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : ass.status === 'PAUSADA'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {ass.status}
                      </span>
                      <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                        {ass.periodicidade}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-gray-900">{ass.cliente_nome}</h3>
                      <p className="text-xs text-indigo-600 font-semibold mt-0.5">{ass.servico_nome}</p>
                      {ass.observacoes && (
                        <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                          {ass.observacoes}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <span className="text-gray-400 block font-medium">Valor do Ciclo</span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(ass.valor)}</span>
                      </div>
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <span className="text-gray-400 block font-medium">Próximo Vencimento</span>
                        <span className="text-sm font-bold text-indigo-700">
                          {ass.proximo_vencimento ? ass.proximo_vencimento.split('-').reverse().join('/') : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações da Assinatura */}
                  <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleGerarCobranca(ass.id)}
                      disabled={actionLoadingId === ass.id || ass.status === 'CANCELADA'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-50"
                      title="Gerar Cobrança do Ciclo Atual e Avançar Vencimento"
                    >
                      {actionLoadingId === ass.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      Gerar Cobrança
                    </button>

                    <div className="flex items-center gap-1">
                      {ass.status === 'ATIVA' ? (
                        <button
                          type="button"
                          onClick={() => handleAlterarStatusAssinatura(ass.id, 'PAUSADA')}
                          disabled={actionLoadingId === ass.id}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Pausar Assinatura"
                          aria-label="Pausar assinatura"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      ) : ass.status === 'PAUSADA' ? (
                        <button
                          type="button"
                          onClick={() => handleAlterarStatusAssinatura(ass.id, 'ATIVA')}
                          disabled={actionLoadingId === ass.id}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Reativar Assinatura"
                          aria-label="Reativar assinatura"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      ) : null}

                      {ass.status !== 'CANCELADA' && (
                        <button
                          type="button"
                          onClick={() => handleAlterarStatusAssinatura(ass.id, 'CANCELADA')}
                          disabled={actionLoadingId === ass.id}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          title="Cancelar Assinatura"
                          aria-label="Cancelar assinatura"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Cadastro / Edição de Serviço */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title={editingServico ? 'Editar Serviço' : 'Novo Serviço'}
        footer={
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-servico"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-sm font-semibold text-white shadow-sm disabled:opacity-60 transition"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingServico ? 'Atualizar Serviço' : 'Salvar Serviço'}
            </button>
          </>
        }
      >
        <form id="form-servico" onSubmit={handleFormSubmit} className="space-y-4">
          {formErrors.geral && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formErrors.geral}</span>
            </div>
          )}

          <FormField
            label="Nome do Serviço / Produto"
            id="nome"
            name="nome"
            value={formData.nome}
            onChange={handleInputChange}
            placeholder="Ex: Consultoria Financeira MEI"
            required
            error={formErrors.nome}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              as="select"
              label="Categoria"
              id="categoria"
              name="categoria"
              value={formData.categoria}
              onChange={handleInputChange}
              options={CATEGORIAS_PADRAO.map((cat) => ({ value: cat, label: cat }))}
            />

            <FormField
              label="Preço Padrão (R$)"
              id="preco"
              name="preco"
              type="number"
              step="0.01"
              min="0"
              value={formData.preco}
              onChange={handleInputChange}
              placeholder="0,00"
              required
              error={formErrors.preco}
            />
          </div>

          <FormField
            as="textarea"
            label="Descrição Detalhada"
            id="descricao"
            name="descricao"
            rows={3}
            value={formData.descricao}
            onChange={handleInputChange}
            placeholder="Descreva o escopo do serviço, entregáveis ou itens inclusos..."
            error={formErrors.descricao}
          />

          {/* Toggle de Serviço Recorrente */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="recorrente" className="text-sm font-bold text-gray-900 cursor-pointer flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-purple-600" />
                  Serviço Recorrente (Assinatura)
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Permite contratar como plano de cobrança periódica para clientes.
                </p>
              </div>
              <input
                type="checkbox"
                id="recorrente"
                name="recorrente"
                checked={formData.recorrente}
                onChange={handleInputChange}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
              />
            </div>

            {formData.recorrente && (
              <div className="pt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="periodicidade" className="block text-xs font-semibold text-gray-700 mb-1">
                    Periodicidade Padrão
                  </label>
                  <select
                    id="periodicidade"
                    name="periodicidade"
                    value={formData.periodicidade}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {PERIODICIDADES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="dia_vencimento_padrao" className="block text-xs font-semibold text-gray-700 mb-1">
                    Dia de Vencimento Padrão (1 a 31)
                  </label>
                  <input
                    type="number"
                    id="dia_vencimento_padrao"
                    name="dia_vencimento_padrao"
                    min="1"
                    max="31"
                    value={formData.dia_vencimento_padrao}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {formErrors.dia_vencimento_padrao && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.dia_vencimento_padrao}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {editingServico && (
            <FormField
              as="select"
              label="Status"
              id="ativo"
              name="ativo"
              value={formData.ativo}
              onChange={handleInputChange}
              options={[
                { value: 1, label: 'Ativo' },
                { value: 0, label: 'Inativo' },
              ]}
            />
          )}
        </form>
      </Modal>

      {/* Modal Nova Assinatura Recorrente */}
      <Modal
        isOpen={modalAssinaturaOpen}
        onClose={() => !submitting && setModalAssinaturaOpen(false)}
        title="Nova Assinatura Recorrente"
        footer={
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setModalAssinaturaOpen(false)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-assinatura"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-sm font-semibold text-white shadow-sm disabled:opacity-60 transition"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Contratar Assinatura
            </button>
          </>
        }
      >
        <form id="form-assinatura" onSubmit={handleAssinaturaSubmit} className="space-y-4">
          {formAssinaturaErrors.geral && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formAssinaturaErrors.geral}</span>
            </div>
          )}

          <div>
            <label htmlFor="cliente_id" className="block text-sm font-semibold text-gray-700 mb-1">
              Cliente Contratante *
            </label>
            <select
              id="cliente_id"
              name="cliente_id"
              value={formAssinatura.cliente_id}
              onChange={handleAssinaturaInputChange}
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Selecione o cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} {c.email ? `(${c.email})` : ''}
                </option>
              ))}
            </select>
            {formAssinaturaErrors.cliente_id && (
              <p className="text-xs text-rose-600 mt-1">{formAssinaturaErrors.cliente_id}</p>
            )}
          </div>

          <div>
            <label htmlFor="servico_id" className="block text-sm font-semibold text-gray-700 mb-1">
              Serviço / Plano Recorrente *
            </label>
            <select
              id="servico_id"
              name="servico_id"
              value={formAssinatura.servico_id}
              onChange={handleAssinaturaInputChange}
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Selecione o serviço...</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} — {formatCurrency(s.preco)} {s.recorrente ? `(${s.periodicidade || 'Recorrente'})` : ''}
                </option>
              ))}
            </select>
            {formAssinaturaErrors.servico_id && (
              <p className="text-xs text-rose-600 mt-1">{formAssinaturaErrors.servico_id}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Valor por Ciclo (R$)"
              id="valor"
              name="valor"
              type="number"
              step="0.01"
              min="0"
              value={formAssinatura.valor}
              onChange={handleAssinaturaInputChange}
              placeholder="0,00"
              required
              error={formAssinaturaErrors.valor}
            />

            <div>
              <label htmlFor="periodicidade_ass" className="block text-sm font-semibold text-gray-700 mb-1">
                Periodicidade
              </label>
              <select
                id="periodicidade_ass"
                name="periodicidade"
                value={formAssinatura.periodicidade}
                onChange={handleAssinaturaInputChange}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {PERIODICIDADES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Dia de Vencimento (1 a 31)"
              id="dia_vencimento"
              name="dia_vencimento"
              type="number"
              min="1"
              max="31"
              value={formAssinatura.dia_vencimento}
              onChange={handleAssinaturaInputChange}
              required
              error={formAssinaturaErrors.dia_vencimento}
            />

            <FormField
              label="Data de Início"
              id="data_inicio"
              name="data_inicio"
              type="date"
              value={formAssinatura.data_inicio}
              onChange={handleAssinaturaInputChange}
              required
              error={formAssinaturaErrors.data_inicio}
            />
          </div>

          <FormField
            as="textarea"
            label="Observações da Assinatura"
            id="observacoes"
            name="observacoes"
            rows={2}
            value={formAssinatura.observacoes}
            onChange={handleAssinaturaInputChange}
            placeholder="Informações adicionais do contrato ou preferências do cliente..."
          />
        </form>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !submitting && setDeleteModalOpen(false)}
        title="Confirmar Exclusão de Serviço"
        footer={
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setDeleteModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleDeleteConfirm}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-sm font-semibold text-white shadow-sm disabled:opacity-60 transition"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Sim, Excluir
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Tem certeza de que deseja excluir o item{' '}
            <strong className="text-gray-900 font-semibold">
              {deletingServico?.nome}
            </strong>
            ?
          </p>
          <p className="text-xs text-gray-500 bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              Ao excluir, este serviço deixará de aparecer no catálogo. Orçamentos anteriores que utilizaram este serviço manterão seus registros históricos.
            </span>
          </p>
        </div>
      </Modal>
    </div>
  );
}

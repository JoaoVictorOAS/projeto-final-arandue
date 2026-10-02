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

const INITIAL_FORM = {
  nome: '',
  categoria: 'Serviço',
  preco: '',
  descricao: '',
  ativo: 1,
};

export const formatCurrency = (val) => {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

export default function Servicos() {
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODAS');
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingServico, setEditingServico] = useState(null);
  const [deletingServico, setDeletingServico] = useState(null);

  // Form state
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});

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
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenDeleteModal = (servico) => {
    setDeletingServico(servico);
    setDeleteModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      const msg = err.response?.data?.error || err.response?.data?.message || 'Falha ao salvar os dados do serviço.';
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
      const msg = err.response?.data?.error || err.response?.data?.message || 'Falha ao excluir o serviço.';
      showFeedback('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter list by category locally if selected
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
            Catálogo de Serviços
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Defina serviços, valores padrão e descrições para agilizar orçamentos.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          Novo Serviço
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
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <Tag className="w-3 h-3 text-indigo-500" />
                      {s.categoria || 'Geral'}
                    </span>
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
                    Preço Padrão
                  </span>
                  <span className="text-lg font-bold text-indigo-600">
                    {formatCurrency(s.preco)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro / Edição */}
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

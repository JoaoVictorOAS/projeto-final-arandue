import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import FormField from '../components/FormField';

const INITIAL_FORM = {
  nome: '',
  telefone: '',
  email: '',
  endereco: '',
  observacoes: '',
  ativo: 1,
};

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busca, setBusca] = useState('');
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [deletingCliente, setDeletingCliente] = useState(null);

  // Form state
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});

  const isFirstRender = useRef(true);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    if (type === 'success') {
      setTimeout(() => {
        setFeedback((prev) => (prev.message === message ? { type: null, message: '' } : prev));
      }, 4000);
    }
  };

  const fetchClientes = useCallback(async (termoBusca = '') => {
    setLoading(true);
    setFeedback({ type: null, message: '' });
    try {
      const params = {};
      if (termoBusca && termoBusca.trim()) {
        params.busca = termoBusca.trim();
      }

      const res = await api.get('/clientes', { params });
      let lista = [];
      if (Array.isArray(res?.data?.dados)) {
        lista = res.data.dados;
      } else if (Array.isArray(res?.data)) {
        lista = res.data;
      } else if (res?.data?.clientes && Array.isArray(res.data.clientes)) {
        lista = res.data.clientes;
      } else if (res?.data?.data && Array.isArray(res.data.data)) {
        lista = res.data.data;
      }
      setClientes(lista);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      showFeedback('error', 'Não foi possível carregar a lista de clientes. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchClientes('');
      return;
    }

    const timer = setTimeout(() => {
      fetchClientes(busca);
    }, 300);

    return () => clearTimeout(timer);
  }, [busca, fetchClientes]);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingCliente(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      endereco: cliente.endereco || '',
      observacoes: cliente.observacoes || '',
      ativo: cliente.ativo !== undefined ? (cliente.ativo ? 1 : 0) : 1,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Open confirmation modal for Delete
  const handleOpenDeleteModal = (cliente) => {
    setDeletingCliente(cliente);
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
      errors.nome = 'O nome do cliente é obrigatório.';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Informe um endereço de e-mail válido.';
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
        telefone: formData.telefone?.trim() || null,
        email: formData.email?.trim() || null,
        endereco: formData.endereco?.trim() || null,
        observacoes: formData.observacoes?.trim() || null,
        ativo: Number(formData.ativo),
      };

      if (editingCliente) {
        await api.put(`/clientes/${editingCliente.id}`, payload);
        showFeedback('success', 'Cliente atualizado com sucesso!');
      } else {
        await api.post('/clientes', payload);
        showFeedback('success', 'Cliente cadastrado com sucesso!');
      }

      setModalOpen(false);
      fetchClientes(busca);
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Falha ao salvar os dados do cliente.';
      setFormErrors((prev) => ({ ...prev, geral: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCliente) return;

    setSubmitting(true);
    try {
      await api.delete(`/clientes/${deletingCliente.id}`);
      showFeedback('success', `Cliente "${deletingCliente.nome}" excluído com sucesso!`);
      setDeleteModalOpen(false);
      setDeletingCliente(null);
      fetchClientes(busca);
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Falha ao excluir o cliente.';
      showFeedback('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" />
            Gestão de Clientes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Cadastre, edite e consulte a lista de clientes do seu negócio MEI.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <UserPlus className="w-4 h-4" />
          Novo Cliente
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
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou email..."
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

        <button
          type="button"
          onClick={() => fetchClientes(busca)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition disabled:opacity-60"
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
            <p className="text-sm font-medium text-gray-500">Carregando lista de clientes...</p>
          </div>
        </div>
      ) : clientes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            {busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
            {busca
              ? `Não foram encontrados registros para o termo "${busca}". Tente refazer a busca ou limpar o filtro.`
              : 'Comece agora mesmo a cadastrar seus clientes para associá-los a agendamentos, orçamentos e cobranças.'}
          </p>
          {busca ? (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition"
            >
              Limpar Busca
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar Primeiro Cliente
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Cliente</th>
                  <th className="py-3.5 px-6">Contatos</th>
                  <th className="py-3.5 px-6">Endereço</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-gray-900">{c.nome}</div>
                      {c.observacoes && (
                        <div
                          className="text-xs text-gray-500 truncate max-w-xs mt-0.5 flex items-center gap-1"
                          title={c.observacoes}
                        >
                          <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span>{c.observacoes}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        {c.telefone ? (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{c.telefone}</span>
                          </div>
                        ) : null}
                        {c.email ? (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span>{c.email}</span>
                          </div>
                        ) : null}
                        {!c.telefone && !c.email && (
                          <span className="text-xs text-gray-400 italic">Sem contato</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {c.endereco ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 max-w-xs truncate" title={c.endereco}>
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{c.endereco}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Não informado</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          c.ativo !== false && c.ativo !== 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {c.ativo !== false && c.ativo !== 0 ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Editar Cliente"
                          aria-label={`Editar ${c.nome}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(c)}
                          className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir Cliente"
                          aria-label={`Excluir ${c.nome}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="block md:hidden divide-y divide-gray-100">
            {clientes.map((c) => (
              <div key={c.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{c.nome}</h4>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        c.ativo !== false && c.ativo !== 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {c.ativo !== false && c.ativo !== 0 ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(c)}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      aria-label={`Editar ${c.nome}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDeleteModal(c)}
                      className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      aria-label={`Excluir ${c.nome}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-gray-600">
                  {c.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{c.telefone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span>{c.email}</span>
                    </div>
                  )}
                  {c.endereco && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{c.endereco}</span>
                    </div>
                  )}
                  {c.observacoes && (
                    <div className="flex items-center gap-2 pt-1 text-gray-500 italic">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span>{c.observacoes}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Cadastro / Edição */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title={editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
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
              form="form-cliente"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-sm font-semibold text-white shadow-sm disabled:opacity-60 transition"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingCliente ? 'Atualizar Cliente' : 'Salvar Cliente'}
            </button>
          </>
        }
      >
        <form id="form-cliente" onSubmit={handleFormSubmit} className="space-y-4">
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
            label="Nome Completo"
            id="nome"
            name="nome"
            value={formData.nome}
            onChange={handleInputChange}
            placeholder="Ex: Maria Oliveira"
            required
            error={formErrors.nome}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Telefone / WhatsApp"
              id="telefone"
              name="telefone"
              type="tel"
              value={formData.telefone}
              onChange={handleInputChange}
              placeholder="Ex: (11) 98765-4321"
              error={formErrors.telefone}
            />

            <FormField
              label="E-mail"
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Ex: maria@email.com"
              error={formErrors.email}
            />
          </div>

          <FormField
            label="Endereço Completo"
            id="endereco"
            name="endereco"
            value={formData.endereco}
            onChange={handleInputChange}
            placeholder="Rua, número, bairro, cidade - UF"
            error={formErrors.endereco}
          />

          <FormField
            as="textarea"
            label="Observações"
            id="observacoes"
            name="observacoes"
            rows={3}
            value={formData.observacoes}
            onChange={handleInputChange}
            placeholder="Anotações internas sobre preferências ou histórico..."
            error={formErrors.observacoes}
          />

          {editingCliente && (
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
        title="Confirmar Exclusão"
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
            Tem certeza de que deseja excluir o cliente{' '}
            <strong className="text-gray-900 font-semibold">
              {deletingCliente?.nome}
            </strong>
            ?
          </p>
          <p className="text-xs text-gray-500 bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              Esta ação removerá o cliente da listagem ativa. Certifique-se de que não há pendências financeiras vinculadas.
            </span>
          </p>
        </div>
      </Modal>
    </div>
  );
}

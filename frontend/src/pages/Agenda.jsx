import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Search,
  User,
  Wrench,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Phone,
  FileText,
  CalendarCheck,
  CalendarX,
  Check,
  DollarSign,
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';

// Helper de formatação BRL
export const formatBRL = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

// Helper de formatação de data e hora
export const formatDateTime = (dataHoraStr) => {
  if (!dataHoraStr) return '-';
  const d = new Date(dataHoraStr);
  if (isNaN(d.getTime())) return dataHoraStr;

  const dateFormatted = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeFormatted = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateFormatted} às ${timeFormatted}`;
};

// Data/hora default para input datetime-local (+1 hora a partir de agora)
const getDefaultDateTimeLocal = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function Agenda() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [agendamentos, setAgendamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // Filtros
  const [filtroData, setFiltroData] = useState('TODOS'); // 'HOJE' | 'SEMANA' | 'TODOS'
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [busca, setBusca] = useState('');

  // Notificações e erros
  const [feedback, setFeedback] = useState({ type: null, message: '' });
  const [conflictError, setConflictError] = useState('');

  // Modal Novo Agendamento
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [formOrcamentoId, setFormOrcamentoId] = useState('');
  const [formClienteId, setFormClienteId] = useState('');
  const [formServicoId, setFormServicoId] = useState('');
  const [formDataHora, setFormDataHora] = useState(getDefaultDateTimeLocal());
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    if (type === 'success') {
      setTimeout(() => {
        setFeedback((prev) => (prev.message === message ? { type: null, message: '' } : prev));
      }, 4000);
    }
  };

  // Carrega agendamentos, clientes, serviços e orçamentos
  const loadData = useCallback(async () => {
    setLoading(true);
    setFeedback({ type: null, message: '' });
    try {
      const [agRes, cliRes, servRes, orcRes] = await Promise.all([
        api.get('/agendamentos').catch((err) => {
          console.error('Erro ao carregar agendamentos:', err);
          return { data: { dados: [] } };
        }),
        api.get('/clientes').catch((err) => {
          console.error('Erro ao carregar clientes:', err);
          return { data: { dados: [] } };
        }),
        api.get('/servicos').catch((err) => {
          console.error('Erro ao carregar servicos:', err);
          return { data: { dados: [] } };
        }),
        api.get('/orcamentos').catch((err) => {
          console.error('Erro ao carregar orçamentos:', err);
          return { data: { dados: [] } };
        }),
      ]);

      const extrairLista = (res) => {
        if (Array.isArray(res?.data?.dados)) return res.data.dados;
        if (Array.isArray(res?.data?.data)) return res.data.data;
        if (Array.isArray(res?.data)) return res.data;
        return [];
      };

      setAgendamentos(extrairLista(agRes));
      setClientes(extrairLista(cliRes));
      setServicos(extrairLista(servRes));
      setOrcamentos(extrairLista(orcRes));
    } catch (err) {
      console.error('Erro geral ao carregar agenda:', err);
      showFeedback('error', 'Não foi possível carregar a agenda de atendimentos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pré-preenche ao navegar de orçamentos via query params (?orcamento_id=...&cliente_id=...)
  useEffect(() => {
    const qOrcamentoId = searchParams.get('orcamento_id');
    const qClienteId = searchParams.get('cliente_id');
    if (qOrcamentoId) {
      setFormOrcamentoId(qOrcamentoId);
      if (qClienteId) setFormClienteId(qClienteId);
      setModalNovoOpen(true);
    }
  }, [searchParams]);

  // Helpers para encontrar dados do cliente e serviço
  const getCliente = (clienteId) => {
    return clientes.find((c) => String(c.id) === String(clienteId));
  };

  const getServico = (servicoId) => {
    return servicos.find((s) => String(s.id) === String(servicoId));
  };

  // Lista de orçamentos aprovados disponíveis para atendimento
  const orcamentosAprovados = orcamentos.filter((o) => o.status === 'APROVADO');

  const handleSelectOrcamento = (orcId) => {
    setFormOrcamentoId(orcId);
    if (!orcId) return;
    const orc = orcamentos.find((o) => String(o.id) === String(orcId));
    if (orc) {
      if (orc.cliente_id) setFormClienteId(String(orc.cliente_id));
      if (orc.itens && orc.itens.length > 0) {
        const itemServico = orc.itens.find((i) => i.servico_id);
        if (itemServico) setFormServicoId(String(itemServico.servico_id));
      }
    }
  };

  // Abrir Modal de Novo Agendamento
  const handleOpenCreateModal = () => {
    const defaultOrc = orcamentosAprovados.length > 0 ? String(orcamentosAprovados[0].id) : '';
    setFormOrcamentoId(defaultOrc);
    if (defaultOrc) {
      const orc = orcamentosAprovados[0];
      setFormClienteId(String(orc.cliente_id));
      const itemServico = orc.itens?.find((i) => i.servico_id);
      setFormServicoId(itemServico ? String(itemServico.servico_id) : '');
    } else {
      setFormClienteId(clientes.length > 0 ? String(clientes[0].id) : '');
      setFormServicoId(servicos.length > 0 ? String(servicos[0].id) : '');
    }
    setFormDataHora(getDefaultDateTimeLocal());
    setFormObservacoes('');
    setFormErrors({});
    setConflictError('');
    setModalNovoOpen(true);
  };

  // Validação do Form
  const validateForm = () => {
    const errors = {};
    if (!formOrcamentoId && orcamentosAprovados.length > 0) {
      errors.orcamento_id = 'Selecione o orçamento aprovado.';
    }
    if (!formClienteId) {
      errors.cliente_id = 'Selecione o cliente a ser atendido.';
    }
    if (!formDataHora) {
      errors.data_hora = 'Defina a data e o horário do atendimento.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Enviar Novo Agendamento com tratamento do 409 Conflict
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setConflictError('');

    try {
      const payload = {
        orcamento_id: formOrcamentoId ? Number(formOrcamentoId) : null,
        cliente_id: Number(formClienteId),
        servico_id: formServicoId ? Number(formServicoId) : null,
        data_hora: formDataHora,
        observacoes: formObservacoes ? formObservacoes.trim() : null,
      };

      await api.post('/agendamentos', payload);
      showFeedback('success', 'Atendimento agendado com sucesso!');
      setModalNovoOpen(false);
      loadData();
    } catch (err) {
      console.error('Erro ao agendar:', err);
      if (err.response && err.response.status === 409) {
        const errorMsg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          'Conflito de horário! Já existe um atendimento agendado para este dia e horário. Por favor, escolha outro horário.';
        setConflictError(errorMsg);
      } else {
        const errorMsg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Não foi possível salvar o agendamento.';
        setFormErrors((prev) => ({ ...prev, geral: errorMsg }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Ações rápidas de alterar status (Confirmar, Concluir, Cancelar)
  const handleUpdateStatus = async (id, newStatus) => {
    setStatusUpdatingId(id);
    try {
      let sucesso = false;
      try {
        await api.patch(`/agendamentos/${id}/status`, { status: newStatus });
        sucesso = true;
      } catch (patchErr) {
        if (patchErr.response?.status === 404 || patchErr.response?.status === 405) {
          await api.put(`/agendamentos/${id}`, { status: newStatus });
          sucesso = true;
        } else {
          throw patchErr;
        }
      }

      if (sucesso) {
        setAgendamentos((prev) =>
          prev.map((ag) => (ag.id === id ? { ...ag, status: newStatus } : ag))
        );
        showFeedback('success', `Status do agendamento alterado para "${newStatus}".`);
      }
    } catch (err) {
      console.error('Erro ao atualizar status do agendamento:', err);
      showFeedback('error', 'Falha ao atualizar status do atendimento.');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Verificação de data para os filtros "Hoje" e "Esta Semana"
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const isThisWeek = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 domingo, 1 segunda ...
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return d >= startOfWeek && d <= endOfWeek;
  };

  // Filtros aplicados
  const agendamentosFiltrados = agendamentos.filter((ag) => {
    const cliente = getCliente(ag.cliente_id);
    const servico = getServico(ag.servico_id);

    const nomeCliente = (cliente?.nome || ag.cliente_nome || '').toLowerCase();
    const nomeServico = (servico?.nome || ag.servico_nome || '').toLowerCase();
    const obs = (ag.observacoes || '').toLowerCase();
    const termo = busca.toLowerCase().trim();

    const matchesBusca =
      termo === '' ||
      nomeCliente.includes(termo) ||
      nomeServico.includes(termo) ||
      obs.includes(termo);

    const matchesStatus =
      filtroStatus === 'TODOS' || (ag.status || 'PENDENTE').toUpperCase() === filtroStatus;

    let matchesData = true;
    if (filtroData === 'HOJE') {
      matchesData = isToday(ag.data_hora);
    } else if (filtroData === 'SEMANA') {
      matchesData = isThisWeek(ag.data_hora);
    }

    return matchesBusca && matchesStatus && matchesData;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-indigo-600" />
            Agenda de Atendimentos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Controle horários, clientes e serviços agendados com validação contra choque de horários.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            aria-label="Atualizar agenda"
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition"
            title="Atualizar agenda"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Alerta de Feedback Geral */}
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
            &times;
          </button>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Busca por cliente ou serviço */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por cliente, serviço ou notas..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filtro por Período de Data */}
          <div className="inline-flex rounded-xl p-1 bg-gray-100 border border-gray-200/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFiltroData('HOJE')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filtroData === 'HOJE'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setFiltroData('SEMANA')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filtroData === 'SEMANA'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Esta Semana
            </button>
            <button
              type="button"
              onClick={() => setFiltroData('TODOS')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filtroData === 'TODOS'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        {/* Filtro por Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-400 mr-1 uppercase">Status:</span>
          {['TODOS', 'PENDENTE', 'CONFIRMADO', 'CONCLUIDO', 'CANCELADO'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFiltroStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                filtroStatus === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'TODOS' ? 'Todos' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo Principal: Cards de Atendimento */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Carregando agendamentos...</p>
        </div>
      ) : agendamentosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            {busca || filtroStatus !== 'TODOS' || filtroData !== 'TODOS'
              ? 'Nenhum agendamento encontrado'
              : 'Nenhum compromisso agendado'}
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
            {busca || filtroStatus !== 'TODOS' || filtroData !== 'TODOS'
              ? 'Tente relaxar os filtros de data, status ou busca para ver outros atendimentos.'
              : 'Evite conflitos de horário cadastrando atendimentos para seus clientes diretamente na agenda.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Agendar Primeiro Atendimento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agendamentosFiltrados.map((ag) => {
            const cliente = getCliente(ag.cliente_id);
            const servico = getServico(ag.servico_id);

            const nomeCliente = cliente?.nome || ag.cliente_nome || `Cliente #${ag.cliente_id}`;
            const nomeServico = servico?.nome || ag.servico_nome || 'Atendimento Geral';
            const statusAtual = (ag.status || 'PENDENTE').toUpperCase();
            const isUpdating = statusUpdatingId === ag.id;

            return (
              <div
                key={ag.id}
                data-testid={`agendamento-card-${ag.id}`}
                className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Cabeçalho do Card: Horário e StatusBadge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                      <Clock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <span>{formatDateTime(ag.data_hora)}</span>
                    </div>
                    <StatusBadge status={statusAtual} />
                  </div>

                  {/* Cliente e Contato */}
                  <div className="pt-1">
                    <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{nomeCliente}</span>
                    </div>
                    {cliente?.telefone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 ml-6">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{cliente.telefone}</span>
                      </div>
                    )}
                  </div>

                  {/* Serviço / Procedimento */}
                  <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <Wrench className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span className="font-medium truncate">{nomeServico}</span>
                  </div>

                  {/* Observações */}
                  {ag.observacoes && (
                    <div className="text-xs text-gray-500 bg-gray-50/50 p-2 rounded-lg border border-gray-100 italic line-clamp-2">
                      &ldquo;{ag.observacoes}&rdquo;
                    </div>
                  )}
                </div>

                {/* Ações Rápidas no Card */}
                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-gray-400">#{ag.id}</span>
                    {ag.orcamento_id && (
                      <span className="text-[10px] font-mono font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        Orc #{ag.orcamento_id}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Se Pendente: Confirmar e Cancelar */}
                    {statusAtual === 'PENDENTE' && (
                      <>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(ag.id, 'CONFIRMADO')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition inline-flex items-center gap-1"
                          title="Confirmar Agendamento"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Confirmar
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(ag.id, 'CANCELADO')}
                          className="px-2 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                          title="Cancelar Agendamento"
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    {/* Se Confirmado: Concluir e Cancelar */}
                    {statusAtual === 'CONFIRMADO' && (
                      <>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(ag.id, 'CONCLUIDO')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition inline-flex items-center gap-1"
                          title="Marcar como Concluído"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Concluir
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(ag.id, 'CANCELADO')}
                          className="px-2 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                          title="Cancelar Agendamento"
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    {/* Se Concluído: Gerar Cobrança */}
                    {statusAtual === 'CONCLUIDO' && (
                      <button
                        type="button"
                        onClick={() => navigate(`/cobrancas?agendamento_id=${ag.id}&cliente_id=${ag.cliente_id}`)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition inline-flex items-center gap-1"
                        title="Gerar Cobrança para este atendimento"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Gerar Cobrança
                      </button>
                    )}

                    {/* Se Concluído ou Cancelado: Opção de reabrir */}
                    {(statusAtual === 'CONCLUIDO' || statusAtual === 'CANCELADO') && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(ag.id, 'PENDENTE')}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg text-gray-500 hover:bg-gray-100 transition"
                        title="Reabrir como Pendente"
                      >
                        Reabrir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL NOVO AGENDAMENTO COM SUPORTE AO ERRO 409 CONFLICT */}
      <Modal
        isOpen={modalNovoOpen}
        onClose={() => setModalNovoOpen(false)}
        title="Novo Agendamento"
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalNovoOpen(false)}
              className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-novo-agendamento"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Agendando...
                </>
              ) : (
                'Agendar Atendimento'
              )}
            </button>
          </>
        }
      >
        <form id="form-novo-agendamento" onSubmit={handleCreateSubmit} className="space-y-4">
          {/* Alerta de Conflito de Horário (409 Conflict) */}
          {conflictError && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-sm space-y-1 shadow-sm"
              data-testid="alerta-conflito-horario"
            >
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <span>Choque de Horários Detectado!</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed ml-7">
                {conflictError}
              </p>
            </div>
          )}

          {/* Erro geral */}
          {formErrors.geral && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{formErrors.geral}</span>
            </div>
          )}

          {/* Seleção do Orçamento Aprovado */}
          <div>
            <label htmlFor="ag_orcamento_id" className="block text-sm font-semibold text-gray-700 mb-1">
              Orçamento Aprovado {orcamentosAprovados.length > 0 && <span className="text-rose-500">*</span>}
            </label>
            <select
              id="ag_orcamento_id"
              name="orcamento_id"
              value={formOrcamentoId}
              onChange={(e) => handleSelectOrcamento(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione o orçamento aprovado...</option>
              {orcamentosAprovados.map((orc) => (
                <option key={orc.id} value={orc.id}>
                  #{String(orc.id).padStart(4, '0')} - {orc.cliente_nome || `Cliente #${orc.cliente_id}`} ({formatBRL(orc.total)})
                </option>
              ))}
            </select>
            {formErrors.orcamento_id && (
              <p className="text-xs text-rose-600 mt-1">{formErrors.orcamento_id}</p>
            )}
            {orcamentosAprovados.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Nenhum orçamento com status APROVADO disponível.
              </p>
            )}
          </div>

          {/* Seleção do Cliente */}
          <div>
            <label htmlFor="ag_cliente_id" className="block text-sm font-semibold text-gray-700 mb-1">
              Cliente <span className="text-rose-500">*</span>
            </label>
            <select
              id="ag_cliente_id"
              name="cliente_id"
              value={formClienteId}
              onChange={(e) => setFormClienteId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Selecione o cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} {c.telefone ? `(${c.telefone})` : ''}
                </option>
              ))}
            </select>
            {formErrors.cliente_id && (
              <p className="text-xs text-rose-600 mt-1">{formErrors.cliente_id}</p>
            )}
          </div>

          {/* Seleção do Serviço */}
          <div>
            <label htmlFor="ag_servico_id" className="block text-sm font-semibold text-gray-700 mb-1">
              Serviço a Realizar
            </label>
            <select
              id="ag_servico_id"
              name="servico_id"
              value={formServicoId}
              onChange={(e) => setFormServicoId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">(Atendimento Geral / Não especificado)</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Data e Hora (datetime-local) */}
          <div>
            <FormField
              label="Data e Horário do Atendimento"
              id="ag_data_hora"
              name="data_hora"
              type="datetime-local"
              value={formDataHora}
              onChange={(e) => {
                setFormDataHora(e.target.value);
                if (conflictError) setConflictError('');
              }}
              required
              error={formErrors.data_hora}
              helpText="Escolha o momento exato do atendimento"
            />
          </div>

          {/* Observações */}
          <div>
            <FormField
              label="Observações / Detalhes"
              id="ag_observacoes"
              name="observacoes"
              as="textarea"
              rows={2}
              placeholder="Ex: Levar material extra, confirmar 1h antes por WhatsApp."
              value={formObservacoes}
              onChange={(e) => setFormObservacoes(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

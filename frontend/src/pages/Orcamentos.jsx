import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  Printer,
  Share2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  Calendar,
  User,
  DollarSign,
  ArrowRight,
  Send,
  XCircle,
  Copy,
  Check,
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

// Helper de formatação de data segura
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [year, month, day] = dateStr.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('pt-BR');
};

const getTodayString = () => new Date().toISOString().split('T')[0];
const getValidityDefault = () => {
  const d = new Date();
  d.setDate(d.getDate() + 15);
  return d.toISOString().split('T')[0];
};

const INITIAL_ITEM = () => ({
  tempId: `${Date.now()}-${Math.random()}`,
  servico_id: '',
  descricao: '',
  quantidade: 1,
  preco_unitario: 0,
});

export default function Orcamentos() {
  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // Filtros
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('TODOS');

  // Notificações
  const [feedback, setFeedback] = useState({ type: null, message: '' });
  const [copied, setCopied] = useState(false);

  // Modais
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [modalPropostaOpen, setModalPropostaOpen] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState(null);

  // Formulário de Novo Orçamento
  const [formClienteId, setFormClienteId] = useState('');
  const [formDataEmissao, setFormDataEmissao] = useState(getTodayString());
  const [formValidade, setFormValidade] = useState(getValidityDefault());
  const [formDesconto, setFormDesconto] = useState(0);
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formItens, setFormItens] = useState([INITIAL_ITEM()]);
  const [formErrors, setFormErrors] = useState({});

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    if (type === 'success') {
      setTimeout(() => {
        setFeedback((prev) => (prev.message === message ? { type: null, message: '' } : prev));
      }, 4000);
    }
  };

  // Carrega orçamentos, clientes e serviços
  const loadData = useCallback(async () => {
    setLoading(true);
    setFeedback({ type: null, message: '' });
    try {
      const [orcRes, cliRes, servRes] = await Promise.all([
        api.get('/orcamentos').catch((err) => {
          console.error('Erro ao buscar orcamentos:', err);
          return { data: { dados: [] } };
        }),
        api.get('/clientes').catch((err) => {
          console.error('Erro ao buscar clientes:', err);
          return { data: { dados: [] } };
        }),
        api.get('/servicos').catch((err) => {
          console.error('Erro ao buscar servicos:', err);
          return { data: { dados: [] } };
        }),
      ]);

      const extrairLista = (res) => {
        if (Array.isArray(res?.data?.dados)) return res.data.dados;
        if (Array.isArray(res?.data?.data)) return res.data.data;
        if (Array.isArray(res?.data)) return res.data;
        return [];
      };

      setOrcamentos(extrairLista(orcRes));
      setClientes(extrairLista(cliRes));
      setServicos(extrairLista(servRes));
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      showFeedback('error', 'Não foi possível carregar os dados. Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cálculos dinâmicos do formulário
  const calcularSubtotalItem = (item) => {
    const qtd = Number(item.quantidade) || 0;
    const preco = Number(item.preco_unitario) || 0;
    return qtd * preco;
  };

  const calcularSubtotalGeral = () => {
    return formItens.reduce((acc, item) => acc + calcularSubtotalItem(item), 0);
  };

  const subtotalAtual = calcularSubtotalGeral();
  const descontoAtual = Math.max(0, Number(formDesconto) || 0);
  const totalAtual = Math.max(0, subtotalAtual - descontoAtual);

  // Manipulação de Itens no formulário
  const handleAddItem = () => {
    setFormItens((prev) => [...prev, INITIAL_ITEM()]);
  };

  const handleRemoveItem = (index) => {
    if (formItens.length === 1) {
      showFeedback('error', 'O orçamento deve conter pelo menos 1 item.');
      return;
    }
    setFormItens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setFormItens((prev) => {
      const novos = [...prev];
      const item = { ...novos[index], [field]: value };

      // Se selecionou um serviço do catálogo, auto-preenche o preço e a descrição
      if (field === 'servico_id' && value) {
        const servicoEncontrado = servicos.find((s) => String(s.id) === String(value));
        if (servicoEncontrado) {
          item.descricao = servicoEncontrado.nome;
          item.preco_unitario = Number(servicoEncontrado.preco) || 0;
        }
      }

      novos[index] = item;
      return novos;
    });

    if (formErrors[`item_${index}`]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[`item_${index}`];
        return copy;
      });
    }
  };

  // Abrir Modal de Criação
  const handleOpenCreateModal = () => {
    setFormClienteId(clientes.length > 0 ? String(clientes[0].id) : '');
    setFormDataEmissao(getTodayString());
    setFormValidade(getValidityDefault());
    setFormDesconto(0);
    setFormObservacoes('');
    setFormItens([INITIAL_ITEM()]);
    setFormErrors({});
    setModalNovoOpen(true);
  };

  // Validação do Formulário
  const validateForm = () => {
    const errors = {};
    if (!formClienteId) {
      errors.cliente_id = 'Selecione um cliente para o orçamento.';
    }
    if (!formDataEmissao) {
      errors.data_emissao = 'Informe a data de emissão.';
    }

    if (!formItens || formItens.length === 0) {
      errors.itens = 'Adicione ao menos um item ao orçamento.';
    } else {
      formItens.forEach((item, idx) => {
        if (!item.descricao && !item.servico_id) {
          errors[`item_${idx}`] = 'Informe a descrição ou selecione um serviço.';
        }
        if (Number(item.quantidade) <= 0) {
          errors[`item_${idx}_qtd`] = 'Qtd deve ser maior que 0.';
        }
        if (Number(item.preco_unitario) < 0) {
          errors[`item_${idx}_preco`] = 'Preço não pode ser negativo.';
        }
      });
    }

    if (Number(formDesconto) < 0) {
      errors.desconto = 'O desconto não pode ser negativo.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Enviar Novo Orçamento
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        cliente_id: Number(formClienteId),
        data_emissao: formDataEmissao,
        validade: formValidade || null,
        observacoes: formObservacoes ? formObservacoes.trim() : null,
        desconto: descontoAtual,
        subtotal: subtotalAtual,
        total: totalAtual,
        itens: formItens.map((item) => {
          const qtd = Number(item.quantidade) || 1;
          const preco = Number(item.preco_unitario) || 0;
          return {
            servico_id: item.servico_id ? Number(item.servico_id) : null,
            descricao: item.descricao || (item.servico_id ? servicos.find((s) => String(s.id) === String(item.servico_id))?.nome : 'Item de serviço'),
            quantidade: qtd,
            preco_unitario: preco,
            subtotal: qtd * preco,
          };
        }),
      };

      const res = await api.post('/orcamentos', payload);
      showFeedback('success', 'Orçamento emitido com sucesso!');
      setModalNovoOpen(false);

      // Atualiza listagem
      loadData();
    } catch (err) {
      console.error('Erro ao emitir orçamento:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Falha ao salvar o orçamento.';
      setFormErrors((prev) => ({ ...prev, geral: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  // Alterar Status do Orçamento
  const handleUpdateStatus = async (orcamentoId, newStatus) => {
    setStatusUpdatingId(orcamentoId);
    try {
      let sucesso = false;
      try {
        await api.patch(`/orcamentos/${orcamentoId}/status`, { status: newStatus });
        sucesso = true;
      } catch (patchErr) {
        if (patchErr.response?.status === 404 || patchErr.response?.status === 405) {
          await api.put(`/orcamentos/${orcamentoId}`, { status: newStatus });
          sucesso = true;
        } else {
          throw patchErr;
        }
      }

      if (sucesso) {
        setOrcamentos((prev) =>
          prev.map((orc) => (orc.id === orcamentoId ? { ...orc, status: newStatus } : orc))
        );
        if (selectedOrcamento && selectedOrcamento.id === orcamentoId) {
          setSelectedOrcamento((prev) => ({ ...prev, status: newStatus }));
        }
        showFeedback('success', `Status do orçamento atualizado para "${newStatus}".`);
      }
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      showFeedback('error', 'Não foi possível alterar o status do orçamento.');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Abrir Visualização da Proposta Comercial
  const handleOpenProposta = (orcamento) => {
    setSelectedOrcamento(orcamento);
    setCopied(false);
    setModalPropostaOpen(true);
  };

  // Copiar proposta formatada para compartilhar no WhatsApp
  const handleCopyProposal = () => {
    if (!selectedOrcamento) return;
    const cliente = getCliente(selectedOrcamento.cliente_id);
    const clienteNome = cliente?.nome || selectedOrcamento.cliente_nome || 'Cliente';
    const itens = selectedOrcamento.itens || [];

    let texto = `*PROPOSTA COMERCIAL - Orçamento #${selectedOrcamento.id}*\n`;
    texto += `Cliente: ${clienteNome}\n`;
    texto += `Emissão: ${formatDate(selectedOrcamento.data_emissao)}\n`;
    if (selectedOrcamento.validade) {
      texto += `Validade: ${formatDate(selectedOrcamento.validade)}\n`;
    }
    texto += `Status: ${selectedOrcamento.status || 'RASCUNHO'}\n\n`;
    texto += `*Itens do Orçamento:*\n`;

    if (itens.length > 0) {
      itens.forEach((it, i) => {
        const itemDesc = it.descricao || it.servico_nome || `Item ${i + 1}`;
        texto += `${i + 1}. ${itemDesc} (${it.quantidade}x ${formatBRL(it.preco_unitario)}) = ${formatBRL(it.subtotal || it.quantidade * it.preco_unitario)}\n`;
      });
    } else {
      texto += `Subtotal: ${formatBRL(selectedOrcamento.subtotal || selectedOrcamento.total)}\n`;
    }

    texto += `\nSubtotal: ${formatBRL(selectedOrcamento.subtotal || selectedOrcamento.total)}\n`;
    if (Number(selectedOrcamento.desconto) > 0) {
      texto += `Desconto: -${formatBRL(selectedOrcamento.desconto)}\n`;
    }
    texto += `*TOTAL LÍQUIDO: ${formatBRL(selectedOrcamento.total)}*\n`;

    if (selectedOrcamento.observacoes) {
      texto += `\nObservações:\n${selectedOrcamento.observacoes}\n`;
    }

    navigator.clipboard.writeText(texto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handlePrintProposal = () => {
    window.print();
  };

  // Helper para buscar objeto de cliente por ID
  const getCliente = (clienteId) => {
    return clientes.find((c) => String(c.id) === String(clienteId));
  };

  // Filtros aplicados
  const orcamentosFiltrados = orcamentos.filter((orc) => {
    const cliente = getCliente(orc.cliente_id);
    const nomeCliente = (cliente?.nome || orc.cliente_nome || '').toLowerCase();
    const numeroStr = String(orc.id);
    const termo = busca.toLowerCase().trim();

    const matchesBusca = termo === '' || nomeCliente.includes(termo) || numeroStr.includes(termo);
    const matchesStatus = statusFiltro === 'TODOS' || (orc.status || 'RASCUNHO').toUpperCase() === statusFiltro;

    return matchesBusca && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600" />
            Orçamentos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gere propostas comerciais profissionais com cálculo em tempo real e controle de status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            aria-label="Atualizar orçamentos"
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Novo Orçamento
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
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
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente ou número (#)..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Abas / Filtro de Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {['TODOS', 'RASCUNHO', 'ENVIADO', 'APROVADO', 'RECUSADO'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFiltro(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                statusFiltro === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'TODOS' ? 'Todos' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo Principal: Tabela ou Estado Vazio */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Carregando orçamentos...</p>
        </div>
      ) : orcamentosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            {busca || statusFiltro !== 'TODOS'
              ? 'Nenhum orçamento encontrado'
              : 'Nenhum orçamento emitido'}
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
            {busca || statusFiltro !== 'TODOS'
              ? 'Tente ajustar os filtros ou o termo de busca para encontrar propostas.'
              : 'Crie propostas personalizadas com itens do catálogo, controle de validade e envio fácil para o cliente.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Emitir Primeiro Orçamento
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          {/* Tabela em telas médias e grandes */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Número</th>
                  <th scope="col" className="px-5 py-3.5">Cliente</th>
                  <th scope="col" className="px-5 py-3.5">Data / Validade</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Subtotal</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Desconto</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Total</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orcamentosFiltrados.map((orc) => {
                  const cliente = getCliente(orc.cliente_id);
                  const nomeCliente = cliente?.nome || orc.cliente_nome || `Cliente #${orc.cliente_id}`;
                  const isUpdating = statusUpdatingId === orc.id;

                  return (
                    <tr
                      key={orc.id}
                      className="hover:bg-gray-50/60 transition-colors"
                      data-testid={`orcamento-row-${orc.id}`}
                    >
                      {/* Número / ID */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-indigo-600">
                          #{String(orc.id).padStart(4, '0')}
                        </span>
                      </td>

                      {/* Cliente */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{nomeCliente}</div>
                        {cliente?.telefone && (
                          <div className="text-xs text-gray-500">{cliente.telefone}</div>
                        )}
                      </td>

                      {/* Datas */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{formatDate(orc.data_emissao)}</div>
                        <div className="text-xs text-gray-500">
                          Val: {formatDate(orc.validade)}
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="px-5 py-4 whitespace-nowrap text-right text-gray-600 font-mono">
                        {formatBRL(orc.subtotal || orc.total)}
                      </td>

                      {/* Desconto */}
                      <td className="px-5 py-4 whitespace-nowrap text-right text-gray-500 font-mono">
                        {Number(orc.desconto) > 0 ? `-${formatBRL(orc.desconto)}` : '-'}
                      </td>

                      {/* Total */}
                      <td className="px-5 py-4 whitespace-nowrap text-right font-mono font-bold text-gray-900">
                        {formatBRL(orc.total)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <StatusBadge status={orc.status || 'RASCUNHO'} />
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* Visualizar Proposta */}
                          <button
                            type="button"
                            onClick={() => handleOpenProposta(orc)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="Visualizar Proposta Comercial"
                            aria-label={`Ver proposta do orçamento ${orc.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Ações de Status Rápido */}
                          {orc.status === 'RASCUNHO' && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(orc.id, 'ENVIADO')}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition inline-flex items-center gap-1"
                              title="Marcar como Enviado"
                            >
                              <Send className="w-3 h-3" />
                              Enviar
                            </button>
                          )}

                          {orc.status === 'ENVIADO' && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleUpdateStatus(orc.id, 'APROVADO')}
                                className="px-2 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                                title="Aprovar Orçamento"
                              >
                                Aprovar
                              </button>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleUpdateStatus(orc.id, 'RECUSADO')}
                                className="px-2 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                                title="Recusar Orçamento"
                              >
                                Recusar
                              </button>
                            </div>
                          )}

                          {(orc.status === 'APROVADO' || orc.status === 'RECUSADO') && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(orc.id, 'RASCUNHO')}
                              className="px-2 py-1 text-xs font-medium rounded-lg text-gray-500 hover:bg-gray-100 transition"
                              title="Reabrir como Rascunho"
                            >
                              Reabrir
                            </button>
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

      {/* MODAL NOVO ORÇAMENTO */}
      <Modal
        isOpen={modalNovoOpen}
        onClose={() => setModalNovoOpen(false)}
        title="Emitir Novo Orçamento"
        maxWidth="max-w-3xl"
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
              form="form-novo-orcamento"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Orçamento'
              )}
            </button>
          </>
        }
      >
        <form id="form-novo-orcamento" onSubmit={handleCreateSubmit} className="space-y-6">
          {formErrors.geral && (
            <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 text-sm border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{formErrors.geral}</span>
            </div>
          )}

          {/* Dados Gerais: Cliente, Emissão, Validade */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label htmlFor="cliente_id" className="block text-sm font-semibold text-gray-700 mb-1">
                Cliente <span className="text-rose-500">*</span>
              </label>
              <select
                id="cliente_id"
                name="cliente_id"
                value={formClienteId}
                onChange={(e) => setFormClienteId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Selecione o cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              {formErrors.cliente_id && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.cliente_id}</p>
              )}
            </div>

            <div>
              <FormField
                label="Data de Emissão"
                id="data_emissao"
                name="data_emissao"
                type="date"
                value={formDataEmissao}
                onChange={(e) => setFormDataEmissao(e.target.value)}
                required
                error={formErrors.data_emissao}
              />
            </div>

            <div>
              <FormField
                label="Validade da Proposta"
                id="validade"
                name="validade"
                type="date"
                value={formValidade}
                onChange={(e) => setFormValidade(e.target.value)}
              />
            </div>
          </div>

          {/* Linhas Dinâmicas de Itens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Itens e Serviços do Orçamento
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Item
              </button>
            </div>

            <div className="space-y-3">
              {formItens.map((item, index) => {
                const subtotalItem = calcularSubtotalItem(item);
                return (
                  <div
                    key={item.tempId}
                    className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      {/* Seleção de Serviço ou Digitação */}
                      <div className="md:col-span-4">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Serviço do Catálogo
                        </label>
                        <select
                          value={item.servico_id}
                          onChange={(e) => handleItemChange(index, 'servico_id', e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">(Serviço Avulso / Manual)</option>
                          {servicos.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nome} ({formatBRL(s.preco)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Descrição do Item */}
                      <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Descrição / Detalhe
                        </label>
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
                          placeholder="Ex: Consultoria / Reparo"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Quantidade */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Qtd
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantidade}
                          onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Preço Unitário */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Unitário (R$)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.preco_unitario}
                          onChange={(e) => handleItemChange(index, 'preco_unitario', e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Remover Item */}
                      <div className="md:col-span-1 flex items-center justify-end pb-1">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Remover linha"
                          aria-label={`Remover item ${index + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500 pt-1 border-t border-gray-200/60">
                      <span>Item #{index + 1}</span>
                      <span className="font-mono font-semibold text-gray-800">
                        Subtotal do item: {formatBRL(subtotalItem)}
                      </span>
                    </div>

                    {formErrors[`item_${index}`] && (
                      <p className="text-xs text-rose-600 font-medium">
                        {formErrors[`item_${index}`]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desconto & Observações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FormField
                label="Desconto Geral (R$)"
                id="desconto"
                name="desconto"
                type="number"
                min="0"
                step="0.01"
                value={formDesconto}
                onChange={(e) => setFormDesconto(e.target.value)}
                helpText="Valor a deduzir do subtotal dos itens"
                error={formErrors.desconto}
              />
            </div>

            <div>
              <FormField
                label="Condições / Observações"
                id="observacoes"
                name="observacoes"
                as="textarea"
                rows={2}
                placeholder="Ex: Pagamento 50% adiantado via PIX, entrega em 5 dias úteis."
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value)}
              />
            </div>
          </div>

          {/* Resumo Visual de Totais Calculado em Tempo Real */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
            <div className="flex justify-between text-sm text-gray-700">
              <span>Subtotal dos Itens:</span>
              <span className="font-mono font-semibold">{formatBRL(subtotalAtual)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Desconto Aplicado:</span>
              <span className="font-mono font-semibold text-rose-600">
                -{formatBRL(descontoAtual)}
              </span>
            </div>
            <div className="pt-2 border-t border-indigo-200/60 flex justify-between items-center">
              <span className="text-base font-bold text-gray-900">Total Líquido:</span>
              <span className="text-xl font-mono font-bold text-indigo-700">
                {formatBRL(totalAtual)}
              </span>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL DE VISUALIZAÇÃO / IMPRESSÃO DA PROPOSTA COMERCIAL */}
      {selectedOrcamento && (
        <Modal
          isOpen={modalPropostaOpen}
          onClose={() => setModalPropostaOpen(false)}
          title={`Proposta Comercial #${String(selectedOrcamento.id).padStart(4, '0')}`}
          maxWidth="max-w-3xl"
          footer={
            <div className="w-full flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setModalPropostaOpen(false)}
                className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Fechar
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleCopyProposal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
                  title="Copiar texto para WhatsApp"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar p/ WhatsApp'}
                </button>

                <button
                  type="button"
                  onClick={handlePrintProposal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm"
                  title="Imprimir ou Salvar PDF"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir / PDF
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-6 print:p-0" id="area-proposta-impressao">
            {/* Header Proposta */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-gray-100">
              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-600 font-bold">
                  Proposta Comercial MEI
                </span>
                <h2 className="text-2xl font-bold text-gray-900 mt-0.5">
                  Orçamento #{String(selectedOrcamento.id).padStart(4, '0')}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={selectedOrcamento.status || 'RASCUNHO'} />
                </div>
              </div>

              <div className="text-right text-xs text-gray-500 space-y-1">
                <div>
                  <span className="font-semibold text-gray-700">Data de Emissão: </span>
                  {formatDate(selectedOrcamento.data_emissao)}
                </div>
                {selectedOrcamento.validade && (
                  <div>
                    <span className="font-semibold text-gray-700">Validade da Proposta: </span>
                    {formatDate(selectedOrcamento.validade)}
                  </div>
                )}
              </div>
            </div>

            {/* Informações do Cliente */}
            {(() => {
              const cliente = getCliente(selectedOrcamento.cliente_id);
              const nome = cliente?.nome || selectedOrcamento.cliente_nome || 'Cliente não identificado';
              return (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Dados do Cliente
                  </div>
                  <div className="text-base font-bold text-gray-900">{nome}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 pt-1">
                    {cliente?.telefone && <div>Telefone: {cliente.telefone}</div>}
                    {cliente?.email && <div>E-mail: {cliente.email}</div>}
                    {cliente?.endereco && (
                      <div className="sm:col-span-2">Endereço: {cliente.endereco}</div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Tabela de Itens da Proposta */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100/75 text-xs uppercase font-semibold text-gray-600">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Item / Serviço</th>
                    <th className="px-4 py-3 text-center">Qtd</th>
                    <th className="px-4 py-3 text-right">Preço Unit.</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedOrcamento.itens && selectedOrcamento.itens.length > 0 ? (
                    selectedOrcamento.itens.map((it, idx) => {
                      const desc = it.descricao || it.servico_nome || `Item ${idx + 1}`;
                      const sub = it.subtotal || (Number(it.quantidade) || 1) * (Number(it.preco_unitario) || 0);
                      return (
                        <tr key={it.id || idx}>
                          <td className="px-4 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{desc}</td>
                          <td className="px-4 py-3 text-center font-mono">{it.quantidade}</td>
                          <td className="px-4 py-3 text-right font-mono text-gray-700">
                            {formatBRL(it.preco_unitario)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                            {formatBRL(sub)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-4 text-center text-gray-500 italic">
                        Itens consolidados na proposta.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totais e Observações */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div>
                {selectedOrcamento.observacoes && (
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70 text-xs text-gray-700 space-y-1">
                    <div className="font-semibold text-gray-900">Observações Comerciais:</div>
                    <p className="whitespace-pre-line leading-relaxed">{selectedOrcamento.observacoes}</p>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">
                    {formatBRL(selectedOrcamento.subtotal || selectedOrcamento.total)}
                  </span>
                </div>
                {Number(selectedOrcamento.desconto) > 0 && (
                  <div className="flex justify-between text-sm text-rose-600 font-semibold">
                    <span>Desconto:</span>
                    <span className="font-mono">-{formatBRL(selectedOrcamento.desconto)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-indigo-200 flex justify-between items-center text-base font-bold text-gray-900">
                  <span>Total Final:</span>
                  <span className="text-xl font-mono text-indigo-700">
                    {formatBRL(selectedOrcamento.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

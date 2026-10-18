import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Bot,
  Save,
  Send,
  ShieldCheck,
  Sliders,
  MessageSquare,
  Copy,
  Check,
  Sparkles,
  DollarSign,
  Calendar,
  BookOpen,
  FileText,
  CreditCard,
  RefreshCw,
  BellRing,
  UserCheck,
  Clock,
  PhoneCall,
  Plus,
  Trash2,
} from 'lucide-react';
import api from '../services/api';
import AdaptiveParagraph from '../components/AdaptiveParagraph';

const TONS_DE_VOZ = [
  { id: 'FORMAL', label: 'Formal & Corporativo', desc: 'Vocabulário polido, respeitoso e estruturado.' },
  { id: 'AMIGAVEL', label: 'Amigável & Acolhedor', desc: 'Simpático, caloroso e próximo do cliente.' },
  { id: 'DESCONTRAIDO', label: 'Descontraído & Jovem', desc: 'Leve, dinâmico e com comunicação moderna.' },
  { id: 'CONSULTIVO', label: 'Consultivo & Especialista', desc: 'Focado em entender a dor do cliente e agregar valor.' },
  { id: 'DIRETO', label: 'Direto & Objetivo', desc: 'Respostas rápidas, concisas e focadas em conversão.' },
];

export default function AtendenteIA({ publicMode = false }) {
  const { slug: urlSlug } = useParams();

  const [loading, setLoading] = useState(!publicMode);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [config, setConfig] = useState({
    nome_atendente: 'Atendente Virtual',
    tom_voz: 'AMIGAVEL',
    mensagem_boas_vindas: 'Olá! Como posso ajudar você hoje?',
    instrucoes_customizadas: '',
    orcamento_min_valor: 0,
    orcamento_max_valor: 500,
    desconto_max_percentual: 5,
    antecedencia_minima_dias: 1,
    antecedencia_maxima_dias: 60,
    horario_inicio: '08:00',
    horario_fim: '18:00',
    transbordo_automatico: true,
    condicoes_retorno_humano: '',
    alcadas_por_servico: [],
    permite_agendar: true,
    permite_consultar_catalogo: true,
    permite_gerar_orcamento: true,
    permite_fechar_orcamento: true,
    permite_gerar_cobranca_pix: false,
    ativo: true,
    slug_publico: urlSlug || '',
  });

  const [servicosCatalogo, setServicosCatalogo] = useState([]);
  const [servicoSelecionadoId, setServicoSelecionadoId] = useState('');
  const [pendencias, setPendencias] = useState([]);

  // Estado do Chat (Simulador ou Público)
  const [clienteNome, setClienteNome] = useState(publicMode ? '' : 'Cliente Teste');
  const [clienteTelefone, setClienteTelefone] = useState(publicMode ? '' : '11999990000');
  const [mensagens, setMensagens] = useState([]);
  const [textoMensagem, setTextoMensagem] = useState('');
  const [enviandoChat, setEnviandoChat] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!publicMode) {
      carregarConfiguracao();
      carregarPendencias();
      carregarServicosCatalogo();
    } else {
      setMensagens([
        {
          id: 'welcome',
          remetente: 'atendente',
          texto: 'Olá! Bem-vindo ao nosso atendimento inteligente. Como posso ajudar você hoje?',
        },
      ]);
    }
  }, [publicMode]);

  useEffect(() => {
    if (chatEndRef.current && typeof chatEndRef.current.scrollIntoView === 'function') {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens]);

  const carregarConfiguracao = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/atendente/config');
      if (data?.sucesso && data.dados) {
        setConfig((prev) => ({
          ...prev,
          ...data.dados,
          alcadas_por_servico: Array.isArray(data.dados.alcadas_por_servico)
            ? data.dados.alcadas_por_servico
            : [],
        }));
        setMensagens([
          {
            id: 'welcome',
            remetente: 'atendente',
            texto: data.dados.mensagem_boas_vindas || 'Olá! Como posso ajudar você hoje?',
          },
        ]);
      }
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        texto: err.response?.data?.mensagem || 'Não foi possível carregar as configurações do atendente.',
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarServicosCatalogo = async () => {
    try {
      const { data } = await api.get('/servicos');
      const lista = Array.isArray(data?.dados) ? data.dados : Array.isArray(data) ? data : [];
      setServicosCatalogo(lista);
    } catch (_) {}
  };

  const carregarPendencias = async () => {
    try {
      const { data } = await api.get('/atendente/pendencias?status=PENDENTE');
      if (data?.sucesso && data.dados && Array.isArray(data.dados.itens)) {
        setPendencias(data.dados.itens);
      }
    } catch (_) {
      // Silencioso em caso de falha de rede
    }
  };

  const handleAdicionarAlcadaServico = () => {
    const sid = Number(servicoSelecionadoId);
    if (!sid) return;
    const jaExiste = (config.alcadas_por_servico || []).some((a) => Number(a.servico_id) === sid);
    if (jaExiste) return;

    const servObj = servicosCatalogo.find((s) => Number(s.id) === sid);
    const precoBase = servObj ? Number(servObj.preco || 100) : 100;

    const novaAlcada = {
      servico_id: sid,
      nome_servico: servObj?.nome || `Serviço #${sid}`,
      permite_fechar_orcamento: true,
      orcamento_min_valor: Math.max(0, Number((precoBase * 0.8).toFixed(2))),
      orcamento_max_valor: Number((precoBase * 1.5).toFixed(2)),
      desconto_max_percentual: Number(config.desconto_max_percentual ?? 5),
    };

    setConfig((prev) => ({
      ...prev,
      alcadas_por_servico: [...(prev.alcadas_por_servico || []), novaAlcada],
    }));
    setServicoSelecionadoId('');
  };

  const handleAtualizarAlcadaServico = (servicoId, campo, valor) => {
    setConfig((prev) => ({
      ...prev,
      alcadas_por_servico: (prev.alcadas_por_servico || []).map((item) =>
        Number(item.servico_id) === Number(servicoId) ? { ...item, [campo]: valor } : item
      ),
    }));
  };

  const handleRemoverAlcadaServico = (servicoId) => {
    setConfig((prev) => ({
      ...prev,
      alcadas_por_servico: (prev.alcadas_por_servico || []).filter(
        (item) => Number(item.servico_id) !== Number(servicoId)
      ),
    }));
  };

  const handleResolverPendencia = async (id) => {
    try {
      await api.patch(`/atendente/pendencias/${id}/status`, {
        status: 'CONCLUIDO',
        lido_mobile: true,
      });
      setPendencias((prev) => prev.filter((item) => item.id !== id));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('atendimento-pendente-atualizado'));
      }
    } catch (_) {}
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);
      const payload = {
        ...config,
        orcamento_min_valor: Number(config.orcamento_min_valor),
        orcamento_max_valor: Number(config.orcamento_max_valor),
        desconto_max_percentual: Number(config.desconto_max_percentual),
        antecedencia_minima_dias: Number(config.antecedencia_minima_dias ?? 0),
        antecedencia_maxima_dias: Number(config.antecedencia_maxima_dias ?? 60),
        alcadas_por_servico: (config.alcadas_por_servico || []).map((a) => ({
          ...a,
          servico_id: Number(a.servico_id),
          orcamento_min_valor: Number(a.orcamento_min_valor ?? 0),
          orcamento_max_valor: Number(a.orcamento_max_valor ?? 0),
          desconto_max_percentual: Number(a.desconto_max_percentual ?? 0),
          permite_fechar_orcamento: Boolean(a.permite_fechar_orcamento),
        })),
      };
      const { data } = await api.put('/atendente/config', payload);
      if (data?.sucesso && data.dados) {
        setConfig((prev) => ({
          ...prev,
          ...data.dados,
          alcadas_por_servico: Array.isArray(data.dados.alcadas_por_servico)
            ? data.dados.alcadas_por_servico
            : prev.alcadas_por_servico,
        }));
        setFeedback({ tipo: 'sucesso', texto: 'Configurações do Atendente Pessoal salvas com sucesso!' });
      }
    } catch (err) {
      setFeedback({
        tipo: 'erro',
        texto: err.response?.data?.mensagem || 'Erro ao salvar configurações do atendente.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarMensagem = async (e) => {
    e.preventDefault();
    const slugAlvo = publicMode ? urlSlug : config.slug_publico;
    if (!textoMensagem.trim() || !slugAlvo || enviandoChat) return;

    const msgUsuario = textoMensagem.trim();
    setTextoMensagem('');
    setMensagens((prev) => [
      ...prev,
      { id: Date.now().toString(), remetente: 'cliente', texto: msgUsuario },
    ]);

    try {
      setEnviandoChat(true);
      const { data } = await api.post(`/atendente/publico/${slugAlvo}/mensagem`, {
        mensagem: msgUsuario,
        cliente_nome: clienteNome || 'Visitante',
        cliente_telefone: clienteTelefone || '',
      });

      if (data?.sucesso && data.dados) {
        setMensagens((prev) => [
          ...prev,
          {
            id: `${Date.now()}-resp`,
            remetente: 'atendente',
            texto: data.dados.resposta,
            ferramentas: data.dados.ferramentas_acionadas || data.dados.tools_usadas || [],
          },
        ]);
        if (!publicMode) {
          carregarPendencias();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('atendimento-pendente-atualizado'));
          }
        }
      }
    } catch (err) {
      setMensagens((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          remetente: 'atendente',
          texto: err.response?.data?.mensagem || 'Desculpe, ocorreu uma instabilidade no atendimento.',
          erro: true,
        },
      ]);
    } finally {
      setEnviandoChat(false);
    }
  };

  const copiarLinkPublico = () => {
    if (!config.slug_publico) return;
    const url = `${window.location.origin}/atendimento/${config.slug_publico}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (publicMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[82vh]">
          <div className="p-4 bg-indigo-950/80 border-b border-indigo-800/50 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white">Atendimento Inteligente</h1>
              <p className="text-xs text-indigo-300">Respostas instantâneas, orçamentos e agendamentos</p>
            </div>
          </div>

          <div className="p-3 bg-slate-900/90 border-b border-slate-800 grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Seu nome"
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white"
            />
            <input
              type="text"
              placeholder="Seu WhatsApp / Telefone"
              value={clienteTelefone}
              onChange={(e) => setClienteTelefone(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white"
            />
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {mensagens.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.remetente === 'cliente' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.remetente === 'cliente'
                      ? 'bg-indigo-600 text-white'
                      : m.erro
                      ? 'bg-red-950/80 border border-red-800 text-red-200'
                      : 'bg-slate-800 text-slate-100 border border-slate-700'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleEnviarMensagem} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={textoMensagem}
              onChange={(e) => setTextoMensagem(e.target.value)}
              placeholder="Digite sua mensagem ou peça um orçamento..."
              className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={enviandoChat || !textoMensagem.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-medium flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Bot className="w-7 h-7 text-theme-primary" />
            <span>Atendente Pessoal do Cliente (B2B2C)</span>
          </h1>
          <AdaptiveParagraph className="text-sm opacity-75 mt-1">
            Configure o tom de voz, limites de agendamento, alçada de orçamento (geral e por serviço) e regras de retorno ao humano.
          </AdaptiveParagraph>
        </div>

        {config.slug_publico && (
          <button
            type="button"
            onClick={copiarLinkPublico}
            className="btn-theme-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-sm self-start"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Link Copiado!' : 'Copiar Link Público do Cliente'}</span>
          </button>
        )}
      </div>

      {/* Fila de Atendimento Pendente (Transbordo para o Humano / Alerta Mobile) */}
      {pendencias.length > 0 && (
        <div
          className="p-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 space-y-3"
          style={{ color: 'var(--text-main)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500 text-slate-950">
                <BellRing className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  Atendimento pendente ({pendencias.length}) — Clientes aguardando retorno humano
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Solicitações que fugiram da alçada ou do horário disponível do atendente virtual.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendencias.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-amber-500/30 flex flex-col justify-between gap-3"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                }}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                      {item.nome_cliente}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                      Atendimento pendente
                    </span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">{item.motivo}</p>
                  {item.resumo_conversa && (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {item.resumo_conversa}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {item.telefone_cliente && (
                    <a
                      href={`https://wa.me/55${String(item.telefone_cliente).replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleResolverPendencia(item.id)}
                    className="theme-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition"
                    style={{
                      backgroundColor: 'var(--btn-secondary-bg)',
                      color: 'var(--btn-secondary-text)',
                      borderColor: 'var(--btn-secondary-border)',
                    }}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Marcar Resolvido</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {feedback.texto}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center opacity-70 text-sm">Carregando configurações do atendente...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Configurações */}
          <form onSubmit={handleSalvar} className="lg:col-span-7 space-y-6">
            {/* Identidade e Tom de Voz */}
            <div
              className="p-6 rounded-2xl border space-y-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-theme-primary" />
                  <span>Identidade & Tom de Voz</span>
                </h2>
                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(config.ativo)}
                    onChange={(e) => setConfig({ ...config, ativo: e.target.checked })}
                    className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Atendente Ativo</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Nome do Atendente</label>
                  <input
                    type="text"
                    value={config.nome_atendente}
                    onChange={(e) => setConfig({ ...config, nome_atendente: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border text-sm bg-transparent"
                    style={{ borderColor: 'var(--border-color)' }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Tom de Voz</label>
                  <select
                    value={config.tom_voz}
                    onChange={(e) => setConfig({ ...config, tom_voz: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border text-sm bg-transparent"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
                  >
                    {TONS_DE_VOZ.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Mensagem de Boas-vindas</label>
                <input
                  type="text"
                  value={config.mensagem_boas_vindas || ''}
                  onChange={(e) => setConfig({ ...config, mensagem_boas_vindas: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border text-sm bg-transparent"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Instruções Customizadas da Empresa (Regras de Atendimento)
                </label>
                <textarea
                  rows={2}
                  value={config.instrucoes_customizadas || ''}
                  onChange={(e) => setConfig({ ...config, instrucoes_customizadas: e.target.value })}
                  placeholder="Ex: Atendemos de segunda a sábado das 9h às 18h. Não fazemos entregas fora da capital."
                  className="w-full px-3.5 py-2 rounded-xl border text-sm bg-transparent"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>
            </div>

            {/* Limites de Agendamento e Quando Retornar ao Humano */}
            <div
              className="p-6 rounded-2xl border space-y-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <h2 className="text-base font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <span>Limites de Agendamento & Retorno ao Humano</span>
              </h2>
              <p className="text-xs opacity-75">
                Defina com quantos dias de antecedência o atendente pode aceitar agendamentos (ex: mínimo 1 ou 3 dias).
                Qualquer tentativa fora do horário ou da capacidade gera alerta <strong>"Atendimento pendente"</strong> no mobile.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Antecedência Mín. (Dias)</label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={config.antecedencia_minima_dias ?? 0}
                    onChange={(e) => setConfig({ ...config, antecedencia_minima_dias: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border text-sm bg-transparent"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Antecedência Máx. (Dias)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={config.antecedencia_maxima_dias ?? 60}
                    onChange={(e) => setConfig({ ...config, antecedencia_maxima_dias: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border text-sm bg-transparent"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Início Expediente</label>
                  <input
                    type="time"
                    value={config.horario_inicio || '08:00'}
                    onChange={(e) => setConfig({ ...config, horario_inicio: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border text-sm bg-transparent"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Fim Expediente</label>
                  <input
                    type="time"
                    value={config.horario_fim || '18:00'}
                    onChange={(e) => setConfig({ ...config, horario_fim: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border text-sm bg-transparent"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(config.transbordo_automatico ?? true)}
                    onChange={(e) => setConfig({ ...config, transbordo_automatico: e.target.checked })}
                  />
                  <span>
                    Transferir para humano e notificar no mobile ("Atendimento pendente") sempre que fugir da capacidade do agente
                  </span>
                </label>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Quando Retornar ao Humano (Gatilhos e Situações Específicas)
                  </label>
                  <input
                    type="text"
                    value={config.condicoes_retorno_humano || ''}
                    onChange={(e) => setConfig({ ...config, condicoes_retorno_humano: e.target.value })}
                    placeholder="Ex: Urgências para o mesmo dia, agendamentos fora do horário ou serviços sob medida"
                    className="w-full px-3.5 py-2 rounded-xl border text-sm bg-transparent"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                </div>
              </div>
            </div>

            {/* Guardrails Financeiros de Orçamento (Geral e Por Serviço) */}
            <div
              className="p-6 rounded-2xl border space-y-5"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  <span>Alçada de Fechamento Automático de Orçamentos (Guardrail Determinístico)</span>
                </h2>
                <p className="text-xs opacity-75 mt-1">
                  Defina a faixa padrão geral (R$ mín/máx e % desconto) e, se desejar, configure limites específicos por serviço.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Valor Mínimo Geral (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.orcamento_min_valor}
                    onChange={(e) => setConfig({ ...config, orcamento_min_valor: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border text-sm bg-transparent"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Valor Máximo Geral (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.orcamento_max_valor}
                    onChange={(e) => setConfig({ ...config, orcamento_max_valor: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border text-sm bg-transparent"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Desconto Máximo Geral (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={config.desconto_max_percentual}
                    onChange={(e) => setConfig({ ...config, desconto_max_percentual: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border text-sm bg-transparent"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                </div>
              </div>

              {/* Subseção: Alçada Específica por Serviço */}
              <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      Alçada Específica por Serviço
                    </h3>
                    <p className="text-[11px] opacity-75">
                      Personalize o mínimo, máximo em R$ e desconto permitido para serviços individuais do seu catálogo.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={servicoSelecionadoId}
                      onChange={(e) => setServicoSelecionadoId(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border text-xs bg-transparent"
                      style={{
                        borderColor: 'var(--border-color)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <option value="">Selecionar serviço...</option>
                      {servicosCatalogo.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome} (R$ {Number(s.preco || 0).toFixed(2)})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAdicionarAlcadaServico}
                      disabled={!servicoSelecionadoId}
                      className="theme-btn-primary inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition disabled:opacity-40"
                      style={{
                        backgroundColor: 'var(--btn-primary-bg)',
                        color: 'var(--btn-primary-text)',
                        borderColor: 'var(--btn-primary-bg)',
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Serviço</span>
                    </button>
                  </div>
                </div>

                {(config.alcadas_por_servico || []).length === 0 ? (
                  <p className="text-xs opacity-60 italic">
                    Nenhuma regra específica por serviço configurada (todos os serviços usam a alçada geral acima).
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {(config.alcadas_por_servico || []).map((regra) => (
                      <div
                        key={regra.servico_id}
                        className="p-3.5 rounded-xl border space-y-2.5"
                        style={{
                          borderColor: 'var(--border-color)',
                          backgroundColor: 'var(--bg-surface-hover)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                            {regra.nome_servico || `Serviço #${regra.servico_id}`}
                          </span>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1.5 text-[11px] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(regra.permite_fechar_orcamento)}
                                onChange={(e) =>
                                  handleAtualizarAlcadaServico(
                                    regra.servico_id,
                                    'permite_fechar_orcamento',
                                    e.target.checked
                                  )
                                }
                              />
                              <span>Permitir fechar automático</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoverAlcadaServico(regra.servico_id)}
                              className="p-1 text-red-500 hover:text-red-400"
                              title="Remover regra deste serviço"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[10px] opacity-75 mb-0.5">Mínimo (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={regra.orcamento_min_valor}
                              onChange={(e) =>
                                handleAtualizarAlcadaServico(
                                  regra.servico_id,
                                  'orcamento_min_valor',
                                  e.target.value
                                )
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border text-xs"
                              style={{
                                borderColor: 'var(--border-color)',
                                backgroundColor: 'var(--bg-surface)',
                                color: 'var(--text-main)',
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] opacity-75 mb-0.5">Máximo (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={regra.orcamento_max_valor}
                              onChange={(e) =>
                                handleAtualizarAlcadaServico(
                                  regra.servico_id,
                                  'orcamento_max_valor',
                                  e.target.value
                                )
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border text-xs"
                              style={{
                                borderColor: 'var(--border-color)',
                                backgroundColor: 'var(--bg-surface)',
                                color: 'var(--text-main)',
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] opacity-75 mb-0.5">Desc. Máx (%)</label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="100"
                              value={regra.desconto_max_percentual}
                              onChange={(e) =>
                                handleAtualizarAlcadaServico(
                                  regra.servico_id,
                                  'desconto_max_percentual',
                                  e.target.value
                                )
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border text-xs"
                              style={{
                                borderColor: 'var(--border-color)',
                                backgroundColor: 'var(--bg-surface)',
                                color: 'var(--text-main)',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Permissões MCP */}
            <div
              className="p-6 rounded-2xl border space-y-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <h2 className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                <span>Capacidades MCP Permitidas ao Atendente</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--border-color)' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(config.permite_consultar_catalogo)}
                    onChange={(e) => setConfig({ ...config, permite_consultar_catalogo: e.target.checked })}
                  />
                  <BookOpen className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                  <span>Consultar Catálogo e Preços</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--border-color)' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(config.permite_agendar)}
                    onChange={(e) => setConfig({ ...config, permite_agendar: e.target.checked })}
                  />
                  <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                  <span>Verificar Agenda e Agendar Horários</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--border-color)' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(config.permite_gerar_orcamento)}
                    onChange={(e) => setConfig({ ...config, permite_gerar_orcamento: e.target.checked })}
                  />
                  <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                  <span>Elaborar Propostas de Orçamento</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--border-color)' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(config.permite_fechar_orcamento)}
                    onChange={(e) => setConfig({ ...config, permite_fechar_orcamento: e.target.checked })}
                  />
                  <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Fechar Orçamento Automaticamente na Faixa</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer sm:col-span-2" style={{ borderColor: 'var(--border-color)' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(config.permite_gerar_cobranca_pix)}
                    onChange={(e) => setConfig({ ...config, permite_gerar_cobranca_pix: e.target.checked })}
                  />
                  <CreditCard className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                  <span>Gerar Cobrança Automática ao Aprovar Orçamento</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-theme-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Salvando...' : 'Salvar Configurações'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Coluna Direita: Simulador em Tempo Real */}
          <div className="lg:col-span-5">
            <div
              className="rounded-2xl border overflow-hidden flex flex-col h-[640px]"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            >
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                  <div>
                    <h3 className="text-sm font-bold">Simulador ao Vivo: {config.nome_atendente}</h3>
                    <p className="text-[11px] opacity-70">
                      Tom: {config.tom_voz} • Antecedência mín.: {config.antecedencia_minima_dias ?? 0}d • Faixa: R$ {config.orcamento_min_valor} a R$ {config.orcamento_max_valor}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMensagens([
                      {
                        id: 'welcome-reset',
                        remetente: 'atendente',
                        texto: config.mensagem_boas_vindas || 'Olá! Como posso ajudar você hoje?',
                      },
                    ])
                  }
                  className="p-1.5 rounded-lg opacity-70 hover:opacity-100"
                  title="Reiniciar conversa"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {mensagens.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.remetente === 'cliente' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed border ${
                        m.remetente === 'cliente'
                          ? 'theme-btn-primary'
                          : m.erro
                          ? 'bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-300'
                          : ''
                      }`}
                      style={
                        m.remetente === 'cliente'
                          ? {
                              backgroundColor: 'var(--btn-primary-bg)',
                              color: 'var(--btn-primary-text)',
                              borderColor: 'var(--btn-primary-bg)',
                            }
                          : m.erro
                          ? undefined
                          : {
                              backgroundColor: 'var(--bg-surface-hover)',
                              color: 'var(--text-main)',
                              borderColor: 'var(--border-color)',
                            }
                      }
                    >
                      <p className="whitespace-pre-wrap">{m.texto}</p>
                    </div>
                    {m.ferramentas && m.ferramentas.length > 0 && (
                      <span className="text-[10px] mt-1 px-1" style={{ color: 'var(--color-primary)' }}>
                        MCP: {m.ferramentas.join(', ')}
                      </span>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form
                onSubmit={handleEnviarMensagem}
                className="p-3 border-t flex gap-2"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <input
                  type="text"
                  value={textoMensagem}
                  onChange={(e) => setTextoMensagem(e.target.value)}
                  placeholder="Simule um cliente (ex: Quero fechar um serviço de R$ 200)..."
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border bg-transparent"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
                <button
                  type="submit"
                  disabled={enviandoChat || !textoMensagem.trim()}
                  className="theme-btn-primary px-3.5 py-2 disabled:opacity-50 rounded-xl text-xs font-semibold flex items-center gap-1"
                  style={{
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                  }}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

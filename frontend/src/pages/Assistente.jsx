import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Bot,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import api from '../services/api';

const SUGESTOES_PADRAO = [
  'Qual o limite de faturamento anual do MEI?',
  'Como emitir nota fiscal para pessoa física?',
  'Como funciona o desenquadramento do MEI?',
  'Qual a data de vencimento mensal do boleto DAS?',
];

export default function Assistente() {
  const [conversas, setConversas] = useState([]);
  const [conversaAtivaId, setConversaAtivaId] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [mensagemInput, setMensagemInput] = useState('');
  const [carregandoConversas, setCarregandoConversas] = useState(true);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [fontesAbertas, setFontesAbertas] = useState({});

  const finalDoChatRef = useRef(null);

  // Rola até o final das mensagens
  const rolarParaOFinal = () => {
    if (typeof finalDoChatRef.current?.scrollIntoView === 'function') {
      finalDoChatRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    rolarParaOFinal();
  }, [mensagens, enviando]);

  // Carrega histórico de conversas do usuário
  const carregarConversas = async () => {
    try {
      setCarregandoConversas(true);
      const res = await api.get('/assistente/conversas');
      if (res.data?.sucesso) {
        setConversas(res.data.dados || []);
      }
    } catch (err) {
      console.error('Erro ao carregar conversas do assistente:', err);
    } finally {
      setCarregandoConversas(false);
    }
  };

  useEffect(() => {
    carregarConversas();
  }, []);

  // Carrega mensagens da conversa ativa selecionada
  const selecionarConversa = async (conversaId) => {
    setConversaAtivaId(conversaId);
    setErro(null);
    try {
      setCarregandoMensagens(true);
      const res = await api.get(`/assistente/conversas/${conversaId}/mensagens`);
      if (res.data?.sucesso) {
        setMensagens(res.data.dados || []);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      setErro('Não foi possível carregar o histórico desta conversa.');
    } finally {
      setCarregandoMensagens(false);
    }
  };

  const iniciarNovaConversa = () => {
    setConversaAtivaId(null);
    setMensagens([]);
    setErro(null);
    setMensagemInput('');
  };

  const excluirConversa = async (e, conversaId) => {
    e.stopPropagation();
    try {
      await api.delete(`/assistente/conversas/${conversaId}`);
      setConversas((prev) => prev.filter((c) => c.id !== conversaId));
      if (conversaAtivaId === conversaId) {
        iniciarNovaConversa();
      }
    } catch (err) {
      console.error('Erro ao excluir conversa:', err);
      setErro('Não foi possível excluir a conversa.');
    }
  };

  const alternarFonte = (msgId, index) => {
    const chave = `${msgId}-${index}`;
    setFontesAbertas((prev) => ({
      ...prev,
      [chave]: !prev[chave],
    }));
  };

  const enviarMensagemTexto = async (textoParaEnviar) => {
    const texto = (textoParaEnviar || mensagemInput).trim();
    if (!texto || enviando) return;

    setErro(null);
    const msgTemporariaUsuario = {
      id: Date.now(),
      papel: 'usuario',
      conteudo: texto,
      criado_em: new Date().toISOString(),
    };

    setMensagens((prev) => [...prev, msgTemporariaUsuario]);
    setMensagemInput('');
    setEnviando(true);

    try {
      const res = await api.post('/assistente/mensagens', {
        conversa_id: conversaAtivaId,
        mensagem: texto,
      });

      if (res.data?.sucesso) {
        const { conversa_id: novoConversaId, mensagem: msgAssistente } = res.data.dados;

        if (!conversaAtivaId) {
          setConversaAtivaId(novoConversaId);
          carregarConversas();
        }

        setMensagens((prev) => [...prev, msgAssistente]);
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      const mensagemErro =
        err.response?.data?.mensagem ||
        'Assistente IA temporariamente indisponível. Tente novamente em instantes.';
      setErro(mensagemErro);
    } finally {
      setEnviando(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    enviarMensagemTexto();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden">
      {/* Sidebar de Histórico de Conversas */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h1 className="font-bold text-slate-800 text-base">Assistente Virtual MEI</h1>
          </div>
          <button
            type="button"
            onClick={iniciarNovaConversa}
            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
            title="Nova conversa"
            aria-label="Nova conversa"
          >
            <Plus className="w-4 h-4" />
            <span>Nova</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {carregandoConversas ? (
            <div className="flex items-center justify-center p-6 text-slate-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Carregando conversas...
            </div>
          ) : conversas.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-slate-400">
              Nenhuma conversa anterior encontrada. Tire sua primeira dúvida!
            </div>
          ) : (
            conversas.map((c) => {
              const ativa = c.id === conversaAtivaId;
              return (
                <div
                  key={c.id}
                  onClick={() => selecionarConversa(c.id)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    ativa
                      ? 'bg-indigo-50 text-indigo-800 font-medium'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <MessageSquare className={`w-4 h-4 flex-shrink-0 ${ativa ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="truncate">{c.titulo}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => excluirConversa(e, c.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-opacity"
                    aria-label="Excluir conversa"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Área Principal de Chat */}
      <main className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
        {/* Header do Chat */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-semibold text-slate-800">
              {conversaAtivaId
                ? conversas.find((c) => c.id === conversaAtivaId)?.titulo || 'Conversa Ativa'
                : 'Nova Consulta'}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
              RAG Oficial MEI + Dados do Negócio
            </span>
          </div>
        </header>

        {/* Mensagens ou Sugestões Iniciais */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {carregandoMensagens ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              <Loader2 className="w-6 h-6 animate-spin mr-2 text-indigo-600" />
              Carregando mensagens da conversa...
            </div>
          ) : mensagens.length === 0 ? (
            <div className="max-w-2xl mx-auto py-12 text-center">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-100 text-indigo-600 mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Como posso ajudar o seu negócio hoje?
              </h2>
              <p className="text-sm text-slate-600 mb-8">
                Tire dúvidas com base no documento oficial do MEI e consulte informações em tempo real sobre seus clientes, orçamentos e financeiro.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {SUGESTOES_PADRAO.map((sugestao, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => enviarMensagemTexto(sugestao)}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/40 transition-all text-xs font-medium text-slate-700 hover:text-indigo-900 shadow-sm flex items-start gap-2.5 group"
                  >
                    <MessageSquare className="w-4 h-4 text-indigo-500 mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0" />
                    <span>{sugestao}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            mensagens.map((msg, idx) => {
              const ehUsuario = msg.papel === 'usuario';
              return (
                <div
                  key={msg.id || idx}
                  className={`flex gap-3 max-w-3xl ${ehUsuario ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      ehUsuario ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {ehUsuario ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`space-y-2 max-w-2xl`}>
                    <div
                      className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        ehUsuario
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                          : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.conteudo}</div>
                    </div>

                    {/* Exibição de Fontes Citadas pelo RAG */}
                    {!ehUsuario && msg.fontes && msg.fontes.length > 0 && (
                      <div className="bg-slate-100/80 rounded-xl p-3 border border-slate-200/80 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Fontes Oficiais Consultadas ({msg.fontes.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.fontes.map((fonte, fIdx) => {
                            const chave = `${msg.id || idx}-${fIdx}`;
                            const aberta = !!fontesAbertas[chave];
                            return (
                              <div key={fIdx} className="w-full">
                                <button
                                  type="button"
                                  onClick={() => alternarFonte(msg.id || idx, fIdx)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-[11px] font-medium text-slate-700 transition-colors shadow-2xs"
                                >
                                  <span>pág. {fonte.pagina}</span>
                                  {aberta ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                                </button>
                                {aberta && fonte.trecho && (
                                  <div className="mt-1 p-2 bg-white rounded border border-slate-200 text-[11px] text-slate-600 italic leading-snug">
                                    "{fonte.trecho}"
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Indicador de digitando/processando */}
          {enviando && (
            <div className="flex gap-3 mr-auto max-w-3xl items-center">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-white text-slate-500 rounded-2xl rounded-bl-none border border-slate-200 p-3.5 text-xs flex items-center gap-2 shadow-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Consultando regras oficiais e dados do negócio...</span>
              </div>
            </div>
          )}

          {/* Banner de erro amigável */}
          {erro && (
            <div className="max-w-2xl mx-auto p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{erro}</p>
                <p className="mt-0.5 text-rose-600">Por favor, verifique sua conexão ou tente novamente em instantes.</p>
              </div>
            </div>
          )}

          <div ref={finalDoChatRef} />
        </div>

        {/* Rodapé: Input + Aviso Legal Obrigatório */}
        <div className="bg-white border-t border-slate-200 p-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-2">
            <div className="relative flex items-center">
              <textarea
                value={mensagemInput}
                onChange={(e) => setMensagemInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={2000}
                placeholder="Digite sua dúvida contábil ou sobre seu negócio..."
                className="w-full resize-none rounded-xl border border-slate-300 py-3 pl-4 pr-14 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={enviando}
              />
              <button
                type="submit"
                disabled={!mensagemInput.trim() || enviando}
                aria-label="Enviar"
                className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg transition-colors flex items-center justify-center"
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-center text-[11px] text-slate-400">
              Orientação informativa baseada no documento oficial do MEI. Não substitui assessoria contábil.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

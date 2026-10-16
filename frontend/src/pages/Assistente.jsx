import React, { useEffect, useRef, useContext, useState } from 'react';
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
  Paperclip,
  Image,
  Mic,
  MicOff,
  X,
  Volume2,
} from 'lucide-react';
import { ChatContext, ChatProvider, useChat } from '../context/ChatContext';

const SUGESTOES_PADRAO = [
  'Qual o limite de faturamento anual do MEI?',
  'Como emitir nota fiscal para pessoa física?',
  'Como funciona o desenquadramento do MEI?',
  'Qual a data de vencimento mensal do boleto DAS?',
];

function AssistenteView() {
  const {
    conversas,
    conversaAtivaId,
    mensagens,
    mensagemInput,
    anexoMidia,
    carregandoConversas,
    carregandoMensagens,
    enviando,
    erro,
    fontesAbertas,
    setMensagemInput,
    setAnexoMidia,
    limparAnexoMidia,
    iniciarNovaConversa,
    selecionarConversa,
    excluirConversa,
    alternarFonte,
    enviarMensagemTexto,
    limparNotificacao,
  } = useChat();

  const finalDoChatRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const [gravando, setGravando] = useState(false);
  const [tempoGravacao, setTempoGravacao] = useState(0);

  // Inicia gravação de áudio pelo microfone
  const iniciarGravacao = async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        alert('Seu navegador não suporta gravação de áudio.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const mimeTypeGravado = mr.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeTypeGravado });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAnexoMidia({
            tipo: 'audio',
            dados_base64: reader.result,
            mime_type: blob.type || mimeTypeGravado,
            previewUrl: null,
            nomeArquivo: mimeTypeGravado.includes('ogg') ? 'mensagem-voz.ogg' : 'mensagem-voz.webm',
          });
        };
        reader.readAsDataURL(blob);
      };

      mr.start();
      setGravando(true);
      setTempoGravacao(0);
      timerRef.current = setInterval(() => {
        setTempoGravacao((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const pararGravacao = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setGravando(false);
  };

  const cancelarGravacao = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    setGravando(false);
    setTempoGravacao(0);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAnexoMidia({
        tipo: 'imagem',
        dados_base64: reader.result,
        mime_type: file.type || 'image/jpeg',
        previewUrl: reader.result,
        nomeArquivo: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Rola até o final das mensagens
  const rolarParaOFinal = () => {
    if (typeof finalDoChatRef.current?.scrollIntoView === 'function') {
      finalDoChatRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    limparNotificacao();
  }, [limparNotificacao]);

  useEffect(() => {
    rolarParaOFinal();
  }, [mensagens, enviando]);

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
    <div className="flex h-[calc(85vh)] bg-slate-50 overflow-hidden rounded-2xl shadow-lg border border-slate-200">
      {/* Sidebar de Histórico de Conversas */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="p-4 flex items-center justify-between">
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
              const ehWhatsApp = c.canal === 'whatsapp';
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
                    <MessageSquare className={`w-4 h-4 flex-shrink-0 ${ehWhatsApp ? 'text-emerald-600' : ativa ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="truncate">{c.titulo}</span>
                    {ehWhatsApp && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex-shrink-0">
                        WhatsApp
                      </span>
                    )}
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
            {conversaAtivaId && conversas.find((c) => c.id === conversaAtivaId)?.canal === 'whatsapp' && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Canal WhatsApp
              </span>
            )}
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
            mensagens
              .filter((m) => !(m.papel === 'assistente' && m.status === 'processando' && !m.conteudo))
              .map((msg, idx) => {
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
                        {/* Indicador de mensagem multimodal */}
                        {msg.tipo_midia === 'audio' && (
                          <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold px-2.5 py-1 rounded-lg w-fit ${ehUsuario ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-700'}`}>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Mensagem de Voz</span>
                          </div>
                        )}
                        {msg.tipo_midia === 'imagem' && (
                          <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold px-2.5 py-1 rounded-lg w-fit ${ehUsuario ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-700'}`}>
                            <Image className="w-3.5 h-3.5" />
                            <span>Imagem Anexada</span>
                          </div>
                        )}
                        {msg.midia_preview && (
                          <div className="mb-2">
                            <img src={msg.midia_preview} alt="Pré-visualização" className="max-h-48 rounded-xl object-cover border border-indigo-400/40 shadow-xs" />
                          </div>
                        )}
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
                                    <span>pág. {fonte.pagina}{fonte.score ? ` (${Math.round(fonte.score * 100)}%)` : ''}</span>
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
            {/* Pré-visualização do Anexo de Mídia */}
            {anexoMidia && (
              <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-200 rounded-xl mb-1 text-xs text-indigo-900 animate-fadeIn">
                {anexoMidia.tipo === 'imagem' ? (
                  <>
                    {anexoMidia.previewUrl && (
                      <img src={anexoMidia.previewUrl} alt="Preview" className="w-8 h-8 rounded-lg object-cover border border-indigo-300" />
                    )}
                    <span className="flex-1 font-medium truncate">{anexoMidia.nomeArquivo || 'Imagem anexada'}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-indigo-600 animate-pulse" />
                    <span className="flex-1 font-medium">Áudio gravado pronto para envio</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={limparAnexoMidia}
                  aria-label="Remover anexo"
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Barra de Gravação de Áudio ao Vivo */}
            {gravando && (
              <div className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-200 rounded-xl mb-1 text-xs text-rose-700 animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <span className="font-semibold">Gravando mensagem de voz... {Math.floor(tempoGravacao / 60)}:{(tempoGravacao % 60).toString().padStart(2, '0')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelarGravacao}
                    className="px-2.5 py-1 text-rose-600 hover:bg-rose-100 rounded-lg font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={pararGravacao}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            )}

            <div className="relative flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                aria-label="Upload de imagem"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={enviando || gravando}
                aria-label="Anexar imagem"
                title="Anexar foto ou documento"
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors disabled:opacity-50"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={gravando ? pararGravacao : iniciarGravacao}
                disabled={enviando}
                aria-label={gravando ? "Parar gravação" : "Gravar áudio"}
                title={gravando ? "Parar gravação" : "Gravar mensagem de voz"}
                className={`p-2 rounded-xl transition-colors disabled:opacity-50 ${
                  gravando ? 'text-rose-600 bg-rose-100 animate-pulse' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <textarea
                value={mensagemInput}
                onChange={(e) => setMensagemInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={2000}
                placeholder={anexoMidia ? "Adicione uma instrução opcional..." : "Digite sua dúvida contábil ou sobre seu negócio..."}
                className="w-full resize-none rounded-xl border border-slate-300 py-3 pl-4 pr-14 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={enviando || gravando}
              />
              <button
                type="submit"
                disabled={(!mensagemInput.trim() && !anexoMidia) || enviando || gravando}
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

export default function Assistente() {
  const context = useContext(ChatContext);
  if (!context || !context._isProvider) {
    return (
      <ChatProvider>
        <AssistenteView />
      </ChatProvider>
    );
  }
  return <AssistenteView />;
}

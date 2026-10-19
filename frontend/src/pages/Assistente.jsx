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
  VolumeX,
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
    preferenciaResposta,
    falandoMensagemId,
    toggleOuvirMensagem,
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
  const [sidebarConversasAberta, setSidebarConversasAberta] = useState(false);

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
    <div
      className="flex h-[calc(100dvh-4rem)] md:h-[calc(85vh)] min-h-0 md:min-h-[520px] theme-card overflow-hidden rounded-none md:rounded-2xl shadow-none md:shadow-lg border-0 md:border transition-colors duration-200 relative"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-main)',
      }}
    >
      {/* Backdrop para fechar o drawer de conversas no mobile / telas <= 1180px */}
      {sidebarConversasAberta && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 min-[1181px]:hidden transition-opacity"
          onClick={() => setSidebarConversasAberta(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar de Histórico de Conversas (Off-canvas responsivo <= 1180px, estático > 1180px) */}
      <aside
        role="complementary"
        className={`
          fixed inset-y-0 left-0 z-50 w-72 sm:w-80 max-w-[85vw] flex flex-col transition-transform duration-200 ease-in-out border-r
          min-[1181px]:static min-[1181px]:translate-x-0 min-[1181px]:z-auto min-[1181px]:flex-shrink-0 min-[1181px]:w-80
          ${sidebarConversasAberta ? 'translate-x-0 shadow-2xl' : '-translate-x-full min-[1181px]:translate-x-0'}
        `}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-main)',
        }}
      >
        <div
          className="p-4 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            <h1 className="font-bold text-base" style={{ color: 'var(--text-main)' }}>
              Assistente Virtual MEI
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                iniciarNovaConversa();
                setSidebarConversasAberta(false);
              }}
              className="p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold hover:opacity-90"
              style={{
                color: 'var(--color-primary)',
                backgroundColor: 'var(--bg-surface-hover)',
              }}
              title="Nova conversa"
              aria-label="Nova conversa"
            >
              <Plus className="w-4 h-4" />
              <span>Nova</span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarConversasAberta(false)}
              className="p-1.5 rounded-lg min-[1181px]:hidden transition-colors hover:opacity-80"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Fechar histórico"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {carregandoConversas ? (
            <div className="flex items-center justify-center p-6 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Loader2 className="w-4 h-4 animate-spin mr-2" style={{ color: 'var(--color-primary)' }} />
              Carregando conversas...
            </div>
          ) : conversas.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              Nenhuma conversa anterior encontrada. Tire sua primeira dúvida!
            </div>
          ) : (
            conversas.map((c) => {
              const ativa = c.id === conversaAtivaId;
              const ehWhatsApp = c.canal === 'whatsapp';
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    selecionarConversa(c.id);
                    setSidebarConversasAberta(false);
                  }}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    ativa ? 'font-medium' : 'hover:opacity-90'
                  }`}
                  style={
                    ativa
                      ? {
                          backgroundColor: 'var(--bg-surface-hover)',
                          color: 'var(--text-main)',
                          borderLeft: '3px solid var(--color-primary)',
                        }
                      : {
                          color: 'var(--text-secondary)',
                        }
                  }
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <MessageSquare
                      className="w-4 h-4 flex-shrink-0"
                      style={{
                        color: ehWhatsApp ? '#059669' : ativa ? 'var(--color-primary)' : 'var(--text-muted)',
                      }}
                    />
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
                    className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity hover:text-rose-600"
                    style={{ color: 'var(--text-muted)' }}
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
      <main
        className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
      >
        {/* Botão Flutuante Mobile / Telas <= 1180px: Somente o ícone de conversas para máxima imersão */}
        <div className="min-[1181px]:hidden absolute top-3 left-3 z-20">
          <button
            type="button"
            onClick={() => setSidebarConversasAberta(true)}
            className="p-2.5 rounded-full shadow-md border backdrop-blur-md transition-transform active:scale-90 flex items-center justify-center opacity-90 hover:opacity-100"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)',
            }}
            title="Abrir histórico de conversas"
            aria-label="Abrir histórico de conversas"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>

        {/* Header do Chat (visível apenas em telas desktop > 1180px) */}
        <header
          className="hidden min-[1181px]:flex h-14 border-b px-6 items-center justify-between flex-shrink-0 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-main)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
            <span className="text-sm font-semibold truncate max-w-md" style={{ color: 'var(--text-main)' }}>
              {conversaAtivaId
                ? conversas.find((c) => c.id === conversaAtivaId)?.titulo || 'Conversa Ativa'
                : 'Nova Consulta'}
            </span>
            {conversaAtivaId && conversas.find((c) => c.id === conversaAtivaId)?.canal === 'whatsapp' && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex-shrink-0">
                Canal WhatsApp
              </span>
            )}
            {preferenciaResposta === 'audio' && (
              <span className="badge-theme-subtle text-[11px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 flex-shrink-0">
                <Volume2 className="w-3 h-3 text-theme-primary" />
                <span>Respostas em Áudio</span>
              </span>
            )}
          </div>
        </header>

        {/* Mensagens ou Sugestões Iniciais */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 pt-14 min-[1181px]:pt-6">
          {carregandoMensagens ? (
            <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-muted)' }}>
              <Loader2 className="w-6 h-6 animate-spin mr-2" style={{ color: 'var(--color-primary)' }} />
              Carregando mensagens da conversa...
            </div>
          ) : mensagens.length === 0 ? (
            <div className="max-w-2xl mx-auto py-8 sm:py-12 text-center">
              <div
                className="inline-flex p-3 rounded-2xl mb-4"
                style={{
                  backgroundColor: 'var(--bg-surface-hover)',
                  color: 'var(--color-primary)',
                }}
              >
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>
                Como posso ajudar o seu negócio hoje?
              </h2>
              <p className="text-xs sm:text-sm mb-6 sm:mb-8 max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
                Tire dúvidas com base no documento oficial do MEI e consulte informações em tempo real sobre seus clientes, orçamentos e financeiro.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-left">
                {SUGESTOES_PADRAO.map((sugestao, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => enviarMensagemTexto(sugestao)}
                    className="p-3 sm:p-3.5 border rounded-xl transition-all text-xs font-medium shadow-xs flex items-start gap-2.5 group hover:opacity-95"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
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
                    className={`flex gap-2 sm:gap-3 max-w-full ${ehUsuario ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                      style={
                        ehUsuario
                          ? {
                              backgroundColor: 'var(--color-primary)',
                              color: 'var(--color-primary-text)',
                            }
                          : {
                              backgroundColor: 'var(--bg-surface-hover)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-color)',
                            }
                      }
                    >
                      {ehUsuario ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </div>

                    <div className="space-y-2 max-w-[85%] sm:max-w-2xl min-w-0">
                      <div
                        className={`p-3 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                          ehUsuario ? 'rounded-br-none' : 'rounded-bl-none border'
                        }`}
                        style={
                          ehUsuario
                            ? {
                                backgroundColor: 'var(--color-primary)',
                                color: 'var(--color-primary-text)',
                              }
                            : {
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-main)',
                              }
                        }
                      >
                        {/* Indicador de mensagem multimodal */}
                        {msg.tipo_midia === 'audio' && (
                          <div
                            className={`flex items-center gap-1.5 mb-2 text-xs font-semibold px-2 py-0.5 rounded-lg w-fit ${
                              ehUsuario ? 'bg-black/20 text-white' : 'border'
                            }`}
                            style={!ehUsuario ? { backgroundColor: 'var(--bg-surface-hover)', borderColor: 'var(--border-color)', color: 'var(--text-main)' } : {}}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Mensagem de Voz</span>
                          </div>
                        )}
                        {msg.tipo_midia === 'imagem' && (
                          <div
                            className={`flex items-center gap-1.5 mb-2 text-xs font-semibold px-2 py-0.5 rounded-lg w-fit ${
                              ehUsuario ? 'bg-black/20 text-white' : 'border'
                            }`}
                            style={!ehUsuario ? { backgroundColor: 'var(--bg-surface-hover)', borderColor: 'var(--border-color)', color: 'var(--text-main)' } : {}}
                          >
                            <Image className="w-3.5 h-3.5" />
                            <span>Imagem Anexada</span>
                          </div>
                        )}
                        {msg.midia_preview && (
                          <div className="mb-2">
                            <img src={msg.midia_preview} alt="Pré-visualização" className="max-h-48 rounded-xl object-cover border shadow-xs" style={{ borderColor: 'var(--border-color)' }} />
                          </div>
                        )}
                        <div className="whitespace-pre-wrap break-words">{msg.conteudo}</div>
                      </div>

                      {/* Exibição de Fontes Citadas pelo RAG */}
                      {!ehUsuario && msg.fontes && msg.fontes.length > 0 && (
                        <div
                          className="rounded-xl p-3 border space-y-2"
                          style={{
                            backgroundColor: 'var(--bg-surface-hover)',
                            borderColor: 'var(--border-color)',
                          }}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                            <FileText className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
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
                                    className="inline-flex items-center gap-1 px-2 py-1 border rounded text-[11px] font-medium transition-colors shadow-2xs"
                                    style={{
                                      backgroundColor: 'var(--bg-surface)',
                                      borderColor: 'var(--border-color)',
                                      color: 'var(--text-main)',
                                    }}
                                  >
                                    <span>pág. {fonte.pagina}{fonte.score ? ` (${Math.round(fonte.score * 100)}%)` : ''}</span>
                                    {aberta ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>
                                  {aberta && fonte.trecho && (
                                    <div
                                      className="mt-1 p-2 rounded border text-[11px] italic leading-snug"
                                      style={{
                                        backgroundColor: 'var(--bg-surface)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-secondary)',
                                      }}
                                    >
                                      "{fonte.trecho}"
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Ação de ouvir em voz alta / parar fala para mensagens do assistente */}
                      {!ehUsuario && (msg.status === 'concluida' || !msg.status) && msg.conteudo && (
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => toggleOuvirMensagem(msg.id || idx, msg.conteudo)}
                            aria-label={falandoMensagemId === (msg.id || idx) ? 'Parar leitura de voz' : 'Ouvir resposta em voz alta'}
                            title={falandoMensagemId === (msg.id || idx) ? 'Parar leitura' : 'Ouvir resposta'}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border shadow-2xs hover:opacity-90 cursor-pointer"
                            style={{
                              backgroundColor: falandoMensagemId === (msg.id || idx) ? 'var(--color-primary)' : 'var(--bg-surface)',
                              borderColor: 'var(--border-color)',
                              color: falandoMensagemId === (msg.id || idx) ? 'var(--color-primary-text, #ffffff)' : 'var(--text-secondary)',
                            }}
                          >
                            {falandoMensagemId === (msg.id || idx) ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5" />
                                <span>Parar leitura</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5 text-theme-primary" />
                                <span>Ouvir resposta</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
          )}

          {/* Indicador de digitando/processando */}
          {enviando && (
            <div className="flex gap-2 sm:gap-3 mr-auto max-w-[85%] sm:max-w-2xl items-center">
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'var(--bg-surface-hover)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
              </div>
              <div
                className="rounded-2xl rounded-bl-none border p-3 sm:p-3.5 text-xs flex items-center gap-2 shadow-xs"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--color-primary)' }} />
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
        <div
          className="border-t p-2.5 sm:p-4 transition-colors duration-200 flex-shrink-0"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
        >
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-2">
            {/* Pré-visualização do Anexo de Mídia */}
            {anexoMidia && (
              <div
                className="flex items-center gap-2 p-2 rounded-xl mb-1 text-xs border"
                style={{
                  backgroundColor: 'var(--bg-surface-hover)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-main)',
                }}
              >
                {anexoMidia.tipo === 'imagem' ? (
                  <>
                    {anexoMidia.previewUrl && (
                      <img src={anexoMidia.previewUrl} alt="Preview" className="w-8 h-8 rounded-lg object-cover border" style={{ borderColor: 'var(--border-color)' }} />
                    )}
                    <span className="flex-1 font-medium truncate">{anexoMidia.nomeArquivo || 'Imagem anexada'}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 animate-pulse" style={{ color: 'var(--color-primary)' }} />
                    <span className="flex-1 font-medium">Áudio gravado pronto para envio</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={limparAnexoMidia}
                  aria-label="Remover anexo"
                  className="p-1 rounded-md transition-colors hover:text-rose-600"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Barra de Gravação de Áudio ao Vivo */}
            {gravando && (
              <div className="flex items-center justify-between p-2 sm:p-2.5 bg-rose-50 border border-rose-200 rounded-xl mb-1 text-xs text-rose-700 animate-pulse">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping flex-shrink-0" />
                  <span className="font-semibold truncate">Gravando mensagem de voz... {Math.floor(tempoGravacao / 60)}:{(tempoGravacao % 60).toString().padStart(2, '0')}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={cancelarGravacao}
                    className="px-2 sm:px-2.5 py-1 text-rose-600 hover:bg-rose-100 rounded-lg font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={pararGravacao}
                    className="px-2.5 sm:px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            )}

            <div className="relative flex items-center gap-1 sm:gap-1.5">
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
                className="p-1.5 sm:p-2 rounded-xl transition-colors disabled:opacity-50 hover:opacity-80"
                style={{
                  color: 'var(--text-secondary)',
                }}
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={gravando ? pararGravacao : iniciarGravacao}
                disabled={enviando}
                aria-label={gravando ? "Parar gravação" : "Gravar áudio"}
                title={gravando ? "Parar gravação" : "Gravar mensagem de voz"}
                className={`p-1.5 sm:p-2 rounded-xl transition-colors disabled:opacity-50 ${
                  gravando ? 'text-rose-600 bg-rose-100 animate-pulse' : 'hover:opacity-80'
                }`}
                style={!gravando ? { color: 'var(--text-secondary)' } : {}}
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
                className="w-full resize-none rounded-xl border py-2.5 sm:py-3 pl-3 sm:pl-4 pr-11 sm:pr-14 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-main)',
                }}
                disabled={enviando || gravando}
              />
              <button
                type="submit"
                disabled={(!mensagemInput.trim() && !anexoMidia) || enviando || gravando}
                aria-label="Enviar"
                className="absolute right-1.5 sm:right-2 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-text)',
                }}
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-center text-[10px] sm:text-[11px]" style={{ color: 'var(--text-muted)' }}>
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

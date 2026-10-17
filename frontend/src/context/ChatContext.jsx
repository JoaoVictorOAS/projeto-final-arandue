import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const ChatContext = createContext({});

export function ChatProvider({ children }) {
  const [conversas, setConversas] = useState([]);
  const [conversaAtivaId, setConversaAtivaId] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [mensagemInput, setMensagemInput] = useState('');
  const [carregandoConversas, setCarregandoConversas] = useState(true);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [processandoMensagemId, setProcessandoMensagemId] = useState(null);
  const [erro, setErro] = useState(null);
  const [fontesAbertas, setFontesAbertas] = useState({});
  const [notificacao, setNotificacao] = useState(null);

  const pollingRef = useRef(null);

  // Limpa o timer de short-polling ao desmontar o provedor
  const pararPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      pararPolling();
    };
  }, [pararPolling]);

  // Carrega histórico de conversas
  const carregarConversas = useCallback(async (silencioso = false) => {
    let token = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        token = window.localStorage.getItem('token');
      }
    } catch {}

    const isTest =
      (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') ||
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');

    if (!token && !isTest) {
      if (!silencioso) setCarregandoConversas(false);
      setConversas([]);
      return;
    }

    try {
      if (!silencioso) setCarregandoConversas(true);
      const res = await api.get('/assistente/conversas');
      if (res.data?.sucesso) {
        setConversas(res.data.dados || []);
      }
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error('Erro ao carregar conversas do assistente:', err);
      }
    } finally {
      if (!silencioso) setCarregandoConversas(false);
    }
  }, []);

  useEffect(() => {
    carregarConversas();
  }, [carregarConversas]);

  const POLLING_INTERVAL_MS =
    (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test')
      ? 100
      : 1500;

  // Executa o Short-polling para uma mensagem específica em processamento
  const iniciarPolling = useCallback((mensagemId, conversaIdAlvo) => {
    pararPolling();
    setProcessandoMensagemId(mensagemId);
    setEnviando(true);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/assistente/mensagens/${mensagemId}/status`);
        if (res.data?.sucesso) {
          const dadosMsg = res.data.dados;

          if (dadosMsg.status === 'concluida') {
            pararPolling();
            setProcessandoMensagemId(null);
            setEnviando(false);

            // Atualiza a mensagem na conversa ativa se coincidir
            setMensagens((prev) =>
              prev.map((m) =>
                m.id === mensagemId
                  ? {
                      ...m,
                      status: 'concluida',
                      conteudo: dadosMsg.conteudo,
                      fontes: dadosMsg.fontes || [],
                      tools_usadas: dadosMsg.tools_usadas || [],
                    }
                  : m
              )
            );

            // Atualiza a lista de conversas em segundo plano
            carregarConversas(true);

            // Se o usuário não estiver na página do assistente, dispara notificação
            if (typeof window !== 'undefined' && window.location.pathname !== '/assistente') {
              setNotificacao({
                conversaId: conversaIdAlvo,
                mensagem: 'O Assistente IA respondeu sua dúvida!',
              });
            }
          } else if (dadosMsg.status === 'erro') {
            pararPolling();
            setProcessandoMensagemId(null);
            setEnviando(false);

            const msgErro = dadosMsg.erro_mensagem || 'Assistente IA temporariamente indisponível.';
            setMensagens((prev) =>
              prev.map((m) =>
                m.id === mensagemId
                  ? {
                      ...m,
                      status: 'erro',
                      conteudo: msgErro,
                      erro_mensagem: msgErro,
                    }
                  : m
              )
            );
            setErro(msgErro);
          }
        }
      } catch (err) {
        console.error('Erro no short-polling da mensagem:', err);
      }
    }, POLLING_INTERVAL_MS);
  }, [pararPolling, carregarConversas, POLLING_INTERVAL_MS]);

  // Carrega mensagens da conversa selecionada
  const selecionarConversa = useCallback(async (conversaId) => {
    setConversaAtivaId(conversaId);
    setErro(null);
    try {
      setCarregandoMensagens(true);
      const res = await api.get(`/assistente/conversas/${conversaId}/mensagens`);
      if (res.data?.sucesso) {
        const msgs = res.data.dados || [];
        setMensagens(msgs);

        // Verifica se há alguma mensagem em processamento nesta conversa
        const msgProcessando = msgs.find((m) => m.status === 'processando');
        if (msgProcessando) {
          iniciarPolling(msgProcessando.id, conversaId);
        } else if (!pollingRef.current) {
          setEnviando(false);
          setProcessandoMensagemId(null);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      setErro('Não foi possível carregar o histórico desta conversa.');
    } finally {
      setCarregandoMensagens(false);
    }
  }, [iniciarPolling]);

  const iniciarNovaConversa = useCallback(() => {
    setConversaAtivaId(null);
    setMensagens([]);
    setErro(null);
    setMensagemInput('');
    setEnviando(false);
    setProcessandoMensagemId(null);
    pararPolling();
  }, [pararPolling]);

  const excluirConversa = useCallback(async (e, conversaId) => {
    if (e) e.stopPropagation();
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
  }, [conversaAtivaId, iniciarNovaConversa]);

  const alternarFonte = useCallback((msgId, index) => {
    const chave = `${msgId}-${index}`;
    setFontesAbertas((prev) => ({
      ...prev,
      [chave]: !prev[chave],
    }));
  }, []);

  const limparNotificacao = useCallback(() => {
    setNotificacao(null);
  }, []);

  const [anexoMidia, setAnexoMidia] = useState(null); // { tipo: 'imagem' | 'audio', dados_base64, mime_type, previewUrl, nomeArquivo }

  // Envio de mensagem com suporte a Short-Polling assíncrono e anexos de áudio/imagem
  const enviarMensagemTexto = useCallback(async (textoParaEnviar, midiaParaEnviar) => {
    const midiaFinal = midiaParaEnviar !== undefined ? midiaParaEnviar : anexoMidia;
    const tipoMidiaFinal = midiaFinal ? midiaFinal.tipo : 'texto';
    const textoEntrada = typeof textoParaEnviar === 'string' ? textoParaEnviar : mensagemInput;
    let texto = textoEntrada.trim();

    if (!texto && !midiaFinal) return;
    if (enviando) return;

    if (!texto && midiaFinal && tipoMidiaFinal !== 'audio') {
      texto = 'Analise esta imagem enviada.';
    }

    setErro(null);
    const msgTemporariaUsuario = {
      id: `user-${Date.now()}`,
      papel: 'usuario',
      conteudo: texto,
      tipo_midia: tipoMidiaFinal,
      midia_preview: midiaFinal?.previewUrl || null,
      status: 'concluida',
      criado_em: new Date().toISOString(),
    };

    setMensagens((prev) => [...prev, msgTemporariaUsuario]);
    setMensagemInput('');
    setEnviando(true);

    try {
      const payload = {
        conversa_id: conversaAtivaId,
        mensagem: texto,
        assincrono: true,
      };
      if (midiaFinal) {
        payload.midia = {
          tipo: midiaFinal.tipo,
          dados_base64: midiaFinal.dados_base64,
          mime_type: midiaFinal.mime_type
        };
        payload.tipo_midia = midiaFinal.tipo;
      }

      const res = await api.post('/assistente/mensagens', payload);

      if (res.data?.sucesso) {
        setAnexoMidia(null);
        const { conversa_id: novoConversaId, mensagem: msgAssistente } = res.data.dados;

        if (!conversaAtivaId) {
          setConversaAtivaId(novoConversaId);
          carregarConversas(true);
        }

        if (msgAssistente?.status === 'processando') {
          setMensagens((prev) => [...prev, msgAssistente]);
          iniciarPolling(msgAssistente.id, novoConversaId || conversaAtivaId);
        } else {
          // Caso a resposta tenha retornado síncrona
          setMensagens((prev) => [...prev, msgAssistente]);
          setEnviando(false);
        }
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      const mensagemErro =
        err.response?.data?.mensagem ||
        'Assistente IA temporariamente indisponível. Tente novamente em instantes.';
      setErro(mensagemErro);
      setEnviando(false);
    }
  }, [mensagemInput, anexoMidia, enviando, conversaAtivaId, carregarConversas, iniciarPolling]);

  const limparAnexoMidia = useCallback(() => {
    setAnexoMidia(null);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        _isProvider: true,
        conversas,
        conversaAtivaId,
        mensagens,
        mensagemInput,
        anexoMidia,
        carregandoConversas,
        carregandoMensagens,
        enviando,
        processandoMensagemId,
        erro,
        fontesAbertas,
        notificacao,
        setMensagemInput,
        setAnexoMidia,
        limparAnexoMidia,
        setErro,
        carregarConversas,
        selecionarConversa,
        iniciarNovaConversa,
        excluirConversa,
        alternarFonte,
        enviarMensagemTexto,
        limparNotificacao,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export { ChatContext };

export function useChat() {
  const context = useContext(ChatContext);
  if (!context || !context._isProvider) {
    throw new Error('useChat deve ser usado dentro de um ChatProvider');
  }
  return context;
}

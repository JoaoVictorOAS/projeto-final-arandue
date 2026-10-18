import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Bot, X, ArrowRight, BellRing } from 'lucide-react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useChat } from '../context/ChatContext';
import api from '../services/api';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertaAtendimentoPendente, setAlertaAtendimentoPendente] = useState(null);
  const { notificacao, limparNotificacao, selecionarConversa } = useChat();
  const navigate = useNavigate();
  const location = useLocation();

  const verificarAtendimentosPendentes = useCallback(async () => {
    const isTest =
      (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') ||
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');
    if (isTest) return;

    let token = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        token = window.localStorage.getItem('token');
      }
    } catch {}
    if (!token) return;

    try {
      const { data } = await api.get('/atendente/pendencias?status=PENDENTE');
      if (data?.sucesso && data.dados?.notificacao_ativa) {
        const novaNotif = data.dados.notificacao_ativa;
        setAlertaAtendimentoPendente(novaNotif);

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Atendimento pendente', {
              body: novaNotif.mensagem,
            });
          } catch {}
        }
      } else {
        setAlertaAtendimentoPendente(null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    verificarAtendimentosPendentes();
    if (typeof window !== 'undefined') {
      window.addEventListener('atendimento-pendente-atualizado', verificarAtendimentosPendentes);
      return () => {
        window.removeEventListener('atendimento-pendente-atualizado', verificarAtendimentosPendentes);
      };
    }
  }, [verificarAtendimentosPendentes]);

  const handleIrParaChat = () => {
    if (notificacao?.conversaId) {
      selecionarConversa(notificacao.conversaId);
    }
    limparNotificacao();
    navigate('/assistente');
  };

  const handleIrParaAtendente = () => {
    setAlertaAtendimentoPendente(null);
    navigate('/atendente');
  };

  return (
    <div
      className="min-h-screen theme-app-wrapper sketch-paper-bg flex relative transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
    >
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleSidebar={() => setSidebarOpen(true)} />
        <main
          className={`flex-1 overflow-y-auto ${
            location.pathname === '/assistente' ? 'p-0 md:p-6 lg:p-8' : 'p-4 sm:p-6 lg:p-8'
          }`}
        >
          <Outlet />
        </main>
      </div>

      {/* Notificação Mobile/Web de Transbordo Humano ("Atendimento pendente") */}
      {alertaAtendimentoPendente && location.pathname !== '/atendente' && (
        <div className="fixed bottom-20 right-6 z-50 bg-amber-950 text-white p-4 rounded-xl shadow-2xl border border-amber-500 flex items-center gap-3 max-w-sm">
          <div className="p-2 bg-amber-500 text-slate-950 rounded-lg flex-shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-300">{alertaAtendimentoPendente.titulo || 'Atendimento pendente'}</p>
            <p className="text-xs font-medium text-white truncate">{alertaAtendimentoPendente.mensagem}</p>
          </div>
          <button
            type="button"
            onClick={handleIrParaAtendente}
            className="flex items-center gap-1 bg-amber-400 text-slate-950 text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-amber-300 transition-colors flex-shrink-0"
          >
            <span>Assumir</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setAlertaAtendimentoPendente(null)}
            className="text-amber-300 hover:text-white p-1 rounded transition-colors flex-shrink-0"
            aria-label="Fechar alerta de atendimento pendente"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Notificação Flutuante de Resposta do Assistente IA */}
      {notificacao && location.pathname !== '/assistente' && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-900 text-white p-4 rounded-xl shadow-2xl border border-indigo-700 flex items-center gap-3 max-w-sm animate-bounce-subtle">
          <div className="p-2 bg-indigo-800 rounded-lg text-indigo-300 flex-shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-indigo-200">Assistente IA MEI</p>
            <p className="text-xs font-medium text-white truncate">{notificacao.mensagem}</p>
          </div>
          <button
            type="button"
            onClick={handleIrParaChat}
            className="flex items-center gap-1 bg-white text-indigo-900 text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors flex-shrink-0"
          >
            <span>Ver</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={limparNotificacao}
            className="text-indigo-400 hover:text-white p-1 rounded transition-colors flex-shrink-0"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

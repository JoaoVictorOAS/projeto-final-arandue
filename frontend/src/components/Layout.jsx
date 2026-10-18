import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Bot, X, ArrowRight } from 'lucide-react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useChat } from '../context/ChatContext';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { notificacao, limparNotificacao, selecionarConversa } = useChat();
  const navigate = useNavigate();
  const location = useLocation();

  const handleIrParaChat = () => {
    if (notificacao?.conversaId) {
      selecionarConversa(notificacao.conversaId);
    }
    limparNotificacao();
    navigate('/assistente');
  };

  return (
    <div
      className="min-h-screen theme-app-wrapper flex relative transition-colors duration-200"
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

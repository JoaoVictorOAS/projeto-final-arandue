import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  FileText,
  CreditCard,
  Wallet,
  Package,
  Receipt,
  X,
  MessageCircle,
  Bot,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import Logo from './Logo';
import { SidebarCatDoodle } from './SketchDoodles';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/servicos', label: 'Serviços', icon: Briefcase },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/orcamentos', label: 'Orçamentos', icon: FileText },
  { to: '/cobrancas', label: 'Cobranças', icon: CreditCard },
  { to: '/caixa', label: 'Livro Caixa', icon: Wallet },
  { to: '/estoque', label: 'Estoque & Produção', icon: Package },
  { to: '/fiscal', label: 'Notas Fiscais', icon: Receipt },
  { to: '/assistente', label: 'Assistente IA', icon: MessageCircle },
  { to: '/atendente', label: 'Atendente Cliente', icon: Bot },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const { enviando, notificacao } = useChat();

  const getNavLinkClasses = (isMobile) => ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all sidebar-nav-item ${
      isActive
        ? 'font-semibold shadow-sm border sidebar-nav-item-active'
        : isMobile
        ? 'hover:opacity-90'
        : 'sidebar-nav-item-web'
    }`;

  const renderSidebarContent = (isMobile = false) => (
    <div
      className={`flex flex-col h-full border-r transition-colors duration-200 ${
        isMobile ? 'sidebar-mobile' : 'sidebar-web'
      }`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-main)',
      }}
    >
      {/* Brand Header */}
      <div
        className="h-16 flex items-center justify-between px-6 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <Logo
            size="md"
            subtitle={<span style={{ color: 'var(--color-primary)' }}>Gestão MEI</span>}
          />
        </div>

        {setIsOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1.5 rounded-lg opacity-70 hover:opacity-100"
            style={{ color: 'var(--text-main)' }}
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setIsOpen && setIsOpen(false)}
              className={getNavLinkClasses(isMobile)}
              style={({ isActive }) =>
                isActive
                  ? {
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primary-text)',
                      borderColor: 'var(--color-primary)',
                      boxShadow: '2px 2px 0px var(--border-color)',
                    }
                  : {
                      color: 'var(--text-main)',
                      borderColor: 'transparent',
                    }
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0 sidebar-nav-icon" />
              <span className="flex-1">{item.label}</span>
              {item.to === '/assistente' && enviando && (
                <span className="flex h-2 w-2 relative" title="Assistente processando resposta">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                </span>
              )}
              {item.to === '/assistente' && notificacao && !enviando && (
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  1
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>


      {/* Elemento Decorativo: Gatinho encostado na borda direita */}
      <div
        className="relative pt-1 px-2 pb-0 flex items-end justify-end select-none overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div
          className="flex items-end justify-end -mr-1 -mb-0.5 transform hover:-translate-y-1 transition-transform duration-200 cursor-default"
          data-testid="sidebar-mascot-cat"
          title="Miau! 🐾"
          aria-hidden="true"
        >
          <SidebarCatDoodle className="w-28 h-20" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0 sticky top-0 h-screen">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 shadow-xl transform transition-transform duration-200 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        {renderSidebarContent(true)}
      </aside>
    </>
  );
}

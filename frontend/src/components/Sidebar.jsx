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
  LogOut,
  X,
  Building2,
  MessageCircle,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import Logo from './Logo';

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
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const { logout, usuario } = useAuth();
  const { enviando, notificacao } = useChat();

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'font-semibold shadow-sm'
        : 'hover:opacity-90'
    }`;

  const sidebarContent = (
    <div
      className="flex flex-col h-full border-r transition-colors duration-200"
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
        <Logo size="md" subtitle="Gestão MEI" />

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
              className={navLinkClasses}
              style={({ isActive }) =>
                isActive
                  ? {
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primary-text)',
                    }
                  : {
                      color: 'var(--text-main)',
                    }
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
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

      {/* Footer Profile & Logout */}
      <div
        className="p-4 border-t transition-colors duration-200"
        style={{
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--bg-surface-hover, var(--bg-surface))',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-main)' }}>
              {usuario?.nome || 'Empreendedor'}
            </p>
            <p
              className="text-[11px] truncate opacity-75"
              style={{ color: 'var(--text-secondary, var(--text-main))' }}
            >
              {usuario?.email || ''}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-2 opacity-70 hover:opacity-100 hover:text-red-600 rounded-lg transition-colors flex-shrink-0"
            style={{ color: 'var(--text-main)' }}
            title="Sair"
            aria-label="Sair da conta"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0 sticky top-0 h-screen">
        {sidebarContent}
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
        {sidebarContent}
      </aside>
    </>
  );
}

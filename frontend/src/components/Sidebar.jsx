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
  LogOut,
  X,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/servicos', label: 'Serviços', icon: Briefcase },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/orcamentos', label: 'Orçamentos', icon: FileText },
  { to: '/cobrancas', label: 'Cobranças', icon: CreditCard },
  { to: '/caixa', label: 'Livro Caixa', icon: Wallet },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const { logout, usuario } = useAuth();

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-base font-bold text-gray-900 block leading-tight">Painel MEI</span>
            <span className="text-xs text-indigo-600 font-medium">Gestão Simplificada</span>
          </div>
        </div>

        {setIsOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100"
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
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold text-gray-800 truncate">
              {usuario?.nome || 'Empreendedor'}
            </p>
            <p className="text-[11px] text-gray-500 truncate">
              {usuario?.email || ''}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
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
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-200 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

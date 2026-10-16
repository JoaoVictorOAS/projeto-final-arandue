import React from 'react';
import { Menu, LogOut, User, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onToggleSidebar }) {
  const { usuario, logout } = useAuth();

  const getInitials = (nome) => {
    if (!nome) return 'MEI';
    const parts = nome.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header
      className="border-b sticky top-0 z-20 transition-colors duration-200"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-main)',
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg opacity-80 hover:opacity-100 focus:outline-none focus:ring-2"
            style={{ color: 'var(--text-main)' }}
            aria-label="Abrir menu de navegação"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: 'var(--text-main)' }}>
              MEI{' '}
              <span
                className="font-medium text-sm hidden sm:inline"
                style={{ color: 'var(--color-primary)' }}
              >
                — Gestão Simplificada
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-3 pl-2 border-l"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div
              className="w-9 h-9 rounded-full font-semibold flex items-center justify-center text-sm shadow-inner"
              style={{
                backgroundColor: 'var(--bg-surface-hover, #e0e7ff)',
                color: 'var(--color-primary)',
              }}
            >
              {getInitials(usuario?.nome)}
            </div>

            <div className="hidden sm:block text-left">
              <p
                className="text-sm font-semibold leading-none"
                style={{ color: 'var(--text-main)' }}
              >
                {usuario?.nome || 'Empreendedor MEI'}
              </p>
              <p
                className="text-xs mt-1 leading-none opacity-75"
                style={{ color: 'var(--text-secondary, var(--text-main))' }}
              >
                {usuario?.email || ''}
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-2 opacity-70 hover:opacity-100 hover:text-red-600 rounded-lg transition-colors ml-1"
              style={{ color: 'var(--text-main)' }}
              title="Sair do sistema"
              aria-label="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

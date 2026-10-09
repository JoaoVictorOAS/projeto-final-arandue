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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              MEI <span className="text-indigo-600 font-medium text-sm hidden sm:inline">— Gestão Simplificada</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">

          <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-sm shadow-inner">
              {getInitials(usuario?.nome)}
            </div>

            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-800 leading-none">
                {usuario?.nome || 'Empreendedor MEI'}
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-none">
                {usuario?.email || ''}
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
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

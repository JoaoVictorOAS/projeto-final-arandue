import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider } from './context/ChatContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Servicos from './pages/Servicos';
import Agenda from './pages/Agenda';
import Orcamentos from './pages/Orcamentos';
import Cobrancas from './pages/Cobrancas';
import Caixa from './pages/Caixa';
import Estoque from './pages/Estoque';
import NotasFiscais from './pages/NotasFiscais';
import Assistente from './pages/Assistente';
import AtendenteIA from './pages/AtendenteIA';
import Configuracoes from './pages/Configuracoes';
import { isMobileDevice } from './utils/device';

// Rota Raiz Inteligente: exibe LandingPage para visitantes não autenticados na Web e Dashboard dentro de Layout para autenticados.
// Em dispositivos móveis (app nativo ou mobile browser), direciona direto para /login.
export function RootEntryRoute() {
  const { estaAutenticado, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Carregando painel MEI...</span>
        </div>
      </div>
    );
  }

  if (!estaAutenticado) {
    if (isMobileDevice()) {
      return <Navigate to="/login" replace />;
    }
    return <LandingPage />;
  }

  return <Outlet />;
}

export function PublicLandingRoute() {
  if (isMobileDevice()) {
    return <Navigate to="/login" replace />;
  }
  return <LandingPage />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/landing" element={<PublicLandingRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/atendimento/:slug" element={<AtendenteIA publicMode />} />

      {/* Rota Raiz Inteligente ("/" exibe LandingPage para não logados ou Dashboard dentro do Layout para logados) */}
      <Route element={<RootEntryRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
        </Route>
      </Route>

      {/* Rotas Protegidas com Layout Base (Navbar + Sidebar) */}
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route path="/painel" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/servicos" element={<Servicos />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/orcamentos" element={<Orcamentos />} />
          <Route path="/cobrancas" element={<Cobrancas />} />
          <Route path="/caixa" element={<Caixa />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/fiscal" element={<NotasFiscais />} />
          <Route path="/assistente" element={<Assistente />} />
          <Route path="/atendente" element={<AtendenteIA />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Route>

      {/* Redirecionamento padrão para rota desconhecida */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ChatProvider>
            <AppRoutes />
          </ChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

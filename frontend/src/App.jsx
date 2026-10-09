import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

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
import Configuracoes from './pages/Configuracoes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rotas Protegidas com Layout Base (Navbar + Sidebar) */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/servicos" element={<Servicos />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/orcamentos" element={<Orcamentos />} />
              <Route path="/cobrancas" element={<Cobrancas />} />
              <Route path="/caixa" element={<Caixa />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/fiscal" element={<NotasFiscais />} />
              <Route path="/assistente" element={<Assistente />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
          </Route>

          {/* Redirecionamento padrão para rota desconhecida */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

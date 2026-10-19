import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { dispararAtualizacaoTema } from './ThemeContext';

const storage = {
  getItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      return null;
    }
    return null;
  },
  setItem: (key, val) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch {}
  },
  removeItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
  },
};

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    try {
      const storedToken = storage.getItem('token');
      const storedUser = storage.getItem('usuario');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUsuario(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Falha ao restaurar sessão:', err);
      storage.removeItem('token');
      storage.removeItem('usuario');
    } finally {
      setCarregando(false);
    }
  }, []);

  const login = async (email, senha) => {
    const response = await api.post('/auth/login', { email, senha });
    const dados = response.data?.dados;
    const tokenRecebido = dados?.token;
    const usuarioRecebido = dados?.usuario || {
      id: dados?.id,
      nome: dados?.nome,
      email: dados?.email,
    };

    if (tokenRecebido && usuarioRecebido) {
      storage.setItem('token', tokenRecebido);
      storage.setItem('usuario', JSON.stringify(usuarioRecebido));
      setToken(tokenRecebido);
      setUsuario(usuarioRecebido);
      dispararAtualizacaoTema();
    }

    return response.data;
  };

  const register = async (nome, email, senha) => {
    const response = await api.post('/auth/register', { nome, email, senha });
    const dados = response.data?.dados;
    const tokenRecebido = dados?.token;
    const usuarioRecebido = dados?.usuario || {
      id: dados?.id,
      nome: dados?.nome || nome,
      email: dados?.email || email,
    };

    if (tokenRecebido) {
      storage.setItem('token', tokenRecebido);
      storage.setItem('usuario', JSON.stringify(usuarioRecebido));
      setToken(tokenRecebido);
      setUsuario(usuarioRecebido);
      dispararAtualizacaoTema();
    }

    return response.data;
  };

  const loginComGoogle = async (googleUser) => {
    const payload = {
      email: googleUser.email,
      nome: googleUser.displayName || googleUser.nome || googleUser.email.split('@')[0],
      foto: googleUser.photoURL || googleUser.photoUrl || googleUser.foto || null,
      googleId: googleUser.uid || null,
    };

    const response = await api.post('/auth/google', payload);
    const dados = response.data?.dados;
    const tokenRecebido = dados?.token;
    const usuarioRecebido = dados?.usuario || {
      id: dados?.id,
      nome: dados?.nome || payload.nome,
      email: dados?.email || payload.email,
    };

    if (tokenRecebido && usuarioRecebido) {
      storage.setItem('token', tokenRecebido);
      storage.setItem('usuario', JSON.stringify(usuarioRecebido));
      setToken(tokenRecebido);
      setUsuario(usuarioRecebido);
      dispararAtualizacaoTema();
    }

    return response.data;
  };

  const logout = () => {
    storage.removeItem('token');
    storage.removeItem('usuario');
    storage.removeItem('arandue_tema_ativo');
    setToken(null);
    setUsuario(null);
    dispararAtualizacaoTema();
  };

  const estaAutenticado = Boolean(token && usuario);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        estaAutenticado,
        carregando,
        login,
        loginComGoogle,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}

export default AuthContext;

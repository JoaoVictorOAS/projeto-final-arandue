import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const TEMA_PADRAO_FALLBACK = {
  id: 'padrao-claro',
  nome: 'Claro Aranduê',
  modo: 'light',
  tokens: {
    bgApp: '#f8fafc',
    bgSurface: '#ffffff',
    bgSurfaceHover: '#f1f5f9',
    border: '#e2e8f0',
    textMain: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    primaryText: '#ffffff',
    accent: '#f59e0b',
    status: { success: '#10b981', danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6' },
  },
};

const ThemeContext = createContext({});

export function applyThemeToDOM(tema) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const tokens = tema?.tokens || tema?.cores || TEMA_PADRAO_FALLBACK.tokens;
  const modo = tema?.modo || 'light';

  // Injeção de CSS Custom Properties
  root.style.setProperty('--bg-app', tokens.bgApp || '#f8fafc');
  root.style.setProperty('--bg-surface', tokens.bgSurface || '#ffffff');
  root.style.setProperty('--bg-surface-hover', tokens.bgSurfaceHover || '#f1f5f9');
  root.style.setProperty('--border-color', tokens.border || '#e2e8f0');
  root.style.setProperty('--text-main', tokens.textMain || '#0f172a');
  root.style.setProperty('--text-secondary', tokens.textSecondary || '#64748b');
  root.style.setProperty('--text-muted', tokens.textMuted || '#94a3b8');
  root.style.setProperty('--color-primary', tokens.primary || '#4f46e5');
  root.style.setProperty('--color-primary-hover', tokens.primaryHover || '#4338ca');
  root.style.setProperty('--color-primary-text', tokens.primaryText || '#ffffff');
  root.style.setProperty('--color-accent', tokens.accent || '#f59e0b');

  if (tokens.status) {
    root.style.setProperty('--status-success', tokens.status.success || '#10b981');
    root.style.setProperty('--status-danger', tokens.status.danger || '#ef4444');
    root.style.setProperty('--status-warning', tokens.status.warning || '#f59e0b');
    root.style.setProperty('--status-info', tokens.status.info || '#3b82f6');
  }

  // Alterna classe 'dark' e atributos de tema no <html> para compatibilidade total
  root.setAttribute('data-theme-mode', modo);
  root.setAttribute('data-theme-id', String(tema?.id || tema?.slug || 'padrao'));
  if (modo === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }) {
  const [temaAtual, setTemaAtual] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = localStorage.getItem('arandue_tema_ativo');
        if (cached) {
          const parsed = JSON.parse(cached);
          applyThemeToDOM(parsed);
          return parsed;
        }
      }
    } catch {}
    applyThemeToDOM(TEMA_PADRAO_FALLBACK);
    return TEMA_PADRAO_FALLBACK;
  });

  const [temas, setTemas] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const carregarTemas = useCallback(async () => {
    try {
      setCarregando(true);
      const res = await api.get('/configuracoes/temas');
      const dados = res.data?.dados;
      if (Array.isArray(dados)) {
        setTemas(dados);
        const ativo = dados.find((t) => t.eh_ativo) || dados[0];
        if (ativo) {
          setTemaAtual(ativo);
          applyThemeToDOM(ativo);
          try {
            localStorage.setItem('arandue_tema_ativo', JSON.stringify(ativo));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('[ThemeContext] Usando fallback local para temas:', err.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarTemas();
  }, [carregarTemas]);

  const ativarTema = async (idOuSlug) => {
    try {
      const res = await api.put(`/configuracoes/temas/${idOuSlug}/ativar`);
      const ativado = res.data?.dados;
      if (ativado) {
        setTemaAtual(ativado);
        applyThemeToDOM(ativado);
        try {
          localStorage.setItem('arandue_tema_ativo', JSON.stringify(ativado));
        } catch {}
        await carregarTemas();
        return { sucesso: true, tema: ativado };
      }
    } catch (err) {
      console.error('[ThemeContext] Erro ao ativar tema:', err);
      return { sucesso: false, erro: err.response?.data?.mensagem || 'Falha ao ativar tema.' };
    }
  };

  const uploadTema = async (fileOuObjeto) => {
    try {
      let res;
      if (fileOuObjeto instanceof File) {
        const formData = new FormData();
        formData.append('tema', fileOuObjeto);
        res = await api.post('/configuracoes/temas/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/configuracoes/temas/upload', fileOuObjeto);
      }
      await carregarTemas();
      return { sucesso: true, dados: res.data?.dados };
    } catch (err) {
      return {
        sucesso: false,
        erro: err.response?.data?.mensagem || 'Falha ao importar tema via arquivo JSON.',
      };
    }
  };

  const gerarTemaIA = async (descricao, modo = 'dark', corBase = null) => {
    try {
      const res = await api.post('/configuracoes/temas/gerar-ia', {
        descricao,
        modo,
        cor_base: corBase,
      });
      await carregarTemas();
      return { sucesso: true, dados: res.data?.dados };
    } catch (err) {
      return {
        sucesso: false,
        erro: err.response?.data?.mensagem || 'Falha ao gerar tema com IA.',
      };
    }
  };

  const excluirTema = async (id) => {
    try {
      await api.delete(`/configuracoes/temas/${id}`);
      await carregarTemas();
      return { sucesso: true };
    } catch (err) {
      return {
        sucesso: false,
        erro: err.response?.data?.mensagem || 'Erro ao excluir tema.',
      };
    }
  };

  const exportarTema = (tema) => {
    const dados = tema || temaAtual;
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tema-${dados.slug || 'arandue'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ThemeContext.Provider
      value={{
        temaAtual,
        temas,
        carregando,
        ativarTema,
        uploadTema,
        gerarTemaIA,
        excluirTema,
        exportarTema,
        carregarTemas,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

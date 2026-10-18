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

export function dispararAtualizacaoTema() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('arandue:tema-atualizado'));
  }
}

export function calcularLuminanciaHex(hex) {
  if (typeof hex !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(hex.trim())) return 0.5;
  const num = parseInt(hex.trim().slice(1), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const toLinear = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function calcularContrasteHex(hex1, hex2) {
  const l1 = calcularLuminanciaHex(hex1);
  const l2 = calcularLuminanciaHex(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function garantirContrasteTexto(corDesejada, corFundo, limiarMinimo = 4.5) {
  if (
    typeof corDesejada === 'string' &&
    /^#[0-9A-Fa-f]{6}$/.test(corDesejada.trim()) &&
    typeof corFundo === 'string' &&
    /^#[0-9A-Fa-f]{6}$/.test(corFundo.trim())
  ) {
    const ratio = calcularContrasteHex(corDesejada, corFundo);
    if (ratio >= limiarMinimo) return corDesejada.trim();
  }
  const ratioClaro = calcularContrasteHex('#f8fafc', corFundo || '#1e293b');
  const ratioEscuro = calcularContrasteHex('#0f172a', corFundo || '#ffffff');
  return ratioClaro >= ratioEscuro ? '#f8fafc' : '#0f172a';
}

export function applyThemeToDOM(tema) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const tokens = tema?.tokens || tema?.cores || TEMA_PADRAO_FALLBACK.tokens;
  const modo = tema?.modo || 'light';

  const bgApp = tokens.bgApp || '#f8fafc';
  const bgSurface = tokens.bgSurface || '#ffffff';
  const bgSurfaceHover = tokens.bgSurfaceHover || (modo === 'dark' ? '#334155' : '#f1f5f9');
  const border = tokens.border || (modo === 'dark' ? '#334155' : '#e2e8f0');
  const textMain = tokens.textMain || (modo === 'dark' ? '#f8fafc' : '#0f172a');
  const textSecondary = tokens.textSecondary || (modo === 'dark' ? '#94a3b8' : '#64748b');
  const textMuted = tokens.textMuted || (modo === 'dark' ? '#64748b' : '#94a3b8');
  const primary = tokens.primary || '#4f46e5';
  const primaryHover = tokens.primaryHover || '#4338ca';
  const primaryText = garantirContrasteTexto(tokens.primaryText || '#ffffff', primary, 4.5);
  const accent = tokens.accent || '#f59e0b';

  // Injeção de CSS Custom Properties base
  root.style.setProperty('--bg-app', bgApp);
  root.style.setProperty('--bg-surface', bgSurface);
  root.style.setProperty('--bg-surface-hover', bgSurfaceHover);
  root.style.setProperty('--border-color', border);
  root.style.setProperty('--text-main', textMain);
  root.style.setProperty('--text-secondary', textSecondary);
  root.style.setProperty('--text-muted', textMuted);
  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--color-primary-hover', primaryHover);
  root.style.setProperty('--color-primary-text', primaryText);
  root.style.setProperty('--color-accent', accent);

  // Novas Regras de Tema e Contraste para Botões, Ações Rápidas ("Botões Novos") e Painel de Insights
  const btnPrimaryBg = tokens.buttonPrimaryBg || primary;
  const btnPrimaryHover = tokens.buttonPrimaryHover || primaryHover;
  const btnPrimaryText = garantirContrasteTexto(tokens.buttonPrimaryText || primaryText, btnPrimaryBg, 4.5);

  const btnSecondaryBg = tokens.buttonSecondaryBg || bgSurfaceHover;
  const btnSecondaryBorder = tokens.buttonSecondaryBorder || border;
  const btnSecondaryText = garantirContrasteTexto(tokens.buttonSecondaryText || textMain, btnSecondaryBg, 4.5);

  const actionCardBg = tokens.actionCardBg || bgSurfaceHover;
  const actionCardHover = tokens.actionCardHover || border;
  const actionCardBorder = tokens.actionCardBorder || border;
  const actionCardText = garantirContrasteTexto(tokens.actionCardText || textMain, actionCardBg, 4.5);
  const actionCardSubtext = garantirContrasteTexto(tokens.actionCardSubtext || textSecondary, actionCardBg, 3.0);
  const actionIconBg = tokens.actionIconBg || bgSurface;
  const actionIconText = garantirContrasteTexto(tokens.actionIconText || primary, actionIconBg, 3.0);

  const insightsBg = tokens.insightsBg || bgSurface;
  const insightsCardBg = tokens.insightsCardBg || bgSurfaceHover;
  const insightsBorder = tokens.insightsBorder || border;
  const insightsText = garantirContrasteTexto(tokens.insightsText || textMain, insightsBg, 4.5);
  const insightsTextSecondary = garantirContrasteTexto(tokens.insightsTextSecondary || textSecondary, insightsBg, 3.0);
  const insightsCardText = garantirContrasteTexto(tokens.insightsCardText || textMain, insightsCardBg, 4.5);
  const insightsCardSubtext = garantirContrasteTexto(tokens.insightsCardSubtext || textSecondary, insightsCardBg, 3.0);

  root.style.setProperty('--btn-primary-bg', btnPrimaryBg);
  root.style.setProperty('--btn-primary-hover', btnPrimaryHover);
  root.style.setProperty('--btn-primary-text', btnPrimaryText);
  root.style.setProperty('--btn-secondary-bg', btnSecondaryBg);
  root.style.setProperty('--btn-secondary-border', btnSecondaryBorder);
  root.style.setProperty('--btn-secondary-text', btnSecondaryText);

  root.style.setProperty('--action-card-bg', actionCardBg);
  root.style.setProperty('--action-card-hover', actionCardHover);
  root.style.setProperty('--action-card-border', actionCardBorder);
  root.style.setProperty('--action-card-text', actionCardText);
  root.style.setProperty('--action-card-subtext', actionCardSubtext);
  root.style.setProperty('--action-icon-bg', actionIconBg);
  root.style.setProperty('--action-icon-text', actionIconText);

  root.style.setProperty('--insights-bg', insightsBg);
  root.style.setProperty('--insights-card-bg', insightsCardBg);
  root.style.setProperty('--insights-border', insightsBorder);
  root.style.setProperty('--insights-text', insightsText);
  root.style.setProperty('--insights-text-secondary', insightsTextSecondary);
  root.style.setProperty('--insights-card-text', insightsCardText);
  root.style.setProperty('--insights-card-subtext', insightsCardSubtext);

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
    let token = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        token = window.localStorage.getItem('token');
      }
    } catch {}

    const isTest =
      (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') ||
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');

    if (!token && !isTest) {
      setCarregando(false);
      return;
    }

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

  useEffect(() => {
    const handleAtualizacaoTema = () => {
      carregarTemas();
    };

    const handleStorage = (e) => {
      if (e.key === 'arandue_tema_ativo' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setTemaAtual(parsed);
          applyThemeToDOM(parsed);
        } catch {}
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        let hasToken = false;
        try {
          hasToken = Boolean(window.localStorage?.getItem('token'));
        } catch {}
        const isTest =
          (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') ||
          (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');
        if (hasToken && !isTest) {
          carregarTemas();
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('arandue:tema-atualizado', handleAtualizacaoTema);
      window.addEventListener('storage', handleStorage);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }
      return () => {
        window.removeEventListener('arandue:tema-atualizado', handleAtualizacaoTema);
        window.removeEventListener('storage', handleStorage);
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
      };
    }
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

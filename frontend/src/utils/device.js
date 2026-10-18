import { Capacitor } from '@capacitor/core';

/**
 * Utilitário centralizado para detecção de ambiente Mobile (dispositivo móvel, tela pequena ou app nativo Capacitor)
 * vs Web (desktop).
 * 
 * @returns {boolean} Retorna true se estiver em app nativo Capacitor ou se a largura da janela for menor que 768px.
 */
export const isMobileEnvironment = () => {
  if (typeof window === 'undefined') return false;
  const isCapacitorNative =
    typeof Capacitor !== 'undefined' &&
    typeof Capacitor.isNativePlatform === 'function' &&
    Capacitor.isNativePlatform();
  return Boolean(isCapacitorNative || window.innerWidth < 768);
};

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Info, X } from 'lucide-react';

/**
 * AdaptiveParagraph
 * Regra do Sistema: se qualquer texto de parágrafo (<p class="text-sm ...">) quebrar para 3 ou mais linhas
 * devido ao tamanho do dispositivo/resolução, transforma-se automaticamente em um Popover compacto
 * para preservar a integridade visual da interface em telas menores.
 */
export default function AdaptiveParagraph({
  children,
  className = 'text-sm text-gray-500 mt-1',
  maxLines = 2,
  title = 'Informações',
  popoverTriggerText = 'Ver mais',
  ...props
}) {
  const [isBrokenToThreeLines, setIsBrokenToThreeLines] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const containerRef = useRef(null);
  const measurerRef = useRef(null);

  const checkLineCount = useCallback(() => {
    const el = measurerRef.current;
    if (!el) return;

    const style = window.getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize) || 14;
    let lineHeight = parseFloat(style.lineHeight);

    if (isNaN(lineHeight) || lineHeight <= 0) {
      lineHeight = fontSize * 1.4;
    }

    const scrollHeight = el.scrollHeight;
    if (scrollHeight > 0 && lineHeight > 0) {
      const calculatedLines = Math.round(scrollHeight / lineHeight);
      setIsBrokenToThreeLines(calculatedLines > maxLines);
    }
  }, [maxLines]);

  useEffect(() => {
    checkLineCount();

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        checkLineCount();
      });
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', checkLineCount);
    return () => {
      window.removeEventListener('resize', checkLineCount);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [checkLineCount, children]);

  useEffect(() => {
    if (!popoverOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setPopoverOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setPopoverOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [popoverOpen]);

  if (!isBrokenToThreeLines) {
    return (
      <div ref={containerRef} className="max-w-full">
        <p ref={measurerRef} className={className} {...props}>
          {children}
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block max-w-full">
      {/* Elemento oculto para medição dinâmica de quebra de linha quando em modo popover */}
      <p
        ref={measurerRef}
        className={className}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
          zIndex: -1,
        }}
        aria-hidden="true"
      >
        {children}
      </p>

      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          onClick={() => setPopoverOpen((prev) => !prev)}
          aria-expanded={popoverOpen}
          aria-haspopup="dialog"
          className="badge-theme-subtle hover:brightness-95 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition shadow-xs group cursor-pointer max-w-full"
          title="Clique para ver a descrição completa"
        >
          <Info className="w-3.5 h-3.5 text-theme-primary shrink-0 group-hover:scale-110 transition-transform" />
          <span className="truncate max-w-[200px] sm:max-w-xs">{children}</span>
          <span className="text-[10px] uppercase font-bold text-theme-primary shrink-0 ml-1">
            {popoverTriggerText}
          </span>
        </button>

        {popoverOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/10 sm:bg-transparent"
              onClick={() => setPopoverOpen(false)}
              aria-hidden="true"
            />

            <div
              role="dialog"
              aria-modal="true"
              className="absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 p-3.5 bg-white rounded-xl shadow-xl border border-gray-200 text-xs text-gray-700 animate-in fade-in zoom-in-95"
              style={{
                backgroundColor: 'var(--bg-surface, #ffffff)',
                borderColor: 'var(--border-color, #e5e7eb)',
                color: 'var(--text-main, #1f2937)',
              }}
            >
              <div
                className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b"
                style={{ borderColor: 'var(--border-color, #f3f4f6)' }}
              >
                <span className="font-bold flex items-center gap-1.5 text-gray-900" style={{ color: 'var(--text-main)' }}>
                  <Info className="w-3.5 h-3.5 text-theme-primary shrink-0" />
                  {title}
                </span>
                <button
                  type="button"
                  onClick={() => setPopoverOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                  aria-label="Fechar informações"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="leading-relaxed" style={{ color: 'var(--text-secondary, #4b5563)' }}>
                {children}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import React from 'react';

/**
 * Componente de Logotipo Vetorial do Aranduê
 * Representa a identidade visual da plataforma:
 * Letra 'A' estilizada em gradiente Índigo para Esmeralda,
 * simbolizando sabedoria (Arandu), crescimento financeiro e prosperidade para o MEI.
 */
export default function Logo({
  size = 'md',
  showText = true,
  subtitle = 'Gestão para MEI',
  className = '',
}) {
  const sizeMap = {
    sm: { icon: 'w-8 h-8', text: 'text-base', sub: 'text-[11px]' },
    md: { icon: 'w-10 h-10', text: 'text-xl', sub: 'text-xs' },
    lg: { icon: 'w-14 h-14', text: 'text-2xl', sub: 'text-sm' },
    xl: { icon: 'w-20 h-20', text: 'text-4xl', sub: 'text-base' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Ícone Vetorial Estilo Desenhado à Mão (Hand-Drawn Inked Box) */}
      <div
        className={`${currentSize.icon} relative flex-shrink-0 rounded-xl bg-indigo-600 text-white border-2 border-zinc-900 dark:border-white shadow-[2.5px_2.5px_0px_#18181b] dark:shadow-[2.5px_2.5px_0px_#ffffff] p-1.5 flex items-center justify-center transform -rotate-2 hover:rotate-0 transition-transform`}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Haste do 'A' estilo Nanquim artesanal com leve assimetria */}
          <path
            d="M 22 84 L 47 18 C 49 14, 53 14, 55 18 L 80 84"
            stroke="#ffffff"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Trave transversal do 'A' rabiscada à mão com seta ascendente */}
          <path
            d="M 24 62 Q 50 58 76 62"
            stroke="#fde047"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Olho cartoon expressivo (Aranduê / Sabedoria da Coruja no topo do A) */}
          <ellipse
            cx="51"
            cy="42"
            rx="11"
            ry="11"
            fill="#ffffff"
            stroke="#18181b"
            strokeWidth="3.5"
          />
          <circle cx="53" cy="42" r="4.5" fill="#18181b" />
          <circle cx="55" cy="40" r="1.5" fill="#ffffff" />

          {/* Penacho / sobrancelha rabiscada da coruja */}
          <path
            d="M 38 31 Q 50 25 64 31"
            stroke="#fde047"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Tipografia Hand-Crafted Display */}
      {showText && (
        <div className="flex flex-col leading-tight select-none">
          <span
            className={`${currentSize.text} font-display font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1`}
          >
            Aranduê
          </span>
          {subtitle && (
            <span
              className={`${currentSize.sub} font-hand font-bold text-amber-600 dark:text-amber-400 tracking-wide`}
            >
              {subtitle} ✎
            </span>
          )}
        </div>
      )}
    </div>
  );
}

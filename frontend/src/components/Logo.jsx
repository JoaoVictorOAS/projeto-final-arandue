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
    sm: { icon: 'w-8 h-8', text: 'text-base', sub: 'text-[10px]' },
    md: { icon: 'w-10 h-10', text: 'text-lg', sub: 'text-xs' },
    lg: { icon: 'w-14 h-14', text: 'text-2xl', sub: 'text-sm' },
    xl: { icon: 'w-20 h-20', text: 'text-3xl', sub: 'text-base' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Ícone Vetorial */}
      <div
        className={`${currentSize.icon} relative flex-shrink-0 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-2 shadow-md shadow-indigo-200/60 flex items-center justify-center`}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="arandueGrad" x1="15%" y1="90%" x2="85%" y2="10%">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
            <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Haste Esquerda do 'A' */}
          <path
            d="M 24 82 L 48 20 Q 50 15 52 20 L 76 82"
            stroke="url(#arandueGrad)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Seta de Crescimento Ascendente Cruzando a Trave do 'A' */}
          <path
            d="M 28 62 C 40 62, 46 54, 58 42 L 72 26"
            stroke="#10B981"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Ponta da Seta */}
          <polygon
            points="70,16 84,24 74,38"
            fill="#10B981"
          />

          {/* Folha Orgânica / Sabedoria (Arandu) */}
          <path
            d="M 50 48 Q 66 38 68 56 Q 66 70 48 64"
            fill="none"
            stroke="url(#glowGrad)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Tipografia */}
      {showText && (
        <div className="flex flex-col leading-tight select-none">
          <span
            className={`${currentSize.text} font-black tracking-tight bg-gradient-to-r from-gray-900 via-indigo-950 to-indigo-800 bg-clip-text text-transparent`}
          >
            Aranduê
          </span>
          {subtitle && (
            <span
              className={`${currentSize.sub} font-semibold text-indigo-600 uppercase tracking-wider`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

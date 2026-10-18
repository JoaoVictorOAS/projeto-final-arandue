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
      {/* Ícone Vetorial Estilo Desenhado à Mão — Gatinho Estilo PKLS (Hand-Drawn Cat) */}
      <div
        className={`${currentSize.icon} relative flex-shrink-0 rounded-2xl text-zinc-900 border-2 border-zinc-900 dark:border-white shadow-[3px_3px_0px_#18181b] dark:shadow-[3px_3px_0px_#ffffff] p-1 flex items-center justify-center transform -rotate-3 hover:rotate-0 transition-all duration-200`}
        style={{
          backgroundColor: 'var(--logo-bg, var(--color-primary, #4f46e5))',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Silhueta da Cabeça e Orelhas do Gatinho em traço grosso */}
          <path
            d="M 22 45 L 18 16 C 17 12, 23 11, 27 15 L 40 28 C 46 25, 54 25, 60 28 L 73 15 C 77 11, 83 12, 82 16 L 78 45 C 84 54, 84 68, 78 78 C 70 90, 30 90, 22 78 C 16 68, 16 54, 22 45 Z"
            fill="#ffffff"
            stroke="#18181b"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Orelhas internas */}
          <path
            d="M 24 24 L 28 34 M 76 24 L 72 34"
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Óculos Escuros Estilo PKLS (Cool Cat Sunglasses) */}
          <rect
            x="24"
            y="42"
            width="22"
            height="14"
            rx="4"
            fill="#18181b"
            stroke="#18181b"
            strokeWidth="2"
          />
          <rect
            x="54"
            y="42"
            width="22"
            height="14"
            rx="4"
            fill="#18181b"
            stroke="#18181b"
            strokeWidth="2"
          />
          {/* Ponte dos óculos */}
          <line
            x1="44"
            y1="48"
            x2="54"
            y2="48"
            stroke="#18181b"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Brilho reflexo branco na lente esquerda */}
          <line
            x1="27"
            y1="45"
            x2="33"
            y2="45"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Narizinho de Gato */}
          <path
            d="M 47 62 L 53 62 L 50 66 Z"
            fill="#18181b"
            stroke="#18181b"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Focinho / Boquinha de Gato */}
          <path
            d="M 44 69 Q 50 73 50 66 Q 50 73 56 69"
            stroke="#18181b"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Bigodes do Gatinho */}
          <path
            d="M 12 56 L 22 58 M 10 64 L 21 63 M 78 58 L 88 56 M 79 63 L 90 64"
            stroke="#18181b"
            strokeWidth="2.5"
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

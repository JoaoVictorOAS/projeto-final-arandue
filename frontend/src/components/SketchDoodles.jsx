import React from 'react';

/**
 * Par de olhos expressivos estilo cartoon / PKLS (line-art com traço espesso e brilho).
 */
export function CartoonEyes({ className = 'w-9 h-6', ...props }) {
  return (
    <svg
      viewBox="0 0 60 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none overflow-visible ${className}`}
      aria-label="Olhos de cartoon expressivos"
      role="img"
      {...props}
    >
      {/* Sobrancelhas rabiscadas */}
      <path
        d="M 6 10 Q 18 4 28 9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M 34 9 Q 44 4 54 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Olho Esquerdo */}
      <ellipse
        cx="18"
        cy="24"
        rx="12"
        ry="14"
        fill="#ffffff"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="21" cy="24" r="6.5" fill="#18181b" />
      <circle cx="23" cy="21" r="2.2" fill="#ffffff" />
      <circle cx="19" cy="26" r="1.1" fill="#ffffff" />

      {/* Olho Direito */}
      <ellipse
        cx="42"
        cy="24"
        rx="12"
        ry="14"
        fill="#ffffff"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="45" cy="24" r="6.5" fill="#18181b" />
      <circle cx="47" cy="21" r="2.2" fill="#ffffff" />
      <circle cx="43" cy="26" r="1.1" fill="#ffffff" />
    </svg>
  );
}

/**
 * Mascote Coruja Aranduê desenhada à mão em traço espesso.
 * Suporta variant="cool" (de óculos escuros) e variant="beach" (relaxando na cadeira de praia com coco).
 */
export function OwlMascotDoodle({ className = 'w-28 h-28', variant = 'cool', ...props }) {
  if (variant === 'beach') {
    return (
      <svg
        viewBox="0 0 160 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`inline-block select-none overflow-visible ${className}`}
        aria-label="Mascote Coruja Aranduê relaxando na praia"
        role="img"
        {...props}
      >
        {/* Cadeira de praia listrada (deck chair) */}
        <path
          d="M 22 110 L 110 35 L 125 45 L 35 120 Z"
          fill="#fef08a"
          stroke="#18181b"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M 45 92 L 65 74 M 75 66 L 95 48"
          stroke="#f97316"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Pernas da cadeira */}
        <path
          d="M 32 102 L 20 128 M 98 46 L 126 126 M 122 75 L 140 125"
          stroke="#18181b"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Corpo da Coruja deitada relaxada */}
        <ellipse
          cx="82"
          cy="70"
          rx="32"
          ry="25"
          transform="rotate(-20 82 70)"
          fill="#fef3c7"
          stroke="#18181b"
          strokeWidth="3.5"
        />
        {/* Orelhas / tufos de penas */}
        <path
          d="M 60 52 L 56 36 L 70 48"
          fill="#fde68a"
          stroke="#18181b"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M 78 45 L 88 32 L 92 46"
          fill="#fde68a"
          stroke="#18181b"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Óculos escuros na coruja */}
        <rect
          x="58"
          y="56"
          width="20"
          height="14"
          rx="5"
          transform="rotate(-18 68 63)"
          fill="#18181b"
          stroke="#18181b"
          strokeWidth="2"
        />
        <rect
          x="82"
          y="48"
          width="20"
          height="14"
          rx="5"
          transform="rotate(-18 92 55)"
          fill="#18181b"
          stroke="#18181b"
          strokeWidth="2"
        />
        {/* Ponte dos óculos e brilho nos vidros */}
        <path d="M 76 56 L 82 54" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
        <line x1="62" y1="58" x2="72" y2="62" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="86" y1="50" x2="96" y2="54" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />

        {/* Bico sorridente */}
        <path d="M 78 68 L 84 76 L 88 67 Z" fill="#f59e0b" stroke="#18181b" strokeWidth="2.5" />

        {/* Asa relaxada segurando água de coco */}
        <path
          d="M 95 68 Q 112 70 114 84"
          stroke="#18181b"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Coco verde com canudo e guarda-chuvinha */}
        <circle cx="120" cy="94" r="14" fill="#84cc16" stroke="#18181b" strokeWidth="3" />
        <path d="M 112 85 Q 120 80 128 85" stroke="#18181b" strokeWidth="2" fill="none" />
        {/* Canudo listrado */}
        <path d="M 120 85 L 126 62 L 134 60" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
        {/* Guarda-solzinho no coco */}
        <path d="M 110 84 L 102 70" stroke="#18181b" strokeWidth="2" />
        <path d="M 94 70 Q 102 60 110 70 Z" fill="#ec4899" stroke="#18181b" strokeWidth="2" />

        {/* Pata da coruja esticada de boa */}
        <path d="M 52 90 L 40 102 M 48 94 L 38 108" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />

        {/* Solzinho rabiscado no fundo */}
        <circle cx="140" cy="22" r="10" fill="#fef08a" stroke="#18181b" strokeWidth="2.5" />
        <path d="M 140 6 L 140 10 M 140 34 L 140 38 M 124 22 L 128 22 M 152 22 L 156 22" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // Variant "cool" (padrão) - Coruja de óculos escuros e asas na cintura
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none overflow-visible ${className}`}
      aria-label="Mascote Coruja Aranduê com óculos escuros"
      role="img"
      {...props}
    >
      {/* Tufos de penas / Orelhas pontudas */}
      <path
        d="M 32 36 L 24 16 L 44 26"
        fill="#fde68a"
        stroke="#18181b"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M 88 36 L 96 16 L 76 26"
        fill="#fde68a"
        stroke="#18181b"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Corpo oval da coruja */}
      <ellipse
        cx="60"
        cy="66"
        rx="36"
        ry="42"
        fill="#fef3c7"
        stroke="#18181b"
        strokeWidth="3.5"
      />

      {/* Barriguinha decorada com escamas/penas */}
      <path
        d="M 46 72 Q 52 78 58 72 M 62 72 Q 68 78 74 72 M 54 84 Q 60 90 66 84"
        stroke="#d97706"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Asas laterais estilo confiante */}
      <path
        d="M 25 56 Q 14 74 28 88"
        stroke="#18181b"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="#fde68a"
      />
      <path
        d="M 95 56 Q 106 74 92 88"
        stroke="#18181b"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="#fde68a"
      />

      {/* Óculos de sol Wayfarer clássicos */}
      <path
        d="M 28 42 Q 60 38 92 42 L 90 62 Q 78 68 64 60 Q 56 60 48 68 Q 32 66 28 42 Z"
        fill="#18181b"
        stroke="#18181b"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Brilhos diagonais brancos nas lentes */}
      <line x1="36" y1="48" x2="48" y2="58" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="72" y1="48" x2="84" y2="58" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />

      {/* Bico alaranjado sob os óculos */}
      <path
        d="M 54 62 L 60 74 L 66 62 Z"
        fill="#f59e0b"
        stroke="#18181b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Patas no chão */}
      <path d="M 48 106 L 44 114 M 52 106 L 52 115 M 56 106 L 60 114" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <path d="M 68 106 L 64 114 M 72 106 L 72 115 M 76 106 L 80 114" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Mascote Gatinho Aranduê (estilo PKLS com óculos escuros e traço grosso).
 * Mascote padrão do sistema desenhado à mão.
 */
export function CatMascotDoodle({ className = 'w-16 h-16', ...props }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none overflow-visible ${className}`}
      aria-label="Mascote Gatinho Aranduê"
      role="img"
      {...props}
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
  );
}

/**
 * Gato Empreendedor / Boss Cat contando dinheiro encostado na borda direita.
 * Ilustração rica desenhada à mão em estilo cartoon / PKLS para o rodapé da barra lateral.
 */
export function SidebarCatDoodle({ className = 'w-32 h-24', ...props }) {
  return (
    <svg
      viewBox="0 0 140 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none overflow-visible ${className}`}
      aria-label="Gatinho decorativo encostado na borda"
      role="img"
      {...props}
    >
      {/* Sombra no chão */}
      <ellipse cx="78" cy="95" rx="56" ry="4" fill="#18181b" opacity="0.15" />

      {/* Rabo do gato curvado com marra encostado na direita */}
      <path
        d="M 124 90 C 136 82, 138 62, 132 48 C 128 40, 118 42, 120 50 C 122 58, 128 66, 118 84"
        fill="#ffffff"
        stroke="#18181b"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Corpo do gato encostado na parede direita */}
      <path
        d="M 52 92 C 40 92, 38 74, 48 58 C 56 46, 76 44, 94 44 C 114 44, 128 58, 126 92 Z"
        fill="#ffffff"
        stroke="#18181b"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Braço direito encostado relaxado na borda */}
      <path
        d="M 108 58 C 124 64, 132 74, 130 92"
        stroke="#18181b"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Cordão de ouro no pescoço (estilo patrão / boss) */}
      <path
        d="M 58 56 Q 74 68 90 56"
        stroke="#eab308"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Medalhão de Cifrão $ no peito */}
      <circle cx="74" cy="65" r="4.5" fill="#facc15" stroke="#18181b" strokeWidth="1.8" />
      <path
        d="M 74 62.5 V 67.5 M 72.5 63.5 H 75.5 C 76 63.5, 76 64.5, 74 64.8 C 72 65.2, 72 66.5, 75.5 66.5"
        stroke="#18181b"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Cabeça do gato inclinada com atitude */}
      <ellipse
        cx="72"
        cy="38"
        rx="27"
        ry="22"
        fill="#ffffff"
        stroke="#18181b"
        strokeWidth="3.5"
      />

      {/* Orelha Esquerda */}
      <path
        d="M 50 24 L 38 6 C 34 2, 45 1, 52 8 L 62 18 Z"
        fill="#ffffff"
        stroke="#18181b"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M 46 14 L 43 9 C 42 7, 47 7, 50 10 L 53 16 Z" fill="#f59e0b" />

      {/* Orelha Direita encostando perto da borda */}
      <path
        d="M 82 18 L 94 6 C 99 2, 108 5, 105 12 L 94 24 Z"
        fill="#ffffff"
        stroke="#18181b"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M 88 15 L 95 8 C 97 6, 101 8, 99 12 L 93 18 Z" fill="#f59e0b" />

      {/* Óculos escuros Wayfarer de patrão */}
      <path
        d="M 48 30 L 68 30 L 66 43 C 66 45, 50 46, 48 43 Z"
        fill="#18181b"
        stroke="#18181b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M 76 30 L 96 30 L 96 43 C 94 46, 78 45, 76 43 Z"
        fill="#18181b"
        stroke="#18181b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <line x1="68" y1="33" x2="76" y2="33" stroke="#18181b" strokeWidth="4" strokeLinecap="round" />
      {/* Brilho reflexivo cortante branco nas lentes */}
      <line x1="52" y1="33" x2="62" y2="41" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="80" y1="33" x2="90" y2="41" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />

      {/* Focinho */}
      <path d="M 70 45 L 74 45 L 72 48 Z" fill="#18181b" stroke="#18181b" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Sorriso confiante de canto de boca (smirk) */}
      <path
        d="M 66 50 Q 72 52 79 47"
        stroke="#18181b"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path d="M 79 45 L 81 49" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />

      {/* Bigodes afiados */}
      <path d="M 44 42 L 26 40 M 42 47 L 24 49 M 44 52 L 28 57" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 98 42 L 116 40 M 100 47 L 118 49 M 98 52 L 114 57" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />

      {/* MAÇO DE CÉDULAS DE DINHEIRO NAS PATAS (CONTANDO NOTAS) */}
      {/* Nota de trás (verde escura) */}
      <g transform="rotate(-15 60 75)">
        <rect x="42" y="65" width="28" height="15" rx="2" fill="#16a34a" stroke="#18181b" strokeWidth="2" />
        <circle cx="56" cy="72.5" r="3" fill="#86efac" />
      </g>
      {/* Nota do meio (verde viva) */}
      <g transform="rotate(-4 64 76)">
        <rect x="46" y="66" width="28" height="15" rx="2" fill="#22c55e" stroke="#18181b" strokeWidth="2" />
        <circle cx="60" cy="73.5" r="3" fill="#bbf7d0" />
        <text x="49" y="74" fontSize="7" fontWeight="900" fill="#14532d" fontFamily="sans-serif">$</text>
        <text x="67" y="74" fontSize="7" fontWeight="900" fill="#14532d" fontFamily="sans-serif">$</text>
      </g>
      {/* Nota da frente sendo contada */}
      <g transform="rotate(10 70 78)">
        <rect x="52" y="66" width="30" height="16" rx="2" fill="#4ade80" stroke="#18181b" strokeWidth="2.2" />
        <ellipse cx="67" cy="74" rx="4.5" ry="3.5" fill="#dcfce7" stroke="#15803d" strokeWidth="1" />
        <text x="65" y="76.5" fontSize="8" fontWeight="bold" fill="#14532d" fontFamily="sans-serif">$</text>
      </g>

      {/* Pata Esquerda segurando o maço de dinheiro */}
      <path
        d="M 44 80 C 44 72, 54 72, 56 80 L 52 86 Z"
        fill="#ffffff"
        stroke="#18181b"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <line x1="47" y1="75" x2="48" y2="79" stroke="#18181b" strokeWidth="1.8" />
      <line x1="51" y1="75" x2="52" y2="79" stroke="#18181b" strokeWidth="1.8" />

      {/* Pata Direita contando as notas */}
      <path
        d="M 76 74 C 80 68, 88 72, 84 80 L 78 82 Z"
        fill="#ffffff"
        stroke="#18181b"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <line x1="81" y1="72" x2="79" y2="77" stroke="#18181b" strokeWidth="1.8" />
      <line x1="84" y1="74" x2="82" y2="78" stroke="#18181b" strokeWidth="1.8" />

      {/* Moeda de ouro e nota flutuante de faturamento */}
      <g transform="translate(24, 62) rotate(-10)">
        <circle cx="8" cy="8" r="5" fill="#facc15" stroke="#18181b" strokeWidth="1.5" />
        <text x="6" y="10.5" fontSize="6" fontWeight="bold" fill="#713f12" fontFamily="sans-serif">$</text>
      </g>
      <g transform="translate(98, 70) rotate(15)">
        <rect x="0" y="0" width="14" height="8" rx="1.5" fill="#86efac" stroke="#18181b" strokeWidth="1.5" />
        <text x="4.5" y="6" fontSize="5" fontWeight="bold" fill="#14532d" fontFamily="sans-serif">$</text>
      </g>
    </svg>
  );
}

/**
 * Mão fazendo sinal da paz com olhos de cartoon no dorso (inspirado no hero do PKLS).
 */
export function PeaceHandDoodle({ className = 'w-28 h-28', ...props }) {
  return (
    <svg
      viewBox="0 0 120 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none overflow-visible ${className}`}
      aria-label="Mão fazendo sinal da paz com olhos de cartoon"
      role="img"
      {...props}
    >
      {/* Contorno da mão com dedos em V */}
      <path
        d="M 38 120 L 38 88 Q 36 68 32 60 Q 30 54 36 50 Q 42 50 44 58 L 46 40 Q 46 22 54 22 Q 62 22 62 40 L 62 46 Q 64 26 72 26 Q 80 26 80 44 L 80 62 Q 86 62 88 68 Q 92 78 86 92 L 84 120"
        fill="#fef08a"
        stroke="#18181b"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Divisória entre dedos indicador e médio */}
      <path d="M 62 44 L 62 70" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />
      {/* Polegar dobrado sobre a palma */}
      <path d="M 44 68 Q 54 74 62 72" stroke="#18181b" strokeWidth="3" strokeLinecap="round" />

      {/* Cartoon eyes na palma */}
      <ellipse cx="50" cy="88" rx="8" ry="9" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" />
      <circle cx="52" cy="88" r="4.5" fill="#18181b" />
      <circle cx="53" cy="86" r="1.5" fill="#ffffff" />

      <ellipse cx="70" cy="88" rx="8" ry="9" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" />
      <circle cx="72" cy="88" r="4.5" fill="#18181b" />
      <circle cx="73" cy="86" r="1.5" fill="#ffffff" />

      {/* Sorriso simpático */}
      <path d="M 54 104 Q 60 110 66 104" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Xícara de café fumegante com olhos de cartoon (energia e rotina do MEI).
 */
export function CoffeeCupDoodle({ className = 'w-28 h-28', ...props }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none overflow-visible ${className}`}
      aria-label="Xícara de café com olhos de cartoon"
      role="img"
      {...props}
    >
      {/* Fumaça ondulada em espiral */}
      <path
        d="M 42 22 Q 48 14 42 6 M 58 24 Q 64 12 56 4 M 74 22 Q 80 14 74 6"
        stroke="#a8a29e"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Asa da xícara */}
      <path
        d="M 84 52 Q 106 52 104 74 Q 102 90 82 86"
        stroke="#18181b"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Corpo da caneca cerâmica */}
      <path
        d="M 28 42 L 34 94 Q 35 104 58 104 Q 81 104 82 94 L 88 42 Z"
        fill="#fef3c7"
        stroke="#18181b"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Borda superior da caneca */}
      <ellipse cx="58" cy="42" rx="30" ry="7" fill="#fde68a" stroke="#18181b" strokeWidth="3" />
      {/* Café quentinho */}
      <ellipse cx="58" cy="42" rx="25" ry="5" fill="#78350f" />

      {/* Cartoon eyes na xícara */}
      <ellipse cx="46" cy="68" rx="8" ry="9" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" />
      <circle cx="48" cy="67" r="4.5" fill="#18181b" />
      <circle cx="50" cy="65" r="1.5" fill="#ffffff" />

      <ellipse cx="68" cy="68" rx="8" ry="9" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" />
      <circle cx="70" cy="67" r="4.5" fill="#18181b" />
      <circle cx="72" cy="65" r="1.5" fill="#ffffff" />

      {/* Sorriso e bochechas */}
      <path d="M 52 84 Q 57 89 62 84" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="38" cy="74" r="2.5" fill="#fca5a5" />
      <circle cx="76" cy="74" r="2.5" fill="#fca5a5" />
    </svg>
  );
}

/**
 * Lápis / Nota Fiscal animada com olhos de cartoon e traço grosso.
 */
export function PencilInvoiceDoodle({ className = 'w-28 h-28', ...props }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none overflow-visible ${className}`}
      aria-label="Nota fiscal e lápis com olhos de cartoon"
      role="img"
      {...props}
    >
      {/* Folha de Nota Fiscal com borda serrilhada no topo */}
      <path
        d="M 28 32 L 82 22 L 92 102 L 38 112 Z"
        fill="#ffffff"
        stroke="#18181b"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Linhas da nota fiscal */}
      <line x1="38" y1="46" x2="68" y2="40" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
      <line x1="40" y1="58" x2="72" y2="52" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
      <line x1="42" y1="70" x2="60" y2="66" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />

      {/* Lápis carismático sobreposto inclinado */}
      <g transform="rotate(25 80 60)">
        {/* Corpo do lápis */}
        <rect x="68" y="20" width="14" height="60" rx="3" fill="#f59e0b" stroke="#18181b" strokeWidth="3" />
        {/* Borracha rosa */}
        <path d="M 68 24 L 68 18 Q 75 14 82 18 L 82 24 Z" fill="#f43f5e" stroke="#18181b" strokeWidth="2.5" />
        {/* Ponta de madeira e grafite */}
        <path d="M 68 80 L 75 96 L 82 80 Z" fill="#fde68a" stroke="#18181b" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M 72.5 90 L 75 96 L 77.5 90 Z" fill="#18181b" />

        {/* Olhos de cartoon no lápis */}
        <ellipse cx="72" cy="46" rx="4" ry="5" fill="#ffffff" stroke="#18181b" strokeWidth="1.8" />
        <circle cx="73" cy="46" r="2.2" fill="#18181b" />
        <circle cx="74" cy="45" r="0.8" fill="#ffffff" />

        <ellipse cx="80" cy="46" rx="4" ry="5" fill="#ffffff" stroke="#18181b" strokeWidth="1.8" />
        <circle cx="81" cy="46" r="2.2" fill="#18181b" />
        <circle cx="82" cy="45" r="0.8" fill="#ffffff" />
      </g>
    </svg>
  );
}

/**
 * Cursor em chamas estilo PKLS hero ("Vendas rápidas / IA acelerada").
 */
export function FlamingCursorDoodle({ className = 'w-28 h-28', ...props }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none overflow-visible ${className}`}
      aria-label="Cursor em chamas com olhos de cartoon"
      role="img"
      {...props}
    >
      {/* Chamas de fogo saindo de trás do cursor */}
      <path
        d="M 52 38 Q 42 16 28 22 Q 36 34 26 44 Q 14 54 28 68 Q 24 82 42 78"
        fill="#ef4444"
        stroke="#18181b"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M 46 44 Q 38 28 32 34 Q 38 42 32 50 Q 24 58 34 68 Q 32 74 44 70"
        fill="#f59e0b"
        stroke="#18181b"
        strokeWidth="2"
      />
      <path
        d="M 42 50 Q 36 38 34 44 Q 38 52 36 60 Q 40 64 42 58"
        fill="#fef08a"
      />

      {/* Seta do cursor pointer clássica */}
      <path
        d="M 48 30 L 98 62 L 76 68 L 92 98 L 78 106 L 62 76 L 46 92 Z"
        fill="#ffffff"
        stroke="#18181b"
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Olhos de cartoon no corpo do cursor */}
      <ellipse cx="66" cy="54" rx="6" ry="7" fill="#ffffff" stroke="#18181b" strokeWidth="2.2" />
      <circle cx="68" cy="54" r="3.5" fill="#18181b" />
      <circle cx="69" cy="52" r="1.2" fill="#ffffff" />

      <ellipse cx="80" cy="62" rx="6" ry="7" fill="#ffffff" stroke="#18181b" strokeWidth="2.2" />
      <circle cx="82" cy="62" r="3.5" fill="#18181b" />
      <circle cx="83" cy="60" r="1.2" fill="#ffffff" />
    </svg>
  );
}

/**
 * Celular / Monitor retrô com WhatsApp e olhos de cartoon.
 */
export function WhatsappPhoneDoodle({ className = 'w-28 h-28', ...props }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none overflow-visible ${className}`}
      aria-label="Celular com WhatsApp e olhos de cartoon"
      role="img"
      {...props}
    >
      {/* Corpo do smartphone com cantos arredondados */}
      <rect
        x="34"
        y="18"
        width="52"
        height="84"
        rx="12"
        fill="#22c55e"
        stroke="#18181b"
        strokeWidth="3.5"
      />
      {/* Tela */}
      <rect
        x="40"
        y="28"
        width="40"
        height="62"
        rx="6"
        fill="#ffffff"
        stroke="#18181b"
        strokeWidth="2.5"
      />
      {/* Alto-falante no topo e botão home */}
      <line x1="54" y1="23" x2="66" y2="23" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="60" cy="95" r="3" fill="#18181b" />

      {/* Balão de conversa verde estilo WhatsApp na tela */}
      <path
        d="M 46 44 Q 46 38 56 38 Q 72 38 72 48 Q 72 58 62 58 L 54 62 L 56 58 Q 46 58 46 48 Z"
        fill="#dcfce7"
        stroke="#18181b"
        strokeWidth="2"
      />

      {/* Olhos de cartoon expressivos na tela */}
      <ellipse cx="52" cy="70" rx="6" ry="7" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
      <circle cx="54" cy="70" r="3.2" fill="#18181b" />
      <circle cx="55" cy="68" r="1" fill="#ffffff" />

      <ellipse cx="68" cy="70" rx="6" ry="7" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
      <circle cx="70" cy="70" r="3.2" fill="#18181b" />
      <circle cx="71" cy="68" r="1" fill="#ffffff" />

      {/* Sorriso na tela */}
      <path d="M 56 81 Q 60 84 64 81" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />

      {/* Ondinhas de sinal saindo do celular */}
      <path d="M 92 36 Q 98 44 92 52" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 98 30 Q 106 44 98 58" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Sublinhado duplo rabiscado à mão em SVG.
 */
export function SketchUnderline({ className = 'w-32 h-3', color = 'currentColor', ...props }) {
  return (
    <svg
      viewBox="0 0 140 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none overflow-visible ${className}`}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M 2 5 Q 35 12 70 6 Q 105 2 138 7"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M 12 12 Q 45 15 80 11 Q 110 8 132 13"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

/**
 * Seta curva desenhada à mão em SVG.
 * Direções suportadas: right, left, up, down.
 */
export function SketchArrow({ className = 'w-12 h-8', direction = 'right', color = 'currentColor', ...props }) {
  const getRotation = () => {
    switch (direction) {
      case 'left':
        return 'scale(-1, 1)';
      case 'up':
        return 'rotate(-90 30 20)';
      case 'down':
        return 'rotate(90 30 20)';
      default:
        return undefined;
    }
  };

  return (
    <svg
      viewBox="0 0 60 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none overflow-visible ${className}`}
      aria-hidden="true"
      {...props}
    >
      <g transform={getRotation()} transformOrigin="center">
        {/* Haste curva */}
        <path
          d="M 6 28 Q 24 6 48 18"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {/* Ponta da seta */}
        <path
          d="M 38 12 L 50 18 L 42 28"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

/**
 * Estrela rabiscada de 4 pontas estilo Dzaglik Festival.
 */
export function SketchSparkle({ className = 'w-6 h-6', fill = '#facc15', color = 'currentColor', ...props }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none overflow-visible ${className}`}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M 20 2 Q 20 18 38 20 Q 20 22 20 38 Q 18 22 2 20 Q 18 18 20 2 Z"
        fill={fill}
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.5" fill={color} />
      <circle cx="32" cy="32" r="1.5" fill={color} />
    </svg>
  );
}

/**
 * Badge / Sticker inclinado com borda tracejada e tipografia de mão ou display.
 */
export function SketchStickerBadge({
  children,
  rotate = '-3deg',
  className = '',
  style = {},
  ...props
}) {
  return (
    <span
      className={`inline-flex items-center justify-center font-hand text-sm px-3.5 py-1 rounded-full border-2 border-dashed shadow-sm transition-transform hover:rotate-0 select-none ${className}`}
      style={{
        transform: `rotate(${rotate})`,
        boxShadow: '3px 3px 0px rgba(0, 0, 0, 0.15)',
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}

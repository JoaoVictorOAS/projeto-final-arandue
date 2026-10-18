# Design Spec: Identidade Visual "Aranduê Feito à Mão" (Hand-Drawn Sketch) & Landing Page

**Data:** 2026-10-18  
**Escopo:** Frontend (`frontend/src/`) — Nova Landing Page Pública + Identidade Estrutural Desenhada à Mão integrada ao Motor de Temas Dinâmicos (`ThemeContext`).

---

## 1. Intenção e Referências Visuais (O "Porquê")

O sistema Aranduê possui atualmente um motor de temas dinâmicos funcional (5 temas padrão + temas gerados por IA/upload JSON), mas a estrutura visual das páginas utiliza cartões e grades genéricas de SaaS corporativo (`rounded-xl border-gray-100 shadow-sm`), sem personalidade própria.

A partir da análise das referências visuais baixadas pelo usuário (`pickles.team` / **PKLS** e `dzaglikfestival.tilda.ws` / **Dzaglik Festival**), definimos uma linguagem estética **Hand-Drawn / Sketchbook Artesanal ("Feito à Mão")** que se destaca imediatamente de interfaces minimalistas padronizadas:

1. **Referência PKLS (`Screenshot_2025-07-2.png`, `download.png`, `download.jpeg`):**
   - Fundo papel creme aconchegante (`#F4F1EA`) com traços em nanquim preto espesso (`2px` a `3px`).
   - Ilustrações line-art feitas à mão com **olhos expressivos de cartoon** em objetos do cotidiano (xícara de café, lápis, cursor pegando fogo, monitor retrô, mascote com óculos escuros).
   - Anéis ovais tracejados (`dashed`) feitos à mão cercando frases de impacto (`"CREATIVE MINDS CAN CHANGE THE WORLD"`).
   - Stickers circulares rotacionados em cores vibrantes (verde-limão/âmbar) com borda pontilhada.
   - Tipografia display ultra-condensada/pesada na base e nos títulos principais.

2. **Referência Dzaglik Festival (`Screenshot_2025-07-2 (1).png`):**
   - **"Ordem primeiro, caos depois":** Em vez de caixas presas em colunas simétricas rígidas, uma ilustração central expressiva é cercada por blocos de texto flutuantes assimétricos (`LEARN & INSPIRE`, `SHOP TO SUPPORT`, `MOVE TO THE MUSIC`, `DRINKS & FOOD`) com estrelas rabiscadas e adesivos com contorno branco.

---

## 2. Pilares do Estilo "Aranduê Feito à Mão"

### 2.1 Tipografia em 3 Camadas (Charme sem sacrificar leitura)
- **Camada Manuscrita / Rabisco (`--font-hand`: `'Caveat'`, `'Gloria Hallelujah'`, cursive):**
  - Usada **com moderação estrita**: apenas em anotações de margem, setas explicativas, badges/stickers inclinados, sublinhados rabiscados e destaques curtos. **Nunca** usada em parágrafos longos, tabelas financeiras ou inputs.
- **Camada Display / Impacto (`--font-display`: `'Syne'` / `'Space Grotesk'`, sans-serif Black 800):**
  - Títulos de seção, chamadas da Landing Page e cabeçalhos dos módulos com peso marcante e tracking ajustado.
- **Camada Corpo / Operacional (`--font-sans`: `'Plus Jakarta Sans'` / `'Inter'`, sans-serif):**
  - Mantém legibilidade impecável em tabelas de Livro Caixa, Notas Fiscais, Orçamentos e Chat.

### 2.2 Decoração, Acentos Bagunçados e Ilustrações SVG Autênticas
- **Bordas de Nanquim & Sombra Deslocada (Sketch Neo-Brutalism):**
  - Cartões, botões e modais ganham bordas expressivas (`2px solid var(--border-sketch)`) e sombra sólida deslocada (`4px 4px 0px var(--shadow-sketch)`), além de leve raio orgânico assimétrico opcional (`border-radius: 18px 14px 20px 15px`).
- **Biblioteca de Doodles & Mascotes SVG (`SketchDoodles.jsx`):**
  - **Coruja Aranduê de Óculos Escuros** (inspirada no gato da PKLS): mascote sabichão do MEI.
  - **Xícara de Café Expressiva com Olhos** (energia do empreendedor).
  - **Lápis / Calculadora / Nota Fiscal com Olhos de Cartoon** (organização sem chatice).
  - **Cursor / Foguete em Chamas Rabiscado** (vendas e atendimento automático no WhatsApp).
  - **Decoradores reutilizáveis:** Setas tortas desenhadas à mão, sublinhados duplos de marca-texto, estrelas de 4 pontas rabiscadas, fitas adesivas ("fita crepe" no topo de cards), selos circulares rotacionados com borda tracejada (`"100% MEI"`, `"ZERO PLANILHA"`, `"IA NO ZAP"`).

### 2.3 "Ordem Primeiro, Caos Depois" (Desalinhamento Intencional Controlado)
- **Na Landing Page:** Layout livre e editorial — ilustração central rodeada por blocos flutuantes (estilo *Dzaglik*), faixas de personagens lado a lado (estilo *PKLS*), anéis tracejados gigantes e cartões com rotações sutis (`-rotate-1`, `rotate-1`, `rotate-2`) que se alinham perfeitamente ao passar o mouse (`hover:rotate-0`).
- **No Sistema Interno (Dashboard, Sidebar, Navbar, Módulos):**
  - Preserva a velocidade de leitura do MEI, mas aplica **personalidade artesanal**: fundo com textura sutil de papel pontilhado (`dot-grid` / `paper grain` via CSS puro), Sidebar e Navbar com borda de caderno/sketch, cabeçalhos das páginas com sublinhado rabiscado em SVG e nota manuscrita contextual, botões com clique tátil (`active:translate-x-[2px] active:translate-y-[2px]`) e cards com cantoneiras/fitas decorativas.

### 2.4 Integração Total com o Motor de Temas (`ThemeContext`)
- O estilo desenhado à mão **não substitui** os temas — ele é a **identidade estrutural** sobre a qual todos os temas (Claro Aranduê, Noturno Corporativo, Esmeralda MEI, Oceano Índigo, Âmbar & Café e temas IA/JSON) funcionam!
- Em temas claros (`light`), o traço de nanquim e a sombra deslocada usam tons escuros derivados de `--text-main` / `--border-color`; em temas escuros (`dark`), o efeito se transforma em **Quadro Negro / Sketch Luminoso** (traços claros/coloridos sobre fundo escuro com sombra profunda).
- A Landing Page conta ainda com um **Seletor Interativo de Clima/Tema ao Vivo** no próprio cabeçalho para o visitante experimentar os temas do Aranduê sem sair da página.

---

## 3. Estrutura da Nova Landing Page (`LandingPage.jsx`)

1. **Header Editorial Sketch:**
   - Logo Aranduê + Doodles de olhos animados (`cases 👀` inspirado na PKLS) + Links de navegação (`Como Funciona`, `Superpoderes IA`, `Para quem é`, `Experimentar Temas`) + Botões `Entrar` e `Criar Conta Grátis` com estilo sticker.
2. **Hero Section (Inspirada em PKLS + Dzaglik):**
   - Fileira de mascotes desenhados à mão em traço grosso (Coruja Aranduê de óculos escuros, Xícara de Café com olhos, Lápis/Nota Fiscal animada, Cursor em chamas, Celular com WhatsApp).
   - Título gigante em camadas + anotação manuscrita em `Caveat` com seta rabiscada: *"Esqueça as planilhas chatas — a gente cuida da burocracia!"*
   - Stickers flutuantes rotacionados (`"FEITO PARA MEI"`, `"IA NO WHATSAPP"`, `"SEM CONTABILÊS"`).
   - Tipografia monumental na base da dobra (`ARANDUÊ`).
3. **Seção "Ordem no Caos" (Layout Espalhado estilo Dzaglik Festival):**
   - Ilustração central da Coruja Aranduê relaxando na cadeira de praia com água de coco (homenagem direta ao `download.png` *"YOU FOCUS ON BUSINESS — WE TAKE CARE OF MARKETING"* -> *"VOCÊ FOCA NO SEU CORRE — O ARANDUÊ CUIDA DA GESTÃO"*).
   - 4 blocos flutuantes ao redor da ilustração:
     - **LIVRO CAIXA & PIX** (Fluxo financeiro sem dor de cabeça)
     - **ATENDENTE IA 24H** (Responde clientes e fecha agenda no WhatsApp)
     - **ORÇAMENTOS & COBRANÇAS** (Propostas prontas em 1 clique)
     - **BÚSSOLA FISCAL MEI** (Tira-dúvidas oficial com base na lei)
4. **Seção Anéis Tracejados ("Mentes Criativas & Trabalhadores Independentes"):**
   - Inspirada em `download.jpeg`: grandes elipses concêntricas tracejadas com frase de manifesto + selo verde-limão/âmbar inclinado.
5. **Vitrine Interativa de Temas ("Seu Sistema, Seu Caderno"):**
   - Permite clicar e testar os temas do sistema (Papel & Café, Claro Aranduê, Esmeralda, Noturno, etc.) vendo os cards desenhados à mão mudarem de cor instantaneamente.
6. **Footer Manifesto + CTA Final:**
   - Chamada direta para `/register` e `/login`.

---

## 4. Regras de Roteamento e Compatibilidade de Testes

- **Rota `/landing`:** Sempre acessível publicamente (tanto para visitantes quanto para usuários logados que queiram ver a página).
- **Rota `/`:**
  - Se **não autenticado** (e fora de ambiente de teste unitário isolado que espere comportamento específico): exibe a `<LandingPage />` diretamente em `/`!
  - Se **autenticado**: exibe o `<Layout />` com `<Dashboard />` como já funciona hoje.
- **Rotas protegidas (`/clientes`, `/caixa`, etc.):** Continuam redirecionando para `/login` quando não autenticado.
- **Testes Existentes:** Todos os testes em `Login.test.jsx`, `Layout.test.jsx`, `Dashboard.test.jsx`, `Configuracoes.test.jsx` e suíte Backend (`temaRepository.test.js`, `temasApi.test.js`) permanecem 100% verdes.

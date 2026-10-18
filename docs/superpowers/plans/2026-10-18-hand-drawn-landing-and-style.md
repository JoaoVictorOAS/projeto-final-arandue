# Hand-Drawn Identity ("Aranduê Feito à Mão") & Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a nova Landing Page pública do Aranduê e aplicar a identidade visual "Estilo Desenhado à Mão" (caligrafia moderada, ilustrações line-art com olhos de cartoon, acentos de rabiscos/stickers e layout orgânico "ordem primeiro, caos depois") integrada ao motor de temas dinâmicos (`ThemeContext`).

**Architecture:** Adicionaremos as fontes manuscrita (`Caveat`) e display (`Syne`) junto com tokens e classes utilitárias de traço/sombra de caderno (`sketch-card`, `sketch-btn`, `sketch-sticker`, fundo pontilhado) em `frontend/src/index.css`, todos reativos às variáveis CSS do `ThemeContext`. Criaremos uma biblioteca de componentes SVG artesanais (`frontend/src/components/SketchDoodles.jsx`), a página `frontend/src/pages/LandingPage.jsx` inspirada nas referências `pickles.team` e `dzaglikfestival`, e aplicaremos os ornamentos desenhados à mão no `Layout`, `Sidebar`, `Navbar`, `Login` e `Dashboard` sem quebrar nenhum teste existente.

**Tech Stack:** React 18, React Router v6, Tailwind CSS, Vitest + React Testing Library, SVG inline hand-drawn illustrations.

**Spec:** `docs/superpowers/specs/2026-10-18-hand-drawn-landing-and-style-design.md`

## Global Constraints

- As fontes manuscritas (`font-hand` / `Caveat`) devem ser usadas apenas com moderação (anotações, stickers, badges, sublinhados), **nunca** no corpo de texto longo ou tabelas.
- Todos os estilos desenhados à mão no painel interno devem respeitar as variáveis CSS do `ThemeContext` (`--bg-app`, `--bg-surface`, `--text-main`, `--border-color`, `--color-primary`, `--color-accent`) tanto em modo `light` quanto `dark`.
- A tela de `Login.jsx` deve manter a classe `.theme-isolated` e `backgroundColor: rgb(255, 255, 255)` no root para preservar o contrato de `Login.test.jsx`.
- O `Layout.jsx` deve manter `.theme-app-wrapper` e as classes de padding de `<main>` para preservar o contrato de `Layout.test.jsx`.
- Os 5 temas padrão do backend (`temaRepository.js`) não devem ter sua quantidade alterada para preservar `temaRepository.test.js`.

## Review Focus

- Visitante não autenticado acessando `/` deve visualizar a `LandingPage` diretamente, enquanto usuário autenticado acessando `/` deve visualizar o `Dashboard` dentro do `Layout`.
- Usuário autenticado acessando `/landing` deve conseguir visualizar a `LandingPage` normalmente e ter botão para voltar ao Painel (`/`).
- Alternância de temas na `LandingPage` e no sistema (`light` e `dark`) deve manter contraste legível nos elementos `.sketch-card` e `.sketch-sticker`.
- Responsividade mobile: elementos flutuantes/rotacionados (`-rotate-1`, `rotate-2`) não podem causar overflow horizontal (`overflow-x-hidden`) em telas de 360px.
- Preservação integral dos testes existentes em `Login.test.jsx`, `Layout.test.jsx`, `Dashboard.test.jsx` e `Configuracoes.test.jsx`.

---

### Task 1: Tipografia & Sistema CSS "Hand-Drawn Sketch" Integrado aos Temas

**Files:**
- Modify: `frontend/index.html:1-21`
- Modify: `frontend/tailwind.config.js:1-39`
- Modify: `frontend/src/index.css:1-175`

**Interfaces:**
- Consumes: Variáveis CSS injetadas por `ThemeContext.jsx` (`--bg-app`, `--bg-surface`, `--border-color`, `--text-main`, `--color-primary`, `--color-accent`)
- Produces:
  - Fontes Google carregadas em `index.html`: `Caveat` (manuscrita), `Syne` (display bold/black), `Plus Jakarta Sans` (corpo)
  - Classes utilitárias globais em `index.css`: `.font-hand`, `.font-display`, `.sketch-card`, `.sketch-btn`, `.sketch-sticker`, `.sketch-dashed-ring`, `.sketch-paper-bg`, `.sketch-tape`

- [ ] **Step 1: Atualizar `frontend/index.html` e `frontend/tailwind.config.js` com as famílias tipográficas `hand` e `display`**

Adicionar `<link>` para Google Fonts (`Caveat:wght@600;700`, `Syne:wght@700;800`, `Plus+Jakarta+Sans:wght@400;500;600;700`) em `frontend/index.html` e registrar `fontFamily: { hand: ['"Caveat"', 'cursive'], display: ['"Syne"', 'sans-serif'] }` em `frontend/tailwind.config.js`.

- [ ] **Step 2: Adicionar regras CSS de traço feito à mão e textura de caderno em `frontend/src/index.css`**

Definir `--sketch-ink`, `--sketch-shadow`, `.sketch-paper-bg` (malha sutil de pontilhado de caderno), `.sketch-card` (borda de nanquim + sombra deslocada sólida + leve assimetria orgânica), `.sketch-sticker` (borda tracejada + rotação + fonte manuscrita) e `.sketch-tape` (fita adesiva translúcida no topo dos cards), adaptando automaticamente para `.dark` / `[data-theme-mode="dark"]`.

- [ ] **Step 3: Executar testes de Layout para garantir zero regressão**

Run: `npx --prefix frontend vitest run src/components/Layout.test.jsx`
Expected: PASS (2 tests passing)

- [ ] **Step 4: Commit**

```bash
git add frontend/index.html frontend/tailwind.config.js frontend/src/index.css
git commit -m "style(frontend): add hand-drawn typography and theme-aware sketch CSS tokens"
```

---

### Task 2: Biblioteca de Ilustrações & Doodles Feitos à Mão (`SketchDoodles.jsx`)

**Files:**
- Create: `frontend/src/components/SketchDoodles.jsx`
- Test: `frontend/src/components/SketchDoodles.test.jsx`

**Interfaces:**
- Consumes: Nenhum
- Produces:
  - `CartoonEyes({ className })`: Par de olhos expressivos estilo PKLS
  - `OwlMascotDoodle({ className, variant })`: Coruja Aranduê de óculos escuros ("cool") ou relaxando na cadeira de praia ("chill")
  - `CoffeeCupDoodle({ className })`: Xícara de café fumegante com olhos de cartoon
  - `PencilInvoiceDoodle({ className })`: Lápis/Nota fiscal sorridente com olhos
  - `FlamingCursorDoodle({ className })`: Cursor/foguete em chamas estilo PKLS
  - `WhatsappPhoneDoodle({ className })`: Smartphone rabiscado respondendo cliente
  - `SketchUnderline({ className, color })`: Sublinhado duplo rabiscado à mão
  - `SketchArrow({ className, direction })`: Seta curva desenhada à mão
  - `SketchSparkle({ className, color })`: Estrela de 4 pontas estilo Dzaglik
  - `SketchStickerBadge({ children, rotate, variant, className })`: Sticker circular/pílula com borda pontilhada e rotação

- [ ] **Step 1: Write the failing test in `frontend/src/components/SketchDoodles.test.jsx`**

```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import {
  CartoonEyes,
  OwlMascotDoodle,
  CoffeeCupDoodle,
  PencilInvoiceDoodle,
  FlamingCursorDoodle,
  SketchUnderline,
  SketchStickerBadge,
} from './SketchDoodles';

describe('SketchDoodles - Elementos Desenhados à Mão', () => {
  test('deve renderizar os mascotes line-art com atributos de acessibilidade e SVG', () => {
    const { container } = render(
      <div>
        <CartoonEyes />
        <OwlMascotDoodle variant="cool" />
        <OwlMascotDoodle variant="beach" />
        <CoffeeCupDoodle />
        <PencilInvoiceDoodle />
        <FlamingCursorDoodle />
        <SketchUnderline />
        <SketchStickerBadge rotate="-6deg">100% MEI</SketchStickerBadge>
      </div>
    );

    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(7);
    expect(screen.getByText('100% MEI')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx --prefix frontend vitest run src/components/SketchDoodles.test.jsx`
Expected: FAIL with "Failed to resolve import ./SketchDoodles"

- [ ] **Step 3: Implement `frontend/src/components/SketchDoodles.jsx`**

Criar todos os componentes SVG line-art com traço expressivo (`strokeWidth="2.5"`, `strokeLinecap="round"`, `strokeLinejoin="round"`) inspirados diretamente nas referências PKLS e Dzaglik Festival.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx --prefix frontend vitest run src/components/SketchDoodles.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/SketchDoodles.jsx frontend/src/components/SketchDoodles.test.jsx
git commit -m "feat(frontend): add hand-drawn SVG mascots, cartoon eyes, and sticker badges"
```

---

### Task 3: Nova Landing Page "Aranduê Feito à Mão" (`LandingPage.jsx`) & Roteamento Inteligente

**Files:**
- Create: `frontend/src/pages/LandingPage.jsx`
- Create: `frontend/src/pages/LandingPage.test.jsx`
- Modify: `frontend/src/App.jsx:1-63`

**Interfaces:**
- Consumes: `SketchDoodles.jsx`, `useTheme()` de `ThemeContext.jsx`, `useAuth()` de `AuthContext.jsx`
- Produces:
  - `LandingPage`: Página pública completa com:
    1. Header com logo, `CartoonEyes`, navegação rápida, seletor de temas ao vivo e CTAs (`Entrar` / `Criar Conta Grátis` ou `Ir para o Meu Painel` se autenticado).
    2. Hero Section estilo **PKLS** com fileira de mascotes desenhados à mão, notas manuscritas em `font-hand` (`Caveat`), stickers inclinados e tipografia monumental `ARANDUÊ`.
    3. Seção "Ordem no Caos" estilo **Dzaglik Festival** (` VOCÊ FOCA NO SEU CORRE — A GENTE CUIDA DA BUROCRACIA `) com ilustração central da Coruja na cadeira de praia e 4 blocos assimétricos ao redor (`Livro Caixa & PIX`, `Atendente IA no WhatsApp`, `Orçamentos em 1 Clique`, `Bússola Fiscal MEI`).
    4. Seção de Anéis Ovais Tracejados estilo **PKLS** (`MENTES CRIATIVAS & EMPREENDEDORES REAIS MUDAM O MUNDO`) com sticker circular rotacionado.
    5. Barra interativa de experimentação de temas (`Claro Aranduê`, `Âmbar & Café`, `Esmeralda MEI`, `Noturno Corporativo`, `Oceano Índigo`).
  - Rota `/landing` pública + Rota `/` exibindo `LandingPage` para visitantes não autenticados e `Dashboard` (dentro de `Layout`) para usuários autenticados.

- [ ] **Step 1: Write the failing test in `frontend/src/pages/LandingPage.test.jsx`**

```jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect } from 'vitest';
import LandingPage from './LandingPage';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';

describe('LandingPage - Estilo Desenhado à Mão', () => {
  test('deve renderizar o hero ilustrado, blocos assimétricos, anéis tracejados e CTAs de acesso', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /ARANDUÊ/i })).toBeInTheDocument();
    expect(screen.getByText(/VOCÊ FOCA NO SEU CORRE/i)).toBeInTheDocument();
    expect(screen.getByText(/MENTES CRIATIVAS/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /entrar/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /começar grátis|criar conta/i }).length).toBeGreaterThan(0);
  });

  test('deve permitir testar temas diferentes ao vivo na vitrine da landing page', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    const botaoAmbar = screen.getByRole('button', { name: /Âmbar & Café/i });
    fireEvent.click(botaoAmbar);
    expect(document.documentElement.getAttribute('data-theme-id')).toBe('ambar-cafe');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx --prefix frontend vitest run src/pages/LandingPage.test.jsx`
Expected: FAIL with "Failed to resolve import ./LandingPage"

- [ ] **Step 3: Implement `frontend/src/pages/LandingPage.jsx` and update `frontend/src/App.jsx`**

Implementar `LandingPage.jsx` e atualizar `App.jsx` com a rota `/landing` e um componente `HomeOrLandingRoute` para `/` que exibe `LandingPage` quando `!estaAutenticado` e o fluxo `PrivateRoute -> Layout -> Dashboard` quando autenticado.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx --prefix frontend vitest run src/pages/LandingPage.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/LandingPage.jsx frontend/src/pages/LandingPage.test.jsx frontend/src/App.jsx
git commit -m "feat(frontend): add hand-drawn LandingPage and public root routing"
```

---

### Task 4: Aplicação do Estilo Desenhado à Mão no Sistema (`Layout`, `Sidebar`, `Navbar`, `Dashboard`, `Login`)

**Files:**
- Modify: `frontend/src/components/Layout.jsx:70-148`
- Modify: `frontend/src/components/Sidebar.jsx:40-180`
- Modify: `frontend/src/components/Navbar.jsx:15-92`
- Modify: `frontend/src/pages/Login.jsx:108-220`
- Modify: `frontend/src/pages/Dashboard.jsx` (cabeçalho e wrappers de cards)

**Interfaces:**
- Consumes: `SketchDoodles.jsx`, classes `.sketch-paper-bg`, `.sketch-card`, `.sketch-sticker`, `.font-hand`
- Produces:
  - `Layout.jsx`: Textura de papel pontilhado `.sketch-paper-bg` no `.theme-app-wrapper`
  - `Sidebar.jsx`: Borda de caderno artesanal, sticker `"FEITO À MÃO"` / `"MEI"`, item de menu/atalho para ver a Landing Page (`/landing`), links ativos com borda e sombra deslocada sketch
  - `Navbar.jsx`: Tag manuscrita em `.font-hand` com `CartoonEyes` e `SketchUnderline`, avatar com moldura rabiscada
  - `Login.jsx`: Vitrine esquerda enriquecida com mascotes `OwlMascotDoodle`, `SketchStickerBadge`, notas manuscritas e link `"← Ver página inicial (Apresentação)"` apontando para `/landing` (mantendo `.theme-isolated` e `bg-stone-100/70` intactos)
  - `Dashboard.jsx`: Saudação com sublinhado rabiscado `SketchUnderline`, anotação manuscrita amigável e estilo `.sketch-card` nos cartões e ações rápidas

- [ ] **Step 1: Atualizar `Layout.jsx`, `Sidebar.jsx`, `Navbar.jsx`, `Login.jsx` e `Dashboard.jsx`**

Aplicar os elementos decorativos desenhados à mão preservando todos os textos, `aria-labels` e classes verificados pelos testes existentes.

- [ ] **Step 2: Run full frontend test suite to verify all tests pass**

Run: `npm run test:frontend`
Expected: PASS (100% dos arquivos de teste passando)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Layout.jsx frontend/src/components/Sidebar.jsx frontend/src/components/Navbar.jsx frontend/src/pages/Login.jsx frontend/src/pages/Dashboard.jsx
git commit -m "style(frontend): apply hand-drawn sketch decorations across app shell, login, and dashboard"
```

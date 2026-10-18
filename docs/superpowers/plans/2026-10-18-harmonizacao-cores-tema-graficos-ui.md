# Harmonização de Cores dos Gráficos e UI com o Tema do Sistema — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar os gráficos do dashboard (`AutoChartRenderer.jsx`) e todos os botões de ação principal, badges, preços e abas das 8 páginas de gestão (`Clientes`, `Serviços`, `Agenda`, `Orçamentos`, `Cobranças`, `Livro Caixa`, `Notas Fiscais` e `Configurações`) ao motor de temas dinâmicos do Aranduê MEI (`ThemeContext.jsx`), estabelecendo uma hierarquia visual coesa e preservando métricas semânticas financeiras (verde/amarelo/vermelho).

**Architecture:** O `ThemeContext` e o `index.css` fornecem os tokens e classes utilitárias semânticas (`.btn-theme-primary`, `.badge-theme-subtle`, `.text-theme-primary`) baseadas nas variáveis CSS (`--btn-primary-bg`, `--btn-primary-text`, `--color-primary`, `--color-accent`). No `AutoChartRenderer`, uma função utilitária gera dinamicamente uma paleta harmônica a partir do tema ativo, aplicando-a a séries analíticas e fatias de pizza/rosca, enquanto regras prioritárias preservam cores semânticas para fluxos de caixa e status de cobranças.

**Tech Stack:** React 18, Recharts, Tailwind CSS v4, Lucide React, Vitest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-18-harmonizacao-cores-tema-graficos-ui-design.md`

## Global Constraints

- Zero alterações nas tabelas ou migrações no banco de dados MySQL (`dashboards`, `widgets`, `temas_usuario`).
- Zero quebras de contratos REST ou ferramentas MCP (`ai-service/mcp_server/server.py`).
- Conformidade estrita com acessibilidade WCAG 2.1 (contraste mínimo $\ge 4.5:1$ para botões primários e textos).
- Preservação incondicional das cores semânticas: Entradas/Sucesso = `#10b981`, Saídas/Perigo/Atrasado = `#ef4444`, Alertas/Atenção = `#f59e0b`.
- Todos os testes da suíte global (`npm run test:frontend`) devem passar com sucesso.

## Review Focus

1. **Ausência de ThemeProvider (Testes e Fallback):** Ao renderizar `AutoChartRenderer` isoladamente sem `ThemeProvider`, o componente deve recorrer aos tokens padrão (`TEMA_PADRAO_FALLBACK`) sem lançar erros.
2. **Contraste de Botão em Temas Claros vs Escuros:** A classe `.btn-theme-primary` deve utilizar `--btn-primary-text` (já garantido por `garantirContrasteTexto`) sem conflitar com `text-white` forçado por classes Tailwind filhas.
3. **Status Financeiros em Gráficos de Rosca/Pizza:** O gráfico de rosca de `cobrancas_status` e `funil_orcamentos` deve mapear status conhecidos (`PAGO`, `PENDENTE`, `ATRASADO`) para cores semânticas antes de recorrer à paleta do tema.
4. **Múltiplas Séries em Gráficos Cartesianos:** Projeção financeira (`cobrancas_previstas`, `agendamentos_previstos`, `total_projetado`) deve diferenciar visualmente as séries usando a cor primária e a de acento (`accent`) do tema ativo.
5. **Preservação de Estilos de Hover e Foco:** Todos os botões e abas adaptados para o tema devem manter transições suaves e anéis de foco acessíveis.

---

### Task 1: Classes Utilitárias Semânticas de Tema no CSS

**Files:**
- Modify: `frontend/src/index.css:40-60`
- Test: `frontend/src/index.css` (verificação visual e compilação do build)

**Interfaces:**
- Consumes: Variáveis CSS já injetadas por `ThemeContext`: `--btn-primary-bg`, `--btn-primary-text`, `--btn-primary-hover`, `--color-primary`, `--color-accent`, `--bg-surface-hover`, `--border-color`.
- Produces: Classes CSS reutilizáveis `.btn-theme-primary`, `.badge-theme-subtle`, `.tab-theme-active`, `.text-theme-primary`.

- [ ] **Step 1: Escrever as classes utilitárias semânticas em `frontend/src/index.css`**

Adicionar classes utilitárias que vinculem componentes de botão, abas e badges às variáveis de tema:

```css
/* Classes Utilitárias Semânticas do Sistema de Temas */
.btn-theme-primary {
  background-color: var(--btn-primary-bg) !important;
  color: var(--btn-primary-text) !important;
  border-color: transparent !important;
  transition: all 0.2s ease;
}

.btn-theme-primary:hover {
  background-color: var(--btn-primary-hover) !important;
  filter: brightness(0.95);
}

.btn-theme-primary:active {
  filter: brightness(0.9);
}

.tab-theme-active {
  background-color: var(--btn-primary-bg) !important;
  color: var(--btn-primary-text) !important;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.badge-theme-subtle {
  background-color: var(--bg-surface-hover) !important;
  color: var(--color-primary) !important;
  border: 1px solid var(--border-color) !important;
}

.text-theme-primary {
  color: var(--color-primary) !important;
}
```

- [ ] **Step 2: Verificar a compilação do CSS e sintaxe**

Run: `npm run build --prefix frontend` ou `npm run test:frontend -- -t "ThemeContext"`
Expected: Compilação sem erros de CSS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(theme): adicionar classes utilitarias semanticas para botoes, abas e badges"
```

---

### Task 2: Gerador de Paleta Harmônica e Hierarquia de Cores no `AutoChartRenderer`

**Files:**
- Modify: `frontend/src/components/charts/AutoChartRenderer.jsx`
- Test: `frontend/src/components/charts/AutoChartRenderer.test.jsx`

**Interfaces:**
- Consumes: `useTheme()` do `frontend/src/context/ThemeContext.jsx`.
- Produces: `gerarPaletaTema(temaAtual)` e hierarquia cromática integrada nos componentes de `BarChart`, `LineChart`, `AreaChart` e `PieChart`.

- [ ] **Step 1: Escrever os testes unitários com falha para o `AutoChartRenderer` consumindo tema**

Em `frontend/src/components/charts/AutoChartRenderer.test.jsx`:
- Adicionar teste validando que uma série de receita utiliza a cor primária do tema.
- Adicionar teste validando que gráfico de rosca de categorias utiliza a paleta gerada a partir do tema ativo.
- Adicionar teste validando que entradas e saídas mantêm `#10b981` e `#ef4444`.
- Adicionar teste validando que `cobrancas_status` mapeia `PAGO` para verde e `ATRASADO` para vermelho.

- [ ] **Step 2: Executar teste para verificar falha**

Run: `npm run test:frontend -- frontend/src/components/charts/AutoChartRenderer.test.jsx`
Expected: FAIL indicando que as cores ainda estão fixas em índigo (`#6366f1`).

- [ ] **Step 3: Implementar gerador de paleta harmônica e hierarquia em `AutoChartRenderer.jsx`**

- Importar `useTheme` de `../../context/ThemeContext`.
- Criar a função utilitária `gerarPaletaTema(tokens)`:
  - Extrai `primary` e `accent` (com fallbacks `#4f46e5` e `#f59e0b`).
  - Gera variações harmônicas HSL para completar 8 a 10 cores semânticas.
- Mapear status conhecidos de cobranças e orçamentos (`PAGO`, `APROVADO`, `CONCLUIDO` -> `#10b981`; `PENDENTE`, `EM_ANALISE` -> `#f59e0b`; `ATRASADO`, `RECUSADO`, `CANCELADO` -> `#ef4444`).
- No `BarChart`, `LineChart`, `AreaChart`:
  - Se for `entradas`/`saidas`, manter `#10b981` e `#ef4444`.
  - Se for `total_projetado`, `receita`, `valor`, `total`, `novos_clientes`, usar `primaryColor`.
  - Se for `cobrancas_previstas` / `agendamentos_previstos`, usar `primaryColor` e `accentColor`.
- No `PieChart` / `Donut`:
  - Se o item tiver `entry.status`, aplicar a cor semântica do status se existente; caso contrário, aplicar `palette[index % palette.length]`.

- [ ] **Step 4: Executar testes unitários do `AutoChartRenderer`**

Run: `npm run test:frontend -- frontend/src/components/charts/AutoChartRenderer.test.jsx`
Expected: PASS com 100% dos testes aprovados.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/charts/AutoChartRenderer.jsx frontend/src/components/charts/AutoChartRenderer.test.jsx
git commit -m "feat(charts): integrar paleta dinamica do tema ativo e hierarquia visual ao AutoChartRenderer"
```

---

### Task 3: Harmonização de Clientes e Serviços com o Tema do Sistema

**Files:**
- Modify: `frontend/src/pages/Clientes.jsx`
- Modify: `frontend/src/pages/Servicos.jsx`
- Test: `frontend/src/pages/Clientes.test.jsx`
- Test: `frontend/src/pages/Servicos.test.jsx`

**Interfaces:**
- Consumes: Classes `.btn-theme-primary`, `.badge-theme-subtle`, `.text-theme-primary` e variáveis CSS.
- Produces: Telas de Clientes e Serviços com botões de criação, abas, badges e preços unificados ao tema ativo.

- [ ] **Step 1: Ajustar `frontend/src/pages/Clientes.jsx`**
  - Botão "Novo Cliente" e botão do modal de criação: substituir `bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white` por `.btn-theme-primary`.
  - Ícone de cabeçalho e foco do input de busca: aplicar `var(--color-primary)` em vez de `text-indigo-600` e anel índigo estático.
  - Botão vazio "Adicionar Primeiro Cliente": `.btn-theme-primary`.

- [ ] **Step 2: Ajustar `frontend/src/pages/Servicos.jsx`**
  - Botão "Novo Serviço", "Nova Assinatura" e botões dos modais de submissão: `.btn-theme-primary`.
  - Abas ativas de alternância (Serviços Avulsos / Assinaturas Recorrentes): aplicar `var(--color-primary)` na borda e texto ativo.
  - Badges de periodicidade (Mensal, Trimestral, Anual): `.badge-theme-subtle`.
  - Preços em destaque nos cards e tabela: `style={{ color: 'var(--color-primary)' }}`.

- [ ] **Step 3: Executar testes de Clientes e Serviços**

Run: `npm run test:frontend -- frontend/src/pages/Clientes.test.jsx frontend/src/pages/Servicos.test.jsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Clientes.jsx frontend/src/pages/Servicos.jsx
git commit -m "feat(ui): harmonizar botoes, badges e precos das telas de Clientes e Servicos com o tema"
```

---

### Task 4: Harmonização de Agenda de Atendimentos e Orçamentos

**Files:**
- Modify: `frontend/src/pages/Agenda.jsx`
- Modify: `frontend/src/pages/Orcamentos.jsx`
- Test: `frontend/src/pages/Agenda.test.jsx`
- Test: `frontend/src/pages/Orcamentos.test.jsx`

**Interfaces:**
- Consumes: Classes utilitárias e variáveis CSS do tema.
- Produces: Telas de Agenda e Orçamentos com botões de agendamento/orçamento, abas e tags de status alinhadas ao tema.

- [ ] **Step 1: Ajustar `frontend/src/pages/Agenda.jsx`**
  - Botão "Novo Agendamento" e botão do modal de submissão: `.btn-theme-primary`.
  - Abas de visualização de calendário / lista (aba ativa): `.tab-theme-active`.
  - Ícones e destaques de horário: substituir `text-indigo-600` por `var(--color-primary)`.
  - Badges de código identificador: `.badge-theme-subtle`.

- [ ] **Step 2: Ajustar `frontend/src/pages/Orcamentos.jsx`**
  - Botão "Novo Orçamento" e botão do modal: `.btn-theme-primary`.
  - Abas de filtro por status (Todas, Rascunho, Enviado, etc.): aba selecionada com `.tab-theme-active`.
  - Destaque do valor total do orçamento e botões de ação secundária: `.btn-theme-primary` ou `style={{ color: 'var(--color-primary)' }}`.

- [ ] **Step 3: Executar testes de Agenda e Orçamentos**

Run: `npm run test:frontend -- frontend/src/pages/Agenda.test.jsx frontend/src/pages/Orcamentos.test.jsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Agenda.jsx frontend/src/pages/Orcamentos.jsx
git commit -m "feat(ui): harmonizar botoes de acao, abas e destaques da Agenda e Orcamentos"
```

---

### Task 5: Harmonização de Cobranças, Livro Caixa e Notas Fiscais

**Files:**
- Modify: `frontend/src/pages/Cobrancas.jsx`
- Modify: `frontend/src/pages/Caixa.jsx`
- Modify: `frontend/src/pages/NotasFiscais.jsx`
- Test: `frontend/src/pages/Financeiro.test.jsx`
- Test: `frontend/src/pages/NotasFiscais.test.jsx`

**Interfaces:**
- Consumes: Classes semânticas `.btn-theme-primary`, `.tab-theme-active` e variáveis de tema.
- Produces: Módulos financeiros e fiscal com ações principais uniformes, mantendo rigorosamente verde e vermelho para receitas/despesas.

- [ ] **Step 1: Ajustar `frontend/src/pages/Cobrancas.jsx`**
  - Botão "Nova Cobrança" e botões de salvar modal: `.btn-theme-primary`.
  - Abas de status ativas: `.tab-theme-active`.
  - Botão de confirmação de recebimento (manter verde semântico `bg-emerald-600`).

- [ ] **Step 2: Ajustar `frontend/src/pages/Caixa.jsx`**
  - Botão "Novo Lançamento": `.btn-theme-primary`.
  - Manter rigorosamente os botões de tipo: "Nova Entrada" (`bg-emerald-600`) e "Nova Saída" (`bg-rose-600`).
  - Badges de categorias e filtros de período: aplicar variáveis de tema para foco e seleção.

- [ ] **Step 3: Ajustar `frontend/src/pages/NotasFiscais.jsx`**
  - Botão "Emitir Nova Nota" e botões de submissão: `.btn-theme-primary`.
  - Abas de tipo de nota fiscal (Todas, NFS-e, NF-e): aba ativa com `.tab-theme-active`.
  - Ações de download/visualização: `var(--color-primary)`.

- [ ] **Step 4: Executar testes de Financeiro e Notas Fiscais**

Run: `npm run test:frontend -- frontend/src/pages/Financeiro.test.jsx frontend/src/pages/NotasFiscais.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Cobrancas.jsx frontend/src/pages/Caixa.jsx frontend/src/pages/NotasFiscais.jsx
git commit -m "feat(ui): harmonizar acoes e abas em Cobrancas, Caixa e Notas Fiscais preservando cores semanticas"
```

---

### Task 6: Harmonização de Configurações e Verificação de Regressão Global

**Files:**
- Modify: `frontend/src/pages/Configuracoes.jsx`
- Test: `frontend/src/pages/Configuracoes.test.jsx`
- Test: Suíte completa (`npm run test:frontend`)

**Interfaces:**
- Consumes: Classes utilitárias do tema.
- Produces: Tela de configurações 100% compatível e verificação de integridade de todos os testes do frontend.

- [ ] **Step 1: Ajustar `frontend/src/pages/Configuracoes.jsx`**
  - Botões de salvar dados do MEI, certificados e configurações fiscais: `.btn-theme-primary`.
  - Abas de navegação lateral (Dados do MEI, Tema, Fiscal SEFAZ, etc.): item ativo com fundo e texto do tema (`var(--color-primary)` / `var(--bg-surface-hover)`).
  - Badges informativos de tema ativo e status de certificado: `.badge-theme-subtle`.

- [ ] **Step 2: Executar testes de Configurações**

Run: `npm run test:frontend -- frontend/src/pages/Configuracoes.test.jsx`
Expected: PASS.

- [ ] **Step 3: Executar a suíte completa de testes do frontend**

Run: `npm run test:frontend`
Expected: PASS com 0 falhas em todos os testes.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Configuracoes.jsx
git commit -m "feat(ui): harmonizar tela de Configuracoes e finalizar integracao global de temas"
```

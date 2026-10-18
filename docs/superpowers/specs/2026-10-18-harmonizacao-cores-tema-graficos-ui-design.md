# Especificação Técnica: Harmonização de Cores dos Gráficos e UI com o Tema do Sistema (Aranduê MEI)

**Data:** 18 de Outubro de 2026  
**Status:** Em Revisão (Builder Check)  
**Escopo:** Frontend (`frontend/src/components/charts/`, `frontend/src/context/`, `frontend/src/pages/`, `frontend/src/index.css`)

---

## 1. Visão Geral e Intenção (O "Porquê")

O sistema Aranduê MEI possui um robusto motor de temas dinâmicos (`ThemeContext.jsx`) com persistência, importação/exportação e geração de temas via IA. Contudo, diversas áreas do frontend continuam utilizando cores estáticas ou hardcoded (em especial o tom índigo `#6366f1` / `bg-indigo-600`):
1. **Gráficos e Dashboards (`AutoChartRenderer.jsx`):** Utilizam uma constante fixa `PALETTE_COLORS` e atributos de preenchimento (`fill="#6366f1"`, `stroke="#6366f1"`), desconsiderando o tema ativo escolhido pelo usuário.
2. **Listagens, Ações e Badges:** Páginas essenciais de gestão (`Clientes`, `Serviços e Assinaturas`, `Agenda de Atendimentos`, `Orçamentos`, `Cobranças`, `Livro Caixa`, `Notas Fiscais` e `Configurações`) apresentam botões de criação ("Novo..."), preços, abas e badges com classes Tailwind fixas (`bg-indigo-600`, `text-indigo-600`, etc.), que não acompanham temas personalizados, temas escuros ou temas corporativos.

Alterar as configurações estáticas diretamente no banco de dados (`dashboards` / `widgets`) seria complexo, frágil e exigiria migrações desnecessárias. A solução arquitetural ideal é **estabelecer uma hierarquia de estilos e paletas no frontend**, onde as propriedades do tema ativo sobrepõem as cores padrão, garantindo harmonia estética imediata em todo o sistema.

---

## 2. Objetivos, Não-Objetivos e Anti-Objetivos

### 2.1 Objetivos
- **Hierarquia Dinâmica para Gráficos:** No `AutoChartRenderer.jsx`, aplicar dinamicamente a paleta de cores originada do tema ativo (tokens `primary`, `accent`, e derivações harmônicas de luminosidade/matiz), sobrepondo cores genéricas ou configurações salvas no banco.
- **Preservação de Métricas Semânticas:** Manter inalteradas as cores funcionais de saúde financeira:
  - Entradas / Receitas / Margem Segura: Tons de Verde/Esmeralda (`#10b981`, `tokens.status.success`).
  - Saídas / Despesas / Vencidos / Desenquadramento: Tons de Vermelho/Rose (`#ef4444`, `tokens.status.danger`).
  - Pendências / Atenção ao Teto MEI: Tons de Âmbar/Amarelo (`#f59e0b`, `tokens.status.warning`).
- **Harmonização de Botões de Ação Primária:** Padronizar todos os botões de ação principal ("Novo Cliente", "Novo Serviço", "Novo Agendamento", "Novo Orçamento", "Nova Cobrança", "Novo Lançamento", "Emitir Nota", "Salvar Configurações", etc.) para consumirem as variáveis de tema (`--btn-primary-bg`, `--btn-primary-text`, `--btn-primary-hover`).
- **Harmonização de Badges, Preços e Textos de Destaque:** Adequar badges de status neutros/informativos, badges de periodicidade, rótulos de preços e abas ativas nas 8 páginas especificadas, consumindo tokens do tema (`--color-primary`, `--color-accent`, `--bg-surface-hover`, `--border-color`, `--text-main`, etc.).
- **Garantia de Acessibilidade (WCAG 2.1):** Assegurar contraste mínimo de 4.5:1 em todos os botões e textos destacados, tanto no modo claro quanto escuro.

### 2.2 Não-Objetivos
- **Alterações no Schema ou Dados do Banco de Dados:** Não modificar tabelas MySQL (`dashboards`, `widgets`, `temas_usuario`) nem executar scripts de migração de dados.
- **Alteração de Regras de Negócio ou Rotas Backend:** A lógica REST e MCP permanece 100% inalterada.
- **Alteração nos KPIs Semânticos:** Os cartões de métricas financeiras não serão forçados para a cor primária do tema se isso comprometer a leitura semântica de positivo/negativo.

### 2.3 Anti-Objetivos
- **Substituir um Hardcode por Outro:** Não substituir `bg-indigo-600` por outra cor estática (como `bg-blue-600`); todos os pontos devem obrigatoriamente se vincular às variáveis CSS ou tokens do `ThemeContext`.
- **Degradar Contraste em Temas Escuros:** Não utilizar textos escuros sobre botões primários escuros ou fundos sem contraste testado.

---

## 3. Arquitetura de Cores e Hierarquia nos Gráficos

### 3.1 Nível de Hierarquia para Gráficos (`AutoChartRenderer.jsx`)
Ao renderizar qualquer série de dados ou fatia de gráfico (barras, linhas, áreas, roscas, pizzas):
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. COR SEMÂNTICA RESERVADA (Máxima Prioridade)                              │
│    - Entradas -> #10b981 / status.success                                   │
│    - Saídas   -> #ef4444 / status.danger                                    │
│    - Termômetro MEI / Alertas -> Verde, Âmbar, Vermelho (conforme faixa)    │
│    - Status Financeiros em Rosca/Pizza:                                     │
│      * PAGO / APROVADO / CONCLUIDO   -> #10b981 (Verde)                     │
│      * PENDENTE / EM_ANALISE / AGEND -> #f59e0b (Âmbar)                     │
│      * ATRASADO / RECUSADO / CANCEL  -> #ef4444 (Vermelho)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. PALETA HARMÔNICA DO TEMA ATIVO (Prioridade Operacional)                  │
│    - Série Principal Analítica (Receita, Valor, Total, Novos Clientes)      │
│      -> tokens.primary do Tema Ativo                                        │
│    - Série Secundária / Projeções (Cobranças/Agendamentos Previstos)        │
│      -> tokens.accent ou Variação Harmônica do Tema                         │
│    - Categorias Gerais em Donut/Pie (ex: Despesas por Categoria, Serviços) │
│      -> Paleta Dinâmica gerada a partir de tokens.primary e tokens.accent   │
│         (escala de 8 a 10 tons harmônicos)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. CONFIGURAÇÃO EXPLÍCITA DO WIDGET (Caso não entre em conflito com tema)   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. FALLBACK PADRÃO                                                          │
│    - Paleta neutra de contingência                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Gerador de Paleta Harmônica de Gráficos
Em `frontend/src/components/charts/AutoChartRenderer.jsx` (ou utilitário de tema), a paleta de cores para gráficos de categorias (ex.: despesas por categoria, serviços mais vendidos) será derivada dinamicamente dos tokens do tema ativo:
- Cor 1: `tokens.primary`
- Cor 2: `tokens.accent`
- Cor 3: Variação análoga (+30° no matiz HSL da primária)
- Cor 4: Variação análoga (-30° no matiz HSL da primária)
- Cor 5: Acento saturado / complementar suave
- Cor 6: Variação tonal com luminosidade ajustada (L: 45% a 65%)

Isso assegura que ao mudar do tema "Claro Aranduê" (índigo) para "Esmeralda MEI" (verde esmeralda) ou "Noturno Corporativo" (dark slate), os gráficos adotem instantaneamente uma paleta perfeitamente orquestrada com o fundo e a identidade visual.

---

## 4. Padronização dos Componentes de Interface (UI)

### 4.1 Classes Utilitárias no `index.css`
Para evitar repetição de estilos inline ou acoplamento excessivo, serão consolidadas as classes utilitárias semânticas:
- `.btn-theme-primary`:
  - `background-color: var(--btn-primary-bg);`
  - `color: var(--btn-primary-text);`
  - Hover: `background-color: var(--btn-primary-hover);`
  - Foco: anel de foco baseado em `var(--color-primary)`.
- `.badge-theme-subtle`:
  - Fundo translúcido da cor primária ou `var(--bg-surface-hover)`.
  - Texto na cor `var(--color-primary)` com borda sutil `var(--border-color)`.
- `.text-theme-primary`:
  - `color: var(--color-primary);`

### 4.2 Mapeamento por Módulo

| Módulo | Elementos a Harmonizar | Padrão Atual (Hardcoded) | Novo Padrão (Harmonizado com Tema) |
|---|---|---|---|
| **Clientes** (`Clientes.jsx`) | - Botão "Novo Cliente"<br>- Badges de status (Ativo/Inativo)<br>- Ícones e foco de pesquisa | `bg-indigo-600 hover:bg-indigo-700`<br>`bg-emerald-50 text-emerald-700`<br>`text-indigo-600` | `.btn-theme-primary`<br>Badges semânticos acessíveis / `badge-theme-subtle`<br>`var(--color-primary)` |
| **Serviços** (`Servicos.jsx`) | - Botão "Novo Serviço"<br>- Botão "Criar Primeiro Serviço"<br>- Preços destacados (`R$ ...`)<br>- Badges de recorrência/status | `bg-indigo-600 hover:bg-indigo-700`<br>`bg-indigo-600`<br>`text-indigo-600`<br>`bg-indigo-50 text-indigo-700` | `.btn-theme-primary`<br>`.btn-theme-primary`<br>`var(--color-primary)` (ou contraste no tema)<br>`badge-theme-subtle` |
| **Agenda** (`Agenda.jsx`) | - Botão "Novo Agendamento"<br>- Abas/Filtros de data ativos<br>- Badges de status não-semânticos | `bg-indigo-600 hover:bg-indigo-700`<br>`bg-indigo-600 text-white`<br>Tons fixos índigo | `.btn-theme-primary`<br>Aba ativa com `var(--btn-primary-bg)`<br>`StatusBadge` integrado a tokens |
| **Orçamentos** (`Orcamentos.jsx`) | - Botão "Novo Orçamento"<br>- Botão de envio/aprovação<br>- Filtros ativos e destaques de total | `bg-indigo-600 hover:bg-indigo-700`<br>`bg-indigo-600`<br>`bg-indigo-600` | `.btn-theme-primary`<br>`.btn-theme-primary`<br>Total e abas respeitando variáveis de tema |
| **Cobranças** (`Cobrancas.jsx`) | - Botão "Nova Cobrança"<br>- Abas de filtro ativas<br>- Destaque de métricas não-semânticas | `bg-indigo-600 hover:bg-indigo-700`<br>`bg-indigo-600 text-white` | `.btn-theme-primary`<br>Abas ativas com `var(--btn-primary-bg)` |
| **Livro Caixa** (`Caixa.jsx`) | - Botão "Novo Lançamento"<br>- Botões de ação rápida e filtros<br>- *(Manter entradas verde e saídas vermelho)* | `bg-indigo-600 hover:bg-indigo-700` | `.btn-theme-primary`<br>Preservar rigorosamente semântica de receitas e despesas |
| **Notas Fiscais** (`NotasFiscais.jsx`) | - Botão "Nova Nota Fiscal"<br>- Filtros de tipo de nota ativos<br>- Ações de download/visualização | `bg-indigo-600 hover:bg-indigo-700`<br>`bg-indigo-600 text-white`<br>`text-indigo-600` | `.btn-theme-primary`<br>Filtro ativo com `var(--btn-primary-bg)`<br>`var(--color-primary)` |
| **Configurações** (`Configuracoes.jsx`) | - Botões de salvar/ação<br>- Abas laterais ativas<br>- Badges de módulo | `bg-indigo-600 hover:bg-indigo-700`<br>`text-indigo-600`<br>`bg-indigo-50 text-indigo-600` | `.btn-theme-primary`<br>Abas ativas com fundo e cor do tema<br>`badge-theme-subtle` |

---

## 5. Estratégia de Testes e Validação

1. **Testes Unitários de Renderização de Gráficos:**
   - Atualizar e expandir `AutoChartRenderer.test.jsx` para verificar que, na presença de um tema customizado (ex: cor primária `#059669` e acento `#d97706`), o gráfico de barras, linhas, roscas e áreas utilizam os tons do tema em vez do antigo padrão índigo.
   - Garantir que entradas e saídas continuam recebendo verde (`#10b981`) e vermelho (`#ef4444`).
2. **Testes de Contraste e Acessibilidade:**
   - Validar que botões e badges mantêm taxa de contraste $\ge 4.5:1$ em todos os 5 temas embutidos do sistema (incluindo temas escuros).
3. **Regressão da Suíte Global:**
   - Executar `npm run test:frontend` e `npm run test:backend` confirmando integridade total.

---

## 6. O que fica a cargo do Builder
- Detalhamento matemático preciso da conversão Hex ➔ HSL ➔ Variações de Matiz para o gerador de paleta em `AutoChartRenderer.jsx`.
- Escolha da sintaxe dos componentes (classes utilitárias em CSS vs inline styles com `var(...)`), priorizando clareza, manutenibilidade e performance de renderização.

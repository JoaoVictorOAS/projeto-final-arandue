# Instruções Globais do Agente de IA — Projeto Aranduê (MEI)

Este arquivo define os princípios arquiteturais, regras de conduta, diretrizes de segurança e padrões operacionais que todo Agente de IA (Google Antigravity / Gemini) deve seguir obrigatoriamente ao analisar, refatorar, testar ou estender este repositório.

---

## 🏛️ 1. Princípio Arquitetural Mestre: Paridade Total API REST ↔ MCP

> ⚠️ **REGRA FUNDAMENTAL E INEGOCIÁVEL DESTE PROJETO:**  
> O sistema é centralizado em uma arquitetura desacoplada **REST / MCP**.  
> **Tudo o que é possível realizar via API REST deve obrigatoriamente ser possível realizar via MCP (Model Context Protocol), e vice-versa para qualquer capacidade operacional do sistema.**

### 1.1 O Papel de Cada Camada
- **Backend Gateway Express (`backend/`):**
  - É a **Única Fonte da Verdade (Single Source of Truth - SSOT)** de regras de negócio, persistência relacional (MySQL), validações e isolamento multi-tenant.
  - Expõe as rotas RESTful protegidas por JWT (`/api/...`).
- **MCP Server (`ai-service/mcp_server/server.py`):**
  - Atua como a **ponte de integração operacional do Agente de IA**.
  - O servidor MCP **NUNCA** acessa o banco de dados (MySQL) diretamente.
  - Todas as ferramentas do MCP executam chamadas HTTP (`_fetch` / `_post`) contra a API REST do Backend Express, enviando o token JWT temporário da sessão (`TENANT_TOKEN` com escopo `assistente:access`).

### 1.2 Fluxos de Execução Espelhados
```
[Usuário Web / Mobile] ──(HTTP REST)──> [Backend Express] ──(SQL)──> [MySQL 8.x]
                                              ▲
[Usuário Chat] ──> [LLM / Gemini] ──> [MCP Tools] (HTTP REST via Scoped JWT)
```

### 1.3 Checklist Mandatório para Toda Nova Funcionalidade
Ao implementar qualquer nova feature, entidade, regra ou endpoint de negócio:
1. **Implementar no Backend REST:** Criar/modificar a rota, validação e controller em `backend/src/routes` e `backend/src/controllers`.
2. **Espelhar no MCP Server:** Criar ou atualizar imediatamente a ferramenta correspondente decorada com `@mcp_server_app.tool()` em `ai-service/mcp_server/server.py`.
3. **Paridade de Leitura e Escrita:** Se a API REST possui listagem, consulta detalhada ou mutação (cadastro, edição, baixa, agendamento), o MCP deve refletir essas mesmas ações em ferramentas especializadas.
4. **Tratamento Amigável de Erros:** O MCP deve consumir o retorno `{ "sucesso": false, "mensagem": ... }` da API REST e devolver mensagens claras para que a IA consiga explicar eventuais impedimentos ao usuário.

---

## 🔒 2. Multi-Tenancy e Segurança Corporativa

1. **Isolamento Absoluto por `usuario_id`:**
   - Nenhum registro pode ser compartilhado ou acessado entre MEIs distintos.
   - O `usuario_id` **NUNCA** deve ser recebido pelo payload do cliente ou como parâmetro das ferramentas MCP. O backend sempre extrai o ID do tenant a partir do JWT decodificado.
2. **Ferramentas MCP Sem Vazamento de Identidade:**
   - As assinaturas das funções no `ai-service/mcp_server/server.py` **NÃO expõem parâmetros como `usuario_id` ou `tenant_id`**. Isso previne vulnerabilidades de prompt injection em que um usuário tentaria forçar consultas aos dados de outra empresa.
3. **Comunicação Inter-Serviços:**
   - A rota de chat do backend para o FastAPI (`POST /chat`) exige autenticação via cabeçalho constante `X-Internal-Secret`.

---

## 🧠 3. Microserviço de IA & Dualidade RAG vs MCP

O assistente virtual opera sob duas vias distintas de especialização:
1. **Dúvidas Fiscais, Legais e Tributárias (RAG Semântico):**
   - Utiliza a base vetorial (`FallbackRetriever`) alimentada pelo PDF oficial do MEI (`docs/perguntaomei.pdf`).
   - Respeita o limiar estrito `RAG_MIN_SCORE = 0.865`. Se a pontuação semântica for menor, o RAG é descartado e o prompt não é poluído com legislação irrelevante.
   - Quando acionado, cita explicitamente as páginas de referência legais.
2. **Dados Operacionais e Ações Práticas do Negócio (MCP Tools):**
   - Saldo de caixa, clientes cadastrados, faturamento do mês, agendamentos, orçamentos e cobranças pendentes **NÃO vêm de RAG nem de alucinação**.
   - A IA **deve sempre** acionar a respectiva ferramenta MCP para obter os dados em tempo real ou executar o cadastro solicitado.

---

## 📁 4. Estrutura do Projeto e Responsabilidades

```
projeto-final-arandue/
├── backend/                 # API RESTful Node.js + Express + MySQL
│   ├── src/controllers/     # Lógica e regras de negócio
│   ├── src/routes/          # Definição dos endpoints REST
│   ├── src/middlewares/     # Auth JWT, Scoped Token Issuer e validações
│   └── tests/               # Suíte de testes Jest (> 180 testes)
├── ai-service/              # Microserviço Python FastAPI + Uvicorn
│   ├── mcp_server/          # Servidor MCP Multi-Tenant (server.py)
│   ├── mcp_pool.py          # Gerenciador de subprocessos stdio do MCP
│   ├── orchestrator.py      # Loop de Tool Calling e integração Gemini
│   ├── rag/                 # FallbackRetriever (ChromaDB / Firestore)
│   └── tests/               # Suíte de testes Pytest
├── frontend/                # SPA React 18 + Vite + Tailwind CSS
│   ├── src/components/      # Componentes de interface e Chat
│   └── src/pages/           # Telas de Gestão, Fluxo de Caixa, Agendamentos
└── docs/                    # Documentação técnica canônica
    ├── README.md            # Visão geral, portas, arquitetura e quickstart
    ├── api.md               # Contrato formal dos endpoints REST
    ├── regras-negocio.md    # Regras e restrições lógicas do sistema
    └── modelo-dados.md      # Esquema relacional das tabelas MySQL
```

---

## 🛠️ 5. Padrões de Código e Diretrizes de Engenharia

1. **Preservação de Integridade:** Não apague docstrings, comentários explicativos ou contratos já estabelecidos na documentação.
2. **Resiliência e Fallbacks:** O sistema conta com fallback vetorial e circuit breaker para serviços em nuvem; mantenha a compatibilidade local e desacoplada.
3. **Validação de Testes:** Sempre que modificar rotas ou ferramentas MCP, execute os testes relevantes:
   ```bash
   npm run test:backend   # Testes da API Express
   npm run test:ai        # Testes do microserviço FastAPI e MCP
   npm run test:frontend  # Testes do cliente React
   npm test               # Execução global da suíte completa
   ```
4. **Execução Local:** O projeto suporta orquestração paralela dos três nós via `npm run dev` na raiz.

---

## 📱 6. Plataforma Mobile (Capacitor) & Pipeline de Atualização de APK

O frontend SPA React foi adaptado para empacotamento mobile nativo utilizando **Capacitor (Ionic)** sob o ID de aplicativo `com.arandue.app`.

### 6.1 Script de Automação de Build e Sincronização Google Drive
Para compilar um novo APK sempre que houver atualizações na aplicação e enviá-lo diretamente para uma pasta sincronizada do Google Drive:

```bash
# Uso 1: Compilação e salvamento em dist-apk/
npm run mobile:apk

# Uso 2: Compilação e upload imediato para o Google Drive
./scripts/update_apk_drive.sh "/seu/caminho/do/GoogleDrive"

# Uso 3: Via variável de ambiente (ideal para pipelines/aliases)
export GOOGLE_DRIVE_PATH="/seu/caminho/do/GoogleDrive"
npm run mobile:apk
```

### 6.2 Fluxo de Execução do Script (`scripts/update_apk_drive.sh`)
1. **Ambiente:** Configura automaticamente `JAVA_HOME` (Java 21) e `ANDROID_HOME` (`~/Android/Sdk`).
2. **Build Web:** Gera os estáticos do React em `frontend/dist`.
3. **Sync Nativo:** Executa `npx cap sync android` transferindo os assets para a WebView nativa.
4. **Compilação Gradle:** Executa `./gradlew assembleDebug` dentro de `frontend/android`.
5. **Organização:** Salva em `dist-apk/` as versões `arandue-mei-latest.apk` e `arandue-mei-YYYYMMDD_HHMMSS.apk`.
6. **Deploy Google Drive:** Se o diretório de destino for informado e válido, copia automaticamente os APKs.

---

## 📐 7. Regras de Interface e Responsividade Adaptativa (Parágrafos & Popovers)

1. **Regra de Quebra de Parágrafos (`<AdaptiveParagraph />`):**
   - Se qualquer texto de parágrafo descritivo (`<p className="text-sm ...">`) quebrar para **3 ou mais linhas** devido à largura reduzida do dispositivo (smartphones, telas compactas ou split-screen), ele deve se transformar automaticamente em um **Popover interativo compacto**.
   - Em telas maiores onde o texto ocupa 1 ou 2 linhas, ele se renderiza normalmente como texto contínuo.
   - Utilize sempre o componente canônico [`frontend/src/components/AdaptiveParagraph.jsx`](file:///home/joaovictor/Documents/repositorios/recode-projeto-final/frontend/src/components/AdaptiveParagraph.jsx) nos cabeçalhos e seções informativas do sistema para manter a consistência e evitar que blocos de texto altos empurrem a interface móvel para baixo.

---

## 🎨 8. Sistema de Temas Dinâmicos & Consistência Visual (Tokens & Variáveis CSS)

> ⚠️ **REGRA MANDATÓRIA DE INTERFACE:**  
> **Antes de adicionar ou modificar qualquer elemento visual (badges, botões, cards, textos, bordas, ícones, logos, containers ou decorações), é OBRIGATÓRIO verificar como ele se encaixa na estrutura de temas dinâmicos do sistema.**

### 8.1 Proibição de Cores Estáticas / Hardcoded
- **NUNCA** utilize classes utilitárias com cores fixas (como `bg-indigo-50`, `text-indigo-700`, `bg-amber-200`, `text-emerald-600`, `border-gray-200`, etc.) em componentes e elementos da aplicação sem vinculá-los às variáveis CSS do tema ativo.
- Cores hardcoded quebram visualmente quando o usuário alterna entre temas (ex.: Claro, Noturno/Dark, Esmeralda, Oceano, Âmbar ou temas personalizados gerados pelo Assistente IA).

### 8.2 Tabela Canônica de Tokens e Variáveis CSS
Todo novo componente ou elemento de UI deve consumir diretamente as CSS Custom Properties definidas no `ThemeContext.jsx` e `index.css`:

| Propósito Visual | Variável CSS / Classe | Exemplo de Aplicação |
| :--- | :--- | :--- |
| **Fundo da Aplicação / Tela** | `var(--bg-app)` | `style={{ backgroundColor: 'var(--bg-app)' }}` |
| **Fundo de Superfície / Card** | `var(--bg-surface)` | `style={{ backgroundColor: 'var(--bg-surface)' }}` |
| **Fundo Interativo / Hover** | `var(--bg-surface-hover)` | `style={{ backgroundColor: 'var(--bg-surface-hover)' }}` |
| **Bordas e Divisórias** | `var(--border-color)` | `style={{ borderColor: 'var(--border-color)' }}` |
| **Texto Principal / Título** | `var(--text-main)` | `style={{ color: 'var(--text-main)' }}` |
| **Texto Secundário / Legendas** | `var(--text-secondary)` | `style={{ color: 'var(--text-secondary)' }}` |
| **Texto Mudo / Placeholders** | `var(--text-muted)` | `style={{ color: 'var(--text-muted)' }}` |
| **Cor Primária da Marca** | `var(--color-primary)` | `style={{ backgroundColor: 'var(--color-primary)' }}` |
| **Acentos / Destaques** | `var(--color-accent)` | `style={{ color: 'var(--color-accent)' }}` |
| **Fundo do Mascote / Logo** | `var(--logo-bg, var(--color-primary))` | `style={{ backgroundColor: 'var(--logo-bg, var(--color-primary))' }}` |
| **Badges / Selos Sutis** | `.badge-theme-subtle` | Utilizar a classe semântica ou `var(--bg-surface-hover)` + `var(--color-primary)` |
| **Botões Primários** | `.btn-theme-primary` | `var(--btn-primary-bg)` e `var(--btn-primary-text)` |

### 8.3 Checklist de Validação Visual
1. O elemento funciona com legibilidade e contraste adequados (WCAG) tanto no modo claro quanto no modo noturno (`dark`)?
2. Ao trocar para os temas padrão (`esmeralda-mei`, `oceano-indigo`, `ambar-cafe`, `noturno-corporativo`), o elemento herda automaticamente as cores corretas?
3. Se o elemento for um badge, sticker ou tag, ele utiliza `.badge-theme-subtle` ou `var(--color-primary)` / `var(--color-accent)` em vez de cores arbitrárias do Tailwind?




### 8.4 Exceções: Landing Page e Login (Isolados do Tema do Usuário)
- A **Landing Page** (`LandingPage.jsx`), assim como o **Login**, **NÃO segue** o tema dinâmico escolhido pelo usuário.
- A Landing é fixada no tema **coffee** (`ambar-cafe` — Âmbar & Café), aplicado via `applyThemeToDOM(TEMA_COFFEE_LANDING)` (exportado de `ThemeContext.jsx`) ao montar, restaurando o tema em cache (`arandue_tema_ativo`) ao desmontar.
- O Login permanece forçado em modo claro. Ao alterar essas telas, não vincule cores ao tema ativo do usuário.

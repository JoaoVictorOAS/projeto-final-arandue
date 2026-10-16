# Especificação Técnica: Sistema de Temas Dinâmicos e Geração Inteligente por IA (Aranduê MEI)

**Data:** 16 de Outubro de 2026  
**Status:** Aprovado em Brainstorming  
**Escopo:** Arquitetural (Frontend + Backend REST + MCP Server + AI-Service)  

---

## 1. Visão Geral e Objetivos

Atualmente, o sistema Aranduê MEI opera exclusivamente sob um tema claro com cores fixas (fundo cinza/branco e primária índigo). O objetivo desta especificação é transformar o sistema visual em um **Design System Dinâmico Multi-Tema**, permitindo:

1. **Seleção e Ativação de Temas:** Na tela de *Configurações ➔ Tema*, alternar com 1 clique entre temas da galeria do MEI (temas claros e escuros de alto contraste).
2. **Biblioteca de Temas do Usuário:** Armazenar múltiplos temas personalizados por MEI, além dos 5 temas canônicos do sistema.
3. **Upload e Exportação de Temas:** Fazer upload de arquivos `.json` de paletas com validação estrita de integridade e contraste, e exportar qualquer tema ativo para backup ou compartilhamento.
4. **Geração de Temas por IA via MCP & UI:** Uma ferramenta inteligente capaz de criar temas visualmente atraentes e acessíveis com base em descrições em linguagem natural (ex: *"Quero um tema escuro sofisticado com detalhes em cobre para uma barbearia retrô"*), validando matematicamente regras de **Teoria das Cores** (WCAG 2.1, 60-30-10, matizes opostas e escalas de cinza funcionais).
5. **Paridade Total REST ↔ MCP (`GEMINI.md`):** Todas as operações de listagem, ativação e geração estão disponíveis tanto via API REST quanto por ferramentas MCP invocadas pelo Assistente IA via chat ou voz.

---

## 2. Fundamentos da Teoria das Cores & Regras de Acessibilidade

O motor de temas e a IA seguem obrigatoriamente quatro pilares de design cromático:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   REGRAS DE TEORIA DAS CORES (ARANDUÊ)                 │
├───────────────────────┬────────────────────────────────────────────────┤
│ 1. Regra 60-30-10     │ 60% Fundo (bgApp), 30% Estrutura (bgSurface,   │
│                       │ border, textMain), 10% Destaque (primary,      │
│                       │ accent).                                       │
├───────────────────────┼────────────────────────────────────────────────┤
│ 2. Contraste WCAG 2.1 │ - Mínimo 7:1 (AAA) para texto principal.       │
│    (Luminância Real)  │ - Mínimo 4.5:1 (AA) para botões e CTAs.        │
│                       │ - Mínimo 3:1 para bordas e elementos focáveis. │
├───────────────────────┼────────────────────────────────────────────────┤
│ 3. Escalas de Cinza   │ Proibido preto puro (#000000) no Dark Mode.    │
│    Funcionais         │ Aplicação de "tinted neutrals" com 5-8% de     │
│    (Tinted Neutrals)  │ saturação da matiz base (slate, zinc, navy).   │
├───────────────────────┼────────────────────────────────────────────────┤
│ 4. Cores Opostas      │ O acento (accent) é calculado a 180° no espaço │
│    (Harmonia HSL)     │ HSL da cor primária, gerando contraste e foco  │
│                       │ imediato para alertas e badges.                │
└───────────────────────┴────────────────────────────────────────────────┘
```

### 2.1 Fórmula Matemática de Luminância e Razão de Contraste
Para qualquer par de cores em formato hexadecimal:
1. Normalizar canais RGB para $[0, 1]$: $C = V / 255$.
2. Correção gama sRGB:
   $$c = \begin{cases} \frac{C}{12.92}, & \text{se } C \le 0.03928 \\ \left(\frac{C + 0.055}{1.055}\right)^{2.4}, & \text{se } C > 0.03928 \end{cases}$$
3. Luminância Relativa ($L$):
   $$L = 0.2126 \cdot r + 0.7152 \cdot g + 0.0722 \cdot b$$
4. Razão de Contraste ($CR$):
   $$CR = \frac{\max(L_1, L_2) + 0.05}{\min(L_1, L_2) + 0.05}$$

---

## 3. Contrato Canônico dos Tokens de Tema (Schema JSON)

Todo tema no sistema possui o formato padronizado abaixo:

```json
{
  "$schema": "https://arandue.app/schemas/theme-v1.json",
  "id": "dark-corporativo",
  "nome": "Noturno Corporativo",
  "modo": "dark",
  "descricao": "Tema escuro profissional com foco em produtividade e leitura prolongada",
  "cores": {
    "bgApp": "#0f172a",
    "bgSurface": "#1e293b",
    "bgSurfaceHover": "#334155",
    "border": "#334155",
    "textMain": "#f8fafc",
    "textSecondary": "#94a3b8",
    "textMuted": "#64748b",
    "primary": "#6366f1",
    "primaryHover": "#4f46e5",
    "primaryText": "#ffffff",
    "accent": "#f59e0b",
    "status": {
      "success": "#10b981",
      "danger": "#ef4444",
      "warning": "#f59e0b",
      "info": "#3b82f6"
    }
  }
}
```

### 3.1 Temas Padrão Embutidos do Sistema (Seeds Canônicos)
1. **Claro Aranduê (Padrão Oficial):** Fundo `#f8fafc`, Superfície `#ffffff`, Primária `#4f46e5`, Acento `#f59e0b`.
2. **Noturno Corporativo (Dark Slate):** Fundo `#0f172a`, Superfície `#1e293b`, Primária `#6366f1`, Acento `#38bdf8`.
3. **Esmeralda MEI (Claro Sustentável):** Fundo `#f0fdf4`, Superfície `#ffffff`, Primária `#059669`, Acento `#d97706`.
4. **Oceano Índigo (Dark Navy Profundo):** Fundo `#0b1329`, Superfície `#152244`, Primária `#3b82f6`, Acento `#f97316`.
5. **Âmbar & Café (Quente Artesanal):** Fundo `#faf5ee`, Superfície `#ffffff`, Primária `#b45309`, Acento `#0284c7`.

---

## 4. Arquitetura do Banco de Dados (MySQL)

### 4.1 Tabela `temas_usuario`
```sql
CREATE TABLE IF NOT EXISTS temas_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    modo ENUM('light', 'dark') NOT NULL DEFAULT 'light',
    descricao VARCHAR(255) NULL,
    eh_ativo TINYINT(1) NOT NULL DEFAULT 0,
    eh_sistema TINYINT(1) NOT NULL DEFAULT 0,
    origem ENUM('SISTEMA', 'UPLOAD', 'IA', 'CUSTOMIZADO') NOT NULL DEFAULT 'CUSTOMIZADO',
    tokens JSON NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_temas_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_temas_usuario (usuario_id),
    INDEX idx_temas_ativo (usuario_id, eh_ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 5. Especificação da API REST Backend (`backend/`)

Todas as rotas são protegidas por autenticação JWT via `authMiddleware`. O `usuario_id` é rigorosamente extraído do token decodificado (`req.usuario.id`).

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/configuracoes/temas` | Lista todos os temas da biblioteca do MEI + temas do sistema, indicando o tema ativo. |
| `PUT` | `/api/configuracoes/temas/:id/ativar` | Define o tema especificado como ativo, inativando os demais. |
| `POST` | `/api/configuracoes/temas` | Cadastra um tema manual com tokens JSON validados. |
| `POST` | `/api/configuracoes/temas/upload` | Processa upload de arquivo `.json` ou payload com validação WCAG e cadastra na biblioteca. |
| `POST` | `/api/configuracoes/temas/gerar-ia` | Gera e cadastra um tema a partir de uma descrição textual aplicando as regras de cores. |
| `DELETE` | `/api/configuracoes/temas/:id` | Remove um tema customizado (temas com `eh_sistema = 1` retornam 403 Forbidden). |

---

## 6. Microserviço de IA & Ferramentas MCP (`ai-service/`)

### 6.1 Ferramentas MCP em `ai-service/mcp_server/server.py`
Espelhando 100% da API REST conforme `GEMINI.md`:

1. **`listar_temas() -> Dict[str, Any]`**
   - Executa `GET /configuracoes/temas` com o JWT da sessão.
   - Retorna a lista de temas e identifica o tema em vigor.

2. **`ativar_tema(tema_id_ou_nome: str) -> Dict[str, Any]`**
   - Localiza o tema na biblioteca e executa `PUT /configuracoes/temas/:id/ativar`.
   - Confirma a alteração visual com mensagem contextualizada.

3. **`gerar_tema_ia(descricao: str, modo: Optional[str] = "dark", cor_base_hex: Optional[str] = None) -> Dict[str, Any]`**
   - Executa a síntese cromática aplicando:
     - Extração ou geração de cor primária a partir da descrição.
     - Cálculo da matiz oposta a $180^\circ$ para a cor de acento (`accent`).
     - Geração de fundo e superfícies com *tinted neutrals* respeitando a proporção 60-30-10.
     - Validação matemática de contraste WCAG 2.1 AA/AAA ($\ge 4.5:1$ e $\ge 7:1$).
   - Persiste e ativa via `POST /configuracoes/temas/gerar-ia`.
   - Retorna o resumo das cores e índice de contraste atingido.

### 6.2 Diretrizes no `SYSTEM_PROMPT` (`ai-service/app/llm/prompts.py`)
- Instruções dedicadas para reconhecer intenções estéticas do MEI (ex: *"quero tela escura"*, *"deixa o sistema verde"*).
- Obrigatoriedade de chamar a ferramenta MCP em vez de fingir memorização.
- Explicação acessível sobre a harmonia das cores escolhidas para o ramo do usuário.

---

## 7. Frontend Architecture (`frontend/`)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND THEME ENGINE                           │
├────────────────────────────────────────────────────────────────────────┤
│ 1. ThemeContext                                                        │
│    - Leitura síncrona do LocalStorage no carregamento (Zero FOUC).     │
│    - Injeção das variáveis CSS no document.documentElement (:root).    │
│    - Alternância dinâmica da classe 'dark' no <html>.                  │
│    - Sincronização em background com a API REST.                       │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Componentes Globais Adaptados                                       │
│    - Layout.jsx: Fundo geral usa var(--bg-app).                        │
│    - Sidebar.jsx & Navbar.jsx: Superfícies usam var(--bg-surface),     │
│      bordas usam var(--border-color), textos usam var(--text-main).    │
│    - Transições suaves: transition-colors duration-200.                │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Tela de Configurações ➔ Seção "🎨 Aparência & Temas"                │
│    - Grid de Cartões de Temas com paleta visual e badge WCAG.          │
│    - Gerador com IA: Campo de prompt + botão + Mini Live Preview.      │
│    - Importador JSON (Upload) com feedback imediato.                   │
│    - Exportador JSON (Download com 1 clique).                          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Estratégia de Testes e Validação

1. **Backend Tests (Jest):**
   - Teste de listagem com injeção automática de temas padrão (*seed*).
   - Teste de criação e ativação com isolamento multi-tenant.
   - Teste de upload com arquivo JSON válido e rejeição de JSON corrompido ou sem contraste mínimo.
   - Proteção de exclusão de temas do sistema (`eh_sistema = 1`).
2. **AI-Service Tests (Pytest):**
   - Teste unitário do motor cromático de contraste WCAG e cores opostas.
   - Teste das ferramentas MCP `listar_temas`, `ativar_tema` e `gerar_tema_ia` simulando chamadas HTTP contra a API REST mockada.
3. **Frontend Tests (Vitest):**
   - Teste do `ThemeContext` aplicando e persistindo variáveis CSS no DOM.
   - Teste de renderização da seção de temas em `Configuracoes.jsx`.

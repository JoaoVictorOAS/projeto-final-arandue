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

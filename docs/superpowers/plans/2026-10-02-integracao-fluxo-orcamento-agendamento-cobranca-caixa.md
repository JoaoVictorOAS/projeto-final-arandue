# Integração do Fluxo Ponta a Ponta: Orçamento ➔ Agendamento ➔ Cobrança ➔ Caixa — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar os módulos de Orçamentos, Agenda, Cobranças e Livro Caixa em um pipeline estrito e auditável onde toda receita de clientes nasce em um Orçamento Aprovado, passa pela execução em um Agendamento Concluído, gera uma Cobrança com valor travado e é liquidada automaticamente como Entrada no Livro Caixa.

**Architecture:** Modelagem relacional forte no MySQL InnoDB com chaves estrangeiras (`agendamentos.orcamento_id` e `cobrancas.agendamento_id`), validações transacionais ACID nos serviços do backend garantindo consistência e isolamento multi-tenant, e interface React reativa com ações sequenciais de 1 clique e badges visuais de rastreabilidade do ciclo de vida.

**Tech Stack:** Node.js, Express, MySQL 8 (mysql2/promise), React 18, React Router v6, Tailwind CSS, Lucide React, Jest, Supertest, Vitest, Testing Library.

**Spec:** [`docs/superpowers/specs/2026-10-02-integracao-fluxo-orcamento-agendamento-cobranca-caixa-design.md`](file:///home/JoaoVictor/projetos/projeto-final-arandue/docs/superpowers/specs/2026-10-02-integracao-fluxo-orcamento-agendamento-cobranca-caixa-design.md)

## Global Constraints

- Padrão uniforme de resposta da API: `{ "sucesso": boolean, "mensagem": string, "dados": any }`.
- Segurança Multi-tenant estrita: toda leitura, escrita e verificação de chave estrangeira deve conter `WHERE usuario_id = ?`.
- Integridade transacional: a baixa de cobrança e a geração da movimentação de entrada no Livro Caixa devem ocorrer na mesma transação SQL (`BEGIN ... COMMIT / ROLLBACK`).
- Sem regressões: os 170 testes automatizados existentes (ou suas suítes atualizadas para o novo contrato estrito) devem continuar passando 100%.

---

### Task 1: Migração do Banco de Dados e Atualização de Seeds

**Files:**
- Modify: `backend/src/database/schema.sql`
- Create: `backend/src/database/migrations/002_fluxo_integrado.sql`
- Modify: `backend/src/database/seed.js`
- Test: `backend/tests/database.test.js`

**Interfaces:**
- Consumes: Definições DDL do MySQL InnoDB.
- Produces: Tabelas `agendamentos` com `orcamento_id INT NOT NULL` e `cobrancas` com `agendamento_id INT NOT NULL` e `orcamento_id INT NOT NULL`.

- [ ] **Step 1: Criar o script de migração SQL**

Crie o arquivo `backend/src/database/migrations/002_fluxo_integrado.sql`:
```sql
-- Migração 002: Vinculação estrita do fluxo Orçamento -> Agendamento -> Cobrança -> Caixa

-- 1. Alterações na tabela agendamentos
ALTER TABLE agendamentos 
    ADD COLUMN orcamento_id INT NULL AFTER cliente_id;

-- 2. Alterações na tabela cobrancas
ALTER TABLE cobrancas 
    ADD COLUMN agendamento_id INT NULL AFTER cliente_id;

-- 3. Adição de chaves estrangeiras e índices
ALTER TABLE agendamentos
    ADD CONSTRAINT fk_agendamentos_orcamento FOREIGN KEY (orcamento_id) 
        REFERENCES orcamentos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD INDEX idx_agendamentos_orcamento (usuario_id, orcamento_id);

ALTER TABLE cobrancas
    ADD CONSTRAINT fk_cobrancas_agendamento FOREIGN KEY (agendamento_id) 
        REFERENCES agendamentos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD INDEX idx_cobrancas_agendamento (usuario_id, agendamento_id);
```

- [ ] **Step 2: Atualizar `backend/src/database/schema.sql` para novas instalações**

Em `backend/src/database/schema.sql`, ajuste as tabelas `agendamentos` e `cobrancas` para incluírem as novas colunas e constraints no DDL inicial.

- [ ] **Step 3: Atualizar `backend/src/database/seed.js` com a cadeia estrita**

Atualize `seed.js` para garantir que o fluxo de demonstração de `admin@mei.com` popule:
1. Orçamentos (Rascunho, Enviado, Aprovado)
2. Agendamentos vinculados aos orçamentos aprovados (`orcamento_id`)
3. Cobranças vinculadas aos agendamentos concluídos (`agendamento_id` e `orcamento_id`)
4. Movimentações geradas a partir das cobranças pagas (`cobranca_id`).

- [ ] **Step 4: Executar a migração e rodar o seed**

```bash
node -e "
const pool = require('./backend/src/config/database');
async function run() {
  try {
    await pool.query('ALTER TABLE agendamentos ADD COLUMN orcamento_id INT NULL AFTER cliente_id');
  } catch (e) {}
  try {
    await pool.query('ALTER TABLE cobrancas ADD COLUMN agendamento_id INT NULL AFTER cliente_id');
  } catch (e) {}
  try {
    await pool.query('ALTER TABLE agendamentos ADD CONSTRAINT fk_agendamentos_orcamento FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE RESTRICT ON UPDATE CASCADE');
  } catch (e) {}
  try {
    await pool.query('ALTER TABLE cobrancas ADD CONSTRAINT fk_cobrancas_agendamento FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE RESTRICT ON UPDATE CASCADE');
  } catch (e) {}
  console.log('Migração concluída com sucesso');
  process.exit(0);
}
run();
"
npm run db:seed
```

- [ ] **Step 5: Testar e commitar a migração**

```bash
npm run test:backend
git add backend/src/database/schema.sql backend/src/database/migrations/ backend/src/database/seed.js
git commit -m "feat(db): adiciona foreign keys para fluxo orcamento -> agendamento -> cobranca"
```

---

### Task 2: Backend — Regras de Negócio e Serviços Integrados

**Files:**
- Modify: `backend/src/services/agendamentoService.js`
- Modify: `backend/src/services/cobrancaService.js`
- Modify: `backend/src/services/orcamentoService.js`
- Create: `backend/tests/pipeline-financeiro.test.js`

**Interfaces:**
- Consumes: Pool MySQL, tabelas `orcamentos`, `agendamentos`, `cobrancas`, `movimentacoes`.
- Produces: Métodos `agendamentoService.criar`, `cobrancaService.criar`, `orcamentoService.obterPorId` com rastreabilidade ponta a ponta e travas de integridade.

- [ ] **Step 1: Escrever teste de integração de ponta a ponta (`tests/pipeline-financeiro.test.js`)**

Crie `backend/tests/pipeline-financeiro.test.js` cobrindo:
1. Criação do Orçamento ➔ Mudança de status para `APROVADO`.
2. Bloqueio de agendamento em orçamento não-aprovado (`status != 'APROVADO'`).
3. Agendamento com sucesso vinculado ao `orcamento_id`.
4. Bloqueio de cobrança em agendamento não-concluído (`status != 'CONCLUIDO'`).
5. Mudança do agendamento para `CONCLUIDO` ➔ Emissão da Cobrança herdando valor do orçamento.
6. Liquidação (`darBaixa`) gerando lançamento no Livro Caixa com vínculo.
7. Consulta do orçamento retornando a árvore de rastreabilidade completa.

- [ ] **Step 2: Executar o teste e verificar que falha**

```bash
npm --prefix backend test tests/pipeline-financeiro.test.js
```
Esperado: Fails com validação de `orcamento_id` e `agendamento_id`.

- [ ] **Step 3: Atualizar `agendamentoService.js`**

Implementar validações no método `criar`:
```javascript
// Exige orcamento_id obrigatório
if (!orcamento_id) {
  const erro = new Error('Todo agendamento deve ser vinculado a um orçamento aprovado.');
  erro.statusCode = 400;
  throw erro;
}

// Valida existência, pertencimento ao usuário e status APROVADO
const [orcRows] = await pool.execute(
  'SELECT id, cliente_id, status FROM orcamentos WHERE id = ? AND usuario_id = ?',
  [orcamento_id, usuario_id]
);
if (orcRows.length === 0) {
  const erro = new Error('Orçamento não encontrado.');
  erro.statusCode = 404;
  throw erro;
}
if (orcRows[0].status !== 'APROVADO') {
  const erro = new Error('Apenas orçamentos com status APROVADO podem ser agendados.');
  erro.statusCode = 400;
  throw erro;
}
```

- [ ] **Step 4: Atualizar `cobrancaService.js`**

Implementar validações no método `criar`:
```javascript
// Exige agendamento_id obrigatório
if (!agendamento_id) {
  const erro = new Error('Toda cobrança deve ser vinculada a um atendimento concluído.');
  erro.statusCode = 400;
  throw erro;
}

// Valida existência, pertencimento ao usuário e status CONCLUIDO
const [agRows] = await pool.execute(
  'SELECT id, cliente_id, orcamento_id, status FROM agendamentos WHERE id = ? AND usuario_id = ?',
  [agendamento_id, usuario_id]
);
if (agRows.length === 0) {
  const erro = new Error('Agendamento não encontrado.');
  erro.statusCode = 404;
  throw erro;
}
if (agRows[0].status !== 'CONCLUIDO') {
  const erro = new Error('Cobranças só podem ser emitidas para atendimentos concluídos.');
  erro.statusCode = 400;
  throw erro;
}

// Puxa o valor do orçamento vinculado
const [orcRows] = await pool.execute(
  'SELECT total FROM orcamentos WHERE id = ? AND usuario_id = ?',
  [agRows[0].orcamento_id, usuario_id]
);
const valorFinal = Number(orcRows[0]?.total || 0);
```

- [ ] **Step 5: Atualizar `orcamentoService.js` para retornar a trilha de auditoria**

No método `obterPorId` e `listar`, incluir subconsultas/joins para retornar:
```json
"fluxo": {
  "agendamento": { "id": 1, "data_hora": "...", "status": "CONCLUIDO" },
  "cobranca": { "id": 1, "valor": 250.0, "status": "PAGO" },
  "caixa": { "movimentacao_id": 1, "valor": 250.0 }
}
```

- [ ] **Step 6: Executar `tests/pipeline-financeiro.test.js` e verificar aprovação**

```bash
npm --prefix backend test tests/pipeline-financeiro.test.js
```
Esperado: 100% PASS.

- [ ] **Step 7: Commitar a camada de serviços**

```bash
git add backend/src/services/ backend/tests/pipeline-financeiro.test.js
git commit -m "feat(backend): implementa regras estritas de orcamento -> agendamento -> cobranca -> caixa"
```

---

### Task 3: Backend — Atualização dos Controllers e Suítes de Teste Legadas

**Files:**
- Modify: `backend/src/controllers/agendamentoController.js`
- Modify: `backend/src/controllers/cobrancaController.js`
- Modify: `backend/tests/agendamentos.test.js`
- Modify: `backend/tests/cobrancas.test.js`
- Modify: `backend/tests/e2e-jornada.test.js`

**Interfaces:**
- Consumes: Requisições HTTP da API REST.
- Produces: Respostas HTTP padronizadas com validação de payload estrito.

- [ ] **Step 1: Ajustar `agendamentoController.js` e `cobrancaController.js`**

Validar parâmetros recebidos no `req.body` repassando `orcamento_id` e `agendamento_id`.

- [ ] **Step 2: Atualizar as fixtures dos testes legados**

Atualizar `tests/agendamentos.test.js` e `tests/cobrancas.test.js` para que os dados de teste criem previamente o Orçamento Aprovado e o Agendamento Concluído correspondentes.

- [ ] **Step 3: Rodar todos os testes de backend**

```bash
npm run test:backend
```
Esperado: Todas as suítes passam (100%).

- [ ] **Step 4: Commitar ajustes de controllers e testes**

```bash
git add backend/src/controllers/ backend/tests/
git commit -m "test(backend): atualiza suites de teste para o pipeline financeiro integrado"
```

---

### Task 4: Frontend — Orçamentos e Agenda (`Orcamentos.jsx` & `Agenda.jsx`)

**Files:**
- Modify: `frontend/src/pages/Orcamentos.jsx`
- Modify: `frontend/src/pages/Agenda.jsx`
- Modify: `frontend/src/pages/Orcamentos.test.jsx`
- Modify: `frontend/src/pages/Agenda.test.jsx`

**Interfaces:**
- Consumes: `/api/orcamentos`, `/api/agendamentos`.
- Produces: Ações "Agendar Atendimento" e "Gerar Cobrança" na interface.

- [ ] **Step 1: Adicionar ação "Agendar Atendimento" em `Orcamentos.jsx`**

Quando o orçamento estiver com `status === 'APROVADO'`, renderizar o botão:
- Botão "Agendar Atendimento" (navega para `/agenda?orcamento_id=${orcamento.id}&cliente_id=${orcamento.cliente_id}` ou abre modal de agendamento rápido).
- Exibir badge com a etapa do fluxo (`Aprovado`, `Agendado`, `Cobrado`).

- [ ] **Step 2: Atualizar modal de criação em `Agenda.jsx`**

- Na tela de Agenda, ao criar um novo agendamento, adicionar campo seletor:
  - Dropdown **"Orçamento Aprovado"** exibindo orçamentos disponíveis do cliente.
  - Ao selecionar o orçamento, preenche automaticamente o cliente e o serviço.
- Na listagem de agendamentos:
  - Quando `status === 'CONCLUIDO'`: exibir botão em verde **"Gerar Cobrança"** (redirecionando para `/cobrancas?agendamento_id=${agendamento.id}`).

- [ ] **Step 3: Atualizar testes de frontend (`Orcamentos.test.jsx` e `Agenda.test.jsx`)**

Garantir que os mocks de teste forneçam os campos `orcamento_id` e verifiquem a exibição dos botões do fluxo.

- [ ] **Step 4: Executar testes de frontend**

```bash
npm --prefix frontend test src/pages/Orcamentos.test.jsx src/pages/Agenda.test.jsx
```
Esperado: PASS.

- [ ] **Step 5: Commitar mudanças em Orçamentos e Agenda**

```bash
git add frontend/src/pages/Orcamentos.jsx frontend/src/pages/Agenda.jsx frontend/src/pages/Orcamentos.test.jsx frontend/src/pages/Agenda.test.jsx
git commit -m "feat(frontend): integra acoes de agendamento em orcamentos e cobranca na agenda"
```

---

### Task 5: Frontend — Cobranças e Livro Caixa (`Cobrancas.jsx` & `Caixa.jsx`)

**Files:**
- Modify: `frontend/src/pages/Cobrancas.jsx`
- Modify: `frontend/src/pages/Caixa.jsx`
- Modify: `frontend/src/pages/Financeiro.test.jsx`

**Interfaces:**
- Consumes: `/api/cobrancas`, `/api/movimentacoes`.
- Produces: Emissão de cobrança travada ao atendimento e extrato com rastreabilidade total no caixa.

- [ ] **Step 1: Atualizar criação de cobrança em `Cobrancas.jsx`**

- Ao emitir nova cobrança, selecionar o **Atendimento Concluído**.
- O valor da proposta é travado (somente leitura), prevenindo discrepâncias entre o orçamento e a cobrança.
- Na listagem, exibir badges com link para o Agendamento e para o Orçamento.

- [ ] **Step 2: Atualizar exibição do Livro Caixa em `Caixa.jsx`**

- As movimentações de `ENTRADA` exibem a tag `Origem: Cobrança #X (Agendamento #Y)`.
- Remover botão de entrada manual de cliente (entradas ocorrem pela liquidação da cobrança).

- [ ] **Step 3: Atualizar testes em `Financeiro.test.jsx`**

Garantir que os testes de cobrança e caixa validem o fluxo integrado com sucesso.

- [ ] **Step 4: Executar testes**

```bash
npm --prefix frontend test src/pages/Financeiro.test.jsx
```
Esperado: PASS.

- [ ] **Step 5: Commitar camada financeira do frontend**

```bash
git add frontend/src/pages/Cobrancas.jsx frontend/src/pages/Caixa.jsx frontend/src/pages/Financeiro.test.jsx
git commit -m "feat(frontend): vincula emissao de cobrancas a atendimentos e rastreia entradas no caixa"
```

---

### Task 6: Validação Geral, Build e Atualização do Knowledge Graph

**Files:**
- Modify: `package.json`
- Update: `graphify-out/`

- [ ] **Step 1: Rodar a suíte completa de testes automatizados**

```bash
npm run test
```
Esperado: 100% de aprovação (todos os testes de backend e frontend passando).

- [ ] **Step 2: Executar build de produção do frontend**

```bash
npm run build:frontend
```
Esperado: Compilação Vite bem-sucedida sem erros.

- [ ] **Step 3: Atualizar o grafo de conhecimento com Graphify**

```bash
npm run graphify:update
```

- [ ] **Step 4: Commitar e enviar para o repositório remoto**

```bash
git add .
git commit -m "chore: finaliza integracao ponta a ponta do fluxo orcamento -> agenda -> cobranca -> caixa"
git push origin main
```

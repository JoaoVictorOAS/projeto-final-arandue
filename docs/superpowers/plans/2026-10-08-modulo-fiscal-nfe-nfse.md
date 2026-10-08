# Módulo Fiscal (NFS-e Nacional, NF-e 55 e NFC-e 65) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o subsistema fiscal do Aranduê para Microempreendedores Individuais (MEI), suportando emissão, consulta e cancelamento de NFS-e (Padrão Nacional), NF-e (Modelo 55) e NFC-e (Modelo 65), com paridade total REST ↔ MCP e emissão conversacional via Assistente de IA.

**Architecture:** Camada relacional MySQL com isolamento multi-tenant (`usuario_id`), Motor Fiscal nativo em Node.js Express gerando chaves SEFAZ de 44 dígitos com algoritmo Módulo 11, XML canônico (DPS e SEFAZ v4.00) e DANFE simplificado com lançamento financeiro automático, integrado ao Servidor MCP Python FastAPI e Orquestrador Gemini sem vazamento de identificadores de tenant.

**Tech Stack:** Node.js, Express, MySQL 8.x, Jest, Supertest, Python 3.12, FastAPI, MCP (Model Context Protocol), Pytest, Respx, Google GenAI SDK.

**Spec:** `docs/superpowers/specs/2026-10-08-modulo-fiscal-nfe-nfse-design.md`

## Global Constraints
- **Paridade Total:** Toda rota REST fiscal deve possuir ferramenta correspondente em `ai-service/mcp_server/server.py`.
- **Multi-Tenancy Estrito:** `usuario_id` extraído exclusivamente do JWT decodificado no backend; nunca aceito no payload nem exposto em ferramentas MCP.
- **SSOT Backend Express:** O banco de dados MySQL é acessado exclusivamente pelo Express. O MCP comunica-se apenas via chamadas HTTP contra a API REST com `TENANT_TOKEN`.
- **Compatibilidade:** Zero conflito com o módulo paralelo de estoque/produtos; referências a `servicos` e `clientes` devem ser anuláveis (aceitando emissão avulsa ad-hoc).
- **Regras do SIMEI:** Aplicação de CSOSN 102/400 e legendas legais obrigatórias do Simples Nacional, sem destaque individual de ICMS/ISS.

---

### Task 1: Migração de Banco de Dados (`005_modulo_fiscal.sql`) e Atualização de `schema.sql`

**Files:**
- Create: `backend/src/database/migrations/005_modulo_fiscal.sql`
- Modify: `backend/src/database/schema.sql`
- Test: `backend/tests/integration/migrationFiscal.test.js`

**Interfaces:**
- Produz: Tabelas `notas_fiscais` e `nota_fiscal_itens` no banco MySQL com chaves estrangeiras, índices e constraints.

- [ ] **Step 1: Write the failing test**
Criar `backend/tests/integration/migrationFiscal.test.js` verificando que a migração 005 cria com sucesso as tabelas `notas_fiscais` e `nota_fiscal_itens` com todas as colunas mandatórias.

```javascript
const pool = require('../../src/database/connection');
const fs = require('fs');
const path = require('path');

describe('Migração 005: Módulo Fiscal', () => {
  beforeAll(async () => {
    const migrationPath = path.join(__dirname, '../../src/database/migrations/005_modulo_fiscal.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await pool.query(stmt);
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('deve ter criado a tabela notas_fiscais com as colunas essenciais', async () => {
    const [columns] = await pool.query('SHOW COLUMNS FROM notas_fiscais');
    const columnNames = columns.map(c => c.Field);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('usuario_id');
    expect(columnNames).toContain('tipo');
    expect(columnNames).toContain('status');
    expect(columnNames).toContain('numero');
    expect(columnNames).toContain('serie');
    expect(columnNames).toContain('chave_acesso');
    expect(columnNames).toContain('protocolo_autorizacao');
    expect(columnNames).toContain('destinatario_documento');
    expect(columnNames).toContain('valor_total');
    expect(columnNames).toContain('valor_liquido');
    expect(columnNames).toContain('xml_gerado');
    expect(columnNames).toContain('link_danfe');
  });

  it('deve ter criado a tabela nota_fiscal_itens com as colunas essenciais', async () => {
    const [columns] = await pool.query('SHOW COLUMNS FROM nota_fiscal_itens');
    const columnNames = columns.map(c => c.Field);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('nota_fiscal_id');
    expect(columnNames).toContain('numero_item');
    expect(columnNames).toContain('descricao');
    expect(columnNames).toContain('quantidade');
    expect(columnNames).toContain('valor_unitario');
    expect(columnNames).toContain('valor_total');
    expect(columnNames).toContain('csosn');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Executar: `npm --prefix backend test tests/integration/migrationFiscal.test.js`
Esperado: FAIL (arquivo de migração inexistente).

- [ ] **Step 3: Write minimal implementation**
Criar `backend/src/database/migrations/005_modulo_fiscal.sql` com DDL completo e atualizar `backend/src/database/schema.sql`.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npm --prefix backend test tests/integration/migrationFiscal.test.js`
Esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add backend/src/database/migrations/005_modulo_fiscal.sql backend/src/database/schema.sql backend/tests/integration/migrationFiscal.test.js
git commit -m "feat(database): adicionar migracao e schema do modulo fiscal"
```

---

### Task 2: Motor Fiscal — Gerador de Chave de Acesso SEFAZ (`geradorChaveAcesso.js`)

**Files:**
- Create: `backend/src/services/fiscal/geradorChaveAcesso.js`
- Test: `backend/tests/unit/geradorChaveAcesso.test.js`

**Interfaces:**
- Produz: `function calcularDigitoVerificadorModulo11(chave43)` -> `string (1 digito)`
- Produz: `function gerarChaveAcesso({ cUF, anoMes, cnpj, modelo, serie, numero, tpEmis, codigoNumerico })` -> `string (44 digitos)`

- [ ] **Step 1: Write the failing test**
Criar `backend/tests/unit/geradorChaveAcesso.test.js` validando o cálculo do Módulo 11 (pesos de 2 a 9) e geração da chave de 44 dígitos com padding exato.

```javascript
const { calcularDigitoVerificadorModulo11, gerarChaveAcesso } = require('../../src/services/fiscal/geradorChaveAcesso');

describe('Gerador de Chave de Acesso SEFAZ (Módulo 11)', () => {
  it('deve calcular corretamente o dígito verificador módulo 11', () => {
    // Chave SEFAZ de 43 dígitos válida de teste (SP, mod 55)
    const base43 = '3523091234567800019555001000000001112345678';
    const dv = calcularDigitoVerificadorModulo11(base43);
    expect(dv).toBeDefined();
    expect(dv.length).toBe(1);
    expect(/\d/.test(dv)).toBe(true);
  });

  it('deve formatar chave de acesso completa com 44 dígitos numéricos', () => {
    const chave = gerarChaveAcesso({
      cUF: '35',
      anoMes: '2610',
      cnpj: '12.345.678/0001-95',
      modelo: '55',
      serie: 1,
      numero: 42,
      tpEmis: '1',
      codigoNumerico: '12345678'
    });

    expect(chave.length).toBe(44);
    expect(/^\d{44}$/.test(chave)).toBe(true);
    expect(chave.startsWith('3526101234567800019555001000000042112345678')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Executar: `npm --prefix backend test tests/unit/geradorChaveAcesso.test.js`
Esperado: FAIL (módulo inexistente).

- [ ] **Step 3: Write minimal implementation**
Implementar `backend/src/services/fiscal/geradorChaveAcesso.js` com limpeza de caracteres e ponderação Módulo 11 conforme manual SEFAZ.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npm --prefix backend test tests/unit/geradorChaveAcesso.test.js`
Esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add backend/src/services/fiscal/geradorChaveAcesso.js backend/tests/unit/geradorChaveAcesso.test.js
git commit -m "feat(fiscal): implementar gerador de chave de acesso SEFAZ modulo 11"
```

---

### Task 3: Motor Fiscal — Gerador de XML Canônico e DANFE Simplificado

**Files:**
- Create: `backend/src/services/fiscal/geradorXmlFiscal.js`
- Create: `backend/src/services/fiscal/geradorDanfeSimplificado.js`
- Test: `backend/tests/unit/geradorXmlEDanfe.test.js`

**Interfaces:**
- Produz: `function gerarXmlNfse({ dadosEmitente, dadosTomador, servico, valores, protocolo, numero, serie })` -> `string (XML DPS)`
- Produz: `function gerarXmlNfe({ chave, dadosEmitente, dadosDestinatario, itens, totais, protocolo, modelo, serie, numero })` -> `string (XML NFe)`
- Produz: `function gerarDanfeSimplificado({ nota, itens, emitente })` -> `string (HTML formatado e estruturado)`

- [ ] **Step 1: Write the failing test**
Criar `backend/tests/unit/geradorXmlEDanfe.test.js` validando que os XMLs contêm tags mandatórias e as legendas de MEI/Simples Nacional, e que o DANFE gera dados legíveis com protocolo e chave.

- [ ] **Step 2: Run test to verify it fails**
Executar: `npm --prefix backend test tests/unit/geradorXmlEDanfe.test.js`
Esperado: FAIL.

- [ ] **Step 3: Write minimal implementation**
Criar `backend/src/services/fiscal/geradorXmlFiscal.js` e `backend/src/services/fiscal/geradorDanfeSimplificado.js`.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npm --prefix backend test tests/unit/geradorXmlEDanfe.test.js`
Esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add backend/src/services/fiscal/geradorXmlFiscal.js backend/src/services/fiscal/geradorDanfeSimplificado.js backend/tests/unit/geradorXmlEDanfe.test.js
git commit -m "feat(fiscal): implementar gerador de XML padrao nacional e DANFE simplificado"
```

---

### Task 4: Motor Fiscal — Engine e Regras de Negócio (`fiscalEngine.js`)

**Files:**
- Create: `backend/src/services/fiscal/fiscalEngine.js`
- Test: `backend/tests/unit/fiscalEngine.test.js`

**Interfaces:**
- Produz: `async function emitirNfse(usuarioId, payload, connection = null)` -> `{ sucesso, nota, xml, danfe }`
- Produz: `async function emitirNfe(usuarioId, payload, connection = null)` -> `{ sucesso, nota, xml, danfe }`
- Produz: `async function emitirNfce(usuarioId, payload, connection = null)` -> `{ sucesso, nota, xml, danfe }`
- Produz: `async function cancelarNotaFiscal(usuarioId, notaId, motivo)` -> `{ sucesso, nota }`
- Produz: `async function consultarNotaFiscal(usuarioId, notaId)` -> `{ sucesso, nota, itens, danfe }`

- [ ] **Step 1: Write the failing test**
Criar `backend/tests/unit/fiscalEngine.test.js` testando emissão de NFS-e, emissão de NF-e com itens, lançamento financeiro em `movimentacoes` quando `gerar_caixa: true`, cancelamento com validação de motivo (>= 15 caracteres) e incremento sequencial atômico de numeração.

- [ ] **Step 2: Run test to verify it fails**
Executar: `npm --prefix backend test tests/unit/fiscalEngine.test.js`
Esperado: FAIL.

- [ ] **Step 3: Write minimal implementation**
Implementar `backend/src/services/fiscal/fiscalEngine.js` com controle transacional e integração com o livro caixa.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npm --prefix backend test tests/unit/fiscalEngine.test.js`
Esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add backend/src/services/fiscal/fiscalEngine.js backend/tests/unit/fiscalEngine.test.js
git commit -m "feat(fiscal): implementar motor fiscal transacional e integracao de caixa"
```

---

### Task 5: Endpoints REST — Controller, Rotas e Registro no Express

**Files:**
- Create: `backend/src/controllers/notaFiscalController.js`
- Create: `backend/src/routes/notaFiscalRoutes.js`
- Modify: `backend/src/app.js`
- Test: `backend/tests/integration/notasFiscais.test.js`

**Interfaces:**
- Rota: `POST /api/notas-fiscais/nfse`
- Rota: `POST /api/notas-fiscais/nfe`
- Rota: `POST /api/notas-fiscais/nfce`
- Rota: `GET /api/notas-fiscais`
- Rota: `GET /api/notas-fiscais/:id`
- Rota: `GET /api/notas-fiscais/:id/danfe`
- Rota: `POST /api/notas-fiscais/:id/cancelar`

- [ ] **Step 1: Write the failing test**
Criar `backend/tests/integration/notasFiscais.test.js` com testes de integração via Supertest:
  - Autenticação JWT exigida em todas as rotas
  - Emissão bem-sucedida de NFS-e, NF-e e NFC-e
  - Listagem com filtros por tipo e status
  - Obtenção do DANFE simplificado
  - Cancelamento com motivo válido e rejeição se motivo < 15 caracteres
  - Isolamento multi-tenant: garantir que usuário A não consulta nem cancela nota do usuário B.

- [ ] **Step 2: Run test to verify it fails**
Executar: `npm --prefix backend test tests/integration/notasFiscais.test.js`
Esperado: FAIL.

- [ ] **Step 3: Write minimal implementation**
Implementar `backend/src/controllers/notaFiscalController.js`, `backend/src/routes/notaFiscalRoutes.js` e registrar `app.use('/api/notas-fiscais', authMiddleware, notaFiscalRoutes)` em `backend/src/app.js`.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npm --prefix backend test tests/integration/notasFiscais.test.js`
Esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add backend/src/controllers/notaFiscalController.js backend/src/routes/notaFiscalRoutes.js backend/src/app.js backend/tests/integration/notasFiscais.test.js
git commit -m "feat(api): adicionar rotas REST e controller do modulo fiscal"
```

---

### Task 6: Ferramentas MCP no AI Service (`ai-service/mcp_server/server.py`)

**Files:**
- Modify: `ai-service/mcp_server/server.py`
- Create: `ai-service/tests/test_mcp_fiscal.py`

**Interfaces:**
- Produz Tools MCP:
  - `emitir_nfse_nacional(destinatario_nome, destinatario_documento, discriminacao_servico, valor, codigo_tributacao_nacional="01.07.01", destinatario_email="", gerar_caixa=True)`
  - `emitir_nfe_produtos(destinatario_nome, destinatario_documento, itens, natureza_operacao="Venda de mercadorias", gerar_caixa=True)`
  - `emitir_nfce_consumidor(itens, forma_pagamento="DINHEIRO", destinatario_cpf="", gerar_caixa=True)`
  - `listar_notas_fiscais(tipo=None, status=None, limite=20)`
  - `consultar_nota_fiscal(nota_id=None, chave_acesso=None)`
  - `cancelar_nota_fiscal(nota_id, motivo)`

- [ ] **Step 1: Write the failing test**
Criar `ai-service/tests/test_mcp_fiscal.py` testando:
  - Verificação de segurança de schema: nenhuma das novas ferramentas expõe `usuario_id` ou `tenant_id`.
  - Simulação de emissão de NFS-e, NF-e, NFC-e, listagem e cancelamento via mock HTTP (`respx`).
  - Tratamento de erro adequado quando a API REST retorna falha.

- [ ] **Step 2: Run test to verify it fails**
Executar: `.venv/bin/pytest ai-service/tests/test_mcp_fiscal.py`
Esperado: FAIL (ferramentas não registradas).

- [ ] **Step 3: Write minimal implementation**
Adicionar as 6 ferramentas decoradas com `@mcp_server_app.tool()` em `ai-service/mcp_server/server.py`.

- [ ] **Step 4: Run test to verify it passes**
Executar: `.venv/bin/pytest ai-service/tests/test_mcp_fiscal.py`
Esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add ai-service/mcp_server/server.py ai-service/tests/test_mcp_fiscal.py
git commit -m "feat(mcp): adicionar ferramentas MCP para emissao e gestao fiscal"
```

---

### Task 7: Diretrizes do Assistente no Prompt e Teste E2E da Emissão Conversacional

**Files:**
- Modify: `ai-service/app/llm/prompts.py`
- Test: `backend/tests/e2e-fiscal-assistente.test.js`

**Interfaces:**
- Atualiza: `SYSTEM_PROMPT` para instruir o Gemini a acionar ferramentas de emissão fiscal quando o MEI solicitar emissão de NFS-e, NF-e ou NFC-e.

- [ ] **Step 1: Write the failing test**
Criar `backend/tests/e2e-fiscal-assistente.test.js` validando o fluxo ponta a ponta: emissão fiscal via token com escopo `assistente:access`, garantindo que o assistente consegue emitir e consultar notas respeitando a segregação de tenants.

- [ ] **Step 2: Run test to verify it fails**
Executar: `npm --prefix backend test tests/e2e-fiscal-assistente.test.js`
Esperado: FAIL.

- [ ] **Step 3: Write minimal implementation**
Atualizar `SYSTEM_PROMPT` em `ai-service/app/llm/prompts.py` adicionando diretrizes fiscais e exemplos práticos para o MEI.

- [ ] **Step 4: Run all test suites to verify full pass**
Executar:
  - `npm run test:backend`
  - `npm run test:ai`
Esperado: Todos os testes passando com 100% de sucesso.

- [ ] **Step 5: Commit**
```bash
git add ai-service/app/llm/prompts.py backend/tests/e2e-fiscal-assistente.test.js
git commit -m "feat(llm): atualizar prompt do assistente e adicionar testes e2e fiscais"
```

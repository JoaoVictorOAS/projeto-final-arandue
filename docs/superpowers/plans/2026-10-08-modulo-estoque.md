# Plano de Implementação — Módulo de Estoque, Ficha Técnica e Simulação Produtiva

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o módulo de estoque e produção para pequenos empreendedores (com foco em gastronomia, salgados e alimentos), provendo controle de insumos em unidades reais (`g`, `ml`, `un`), fichas técnicas vinculadas ao catálogo de produtos, cálculo de custo e margem, integração nativa com vendas/orçamentos e livro caixa, motor de simulação de rendimento com identificação de gargalos, e paridade total de ferramentas MCP para o assistente de IA sem alterar a lógica de seleção de modelos.

**Architecture:** Módulo construído na camada de serviços do Node.js/Express (`backend/src/services/estoqueService.js`), repositórios dedicados para persistência transacional em MySQL, motor de cálculo desacoplado para conversões e simulação de capacidade produtiva, e espelhamento estrito de capacidades na API REST e no servidor MCP em Python (`ai-service/mcp_server/server.py`).

**Tech Stack:** Node.js, Express, MySQL 8 (mysql2), Jest, Supertest, Python 3.12, MCP SDK (FastMCP / MCPServer), pytest, httpx.

**Spec:** [2026-10-08-modulo-estoque-design.md](file:///home/JoaoVictor/projetos/projeto-final-arandue/docs/superpowers/specs/2026-10-08-modulo-estoque-design.md)

## Global Constraints
- Isolamento estrito de branches: Nenhum arquivo em `ai-service/app/llm/` ou variáveis de seleção de modelos pode ser modificado.
- Paridade API ↔ MCP: Toda rota exposta em `/api/estoque` deve possuir ferramenta equivalente em `ai-service/mcp_server/server.py`.
- Isolamento multi-tenant: Todas as consultas e mutações devem filtrar obrigatoriamente por `usuario_id`.
- Operações transacionais atômicas: A baixa de estoque decorrente de orçamentos ou compras vinculadas ao caixa deve utilizar transações no MySQL.

---

### Task 1: Banco de Dados — Migration do Esquema de Estoque

**Files:**
- Create: `backend/src/database/migrations/004_estoque.sql`
- Modify: `backend/src/database/schema.sql`
- Test: `backend/tests/integration/migrationEstoque.test.js`

**Interfaces:**
- Produces: Tabelas `insumos`, `fichas_tecnicas`, `estoque_movimentacoes` e colunas `controla_estoque_pronto`, `estoque_pronto_atual`, `estoque_pronto_minimo` em `servicos`.

- [ ] **Step 1: Escrever teste de integração para validar existência das tabelas após migração**

Criar arquivo `backend/tests/integration/migrationEstoque.test.js`:
```javascript
const pool = require('../../src/config/database');
const fs = require('fs');
const path = require('path');

describe('Migração 004 - Módulo de Estoque', () => {
  beforeAll(async () => {
    const migrationPath = path.resolve(__dirname, '../../src/database/migrations/004_estoque.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sql);
  });

  it('deve conter as tabelas insumos, fichas_tecnicas e estoque_movimentacoes', async () => {
    const [tables] = await pool.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME IN ('insumos', 'fichas_tecnicas', 'estoque_movimentacoes');
    `);
    const nomes = tables.map(t => t.TABLE_NAME);
    expect(nomes).toContain('insumos');
    expect(nomes).toContain('fichas_tecnicas');
    expect(nomes).toContain('estoque_movimentacoes');
  });

  it('deve conter as colunas de estoque pronto na tabela servicos', async () => {
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'servicos' 
        AND COLUMN_NAME IN ('controla_estoque_pronto', 'estoque_pronto_atual', 'estoque_pronto_minimo');
    `);
    const nomes = cols.map(c => c.COLUMN_NAME);
    expect(nomes).toContain('controla_estoque_pronto');
    expect(nomes).toContain('estoque_pronto_atual');
    expect(nomes).toContain('estoque_pronto_minimo');
  });
});
```

- [ ] **Step 2: Executar teste para verificar que falha antes da criação da migration**

Executar:
```bash
npm --prefix backend test -- backend/tests/integration/migrationEstoque.test.js
```
Resultado esperado: FALHA (arquivo `004_estoque.sql` inexistente).

- [ ] **Step 3: Criar script de migração `004_estoque.sql` e atualizar `schema.sql`**

Criar `backend/src/database/migrations/004_estoque.sql`:
```sql
-- Migração 004: Módulo de Estoque, Ficha Técnica e Movimentações

CREATE TABLE IF NOT EXISTS insumos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    unidade_base ENUM('g', 'ml', 'un') NOT NULL,
    quantidade_atual DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    estoque_minimo DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    custo_unitario DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    deletado_em DATETIME NULL,
    CONSTRAINT fk_insumos_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_insumos_usuario (usuario_id),
    INDEX idx_insumos_ativo (usuario_id, ativo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fichas_tecnicas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    servico_id INT NOT NULL,
    insumo_id INT NOT NULL,
    quantidade_necessaria DECIMAL(12, 3) NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ft_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ft_servico FOREIGN KEY (servico_id) 
        REFERENCES servicos(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ft_insumo FOREIGN KEY (insumo_id) 
        REFERENCES insumos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uk_ft_servico_insumo UNIQUE (servico_id, insumo_id),
    INDEX idx_ft_servico (servico_id),
    INDEX idx_ft_insumo (insumo_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    insumo_id INT NULL,
    servico_id INT NULL,
    tipo ENUM(
        'ENTRADA_COMPRA', 
        'SAIDA_PRODUCAO', 
        'ENTRADA_PRODUCAO', 
        'SAIDA_VENDA', 
        'AJUSTE_PERDA', 
        'AJUSTE_INVENTARIO'
    ) NOT NULL,
    quantidade DECIMAL(12, 3) NOT NULL,
    custo_total DECIMAL(10, 2) NULL,
    movimentacao_financeira_id INT NULL,
    orcamento_id INT NULL,
    motivo VARCHAR(255) NULL,
    data_movimentacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_em_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_em_insumo FOREIGN KEY (insumo_id) 
        REFERENCES insumos(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_em_servico FOREIGN KEY (servico_id) 
        REFERENCES servicos(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_em_mov_fin FOREIGN KEY (movimentacao_financeira_id) 
        REFERENCES movimentacoes(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_em_orcamento FOREIGN KEY (orcamento_id) 
        REFERENCES orcamentos(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_em_usuario_data (usuario_id, data_movimentacao),
    INDEX idx_em_insumo (insumo_id),
    INDEX idx_em_servico (servico_id)
) ENGINE=InnoDB;

-- Adiciona campos de estoque pronto em servicos caso não existam
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'servicos' 
      AND COLUMN_NAME = 'controla_estoque_pronto'
);

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE servicos ADD COLUMN controla_estoque_pronto TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN estoque_pronto_atual INT NOT NULL DEFAULT 0, ADD COLUMN estoque_pronto_minimo INT NOT NULL DEFAULT 0;', 
    'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

Atualizar também `backend/src/database/schema.sql` anexando o DDL completo das tabelas de estoque no final do arquivo.

- [ ] **Step 4: Executar teste e validar que passa**

Executar:
```bash
npm --prefix backend test -- backend/tests/integration/migrationEstoque.test.js
```
Resultado esperado: PASS.

- [ ] **Step 5: Commit da Task 1**

```bash
git add backend/src/database/migrations/004_estoque.sql backend/src/database/schema.sql backend/tests/integration/migrationEstoque.test.js
git commit -m "feat(database): adicionar migracao e schema do modulo de estoque e fichas tecnicas"
```

---

### Task 2: Domínio & Utilitários — Conversão Canônica de Unidades e Custo Médio (CMP)

**Files:**
- Create: `backend/src/utils/conversorUnidades.js`
- Test: `backend/tests/unit/conversorUnidades.test.js`

**Interfaces:**
- Produces:
  - `converterParaUnidadeBase(quantidade, unidadeInformada, unidadeBase, opcoes)` -> `number`
  - `calcularCustoMedioPonderado(qtdAtual, custoAtual, qtdNova, custoNovo)` -> `number`
  - `formatarGrandezaAmigavel(quantidadeBase, unidadeBase)` -> `string`

- [ ] **Step 1: Escrever teste unitário para conversão de unidades e CMP**

Criar `backend/tests/unit/conversorUnidades.test.js`:
```javascript
const {
  converterParaUnidadeBase,
  calcularCustoMedioPonderado,
  formatarGrandezaAmigavel
} = require('../../src/utils/conversorUnidades');

describe('conversorUnidades', () => {
  describe('converterParaUnidadeBase', () => {
    it('deve converter kg para gramas', () => {
      expect(converterParaUnidadeBase(2.5, 'kg', 'g')).toBe(2500);
      expect(converterParaUnidadeBase(0.25, 'kg', 'g')).toBe(250);
    });

    it('deve manter gramas inalterado quando a base for g', () => {
      expect(converterParaUnidadeBase(500, 'g', 'g')).toBe(500);
    });

    it('deve converter L para mL', () => {
      expect(converterParaUnidadeBase(1.5, 'L', 'ml')).toBe(1500);
      expect(converterParaUnidadeBase(2, 'litros', 'ml')).toBe(2000);
    });

    it('deve converter unidades em pacotes', () => {
      expect(converterParaUnidadeBase(3, 'pct', 'un', { unidadesPorEmbalagem: 50 })).toBe(150);
    });

    it('deve lançar erro se a grandeza for incompatível (ex: massa para volume)', () => {
      expect(() => converterParaUnidadeBase(1, 'L', 'g')).toThrow('Unidade incompatível');
    });
  });

  describe('calcularCustoMedioPonderado', () => {
    it('deve calcular o novo custo médio ponderado corretamente', () => {
      // 2000g a R$ 0.005/g (R$ 10) + 3000g a R$ 0.007/g (R$ 21) = 5000g total R$ 31 -> R$ 0.0062/g
      const cmp = calcularCustoMedioPonderado(2000, 0.005, 3000, 0.007);
      expect(cmp).toBeCloseTo(0.0062, 4);
    });

    it('deve retornar custo novo se o saldo atual for zero ou negativo', () => {
      const cmp = calcularCustoMedioPonderado(0, 0, 1000, 0.010);
      expect(cmp).toBe(0.010);
    });
  });

  describe('formatarGrandezaAmigavel', () => {
    it('deve formatar gramas para kg quando for >= 1000', () => {
      expect(formatarGrandezaAmigavel(2500, 'g')).toBe('2.5 kg');
    });

    it('deve manter gramas se < 1000', () => {
      expect(formatarGrandezaAmigavel(350, 'g')).toBe('350 g');
    });
  });
});
```

- [ ] **Step 2: Executar teste para verificar falha**

Executar:
```bash
npm --prefix backend test -- backend/tests/unit/conversorUnidades.test.js
```
Resultado esperado: FALHA (módulo `conversorUnidades` não existe).

- [ ] **Step 3: Implementar `backend/src/utils/conversorUnidades.js`**

Criar `backend/src/utils/conversorUnidades.js`:
```javascript
const MAPA_GRANDEZAS = {
  g: 'massa',
  kg: 'massa',
  quilo: 'massa',
  quilos: 'massa',
  ml: 'volume',
  l: 'volume',
  litro: 'volume',
  litros: 'volume',
  un: 'unidade',
  unidade: 'unidade',
  unidades: 'unidade',
  pct: 'unidade',
  cx: 'unidade'
};

function normalizarNomeUnidade(unidade) {
  if (!unidade || typeof unidade !== 'string') return '';
  return unidade.trim().toLowerCase();
}

/**
 * Converte quantidade informada para a unidade base canônica.
 */
function converterParaUnidadeBase(quantidade, unidadeInformada, unidadeBase, opcoes = {}) {
  const q = Number(quantidade);
  if (isNaN(q) || q < 0) {
    throw new Error('Quantidade inválida para conversão');
  }

  const uNorm = normalizarNomeUnidade(unidadeInformada);
  const baseNorm = normalizarNomeUnidade(unidadeBase);

  const grandezaOrigem = MAPA_GRANDEZAS[uNorm];
  const grandezaDestino = MAPA_GRANDEZAS[baseNorm];

  if (!grandezaOrigem || !grandezaDestino || grandezaOrigem !== grandezaDestino) {
    throw new Error(`Unidade incompatível: não é possível converter '${unidadeInformada}' para a base '${unidadeBase}'`);
  }

  if (grandezaDestino === 'massa') {
    if (['kg', 'quilo', 'quilos'].includes(uNorm)) return q * 1000;
    return q;
  }

  if (grandezaDestino === 'volume') {
    if (['l', 'litro', 'litros'].includes(uNorm)) return q * 1000;
    return q;
  }

  if (grandezaDestino === 'unidade') {
    if (['pct', 'cx'].includes(uNorm)) {
      const fator = Number(opcoes.unidadesPorEmbalagem) || 1;
      return q * fator;
    }
    return q;
  }

  return q;
}

/**
 * Calcula o custo médio ponderado (CMP) após nova aquisição.
 */
function calcularCustoMedioPonderado(qtdAtual, custoAtual, qtdNova, custoNovo) {
  const qAtual = Math.max(0, Number(qtdAtual) || 0);
  const cAtual = Math.max(0, Number(custoAtual) || 0);
  const qNova = Number(qtdNova) || 0;
  const cNovo = Number(custoNovo) || 0;

  if (qNova <= 0) return cAtual;
  if (qAtual <= 0) return cNovo;

  const totalValor = (qAtual * cAtual) + (qNova * cNovo);
  const totalQtd = qAtual + qNova;

  return totalQtd > 0 ? Number((totalValor / totalQtd).toFixed(6)) : cNovo;
}

/**
 * Formata um valor canônico para exibição legível ao usuário.
 */
function formatarGrandezaAmigavel(quantidadeBase, unidadeBase) {
  const q = Number(quantidadeBase) || 0;
  const u = normalizarNomeUnidade(unidadeBase);

  if (u === 'g') {
    if (q >= 1000) {
      return `${Number((q / 1000).toFixed(3))} kg`;
    }
    return `${Number(q.toFixed(1))} g`;
  }

  if (u === 'ml') {
    if (q >= 1000) {
      return `${Number((q / 1000).toFixed(3))} L`;
    }
    return `${Number(q.toFixed(1))} mL`;
  }

  return `${Math.round(q)} un`;
}

module.exports = {
  converterParaUnidadeBase,
  calcularCustoMedioPonderado,
  formatarGrandezaAmigavel
};
```

- [ ] **Step 4: Executar teste e validar aprovação**

Executar:
```bash
npm --prefix backend test -- backend/tests/unit/conversorUnidades.test.js
```
Resultado esperado: PASS.

- [ ] **Step 5: Commit da Task 2**

```bash
git add backend/src/utils/conversorUnidades.js backend/tests/unit/conversorUnidades.test.js
git commit -m "feat(estoque): adicionar utilitario de conversao de unidades e custo medio ponderado"
```

---

### Task 3: Repositórios de Estoque (`insumoRepository` e `fichaTecnicaRepository`)

**Files:**
- Create: `backend/src/repositories/insumoRepository.js`
- Create: `backend/src/repositories/fichaTecnicaRepository.js`
- Test: `backend/tests/integration/repositoriosEstoque.test.js`

**Interfaces:**
- Produces:
  - `insumoRepository`: `criar`, `listar`, `buscarPorId`, `atualizar`, `atualizarSaldoECusto`, `remover`
  - `fichaTecnicaRepository`: `substituirFicha`, `obterFichaPorServico`, `obterInsumosPorServicos`

- [ ] **Step 1: Escrever teste de integração para os repositórios**

Criar `backend/tests/integration/repositoriosEstoque.test.js`:
```javascript
const pool = require('../../src/config/database');
const insumoRepository = require('../../src/repositories/insumoRepository');
const fichaTecnicaRepository = require('../../src/repositories/fichaTecnicaRepository');

describe('Repositórios de Estoque e Ficha Técnica', () => {
  let usuarioId;
  let servicoId;

  beforeAll(async () => {
    // Insere usuário e serviço para teste
    const [uRes] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['Estoque Teste', `teste_repo_${Date.now()}@teste.com`, 'hash']
    );
    usuarioId = uRes.insertId;

    const [sRes] = await pool.query(
      'INSERT INTO servicos (usuario_id, nome, preco) VALUES (?, ?, ?)',
      [usuarioId, 'Cento de Coxinha', 90.00]
    );
    servicoId = sRes.insertId;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
  });

  it('deve criar e listar insumos com controle de saldo e unidade', async () => {
    const insumo = await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Farinha de Trigo',
      unidade_base: 'g',
      quantidade_atual: 5000,
      estoque_minimo: 1000,
      custo_unitario: 0.0050
    });

    expect(insumo.id).toBeDefined();
    expect(insumo.nome).toBe('Farinha de Trigo');

    const lista = await insumoRepository.listar(usuarioId);
    expect(lista.length).toBeGreaterThanOrEqual(1);

    const buscado = await insumoRepository.buscarPorId(insumo.id, usuarioId);
    expect(Number(buscado.quantidade_atual)).toBe(5000);
  });

  it('deve vincular e recuperar ficha técnica de um serviço', async () => {
    const insumo = await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Frango Desfiado',
      unidade_base: 'g',
      quantidade_atual: 3000,
      estoque_minimo: 500,
      custo_unitario: 0.0150
    });

    await fichaTecnicaRepository.substituirFicha(usuarioId, servicoId, [
      { insumo_id: insumo.id, quantidade_necessaria: 800 }
    ]);

    const ficha = await fichaTecnicaRepository.obterFichaPorServico(usuarioId, servicoId);
    expect(ficha.length).toBe(1);
    expect(ficha[0].nome_insumo).toBe('Frango Desfiado');
    expect(Number(ficha[0].quantidade_necessaria)).toBe(800);
  });
});
```

- [ ] **Step 2: Executar teste para verificar falha**

Executar:
```bash
npm --prefix backend test -- backend/tests/integration/repositoriosEstoque.test.js
```
Resultado esperado: FALHA (repositórios não existem).

- [ ] **Step 3: Implementar `backend/src/repositories/insumoRepository.js` e `fichaTecnicaRepository.js`**

Criar `backend/src/repositories/insumoRepository.js`:
```javascript
const pool = require('../config/database');

const insumoRepository = {
  async criar({ usuario_id, nome, unidade_base, quantidade_atual = 0, estoque_minimo = 0, custo_unitario = 0 }, connection = pool) {
    const [result] = await connection.query(
      `INSERT INTO insumos (usuario_id, nome, unidade_base, quantidade_atual, estoque_minimo, custo_unitario) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuario_id, nome.trim(), unidade_base, quantidade_atual, estoque_minimo, custo_unitario]
    );
    return await this.buscarPorId(result.insertId, usuario_id, connection);
  },

  async listar(usuario_id, { busca, apenasAbaixoMinimo = false } = {}, connection = pool) {
    let sql = 'SELECT * FROM insumos WHERE usuario_id = ? AND ativo = 1 AND deletado_em IS NULL';
    const params = [usuario_id];

    if (busca && typeof busca === 'string' && busca.trim()) {
      sql += ' AND nome LIKE ?';
      params.push(`%${busca.trim()}%`);
    }

    if (apenasAbaixoMinimo) {
      sql += ' AND quantidade_atual <= estoque_minimo';
    }

    sql += ' ORDER BY nome ASC';
    const [rows] = await connection.query(sql, params);
    return rows;
  },

  async buscarPorId(id, usuario_id, connection = pool) {
    const [rows] = await connection.query(
      'SELECT * FROM insumos WHERE id = ? AND usuario_id = ? AND deletado_em IS NULL LIMIT 1',
      [id, usuario_id]
    );
    return rows[0] || null;
  },

  async buscarPorNome(nome, usuario_id, connection = pool) {
    const [rows] = await connection.query(
      'SELECT * FROM insumos WHERE usuario_id = ? AND LOWER(nome) = LOWER(?) AND deletado_em IS NULL LIMIT 1',
      [usuario_id, nome.trim()]
    );
    return rows[0] || null;
  },

  async atualizar(id, usuario_id, { nome, estoque_minimo, ativo }, connection = pool) {
    await connection.query(
      `UPDATE insumos 
       SET nome = COALESCE(?, nome), 
           estoque_minimo = COALESCE(?, estoque_minimo),
           ativo = COALESCE(?, ativo)
       WHERE id = ? AND usuario_id = ?`,
      [nome ? nome.trim() : null, estoque_minimo, ativo, id, usuario_id]
    );
    return await this.buscarPorId(id, usuario_id, connection);
  },

  async atualizarSaldoECusto(id, usuario_id, novaQuantidade, novoCustoUnitario, connection = pool) {
    await connection.query(
      `UPDATE insumos 
       SET quantidade_atual = ?, custo_unitario = ? 
       WHERE id = ? AND usuario_id = ?`,
      [novaQuantidade, novoCustoUnitario, id, usuario_id]
    );
    return await this.buscarPorId(id, usuario_id, connection);
  },

  async debitarSaldo(id, usuario_id, quantidadeDebito, connection = pool) {
    await connection.query(
      `UPDATE insumos 
       SET quantidade_atual = quantidade_atual - ? 
       WHERE id = ? AND usuario_id = ?`,
      [quantidadeDebito, id, usuario_id]
    );
    return await this.buscarPorId(id, usuario_id, connection);
  },

  async creditarSaldo(id, usuario_id, quantidadeCredito, connection = pool) {
    await connection.query(
      `UPDATE insumos 
       SET quantidade_atual = quantidade_atual + ? 
       WHERE id = ? AND usuario_id = ?`,
      [quantidadeCredito, id, usuario_id]
    );
    return await this.buscarPorId(id, usuario_id, connection);
  },

  async remover(id, usuario_id, connection = pool) {
    const [res] = await connection.query(
      'UPDATE insumos SET deletado_em = NOW(), ativo = 0 WHERE id = ? AND usuario_id = ?',
      [id, usuario_id]
    );
    return res.affectedRows > 0;
  }
};

module.exports = insumoRepository;
```

Criar `backend/src/repositories/fichaTecnicaRepository.js`:
```javascript
const pool = require('../config/database');

const fichaTecnicaRepository = {
  async substituirFicha(usuario_id, servico_id, ingredientes, connection = pool) {
    await connection.query(
      'DELETE FROM fichas_tecnicas WHERE usuario_id = ? AND servico_id = ?',
      [usuario_id, servico_id]
    );

    if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
      return [];
    }

    const values = ingredientes.map(item => [
      usuario_id,
      servico_id,
      item.insumo_id,
      item.quantidade_necessaria
    ]);

    await connection.query(
      `INSERT INTO fichas_tecnicas (usuario_id, servico_id, insumo_id, quantidade_necessaria) 
       VALUES ?`,
      [values]
    );

    return await this.obterFichaPorServico(usuario_id, servico_id, connection);
  },

  async obterFichaPorServico(usuario_id, servico_id, connection = pool) {
    const [rows] = await connection.query(
      `SELECT ft.id, ft.servico_id, ft.insumo_id, ft.quantidade_necessaria,
              i.nome AS nome_insumo, i.unidade_base, i.custo_unitario, i.quantidade_atual AS saldo_insumo
       FROM fichas_tecnicas ft
       JOIN insumos i ON ft.insumo_id = i.id
       WHERE ft.usuario_id = ? AND ft.servico_id = ?
       ORDER BY i.nome ASC`,
      [usuario_id, servico_id]
    );
    return rows;
  },

  async obterInsumosPorServicos(usuario_id, servicoIds, connection = pool) {
    if (!servicoIds || servicoIds.length === 0) return [];
    const [rows] = await connection.query(
      `SELECT ft.servico_id, ft.insumo_id, ft.quantidade_necessaria,
              i.nome AS nome_insumo, i.unidade_base, i.custo_unitario, i.quantidade_atual AS saldo_insumo
       FROM fichas_tecnicas ft
       JOIN insumos i ON ft.insumo_id = i.id
       WHERE ft.usuario_id = ? AND ft.servico_id IN (?)`,
      [usuario_id, servicoIds]
    );
    return rows;
  }
};

module.exports = fichaTecnicaRepository;
```

- [ ] **Step 4: Executar teste e validar que passa**

Executar:
```bash
npm --prefix backend test -- backend/tests/integration/repositoriosEstoque.test.js
```
Resultado esperado: PASS.

- [ ] **Step 5: Commit da Task 3**

```bash
git add backend/src/repositories/insumoRepository.js backend/src/repositories/fichaTecnicaRepository.js backend/tests/integration/repositoriosEstoque.test.js
git commit -m "feat(estoque): implementar repositorios de insumos e fichas tecnicas"
```

---

### Task 4: Ledger Auditável — `estoqueMovimentacaoRepository`

**Files:**
- Create: `backend/src/repositories/estoqueMovimentacaoRepository.js`
- Test: `backend/tests/integration/estoqueMovimentacaoRepository.test.js`

**Interfaces:**
- Produces:
  - `registrarMovimentacao({ usuario_id, insumo_id, servico_id, tipo, quantidade, custo_total, movimentacao_financeira_id, orcamento_id, motivo }, connection)`
  - `listarMovimentacoes(usuario_id, filtros, connection)`

- [ ] **Step 1: Escrever teste de integração para o ledger de movimentações**

Criar `backend/tests/integration/estoqueMovimentacaoRepository.test.js`:
```javascript
const pool = require('../../src/config/database');
const estoqueMovimentacaoRepository = require('../../src/repositories/estoqueMovimentacaoRepository');

describe('estoqueMovimentacaoRepository', () => {
  let usuarioId;

  beforeAll(async () => {
    const [uRes] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['Ledger Teste', `teste_ledger_${Date.now()}@teste.com`, 'hash']
    );
    usuarioId = uRes.insertId;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
  });

  it('deve registrar e listar movimentações auditáveis', async () => {
    const mov = await estoqueMovimentacaoRepository.registrarMovimentacao({
      usuario_id: usuarioId,
      tipo: 'ENTRADA_COMPRA',
      quantidade: 5000,
      custo_total: 25.00,
      motivo: 'Compra de farinha atacado'
    });

    expect(mov.id).toBeDefined();

    const lista = await estoqueMovimentacaoRepository.listarMovimentacoes(usuarioId, { limite: 10 });
    expect(lista.length).toBeGreaterThanOrEqual(1);
    expect(lista[0].tipo).toBe('ENTRADA_COMPRA');
    expect(Number(lista[0].quantidade)).toBe(5000);
  });
});
```

- [ ] **Step 2: Executar teste para verificar falha**

Executar:
```bash
npm --prefix backend test -- backend/tests/integration/estoqueMovimentacaoRepository.test.js
```
Resultado esperado: FALHA.

- [ ] **Step 3: Implementar `backend/src/repositories/estoqueMovimentacaoRepository.js`**

Criar `backend/src/repositories/estoqueMovimentacaoRepository.js`:
```javascript
const pool = require('../config/database');

const estoqueMovimentacaoRepository = {
  async registrarMovimentacao({
    usuario_id,
    insumo_id = null,
    servico_id = null,
    tipo,
    quantidade,
    custo_total = null,
    movimentacao_financeira_id = null,
    orcamento_id = null,
    motivo = null
  }, connection = pool) {
    const [res] = await connection.query(
      `INSERT INTO estoque_movimentacoes 
       (usuario_id, insumo_id, servico_id, tipo, quantidade, custo_total, movimentacao_financeira_id, orcamento_id, motivo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario_id,
        insumo_id,
        servico_id,
        tipo,
        quantidade,
        custo_total,
        movimentacao_financeira_id,
        orcamento_id,
        motivo
      ]
    );

    const [rows] = await connection.query(
      'SELECT * FROM estoque_movimentacoes WHERE id = ? LIMIT 1',
      [res.insertId]
    );
    return rows[0];
  },

  async listarMovimentacoes(usuario_id, { tipo, insumo_id, servico_id, limite = 50 } = {}, connection = pool) {
    let sql = `
      SELECT em.*, 
             i.nome AS nome_insumo, i.unidade_base,
             s.nome AS nome_servico
      FROM estoque_movimentacoes em
      LEFT JOIN insumos i ON em.insumo_id = i.id
      LEFT JOIN servicos s ON em.servico_id = s.id
      WHERE em.usuario_id = ?
    `;
    const params = [usuario_id];

    if (tipo) {
      sql += ' AND em.tipo = ?';
      params.push(tipo);
    }
    if (insumo_id) {
      sql += ' AND em.insumo_id = ?';
      params.push(insumo_id);
    }
    if (servico_id) {
      sql += ' AND em.servico_id = ?';
      params.push(servico_id);
    }

    sql += ' ORDER BY em.data_movimentacao DESC, em.id DESC LIMIT ?';
    params.push(Math.min(Math.max(1, Number(limite) || 50), 100));

    const [rows] = await connection.query(sql, params);
    return rows;
  }
};

module.exports = estoqueMovimentacaoRepository;
```

- [ ] **Step 4: Executar teste e validar que passa**

Executar:
```bash
npm --prefix backend test -- backend/tests/integration/estoqueMovimentacaoRepository.test.js
```
Resultado esperado: PASS.

- [ ] **Step 5: Commit da Task 4**

```bash
git add backend/src/repositories/estoqueMovimentacaoRepository.js backend/tests/integration/estoqueMovimentacaoRepository.test.js
git commit -m "feat(estoque): implementar repositorio de historico e ledger de movimentacoes"
```

---

### Task 5: Motor de Simulação Produtiva ("Com tanto de X e Y, quantos Z eu faço?")

**Files:**
- Create: `backend/src/services/simuladorProducaoService.js`
- Test: `backend/tests/unit/simuladorProducaoService.test.js`

**Interfaces:**
- Produces:
  - `simularCapacidade({ ingredientesFicha, insumosDisponiveis })` -> `{ rendimentoMaximo, insumoLimitante, sobras, custoUnitario, custoTotalProducao }`

- [ ] **Step 1: Escrever teste unitário para o motor de simulação**

Criar `backend/tests/unit/simuladorProducaoService.test.js`:
```javascript
const { simularCapacidade } = require('../../src/services/simuladorProducaoService');

describe('simuladorProducaoService', () => {
  const receitaCentoCoxinha = [
    { insumo_id: 1, nome: 'Farinha de Trigo', unidade_base: 'g', quantidade_necessaria: 1000, custo_unitario: 0.005 },
    { insumo_id: 2, nome: 'Frango Desfiado', unidade_base: 'g', quantidade_necessaria: 800, custo_unitario: 0.015 }
  ];

  it('deve calcular rendimento máximo baseado no ingrediente limitante', () => {
    const insumosUsuario = [
      { insumo_id: 1, quantidade_base: 3000 }, // Farinha dá para 3 centos
      { insumo_id: 2, quantidade_base: 2000 }  // Frango dá para 2 centos (gargalo: 2000 / 800 = 2)
    ];

    const resultado = simularCapacidade({
      ingredientesFicha: receitaCentoCoxinha,
      insumosDisponiveis: insumosUsuario
    });

    expect(resultado.rendimentoMaximo).toBe(2);
    expect(resultado.insumoLimitante.nome).toBe('Frango Desfiado');
    expect(resultado.insumoLimitante.quantidadeFaltanteProximoLote).toBe(400); // Faltam 400g de frango para fazer o 3º
    expect(resultado.sobras.find(s => s.nome === 'Farinha de Trigo').quantidadeSobra).toBe(1000); // Sobram 1000g de farinha
  });

  it('deve retornar rendimento zero se faltar algum ingrediente essencial', () => {
    const insumosUsuario = [
      { insumo_id: 1, quantidade_base: 3000 },
      { insumo_id: 2, quantidade_base: 100 } // Não dá nem para 1 cento
    ];

    const resultado = simularCapacidade({
      ingredientesFicha: receitaCentoCoxinha,
      insumosDisponiveis: insumosUsuario
    });

    expect(resultado.rendimentoMaximo).toBe(0);
    expect(resultado.insumoLimitante.nome).toBe('Frango Desfiado');
    expect(resultado.insumoLimitante.quantidadeFaltanteProximoLote).toBe(700);
  });
});
```

- [ ] **Step 2: Executar teste para verificar falha**

Executar:
```bash
npm --prefix backend test -- backend/tests/unit/simuladorProducaoService.test.js
```
Resultado esperado: FALHA.

- [ ] **Step 3: Implementar `backend/src/services/simuladorProducaoService.js`**

Criar `backend/src/services/simuladorProducaoService.js`:
```javascript
const { formatarGrandezaAmigavel } = require('../utils/conversorUnidades');

/**
 * Simula capacidade produtiva e calcula gargalos com base em ingredientes e insumos disponíveis.
 */
function simularCapacidade({ ingredientesFicha, insumosDisponiveis }) {
  if (!Array.isArray(ingredientesFicha) || ingredientesFicha.length === 0) {
    throw new Error('A receita informada não possui ingredientes cadastrados');
  }

  const mapaDisponivel = new Map();
  for (const item of insumosDisponiveis || []) {
    mapaDisponivel.set(Number(item.insumo_id), Number(item.quantidade_base) || 0);
  }

  let menorCapacidade = Infinity;
  const analisePorInsumo = [];

  for (const ing of ingredientesFicha) {
    const id = Number(ing.insumo_id);
    const qtdNecessaria = Number(ing.quantidade_necessaria);
    const qtdDisponivel = mapaDisponivel.get(id) || 0;

    const capacidade = qtdNecessaria > 0 ? Math.floor(qtdDisponivel / qtdNecessaria) : 0;
    if (capacidade < menorCapacidade) {
      menorCapacidade = capacidade;
    }

    analisePorInsumo.push({
      insumo_id: id,
      nome: ing.nome || ing.nome_insumo,
      unidade_base: ing.unidade_base,
      custo_unitario: Number(ing.custo_unitario) || 0,
      qtdNecessaria,
      qtdDisponivel,
      capacidade
    });
  }

  const rendimentoMaximo = menorCapacidade === Infinity ? 0 : menorCapacidade;

  // Localiza o ingrediente limitante (aquele cuja capacidade empatou no menor valor)
  const limitantes = analisePorInsumo.filter(item => item.capacidade === rendimentoMaximo);
  const principalLimitante = limitantes[0];

  const faltaParaProximo = principalLimitante
    ? Math.max(0, ((rendimentoMaximo + 1) * principalLimitante.qtdNecessaria) - principalLimitante.qtdDisponivel)
    : 0;

  // Calcula sobras de todos os insumos após produzir rendimentoMaximo lotes
  const sobras = analisePorInsumo.map(item => {
    const consumido = rendimentoMaximo * item.qtdNecessaria;
    const sobra = Math.max(0, item.qtdDisponivel - consumido);
    return {
      insumo_id: item.insumo_id,
      nome: item.nome,
      unidade_base: item.unidade_base,
      quantidadeSobra: sobra,
      sobraFormatada: formatarGrandezaAmigavel(sobra, item.unidade_base)
    };
  });

  // Calcula custo da receita unitária e custo total da produção simulada
  let custoUnitario = 0;
  for (const ing of analisePorInsumo) {
    custoUnitario += ing.qtdNecessaria * ing.custo_unitario;
  }
  custoUnitario = Number(custoUnitario.toFixed(2));
  const custoTotalProducao = Number((custoUnitario * rendimentoMaximo).toFixed(2));

  return {
    rendimentoMaximo,
    insumoLimitante: principalLimitante ? {
      insumo_id: principalLimitante.insumo_id,
      nome: principalLimitante.nome,
      unidade_base: principalLimitante.unidade_base,
      quantidadeFaltanteProximoLote: faltaParaProximo,
      faltaFormatada: formatarGrandezaAmigavel(faltaParaProximo, principalLimitante.unidade_base),
      motivo: `O insumo '${principalLimitante.nome}' é o gargalo que impede produzir mais lotes.`
    } : null,
    sobras,
    custoUnitario,
    custoTotalProducao
  };
}

module.exports = {
  simularCapacidade
};
```

- [ ] **Step 4: Executar teste e validar que passa**

Executar:
```bash
npm --prefix backend test -- backend/tests/unit/simuladorProducaoService.test.js
```
Resultado esperado: PASS.

- [ ] **Step 5: Commit da Task 5**

```bash
git add backend/src/services/simuladorProducaoService.js backend/tests/unit/simuladorProducaoService.test.js
git commit -m "feat(estoque): implementar motor de simulacao de producao e calculo de gargalos"
```

---

### Task 6: Serviço Integrador de Estoque (`estoqueService`)

**Files:**
- Create: `backend/src/services/estoqueService.js`
- Test: `backend/tests/integration/estoqueService.test.js`

**Interfaces:**
- Produces:
  - `registrarEntradaInsumo(usuario_id, dados)` -> Atualiza saldo, CMP, ledger e opcionalmente cria SAÍDA em `movimentacoes`.
  - `registrarLoteProducao(usuario_id, servico_id, quantidade)` -> Abate insumos e soma produtos prontos.
  - `processarAprovacaoOrcamento(orcamentoId, usuario_id, connection)` -> Abate sob encomenda ou pronta entrega.
  - `estornarOrcamento(orcamentoId, usuario_id, connection)` -> Devolve insumos/produtos prontos.
  - `simularProducao(usuario_id, params)` -> Conecta com `simuladorProducaoService`.

- [ ] **Step 1: Escrever teste de integração para o `estoqueService`**

Criar `backend/tests/integration/estoqueService.test.js`:
```javascript
const pool = require('../../src/config/database');
const estoqueService = require('../../src/services/estoqueService');
const insumoRepository = require('../../src/repositories/insumoRepository');

describe('estoqueService', () => {
  let usuarioId;
  let insumoId;

  beforeAll(async () => {
    const [uRes] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['Service Teste', `teste_service_${Date.now()}@teste.com`, 'hash']
    );
    usuarioId = uRes.insertId;

    const insumo = await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Queijo Mussarela',
      unidade_base: 'g',
      quantidade_atual: 1000,
      estoque_minimo: 500,
      custo_unitario: 0.035
    });
    insumoId = insumo.id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
  });

  it('deve registrar compra de insumo com lançamento de despesa no Livro Caixa', async () => {
    const resultado = await estoqueService.registrarEntradaInsumo(usuarioId, {
      insumo_id: insumoId,
      quantidade: 2,
      unidade: 'kg',
      custo_total: 80.00,
      lancar_no_caixa: true
    });

    expect(resultado.saldo_atual).toBe(3000); // 1000g + 2000g
    expect(resultado.movimentacao_financeira_id).toBeDefined();

    // Valida se despesa caiu no livro caixa
    const [movs] = await pool.query(
      'SELECT * FROM movimentacoes WHERE id = ? AND usuario_id = ?',
      [resultado.movimentacao_financeira_id, usuarioId]
    );
    expect(movs.length).toBe(1);
    expect(movs[0].tipo).toBe('SAIDA');
    expect(Number(movs[0].valor)).toBe(80.00);
  });
});
```

- [ ] **Step 2: Executar teste para verificar falha**

Executar:
```bash
npm --prefix backend test -- backend/tests/integration/estoqueService.test.js
```
Resultado esperado: FALHA.

- [ ] **Step 3: Implementar `backend/src/services/estoqueService.js`**

Criar `backend/src/services/estoqueService.js`:
```javascript
const pool = require('../config/database');
const insumoRepository = require('../repositories/insumoRepository');
const fichaTecnicaRepository = require('../repositories/fichaTecnicaRepository');
const estoqueMovimentacaoRepository = require('../repositories/estoqueMovimentacaoRepository');
const { converterParaUnidadeBase, calcularCustoMedioPonderado, formatarGrandezaAmigavel } = require('../utils/conversorUnidades');
const { simularCapacidade } = require('./simuladorProducaoService');

const estoqueService = {
  /**
   * Registra compra/entrada de insumo com recálculo de CMP e integração ao Livro Caixa.
   */
  async registrarEntradaInsumo(usuario_id, {
    insumo_id,
    nome,
    unidade_base,
    quantidade,
    unidade,
    custo_total = null,
    lancar_no_caixa = true
  }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let insumo = null;
      if (insumo_id) {
        insumo = await insumoRepository.buscarPorId(insumo_id, usuario_id, conn);
      } else if (nome) {
        insumo = await insumoRepository.buscarPorNome(nome, usuario_id, conn);
      }

      if (!insumo && nome && unidade_base) {
        insumo = await insumoRepository.criar({
          usuario_id,
          nome,
          unidade_base,
          quantidade_atual: 0,
          estoque_minimo: 0,
          custo_unitario: 0
        }, conn);
      }

      if (!insumo) {
        throw new Error('Insumo não encontrado. Forneça o insumo_id ou nome e unidade_base para cadastrar.');
      }

      const qtdBase = converterParaUnidadeBase(quantidade, unidade || insumo.unidade_base, insumo.unidade_base);
      const custoTotalNum = custo_total !== null && custo_total !== undefined ? Number(custo_total) : null;
      const custoNovoUnitario = (custoTotalNum !== null && qtdBase > 0)
        ? custoTotalNum / qtdBase
        : Number(insumo.custo_unitario);

      const novoCMP = (custoTotalNum !== null)
        ? calcularCustoMedioPonderado(insumo.quantidade_atual, insumo.custo_unitario, qtdBase, custoNovoUnitario)
        : Number(insumo.custo_unitario);

      const novaQtdTotal = Number(insumo.quantidade_atual) + qtdBase;

      await insumoRepository.atualizarSaldoECusto(insumo.id, usuario_id, novaQtdTotal, novoCMP, conn);

      // Integração opcional com o Livro Caixa
      let movFinanceiraId = null;
      if (lancar_no_caixa && custoTotalNum && custoTotalNum > 0) {
        const [finRes] = await conn.query(
          `INSERT INTO movimentacoes (usuario_id, tipo, categoria, valor, data_movimentacao, descricao)
           VALUES (?, 'SAIDA', 'Insumos/Matéria-Prima', ?, CURDATE(), ?)`,
          [usuario_id, custoTotalNum, `Compra de insumo: ${insumo.nome}`]
        );
        movFinanceiraId = finRes.insertId;
      }

      // Registro no Ledger
      const movEstoque = await estoqueMovimentacaoRepository.registrarMovimentacao({
        usuario_id,
        insumo_id: insumo.id,
        tipo: 'ENTRADA_COMPRA',
        quantidade: qtdBase,
        custo_total: custoTotalNum,
        movimentacao_financeira_id: movFinanceiraId,
        motivo: `Entrada de ${formatarGrandezaAmigavel(qtdBase, insumo.unidade_base)}`
      }, conn);

      await conn.commit();

      return {
        insumo_id: insumo.id,
        nome: insumo.nome,
        saldo_anterior: Number(insumo.quantidade_atual),
        saldo_atual: novaQtdTotal,
        saldo_formatado: formatarGrandezaAmigavel(novaQtdTotal, insumo.unidade_base),
        custo_unitario_atual: novoCMP,
        movimentacao_financeira_id: movFinanceiraId,
        movimentacao_estoque_id: movEstoque.id
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /**
   * Baixa estoque automaticamente quando um orçamento é aprovado.
   */
  async processarAprovacaoOrcamento(orcamentoId, usuario_id, externalConn = null) {
    const conn = externalConn || await pool.getConnection();
    const shouldManageTransaction = !externalConn;

    try {
      if (shouldManageTransaction) await conn.beginTransaction();

      // Busca os itens do orçamento
      const [itens] = await conn.query(
        `SELECT oi.servico_id, oi.quantidade, s.nome AS nome_servico, s.controla_estoque_pronto, s.estoque_pronto_atual
         FROM orcamento_itens oi
         JOIN servicos s ON oi.servico_id = s.id
         WHERE oi.orcamento_id = ? AND s.usuario_id = ?`,
        [orcamentoId, usuario_id]
      );

      for (const item of itens) {
        const qtdVendida = Number(item.quantidade);

        if (item.controla_estoque_pronto) {
          // Baixa produto pronto
          await conn.query(
            'UPDATE servicos SET estoque_pronto_atual = estoque_pronto_atual - ? WHERE id = ? AND usuario_id = ?',
            [qtdVendida, item.servico_id, usuario_id]
          );

          await estoqueMovimentacaoRepository.registrarMovimentacao({
            usuario_id,
            servico_id: item.servico_id,
            tipo: 'SAIDA_VENDA',
            quantidade: qtdVendida,
            orcamento_id: orcamentoId,
            motivo: `Venda de produto pronto (Orçamento #${orcamentoId})`
          }, conn);
        } else {
          // Sob encomenda: abate insumos da ficha técnica
          const ficha = await fichaTecnicaRepository.obterFichaPorServico(usuario_id, item.servico_id, conn);

          for (const ing of ficha) {
            const debito = Number(ing.quantidade_necessaria) * qtdVendida;
            await insumoRepository.debitarSaldo(ing.insumo_id, usuario_id, debito, conn);

            await estoqueMovimentacaoRepository.registrarMovimentacao({
              usuario_id,
              insumo_id: ing.insumo_id,
              tipo: 'SAIDA_VENDA',
              quantidade: debito,
              orcamento_id: orcamentoId,
              motivo: `Consumo sob encomenda para ${qtdVendida}x ${item.nome_servico} (Orçamento #${orcamentoId})`
            }, conn);
          }
        }
      }

      if (shouldManageTransaction) await conn.commit();
      return true;
    } catch (err) {
      if (shouldManageTransaction) await conn.rollback();
      throw err;
    } finally {
      if (shouldManageTransaction) conn.release();
    }
  },

  /**
   * Estorna baixa de estoque quando orçamento for cancelado.
   */
  async estornarOrcamento(orcamentoId, usuario_id, externalConn = null) {
    const conn = externalConn || await pool.getConnection();
    const shouldManageTransaction = !externalConn;

    try {
      if (shouldManageTransaction) await conn.beginTransaction();

      const [movs] = await conn.query(
        'SELECT * FROM estoque_movimentacoes WHERE orcamento_id = ? AND usuario_id = ? AND tipo = "SAIDA_VENDA"',
        [orcamentoId, usuario_id]
      );

      for (const mov of movs) {
        if (mov.insumo_id) {
          await insumoRepository.creditarSaldo(mov.insumo_id, usuario_id, Number(mov.quantidade), conn);
        } else if (mov.servico_id) {
          await conn.query(
            'UPDATE servicos SET estoque_pronto_atual = estoque_pronto_atual + ? WHERE id = ? AND usuario_id = ?',
            [Number(mov.quantidade), mov.servico_id, usuario_id]
          );
        }
        await estoqueMovimentacaoRepository.registrarMovimentacao({
          usuario_id,
          insumo_id: mov.insumo_id,
          servico_id: mov.servico_id,
          tipo: 'AJUSTE_INVENTARIO',
          quantidade: Number(mov.quantidade),
          orcamento_id: orcamentoId,
          motivo: `Estorno por cancelamento do Orçamento #${orcamentoId}`
        }, conn);
      }

      if (shouldManageTransaction) await conn.commit();
      return true;
    } catch (err) {
      if (shouldManageTransaction) await conn.rollback();
      throw err;
    } finally {
      if (shouldManageTransaction) conn.release();
    }
  },

  /**
   * Registra batelada de produção (transforma insumos em produto pronto).
   */
  async registrarLoteProducao(usuario_id, servico_id, quantidadeLote) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [servicos] = await conn.query(
        'SELECT * FROM servicos WHERE id = ? AND usuario_id = ? LIMIT 1',
        [servico_id, usuario_id]
      );
      if (servicos.length === 0) throw new Error('Produto/Serviço não encontrado');
      const servico = servicos[0];

      const ficha = await fichaTecnicaRepository.obterFichaPorServico(usuario_id, servico_id, conn);
      if (ficha.length === 0) throw new Error('O produto não possui ficha técnica/receita cadastrada');

      // Validação de saldo prévio
      for (const ing of ficha) {
        const necessita = Number(ing.quantidade_necessaria) * quantidadeLote;
        if (Number(ing.saldo_insumo) < necessita) {
          throw new Error(`Estoque insuficiente de '${ing.nome_insumo}'. Disponível: ${formatarGrandezaAmigavel(ing.saldo_insumo, ing.unidade_base)}, necessário: ${formatarGrandezaAmigavel(necessita, ing.unidade_base)}`);
        }
      }

      // Baixa insumos
      for (const ing of ficha) {
        const debito = Number(ing.quantidade_necessaria) * quantidadeLote;
        await insumoRepository.debitarSaldo(ing.insumo_id, usuario_id, debito, conn);

        await estoqueMovimentacaoRepository.registrarMovimentacao({
          usuario_id,
          insumo_id: ing.insumo_id,
          tipo: 'SAIDA_PRODUCAO',
          quantidade: debito,
          motivo: `Produção de ${quantidadeLote}x ${servico.nome}`
        }, conn);
      }

      // Alimenta produto pronto
      await conn.query(
        'UPDATE servicos SET controla_estoque_pronto = 1, estoque_pronto_atual = estoque_pronto_atual + ? WHERE id = ? AND usuario_id = ?',
        [quantidadeLote, servico_id, usuario_id]
      );

      await estoqueMovimentacaoRepository.registrarMovimentacao({
        usuario_id,
        servico_id,
        tipo: 'ENTRADA_PRODUCAO',
        quantidade: quantidadeLote,
        motivo: `Lote de produção finalizado: ${quantidadeLote} unidades`
      }, conn);

      await conn.commit();
      return {
        servico_id,
        nome: servico.nome,
        quantidade_produzida: quantidadeLote
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /**
   * Executa a simulação produtiva.
   */
  async simularProducao(usuario_id, { servico_id, insumos_informados = null, usar_estoque_atual = false }) {
    const ficha = await fichaTecnicaRepository.obterFichaPorServico(usuario_id, servico_id);
    if (ficha.length === 0) {
      throw new Error('Produto não possui ficha técnica cadastrada para simulação');
    }

    let insumosDisponiveis = [];

    if (usar_estoque_atual) {
      insumosDisponiveis = ficha.map(ing => ({
        insumo_id: ing.insumo_id,
        quantidade_base: Number(ing.saldo_insumo)
      }));
    } else if (Array.isArray(insumos_informados) && insumos_informados.length > 0) {
      // Normaliza itens informados
      for (const inf of insumos_informados) {
        let insumo = null;
        if (inf.insumo_id) {
          insumo = ficha.find(f => f.insumo_id === Number(inf.insumo_id));
        } else if (inf.nome) {
          insumo = ficha.find(f => f.nome_insumo.toLowerCase() === inf.nome.trim().toLowerCase());
        }

        if (insumo) {
          const qtdBase = converterParaUnidadeBase(inf.quantidade, inf.unidade || insumo.unidade_base, insumo.unidade_base);
          insumosDisponiveis.push({
            insumo_id: insumo.insumo_id,
            quantidade_base: qtdBase
          });
        }
      }
    }

    return simularCapacidade({
      ingredientesFicha: ficha,
      insumosDisponiveis
    });
  }
};

module.exports = estoqueService;
```

- [ ] **Step 4: Executar teste e validar que passa**

Executar:
```bash
npm --prefix backend test -- backend/tests/integration/estoqueService.test.js
```
Resultado esperado: PASS.

- [ ] **Step 5: Commit da Task 6**

```bash
git add backend/src/services/estoqueService.js backend/tests/integration/estoqueService.test.js
git commit -m "feat(estoque): implementar servico integrador de estoque, producao e compras"
```

---

### Task 7: Conexão no Fluxo de Orçamentos (`orcamentoService.js`)

**Files:**
- Modify: `backend/src/services/orcamentoService.js`
- Test: `backend/tests/integration/fluxoOrcamentoEstoque.test.js`

**Interfaces:**
- Consumes: `estoqueService.processarAprovacaoOrcamento`, `estoqueService.estornarOrcamento`
- Modifies: `atualizarStatus` em `orcamentoService.js`

- [ ] **Step 1: Escrever teste de integração validando baixa de estoque ao aprovar orçamento**

Criar `backend/tests/integration/fluxoOrcamentoEstoque.test.js`:
```javascript
const pool = require('../../src/config/database');
const orcamentoService = require('../../src/services/orcamentoService');
const insumoRepository = require('../../src/repositories/insumoRepository');
const fichaTecnicaRepository = require('../../src/repositories/fichaTecnicaRepository');

describe('Integração Orçamento ↔ Estoque', () => {
  let usuarioId;
  let clienteId;
  let servicoId;
  let insumoId;

  beforeAll(async () => {
    const [uRes] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['Orc Estoque Teste', `teste_orc_est_${Date.now()}@teste.com`, 'hash']
    );
    usuarioId = uRes.insertId;

    const [cRes] = await pool.query(
      'INSERT INTO clientes (usuario_id, nome) VALUES (?, ?)',
      [usuarioId, 'Cliente Festa']
    );
    clienteId = cRes.insertId;

    const [sRes] = await pool.query(
      'INSERT INTO servicos (usuario_id, nome, preco) VALUES (?, ?, ?)',
      [usuarioId, 'Cento de Salgados Sortidos', 100.00]
    );
    servicoId = sRes.insertId;

    const insumo = await insumoRepository.criar({
      usuario_id: usuarioId,
      nome: 'Farinha Trigo Salgados',
      unidade_base: 'g',
      quantidade_atual: 5000,
      estoque_minimo: 1000,
      custo_unitario: 0.005
    });
    insumoId = insumo.id;

    await fichaTecnicaRepository.substituirFicha(usuarioId, servicoId, [
      { insumo_id: insumoId, quantidade_necessaria: 1000 }
    ]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
  });

  it('deve abater automaticamente os insumos quando o orçamento transiciona para APROVADO', async () => {
    const orc = await orcamentoService.criar({
      usuario_id: usuarioId,
      cliente_id: clienteId,
      data_emissao: '2026-10-08',
      status: 'RASCUNHO',
      itens: [{ servico_id: servicoId, quantidade: 2, preco_unitario: 100.00 }]
    });

    // Aprova o orçamento
    await orcamentoService.atualizarStatus(orc.id, usuarioId, 'APROVADO');

    // Saldo inicial era 5000g, 2 centos consom 2000g -> novo saldo deve ser 3000g
    const insumoAtualizado = await insumoRepository.buscarPorId(insumoId, usuarioId);
    expect(Number(insumoAtualizado.quantidade_atual)).toBe(3000);
  });
});
```

- [ ] **Step 2: Executar teste para verificar falha (pois `orcamentoService` ainda não chama `estoqueService`)**

Executar:
```bash
npm --prefix backend test -- backend/tests/integration/fluxoOrcamentoEstoque.test.js
```
Resultado esperado: FALHA (saldo permanece 5000).

- [ ] **Step 3: Conectar chamada do `estoqueService` em `backend/src/services/orcamentoService.js`**

Em `backend/src/services/orcamentoService.js`:
1. Importar `const estoqueService = require('./estoqueService');`.
2. No método `atualizarStatus`:
```javascript
    const statusAnterior = existente.status;
    const resultado = await orcamentoRepository.atualizarStatus(id, usuario_id, statusLimpo);

    if (statusAnterior !== 'APROVADO' && statusLimpo === 'APROVADO') {
      await estoqueService.processarAprovacaoOrcamento(id, usuario_id);
    } else if (statusAnterior === 'APROVADO' && statusLimpo === 'CANCELADO') {
      await estoqueService.estornarOrcamento(id, usuario_id);
    }

    return resultado;
```

- [ ] **Step 4: Executar teste e validar que passa**

Executar:
```bash
npm --prefix backend test -- backend/tests/integration/fluxoOrcamentoEstoque.test.js
```
Resultado esperado: PASS.

- [ ] **Step 5: Commit da Task 7**

```bash
git add backend/src/services/orcamentoService.js backend/tests/integration/fluxoOrcamentoEstoque.test.js
git commit -m "feat(estoque): conectar baixa e estorno automatico de estoque ao ciclo de orcamentos"
```

---

### Task 8: API REST — Controllers e Rotas (`estoqueController` e `estoqueRoutes`)

**Files:**
- Create: `backend/src/controllers/estoqueController.js`
- Create: `backend/src/routes/estoqueRoutes.js`
- Modify: `backend/src/app.js`
- Test: `backend/tests/integration/estoqueApi.test.js`

**Interfaces:**
- Produces: Rotas `/api/estoque/*` autenticadas via `authMiddleware`.

- [ ] **Step 1: Escrever teste de API REST com Supertest**

Criar `backend/tests/integration/estoqueApi.test.js`:
```javascript
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');
const jwt = require('jsonwebtoken');

describe('API REST /api/estoque', () => {
  let token;
  let usuarioId;

  beforeAll(async () => {
    const [uRes] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['API Estoque Teste', `teste_api_est_${Date.now()}@teste.com`, 'hash']
    );
    usuarioId = uRes.insertId;
    token = jwt.sign({ id: usuarioId }, process.env.JWT_SECRET || 'teste_jwt_secret', { expiresIn: '1h' });
  });

  afterAll(async () => {
    await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
  });

  it('deve cadastrar e listar insumos via REST', async () => {
    const postRes = await request(app)
      .post('/api/estoque/insumos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Açúcar Cristal',
        unidade_base: 'g',
        quantidade_atual: 1000,
        estoque_minimo: 200,
        custo_unitario: 0.004
      });

    expect(postRes.status).toBe(201);
    expect(postRes.body.dados.nome).toBe('Açúcar Cristal');

    const getRes = await request(app)
      .get('/api/estoque/insumos')
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.dados.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Executar teste para verificar falha**

Executar:
```bash
npm --prefix backend test -- backend/tests/integration/estoqueApi.test.js
```
Resultado esperado: FALHA (rota inexistente 404).

- [ ] **Step 3: Implementar `estoqueController.js`, `estoqueRoutes.js` e registrar em `app.js`**

Criar `backend/src/controllers/estoqueController.js`:
```javascript
const insumoRepository = require('../repositories/insumoRepository');
const fichaTecnicaRepository = require('../repositories/fichaTecnicaRepository');
const estoqueMovimentacaoRepository = require('../repositories/estoqueMovimentacaoRepository');
const estoqueService = require('../services/estoqueService');

const estoqueController = {
  async listarInsumos(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { busca, apenas_abaixo_minimo } = req.query;
      const insumos = await insumoRepository.listar(usuario_id, {
        busca,
        apenasAbaixoMinimo: apenas_abaixo_minimo === 'true'
      });
      return res.status(200).json({ sucesso: true, dados: insumos });
    } catch (err) {
      return res.status(500).json({ sucesso: false, mensagem: err.message });
    }
  },

  async cadastrarInsumo(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { nome, unidade_base, quantidade_atual, estoque_minimo, custo_unitario } = req.body;
      if (!nome || !unidade_base) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome e unidade_base são obrigatórios' });
      }
      const novo = await insumoRepository.criar({
        usuario_id,
        nome,
        unidade_base,
        quantidade_atual: Number(quantidade_atual) || 0,
        estoque_minimo: Number(estoque_minimo) || 0,
        custo_unitario: Number(custo_unitario) || 0
      });
      return res.status(201).json({ sucesso: true, dados: novo });
    } catch (err) {
      return res.status(500).json({ sucesso: false, mensagem: err.message });
    }
  },

  async registrarEntrada(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const resultado = await estoqueService.registrarEntradaInsumo(usuario_id, req.body);
      return res.status(200).json({ sucesso: true, dados: resultado });
    } catch (err) {
      return res.status(400).json({ sucesso: false, mensagem: err.message });
    }
  },

  async obterFichaTecnica(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { servicoId } = req.params;
      const ficha = await fichaTecnicaRepository.obterFichaPorServico(usuario_id, servicoId);

      let custoTotal = 0;
      for (const ing of ficha) {
        custoTotal += Number(ing.quantidade_necessaria) * Number(ing.custo_unitario);
      }

      return res.status(200).json({
        sucesso: true,
        dados: {
          servico_id: Number(servicoId),
          custo_ingredientes: Number(custoTotal.toFixed(2)),
          ingredientes: ficha
        }
      });
    } catch (err) {
      return res.status(500).json({ sucesso: false, mensagem: err.message });
    }
  },

  async salvarFichaTecnica(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { servico_id, ingredientes } = req.body;
      const salva = await fichaTecnicaRepository.substituirFicha(usuario_id, servico_id, ingredientes);
      return res.status(200).json({ sucesso: true, dados: salva });
    } catch (err) {
      return res.status(400).json({ sucesso: false, mensagem: err.message });
    }
  },

  async registrarProducao(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { servico_id, quantidade } = req.body;
      const resultado = await estoqueService.registrarLoteProducao(usuario_id, servico_id, Number(quantidade));
      return res.status(200).json({ sucesso: true, dados: resultado });
    } catch (err) {
      return res.status(400).json({ sucesso: false, mensagem: err.message });
    }
  },

  async simular(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const resultado = await estoqueService.simularProducao(usuario_id, req.body);
      return res.status(200).json({ sucesso: true, dados: resultado });
    } catch (err) {
      return res.status(400).json({ sucesso: false, mensagem: err.message });
    }
  },

  async listarMovimentacoes(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const { tipo, limite } = req.query;
      const movs = await estoqueMovimentacaoRepository.listarMovimentacoes(usuario_id, { tipo, limite });
      return res.status(200).json({ sucesso: true, dados: movs });
    } catch (err) {
      return res.status(500).json({ sucesso: false, mensagem: err.message });
    }
  }
};

module.exports = estoqueController;
```

Criar `backend/src/routes/estoqueRoutes.js`:
```javascript
const express = require('express');
const router = express.Router();
const estoqueController = require('../controllers/estoqueController');

router.get('/insumos', estoqueController.listarInsumos);
router.post('/insumos', estoqueController.cadastrarInsumo);
router.post('/insumos/entrada', estoqueController.registrarEntrada);
router.get('/fichas-tecnicas/:servicoId', estoqueController.obterFichaTecnica);
router.post('/fichas-tecnicas', estoqueController.salvarFichaTecnica);
router.post('/producao', estoqueController.registrarProducao);
router.post('/simulacao', estoqueController.simular);
router.get('/movimentacoes', estoqueController.listarMovimentacoes);

module.exports = router;
```

Registrar em `backend/src/app.js`:
```javascript
const estoqueRoutes = require('./routes/estoqueRoutes');
// ...
app.use('/api/estoque', authMiddleware, estoqueRoutes);
```

- [ ] **Step 4: Executar teste e validar que passa**

Executar:
```bash
npm --prefix backend test -- backend/tests/integration/estoqueApi.test.js
```
Resultado esperado: PASS.

- [ ] **Step 5: Commit da Task 8**

```bash
git add backend/src/controllers/estoqueController.js backend/src/routes/estoqueRoutes.js backend/src/app.js backend/tests/integration/estoqueApi.test.js
git commit -m "feat(estoque): expor endpoints REST do modulo de estoque e producao"
```

---

### Task 9: Ferramentas MCP Espelhadas no Servidor de IA (`ai-service/mcp_server`)

**Files:**
- Modify: `ai-service/mcp_server/server.py`
- Test: `ai-service/tests/test_mcp_estoque.py`

**Constraints:** Não modificar arquivos em `ai-service/app/llm/` nem a lógica de seleção de modelos.

- [ ] **Step 1: Escrever teste pytest para as ferramentas MCP de estoque**

Criar `ai-service/tests/test_mcp_estoque.py`:
```python
import pytest
from unittest.mock import patch, AsyncMock
from mcp_server.server import (
    listar_insumos_estoque,
    cadastrar_insumo,
    registrar_compra_insumo,
    simular_producao
)

@pytest.mark.asyncio
async def test_listar_insumos_estoque_mcp():
    with patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = [
            {"id": 1, "nome": "Farinha", "quantidade_atual": 2500, "unidade_base": "g", "estoque_minimo": 1000}
        ]
        res = await listar_insumos_estoque()
        assert res["total"] == 1
        assert res["insumos"][0]["nome"] == "Farinha"

@pytest.mark.asyncio
async def test_simular_producao_mcp():
    with patch("mcp_server.server._post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = {
            "sucesso": True,
            "dados": {
                "rendimentoMaximo": 2,
                "insumoLimitante": {"nome": "Frango", "faltaFormatada": "400 g"}
            }
        }
        res = await simular_producao(servico_id=10, usar_estoque_atual=True)
        assert res["sucesso"] is True
        assert res["dados"]["rendimentoMaximo"] == 2
```

- [ ] **Step 2: Executar teste para verificar falha**

Executar:
```bash
.venv/bin/pytest ai-service/tests/test_mcp_estoque.py
```
Resultado esperado: FALHA (ferramentas não definidas no `server.py`).

- [ ] **Step 3: Adicionar as ferramentas de estoque em `ai-service/mcp_server/server.py`**

Adicionar ao final de `ai-service/mcp_server/server.py`:
```python
@mcp_server_app.tool()
async def listar_insumos_estoque(busca: Optional[str] = None, apenas_abaixo_minimo: bool = False) -> Dict[str, Any]:
    """Lista matérias-primas e insumos cadastrados, seus saldos atuais e alertas de estoque mínimo."""
    params = {}
    if busca:
        params["busca"] = busca
    if apenas_abaixo_minimo:
        params["apenas_abaixo_minimo"] = "true"

    dados = await _fetch("/estoque/insumos", params=params)
    if isinstance(dados, dict) and "erro" in dados:
        return dados
    lista = dados if isinstance(dados, list) else []
    return {
        "total": len(lista),
        "insumos": lista
    }

@mcp_server_app.tool()
async def cadastrar_insumo(
    nome: str,
    unidade_base: str,
    estoque_minimo: float = 0.0,
    custo_unitario: float = 0.0
) -> Dict[str, Any]:
    """Cadastra um novo insumo/ingrediente. Unidade base deve ser 'g' (gramas), 'ml' (mililitros) ou 'un' (unidades)."""
    payload = {
        "nome": nome.strip(),
        "unidade_base": unidade_base.strip().lower(),
        "estoque_minimo": float(estoque_minimo),
        "custo_unitario": float(custo_unitario)
    }
    return await _post("/estoque/insumos", payload)

@mcp_server_app.tool()
async def registrar_compra_insumo(
    nome_ou_id: Any,
    quantidade: float,
    unidade: str,
    custo_total: Optional[float] = None,
    lancar_no_caixa: bool = True
) -> Dict[str, Any]:
    """Registra uma entrada/compra de insumo com conversão automática de unidades e opção de lançar despesa no Livro Caixa."""
    payload = {
        "quantidade": float(quantidade),
        "unidade": unidade,
        "lancar_no_caixa": lancar_no_caixa
    }
    if custo_total is not None:
        payload["custo_total"] = float(custo_total)

    if isinstance(nome_ou_id, int) or (isinstance(nome_ou_id, str) and nome_ou_id.isdigit()):
        payload["insumo_id"] = int(nome_ou_id)
    else:
        payload["nome"] = str(nome_ou_id)

    return await _post("/estoque/insumos/entrada", payload)

@mcp_server_app.tool()
async def obter_ficha_tecnica_e_custo(servico_id: int) -> Dict[str, Any]:
    """Consulta os ingredientes e o custo total de confecção (CMV) de um produto do catálogo."""
    return await _fetch(f"/estoque/fichas-tecnicas/{servico_id}")

@mcp_server_app.tool()
async def definir_ficha_tecnica(servico_id: int, ingredientes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Define ou substitui a receita de um produto com os insumos necessários e suas quantidades na unidade base."""
    payload = {
        "servico_id": int(servico_id),
        "ingredientes": ingredientes
    }
    return await _post("/estoque/fichas-tecnicas", payload)

@mcp_server_app.tool()
async def registrar_lote_producao(servico_id: int, quantidade: int) -> Dict[str, Any]:
    """Registra a produção de um lote de produtos prontos, dando baixa automática nos insumos correspondentes."""
    payload = {
        "servico_id": int(servico_id),
        "quantidade": int(quantidade)
    }
    return await _post("/estoque/producao", payload)

@mcp_server_app.tool()
async def simular_producao(
    servico_id: int,
    insumos_informados: Optional[List[Dict[str, Any]]] = None,
    usar_estoque_atual: bool = False
) -> Dict[str, Any]:
    """Simula capacidade produtiva ('Com tanto de X e Y, quantos Z consigo fazer?'), identificando o ingrediente limitante e sobras."""
    payload = {
        "servico_id": int(servico_id),
        "usar_estoque_atual": usar_estoque_atual
    }
    if insumos_informados:
        payload["insumos_informados"] = insumos_informados
    return await _post("/estoque/simulacao", payload)

@mcp_server_app.tool()
async def consultar_historico_estoque(limite: int = 20) -> Dict[str, Any]:
    """Consulta o histórico recente de entradas, saídas e movimentações do estoque."""
    return await _fetch("/estoque/movimentacoes", params={"limite": min(max(1, limite), 50)})
```

- [ ] **Step 4: Executar testes pytest e validar aprovação**

Executar:
```bash
.venv/bin/pytest ai-service/tests/test_mcp_estoque.py
```
Resultado esperado: PASS.

- [ ] **Step 5: Commit da Task 9**

```bash
git add ai-service/mcp_server/server.py ai-service/tests/test_mcp_estoque.py
git commit -m "feat(mcp): adicionar ferramentas mcp de estoque, simulacao e receitas"
```

---

### Task 10: Verificação de Integração Completa & Regressão

**Files:**
- Test: `tests/e2e-estoque-completo.test.js`

- [ ] **Step 1: Escrever teste ponta a ponta do ciclo completo do MEI produtor**

Criar `tests/e2e-estoque-completo.test.js`:
```javascript
const request = require('supertest');
const app = require('../backend/src/app');
const pool = require('../backend/src/config/database');
const jwt = require('jsonwebtoken');

describe('E2E - Ciclo Completo do Empreendedor Produtor (Estoque, Receita, Caixa e Venda)', () => {
  let token;
  let usuarioId;
  let clienteId;
  let servicoId;
  let farinhaId;
  let frangoId;

  beforeAll(async () => {
    const [uRes] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['Produtor E2E', `e2e_prod_${Date.now()}@teste.com`, 'hash']
    );
    usuarioId = uRes.insertId;
    token = jwt.sign({ id: usuarioId }, process.env.JWT_SECRET || 'teste_jwt_secret', { expiresIn: '1h' });

    const [cRes] = await pool.query(
      'INSERT INTO clientes (usuario_id, nome) VALUES (?, ?)',
      [usuarioId, 'Cliente Festas Buffet']
    );
    clienteId = cRes.insertId;

    const [sRes] = await pool.query(
      'INSERT INTO servicos (usuario_id, nome, preco) VALUES (?, ?, ?)',
      [usuarioId, 'Cento de Coxinha de Frango', 90.00]
    );
    servicoId = sRes.insertId;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
  });

  it('deve executar o ciclo: compra com caixa -> receita -> simulação -> venda com baixa', async () => {
    // 1. Cadastra e compra Farinha (5kg por R$ 25 com lançamento no caixa)
    const resFar = await request(app)
      .post('/api/estoque/insumos/entrada')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Farinha Trigo',
        unidade_base: 'g',
        quantidade: 5,
        unidade: 'kg',
        custo_total: 25.00,
        lancar_no_caixa: true
      });
    expect(resFar.status).toBe(200);
    farinhaId = resFar.body.dados.insumo_id;

    // 2. Cadastra e compra Frango (3kg por R$ 45 com lançamento no caixa)
    const resFra = await request(app)
      .post('/api/estoque/insumos/entrada')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Frango Peito',
        unidade_base: 'g',
        quantidade: 3,
        unidade: 'kg',
        custo_total: 45.00,
        lancar_no_caixa: true
      });
    expect(resFra.status).toBe(200);
    frangoId = resFra.body.dados.insumo_id;

    // Valida que o Livro Caixa registrou R$ 70,00 de despesas
    const [movCaixa] = await pool.query(
      'SELECT SUM(valor) AS total_despesas FROM movimentacoes WHERE usuario_id = ? AND tipo = "SAIDA"',
      [usuarioId]
    );
    expect(Number(movCaixa[0].total_despesas)).toBe(70.00);

    // 3. Define Ficha Técnica: 1 cento de coxinha = 1000g farinha + 800g frango
    const resFt = await request(app)
      .post('/api/estoque/fichas-tecnicas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        servico_id: servicoId,
        ingredientes: [
          { insumo_id: farinhaId, quantidade_necessaria: 1000 },
          { insumo_id: frangoId, quantidade_necessaria: 800 }
        ]
      });
    expect(resFt.status).toBe(200);

    // 4. Simulação: quantos centos consigo fazer com estoque atual? (5000g farinha e 3000g frango)
    // Farinha dá para 5 centos; Frango dá para floor(3000/800) = 3 centos -> gargalo é o frango
    const resSim = await request(app)
      .post('/api/estoque/simulacao')
      .set('Authorization', `Bearer ${token}`)
      .send({
        servico_id: servicoId,
        usar_estoque_atual: true
      });
    expect(resSim.status).toBe(200);
    expect(resSim.body.dados.rendimentoMaximo).toBe(3);
    expect(resSim.body.dados.insumoLimitante.nome).toBe('Frango Peito');

    // 5. Venda: Cria orçamento para 2 centos de coxinha e aprova
    const resOrc = await request(app)
      .post('/api/orcamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        data_emissao: '2026-10-08',
        itens: [{ servico_id: servicoId, quantidade: 2, preco_unitario: 90.00 }]
      });
    const orcId = resOrc.body.dados.id;

    await request(app)
      .patch(`/api/orcamentos/${orcId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'APROVADO' });

    // 6. Verifica saldos após a venda de 2 centos:
    // Farinha: 5000 - (2 * 1000) = 3000g
    // Frango: 3000 - (2 * 800) = 1400g
    const [insumosFinais] = await pool.query(
      'SELECT id, quantidade_atual FROM insumos WHERE usuario_id = ?',
      [usuarioId]
    );
    const salFar = insumosFinais.find(i => i.id === farinhaId);
    const salFra = insumosFinais.find(i => i.id === frangoId);
    expect(Number(salFar.quantidade_atual)).toBe(3000);
    expect(Number(salFra.quantidade_atual)).toBe(1400);
  });
});
```

- [ ] **Step 2: Executar toda a suíte de testes do projeto para garantir zero regressões**

Executar:
```bash
npm run test:backend
.venv/bin/pytest ai-service/tests
```
Resultado esperado: Todos os testes passam com sucesso.

- [ ] **Step 3: Commit final da verificação**

```bash
git add tests/e2e-estoque-completo.test.js
git commit -m "test: adicionar teste e2e completo do ciclo de estoque, receitas, simulacao e vendas"
```

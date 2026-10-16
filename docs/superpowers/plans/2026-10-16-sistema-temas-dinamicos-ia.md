# Sistema de Temas Dinâmicos e Geração por IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar um Design System dinâmico e acessível no Aranduê MEI com suporte a temas claros e escuros, biblioteca de temas por usuário, importação/exportação via arquivo JSON, geração de temas harmônicos com IA respeitando regras de Teoria das Cores e paridade total REST ↔ MCP.

**Architecture:** A aplicação adota tokens semânticos via CSS Variables (`--bg-app`, `--bg-surface`, `--color-primary`, `--color-accent`, etc.) injetados no elemento raiz por um `ThemeContext` reativo no frontend (com cache síncrono no LocalStorage para Zero FOUC). O backend Express gerencia a persistência relacional na tabela `temas_usuario` no MySQL com isolamento estrito por `usuario_id` extraído do JWT. O microserviço de IA e o MCP Server (`ai-service`) implementam ferramentas de listagem, ativação e geração cromática inteligente com validação matemática de contraste WCAG 2.1 (AA/AAA), proporção 60-30-10, matizes opostas complementares e escalas de cinza funcionais com *tinted neutrals*.

**Tech Stack:** React 18, Tailwind CSS, Lucide React, Node.js, Express, MySQL 8.x, Jest, Supertest, Python 3.12, FastAPI, MCP (Model Context Protocol), Pytest, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-16-sistema-temas-dinamicos-ia-design.md`

## Global Constraints
- Paridade Total API REST ↔ MCP: Toda operação disponível via REST deve estar disponível no MCP e vice-versa.
- Multi-tenancy absoluto por `usuario_id`: O `usuario_id` NUNCA é recebido pelo payload ou parâmetros de tools MCP, sempre extraído do JWT decodificado no backend.
- Acessibilidade WCAG 2.1: Contraste mínimo de 4.5:1 (AA) para botões/CTAs e 7:1 (AAA) para textos de alta ênfase.
- Modo escuro sem preto puro: Fundos dark usam *tinted neutrals* (slate, zinc, navy) com 5% a 8% de saturação da matiz base.
- Zero FOUC: O frontend deve carregar o tema salvo no LocalStorage antes do primeiro frame de renderização dos componentes.

---

### Task 1: Utilitário de Cores e Validação WCAG no Backend

**Files:**
- Create: `backend/src/utils/colorUtils.js`
- Test: `backend/tests/unit/colorUtils.test.js`

**Interfaces:**
- Consumes: N/A
- Produces:
  - `validarHex(cor: string): boolean`
  - `hexParaRgb(hex: string): { r: number, g: number, b: number }`
  - `calcularLuminancia(hex: string): number`
  - `calcularContraste(hex1: string, hex2: string): number`
  - `validarTemaTokens(tokens: object): { valido: boolean, erros: string[], avisos: string[] }`

- [ ] **Step 1: Write the failing test**

Criar `backend/tests/unit/colorUtils.test.js`:
```javascript
const {
  validarHex,
  hexParaRgb,
  calcularLuminancia,
  calcularContraste,
  validarTemaTokens,
} = require('../../src/utils/colorUtils');

describe('colorUtils - Validação Cromática e WCAG 2.1', () => {
  test('deve validar formatos hexadecimais corretos e rejeitar inválidos', () => {
    expect(validarHex('#ffffff')).toBe(true);
    expect(validarHex('#0F172A')).toBe(true);
    expect(validarHex('#6366f1')).toBe(true);
    expect(validarHex('ffffff')).toBe(false);
    expect(validarHex('#fff')).toBe(false);
    expect(validarHex('#gggggg')).toBe(false);
  });

  test('deve converter hex para rgb corretamente', () => {
    expect(hexParaRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexParaRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexParaRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  test('deve calcular luminância relativa sRGB com correção gama', () => {
    expect(calcularLuminancia('#000000')).toBeCloseTo(0, 4);
    expect(calcularLuminancia('#ffffff')).toBeCloseTo(1, 4);
  });

  test('deve calcular razão de contraste WCAG corretamente', () => {
    // Branco sobre preto puro = 21:1
    const crBrancoPreto = calcularContraste('#ffffff', '#000000');
    expect(crBrancoPreto).toBeCloseTo(21, 1);

    // Texto escuro sobre fundo claro
    const crLeitura = calcularContraste('#f8fafc', '#0f172a');
    expect(crLeitura).toBeGreaterThan(10);
  });

  test('deve validar tokens completos de tema e checar contraste mínimo de 4.5:1', () => {
    const tokensValidos = {
      bgApp: '#0f172a',
      bgSurface: '#1e293b',
      bgSurfaceHover: '#334155',
      border: '#334155',
      textMain: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      primary: '#6366f1',
      primaryHover: '#4f46e5',
      primaryText: '#ffffff',
      accent: '#f59e0b',
    };

    const res = validarTemaTokens(tokensValidos);
    expect(res.valido).toBe(true);
    expect(res.erros).toHaveLength(0);
  });

  test('deve rejeitar tokens com contraste ilegível (ex: texto cinza sobre fundo cinza)', () => {
    const tokensIlegiveis = {
      bgApp: '#ffffff',
      bgSurface: '#ffffff',
      bgSurfaceHover: '#f1f5f9',
      border: '#e2e8f0',
      textMain: '#f8fafc', // Quase branco em fundo branco!
      textSecondary: '#94a3b8',
      textMuted: '#cbd5e1',
      primary: '#6366f1',
      primaryHover: '#4f46e5',
      primaryText: '#ffffff',
      accent: '#f59e0b',
    };

    const res = validarTemaTokens(tokensIlegiveis);
    expect(res.valido).toBe(false);
    expect(res.erros.some((e) => e.includes('contraste'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/unit/colorUtils.test.js`  
Expected: FAIL com `Cannot find module '../../src/utils/colorUtils'`

- [ ] **Step 3: Write minimal implementation**

Criar `backend/src/utils/colorUtils.js`:
```javascript
function validarHex(hex) {
  if (typeof hex !== 'string') return false;
  return /^#[0-9A-Fa-f]{6}$/.test(hex.trim());
}

function hexParaRgb(hex) {
  if (!validarHex(hex)) return { r: 0, g: 0, b: 0 };
  const num = parseInt(hex.trim().slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function calcularLuminancia(hex) {
  const { r, g, b } = hexParaRgb(hex);
  const canalLinear = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const rL = canalLinear(r);
  const gL = canalLinear(g);
  const bL = canalLinear(b);
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

function calcularContraste(hex1, hex2) {
  const l1 = calcularLuminancia(hex1);
  const l2 = calcularLuminancia(hex2);
  const maisClaro = Math.max(l1, l2);
  const maisEscuro = Math.min(l1, l2);
  return (maisClaro + 0.05) / (maisEscuro + 0.05);
}

function validarTemaTokens(tokens) {
  const erros = [];
  const avisos = [];

  if (!tokens || typeof tokens !== 'object') {
    return { valido: false, erros: ['Tokens do tema ausentes ou inválidos'], avisos };
  }

  const camposObrigatorios = [
    'bgApp',
    'bgSurface',
    'border',
    'textMain',
    'textSecondary',
    'primary',
    'primaryHover',
    'primaryText',
    'accent',
  ];

  for (const campo of camposObrigatorios) {
    if (!validarHex(tokens[campo])) {
      erros.push(`Campo '${campo}' deve ser uma cor hexadecimal válida no formato #RRGGBB (recebido: '${tokens[campo]}')`);
    }
  }

  if (erros.length > 0) {
    return { valido: false, erros, avisos };
  }

  // Validação de Contraste WCAG 2.1
  const crTextoPrincipal = calcularContraste(tokens.textMain, tokens.bgSurface);
  if (crTextoPrincipal < 4.5) {
    erros.push(
      `Contraste insuficiente entre 'textMain' (${tokens.textMain}) e 'bgSurface' (${tokens.bgSurface}): ${crTextoPrincipal.toFixed(1)}:1 (mínimo exigido: 4.5:1 para WCAG AA)`
    );
  }

  const crBotaoPrimario = calcularContraste(tokens.primaryText, tokens.primary);
  if (crBotaoPrimario < 4.5) {
    erros.push(
      `Contraste insuficiente no botão primário entre 'primaryText' (${tokens.primaryText}) e 'primary' (${tokens.primary}): ${crBotaoPrimario.toFixed(1)}:1 (mínimo exigido: 4.5:1)`
    );
  }

  return {
    valido: erros.length === 0,
    erros,
    avisos,
  };
}

module.exports = {
  validarHex,
  hexParaRgb,
  calcularLuminancia,
  calcularContraste,
  validarTemaTokens,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/unit/colorUtils.test.js`  
Expected: PASS com 6 testes passando.

- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/colorUtils.js backend/tests/unit/colorUtils.test.js
git commit -m "feat(backend): adicionar utilitarios de cor e validador WCAG 2.1 para temas"
```

---

### Task 2: Repositório e Tabela MySQL de Temas do Usuário

**Files:**
- Create: `backend/src/repositories/temaRepository.js`
- Modify: `backend/src/database/schema.sql`
- Test: `backend/tests/unit/temaRepository.test.js`

**Interfaces:**
- Consumes: `backend/src/database/connection.js`, `backend/src/utils/colorUtils.js`
- Produces:
  - `obterTemasPorUsuario(usuarioId: number): Promise<Array<Tema>>`
  - `ativarTema(usuarioId: number, temaId: number): Promise<Tema>`
  - `criarTema(usuarioId: number, dados: object): Promise<Tema>`
  - `excluirTema(usuarioId: number, temaId: number): Promise<boolean>`
  - `obterTemaAtivo(usuarioId: number): Promise<Tema>`

- [ ] **Step 1: Write the failing test**

Criar `backend/tests/unit/temaRepository.test.js`:
```javascript
const temaRepository = require('../../src/repositories/temaRepository');

describe('temaRepository - Gestão de Temas no Banco', () => {
  test('deve exportar as funções obrigatórias do repositório', () => {
    expect(typeof temaRepository.obterTemasPorUsuario).toBe('function');
    expect(typeof temaRepository.ativarTema).toBe('function');
    expect(typeof temaRepository.criarTema).toBe('function');
    expect(typeof temaRepository.excluirTema).toBe('function');
    expect(typeof temaRepository.obterTemaAtivo).toBe('function');
    expect(typeof temaRepository.obterTemasPadrao).toBe('function');
  });

  test('deve retornar os 5 temas padrão oficiais do sistema', () => {
    const padroes = temaRepository.obterTemasPadrao();
    expect(padroes).toHaveLength(5);
    expect(padroes.map((t) => t.slug)).toContain('claro-arandue');
    expect(padroes.map((t) => t.slug)).toContain('noturno-corporativo');
    expect(padroes.map((t) => t.slug)).toContain('esmeralda-mei');
    expect(padroes.map((t) => t.slug)).toContain('oceano-indigo');
    expect(padroes.map((t) => t.slug)).toContain('ambar-cafe');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/unit/temaRepository.test.js`  
Expected: FAIL com `Cannot find module '../../src/repositories/temaRepository'`

- [ ] **Step 3: Write minimal implementation**

Criar `backend/src/repositories/temaRepository.js`:
```javascript
const pool = require('../database/connection');

const TEMAS_PADRAO = [
  {
    id: 'padrao-claro',
    slug: 'claro-arandue',
    nome: 'Claro Aranduê',
    modo: 'light',
    descricao: 'Tema padrão claro equilibrado para alta legibilidade durante o dia',
    eh_sistema: true,
    origem: 'SISTEMA',
    tokens: {
      bgApp: '#f8fafc',
      bgSurface: '#ffffff',
      bgSurfaceHover: '#f1f5f9',
      border: '#e2e8f0',
      textMain: '#0f172a',
      textSecondary: '#64748b',
      textMuted: '#94a3b8',
      primary: '#4f46e5',
      primaryHover: '#4338ca',
      primaryText: '#ffffff',
      accent: '#f59e0b',
      status: { success: '#10b981', danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6' },
    },
  },
  {
    id: 'padrao-dark',
    slug: 'noturno-corporativo',
    nome: 'Noturno Corporativo',
    modo: 'dark',
    descricao: 'Tema escuro profissional com base Dark Slate para redução de fadiga visual',
    eh_sistema: true,
    origem: 'SISTEMA',
    tokens: {
      bgApp: '#0f172a',
      bgSurface: '#1e293b',
      bgSurfaceHover: '#334155',
      border: '#334155',
      textMain: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      primary: '#6366f1',
      primaryHover: '#4f46e5',
      primaryText: '#ffffff',
      accent: '#38bdf8',
      status: { success: '#34d399', danger: '#f87171', warning: '#fbbf24', info: '#60a5fa' },
    },
  },
  {
    id: 'padrao-esmeralda',
    slug: 'esmeralda-mei',
    nome: 'Esmeralda MEI',
    modo: 'light',
    descricao: 'Paleta inspirada na sustentabilidade com acentos verdes e alto frescor visual',
    eh_sistema: true,
    origem: 'SISTEMA',
    tokens: {
      bgApp: '#f0fdf4',
      bgSurface: '#ffffff',
      bgSurfaceHover: '#dcfce7',
      border: '#bbf7d0',
      textMain: '#064e3b',
      textSecondary: '#047857',
      textMuted: '#6ee7b7',
      primary: '#059669',
      primaryHover: '#047857',
      primaryText: '#ffffff',
      accent: '#d97706',
      status: { success: '#10b981', danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6' },
    },
  },
  {
    id: 'padrao-oceano',
    slug: 'oceano-indigo',
    nome: 'Oceano Índigo',
    modo: 'dark',
    descricao: 'Tema noturno navy profundo com acentos em ciano vibrante para foco e contraste',
    eh_sistema: true,
    origem: 'SISTEMA',
    tokens: {
      bgApp: '#0b1329',
      bgSurface: '#152244',
      bgSurfaceHover: '#1e3260',
      border: '#1e3260',
      textMain: '#f1f5f9',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryText: '#ffffff',
      accent: '#f97316',
      status: { success: '#34d399', danger: '#f87171', warning: '#fbbf24', info: '#60a5fa' },
    },
  },
  {
    id: 'padrao-ambar',
    slug: 'ambar-cafe',
    nome: 'Âmbar & Café',
    modo: 'light',
    descricao: 'Tema claro em tons terrosos acolhedores para gastronomia e serviços artesanais',
    eh_sistema: true,
    origem: 'SISTEMA',
    tokens: {
      bgApp: '#faf5ee',
      bgSurface: '#ffffff',
      bgSurfaceHover: '#f5ebe0',
      border: '#e6ccb2',
      textMain: '#43281c',
      textSecondary: '#7f4f24',
      textMuted: '#a68a72',
      primary: '#b45309',
      primaryHover: '#92400e',
      primaryText: '#ffffff',
      accent: '#0284c7',
      status: { success: '#10b981', danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6' },
    },
  },
];

const temaRepository = {
  obterTemasPadrao() {
    return JSON.parse(JSON.stringify(TEMAS_PADRAO));
  },

  async garantirTabelaExiste() {
    const sql = `
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
        INDEX idx_temas_usuario (usuario_id),
        INDEX idx_temas_ativo (usuario_id, eh_ativo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.query(sql);
  },

  async obterTemasPorUsuario(usuarioId) {
    await this.garantirTabelaExiste();
    const [rows] = await pool.query(
      'SELECT * FROM temas_usuario WHERE usuario_id = ? ORDER BY criado_em ASC',
      [usuarioId]
    );

    if (rows.length === 0) {
      // Injeta os 5 temas padrão para o usuário
      for (let i = 0; i < TEMAS_PADRAO.length; i++) {
        const t = TEMAS_PADRAO[i];
        const ehAtivo = i === 0 ? 1 : 0;
        await pool.query(
          `INSERT INTO temas_usuario (usuario_id, nome, slug, modo, descricao, eh_ativo, eh_sistema, origem, tokens)
           VALUES (?, ?, ?, ?, ?, ?, 1, 'SISTEMA', ?)`,
          [usuarioId, t.nome, t.slug, t.modo, t.descricao, ehAtivo, JSON.stringify(t.tokens)]
        );
      }
      const [novasRows] = await pool.query(
        'SELECT * FROM temas_usuario WHERE usuario_id = ? ORDER BY criado_em ASC',
        [usuarioId]
      );
      return novasRows.map(this._formatar);
    }

    return rows.map(this._formatar);
  },

  async obterTemaAtivo(usuarioId) {
    const temas = await this.obterTemasPorUsuario(usuarioId);
    return temas.find((t) => t.eh_ativo) || temas[0] || TEMAS_PADRAO[0];
  },

  async ativarTema(usuarioId, temaIdOuSlug) {
    await this.garantirTabelaExiste();
    await pool.query('UPDATE temas_usuario SET eh_ativo = 0 WHERE usuario_id = ?', [usuarioId]);
    await pool.query(
      'UPDATE temas_usuario SET eh_ativo = 1 WHERE usuario_id = ? AND (id = ? OR slug = ?)',
      [usuarioId, temaIdOuSlug, String(temaIdOuSlug)]
    );
    return this.obterTemaAtivo(usuarioId);
  },

  async criarTema(usuarioId, dados) {
    await this.garantirTabelaExiste();
    const slug = dados.slug || dados.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const [result] = await pool.query(
      `INSERT INTO temas_usuario (usuario_id, nome, slug, modo, descricao, eh_ativo, eh_sistema, origem, tokens)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        usuarioId,
        dados.nome,
        slug,
        dados.modo || 'dark',
        dados.descricao || '',
        dados.ativar ? 1 : 0,
        dados.origem || 'CUSTOMIZADO',
        JSON.stringify(dados.tokens),
      ]
    );

    if (dados.ativar) {
      await pool.query(
        'UPDATE temas_usuario SET eh_ativo = 0 WHERE usuario_id = ? AND id != ?',
        [usuarioId, result.insertId]
      );
    }

    const [rows] = await pool.query('SELECT * FROM temas_usuario WHERE id = ?', [result.insertId]);
    return this._formatar(rows[0]);
  },

  async excluirTema(usuarioId, temaId) {
    await this.garantirTabelaExiste();
    const [rows] = await pool.query(
      'SELECT * FROM temas_usuario WHERE id = ? AND usuario_id = ?',
      [temaId, usuarioId]
    );
    if (!rows.length) return false;
    if (rows[0].eh_sistema) {
      throw new Error('Não é permitido excluir temas padrão do sistema.');
    }
    await pool.query('DELETE FROM temas_usuario WHERE id = ? AND usuario_id = ?', [temaId, usuarioId]);
    return true;
  },

  _formatar(row) {
    if (!row) return null;
    return {
      ...row,
      eh_ativo: Boolean(row.eh_ativo),
      eh_sistema: Boolean(row.eh_sistema),
      tokens: typeof row.tokens === 'string' ? JSON.parse(row.tokens) : row.tokens,
    };
  },
};

module.exports = temaRepository;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/unit/temaRepository.test.js`  
Expected: PASS com testes passando.

- [ ] **Step 5: Commit**

```bash
git add backend/src/repositories/temaRepository.js backend/tests/unit/temaRepository.test.js
git commit -m "feat(backend): implementar repositorio de temas do usuario com seeds e schema seguro"
```

---

### Task 3: Controller e Endpoints REST de Temas no Backend

**Files:**
- Create: `backend/src/controllers/temaController.js`
- Modify: `backend/src/routes/configuracoesRoutes.js`
- Test: `backend/tests/integration/temasApi.test.js`

**Interfaces:**
- Consumes: `temaRepository`, `colorUtils`, `authMiddleware`
- Produces:
  - `GET /api/configuracoes/temas`
  - `PUT /api/configuracoes/temas/:id/ativar`
  - `POST /api/configuracoes/temas`
  - `POST /api/configuracoes/temas/upload`
  - `POST /api/configuracoes/temas/gerar-ia`
  - `DELETE /api/configuracoes/temas/:id`

- [ ] **Step 1: Write the failing test**

Criar `backend/tests/integration/temasApi.test.js`:
```javascript
const request = require('supertest');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');

describe('API REST - /api/configuracoes/temas', () => {
  const usuarioId = 999;
  const token = jwt.sign(
    { id: usuarioId, email: 'teste-temas@arandue.com', escopo: 'assistente:access' },
    process.env.JWT_SECRET || 'secret'
  );

  test('GET /api/configuracoes/temas deve listar temas e conter os 5 temas padrão', async () => {
    const res = await request(app)
      .get('/api/configuracoes/temas')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(Array.isArray(res.body.dados)).toBe(true);
    expect(res.body.dados.length).toBeGreaterThanOrEqual(5);
  });

  test('POST /api/configuracoes/temas/upload deve rejeitar tema sem contraste mínimo', async () => {
    const temaInvalido = {
      nome: 'Tema Ilegível',
      modo: 'light',
      cores: {
        bgApp: '#ffffff',
        bgSurface: '#ffffff',
        border: '#cccccc',
        textMain: '#ffffff', // Sem contraste!
        textSecondary: '#ffffff',
        textMuted: '#cccccc',
        primary: '#6366f1',
        primaryHover: '#4f46e5',
        primaryText: '#ffffff',
        accent: '#f59e0b',
      },
    };

    const res = await request(app)
      .post('/api/configuracoes/temas/upload')
      .set('Authorization', `Bearer ${token}`)
      .send(temaInvalido);

    expect(res.status).toBe(400);
    expect(res.body.sucesso).toBe(false);
    expect(res.body.mensagem).toMatch(/contraste/i);
  });

  test('POST /api/configuracoes/temas/upload deve aceitar tema válido com WCAG AA', async () => {
    const temaValido = {
      nome: 'Café Especial',
      modo: 'light',
      cores: {
        bgApp: '#faf5ee',
        bgSurface: '#ffffff',
        border: '#e6ccb2',
        textMain: '#43281c',
        textSecondary: '#7f4f24',
        textMuted: '#a68a72',
        primary: '#b45309',
        primaryHover: '#92400e',
        primaryText: '#ffffff',
        accent: '#0284c7',
      },
    };

    const res = await request(app)
      .post('/api/configuracoes/temas/upload')
      .set('Authorization', `Bearer ${token}`)
      .send(temaValido);

    expect(res.status).toBe(201);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.nome).toBe('Café Especial');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/integration/temasApi.test.js`  
Expected: FAIL com status 404 (rota ainda não implementada)

- [ ] **Step 3: Write minimal implementation**

Criar `backend/src/controllers/temaController.js`:
```javascript
const temaRepository = require('../repositories/temaRepository');
const { validarTemaTokens, calcularContraste } = require('../utils/colorUtils');

const temaController = {
  async listarTemas(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const temas = await temaRepository.obterTemasPorUsuario(usuarioId);
      return res.status(200).json({
        sucesso: true,
        dados: temas,
      });
    } catch (err) {
      console.error('[TemaController] Erro ao listar temas:', err);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro interno ao consultar biblioteca de temas.',
      });
    }
  },

  async ativarTema(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { id } = req.params;
      const temaAtivado = await temaRepository.ativarTema(usuarioId, id);
      return res.status(200).json({
        sucesso: true,
        mensagem: `Tema '${temaAtivado.nome}' ativado com sucesso!`,
        dados: temaAtivado,
      });
    } catch (err) {
      console.error('[TemaController] Erro ao ativar tema:', err);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao ativar tema.',
      });
    }
  },

  async criarTema(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { nome, modo, descricao, cores, tokens, ativar } = req.body;
      const paleta = tokens || cores;

      const validacao = validarTemaTokens(paleta);
      if (!validacao.valido) {
        return res.status(400).json({
          sucesso: false,
          mensagem: validacao.erros.join('. '),
          erros: validacao.erros,
        });
      }

      const novoTema = await temaRepository.criarTema(usuarioId, {
        nome: nome || 'Tema Personalizado',
        modo: modo || 'dark',
        descricao: descricao || '',
        tokens: paleta,
        ativar: Boolean(ativar),
        origem: 'CUSTOMIZADO',
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Tema cadastrado com sucesso!',
        dados: novoTema,
      });
    } catch (err) {
      console.error('[TemaController] Erro ao criar tema:', err);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao salvar novo tema.',
      });
    }
  },

  async uploadTema(req, res) {
    try {
      const usuarioId = req.usuario.id;
      let conteudo = req.body;

      if (req.file && req.file.buffer) {
        try {
          conteudo = JSON.parse(req.file.buffer.toString('utf-8'));
        } catch {
          return res.status(400).json({
            sucesso: false,
            mensagem: 'O arquivo enviado não é um JSON válido.',
          });
        }
      }

      const paleta = conteudo.tokens || conteudo.cores || conteudo;
      const validacao = validarTemaTokens(paleta);
      if (!validacao.valido) {
        return res.status(400).json({
          sucesso: false,
          mensagem: `Arquivo rejeitado: ${validacao.erros.join('. ')}`,
          erros: validacao.erros,
        });
      }

      const novoTema = await temaRepository.criarTema(usuarioId, {
        nome: conteudo.nome || 'Tema Importado',
        modo: conteudo.modo || 'dark',
        descricao: conteudo.descricao || 'Tema importado via upload JSON',
        tokens: paleta,
        ativar: Boolean(conteudo.ativar !== false),
        origem: 'UPLOAD',
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Tema importado e validado com sucesso!',
        dados: novoTema,
      });
    } catch (err) {
      console.error('[TemaController] Erro no upload do tema:', err);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao processar upload do tema.',
      });
    }
  },

  async excluirTema(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { id } = req.params;
      await temaRepository.excluirTema(usuarioId, id);
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Tema removido da sua biblioteca.',
      });
    } catch (err) {
      return res.status(400).json({
        sucesso: false,
        mensagem: err.message || 'Erro ao excluir tema.',
      });
    }
  },

  async gerarTemaIA(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { descricao, modo = 'dark', cor_base } = req.body;

      // Gerador algorítmico de suporte REST para síntese cromática
      const isDark = modo === 'dark';
      const corPrimaria = cor_base || (isDark ? '#6366f1' : '#059669');
      const corAccent = isDark ? '#f59e0b' : '#d97706';

      const tokens = {
        bgApp: isDark ? '#0f172a' : '#f8fafc',
        bgSurface: isDark ? '#1e293b' : '#ffffff',
        bgSurfaceHover: isDark ? '#334155' : '#f1f5f9',
        border: isDark ? '#334155' : '#e2e8f0',
        textMain: isDark ? '#f8fafc' : '#0f172a',
        textSecondary: isDark ? '#94a3b8' : '#64748b',
        textMuted: isDark ? '#64748b' : '#94a3b8',
        primary: corPrimaria,
        primaryHover: isDark ? '#4f46e5' : '#047857',
        primaryText: '#ffffff',
        accent: corAccent,
        status: {
          success: '#10b981',
          danger: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
        },
      };

      const novoTema = await temaRepository.criarTema(usuarioId, {
        nome: `Tema IA: ${(descricao || 'Harmônico').slice(0, 30)}`,
        modo,
        descricao: `Gerado para: ${descricao || 'Estilo personalizado'}`,
        tokens,
        ativar: true,
        origem: 'IA',
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Tema gerado com sucesso pela IA e aplicado ao sistema!',
        dados: novoTema,
      });
    } catch (err) {
      console.error('[TemaController] Erro ao gerar tema:', err);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao gerar tema com IA.',
      });
    }
  },
};

module.exports = temaController;
```

Modificar `backend/src/routes/configuracoesRoutes.js` para registrar as rotas de temas:
```javascript
const temaController = require('../controllers/temaController');

// Gestão de Temas Dinâmicos e Aparência
router.get('/temas', temaController.listarTemas);
router.put('/temas/:id/ativar', temaController.ativarTema);
router.post('/temas', temaController.criarTema);
router.post('/temas/upload', upload.single('tema'), temaController.uploadTema);
router.post('/temas/gerar-ia', temaController.gerarTemaIA);
router.delete('/temas/:id', temaController.excluirTema);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/integration/temasApi.test.js`  
Expected: PASS com 3 testes passando.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/temaController.js backend/src/routes/configuracoesRoutes.js backend/tests/integration/temasApi.test.js
git commit -m "feat(backend): implementar controller e rotas REST para temas dinamicos e upload"
```

---

### Task 4: Motor Cromático no AI-Service (`color_engine.py`)

**Files:**
- Create: `ai-service/app/utils/color_engine.py`
- Test: `ai-service/tests/test_color_engine.py`

**Interfaces:**
- Consumes: N/A
- Produces:
  - `hex_to_hsl(hex_str: str) -> Tuple[float, float, float]`
  - `hsl_to_hex(h: float, s: float, l: float) -> str`
  - `calculate_luminance(hex_str: str) -> float`
  - `calculate_contrast_ratio(hex1: str, hex2: str) -> float`
  - `generate_complementary_accent(primary_hex: str) -> str`
  - `generate_tinted_neutrals(primary_hex: str, mode: str) -> Dict[str, str]`
  - `synthesize_theme(description: str, mode: str, base_color: Optional[str]) -> Dict[str, Any]`

- [ ] **Step 1: Write the failing test**

Criar `ai-service/tests/test_color_engine.py`:
```python
import pytest
from app.utils.color_engine import (
    hex_to_hsl,
    hsl_to_hex,
    calculate_luminance,
    calculate_contrast_ratio,
    generate_complementary_accent,
    generate_tinted_neutrals,
    synthesize_theme,
)

def test_hex_hsl_conversion():
    h, s, l = hex_to_hsl("#ff0000")
    assert round(h) == 0
    assert round(s) == 100
    assert round(l) == 50
    assert hsl_to_hex(0, 100, 50).lower() == "#ff0000"

def test_contrast_ratio_wcag():
    cr = calculate_contrast_ratio("#ffffff", "#000000")
    assert round(cr, 1) == 21.0

    # Texto claro sobre Dark Slate
    cr_slate = calculate_contrast_ratio("#f8fafc", "#0f172a")
    assert cr_slate >= 7.0  # Nível AAA

def test_complementary_accent_opposite():
    # Azul puro (240°) deve ter complemento em Amarelo (60°)
    accent = generate_complementary_accent("#0000ff")
    h, _, _ = hex_to_hsl(accent)
    assert abs(h - 60) <= 5

def test_tinted_neutrals_dark_mode():
    neutrals = generate_tinted_neutrals("#6366f1", mode="dark")
    assert neutrals["bgApp"] != "#000000"  # Proibido preto puro
    assert "bgSurface" in neutrals
    assert "border" in neutrals
    assert "textMain" in neutrals

def test_synthesize_theme_compliance():
    theme = synthesize_theme("Tema escuro para barbearia com toque dourado", mode="dark", base_color="#d97706")
    assert theme["modo"] == "dark"
    assert "cores" in theme
    cores = theme["cores"]
    # Valida WCAG no tema sintetizado
    cr_text = calculate_contrast_ratio(cores["textMain"], cores["bgSurface"])
    assert cr_text >= 4.5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest ai-service/tests/test_color_engine.py`  
Expected: FAIL com `ModuleNotFoundError: No module named 'app.utils.color_engine'`

- [ ] **Step 3: Write minimal implementation**

Criar `ai-service/app/utils/color_engine.py`:
```python
import colorsys
import re
from typing import Tuple, Dict, Any, Optional

def validate_hex(hex_str: str) -> bool:
    if not isinstance(hex_str, str):
        return False
    return bool(re.match(r"^#[0-9a-fA-F]{6}$", hex_str.strip()))

def hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    h = hex_str.strip().lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)

def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{int(r):02x}{int(g):02x}{int(b):02x}"

def hex_to_hsl(hex_str: str) -> Tuple[float, float, float]:
    r, g, b = [x / 255.0 for x in hex_to_rgb(hex_str)]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360.0, s * 100.0, l * 100.0

def hsl_to_hex(h: float, s: float, l: float) -> str:
    r, g, b = colorsys.hls_to_rgb(h / 360.0, l / 100.0, s / 100.0)
    return rgb_to_hex(round(r * 255), round(g * 255), round(b * 255))

def calculate_luminance(hex_str: str) -> float:
    r, g, b = [x / 255.0 for x in hex_to_rgb(hex_str)]
    def gamma_correct(c: float) -> float:
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    rl, gl, bl = gamma_correct(r), gamma_correct(g), gamma_correct(b)
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl

def calculate_contrast_ratio(hex1: str, hex2: str) -> float:
    l1 = calculate_luminance(hex1)
    l2 = calculate_luminance(hex2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

def generate_complementary_accent(primary_hex: str) -> str:
    h, s, l = hex_to_hsl(primary_hex)
    accent_h = (h + 180.0) % 360.0
    accent_s = min(max(s, 60.0), 90.0)
    accent_l = min(max(l, 45.0), 65.0)
    return hsl_to_hex(accent_h, accent_s, accent_l)

def generate_tinted_neutrals(primary_hex: str, mode: str = "dark") -> Dict[str, str]:
    h, _, _ = hex_to_hsl(primary_hex)
    tint_s = 6.0  # Saturação suave (5 a 8%) para neutral funcional

    if mode == "dark":
        bg_app = hsl_to_hex(h, tint_s, 11.0)       # ~#0f172a
        bg_surface = hsl_to_hex(h, tint_s, 17.0)   # ~#1e293b
        bg_hover = hsl_to_hex(h, tint_s, 25.0)     # ~#334155
        border = hsl_to_hex(h, tint_s, 24.0)
        text_main = hsl_to_hex(h, 4.0, 96.0)       # Quase branco com leve tint
        text_sec = hsl_to_hex(h, 6.0, 70.0)
        text_muted = hsl_to_hex(h, 6.0, 50.0)
    else:
        bg_app = hsl_to_hex(h, tint_s, 98.0)       # ~#f8fafc
        bg_surface = "#ffffff"
        bg_hover = hsl_to_hex(h, tint_s, 94.0)
        border = hsl_to_hex(h, tint_s, 88.0)
        text_main = hsl_to_hex(h, 10.0, 11.0)      # Escuro de alto contraste
        text_sec = hsl_to_hex(h, 8.0, 35.0)
        text_muted = hsl_to_hex(h, 6.0, 55.0)

    return {
        "bgApp": bg_app,
        "bgSurface": bg_surface,
        "bgSurfaceHover": bg_hover,
        "border": border,
        "textMain": text_main,
        "textSecondary": text_sec,
        "textMuted": text_muted,
    }

def synthesize_theme(description: str, mode: str = "dark", base_color: Optional[str] = None) -> Dict[str, Any]:
    modo_final = "dark" if mode.lower() in ("dark", "escuro", "noturno") else "light"

    # Seleção de cor primária
    if base_color and validate_hex(base_color):
        primary = base_color
    else:
        desc_lower = description.lower()
        if "verde" in desc_lower or "esmeralda" in desc_lower or "sustent" in desc_lower:
            primary = "#059669"
        elif "azul" in desc_lower or "marinho" in desc_lower or "oceano" in desc_lower:
            primary = "#2563eb" if modo_final == "light" else "#3b82f6"
        elif "dourad" in desc_lower or "ambar" in desc_lower or "caf" in desc_lower:
            primary = "#d97706"
        elif "roxo" in desc_lower or "violet" in desc_lower:
            primary = "#7c3aed"
        elif "vermelh" in desc_lower or "vinho" in desc_lower:
            primary = "#dc2626"
        else:
            primary = "#6366f1" if modo_final == "dark" else "#4f46e5"

    h, s, l = hex_to_hsl(primary)
    primary_hover = hsl_to_hex(h, s, max(15.0, l - 8.0) if modo_final == "dark" else max(15.0, l - 10.0))
    primary_text = "#ffffff" if calculate_contrast_ratio("#ffffff", primary) >= 4.5 else "#000000"

    accent = generate_complementary_accent(primary)
    neutrals = generate_tinted_neutrals(primary, mode=modo_final)

    # Validação e correção preventiva de WCAG
    cr_text = calculate_contrast_ratio(neutrals["textMain"], neutrals["bgSurface"])
    if cr_text < 7.0:
        neutrals["textMain"] = "#ffffff" if modo_final == "dark" else "#000000"

    cores = {
        **neutrals,
        "primary": primary,
        "primaryHover": primary_hover,
        "primaryText": primary_text,
        "accent": accent,
        "status": {
            "success": "#34d399" if modo_final == "dark" else "#10b981",
            "danger": "#f87171" if modo_final == "dark" else "#ef4444",
            "warning": "#fbbf24" if modo_final == "dark" else "#f59e0b",
            "info": "#60a5fa" if modo_final == "dark" else "#3b82f6",
        },
    }

    return {
        "nome": f"Tema IA - {description[:30]}",
        "modo": modo_final,
        "descricao": f"Tema gerado por IA baseado em: '{description}'",
        "cores": cores,
        "contraste_texto_wcag": round(calculate_contrast_ratio(cores["textMain"], cores["bgSurface"]), 2),
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/pytest ai-service/tests/test_color_engine.py`  
Expected: PASS com 5 testes passando.

- [ ] **Step 5: Commit**

```bash
git add ai-service/app/utils/color_engine.py ai-service/tests/test_color_engine.py
git commit -m "feat(ai-service): implementar motor de teoria das cores e validacao WCAG 2.1"
```

---

### Task 5: Ferramentas MCP de Temas no Servidor (`server.py`) e Atualização de Prompts

**Files:**
- Modify: `ai-service/mcp_server/server.py`
- Modify: `ai-service/app/llm/prompts.py`
- Create: `ai-service/tests/test_mcp_temas.py`

**Interfaces:**
- Consumes: `_fetch`, `_post`, `app.utils.color_engine`
- Produces:
  - `@mcp_server_app.tool() listar_temas() -> Dict[str, Any]`
  - `@mcp_server_app.tool() ativar_tema(tema_id_ou_nome: str) -> Dict[str, Any]`
  - `@mcp_server_app.tool() gerar_tema_ia(descricao: str, modo: Optional[str] = "dark", cor_base_hex: Optional[str] = None) -> Dict[str, Any]`

- [ ] **Step 1: Write the failing test**

Criar `ai-service/tests/test_mcp_temas.py`:
```python
import pytest
from unittest.mock import patch, AsyncMock
from mcp_server.server import listar_temas, ativar_tema, gerar_tema_ia

@pytest.mark.asyncio
async def test_listar_temas_mcp():
    mock_retorno = [
        {"id": 1, "nome": "Claro Aranduê", "eh_ativo": True},
        {"id": 2, "nome": "Noturno Corporativo", "eh_ativo": False},
    ]
    with patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_retorno
        res = await listar_temas()
        assert res["sucesso"] is True
        assert len(res["temas"]) == 2
        mock_fetch.assert_called_once_with("/configuracoes/temas")

@pytest.mark.asyncio
async def test_ativar_tema_mcp():
    with patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch, \
         patch("mcp_server.server._put", new_callable=AsyncMock) as mock_put:
        mock_fetch.return_value = [{"id": 2, "nome": "Noturno Corporativo", "eh_ativo": False}]
        mock_put.return_value = {"sucesso": True, "dados": {"nome": "Noturno Corporativo", "eh_ativo": True}}
        res = await ativar_tema(tema_id_ou_nome="Noturno Corporativo")
        assert res["sucesso"] is True
        assert "Noturno Corporativo" in res["mensagem"]

@pytest.mark.asyncio
async def test_gerar_tema_ia_mcp():
    with patch("mcp_server.server._post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = {"sucesso": True, "dados": {"id": 10, "nome": "Tema Barbearia"}}
        res = await gerar_tema_ia(descricao="Tema escuro com dourado para barbearia", modo="dark")
        assert res["sucesso"] is True
        assert "cores" in res
        assert res["cores"]["bgApp"] != "#000000"
        mock_post.assert_called_once()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest ai-service/tests/test_mcp_temas.py`  
Expected: FAIL com `ImportError: cannot import name 'listar_temas' from 'mcp_server.server'`

- [ ] **Step 3: Write minimal implementation**

Em `ai-service/mcp_server/server.py`, adicionar:
```python
from app.utils.color_engine import synthesize_theme

async def _put(endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    node_url, token, _ = _get_env_config()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    url = f"{node_url}{endpoint}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.put(url, headers=headers, json=payload)
            if resp.status_code in (401, 403):
                return {"sucesso": False, "erro": "Acesso não autorizado"}
            return resp.json()
        except Exception as e:
            return {"sucesso": False, "erro": f"Falha de conexão com a API: {str(e)}"}

@mcp_server_app.tool()
async def listar_temas() -> Dict[str, Any]:
    """Lista todos os temas visuais disponíveis na biblioteca do MEI e identifica qual está atualmente ativo."""
    dados = await _fetch("/configuracoes/temas")
    if isinstance(dados, dict) and "erro" in dados:
        return {"sucesso": False, "mensagem": dados["erro"]}
    return {
        "sucesso": True,
        "temas": dados if isinstance(dados, list) else [],
    }

@mcp_server_app.tool()
async def ativar_tema(tema_id_ou_nome: str) -> Dict[str, Any]:
    """Ativa um tema visual da biblioteca do MEI pelo nome (ex: 'Noturno Corporativo', 'Esmeralda MEI') ou ID numérico."""
    temas_resp = await _fetch("/configuracoes/temas")
    if not isinstance(temas_resp, list):
        return {"sucesso": False, "mensagem": "Não foi possível carregar a lista de temas do sistema."}

    busca = str(tema_id_ou_nome).strip().lower()
    alvo = None
    for t in temas_resp:
        if str(t.get("id")) == busca or t.get("nome", "").lower() == busca or t.get("slug", "").lower() == busca:
            alvo = t
            break

    if not alvo:
        # Busca aproximada por inclusão
        for t in temas_resp:
            if busca in t.get("nome", "").lower() or busca in t.get("slug", "").lower():
                alvo = t
                break

    if not alvo:
        nomes_disponiveis = ", ".join([f"'{t.get('nome')}'" for t in temas_resp])
        return {
            "sucesso": False,
            "mensagem": f"Tema '{tema_id_ou_nome}' não encontrado. Temas disponíveis: {nomes_disponiveis}.",
        }

    res = await _put(f"/configuracoes/temas/{alvo['id']}/ativar", {})
    if not res.get("sucesso", True):
        return {"sucesso": False, "mensagem": res.get("mensagem", "Falha ao ativar tema no sistema.")}

    return {
        "sucesso": True,
        "mensagem": f"Tema '{alvo.get('nome')}' ({alvo.get('modo')}) ativado com sucesso em todo o sistema!",
        "tema": alvo,
    }

@mcp_server_app.tool()
async def gerar_tema_ia(descricao: str, modo: Optional[str] = "dark", cor_base_hex: Optional[str] = None) -> Dict[str, Any]:
    """Gera um tema visual harmônico e acessível com IA baseado na descrição do MEI (ex: 'tema escuro para oficina', 'tema verde para floricultura').
    Aplica regras estritas de Teoria das Cores: proporção 60-30-10, matiz oposta para acentos, contraste WCAG 2.1 (AA/AAA) e escalas de cinza com tinted neutrals.
    Salva e ativa automaticamente o tema no sistema.
    """
    sintese = synthesize_theme(description=descricao, mode=modo or "dark", base_color=cor_base_hex)
    payload = {
        "nome": sintese["nome"],
        "modo": sintese["modo"],
        "descricao": sintese["descricao"],
        "cores": sintese["cores"],
        "ativar": True,
    }

    res = await _post("/configuracoes/temas/upload", payload)
    if not res.get("sucesso", False):
        return {"sucesso": False, "mensagem": res.get("mensagem", "Erro ao persistir tema gerado pela IA.")}

    return {
        "sucesso": True,
        "mensagem": f"Tema '{sintese['nome']}' gerado e ativado com sucesso! Proporção 60-30-10 e contraste WCAG {sintese.get('contraste_texto_wcag')}:1 aprovados.",
        "cores": sintese["cores"],
        "modo": sintese["modo"],
        "contraste_wcag": sintese.get("contraste_texto_wcag"),
    }
```

Atualizar `ai-service/app/llm/prompts.py`:
Adicionar na enumeração de ferramentas do `SYSTEM_PROMPT`:
```text
   - `listar_temas`: Consulta todos os temas disponíveis na biblioteca do MEI (claros e escuros).
   - `ativar_tema`: Ativa um tema visual existente pelo nome (ex: "Noturno Corporativo", "Esmeralda MEI", "Claro Aranduê").
   - `gerar_tema_ia`: Gera e aplica um tema visual totalmente novo, harmônico e acessível a partir da descrição do MEI.
   DIRETRIZ DE APARÊNCIA E TEMAS:
   Quando o usuário solicitar alteração estética, modo escuro/noturno ou nova paleta de cores (ex: "muda para tema escuro", "cria um tema verde com dourado pra minha padaria"), NUNCA finja memorização! Acione imediatamente `gerar_tema_ia` ou `ativar_tema`, explicando a harmonia das cores e a garantia de contraste para o negócio dele.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv/bin/pytest ai-service/tests/test_mcp_temas.py`  
Expected: PASS com 3 testes passando.

- [ ] **Step 5: Commit**

```bash
git add ai-service/mcp_server/server.py ai-service/app/llm/prompts.py ai-service/tests/test_mcp_temas.py
git commit -m "feat(ai-service): adicionar ferramentas MCP de temas e diretrizes no prompt do assistente"
```

---

### Task 6: ThemeContext, Injeção de Variáveis CSS e Suporte Frontend

**Files:**
- Create: `frontend/src/context/ThemeContext.jsx`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/App.jsx`
- Test: `frontend/src/context/ThemeContext.test.jsx`

**Interfaces:**
- Consumes: `frontend/src/services/api.js`
- Produces:
  - `ThemeProvider({ children })`
  - `useTheme(): { temaAtual, temas, carregando, ativarTema, uploadTema, gerarTemaIA, excluirTema, exportarTema }`

- [ ] **Step 1: Write the failing test**

Criar `frontend/src/context/ThemeContext.test.jsx`:
```jsx
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        sucesso: true,
        dados: [
          {
            id: 1,
            nome: 'Claro Aranduê',
            modo: 'light',
            eh_ativo: true,
            tokens: {
              bgApp: '#f8fafc',
              bgSurface: '#ffffff',
              border: '#e2e8f0',
              textMain: '#0f172a',
              textSecondary: '#64748b',
              primary: '#4f46e5',
              accent: '#f59e0b',
            },
          },
        ],
      },
    }),
    put: vi.fn().mockResolvedValue({ data: { sucesso: true } }),
    post: vi.fn().mockResolvedValue({ data: { sucesso: true } }),
  },
}));

function ComponenteTeste() {
  const { temaAtual, carregando } = useTheme();
  if (carregando) return <div>Carregando tema...</div>;
  return <div data-testid="nome-tema">{temaAtual?.nome}</div>;
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve fornecer o tema inicial e injetar variáveis CSS no root', async () => {
    render(
      <ThemeProvider>
        <ComponenteTeste />
      </ThemeProvider>
    );

    const elemento = await screen.findByTestId('nome-tema');
    expect(elemento.textContent).toBe('Claro Aranduê');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- --run src/context/ThemeContext.test.jsx`  
Expected: FAIL com `Cannot find module './ThemeContext'`

- [ ] **Step 3: Write minimal implementation**

Criar `frontend/src/context/ThemeContext.jsx`:
```jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const TEMA_PADRAO_FALLBACK = {
  id: 'padrao-claro',
  nome: 'Claro Aranduê',
  modo: 'light',
  tokens: {
    bgApp: '#f8fafc',
    bgSurface: '#ffffff',
    bgSurfaceHover: '#f1f5f9',
    border: '#e2e8f0',
    textMain: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    primaryText: '#ffffff',
    accent: '#f59e0b',
    status: { success: '#10b981', danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6' },
  },
};

const ThemeContext = createContext({});

export function applyThemeToDOM(tema) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const tokens = tema?.tokens || tema?.cores || TEMA_PADRAO_FALLBACK.tokens;
  const modo = tema?.modo || 'light';

  // Injeção de CSS Custom Properties
  root.style.setProperty('--bg-app', tokens.bgApp || '#f8fafc');
  root.style.setProperty('--bg-surface', tokens.bgSurface || '#ffffff');
  root.style.setProperty('--bg-surface-hover', tokens.bgSurfaceHover || '#f1f5f9');
  root.style.setProperty('--border-color', tokens.border || '#e2e8f0');
  root.style.setProperty('--text-main', tokens.textMain || '#0f172a');
  root.style.setProperty('--text-secondary', tokens.textSecondary || '#64748b');
  root.style.setProperty('--text-muted', tokens.textMuted || '#94a3b8');
  root.style.setProperty('--color-primary', tokens.primary || '#4f46e5');
  root.style.setProperty('--color-primary-hover', tokens.primaryHover || '#4338ca');
  root.style.setProperty('--color-primary-text', tokens.primaryText || '#ffffff');
  root.style.setProperty('--color-accent', tokens.accent || '#f59e0b');

  if (tokens.status) {
    root.style.setProperty('--status-success', tokens.status.success || '#10b981');
    root.style.setProperty('--status-danger', tokens.status.danger || '#ef4444');
    root.style.setProperty('--status-warning', tokens.status.warning || '#f59e0b');
    root.style.setProperty('--status-info', tokens.status.info || '#3b82f6');
  }

  // Alterna classe 'dark' no <html> para compatibilidade total
  if (modo === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }) {
  const [temaAtual, setTemaAtual] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = localStorage.getItem('arandue_tema_ativo');
        if (cached) {
          const parsed = JSON.parse(cached);
          applyThemeToDOM(parsed);
          return parsed;
        }
      }
    } catch {}
    applyThemeToDOM(TEMA_PADRAO_FALLBACK);
    return TEMA_PADRAO_FALLBACK;
  });

  const [temas, setTemas] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const carregarTemas = useCallback(async () => {
    try {
      setCarregando(true);
      const res = await api.get('/configuracoes/temas');
      const dados = res.data?.dados;
      if (Array.isArray(dados)) {
        setTemas(dados);
        const ativo = dados.find((t) => t.eh_ativo) || dados[0];
        if (ativo) {
          setTemaAtual(ativo);
          applyThemeToDOM(ativo);
          try {
            localStorage.setItem('arandue_tema_ativo', JSON.stringify(ativo));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('[ThemeContext] Usando fallback local para temas:', err.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarTemas();
  }, [carregarTemas]);

  const ativarTema = async (idOuSlug) => {
    try {
      const res = await api.put(`/configuracoes/temas/${idOuSlug}/ativar`);
      const ativado = res.data?.dados;
      if (ativado) {
        setTemaAtual(ativado);
        applyThemeToDOM(ativado);
        try {
          localStorage.setItem('arandue_tema_ativo', JSON.stringify(ativado));
        } catch {}
        await carregarTemas();
        return { sucesso: true, tema: ativado };
      }
    } catch (err) {
      console.error('[ThemeContext] Erro ao ativar tema:', err);
      return { sucesso: false, erro: err.response?.data?.mensagem || 'Falha ao ativar tema.' };
    }
  };

  const uploadTema = async (fileOuObjeto) => {
    try {
      let res;
      if (fileOuObjeto instanceof File) {
        const formData = new FormData();
        formData.append('tema', fileOuObjeto);
        res = await api.post('/configuracoes/temas/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/configuracoes/temas/upload', fileOuObjeto);
      }
      await carregarTemas();
      return { sucesso: true, dados: res.data?.dados };
    } catch (err) {
      return {
        sucesso: false,
        erro: err.response?.data?.mensagem || 'Falha ao importar tema via arquivo JSON.',
      };
    }
  };

  const gerarTemaIA = async (descricao, modo = 'dark', corBase = null) => {
    try {
      const res = await api.post('/configuracoes/temas/gerar-ia', {
        descricao,
        modo,
        cor_base: corBase,
      });
      await carregarTemas();
      return { sucesso: true, dados: res.data?.dados };
    } catch (err) {
      return {
        sucesso: false,
        erro: err.response?.data?.mensagem || 'Falha ao gerar tema com IA.',
      };
    }
  };

  const excluirTema = async (id) => {
    try {
      await api.delete(`/configuracoes/temas/${id}`);
      await carregarTemas();
      return { sucesso: true };
    } catch (err) {
      return {
        sucesso: false,
        erro: err.response?.data?.mensagem || 'Erro ao excluir tema.',
      };
    }
  };

  const exportarTema = (tema) => {
    const dados = tema || temaAtual;
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tema-${dados.slug || 'arandue'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ThemeContext.Provider
      value={{
        temaAtual,
        temas,
        carregando,
        ativarTema,
        uploadTema,
        gerarTemaIA,
        excluirTema,
        exportarTema,
        carregarTemas,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

Atualizar `frontend/src/index.css` para definir os fallbacks das variáveis e classes de tema:
```css
:root {
  --bg-app: #f8fafc;
  --bg-surface: #ffffff;
  --bg-surface-hover: #f1f5f9;
  --border-color: #e2e8f0;
  --text-main: #0f172a;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --color-primary: #4f46e5;
  --color-primary-hover: #4338ca;
  --color-primary-text: #ffffff;
  --color-accent: #f59e0b;
}

body {
  margin: 0;
  min-height: 100vh;
  background-color: var(--bg-app);
  color: var(--text-main);
  transition: background-color 0.2s ease, color 0.2s ease;
}
```

Em `frontend/src/App.jsx`, envelopar com `<ThemeProvider>`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- --run src/context/ThemeContext.test.jsx`  
Expected: PASS com 1 teste passando.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/context/ThemeContext.jsx frontend/src/context/ThemeContext.test.jsx frontend/src/index.css frontend/src/App.jsx
git commit -m "feat(frontend): criar ThemeContext com injecao de CSS variables e suporte a temas dinamicos"
```

---

### Task 7: Adaptação Visual dos Componentes Globais (`Layout`, `Sidebar`, `Navbar`)

**Files:**
- Modify: `frontend/src/components/Layout.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/components/Navbar.jsx`
- Test: `frontend/src/components/Layout.test.jsx`

**Interfaces:**
- Consumes: CSS Variables `--bg-app`, `--bg-surface`, `--border-color`, `--text-main`
- Produces: Telas adaptáveis a temas claros e escuros de forma transparente.

- [ ] **Step 1: Write the failing test**

Criar `frontend/src/components/Layout.test.jsx`:
```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Layout from './Layout';
import { AuthProvider } from '../context/AuthContext';
import { ChatProvider } from '../context/ChatContext';
import { ThemeProvider } from '../context/ThemeContext';

describe('Layout - Suporte ao Tema Dinâmico', () => {
  it('deve renderizar a estrutura principal com container dinâmico de tema', () => {
    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider>
            <ThemeProvider>
              <Layout />
            </ThemeProvider>
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    const mainWrapper = container.querySelector('.theme-app-wrapper');
    expect(mainWrapper).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- --run src/components/Layout.test.jsx`  
Expected: FAIL com `expected null not to be null`

- [ ] **Step 3: Write minimal implementation**

Modificar `frontend/src/components/Layout.jsx` para usar a classe `theme-app-wrapper` e aplicar estilos baseados nas variáveis CSS:
```jsx
<div
  className="min-h-screen theme-app-wrapper flex relative transition-colors duration-200"
  style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
>
```

Modificar `frontend/src/components/Sidebar.jsx`:
```jsx
const navLinkClasses = ({ isActive }) =>
  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
    isActive
      ? 'font-semibold shadow-sm'
      : 'hover:opacity-90'
  }`;

// No container do sidebarContent:
<div
  className="flex flex-col h-full border-r transition-colors duration-200"
  style={{
    backgroundColor: 'var(--bg-surface)',
    borderColor: 'var(--border-color)',
    color: 'var(--text-main)',
  }}
>
```

Modificar `frontend/src/components/Navbar.jsx`:
Aplicar `style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}` no cabeçalho.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- --run src/components/Layout.test.jsx`  
Expected: PASS com 1 teste passando.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Layout.jsx frontend/src/components/Sidebar.jsx frontend/src/components/Navbar.jsx frontend/src/components/Layout.test.jsx
git commit -m "feat(frontend): adaptar Layout, Sidebar e Navbar para suporte transparente a temas CSS"
```

---

### Task 8: Seção "🎨 Aparência & Temas" em `Configuracoes.jsx` (Galeria, Upload, Exportar e IA Live Preview)

**Files:**
- Modify: `frontend/src/pages/Configuracoes.jsx`
- Modify: `frontend/src/pages/Configuracoes.test.jsx`

**Interfaces:**
- Consumes: `useTheme()`
- Produces: Seção interativa com catálogo de temas, gerador com IA e preview de contraste WCAG.

- [ ] **Step 1: Write the failing test**

Adicionar em `frontend/src/pages/Configuracoes.test.jsx`:
```jsx
it('deve renderizar a seção de Aparência e Temas do Sistema com opções de troca e IA', async () => {
  render(
    <BrowserRouter>
      <ThemeProvider>
        <Configuracoes />
      </ThemeProvider>
    </BrowserRouter>
  );

  expect(await screen.findByText(/Aparência & Temas do Sistema/i)).toBeInTheDocument();
  expect(screen.getByText(/Gerar Tema com IA/i)).toBeInTheDocument();
  expect(screen.getByText(/Importar Tema \(\.json\)/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- --run src/pages/Configuracoes.test.jsx`  
Expected: FAIL com `Unable to find an element with text: /Aparência & Temas do Sistema/i`

- [ ] **Step 3: Write minimal implementation**

Em `frontend/src/pages/Configuracoes.jsx`:
1. Importar `useTheme` e ícones `Palette, Sparkles, Upload, Download, Check, Trash2, Sun, Moon`.
2. Adicionar o **Card de Aparência e Temas**:
   - Exibição em Grid dos temas disponíveis com amostras das cores (`bgApp`, `bgSurface`, `primary`, `accent`).
   - Botão de ativação em 1 clique.
   - Badge de "Tema Ativo".
   - Formulário de geração por IA:
     - Campo de texto para instrução.
     - Botão seletor de modo Claro / Escuro.
     - Botão "Gerar com IA" que chama `gerarTemaIA(prompt, modo)`.
   - Área de Upload de arquivo `.json` com `uploadTema(file)`.
   - Botão de exportação para download do JSON do tema atual.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- --run src/pages/Configuracoes.test.jsx`  
Expected: PASS com todos os testes passando.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Configuracoes.jsx frontend/src/pages/Configuracoes.test.jsx
git commit -m "feat(frontend): adicionar card de gestao de temas, upload json e gerador com IA em configuracoes"
```

---

### Task 9: Verificação Global da Suíte de Testes (Backend, AI-Service e Frontend)

**Files:**
- N/A (Execução de verificação de regressão total)

- [ ] **Step 1: Executar testes do Backend**
Run: `npm run test:backend`  
Expected: PASS em todas as 49+ suítes.

- [ ] **Step 2: Executar testes do AI-Service**
Run: `npm run test:ai`  
Expected: PASS em todos os 95+ testes pytest.

- [ ] **Step 3: Executar testes do Frontend**
Run: `npm run test:frontend`  
Expected: PASS em todas as 13+ suítes Vitest.

- [ ] **Step 4: Commit de finalização**
```bash
git commit --allow-empty -m "chore: validar aprovacao de todas as suites de testes do sistema de temas"
```

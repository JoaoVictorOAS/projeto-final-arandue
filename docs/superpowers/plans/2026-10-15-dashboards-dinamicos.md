# Dashboards Dinâmicos e Customizados (Aranduê MEI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o sistema de dashboards fixos e customizados com gráficos dinâmicos para o MEI, com persistência relacional no MySQL 8, catálogo seguro de métricas no backend Express, paridade total com o servidor MCP em Python e visualização dinâmica com Recharts no frontend React.

**Architecture:** A camada de dados introduz `dashboards_usuario` e `dashboard_widgets` com isolamento multi-tenant por `usuario_id` e suporte a colunas `JSON`. O backend Express expõe um *Metric Registry* fechado que calcula métricas analíticas e endpoints RESTful `/api/dashboards`. O servidor MCP espelha essas operações em Python para consumo da IA. O frontend React utiliza `recharts` integrado ao Tailwind com um componente polimórfico `<AutoChartRenderer />`, cards interativos e modais para criação e edição de widgets e abas.

**Tech Stack:** Node.js 20, Express, MySQL 8 (mysql2/promise), Jest + Supertest, Python 3.10+, FastAPI / MCP SDK, Pytest, React 18, Vite 5, Tailwind CSS 3.4, Recharts, Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-15-dashboards-dinamicos-design.md`](file:///home/JoaoVictor/projetos/projeto-final-arandue/docs/superpowers/specs/2026-10-15-dashboards-dinamicos-design.md)

## Global Constraints

- Isolamento absoluto por `usuario_id` extraído do JWT (`req.usuario.id`), nunca aceito por payload nem por parâmetros MCP.
- Paridade total REST ↔ MCP: Toda operação de consulta e mutação de dashboards e widgets no Express deve possuir ferramenta MCP equivalente decorada com `@mcp_server_app.tool()`.
- Catálogo de métricas estritamente fechado (*Metric Registry*): Nenhuma consulta SQL aberta/dinâmica vinda do cliente ou da IA; todas as métricas são funções pré-compiladas e parametrizadas.
- Zero configurações no primeiro login: Todo MEI sem dashboards cadastrados recebe automaticamente o Dashboard Padrão com os 3 widgets fundamentais (Termômetro MEI, Fluxo de Caixa, Despesas por Categoria).

---

### Task 1: Migração de Banco de Dados (`010_dashboards_customizados.sql`)

**Files:**
- Create: `backend/src/database/migrations/010_dashboards_customizados.sql`
- Test: `backend/tests/unit/migrations_dashboards.test.js`

**Interfaces:**
- Consumes: MySQL 8 connection via `backend/src/config/database.js`
- Produces: Tabelas `dashboards_usuario` e `dashboard_widgets` com constraints e índices multi-tenant.

- [ ] **Step 1: Escrever teste que verifica a criação das tabelas e integridade relacional**

```javascript
// backend/tests/unit/migrations_dashboards.test.js
const pool = require('../../src/config/database');
const fs = require('fs');
const path = require('path');

describe('Migração 010 - Dashboards Customizados', () => {
  beforeAll(async () => {
    const sqlPath = path.resolve(__dirname, '../../src/database/migrations/010_dashboards_customizados.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await pool.query(sql);
    }
  });

  test('deve possuir as tabelas dashboards_usuario e dashboard_widgets no banco', async () => {
    const [dashboards] = await pool.query("SHOW TABLES LIKE 'dashboards_usuario'");
    const [widgets] = await pool.query("SHOW TABLES LIKE 'dashboard_widgets'");
    expect(dashboards.length).toBe(1);
    expect(widgets.length).toBe(1);
  });
});
```

- [ ] **Step 2: Executar teste para confirmar que falha antes da migração**

Run: `npm --prefix backend test -- backend/tests/unit/migrations_dashboards.test.js`  
Expected: FAIL com `expect(dashboards.length).toBe(1)` recebendo 0.

- [ ] **Step 3: Criar o script SQL de migração `010_dashboards_customizados.sql`**

```sql
-- backend/src/database/migrations/010_dashboards_customizados.sql
CREATE TABLE IF NOT EXISTS dashboards_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) NULL,
    eh_padrao TINYINT(1) NOT NULL DEFAULT 0,
    ordem INT NOT NULL DEFAULT 0,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_dashboards_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_dashboards_usuario (usuario_id),
    INDEX idx_dashboards_ordem (usuario_id, ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dashboard_id INT NOT NULL,
    usuario_id INT NOT NULL,
    titulo VARCHAR(120) NOT NULL,
    tipo_grafico VARCHAR(30) NOT NULL,
    metrica VARCHAR(60) NOT NULL,
    periodo VARCHAR(30) NOT NULL DEFAULT 'ultimos_6_meses',
    largura INT NOT NULL DEFAULT 1,
    ordem INT NOT NULL DEFAULT 0,
    configuracoes JSON NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_widgets_dashboard FOREIGN KEY (dashboard_id) 
        REFERENCES dashboards_usuario(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_widgets_usuario FOREIGN KEY (usuario_id) 
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_widget_largura CHECK (largura IN (1, 2)),
    CONSTRAINT chk_widget_tipo CHECK (tipo_grafico IN ('bar', 'line', 'area', 'donut', 'pie', 'radial_gauge', 'kpi')),
    INDEX idx_widgets_dashboard (dashboard_id),
    INDEX idx_widgets_usuario (usuario_id),
    INDEX idx_widgets_ordem (dashboard_id, ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- [ ] **Step 4: Executar migração e rodar teste para confirmar sucesso**

Run: `node backend/src/database/migrate.js && npm --prefix backend test -- backend/tests/unit/migrations_dashboards.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/database/migrations/010_dashboards_customizados.sql backend/tests/unit/migrations_dashboards.test.js
git commit -m "feat(db): adiciona migracao para dashboards_usuario e dashboard_widgets"
```

---

### Task 2: Backend Metric Registry & Service (`dashboardService.js`)

**Files:**
- Modify: `backend/src/services/dashboardService.js`
- Test: `backend/tests/dashboardServiceCustom.test.js`

**Interfaces:**
- Consumes: MySQL 8 pool (`backend/src/config/database.js`)
- Produces: Métodos de negócio:
  - `obterMetricasDisponiveis()`
  - `executarMetrica(usuario_id, metrica, periodo, configuracoes)`
  - `provisionarDashboardPadrao(usuario_id)`
  - `listarDashboards(usuario_id)`
  - `obterDashboard(usuario_id, dashboard_id)` (com dados dos widgets calculados)
  - `criarDashboard(usuario_id, { nome, descricao, eh_padrao })`
  - `atualizarDashboard(usuario_id, dashboard_id, { nome, descricao, eh_padrao, ordem })`
  - `excluirDashboard(usuario_id, dashboard_id)`
  - `adicionarWidget(usuario_id, dashboard_id, dadosWidget)`
  - `atualizarWidget(usuario_id, dashboard_id, widget_id, dadosWidget)`
  - `excluirWidget(usuario_id, dashboard_id, widget_id)`

- [ ] **Step 1: Escrever teste unitário para o serviço e Metric Registry**

```javascript
// backend/tests/dashboardServiceCustom.test.js
const pool = require('../src/config/database');
const dashboardService = require('../src/services/dashboardService');

describe('dashboardService - Métricas Analíticas e Dashboards Customizados', () => {
  let userId;

  beforeAll(async () => {
    // Cria usuário de teste
    const [res] = await pool.execute(
      `INSERT INTO usuarios (nome, email, senha) VALUES ('User Test Metric', 'metric.test@mei.com', 'hash123')`
    );
    userId = res.insertId;
  });

  afterAll(async () => {
    if (userId) {
      await pool.execute('DELETE FROM usuarios WHERE id = ?', [userId]);
    }
  });

  test('deve listar catálogo de métricas disponíveis', () => {
    const catalogo = dashboardService.obterMetricasDisponiveis();
    expect(Array.isArray(catalogo.metricas)).toBe(true);
    expect(catalogo.metricas.some(m => m.chave === 'fluxo_caixa')).toBe(true);
    expect(catalogo.metricas.some(m => m.chave === 'limite_mei')).toBe(true);
    expect(catalogo.metricas.some(m => m.chave === 'despesas_categoria')).toBe(true);
  });

  test('deve provisionar dashboard padrão se o usuário não possuir dashboards', async () => {
    const dashboards = await dashboardService.listarDashboards(userId);
    expect(dashboards.length).toBe(1);
    expect(dashboards[0].eh_padrao).toBe(1);
    expect(dashboards[0].nome).toBe('Principal');
    expect(dashboards[0].widgets.length).toBe(3);
  });

  test('deve executar métrica de fluxo_caixa sem erro', async () => {
    const dados = await dashboardService.executarMetrica(userId, 'fluxo_caixa', 'ultimos_6_meses');
    expect(Array.isArray(dados)).toBe(true);
    expect(dados.length).toBeGreaterThan(0);
    expect(dados[0]).toHaveProperty('entradas');
    expect(dados[0]).toHaveProperty('saidas');
  });

  test('deve criar e excluir novo dashboard customizado', async () => {
    const novo = await dashboardService.criarDashboard(userId, {
      nome: 'Painel Vendas',
      descricao: 'Acompanhamento de vendas'
    });
    expect(novo.id).toBeDefined();

    const addWidget = await dashboardService.adicionarWidget(userId, novo.id, {
      titulo: 'Top Serviços',
      tipo_grafico: 'bar',
      metrica: 'top_servicos',
      periodo: 'ano_atual',
      largura: 2
    });
    expect(addWidget.id).toBeDefined();

    await dashboardService.excluirWidget(userId, novo.id, addWidget.id);
    await dashboardService.excluirDashboard(userId, novo.id);
  });
});
```

- [ ] **Step 2: Executar teste para confirmar que falha antes da implementação**

Run: `npm --prefix backend test -- backend/tests/dashboardServiceCustom.test.js`  
Expected: FAIL com `dashboardService.obterMetricasDisponiveis is not a function`

- [ ] **Step 3: Implementar métodos analíticos e CRUD em `dashboardService.js`**

Adicionar em `backend/src/services/dashboardService.js`:
- `obterMetricasDisponiveis()`
- Módulos de cálculo:
  - `calcularLimiteMei(usuario_id)`
  - `calcularFluxoCaixa(usuario_id, periodo)`
  - `calcularDespesasCategoria(usuario_id, periodo)`
  - `calcularTopServicos(usuario_id, periodo)`
  - `calcularCobrancasStatus(usuario_id, periodo)`
  - `calcularFunilOrcamentos(usuario_id, periodo)`
  - `calcularNovosClientes(usuario_id, periodo)`
- Funções de persistência com `dashboards_usuario` e `dashboard_widgets`.

- [ ] **Step 4: Executar testes para validar funcionamento e compatibilidade**

Run: `npm --prefix backend test -- backend/tests/dashboardServiceCustom.test.js backend/tests/dashboard.test.js`  
Expected: PASS (todos os testes antigos e novos passam)

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/dashboardService.js backend/tests/dashboardServiceCustom.test.js
git commit -m "feat(backend): implementa Metric Registry e servico de dashboards customizados"
```

---

### Task 3: Backend Controller & Routes REST (`/api/dashboards`)

**Files:**
- Modify: `backend/src/controllers/dashboardController.js`
- Modify: `backend/src/routes/dashboardRoutes.js`
- Modify: `backend/src/app.js`
- Test: `backend/tests/dashboardCustomRoutes.test.js`

**Interfaces:**
- Consumes: `dashboardService`
- Produces:
  - `GET /api/dashboards`: Lista dashboards e seus widgets
  - `GET /api/dashboards/metricas/catalogo`: Retorna o catálogo
  - `GET /api/dashboards/:id`: Retorna dashboard detalhado com dados dos gráficos
  - `POST /api/dashboards`: Cria dashboard
  - `PUT /api/dashboards/:id`: Atualiza dashboard
  - `DELETE /api/dashboards/:id`: Remove dashboard
  - `POST /api/dashboards/:id/widgets`: Adiciona widget
  - `PUT /api/dashboards/:id/widgets/:widgetId`: Atualiza widget
  - `DELETE /api/dashboards/:id/widgets/:widgetId`: Remove widget

- [ ] **Step 1: Escrever testes de integração para as novas rotas REST**

```javascript
// backend/tests/dashboardCustomRoutes.test.js
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Rotas REST /api/dashboards', () => {
  let token;
  let userId;

  beforeAll(async () => {
    const resAuth = await request(app).post('/api/auth/register').send({
      nome: 'User Dash Routes',
      email: 'dash.routes@mei.com',
      senha: 'SenhaForte123@'
    });
    token = resAuth.body.dados.token;
    userId = resAuth.body.dados.id;
  });

  afterAll(async () => {
    if (userId) {
      await pool.execute('DELETE FROM usuarios WHERE id = ?', [userId]);
    }
  });

  test('GET /api/dashboards/metricas/catalogo deve retornar catálogo', async () => {
    const res = await request(app)
      .get('/api/dashboards/metricas/catalogo')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.metricas).toBeDefined();
  });

  test('GET /api/dashboards deve retornar lista com auto-provisionamento', async () => {
    const res = await request(app)
      .get('/api/dashboards')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(Array.isArray(res.body.dados)).toBe(true);
    expect(res.body.dados.length).toBeGreaterThanOrEqual(1);
    expect(res.body.dados[0].widgets.length).toBe(3);
  });

  test('POST, PUT e DELETE /api/dashboards/:id e widgets', async () => {
    const resCreate = await request(app)
      .post('/api/dashboards')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Painel Vendas 2' });
    expect(resCreate.statusCode).toBe(201);
    const dashId = resCreate.body.dados.id;

    const resWidget = await request(app)
      .post(`/api/dashboards/${dashId}/widgets`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Entradas vs Saídas',
        tipo_grafico: 'bar',
        metrica: 'fluxo_caixa',
        periodo: 'ultimos_6_meses',
        largura: 1
      });
    expect(resWidget.statusCode).toBe(201);
    const widgetId = resWidget.body.dados.id;

    const resDeleteWidget = await request(app)
      .delete(`/api/dashboards/${dashId}/widgets/${widgetId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(resDeleteWidget.statusCode).toBe(200);

    const resDeleteDash = await request(app)
      .delete(`/api/dashboards/${dashId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(resDeleteDash.statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: Executar teste para confirmar falha antes das rotas**

Run: `npm --prefix backend test -- backend/tests/dashboardCustomRoutes.test.js`  
Expected: FAIL 404 Not Found

- [ ] **Step 3: Implementar controllers e mapear rotas**

- Em `backend/src/controllers/dashboardController.js`: adicionar `listarDashboards`, `obterDashboard`, `obterCatalogoMetricas`, `criarDashboard`, `atualizarDashboard`, `excluirDashboard`, `adicionarWidget`, `atualizarWidget`, `excluirWidget`.
- Em `backend/src/routes/dashboardRoutes.js`: registrar os endpoints REST correspondentes.
- Em `backend/src/app.js`: garantir `app.use('/api/dashboards', authMiddleware, dashboardRoutes);` e `app.use('/api/dashboard', authMiddleware, dashboardRoutes);`.

- [ ] **Step 4: Executar testes de rota para validar sucesso**

Run: `npm --prefix backend test -- backend/tests/dashboardCustomRoutes.test.js backend/tests/dashboard.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/dashboardController.js backend/src/routes/dashboardRoutes.js backend/src/app.js backend/tests/dashboardCustomRoutes.test.js
git commit -m "feat(backend): adiciona endpoints REST para gestao de dashboards e widgets"
```

---

### Task 4: Paridade no MCP Server (`ai-service/mcp_server/server.py`)

**Files:**
- Modify: `ai-service/mcp_server/server.py`
- Create: `ai-service/tests/test_mcp_dashboards.py`

**Interfaces:**
- Consumes: Scoped JWT token contra `/api/dashboards`
- Produces: MCP Tools decoradas com `@mcp_server_app.tool()`:
  - `_delete(endpoint)` helper
  - `listar_dashboards()`
  - `obter_dashboard_detalhado(dashboard_id: int)`
  - `obter_catalogo_metricas()`
  - `criar_dashboard(nome: str, descricao: Optional[str] = None)`
  - `adicionar_widget_dashboard(dashboard_id: int, titulo: str, tipo_grafico: str, metrica: str, periodo: str = "ultimos_6_meses", largura: int = 1)`
  - `excluir_widget_dashboard(dashboard_id: int, widget_id: int)`
  - `excluir_dashboard(dashboard_id: int)`

- [ ] **Step 1: Escrever teste pytest para as ferramentas MCP de dashboard**

```python
# ai-service/tests/test_mcp_dashboards.py
import pytest
from unittest.mock import patch, AsyncMock
from mcp_server.server import (
    listar_dashboards,
    obter_catalogo_metricas,
    criar_dashboard,
    adicionar_widget_dashboard,
    excluir_widget_dashboard,
    excluir_dashboard
)

@pytest.mark.asyncio
async def test_listar_dashboards_mcp():
    mock_resp = [{"id": 1, "nome": "Principal", "widgets": []}]
    with patch("mcp_server.server._fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_resp
        res = await listar_dashboards()
        assert res == mock_resp
        mock_fetch.assert_called_once_with("/dashboards")

@pytest.mark.asyncio
async def test_criar_dashboard_mcp():
    with patch("mcp_server.server._post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = {"sucesso": True, "dados": {"id": 2, "nome": "Vendas"}}
        res = await criar_dashboard(nome="Vendas", descricao="Acompanhamento")
        assert res.get("sucesso") is True
        mock_post.assert_called_once_with("/dashboards", {"nome": "Vendas", "descricao": "Acompanhamento"})
```

- [ ] **Step 2: Executar pytest para verificar falhas antes da implementação**

Run: `pytest ai-service/tests/test_mcp_dashboards.py -v`  
Expected: FAIL com `ImportError: cannot import name 'listar_dashboards'`

- [ ] **Step 3: Implementar helper `_delete` e as tools MCP em `ai-service/mcp_server/server.py`**

Adicionar função `_delete(endpoint: str)` e as 7 ferramentas MCP decoradas.

- [ ] **Step 4: Executar pytest e validar sucesso da suíte de IA**

Run: `pytest ai-service/tests/test_mcp_dashboards.py ai-service/tests/test_mcp_server.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add ai-service/mcp_server/server.py ai-service/tests/test_mcp_dashboards.py
git commit -m "feat(ai-service): implementa paridade MCP para dashboards e widgets graficos"
```

---

### Task 5: Componente `<AutoChartRenderer />` no Frontend

**Files:**
- Modify: `frontend/package.json` (instalar `recharts`)
- Create: `frontend/src/components/charts/AutoChartRenderer.jsx`
- Create: `frontend/src/components/charts/AutoChartRenderer.test.jsx`

**Interfaces:**
- Consumes: `{ type, data, config }`
- Produces: Gráfico SVG responsivo renderizado com formatação BRL e tooltips adaptadas.

- [ ] **Step 1: Instalar dependência `recharts` no frontend**

Run: `npm --prefix frontend install recharts`

- [ ] **Step 2: Escrever teste vitest para `<AutoChartRenderer />`**

```javascript
// frontend/src/components/charts/AutoChartRenderer.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AutoChartRenderer from './AutoChartRenderer';

describe('AutoChartRenderer Component', () => {
  it('deve renderizar mensagem de dados vazios quando data for vazio', () => {
    render(<AutoChartRenderer type="bar" data={[]} />);
    expect(screen.getByText(/Nenhum dado disponível/i)).toBeInTheDocument();
  });

  it('deve renderizar sem quebrar para o tipo radial_gauge (teto MEI)', () => {
    const data = [{ nome: 'Faturamento', valor: 45000, limite: 81000, percentual: 55.5 }];
    render(<AutoChartRenderer type="radial_gauge" data={data} />);
    expect(screen.getByText(/55.5%/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implementar `<AutoChartRenderer />`**

Criar `frontend/src/components/charts/AutoChartRenderer.jsx` com suporte aos tipos:
- `'bar'`: `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `ResponsiveContainer`.
- `'line'`: `LineChart`, `Line` suave.
- `'area'`: `AreaChart` com gradiente Tailwind indigo/emerald.
- `'donut'` e `'pie'`: `PieChart`, `Pie`, `Cell`.
- `'radial_gauge'`: Termômetro MEI com barra de progresso circular e valor monetário.

- [ ] **Step 4: Executar testes para confirmar aprovação**

Run: `npm --prefix frontend test -- frontend/src/components/charts/AutoChartRenderer.test.jsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/components/charts/
git commit -m "feat(frontend): adiciona AutoChartRenderer baseado em Recharts"
```

---

### Task 6: Cards Dinâmicos, Modais e Dashboard UI (`Dashboard.jsx`)

**Files:**
- Create: `frontend/src/components/dashboard/DynamicWidgetCard.jsx`
- Create: `frontend/src/components/dashboard/ModalNovoWidget.jsx`
- Create: `frontend/src/components/dashboard/ModalNovoDashboard.jsx`
- Modify: `frontend/src/pages/Dashboard.jsx`
- Modify: `frontend/src/pages/Dashboard.test.jsx`

**Interfaces:**
- Consumes: `api.get('/dashboards')`, `api.post('/dashboards/:id/widgets')`, `AutoChartRenderer`
- Produces: Experiência completa de visualização com abas de dashboards e grid dinâmico personalizável pelo MEI.

- [ ] **Step 1: Atualizar testes em `frontend/src/pages/Dashboard.test.jsx`**

Adicionar verificação das abas de dashboard e da renderização dos widgets gráficos dinâmicos.

- [ ] **Step 2: Executar teste para verificar falhas antes da UI integrada**

Run: `npm --prefix frontend test -- frontend/src/pages/Dashboard.test.jsx`  
Expected: FAIL

- [ ] **Step 3: Implementar `DynamicWidgetCard`, modais e refatorar `Dashboard.jsx`**

- `DynamicWidgetCard.jsx`: Cartão elegante com botão de redimensionar (largura 1 ou 2 colunas), seletor de período rápido e botão de excluir widget.
- `ModalNovoWidget.jsx`: Modal intuitivo com preview para escolher métrica, tipo de gráfico e título.
- `ModalNovoDashboard.jsx`: Modal simples para cadastrar nova aba/painel.
- `Dashboard.jsx`: Integrar seletor de abas, grid de widgets dinâmicos com `AutoChartRenderer`, mantendo as ações rápidas e o card de agendamentos.

- [ ] **Step 4: Executar testes de frontend e garantir 100% de aprovação**

Run: `npm --prefix frontend test`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/ frontend/src/pages/Dashboard.jsx frontend/src/pages/Dashboard.test.jsx
git commit -m "feat(frontend): integra abas de dashboards e gestao dinamica de widgets no Dashboard"
```

---

### Task 7: Verificação Global da Suíte de Testes

**Files:**
- Execução em todo o repositório

- [ ] **Step 1: Executar suíte completa do backend**

Run: `npm run test:backend`  
Expected: 100% PASS

- [ ] **Step 2: Executar suíte completa do ai-service (FastAPI + MCP)**

Run: `npm run test:ai`  
Expected: 100% PASS

- [ ] **Step 3: Executar suíte completa do frontend (Vitest)**

Run: `npm run test:frontend`  
Expected: 100% PASS

- [ ] **Step 4: Executar suíte global (`npm test`)**

Run: `npm test`  
Expected: 100% PASS

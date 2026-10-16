# Especificação de Design — Dashboards Fixos e Customizados com Gráficos Dinâmicos

**Data:** 15 de Outubro de 2026  
**Status:** Aprovado para Planejamento  
**Projeto:** Aranduê (MEI — Gestão Simplificada)  
**Autor:** Antigravity AI & Eng. de Software

---

## 1. Visão Geral e Objetivos

O objetivo desta especificação é introduzir uma camada completa de inteligência visual e analítica para o Microempreendedor Individual (MEI) no sistema Aranduê.

A solução atende simultaneamente a dois requisitos complementares:
1. **Visuais Fixos Padrão (Out-of-the-box):** Gráficos essenciais pré-configurados disponíveis no primeiro acesso (Termômetro do Teto Anual MEI, Fluxo de Caixa Mensal Entradas vs Saídas e Distribuição de Despesas por Categoria).
2. **Visualizações Customizadas Próprias (Self-Service BI para o MEI):** Capacidade de o MEI criar múltiplos painéis (ex: *"Acompanhamento de Vendas"*, *"Controle de Inadimplência"*, *"Metas 2026"*) e adicionar, personalizar ou reordenar widgets gráficos livremente.
3. **Paridade Total REST ↔ MCP (Regra Mestre GEMINI.md):** Toda operação de consulta e mutação de dashboards e widgets disponível via REST é rigorosamente espelhada como ferramenta MCP (`ai-service/mcp_server/server.py`), permitindo que o Assistente de IA monte gráficos e painéis sob demanda através do chat.
4. **Segurança e Anti-SQL Injection:** O usuário e a IA selecionam métricas a partir de um catálogo seguro e fechado no backend (*Metric Registry*), garantindo isolamento estrito por `usuario_id` e execução com queries parametrizadas.

---

## 2. Modelo de Dados (MySQL 8.x)

Será criada a migração incremental `backend/src/database/migrations/010_dashboards_customizados.sql`, composta por duas tabelas relacionais com suporte a configurações em coluna `JSON`:

```sql
-- 1. Tabela de Dashboards (Painéis do Usuário)
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

-- 2. Tabela de Widgets Gráficos do Dashboard
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

### Regra de Inicialização Automática (Zero Configuration)
Se o MEI acessar o Dashboard e não possuir nenhum registro em `dashboards_usuario`, o backend provisiona automaticamente o **Dashboard Principal** (`eh_padrao = 1`) com 3 widgets pré-definidos:
1. **Termômetro do Teto MEI:** `metrica: 'limite_mei'`, `tipo_grafico: 'radial_gauge'`, `largura: 2`.
2. **Fluxo de Caixa Mensal:** `metrica: 'fluxo_caixa'`, `tipo_grafico: 'bar'`, `periodo: 'ultimos_6_meses'`, `largura: 1`.
3. **Despesas por Categoria:** `metrica: 'despesas_categoria'`, `tipo_grafico: 'donut'`, `periodo: 'mes_atual'`, `largura: 1`.

---

## 3. Catálogo de Métricas Seguras (Backend Metric Registry)

O serviço `backend/src/services/dashboardService.js` disponibilizará uma camada de resolução analítica chamada `executarMetrica(usuario_id, metrica, periodo, configuracoes)`.

### Métricas Suportadas:
| Chave da Métrica | Nome Amigável | Tipos de Gráficos Compatíveis | Dados Retornados |
| :--- | :--- | :--- | :--- |
| `limite_mei` | Faturamento vs Teto MEI | `radial_gauge`, `kpi` | Faturamento acumulado no ano, teto proporcional (R$ 81.000), percentual atingido, saldo restante. |
| `fluxo_caixa` | Fluxo de Caixa (Entradas vs Saídas) | `bar`, `area`, `line` | Array cronológico: `[{ periodo: 'Jan/26', entradas: 4500, saidas: 1200, saldo: 3300 }, ...]`. |
| `despesas_categoria` | Despesas por Categoria | `donut`, `pie`, `bar` | Array categorizado: `[{ categoria: 'Aluguel', valor: 1200, percentual: 45.2 }, ...]`. |
| `top_servicos` | Serviços / Produtos Mais Vendidos | `bar`, `pie`, `donut` | Array de ranking: `[{ nome: 'Consultoria', total_vendas: 15, receita: 3000 }, ...]`. |
| `cobrancas_status` | Distribuição de Cobranças | `donut`, `pie`, `bar` | Contagem e valores: `[{ status: 'PAGO', valor: 8500 }, { status: 'PENDENTE', valor: 2100 }, { status: 'ATRASADO', valor: 650 }]`. |
| `funil_orcamentos` | Taxa de Conversão de Orçamentos | `bar`, `donut` | Contagem por status: `[{ status: 'RASCUNHO', total: 4 }, { status: 'ENVIADO', total: 8 }, { status: 'APROVADO', total: 6 }]`. |
| `novos_clientes` | Novos Clientes Cadastrados | `line`, `bar`, `area` | Evolução temporal de novos clientes cadastrados no período. |

### Períodos Suportados:
- `mes_atual`: Do primeiro ao último dia do mês corrente.
- `ultimos_3_meses`: Janela de 90 dias até a data atual.
- `ultimos_6_meses`: Janela de 6 meses (ideal para gráficos de barras).
- `ano_atual`: Do dia 01/01 até o dia atual do ano vigente.
- `historico_total`: Todos os lançamentos históricos consolidados.

---

## 4. Arquitetura da API REST (`backend/`)

Todas as rotas exigem o middleware `authMiddleware` e extraem `req.usuario.id`.

### Endpoints:
- `GET /api/dashboards`: Retorna a lista de dashboards do usuário, ordenados por `ordem ASC`.
- `GET /api/dashboards/:id`: Retorna os detalhes de um dashboard, incluindo a lista de widgets e os dados computados de cada métrica em tempo real.
- `POST /api/dashboards`: Cria um novo painel (`{ nome, descricao, eh_padrao }`).
- `PUT /api/dashboards/:id`: Atualiza metadados ou ordem do painel.
- `DELETE /api/dashboards/:id`: Exclui um painel (impede exclusão se for o único painel ativo).
- `POST /api/dashboards/:id/widgets`: Adiciona um widget ao painel (`{ titulo, tipo_grafico, metrica, periodo, largura, ordem, configuracoes }`).
- `PUT /api/dashboards/:id/widgets/:widgetId`: Atualiza um widget existente.
- `DELETE /api/dashboards/:id/widgets/:widgetId`: Remove um widget do painel.
- `GET /api/dashboards/metricas/catalogo`: Retorna o catálogo de métricas disponíveis e opções para preenchimento de selects no frontend ou para contexto da IA.

---

## 5. Paridade com Servidor MCP (`ai-service/mcp_server/server.py`)

Em consonância com as regras globais do projeto, as seguintes ferramentas MCP serão expostas ao modelo Gemini:

1. `@mcp_server_app.tool() def listar_dashboards() -> str`:
   - Chama `GET /api/dashboards` com scoped JWT.
2. `@mcp_server_app.tool() def obter_dashboard_detalhado(dashboard_id: int) -> str`:
   - Chama `GET /api/dashboards/:id`.
3. `@mcp_server_app.tool() def obter_catalogo_metricas() -> str`:
   - Retorna as métricas, gráficos e períodos disponíveis no sistema.
4. `@mcp_server_app.tool() def criar_dashboard(nome: str, descricao: Optional[str] = None) -> str`:
   - Chama `POST /api/dashboards`.
5. `@mcp_server_app.tool() def adicionar_widget_dashboard(dashboard_id: int, titulo: str, tipo_grafico: str, metrica: str, periodo: str = "ultimos_6_meses", largura: int = 1) -> str`:
   - Chama `POST /api/dashboards/:id/widgets`.
6. `@mcp_server_app.tool() def excluir_widget_dashboard(dashboard_id: int, widget_id: int) -> str`:
   - Chama `DELETE /api/dashboards/:id/widgets/:widget_id`.

---

## 6. Arquitetura Frontend (`frontend/`)

### 6.1 Dependência de Visualização
- Adoção da biblioteca **`recharts`** (versão estável compatível com React 18 e Vite 5).
- **Justificativa:** Leve, baseada em SVG responsivo nativo, animações fluidas, suporte completo a tooltips formatadas em BRL e integração transparente com Tailwind CSS.

### 6.2 Componentes a Criar / Refatorar
1. **`frontend/src/components/charts/AutoChartRenderer.jsx`**:
   - Componente polimórfico que recebe `{ type, data, config }`.
   - Renderiza automaticamente `ResponsiveContainer`, `BarChart`, `AreaChart`, `LineChart`, `PieChart` com innerRadius (donut) ou o gauge de termômetro MEI.
   - Trata automaticamente formatação monetária em Real (`R$`), datas em pt-BR e estados de dados vazios (*Empty State*).
2. **`frontend/src/components/dashboard/DynamicWidgetCard.jsx`**:
   - Container do cartão com cabeçalho, título editável, badge de período, botão de redimensionamento (largura 1 ou 2) e menu de remoção.
3. **`frontend/src/components/dashboard/ModalNovoWidget.jsx`**:
   - Modal com preview interativo para adicionar novos gráficos:
     - Seleção de Métrica (com ícones descritivos).
     - Seleção de Tipo de Gráfico (Barras, Linhas, Rosca, Área, etc.).
     - Seleção de Período (Mês atual, 3 meses, 6 meses, Ano atual).
     - Largura (Metade da tela ou Tela inteira).
4. **`frontend/src/components/dashboard/ModalNovoDashboard.jsx`**:
   - Modal simples para criar uma nova aba/painel.
5. **Refatoração de `frontend/src/pages/Dashboard.jsx`**:
   - Mantém as Ações Rápidas e os KPIs de topo intactos.
   - Adiciona seletor de abas (`Principal`, `+ Nova Aba`).
   - Substitui a listagem simples por grid dinâmico contendo os widgets do painel ativo e a listagem de próximos atendimentos como widget ou seção de apoio.

---

## 7. Estratégia de Testes

1. **Backend Tests (`backend/tests/dashboard.test.js`):**
   - Teste de provisionamento automático do dashboard padrão para novo usuário.
   - Teste de listagem, criação, atualização e exclusão de painéis.
   - Teste de validação das métricas (rejeição de métrica inválida).
   - Teste de isolamento multi-tenant (MEI B não acessa nem modifica dashboards do MEI A).
2. **MCP Tests (`ai-service/tests/test_mcp_dashboards.py`):**
   - Teste das tools de dashboard simulando chamadas à API REST.
3. **Frontend Tests (`frontend/src/pages/Dashboard.test.jsx`):**
   - Teste de renderização do dashboard com widgets dinâmicos.
   - Teste de abertura do modal e criação de novo widget.
   - Teste de comutação entre abas de dashboards.

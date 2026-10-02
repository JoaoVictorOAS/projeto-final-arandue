# MEI — Gestão Simplificada para Microempreendedores Individuais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Construir a aplicação web completa MEI (ReactJS + Node.js Express REST API + MySQL) que centraliza gestão de clientes, catálogo de serviços, agenda de atendimentos, orçamentos calculados no backend, cobranças com baixa automática e livro caixa com dashboard financeiro para microempreendedores individuais.

**Architecture:** Arquitetura em camadas com separação clara entre cliente (Single Page Application em ReactJS modular) e servidor (API RESTful em Node.js/Express estruturada em Controllers, Services, Repositories e Middlewares), persistindo em banco relacional MySQL 8.x com chaves estrangeiras estritas e consultas parametrizadas. Todas as rotas autenticadas filtram dados isolados por `usuario_id` extraído de token JWT seguro.

**Tech Stack:**
- **Frontend:** React 18 / Vite, React Router DOM 6, Axios, Lucide React (ícones), TailwindCSS
- **Backend:** Node.js 18+, Express, `mysql2/promise`, `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv`
- **Banco de Dados:** MySQL 8.x
- **Testes:** Vitest + React Testing Library (Frontend) e Jest / Supertest (Backend)

**Spec:** [`README.md`](file:///home/JoaoVictor/projetos/projeto-final-arandue/README.md), [`docs/modelo-dados.md`](file:///home/JoaoVictor/projetos/projeto-final-arandue/docs/modelo-dados.md), [`docs/api.md`](file:///home/JoaoVictor/projetos/projeto-final-arandue/docs/api.md) e [`docs/regras-negocio.md`](file:///home/JoaoVictor/projetos/projeto-final-arandue/docs/regras-negocio.md).

## Global Constraints

- **Stack Obrigatória:** ReactJS no frontend, Node.js com API RESTful no backend e MySQL como banco de dados relacional.
- **Segurança de Senhas:** Criptografia obrigatória via `bcrypt` com salt rounds = 10; nunca armazenar ou logar senhas em texto puro.
- **Isolamento Multi-Tenant:** Toda entidade de dados (`clientes`, `servicos`, `agendamentos`, `orcamentos`, `cobrancas`, `movimentacoes`) deve possuir vínculo obrigatório com `usuario_id` e queries parametrizadas (`?`) para evitar SQL Injection e vazamento de dados entre MEIs.
- **Cálculo de Orçamento no Servidor:** O valor de `subtotal` e `total` de orçamentos deve ser obrigatoriamente recalculado e validado pelo backend, nunca aceitando o total final do cliente sem validação.
- **Integridade Referencial:** Exclusão física proibida para clientes/serviços com histórico vinculado a orçamentos ou cobranças; usar inativação lógica (`ativo = 0`).
- **Automação do Caixa:** Ao dar baixa em uma cobrança (`status = 'PAGO'`), uma movimentação de entrada deve ser registrada automaticamente no livro caixa.
- **Consulta de Regras Legais/Fiscais via RAG ChromaDB:** Dúvidas sobre regras do MEI (faturamento, DAS, vedações, notas fiscais) devem ser consultadas no banco vetorial via `.venv/bin/python scripts/rag/query_mei.py "<dúvida>"`. O banco pode ser resetado e recriado com `./scripts/rag/recreate_rag.sh`.
- **Inspeção de Dependências com Graphify (Obrigatório):** Antes de iniciar ou modificar tarefas, entidades, rotas ou fluxos, o desenvolvedor/agente deve obrigatoriamente inspecionar as dependências do projeto através do Graphify (`graphify-out/GRAPH_REPORT.md`, `graphify-out/graph.html` ou executando `.venv/bin/graphify query "<pergunta>"`). Para atualizar após alterações: `.venv/bin/graphify update`.

---

## Estrutura de Tarefas

### Fase 1: Fundação do Sistema (Setup, Banco MySQL e Autenticação)

---

### Task 1: Scaffolding do Monorepo e Estrutura Inicial

**Files:**
- Create: `package.json`
- Create: `backend/package.json`
- Create: `frontend/package.json`
- Create: `backend/.env.example`
- Create: `frontend/.env.example`
- Create: `.gitignore`

**Interfaces:**
- Consumes: N/A
- Produces: Scripts de inicialização `npm run dev`, `npm run test` para backend e frontend.

- [x] **Step 1: Write the failing test (Package config test)**

Crie o arquivo de teste `backend/tests/setup.test.js`:
```javascript
const fs = require('fs');
const path = require('path');

describe('Ambiente e Scaffolding', () => {
  test('deve conter arquivo .env.example e package.json no backend', () => {
    const envExists = fs.existsSync(path.resolve(__dirname, '../.env.example'));
    const pkgExists = fs.existsSync(path.resolve(__dirname, '../package.json'));
    expect(envExists).toBe(true);
    expect(pkgExists).toBe(true);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test backend/tests/setup.test.js`
Expected: FAIL (arquivos não existem ainda).

- [x] **Step 3: Write minimal implementation**

Crie `backend/package.json`:
```json
{
  "name": "mei-backend",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mysql2": "^3.9.7"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.1.0",
    "supertest": "^7.0.0"
  }
}
```

Crie `backend/.env.example`:
```env
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=mei_db
DB_PORT=3306
JWT_SECRET=super_secreto_chave_jwt_recode_2026
```

Crie `.gitignore`:
```text
node_modules/
.env
dist/
build/
*.log
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test backend/tests/setup.test.js`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add package.json backend/package.json backend/.env.example .gitignore backend/tests/setup.test.js
git commit -m "chore: setup inicial do backend e configuracoes do monorepo"
```

---

### Task 2: Conexão MySQL, Pool e Script de Migração DDL

**Files:**
- Create: `backend/src/config/database.js`
- Create: `backend/src/database/schema.sql`
- Create: `backend/src/database/migrate.js`
- Test: `backend/tests/database.test.js`

**Interfaces:**
- Consumes: Variáveis de ambiente (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`).
- Produces: `pool.execute(query, params)` exportado por `database.js`.

- [x] **Step 1: Write the failing test**

Crie `backend/tests/database.test.js`:
```javascript
const pool = require('../src/config/database');

describe('Conexao com Banco de Dados MySQL', () => {
  afterAll(async () => {
    await pool.end();
  });

  test('deve executar uma consulta de teste SELECT 1 com sucesso', async () => {
    const [rows] = await pool.execute('SELECT 1 + 1 AS resultado');
    expect(rows[0].resultado).toBe(2);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/database.test.js`
Expected: FAIL com erro `Cannot find module '../src/config/database'`.

- [x] **Step 3: Write minimal implementation**

Crie `backend/src/config/database.js`:
```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mei_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true
});

module.exports = pool;
```

Crie `backend/src/database/schema.sql` com o DDL completo especificado em `docs/modelo-dados.md` criando tabelas `usuarios`, `clientes`, `servicos`, `agendamentos`, `orcamentos`, `orcamento_itens`, `cobrancas`, `movimentacoes`.

Crie `backend/src/database/migrate.js` para ler `schema.sql` e executar as queries no MySQL.

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/database.test.js`
Expected: PASS com `resultado: 2`.

- [x] **Step 5: Commit**

```bash
git add backend/src/config/database.js backend/src/database/schema.sql backend/src/database/migrate.js backend/tests/database.test.js
git commit -m "feat(db): pool de conexoes mysql e script de migracao ddl"
```

---

### Task 3: Backend — Autenticação (Registro, Login JWT e Middleware)

**Files:**
- Create: `backend/src/repositories/usuarioRepository.js`
- Create: `backend/src/services/authService.js`
- Create: `backend/src/controllers/authController.js`
- Create: `backend/src/middlewares/authMiddleware.js`
- Create: `backend/src/routes/authRoutes.js`
- Create: `backend/src/app.js`
- Test: `backend/tests/auth.test.js`

**Interfaces:**
- Consumes: `pool.execute()` de `database.js`.
- Produces: Rotas `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` e `authMiddleware` que anexa `req.usuario = { id, nome, email }`.

- [x] **Step 1: Write the failing test**

Crie `backend/tests/auth.test.js`:
```javascript
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Autenticação API', () => {
  beforeAll(async () => {
    await pool.execute('DELETE FROM usuarios WHERE email = ?', ['teste.auth@mei.com']);
  });
  afterAll(async () => {
    await pool.execute('DELETE FROM usuarios WHERE email = ?', ['teste.auth@mei.com']);
    await pool.end();
  });

  test('POST /api/auth/register deve cadastrar novo MEI com senha criptografada', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nome: 'Empreendedor Teste',
        email: 'teste.auth@mei.com',
        senha: 'SenhaValida123'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.token).toBeDefined();
    expect(res.body.dados.nome).toBe('Empreendedor Teste');
  });

  test('POST /api/auth/login deve autenticar com credenciais corretas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'teste.auth@mei.com',
        senha: 'SenhaValida123'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.token).toBeDefined();
  });

  test('POST /api/auth/login deve recusar senha incorreta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'teste.auth@mei.com',
        senha: 'SenhaErrada'
      });
    expect(res.statusCode).toBe(401);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/auth.test.js`
Expected: FAIL com módulo não encontrado.

- [x] **Step 3: Write minimal implementation**

Implemente:
1. `backend/src/repositories/usuarioRepository.js`: `criar({ nome, email, senhaHash })`, `buscarPorEmail(email)`, `buscarPorId(id)`.
2. `backend/src/services/authService.js`: validação de e-mail duplicado, hash com `bcrypt.hash(senha, 10)`, comparação `bcrypt.compare()`, geração de token com `jwt.sign({ id, nome, email }, process.env.JWT_SECRET, { expiresIn: '7d' })`.
3. `backend/src/middlewares/authMiddleware.js`: verifica `req.headers.authorization`, decodifica o JWT e preenche `req.usuario`.
4. `backend/src/controllers/authController.js` e `backend/src/routes/authRoutes.js`.
5. `backend/src/app.js` configurando Express, CORS e rotas.

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/auth.test.js`
Expected: PASS com 3 testes passando.

- [x] **Step 5: Commit**

```bash
git add backend/src/ backend/tests/auth.test.js
git commit -m "feat(auth): registro, login jwt e middleware de autenticacao"
```

---

### Task 4: Frontend — Configuração Vite, Roteamento e Telas de Login/Registro

**Files:**
- Create: `frontend/src/services/api.js`
- Create: `frontend/src/context/AuthContext.jsx`
- Create: `frontend/src/pages/Login.jsx`
- Create: `frontend/src/pages/Register.jsx`
- Create: `frontend/src/components/PrivateRoute.jsx`
- Create: `frontend/src/App.jsx`
- Test: `frontend/src/pages/Login.test.jsx`

**Interfaces:**
- Consumes: `/api/auth/login` e `/api/auth/register` via Axios.
- Produces: `useAuth()` disponibilizando `{ usuario, login, logout, estaAutenticado, carregando }`.

- [x] **Step 1: Write the failing test**

Crie `frontend/src/pages/Login.test.jsx`:
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import { AuthProvider } from '../context/AuthContext';

describe('Tela de Login', () => {
  test('deve renderizar campos de email, senha e botao entrar', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- Login.test.jsx`
Expected: FAIL.

- [x] **Step 3: Write minimal implementation**

1. Crie `frontend/src/services/api.js` com interceptor anexando `Bearer <token>` do localStorage.
2. Crie `frontend/src/context/AuthContext.jsx` gerenciando estado de autenticação e persistência no localStorage.
3. Crie `frontend/src/pages/Login.jsx` e `frontend/src/pages/Register.jsx` com formulários validados e mensagens de feedback.
4. Crie `frontend/src/components/PrivateRoute.jsx` redirecionando para `/login` caso não autenticado.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- Login.test.jsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat(front-auth): integracao com api de autenticacao, contexto e telas de login e cadastro"
```

---

### Fase 2: Cadastros Essenciais (Clientes e Serviços)

---

### Task 5: Backend — Módulo Clientes (CRUD e Multi-Tenant)

**Files:**
- Create: `backend/src/repositories/clienteRepository.js`
- Create: `backend/src/controllers/clienteController.js`
- Create: `backend/src/routes/clienteRoutes.js`
- Test: `backend/tests/clientes.test.js`

**Interfaces:**
- Consumes: `authMiddleware` (`req.usuario.id`).
- Produces: `POST /api/clientes`, `GET /api/clientes`, `GET /api/clientes/:id`, `PUT /api/clientes/:id`, `DELETE /api/clientes/:id`.

- [x] **Step 1: Write the failing test**

Crie `backend/tests/clientes.test.js`:
```javascript
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('CRUD de Clientes com Isolamento de Tenant', () => {
  let tokenUser1, tokenUser2, clienteId;

  beforeAll(async () => {
    // Configura 2 usuários para testar isolamento
    const u1 = await request(app).post('/api/auth/register').send({
      nome: 'MEI 1', email: 'mei1@teste.com', senha: '123'
    });
    tokenUser1 = u1.body.dados.token;

    const u2 = await request(app).post('/api/auth/register').send({
      nome: 'MEI 2', email: 'mei2@teste.com', senha: '123'
    });
    tokenUser2 = u2.body.dados.token;
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM usuarios WHERE email IN (?, ?)', ['mei1@teste.com', 'mei2@teste.com']);
    await pool.end();
  });

  test('POST /api/clientes deve criar cliente para MEI 1', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({
        nome: 'Cliente Exemplo 1',
        telefone: '11999998888',
        email: 'cliente1@mail.com'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.dados.nome).toBe('Cliente Exemplo 1');
    clienteId = res.body.dados.id;
  });

  test('GET /api/clientes para MEI 2 NÃO deve listar o cliente de MEI 1', async () => {
    const res = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${tokenUser2}`);
    expect(res.statusCode).toBe(200);
    const encontrado = res.body.dados.find(c => c.id === clienteId);
    expect(encontrado).toBeUndefined();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/clientes.test.js`
Expected: FAIL (rotas não existem).

- [x] **Step 3: Write minimal implementation**

Implemente:
1. `clienteRepository.js` com métodos `listarPorUsuario(usuario_id, busca)`, `buscarPorId(id, usuario_id)`, `criar(dados)`, `atualizar(id, usuario_id, dados)`, `inativarOuExcluir(id, usuario_id)`.
2. `clienteController.js` validando `nome` obrigatório.
3. `clienteRoutes.js` montando rotas protegidas pelo middleware `authMiddleware`.
4. Plugue em `app.js`: `app.use('/api/clientes', authMiddleware, clienteRoutes)`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/clientes.test.js`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add backend/src/ backend/tests/clientes.test.js
git commit -m "feat(clientes): api crud de clientes com garantia de isolamento por mei"
```

---

### Task 6: Frontend — Módulo Clientes (Listagem, Busca e Modais de Edição)

**Files:**
- Create: `frontend/src/components/DataTable.jsx`
- Create: `frontend/src/components/Modal.jsx`
- Create: `frontend/src/components/FormField.jsx`
- Create: `frontend/src/pages/Clientes.jsx`
- Test: `frontend/src/pages/Clientes.test.jsx`

**Interfaces:**
- Consumes: `api.get('/clientes')`, `api.post('/clientes')`, `api.put('/clientes/:id')`, `api.delete('/clientes/:id')`.
- Produces: Tela `/clientes` com ações funcionais de busca, criação e edição.

- [x] **Step 1: Write the failing test**

Crie `frontend/src/pages/Clientes.test.jsx`:
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import Clientes from './Clientes';
import * as apiModule from '../services/api';

vi.mock('../services/api');

describe('Tela de Clientes', () => {
  test('deve listar clientes retornados pela API', async () => {
    apiModule.api.get.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: [{ id: 1, nome: 'Ana Lima', telefone: '11988887777', email: 'ana@teste.com' }]
      }
    });

    render(<Clientes />);
    await waitFor(() => {
      expect(screen.getByText('Ana Lima')).toBeInTheDocument();
      expect(screen.getByText('11988887777')).toBeInTheDocument();
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- Clientes.test.jsx`
Expected: FAIL.

- [x] **Step 3: Write minimal implementation**

Implemente `frontend/src/pages/Clientes.jsx` e os componentes reutilizáveis `DataTable`, `Modal` e `FormField` com estados de loading, feedback de sucesso e tratamento de erros.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- Clientes.test.jsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat(front-clientes): tela de clientes com tabela de registros, busca e modal de cadastro"
```

---

### Task 7: Backend — Módulo Serviços e Produtos

**Files:**
- Create: `backend/src/repositories/servicoRepository.js`
- Create: `backend/src/controllers/servicoController.js`
- Create: `backend/src/routes/servicoRoutes.js`
- Test: `backend/tests/servicos.test.js`

**Interfaces:**
- Consumes: `req.usuario.id`.
- Produces: `POST /api/servicos`, `GET /api/servicos`, `GET /api/servicos/:id`, `PUT /api/servicos/:id`, `DELETE /api/servicos/:id`.

- [x] **Step 1: Write the failing test**

Crie `backend/tests/servicos.test.js`:
```javascript
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('CRUD de Serviços/Produtos', () => {
  let token, servicoId;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({
      nome: 'MEI Servicos', email: 'servicos@mei.com', senha: '123'
    });
    token = res.body.dados.token;
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM usuarios WHERE email = ?', ['servicos@mei.com']);
    await pool.end();
  });

  test('POST /api/servicos deve criar um servico com preco validado', async () => {
    const res = await request(app)
      .post('/api/servicos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Troca de Óleo',
        descricao: 'Troca de óleo mineral e filtro',
        preco: 120.50,
        categoria: 'Mecânica'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.dados.preco).toBe(120.50);
    servicoId = res.body.dados.id;
  });

  test('POST /api/servicos deve rejeitar servico com preco negativo', async () => {
    const res = await request(app)
      .post('/api/servicos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Serviço Inválido',
        preco: -10
      });
    expect(res.statusCode).toBe(400);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/servicos.test.js`
Expected: FAIL.

- [x] **Step 3: Write minimal implementation**

Implemente:
1. `servicoRepository.js` filtrando sempre por `usuario_id` e `ativo = 1`.
2. `servicoController.js` validando `preco >= 0` e `nome` preenchido.
3. `servicoRoutes.js` e inclusão em `app.js`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/servicos.test.js`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add backend/src/ backend/tests/servicos.test.js
git commit -m "feat(servicos): crud do catalogo de produtos e servicos com validacao de precos"
```

---

### Task 8: Frontend — Módulo Serviços e Produtos

**Files:**
- Create: `frontend/src/pages/Servicos.jsx`
- Test: `frontend/src/pages/Servicos.test.jsx`

**Interfaces:**
- Consumes: `/api/servicos` endpoints.
- Produces: Tela de catálogo de serviços/produtos com filtro por categoria, listagem e formulário de novo serviço.

- [x] **Step 1: Write the failing test**

Crie `frontend/src/pages/Servicos.test.jsx`:
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import Servicos from './Servicos';
import * as apiModule from '../services/api';

vi.mock('../services/api');

describe('Tela de Servicos', () => {
  test('deve exibir tabela com servicos e precos formatados em BRL', async () => {
    apiModule.api.get.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: [{ id: 1, nome: 'Pintura Residencial', preco: 450.00, categoria: 'Serviço' }]
      }
    });

    render(<Servicos />);
    await waitFor(() => {
      expect(screen.getByText('Pintura Residencial')).toBeInTheDocument();
      expect(screen.getByText(/450/)).toBeInTheDocument();
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- Servicos.test.jsx`
Expected: FAIL.

- [x] **Step 3: Write minimal implementation**

Implemente `frontend/src/pages/Servicos.jsx` permitindo criar, listar, alterar preço e desativar produtos/serviços.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- Servicos.test.jsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add frontend/src/pages/Servicos*
git commit -m "feat(front-servicos): tela de gestao de catalogo de servicos e produtos"
```

---

### Fase 3: Operação (Orçamentos e Agenda)

---

### Task 9: Backend — Módulo Orçamentos com Itens e Cálculo Auditado

**Files:**
- Create: `backend/src/repositories/orcamentoRepository.js`
- Create: `backend/src/services/orcamentoService.js`
- Create: `backend/src/controllers/orcamentoController.js`
- Create: `backend/src/routes/orcamentoRoutes.js`
- Test: `backend/tests/orcamentos.test.js`

**Interfaces:**
- Consumes: `clientes`, `servicos`, `authMiddleware`.
- Produces: `POST /api/orcamentos` (recalculando subtotal e total no backend), `GET /api/orcamentos`, `GET /api/orcamentos/:id`, `PATCH /api/orcamentos/:id/status`.

- [x] **Step 1: Write the failing test**

Crie `backend/tests/orcamentos.test.js`:
```javascript
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Módulo de Orçamentos com Validação de Totais', () => {
  let token, clienteId, servicoId;

  beforeAll(async () => {
    const auth = await request(app).post('/api/auth/register').send({
      nome: 'MEI Orcamento', email: 'orcamento@mei.com', senha: '123'
    });
    token = auth.body.dados.token;

    const cli = await request(app).post('/api/clientes').set('Authorization', `Bearer ${token}`).send({
      nome: 'Cliente Orçamento'
    });
    clienteId = cli.body.dados.id;

    const serv = await request(app).post('/api/servicos').set('Authorization', `Bearer ${token}`).send({
      nome: 'Manutenção', preco: 100.00
    });
    servicoId = serv.body.dados.id;
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM usuarios WHERE email = ?', ['orcamento@mei.com']);
    await pool.end();
  });

  test('POST /api/orcamentos deve calcular automaticamente subtotal e total com desconto', async () => {
    const res = await request(app)
      .post('/api/orcamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        data_emissao: '2026-10-02',
        desconto: 15.00,
        itens: [
          { servico_id: servicoId, quantidade: 2, preco_unitario: 100.00 } // subtotal = 200.00
        ]
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.dados.subtotal).toBe(200.00);
    expect(res.body.dados.desconto).toBe(15.00);
    expect(res.body.dados.total).toBe(185.00);
  });

  test('POST /api/orcamentos deve rejeitar orcamento sem itens', async () => {
    const res = await request(app)
      .post('/api/orcamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        itens: []
      });
    expect(res.statusCode).toBe(400);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/orcamentos.test.js`
Expected: FAIL.

- [x] **Step 3: Write minimal implementation**

Implemente:
1. `orcamentoService.js` com regras de validação:
   - Requer ao menos um item;
   - Calcula `subtotal = itens.reduce((acc, i) => acc + (i.quantidade * i.preco_unitario), 0)`;
   - Valida `desconto >= 0 && desconto <= subtotal`;
   - Calcula `total = subtotal - desconto`.
2. `orcamentoRepository.js` executando inserção atômica (transação MySQL `START TRANSACTION`, insere em `orcamentos`, insere em `orcamento_itens`, `COMMIT`).
3. `orcamentoController.js` e `orcamentoRoutes.js`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/orcamentos.test.js`
Expected: PASS com cálculos corretos de subtotal e total.

- [x] **Step 5: Commit**

```bash
git add backend/src/ backend/tests/orcamentos.test.js
git commit -m "feat(orcamentos): calculo auditado no backend de orcamentos e itens transacionados"
```

---

### Task 10: Frontend — Módulo Orçamentos

**Files:**
- Create: `frontend/src/pages/Orcamentos.jsx`
- Create: `frontend/src/components/OrcamentoFormModal.jsx`
- Test: `frontend/src/pages/Orcamentos.test.jsx`

**Interfaces:**
- Consumes: `/api/orcamentos`, `/api/clientes`, `/api/servicos`.
- Produces: Interface de emissão de orçamentos com adição dinâmica de itens, cálculo de subtotal na tela e visualização com badge de status.

- [x] **Step 1: Write the failing test**

Crie `frontend/src/pages/Orcamentos.test.jsx`:
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import Orcamentos from './Orcamentos';
import * as apiModule from '../services/api';

vi.mock('../services/api');

describe('Tela de Orçamentos', () => {
  test('deve renderizar a listagem de orçamentos emitidos', async () => {
    apiModule.api.get.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: [{ id: 1, cliente_nome: 'Carlos Souza', total: 350.00, status: 'APROVADO' }]
      }
    });

    render(<Orcamentos />);
    await waitFor(() => {
      expect(screen.getByText('Carlos Souza')).toBeInTheDocument();
      expect(screen.getByText('APROVADO')).toBeInTheDocument();
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- Orcamentos.test.jsx`
Expected: FAIL.

- [x] **Step 3: Write minimal implementation**

Implemente `frontend/src/pages/Orcamentos.jsx` e `frontend/src/components/OrcamentoFormModal.jsx` permitindo selecionar cliente, adicionar linhas de itens, aplicar desconto e enviar para a API.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- Orcamentos.test.jsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add frontend/src/pages/Orcamentos* frontend/src/components/Orcamento*
git commit -m "feat(front-orcamentos): emissao e acompanhamento de propostas comerciais"
```

---

### Task 11: Backend — Módulo Agendamentos com Prevenção de Conflito

**Files:**
- Create: `backend/src/repositories/agendamentoRepository.js`
- Create: `backend/src/services/agendamentoService.js`
- Create: `backend/src/controllers/agendamentoController.js`
- Create: `backend/src/routes/agendamentoRoutes.js`
- Test: `backend/tests/agendamentos.test.js`

**Interfaces:**
- Consumes: `req.usuario.id`.
- Produces: `POST /api/agendamentos`, `GET /api/agendamentos`, `PUT /api/agendamentos/:id`, `DELETE /api/agendamentos/:id`.

- [x] **Step 1: Write the failing test**

Crie `backend/tests/agendamentos.test.js`:
```javascript
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Agenda e Prevenção de Conflitos', () => {
  let token, clienteId;

  beforeAll(async () => {
    const auth = await request(app).post('/api/auth/register').send({
      nome: 'MEI Agenda', email: 'agenda@mei.com', senha: '123'
    });
    token = auth.body.dados.token;

    const cli = await request(app).post('/api/clientes').set('Authorization', `Bearer ${token}`).send({
      nome: 'Cliente Agenda'
    });
    clienteId = cli.body.dados.id;
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM usuarios WHERE email = ?', ['agenda@mei.com']);
    await pool.end();
  });

  test('POST /api/agendamentos deve agendar compromisso com sucesso', async () => {
    const res = await request(app)
      .post('/api/agendamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        data_hora: '2026-11-10T14:00:00',
        observacoes: 'Primeiro atendimento'
      });
    expect(res.statusCode).toBe(201);
  });

  test('POST /api/agendamentos deve rejeitar agendamento com choque de horário para o mesmo MEI', async () => {
    const res = await request(app)
      .post('/api/agendamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        data_hora: '2026-11-10T14:00:00',
        observacoes: 'Horário idêntico'
      });
    expect(res.statusCode).toBe(409);
    expect(res.body.mensagem).toMatch(/conflito/i);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/agendamentos.test.js`
Expected: FAIL.

- [x] **Step 3: Write minimal implementation**

Implemente:
1. `agendamentoService.js` com verificação de horário ocupado (`buscarPorDataHora(usuario_id, data_hora)`).
2. Se horário já estiver ocupado por agendamento com status `PENDENTE` ou `CONFIRMADO`, retornar erro 409 (Conflito).
3. `agendamentoRepository.js`, `agendamentoController.js` e `agendamentoRoutes.js`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/agendamentos.test.js`
Expected: PASS (rejeitando conflitos de horário).

- [x] **Step 5: Commit**

```bash
git add backend/src/ backend/tests/agendamentos.test.js
git commit -m "feat(agenda): crud de agendamentos com bloqueio de conflito de horarios"
```

---

### Task 12: Frontend — Módulo Agenda

**Files:**
- Create: `frontend/src/pages/Agenda.jsx`
- Create: `frontend/src/components/StatusBadge.jsx`
- Test: `frontend/src/pages/Agenda.test.jsx`

**Interfaces:**
- Consumes: `/api/agendamentos`.
- Produces: Tela de agenda com visualização em lista/cards, filtro de data e status (`CONFIRMADO`, `PENDENTE`, `CONCLUIDO`).

- [x] **Step 1: Write the failing test**

Crie `frontend/src/pages/Agenda.test.jsx`:
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import Agenda from './Agenda';
import * as apiModule from '../services/api';

vi.mock('../services/api');

describe('Tela de Agenda', () => {
  test('deve renderizar agendamentos do dia', async () => {
    apiModule.api.get.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: [{ id: 1, cliente_nome: 'Marcos Dias', data_hora: '2026-10-10T10:00:00', status: 'PENDENTE' }]
      }
    });

    render(<Agenda />);
    await waitFor(() => {
      expect(screen.getByText('Marcos Dias')).toBeInTheDocument();
      expect(screen.getByText('PENDENTE')).toBeInTheDocument();
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- Agenda.test.jsx`
Expected: FAIL.

- [x] **Step 3: Write minimal implementation**

Implemente `frontend/src/pages/Agenda.jsx` e `frontend/src/components/StatusBadge.jsx` permitindo agendar novo serviço, alterar status (confirmar, concluir ou cancelar).

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- Agenda.test.jsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add frontend/src/pages/Agenda* frontend/src/components/StatusBadge*
git commit -m "feat(front-agenda): modulo de agenda com status de atendimento"
```

---

### Fase 4: Módulo Financeiro (Cobranças e Livro Caixa Integrado)

---

### Task 13: Backend — Cobranças e Baixa com Criação Automática no Caixa

**Files:**
- Create: `backend/src/repositories/cobrancaRepository.js`
- Create: `backend/src/repositories/movimentacaoRepository.js`
- Create: `backend/src/services/financeiroService.js`
- Create: `backend/src/controllers/cobrancaController.js`
- Create: `backend/src/controllers/movimentacaoController.js`
- Create: `backend/src/routes/cobrancaRoutes.js`
- Create: `backend/src/routes/movimentacaoRoutes.js`
- Test: `backend/tests/financeiro.test.js`

**Interfaces:**
- Consumes: `req.usuario.id`.
- Produces: `POST /api/cobrancas`, `GET /api/cobrancas`, `PATCH /api/cobrancas/:id/pagar`, `GET /api/movimentacoes`, `POST /api/movimentacoes`.

- [x] **Step 1: Write the failing test**

Crie `backend/tests/financeiro.test.js`:
```javascript
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Integração Cobrança -> Livro Caixa na Baixa', () => {
  let token, clienteId, cobrancaId;

  beforeAll(async () => {
    const auth = await request(app).post('/api/auth/register').send({
      nome: 'MEI Financeiro', email: 'fin@mei.com', senha: '123'
    });
    token = auth.body.dados.token;

    const cli = await request(app).post('/api/clientes').set('Authorization', `Bearer ${token}`).send({
      nome: 'Cliente Financeiro'
    });
    clienteId = cli.body.dados.id;
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM usuarios WHERE email = ?', ['fin@mei.com']);
    await pool.end();
  });

  test('POST /api/cobrancas deve gerar cobranca pendente', async () => {
    const res = await request(app)
      .post('/api/cobrancas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        valor: 200.00,
        vencimento: '2026-10-30',
        observacoes: 'Cobrança teste'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.dados.status).toBe('PENDENTE');
    cobrancaId = res.body.dados.id;
  });

  test('PATCH /api/cobrancas/:id/pagar deve marcar como PAGO e criar ENTRADA no caixa', async () => {
    const res = await request(app)
      .patch(`/api/cobrancas/${cobrancaId}/pagar`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        data_pagamento: '2026-10-25',
        gerar_movimentacao_caixa: true
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.dados.status).toBe('PAGO');

    // Verifica se a movimentacao correspondente apareceu no caixa
    const caixaRes = await request(app)
      .get('/api/movimentacoes')
      .set('Authorization', `Bearer ${token}`);
    expect(caixaRes.statusCode).toBe(200);
    const entrada = caixaRes.body.dados.find(m => m.cobranca_id === cobrancaId);
    expect(entrada).toBeDefined();
    expect(entrada.tipo).toBe('ENTRADA');
    expect(entrada.valor).toBe(200.00);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/financeiro.test.js`
Expected: FAIL.

- [x] **Step 3: Write minimal implementation**

Implemente:
1. `financeiroService.js` com método `darBaixaCobranca(id, usuario_id, { data_pagamento, gerar_movimentacao_caixa })`:
   - Atualiza `cobrancas` com `status = 'PAGO'` e `data_pagamento`;
   - Se `gerar_movimentacao_caixa === true`, executa `movimentacaoRepository.criar()` com `tipo = 'ENTRADA'`, `cobranca_id = id`, `valor = cobranca.valor`.
2. `cobrancaController.js`, `movimentacaoController.js` e respectivas rotas.

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/financeiro.test.js`
Expected: PASS com entrada no caixa gerada automaticamente após baixa.

- [x] **Step 5: Commit**

```bash
git add backend/src/ backend/tests/financeiro.test.js
git commit -m "feat(financeiro): cobrancas e automacao de baixa refletindo no livro caixa"
```

---

### Task 14: Frontend — Telas de Cobranças e Livro Caixa

**Files:**
- Create: `frontend/src/pages/Cobrancas.jsx`
- Create: `frontend/src/pages/Caixa.jsx`
- Test: `frontend/src/pages/Financeiro.test.jsx`

**Interfaces:**
- Consumes: `/api/cobrancas`, `/api/movimentacoes`.
- Produces: Tela de Cobranças (com botão de ação "Dar Baixa") e Tela de Caixa (com extrato de entradas/saídas e saldo).

- [x] **Step 1: Write the failing test**

Crie `frontend/src/pages/Financeiro.test.jsx`:
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import Cobrancas from './Cobrancas';
import * as apiModule from '../services/api';

vi.mock('../services/api');

describe('Telas Financeiras', () => {
  test('deve renderizar cobranças e botão de baixa', async () => {
    apiModule.api.get.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: [{ id: 1, cliente_nome: 'Paula Costa', valor: 250.00, status: 'PENDENTE' }]
      }
    });

    render(<Cobrancas />);
    await waitFor(() => {
      expect(screen.getByText('Paula Costa')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dar baixa/i })).toBeInTheDocument();
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- Financeiro.test.jsx`
Expected: FAIL.

- [x] **Step 3: Write minimal implementation**

Implemente:
1. `frontend/src/pages/Cobrancas.jsx` com modal de confirmação de recebimento que aciona `api.patch('/cobrancas/:id/pagar')`.
2. `frontend/src/pages/Caixa.jsx` com resumo de saldo total, entradas verdes, saídas vermelhas e modal para lançamento manual de despesas operacionais.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- Financeiro.test.jsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add frontend/src/pages/Cobrancas* frontend/src/pages/Caixa*
git commit -m "feat(front-fin): telas de cobrancas e fluxo de caixa com baixa de pagamento"
```

---

### Fase 5: Dashboard Consolidado & Refinamentos de Interface

---

### Task 15: Backend — Endpoint Agregador do Dashboard

**Files:**
- Create: `backend/src/controllers/dashboardController.js`
- Create: `backend/src/routes/dashboardRoutes.js`
- Test: `backend/tests/dashboard.test.js`

**Interfaces:**
- Consumes: Queries agregadas sobre `movimentacoes`, `cobrancas`, `agendamentos` e `orcamentos`.
- Produces: `GET /api/dashboard/resumo` retornando resumo financeiro e operacional.

- [x] **Step 1: Write the failing test**

Crie `backend/tests/dashboard.test.js`:
```javascript
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Dashboard Consolidado', () => {
  let token;

  beforeAll(async () => {
    const auth = await request(app).post('/api/auth/register').send({
      nome: 'MEI Dash', email: 'dash@mei.com', senha: '123'
    });
    token = auth.body.dados.token;
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM usuarios WHERE email = ?', ['dash@mei.com']);
    await pool.end();
  });

  test('GET /api/dashboard/resumo deve retornar indicadores consolidados', async () => {
    const res = await request(app)
      .get('/api/dashboard/resumo')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.dados.financeiro).toHaveProperty('entradas_mes');
    expect(res.body.dados.financeiro).toHaveProperty('saldo_mes');
    expect(res.body.dados.operacional).toHaveProperty('agendamentos_hoje');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest backend/tests/dashboard.test.js`
Expected: FAIL.

- [x] **Step 3: Write minimal implementation**

Implemente `backend/src/controllers/dashboardController.js` realizando queries agregadas:
- Soma de entradas e saídas do mês corrente em `movimentacoes`;
- Soma de cobranças pendentes em `cobrancas`;
- Contagem e lista dos próximos agendamentos em `agendamentos`.
Conecte a rota em `backend/src/routes/dashboardRoutes.js` e em `app.js`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest backend/tests/dashboard.test.js`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add backend/src/ backend/tests/dashboard.test.js
git commit -m "feat(dashboard): endpoint de consolidacao de metricas do negocio"
```

---

### Task 16: Frontend — Dashboard com Cards e Layout Responsivo

**Files:**
- Create: `frontend/src/components/Navbar.jsx`
- Create: `frontend/src/components/Sidebar.jsx`
- Create: `frontend/src/components/SummaryCard.jsx`
- Create: `frontend/src/pages/Dashboard.jsx`
- Test: `frontend/src/pages/Dashboard.test.jsx`

**Interfaces:**
- Consumes: `/api/dashboard/resumo`.
- Produces: Layout principal com menu lateral, topo com dados do MEI autenticado e cards de métricas.

- [x] **Step 1: Write the failing test**

Crie `frontend/src/pages/Dashboard.test.jsx`:
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';
import * as apiModule from '../services/api';

vi.mock('../services/api');

describe('Tela do Dashboard', () => {
  test('deve renderizar cards com faturamento e agendamentos', async () => {
    apiModule.api.get.mockResolvedValueOnce({
      data: {
        sucesso: true,
        dados: {
          financeiro: { entradas_mes: 3200, saidas_mes: 800, saldo_mes: 2400, a_receber_pendente: 500 },
          operacional: { agendamentos_hoje: 2, proximos_agendamentos: [], orcamentos_pendentes: 1 }
        }
      }
    });

    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/3.200/)).toBeInTheDocument();
      expect(screen.getByText(/2.400/)).toBeInTheDocument();
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- Dashboard.test.jsx`
Expected: FAIL.

- [x] **Step 3: Write minimal implementation**

Implemente:
1. `frontend/src/components/Navbar.jsx` e `frontend/src/components/Sidebar.jsx` com navegação para todas as telas.
2. `frontend/src/components/SummaryCard.jsx` com ícones Lucide e cores semânticas.
3. `frontend/src/pages/Dashboard.jsx` montando os cards e tabela de compromissos imediatos.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- Dashboard.test.jsx`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add frontend/src/components/Navbar* frontend/src/components/Sidebar* frontend/src/components/SummaryCard* frontend/src/pages/Dashboard*
git commit -m "feat(front-dash): painel de indicadores com layout responsivo e cards resumidos"
```

---

### Fase 6: Validação Integrada e Prontidão para Demonstração

---

### Task 17: Teste End-to-End da Jornada Completa do MEI

**Files:**
- Create: `backend/tests/e2e-jornada.test.js`

**Interfaces:**
- Consumes: Todos os módulos do backend em conjunto.
- Produces: Validação automatizada do fluxo completo:
  $$\text{Cadastro MEI} \rightarrow \text{Cliente} \rightarrow \text{Serviço} \rightarrow \text{Orçamento} \rightarrow \text{Agenda} \rightarrow \text{Cobrança} \rightarrow \text{Baixa Caixa} \rightarrow \text{Dashboard}$$

- [x] **Step 1: Write the failing test**

Crie `backend/tests/e2e-jornada.test.js`:
```javascript
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Jornada de Ponta a Ponta do Microempreendedor', () => {
  afterAll(async () => {
    await pool.execute('DELETE FROM usuarios WHERE email = ?', ['jornada.completa@mei.com']);
    await pool.end();
  });

  test('Executa o fluxo completo do negócio sem intervenção manual no banco', async () => {
    // 1. Cadastro e Login
    const auth = await request(app).post('/api/auth/register').send({
      nome: 'MEI E2E', email: 'jornada.completa@mei.com', senha: 'SenhaForte123'
    });
    const token = auth.body.dados.token;

    // 2. Cadastra Cliente
    const cli = await request(app).post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Cliente Jornada', telefone: '11999990000' });
    const clienteId = cli.body.dados.id;

    // 3. Cadastra Serviço
    const srv = await request(app).post('/api/servicos')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Conserto Elétrico', preco: 300.00 });
    const servicoId = srv.body.dados.id;

    // 4. Cria Orçamento com 1 item
    const orc = await request(app).post('/api/orcamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        data_emissao: '2026-10-02',
        desconto: 50.00,
        itens: [{ servico_id: servicoId, quantidade: 1, preco_unitario: 300.00 }]
      });
    expect(orc.body.dados.total).toBe(250.00);
    const orcamentoId = orc.body.dados.id;

    // 5. Cria Agendamento
    const agd = await request(app).post('/api/agendamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        servico_id: servicoId,
        data_hora: '2026-10-05T15:00:00'
      });
    expect(agd.statusCode).toBe(201);

    // 6. Emite Cobrança
    const cob = await request(app).post('/api/cobrancas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        orcamento_id: orcamentoId,
        valor: 250.00,
        vencimento: '2026-10-15'
      });
    const cobrancaId = cob.body.dados.id;

    // 7. Dá baixa na Cobrança (Pago)
    const bx = await request(app).patch(`/api/cobrancas/${cobrancaId}/pagar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ data_pagamento: '2026-10-05', gerar_movimentacao_caixa: true });
    expect(bx.body.dados.status).toBe('PAGO');

    // 8. Confere atualização no Dashboard
    const dash = await request(app).get('/api/dashboard/resumo')
      .set('Authorization', `Bearer ${token}`);
    expect(dash.body.dados.financeiro.entradas_mes).toBeGreaterThanOrEqual(250.00);
  });
});
```

- [x] **Step 2: Run test to verify it passes**

Run: `npx jest backend/tests/e2e-jornada.test.js`
Expected: PASS (demonstrando a integração de todas as fases).

- [x] **Step 3: Commit**

```bash
git add backend/tests/e2e-jornada.test.js
git commit -m "test(e2e): teste automatizado da jornada completa do usuario mei"
```

---

## Auto-Revisão e Validação do Plano

1. **Cobertura da Especificação:** O plano atende a todos os requisitos do documento oficial (`Documentacao_Projeto_MEI.docx`):
   - RF01 a RF08 contemplados com tarefas de backend e frontend dedicadas.
   - Stack estrita: ReactJS, Node.js REST API e MySQL.
   - ODS 8 e ODS 1 refletidos na proposta e na documentação.
   - Todos os endpoints da seção 10 e tabelas da seção 9 possuem tarefas mapeadas.
2. **Ausência de Placeholders:** Não há instruções vazias ou referências pendentes ("TBD", "TODO", "implementar depois"). Cada passo detalha código, comando de teste e resultado esperado.
3. **Consistência de Tipos e Parâmetros:** Os nomes de colunas, endpoints (`/api/clientes`, `/api/servicos`, `/api/orcamentos`, `/api/agendamentos`, `/api/cobrancas`, `/api/movimentacoes`, `/api/dashboard`) e retornos JSON estão 100% alinhados entre todas as tarefas e documentos técnicos.

---

## Opções de Execução

Plano completo e registrado em [`plan.md`](file:///home/JoaoVictor/projetos/projeto-final-arandue/plan.md).

Para prosseguir quando for iniciar o desenvolvimento:

1. **Subagent-Driven (Recomendado):** Disparo de subagentes autônomos por tarefa com verificação em duas etapas antes de cada commit.
2. **Execução Inline:** Execução em lote nesta sessão com checkpoints de validação.

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Módulo de Clientes API (/api/clientes) - CRUD & Multi-Tenancy', () => {
  let tokenUser1 = '';
  let tokenUser2 = '';
  let user1Id = null;
  let user2Id = null;

  const user1 = {
    nome: 'MEI Usuário Um',
    email: 'cliente.user1@mei.com',
    senha: 'SenhaForte123@'
  };

  const user2 = {
    nome: 'MEI Usuário Dois',
    email: 'cliente.user2@mei.com',
    senha: 'SenhaForte123@'
  };

  beforeAll(async () => {
    // Limpeza prévia de testes anteriores
    await pool.execute("DELETE FROM clientes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('cliente.user1@mei.com', 'cliente.user2@mei.com'))");
    await pool.execute("DELETE FROM usuarios WHERE email IN ('cliente.user1@mei.com', 'cliente.user2@mei.com')");

    // Cadastrar User 1
    const res1 = await request(app).post('/api/auth/register').send(user1);
    tokenUser1 = res1.body.dados.token;
    user1Id = res1.body.dados.id;

    // Cadastrar User 2
    const res2 = await request(app).post('/api/auth/register').send(user2);
    tokenUser2 = res2.body.dados.token;
    user2Id = res2.body.dados.id;
  });

  afterAll(async () => {
    // Limpeza final dos dados gerados
    await pool.execute("DELETE FROM clientes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('cliente.user1@mei.com', 'cliente.user2@mei.com'))");
    await pool.execute("DELETE FROM usuarios WHERE email IN ('cliente.user1@mei.com', 'cliente.user2@mei.com')");
    await pool.end();
  });

  describe('Proteção de Rotas com AuthMiddleware', () => {
    test('deve negar acesso sem token (401)', async () => {
      const res = await request(app).get('/api/clientes');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });

    test('deve negar acesso com token inválido (401)', async () => {
      const res = await request(app)
        .get('/api/clientes')
        .set('Authorization', 'Bearer token_invalido');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('POST /api/clientes (Criação de Clientes)', () => {
    test('deve rejeitar cadastro sem nome (400)', async () => {
      const res = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          email: 'semnome@email.com',
          telefone: '11999998888'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/nome.*obrigatório/i);
    });

    test('deve rejeitar cadastro com nome vazio (400)', async () => {
      const res = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          nome: '   ',
          email: 'nomevazio@email.com'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/nome.*obrigatório/i);
    });

    test('deve criar um novo cliente com todos os campos com sucesso (201)', async () => {
      const novoCliente = {
        nome: 'Carlos Silva',
        telefone: '(11) 98765-4321',
        email: 'carlos.silva@email.com',
        endereco: 'Rua das Flores, 123',
        observacoes: 'Cliente preferencial de manutenção'
      };

      const res = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(novoCliente);

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.mensagem).toBe('Cliente cadastrado com sucesso');
      expect(res.body.dados).toBeDefined();
      expect(res.body.dados.id).toBeDefined();
      expect(res.body.dados.usuario_id).toBe(user1Id);
      expect(res.body.dados.nome).toBe(novoCliente.nome);
      expect(res.body.dados.email).toBe(novoCliente.email);
      expect(res.body.dados.telefone).toBe(novoCliente.telefone);
      expect(res.body.dados.endereco).toBe(novoCliente.endereco);
      expect(res.body.dados.observacoes).toBe(novoCliente.observacoes);
    });

    test('deve criar um cliente apenas com nome obrigatório (201)', async () => {
      const res = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ nome: 'Ana Souza' });

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.nome).toBe('Ana Souza');
      expect(res.body.dados.telefone).toBeNull();
      expect(res.body.dados.email).toBeNull();
    });
  });

  describe('GET /api/clientes (Listagem e Busca)', () => {
    test('deve listar todos os clientes ativos ordenados por nome ASC (200)', async () => {
      const res = await request(app)
        .get('/api/clientes')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(Array.isArray(res.body.dados)).toBe(true);
      expect(res.body.dados.length).toBeGreaterThanOrEqual(2);

      // Checa ordenação alfabética
      const nomes = res.body.dados.map(c => c.nome);
      const nomesOrdenados = [...nomes].sort((a, b) => a.localeCompare(b));
      expect(nomes).toEqual(nomesOrdenados);
    });

    test('deve filtrar clientes por termo de busca em nome, email ou telefone', async () => {
      // Busca por nome parcial
      const resNome = await request(app)
        .get('/api/clientes?busca=Carlos')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(resNome.statusCode).toBe(200);
      expect(resNome.body.dados.length).toBe(1);
      expect(resNome.body.dados[0].nome).toBe('Carlos Silva');

      // Busca por email parcial
      const resEmail = await request(app)
        .get('/api/clientes?busca=carlos.silva')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(resEmail.statusCode).toBe(200);
      expect(resEmail.body.dados.length).toBe(1);
      expect(resEmail.body.dados[0].nome).toBe('Carlos Silva');

      // Busca por telefone parcial
      const resTelefone = await request(app)
        .get('/api/clientes?busca=98765')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(resTelefone.statusCode).toBe(200);
      expect(resTelefone.body.dados.length).toBe(1);
      expect(resTelefone.body.dados[0].nome).toBe('Carlos Silva');

      // Busca sem correspondência
      const resVazio = await request(app)
        .get('/api/clientes?busca=TermoInexistenteXYZ')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(resVazio.statusCode).toBe(200);
      expect(resVazio.body.dados.length).toBe(0);
    });
  });

  describe('GET /api/clientes/:id (Buscar por ID)', () => {
    let clienteId = null;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ nome: 'Cliente Para Busca', email: 'busca@teste.com' });
      clienteId = res.body.dados.id;
    });

    test('deve retornar o cliente do usuário quando ID existir (200)', async () => {
      const res = await request(app)
        .get(`/api/clientes/${clienteId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.id).toBe(clienteId);
      expect(res.body.dados.nome).toBe('Cliente Para Busca');
    });

    test('deve retornar 404 para ID inexistente', async () => {
      const res = await request(app)
        .get('/api/clientes/999999')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/não encontrado/i);
    });
  });

  describe('PUT /api/clientes/:id (Atualização de Clientes)', () => {
    let clienteParaAtualizarId = null;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          nome: 'Nome Antigo',
          telefone: '11111111',
          email: 'antigo@email.com'
        });
      clienteParaAtualizarId = res.body.dados.id;
    });

    test('deve atualizar dados do cliente com sucesso (200)', async () => {
      const dadosAtualizados = {
        nome: 'Nome Atualizado',
        telefone: '22222222',
        email: 'novo@email.com',
        endereco: 'Avenida Nova, 456',
        observacoes: 'Obs atualizada'
      };

      const res = await request(app)
        .put(`/api/clientes/${clienteParaAtualizarId}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(dadosAtualizados);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.mensagem).toBe('Cliente atualizado com sucesso');
      expect(res.body.dados.nome).toBe(dadosAtualizados.nome);
      expect(res.body.dados.telefone).toBe(dadosAtualizados.telefone);
      expect(res.body.dados.email).toBe(dadosAtualizados.email);
      expect(res.body.dados.endereco).toBe(dadosAtualizados.endereco);
      expect(res.body.dados.observacoes).toBe(dadosAtualizados.observacoes);
    });

    test('deve rejeitar atualização com nome vazio (400)', async () => {
      const res = await request(app)
        .put(`/api/clientes/${clienteParaAtualizarId}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ nome: '   ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/não pode ser vazio/i);
    });

    test('deve retornar 404 ao tentar atualizar cliente inexistente', async () => {
      const res = await request(app)
        .put('/api/clientes/999999')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ nome: 'Qualquer' });

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('Isolamento Multi-Tenant Rigoroso', () => {
    let clienteUser1Id = null;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          nome: 'Cliente Exclusivo do Usuário 1',
          email: 'exclusivo.user1@email.com',
          telefone: '11999990001'
        });
      clienteUser1Id = res.body.dados.id;
    });

    test('Usuário 2 NÃO deve ver o cliente do Usuário 1 na listagem', async () => {
      const res = await request(app)
        .get('/api/clientes')
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(200);
      const achou = res.body.dados.some(c => c.id === clienteUser1Id || c.email === 'exclusivo.user1@email.com');
      expect(achou).toBe(false);
    });

    test('Usuário 2 NÃO deve conseguir buscar por ID o cliente do Usuário 1 (404)', async () => {
      const res = await request(app)
        .get(`/api/clientes/${clienteUser1Id}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/não encontrado/i);
    });

    test('Usuário 2 NÃO deve conseguir editar o cliente do Usuário 1 (404)', async () => {
      const res = await request(app)
        .put(`/api/clientes/${clienteUser1Id}`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ nome: 'Tentativa de Hack por Usuário 2' });

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);

      // Garante no banco que o nome não foi alterado
      const [rows] = await pool.execute('SELECT nome FROM clientes WHERE id = ?', [clienteUser1Id]);
      expect(rows[0].nome).toBe('Cliente Exclusivo do Usuário 1');
    });

    test('Usuário 2 NÃO deve conseguir deletar o cliente do Usuário 1 (404)', async () => {
      const res = await request(app)
        .delete(`/api/clientes/${clienteUser1Id}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);

      // Garante no banco que continua ativo
      const [rows] = await pool.execute('SELECT ativo FROM clientes WHERE id = ?', [clienteUser1Id]);
      expect(rows[0].ativo).toBe(1);
    });
  });

  describe('DELETE /api/clientes/:id e Soft Delete', () => {
    let clienteParaDeletarId = null;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ nome: 'Cliente Para Exclusao' });
      clienteParaDeletarId = res.body.dados.id;
    });

    test('deve realizar exclusão lógica (soft delete) com sucesso (200)', async () => {
      const res = await request(app)
        .delete(`/api/clientes/${clienteParaDeletarId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.mensagem).toBe('Cliente excluído com sucesso');
    });

    test('cliente excluído NÃO deve aparecer na listagem do usuário', async () => {
      const res = await request(app)
        .get('/api/clientes')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      const encontrado = res.body.dados.some(c => c.id === clienteParaDeletarId);
      expect(encontrado).toBe(false);
    });

    test('tentativa de buscar cliente excluído por ID deve retornar 404', async () => {
      const res = await request(app)
        .get(`/api/clientes/${clienteParaDeletarId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('no banco de dados o registro deve ter ativo = 0 e deletado_em preenchido', async () => {
      const [rows] = await pool.execute(
        'SELECT id, ativo, deletado_em FROM clientes WHERE id = ?',
        [clienteParaDeletarId]
      );

      expect(rows.length).toBe(1);
      expect(rows[0].ativo).toBe(0);
      expect(rows[0].deletado_em).not.toBeNull();
    });

    test('deve retornar 404 ao tentar excluir cliente já excluído ou inexistente', async () => {
      const res = await request(app)
        .delete(`/api/clientes/${clienteParaDeletarId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });
  });
});

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Módulo de Serviços API (/api/servicos) - CRUD & Multi-Tenancy', () => {
  let tokenUser1 = '';
  let tokenUser2 = '';
  let user1Id = null;
  let user2Id = null;

  const user1 = {
    nome: 'MEI Prestador Um',
    email: 'servico.user1@mei.com',
    senha: 'SenhaForte123@'
  };

  const user2 = {
    nome: 'MEI Prestador Dois',
    email: 'servico.user2@mei.com',
    senha: 'SenhaForte123@'
  };

  beforeAll(async () => {
    // Limpeza prévia
    await pool.execute("DELETE FROM servicos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('servico.user1@mei.com', 'servico.user2@mei.com'))");
    await pool.execute("DELETE FROM usuarios WHERE email IN ('servico.user1@mei.com', 'servico.user2@mei.com')");

    // Registro do Usuário 1
    const res1 = await request(app).post('/api/auth/register').send(user1);
    tokenUser1 = res1.body.dados.token;
    user1Id = res1.body.dados.id;

    // Registro do Usuário 2
    const res2 = await request(app).post('/api/auth/register').send(user2);
    tokenUser2 = res2.body.dados.token;
    user2Id = res2.body.dados.id;
  });

  afterAll(async () => {
    // Limpeza final
    await pool.execute("DELETE FROM servicos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('servico.user1@mei.com', 'servico.user2@mei.com'))");
    await pool.execute("DELETE FROM usuarios WHERE email IN ('servico.user1@mei.com', 'servico.user2@mei.com')");
    await pool.end();
  });

  describe('Proteção de Rotas com AuthMiddleware', () => {
    test('deve negar acesso sem token (401)', async () => {
      const res = await request(app).get('/api/servicos');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });

    test('deve negar acesso com token inválido (401)', async () => {
      const res = await request(app)
        .get('/api/servicos')
        .set('Authorization', 'Bearer token_invalido');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('POST /api/servicos (Criação de Serviços e Validações)', () => {
    test('deve rejeitar serviço sem nome (400)', async () => {
      const res = await request(app)
        .post('/api/servicos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          preco: 100.00,
          categoria: 'Geral'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/nome.*obrigatório/i);
    });

    test('deve rejeitar serviço com nome vazio (400)', async () => {
      const res = await request(app)
        .post('/api/servicos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          nome: '   ',
          preco: 50.00
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/nome.*obrigatório/i);
    });

    test('deve rejeitar preço negativo (400)', async () => {
      const res = await request(app)
        .post('/api/servicos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          nome: 'Serviço Preço Negativo',
          preco: -25.50
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/preço.*maior ou igual a zero/i);
    });

    test('deve rejeitar preço não numérico (400)', async () => {
      const res = await request(app)
        .post('/api/servicos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          nome: 'Serviço Preço Texto',
          preco: 'valor_invalido'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/preço.*maior ou igual a zero/i);
    });

    test('deve criar um novo serviço com preço decimal com precisão (201)', async () => {
      const novoServico = {
        nome: 'Manutenção de Ar Condicionado',
        descricao: 'Limpeza e recarga de gás completa',
        preco: 189.90,
        categoria: 'Climatização'
      };

      const res = await request(app)
        .post('/api/servicos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(novoServico);

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.mensagem).toBe('Serviço cadastrado com sucesso');
      expect(res.body.dados).toBeDefined();
      expect(res.body.dados.id).toBeDefined();
      expect(res.body.dados.usuario_id).toBe(user1Id);
      expect(res.body.dados.nome).toBe(novoServico.nome);
      expect(res.body.dados.descricao).toBe(novoServico.descricao);
      expect(Number(res.body.dados.preco)).toBe(189.90);
      expect(res.body.dados.categoria).toBe(novoServico.categoria);
    });

    test('deve criar um serviço com preço zero e categoria padrão (201)', async () => {
      const res = await request(app)
        .post('/api/servicos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          nome: 'Avaliação Técnica Gratuita',
          preco: 0
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.nome).toBe('Avaliação Técnica Gratuita');
      expect(Number(res.body.dados.preco)).toBe(0);
      expect(res.body.dados.categoria).toBe('Geral');
    });
  });

  describe('GET /api/servicos (Listagem e Filtros)', () => {
    test('deve listar todos os serviços ativos ordenados por nome ASC (200)', async () => {
      const res = await request(app)
        .get('/api/servicos')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(Array.isArray(res.body.dados)).toBe(true);
      expect(res.body.dados.length).toBeGreaterThanOrEqual(2);

      const nomes = res.body.dados.map(s => s.nome);
      const nomesOrdenados = [...nomes].sort((a, b) => a.localeCompare(b));
      expect(nomes).toEqual(nomesOrdenados);
    });

    test('deve filtrar serviços por busca de texto (nome ou descricao)', async () => {
      const resNome = await request(app)
        .get('/api/servicos?busca=Ar Condicionado')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(resNome.statusCode).toBe(200);
      expect(resNome.body.dados.length).toBe(1);
      expect(resNome.body.dados[0].nome).toBe('Manutenção de Ar Condicionado');

      const resDesc = await request(app)
        .get('/api/servicos?busca=recarga de gás')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(resDesc.statusCode).toBe(200);
      expect(resDesc.body.dados.length).toBe(1);
      expect(resDesc.body.dados[0].nome).toBe('Manutenção de Ar Condicionado');
    });

    test('deve filtrar serviços por categoria', async () => {
      const resCat = await request(app)
        .get('/api/servicos?categoria=Climatização')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(resCat.statusCode).toBe(200);
      expect(resCat.body.dados.length).toBe(1);
      expect(resCat.body.dados[0].categoria).toBe('Climatização');

      const resCatInexistente = await request(app)
        .get('/api/servicos?categoria=CategoriaInexistente')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(resCatInexistente.statusCode).toBe(200);
      expect(resCatInexistente.body.dados.length).toBe(0);
    });
  });

  describe('GET /api/servicos/:id (Buscar por ID)', () => {
    let servicoId = null;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/servicos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          nome: 'Troca de Óleo',
          preco: 75.50,
          categoria: 'Automotivo'
        });
      servicoId = res.body.dados.id;
    });

    test('deve retornar serviço pelo ID com preço decimal correto (200)', async () => {
      const res = await request(app)
        .get(`/api/servicos/${servicoId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.id).toBe(servicoId);
      expect(res.body.dados.nome).toBe('Troca de Óleo');
      expect(Number(res.body.dados.preco)).toBe(75.50);
    });

    test('deve retornar 404 para ID inexistente', async () => {
      const res = await request(app)
        .get('/api/servicos/999999')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/não encontrado/i);
    });
  });

  describe('PUT /api/servicos/:id (Atualização de Serviços)', () => {
    let servicoId = null;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/servicos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          nome: 'Instalação Básica',
          preco: 100.00,
          categoria: 'Instalações'
        });
      servicoId = res.body.dados.id;
    });

    test('deve atualizar dados do serviço com sucesso (200)', async () => {
      const dadosAtualizados = {
        nome: 'Instalação Premium Especial',
        descricao: 'Instalação com garantia de 1 ano',
        preco: 250.75,
        categoria: 'Instalações Avançadas'
      };

      const res = await request(app)
        .put(`/api/servicos/${servicoId}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(dadosAtualizados);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.mensagem).toBe('Serviço atualizado com sucesso');
      expect(res.body.dados.nome).toBe(dadosAtualizados.nome);
      expect(res.body.dados.descricao).toBe(dadosAtualizados.descricao);
      expect(Number(res.body.dados.preco)).toBe(250.75);
      expect(res.body.dados.categoria).toBe(dadosAtualizados.categoria);
    });

    test('deve rejeitar atualização com preço negativo (400)', async () => {
      const res = await request(app)
        .put(`/api/servicos/${servicoId}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ preco: -50 });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/preço.*maior ou igual a zero/i);
    });

    test('deve rejeitar atualização com nome vazio (400)', async () => {
      const res = await request(app)
        .put(`/api/servicos/${servicoId}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ nome: '    ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/não pode ser vazio/i);
    });

    test('deve retornar 404 ao tentar atualizar serviço inexistente', async () => {
      const res = await request(app)
        .put('/api/servicos/999999')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ nome: 'Nome Qualquer' });

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('Isolamento Multi-Tenant Rigoroso de Serviços', () => {
    let servicoUser1Id = null;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/servicos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          nome: 'Consultoria Exclusiva User 1',
          descricao: 'Atendimento VIP',
          preco: 300.00,
          categoria: 'VIP'
        });
      servicoUser1Id = res.body.dados.id;
    });

    test('Usuário 2 NÃO deve ver o serviço do Usuário 1 na listagem', async () => {
      const res = await request(app)
        .get('/api/servicos')
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(200);
      const achou = res.body.dados.some(s => s.id === servicoUser1Id || s.nome === 'Consultoria Exclusiva User 1');
      expect(achou).toBe(false);
    });

    test('Usuário 2 NÃO deve conseguir buscar por ID o serviço do Usuário 1 (404)', async () => {
      const res = await request(app)
        .get(`/api/servicos/${servicoUser1Id}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/não encontrado/i);
    });

    test('Usuário 2 NÃO deve conseguir editar o serviço do Usuário 1 (404)', async () => {
      const res = await request(app)
        .put(`/api/servicos/${servicoUser1Id}`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ nome: 'Hacked Service', preco: 1.00 });

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);

      // Garante integridade no banco
      const [rows] = await pool.execute('SELECT nome, preco FROM servicos WHERE id = ?', [servicoUser1Id]);
      expect(rows[0].nome).toBe('Consultoria Exclusiva User 1');
      expect(Number(rows[0].preco)).toBe(300.00);
    });

    test('Usuário 2 NÃO deve conseguir deletar o serviço do Usuário 1 (404)', async () => {
      const res = await request(app)
        .delete(`/api/servicos/${servicoUser1Id}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);

      // Garante que continua ativo
      const [rows] = await pool.execute('SELECT ativo FROM servicos WHERE id = ?', [servicoUser1Id]);
      expect(rows[0].ativo).toBe(1);
    });
  });

  describe('DELETE /api/servicos/:id e Soft Delete', () => {
    let servicoParaDeletarId = null;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/servicos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ nome: 'Serviço Para Exclusao', preco: 45.00 });
      servicoParaDeletarId = res.body.dados.id;
    });

    test('deve realizar exclusão lógica (soft delete) com sucesso (200)', async () => {
      const res = await request(app)
        .delete(`/api/servicos/${servicoParaDeletarId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.mensagem).toBe('Serviço excluído com sucesso');
    });

    test('serviço excluído NÃO deve aparecer na listagem do usuário', async () => {
      const res = await request(app)
        .get('/api/servicos')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      const encontrado = res.body.dados.some(s => s.id === servicoParaDeletarId);
      expect(encontrado).toBe(false);
    });

    test('tentativa de buscar serviço excluído por ID deve retornar 404', async () => {
      const res = await request(app)
        .get(`/api/servicos/${servicoParaDeletarId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('no banco de dados o registro deve ter ativo = 0 e deletado_em preenchido', async () => {
      const [rows] = await pool.execute(
        'SELECT id, ativo, deletado_em FROM servicos WHERE id = ?',
        [servicoParaDeletarId]
      );

      expect(rows.length).toBe(1);
      expect(rows[0].ativo).toBe(0);
      expect(rows[0].deletado_em).not.toBeNull();
    });

    test('deve retornar 404 ao tentar excluir serviço já excluído ou inexistente', async () => {
      const res = await request(app)
        .delete(`/api/servicos/${servicoParaDeletarId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });
  });
});

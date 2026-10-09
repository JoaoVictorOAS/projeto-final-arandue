const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const pool = require('../../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_chave_jwt_recode_2026';

describe('API REST /api/estoque — Gestão de Insumos, Fichas Técnicas, Produção e Movimentações', () => {
  let user1Id, tokenUser1;
  let user2Id, tokenUser2;
  let servico1Id;

  const email1 = `teste_api_estoque_u1_${Date.now()}@teste.com`;
  const email2 = `teste_api_estoque_u2_${Date.now()}@teste.com`;

  beforeAll(async () => {
    // Insere usuário 1
    const [u1Res] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['Tenant 1 Estoque', email1, 'hash123']
    );
    user1Id = u1Res.insertId;
    tokenUser1 = jwt.sign({ id: user1Id, email: email1 }, JWT_SECRET, { expiresIn: '1h' });

    // Insere usuário 2 (para testes de isolamento multi-tenant)
    const [u2Res] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['Tenant 2 Estoque', email2, 'hash123']
    );
    user2Id = u2Res.insertId;
    tokenUser2 = jwt.sign({ id: user2Id, email: email2 }, JWT_SECRET, { expiresIn: '1h' });

    // Insere serviço do usuário 1
    const [s1Res] = await pool.query(
      `INSERT INTO servicos (usuario_id, nome, preco, controla_estoque_pronto, estoque_pronto_atual, estoque_pronto_minimo)
       VALUES (?, 'Pastel Especial de Carne', 12.00, 1, 0, 5)`,
      [user1Id]
    );
    servico1Id = s1Res.insertId;
  });

  afterAll(async () => {
    if (user1Id || user2Id) {
      await pool.query(
        'DELETE FROM estoque_movimentacoes WHERE usuario_id IN (?, ?)',
        [user1Id, user2Id]
      );
      await pool.query(
        'DELETE FROM fichas_tecnicas WHERE usuario_id IN (?, ?)',
        [user1Id, user2Id]
      );
      await pool.query(
        'DELETE FROM insumos WHERE usuario_id IN (?, ?)',
        [user1Id, user2Id]
      );
      await pool.query(
        'DELETE FROM servicos WHERE usuario_id IN (?, ?)',
        [user1Id, user2Id]
      );
      await pool.query(
        'DELETE FROM movimentacoes WHERE usuario_id IN (?, ?)',
        [user1Id, user2Id]
      );
      await pool.query(
        'DELETE FROM usuarios WHERE id IN (?, ?)',
        [user1Id, user2Id]
      );
    }
  });

  describe('Autenticação e Proteção', () => {
    it('deve retornar 401 ao tentar acessar sem token', async () => {
      const res = await request(app).get('/api/estoque/insumos');
      expect(res.status).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });

    it('deve retornar 401 com token inválido', async () => {
      const res = await request(app)
        .get('/api/estoque/insumos')
        .set('Authorization', 'Bearer token_invalido');
      expect(res.status).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('POST /api/estoque/insumos & GET /api/estoque/insumos', () => {
    let insumoCarneId;

    it('deve rejeitar cadastro de insumo sem nome ou unidade_base (400)', async () => {
      const res = await request(app)
        .post('/api/estoque/insumos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          nome: '',
          unidade_base: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/obrigatório/i);
    });

    it('deve cadastrar um insumo com sucesso (201)', async () => {
      const res = await request(app)
        .post('/api/estoque/insumos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          nome: 'Carne Moída Bovina',
          unidade_base: 'g',
          quantidade_atual: 2000,
          estoque_minimo: 500,
          custo_unitario: 0.035
        });

      expect(res.status).toBe(201);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toBeDefined();
      expect(res.body.dados.id).toBeDefined();
      expect(res.body.dados.nome).toBe('Carne Moída Bovina');
      expect(res.body.dados.unidade_base).toBe('g');
      expect(Number(res.body.dados.quantidade_atual)).toBe(2000);
      expect(Number(res.body.dados.estoque_minimo)).toBe(500);

      insumoCarneId = res.body.dados.id;
    });

    it('deve cadastrar outro insumo abaixo do estoque mínimo', async () => {
      const res = await request(app)
        .post('/api/estoque/insumos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          nome: 'Massa de Pastel Pronta',
          unidade_base: 'un',
          quantidade_atual: 10,
          estoque_minimo: 50,
          custo_unitario: 0.50
        });

      expect(res.status).toBe(201);
      expect(res.body.sucesso).toBe(true);
    });

    it('deve listar todos os insumos do usuário', async () => {
      const res = await request(app)
        .get('/api/estoque/insumos')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(Array.isArray(res.body.dados)).toBe(true);
      expect(res.body.dados.length).toBeGreaterThanOrEqual(2);
    });

    it('deve filtrar insumos por busca textual (?busca=)', async () => {
      const res = await request(app)
        .get('/api/estoque/insumos?busca=Carne')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.length).toBe(1);
      expect(res.body.dados[0].nome).toBe('Carne Moída Bovina');
    });

    it('deve filtrar insumos abaixo do estoque mínimo (?apenas_abaixo_minimo=true)', async () => {
      const res = await request(app)
        .get('/api/estoque/insumos?apenas_abaixo_minimo=true')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      const nomes = res.body.dados.map(i => i.nome);
      expect(nomes).toContain('Massa de Pastel Pronta');
      expect(nomes).not.toContain('Carne Moída Bovina');
    });
  });

  describe('POST /api/estoque/insumos/entrada', () => {
    it('deve registrar entrada com conversão de unidades e lançamento financeiro', async () => {
      // Cria insumo inicial
      const insumoRes = await request(app)
        .post('/api/estoque/insumos')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          nome: 'Cebola Picada',
          unidade_base: 'g',
          quantidade_atual: 1000,
          estoque_minimo: 300,
          custo_unitario: 0.005
        });

      const insumoId = insumoRes.body.dados.id;

      // Entrada de 2 kg (2000g) a R$ 20,00 com lançamento no livro caixa
      const entradaRes = await request(app)
        .post('/api/estoque/insumos/entrada')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          insumo_id: insumoId,
          quantidade: 2,
          unidade: 'kg',
          custo_total: 20.00,
          lancar_no_caixa: true
        });

      expect(entradaRes.status).toBe(200);
      expect(entradaRes.body.sucesso).toBe(true);
      expect(entradaRes.body.dados.saldo_anterior).toBe(1000);
      expect(entradaRes.body.dados.saldo_atual).toBe(3000);
      expect(entradaRes.body.dados.movimentacao_financeira_id).toBeDefined();
      expect(entradaRes.body.dados.movimentacao_estoque_id).toBeDefined();
    });

    it('deve falhar com 400 se quantidade de entrada for menor ou igual a zero', async () => {
      const res = await request(app)
        .post('/api/estoque/insumos/entrada')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          nome: 'Cebola Picada',
          quantidade: -1,
          unidade: 'kg'
        });

      expect(res.status).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toBeDefined();
    });
  });

  describe('POST /api/estoque/fichas-tecnicas & GET /api/estoque/fichas-tecnicas/:servicoId', () => {
    let insumoCarneId;
    let insumoMassaId;

    beforeAll(async () => {
      // Localiza IDs dos insumos criados
      const lista = await request(app)
        .get('/api/estoque/insumos')
        .set('Authorization', `Bearer ${tokenUser1}`);

      const carne = lista.body.dados.find(i => i.nome === 'Carne Moída Bovina');
      const massa = lista.body.dados.find(i => i.nome === 'Massa de Pastel Pronta');
      insumoCarneId = carne.id;
      insumoMassaId = massa.id;
    });

    it('deve salvar ficha técnica para um serviço (200)', async () => {
      const res = await request(app)
        .post('/api/estoque/fichas-tecnicas')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          servico_id: servico1Id,
          ingredientes: [
            { insumo_id: insumoCarneId, quantidade_necessaria: 100 }, // 100g de carne
            { insumo_id: insumoMassaId, quantidade_necessaria: 1 }     // 1 un de massa
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(Array.isArray(res.body.dados)).toBe(true);
      expect(res.body.dados.length).toBe(2);
    });

    it('deve obter ficha técnica detalhada calculando o custo total dos ingredientes (200)', async () => {
      const res = await request(app)
        .get(`/api/estoque/fichas-tecnicas/${servico1Id}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.servico_id).toBe(servico1Id);
      expect(res.body.dados.custo_ingredientes).toBeGreaterThan(0);
      expect(res.body.dados.ingredientes.length).toBe(2);
      expect(res.body.dados.ingredientes[0].nome_insumo).toBeDefined();
    });
  });

  describe('POST /api/estoque/producao', () => {
    it('deve registrar lote de produção consumindo insumos e alimentando produto pronto (200)', async () => {
      // Vamos produzir 5 pastéis:
      // Consome: 5 * 100g = 500g carne (saldo inicial 2000g -> 1500g)
      // Consome: 5 * 1 un = 5 massas (saldo inicial 10 un -> 5 un)
      // Produto pronto: estoque_pronto_atual 0 -> 5
      const res = await request(app)
        .post('/api/estoque/producao')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          servico_id: servico1Id,
          quantidade: 5
        });

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.servico_id).toBe(servico1Id);
      expect(res.body.dados.quantidade_produzida).toBe(5);

      // Validação no banco do produto pronto
      const [serv] = await pool.query('SELECT estoque_pronto_atual FROM servicos WHERE id = ?', [servico1Id]);
      expect(serv[0].estoque_pronto_atual).toBe(5);
    });

    it('deve retornar 400 se o estoque de insumos for insuficiente', async () => {
      // Temos apenas 5 massas sobrando; tentar produzir 50 pastéis deve falhar
      const res = await request(app)
        .post('/api/estoque/producao')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          servico_id: servico1Id,
          quantidade: 50
        });

      expect(res.status).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/insuficiente/i);
    });
  });

  describe('POST /api/estoque/simulacao', () => {
    it('deve simular capacidade produtiva utilizando estoque atual do banco (200)', async () => {
      const res = await request(app)
        .post('/api/estoque/simulacao')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          servico_id: servico1Id,
          usar_estoque_atual: true
        });

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.rendimentoMaximo).toBeDefined();
      expect(res.body.dados.sobras).toBeDefined();
    });

    it('deve simular capacidade produtiva com insumos informados customizados (200)', async () => {
      const res = await request(app)
        .post('/api/estoque/simulacao')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          servico_id: servico1Id,
          insumos_informados: [
            { nome: 'Carne Moída Bovina', quantidade: 500, unidade: 'g' }, // 500g / 100g = 5 pastéis
            { nome: 'Massa de Pastel Pronta', quantidade: 20, unidade: 'un' } // 20 pastéis
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.rendimentoMaximo).toBe(5); // Gargalo na carne
      expect(res.body.dados.insumoLimitante.nome).toBe('Carne Moída Bovina');
    });

    it('deve retornar 400 se simular para serviço sem ficha técnica', async () => {
      const [sSemFicha] = await pool.query(
        'INSERT INTO servicos (usuario_id, nome, preco) VALUES (?, "Serviço Sem Ficha", 10.00)',
        [user1Id]
      );

      const res = await request(app)
        .post('/api/estoque/simulacao')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          servico_id: sSemFicha.insertId,
          usar_estoque_atual: true
        });

      expect(res.status).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/não possui ficha técnica/i);
    });
  });

  describe('GET /api/estoque/movimentacoes', () => {
    it('deve listar o histórico de movimentações no ledger (200)', async () => {
      const res = await request(app)
        .get('/api/estoque/movimentacoes')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(Array.isArray(res.body.dados)).toBe(true);
      expect(res.body.dados.length).toBeGreaterThanOrEqual(1);

      const tipos = res.body.dados.map(m => m.tipo);
      expect(tipos).toContain('ENTRADA_COMPRA');
    });

    it('deve filtrar movimentações por tipo (?tipo=ENTRADA_COMPRA)', async () => {
      const res = await request(app)
        .get('/api/estoque/movimentacoes?tipo=ENTRADA_COMPRA')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.every(m => m.tipo === 'ENTRADA_COMPRA')).toBe(true);
    });
  });

  describe('Isolamento Multi-Tenant', () => {
    it('Tenant 2 não deve ver insumos do Tenant 1', async () => {
      const res = await request(app)
        .get('/api/estoque/insumos')
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.length).toBe(0);
    });

    it('Tenant 2 não deve ver movimentações de estoque do Tenant 1', async () => {
      const res = await request(app)
        .get('/api/estoque/movimentacoes')
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.length).toBe(0);
    });

    it('Tenant 2 não deve acessar ingredientes de ficha técnica do Tenant 1', async () => {
      const res = await request(app)
        .get(`/api/estoque/fichas-tecnicas/${servico1Id}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.status).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.ingredientes.length).toBe(0);
    });
  });
});

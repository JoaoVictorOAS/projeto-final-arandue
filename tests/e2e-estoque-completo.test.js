const request = require('../backend/node_modules/supertest');
const app = require('../backend/src/app');
const pool = require('../backend/src/config/database');
const jwt = require('../backend/node_modules/jsonwebtoken');

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
    if (usuarioId) {
      await pool.query('DELETE FROM orcamentos WHERE usuario_id = ?', [usuarioId]);
      await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
    }
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

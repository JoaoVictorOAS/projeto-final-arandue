const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');
const { gerarPayloadPix, calcularCrc16 } = require('../src/utils/pixPayload');

describe('Frente 2: Pix BR Code, Lembrete de Cobrança WhatsApp e Orçamento Compartilhável', () => {
  let token = '';
  let clienteId = null;
  let orcamentoId = null;
  let cobrancaId = null;

  const testUser = {
    nome: 'MEI Pix Teste',
    email: 'pix.teste@mei.com',
    senha: 'SenhaForte123@'
  };

  beforeAll(async () => {
    // Limpeza prévia
    await pool.execute(
      `DELETE FROM cobrancas WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)`,
      [testUser.email]
    );
    await pool.execute(
      `DELETE FROM orcamentos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)`,
      [testUser.email]
    );
    await pool.execute(
      `DELETE FROM clientes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)`,
      [testUser.email]
    );
    await pool.execute(
      `DELETE FROM mei_configuracoes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)`,
      [testUser.email]
    );
    await pool.execute(
      `DELETE FROM usuarios WHERE email = ?`,
      [testUser.email]
    );

    // Registrar usuário
    const resAuth = await request(app).post('/api/auth/register').send(testUser);
    token = resAuth.body.dados.token;
    const userId = resAuth.body.dados.id;

    // Configurar dados do MEI (com chave Pix)
    await request(app)
      .put('/api/configuracoes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        razao_social: 'MEI Pix Confeitaria LTDA',
        cnpj: '12345678000195',
        cep: '01001000',
        logradouro: 'Rua A',
        municipio: 'Sao Paulo',
        uf: 'SP',
        chave_pix: 'pix@meiconfeitaria.com.br'
      });

    // Criar cliente de teste
    const resCliente = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Cliente Pix Teste',
        telefone: '11988887777',
        email: 'cliente@teste.com'
      });
    clienteId = resCliente.body.dados.id;

    // Criar orçamento de teste
    const resOrc = await request(app)
      .post('/api/orcamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        data_emissao: '2026-10-18',
        itens: [
          { descricao: 'Bolo de Chocolate', quantidade: 2, preco_unitario: 75.00 }
        ]
      });
    orcamentoId = resOrc.body.dados.id;

    // Criar cobrança de teste
    const resCob = await request(app)
      .post('/api/cobrancas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        cliente_id: clienteId,
        orcamento_id: orcamentoId,
        valor: 150.00,
        vencimento: '2026-10-25'
      });
    cobrancaId = resCob.body.dados.id;
  });

  afterAll(async () => {
    await pool.execute(
      `DELETE FROM cobrancas WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)`,
      [testUser.email]
    );
    await pool.execute(
      `DELETE FROM orcamentos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)`,
      [testUser.email]
    );
    await pool.execute(
      `DELETE FROM clientes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)`,
      [testUser.email]
    );
    await pool.execute(
      `DELETE FROM mei_configuracoes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)`,
      [testUser.email]
    );
    await pool.execute(
      `DELETE FROM usuarios WHERE email = ?`,
      [testUser.email]
    );
  });

  test('Gerador unitário de payload Pix deve produzir payload válido com CRC16', () => {
    const resultado = gerarPayloadPix({
      chave: '11999999999',
      nomeRecebedor: 'JOAO DA SILVA',
      cidadeRecebedor: 'SAO PAULO',
      valor: 100.00,
      txid: 'ABC123XYZ'
    });

    expect(resultado).toBeDefined();
    expect(resultado.payload_pix).toBeDefined();
    expect(resultado.payload_pix.startsWith('000201')).toBe(true);
    expect(resultado.chave_utilizada).toBe('11999999999');
    expect(resultado.txid).toBe('ABC123XYZ');
    expect(resultado.valor).toBe(100.00);
    expect(resultado.payload_pix.length).toBeGreaterThan(50);
  });

  test('GET /api/cobrancas/:id/pix deve retornar o Pix Copia e Cola da cobrança', async () => {
    const res = await request(app)
      .get(`/api/cobrancas/${cobrancaId}/pix`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados).toBeDefined();
    expect(res.body.dados.cobranca_id).toBe(cobrancaId);
    expect(res.body.dados.valor).toBe(150.00);
    expect(res.body.dados.pix_copia_e_cola).toBeDefined();
    expect(res.body.dados.chave_pix).toBe('pix@meiconfeitaria.com.br');
    expect(res.body.dados.txid).toBe(`COB${cobrancaId}`);
  });

  test('POST /api/cobrancas/:id/lembrete-whatsapp deve retornar texto formatado e link WhatsApp', async () => {
    const res = await request(app)
      .post(`/api/cobrancas/${cobrancaId}/lembrete-whatsapp`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados).toBeDefined();
    expect(res.body.dados.cobranca_id).toBe(cobrancaId);
    expect(res.body.dados.cliente_nome).toBe('Cliente Pix Teste');
    expect(res.body.dados.telefone).toBe('11988887777');
    expect(res.body.dados.texto_mensagem).toMatch(/Pix Copia e Cola/);
    expect(res.body.dados.pix_copia_e_cola).toBeDefined();
    expect(res.body.dados.whatsapp_link).toMatch(/^https:\/\/wa\.me\//);
  });

  test('GET /api/orcamentos/:id/compartilhar deve retornar proposta comercial e link WhatsApp', async () => {
    const res = await request(app)
      .get(`/api/orcamentos/${orcamentoId}/compartilhar`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados).toBeDefined();
    expect(res.body.dados.orcamento_id).toBe(orcamentoId);
    expect(res.body.dados.cliente_nome).toBe('Cliente Pix Teste');
    expect(res.body.dados.texto_mensagem).toMatch(/PROPOSTA COMERCIAL/);
    expect(res.body.dados.whatsapp_link).toMatch(/^https:\/\/wa\.me\//);
    expect(res.body.dados.proposta_comercial).toBeDefined();
    expect(res.body.dados.proposta_comercial.itens).toHaveLength(1);
  });
});

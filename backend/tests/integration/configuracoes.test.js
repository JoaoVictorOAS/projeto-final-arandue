const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');

describe('Módulo de Configurações do MEI (/api/configuracoes) - REST & Multi-Tenancy', () => {
  let tokenUser1 = '';
  let tokenUser2 = '';
  let user1Id = null;
  let user2Id = null;

  const user1 = {
    nome: 'MEI Alpha Confeitaria',
    email: 'alpha.config@mei.com',
    senha: 'SenhaForte123@'
  };

  const user2 = {
    nome: 'MEI Beta Marcenaria',
    email: 'beta.config@mei.com',
    senha: 'SenhaForte123@'
  };

  const originalFetch = global.fetch;

  beforeAll(async () => {
    // Limpeza prévia
    await pool.execute(
      `DELETE FROM mei_configuracoes WHERE usuario_id IN (
        SELECT id FROM usuarios WHERE email IN ('alpha.config@mei.com', 'beta.config@mei.com')
      )`
    );
    await pool.execute(
      `DELETE FROM usuarios WHERE email IN ('alpha.config@mei.com', 'beta.config@mei.com')`
    );

    // Registro dos usuários de teste
    const res1 = await request(app).post('/api/auth/register').send(user1);
    tokenUser1 = res1.body.dados.token;
    user1Id = res1.body.dados.id;

    const res2 = await request(app).post('/api/auth/register').send(user2);
    tokenUser2 = res2.body.dados.token;
    user2Id = res2.body.dados.id;
  });

  afterAll(async () => {
    global.fetch = originalFetch;

    // Limpeza final
    await pool.execute(
      `DELETE FROM mei_configuracoes WHERE usuario_id IN (
        SELECT id FROM usuarios WHERE email IN ('alpha.config@mei.com', 'beta.config@mei.com')
      )`
    );
    await pool.execute(
      `DELETE FROM usuarios WHERE email IN ('alpha.config@mei.com', 'beta.config@mei.com')`
    );
  });

  describe('Autenticação e Proteção das Rotas', () => {
    test('GET /api/configuracoes deve retornar 401 sem token', async () => {
      const res = await request(app).get('/api/configuracoes');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });

    test('PUT /api/configuracoes deve retornar 401 sem token', async () => {
      const res = await request(app).put('/api/configuracoes').send({});
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });

    test('GET /api/configuracoes/estados deve retornar 401 sem token', async () => {
      const res = await request(app).get('/api/configuracoes/estados');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });

    test('GET /api/configuracoes/cnpj/:cnpj deve retornar 401 sem token', async () => {
      const res = await request(app).get('/api/configuracoes/cnpj/12345678000195');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('GET /api/configuracoes (Dados Default vs Salvos)', () => {
    test('deve retornar dados default para usuário sem configurações salvas', async () => {
      const res = await request(app)
        .get('/api/configuracoes')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toBeDefined();
      expect(res.body.dados.razao_social).toBe('MEI Alpha Confeitaria');
      expect(res.body.dados.email_comercial).toBe('alpha.config@mei.com');
      expect(res.body.dados.configurado).toBe(false);
      expect(res.body.dados.ambiente_fiscal).toBe('HOMOLOGACAO');
      expect(res.body.dados.inscricao_estadual).toBe('ISENTO');
      expect(res.body.dados.numero).toBe('S/N');
    });
  });

  describe('PUT /api/configuracoes (Validações e Persistência)', () => {
    test('deve rejeitar se razao_social não for informada', async () => {
      const res = await request(app)
        .put('/api/configuracoes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          cnpj: '12.345.678/0001-95',
          uf: 'SP',
          municipio: 'São Paulo',
          cep: '01001-000',
          logradouro: 'Praça da Sé'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/razão social/i);
    });

    test('deve rejeitar se CNPJ for inválido (menos de 14 dígitos)', async () => {
      const res = await request(app)
        .put('/api/configuracoes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          razao_social: 'Alpha Confeitaria LTDA',
          cnpj: '12345',
          uf: 'SP',
          municipio: 'São Paulo',
          cep: '01001-000',
          logradouro: 'Praça da Sé'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/cnpj/i);
    });

    test('deve rejeitar se UF não for uma das 27 UFs válidas', async () => {
      const res = await request(app)
        .put('/api/configuracoes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          razao_social: 'Alpha Confeitaria LTDA',
          cnpj: '12345678000195',
          uf: 'XX',
          municipio: 'Cidade Fantasma',
          cep: '01001-000',
          logradouro: 'Rua X'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/uf/i);
    });

    test('deve rejeitar se município não for informado', async () => {
      const res = await request(app)
        .put('/api/configuracoes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          razao_social: 'Alpha Confeitaria LTDA',
          cnpj: '12345678000195',
          uf: 'SP',
          municipio: '',
          cep: '01001-000',
          logradouro: 'Praça da Sé'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/município/i);
    });

    test('deve rejeitar se CEP for inválido', async () => {
      const res = await request(app)
        .put('/api/configuracoes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          razao_social: 'Alpha Confeitaria LTDA',
          cnpj: '12345678000195',
          uf: 'SP',
          municipio: 'São Paulo',
          cep: '123',
          logradouro: 'Praça da Sé'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/cep/i);
    });

    test('deve salvar com sucesso as configurações do MEI 1 (SP)', async () => {
      const payload = {
        razao_social: 'Alpha Confeitaria MEI LTDA',
        nome_fantasia: 'Alpha Doces e Bolos',
        cnpj: '12.345.678/0001-95',
        inscricao_estadual: 'ISENTO',
        inscricao_municipal: '123456',
        cep: '01001-000',
        logradouro: 'Praça da Sé',
        numero: '100',
        complemento: 'Sala 1',
        bairro: 'Sé',
        municipio: 'São Paulo',
        uf: 'SP',
        codigo_municipio_ibge: '3550308',
        email_comercial: 'contato@alphadoces.com.br',
        telefone_comercial: '11988887777',
        ambiente_fiscal: 'HOMOLOGACAO',
        serie_nfse: 2,
        serie_nfe: 1,
        serie_nfce: 1
      };

      const res = await request(app)
        .put('/api/configuracoes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(payload);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toBeDefined();
      expect(res.body.dados.razao_social).toBe('Alpha Confeitaria MEI LTDA');
      expect(res.body.dados.cnpj).toBe('12345678000195');
      expect(res.body.dados.uf).toBe('SP');
      expect(res.body.dados.municipio).toBe('São Paulo');
      expect(res.body.dados.configurado).toBe(true);
      expect(res.body.dados.serie_nfse).toBe(2);
    });

    test('GET /api/configuracoes deve retornar os dados persistidos do MEI 1', async () => {
      const res = await request(app)
        .get('/api/configuracoes')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.configurado).toBe(true);
      expect(res.body.dados.razao_social).toBe('Alpha Confeitaria MEI LTDA');
      expect(res.body.dados.cnpj).toBe('12345678000195');
      expect(res.body.dados.uf).toBe('SP');
      expect(res.body.dados.codigo_municipio_ibge).toBe('3550308');
    });

    test('deve atualizar configurações existentes em chamada subsequente de PUT', async () => {
      const payloadAtualizado = {
        razao_social: 'Alpha Confeitaria MEI LTDA',
        nome_fantasia: 'Alpha Alta Confeitaria',
        cnpj: '12345678000195',
        inscricao_estadual: '110042490114',
        inscricao_municipal: '123456',
        cep: '01001-000',
        logradouro: 'Praça da Sé',
        numero: '100',
        complemento: 'Andar 2',
        bairro: 'Sé',
        municipio: 'São Paulo',
        uf: 'SP',
        codigo_municipio_ibge: '3550308',
        email_comercial: 'contato@alphadoces.com.br',
        telefone_comercial: '11999990000',
        ambiente_fiscal: 'PRODUCAO',
        serie_nfse: 3,
        serie_nfe: 2,
        serie_nfce: 2
      };

      const res = await request(app)
        .put('/api/configuracoes')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(payloadAtualizado);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.nome_fantasia).toBe('Alpha Alta Confeitaria');
      expect(res.body.dados.ambiente_fiscal).toBe('PRODUCAO');
      expect(res.body.dados.serie_nfse).toBe(3);
    });
  });

  describe('Multi-Tenancy e Isolamento de MEIs', () => {
    test('Usuário 2 deve ver configurações default independentes do Usuário 1', async () => {
      const res = await request(app)
        .get('/api/configuracoes')
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.configurado).toBe(false);
      expect(res.body.dados.razao_social).toBe('MEI Beta Marcenaria');
      expect(res.body.dados.cnpj).toBe('');
    });

    test('Usuário 2 salva suas próprias configurações (RJ)', async () => {
      const payloadBeta = {
        razao_social: 'Beta Marcenaria Artesanal MEI',
        nome_fantasia: 'Beta Móveis',
        cnpj: '98.765.432/0001-10',
        inscricao_estadual: 'ISENTO',
        inscricao_municipal: '98765',
        cep: '20040-002',
        logradouro: 'Avenida Rio Branco',
        numero: '500',
        bairro: 'Centro',
        municipio: 'Rio de Janeiro',
        uf: 'RJ',
        codigo_municipio_ibge: '3304557',
        email_comercial: 'contato@betamoveis.com.br',
        telefone_comercial: '21977776666',
        ambiente_fiscal: 'HOMOLOGACAO',
        serie_nfse: 1,
        serie_nfe: 1,
        serie_nfce: 1
      };

      const res = await request(app)
        .put('/api/configuracoes')
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send(payloadBeta);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.cnpj).toBe('98765432000110');
      expect(res.body.dados.uf).toBe('RJ');
    });

    test('Usuário 1 não deve ser afetado pelas configurações do Usuário 2', async () => {
      const res = await request(app)
        .get('/api/configuracoes')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.dados.razao_social).toBe('Alpha Confeitaria MEI LTDA');
      expect(res.body.dados.cnpj).toBe('12345678000195');
      expect(res.body.dados.uf).toBe('SP');
    });
  });

  describe('GET /api/configuracoes/estados (27 UFs & SEFAZ)', () => {
    test('deve listar todas as 27 UFs com dados do autorizador SEFAZ', async () => {
      const res = await request(app)
        .get('/api/configuracoes/estados')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(Array.isArray(res.body.dados)).toBe(true);
      expect(res.body.dados).toHaveLength(27);

      const sp = res.body.dados.find(e => e.uf === 'SP');
      expect(sp).toBeDefined();
      expect(sp.nome).toBe('São Paulo');
      expect(sp.cUf).toBe('35');
      expect(sp.autorizador).toBe('SP (Próprio)');

      const rj = res.body.dados.find(e => e.uf === 'RJ');
      expect(rj).toBeDefined();
      expect(rj.cUf).toBe('33');

      const sc = res.body.dados.find(e => e.uf === 'SC');
      expect(sc).toBeDefined();
      expect(sc.autorizador).toBe('SVRS');

      const ma = res.body.dados.find(e => e.uf === 'MA');
      expect(ma).toBeDefined();
      expect(ma.autorizador).toBe('SVAN');
    });
  });

  describe('GET /api/configuracoes/cnpj/:cnpj (BrasilAPI & Sanitização)', () => {
    beforeEach(() => {
      global.fetch = originalFetch;
    });

    test('deve rejeitar CNPJ inválido ou incompleto (400)', async () => {
      const res = await request(app)
        .get('/api/configuracoes/cnpj/12345')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/14 dígitos/i);
    });

    test('deve retornar dados sanitizados com sucesso via BrasilAPI mockada', async () => {
      const mockBrasilApiResponse = {
        cnpj: '12345678000195',
        razao_social: 'PADARIA E CONFEITARIA ESTRELA LTDA',
        nome_fantasia: 'CONFEITARIA ESTRELA',
        cep: '01001000',
        logradouro: 'PRACA DA SE',
        numero: '100',
        complemento: 'SALA 01',
        bairro: 'SE',
        municipio: 'SAO PAULO',
        uf: 'SP',
        codigo_municipio_ibge: 3550308,
        ddd_telefone_1: '1133334444',
        email: 'contato@estrela.com.br'
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockBrasilApiResponse
      });

      const res = await request(app)
        .get('/api/configuracoes/cnpj/12.345.678/0001-95')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados).toEqual({
        cnpj: '12345678000195',
        razao_social: 'PADARIA E CONFEITARIA ESTRELA LTDA',
        nome_fantasia: 'CONFEITARIA ESTRELA',
        cep: '01001000',
        logradouro: 'PRACA DA SE',
        numero: '100',
        complemento: 'SALA 01',
        bairro: 'SE',
        municipio: 'SAO PAULO',
        uf: 'SP',
        codigo_municipio_ibge: '3550308',
        telefone: '1133334444',
        email: 'contato@estrela.com.br'
      });
    });

    test('deve tratar 404 da BrasilAPI quando CNPJ não for encontrado', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'CNPJ não encontrado' })
      });

      const res = await request(app)
        .get('/api/configuracoes/cnpj/00000000000100')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/não encontrado/i);
    });

    test('deve tratar timeout ou erro do serviço da BrasilAPI com 502', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Timeout de rede'));

      const res = await request(app)
        .get('/api/configuracoes/cnpj/12345678000195')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.statusCode).toBe(502);
      expect(res.body.sucesso).toBe(false);
      expect(res.body.mensagem).toMatch(/indisponível/i);
    });
  });
});

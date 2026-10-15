const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Rotas REST /api/dashboards', () => {
  let token;
  let userId;
  let tokenUser2;
  let user2Id;

  const limparUsuarios = async () => {
    await pool.execute(
      `DELETE FROM dashboard_widgets 
       WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('dash.routes@mei.com', 'dash.routes2@mei.com'))`
    );
    await pool.execute(
      `DELETE FROM dashboards_usuario 
       WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN ('dash.routes@mei.com', 'dash.routes2@mei.com'))`
    );
    await pool.execute(
      `DELETE FROM usuarios WHERE email IN ('dash.routes@mei.com', 'dash.routes2@mei.com')`
    );
  };

  beforeAll(async () => {
    await limparUsuarios();

    const resAuth = await request(app).post('/api/auth/register').send({
      nome: 'User Dash Routes',
      email: 'dash.routes@mei.com',
      senha: 'SenhaForte123@'
    });
    token = resAuth.body.dados.token;
    userId = resAuth.body.dados.id;

    const resAuth2 = await request(app).post('/api/auth/register').send({
      nome: 'User Dash Routes 2',
      email: 'dash.routes2@mei.com',
      senha: 'SenhaForte123@'
    });
    tokenUser2 = resAuth2.body.dados.token;
    user2Id = resAuth2.body.dados.id;
  });

  afterAll(async () => {
    await limparUsuarios();
  });

  describe('Proteção das rotas com AuthMiddleware', () => {
    test('deve negar acesso a /api/dashboards sem token (401)', async () => {
      const res = await request(app).get('/api/dashboards');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });

    test('deve negar acesso com token inválido (401)', async () => {
      const res = await request(app)
        .get('/api/dashboards')
        .set('Authorization', 'Bearer token_invalido');
      expect(res.statusCode).toBe(401);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('Catálogo de métricas (GET /api/dashboards/metricas/catalogo)', () => {
    test('GET /api/dashboards/metricas/catalogo deve retornar catálogo', async () => {
      const res = await request(app)
        .get('/api/dashboards/metricas/catalogo')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.sucesso).toBe(true);
      expect(res.body.dados.metricas).toBeDefined();
      expect(Array.isArray(res.body.dados.metricas)).toBe(true);
      expect(res.body.dados.periodos).toBeDefined();
      expect(res.body.dados.tipos_grafico).toBeDefined();
    });
  });

  describe('Listagem e auto-provisionamento (GET /api/dashboards)', () => {
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
  });

  describe('Ciclo completo: CRUD de Dashboards e Widgets', () => {
    test('POST, PUT e DELETE /api/dashboards/:id e widgets', async () => {
      // 1. Criar novo dashboard
      const resCreate = await request(app)
        .post('/api/dashboards')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'Painel Vendas 2', descricao: 'Painel focado em vendas' });
      expect(resCreate.statusCode).toBe(201);
      expect(resCreate.body.sucesso).toBe(true);
      const dashId = resCreate.body.dados.id;
      expect(dashId).toBeDefined();

      // 2. Obter dashboard específico
      const resGet = await request(app)
        .get(`/api/dashboards/${dashId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(resGet.statusCode).toBe(200);
      expect(resGet.body.sucesso).toBe(true);
      expect(resGet.body.dados.id).toBe(dashId);
      expect(resGet.body.dados.nome).toBe('Painel Vendas 2');

      // 3. Atualizar dashboard
      const resPutDash = await request(app)
        .put(`/api/dashboards/${dashId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'Painel Vendas Atualizado' });
      expect(resPutDash.statusCode).toBe(200);
      expect(resPutDash.body.sucesso).toBe(true);
      expect(resPutDash.body.dados.nome).toBe('Painel Vendas Atualizado');

      // 4. Adicionar widget
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
      expect(resWidget.body.sucesso).toBe(true);
      const widgetId = resWidget.body.dados.id;
      expect(widgetId).toBeDefined();

      // 5. Atualizar widget
      const resPutWidget = await request(app)
        .put(`/api/dashboards/${dashId}/widgets/${widgetId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          titulo: 'Fluxo Atualizado',
          largura: 2
        });
      expect(resPutWidget.statusCode).toBe(200);
      expect(resPutWidget.body.sucesso).toBe(true);
      expect(resPutWidget.body.dados.titulo).toBe('Fluxo Atualizado');
      expect(resPutWidget.body.dados.largura).toBe(2);

      // 6. Excluir widget
      const resDeleteWidget = await request(app)
        .delete(`/api/dashboards/${dashId}/widgets/${widgetId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(resDeleteWidget.statusCode).toBe(200);
      expect(resDeleteWidget.body.sucesso).toBe(true);

      // 7. Excluir dashboard
      const resDeleteDash = await request(app)
        .delete(`/api/dashboards/${dashId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(resDeleteDash.statusCode).toBe(200);
      expect(resDeleteDash.body.sucesso).toBe(true);
    });
  });

  describe('Tratamento de erros e validações', () => {
    test('POST /api/dashboards com nome vazio deve retornar 400', async () => {
      const res = await request(app)
        .post('/api/dashboards')
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
    });

    test('GET /api/dashboards/99999 inexistente deve retornar 404', async () => {
      const res = await request(app)
        .get('/api/dashboards/99999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });

    test('POST /api/dashboards/:id/widgets com métrica inválida deve retornar 400', async () => {
      const listRes = await request(app)
        .get('/api/dashboards')
        .set('Authorization', `Bearer ${token}`);
      const dashId = listRes.body.dados[0].id;

      const res = await request(app)
        .post(`/api/dashboards/${dashId}/widgets`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          titulo: 'Widget Teste',
          metrica: 'metrica_invalida_xyz'
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
    });

    test('DELETE /api/dashboards/:id do único dashboard deve retornar 400', async () => {
      const listRes = await request(app)
        .get('/api/dashboards')
        .set('Authorization', `Bearer ${tokenUser2}`);
      expect(listRes.body.dados.length).toBe(1);
      const unicoDashId = listRes.body.dados[0].id;

      const res = await request(app)
        .delete(`/api/dashboards/${unicoDashId}`)
        .set('Authorization', `Bearer ${tokenUser2}`);
      expect(res.statusCode).toBe(400);
      expect(res.body.sucesso).toBe(false);
    });
  });

  describe('Isolamento Multi-Tenant', () => {
    test('User 2 não deve acessar dashboard pertencente ao User 1 (404)', async () => {
      const listRes = await request(app)
        .get('/api/dashboards')
        .set('Authorization', `Bearer ${token}`);
      const user1DashId = listRes.body.dados[0].id;

      const res = await request(app)
        .get(`/api/dashboards/${user1DashId}`)
        .set('Authorization', `Bearer ${tokenUser2}`);
      expect(res.statusCode).toBe(404);
      expect(res.body.sucesso).toBe(false);
    });
  });
});

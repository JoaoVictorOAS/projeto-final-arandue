const request = require('supertest');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');
const pool = require('../../src/config/database');

describe('API REST - /api/configuracoes/temas', () => {
  const usuarioId = 999;
  const token = jwt.sign(
    { id: usuarioId, email: 'teste-temas@arandue.com', escopo: 'assistente:access' },
    process.env.JWT_SECRET || 'super_secreto_chave_jwt_recode_2026'
  );

  afterAll(async () => {
    await pool.query('DELETE FROM temas_usuario WHERE usuario_id = ?', [usuarioId]);
  });

  test('GET /api/configuracoes/temas deve listar temas e conter os 5 temas padrão', async () => {
    const res = await request(app)
      .get('/api/configuracoes/temas')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(Array.isArray(res.body.dados)).toBe(true);
    expect(res.body.dados.length).toBeGreaterThanOrEqual(5);
  });

  test('POST /api/configuracoes/temas/upload deve rejeitar tema sem contraste mínimo', async () => {
    const temaInvalido = {
      nome: 'Tema Ilegível',
      modo: 'light',
      cores: {
        bgApp: '#ffffff',
        bgSurface: '#ffffff',
        border: '#cccccc',
        textMain: '#ffffff', // Sem contraste!
        textSecondary: '#ffffff',
        textMuted: '#cccccc',
        primary: '#6366f1',
        primaryHover: '#4f46e5',
        primaryText: '#ffffff',
        accent: '#f59e0b',
      },
    };

    const res = await request(app)
      .post('/api/configuracoes/temas/upload')
      .set('Authorization', `Bearer ${token}`)
      .send(temaInvalido);

    expect(res.status).toBe(400);
    expect(res.body.sucesso).toBe(false);
    expect(res.body.mensagem).toMatch(/contraste/i);
  });

  test('POST /api/configuracoes/temas/upload deve aceitar tema válido com WCAG AA', async () => {
    const temaValido = {
      nome: 'Café Especial',
      modo: 'light',
      cores: {
        bgApp: '#faf5ee',
        bgSurface: '#ffffff',
        border: '#e6ccb2',
        textMain: '#43281c',
        textSecondary: '#7f4f24',
        textMuted: '#a68a72',
        primary: '#b45309',
        primaryHover: '#92400e',
        primaryText: '#ffffff',
        accent: '#0284c7',
      },
    };

    const res = await request(app)
      .post('/api/configuracoes/temas/upload')
      .set('Authorization', `Bearer ${token}`)
      .send(temaValido);

    expect(res.status).toBe(201);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.nome).toBe('Café Especial');
  });

  test('PUT /api/configuracoes/temas/:id/ativar deve ativar um tema existente', async () => {
    const listRes = await request(app)
      .get('/api/configuracoes/temas')
      .set('Authorization', `Bearer ${token}`);

    const temaParaAtivar = listRes.body.dados.find((t) => t.slug === 'noturno-corporativo');
    expect(temaParaAtivar).toBeDefined();

    const res = await request(app)
      .put(`/api/configuracoes/temas/${temaParaAtivar.id}/ativar`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.eh_ativo).toBe(true);
    expect(res.body.dados.slug).toBe('noturno-corporativo');
  });

  test('POST /api/configuracoes/temas deve criar um novo tema customizado válido', async () => {
    const payload = {
      nome: 'Meu Tema Custom REST',
      modo: 'dark',
      descricao: 'Criado via API REST',
      cores: {
        bgApp: '#121212',
        bgSurface: '#1e1e1e',
        bgSurfaceHover: '#2a2a2a',
        border: '#333333',
        textMain: '#f5f5f5',
        textSecondary: '#b0b0b0',
        textMuted: '#888888',
        primary: '#7c3aed',
        primaryHover: '#6d28d9',
        primaryText: '#ffffff',
        accent: '#ec4899',
      },
    };

    const res = await request(app)
      .post('/api/configuracoes/temas')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.nome).toBe('Meu Tema Custom REST');
    expect(res.body.dados.origem).toBe('CUSTOMIZADO');
  });

  test('POST /api/configuracoes/temas/gerar-ia deve sintetizar e persistir tema gerado', async () => {
    const res = await request(app)
      .post('/api/configuracoes/temas/gerar-ia')
      .set('Authorization', `Bearer ${token}`)
      .send({ descricao: 'Padaria Artesanal Aconchegante', modo: 'light', cor_base: '#b45309' });

    expect(res.status).toBe(201);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.origem).toBe('IA');
    expect(res.body.dados.eh_ativo).toBe(true);
  });

  test('DELETE /api/configuracoes/temas/:id deve excluir tema customizado e impedir excluir tema padrão', async () => {
    const listRes = await request(app)
      .get('/api/configuracoes/temas')
      .set('Authorization', `Bearer ${token}`);

    const temaSistema = listRes.body.dados.find((t) => t.eh_sistema);
    const temaCustom = listRes.body.dados.find((t) => !t.eh_sistema);

    expect(temaSistema).toBeDefined();
    expect(temaCustom).toBeDefined();

    // Bloqueia excluir tema do sistema
    const resBloqueio = await request(app)
      .delete(`/api/configuracoes/temas/${temaSistema.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resBloqueio.status).toBe(400);
    expect(resBloqueio.body.sucesso).toBe(false);

    // Permite excluir tema customizado
    const resSucesso = await request(app)
      .delete(`/api/configuracoes/temas/${temaCustom.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resSucesso.status).toBe(200);
    expect(resSucesso.body.sucesso).toBe(true);
  });
});

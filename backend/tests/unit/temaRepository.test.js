const temaRepository = require('../../src/repositories/temaRepository');
const pool = require('../../src/config/database');

describe('temaRepository - Gestão de Temas no Banco', () => {
  let testUsuarioId;
  let outroUsuarioId;

  beforeAll(async () => {
    // Garante tabela e cria usuários para teste
    await temaRepository.garantirTabelaExiste();

    const [uRes] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['Usuario Tema Teste', `teste_tema_${Date.now()}@teste.com`, 'hash']
    );
    testUsuarioId = uRes.insertId;

    const [uRes2] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['Outro Usuario Tema', `outro_tema_${Date.now()}@teste.com`, 'hash']
    );
    outroUsuarioId = uRes2.insertId;
  });

  afterAll(async () => {
    if (testUsuarioId) {
      await pool.query('DELETE FROM temas_usuario WHERE usuario_id = ?', [testUsuarioId]);
      await pool.query('DELETE FROM usuarios WHERE id = ?', [testUsuarioId]);
    }
    if (outroUsuarioId) {
      await pool.query('DELETE FROM temas_usuario WHERE usuario_id = ?', [outroUsuarioId]);
      await pool.query('DELETE FROM usuarios WHERE id = ?', [outroUsuarioId]);
    }
    await pool.end();
  });

  test('deve exportar as funções obrigatórias do repositório', () => {
    expect(typeof temaRepository.obterTemasPorUsuario).toBe('function');
    expect(typeof temaRepository.ativarTema).toBe('function');
    expect(typeof temaRepository.criarTema).toBe('function');
    expect(typeof temaRepository.excluirTema).toBe('function');
    expect(typeof temaRepository.obterTemaAtivo).toBe('function');
    expect(typeof temaRepository.obterTemasPadrao).toBe('function');
    expect(typeof temaRepository.garantirTabelaExiste).toBe('function');
  });

  test('deve retornar os 5 temas padrão oficiais do sistema', () => {
    const padroes = temaRepository.obterTemasPadrao();
    expect(padroes).toHaveLength(5);
    const slugs = padroes.map((t) => t.slug);
    expect(slugs).toContain('claro-arandue');
    expect(slugs).toContain('noturno-corporativo');
    expect(slugs).toContain('esmeralda-mei');
    expect(slugs).toContain('oceano-indigo');
    expect(slugs).toContain('ambar-cafe');
  });

  test('deve inicializar e semear os 5 temas padrão ao consultar usuário virgem', async () => {
    const temas = await temaRepository.obterTemasPorUsuario(testUsuarioId);
    expect(temas).toHaveLength(5);

    const ativo = temas.find((t) => t.eh_ativo);
    expect(ativo).toBeDefined();
    expect(ativo.slug).toBe('claro-arandue');
    expect(ativo.eh_sistema).toBe(true);
    expect(typeof ativo.tokens).toBe('object');
    expect(ativo.tokens.primary).toBe('#4f46e5');
  });

  test('deve obter tema ativo do usuário', async () => {
    const ativo = await temaRepository.obterTemaAtivo(testUsuarioId);
    expect(ativo).toBeDefined();
    expect(ativo.eh_ativo).toBe(true);
    expect(ativo.slug).toBe('claro-arandue');
  });

  test('deve ativar um tema diferente por slug', async () => {
    const temaAtivado = await temaRepository.ativarTema(testUsuarioId, 'noturno-corporativo');
    expect(temaAtivado.slug).toBe('noturno-corporativo');
    expect(temaAtivado.eh_ativo).toBe(true);

    const todos = await temaRepository.obterTemasPorUsuario(testUsuarioId);
    const ativos = todos.filter((t) => t.eh_ativo);
    expect(ativos).toHaveLength(1);
    expect(ativos[0].slug).toBe('noturno-corporativo');
  });

  test('deve ativar um tema por ID numérico', async () => {
    const todos = await temaRepository.obterTemasPorUsuario(testUsuarioId);
    const temaEsmeralda = todos.find((t) => t.slug === 'esmeralda-mei');
    expect(temaEsmeralda).toBeDefined();

    const ativado = await temaRepository.ativarTema(testUsuarioId, temaEsmeralda.id);
    expect(ativado.id).toBe(temaEsmeralda.id);
    expect(ativado.slug).toBe('esmeralda-mei');
    expect(ativado.eh_ativo).toBe(true);
  });

  test('deve criar um novo tema customizado e ativá-lo se requisitado', async () => {
    const novoTema = await temaRepository.criarTema(testUsuarioId, {
      nome: 'Meu Tema Custom Roxo',
      modo: 'dark',
      descricao: 'Tema criado para teste de repositório',
      ativar: true,
      origem: 'CUSTOMIZADO',
      tokens: {
        bgApp: '#121212',
        bgSurface: '#1e1e1e',
        bgSurfaceHover: '#2a2a2a',
        border: '#333333',
        textMain: '#ffffff',
        textSecondary: '#aaaaaa',
        textMuted: '#777777',
        primary: '#8b5cf6',
        primaryHover: '#7c3aed',
        primaryText: '#ffffff',
        accent: '#ec4899',
        status: { success: '#10b981', danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6' },
      },
    });

    expect(novoTema.id).toBeDefined();
    expect(novoTema.nome).toBe('Meu Tema Custom Roxo');
    expect(novoTema.slug).toBe('meu-tema-custom-roxo');
    expect(novoTema.eh_ativo).toBe(true);
    expect(novoTema.eh_sistema).toBe(false);
    expect(novoTema.tokens.primary).toBe('#8b5cf6');

    // Verifica que agora ele é o ativo
    const ativoAtual = await temaRepository.obterTemaAtivo(testUsuarioId);
    expect(ativoAtual.id).toBe(novoTema.id);
  });

  test('deve impedir a exclusão de temas padrão do sistema', async () => {
    const temas = await temaRepository.obterTemasPorUsuario(testUsuarioId);
    const temaSistema = temas.find((t) => t.eh_sistema);

    await expect(temaRepository.excluirTema(testUsuarioId, temaSistema.id)).rejects.toThrow(
      'Não é permitido excluir temas padrão do sistema.'
    );
  });

  test('deve excluir tema customizado com sucesso e isolamento por usuário', async () => {
    // Cria tema para outro usuário
    const temaOutro = await temaRepository.criarTema(outroUsuarioId, {
      nome: 'Tema Outro User',
      tokens: { primary: '#112233' },
    });

    // Tentar excluir o tema do outro usuário com testUsuarioId deve retornar false
    const tentativaInvasao = await temaRepository.excluirTema(testUsuarioId, temaOutro.id);
    expect(tentativaInvasao).toBe(false);

    // Cria e exclui tema customizado do próprio usuário
    const temaCriado = await temaRepository.criarTema(testUsuarioId, {
      nome: 'Tema Temporario Para Deletar',
      tokens: { primary: '#000000' },
    });

    const excluido = await temaRepository.excluirTema(testUsuarioId, temaCriado.id);
    expect(excluido).toBe(true);

    // Excluir novamente deve retornar false
    const repetido = await temaRepository.excluirTema(testUsuarioId, temaCriado.id);
    expect(repetido).toBe(false);
  });
});

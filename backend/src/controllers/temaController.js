const temaRepository = require('../repositories/temaRepository');
const { validarTemaTokens, calcularContraste } = require('../utils/colorUtils');

const temaController = {
  async listarTemas(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const temas = await temaRepository.obterTemasPorUsuario(usuarioId);
      return res.status(200).json({
        sucesso: true,
        dados: temas,
      });
    } catch (err) {
      console.error('[TemaController] Erro ao listar temas:', err);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro interno ao consultar biblioteca de temas.',
      });
    }
  },

  async ativarTema(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { id } = req.params;
      const temaAtivado = await temaRepository.ativarTema(usuarioId, id);
      return res.status(200).json({
        sucesso: true,
        mensagem: `Tema '${temaAtivado.nome}' ativado com sucesso!`,
        dados: temaAtivado,
      });
    } catch (err) {
      console.error('[TemaController] Erro ao ativar tema:', err);
      const status = err.message && err.message.includes('não encontrado') ? 404 : 500;
      return res.status(status).json({
        sucesso: false,
        mensagem: err.message || 'Erro ao ativar tema.',
      });
    }
  },

  async criarTema(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { nome, modo, descricao, cores, tokens, ativar } = req.body;
      const paleta = tokens || cores;

      const validacao = validarTemaTokens(paleta);
      if (!validacao.valido) {
        return res.status(400).json({
          sucesso: false,
          mensagem: validacao.erros.join('. '),
          erros: validacao.erros,
        });
      }

      const novoTema = await temaRepository.criarTema(usuarioId, {
        nome: nome || 'Tema Personalizado',
        modo: modo || 'dark',
        descricao: descricao || '',
        tokens: paleta,
        ativar: Boolean(ativar),
        origem: 'CUSTOMIZADO',
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Tema cadastrado com sucesso!',
        dados: novoTema,
      });
    } catch (err) {
      console.error('[TemaController] Erro ao criar tema:', err);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao salvar novo tema.',
      });
    }
  },

  async uploadTema(req, res) {
    try {
      const usuarioId = req.usuario.id;
      let conteudo = req.body || {};

      if (req.file && req.file.buffer) {
        try {
          conteudo = JSON.parse(req.file.buffer.toString('utf-8'));
        } catch {
          return res.status(400).json({
            sucesso: false,
            mensagem: 'O arquivo enviado não é um JSON válido.',
          });
        }
      }

      const paleta = (conteudo && (conteudo.tokens || conteudo.cores)) ? (conteudo.tokens || conteudo.cores) : conteudo;
      const validacao = validarTemaTokens(paleta);
      if (!validacao.valido) {
        return res.status(400).json({
          sucesso: false,
          mensagem: `Arquivo rejeitado: ${validacao.erros.join('. ')}`,
          erros: validacao.erros,
        });
      }

      const novoTema = await temaRepository.criarTema(usuarioId, {
        nome: (conteudo && conteudo.nome) || 'Tema Importado',
        modo: (conteudo && conteudo.modo) || 'dark',
        descricao: (conteudo && conteudo.descricao) || 'Tema importado via upload JSON',
        tokens: paleta,
        ativar: Boolean(!conteudo || conteudo.ativar !== false),
        origem: 'UPLOAD',
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Tema importado e validado com sucesso!',
        dados: novoTema,
      });
    } catch (err) {
      console.error('[TemaController] Erro no upload do tema:', err);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao processar upload do tema.',
      });
    }
  },

  async excluirTema(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { id } = req.params;
      const excluido = await temaRepository.excluirTema(usuarioId, id);
      if (!excluido) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Tema não encontrado na sua biblioteca.',
        });
      }
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Tema removido da sua biblioteca.',
      });
    } catch (err) {
      return res.status(400).json({
        sucesso: false,
        mensagem: err.message || 'Erro ao excluir tema.',
      });
    }
  },

  async gerarTemaIA(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { descricao, modo = 'dark', cor_base } = req.body || {};

      // Gerador algorítmico de suporte REST para síntese cromática
      const isDark = modo === 'dark';
      const corPrimaria = cor_base || (isDark ? '#6366f1' : '#059669');
      const corAccent = isDark ? '#f59e0b' : '#d97706';

      const tokens = {
        bgApp: isDark ? '#0f172a' : '#f8fafc',
        bgSurface: isDark ? '#1e293b' : '#ffffff',
        bgSurfaceHover: isDark ? '#334155' : '#f1f5f9',
        border: isDark ? '#334155' : '#e2e8f0',
        textMain: isDark ? '#f8fafc' : '#0f172a',
        textSecondary: isDark ? '#94a3b8' : '#64748b',
        textMuted: isDark ? '#64748b' : '#94a3b8',
        primary: corPrimaria,
        primaryHover: isDark ? '#4f46e5' : '#047857',
        primaryText: '#ffffff',
        accent: corAccent,
        status: {
          success: '#10b981',
          danger: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
        },
      };

      const novoTema = await temaRepository.criarTema(usuarioId, {
        nome: `Tema IA: ${(descricao || 'Harmônico').slice(0, 30)}`,
        modo,
        descricao: `Gerado para: ${descricao || 'Estilo personalizado'}`,
        tokens,
        ativar: true,
        origem: 'IA',
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Tema gerado com sucesso pela IA e aplicado ao sistema!',
        dados: novoTema,
      });
    } catch (err) {
      console.error('[TemaController] Erro ao gerar tema:', err);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao gerar tema com IA.',
      });
    }
  },
};

module.exports = temaController;

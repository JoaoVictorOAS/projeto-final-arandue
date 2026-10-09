const pool = require('../config/database');
const sefazRegistry = require('../services/fiscal/sefazRegistry');
const usuarioRepository = require('../repositories/usuarioRepository');
const certificadoService = require('../services/fiscal/certificadoService');

/**
 * Controller responsável pelas Configurações do MEI e integração com SEFAZ / BrasilAPI.
 */
const configuracoesController = {
  /**
   * GET /api/configuracoes
   * Retorna os dados cadastrais e fiscais do MEI autenticado.
   * Se ainda não existirem registros salvos, retorna os dados padrão prontos para edição.
   */
  async obterConfiguracoes(req, res) {
    try {
      const usuario_id = req.usuario.id;

      const [rows] = await pool.execute(
        'SELECT * FROM mei_configuracoes WHERE usuario_id = ?',
        [usuario_id]
      );

      if (rows.length > 0) {
        const config = rows[0];
        return res.status(200).json({
          sucesso: true,
          mensagem: 'Configurações obtidas com sucesso',
          dados: {
            id: config.id,
            usuario_id: config.usuario_id,
            razao_social: config.razao_social,
            nome_fantasia: config.nome_fantasia || '',
            cnpj: config.cnpj,
            inscricao_estadual: config.inscricao_estadual || 'ISENTO',
            inscricao_municipal: config.inscricao_municipal || '',
            cep: config.cep,
            logradouro: config.logradouro,
            numero: config.numero || 'S/N',
            complemento: config.complemento || '',
            bairro: config.bairro,
            municipio: config.municipio,
            uf: config.uf,
            codigo_municipio_ibge: config.codigo_municipio_ibge,
            email_comercial: config.email_comercial || '',
            telefone_comercial: config.telefone_comercial || '',
            ambiente_fiscal: config.ambiente_fiscal,
            serie_nfse: Number(config.serie_nfse) || 1,
            serie_nfe: Number(config.serie_nfe) || 1,
            serie_nfce: Number(config.serie_nfce) || 1,
            configurado: true,
            criado_em: config.criado_em,
            atualizado_em: config.atualizado_em
          }
        });
      }

      // Se ainda não houver configuração salva, busca dados base do usuário
      const usuario = (await usuarioRepository.buscarPorId(usuario_id)) || req.usuario;

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Configurações padrão obtidas com sucesso',
        dados: {
          usuario_id,
          razao_social: usuario.nome || '',
          nome_fantasia: usuario.nome || '',
          cnpj: '',
          inscricao_estadual: 'ISENTO',
          inscricao_municipal: '',
          cep: '',
          logradouro: '',
          numero: 'S/N',
          complemento: '',
          bairro: '',
          municipio: '',
          uf: '',
          codigo_municipio_ibge: '',
          email_comercial: usuario.email || '',
          telefone_comercial: '',
          ambiente_fiscal: 'HOMOLOGACAO',
          serie_nfse: 1,
          serie_nfe: 1,
          serie_nfce: 1,
          configurado: false
        }
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao obter configurações do MEI'
      });
    }
  },

  /**
   * PUT /api/configuracoes
   * Salva ou atualiza os dados cadastrais e fiscais do MEI.
   */
  async salvarConfiguracoes(req, res) {
    try {
      const usuario_id = req.usuario.id;
      const {
        razao_social,
        nome_fantasia,
        cnpj,
        inscricao_estadual,
        inscricao_municipal,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        municipio,
        uf,
        codigo_municipio_ibge,
        email_comercial,
        telefone_comercial,
        ambiente_fiscal,
        serie_nfse,
        serie_nfe,
        serie_nfce
      } = req.body;

      // Validação: Razão Social
      if (!razao_social || typeof razao_social !== 'string' || !razao_social.trim()) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Razão Social é obrigatória'
        });
      }

      // Validação: CNPJ
      const cnpjLimpo = String(cnpj || '').replace(/\D/g, '');
      if (cnpjLimpo.length !== 14) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'CNPJ inválido. Forneça 14 dígitos numéricos'
        });
      }

      // Validação: UF
      const ufUpper = String(uf || '').trim().toUpperCase();
      if (!sefazRegistry.validarUf(ufUpper)) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'UF inválida. Deve pertencer às 27 UFs brasileiras válidas'
        });
      }

      // Validação: Município
      if (!municipio || typeof municipio !== 'string' || !municipio.trim()) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Município é obrigatório'
        });
      }

      // Validação: CEP
      const cepLimpo = String(cep || '').replace(/\D/g, '');
      if (cepLimpo.length !== 8) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'CEP inválido. Forneça 8 dígitos numéricos'
        });
      }

      // Tratamento de dados complementares e defaults
      const dadosSefaz = sefazRegistry.obterDadosSefazPorUf(ufUpper);
      const ibgeFinal = codigo_municipio_ibge ? String(codigo_municipio_ibge).trim() : `${dadosSefaz.cUf}00000`;
      const numFinal = (numero && String(numero).trim()) ? String(numero).trim() : 'S/N';
      const ieFinal = (inscricao_estadual && String(inscricao_estadual).trim()) ? String(inscricao_estadual).trim() : 'ISENTO';
      const ambFinal = ambiente_fiscal === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO';
      const snfse = parseInt(serie_nfse, 10) || 1;
      const snfe = parseInt(serie_nfe, 10) || 1;
      const snfce = parseInt(serie_nfce, 10) || 1;

      const queryUpsert = `
        INSERT INTO mei_configuracoes (
          usuario_id, razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
          cep, logradouro, numero, complemento, bairro, municipio, uf, codigo_municipio_ibge,
          email_comercial, telefone_comercial, ambiente_fiscal, serie_nfse, serie_nfe, serie_nfce
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          razao_social = VALUES(razao_social),
          nome_fantasia = VALUES(nome_fantasia),
          cnpj = VALUES(cnpj),
          inscricao_estadual = VALUES(inscricao_estadual),
          inscricao_municipal = VALUES(inscricao_municipal),
          cep = VALUES(cep),
          logradouro = VALUES(logradouro),
          numero = VALUES(numero),
          complemento = VALUES(complemento),
          bairro = VALUES(bairro),
          municipio = VALUES(municipio),
          uf = VALUES(uf),
          codigo_municipio_ibge = VALUES(codigo_municipio_ibge),
          email_comercial = VALUES(email_comercial),
          telefone_comercial = VALUES(telefone_comercial),
          ambiente_fiscal = VALUES(ambiente_fiscal),
          serie_nfse = VALUES(serie_nfse),
          serie_nfe = VALUES(serie_nfe),
          serie_nfce = VALUES(serie_nfce),
          atualizado_em = NOW()
      `;

      await pool.execute(queryUpsert, [
        usuario_id,
        razao_social.trim(),
        nome_fantasia ? String(nome_fantasia).trim() : null,
        cnpjLimpo,
        ieFinal,
        inscricao_municipal ? String(inscricao_municipal).trim() : null,
        cepLimpo,
        logradouro ? String(logradouro).trim() : '',
        numFinal,
        complemento ? String(complemento).trim() : null,
        bairro ? String(bairro).trim() : '',
        municipio.trim(),
        ufUpper,
        ibgeFinal,
        email_comercial ? String(email_comercial).trim() : null,
        telefone_comercial ? String(telefone_comercial).trim() : null,
        ambFinal,
        snfse,
        snfe,
        snfce
      ]);

      const [rows] = await pool.execute(
        'SELECT * FROM mei_configuracoes WHERE usuario_id = ?',
        [usuario_id]
      );
      const salvo = rows[0];

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Configurações salvas com sucesso',
        dados: {
          id: salvo.id,
          usuario_id: salvo.usuario_id,
          razao_social: salvo.razao_social,
          nome_fantasia: salvo.nome_fantasia || '',
          cnpj: salvo.cnpj,
          inscricao_estadual: salvo.inscricao_estadual || 'ISENTO',
          inscricao_municipal: salvo.inscricao_municipal || '',
          cep: salvo.cep,
          logradouro: salvo.logradouro,
          numero: salvo.numero || 'S/N',
          complemento: salvo.complemento || '',
          bairro: salvo.bairro,
          municipio: salvo.municipio,
          uf: salvo.uf,
          codigo_municipio_ibge: salvo.codigo_municipio_ibge,
          email_comercial: salvo.email_comercial || '',
          telefone_comercial: salvo.telefone_comercial || '',
          ambiente_fiscal: salvo.ambiente_fiscal,
          serie_nfse: Number(salvo.serie_nfse) || 1,
          serie_nfe: Number(salvo.serie_nfe) || 1,
          serie_nfce: Number(salvo.serie_nfce) || 1,
          configurado: true,
          criado_em: salvo.criado_em,
          atualizado_em: salvo.atualizado_em
        }
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao salvar configurações do MEI'
      });
    }
  },

  /**
   * GET /api/configuracoes/estados
   * Retorna a lista completa das 27 UFs com dados cadastrais e fiscais da SEFAZ.
   */
  async listarEstados(req, res) {
    try {
      const estados = sefazRegistry.listarTodasUfs();
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Estados listados com sucesso',
        dados: estados
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao listar estados'
      });
    }
  },

  /**
   * GET /api/configuracoes/cnpj/:cnpj
   * Consulta pública de CNPJ na BrasilAPI com sanitização e timeout de 5 segundos.
   */
  async consultarCnpj(req, res) {
    try {
      const { cnpj } = req.params;
      const cnpjLimpo = String(cnpj || '').replace(/\D/g, '');

      if (cnpjLimpo.length !== 14) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'CNPJ inválido. Forneça 14 dígitos numéricos'
        });
      }

      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ArandueMEI/1.0';
      let data = null;
      let status404 = false;

      // 1. Tenta BrasilAPI
      const controller1 = new AbortController();
      const timeout1 = setTimeout(() => controller1.abort(), 6000);
      try {
        const response1 = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, {
          signal: controller1.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': userAgent
          }
        });
        if (response1.status === 404) {
          status404 = true;
        } else if (response1.ok) {
          data = await response1.json();
        }
      } catch {
        // Fallback para próxima fonte
      } finally {
        clearTimeout(timeout1);
      }

      // 2. Fallback: ReceitaWS (se BrasilAPI falhar ou rate limit)
      if (!data && !status404) {
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 6000);
        try {
          const response2 = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
            signal: controller2.signal,
            headers: {
              'Accept': 'application/json',
              'User-Agent': userAgent
            }
          });
          if (response2.status === 404) {
            status404 = true;
          } else if (response2.ok) {
            const raw2 = await response2.json();
            if (raw2.status === 'ERROR') {
              status404 = true;
            } else {
              data = {
                cnpj: raw2.cnpj,
                razao_social: raw2.nome,
                nome_fantasia: raw2.fantasia,
                cep: raw2.cep,
                logradouro: raw2.logradouro,
                numero: raw2.numero,
                complemento: raw2.complemento,
                bairro: raw2.bairro,
                municipio: raw2.municipio,
                uf: raw2.uf,
                codigo_municipio_ibge: raw2.municipio_ibge || '',
                telefone: raw2.telefone,
                email: raw2.email
              };
            }
          }
        } catch {
          // Ambos falharam
        } finally {
          clearTimeout(timeout2);
        }
      }

      if (status404) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'CNPJ não encontrado na base da Receita Federal'
        });
      }

      if (!data) {
        return res.status(502).json({
          sucesso: false,
          mensagem: 'Serviço de consulta de CNPJ temporariamente indisponível'
        });
      }

      let logradouro = data.logradouro || '';
      if (
        data.descricao_tipo_de_logradouro &&
        !logradouro.toUpperCase().startsWith(data.descricao_tipo_de_logradouro.toUpperCase())
      ) {
        logradouro = `${data.descricao_tipo_de_logradouro} ${logradouro}`.trim();
      }

      const dadosSanitizados = {
        cnpj: String(data.cnpj || cnpjLimpo).replace(/\D/g, ''),
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        cep: String(data.cep || '').replace(/\D/g, ''),
        logradouro,
        numero: data.numero || 'S/N',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        municipio: data.municipio || '',
        uf: (data.uf || '').toUpperCase(),
        codigo_municipio_ibge: data.codigo_municipio_ibge ? String(data.codigo_municipio_ibge) : '',
        telefone: data.telefone || data.ddd_telefone_1 || '',
        email: data.email || ''
      };

      return res.status(200).json({
        sucesso: true,
        dados: dadosSanitizados
      });
    } catch (error) {
      return res.status(502).json({
        sucesso: false,
        mensagem: error.message || 'Serviço de consulta de CNPJ temporariamente indisponível'
      });
    }
  },

  /**
   * GET /api/configuracoes/certificado
   * Retorna os metadados e status do certificado digital sem expor dados sigilosos.
   */
  async obterCertificadoStatus(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const status = await certificadoService.obterStatusCertificado(usuarioId);
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Status do certificado digital obtido com sucesso',
        dados: status
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao consultar status do certificado digital'
      });
    }
  },

  /**
   * POST /api/configuracoes/certificado
   * Upload e registro seguro (AES-256-GCM) do arquivo PFX com validação de senha.
   */
  async uploadCertificado(req, res) {
    try {
      const usuarioId = req.usuario.id;
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Arquivo do certificado (.pfx ou .p12) é obrigatório.'
        });
      }

      const senha = req.body.senha;
      if (!senha || !String(senha).trim()) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Senha do certificado é obrigatória.'
        });
      }

      const resultado = await certificadoService.salvarCertificado(usuarioId, {
        buffer: req.file.buffer,
        senha: String(senha).trim(),
        nomeArquivo: req.file.originalname || 'certificado.pfx'
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Certificado digital ICP-Brasil instalado com sucesso.',
        dados: resultado
      });
    } catch (error) {
      return res.status(400).json({
        sucesso: false,
        mensagem: error.message || 'Falha ao processar e salvar o certificado digital.'
      });
    }
  },

  /**
   * DELETE /api/configuracoes/certificado
   * Remove o certificado digital do MEI.
   */
  async removerCertificado(req, res) {
    try {
      const usuarioId = req.usuario.id;
      await certificadoService.removerCertificado(usuarioId);
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Certificado digital desinstalado com sucesso.'
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao remover o certificado digital.'
      });
    }
  },

  /**
   * PATCH /api/configuracoes/certificado/toggle
   * Alterna a flag de transmissão ativa à SEFAZ.
   */
  async toggleTransmissaoSefaz(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { ativo } = req.body;
      const novoStatus = Boolean(ativo);
      await certificadoService.alternarTransmissao(usuarioId, novoStatus);

      return res.status(200).json({
        sucesso: true,
        mensagem: `Transmissão SEFAZ ${novoStatus ? 'ativada' : 'desativada'} com sucesso.`,
        dados: {
          transmissao_sefaz_ativa: novoStatus
        }
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: error.message || 'Erro ao alternar status de transmissão SEFAZ.'
      });
    }
  }
};

module.exports = configuracoesController;

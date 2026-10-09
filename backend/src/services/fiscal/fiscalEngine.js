/**
 * Motor Fiscal — Engine e Regras de Negócio do Módulo Fiscal
 * Orquestra emissão atômica de NFS-e Nacional, NF-e (Mod 55) e NFC-e (Mod 65),
 * controle de numeração sequencial seguro (FOR UPDATE), geração de artefatos
 * XML e DANFE, integração com o Livro Caixa e cancelamento com trilha de auditoria.
 */

const pool = require('../../config/database');
const {
  gerarChaveAcesso,
  gerarChaveAcessoNfseNacional,
  obterCodigoUfPorSiglaOuIbge
} = require('./geradorChaveAcesso');
const sefazRegistry = require('./sefazRegistry');
const { gerarXmlNfse, gerarXmlNfe } = require('./geradorXmlFiscal');
const { gerarDanfeSimplificado } = require('./geradorDanfeSimplificado');
const certificadoService = require('./certificadoService');
const assinadorXmlFiscal = require('./assinadorXmlFiscal');
const sefazTransmissor = require('./sefazTransmissor');

/**
 * Obtém dados cadastrais do emitente (MEI) a partir do usuário, configurações e payload.
 * Consulta prioritariamente a tabela mei_configuracoes para o usuarioId.
 * @param {number} usuarioId
 * @param {Object} [payloadEmitente={}]
 * @param {Object} [conn=null]
 * @returns {Promise<Object>}
 */
async function obterDadosEmitente(usuarioId, payloadEmitente = {}, conn = null) {
  const exec = conn || pool;

  // 1. Consulta prioritária na tabela mei_configuracoes
  let configMei = null;
  try {
    const [configRows] = await exec.query(
      'SELECT * FROM mei_configuracoes WHERE usuario_id = ?',
      [usuarioId]
    );
    if (configRows && configRows.length > 0) {
      configMei = configRows[0];
    }
  } catch (err) {
    // Caso a tabela não exista ou haja erro temporário, segue com fallback de usuarios
  }

  // 2. Consulta dados cadastrais base da tabela usuarios (para fallbacks)
  const [rows] = await exec.query(
    'SELECT id, nome, email FROM usuarios WHERE id = ?',
    [usuarioId]
  );
  const usuario = rows[0] || {};

  const uf = (payloadEmitente.uf || configMei?.uf || 'SP').trim().toUpperCase();
  const sefazInfo = sefazRegistry.obterDadosSefazPorUf(uf);
  const defaultIbge = uf === 'SP' ? '3550308' : (sefazInfo ? `${sefazInfo.cUf}00000` : '3550308');

  return {
    cnpj: payloadEmitente.cnpj || payloadEmitente.documento || configMei?.cnpj || '12345678000195',
    razaoSocial: payloadEmitente.razaoSocial || payloadEmitente.razao_social || payloadEmitente.nome || configMei?.razao_social || usuario.nome || 'MEI Prestador de Serviços',
    nomeFantasia: payloadEmitente.nomeFantasia || payloadEmitente.nome_fantasia || configMei?.nome_fantasia || usuario.nome || '',
    email: payloadEmitente.email || payloadEmitente.email_comercial || configMei?.email_comercial || usuario.email || '',
    telefone: payloadEmitente.telefone || payloadEmitente.telefone_comercial || configMei?.telefone_comercial || '',
    inscricaoMunicipal: payloadEmitente.inscricaoMunicipal || payloadEmitente.inscricao_municipal || payloadEmitente.im || configMei?.inscricao_municipal || '',
    inscricaoEstadual: payloadEmitente.inscricaoEstadual || payloadEmitente.inscricao_estadual || payloadEmitente.ie || configMei?.inscricao_estadual || 'ISENTO',
    logradouro: payloadEmitente.logradouro || configMei?.logradouro || 'Endereço Comercial MEI',
    numero: payloadEmitente.numero || configMei?.numero || 'S/N',
    complemento: payloadEmitente.complemento || configMei?.complemento || '',
    bairro: payloadEmitente.bairro || configMei?.bairro || 'Centro',
    municipio: payloadEmitente.municipio || configMei?.municipio || 'São Paulo',
    uf,
    codigoMunicipioIbge: payloadEmitente.codigoMunicipioIbge || payloadEmitente.codigo_municipio_ibge || payloadEmitente.codigoMunicipio || configMei?.codigo_municipio_ibge || defaultIbge,
    cep: payloadEmitente.cep || configMei?.cep || '01001000',
    ambienteFiscal: payloadEmitente.ambiente || configMei?.ambiente_fiscal || 'HOMOLOGACAO'
  };
}

/**
 * Emite uma Nota Fiscal de Serviços Eletrônica (NFS-e Padrão Nacional).
 *
 * @param {number} usuarioId
 * @param {Object} payload
 * @param {Object} [connection=null]
 * @returns {Promise<{ sucesso: boolean, nota: Object, xml: string, danfe: string }>}
 */
async function emitirNfse(usuarioId, payload = {}, connection = null) {
  if (!usuarioId) {
    const erro = new Error('Identificação do usuário é obrigatória');
    erro.statusCode = 401;
    throw erro;
  }

  const destNome = (payload.destinatario_nome || payload.tomador_nome || payload.cliente_nome || '').trim();
  if (!destNome) {
    const erro = new Error('Nome do destinatário/tomador é obrigatório');
    erro.statusCode = 400;
    throw erro;
  }

  const destDoc = (payload.destinatario_documento || payload.tomador_documento || payload.cpf || payload.cnpj || payload.documento || '').replace(/\D/g, '');
  if (!destDoc || (destDoc.length !== 11 && destDoc.length !== 14)) {
    const erro = new Error('Documento do destinatário/tomador é obrigatório e deve ser CPF ou CNPJ válido');
    erro.statusCode = 400;
    throw erro;
  }

  const descServico = (payload.discriminacao_servico || payload.descricao_servico || payload.servico || payload.discriminacao || '').trim();
  if (!descServico) {
    const erro = new Error('Discriminação do serviço é obrigatória');
    erro.statusCode = 400;
    throw erro;
  }

  const valorServico = Number(payload.valor !== undefined ? payload.valor : (payload.valor_servico !== undefined ? payload.valor_servico : payload.valor_total));
  if (isNaN(valorServico) || valorServico <= 0) {
    const erro = new Error('Valor do serviço deve ser maior que zero');
    erro.statusCode = 400;
    throw erro;
  }

  const valorDesconto = Math.max(0, Number(payload.valor_desconto || payload.desconto || 0));
  const valorLiquido = Math.max(0, valorServico - valorDesconto);
  const codTribNac = payload.codigo_tributacao_nacional || '01.07.01';
  const serie = Number(payload.serie || 1);
  const gerarCaixa = payload.gerar_caixa !== false;

  const isExternalTx = !!connection;
  const conn = isExternalTx ? connection : await pool.getConnection();

  try {
    if (!isExternalTx) {
      await conn.beginTransaction();
    }

    const dadosEmitente = await obterDadosEmitente(usuarioId, payload.dadosEmitente || {}, conn);

    // Numeração sequencial atômica protegida com bloqueio de leitura exclusiva
    const [numRows] = await conn.query(
      `SELECT COALESCE(MAX(numero), 0) + 1 AS proximo_numero 
       FROM notas_fiscais 
       WHERE usuario_id = ? AND tipo = 'NFSE' AND serie = ? 
       FOR UPDATE`,
      [usuarioId, serie]
    );
    const numero = Number(numRows[0]?.proximo_numero || 1);

    const agora = new Date();
    const anoMes = String(agora.getFullYear()).slice(-2) + String(agora.getMonth() + 1).padStart(2, '0');
    const codigoNumerico = Math.floor(100000000 + Math.random() * 900000000);
    const ambienteNota = payload.ambiente || dadosEmitente.ambienteFiscal || 'HOMOLOGACAO';
    const ambienteCod = ambienteNota === 'PRODUCAO' ? 1 : 2;
    const docEmitLimpo = String(dadosEmitente.cnpj || dadosEmitente.documento || '').replace(/\D/g, '');
    const tipoInscricao = docEmitLimpo.length <= 11 ? 1 : 2;

    const protocolo = payload.protocolo_autorizacao || `NFSE${agora.getFullYear()}${String(numero).padStart(9, '0')}`;
    const codIbgeNfse = payload.codigo_municipio_ibge || dadosEmitente.codigoMunicipioIbge || '3550308';
    const chaveAcesso = gerarChaveAcessoNfseNacional({
      codigoMunicipioIbge: codIbgeNfse,
      ambiente: ambienteCod,
      tipoInscricao,
      inscricaoFederal: docEmitLimpo || '00000000000191',
      numero,
      anoMes,
      codigoNumerico
    });

    const dadosTomador = {
      nome: destNome,
      documento: destDoc,
      email: payload.destinatario_email || '',
      telefone: payload.destinatario_telefone || '',
      endereco: payload.destinatario_endereco || ''
    };

    const xml = gerarXmlNfse({
      dadosEmitente,
      dadosTomador,
      servico: {
        discriminacao: descServico,
        codigoTributacaoNacional: codTribNac,
        codigoMunicipioIbge: codIbgeNfse
      },
      valores: {
        valorServico,
        desconto: valorDesconto,
        valorLiquido
      },
      protocolo,
      numero,
      serie
    });

    const notaRegistro = {
      tipo: 'NFSE',
      status: 'EMITIDA',
      serie,
      numero,
      chave_acesso: chaveAcesso,
      protocolo_autorizacao: protocolo,
      ambiente: payload.ambiente || 'HOMOLOGACAO',
      destinatario_documento: destDoc,
      destinatario_nome: destNome,
      destinatario_email: payload.destinatario_email || null,
      destinatario_telefone: payload.destinatario_telefone || null,
      destinatario_endereco: payload.destinatario_endereco || null,
      codigo_tributacao_nacional: codTribNac,
      discriminacao_servico: descServico,
      codigo_municipio_ibge: codIbgeNfse,
      natureza_operacao: 'Prestação de serviços',
      consumidor_final: 1,
      presenca_comprador: 1,
      forma_pagamento: payload.forma_pagamento || 'OUTROS',
      valor_total: valorServico,
      valor_desconto: valorDesconto,
      valor_liquido: valorLiquido,
      xml_gerado: xml,
      link_danfe: null,
      data_emissao: new Date()
    };

    const danfe = gerarDanfeSimplificado({
      nota: notaRegistro,
      itens: [],
      emitente: dadosEmitente
    });

    const [insertNotaRes] = await conn.query(
      `INSERT INTO notas_fiscais (
        usuario_id, cliente_id, orcamento_id, movimentacao_id, tipo, status, serie, numero,
        chave_acesso, protocolo_autorizacao, ambiente, destinatario_documento, destinatario_nome,
        destinatario_email, destinatario_telefone, destinatario_endereco, codigo_tributacao_nacional,
        discriminacao_servico, codigo_municipio_ibge, natureza_operacao, consumidor_final,
        presenca_comprador, forma_pagamento, valor_total, valor_desconto, valor_liquido,
        xml_gerado, link_danfe, data_emissao
      ) VALUES (?, ?, ?, NULL, 'NFSE', 'EMITIDA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        usuarioId,
        payload.cliente_id || null,
        payload.orcamento_id || null,
        serie,
        numero,
        chaveAcesso,
        protocolo,
        notaRegistro.ambiente,
        destDoc,
        destNome,
        notaRegistro.destinatario_email,
        notaRegistro.destinatario_telefone,
        notaRegistro.destinatario_endereco,
        codTribNac,
        descServico,
        notaRegistro.codigo_municipio_ibge,
        notaRegistro.natureza_operacao,
        1,
        1,
        notaRegistro.forma_pagamento,
        valorServico,
        valorDesconto,
        valorLiquido,
        xml,
        null
      ]
    );

    const notaId = insertNotaRes.insertId;
    notaRegistro.id = notaId;
    notaRegistro.usuario_id = usuarioId;
    notaRegistro.movimentacao_id = null;

    // Lançamento opcional no Livro Caixa (movimentacoes)
    if (gerarCaixa && valorLiquido > 0) {
      const descCaixa = `Receita referente a NFS-e #${numero} - ${destNome}`;
      const [movRes] = await conn.query(
        `INSERT INTO movimentacoes (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao)
         VALUES (?, NULL, 'ENTRADA', 'Receita de Serviços (NFS-e)', ?, CURDATE(), ?)`,
        [usuarioId, valorLiquido, descCaixa]
      );
      const movimentacaoId = movRes.insertId;
      await conn.query(
        'UPDATE notas_fiscais SET movimentacao_id = ? WHERE id = ?',
        [movimentacaoId, notaId]
      );
      notaRegistro.movimentacao_id = movimentacaoId;
    }

    if (!isExternalTx) {
      await conn.commit();
    }

    return {
      sucesso: true,
      nota: notaRegistro,
      xml,
      danfe
    };
  } catch (error) {
    if (!isExternalTx) {
      await conn.rollback();
    }
    throw error;
  } finally {
    if (!isExternalTx) {
      conn.release();
    }
  }
}

/**
 * Emite uma Nota Fiscal Eletrônica de Produtos (NF-e Modelo 55) com itens.
 *
 * @param {number} usuarioId
 * @param {Object} payload
 * @param {Object} [connection=null]
 * @returns {Promise<{ sucesso: boolean, nota: Object, itens: Array<Object>, xml: string, danfe: string }>}
 */
async function emitirNfe(usuarioId, payload = {}, connection = null) {
  if (!usuarioId) {
    const erro = new Error('Identificação do usuário é obrigatória');
    erro.statusCode = 401;
    throw erro;
  }

  const destNome = (payload.destinatario_nome || payload.cliente_nome || '').trim();
  if (!destNome) {
    const erro = new Error('Nome do destinatário é obrigatório');
    erro.statusCode = 400;
    throw erro;
  }

  const destDoc = (payload.destinatario_documento || payload.cpf || payload.cnpj || payload.documento || '').replace(/\D/g, '');
  if (!destDoc || (destDoc.length !== 11 && destDoc.length !== 14)) {
    const erro = new Error('Documento do destinatário é obrigatório e deve ser CPF ou CNPJ válido');
    erro.statusCode = 400;
    throw erro;
  }

  const itens = Array.isArray(payload.itens) ? payload.itens : [];
  if (itens.length === 0) {
    const erro = new Error('A NF-e requer ao menos um item');
    erro.statusCode = 400;
    throw erro;
  }

  // Validação e cálculo dos itens
  let somaProdutos = 0;
  const listaItensProcessados = itens.map((it, idx) => {
    const desc = (it.descricao || it.nome || '').trim();
    if (!desc) {
      const erro = new Error(`Descrição obrigatória para o item ${idx + 1}`);
      erro.statusCode = 400;
      throw erro;
    }

    const qtd = Number(it.quantidade !== undefined ? it.quantidade : 1);
    if (isNaN(qtd) || qtd <= 0) {
      const erro = new Error(`Quantidade inválida para o item ${idx + 1}`);
      erro.statusCode = 400;
      throw erro;
    }

    const vUnit = Number(it.valor_unitario !== undefined ? it.valor_unitario : 0);
    if (isNaN(vUnit) || vUnit < 0) {
      const erro = new Error(`Valor unitário inválido para o item ${idx + 1}`);
      erro.statusCode = 400;
      throw erro;
    }

    const vTot = Number(it.valor_total !== undefined ? it.valor_total : (qtd * vUnit));
    somaProdutos += vTot;

    return {
      servico_id: it.servico_id || null,
      numero_item: it.numero_item || idx + 1,
      descricao: desc,
      ncm: (it.ncm || '00000000').replace(/\D/g, '').padEnd(8, '0').slice(0, 8),
      cfop: (it.cfop || '5102').replace(/\D/g, '').padEnd(4, '0').slice(0, 4),
      unidade: (it.unidade || 'UN').trim().slice(0, 10),
      quantidade: qtd,
      valor_unitario: vUnit,
      valor_total: vTot,
      csosn: it.csosn || '102'
    };
  });

  const valorTotal = somaProdutos;
  const valorDesconto = Math.max(0, Number(payload.valor_desconto || payload.desconto || 0));
  const valorLiquido = Math.max(0, valorTotal - valorDesconto);
  const serie = Number(payload.serie || 1);
  const naturezaOperacao = payload.natureza_operacao || 'Venda de mercadorias';
  const gerarCaixa = payload.gerar_caixa !== false;

  const isExternalTx = !!connection;
  const conn = isExternalTx ? connection : await pool.getConnection();

  try {
    if (!isExternalTx) {
      await conn.beginTransaction();
    }

    const dadosEmitente = await obterDadosEmitente(usuarioId, payload.dadosEmitente || {}, conn);

    // Numeração sequencial atômica
    const [numRows] = await conn.query(
      `SELECT COALESCE(MAX(numero), 0) + 1 AS proximo_numero 
       FROM notas_fiscais 
       WHERE usuario_id = ? AND tipo = 'NFE' AND serie = ? 
       FOR UPDATE`,
      [usuarioId, serie]
    );
    const numero = Number(numRows[0]?.proximo_numero || 1);

    // Geração oficial da Chave de Acesso SEFAZ (44 dígitos com Módulo 11)
    const agora = new Date();
    const anoMes = String(agora.getFullYear()).slice(-2) + String(agora.getMonth() + 1).padStart(2, '0');
    const codigoNumerico = Math.floor(10000000 + Math.random() * 90000000);

    const sefazInfo = sefazRegistry.obterDadosSefazPorUf(dadosEmitente.uf);
    const cUF = sefazInfo ? sefazInfo.cUf : obterCodigoUfPorSiglaOuIbge(dadosEmitente.uf || dadosEmitente.codigoMunicipioIbge);
    const chaveAcesso = gerarChaveAcesso({
      cUF,
      anoMes,
      cnpj: dadosEmitente.cnpj,
      modelo: '55',
      serie,
      numero,
      tpEmis: 1,
      codigoNumerico
    });

    let protocolo = payload.protocolo_autorizacao || `1${cUF}${anoMes}${String(numero).padStart(9, '0')}`;
    let xmlFinal = '';
    let modo_emissao = 'SIMULACAO_LOCAL';

    // Modo Híbrido: Verifica se o MEI possui Certificado Digital A1 ativo
    const certDecifrado = await certificadoService.obterCertificadoDecifrado(usuarioId);
    const transmissaoAtiva = certDecifrado && certDecifrado.dados && certDecifrado.dados.transmissaoSefazAtiva;

    // Regra SEFAZ Homologação (Rejeição 222): Destinatário deve ter identificação padrão quando em homologação
    const ambienteNota = payload.ambiente || dadosEmitente.ambienteFiscal || 'HOMOLOGACAO';
    const destNomeParaXml = (transmissaoAtiva && ambienteNota === 'HOMOLOGACAO')
      ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
      : destNome;

    const dadosDestinatario = {
      nome: destNomeParaXml,
      documento: destDoc,
      email: payload.destinatario_email || '',
      endereco: payload.destinatario_endereco || ''
    };

    const xmlGeradoBruto = gerarXmlNfe({
      chave: chaveAcesso,
      dadosEmitente,
      dadosDestinatario,
      itens: listaItensProcessados,
      totais: {
        valor_total: valorTotal,
        valor_desconto: valorDesconto,
        valor_liquido: valorLiquido
      },
      protocolo,
      modelo: '55',
      serie,
      numero
    });

    if (transmissaoAtiva) {
      const certAnalise = certificadoService.analisarCertificadoPfx(certDecifrado.pfxBuffer, certDecifrado.senha);
      const xmlAssinado = assinadorXmlFiscal.assinarXmlNfe(
        xmlGeradoBruto,
        certAnalise.privateKeyPem,
        certAnalise.certificatePem
      );

      const respSefaz = await sefazTransmissor.transmitirNfeLote({
        xmlAssinado,
        uf: dadosEmitente.uf,
        pfxBuffer: certDecifrado.pfxBuffer,
        senha: certDecifrado.senha
      });

      if (!respSefaz.sucesso) {
        const erro = new Error(`Rejeição na autorização da SEFAZ (${respSefaz.cStat}): ${respSefaz.xMotivo}`);
        erro.statusCode = 422;
        erro.cStat = respSefaz.cStat;
        throw erro;
      }

      protocolo = respSefaz.nProt || protocolo;
      xmlFinal = respSefaz.xmlProc || xmlAssinado;
      modo_emissao = 'SEFAZ_HOMOLOGACAO_REAL';
    } else {
      xmlFinal = xmlGeradoBruto;
      modo_emissao = 'SIMULACAO_LOCAL';
    }

    const notaRegistro = {
      tipo: 'NFE',
      status: 'EMITIDA',
      serie,
      numero,
      chave_acesso: chaveAcesso,
      protocolo_autorizacao: protocolo,
      ambiente: ambienteNota,
      destinatario_documento: destDoc,
      destinatario_nome: destNome,
      destinatario_email: payload.destinatario_email || null,
      destinatario_telefone: payload.destinatario_telefone || null,
      destinatario_endereco: payload.destinatario_endereco || null,
      natureza_operacao: naturezaOperacao,
      consumidor_final: payload.consumidor_final !== undefined ? payload.consumidor_final : 1,
      presenca_comprador: payload.presenca_comprador !== undefined ? payload.presenca_comprador : 1,
      forma_pagamento: payload.forma_pagamento || 'OUTROS',
      valor_total: valorTotal,
      valor_desconto: valorDesconto,
      valor_liquido: valorLiquido,
      xml_gerado: xmlFinal,
      link_danfe: null,
      data_emissao: new Date()
    };

    const danfe = gerarDanfeSimplificado({
      nota: notaRegistro,
      itens: listaItensProcessados,
      emitente: dadosEmitente
    });

    const [insertNotaRes] = await conn.query(
      `INSERT INTO notas_fiscais (
        usuario_id, cliente_id, orcamento_id, movimentacao_id, tipo, status, serie, numero,
        chave_acesso, protocolo_autorizacao, ambiente, destinatario_documento, destinatario_nome,
        destinatario_email, destinatario_telefone, destinatario_endereco, natureza_operacao,
        consumidor_final, presenca_comprador, forma_pagamento, valor_total, valor_desconto,
        valor_liquido, xml_gerado, link_danfe, data_emissao
      ) VALUES (?, ?, ?, NULL, 'NFE', 'EMITIDA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        usuarioId,
        payload.cliente_id || null,
        payload.orcamento_id || null,
        serie,
        numero,
        chaveAcesso,
        protocolo,
        notaRegistro.ambiente,
        destDoc,
        destNome,
        notaRegistro.destinatario_email,
        notaRegistro.destinatario_telefone,
        notaRegistro.destinatario_endereco,
        naturezaOperacao,
        notaRegistro.consumidor_final,
        notaRegistro.presenca_comprador,
        notaRegistro.forma_pagamento,
        valorTotal,
        valorDesconto,
        valorLiquido,
        xmlFinal,
        null
      ]
    );

    const notaId = insertNotaRes.insertId;
    notaRegistro.id = notaId;
    notaRegistro.usuario_id = usuarioId;
    notaRegistro.movimentacao_id = null;

    // Grava itens na tabela nota_fiscal_itens
    for (const it of listaItensProcessados) {
      await conn.query(
        `INSERT INTO nota_fiscal_itens (
          nota_fiscal_id, servico_id, numero_item, descricao, ncm, cfop,
          unidade, quantidade, valor_unitario, valor_total, regime_tributario, csosn
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SIMEI', ?)`,
        [
          notaId,
          it.servico_id,
          it.numero_item,
          it.descricao,
          it.ncm,
          it.cfop,
          it.unidade,
          it.quantidade,
          it.valor_unitario,
          it.valor_total,
          it.csosn
        ]
      );
    }

    // Lançamento opcional no Livro Caixa
    if (gerarCaixa && valorLiquido > 0) {
      const descCaixa = `Receita referente a NF-e #${numero} - ${destNome}`;
      const [movRes] = await conn.query(
        `INSERT INTO movimentacoes (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao)
         VALUES (?, NULL, 'ENTRADA', 'Venda de Mercadorias (NF-e)', ?, CURDATE(), ?)`,
        [usuarioId, valorLiquido, descCaixa]
      );
      const movimentacaoId = movRes.insertId;
      await conn.query(
        'UPDATE notas_fiscais SET movimentacao_id = ? WHERE id = ?',
        [movimentacaoId, notaId]
      );
      notaRegistro.movimentacao_id = movimentacaoId;
    }

    if (!isExternalTx) {
      await conn.commit();
    }

    return {
      sucesso: true,
      nota: notaRegistro,
      itens: listaItensProcessados,
      xml: xmlFinal,
      danfe,
      modo_emissao
    };
  } catch (error) {
    if (!isExternalTx) {
      await conn.rollback();
    }
    throw error;
  } finally {
    if (!isExternalTx) {
      conn.release();
    }
  }
}

/**
 * Emite uma Nota Fiscal de Consumidor Eletrônica (NFC-e Modelo 65 - Varejo).
 *
 * @param {number} usuarioId
 * @param {Object} payload
 * @param {Object} [connection=null]
 * @returns {Promise<{ sucesso: boolean, nota: Object, itens: Array<Object>, xml: string, danfe: string }>}
 */
async function emitirNfce(usuarioId, payload = {}, connection = null) {
  if (!usuarioId) {
    const erro = new Error('Identificação do usuário é obrigatória');
    erro.statusCode = 401;
    throw erro;
  }

  const itens = Array.isArray(payload.itens) ? payload.itens : [];
  if (itens.length === 0) {
    const erro = new Error('A NFC-e requer ao menos um item');
    erro.statusCode = 400;
    throw erro;
  }

  // Destinatário pode ser consumidor não identificado no balcão
  const destNome = (payload.destinatario_nome || payload.cliente_nome || 'Consumidor Final').trim();
  const destDoc = (payload.destinatario_documento || payload.destinatario_cpf || payload.cpf || '').replace(/\D/g, '');

  let somaProdutos = 0;
  const listaItensProcessados = itens.map((it, idx) => {
    const desc = (it.descricao || it.nome || 'Produto').trim();
    const qtd = Number(it.quantidade !== undefined ? it.quantidade : 1);
    const vUnit = Number(it.valor_unitario !== undefined ? it.valor_unitario : 0);
    const vTot = Number(it.valor_total !== undefined ? it.valor_total : (qtd * vUnit));
    somaProdutos += vTot;

    return {
      servico_id: it.servico_id || null,
      numero_item: it.numero_item || idx + 1,
      descricao: desc,
      ncm: (it.ncm || '00000000').replace(/\D/g, '').padEnd(8, '0').slice(0, 8),
      cfop: (it.cfop || '5102').replace(/\D/g, '').padEnd(4, '0').slice(0, 4),
      unidade: (it.unidade || 'UN').trim().slice(0, 10),
      quantidade: qtd,
      valor_unitario: vUnit,
      valor_total: vTot,
      csosn: it.csosn || '102'
    };
  });

  const valorTotal = somaProdutos;
  const valorDesconto = Math.max(0, Number(payload.valor_desconto || payload.desconto || 0));
  const valorLiquido = Math.max(0, valorTotal - valorDesconto);
  const serie = Number(payload.serie || 1);
  const formaPagamento = payload.forma_pagamento || 'DINHEIRO';
  const gerarCaixa = payload.gerar_caixa !== false;

  const isExternalTx = !!connection;
  const conn = isExternalTx ? connection : await pool.getConnection();

  try {
    if (!isExternalTx) {
      await conn.beginTransaction();
    }

    const dadosEmitente = await obterDadosEmitente(usuarioId, payload.dadosEmitente || {}, conn);

    // Numeração atômica por tenant e tipo NFCE
    const [numRows] = await conn.query(
      `SELECT COALESCE(MAX(numero), 0) + 1 AS proximo_numero 
       FROM notas_fiscais 
       WHERE usuario_id = ? AND tipo = 'NFCE' AND serie = ? 
       FOR UPDATE`,
      [usuarioId, serie]
    );
    const numero = Number(numRows[0]?.proximo_numero || 1);

    const agora = new Date();
    const anoMes = String(agora.getFullYear()).slice(-2) + String(agora.getMonth() + 1).padStart(2, '0');
    const codigoNumerico = Math.floor(10000000 + Math.random() * 90000000);

    const sefazInfo = sefazRegistry.obterDadosSefazPorUf(dadosEmitente.uf);
    const cUF = sefazInfo ? sefazInfo.cUf : obterCodigoUfPorSiglaOuIbge(dadosEmitente.uf || dadosEmitente.codigoMunicipioIbge);
    const chaveAcesso = gerarChaveAcesso({
      cUF,
      anoMes,
      cnpj: dadosEmitente.cnpj,
      modelo: '65',
      serie,
      numero,
      tpEmis: 1,
      codigoNumerico
    });

    const protocolo = payload.protocolo_autorizacao || `1${cUF}${anoMes}${String(numero).padStart(9, '0')}`;

    const dadosDestinatario = destDoc || destNome !== 'Consumidor Final' ? {
      nome: destNome,
      documento: destDoc,
      email: payload.destinatario_email || '',
      endereco: payload.destinatario_endereco || ''
    } : null;

    const xml = gerarXmlNfe({
      chave: chaveAcesso,
      dadosEmitente,
      dadosDestinatario,
      itens: listaItensProcessados,
      totais: {
        valor_total: valorTotal,
        valor_desconto: valorDesconto,
        valor_liquido: valorLiquido
      },
      protocolo,
      modelo: '65',
      serie,
      numero
    });

    const notaRegistro = {
      tipo: 'NFCE',
      status: 'EMITIDA',
      serie,
      numero,
      chave_acesso: chaveAcesso,
      protocolo_autorizacao: protocolo,
      ambiente: payload.ambiente || 'HOMOLOGACAO',
      destinatario_documento: destDoc || '00000000000',
      destinatario_nome: destNome,
      destinatario_email: payload.destinatario_email || null,
      destinatario_telefone: payload.destinatario_telefone || null,
      destinatario_endereco: payload.destinatario_endereco || null,
      natureza_operacao: 'Venda a consumidor',
      consumidor_final: 1,
      presenca_comprador: 1,
      forma_pagamento: formaPagamento,
      valor_total: valorTotal,
      valor_desconto: valorDesconto,
      valor_liquido: valorLiquido,
      xml_gerado: xml,
      link_danfe: null,
      data_emissao: new Date()
    };

    const danfe = gerarDanfeSimplificado({
      nota: notaRegistro,
      itens: listaItensProcessados,
      emitente: dadosEmitente
    });

    const [insertNotaRes] = await conn.query(
      `INSERT INTO notas_fiscais (
        usuario_id, cliente_id, orcamento_id, movimentacao_id, tipo, status, serie, numero,
        chave_acesso, protocolo_autorizacao, ambiente, destinatario_documento, destinatario_nome,
        destinatario_email, destinatario_telefone, destinatario_endereco, natureza_operacao,
        consumidor_final, presenca_comprador, forma_pagamento, valor_total, valor_desconto,
        valor_liquido, xml_gerado, link_danfe, data_emissao
      ) VALUES (?, ?, ?, NULL, 'NFCE', 'EMITIDA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        usuarioId,
        payload.cliente_id || null,
        payload.orcamento_id || null,
        serie,
        numero,
        chaveAcesso,
        protocolo,
        notaRegistro.ambiente,
        notaRegistro.destinatario_documento,
        destNome,
        notaRegistro.destinatario_email,
        notaRegistro.destinatario_telefone,
        notaRegistro.destinatario_endereco,
        notaRegistro.natureza_operacao,
        1,
        1,
        formaPagamento,
        valorTotal,
        valorDesconto,
        valorLiquido,
        xml,
        null
      ]
    );

    const notaId = insertNotaRes.insertId;
    notaRegistro.id = notaId;
    notaRegistro.usuario_id = usuarioId;
    notaRegistro.movimentacao_id = null;

    // Grava itens na tabela nota_fiscal_itens
    for (const it of listaItensProcessados) {
      await conn.query(
        `INSERT INTO nota_fiscal_itens (
          nota_fiscal_id, servico_id, numero_item, descricao, ncm, cfop,
          unidade, quantidade, valor_unitario, valor_total, regime_tributario, csosn
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SIMEI', ?)`,
        [
          notaId,
          it.servico_id,
          it.numero_item,
          it.descricao,
          it.ncm,
          it.cfop,
          it.unidade,
          it.quantidade,
          it.valor_unitario,
          it.valor_total,
          it.csosn
        ]
      );
    }

    // Lançamento no Livro Caixa
    if (gerarCaixa && valorLiquido > 0) {
      const descCaixa = `Receita referente a NFC-e #${numero} (${formaPagamento})`;
      const [movRes] = await conn.query(
        `INSERT INTO movimentacoes (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao)
         VALUES (?, NULL, 'ENTRADA', 'Venda a Consumidor (NFC-e)', ?, CURDATE(), ?)`,
        [usuarioId, valorLiquido, descCaixa]
      );
      const movimentacaoId = movRes.insertId;
      await conn.query(
        'UPDATE notas_fiscais SET movimentacao_id = ? WHERE id = ?',
        [movimentacaoId, notaId]
      );
      notaRegistro.movimentacao_id = movimentacaoId;
    }

    if (!isExternalTx) {
      await conn.commit();
    }

    return {
      sucesso: true,
      nota: notaRegistro,
      itens: listaItensProcessados,
      xml,
      danfe
    };
  } catch (error) {
    if (!isExternalTx) {
      await conn.rollback();
    }
    throw error;
  } finally {
    if (!isExternalTx) {
      conn.release();
    }
  }
}

/**
 * Cancela uma nota fiscal autorizada com justificativa legal e estorno no Livro Caixa.
 *
 * @param {number} usuarioId
 * @param {number|string} notaId
 * @param {string} motivo
 * @returns {Promise<{ sucesso: boolean, nota: Object }>}
 */
async function cancelarNotaFiscal(usuarioId, notaId, motivo) {
  if (!usuarioId) {
    const erro = new Error('Identificação do usuário é obrigatória');
    erro.statusCode = 401;
    throw erro;
  }

  if (!notaId) {
    const erro = new Error('Identificação da nota fiscal é obrigatória');
    erro.statusCode = 400;
    throw erro;
  }

  if (!motivo || typeof motivo !== 'string' || motivo.trim().length < 15) {
    const erro = new Error('O motivo do cancelamento deve conter no mínimo 15 caracteres.');
    erro.statusCode = 400;
    throw erro;
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT * FROM notas_fiscais WHERE id = ? AND usuario_id = ? FOR UPDATE',
      [notaId, usuarioId]
    );

    if (rows.length === 0) {
      const erro = new Error('Nota fiscal não encontrada ou não pertence a este usuário.');
      erro.statusCode = 404;
      throw erro;
    }

    const nota = rows[0];

    if (nota.status === 'CANCELADA') {
      const erro = new Error('Esta nota fiscal já está cancelada.');
      erro.statusCode = 400;
      throw erro;
    }

    const motivoFormatado = motivo.trim();

    await conn.query(
      `UPDATE notas_fiscais 
       SET status = 'CANCELADA', motivo_cancelamento = ?, data_cancelamento = NOW() 
       WHERE id = ? AND usuario_id = ?`,
      [motivoFormatado, notaId, usuarioId]
    );

    // Se houve lançamento no Livro Caixa, efetua estorno compensatório (Resolução CGSN nº 140)
    if (nota.movimentacao_id) {
      const valorEstorno = Number(nota.valor_liquido || nota.valor_total || 0);
      if (valorEstorno > 0) {
        const tipoFormatado = nota.tipo === 'NFSE' ? 'NFS-e' : (nota.tipo === 'NFCE' ? 'NFC-e' : 'NF-e');
        const descEstorno = `Estorno de cancelamento da ${tipoFormatado} #${nota.numero}: ${motivoFormatado}`;
        await conn.query(
          `INSERT INTO movimentacoes (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao)
           VALUES (?, NULL, 'SAIDA', 'Estorno Fiscal', ?, CURDATE(), ?)`,
          [usuarioId, valorEstorno, descEstorno]
        );
      }
    }

    await conn.commit();

    const [notaAtualizadaRows] = await pool.query(
      'SELECT * FROM notas_fiscais WHERE id = ? AND usuario_id = ?',
      [notaId, usuarioId]
    );

    return {
      sucesso: true,
      nota: notaAtualizadaRows[0]
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Consulta nota fiscal por ID ou chave de acesso, trazendo itens associados e espelho DANFE.
 *
 * @param {number} usuarioId
 * @param {number|string} notaIdOuChave
 * @returns {Promise<{ sucesso: boolean, nota: Object, itens: Array<Object>, danfe: string }>}
 */
async function consultarNotaFiscal(usuarioId, notaIdOuChave) {
  if (!usuarioId) {
    const erro = new Error('Identificação do usuário é obrigatória');
    erro.statusCode = 401;
    throw erro;
  }

  if (!notaIdOuChave) {
    const erro = new Error('Identificador ou chave da nota fiscal é obrigatório');
    erro.statusCode = 400;
    throw erro;
  }

  const [rows] = await pool.query(
    `SELECT * FROM notas_fiscais 
     WHERE (id = ? OR chave_acesso = ?) AND usuario_id = ?`,
    [notaIdOuChave, notaIdOuChave, usuarioId]
  );

  if (rows.length === 0) {
    const erro = new Error('Nota fiscal não encontrada ou não pertence a este usuário.');
    erro.statusCode = 404;
    throw erro;
  }

  const nota = rows[0];

  const [itens] = await pool.query(
    'SELECT * FROM nota_fiscal_itens WHERE nota_fiscal_id = ? ORDER BY numero_item ASC',
    [nota.id]
  );

  const dadosEmitente = await obterDadosEmitente(usuarioId, {});
  const danfe = gerarDanfeSimplificado({
    nota,
    itens,
    emitente: dadosEmitente
  });

  return {
    sucesso: true,
    nota,
    itens,
    danfe
  };
}

/**
 * Lista o histórico de notas fiscais emitidas pelo MEI com filtros opcionais.
 *
 * @param {number} usuarioId
 * @param {Object} [filtros={}]
 * @returns {Promise<Array<Object>>}
 */
async function listarNotasFiscais(usuarioId, { tipo, status, data_inicio, data_fim, limite = 50, pagina = 1 } = {}) {
  if (!usuarioId) {
    const erro = new Error('Identificação do usuário é obrigatória');
    erro.statusCode = 401;
    throw erro;
  }

  let sql = `
    SELECT 
      id, usuario_id, cliente_id, orcamento_id, movimentacao_id,
      tipo, status, serie, numero, chave_acesso, protocolo_autorizacao,
      ambiente, destinatario_documento, destinatario_nome, destinatario_email,
      valor_total, valor_desconto, valor_liquido, motivo_cancelamento,
      DATE_FORMAT(data_emissao, '%Y-%m-%d %H:%i:%s') AS data_emissao,
      DATE_FORMAT(data_cancelamento, '%Y-%m-%d %H:%i:%s') AS data_cancelamento
    FROM notas_fiscais
    WHERE usuario_id = ?
  `;

  const params = [usuarioId];

  if (tipo && typeof tipo === 'string' && tipo.trim()) {
    sql += ' AND tipo = ?';
    params.push(tipo.trim().toUpperCase());
  }

  if (status && typeof status === 'string' && status.trim()) {
    sql += ' AND status = ?';
    params.push(status.trim().toUpperCase());
  }

  if (data_inicio && typeof data_inicio === 'string' && data_inicio.trim()) {
    sql += ' AND data_emissao >= ?';
    params.push(`${data_inicio.trim().slice(0, 10)} 00:00:00`);
  }

  if (data_fim && typeof data_fim === 'string' && data_fim.trim()) {
    sql += ' AND data_emissao <= ?';
    params.push(`${data_fim.trim().slice(0, 10)} 23:59:59`);
  }

  const limitNum = Math.max(1, Math.min(100, Number(limite) || 50));
  const offsetNum = Math.max(0, ((Number(pagina) || 1) - 1) * limitNum);

  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offsetNum);

  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = {
  emitirNfse,
  emitirNfe,
  emitirNfce,
  cancelarNotaFiscal,
  consultarNotaFiscal,
  listarNotasFiscais,
  obterDadosEmitente
};

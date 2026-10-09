const pool = require('../../src/config/database');
const fiscalEngine = require('../../src/services/fiscal/fiscalEngine');

describe('Motor Fiscal — Emissão Dinâmica por Estado e Autorizador SEFAZ (fiscalEngineSefazEstados)', () => {
  let usuarioSpId;
  let usuarioRjId;
  let usuarioMgId;
  let usuarioScId;
  let usuarioFallbackId;

  beforeAll(async () => {
    // 1. Cria usuários para os testes multi-estado
    const [uSp] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['MEI SP Teste', `mei_sp_${Date.now()}@teste.com`, 'hash_senha']
    );
    usuarioSpId = uSp.insertId;

    const [uRj] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['MEI RJ Teste', `mei_rj_${Date.now()}@teste.com`, 'hash_senha']
    );
    usuarioRjId = uRj.insertId;

    const [uMg] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['MEI MG Teste', `mei_mg_${Date.now()}@teste.com`, 'hash_senha']
    );
    usuarioMgId = uMg.insertId;

    const [uSc] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['MEI SC Teste', `mei_sc_${Date.now()}@teste.com`, 'hash_senha']
    );
    usuarioScId = uSc.insertId;

    const [uFb] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['MEI Fallback Teste', `mei_fb_${Date.now()}@teste.com`, 'hash_senha']
    );
    usuarioFallbackId = uFb.insertId;

    // 2. Insere registros em mei_configuracoes para SP, RJ, MG e SC
    const queryConfig = `
      INSERT INTO mei_configuracoes (
        usuario_id, razao_social, nome_fantasia, cnpj, inscricao_estadual,
        cep, logradouro, numero, bairro, municipio, uf, codigo_municipio_ibge,
        email_comercial, ambiente_fiscal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'HOMOLOGACAO')
    `;

    await pool.query(queryConfig, [
      usuarioSpId,
      'Padaria SP MEI Ltda',
      'Padaria Paulista',
      '11111111000111',
      '111222333444',
      '01001000',
      'Praça da Sé',
      '100',
      'Centro',
      'São Paulo',
      'SP',
      '3550308',
      'sp@padaria.com'
    ]);

    await pool.query(queryConfig, [
      usuarioRjId,
      'Oficina Carioca MEI Ltda',
      'Oficina do Rio',
      '22222222000122',
      '222333444555',
      '20040002',
      'Avenida Rio Branco',
      '50',
      'Centro',
      'Rio de Janeiro',
      'RJ',
      '3304557',
      'rj@oficina.com'
    ]);

    await pool.query(queryConfig, [
      usuarioMgId,
      'Café Mineiro MEI Ltda',
      'Café Uai',
      '33333333000133',
      '333444555666',
      '30130000',
      'Avenida Afonso Pena',
      '200',
      'Centro',
      'Belo Horizonte',
      'MG',
      '3106200',
      'mg@cafe.com'
    ]);

    await pool.query(queryConfig, [
      usuarioScId,
      'Tecnologia Catarinense MEI Ltda',
      'Tech Floripa',
      '44444444000144',
      '444555666777',
      '88010000',
      'Rua Felipe Schmidt',
      '300',
      'Centro',
      'Florianópolis',
      'SC',
      '4205407',
      'sc@tech.com'
    ]);
  });

  afterAll(async () => {
    const todosIds = [usuarioSpId, usuarioRjId, usuarioMgId, usuarioScId, usuarioFallbackId].filter(Boolean);
    if (todosIds.length > 0) {
      await pool.query(
        'DELETE FROM nota_fiscal_itens WHERE nota_fiscal_id IN (SELECT id FROM notas_fiscais WHERE usuario_id IN (?))',
        [todosIds]
      );
      await pool.query('DELETE FROM notas_fiscais WHERE usuario_id IN (?)', [todosIds]);
      await pool.query('DELETE FROM movimentacoes WHERE usuario_id IN (?)', [todosIds]);
      await pool.query('DELETE FROM mei_configuracoes WHERE usuario_id IN (?)', [todosIds]);
      await pool.query('DELETE FROM usuarios WHERE id IN (?)', [todosIds]);
    }
    await pool.end();
  });

  describe('obterDadosEmitente', () => {
    it('deve carregar dados prioritariamente de mei_configuracoes para cada estado', async () => {
      const emitMg = await fiscalEngine.obterDadosEmitente(usuarioMgId);
      expect(emitMg.uf).toBe('MG');
      expect(emitMg.codigoMunicipioIbge).toBe('3106200');
      expect(emitMg.cnpj).toBe('33333333000133');
      expect(emitMg.razaoSocial).toBe('Café Mineiro MEI Ltda');
      expect(emitMg.municipio).toBe('Belo Horizonte');

      const emitSc = await fiscalEngine.obterDadosEmitente(usuarioScId);
      expect(emitSc.uf).toBe('SC');
      expect(emitSc.codigoMunicipioIbge).toBe('4205407');
      expect(emitSc.cnpj).toBe('44444444000144');
    });

    it('deve utilizar fallback seguro quando o usuário não tiver mei_configuracoes', async () => {
      const emitFb = await fiscalEngine.obterDadosEmitente(usuarioFallbackId);
      expect(emitFb.uf).toBe('SP');
      expect(emitFb.razaoSocial).toBe('MEI Fallback Teste');
      expect(emitFb.codigoMunicipioIbge).toBe('3550308');
    });

    it('deve permitir override por payloadEmitente sobre mei_configuracoes', async () => {
      const emitOverride = await fiscalEngine.obterDadosEmitente(usuarioMgId, {
        razaoSocial: 'Razão Social Temporária',
        uf: 'PR',
        codigoMunicipioIbge: '4106902'
      });
      expect(emitOverride.razaoSocial).toBe('Razão Social Temporária');
      expect(emitOverride.uf).toBe('PR');
      expect(emitOverride.codigoMunicipioIbge).toBe('4106902');
    });
  });

  describe('Emissão de NF-e (Modelo 55) nos Estados SP, RJ, MG e SC', () => {
    const itemGenerico = [
      {
        descricao: 'Produto Artesanal',
        quantidade: 2,
        valor_unitario: 50.00,
        ncm: '19059090',
        cfop: '5102',
        unidade: 'UN'
      }
    ];

    it('deve emitir NF-e para MEI de São Paulo com cUF 35, autorizador SP e portal da SEFAZ SP', async () => {
      const res = await fiscalEngine.emitirNfe(usuarioSpId, {
        destinatario_nome: 'Cliente São Paulo',
        destinatario_documento: '12345678901',
        itens: itemGenerico,
        gerar_caixa: true
      });

      expect(res.sucesso).toBe(true);
      expect(res.nota.tipo).toBe('NFE');
      expect(res.nota.chave_acesso).toHaveLength(44);
      // Posições 0-2 da chave representam o cUF (35 para SP)
      expect(res.nota.chave_acesso.slice(0, 2)).toBe('35');
      expect(res.nota.movimentacao_id).not.toBeNull();

      // DANFE
      expect(res.danfe).toContain('SEFAZ SP');
      expect(res.danfe).toContain('https://www.nfe.fazenda.sp.gov.br');
    });

    it('deve emitir NF-e para MEI do Rio de Janeiro com cUF 33, autorizador RJ e portal da SEFAZ RJ', async () => {
      const res = await fiscalEngine.emitirNfe(usuarioRjId, {
        destinatario_nome: 'Cliente Rio de Janeiro',
        destinatario_documento: '12345678901',
        itens: itemGenerico
      });

      expect(res.sucesso).toBe(true);
      expect(res.nota.chave_acesso.slice(0, 2)).toBe('33');
      expect(res.danfe).toContain('SEFAZ RJ');
      expect(res.danfe).toContain('https://www.fazenda.rj.gov.br');
    });

    it('deve emitir NF-e para MEI de Minas Gerais com cUF 31, autorizador MG e portal da SEFAZ MG', async () => {
      const res1 = await fiscalEngine.emitirNfe(usuarioMgId, {
        destinatario_nome: 'Cliente Minas Gerais 1',
        destinatario_documento: '12345678901',
        itens: itemGenerico,
        gerar_caixa: true
      });

      expect(res1.sucesso).toBe(true);
      expect(res1.nota.numero).toBe(1);
      expect(res1.nota.chave_acesso.slice(0, 2)).toBe('31');
      expect(res1.danfe).toContain('SEFAZ MG');
      expect(res1.danfe).toContain('https://nfe.fazenda.mg.gov.br');

      // Segunda nota de MG deve ter numero 2 (numeração atômica sequencial por tenant)
      const res2 = await fiscalEngine.emitirNfe(usuarioMgId, {
        destinatario_nome: 'Cliente Minas Gerais 2',
        destinatario_documento: '12345678901',
        itens: itemGenerico
      });

      expect(res2.sucesso).toBe(true);
      expect(res2.nota.numero).toBe(2);
      expect(res2.nota.chave_acesso.slice(0, 2)).toBe('31');
    });

    it('deve emitir NF-e para MEI de Santa Catarina com cUF 42, autorizador SVRS e portal da SVRS', async () => {
      const res = await fiscalEngine.emitirNfe(usuarioScId, {
        destinatario_nome: 'Cliente Santa Catarina',
        destinatario_documento: '12345678901',
        itens: itemGenerico
      });

      expect(res.sucesso).toBe(true);
      expect(res.nota.chave_acesso.slice(0, 2)).toBe('42');
      expect(res.danfe).toContain('SVRS');
      expect(res.danfe).toContain('https://dfe-portal.svrs.rs.gov.br');
    });
  });

  describe('Emissão de NFC-e (Modelo 65) nos Estados MG e SC', () => {
    const itemVarejo = [
      {
        descricao: 'Café Expresso ou Produto de Varejo',
        quantidade: 1,
        valor_unitario: 15.00,
        ncm: '09012100',
        cfop: '5102',
        unidade: 'UN'
      }
    ];

    it('deve emitir NFC-e em MG com cUF 31, modelo 65 na chave e autorizador SEFAZ MG', async () => {
      const res = await fiscalEngine.emitirNfce(usuarioMgId, {
        itens: itemVarejo,
        destinatario_nome: 'Consumidor Balcão',
        forma_pagamento: 'PIX',
        gerar_caixa: true
      });

      expect(res.sucesso).toBe(true);
      expect(res.nota.tipo).toBe('NFCE');
      expect(res.nota.chave_acesso).toHaveLength(44);
      expect(res.nota.chave_acesso.slice(0, 2)).toBe('31');
      // Posições 20-22 da chave: modelo '65'
      expect(res.nota.chave_acesso.slice(20, 22)).toBe('65');
      expect(res.danfe).toContain('SEFAZ MG');
      expect(res.danfe).toContain('https://nfe.fazenda.mg.gov.br');
    });

    it('deve emitir NFC-e em SC com cUF 42, modelo 65 na chave e autorizador SVRS', async () => {
      const res = await fiscalEngine.emitirNfce(usuarioScId, {
        itens: itemVarejo,
        destinatario_nome: 'Consumidor Florianópolis',
        forma_pagamento: 'DINHEIRO'
      });

      expect(res.sucesso).toBe(true);
      expect(res.nota.tipo).toBe('NFCE');
      expect(res.nota.chave_acesso.slice(0, 2)).toBe('42');
      expect(res.nota.chave_acesso.slice(20, 22)).toBe('65');
      expect(res.danfe).toContain('SVRS');
      expect(res.danfe).toContain('https://dfe-portal.svrs.rs.gov.br');
    });
  });

  describe('Emissão de NFS-e (Padrão Nacional) com Código de Município IBGE do Estado', () => {
    it('deve emitir NFS-e para MEI de MG utilizando o código IBGE de Belo Horizonte (3106200)', async () => {
      const res = await fiscalEngine.emitirNfse(usuarioMgId, {
        destinatario_nome: 'Tomador Serviços BH',
        destinatario_documento: '12345678000195',
        discriminacao_servico: 'Serviço de consultoria local em BH',
        valor: 800.00,
        gerar_caixa: true
      });

      expect(res.sucesso).toBe(true);
      expect(res.nota.tipo).toBe('NFSE');
      expect(res.nota.codigo_municipio_ibge).toBe('3106200');
      // Chave NFS-e Nacional de 50 dígitos inicia com os 7 dígitos do código IBGE
      expect(res.nota.chave_acesso).toHaveLength(50);
      expect(res.nota.chave_acesso.slice(0, 7)).toBe('3106200');
      expect(res.xml).toContain('3106200');
      expect(res.danfe).toContain('DANFSE');
      expect(res.danfe).toContain('https://www.nfse.gov.br/consulta');
    });

    it('deve emitir NFS-e para MEI de SC utilizando o código IBGE de Florianópolis (4205407)', async () => {
      const res = await fiscalEngine.emitirNfse(usuarioScId, {
        destinatario_nome: 'Tomador Serviços Floripa',
        destinatario_documento: '12345678000195',
        discriminacao_servico: 'Serviço de suporte de TI',
        valor: 1200.00
      });

      expect(res.sucesso).toBe(true);
      expect(res.nota.codigo_municipio_ibge).toBe('4205407');
      expect(res.nota.chave_acesso.slice(0, 7)).toBe('4205407');
      expect(res.xml).toContain('4205407');
    });
  });

  describe('Cancelamento de Nota Fiscal e Estorno no Livro Caixa', () => {
    it('deve cancelar nota fiscal emitida e realizar estorno financeiro compensatório', async () => {
      // Emite NF-e para usuário MG com caixa
      const emissao = await fiscalEngine.emitirNfe(usuarioMgId, {
        destinatario_nome: 'Cliente para Cancelamento',
        destinatario_documento: '12345678901',
        itens: [
          {
            descricao: 'Item a ser cancelado',
            quantidade: 1,
            valor_unitario: 300.00,
            ncm: '19059090',
            cfop: '5102',
            unidade: 'UN'
          }
        ],
        gerar_caixa: true
      });

      const notaId = emissao.nota.id;
      const movId = emissao.nota.movimentacao_id;
      expect(movId).not.toBeNull();

      // Cancela a nota
      const cancelamento = await fiscalEngine.cancelarNotaFiscal(
        usuarioMgId,
        notaId,
        'Desistência da compra pelo comprador'
      );

      expect(cancelamento.sucesso).toBe(true);
      expect(cancelamento.nota.status).toBe('CANCELADA');
      expect(cancelamento.nota.motivo_cancelamento).toBe('Desistência da compra pelo comprador');

      // Verifica lançamento compensatório de SAÍDA no Livro Caixa
      const [estornoRows] = await pool.query(
        'SELECT * FROM movimentacoes WHERE usuario_id = ? AND tipo = "SAIDA" AND categoria = "Estorno Fiscal" ORDER BY id DESC LIMIT 1',
        [usuarioMgId]
      );
      expect(estornoRows.length).toBe(1);
      expect(Number(estornoRows[0].valor)).toBe(300.00);
      expect(estornoRows[0].descricao).toContain('Estorno de cancelamento da NF-e');
    });
  });
});

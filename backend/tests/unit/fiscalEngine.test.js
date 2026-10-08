const pool = require('../../src/config/database');
const fiscalEngine = require('../../src/services/fiscal/fiscalEngine');

describe('Motor Fiscal — Engine e Regras de Negócio (fiscalEngine)', () => {
  let usuario1Id;
  let usuario2Id;

  beforeAll(async () => {
    // Cria usuários de teste para isolamento multi-tenant
    const [u1] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['MEI Fiscal Um', `fiscal_user1_${Date.now()}@teste.com`, 'hash_senha']
    );
    usuario1Id = u1.insertId;

    const [u2] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['MEI Fiscal Dois', `fiscal_user2_${Date.now()}@teste.com`, 'hash_senha']
    );
    usuario2Id = u2.insertId;
  });

  afterAll(async () => {
    if (usuario1Id || usuario2Id) {
      const uIds = [usuario1Id, usuario2Id].filter(Boolean);
      await pool.query(
        'DELETE FROM nota_fiscal_itens WHERE nota_fiscal_id IN (SELECT id FROM notas_fiscais WHERE usuario_id IN (?))',
        [uIds]
      );
      await pool.query('DELETE FROM notas_fiscais WHERE usuario_id IN (?)', [uIds]);
      await pool.query('DELETE FROM movimentacoes WHERE usuario_id IN (?)', [uIds]);
      await pool.query('DELETE FROM usuarios WHERE id IN (?)', [uIds]);
    }
    await pool.end();
  });

  describe('emitirNfse (NFS-e Padrão Nacional)', () => {
    it('deve emitir NFS-e com numeração atômica sequencial e gerar XML/DANFE', async () => {
      const payload1 = {
        destinatario_nome: 'Empresa Alpha Ltda',
        destinatario_documento: '12345678000195',
        destinatario_email: 'alpha@empresa.com',
        discriminacao_servico: 'Desenvolvimento e consultoria de software web',
        valor: 1500.00,
        codigo_tributacao_nacional: '01.07.01',
        gerar_caixa: true
      };

      const res1 = await fiscalEngine.emitirNfse(usuario1Id, payload1);

      expect(res1.sucesso).toBe(true);
      expect(res1.nota).toBeDefined();
      expect(res1.nota.numero).toBe(1);
      expect(res1.nota.tipo).toBe('NFSE');
      expect(res1.nota.status).toBe('EMITIDA');
      expect(res1.nota.protocolo_autorizacao).toBeDefined();
      expect(res1.nota.movimentacao_id).not.toBeNull();
      expect(res1.xml).toContain('<DPS');
      expect(res1.xml).toContain('Desenvolvimento e consultoria de software web');
      expect(res1.danfe).toContain('DANFSE');

      // Verifica lançamento em movimentacoes
      const [movRows] = await pool.query('SELECT * FROM movimentacoes WHERE id = ?', [res1.nota.movimentacao_id]);
      expect(movRows.length).toBe(1);
      expect(movRows[0].tipo).toBe('ENTRADA');
      expect(Number(movRows[0].valor)).toBe(1500.00);

      // Emissão da segunda NFS-e deve incrementar atomicamente para numero = 2
      const payload2 = {
        destinatario_nome: 'Carlos Prestador',
        destinatario_documento: '12345678901',
        discriminacao_servico: 'Manutenção elétrica residencial',
        valor: 450.00,
        gerar_caixa: false
      };

      const res2 = await fiscalEngine.emitirNfse(usuario1Id, payload2);

      expect(res2.sucesso).toBe(true);
      expect(res2.nota.numero).toBe(2);
      expect(res2.nota.movimentacao_id).toBeNull();
    });

    it('deve rejeitar NFS-e com campos obrigatórios ausentes', async () => {
      await expect(
        fiscalEngine.emitirNfse(usuario1Id, {
          destinatario_nome: 'Cliente Sem Documento',
          discriminacao_servico: 'Serviço qualquer',
          valor: 100
        })
      ).rejects.toThrow('Documento do destinatário/tomador é obrigatório');

      await expect(
        fiscalEngine.emitirNfse(usuario1Id, {
          destinatario_nome: 'Cliente Sem Discriminacao',
          destinatario_documento: '12345678901',
          valor: 100
        })
      ).rejects.toThrow('Discriminação do serviço é obrigatória');

      await expect(
        fiscalEngine.emitirNfse(usuario1Id, {
          destinatario_nome: 'Cliente Valor Invalido',
          destinatario_documento: '12345678901',
          discriminacao_servico: 'Serviço',
          valor: 0
        })
      ).rejects.toThrow('Valor do serviço deve ser maior que zero');
    });
  });

  describe('emitirNfe (NF-e Modelo 55)', () => {
    it('deve emitir NF-e com itens, calcular totais e gerar chave de acesso de 44 dígitos', async () => {
      const payloadNfe = {
        destinatario_nome: 'Distribuidora Beta SA',
        destinatario_documento: '98765432000188',
        destinatario_endereco: 'Av Central, 100, Centro',
        natureza_operacao: 'Venda de mercadorias',
        itens: [
          {
            descricao: 'Teclado Mecânico RGB',
            quantidade: 2,
            valor_unitario: 150.00,
            ncm: '84716052',
            cfop: '5102',
            unidade: 'UN'
          },
          {
            descricao: 'Mouse Gamer 16000 DPI',
            quantidade: 1,
            valor_unitario: 100.00,
            ncm: '84716053',
            cfop: '5102',
            unidade: 'UN'
          }
        ],
        valor_desconto: 20.00,
        gerar_caixa: true
      };

      const res = await fiscalEngine.emitirNfe(usuario1Id, payloadNfe);

      expect(res.sucesso).toBe(true);
      expect(res.nota.tipo).toBe('NFE');
      expect(res.nota.numero).toBe(1);
      expect(res.nota.chave_acesso).toBeDefined();
      expect(res.nota.chave_acesso.length).toBe(44);
      expect(Number(res.nota.valor_total)).toBe(400.00); // 2*150 + 1*100
      expect(Number(res.nota.valor_desconto)).toBe(20.00);
      expect(Number(res.nota.valor_liquido)).toBe(380.00);
      expect(res.itens.length).toBe(2);
      expect(res.xml).toContain('<infNFe');
      expect(res.xml).toContain('Teclado Mecânico RGB');
      expect(res.danfe).toContain('DANFE');

      // Verifica itens gravados no banco
      const [itensBanco] = await pool.query(
        'SELECT * FROM nota_fiscal_itens WHERE nota_fiscal_id = ? ORDER BY numero_item ASC',
        [res.nota.id]
      );
      expect(itensBanco.length).toBe(2);
      expect(itensBanco[0].descricao).toBe('Teclado Mecânico RGB');
      expect(Number(itensBanco[0].valor_total)).toBe(300.00);
      expect(itensBanco[1].descricao).toBe('Mouse Gamer 16000 DPI');
      expect(Number(itensBanco[1].valor_total)).toBe(100.00);
    });

    it('deve rejeitar NF-e se a lista de itens estiver vazia', async () => {
      await expect(
        fiscalEngine.emitirNfe(usuario1Id, {
          destinatario_nome: 'Destinatario Sem Itens',
          destinatario_documento: '12345678000195',
          itens: []
        })
      ).rejects.toThrow('A NF-e requer ao menos um item');
    });
  });

  describe('emitirNfce (NFC-e Modelo 65)', () => {
    it('deve emitir NFC-e para consumidor com chave de acesso mod 65', async () => {
      const payloadNfce = {
        destinatario_documento: '11122233344',
        destinatario_nome: 'Consumidor Balcão',
        forma_pagamento: 'PIX',
        itens: [
          {
            descricao: 'Café Expresso Especial',
            quantidade: 2,
            valor_unitario: 8.50
          }
        ],
        gerar_caixa: true
      };

      const res = await fiscalEngine.emitirNfce(usuario1Id, payloadNfce);

      expect(res.sucesso).toBe(true);
      expect(res.nota.tipo).toBe('NFCE');
      expect(res.nota.chave_acesso.length).toBe(44);
      // Modelo deve ser 65 na chave
      expect(res.nota.chave_acesso.substring(20, 22)).toBe('65');
      expect(Number(res.nota.valor_total)).toBe(17.00);
      expect(res.xml).toContain('<mod>65</mod>');
      expect(res.danfe).toContain('DANFE NFC-e');
    });
  });

  describe('cancelarNotaFiscal', () => {
    it('deve rejeitar cancelamento com motivo inferior a 15 caracteres', async () => {
      const nf = await fiscalEngine.emitirNfse(usuario1Id, {
        destinatario_nome: 'Cancel Test',
        destinatario_documento: '12345678901',
        discriminacao_servico: 'Teste de cancelamento',
        valor: 200.00
      });

      await expect(
        fiscalEngine.cancelarNotaFiscal(usuario1Id, nf.nota.id, 'Motivo curto')
      ).rejects.toThrow('O motivo do cancelamento deve conter no mínimo 15 caracteres');
    });

    it('deve cancelar nota autorizada, registrar motivo e efetuar estorno financeiro', async () => {
      const nf = await fiscalEngine.emitirNfse(usuario1Id, {
        destinatario_nome: 'Cancel Test Sucesso',
        destinatario_documento: '12345678901',
        discriminacao_servico: 'Serviço para cancelamento',
        valor: 500.00,
        gerar_caixa: true
      });

      const motivo = 'Serviço cancelado pelo cliente antes do início da execução.';
      const resCanc = await fiscalEngine.cancelarNotaFiscal(usuario1Id, nf.nota.id, motivo);

      expect(resCanc.sucesso).toBe(true);
      expect(resCanc.nota.status).toBe('CANCELADA');
      expect(resCanc.nota.motivo_cancelamento).toBe(motivo);
      expect(resCanc.nota.data_cancelamento).toBeDefined();

      // Verifica estorno no Livro Caixa
      const [estornos] = await pool.query(
        `SELECT * FROM movimentacoes 
         WHERE usuario_id = ? AND tipo = 'SAIDA' AND categoria = 'Estorno Fiscal'
         ORDER BY id DESC LIMIT 1`,
        [usuario1Id]
      );
      expect(estornos.length).toBe(1);
      expect(Number(estornos[0].valor)).toBe(500.00);
      expect(estornos[0].descricao).toContain(`NFS-e #${nf.nota.numero}`);
    });

    it('não deve permitir cancelamento de nota já cancelada', async () => {
      const nf = await fiscalEngine.emitirNfse(usuario1Id, {
        destinatario_nome: 'Cancel Duplicado',
        destinatario_documento: '12345678901',
        discriminacao_servico: 'Teste duplicidade',
        valor: 100.00
      });

      const motivo = 'Cancelamento inicial válido com mais de quinze caracteres.';
      await fiscalEngine.cancelarNotaFiscal(usuario1Id, nf.nota.id, motivo);

      await expect(
        fiscalEngine.cancelarNotaFiscal(usuario1Id, nf.nota.id, 'Tentativa de cancelar novamente nota já cancelada.')
      ).rejects.toThrow('Esta nota fiscal já está cancelada');
    });

    it('deve bloquear cancelamento de nota de outro usuário (multi-tenant)', async () => {
      const nfUser1 = await fiscalEngine.emitirNfse(usuario1Id, {
        destinatario_nome: 'Nota do User 1',
        destinatario_documento: '12345678901',
        discriminacao_servico: 'Serviço confidencial',
        valor: 300.00
      });

      await expect(
        fiscalEngine.cancelarNotaFiscal(usuario2Id, nfUser1.nota.id, 'Tentativa indevida de cancelar nota de outro tenant.')
      ).rejects.toThrow('Nota fiscal não encontrada');
    });
  });

  describe('consultarNotaFiscal', () => {
    it('deve consultar nota fiscal por ID ou por chave de acesso com seus itens e DANFE', async () => {
      const nf = await fiscalEngine.emitirNfe(usuario1Id, {
        destinatario_nome: 'Consulta Teste',
        destinatario_documento: '12345678000195',
        itens: [
          {
            descricao: 'Produto de Teste para Consulta',
            quantidade: 1,
            valor_unitario: 80.00
          }
        ]
      });

      // Consulta por ID
      const resId = await fiscalEngine.consultarNotaFiscal(usuario1Id, nf.nota.id);
      expect(resId.sucesso).toBe(true);
      expect(resId.nota.id).toBe(nf.nota.id);
      expect(resId.itens.length).toBe(1);
      expect(resId.danfe).toContain('DANFE');

      // Consulta por Chave de Acesso
      const resChave = await fiscalEngine.consultarNotaFiscal(usuario1Id, nf.nota.chave_acesso);
      expect(resChave.sucesso).toBe(true);
      expect(resChave.nota.id).toBe(nf.nota.id);

      // Bloqueio multi-tenant
      await expect(
        fiscalEngine.consultarNotaFiscal(usuario2Id, nf.nota.id)
      ).rejects.toThrow('Nota fiscal não encontrada');
    });
  });
});

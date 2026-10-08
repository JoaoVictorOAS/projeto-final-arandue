const { gerarXmlNfse, gerarXmlNfe } = require('../../src/services/fiscal/geradorXmlFiscal');
const { gerarDanfeSimplificado } = require('../../src/services/fiscal/geradorDanfeSimplificado');

describe('Motor Fiscal — Gerador de XML e DANFE', () => {
  describe('gerarXmlNfse (Padrão Nacional DPS)', () => {
    const dadosEmitenteValidos = {
      cnpj: '12.345.678/0001-95',
      razaoSocial: 'João Silva Reformas & Manutenção MEI',
      nomeFantasia: 'Silva Serviços',
      inscricaoMunicipal: '987654',
      codigoMunicipioIbge: '3550308',
      municipio: 'São Paulo',
      uf: 'SP',
      logradouro: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cep: '01001-000',
      email: 'joao@silva.me',
      telefone: '11999998888'
    };

    const dadosTomadorValidos = {
      documento: '98.765.432/0001-10',
      nome: 'Empresa Tomadora de Serviços Ltda & Cia',
      email: 'financeiro@tomadora.com.br',
      telefone: '1133334444',
      endereco: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP'
    };

    const servicoValido = {
      discriminacao: 'Serviço de manutenção preventiva & reparo hidráulico <urgente>',
      codigoTributacaoNacional: '01.07.01',
      codigoMunicipioIbge: '3550308'
    };

    const valoresValidos = {
      valorServico: 450.00,
      desconto: 0.00,
      valorLiquido: 450.00
    };

    it('deve gerar XML DPS com tags canônicas Padrão Nacional', () => {
      const xml = gerarXmlNfse({
        dadosEmitente: dadosEmitenteValidos,
        dadosTomador: dadosTomadorValidos,
        servico: servicoValido,
        valores: valoresValidos,
        protocolo: 'NFS2026100800001',
        numero: 1,
        serie: 1
      });

      expect(xml).toBeDefined();
      expect(typeof xml).toBe('string');
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<DPS');
      expect(xml).toContain('</DPS>');
      expect(xml).toContain('<infDPS');
      expect(xml).toContain('<prestador>');
      expect(xml).toContain('<tomador>');
      expect(xml).toContain('<servico>');
      expect(xml).toContain('<valores>');
      expect(xml).toContain('<vServ>450.00</vServ>');
      expect(xml).toContain('<nDPS>1</nDPS>');
      expect(xml).toContain('<serie>1</serie>');
    });

    it('deve aplicar escape de caracteres especiais em textos no XML', () => {
      const xml = gerarXmlNfse({
        dadosEmitente: dadosEmitenteValidos,
        dadosTomador: dadosTomadorValidos,
        servico: servicoValido,
        valores: valoresValidos,
        protocolo: 'NFS2026100800001',
        numero: 1,
        serie: 1
      });

      // Checa escape de '&' e '<urgente>'
      expect(xml).toContain('Empresa Tomadora de Serviços Ltda &amp; Cia');
      expect(xml).toContain('Serviço de manutenção preventiva &amp; reparo hidráulico &lt;urgente&gt;');
      expect(xml).not.toContain('<urgente>');
    });

    it('deve incluir legenda obrigatória do MEI / SIMEI na NFS-e', () => {
      const xml = gerarXmlNfse({
        dadosEmitente: dadosEmitenteValidos,
        dadosTomador: dadosTomadorValidos,
        servico: servicoValido,
        valores: valoresValidos,
        protocolo: 'NFS2026100800001',
        numero: 1,
        serie: 1
      });

      expect(xml).toMatch(/SIMEI|SIMPLES NACIONAL/i);
      expect(xml).toMatch(/NÃO GERA DIREITO A CRÉDITO/i);
    });

    it('deve suportar tomador pessoa física com CPF (11 dígitos)', () => {
      const tomadorPf = {
        documento: '123.456.789-00',
        nome: 'Carlos Consumidor',
        email: 'carlos@email.com'
      };

      const xml = gerarXmlNfse({
        dadosEmitente: dadosEmitenteValidos,
        dadosTomador: tomadorPf,
        servico: servicoValido,
        valores: valoresValidos,
        protocolo: 'NFS2026100800002',
        numero: 2,
        serie: 1
      });

      expect(xml).toContain('<CPF>12345678900</CPF>');
      expect(xml).not.toContain('<CNPJ>12345678900</CNPJ>');
    });

    it('deve incluir protocolo de autorização no XML se informado', () => {
      const xml = gerarXmlNfse({
        dadosEmitente: dadosEmitenteValidos,
        dadosTomador: dadosTomadorValidos,
        servico: servicoValido,
        valores: valoresValidos,
        protocolo: 'PRONFSE99887766',
        numero: 3,
        serie: 1
      });

      expect(xml).toContain('PRONFSE99887766');
    });
  });

  describe('gerarXmlNfe (SEFAZ Layout v4.00 - Modelos 55 e 65)', () => {
    const chaveValida = '35261012345678000195550010000000011123456789';
    const dadosEmitente = {
      cnpj: '12.345.678/0001-95',
      razaoSocial: 'Padaria Artesanal Silva MEI',
      nomeFantasia: 'Padaria Silva',
      ie: 'ISENTO',
      codigoMunicipioIbge: '3550308',
      municipio: 'São Paulo',
      uf: 'SP',
      logradouro: 'Rua Augusta',
      numero: '500',
      bairro: 'Consolação',
      cep: '01305-000'
    };

    const dadosDestinatario = {
      documento: '987.654.321-00',
      nome: 'Maria Silva & Filhos',
      email: 'maria@email.com',
      logradouro: 'Rua Bela Cintra',
      numero: '100',
      bairro: 'Consolação',
      municipio: 'São Paulo',
      uf: 'SP',
      cep: '01415-000'
    };

    const itens = [
      {
        numero_item: 1,
        descricao: 'Pão Francês Especial <Fresco>',
        quantidade: 10,
        valor_unitario: 1.50,
        valor_total: 15.00,
        ncm: '19059090',
        cfop: '5102',
        unidade: 'KG',
        csosn: '102'
      },
      {
        numero_item: 2,
        descricao: 'Bolo de Cenoura com Chocolate',
        quantidade: 2,
        valor_unitario: 25.00,
        valor_total: 50.00,
        ncm: '19059090',
        cfop: '5102',
        unidade: 'UN',
        csosn: '102'
      }
    ];

    const totais = {
      valor_total: 65.00,
      valor_desconto: 5.00,
      valor_liquido: 60.00
    };

    it('deve gerar XML SEFAZ v4.00 para Modelo 55 com chave no atributo infNFe Id', () => {
      const xml = gerarXmlNfe({
        chave: chaveValida,
        dadosEmitente,
        dadosDestinatario,
        itens,
        totais,
        protocolo: '135260000012345',
        modelo: '55',
        serie: 1,
        numero: 1
      });

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<NFe xmlns="http://www.portalfiscal.inf.br/nfe">');
      expect(xml).toContain(`<infNFe Id="NFe${chaveValida}" versao="4.00">`);
      expect(xml).toContain('<mod>55</mod>');
      expect(xml).toContain('<serie>1</serie>');
      expect(xml).toContain('<nNF>1</nNF>');
    });

    it('deve incluir CRT 1 (Simples Nacional) e CSOSN 102 nos itens de MEI', () => {
      const xml = gerarXmlNfe({
        chave: chaveValida,
        dadosEmitente,
        dadosDestinatario,
        itens,
        totais,
        protocolo: '135260000012345',
        modelo: '55',
        serie: 1,
        numero: 1
      });

      expect(xml).toContain('<CRT>1</CRT>');
      expect(xml).toContain('<CSOSN>102</CSOSN>');
      expect(xml).toContain('<det nItem="1">');
      expect(xml).toContain('<det nItem="2">');
      expect(xml).toContain('<vProd>15.00</vProd>');
      expect(xml).toContain('<vProd>50.00</vProd>');
    });

    it('deve incluir legenda legal obrigatória do Simples Nacional em infAdic', () => {
      const xml = gerarXmlNfe({
        chave: chaveValida,
        dadosEmitente,
        dadosDestinatario,
        itens,
        totais,
        protocolo: '135260000012345',
        modelo: '55',
        serie: 1,
        numero: 1
      });

      expect(xml).toContain('<infAdic>');
      expect(xml).toContain('DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL');
      expect(xml).toContain('NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI / ICMS');
    });

    it('deve suportar NFC-e (Modelo 65) mesmo sem destinatário identificado', () => {
      const chaveNfce = '35261012345678000195650010000000011123456780';
      const xml = gerarXmlNfe({
        chave: chaveNfce,
        dadosEmitente,
        dadosDestinatario: null,
        itens: [itens[0]],
        totais: { valor_total: 15.00, valor_desconto: 0.00, valor_liquido: 15.00 },
        protocolo: '135260000099999',
        modelo: '65',
        serie: 1,
        numero: 1
      });

      expect(xml).toContain('<mod>65</mod>');
      expect(xml).toContain('<tpImp>4</tpImp>'); // DANFE NFC-e
      expect(xml).not.toContain('<dest></dest>');
    });

    it('deve escapar caracteres especiais nos itens e no destinatário', () => {
      const xml = gerarXmlNfe({
        chave: chaveValida,
        dadosEmitente,
        dadosDestinatario,
        itens,
        totais,
        protocolo: '135260000012345',
        modelo: '55',
        serie: 1,
        numero: 1
      });

      expect(xml).toContain('Maria Silva &amp; Filhos');
      expect(xml).toContain('Pão Francês Especial &lt;Fresco&gt;');
      expect(xml).not.toContain('<Fresco>');
    });
  });

  describe('gerarDanfeSimplificado', () => {
    const notaMock = {
      id: 42,
      tipo: 'NFE',
      serie: 1,
      numero: 123,
      chave_acesso: '35261012345678000195550010000000011123456789',
      protocolo_autorizacao: '135260000012345',
      data_emissao: '2026-10-08T14:30:00Z',
      destinatario_nome: 'Cliente Exemplo & Cia',
      destinatario_documento: '123.456.789-00',
      destinatario_endereco: 'Rua Exemplo, 45',
      valor_total: 100.00,
      valor_desconto: 10.00,
      valor_liquido: 90.00,
      natureza_operacao: 'Venda de mercadorias',
      status: 'EMITIDA'
    };

    const itensMock = [
      {
        numero_item: 1,
        descricao: 'Item 1 - Produto A',
        quantidade: 2,
        valor_unitario: 50.00,
        valor_total: 100.00,
        unidade: 'UN'
      }
    ];

    const emitenteMock = {
      nome: 'João da Silva MEI',
      documento: '12.345.678/0001-95',
      email: 'joao@mei.com',
      municipio: 'São Paulo',
      uf: 'SP'
    };

    it('deve gerar documento HTML semântico com dados da nota e emitente', () => {
      const html = gerarDanfeSimplificado({
        nota: notaMock,
        itens: itensMock,
        emitente: emitenteMock
      });

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('DANFE');
      expect(html).toContain('João da Silva MEI');
      expect(html).toContain('12.345.678/0001-95');
      expect(html).toContain('Cliente Exemplo &amp; Cia');
      expect(html).toContain('135260000012345');
    });

    it('deve formatar a chave de acesso em grupos de 4 dígitos', () => {
      const html = gerarDanfeSimplificado({
        nota: notaMock,
        itens: itensMock,
        emitente: emitenteMock
      });

      // 3526 1012 3456 7800 0195 5500 1000 0000 0111 2345 6789 (formatada em blocos de 4)
      expect(html).toContain('3526 1012 3456 7800 0195 5500 1000 0000 0111 2345 6789');
    });

    it('deve exibir tabela de itens com quantidades e valores', () => {
      const html = gerarDanfeSimplificado({
        nota: notaMock,
        itens: itensMock,
        emitente: emitenteMock
      });

      expect(html).toContain('Item 1 - Produto A');
      expect(html).toContain('100,00');
      expect(html).toContain('90,00');
    });

    it('deve incluir aviso legal do Simples Nacional e QR-Code/link de consulta', () => {
      const html = gerarDanfeSimplificado({
        nota: notaMock,
        itens: itensMock,
        emitente: emitenteMock
      });

      expect(html).toMatch(/SIMPLES NACIONAL|SIMEI/i);
      expect(html).toMatch(/consulta|autenticidade/i);
    });

    it('deve gerar DANFE para NFS-e adequadamente', () => {
      const notaNfse = {
        ...notaMock,
        tipo: 'NFSE',
        discriminacao_servico: 'Serviço de manutenção e suporte técnico',
        codigo_tributacao_nacional: '01.07.01'
      };

      const html = gerarDanfeSimplificado({
        nota: notaNfse,
        itens: [],
        emitente: emitenteMock
      });

      expect(html).toContain('NFS-e');
      expect(html).toContain('Serviço de manutenção e suporte técnico');
      expect(html).toContain('01.07.01');
    });
  });
});

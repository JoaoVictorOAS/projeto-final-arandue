const leitorXmlNfe = require('../../src/services/fiscal/leitorXmlNfe');

describe('Leitor e Parser de XML de NF-e (Compras e Insumos)', () => {
  const xmlExemploNfe = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35261012345678000195550010000001231234567890" versao="4.00">
      <ide>
        <nNF>123</nNF>
        <serie>1</serie>
        <dhEmi>2026-10-08T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000195</CNPJ>
        <xNome>Atacadista de Farinhas e Alimentos Ltda</xNome>
      </emit>
      <total>
        <ICMSTot>
          <vNF>150.00</vNF>
        </ICMSTot>
      </total>
      <det nItem="1">
        <prod>
          <cProd>FAR-01</cProd>
          <xProd>Farinha de Trigo Tipo 1</xProd>
          <uCom>KG</uCom>
          <qCom>10.0000</qCom>
          <vUnCom>5.0000</vUnCom>
          <vProd>50.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>FRG-99</cProd>
          <xProd>Peito de Frango Congelado</xProd>
          <uCom>KG</uCom>
          <qCom>5.0000</qCom>
          <vUnCom>20.0000</vUnCom>
          <vProd>100.00</vProd>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`;

  it('deve extrair emitente, número da nota, valor total e itens do XML', () => {
    const dados = leitorXmlNfe.parse(xmlExemploNfe);

    expect(dados.numero_documento).toBe('123');
    expect(dados.serie).toBe('1');
    expect(dados.fornecedor_nome).toBe('Atacadista de Farinhas e Alimentos Ltda');
    expect(dados.fornecedor_cnpj).toBe('12345678000195');
    expect(dados.valor_total).toBe(150.00);
    expect(dados.itens.length).toBe(2);

    expect(dados.itens[0]).toEqual({
      codigo_fornecedor: 'FAR-01',
      nome: 'Farinha de Trigo Tipo 1',
      unidade_original: 'KG',
      quantidade_original: 10,
      valor_unitario: 5.0,
      valor_total: 50.0
    });

    expect(dados.itens[1]).toEqual({
      codigo_fornecedor: 'FRG-99',
      nome: 'Peito de Frango Congelado',
      unidade_original: 'KG',
      quantidade_original: 5,
      valor_unitario: 20.0,
      valor_total: 100.0
    });
  });

  it('deve lançar erro caso o XML seja inválido ou vazio', () => {
    expect(() => leitorXmlNfe.parse('')).toThrow(/XML inválido ou vazio/);
    expect(() => leitorXmlNfe.parse('<invalido>teste</invalido>')).toThrow(/Não foram encontrados itens/);
  });
});

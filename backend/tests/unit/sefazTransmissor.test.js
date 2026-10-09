const sefazRegistry = require('../../src/services/fiscal/sefazRegistry');
const sefazTransmissor = require('../../src/services/fiscal/sefazTransmissor');

describe('sefazTransmissor - Mensageria SOAP e Transmissão Homologação SEFAZ', () => {
  it('deve mapear endpoints oficiais de homologação NFeAutorizacao4 para todas as 27 UFs', () => {
    const ufs = sefazRegistry.listarTodasUfs();
    ufs.forEach(u => {
      const urlWs = sefazRegistry.obterUrlWsHomologacao(u.uf);
      expect(urlWs).toBeDefined();
      expect(urlWs).toMatch(/^https:\/\//);
      expect(urlWs).toMatch(/nfe|sefaz/i);
    });
  });

  it('deve montar envelope SOAP 1.2 com nó enviNFe e envio síncrono (indSinc=1)', () => {
    const xmlMock = '<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe123"></infNFe></NFe>';
    const soap = sefazTransmissor.montarEnvelopeSoap(xmlMock);
    expect(soap).toContain('<soap12:Envelope');
    expect(soap).toContain('<nfeDadosMsg');
    expect(soap).toContain('<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">');
    expect(soap).toContain('<indSinc>1</indSinc>');
    expect(soap).toContain(xmlMock);
  });

  it('deve fazer parse da resposta de autorização com cStat 100 e montar xmlProc', () => {
    const respostaSoapSucesso = `<?xml version="1.0" encoding="utf-8"?>
      <soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
          <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
            <retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
              <tpAmb>2</tpAmb>
              <cStat>104</cStat>
              <xMotivo>Lote processado</xMotivo>
              <protNFe versao="4.00">
                <infProt>
                  <chNFe>29261012345678000195550010000000041426397280</chNFe>
                  <dhRecbto>2026-10-09T14:30:00-04:00</dhRecbto>
                  <nProt>129260000099999</nProt>
                  <cStat>100</cStat>
                  <xMotivo>Autorizado o uso da NF-e</xMotivo>
                </infProt>
              </protNFe>
            </retEnviNFe>
          </nfeResultMsg>
        </soap12:Body>
      </soap12:Envelope>`;

    const resultado = sefazTransmissor.processarRespostaSefaz(respostaSoapSucesso, '<NFe>mock</NFe>');
    expect(resultado.sucesso).toBe(true);
    expect(resultado.cStat).toBe('100');
    expect(resultado.nProt).toBe('129260000099999');
    expect(resultado.xmlProc).toContain('<nfeProc');
    expect(resultado.xmlProc).toContain('<protNFe');
  });

  it('deve capturar rejeições formais da SEFAZ com cStat e xMotivo claros', () => {
    const respostaSoapRejeicao = `
      <retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <cStat>104</cStat>
        <xMotivo>Lote processado</xMotivo>
        <protNFe versao="4.00">
          <infProt>
            <cStat>204</cStat>
            <xMotivo>Rejeicao: Duplicidade de NF-e [chNFe: 29261012345678000195550010000000041426397280]</xMotivo>
          </infProt>
        </protNFe>
      </retEnviNFe>`;

    const resultado = sefazTransmissor.processarRespostaSefaz(respostaSoapRejeicao, '<NFe>mock</NFe>');
    expect(resultado.sucesso).toBe(false);
    expect(resultado.cStat).toBe('204');
    expect(resultado.xMotivo).toContain('Duplicidade');
  });
});

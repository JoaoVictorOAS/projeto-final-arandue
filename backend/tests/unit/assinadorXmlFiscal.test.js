const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assinadorXmlFiscal = require('../../src/services/fiscal/assinadorXmlFiscal');

describe('assinadorXmlFiscal - Assinatura Digital W3C XML de NF-e', () => {
  let keyPem;
  let certPem;

  beforeAll(() => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cert-test-sign-'));
    const keyFile = path.join(tmpDir, 'key.pem');
    const certFile = path.join(tmpDir, 'cert.pem');

    try {
      execFileSync('openssl', ['genrsa', '-out', keyFile, '2048']);
      execFileSync('openssl', [
        'req', '-x509', '-new', '-key', keyFile, '-out', certFile, '-days', '365',
        '-subj', '/C=BR/O=MEI TESTE LTDA/CN=12345678000195:MEI TESTE LTDA'
      ]);
      keyPem = fs.readFileSync(keyFile, 'utf8');
      certPem = fs.readFileSync(certFile, 'utf8');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  const xmlExemploNfe = `<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe35261012345678000195550010000000011713800073" versao="4.00"><ide><cUF>35</cUF><nNF>1</nNF></ide><emit><CNPJ>12345678000195</CNPJ><xNome>MEI Teste</xNome></emit><dest><CNPJ>98765432000198</CNPJ><xNome>Cliente</xNome></dest><total><ICMSTot><vNF>100.00</vNF></ICMSTot></total></infNFe></NFe>`;

  it('deve assinar o XML da NF-e inserindo elemento Signature canônico com DigestValue e SignatureValue', () => {
    const xmlAssinado = assinadorXmlFiscal.assinarXmlNfe(xmlExemploNfe, keyPem, certPem);
    expect(xmlAssinado).toBeDefined();
    expect(xmlAssinado).toContain('<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">');
    expect(xmlAssinado).toContain('<SignedInfo>');
    expect(xmlAssinado).toContain('<SignatureValue>');
    expect(xmlAssinado).toContain('<X509Certificate>');
    expect(xmlAssinado).toContain('URI="#NFe35261012345678000195550010000000011713800073"');
  });

  it('deve validar criptograficamente a assinatura gerada usando o certificado público', () => {
    const xmlAssinado = assinadorXmlFiscal.assinarXmlNfe(xmlExemploNfe, keyPem, certPem);
    const valida = assinadorXmlFiscal.validarAssinaturaXml(xmlAssinado);
    expect(valida).toBe(true);
  });

  it('deve detectar alteração maliciosa no XML assinado e invalidar assinatura', () => {
    const xmlAssinado = assinadorXmlFiscal.assinarXmlNfe(xmlExemploNfe, keyPem, certPem);
    const xmlAdulterado = xmlAssinado.replace('<vNF>100.00</vNF>', '<vNF>999.00</vNF>');
    const valida = assinadorXmlFiscal.validarAssinaturaXml(xmlAdulterado);
    expect(valida).toBe(false);
  });
});

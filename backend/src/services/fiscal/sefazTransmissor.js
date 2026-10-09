const https = require('https');
const { URL } = require('url');
const sefazRegistry = require('./sefazRegistry');

/**
 * Monta o envelope SOAP 1.2 com o lote síncrono (indSinc=1) conforme MOC SEFAZ
 * @param {string} xmlNfeAssinado 
 * @returns {string}
 */
function montarEnvelopeSoap(xmlNfeAssinado) {
  // Limpa declaração <?xml ...?> do interior do envelope se presente
  const xmlSemDeclaracao = xmlNfeAssinado.replace(/<\?xml[^>]*\?>/gi, '').trim();

  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <idLote>1</idLote>
        <indSinc>1</indSinc>
        ${xmlSemDeclaracao}
      </enviNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`.trim();
}

/**
 * Processa a resposta SOAP/XML retornada pela SEFAZ
 * @param {string} respostaSoap 
 * @param {string} [xmlNfeOriginal] 
 * @returns {{ sucesso: boolean, cStat: string, xMotivo: string, nProt?: string, dhRecbto?: string, xmlProc?: string }}
 */
function processarRespostaSefaz(respostaSoap, xmlNfeOriginal = '') {
  if (!respostaSoap || typeof respostaSoap !== 'string') {
    return {
      sucesso: false,
      cStat: '999',
      xMotivo: 'Resposta da SEFAZ vazia ou inválida.',
    };
  }

  // Verifica erro no nível do envelope/lote (cStat geral do retEnviNFe)
  const cStatLoteMatch = respostaSoap.match(/<retEnviNFe[^>]*>[\s\S]*?<cStat>(\d+)<\/cStat>/i);
  const xMotivoLoteMatch = respostaSoap.match(/<retEnviNFe[^>]*>[\s\S]*?<xMotivo>([^<]+)<\/xMotivo>/i);

  // Verifica nó de protocolo individual <protNFe>
  const protNfeMatch = respostaSoap.match(/<protNFe[\s\S]*?<\/protNFe>/i);

  if (protNfeMatch) {
    const protNfeXml = protNfeMatch[0];
    const cStatProtMatch = protNfeXml.match(/<cStat>(\d+)<\/cStat>/i);
    const xMotivoProtMatch = protNfeXml.match(/<xMotivo>([^<]+)<\/xMotivo>/i);
    const nProtMatch = protNfeXml.match(/<nProt>(\d+)<\/nProt>/i);
    const dhRecbtoMatch = protNfeXml.match(/<dhRecbto>([^<]+)<\/dhRecbto>/i);

    const cStatProt = cStatProtMatch ? cStatProtMatch[1] : '999';
    const xMotivoProt = xMotivoProtMatch ? xMotivoProtMatch[1].trim() : '';
    const nProt = nProtMatch ? nProtMatch[1] : '';
    const dhRecbto = dhRecbtoMatch ? dhRecbtoMatch[1] : '';

    if (cStatProt === '100') {
      const xmlNfeLimpo = xmlNfeOriginal.replace(/<\?xml[^>]*\?>/gi, '').trim();
      const xmlProc = `<?xml version="1.0" encoding="utf-8"?><nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">${xmlNfeLimpo}${protNfeXml}</nfeProc>`;
      return {
        sucesso: true,
        cStat: '100',
        xMotivo: xMotivoProt || 'Autorizado o uso da NF-e',
        nProt,
        dhRecbto,
        xmlProc,
      };
    }

    return {
      sucesso: false,
      cStat: cStatProt,
      xMotivo: xMotivoProt || `Rejeição SEFAZ (cStat ${cStatProt})`,
    };
  }

  // Se não tem protNFe, verifica cStat do lote
  if (cStatLoteMatch) {
    const cStatLote = cStatLoteMatch[1];
    const xMotivoLote = xMotivoLoteMatch ? xMotivoLoteMatch[1].trim() : 'Falha no processamento do lote SEFAZ';

    return {
      sucesso: false,
      cStat: cStatLote,
      xMotivo: xMotivoLote,
    };
  }

  // Falha inesperada de XML / SOAP Fault
  const faultMatch = respostaSoap.match(/<soap12:Text[^>]*>([^<]+)<\/soap12:Text>/i) ||
                     respostaSoap.match(/<faultstring>([^<]+)<\/faultstring>/i);
  return {
    sucesso: false,
    cStat: '999',
    xMotivo: faultMatch ? faultMatch[1].trim() : 'Falha na comunicação com o servidor da SEFAZ',
  };
}

/**
 * Transmite a NF-e via WebService oficial com autenticação mTLS (Certificado A1)
 * @param {{ xmlAssinado: string, uf: string, pfxBuffer: Buffer, senha: string }} param0 
 */
async function transmitirNfeLote({ xmlAssinado, uf, pfxBuffer, senha }) {
  const urlWs = sefazRegistry.obterUrlWsHomologacao(uf);
  const envelope = montarEnvelopeSoap(xmlAssinado);
  const parsedUrl = new URL(urlWs);

  return new Promise((resolve) => {
    const agent = new https.Agent({
      pfx: pfxBuffer,
      passphrase: senha,
      rejectUnauthorized: false, // Homologação pode usar ACs intermediárias
    });

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method: 'POST',
      agent,
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(envelope, 'utf8'),
        'User-Agent': 'ArandueMEI-FiscalEngine/1.0',
      },
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const resultado = processarRespostaSefaz(data, xmlAssinado);
        resolve(resultado);
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        sucesso: false,
        cStat: '999',
        xMotivo: `Timeout (15s) de comunicação com o autorizador SEFAZ ${uf}.`,
      });
    });

    req.on('error', (err) => {
      resolve({
        sucesso: false,
        cStat: '999',
        xMotivo: `Falha de conexão com SEFAZ ${uf}: ${err.message}`,
      });
    });

    req.write(envelope);
    req.end();
  });
}

module.exports = {
  montarEnvelopeSoap,
  processarRespostaSefaz,
  transmitirNfeLote,
};

const crypto = require('crypto');

/**
 * Normaliza e canonicaliza o nó <infNFe> segundo W3C C14N
 * @param {string} rawInfNfe 
 * @returns {string}
 */
function canonicalizarInfNfe(rawInfNfe) {
  let inf = rawInfNfe.trim();

  // Garante que o namespace da SEFAZ esteja explícito se for herdado do pai <NFe>
  if (!inf.includes('xmlns=')) {
    inf = inf.replace(/^<infNFe(\s+|>)/, '<infNFe xmlns="http://www.portalfiscal.inf.br/nfe"$1');
  }

  // Remove quebras de linha supérfluas e espaços entre tags
  inf = inf.replace(/>\s+</g, '><').trim();

  return inf;
}

/**
 * Constrói a representação canônica do nó <SignedInfo>
 * @param {string} infNfeId 
 * @param {string} digestValue 
 * @returns {string}
 */
function construirSignedInfoCanonico(infNfeId, digestValue) {
  return `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod><Reference URI="#${infNfeId}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></DigestMethod><DigestValue>${digestValue}</DigestValue></Reference></SignedInfo>`;
}

/**
 * Assina digitalmente uma NF-e XML conforme padrão W3C XML Signature e MOC SEFAZ
 * @param {string} xmlNfe 
 * @param {string} privateKeyPem 
 * @param {string} certificatePem 
 * @returns {string}
 */
function assinarXmlNfe(xmlNfe, privateKeyPem, certificatePem) {
  if (!xmlNfe || !privateKeyPem || !certificatePem) {
    throw new Error('Parâmetros obrigatórios para assinatura digital ausentes.');
  }

  // 1. Localiza o nó <infNFe ...>...</infNFe> e extrai seu Id
  const infNfeMatch = xmlNfe.match(/<infNFe[^>]*Id="([^"]+)"[^>]*>[\s\S]*?<\/infNFe>/);
  if (!infNfeMatch) {
    throw new Error('Nó <infNFe Id="..."> não encontrado no XML da NF-e.');
  }

  const rawInfNfe = infNfeMatch[0];
  const infNfeId = infNfeMatch[1];

  // 2. Canonicalização C14N e Digest SHA-1
  const canonicalInfNfe = canonicalizarInfNfe(rawInfNfe);
  const digestValue = crypto
    .createHash('sha1')
    .update(canonicalInfNfe, 'utf8')
    .digest('base64');

  // 3. Monta e canonicaliza o <SignedInfo>
  const canonicalSignedInfo = construirSignedInfoCanonico(infNfeId, digestValue);

  // 4. Assina o <SignedInfo> com RSA-SHA1 usando a chave privada
  const signer = crypto.createSign('RSA-SHA1');
  signer.update(canonicalSignedInfo, 'utf8');
  signer.end();
  const signatureValue = signer.sign(privateKeyPem, 'base64');

  // 5. Extrai a chave pública do certificado em formato limpo base64 (sem cabeçalhos)
  const certClean = certificatePem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');

  // 6. Monta o elemento completo <Signature>
  const signedInfoEmbedded = canonicalSignedInfo.replace(
    '<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">',
    '<SignedInfo>'
  );
  const signatureXml = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfoEmbedded}<SignatureValue>${signatureValue}</SignatureValue><KeyInfo><X509Data><X509Certificate>${certClean}</X509Certificate></X509Data></KeyInfo></Signature>`;

  // 7. Anexa a assinatura digital logo antes do fechamento </NFe>
  if (!xmlNfe.includes('</NFe>')) {
    throw new Error('Tag de fechamento </NFe> não encontrada no documento.');
  }

  return xmlNfe.replace('</NFe>', `${signatureXml}</NFe>`);
}

/**
 * Valida a assinatura digital criptográfica do XML
 * @param {string} xmlAssinado 
 * @returns {boolean}
 */
function validarAssinaturaXml(xmlAssinado) {
  try {
    const infNfeMatch = xmlAssinado.match(/<infNFe[^>]*Id="([^"]+)"[^>]*>[\s\S]*?<\/infNFe>/);
    if (!infNfeMatch) return false;

    const rawInfNfe = infNfeMatch[0];
    const infNfeId = infNfeMatch[1];

    const digestMatch = xmlAssinado.match(/<DigestValue>([^<]+)<\/DigestValue>/);
    const signatureMatch = xmlAssinado.match(/<SignatureValue>([^<]+)<\/SignatureValue>/);
    const certMatch = xmlAssinado.match(/<X509Certificate>([^<]+)<\/X509Certificate>/);

    if (!digestMatch || !signatureMatch || !certMatch) return false;

    const digestNoXml = digestMatch[1];
    const signatureValue = signatureMatch[1];
    const certBase64 = certMatch[1];

    // 1. Verifica integridade do conteúdo (DigestValue)
    const canonicalInfNfe = canonicalizarInfNfe(rawInfNfe);
    const digestCalculado = crypto
      .createHash('sha1')
      .update(canonicalInfNfe, 'utf8')
      .digest('base64');

    if (digestCalculado !== digestNoXml) {
      return false;
    }

    // 2. Reconstrói o <SignedInfo>
    const canonicalSignedInfo = construirSignedInfoCanonico(infNfeId, digestNoXml);

    // 3. Monta o PEM do certificado
    const certPem = `-----BEGIN CERTIFICATE-----\n${certBase64.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;

    // 4. Valida a assinatura com a chave pública
    const verifier = crypto.createVerify('RSA-SHA1');
    verifier.update(canonicalSignedInfo, 'utf8');
    verifier.end();

    return verifier.verify(certPem, signatureValue, 'base64');
  } catch {
    return false;
  }
}

module.exports = {
  assinarXmlNfe,
  validarAssinaturaXml,
  canonicalizarInfNfe,
  construirSignedInfoCanonico,
};

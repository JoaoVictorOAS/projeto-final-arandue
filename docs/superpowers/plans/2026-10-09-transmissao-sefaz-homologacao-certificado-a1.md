# Transmissão Oficial à SEFAZ de Homologação com Certificado Digital A1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o subsistema de Certificado Digital ICP-Brasil A1 (`.pfx`), assinatura digital W3C XML e transmissão SOAP mTLS síncrona aos WebServices de Homologação da SEFAZ para todas as 27 UFs do Brasil, mantendo o emulador local autônomo como fallback híbrido e paridade total REST ↔ MCP.

**Architecture:** O backend armazena o arquivo `.pfx` e sua senha cifrados com AES-256-GCM na tabela `mei_configuracoes`. Na emissão de NF-e, se o certificado estiver ativo, o motor fiscal assina o XML via RSA-SHA1/C14N e transmite via envelope SOAP 1.2 com `https.Agent` mTLS para o autorizador SEFAZ correspondente (SP, BA, MG, PR, GO, MT, MS, AM, SVRS ou SVAN). Se não houver certificado, opera no emulador local.

**Tech Stack:** Node.js v26 nativo (`crypto`, `https`, `child_process`), Express, MySQL (`mysql2`), React 18, Tailwind CSS, Python FastAPI (MCP Server), Pytest, Jest.

**Spec:** `docs/superpowers/specs/2026-10-09-transmissao-sefaz-homologacao-certificado-a1-design.md`

## Global Constraints

- Isolamento absoluto por `usuario_id` extraído do JWT (nenhum dado de certificado ou tenant exposto em payload do cliente).
- Criptografia simétrica AES-256-GCM para arquivo `.pfx` e senha em repouso no MySQL.
- Paridade total API REST ↔ MCP Server (`server.py`) conforme regra mestra de `GEMINI.md`.
- Assinatura XML conforme W3C XML Signature e MOC SEFAZ (Digest SHA-1, Signature RSA-SHA1, Enveloped, C14N).
- Regra de Homologação da SEFAZ: Destinatário com nome `"NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"` em ambiente de homologação para evitar Rejeição 222.
- Zero quebra de regressão em testes existentes de backend, frontend e AI-service.

---

### Task 1: Banco de Dados e Serviço de Certificado A1 (`certificadoService.js`)

**Files:**
- Create: `backend/src/database/migrations/008_certificado_digital_mei.sql`
- Create: `backend/src/services/fiscal/certificadoService.js`
- Test: `backend/tests/unit/certificadoService.test.js`
- Modify: `backend/src/database/schema.sql`

**Interfaces:**
- Produces:
  - `certificadoService.analisarCertificadoPfx(buffer, senha)` -> `{ cnpj, razaoSocial, validoAte, validoDe, privateKeyPem, certificatePem, certCleanBase64 }`
  - `certificadoService.criptografar(textoOuBuffer)` -> `{ iv, authTag, content }`
  - `certificadoService.decifrar(payloadEncrypted)` -> `Buffer | string`
  - `certificadoService.salvarCertificado(usuarioId, { buffer, senha, nomeArquivo })` -> `{ cnpj, razaoSocial, validoAte }`
  - `certificadoService.obterCertificadoDecifrado(usuarioId)` -> `{ pfxBuffer, senha, dados } | null`
  - `certificadoService.obterStatusCertificado(usuarioId)` -> `{ configurado, cnpj, razaoSocial, validoAte, diasRestantes, ativo }`
  - `certificadoService.removerCertificado(usuarioId)` -> `boolean`
  - `certificadoService.alternarTransmissao(usuarioId, ativo)` -> `boolean`

- [ ] **Step 1: Write the failing unit test for `certificadoService`**

```javascript
// backend/tests/unit/certificadoService.test.js
const { execFileSync } = require('child_process');
const certificadoService = require('../../src/services/fiscal/certificadoService');
const pool = require('../../src/config/database');

describe('certificadoService - Gestão e Criptografia de Certificado A1', () => {
  let pfxTesteBuffer;
  const senhaTeste = 'teste123';
  let usuarioId;

  beforeAll(async () => {
    // Gera par de chaves e PFX de teste em memória usando openssl
    const keyPem = execFileSync('openssl', ['genrsa', '2048']);
    const certPem = execFileSync('openssl', [
      'req', '-x509', '-new', '-key', '/dev/stdin', '-days', '365',
      '-subj', '/C=BR/O=MEI TESTE LTDA/CN=12345678000195:MEI TESTE LTDA'
    ], { input: keyPem });

    pfxTesteBuffer = execFileSync('openssl', [
      'pkcs12', '-export', '-inkey', '/dev/stdin', '-in', '/dev/stdin', '-passout', `pass:${senhaTeste}`
    ], { input: Buffer.concat([keyPem, certPem]) });

    const [u] = await pool.query('INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)', [
      'MEI Cert Teste', `cert_${Date.now()}@teste.com`, 'hash'
    ]);
    usuarioId = u.insertId;

    await pool.query(
      'INSERT INTO mei_configuracoes (usuario_id, razao_social, cnpj, cep, logradouro, numero, bairro, municipio, uf, codigo_municipio_ibge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [usuarioId, 'MEI Teste', '12345678000195', '01001000', 'Rua A', '1', 'Centro', 'SP', 'SP', '3550308']
    );
  });

  afterAll(async () => {
    if (usuarioId) {
      await pool.query('DELETE FROM mei_configuracoes WHERE usuario_id = ?', [usuarioId]);
      await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
    }
  });

  it('deve extrair metadados e validar senha de um arquivo PFX válido', () => {
    const dados = certificadoService.analisarCertificadoPfx(pfxTesteBuffer, senhaTeste);
    expect(dados).toBeDefined();
    expect(dados.cnpj).toBe('12345678000195');
    expect(dados.razaoSocial).toContain('MEI TESTE');
    expect(dados.validoAte).toBeInstanceOf(Date);
    expect(dados.privateKeyPem).toContain('BEGIN PRIVATE KEY');
    expect(dados.certificatePem).toContain('BEGIN CERTIFICATE');
  });

  it('deve lançar erro ao fornecer senha incorreta', () => {
    expect(() => {
      certificadoService.analisarCertificadoPfx(pfxTesteBuffer, 'senha_errada');
    }).toThrow(/senha|password|mac verify/i);
  });

  it('deve criptografar e decifrar buffers com AES-256-GCM', () => {
    const dadoOriginal = Buffer.from('conteudo super secreto do certificado');
    const cifrado = certificadoService.criptografar(dadoOriginal);
    expect(cifrado.iv).toBeDefined();
    expect(cifrado.authTag).toBeDefined();
    expect(cifrado.content).toBeDefined();

    const decifrado = certificadoService.decifrar(cifrado);
    expect(decifrado.toString()).toBe('conteudo super secreto do certificado');
  });

  it('deve salvar certificado cifrado no banco e consultar status sem vazar segredos', async () => {
    const salvo = await certificadoService.salvarCertificado(usuarioId, {
      buffer: pfxTesteBuffer,
      senha: senhaTeste,
      nomeArquivo: 'certificado_mei.pfx'
    });
    expect(salvo.cnpj).toBe('12345678000195');

    const status = await certificadoService.obterStatusCertificado(usuarioId);
    expect(status.configurado).toBe(true);
    expect(status.cnpj).toBe('12345678000195');
    expect(status.ativo).toBe(true);
    expect(status).not.toHaveProperty('senha');
    expect(status).not.toHaveProperty('pfx');

    const decifrado = await certificadoService.obterCertificadoDecifrado(usuarioId);
    expect(decifrado).toBeDefined();
    expect(decifrado.senha).toBe(senhaTeste);
    expect(Buffer.isBuffer(decifrado.pfxBuffer)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test tests/unit/certificadoService.test.js`
Expected: FAIL with "Cannot find module '.../certificadoService'"

- [ ] **Step 3: Create migration `008_certificado_digital_mei.sql` and run on local MySQL**

```sql
-- backend/src/database/migrations/008_certificado_digital_mei.sql
ALTER TABLE mei_configuracoes
    ADD COLUMN certificado_pfx_encrypted LONGTEXT NULL AFTER serie_nfce,
    ADD COLUMN certificado_senha_encrypted VARCHAR(500) NULL AFTER certificado_pfx_encrypted,
    ADD COLUMN certificado_nome_arquivo VARCHAR(255) NULL AFTER certificado_senha_encrypted,
    ADD COLUMN certificado_cnpj VARCHAR(14) NULL AFTER certificado_nome_arquivo,
    ADD COLUMN certificado_razao_social VARCHAR(255) NULL AFTER certificado_cnpj,
    ADD COLUMN certificado_valido_ate DATETIME NULL AFTER certificado_razao_social,
    ADD COLUMN transmissao_sefaz_ativa TINYINT(1) NOT NULL DEFAULT 1 AFTER certificado_valido_ate;
```

Execute migration via node against local database pool, and update `backend/src/database/schema.sql`.

- [ ] **Step 4: Implement `backend/src/services/fiscal/certificadoService.js`**

Implement cryptographic AES-256-GCM encryption/decryption, openssl PKCS#12 extraction via child_process stdio pipe, X.509 metadata parsing, and database repository operations.

- [ ] **Step 5: Run unit test to verify it passes**

Run: `npm --prefix backend test tests/unit/certificadoService.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/database/migrations/008_certificado_digital_mei.sql backend/src/database/schema.sql backend/src/services/fiscal/certificadoService.js backend/tests/unit/certificadoService.test.js
git commit -m "feat(fiscal): adiciona certificadoService com criptografia AES-256-GCM e migration 008"
```

---

### Task 2: Assinador Digital W3C XML para NF-e (`assinadorXmlFiscal.js`)

**Files:**
- Create: `backend/src/services/fiscal/assinadorXmlFiscal.js`
- Test: `backend/tests/unit/assinadorXmlFiscal.test.js`

**Interfaces:**
- Produces:
  - `assinadorXmlFiscal.assinarXmlNfe(xmlNfeString, privateKeyPem, certificatePem)` -> `string` (XML com `<Signature>`)
  - `assinadorXmlFiscal.validarAssinaturaXml(xmlAssinadoString)` -> `boolean`

- [ ] **Step 1: Write the failing unit test for `assinadorXmlFiscal`**

```javascript
// backend/tests/unit/assinadorXmlFiscal.test.js
const { execFileSync } = require('child_process');
const assinadorXmlFiscal = require('../../src/services/fiscal/assinadorXmlFiscal');

describe('assinadorXmlFiscal - Assinatura Digital W3C XML de NF-e', () => {
  let keyPem;
  let certPem;

  beforeAll(() => {
    keyPem = execFileSync('openssl', ['genrsa', '2048']).toString();
    certPem = execFileSync('openssl', [
      'req', '-x509', '-new', '-key', '/dev/stdin', '-days', '365',
      '-subj', '/C=BR/O=MEI TESTE LTDA/CN=12345678000195:MEI TESTE LTDA'
    ], { input: keyPem }).toString();
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test tests/unit/assinadorXmlFiscal.test.js`
Expected: FAIL with "Cannot find module '.../assinadorXmlFiscal'"

- [ ] **Step 3: Implement `backend/src/services/fiscal/assinadorXmlFiscal.js`**

Implement XML C14N canonicalization of `<infNFe>`, SHA-1 Digest, RSA-SHA1 signature of `<SignedInfo>`, extraction of raw base64 cert, and placement inside `<NFe>`. Also implement `validarAssinaturaXml`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix backend test tests/unit/assinadorXmlFiscal.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/fiscal/assinadorXmlFiscal.js backend/tests/unit/assinadorXmlFiscal.test.js
git commit -m "feat(fiscal): implementa assinadorXmlFiscal com W3C XML Signature e RSA-SHA1"
```

---

### Task 3: Mapeamento de WebServices SEFAZ Homologação e Transmissor SOAP mTLS (`sefazTransmissor.js`)

**Files:**
- Modify: `backend/src/services/fiscal/sefazRegistry.js`
- Create: `backend/src/services/fiscal/sefazTransmissor.js`
- Test: `backend/tests/unit/sefazTransmissor.test.js`

**Interfaces:**
- Consumes:
  - `sefazRegistry.obterDadosSefazPorUf(uf)`
- Produces:
  - `sefazRegistry.obterUrlWsHomologacao(uf)` -> `string` (URL SOAP do NFeAutorizacao4 de homologação)
  - `sefazTransmissor.montarEnvelopeSoap(xmlNfeAssinado)` -> `string` (Envelope SOAP 1.2 com enviNFe indSinc=1)
  - `sefazTransmissor.transmitirNfeLote({ xmlAssinado, uf, pfxBuffer, senha })` -> `{ sucesso: true, cStat: '100', xMotivo, nProt, dhRecbto, xmlProc } | { sucesso: false, cStat, xMotivo }`

- [ ] **Step 1: Write the failing unit test for `sefazTransmissor`**

```javascript
// backend/tests/unit/sefazTransmissor.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test tests/unit/sefazTransmissor.test.js`
Expected: FAIL with missing functions

- [ ] **Step 3: Update `sefazRegistry.js` with `obterUrlWsHomologacao` for all 27 UFs**

Add `wsHomologacao` to all 10 autorizadores (SVRS, SP, BA, MG, PR, GO, MT, MS, AM, SVAN) and export `obterUrlWsHomologacao(uf)`.

- [ ] **Step 4: Implement `backend/src/services/fiscal/sefazTransmissor.js`**

Implement `montarEnvelopeSoap`, `processarRespostaSefaz` e `transmitirNfeLote` usando Node.js `https.request` com `agent` mTLS e timeout de 15s.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm --prefix backend test tests/unit/sefazTransmissor.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/fiscal/sefazRegistry.js backend/src/services/fiscal/sefazTransmissor.js backend/tests/unit/sefazTransmissor.test.js
git commit -m "feat(fiscal): adiciona endpoints de homologacao no sefazRegistry e sefazTransmissor SOAP mTLS"
```

---

### Task 4: Integração no Motor Fiscal (`fiscalEngine.js`) com Modo Híbrido Automático

**Files:**
- Modify: `backend/src/services/fiscal/fiscalEngine.js`
- Test: `backend/tests/integration/fiscalEngineHomologacao.test.js`

**Interfaces:**
- Consumes:
  - `certificadoService.obterCertificadoDecifrado(usuarioId)`
  - `assinadorXmlFiscal.assinarXmlNfe(...)`
  - `sefazTransmissor.transmitirNfeLote(...)`
- Produces:
  - `fiscalEngine.emitirNfe(usuarioId, payload)` (emite com certificado A1 e SEFAZ real se ativo; ou via emulador local se inativo/ausente)

- [ ] **Step 1: Write integration test for `fiscalEngine` with and without Certificate A1**

```javascript
// backend/tests/integration/fiscalEngineHomologacao.test.js
const pool = require('../../src/config/database');
const fiscalEngine = require('../../src/services/fiscal/fiscalEngine');
const sefazTransmissor = require('../../src/services/fiscal/sefazTransmissor');
const { execFileSync } = require('child_process');
const certificadoService = require('../../src/services/fiscal/certificadoService');

describe('Motor Fiscal — Emissão em Homologação com Modo Híbrido Automático', () => {
  let userSemCertId;
  let userComCertId;

  beforeAll(async () => {
    const [u1] = await pool.query('INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)', [
      'MEI Sem Cert', `sem_cert_${Date.now()}@teste.com`, 'hash'
    ]);
    userSemCertId = u1.insertId;

    const [u2] = await pool.query('INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)', [
      'MEI Com Cert', `com_cert_${Date.now()}@teste.com`, 'hash'
    ]);
    userComCertId = u2.insertId;

    // Configuração para usuário com certificado
    await pool.query(
      'INSERT INTO mei_configuracoes (usuario_id, razao_social, cnpj, cep, logradouro, numero, bairro, municipio, uf, codigo_municipio_ibge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userComCertId, 'Padaria Baiana MEI', '12345678000195', '40000000', 'Rua Chile', '10', 'Centro', 'Salvador', 'BA', '2927408']
    );

    // Gera e salva certificado A1 de teste
    const keyPem = execFileSync('openssl', ['genrsa', '2048']);
    const certPem = execFileSync('openssl', [
      'req', '-x509', '-new', '-key', '/dev/stdin', '-days', '365',
      '-subj', '/C=BR/O=Padaria Baiana MEI/CN=12345678000195:Padaria Baiana MEI'
    ], { input: keyPem });
    const pfx = execFileSync('openssl', [
      'pkcs12', '-export', '-inkey', '/dev/stdin', '-in', '/dev/stdin', '-passout', 'pass:123456'
    ], { input: Buffer.concat([keyPem, certPem]) });

    await certificadoService.salvarCertificado(userComCertId, {
      buffer: pfx,
      senha: '123456',
      nomeArquivo: 'certificado.pfx'
    });
  });

  afterAll(async () => {
    const ids = [userSemCertId, userComCertId].filter(Boolean);
    if (ids.length > 0) {
      await pool.query('DELETE FROM nota_fiscal_itens WHERE nota_fiscal_id IN (SELECT id FROM notas_fiscais WHERE usuario_id IN (?))', [ids]);
      await pool.query('DELETE FROM notas_fiscais WHERE usuario_id IN (?)', [ids]);
      await pool.query('DELETE FROM mei_configuracoes WHERE usuario_id IN (?)', [ids]);
      await pool.query('DELETE FROM usuarios WHERE id IN (?)', [ids]);
    }
  });

  it('deve emitir nota fiscal no Emulador Local quando o usuário não tiver certificado A1', async () => {
    const res = await fiscalEngine.emitirNfe(userSemCertId, {
      destinatario_nome: 'Cliente Balcao',
      destinatario_documento: '12345678901',
      itens: [{ descricao: 'Pão Francês', quantidade: 1, valor_unitario: 10.00, ncm: '19059090', cfop: '5102' }]
    });

    expect(res.sucesso).toBe(true);
    expect(res.nota.status).toBe('EMITIDA');
    expect(res.modo_emissao).toBe('SIMULACAO_LOCAL');
  });

  it('deve assinar e transmitir à SEFAZ de Homologação quando o usuário tiver Certificado A1 ativo', async () => {
    // Spy no transmissor SEFAZ para validar envio com mock de resposta positiva do governo
    jest.spyOn(sefazTransmissor, 'transmitirNfeLote').mockResolvedValueOnce({
      sucesso: true,
      cStat: '100',
      xMotivo: 'Autorizado o uso da NF-e',
      nProt: '129260000088888',
      dhRecbto: '2026-10-09T14:40:00-04:00',
      xmlProc: '<nfeProc><NFe>mock</NFe><protNFe><nProt>129260000088888</nProt></protNFe></nfeProc>'
    });

    const res = await fiscalEngine.emitirNfe(userComCertId, {
      destinatario_nome: 'Cliente Bahia',
      destinatario_documento: '12345678901',
      itens: [{ descricao: 'Acarajé Especial', quantidade: 2, valor_unitario: 25.00, ncm: '19059090', cfop: '5102' }]
    });

    expect(res.sucesso).toBe(true);
    expect(res.nota.protocolo_autorizacao).toBe('129260000088888');
    expect(res.modo_emissao).toBe('SEFAZ_HOMOLOGACAO_REAL');
    expect(res.danfe).toContain('129260000088888');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test tests/integration/fiscalEngineHomologacao.test.js`
Expected: FAIL

- [ ] **Step 3: Update `fiscalEngine.js` with Hybrid Mode logic**

In `emitirNfe`:
1. Check `certificadoService.obterCertificadoDecifrado(usuarioId)`.
2. If active, sign with `assinadorXmlFiscal.assinarXmlNfe`, invoke `sefazTransmissor.transmitirNfeLote`.
3. If successful, record `nProt` from SEFAZ, set `modo_emissao = 'SEFAZ_HOMOLOGACAO_REAL'`.
4. If without certificate or fallback, execute local simulation emulator.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix backend test tests/integration/fiscalEngineHomologacao.test.js`
Expected: PASS

- [ ] **Step 5: Run full backend test suite to guarantee zero regression**

Run: `npm run test:backend`
Expected: 100% PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/fiscal/fiscalEngine.js backend/tests/integration/fiscalEngineHomologacao.test.js
git commit -m "feat(fiscal): integra emissao hibrida na fiscalEngine com transmissao sefaz homologacao"
```

---

### Task 5: Endpoints REST de Gestão do Certificado (`configuracoesController.js` e `configuracoesRoutes.js`)

**Files:**
- Modify: `backend/src/controllers/configuracoesController.js`
- Modify: `backend/src/routes/configuracoesRoutes.js`
- Test: `backend/tests/integration/certificadoApi.test.js`

**Interfaces:**
- Produces:
  - `POST /api/configuracoes/certificado` (Upload `.pfx` com `senha`)
  - `GET /api/configuracoes/certificado` (Consulta status sem vazar dados sigilosos)
  - `DELETE /api/configuracoes/certificado` (Desinstala certificado)
  - `PATCH /api/configuracoes/certificado/toggle` (Alterna `transmissao_sefaz_ativa`)

- [ ] **Step 1: Write integration tests for certificate endpoints**

```javascript
// backend/tests/integration/certificadoApi.test.js
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');
const jwt = require('jsonwebtoken');
const { execFileSync } = require('child_process');

describe('API REST — Gestão de Certificado Digital A1 (/api/configuracoes/certificado)', () => {
  let token;
  let usuarioId;
  let pfxBuffer;

  beforeAll(async () => {
    const [u] = await pool.query('INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)', [
      'MEI API Cert', `api_cert_${Date.now()}@teste.com`, 'hash'
    ]);
    usuarioId = u.insertId;
    token = jwt.sign({ id: usuarioId, email: 'api_cert@teste.com' }, process.env.JWT_SECRET || 'secret');

    await pool.query(
      'INSERT INTO mei_configuracoes (usuario_id, razao_social, cnpj, cep, logradouro, numero, bairro, municipio, uf, codigo_municipio_ibge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [usuarioId, 'MEI API', '12345678000195', '01001000', 'Rua A', '1', 'Centro', 'SP', 'SP', '3550308']
    );

    const keyPem = execFileSync('openssl', ['genrsa', '2048']);
    const certPem = execFileSync('openssl', [
      'req', '-x509', '-new', '-key', '/dev/stdin', '-days', '365',
      '-subj', '/C=BR/O=MEI API/CN=12345678000195:MEI API'
    ], { input: keyPem });
    pfxBuffer = execFileSync('openssl', [
      'pkcs12', '-export', '-inkey', '/dev/stdin', '-in', '/dev/stdin', '-passout', 'pass:senha123'
    ], { input: Buffer.concat([keyPem, certPem]) });
  });

  afterAll(async () => {
    if (usuarioId) {
      await pool.query('DELETE FROM mei_configuracoes WHERE usuario_id = ?', [usuarioId]);
      await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
    }
  });

  it('GET /api/configuracoes/certificado deve retornar configurado: false antes do upload', async () => {
    const res = await request(app)
      .get('/api/configuracoes/certificado')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.configurado).toBe(false);
  });

  it('POST /api/configuracoes/certificado deve fazer upload e registrar certificado', async () => {
    const res = await request(app)
      .post('/api/configuracoes/certificado')
      .set('Authorization', `Bearer ${token}`)
      .attach('certificado', pfxBuffer, 'meu_certificado.pfx')
      .field('senha', 'senha123');

    expect(res.status).toBe(201);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.cnpj).toBe('12345678000195');
    expect(res.body.dados.validoAte).toBeDefined();
  });

  it('PATCH /api/configuracoes/certificado/toggle deve alternar transmissao_sefaz_ativa', async () => {
    const res = await request(app)
      .patch('/api/configuracoes/certificado/toggle')
      .set('Authorization', `Bearer ${token}`)
      .send({ ativo: false });

    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.transmissao_sefaz_ativa).toBe(false);
  });

  it('DELETE /api/configuracoes/certificado deve remover certificado do MEI', async () => {
    const res = await request(app)
      .delete('/api/configuracoes/certificado')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);

    const getRes = await request(app)
      .get('/api/configuracoes/certificado')
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.body.dados.configurado).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test tests/integration/certificadoApi.test.js`
Expected: FAIL 404

- [ ] **Step 3: Implement controller and routes in `configuracoesController.js` and `configuracoesRoutes.js`**

Implement `uploadCertificado`, `obterCertificadoStatus`, `removerCertificado` e `toggleTransmissaoSefaz` com middleware de upload binário/multipart.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix backend test tests/integration/certificadoApi.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/configuracoesController.js backend/src/routes/configuracoesRoutes.js backend/tests/integration/certificadoApi.test.js
git commit -m "feat(backend): implementa endpoints REST de gestao de certificado A1"
```

---

### Task 6: Paridade Total no Servidor MCP (`ai-service/mcp_server/server.py`)

**Files:**
- Modify: `ai-service/mcp_server/server.py`
- Test: `ai-service/tests/test_mcp_certificado.py`

**Interfaces:**
- Produces:
  - Tool MCP `obter_status_certificado_digital()`
  - Tool MCP `alternar_transmissao_sefaz(ativo: bool)`

- [ ] **Step 1: Write Pytest test for MCP certificate tools**

```python
# ai-service/tests/test_mcp_certificado.py
import pytest
from mcp_server.server import mcp_server_app

@pytest.mark.asyncio
async def test_mcp_obter_status_certificado_digital(respx_mock):
    respx_mock.get("http://localhost:3000/api/configuracoes/certificado").respond(
        200,
        json={
            "sucesso": True,
            "dados": {
                "configurado": True,
                "cnpj": "12345678000195",
                "razaoSocial": "MEI TESTE LTDA",
                "validoAte": "2027-10-09T18:00:00Z",
                "diasRestantes": 365,
                "ativo": True,
                "nomeArquivo": "cert.pfx"
            }
        }
    )
    tools = await mcp_server_app.list_tools()
    tool_names = [t.name for t in tools]
    assert "obter_status_certificado_digital" in tool_names
    assert "alternar_transmissao_sefaz" in tool_names
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:ai -- -k test_mcp_certificado`
Expected: FAIL

- [ ] **Step 3: Implement tools in `ai-service/mcp_server/server.py`**

Add `@mcp_server_app.tool()` for `obter_status_certificado_digital` and `alternar_transmissao_sefaz(ativo: bool)` using `_fetch` and `_patch` with scoped JWT token.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:ai -- -k test_mcp_certificado`
Expected: PASS

- [ ] **Step 5: Run full ai-service test suite to guarantee zero regression**

Run: `npm run test:ai`
Expected: 100% PASS

- [ ] **Step 6: Commit**

```bash
git add ai-service/mcp_server/server.py ai-service/tests/test_mcp_certificado.py
git commit -m "feat(mcp): adiciona ferramentas de status e alternancia do certificado digital A1"
```

---

### Task 7: Frontend — Gestão do Certificado A1 em `Configuracoes.jsx` e Feedback em `NotasFiscais.jsx`

**Files:**
- Modify: `frontend/src/pages/Configuracoes.jsx`
- Modify: `frontend/src/pages/NotasFiscais.jsx`
- Modify: `frontend/src/pages/Configuracoes.test.jsx`

- [ ] **Step 1: Write test for Certificate UI in `Configuracoes.test.jsx`**

```javascript
it('deve exibir secao de Certificado Digital A1 com status ou formulario de upload', async () => {
  renderWithProviders(<Configuracoes />);
  expect(await screen.findByText(/certificado digital icp-brasil/i)).toBeInTheDocument();
  expect(screen.getByText(/instalar certificado a1/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test src/pages/Configuracoes.test.jsx`
Expected: FAIL

- [ ] **Step 3: Implement Certificate UI in `Configuracoes.jsx` and SEFAZ Homologação Badge in `NotasFiscais.jsx`**

- In `Configuracoes.jsx`: Card com upload de arquivo `.pfx`, campo de senha, status de validade, toggle de transmissão real SEFAZ e botão de desinstalação.
- In `NotasFiscais.jsx`: Indicador visual quando transmitido ao vivo e link para o portal de Homologação da SEFAZ ([hom.nfe.fazenda.gov.br](https://hom.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx)).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend test src/pages/Configuracoes.test.jsx`
Expected: PASS

- [ ] **Step 5: Run full frontend test suite to guarantee zero regression**

Run: `npm run test:frontend`
Expected: 100% PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Configuracoes.jsx frontend/src/pages/NotasFiscais.jsx frontend/src/pages/Configuracoes.test.jsx
git commit -m "feat(frontend): adiciona gestao de certificado A1 em Configuracoes e badges em NotasFiscais"
```

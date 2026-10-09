const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const pool = require('../../config/database');

/**
 * Deriva a chave criptográfica simétrica AES-256 de 32 bytes
 */
function obterChaveMestra() {
  const secret = process.env.FISCAL_CERT_SECRET || process.env.JWT_SECRET || 'arandue_fiscal_secret_key_default_32b';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Criptografa dados com AES-256-GCM
 * @param {Buffer|string} dado 
 * @returns {{ iv: string, authTag: string, content: string }}
 */
function criptografar(dado) {
  const buffer = Buffer.isBuffer(dado) ? dado : Buffer.from(String(dado), 'utf8');
  const chave = obterChaveMestra();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', chave, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    content: encrypted.toString('base64'),
  };
}

/**
 * Decifra dados AES-256-GCM
 * @param {object|string} payloadCifrado 
 * @returns {Buffer}
 */
function decifrar(payloadCifrado) {
  const dados = typeof payloadCifrado === 'string' ? JSON.parse(payloadCifrado) : payloadCifrado;
  const chave = obterChaveMestra();
  const iv = Buffer.from(dados.iv, 'hex');
  const authTag = Buffer.from(dados.authTag, 'hex');
  const encryptedContent = Buffer.from(dados.content, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', chave, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encryptedContent), decipher.final()]);
}

/**
 * Abre o arquivo PKCS#12 (.pfx / .p12), valida senha e extrai chaves e metadados X.509
 * @param {Buffer} bufferPfx 
 * @param {string} senha 
 */
function analisarCertificadoPfx(bufferPfx, senha) {
  if (!Buffer.isBuffer(bufferPfx) || bufferPfx.length === 0) {
    throw new Error('Arquivo de certificado digital PFX inválido ou vazio.');
  }

  const senhaStr = String(senha || '');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cert-pfx-'));
  const pfxFilePath = path.join(tmpDir, 'cert.pfx');

  let privateKeyPem;
  let certificatePem;

  try {
    fs.writeFileSync(pfxFilePath, bufferPfx);

    // 1. Extrai a chave privada
    privateKeyPem = execFileSync(
      'openssl',
      ['pkcs12', '-in', pfxFilePath, '-nocerts', '-nodes', '-passin', `pass:${senhaStr}`],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString('utf8');

    // 2. Extrai o certificado público
    certificatePem = execFileSync(
      'openssl',
      ['pkcs12', '-in', pfxFilePath, '-clcerts', '-nokeys', '-passin', `pass:${senhaStr}`],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString('utf8');
  } catch (err) {
    const stderr = err?.stderr?.toString?.() || '';
    if (
      stderr.toLowerCase().includes('mac verify failure') ||
      stderr.toLowerCase().includes('bad decrypt') ||
      stderr.toLowerCase().includes('password') ||
      stderr.toLowerCase().includes('pkcs12')
    ) {
      throw new Error(`Senha do certificado incorreta ou arquivo corrompido: ${stderr.trim()}`);
    }
    throw new Error(`Falha ao abrir certificado digital com a senha fornecida: ${stderr.trim() || err.message}`);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignora erro de limpeza temporária
    }
  }

  // 3. Lê o certificado X.509 nativamente com Node.js crypto
  const x509 = new crypto.X509Certificate(certificatePem);

  const validoDe = new Date(x509.validFrom);
  const validoAte = new Date(x509.validTo);

  // Extrai CNPJ e Razão Social do Subject
  // Exemplo de subject ICP-Brasil: "CN=EMPRESA LTDA:12345678000195, OU=..., O=ICP-Brasil, C=BR"
  const subject = x509.subject || '';
  let cnpj = null;
  let razaoSocial = '';

  // Procura padrão de 14 dígitos consecutivos
  const cnpjMatch = subject.match(/\b(\d{14})\b/) || subject.match(/:(\d{14})/);
  if (cnpjMatch) {
    cnpj = cnpjMatch[1];
  }

  // Extrai Razão Social do CN ou O
  const cnMatch = subject.match(/CN=([^,\n]+)/i);
  if (cnMatch) {
    const rawCn = cnMatch[1].trim();
    // Se estiver no formato "RAZAO SOCIAL:CNPJ" ou "CNPJ:RAZAO SOCIAL"
    if (rawCn.includes(':')) {
      const partes = rawCn.split(':');
      razaoSocial = partes[0].match(/^\d+$/) ? partes[1].trim() : partes[0].trim();
    } else {
      razaoSocial = rawCn;
    }
  }

  if (!razaoSocial) {
    const oMatch = subject.match(/O=([^,\n]+)/i);
    razaoSocial = oMatch ? oMatch[1].trim() : 'MEI Titular';
  }

  // Limpa certificatePem para tag <X509Certificate>
  const certCleanBase64 = certificatePem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');

  return {
    cnpj,
    razaoSocial,
    validoDe,
    validoAte,
    privateKeyPem,
    certificatePem,
    certCleanBase64,
  };
}

/**
 * Salva o certificado cifrado no banco de dados para o usuário tenant
 */
async function salvarCertificado(usuarioId, { buffer, senha, nomeArquivo }) {
  const dados = analisarCertificadoPfx(buffer, senha);

  const pfxCifrado = JSON.stringify(criptografar(buffer));
  const senhaCifrada = JSON.stringify(criptografar(senha));

  const [res] = await pool.query(
    `UPDATE mei_configuracoes 
     SET certificado_pfx_encrypted = ?,
         certificado_senha_encrypted = ?,
         certificado_nome_arquivo = ?,
         certificado_cnpj = ?,
         certificado_razao_social = ?,
         certificado_valido_ate = ?,
         transmissao_sefaz_ativa = 1
     WHERE usuario_id = ?`,
    [
      pfxCifrado,
      senhaCifrada,
      nomeArquivo || 'certificado.pfx',
      dados.cnpj,
      dados.razaoSocial,
      dados.validoAte,
      usuarioId,
    ]
  );

  if (res.affectedRows === 0) {
    throw new Error('Configurações do MEI não encontradas para este usuário.');
  }

  return {
    cnpj: dados.cnpj,
    razaoSocial: dados.razaoSocial,
    validoAte: dados.validoAte,
    nomeArquivo: nomeArquivo || 'certificado.pfx',
    ativo: true,
  };
}

/**
 * Obtém o status do certificado digital sem expor chaves ou senhas
 */
async function obterStatusCertificado(usuarioId) {
  const [rows] = await pool.query(
    `SELECT certificado_cnpj, certificado_razao_social, certificado_valido_ate, 
            certificado_nome_arquivo, transmissao_sefaz_ativa, certificado_pfx_encrypted
     FROM mei_configuracoes 
     WHERE usuario_id = ?`,
    [usuarioId]
  );

  if (!rows || rows.length === 0 || !rows[0].certificado_pfx_encrypted) {
    return { configurado: false, ativo: false };
  }

  const row = rows[0];
  const validoAte = row.certificado_valido_ate ? new Date(row.certificado_valido_ate) : null;
  const diasRestantes = validoAte
    ? Math.ceil((validoAte.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    configurado: true,
    cnpj: row.certificado_cnpj,
    razaoSocial: row.certificado_razao_social,
    validoAte,
    diasRestantes,
    ativo: Boolean(row.transmissao_sefaz_ativa),
    nomeArquivo: row.certificado_nome_arquivo || 'certificado.pfx',
  };
}

/**
 * Decifra e recupera o certificado digital em memória para uso na emissão fiscal
 */
async function obterCertificadoDecifrado(usuarioId) {
  const [rows] = await pool.query(
    `SELECT certificado_pfx_encrypted, certificado_senha_encrypted,
            certificado_cnpj, certificado_razao_social, certificado_valido_ate,
            transmissao_sefaz_ativa
     FROM mei_configuracoes
     WHERE usuario_id = ?`,
    [usuarioId]
  );

  if (!rows || rows.length === 0 || !rows[0].certificado_pfx_encrypted) {
    return null;
  }

  const row = rows[0];
  const pfxBuffer = decifrar(row.certificado_pfx_encrypted);
  const senha = decifrar(row.certificado_senha_encrypted).toString('utf8');

  return {
    pfxBuffer,
    senha,
    dados: {
      cnpj: row.certificado_cnpj,
      razaoSocial: row.certificado_razao_social,
      validoAte: row.certificado_valido_ate,
      transmissaoSefazAtiva: Boolean(row.transmissao_sefaz_ativa),
    },
  };
}

/**
 * Remove o certificado digital do tenant MEI
 */
async function removerCertificado(usuarioId) {
  const [res] = await pool.query(
    `UPDATE mei_configuracoes
     SET certificado_pfx_encrypted = NULL,
         certificado_senha_encrypted = NULL,
         certificado_nome_arquivo = NULL,
         certificado_cnpj = NULL,
         certificado_razao_social = NULL,
         certificado_valido_ate = NULL,
         transmissao_sefaz_ativa = 1
     WHERE usuario_id = ?`,
    [usuarioId]
  );
  return res.affectedRows > 0;
}

/**
 * Alterna a flag de transmissão ao vivo à SEFAZ
 */
async function alternarTransmissao(usuarioId, ativo) {
  const [res] = await pool.query(
    `UPDATE mei_configuracoes
     SET transmissao_sefaz_ativa = ?
     WHERE usuario_id = ?`,
    [ativo ? 1 : 0, usuarioId]
  );
  return res.affectedRows > 0;
}

module.exports = {
  criptografar,
  decifrar,
  analisarCertificadoPfx,
  salvarCertificado,
  obterStatusCertificado,
  obterCertificadoDecifrado,
  removerCertificado,
  alternarTransmissao,
};

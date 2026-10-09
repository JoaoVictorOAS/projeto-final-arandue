const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const certificadoService = require('../../src/services/fiscal/certificadoService');
const pool = require('../../src/config/database');

describe('certificadoService - Gestão e Criptografia de Certificado A1', () => {
  let pfxTesteBuffer;
  const senhaTeste = 'teste123';
  let usuarioId;

  beforeAll(async () => {
    // Gera par de chaves e PFX de teste em arquivos temporários usando openssl
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cert-test-unit-'));
    const keyFile = path.join(tmpDir, 'key.pem');
    const certFile = path.join(tmpDir, 'cert.pem');
    const pfxFile = path.join(tmpDir, 'cert.pfx');

    try {
      execFileSync('openssl', ['genrsa', '-out', keyFile, '2048']);
      execFileSync('openssl', [
        'req', '-x509', '-new', '-key', keyFile, '-out', certFile, '-days', '365',
        '-subj', '/C=BR/O=MEI TESTE LTDA/CN=12345678000195:MEI TESTE LTDA'
      ]);
      execFileSync('openssl', [
        'pkcs12', '-export', '-inkey', keyFile, '-in', certFile, '-out', pfxFile, '-passout', `pass:${senhaTeste}`
      ]);
      pfxTesteBuffer = fs.readFileSync(pfxFile);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

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

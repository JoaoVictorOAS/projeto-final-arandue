const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');
const jwt = require('jsonwebtoken');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

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

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cert-test-api-'));
    const keyFile = path.join(tmpDir, 'key.pem');
    const certFile = path.join(tmpDir, 'cert.pem');
    const pfxFile = path.join(tmpDir, 'cert.pfx');

    try {
      execFileSync('openssl', ['genrsa', '-out', keyFile, '2048']);
      execFileSync('openssl', [
        'req', '-x509', '-new', '-key', keyFile, '-out', certFile, '-days', '365',
        '-subj', '/C=BR/O=MEI API/CN=12345678000195:MEI API'
      ]);
      execFileSync('openssl', [
        'pkcs12', '-export', '-inkey', keyFile, '-in', certFile, '-out', pfxFile, '-passout', 'pass:senha123'
      ]);
      pfxBuffer = fs.readFileSync(pfxFile);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
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

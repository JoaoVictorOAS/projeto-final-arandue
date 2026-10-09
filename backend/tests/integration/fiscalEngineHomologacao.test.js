const pool = require('../../src/config/database');
const fiscalEngine = require('../../src/services/fiscal/fiscalEngine');
const sefazTransmissor = require('../../src/services/fiscal/sefazTransmissor');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
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

    // Gera e salva certificado A1 de teste em diretório temporário
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cert-test-fe-'));
    const keyFile = path.join(tmpDir, 'key.pem');
    const certFile = path.join(tmpDir, 'cert.pem');
    const pfxFile = path.join(tmpDir, 'cert.pfx');

    let pfx;
    try {
      execFileSync('openssl', ['genrsa', '-out', keyFile, '2048']);
      execFileSync('openssl', [
        'req', '-x509', '-new', '-key', keyFile, '-out', certFile, '-days', '365',
        '-subj', '/C=BR/O=Padaria Baiana MEI/CN=12345678000195:Padaria Baiana MEI'
      ]);
      execFileSync('openssl', [
        'pkcs12', '-export', '-inkey', keyFile, '-in', certFile, '-out', pfxFile, '-passout', 'pass:123456'
      ]);
      pfx = fs.readFileSync(pfxFile);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

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

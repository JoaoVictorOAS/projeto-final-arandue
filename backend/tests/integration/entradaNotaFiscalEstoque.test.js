const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/database');
const jwt = require('jsonwebtoken');

describe('Entrada de Insumos por Nota Fiscal (XML e Lote)', () => {
  let token;
  let usuarioId;

  const xmlExemploNfe = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35261012345678000195550010000001231234567890" versao="4.00">
      <ide>
        <nNF>9876</nNF>
        <serie>1</serie>
        <dhEmi>2026-10-08T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000195</CNPJ>
        <xNome>Distribuidora Atacado Central</xNome>
      </emit>
      <total>
        <ICMSTot>
          <vNF>150.00</vNF>
        </ICMSTot>
      </total>
      <det nItem="1">
        <prod>
          <cProd>FAR-01</cProd>
          <xProd>Farinha Trigo Fornecedor</xProd>
          <uCom>KG</uCom>
          <qCom>10.0000</qCom>
          <vUnCom>5.0000</vUnCom>
          <vProd>50.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>FRG-02</cProd>
          <xProd>Peito Frango Congelado Fornecedor</xProd>
          <uCom>KG</uCom>
          <qCom>5.0000</qCom>
          <vUnCom>20.0000</vUnCom>
          <vProd>100.00</vProd>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`;

  beforeAll(async () => {
    const [uRes] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['NF Entrada Teste', `nf_entrada_${Date.now()}@teste.com`, 'hash']
    );
    usuarioId = uRes.insertId;
    token = jwt.sign({ id: usuarioId }, process.env.JWT_SECRET || 'teste_jwt_secret', { expiresIn: '1h' });
  });

  afterAll(async () => {
    if (usuarioId) {
      await pool.query('DELETE FROM movimentacoes WHERE usuario_id = ?', [usuarioId]);
      await pool.query('DELETE FROM estoque_movimentacoes WHERE usuario_id = ?', [usuarioId]);
      await pool.query('DELETE FROM insumos WHERE usuario_id = ?', [usuarioId]);
      await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
    }
  });

  it('POST /api/estoque/insumos/parse-xml deve extrair dados de NF-e para prévia', async () => {
    const res = await request(app)
      .post('/api/estoque/insumos/parse-xml')
      .set('Authorization', `Bearer ${token}`)
      .send({ xml: xmlExemploNfe });

    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.fornecedor_nome).toBe('Distribuidora Atacado Central');
    expect(res.body.dados.numero_documento).toBe('9876');
    expect(res.body.dados.itens.length).toBe(2);
    expect(res.body.dados.itens[0].nome).toBe('Farinha Trigo Fornecedor');
  });

  it('POST /api/estoque/insumos/entrada-nota deve cadastrar insumos em lote e lançar despesa no caixa', async () => {
    const payload = {
      fornecedor: 'Distribuidora Atacado Central',
      numero_documento: '9876',
      lancar_no_caixa: true,
      itens: [
        {
          nome: 'Farinha Trigo Fornecedor',
          quantidade: 10,
          unidade: 'kg',
          custo_total: 50.00
        },
        {
          nome: 'Peito Frango Congelado Fornecedor',
          quantidade: 5,
          unidade: 'kg',
          custo_total: 100.00
        }
      ]
    };

    const res = await request(app)
      .post('/api/estoque/insumos/entrada-nota')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.sucesso).toBe(true);
    expect(res.body.dados.total_itens_processados).toBe(2);

    // Valida que os insumos foram criados no banco e convertidos para gramas (10kg = 10000g, 5kg = 5000g)
    const [insumos] = await pool.query(
      'SELECT nome, quantidade_atual, unidade_base, custo_unitario FROM insumos WHERE usuario_id = ? ORDER BY nome ASC',
      [usuarioId]
    );
    expect(insumos.length).toBe(2);

    const farinha = insumos.find(i => i.nome === 'Farinha Trigo Fornecedor');
    const frango = insumos.find(i => i.nome === 'Peito Frango Congelado Fornecedor');

    expect(Number(farinha.quantidade_atual)).toBe(10000);
    expect(farinha.unidade_base).toBe('g');
    expect(Number(farinha.custo_unitario)).toBe(0.005); // R$ 50 / 10000g = 0.005 R$/g

    expect(Number(frango.quantidade_atual)).toBe(5000);
    expect(frango.unidade_base).toBe('g');
    expect(Number(frango.custo_unitario)).toBe(0.02); // R$ 100 / 5000g = 0.02 R$/g

    // Valida despesa registrada no Livro Caixa
    const [despesas] = await pool.query(
      'SELECT valor, tipo, descricao FROM movimentacoes WHERE usuario_id = ? AND tipo = "SAIDA"',
      [usuarioId]
    );
    expect(despesas.length).toBe(1);
    expect(Number(despesas[0].valor)).toBe(150.00);
  });
});

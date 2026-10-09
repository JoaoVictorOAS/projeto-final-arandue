const {
  obterDadosSefazPorUf,
  listarTodasUfs,
  determinarCfopOperacao,
  validarUf,
  TODAS_UFS
} = require('../../src/services/fiscal/sefazRegistry');

describe('sefazRegistry - Registro Canônico SEFAZ das 27 UFs', () => {
  const UFS_ESPERADAS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
    'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
    'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  describe('listarTodasUfs', () => {
    it('deve retornar exatamente as 27 Unidades Federativas do Brasil', () => {
      const ufs = listarTodasUfs();
      expect(Array.isArray(ufs)).toBe(true);
      expect(ufs).toHaveLength(27);

      const siglasRetornadas = ufs.map(u => u.uf);
      expect(siglasRetornadas.sort()).toEqual([...UFS_ESPERADAS].sort());
    });

    it('cada UF deve conter estrutura canônica completa e válida', () => {
      const ufs = listarTodasUfs();

      ufs.forEach(item => {
        expect(item).toHaveProperty('uf');
        expect(item).toHaveProperty('nome');
        expect(item).toHaveProperty('cUf');
        expect(item).toHaveProperty('autorizador');
        expect(item).toHaveProperty('portalConsulta');
        expect(item).toHaveProperty('aliquotaPadrao');

        expect(typeof item.uf).toBe('string');
        expect(item.uf).toHaveLength(2);
        expect(typeof item.nome).toBe('string');
        expect(item.nome.length).toBeGreaterThan(1);
        expect(typeof item.cUf).toBe('string');
        expect(/^\d{2}$/.test(item.cUf)).toBe(true);
        expect(typeof item.autorizador).toBe('string');
        expect(item.portalConsulta).toMatch(/^https?:\/\//);
        expect(typeof item.aliquotaPadrao).toBe('number');
        expect(item.aliquotaPadrao).toBeGreaterThan(0);
      });
    });

    it('deve garantir que não há duplicação de siglas ou códigos cUF', () => {
      const ufs = listarTodasUfs();
      const siglasSet = new Set(ufs.map(u => u.uf));
      const cUfSet = new Set(ufs.map(u => u.cUf));

      expect(siglasSet.size).toBe(27);
      expect(cUfSet.size).toBe(27);
    });
  });

  describe('obterDadosSefazPorUf', () => {
    it('deve retornar os dados oficiais de São Paulo (SP) com autorizador próprio', () => {
      const dados = obterDadosSefazPorUf('SP');
      expect(dados).toBeDefined();
      expect(dados.uf).toBe('SP');
      expect(dados.nome).toBe('São Paulo');
      expect(dados.cUf).toBe('35');
      expect(dados.autorizador).toContain('SP');
      expect(dados.portalConsulta).toContain('fazenda.sp.gov.br');
      expect(dados.aliquotaPadrao).toBe(18);
    });

    it('deve retornar os dados de Santa Catarina (SC) utilizando autorizador SVRS', () => {
      const dados = obterDadosSefazPorUf('SC');
      expect(dados).toBeDefined();
      expect(dados.uf).toBe('SC');
      expect(dados.nome).toBe('Santa Catarina');
      expect(dados.cUf).toBe('42');
      expect(dados.autorizador).toBe('SVRS');
      expect(dados.portalConsulta).toContain('svrs.rs.gov.br');
      expect(dados.aliquotaPadrao).toBe(17);
    });

    it('deve retornar os dados do Maranhão (MA) utilizando autorizador SVAN', () => {
      const dados = obterDadosSefazPorUf('MA');
      expect(dados).toBeDefined();
      expect(dados.uf).toBe('MA');
      expect(dados.nome).toBe('Maranhão');
      expect(dados.cUf).toBe('21');
      expect(dados.autorizador).toBe('SVAN');
      expect(dados.portalConsulta).toContain('sefaz.ma.gov.br');
      expect(dados.aliquotaPadrao).toBe(22);
    });

    it('deve retornar os dados de Minas Gerais (MG) e Rio de Janeiro (RJ) com autorizadores próprios', () => {
      const dadosMG = obterDadosSefazPorUf('MG');
      expect(dadosMG.cUf).toBe('31');
      expect(dadosMG.autorizador).toContain('MG');

      const dadosRJ = obterDadosSefazPorUf('RJ');
      expect(dadosRJ.cUf).toBe('33');
      expect(dadosRJ.autorizador).toContain('RJ');
    });

    it('deve normalizar siglas em minúsculas e com espaços', () => {
      const dados1 = obterDadosSefazPorUf('sp');
      expect(dados1).toBeDefined();
      expect(dados1.uf).toBe('SP');

      const dados2 = obterDadosSefazPorUf('  rJ  ');
      expect(dados2).toBeDefined();
      expect(dados2.uf).toBe('RJ');
    });

    it('deve suportar busca por código cUF numérico ou string', () => {
      const dadosSP = obterDadosSefazPorUf('35');
      expect(dadosSP).toBeDefined();
      expect(dadosSP.uf).toBe('SP');

      const dadosRS = obterDadosSefazPorUf(43);
      expect(dadosRS).toBeDefined();
      expect(dadosRS.uf).toBe('RS');

      // Código de município IBGE (prefixo 2 dígitos)
      const dadosCampinas = obterDadosSefazPorUf('3509502');
      expect(dadosCampinas).toBeDefined();
      expect(dadosCampinas.uf).toBe('SP');
    });

    it('deve retornar null para UFs inválidas ou não informadas', () => {
      expect(obterDadosSefazPorUf('XX')).toBeNull();
      expect(obterDadosSefazPorUf('')).toBeNull();
      expect(obterDadosSefazPorUf(null)).toBeNull();
      expect(obterDadosSefazPorUf(undefined)).toBeNull();
      expect(obterDadosSefazPorUf('99')).toBeNull();
    });
  });

  describe('validarUf', () => {
    it('deve retornar true para todas as 27 UFs válidas', () => {
      UFS_ESPERADAS.forEach(uf => {
        expect(validarUf(uf)).toBe(true);
        expect(validarUf(uf.toLowerCase())).toBe(true);
      });
    });

    it('deve retornar false para siglas inexistentes ou vazias', () => {
      expect(validarUf('XX')).toBe(false);
      expect(validarUf('BR')).toBe(false);
      expect(validarUf('')).toBe(false);
      expect(validarUf(null)).toBe(false);
      expect(validarUf(undefined)).toBe(false);
    });
  });

  describe('determinarCfopOperacao', () => {
    it('deve retornar 5102 para operação interna (mesma UF)', () => {
      expect(determinarCfopOperacao('SP', 'SP')).toBe('5102');
      expect(determinarCfopOperacao('RJ', 'RJ')).toBe('5102');
      expect(determinarCfopOperacao('mg', 'MG')).toBe('5102');
      expect(determinarCfopOperacao('SC', '  sc  ')).toBe('5102');
    });

    it('deve retornar 6102 para operação interestadual (UFs distintas)', () => {
      expect(determinarCfopOperacao('SP', 'RJ')).toBe('6102');
      expect(determinarCfopOperacao('MG', 'BA')).toBe('6102');
      expect(determinarCfopOperacao('RS', 'PR')).toBe('6102');
      expect(determinarCfopOperacao('sp', 'go')).toBe('6102');
    });

    it('deve assumir 5102 (operação interna) como padrão se a UF do destinatário não for informada', () => {
      expect(determinarCfopOperacao('SP', null)).toBe('5102');
      expect(determinarCfopOperacao('SP', '')).toBe('5102');
      expect(determinarCfopOperacao('SP', undefined)).toBe('5102');
    });

    it('deve usar 5102 caso a UF emitente não seja informada', () => {
      expect(determinarCfopOperacao(null, 'SP')).toBe('5102');
    });
  });
});

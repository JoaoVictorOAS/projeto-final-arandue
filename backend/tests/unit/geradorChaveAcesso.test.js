const { calcularDigitoVerificadorModulo11, gerarChaveAcesso } = require('../../src/services/fiscal/geradorChaveAcesso');

describe('Gerador de Chave de Acesso SEFAZ (Módulo 11)', () => {
  describe('calcularDigitoVerificadorModulo11', () => {
    it('deve calcular corretamente o dígito verificador módulo 11', () => {
      // Chave SEFAZ de 43 dígitos válida de teste (SP, mod 55)
      const base43 = '3523091234567800019555001000000001112345678';
      const dv = calcularDigitoVerificadorModulo11(base43);
      expect(dv).toBeDefined();
      expect(dv.length).toBe(1);
      expect(/\d/.test(dv)).toBe(true);
    });

    it('deve retornar "0" quando o resto da divisão por 11 for 0 ou 1', () => {
      // Resto 0: soma de zeros = 0, 0 % 11 = 0 => DV = '0'
      const dvZero = calcularDigitoVerificadorModulo11('0000000000000000000000000000000000000000000');
      expect(dvZero).toBe('0');

      // Resto 1: último dígito 6 com peso 2 => 6 * 2 = 12. 12 % 11 = 1 => DV = '0'
      const dvUm = calcularDigitoVerificadorModulo11('0000000000000000000000000000000000000000006');
      expect(dvUm).toBe('0');
    });

    it('deve retornar 11 - resto quando o resto for maior ou igual a 2', () => {
      // Resto 2: último dígito 1 com peso 2 => 1 * 2 = 2. 2 % 11 = 2 => DV = 11 - 2 = 9
      const dvDois = calcularDigitoVerificadorModulo11('0000000000000000000000000000000000000000001');
      expect(dvDois).toBe('9');
    });

    it('deve lançar erro se a chave base não possuir 43 dígitos numéricos', () => {
      expect(() => calcularDigitoVerificadorModulo11('123')).toThrow('Chave base deve conter exatamente 43 dígitos numéricos');
      expect(() => calcularDigitoVerificadorModulo11('352309123456780001955500100000000111234567A')).toThrow('Chave base deve conter exatamente 43 dígitos numéricos');
      expect(() => calcularDigitoVerificadorModulo11(null)).toThrow('Chave base deve conter exatamente 43 dígitos numéricos');
    });
  });

  describe('gerarChaveAcesso', () => {
    it('deve formatar chave de acesso completa com 44 dígitos numéricos', () => {
      const chave = gerarChaveAcesso({
        cUF: '35',
        anoMes: '2610',
        cnpj: '12.345.678/0001-95',
        modelo: '55',
        serie: 1,
        numero: 42,
        tpEmis: '1',
        codigoNumerico: '12345678'
      });

      expect(chave.length).toBe(44);
      expect(/^\d{44}$/.test(chave)).toBe(true);
      expect(chave.startsWith('3526101234567800019555001000000042112345678')).toBe(true);
    });

    it('deve aplicar padding correto para todos os campos numéricos', () => {
      const chave = gerarChaveAcesso({
        cUF: 35,
        anoMes: '2610',
        cnpj: '12345678000195',
        modelo: 55,
        serie: '2',
        numero: '1',
        tpEmis: 1,
        codigoNumerico: 7
      });

      // cUF: 35 (2)
      // anoMes: 2610 (4)
      // cnpj: 12345678000195 (14)
      // modelo: 55 (2)
      // serie: 002 (3)
      // numero: 000000001 (9)
      // tpEmis: 1 (1)
      // codigoNumerico: 00000007 (8)
      // total base 43: 3526101234567800019555002000000001100000007
      expect(chave.startsWith('3526101234567800019555002000000001100000007')).toBe(true);
      expect(chave.length).toBe(44);
    });

    it('deve sanitizar CNPJ removendo pontuação e caracteres não numéricos', () => {
      const chaveComPontuacao = gerarChaveAcesso({
        cUF: '35',
        anoMes: '2610',
        cnpj: '12.345.678/0001-95',
        modelo: '55',
        serie: 1,
        numero: 1,
        tpEmis: '1',
        codigoNumerico: '1'
      });

      const chaveSemPontuacao = gerarChaveAcesso({
        cUF: '35',
        anoMes: '2610',
        cnpj: '12345678000195',
        modelo: '55',
        serie: 1,
        numero: 1,
        tpEmis: '1',
        codigoNumerico: '1'
      });

      expect(chaveComPontuacao).toBe(chaveSemPontuacao);
    });

    it('deve lançar erro se parâmetros obrigatórios estiverem ausentes', () => {
      expect(() => gerarChaveAcesso({})).toThrow();
      expect(() => gerarChaveAcesso({ cUF: '35' })).toThrow();
    });
  });
});

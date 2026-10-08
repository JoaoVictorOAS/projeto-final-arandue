const {
  converterParaUnidadeBase,
  calcularCustoMedioPonderado,
  formatarGrandezaAmigavel
} = require('../../src/utils/conversorUnidades');

describe('conversorUnidades', () => {
  describe('converterParaUnidadeBase', () => {
    it('deve converter kg para gramas', () => {
      expect(converterParaUnidadeBase(2.5, 'kg', 'g')).toBe(2500);
      expect(converterParaUnidadeBase(0.25, 'kg', 'g')).toBe(250);
    });

    it('deve manter gramas inalterado quando a base for g', () => {
      expect(converterParaUnidadeBase(500, 'g', 'g')).toBe(500);
    });

    it('deve converter L para mL', () => {
      expect(converterParaUnidadeBase(1.5, 'L', 'ml')).toBe(1500);
      expect(converterParaUnidadeBase(2, 'litros', 'ml')).toBe(2000);
    });

    it('deve converter unidades em pacotes', () => {
      expect(converterParaUnidadeBase(3, 'pct', 'un', { unidadesPorEmbalagem: 50 })).toBe(150);
    });

    it('deve lançar erro se a grandeza for incompatível (ex: massa para volume)', () => {
      expect(() => converterParaUnidadeBase(1, 'L', 'g')).toThrow('Unidade incompatível');
    });

    it('deve lançar erro se a quantidade for inválida ou negativa', () => {
      expect(() => converterParaUnidadeBase(-5, 'kg', 'g')).toThrow('Quantidade inválida');
      expect(() => converterParaUnidadeBase('abc', 'kg', 'g')).toThrow('Quantidade inválida');
    });
  });

  describe('calcularCustoMedioPonderado', () => {
    it('deve calcular o novo custo médio ponderado corretamente', () => {
      // 2000g a R$ 0.005/g (R$ 10) + 3000g a R$ 0.007/g (R$ 21) = 5000g total R$ 31 -> R$ 0.0062/g
      const cmp = calcularCustoMedioPonderado(2000, 0.005, 3000, 0.007);
      expect(cmp).toBeCloseTo(0.0062, 4);
    });

    it('deve retornar custo novo se o saldo atual for zero ou negativo', () => {
      const cmp = calcularCustoMedioPonderado(0, 0, 1000, 0.010);
      expect(cmp).toBe(0.010);
    });

    it('deve retornar custo atual se a nova quantidade for zero ou negativa', () => {
      const cmp = calcularCustoMedioPonderado(100, 5.0, 0, 10.0);
      expect(cmp).toBe(5.0);
    });
  });

  describe('formatarGrandezaAmigavel', () => {
    it('deve formatar gramas para kg quando for >= 1000', () => {
      expect(formatarGrandezaAmigavel(2500, 'g')).toBe('2.5 kg');
    });

    it('deve manter gramas se < 1000', () => {
      expect(formatarGrandezaAmigavel(350, 'g')).toBe('350 g');
    });

    it('deve formatar mL para L quando for >= 1000', () => {
      expect(formatarGrandezaAmigavel(1500, 'ml')).toBe('1.5 L');
    });

    it('deve manter mL se < 1000', () => {
      expect(formatarGrandezaAmigavel(750, 'ml')).toBe('750 mL');
    });

    it('deve formatar unidade un', () => {
      expect(formatarGrandezaAmigavel(12, 'un')).toBe('12 un');
    });
  });
});

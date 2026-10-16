const {
  validarHex,
  hexParaRgb,
  calcularLuminancia,
  calcularContraste,
  validarTemaTokens,
} = require('../../src/utils/colorUtils');

describe('colorUtils - Validação Cromática e WCAG 2.1', () => {
  test('deve validar formatos hexadecimais corretos e rejeitar inválidos', () => {
    expect(validarHex('#ffffff')).toBe(true);
    expect(validarHex('#0F172A')).toBe(true);
    expect(validarHex('#6366f1')).toBe(true);
    expect(validarHex('ffffff')).toBe(false);
    expect(validarHex('#fff')).toBe(false);
    expect(validarHex('#gggggg')).toBe(false);
  });

  test('deve converter hex para rgb corretamente', () => {
    expect(hexParaRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexParaRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexParaRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  test('deve calcular luminância relativa sRGB com correção gama', () => {
    expect(calcularLuminancia('#000000')).toBeCloseTo(0, 4);
    expect(calcularLuminancia('#ffffff')).toBeCloseTo(1, 4);
  });

  test('deve calcular razão de contraste WCAG corretamente', () => {
    // Branco sobre preto puro = 21:1
    const crBrancoPreto = calcularContraste('#ffffff', '#000000');
    expect(crBrancoPreto).toBeCloseTo(21, 1);

    // Texto escuro sobre fundo claro
    const crLeitura = calcularContraste('#f8fafc', '#0f172a');
    expect(crLeitura).toBeGreaterThan(10);
  });

  test('deve validar tokens completos de tema e checar contraste mínimo de 4.5:1', () => {
    const tokensValidos = {
      bgApp: '#0f172a',
      bgSurface: '#1e293b',
      bgSurfaceHover: '#334155',
      border: '#334155',
      textMain: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      primary: '#6366f1',
      primaryHover: '#4f46e5',
      primaryText: '#ffffff',
      accent: '#f59e0b',
    };

    const res = validarTemaTokens(tokensValidos);
    expect(res.valido).toBe(true);
    expect(res.erros).toHaveLength(0);
  });

  test('deve rejeitar tokens com contraste ilegível (ex: texto cinza sobre fundo cinza)', () => {
    const tokensIlegiveis = {
      bgApp: '#ffffff',
      bgSurface: '#ffffff',
      bgSurfaceHover: '#f1f5f9',
      border: '#e2e8f0',
      textMain: '#f8fafc', // Quase branco em fundo branco!
      textSecondary: '#94a3b8',
      textMuted: '#cbd5e1',
      primary: '#6366f1',
      primaryHover: '#4f46e5',
      primaryText: '#ffffff',
      accent: '#f59e0b',
    };

    const res = validarTemaTokens(tokensIlegiveis);
    expect(res.valido).toBe(false);
    expect(res.erros.some((e) => e.includes('contraste'))).toBe(true);
  });
});

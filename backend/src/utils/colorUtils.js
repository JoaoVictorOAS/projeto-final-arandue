function validarHex(hex) {
  if (typeof hex !== 'string') return false;
  return /^#[0-9A-Fa-f]{6}$/.test(hex.trim());
}

function hexParaRgb(hex) {
  if (!validarHex(hex)) return { r: 0, g: 0, b: 0 };
  const num = parseInt(hex.trim().slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function calcularLuminancia(hex) {
  const { r, g, b } = hexParaRgb(hex);
  const canalLinear = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const rL = canalLinear(r);
  const gL = canalLinear(g);
  const bL = canalLinear(b);
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

function calcularContraste(hex1, hex2) {
  const l1 = calcularLuminancia(hex1);
  const l2 = calcularLuminancia(hex2);
  const maisClaro = Math.max(l1, l2);
  const maisEscuro = Math.min(l1, l2);
  return (maisClaro + 0.05) / (maisEscuro + 0.05);
}

function validarTemaTokens(tokens) {
  const erros = [];
  const avisos = [];

  if (!tokens || typeof tokens !== 'object') {
    return { valido: false, erros: ['Tokens do tema ausentes ou inválidos'], avisos };
  }

  const camposObrigatorios = [
    'bgApp',
    'bgSurface',
    'border',
    'textMain',
    'textSecondary',
    'primary',
    'primaryHover',
    'primaryText',
    'accent',
  ];

  for (const campo of camposObrigatorios) {
    if (!validarHex(tokens[campo])) {
      erros.push(`Campo '${campo}' deve ser uma cor hexadecimal válida no formato #RRGGBB (recebido: '${tokens[campo]}')`);
    }
  }

  if (erros.length > 0) {
    return { valido: false, erros, avisos };
  }

  // Validação de Contraste WCAG 2.1 (com arredondamento para 1 casa decimal conforme norma WCAG)
  const crTextoPrincipal = calcularContraste(tokens.textMain, tokens.bgSurface);
  if (parseFloat(crTextoPrincipal.toFixed(1)) < 4.5) {
    erros.push(
      `Contraste insuficiente entre 'textMain' (${tokens.textMain}) e 'bgSurface' (${tokens.bgSurface}): ${crTextoPrincipal.toFixed(1)}:1 (contraste mínimo exigido: 4.5:1 para WCAG AA)`
    );
  }

  const crBotaoPrimario = calcularContraste(tokens.primaryText, tokens.primary);
  if (parseFloat(crBotaoPrimario.toFixed(1)) < 4.5) {
    erros.push(
      `Contraste insuficiente no botão primário entre 'primaryText' (${tokens.primaryText}) e 'primary' (${tokens.primary}): ${crBotaoPrimario.toFixed(1)}:1 (contraste mínimo exigido: 4.5:1)`
    );
  }

  return {
    valido: erros.length === 0,
    erros,
    avisos,
  };
}

module.exports = {
  validarHex,
  hexParaRgb,
  calcularLuminancia,
  calcularContraste,
  validarTemaTokens,
};

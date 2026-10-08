const MAPA_GRANDEZAS = {
  g: 'massa',
  kg: 'massa',
  quilo: 'massa',
  quilos: 'massa',
  ml: 'volume',
  l: 'volume',
  litro: 'volume',
  litros: 'volume',
  un: 'unidade',
  unidade: 'unidade',
  unidades: 'unidade',
  pct: 'unidade',
  cx: 'unidade'
};

function normalizarNomeUnidade(unidade) {
  if (!unidade || typeof unidade !== 'string') return '';
  return unidade.trim().toLowerCase();
}

/**
 * Converte quantidade informada para a unidade base canônica.
 */
function converterParaUnidadeBase(quantidade, unidadeInformada, unidadeBase, opcoes = {}) {
  const q = Number(quantidade);
  if (isNaN(q) || q < 0) {
    throw new Error('Quantidade inválida para conversão');
  }

  const uNorm = normalizarNomeUnidade(unidadeInformada);
  const baseNorm = normalizarNomeUnidade(unidadeBase);

  const grandezaOrigem = MAPA_GRANDEZAS[uNorm];
  const grandezaDestino = MAPA_GRANDEZAS[baseNorm];

  if (!grandezaOrigem || !grandezaDestino || grandezaOrigem !== grandezaDestino) {
    throw new Error(`Unidade incompatível: não é possível converter '${unidadeInformada}' para a base '${unidadeBase}'`);
  }

  if (grandezaDestino === 'massa') {
    if (['kg', 'quilo', 'quilos'].includes(uNorm)) return q * 1000;
    return q;
  }

  if (grandezaDestino === 'volume') {
    if (['l', 'litro', 'litros'].includes(uNorm)) return q * 1000;
    return q;
  }

  if (grandezaDestino === 'unidade') {
    if (['pct', 'cx'].includes(uNorm)) {
      const fator = Number(opcoes.unidadesPorEmbalagem) || 1;
      return q * fator;
    }
    return q;
  }

  return q;
}

/**
 * Calcula o custo médio ponderado (CMP) após nova aquisição.
 */
function calcularCustoMedioPonderado(qtdAtual, custoAtual, qtdNova, custoNovo) {
  const qAtual = Math.max(0, Number(qtdAtual) || 0);
  const cAtual = Math.max(0, Number(custoAtual) || 0);
  const qNova = Number(qtdNova) || 0;
  const cNovo = Number(custoNovo) || 0;

  if (qNova <= 0) return cAtual;
  if (qAtual <= 0) return cNovo;

  const totalValor = (qAtual * cAtual) + (qNova * cNovo);
  const totalQtd = qAtual + qNova;

  return totalQtd > 0 ? Number((totalValor / totalQtd).toFixed(6)) : cNovo;
}

/**
 * Formata um valor canônico para exibição legível ao usuário.
 */
function formatarGrandezaAmigavel(quantidadeBase, unidadeBase) {
  const q = Number(quantidadeBase) || 0;
  const u = normalizarNomeUnidade(unidadeBase);

  if (u === 'g') {
    if (q >= 1000) {
      return `${Number((q / 1000).toFixed(3))} kg`;
    }
    return `${Number(q.toFixed(1))} g`;
  }

  if (u === 'ml') {
    if (q >= 1000) {
      return `${Number((q / 1000).toFixed(3))} L`;
    }
    return `${Number(q.toFixed(1))} mL`;
  }

  return `${Math.round(q)} un`;
}

module.exports = {
  converterParaUnidadeBase,
  calcularCustoMedioPonderado,
  formatarGrandezaAmigavel
};

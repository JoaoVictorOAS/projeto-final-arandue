const { formatarGrandezaAmigavel } = require('../utils/conversorUnidades');

/**
 * Simula capacidade produtiva e calcula gargalos com base em ingredientes e insumos disponíveis.
 */
function simularCapacidade({ ingredientesFicha, insumosDisponiveis }) {
  if (!Array.isArray(ingredientesFicha) || ingredientesFicha.length === 0) {
    throw new Error('A receita informada não possui ingredientes cadastrados');
  }

  const mapaDisponivel = new Map();
  for (const item of insumosDisponiveis || []) {
    mapaDisponivel.set(Number(item.insumo_id), Number(item.quantidade_base) || 0);
  }

  let menorCapacidade = Infinity;
  const analisePorInsumo = [];

  for (const ing of ingredientesFicha) {
    const id = Number(ing.insumo_id);
    const qtdNecessaria = Number(ing.quantidade_necessaria);
    const qtdDisponivel = mapaDisponivel.get(id) || 0;

    const capacidade = qtdNecessaria > 0 ? Math.floor(qtdDisponivel / qtdNecessaria) : 0;
    if (capacidade < menorCapacidade) {
      menorCapacidade = capacidade;
    }

    analisePorInsumo.push({
      insumo_id: id,
      nome: ing.nome || ing.nome_insumo,
      unidade_base: ing.unidade_base,
      custo_unitario: Number(ing.custo_unitario) || 0,
      qtdNecessaria,
      qtdDisponivel,
      capacidade
    });
  }

  const rendimentoMaximo = menorCapacidade === Infinity ? 0 : menorCapacidade;

  // Localiza o ingrediente limitante (aquele cuja capacidade empatou no menor valor)
  const limitantes = analisePorInsumo.filter(item => item.capacidade === rendimentoMaximo);
  const principalLimitante = limitantes[0];

  const faltaParaProximo = principalLimitante
    ? Math.max(0, ((rendimentoMaximo + 1) * principalLimitante.qtdNecessaria) - principalLimitante.qtdDisponivel)
    : 0;

  // Calcula sobras de todos os insumos após produzir rendimentoMaximo lotes
  const sobras = analisePorInsumo.map(item => {
    const consumido = rendimentoMaximo * item.qtdNecessaria;
    const sobra = Math.max(0, item.qtdDisponivel - consumido);
    return {
      insumo_id: item.insumo_id,
      nome: item.nome,
      unidade_base: item.unidade_base,
      quantidadeSobra: sobra,
      sobraFormatada: formatarGrandezaAmigavel(sobra, item.unidade_base)
    };
  });

  // Calcula custo da receita unitária e custo total da produção simulada
  let custoUnitario = 0;
  for (const ing of analisePorInsumo) {
    custoUnitario += ing.qtdNecessaria * ing.custo_unitario;
  }
  custoUnitario = Number(custoUnitario.toFixed(2));
  const custoTotalProducao = Number((custoUnitario * rendimentoMaximo).toFixed(2));

  return {
    rendimentoMaximo,
    insumoLimitante: principalLimitante ? {
      insumo_id: principalLimitante.insumo_id,
      nome: principalLimitante.nome,
      unidade_base: principalLimitante.unidade_base,
      quantidadeFaltanteProximoLote: faltaParaProximo,
      faltaFormatada: formatarGrandezaAmigavel(faltaParaProximo, principalLimitante.unidade_base),
      motivo: `O insumo '${principalLimitante.nome}' é o gargalo que impede produzir mais lotes.`
    } : null,
    sobras,
    custoUnitario,
    custoTotalProducao
  };
}

module.exports = {
  simularCapacidade
};

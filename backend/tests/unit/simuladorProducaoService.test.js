const { simularCapacidade } = require('../../src/services/simuladorProducaoService');

describe('simuladorProducaoService', () => {
  const receitaCentoCoxinha = [
    { insumo_id: 1, nome: 'Farinha de Trigo', unidade_base: 'g', quantidade_necessaria: 1000, custo_unitario: 0.005 },
    { insumo_id: 2, nome: 'Frango Desfiado', unidade_base: 'g', quantidade_necessaria: 800, custo_unitario: 0.015 }
  ];

  it('deve calcular rendimento máximo baseado no ingrediente limitante', () => {
    const insumosUsuario = [
      { insumo_id: 1, quantidade_base: 3000 }, // Farinha dá para 3 centos
      { insumo_id: 2, quantidade_base: 2000 }  // Frango dá para 2 centos (gargalo: 2000 / 800 = 2)
    ];

    const resultado = simularCapacidade({
      ingredientesFicha: receitaCentoCoxinha,
      insumosDisponiveis: insumosUsuario
    });

    expect(resultado.rendimentoMaximo).toBe(2);
    expect(resultado.insumoLimitante.nome).toBe('Frango Desfiado');
    expect(resultado.insumoLimitante.quantidadeFaltanteProximoLote).toBe(400); // Faltam 400g de frango para fazer o 3º
    expect(resultado.insumoLimitante.faltaFormatada).toBe('400 g');
    expect(resultado.insumoLimitante.motivo).toContain('Frango Desfiado');
    const sobraFarinha = resultado.sobras.find(s => s.nome === 'Farinha de Trigo');
    expect(sobraFarinha.quantidadeSobra).toBe(1000); // Sobram 1000g de farinha
    expect(sobraFarinha.sobraFormatada).toBe('1 kg');
    expect(resultado.custoUnitario).toBe(17); // (1000 * 0.005) + (800 * 0.015) = 5 + 12 = 17
    expect(resultado.custoTotalProducao).toBe(34); // 17 * 2 = 34
  });

  it('deve retornar rendimento zero se faltar algum ingrediente essencial', () => {
    const insumosUsuario = [
      { insumo_id: 1, quantidade_base: 3000 },
      { insumo_id: 2, quantidade_base: 100 } // Não dá nem para 1 cento
    ];

    const resultado = simularCapacidade({
      ingredientesFicha: receitaCentoCoxinha,
      insumosDisponiveis: insumosUsuario
    });

    expect(resultado.rendimentoMaximo).toBe(0);
    expect(resultado.insumoLimitante.nome).toBe('Frango Desfiado');
    expect(resultado.insumoLimitante.quantidadeFaltanteProximoLote).toBe(700);
    expect(resultado.custoTotalProducao).toBe(0);
  });

  it('deve lançar erro se ingredientesFicha for vazio ou inválido', () => {
    expect(() => {
      simularCapacidade({ ingredientesFicha: [] });
    }).toThrow('A receita informada não possui ingredientes cadastrados');

    expect(() => {
      simularCapacidade({ ingredientesFicha: null });
    }).toThrow('A receita informada não possui ingredientes cadastrados');
  });

  it('deve lidar com insumosDisponiveis vazio assumindo estoque zero', () => {
    const resultado = simularCapacidade({
      ingredientesFicha: receitaCentoCoxinha,
      insumosDisponiveis: []
    });

    expect(resultado.rendimentoMaximo).toBe(0);
    expect(resultado.insumoLimitante).not.toBeNull();
    expect(resultado.sobras).toHaveLength(2);
    expect(resultado.sobras[0].quantidadeSobra).toBe(0);
  });

  it('deve suportar campo nome_insumo e diferentes unidades de medida', () => {
    const receitaBolo = [
      { insumo_id: 10, nome_insumo: 'Leite', unidade_base: 'ml', quantidade_necessaria: 500, custo_unitario: 0.006 },
      { insumo_id: 11, nome_insumo: 'Ovos', unidade_base: 'un', quantidade_necessaria: 3, custo_unitario: 0.80 }
    ];

    const insumosUsuario = [
      { insumo_id: 10, quantidade_base: 1500 }, // Dá 3 bolos
      { insumo_id: 11, quantidade_base: 4 }     // Dá 1 bolo (gargalo)
    ];

    const resultado = simularCapacidade({
      ingredientesFicha: receitaBolo,
      insumosDisponiveis: insumosUsuario
    });

    expect(resultado.rendimentoMaximo).toBe(1);
    expect(resultado.insumoLimitante.nome).toBe('Ovos');
    expect(resultado.insumoLimitante.quantidadeFaltanteProximoLote).toBe(2); // Faltam 2 ovos para 2 bolos (6 necessários - 4 disponíveis)
    expect(resultado.insumoLimitante.faltaFormatada).toBe('2 un');

    const sobraLeite = resultado.sobras.find(s => s.nome === 'Leite');
    expect(sobraLeite.quantidadeSobra).toBe(1000);
    expect(sobraLeite.sobraFormatada).toBe('1 L');
  });
});

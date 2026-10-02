const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function seed() {
  const connection = await pool.getConnection();
  try {
    console.log('🌱 Iniciando seed do banco de dados MEI...');
    await connection.beginTransaction();

    const EMAIL_DEMO = 'admin@mei.com';
    const SENHA_DEMO = 'admin123';

    // 1. Limpa dados prévios do usuário demo se existirem
    const [userRows] = await connection.execute(
      'SELECT id FROM usuarios WHERE email = ?',
      [EMAIL_DEMO]
    );

    if (userRows.length > 0) {
      const userId = userRows[0].id;
      console.log(`🧹 Removendo dados anteriores do usuário demo (ID: ${userId})...`);
      await connection.execute('DELETE FROM movimentacoes WHERE usuario_id = ?', [userId]);
      await connection.execute('DELETE FROM cobrancas WHERE usuario_id = ?', [userId]);
      await connection.execute('DELETE FROM agendamentos WHERE usuario_id = ?', [userId]);
      await connection.execute(
        'DELETE FROM orcamento_itens WHERE orcamento_id IN (SELECT id FROM orcamentos WHERE usuario_id = ?)',
        [userId]
      );
      await connection.execute('DELETE FROM orcamentos WHERE usuario_id = ?', [userId]);
      await connection.execute('DELETE FROM servicos WHERE usuario_id = ?', [userId]);
      await connection.execute('DELETE FROM clientes WHERE usuario_id = ?', [userId]);
      await connection.execute('DELETE FROM usuarios WHERE id = ?', [userId]);
    }

    // 2. Cria Usuário MEI Demo
    const senhaHash = await bcrypt.hash(SENHA_DEMO, 10);
    const [userResult] = await connection.execute(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      ['João Victor (MEI Demo)', EMAIL_DEMO, senhaHash]
    );
    const usuarioId = userResult.insertId;
    console.log(`✅ Usuário criado com sucesso (ID: ${usuarioId})`);

    // 3. Cria Clientes
    const clientesData = [
      {
        nome: 'Carlos Eduardo Santos',
        telefone: '(11) 98765-4321',
        email: 'carlos.santos@email.com',
        endereco: 'Rua das Flores, 142 - Apto 31, São Paulo - SP',
        observacoes: 'Cliente preferencial. Atendimento sempre no período da tarde.',
      },
      {
        nome: 'Mariana Souza Lima',
        telefone: '(11) 91234-5678',
        email: 'mariana.souza@comercio.com',
        endereco: 'Av. Paulista, 1000 - Sala 402, São Paulo - SP',
        observacoes: 'Loja comercial. Emitir recibo detalhado.',
      },
      {
        nome: 'Roberto Mendes de Oliveira',
        telefone: '(11) 97777-8888',
        email: 'roberto@construtora.com',
        endereco: 'Rua Bela Cintra, 850, São Paulo - SP',
        observacoes: 'Reforma em andamento. Contato com o mestre de obras.',
      },
      {
        nome: 'Beatriz Albuquerque',
        telefone: '(11) 96543-2109',
        email: 'beatriz@escritorio.adv.br',
        endereco: 'Rua Vergueiro, 500 - Conjunto 12, São Paulo - SP',
        observacoes: 'Indicação de Carlos Eduardo.',
      },
    ];

    const clienteIds = {};
    for (const c of clientesData) {
      const [res] = await connection.execute(
        `INSERT INTO clientes (usuario_id, nome, telefone, email, endereco, observacoes, ativo)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [usuarioId, c.nome, c.telefone, c.email, c.endereco, c.observacoes]
      );
      clienteIds[c.nome] = res.insertId;
    }
    console.log(`✅ 4 Clientes cadastrados`);

    // 4. Cria Serviços no Catálogo
    const servicosData = [
      {
        nome: 'Instalação Elétrica Residencial Padrão',
        descricao: 'Instalação ou troca de circuitos elétricos, interruptores e luminárias.',
        preco: 250.0,
        categoria: 'Elétrica',
      },
      {
        nome: 'Troca de Fiação e Quadro de Disjuntores',
        descricao: 'Substituição completa de fiação antiga com montagem de quadro com DR e DPS.',
        preco: 450.0,
        categoria: 'Elétrica',
      },
      {
        nome: 'Manutenção Preventiva de Ar-Condicionado',
        descricao: 'Higienização de serpentina, limpeza de filtros, verificação de pressão do gás.',
        preco: 180.0,
        categoria: 'Climatização',
      },
      {
        nome: 'Instalação de Ponto de Tomada 220V',
        descricao: 'Puxada de circuito exclusivo com disjuntor dedicado para torneira ou ar.',
        preco: 90.0,
        categoria: 'Elétrica',
      },
      {
        nome: 'Consultoria Técnica de Eficiência Energética',
        descricao: 'Diagnóstico de sobrecarga, dimensionamento de carga e redução de consumo.',
        preco: 350.0,
        categoria: 'Consultoria',
      },
    ];

    const servicoIds = {};
    for (const s of servicosData) {
      const [res] = await connection.execute(
        `INSERT INTO servicos (usuario_id, nome, descricao, preco, categoria, ativo)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [usuarioId, s.nome, s.descricao, s.preco, s.categoria]
      );
      servicoIds[s.nome] = res.insertId;
    }
    console.log(`✅ 5 Serviços cadastrados no catálogo`);

    // Datas de referência
    const hoje = new Date();
    const formatData = (d) => d.toISOString().split('T')[0];
    const dataHoje = formatData(hoje);

    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);
    const dataAmanha = formatData(amanha);

    const em7Dias = new Date(hoje);
    em7Dias.setDate(hoje.getDate() + 7);
    const dataEm7Dias = formatData(em7Dias);

    const em15Dias = new Date(hoje);
    em15Dias.setDate(hoje.getDate() + 15);
    const dataEm15Dias = formatData(em15Dias);

    const ha3Dias = new Date(hoje);
    ha3Dias.setDate(hoje.getDate() - 3);
    const dataHa3Dias = formatData(ha3Dias);

    // 5. Cria Agendamentos
    const agendamentosData = [
      {
        cliente_id: clienteIds['Carlos Eduardo Santos'],
        servico_id: servicoIds['Instalação Elétrica Residencial Padrão'],
        data_hora: `${dataHoje} 10:00:00`,
        status: 'CONFIRMADO',
        observacoes: 'Levar disjuntores de 20A sobressalentes.',
      },
      {
        cliente_id: clienteIds['Mariana Souza Lima'],
        servico_id: servicoIds['Troca de Fiação e Quadro de Disjuntores'],
        data_hora: `${dataHoje} 15:30:00`,
        status: 'PENDENTE',
        observacoes: 'Acesso pela portaria de serviço.',
      },
      {
        cliente_id: clienteIds['Roberto Mendes de Oliveira'],
        servico_id: servicoIds['Manutenção Preventiva de Ar-Condicionado'],
        data_hora: `${dataAmanha} 09:00:00`,
        status: 'CONFIRMADO',
        observacoes: 'Aparelho na sala principal da cobertura.',
      },
      {
        cliente_id: clienteIds['Beatriz Albuquerque'],
        servico_id: servicoIds['Consultoria Técnica de Eficiência Energética'],
        data_hora: `${dataEm7Dias} 14:00:00`,
        status: 'PENDENTE',
        observacoes: 'Analisar contas de luz dos últimos 6 meses.',
      },
    ];

    for (const a of agendamentosData) {
      await connection.execute(
        `INSERT INTO agendamentos (usuario_id, cliente_id, servico_id, data_hora, status, observacoes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [usuarioId, a.cliente_id, a.servico_id, a.data_hora, a.status, a.observacoes]
      );
    }
    console.log(`✅ 4 Agendamentos criados`);

    // 6. Cria Orçamentos com Itens
    // Orçamento 1: Mariana Souza (Aprovado)
    const [orc1Result] = await connection.execute(
      `INSERT INTO orcamentos (usuario_id, cliente_id, data_emissao, validade, status, subtotal, desconto, total, observacoes)
       VALUES (?, ?, ?, ?, 'APROVADO', 630.00, 30.00, 600.00, ?)`,
      [
        usuarioId,
        clienteIds['Mariana Souza Lima'],
        dataHa3Dias,
        dataEm15Dias,
        'Condições: 50% de entrada e 50% após a conclusão da instalação.',
      ]
    );
    const orc1Id = orc1Result.insertId;
    await connection.execute(
      `INSERT INTO orcamento_itens (orcamento_id, servico_id, quantidade, preco_unitario, subtotal)
       VALUES (?, ?, 1, 450.00, 450.00), (?, ?, 2, 90.00, 180.00)`,
      [
        orc1Id,
        servicoIds['Troca de Fiação e Quadro de Disjuntores'],
        orc1Id,
        servicoIds['Instalação de Ponto de Tomada 220V'],
      ]
    );

    // Orçamento 2: Roberto Mendes (Enviado)
    const [orc2Result] = await connection.execute(
      `INSERT INTO orcamentos (usuario_id, cliente_id, data_emissao, validade, status, subtotal, desconto, total, observacoes)
       VALUES (?, ?, ?, ?, 'ENVIADO', 360.00, 0.00, 360.00, ?)`,
      [
        usuarioId,
        clienteIds['Roberto Mendes de Oliveira'],
        dataHoje,
        dataEm7Dias,
        'Manutenção preventiva para 2 unidades split.',
      ]
    );
    const orc2Id = orc2Result.insertId;
    await connection.execute(
      `INSERT INTO orcamento_itens (orcamento_id, servico_id, quantidade, preco_unitario, subtotal)
       VALUES (?, ?, 2, 180.00, 360.00)`,
      [orc2Id, servicoIds['Manutenção Preventiva de Ar-Condicionado']]
    );

    // Orçamento 3: Beatriz Albuquerque (Rascunho)
    const [orc3Result] = await connection.execute(
      `INSERT INTO orcamentos (usuario_id, cliente_id, data_emissao, validade, status, subtotal, desconto, total, observacoes)
       VALUES (?, ?, ?, ?, 'RASCUNHO', 600.00, 0.00, 600.00, ?)`,
      [
        usuarioId,
        clienteIds['Beatriz Albuquerque'],
        dataHoje,
        dataEm15Dias,
        'Proposta preliminar de consultoria e revisão de quadros.',
      ]
    );
    const orc3Id = orc3Result.insertId;
    await connection.execute(
      `INSERT INTO orcamento_itens (orcamento_id, servico_id, quantidade, preco_unitario, subtotal)
       VALUES (?, ?, 1, 350.00, 350.00), (?, ?, 1, 250.00, 250.00)`,
      [
        orc3Id,
        servicoIds['Consultoria Técnica de Eficiência Energética'],
        orc3Id,
        servicoIds['Instalação Elétrica Residencial Padrão'],
      ]
    );
    console.log(`✅ 3 Orçamentos com itens gerados`);

    // 7. Cria Cobranças
    // Cobrança 1: Mariana Souza - Paga
    const [cob1Res] = await connection.execute(
      `INSERT INTO cobrancas (usuario_id, cliente_id, orcamento_id, valor, vencimento, status, data_pagamento, observacoes)
       VALUES (?, ?, ?, 600.00, ?, 'PAGO', ?, 'Pagamento recebido integral via Pix.')`,
      [usuarioId, clienteIds['Mariana Souza Lima'], orc1Id, dataHoje, dataHoje]
    );
    const cob1Id = cob1Res.insertId;

    // Cobrança 2: Carlos Eduardo - Pendente
    await connection.execute(
      `INSERT INTO cobrancas (usuario_id, cliente_id, orcamento_id, valor, vencimento, status, observacoes)
       VALUES (?, ?, NULL, 250.00, ?, 'PENDENTE', 'Aguardando confirmação do Pix.')`,
      [usuarioId, clienteIds['Carlos Eduardo Santos'], dataEm7Dias]
    );

    // Cobrança 3: Roberto Mendes - Atrasada
    await connection.execute(
      `INSERT INTO cobrancas (usuario_id, cliente_id, orcamento_id, valor, vencimento, status, observacoes)
       VALUES (?, ?, NULL, 360.00, ?, 'ATRASADO', 'Aviso de vencimento enviado por WhatsApp.')`,
      [usuarioId, clienteIds['Roberto Mendes de Oliveira'], dataHa3Dias]
    );
    console.log(`✅ 3 Cobranças emitidas (1 Paga, 1 Pendente, 1 Atrasada)`);

    // 8. Cria Movimentações no Livro Caixa
    // Entrada automática da Cobrança 1
    await connection.execute(
      `INSERT INTO movimentacoes (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao)
       VALUES (?, ?, 'ENTRADA', 'Recebimento de Cobrança', 600.00, ?, ?)`,
      [
        usuarioId,
        cob1Id,
        dataHoje,
        `Recebimento ref. cobrança #${cob1Id} (Mariana Souza Lima)`,
      ]
    );

    // Entrada avulsa de atendimento rápido
    await connection.execute(
      `INSERT INTO movimentacoes (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao)
       VALUES (?, NULL, 'ENTRADA', 'Serviço', 350.00, ?, 'Conserto emergencial de disjuntor à vista em dinheiro')`,
      [usuarioId, dataHa3Dias]
    );

    // Saída: Guia DAS do MEI
    await connection.execute(
      `INSERT INTO movimentacoes (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao)
       VALUES (?, NULL, 'SAIDA', 'DAS-MEI', 75.00, ?, 'Pagamento do Documento de Arrecadação Simplificada do MEI (DAS)')`,
      [usuarioId, dataHa3Dias]
    );

    // Saída: Insumos elétricos
    await connection.execute(
      `INSERT INTO movimentacoes (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao)
       VALUES (?, NULL, 'SAIDA', 'Material', 145.00, ?, 'Compra de fita isolante, conectores Wago e cabos 2.5mm')`,
      [usuarioId, dataHa3Dias]
    );

    // Saída: Transporte
    await connection.execute(
      `INSERT INTO movimentacoes (usuario_id, cobranca_id, tipo, categoria, valor, data_movimentacao, descricao)
       VALUES (?, NULL, 'SAIDA', 'Transporte', 60.00, ?, 'Combustível para visita técnica aos clientes')`,
      [usuarioId, dataHoje]
    );
    console.log(`✅ 5 Movimentações lançadas no Livro Caixa (R$ 950 em entradas, R$ 280 em saídas)`);

    await connection.commit();
    console.log('\n🎉 SEED CONCLUÍDO COM SUCESSO!');
    console.log('----------------------------------------------------');
    console.log('🔑 CREDENCIAIS DE ACESSO DO MEI:');
    console.log(`📧 E-mail: ${EMAIL_DEMO}`);
    console.log(`🔒 Senha : ${SENHA_DEMO}`);
    console.log('----------------------------------------------------\n');
  } catch (err) {
    await connection.rollback();
    console.error('❌ Erro ao executar seed:', err);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

seed();

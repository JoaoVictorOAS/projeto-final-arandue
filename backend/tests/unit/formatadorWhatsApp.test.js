const { converterMarkdownParaWhatsApp, converterTabelasMarkdown } = require('../../src/utils/formatadorWhatsApp');

describe('formatadorWhatsApp - Conversão de Markdown para WhatsApp', () => {
  it('deve converter títulos markdown em negrito destacado', () => {
    const md = '# Resumo Financeiro\n## Mês Atual\n### Entradas';
    const res = converterMarkdownParaWhatsApp(md);

    expect(res).toContain('*Resumo Financeiro*');
    expect(res).toContain('*Mês Atual*');
    expect(res).toContain('*Entradas*');
  });

  it('deve converter negrito padrão markdown (**) para negrito do WhatsApp (*)', () => {
    const md = 'Seu saldo atual é **R$ 1.500,00** e você possui **3 clientes** pendentes.';
    const res = converterMarkdownParaWhatsApp(md);

    expect(res).toBe('Seu saldo atual é *R$ 1.500,00* e você possui *3 clientes* pendentes.');
  });

  it('deve converter links markdown em texto seguido da URL entre parênteses', () => {
    const md = 'Consulte mais detalhes no [Portal do Empreendedor](https://gov.br/mei).';
    const res = converterMarkdownParaWhatsApp(md);

    expect(res).toBe('Consulte mais detalhes no Portal do Empreendedor (https://gov.br/mei).');
  });

  it('deve converter listas com hífen ou asterisco para marcadores com bullet (•)', () => {
    const md = '- Item 1\n- Item 2\n* Item 3';
    const res = converterMarkdownParaWhatsApp(md);

    expect(res).toBe('• Item 1\n• Item 2\n• Item 3');
  });

  it('deve converter tabelas markdown em itens listados com cabeçalhos', () => {
    const md = `
| Cliente | Valor | Status |
| :--- | :--- | :--- |
| João Silva | R$ 250,00 | Pago |
| Maria Souza | R$ 180,00 | Pendente |
    `.trim();

    const res = converterTabelasMarkdown(md);

    expect(res).toContain('• *Cliente*: João Silva | *Valor*: R$ 250,00 | *Status*: Pago');
    expect(res).toContain('• *Cliente*: Maria Souza | *Valor*: R$ 180,00 | *Status*: Pendente');
  });

  it('deve lidar com textos vazios ou inválidos sem quebrar', () => {
    expect(converterMarkdownParaWhatsApp(null)).toBe('');
    expect(converterMarkdownParaWhatsApp('')).toBe('');
    expect(converterMarkdownParaWhatsApp(undefined)).toBe('');
  });
});

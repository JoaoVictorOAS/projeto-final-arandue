/**
 * Utilitário de formatação de texto Markdown para o formato nativo do WhatsApp.
 * Converte títulos, negrito, itálico, tabelas e links markdown para mensagens legíveis no celular.
 */

/**
 * Converte uma tabela markdown simples para uma listagem amigável de itens.
 * @param {string} markdown 
 * @returns {string}
 */
function converterTabelasMarkdown(markdown) {
  const linhas = markdown.split('\n');
  const resultado = [];
  let dentroDeTabela = false;
  let cabecalhos = [];

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();

    if (linha.startsWith('|') && linha.endsWith('|')) {
      const colunas = linha
        .split('|')
        .slice(1, -1)
        .map(c => c.trim());

      // Linha separadora (|---|---|)
      if (colunas.every(c => /^[-:\s]+$/.test(c))) {
        dentroDeTabela = true;
        continue;
      }

      if (!dentroDeTabela) {
        cabecalhos = colunas;
        dentroDeTabela = true;
      } else {
        // Linha de dados da tabela
        if (cabecalhos.length > 0 && colunas.length > 0) {
          const dadosFormatados = colunas
            .map((col, idx) => {
              const label = cabecalhos[idx] ? `*${cabecalhos[idx]}*: ` : '';
              return `${label}${col}`;
            })
            .join(' | ');
          resultado.push(`• ${dadosFormatados}`);
        } else {
          resultado.push(`• ${colunas.join(' - ')}`);
        }
      }
    } else {
      if (dentroDeTabela) {
        dentroDeTabela = false;
        cabecalhos = [];
        resultado.push('');
      }
      resultado.push(linhas[i]);
    }
  }

  return resultado.join('\n');
}

/**
 * Converte texto em Markdown padrão para formatação compatível com WhatsApp.
 * @param {string} texto 
 * @returns {string}
 */
function converterMarkdownParaWhatsApp(texto) {
  if (!texto || typeof texto !== 'string') return '';

  let formatado = texto;

  // 1. Converte tabelas markdown antes de formatar os outros elementos
  formatado = converterTabelasMarkdown(formatado);

  // 2. Converte Títulos (# Titulo -> *TITULO*)
  formatado = formatado.replace(/^### (.*$)/gim, '\n*$1*\n');
  formatado = formatado.replace(/^## (.*$)/gim, '\n*$1*\n');
  formatado = formatado.replace(/^# (.*$)/gim, '\n*$1*\n');

  // 3. Converte links markdown: [Texto](http://url) -> Texto (http://url)
  formatado = formatado.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '$1 ($2)');

  // 4. Converte negrito duplo (markdown standard **texto**) para negrito WhatsApp (*texto*)
  formatado = formatado.replace(/\*\*([^*]+)\*\*/g, '*$1*');

  // 5. Converte tachado (~~texto~~ -> ~texto~)
  formatado = formatado.replace(/~~([^~]+)~~/g, '~$1~');

  // 6. Converte marcadores de lista (* item ou - item -> • item)
  formatado = formatado.replace(/^[\*\-] (.+)$/gim, '• $1');

  // 7. Remove linhas em branco excessivas (máximo 2 consecutivas)
  formatado = formatado.replace(/\n{3,}/g, '\n\n');

  return formatado.trim();
}

module.exports = {
  converterMarkdownParaWhatsApp,
  converterTabelasMarkdown
};

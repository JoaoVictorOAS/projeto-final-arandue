/**
 * Parser de arquivos XML de NF-e (Modelo 55 e 65) para extração de itens e compras de insumos.
 * Suporta o layout padrão nacional SEFAZ v4.00.
 */

function extrairTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].trim() : null;
}

const leitorXmlNfe = {
  /**
   * Faz o parse de uma string XML de NF-e e extrai emitente, totais e itens de produto.
   * @param {string} xmlString
   * @returns {Object} Dados estruturados da nota fiscal
   */
  parse(xmlString) {
    if (!xmlString || typeof xmlString !== 'string' || !xmlString.trim()) {
      throw new Error('XML inválido ou vazio');
    }

    const xml = xmlString.trim();

    // 1. Extração do cabeçalho da nota
    const ideBloco = extrairTag(xml, 'ide') || '';
    const numero_documento = extrairTag(ideBloco, 'nNF') || extrairTag(xml, 'nNF');
    const serie = extrairTag(ideBloco, 'serie') || extrairTag(xml, 'serie') || '1';
    const data_emissao = extrairTag(ideBloco, 'dhEmi') || extrairTag(ideBloco, 'dEmi') || null;

    // 2. Extração do Fornecedor / Emitente
    const emitBloco = extrairTag(xml, 'emit') || '';
    const fornecedor_nome = extrairTag(emitBloco, 'xNome') || extrairTag(emitBloco, 'xFant') || 'Fornecedor Não Identificado';
    const fornecedor_cnpj = extrairTag(emitBloco, 'CNPJ') || extrairTag(emitBloco, 'CPF') || null;

    // 3. Extração dos Totais
    const totalBloco = extrairTag(xml, 'total') || '';
    const icmsTotBloco = extrairTag(totalBloco, 'ICMSTot') || '';
    const valor_total_raw = extrairTag(icmsTotBloco, 'vNF') || extrairTag(totalBloco, 'vNF') || '0';
    const valor_total = parseFloat(valor_total_raw) || 0;

    // 4. Extração dos Itens (<det> ... </det>)
    const detRegex = /<det\b[^>]*>([\s\S]*?)<\/det>/gi;
    const itens = [];
    let match;

    while ((match = detRegex.exec(xml)) !== null) {
      const detConteudo = match[1];
      const prodConteudo = extrairTag(detConteudo, 'prod');
      if (!prodConteudo) continue;

      const cProd = extrairTag(prodConteudo, 'cProd') || '';
      const xProd = extrairTag(prodConteudo, 'xProd') || 'Produto sem descrição';
      const uCom = (extrairTag(prodConteudo, 'uCom') || 'UN').toUpperCase().trim();
      const qCom = parseFloat(extrairTag(prodConteudo, 'qCom') || '1') || 1;
      const vUnCom = parseFloat(extrairTag(prodConteudo, 'vUnCom') || '0') || 0;
      const vProd = parseFloat(extrairTag(prodConteudo, 'vProd') || '0') || Number((qCom * vUnCom).toFixed(2));

      itens.push({
        codigo_fornecedor: cProd,
        nome: xProd,
        unidade_original: uCom,
        quantidade_original: qCom,
        valor_unitario: vUnCom,
        valor_total: vProd
      });
    }

    if (itens.length === 0) {
      throw new Error('Não foram encontrados itens de produtos válidos no XML da NF-e');
    }

    return {
      numero_documento: String(numero_documento || ''),
      serie: String(serie || '1'),
      data_emissao,
      fornecedor_nome,
      fornecedor_cnpj,
      valor_total: Number(valor_total.toFixed(2)),
      itens
    };
  }
};

module.exports = leitorXmlNfe;

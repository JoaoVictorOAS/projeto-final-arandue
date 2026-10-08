/**
 * Módulo de Geração Canônica de Documentos Fiscais Eletrônicos em XML
 * - NFS-e: Padrão Nacional (DPS - Declaração de Prestação de Serviços)
 * - NF-e / NFC-e: Layout SEFAZ v4.00 (Modelos 55 e 65) para optantes pelo SIMEI
 */

/**
 * Escapa caracteres especiais XML para prevenir injeção e erros de parsing.
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
function escapeXml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Remove caracteres não numéricos.
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
function sanitizeDigits(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\D/g, '');
}

/**
 * Formata número decimal com casas fixas.
 * @param {number|string|null|undefined} value
 * @param {number} decimals
 * @returns {string}
 */
function formatDecimal(value, decimals = 2) {
  const num = Number(value);
  if (isNaN(num)) return (0).toFixed(decimals);
  return num.toFixed(decimals);
}

/**
 * Formata data no formato ISO compatível SEFAZ/DPS (AAAA-MM-DDTHH:mm:ss-03:00).
 * @param {Date|string} [date]
 * @returns {string}
 */
function formatDataHoraFiscal(date) {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

/**
 * Gera o XML canônico da NFS-e no Padrão Nacional (formato DPS).
 *
 * @param {Object} params
 * @param {Object} params.dadosEmitente Dados do MEI prestador
 * @param {Object} params.dadosTomador Dados do cliente/tomador
 * @param {Object} params.servico Discriminação e código de tributação
 * @param {Object} params.valores Valores de serviço, desconto e líquido
 * @param {string} [params.protocolo] Protocolo de autorização
 * @param {number|string} [params.numero] Número sequencial da DPS
 * @param {number|string} [params.serie] Série da DPS
 * @returns {string} XML DPS Padrão Nacional completo
 */
function gerarXmlNfse({ dadosEmitente = {}, dadosTomador = {}, servico = {}, valores = {}, protocolo = '', numero = 1, serie = 1 }) {
  const nroDPS = escapeXml(numero || 1);
  const serieDPS = escapeXml(serie || 1);
  const dataEmissao = formatDataHoraFiscal();
  const dataCompetencia = dataEmissao.slice(0, 10);

  // Prestador (MEI)
  const emitCnpj = sanitizeDigits(dadosEmitente.cnpj || dadosEmitente.documento);
  const emitNome = dadosEmitente.razaoSocial || dadosEmitente.nome || 'MEI Prestador de Serviços';
  const emitFantasia = dadosEmitente.nomeFantasia || dadosEmitente.nome || '';
  const emitIM = dadosEmitente.inscricaoMunicipal || dadosEmitente.im || '';
  const emitLogradouro = dadosEmitente.logradouro || (typeof dadosEmitente.endereco === 'object' ? dadosEmitente.endereco?.logradouro : dadosEmitente.endereco) || 'Endereço Comercial';
  const emitNumero = dadosEmitente.numero || (typeof dadosEmitente.endereco === 'object' ? dadosEmitente.endereco?.numero : 'S/N') || 'S/N';
  const emitBairro = dadosEmitente.bairro || (typeof dadosEmitente.endereco === 'object' ? dadosEmitente.endereco?.bairro : 'Centro') || 'Centro';
  const emitCMun = sanitizeDigits(dadosEmitente.codigoMunicipioIbge || dadosEmitente.codigoMunicipio || (typeof dadosEmitente.endereco === 'object' ? dadosEmitente.endereco?.codigoMunicipio : '3550308')) || '3550308';
  const emitXMun = dadosEmitente.municipio || (typeof dadosEmitente.endereco === 'object' ? dadosEmitente.endereco?.municipio : 'São Paulo') || 'São Paulo';
  const emitUF = dadosEmitente.uf || (typeof dadosEmitente.endereco === 'object' ? dadosEmitente.endereco?.uf : 'SP') || 'SP';
  const emitCEP = sanitizeDigits(dadosEmitente.cep || (typeof dadosEmitente.endereco === 'object' ? dadosEmitente.endereco?.cep : '')) || '01001000';
  const emitFone = sanitizeDigits(dadosEmitente.telefone);
  const emitEmail = dadosEmitente.email || '';

  // Tomador
  const tomadorDoc = sanitizeDigits(dadosTomador.documento || dadosTomador.cpf || dadosTomador.cnpj || '');
  const isCpf = tomadorDoc.length <= 11;
  const tomadorNome = dadosTomador.nome || dadosTomador.razaoSocial || 'Tomador do Serviço';
  const tomadorEmail = dadosTomador.email || '';
  const tomadorFone = sanitizeDigits(dadosTomador.telefone);
  const tomadorEnd = typeof dadosTomador.endereco === 'string' ? dadosTomador.endereco : (dadosTomador.endereco?.logradouro || '');

  // Serviço
  const descServico = servico.discriminacao || servico.descricao || servico.discriminacao_servico || 'Prestação de serviços gerais';
  const codTribNac = servico.codigoTributacaoNacional || servico.codigo_tributacao_nacional || '01.07.01';
  const codLocIncid = sanitizeDigits(servico.codigoMunicipioIbge || servico.codigo_municipio_ibge || emitCMun) || emitCMun;

  // Valores
  const vServ = valores.valorServico ?? valores.valor_total ?? valores.valor ?? 0;
  const vDesc = valores.desconto ?? valores.valor_desconto ?? 0;
  const vLiq = valores.valorLiquido ?? valores.valor_liquido ?? (Number(vServ) - Number(vDesc));

  return `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infDPS Id="DPS${nroDPS}">
    <tpAmb>2</tpAmb>
    <dhEmi>${dataEmissao}</dhEmi>
    <verAplic>Arandue_v1.0</verAplic>
    <serie>${serieDPS}</serie>
    <nDPS>${nroDPS}</nDPS>
    <dCompet>${dataCompetencia}</dCompet>
    <prestador>
      <CNPJ>${emitCnpj}</CNPJ>
      <xNome>${escapeXml(emitNome)}</xNome>
      ${emitFantasia ? `<xFant>${escapeXml(emitFantasia)}</xFant>` : ''}
      ${emitIM ? `<IM>${escapeXml(emitIM)}</IM>` : ''}
      <end>
        <xLgr>${escapeXml(emitLogradouro)}</xLgr>
        <nro>${escapeXml(emitNumero)}</nro>
        <xBairro>${escapeXml(emitBairro)}</xBairro>
        <cMun>${escapeXml(emitCMun)}</cMun>
        <xMun>${escapeXml(emitXMun)}</xMun>
        <UF>${escapeXml(emitUF)}</UF>
        <CEP>${escapeXml(emitCEP)}</CEP>
      </end>
      ${emitFone ? `<fone>${escapeXml(emitFone)}</fone>` : ''}
      ${emitEmail ? `<email>${escapeXml(emitEmail)}</email>` : ''}
      <regimeTributario>SIMEI</regimeTributario>
      <optanteSimplesNacional>1</optanteSimplesNacional>
    </prestador>
    <tomador>
      ${isCpf ? `<CPF>${tomadorDoc}</CPF>` : `<CNPJ>${tomadorDoc}</CNPJ>`}
      <xNome>${escapeXml(tomadorNome)}</xNome>
      ${tomadorEnd ? `<end><xLgr>${escapeXml(tomadorEnd)}</xLgr></end>` : ''}
      ${tomadorFone ? `<fone>${escapeXml(tomadorFone)}</fone>` : ''}
      ${tomadorEmail ? `<email>${escapeXml(tomadorEmail)}</email>` : ''}
    </tomador>
    <servico>
      <cTribNac>${escapeXml(codTribNac)}</cTribNac>
      <cLocIncid>${escapeXml(codLocIncid)}</cLocIncid>
      <xDescServ>${escapeXml(descServico)}</xDescServ>
    </servico>
    <valores>
      <vServPrest>
        <vServ>${formatDecimal(vServ)}</vServ>
      </vServPrest>
      <vDescIncond>${formatDecimal(vDesc)}</vDescIncond>
      <vLiq>${formatDecimal(vLiq)}</vLiq>
      <tribTotal>
        <vTotTrib>0.00</vTotTrib>
        <pTotTrib>0.00</pTotTrib>
      </tribTotal>
    </valores>
    <infAdic>
      <infCpl>EMITIDO POR MEI - MICROEMPREENDEDOR INDIVIDUAL. OPTANTE PELO SIMEI. NÃO GERA DIREITO A CRÉDITO FISCAL DE ISS / IPI / ICMS.</infCpl>
    </infAdic>
  </infDPS>
  ${protocolo ? `<protocolo>${escapeXml(protocolo)}</protocolo>` : ''}
</DPS>`;
}

/**
 * Gera o XML SEFAZ layout v4.00 para NF-e (Modelo 55) e NFC-e (Modelo 65).
 *
 * @param {Object} params
 * @param {string} params.chave Chave de acesso de 44 dígitos
 * @param {Object} params.dadosEmitente Dados do MEI emitente
 * @param {Object} [params.dadosDestinatario] Dados do cliente / destinatário
 * @param {Array<Object>} params.itens Itens da nota fiscal
 * @param {Object} params.totais Totais da nota (valor_total, valor_desconto, valor_liquido)
 * @param {string} [params.protocolo] Protocolo de autorização
 * @param {string|number} [params.modelo] Modelo ('55' ou '65')
 * @param {string|number} [params.serie] Série do documento
 * @param {string|number} [params.numero] Número do documento
 * @returns {string} XML NF-e layout v4.00 completo
 */
function gerarXmlNfe({ chave, dadosEmitente = {}, dadosDestinatario = null, itens = [], totais = {}, protocolo = '', modelo = '55', serie = 1, numero = 1 }) {
  if (!chave || String(chave).length !== 44) {
    throw new Error('Chave de acesso SEFAZ de 44 dígitos é obrigatória para emissão de NF-e/NFC-e');
  }

  const modeloStr = String(modelo).trim();
  const isNfce = modeloStr === '65';
  const cUF = chave.substring(0, 2);
  const cNF = chave.substring(35, 43);
  const cDV = chave.substring(43, 44);
  const dhEmi = formatDataHoraFiscal();
  const natOp = isNfce ? 'Venda a consumidor' : 'Venda de mercadorias';

  // Emitente
  const emitCnpj = sanitizeDigits(dadosEmitente.cnpj || dadosEmitente.documento);
  const emitNome = dadosEmitente.razaoSocial || dadosEmitente.nome || 'MEI Emitente';
  const emitFantasia = dadosEmitente.nomeFantasia || dadosEmitente.nome || '';
  const emitIE = dadosEmitente.ie || dadosEmitente.inscricaoEstadual || 'ISENTO';
  const emitLgr = dadosEmitente.logradouro || (typeof dadosEmitente.endereco === 'object' ? dadosEmitente.endereco?.logradouro : dadosEmitente.endereco) || 'Rua Principal';
  const emitNro = dadosEmitente.numero || (typeof dadosEmitente.endereco === 'object' ? dadosEmitente.endereco?.numero : 'S/N') || 'S/N';
  const emitBairro = dadosEmitente.bairro || (typeof dadosEmitente.endereco === 'object' ? dadosEmitente.endereco?.bairro : 'Centro') || 'Centro';
  const emitCMun = sanitizeDigits(dadosEmitente.codigoMunicipioIbge || dadosEmitente.codigoMunicipio || (typeof dadosEmitente.endereco === 'object' ? dadosEmitente.endereco?.codigoMunicipio : '3550308')) || '3550308';
  const emitXMun = dadosEmitente.municipio || (typeof dadosEmitente.endereco === 'object' ? dadosEmitente.endereco?.municipio : 'São Paulo') || 'São Paulo';
  const emitUF = dadosEmitente.uf || (typeof dadosEmitente.endereco === 'object' ? dadosEmitente.endereco?.uf : 'SP') || 'SP';
  const emitCEP = sanitizeDigits(dadosEmitente.cep || (typeof dadosEmitente.endereco === 'object' ? dadosEmitente.endereco?.cep : '')) || '01001000';

  // Destinatário
  let xmlDest = '';
  if (dadosDestinatario && (dadosDestinatario.documento || dadosDestinatario.cpf || dadosDestinatario.cnpj || dadosDestinatario.nome)) {
    const destDoc = sanitizeDigits(dadosDestinatario.documento || dadosDestinatario.cpf || dadosDestinatario.cnpj || '');
    const isDestCpf = destDoc.length <= 11;
    const destNome = dadosDestinatario.nome || 'Consumidor Final';
    const destEmail = dadosDestinatario.email || '';
    const destLgr = dadosDestinatario.logradouro || (typeof dadosDestinatario.endereco === 'object' ? dadosDestinatario.endereco?.logradouro : dadosDestinatario.endereco) || '';
    const destNro = dadosDestinatario.numero || (typeof dadosDestinatario.endereco === 'object' ? dadosDestinatario.endereco?.numero : 'S/N') || '';
    const destBairro = dadosDestinatario.bairro || (typeof dadosDestinatario.endereco === 'object' ? dadosDestinatario.endereco?.bairro : '') || '';
    const destCMun = sanitizeDigits(dadosDestinatario.codigoMunicipioIbge || emitCMun) || emitCMun;
    const destXMun = dadosDestinatario.municipio || emitXMun;
    const destUF = dadosDestinatario.uf || emitUF;
    const destCEP = sanitizeDigits(dadosDestinatario.cep) || '';

    xmlDest = `
    <dest>
      ${destDoc ? (isDestCpf ? `<CPF>${destDoc}</CPF>` : `<CNPJ>${destDoc}</CNPJ>`) : ''}
      <xNome>${escapeXml(destNome)}</xNome>
      ${destLgr ? `
      <enderDest>
        <xLgr>${escapeXml(destLgr)}</xLgr>
        <nro>${escapeXml(destNro || 'S/N')}</nro>
        <xBairro>${escapeXml(destBairro || 'Bairro')}</xBairro>
        <cMun>${escapeXml(destCMun)}</cMun>
        <xMun>${escapeXml(destXMun)}</xMun>
        <UF>${escapeXml(destUF)}</UF>
        ${destCEP ? `<CEP>${escapeXml(destCEP)}</CEP>` : ''}
      </enderDest>` : ''}
      <indIEDest>9</indIEDest>
      ${destEmail ? `<email>${escapeXml(destEmail)}</email>` : ''}
    </dest>`;
  }

  // Itens
  const listaItens = Array.isArray(itens) && itens.length > 0 ? itens : [
    {
      numero_item: 1,
      descricao: 'Item Padrão',
      quantidade: 1,
      valor_unitario: totais.valor_liquido || totais.valor_total || 0,
      valor_total: totais.valor_liquido || totais.valor_total || 0,
      unidade: 'UN'
    }
  ];

  const xmlItens = listaItens.map((item, index) => {
    const nItem = item.numero_item || index + 1;
    const cProd = escapeXml(item.servico_id || item.codigo || String(nItem).padStart(3, '0'));
    const xProd = escapeXml(item.descricao || item.nome || 'Produto');
    const ncm = sanitizeDigits(item.ncm) || '00000000';
    const cfop = sanitizeDigits(item.cfop) || '5102';
    const uCom = escapeXml(item.unidade || 'UN');
    const qCom = formatDecimal(item.quantidade ?? 1, 4);
    const vUnCom = formatDecimal(item.valor_unitario ?? 0, 2);
    const vProd = formatDecimal(item.valor_total ?? (Number(item.quantidade || 1) * Number(item.valor_unitario || 0)), 2);
    const csosn = escapeXml(item.csosn || '102');

    return `
    <det nItem="${nItem}">
      <prod>
        <cProd>${cProd}</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>${xProd}</xProd>
        <NCM>${ncm}</NCM>
        <CFOP>${cfop}</CFOP>
        <uCom>${uCom}</uCom>
        <qCom>${qCom}</qCom>
        <vUnCom>${vUnCom}</vUnCom>
        <vProd>${vProd}</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>${uCom}</uTrib>
        <qTrib>${qCom}</qTrib>
        <vUnTrib>${vUnCom}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <ICMS>
          <ICMSSN102>
            <orig>0</orig>
            <CSOSN>${csosn}</CSOSN>
          </ICMSSN102>
        </ICMS>
        <PIS>
          <PISOutr>
            <CST>99</CST>
            <vBC>0.00</vBC>
            <pPIS>0.00</pPIS>
            <vPIS>0.00</vPIS>
          </PISOutr>
        </PIS>
        <COFINS>
          <COFINSOutr>
            <CST>99</CST>
            <vBC>0.00</vBC>
            <pCOFINS>0.00</pCOFINS>
            <vCOFINS>0.00</vCOFINS>
          </COFINSOutr>
        </COFINS>
      </imposto>
    </det>`;
  }).join('');

  // Totais
  const vTotProd = formatDecimal(totais.valor_total ?? totais.total_produtos ?? 0);
  const vTotDesc = formatDecimal(totais.valor_desconto ?? totais.desconto ?? 0);
  const vTotNF = formatDecimal(totais.valor_liquido ?? (Number(vTotProd) - Number(vTotDesc)));

  return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${chave}" versao="4.00">
    <ide>
      <cUF>${cUF}</cUF>
      <cNF>${cNF}</cNF>
      <natOp>${escapeXml(natOp)}</natOp>
      <mod>${modeloStr}</mod>
      <serie>${escapeXml(serie)}</serie>
      <nNF>${escapeXml(numero)}</nNF>
      <dhEmi>${dhEmi}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>${emitCMun}</cMunFG>
      <tpImp>${isNfce ? 4 : 1}</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${cDV}</cDV>
      <tpAmb>2</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verAplic>Arandue_v1.0</verAplic>
    </ide>
    <emit>
      <CNPJ>${emitCnpj}</CNPJ>
      <xNome>${escapeXml(emitNome)}</xNome>
      ${emitFantasia ? `<xFant>${escapeXml(emitFantasia)}</xFant>` : ''}
      <enderEmit>
        <xLgr>${escapeXml(emitLgr)}</xLgr>
        <nro>${escapeXml(emitNro)}</nro>
        <xBairro>${escapeXml(emitBairro)}</xBairro>
        <cMun>${escapeXml(emitCMun)}</cMun>
        <xMun>${escapeXml(emitXMun)}</xMun>
        <UF>${escapeXml(emitUF)}</UF>
        <CEP>${escapeXml(emitCEP)}</CEP>
      </enderEmit>
      <IE>${escapeXml(emitIE)}</IE>
      <CRT>1</CRT>
    </emit>${xmlDest}
    ${xmlItens}
    <total>
      <ICMSTot>
        <vBC>0.00</vBC>
        <vICMS>0.00</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${vTotProd}</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>${vTotDesc}</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS>
        <vCOFINS>0.00</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${vTotNF}</vNF>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>9</modFrete>
    </transp>
    <pag>
      <detPag>
        <tPag>99</tPag>
        <vPag>${vTotNF}</vPag>
      </detPag>
    </pag>
    <infAdic>
      <infCpl>DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI / ICMS.</infCpl>
    </infAdic>
  </infNFe>
  ${protocolo ? `<protNFe versao="4.00">
    <infProt>
      <tpAmb>2</tpAmb>
      <verAplic>Arandue_v1.0</verAplic>
      <chNFe>${chave}</chNFe>
      <dhRecbto>${dhEmi}</dhRecbto>
      <nProt>${escapeXml(protocolo)}</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>` : ''}
</NFe>`;
}

module.exports = {
  escapeXml,
  sanitizeDigits,
  formatDecimal,
  gerarXmlNfse,
  gerarXmlNfe
};

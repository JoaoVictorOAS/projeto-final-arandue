/**
 * Módulo Gerador de DANFE Simplificado / Espelho Fiscal
 * Gera representação HTML semântica e estilizada para NFS-e, NF-e (Mod 55) e NFC-e (Mod 65).
 */

/**
 * Escapa caracteres HTML para exibição segura.
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formata moeda em formato Real Brasileiro (R$ 0,00).
 * @param {number|string|null|undefined} valor
 * @returns {string}
 */
function formatarMoeda(valor) {
  const num = Number(valor);
  if (isNaN(num)) return '0,00';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formata data e hora no padrão brasileiro (DD/MM/AAAA HH:mm:ss).
 * @param {string|Date|null|undefined} dataStr
 * @returns {string}
 */
function formatarDataHora(dataStr) {
  if (!dataStr) return new Date().toLocaleString('pt-BR');
  const d = new Date(dataStr);
  if (isNaN(d.getTime())) return String(dataStr);
  return d.toLocaleString('pt-BR');
}

/**
 * Formata chave de acesso SEFAZ em blocos de 4 dígitos.
 * Ex: 3526 1012 3456 7800 0195 5500 1000 0000 0111 2345 6789
 * @param {string|null|undefined} chave
 * @returns {string}
 */
function formatarChaveAcesso(chave) {
  if (!chave) return '-';
  const clean = String(chave).replace(/\D/g, '');
  if (clean.length === 0) return '-';
  return clean.replace(/(\d{4})/g, '$1 ').trim();
}

/**
 * Gera documento HTML semântico com visualização formatada do DANFE / espelho fiscal.
 *
 * @param {Object} params
 * @param {Object} params.nota Registro da nota fiscal
 * @param {Array<Object>} [params.itens] Lista de itens ou produtos da nota
 * @param {Object} [params.emitente] Dados cadastrais do emitente (MEI)
 * @returns {string} Código HTML completo pronto para renderização ou impressão
 */
function gerarDanfeSimplificado({ nota = {}, itens = [], emitente = {} }) {
  const tipo = (nota.tipo || 'NFE').toUpperCase();
  const numero = nota.numero || 1;
  const serie = nota.serie || 1;
  const chaveFormatada = formatarChaveAcesso(nota.chave_acesso);
  const chaveLimpa = String(nota.chave_acesso || '').replace(/\D/g, '');
  const protocolo = nota.protocolo_autorizacao || 'HOMOLOGAÇÃO';
  const dataEmissao = formatarDataHora(nota.data_emissao);

  const emitNome = emitente.nome || emitente.razaoSocial || 'Microempreendedor Individual (MEI)';
  const emitDoc = emitente.documento || emitente.cnpj || '00.000.000/0001-00';
  const emitEmail = emitente.email || '';
  const emitMunicipio = emitente.municipio ? `${emitente.municipio} - ${emitente.uf || 'UF'}` : '';

  const destNome = nota.destinatario_nome || 'Consumidor Não Identificado';
  const destDoc = nota.destinatario_documento || '-';
  const destEnd = nota.destinatario_endereco || '-';

  const valorTotal = formatarMoeda(nota.valor_total || 0);
  const valorDesconto = formatarMoeda(nota.valor_desconto || 0);
  const valorLiquido = formatarMoeda(nota.valor_liquido || (Number(nota.valor_total || 0) - Number(nota.valor_desconto || 0)));

  let tituloDoc = 'DANFE — Documento Auxiliar da Nota Fiscal Eletrônica';
  let modeloDesc = 'Modelo 55';
  let portalUrl = 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx';

  if (tipo === 'NFSE') {
    tituloDoc = 'DANFSE — Documento Auxiliar da Nota Fiscal de Serviços Eletrônica';
    modeloDesc = 'Padrão Nacional (DPS)';
    portalUrl = 'https://www.nfse.gov.br/consulta';
  } else if (tipo === 'NFCE') {
    tituloDoc = 'DANFE NFC-e — Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica';
    modeloDesc = 'Modelo 65 (Varejo)';
    portalUrl = 'https://www.nfce.fazenda.gov.br/consulta';
  }

  // Seção de Itens / Serviços
  let corpoTabelaOuServico = '';
  if (tipo === 'NFSE') {
    corpoTabelaOuServico = `
      <div class="bloco">
        <div class="bloco-titulo">DISCRIMINAÇÃO DOS SERVIÇOS PRESTADOS</div>
        <div class="bloco-conteudo">
          <p><strong>Código de Tributação Nacional:</strong> ${escapeHtml(nota.codigo_tributacao_nacional || '01.07.01')}</p>
          <div class="discriminacao-box">
            ${escapeHtml(nota.discriminacao_servico || 'Prestação de serviços gerais.')}
          </div>
        </div>
      </div>
    `;
  } else {
    const listaItens = Array.isArray(itens) && itens.length > 0 ? itens : [
      {
        numero_item: 1,
        descricao: nota.natureza_operacao || 'Item avulso',
        quantidade: 1,
        unidade: 'UN',
        valor_unitario: nota.valor_liquido || nota.valor_total || 0,
        valor_total: nota.valor_liquido || nota.valor_total || 0
      }
    ];

    const linhasItens = listaItens.map((item, index) => `
      <tr>
        <td style="text-align: center;">${escapeHtml(item.numero_item || index + 1)}</td>
        <td>${escapeHtml(item.descricao || item.nome || 'Produto')}</td>
        <td style="text-align: center;">${escapeHtml(item.unidade || 'UN')}</td>
        <td style="text-align: right;">${escapeHtml(item.quantidade || 1)}</td>
        <td style="text-align: right;">R$ ${formatarMoeda(item.valor_unitario || 0)}</td>
        <td style="text-align: right; font-weight: bold;">R$ ${formatarMoeda(item.valor_total || 0)}</td>
      </tr>
    `).join('');

    corpoTabelaOuServico = `
      <div class="bloco">
        <div class="bloco-titulo">DADOS DOS PRODUTOS / SERVIÇOS</div>
        <div class="bloco-conteudo">
          <table class="tabela-itens">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>Descrição</th>
                <th style="width: 50px; text-align: center;">UN</th>
                <th style="width: 70px; text-align: right;">Qtd</th>
                <th style="width: 110px; text-align: right;">Valor Unit.</th>
                <th style="width: 120px; text-align: right;">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              ${linhasItens}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // QR Code URL gerado para consulta rápida
  const qrCodeData = chaveLimpa ? `${portalUrl}?ch=${chaveLimpa}` : portalUrl;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(qrCodeData)}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(tituloDoc)} — Nº ${escapeHtml(numero)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #1e293b; background: #f8fafc; padding: 24px; }
    .danfe-container { max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); padding: 28px; }
    .cabecalho { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 18px; margin-bottom: 20px; }
    .emitente-info { flex: 1; padding-right: 20px; }
    .emitente-nome { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 4px; }
    .regime-badge { display: inline-block; background: #e0e7ff; color: #3730a3; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; margin-bottom: 6px; }
    .doc-identificacao { border: 2px solid #0f172a; border-radius: 6px; padding: 12px 16px; text-align: center; min-width: 220px; background: #f8fafc; }
    .doc-tipo { font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
    .doc-detalhes { font-size: 13px; font-weight: 600; color: #334155; }
    .bloco { border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 16px; overflow: hidden; }
    .bloco-titulo { background: #f1f5f9; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; padding: 6px 12px; border-bottom: 1px solid #e2e8f0; }
    .bloco-conteudo { padding: 12px; }
    .chave-box { background: #f8fafc; border: 1px dashed #94a3b8; border-radius: 4px; padding: 10px; margin-bottom: 16px; text-align: center; }
    .chave-titulo { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    .chave-codigo { font-family: 'Courier New', Courier, monospace; font-size: 14px; font-weight: 800; color: #0f172a; letter-spacing: 1px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .tabela-itens { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 12px; }
    .tabela-itens th { background: #f8fafc; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 11px; padding: 8px; border-bottom: 1px solid #e2e8f0; }
    .tabela-itens td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
    .totais-grid { display: flex; justify-content: flex-end; margin-top: 8px; }
    .totais-tabela { width: 320px; font-size: 13px; }
    .totais-tabela tr td { padding: 6px 8px; }
    .totais-tabela .linha-total { font-size: 16px; font-weight: 800; color: #047857; border-top: 2px solid #0f172a; }
    .discriminacao-box { white-space: pre-wrap; background: #fafafa; border: 1px solid #f1f5f9; padding: 10px; border-radius: 4px; font-family: inherit; font-size: 13px; line-height: 1.5; margin-top: 6px; }
    .rodape { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #cbd5e1; padding-top: 16px; margin-top: 20px; }
    .aviso-legal { font-size: 11px; color: #64748b; line-height: 1.4; max-width: 600px; }
    .aviso-legal strong { color: #334155; }
    .qr-container { text-align: center; }
    .qr-container img { width: 90px; height: 90px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px; }
    .qr-container a { display: block; font-size: 11px; color: #2563eb; text-decoration: none; font-weight: 600; margin-top: 4px; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .danfe-container { border: none; box-shadow: none; padding: 0; width: 100%; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="danfe-container">
    <header class="cabecalho">
      <div class="emitente-info">
        <span class="regime-badge">EMISSÃO MEI — SIMEI</span>
        <h1 class="emitente-nome">${escapeHtml(emitNome)}</h1>
        <p><strong>CNPJ:</strong> ${escapeHtml(emitDoc)}</p>
        ${emitMunicipio ? `<p><strong>Localidade:</strong> ${escapeHtml(emitMunicipio)}</p>` : ''}
        ${emitEmail ? `<p><strong>Contato:</strong> ${escapeHtml(emitEmail)}</p>` : ''}
      </div>
      <div class="doc-identificacao">
        <div class="doc-tipo">${escapeHtml(tipo === 'NFSE' ? 'NFS-e NACIONAL' : (tipo === 'NFCE' ? 'NFC-e' : 'NF-e'))}</div>
        <div class="doc-detalhes">Nº ${escapeHtml(numero)} | Série ${escapeHtml(serie)}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${escapeHtml(modeloDesc)}</div>
      </div>
    </header>

    ${nota.ambiente !== 'PRODUCAO' ? `
    <div style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 6px 12px; font-size: 11px; font-weight: 700; text-align: center; border-radius: 4px; margin-bottom: 12px;">
      EMISSÃO EM AMBIENTE DE HOMOLOGAÇÃO — SEM VALOR FISCAL
    </div>` : ''}

    ${nota.chave_acesso ? `
    <div class="chave-box">
      <div class="chave-titulo">Chave de Acesso para Consulta SEFAZ / Portal Nacional</div>
      <div class="chave-codigo">${escapeHtml(chaveFormatada)}</div>
    </div>` : ''}

    <div class="bloco">
      <div class="bloco-titulo">DADOS DA AUTORIZAÇÃO E EMISSÃO</div>
      <div class="bloco-conteudo grid-3">
        <div><strong>Protocolo:</strong> ${escapeHtml(protocolo)}</div>
        <div><strong>Data/Hora de Emissão:</strong> ${escapeHtml(dataEmissao)}</div>
        <div><strong>Status:</strong> <span style="font-weight: 700; color: #047857;">${escapeHtml(nota.status || 'EMITIDA')}</span></div>
        <div><strong>Ambiente:</strong> ${escapeHtml(nota.ambiente === 'PRODUCAO' ? 'Produção' : 'Homologação (Testes)')}</div>
      </div>
    </div>

    <div class="bloco">
      <div class="bloco-titulo">DADOS DO DESTINATÁRIO / TOMADOR</div>
      <div class="bloco-conteudo grid-2">
        <div>
          <p><strong>Nome / Razão Social:</strong> ${escapeHtml(destNome)}</p>
          <p><strong>CPF / CNPJ:</strong> ${escapeHtml(destDoc)}</p>
        </div>
        <div>
          <p><strong>Endereço:</strong> ${escapeHtml(destEnd)}</p>
          ${nota.destinatario_email ? `<p><strong>E-mail:</strong> ${escapeHtml(nota.destinatario_email)}</p>` : ''}
        </div>
      </div>
    </div>

    ${corpoTabelaOuServico}

    <div class="totais-grid">
      <table class="totais-tabela">
        <tr>
          <td>Valor Total Bruto:</td>
          <td style="text-align: right;">R$ ${valorTotal}</td>
        </tr>
        <tr>
          <td>Descontos:</td>
          <td style="text-align: right;">R$ ${valorDesconto}</td>
        </tr>
        <tr class="linha-total">
          <td>VALOR LÍQUIDO A PAGAR:</td>
          <td style="text-align: right;">R$ ${valorLiquido}</td>
        </tr>
      </table>
    </div>

    <footer class="rodape">
      <div class="aviso-legal">
        <p><strong>INFORMAÇÕES COMPLEMENTARES / SIMPLES NACIONAL:</strong></p>
        <p>DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL / SIMEI.</p>
        <p>NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI / ICMS / ISS CONFORME LEGISLAÇÃO VIGENTE.</p>
      </div>
      <div class="qr-container">
        <img src="${escapeHtml(qrCodeUrl)}" alt="QR Code Consulta" />
        <a href="${escapeHtml(portalUrl)}" target="_blank" rel="noopener noreferrer">Consultar autenticidade</a>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

module.exports = {
  escapeHtml,
  formatarMoeda,
  formatarDataHora,
  formatarChaveAcesso,
  gerarDanfeSimplificado
};

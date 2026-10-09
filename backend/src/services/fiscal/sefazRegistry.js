/**
 * Registro Canônico SEFAZ para todas as 27 Unidades Federativas do Brasil.
 *
 * Mapeamento oficial de:
 * - Sigla e Nome do Estado
 * - Código IBGE (cUF)
 * - Autorizador SEFAZ (Próprio, SVRS ou SVAN)
 * - Portal Oficial de Consulta Pública do DFe
 * - Alíquota ICMS padrão interna
 *
 * Conforme MOC SEFAZ e Legislação Tributária Nacional.
 */

const REGISTRO_SEFAZ = {
  AC: {
    uf: 'AC',
    nome: 'Acre',
    cUf: '12',
    autorizador: 'SVRS',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 19
  },
  AL: {
    uf: 'AL',
    nome: 'Alagoas',
    cUf: '27',
    autorizador: 'SVRS',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 19
  },
  AP: {
    uf: 'AP',
    nome: 'Amapá',
    cUf: '16',
    autorizador: 'SVRS',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 18
  },
  AM: {
    uf: 'AM',
    nome: 'Amazonas',
    cUf: '13',
    autorizador: 'AM (Próprio)',
    portalConsulta: 'https://sistemas.sefaz.am.gov.br',
    aliquotaPadrao: 20
  },
  BA: {
    uf: 'BA',
    nome: 'Bahia',
    cUf: '29',
    autorizador: 'BA (Próprio)',
    portalConsulta: 'https://www.sefaz.ba.gov.br',
    aliquotaPadrao: 20.5
  },
  CE: {
    uf: 'CE',
    nome: 'Ceará',
    cUf: '23',
    autorizador: 'SVRS',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 20
  },
  DF: {
    uf: 'DF',
    nome: 'Distrito Federal',
    cUf: '53',
    autorizador: 'SVRS',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 20
  },
  ES: {
    uf: 'ES',
    nome: 'Espírito Santo',
    cUf: '32',
    autorizador: 'SVRS',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 17
  },
  GO: {
    uf: 'GO',
    nome: 'Goiás',
    cUf: '52',
    autorizador: 'GO (Próprio)',
    portalConsulta: 'https://nfe.sefaz.go.gov.br',
    aliquotaPadrao: 19
  },
  MA: {
    uf: 'MA',
    nome: 'Maranhão',
    cUf: '21',
    autorizador: 'SVAN',
    portalConsulta: 'https://www.sefaz.ma.gov.br',
    aliquotaPadrao: 22
  },
  MT: {
    uf: 'MT',
    nome: 'Mato Grosso',
    cUf: '51',
    autorizador: 'MT (Próprio)',
    portalConsulta: 'https://www.sefaz.mt.gov.br',
    aliquotaPadrao: 17
  },
  MS: {
    uf: 'MS',
    nome: 'Mato Grosso do Sul',
    cUf: '50',
    autorizador: 'MS (Próprio)',
    portalConsulta: 'https://www.dfe.ms.gov.br',
    aliquotaPadrao: 17
  },
  MG: {
    uf: 'MG',
    nome: 'Minas Gerais',
    cUf: '31',
    autorizador: 'MG (Próprio)',
    portalConsulta: 'https://nfe.fazenda.mg.gov.br',
    aliquotaPadrao: 18
  },
  PA: {
    uf: 'PA',
    nome: 'Pará',
    cUf: '15',
    autorizador: 'SVRS',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 19
  },
  PB: {
    uf: 'PB',
    nome: 'Paraíba',
    cUf: '25',
    autorizador: 'SVRS',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 20
  },
  PR: {
    uf: 'PR',
    nome: 'Paraná',
    cUf: '41',
    autorizador: 'PR (Próprio)',
    portalConsulta: 'https://receita.pr.gov.br',
    aliquotaPadrao: 19.5
  },
  PE: {
    uf: 'PE',
    nome: 'Pernambuco',
    cUf: '26',
    autorizador: 'PE (Próprio)',
    portalConsulta: 'https://nfe.sefaz.pe.gov.br',
    aliquotaPadrao: 20.5
  },
  PI: {
    uf: 'PI',
    nome: 'Piauí',
    cUf: '22',
    autorizador: 'SVRS',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 21
  },
  RJ: {
    uf: 'RJ',
    nome: 'Rio de Janeiro',
    cUf: '33',
    autorizador: 'RJ (Próprio)',
    portalConsulta: 'https://www.fazenda.rj.gov.br',
    aliquotaPadrao: 20
  },
  RN: {
    uf: 'RN',
    nome: 'Rio Grande do Norte',
    cUf: '24',
    autorizador: 'SVRS',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 18
  },
  RS: {
    uf: 'RS',
    nome: 'Rio Grande do Sul',
    cUf: '43',
    autorizador: 'RS (Próprio)',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 17
  },
  RO: {
    uf: 'RO',
    nome: 'Rondônia',
    cUf: '11',
    autorizador: 'SVRS',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 19.5
  },
  RR: {
    uf: 'RR',
    nome: 'Roraima',
    cUf: '14',
    autorizador: 'SVRS',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 20
  },
  SC: {
    uf: 'SC',
    nome: 'Santa Catarina',
    cUf: '42',
    autorizador: 'SVRS',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 17
  },
  SP: {
    uf: 'SP',
    nome: 'São Paulo',
    cUf: '35',
    autorizador: 'SP (Próprio)',
    portalConsulta: 'https://www.nfe.fazenda.sp.gov.br',
    aliquotaPadrao: 18
  },
  SE: {
    uf: 'SE',
    nome: 'Sergipe',
    cUf: '28',
    autorizador: 'SVRS',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 19
  },
  TO: {
    uf: 'TO',
    nome: 'Tocantins',
    cUf: '17',
    autorizador: 'SVRS',
    portalConsulta: 'https://dfe-portal.svrs.rs.gov.br',
    aliquotaPadrao: 20
  }
};

const TODAS_UFS = Object.freeze(Object.keys(REGISTRO_SEFAZ));

/**
 * Retorna todos os registros das 27 UFs em formato de array.
 *
 * @returns {Array<{ uf: string, nome: string, cUf: string, autorizador: string, portalConsulta: string, aliquotaPadrao: number }>}
 */
function listarTodasUfs() {
  return TODAS_UFS.map(uf => ({ ...REGISTRO_SEFAZ[uf] }));
}

/**
 * Obtém os dados fiscais e autorizador SEFAZ a partir da UF ou código IBGE.
 *
 * @param {string|number} ufOuIbge Sigla da UF (ex: 'SP') ou código IBGE (ex: '35' ou '3550308')
 * @returns {{ uf: string, nome: string, cUf: string, autorizador: string, portalConsulta: string, aliquotaPadrao: number } | null}
 */
function obterDadosSefazPorUf(ufOuIbge) {
  if (ufOuIbge === null || ufOuIbge === undefined) {
    return null;
  }

  const str = String(ufOuIbge).trim().toUpperCase();
  if (!str) {
    return null;
  }

  // Busca direta por sigla (ex: 'SP')
  if (REGISTRO_SEFAZ[str]) {
    return { ...REGISTRO_SEFAZ[str] };
  }

  // Busca por código numérico cUF ou código IBGE municipal
  const digits = str.replace(/\D/g, '');
  if (digits.length >= 2) {
    const cUf = digits.slice(0, 2);
    const entrada = Object.values(REGISTRO_SEFAZ).find(item => item.cUf === cUf);
    if (entrada) {
      return { ...entrada };
    }
  }

  return null;
}

/**
 * Valida se uma sigla corresponde a uma das 27 UFs brasileiras válidas.
 *
 * @param {string} uf Sigla de 2 caracteres
 * @returns {boolean}
 */
function validarUf(uf) {
  if (!uf || typeof uf !== 'string') return false;
  const siglaLimpa = uf.trim().toUpperCase();
  return siglaLimpa.length === 2 && Boolean(REGISTRO_SEFAZ[siglaLimpa]);
}

/**
 * Determina o CFOP correto da operação (Venda de mercadoria):
 * - 5102: Operação interna (mesmo estado entre emitente e destinatário)
 * - 6102: Operação interestadual (estados diferentes)
 *
 * @param {string} [ufEmitente] Sigla da UF emitente
 * @param {string} [ufDestinatario] Sigla da UF destinatária
 * @returns {'5102' | '6102'}
 */
function determinarCfopOperacao(ufEmitente, ufDestinatario) {
  if (!ufEmitente || !ufDestinatario) {
    return '5102';
  }

  const emit = String(ufEmitente).trim().toUpperCase();
  const dest = String(ufDestinatario).trim().toUpperCase();

  if (!emit || !dest || emit === dest) {
    return '5102';
  }

  return '6102';
}

const WS_HOMOLOGACAO = {
  SVRS: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NFeAutorizacao4/NFeAutorizacao4.asmx',
  SVAN: 'https://hom.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx',
  AM: 'https://homnfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4',
  BA: 'https://hnfe.sefaz.ba.gov.br/ws/NFeAutorizacao4/NFeAutorizacao4.asmx',
  GO: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4',
  MG: 'https://hnfe.fazenda.mg.gov.br/1.00/NFeAutorizacao4',
  MS: 'https://hom.nfe.fazenda.ms.gov.br/ws/NFeAutorizacao4',
  MT: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4',
  PE: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4',
  PR: 'https://homologacao.nfe.fazenda.pr.gov.br/nfe/NFeAutorizacao4',
  RS: 'https://nfe-homologacao.sefaz.rs.gov.br/ws/NFeAutorizacao4/NFeAutorizacao4.asmx',
  SP: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
};

/**
 * Retorna a URL oficial do WebService de Homologação NFeAutorizacao4 da UF
 * @param {string} uf Sigla de 2 caracteres
 * @returns {string} URL HTTPS do WebService
 */
function obterUrlWsHomologacao(uf) {
  if (!uf) return WS_HOMOLOGACAO.SVRS;
  const sigla = String(uf).trim().toUpperCase();
  const dados = REGISTRO_SEFAZ[sigla];
  if (!dados) return WS_HOMOLOGACAO.SVRS;

  if (WS_HOMOLOGACAO[sigla]) {
    return WS_HOMOLOGACAO[sigla];
  }

  const autorizadorKey = dados.autorizador.includes('Próprio')
    ? sigla
    : dados.autorizador;

  return WS_HOMOLOGACAO[autorizadorKey] || WS_HOMOLOGACAO.SVRS;
}

module.exports = {
  REGISTRO_SEFAZ,
  TODAS_UFS,
  WS_HOMOLOGACAO,
  listarTodasUfs,
  obterDadosSefazPorUf,
  validarUf,
  determinarCfopOperacao,
  obterUrlWsHomologacao
};

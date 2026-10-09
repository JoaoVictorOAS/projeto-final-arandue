/**
 * Módulo de Geração e Validação de Chaves de Acesso Fiscais:
 * - SEFAZ: NF-e (Modelo 55) e NFC-e (Modelo 65) - 44 dígitos
 * - Portal Nacional NFS-e (Padrão Nacional do MEI / SEFIN) - 50 dígitos
 *
 * Conforme MOC SEFAZ e Manual do Contribuinte do Padrão Nacional da NFS-e.
 */

const MAPA_UF_IBGE = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17',
  MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27', SE: '28', BA: '29',
  MG: '31', ES: '32', RJ: '33', SP: '35',
  PR: '41', SC: '42', RS: '43',
  MS: '50', MT: '51', GO: '52', DF: '53'
};

/**
 * Obtém o código IBGE de 2 dígitos da UF a partir da sigla ou do código IBGE do município.
 *
 * @param {string|number} siglaOuIbge
 * @returns {string} Código IBGE de 2 dígitos (ex: '35')
 */
function obterCodigoUfPorSiglaOuIbge(siglaOuIbge) {
  if (!siglaOuIbge) return '35';
  const str = String(siglaOuIbge).trim().toUpperCase();
  if (MAPA_UF_IBGE[str]) {
    return MAPA_UF_IBGE[str];
  }
  const digits = str.replace(/\D/g, '');
  if (digits.length >= 2) {
    const cUf = digits.slice(0, 2);
    if (Object.values(MAPA_UF_IBGE).includes(cUf)) {
      return cUf;
    }
  }
  return '35';
}

/**
 * Calcula o Dígito Verificador (DV) da chave SEFAZ de 43 dígitos utilizando Módulo 11.
 * Pesos de 2 a 9 da direita para a esquerda.
 * Se o resto da divisão por 11 for 0 ou 1, o DV é '0'.
 * Caso contrário, DV = String(11 - resto).
 *
 * @param {string} chave43 Chave base de 43 dígitos numéricos
 * @returns {string} Dígito verificador (1 caractere numérico)
 */
function calcularDigitoVerificadorModulo11(chave43) {
  if (!chave43 || typeof chave43 !== 'string' || !/^\d{43}$/.test(chave43)) {
    throw new Error('Chave base deve conter exatamente 43 dígitos numéricos');
  }

  let peso = 2;
  let soma = 0;

  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += parseInt(chave43[i], 10) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }

  const resto = soma % 11;
  if (resto === 0 || resto === 1) {
    return '0';
  }

  return String(11 - resto);
}

/**
 * Calcula o Dígito Verificador (DV) da chave da NFS-e Nacional de 49 posições utilizando Módulo 11.
 * Pesos de 2 a 9 da direita para a esquerda.
 * Suporta caracteres alfanuméricos convertendo para ASCII - 48.
 * Se resto for 0 ou 1, ou se (11 - resto) >= 10, o DV é '0'.
 *
 * @param {string} chave49 Chave base da NFS-e de 49 caracteres
 * @returns {string} Dígito verificador (1 caractere numérico)
 */
function calcularDigitoVerificadorNfseNacional(chave49) {
  if (!chave49 || typeof chave49 !== 'string' || chave49.length !== 49) {
    throw new Error('Chave base da NFS-e Nacional deve conter exatamente 49 posições');
  }

  let peso = 2;
  let soma = 0;

  for (let i = chave49.length - 1; i >= 0; i--) {
    const char = chave49[i];
    let val;
    if (/\d/.test(char)) {
      val = parseInt(char, 10);
    } else {
      val = char.charCodeAt(0) - 48;
    }
    soma += val * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }

  const resto = soma % 11;
  if (resto === 0 || resto === 1) {
    return '0';
  }
  const dv = 11 - resto;
  if (dv >= 10) {
    return '0';
  }
  return String(dv);
}

/**
 * Gera a chave de acesso SEFAZ completa de 44 dígitos numéricos para NF-e/NFC-e.
 *
 * @param {Object} params
 * @param {string|number} params.cUF Código da UF (2 dígitos)
 * @param {string|number} params.anoMes Ano e mês de emissão no formato AAMM (4 dígitos)
 * @param {string} params.cnpj CNPJ do emitente (com ou sem formatação, 14 dígitos)
 * @param {string|number} params.modelo Modelo do documento fiscal ('55' para NF-e, '65' para NFC-e)
 * @param {string|number} params.serie Série do documento fiscal (1 a 3 dígitos)
 * @param {string|number} params.numero Número do documento fiscal (1 a 9 dígitos)
 * @param {string|number} params.tpEmis Tipo de emissão (1 dígito, ex: '1' Normal)
 * @param {string|number} [params.codigoNumerico] Código numérico aleatório (cNF, 8 dígitos)
 * @returns {string} Chave de acesso SEFAZ com 44 dígitos numéricos
 */
function gerarChaveAcesso({ cUF, anoMes, cnpj, modelo, serie, numero, tpEmis = 1, codigoNumerico }) {
  if (
    cUF === undefined || cUF === null ||
    anoMes === undefined || anoMes === null ||
    cnpj === undefined || cnpj === null ||
    modelo === undefined || modelo === null ||
    serie === undefined || serie === null ||
    numero === undefined || numero === null
  ) {
    throw new Error('Parâmetros obrigatórios ausentes para geração da chave de acesso SEFAZ');
  }

  const cleanCnpj = String(cnpj).replace(/\D/g, '');
  const cleanAnoMes = String(anoMes).replace(/\D/g, '');

  const cUFPadded = String(cUF).replace(/\D/g, '').padStart(2, '0');
  const anoMesPadded = cleanAnoMes.padStart(4, '0');
  const cnpjPadded = cleanCnpj.padStart(14, '0');
  const modeloPadded = String(modelo).replace(/\D/g, '').padStart(2, '0');
  const seriePadded = String(serie).replace(/\D/g, '').padStart(3, '0');
  const numeroPadded = String(numero).replace(/\D/g, '').padStart(9, '0');
  const tpEmisPadded = String(tpEmis).replace(/\D/g, '').padStart(1, '0');
  
  const cNFVal = codigoNumerico !== undefined && codigoNumerico !== null
    ? String(codigoNumerico).replace(/\D/g, '').padStart(8, '0')
    : String(Math.floor(10000000 + Math.random() * 90000000));
  const codigoNumericoPadded = cNFVal.slice(-8).padStart(8, '0');

  const chave43 = `${cUFPadded}${anoMesPadded}${cnpjPadded}${modeloPadded}${seriePadded}${numeroPadded}${tpEmisPadded}${codigoNumericoPadded}`;

  if (!/^\d{43}$/.test(chave43)) {
    throw new Error('Composição da chave base SEFAZ resultou em formato inválido');
  }

  const dv = calcularDigitoVerificadorModulo11(chave43);
  return `${chave43}${dv}`;
}

/**
 * Gera a chave de acesso oficial da NFS-e Nacional (Padrão Nacional do MEI / SEFIN) com 50 dígitos.
 *
 * Estrutura:
 * - 01-07: Código IBGE do Município (7 dígitos)
 * - 08: Ambiente gerador (1 - Próprio Município; 2 - Sefin Nacional / Homologação)
 * - 09: Tipo de Inscrição Federal (1 - CPF, 2 - CNPJ)
 * - 10-23: CNPJ (14 dígitos) ou CPF (com 3 zeros à esquerda = 14 dígitos)
 * - 24-36: Número da NFS-e no Ambiente Nacional (13 dígitos com zeros à esquerda)
 * - 37-40: Ano e mês de emissão no formato AAMM (4 dígitos)
 * - 41-49: Código numérico de segurança (9 dígitos)
 * - 50: Dígito Verificador Módulo 11 oficial
 *
 * @param {Object} params
 * @param {string|number} params.codigoMunicipioIbge Código IBGE de 7 dígitos do município
 * @param {string|number} [params.ambiente=2] 2 = Ambiente Nacional / Homologação; 1 = Município
 * @param {string|number} [params.tipoInscricao=2] 1 = CPF, 2 = CNPJ
 * @param {string} params.inscricaoFederal CPF ou CNPJ do prestador MEI
 * @param {string|number} params.numero Número sequencial da NFS-e
 * @param {string|number} [params.anoMes] Ano e mês AAMM (default: mês e ano atuais)
 * @param {string|number} [params.codigoNumerico] Código numérico de 9 dígitos (gerado aleatoriamente se ausente)
 * @returns {string} Chave de acesso de 50 dígitos numéricos
 */
function gerarChaveAcessoNfseNacional({
  codigoMunicipioIbge,
  ambiente = 2,
  tipoInscricao = 2,
  inscricaoFederal,
  numero,
  anoMes,
  codigoNumerico
}) {
  if (!codigoMunicipioIbge || !inscricaoFederal || numero === undefined || numero === null) {
    throw new Error('Parâmetros obrigatórios ausentes para geração da chave de acesso NFS-e Nacional');
  }

  const munStr = String(codigoMunicipioIbge).replace(/\D/g, '').padStart(7, '0').slice(0, 7);
  const ambStr = String(ambiente).replace(/\D/g, '').slice(0, 1) || '2';
  const tipoStr = String(tipoInscricao).replace(/\D/g, '').slice(0, 1) || '2';

  const docDigits = String(inscricaoFederal).replace(/\D/g, '');
  const docPadded = docDigits.padStart(14, '0').slice(-14);

  const numPadded = String(numero).replace(/\D/g, '').padStart(13, '0').slice(-13);

  let aammStr = '';
  if (anoMes) {
    aammStr = String(anoMes).replace(/\D/g, '').padStart(4, '0').slice(-4);
  } else {
    const agora = new Date();
    aammStr = String(agora.getFullYear()).slice(-2) + String(agora.getMonth() + 1).padStart(2, '0');
  }

  let codNumStr = '';
  if (codigoNumerico !== undefined && codigoNumerico !== null) {
    codNumStr = String(codigoNumerico).replace(/\D/g, '').padStart(9, '0').slice(-9);
  } else {
    codNumStr = String(Math.floor(100000000 + Math.random() * 900000000));
  }

  const chave49 = `${munStr}${ambStr}${tipoStr}${docPadded}${numPadded}${aammStr}${codNumStr}`;
  if (chave49.length !== 49) {
    throw new Error('Composição da chave base da NFS-e Nacional resultou em comprimento inválido');
  }

  const dv = calcularDigitoVerificadorNfseNacional(chave49);
  return `${chave49}${dv}`;
}

/**
 * Valida a integridade da chave de acesso SEFAZ de 44 dígitos conferindo o DV Módulo 11.
 *
 * @param {string} chave
 * @returns {boolean}
 */
function validarChaveAcessoSefaz(chave) {
  if (!chave || typeof chave !== 'string') return false;
  const clean = chave.replace(/\D/g, '');
  if (clean.length !== 44) return false;

  const base43 = clean.slice(0, 43);
  const dvInformado = clean.slice(43, 44);

  try {
    const dvCalculado = calcularDigitoVerificadorModulo11(base43);
    return dvCalculado === dvInformado;
  } catch {
    return false;
  }
}

/**
 * Valida a integridade da chave de acesso da NFS-e Nacional de 50 dígitos conferindo o DV Módulo 11.
 *
 * @param {string} chave
 * @returns {boolean}
 */
function validarChaveAcessoNfseNacional(chave) {
  if (!chave || typeof chave !== 'string') return false;
  const clean = chave.trim().replace(/^NFS/i, '');
  if (clean.length !== 50) return false;

  const base49 = clean.slice(0, 49);
  const dvInformado = clean.slice(49, 50);

  try {
    const dvCalculado = calcularDigitoVerificadorNfseNacional(base49);
    return dvCalculado === dvInformado;
  } catch {
    return false;
  }
}

module.exports = {
  MAPA_UF_IBGE,
  obterCodigoUfPorSiglaOuIbge,
  calcularDigitoVerificadorModulo11,
  calcularDigitoVerificadorNfseNacional,
  gerarChaveAcesso,
  gerarChaveAcessoNfseNacional,
  validarChaveAcessoSefaz,
  validarChaveAcessoNfseNacional
};

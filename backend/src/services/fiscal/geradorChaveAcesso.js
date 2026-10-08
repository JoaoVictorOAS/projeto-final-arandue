/**
 * Módulo de Geração e Validação de Chave de Acesso SEFAZ (NF-e / NFC-e)
 * Conforme Manual de Orientação do Contribuinte (MOC) da SEFAZ.
 */

/**
 * Calcula o Dígito Verificador (DV) da chave de acesso de 43 dígitos utilizando o algoritmo Módulo 11.
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
 * Gera a chave de acesso SEFAZ completa de 44 dígitos numéricos para NF-e/NFC-e.
 *
 * @param {Object} params Parâmetros para composição da chave
 * @param {string|number} params.cUF Código da UF (2 dígitos)
 * @param {string|number} params.anoMes Ano e mês de emissão no formato AAMM (4 dígitos)
 * @param {string} params.cnpj CNPJ do emitente (com ou sem formatação, 14 dígitos)
 * @param {string|number} params.modelo Modelo do documento fiscal (ex: '55' para NF-e, '65' para NFC-e, 2 dígitos)
 * @param {string|number} params.serie Série do documento fiscal (1 a 3 dígitos)
 * @param {string|number} params.numero Número do documento fiscal (1 a 9 dígitos)
 * @param {string|number} params.tpEmis Tipo de emissão (1 dígito, ex: '1' Normal)
 * @param {string|number} params.codigoNumerico Código numérico aleatório (cNF, 8 dígitos)
 * @returns {string} Chave de acesso SEFAZ com 44 dígitos numéricos
 */
function gerarChaveAcesso({ cUF, anoMes, cnpj, modelo, serie, numero, tpEmis, codigoNumerico }) {
  if (
    cUF === undefined || cUF === null ||
    anoMes === undefined || anoMes === null ||
    cnpj === undefined || cnpj === null ||
    modelo === undefined || modelo === null ||
    serie === undefined || serie === null ||
    numero === undefined || numero === null ||
    tpEmis === undefined || tpEmis === null ||
    codigoNumerico === undefined || codigoNumerico === null
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
  const codigoNumericoPadded = String(codigoNumerico).replace(/\D/g, '').padStart(8, '0');

  const chave43 = `${cUFPadded}${anoMesPadded}${cnpjPadded}${modeloPadded}${seriePadded}${numeroPadded}${tpEmisPadded}${codigoNumericoPadded}`;

  if (!/^\d{43}$/.test(chave43)) {
    throw new Error('Composição da chave base SEFAZ resultou em formato inválido');
  }

  const dv = calcularDigitoVerificadorModulo11(chave43);
  return `${chave43}${dv}`;
}

module.exports = {
  calcularDigitoVerificadorModulo11,
  gerarChaveAcesso
};

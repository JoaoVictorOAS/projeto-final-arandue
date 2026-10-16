/**
 * Utilitário de normalização e validação de números de telefone e WhatsApp.
 * Lida com variações de JID do WhatsApp Web (@s.whatsapp.net, :device@...),
 * DDI 55 (Brasil), DDDs e variação do 9º dígito.
 */

/**
 * Normaliza uma string de telefone ou JID do WhatsApp para um conjunto de variações pesquisáveis.
 * @param {string} input - Número de telefone, JID ou string digitada
 * @returns {Object} Objeto com número limpo, variações e formato padrão
 */
function normalizarNumeroWhatsApp(input) {
  if (!input || typeof input !== 'string') {
    return {
      limpo: '',
      variacoes: [],
      formatado: ''
    };
  }

  // Remove sufixos de JID do WhatsApp (ex: @s.whatsapp.net, @c.us, :12@s.whatsapp.net)
  const semJid = input.replace(/[:@].*$/, '').trim();
  // Mantém apenas os dígitos numéricos
  const digitos = semJid.replace(/\D/g, '');

  if (!digitos) {
    return {
      limpo: '',
      variacoes: [],
      formatado: ''
    };
  }

  const variacoes = new Set();
  variacoes.add(digitos);

  // Análise para números do Brasil (DDI 55) ou locais com DDD
  let ddd = '';
  let numero = '';
  let comDdi = digitos;

  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    ddd = digitos.slice(2, 4);
    numero = digitos.slice(4);
    comDdi = digitos;
  } else if (digitos.length === 10 || digitos.length === 11) {
    // DDD + Número (sem DDI 55)
    ddd = digitos.slice(0, 2);
    numero = digitos.slice(2);
    comDdi = `55${digitos}`;
  }

  if (ddd && numero) {
    variacoes.add(comDdi);
    variacoes.add(`${ddd}${numero}`);

    // Variação com e sem o 9º dígito
    if (numero.length === 8) {
      // 8 dígitos -> cria versão com 9 (prefixo 9)
      const numeroComNove = `9${numero}`;
      variacoes.add(`55${ddd}${numeroComNove}`);
      variacoes.add(`${ddd}${numeroComNove}`);
    } else if (numero.length === 9 && numero.startsWith('9')) {
      // 9 dígitos -> cria versão de 8 dígitos
      const numeroSemNove = numero.slice(1);
      variacoes.add(`55${ddd}${numeroSemNove}`);
      variacoes.add(`${ddd}${numeroSemNove}`);
    }
  }

  // Formatação amigável (E.164 brasileira)
  let formatado = digitos;
  if (ddd && numero) {
    const numFinal = numero.length === 9 
      ? `${numero.slice(0, 5)}-${numero.slice(5)}` 
      : `${numero.slice(0, 4)}-${numero.slice(4)}`;
    formatado = `+55 (${ddd}) ${numFinal}`;
  }

  return {
    limpo: digitos,
    ddd,
    numero,
    comDdi,
    variacoes: Array.from(variacoes),
    formatado
  };
}

/**
 * Valida se um número de telefone informado tem padrão aceitável para celular no Brasil.
 * @param {string} telefone
 * @returns {boolean}
 */
function validarNumeroWhatsApp(telefone) {
  if (!telefone || typeof telefone !== 'string') return false;
  const digitos = telefone.replace(/\D/g, '');

  // Aceita:
  // - 10 ou 11 dígitos (DDD + 8 ou 9 dígitos)
  // - 12 ou 13 dígitos (55 + DDD + 8 ou 9 dígitos)
  if (digitos.length < 10 || digitos.length > 13) return false;

  let ddd = '';
  let corpo = '';

  if (digitos.length >= 12) {
    if (!digitos.startsWith('55')) return false;
    ddd = digitos.slice(2, 4);
    corpo = digitos.slice(4);
  } else {
    ddd = digitos.slice(0, 2);
    corpo = digitos.slice(2);
  }

  // DDDs válidos no Brasil (11 até 99)
  const dddNum = parseInt(ddd, 10);
  if (isNaN(dddNum) || dddNum < 11 || dddNum > 99) return false;

  // Celulares no Brasil possuem 9 dígitos iniciando com 9 (ou 8 dígitos legados)
  if (corpo.length === 9 && !corpo.startsWith('9')) return false;
  if (corpo.length !== 8 && corpo.length !== 9) return false;

  return true;
}

module.exports = {
  normalizarNumeroWhatsApp,
  validarNumeroWhatsApp
};

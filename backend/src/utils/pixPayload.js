/**
 * Utilitário para geração de Payload Pix BR Code (EMV® QRCPS-MPM) com CRC16-CCITT.
 */

function sanitizarTexto(texto, tamanhoMax) {
  if (!texto) return '';
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .toUpperCase()
    .substring(0, tamanhoMax);
}

function formatarTlv(id, valor) {
  const vStr = String(valor);
  const len = String(vStr.length).padStart(2, '0');
  return `${id}${len}${vStr}`;
}

function calcularCrc16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function gerarPayloadPix({ chave, nomeRecebedor, cidadeRecebedor, valor, txid = '***', descricao = '' }) {
  const chaveLimpa = String(chave || '').trim();
  const nomeLimpo = sanitizarTexto(nomeRecebedor || 'RECEBEDOR', 25);
  const cidadeLimpo = sanitizarTexto(cidadeRecebedor || 'BRASILIA', 15);
  const txidLimpo = String(txid || '***').trim().substring(0, 25);
  const descLimpa = String(descricao || '').trim();

  // Campo 00: Payload Format Indicator
  let payload = formatarTlv('00', '01');

  // Campo 26: Merchant Account Information
  let sub26 = formatarTlv('00', 'br.gov.bcb.pix') + formatarTlv('01', chaveLimpa);
  if (descLimpa) {
    sub26 += formatarTlv('02', sanitizarTexto(descLimpa, 50));
  }
  payload += formatarTlv('26', sub26);

  // Campo 52: Merchant Category Code
  payload += formatarTlv('52', '0000');

  // Campo 53: Transaction Currency (BRL = 986)
  payload += formatarTlv('53', '986');

  // Campo 54: Transaction Amount (se > 0)
  const numValor = Number(valor);
  if (!isNaN(numValor) && numValor > 0) {
    payload += formatarTlv('54', numValor.toFixed(2));
  }

  // Campo 58: Country Code
  payload += formatarTlv('58', 'BR');

  // Campo 59: Merchant Name
  payload += formatarTlv('59', nomeLimpo);

  // Campo 60: Merchant City
  payload += formatarTlv('60', cidadeLimpo);

  // Campo 62: Additional Data Field Template (ID 05 = txid)
  const sub62 = formatarTlv('05', txidLimpo);
  payload += formatarTlv('62', sub62);

  // Campo 63: CRC16
  const payloadSemCrc = payload + '6304';
  const crc = calcularCrc16(payloadSemCrc);
  const payloadPix = payloadSemCrc + crc;

  return {
    payload_pix: payloadPix,
    chave_utilizada: chaveLimpa,
    txid: txidLimpo,
    valor: !isNaN(numValor) ? numValor : 0,
    recebedor: {
      nome: nomeLimpo,
      cidade: cidadeLimpo
    }
  };
}

module.exports = {
  gerarPayloadPix,
  sanitizarTexto,
  calcularCrc16
};

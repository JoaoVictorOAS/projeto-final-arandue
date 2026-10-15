const { normalizarNumeroWhatsApp, validarNumeroWhatsApp } = require('../../src/utils/phoneUtils');

describe('phoneUtils - Normalização e Validação de Telefones WhatsApp', () => {
  describe('normalizarNumeroWhatsApp', () => {
    it('deve extrair e normalizar JID do WhatsApp com DDI 55 e 9 dígitos', () => {
      const res = normalizarNumeroWhatsApp('5511987654321@s.whatsapp.net');

      expect(res.limpo).toBe('5511987654321');
      expect(res.ddd).toBe('11');
      expect(res.numero).toBe('987654321');
      expect(res.formatado).toBe('+55 (11) 98765-4321');
      expect(res.variacoes).toContain('5511987654321');
      expect(res.variacoes).toContain('11987654321');
      // Versão sem o 9º dígito
      expect(res.variacoes).toContain('551187654321');
      expect(res.variacoes).toContain('1187654321');
    });

    it('deve tratar JID multi-device com identificador de dispositivo (:1@s.whatsapp.net)', () => {
      const res = normalizarNumeroWhatsApp('5521999998888:2@s.whatsapp.net');

      expect(res.limpo).toBe('5521999998888');
      expect(res.ddd).toBe('21');
      expect(res.formatado).toBe('+55 (21) 99999-8888');
    });

    it('deve normalizar número legado de 8 dígitos gerando versão com o 9º dígito', () => {
      const res = normalizarNumeroWhatsApp('551187654321@s.whatsapp.net');

      expect(res.limpo).toBe('551187654321');
      expect(res.ddd).toBe('11');
      expect(res.numero).toBe('87654321');
      expect(res.variacoes).toContain('551187654321');
      expect(res.variacoes).toContain('5511987654321');
    });

    it('deve aceitar entrada sem DDI (apenas DDD + número)', () => {
      const res = normalizarNumeroWhatsApp('(11) 98765-4321');

      expect(res.limpo).toBe('11987654321');
      expect(res.ddd).toBe('11');
      expect(res.comDdi).toBe('5511987654321');
      expect(res.variacoes).toContain('5511987654321');
      expect(res.variacoes).toContain('11987654321');
    });

    it('deve retornar objeto vazio quando entrada for nula ou inválida', () => {
      expect(normalizarNumeroWhatsApp(null)).toEqual({ limpo: '', variacoes: [], formatado: '' });
      expect(normalizarNumeroWhatsApp('')).toEqual({ limpo: '', variacoes: [], formatado: '' });
      expect(normalizarNumeroWhatsApp('   ')).toEqual({ limpo: '', variacoes: [], formatado: '' });
    });
  });

  describe('validarNumeroWhatsApp', () => {
    it('deve validar números celulares brasileiros válidos com DDD e 9 dígitos', () => {
      expect(validarNumeroWhatsApp('11987654321')).toBe(true);
      expect(validarNumeroWhatsApp('(11) 98765-4321')).toBe(true);
      expect(validarNumeroWhatsApp('+55 (21) 99999-8888')).toBe(true);
      expect(validarNumeroWhatsApp('5531988887777')).toBe(true);
    });

    it('deve rejeitar números inválidos ou com DDD incorreto', () => {
      expect(validarNumeroWhatsApp(null)).toBe(false);
      expect(validarNumeroWhatsApp('')).toBe(false);
      expect(validarNumeroWhatsApp('12345')).toBe(false); // muito curto
      expect(validarNumeroWhatsApp('00999998888')).toBe(false); // DDD 00 inválido
      expect(validarNumeroWhatsApp('11787654321')).toBe(false); // 9 dígitos mas não inicia com 9
      expect(validarNumeroWhatsApp('4411987654321')).toBe(false); // DDI diferente de 55
    });
  });
});

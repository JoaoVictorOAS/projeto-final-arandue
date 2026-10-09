const {
  calcularDigitoVerificadorModulo11,
  calcularDigitoVerificadorNfseNacional,
  gerarChaveAcesso,
  gerarChaveAcessoNfseNacional,
  validarChaveAcessoSefaz,
  validarChaveAcessoNfseNacional,
  obterCodigoUfPorSiglaOuIbge
} = require('../../src/services/fiscal/geradorChaveAcesso');

describe('Gerador e Validador de Chaves de Acesso Fiscais', () => {
  describe('SEFAZ (NF-e Modelo 55 e NFC-e Modelo 65 - 44 dígitos)', () => {
    it('deve gerar chave de acesso de 44 dígitos com DV módulo 11 válido para NF-e', () => {
      const chave = gerarChaveAcesso({
        cUF: 35,
        anoMes: '2610',
        cnpj: '12345678000195',
        modelo: '55',
        serie: 1,
        numero: 100,
        tpEmis: 1,
        codigoNumerico: '12345678'
      });

      expect(chave).toHaveLength(44);
      expect(/^\d{44}$/.test(chave)).toBe(true);
      expect(validarChaveAcessoSefaz(chave)).toBe(true);
    });

    it('deve gerar chave de acesso de 44 dígitos com DV válido para NFC-e (modelo 65)', () => {
      const chave = gerarChaveAcesso({
        cUF: 33, // RJ
        anoMes: '2610',
        cnpj: '98765432000188',
        modelo: '65',
        serie: 2,
        numero: 50,
        tpEmis: 1,
        codigoNumerico: '87654321'
      });

      expect(chave).toHaveLength(44);
      expect(chave.slice(20, 22)).toBe('65');
      expect(validarChaveAcessoSefaz(chave)).toBe(true);
    });

    it('deve validar corretamente chaves válidas e rejeitar inválidas', () => {
      const chaveValida = gerarChaveAcesso({
        cUF: 35,
        anoMes: '2610',
        cnpj: '12345678000195',
        modelo: '55',
        serie: 1,
        numero: 1,
        tpEmis: 1,
        codigoNumerico: '12345678'
      });

      expect(validarChaveAcessoSefaz(chaveValida)).toBe(true);

      // Chave corrompida (DV alterado)
      const dvOriginal = chaveValida.slice(-1);
      const dvErrado = dvOriginal === '9' ? '0' : String(Number(dvOriginal) + 1);
      const chaveInvalida = chaveValida.slice(0, 43) + dvErrado;
      expect(validarChaveAcessoSefaz(chaveInvalida)).toBe(false);

      // Chave com tamanho incorreto
      expect(validarChaveAcessoSefaz('123')).toBe(false);
      expect(validarChaveAcessoSefaz(null)).toBe(false);
    });
  });

  describe('Portal Nacional NFS-e (Padrão Nacional do MEI - 50 dígitos)', () => {
    it('deve gerar chave de acesso de 50 dígitos conforme padrão do Portal Nacional / SEFIN', () => {
      const chave = gerarChaveAcessoNfseNacional({
        codigoMunicipioIbge: '3550308', // São Paulo
        ambiente: 2, // 2 = Homologação / Ambiente Nacional
        tipoInscricao: 2, // 2 = CNPJ
        inscricaoFederal: '12345678000195',
        numero: 2,
        anoMes: '2610',
        codigoNumerico: '123456789'
      });

      expect(chave).toHaveLength(50);
      expect(/^\d{50}$/.test(chave)).toBe(true);
      expect(validarChaveAcessoNfseNacional(chave)).toBe(true);

      // Verifica decomposição posicional canônica
      expect(chave.slice(0, 7)).toBe('3550308'); // Município IBGE
      expect(chave[7]).toBe('2'); // Ambiente (2 = Nacional / Homologação)
      expect(chave[8]).toBe('2'); // Tipo Inscrição (2 = CNPJ)
      expect(chave.slice(9, 23)).toBe('12345678000195'); // CNPJ 14 dígitos
      expect(chave.slice(23, 36)).toBe('0000000000002'); // Número NFS-e 13 dígitos
      expect(chave.slice(36, 40)).toBe('2610'); // AAMM
      expect(chave.slice(40, 49)).toBe('123456789'); // Código numérico 9 dígitos
    });

    it('deve suportar inscrição via CPF com 3 zeros à esquerda', () => {
      const chave = gerarChaveAcessoNfseNacional({
        codigoMunicipioIbge: '3106200', // Belo Horizonte
        ambiente: 2,
        tipoInscricao: 1, // 1 = CPF
        inscricaoFederal: '12345678901',
        numero: 1,
        anoMes: '2610',
        codigoNumerico: '987654321'
      });

      expect(chave).toHaveLength(50);
      expect(chave[8]).toBe('1');
      expect(chave.slice(9, 23)).toBe('00012345678901');
      expect(validarChaveAcessoNfseNacional(chave)).toBe(true);
    });

    it('deve validar e rejeitar chave de 50 dígitos com DV adulterado', () => {
      const chave = gerarChaveAcessoNfseNacional({
        codigoMunicipioIbge: '3550308',
        ambiente: 2,
        tipoInscricao: 2,
        inscricaoFederal: '12345678000195',
        numero: 10,
        anoMes: '2610'
      });

      expect(validarChaveAcessoNfseNacional(chave)).toBe(true);

      const dvOriginal = chave.slice(-1);
      const dvErrado = dvOriginal === '9' ? '0' : String(Number(dvOriginal) + 1);
      const chaveAdulterada = chave.slice(0, 49) + dvErrado;
      expect(validarChaveAcessoNfseNacional(chaveAdulterada)).toBe(false);
    });
  });

  describe('obterCodigoUfPorSiglaOuIbge', () => {
    it('deve mapear siglas e códigos IBGE corretamente', () => {
      expect(obterCodigoUfPorSiglaOuIbge('SP')).toBe('35');
      expect(obterCodigoUfPorSiglaOuIbge('RJ')).toBe('33');
      expect(obterCodigoUfPorSiglaOuIbge('MG')).toBe('31');
      expect(obterCodigoUfPorSiglaOuIbge('3550308')).toBe('35');
      expect(obterCodigoUfPorSiglaOuIbge('5300108')).toBe('53');
      expect(obterCodigoUfPorSiglaOuIbge('')).toBe('35'); // fallback seguro
    });
  });
});

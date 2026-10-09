import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  Search,
  Building2,
  MapPin,
  Sliders,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Building,
  UploadCloud,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  ToggleLeft,
  ToggleRight,
  FileCheck,
} from 'lucide-react';
import api from '../services/api';

export const UFS_BRASIL = [
  { uf: 'AC', nome: 'Acre', cUf: '12', autorizador: 'SVRS', aliquotaPadrao: 19 },
  { uf: 'AL', nome: 'Alagoas', cUf: '27', autorizador: 'SVRS', aliquotaPadrao: 19 },
  { uf: 'AP', nome: 'Amapá', cUf: '16', autorizador: 'SVRS', aliquotaPadrao: 18 },
  { uf: 'AM', nome: 'Amazonas', cUf: '13', autorizador: 'AM (Próprio)', aliquotaPadrao: 20 },
  { uf: 'BA', nome: 'Bahia', cUf: '29', autorizador: 'BA (Próprio)', aliquotaPadrao: 20.5 },
  { uf: 'CE', nome: 'Ceará', cUf: '23', autorizador: 'SVRS', aliquotaPadrao: 20 },
  { uf: 'DF', nome: 'Distrito Federal', cUf: '53', autorizador: 'SVRS', aliquotaPadrao: 20 },
  { uf: 'ES', nome: 'Espírito Santo', cUf: '32', autorizador: 'SVRS', aliquotaPadrao: 17 },
  { uf: 'GO', nome: 'Goiás', cUf: '52', autorizador: 'GO (Próprio)', aliquotaPadrao: 19 },
  { uf: 'MA', nome: 'Maranhão', cUf: '21', autorizador: 'SVAN', aliquotaPadrao: 22 },
  { uf: 'MT', nome: 'Mato Grosso', cUf: '51', autorizador: 'MT (Próprio)', aliquotaPadrao: 17 },
  { uf: 'MS', nome: 'Mato Grosso do Sul', cUf: '50', autorizador: 'MS (Próprio)', aliquotaPadrao: 17 },
  { uf: 'MG', nome: 'Minas Gerais', cUf: '31', autorizador: 'MG (Próprio)', aliquotaPadrao: 18 },
  { uf: 'PA', nome: 'Pará', cUf: '15', autorizador: 'SVRS', aliquotaPadrao: 19 },
  { uf: 'PB', nome: 'Paraíba', cUf: '25', autorizador: 'SVRS', aliquotaPadrao: 20 },
  { uf: 'PR', nome: 'Paraná', cUf: '41', autorizador: 'PR (Próprio)', aliquotaPadrao: 19.5 },
  { uf: 'PE', nome: 'Pernambuco', cUf: '26', autorizador: 'PE (Próprio)', aliquotaPadrao: 20.5 },
  { uf: 'PI', nome: 'Piauí', cUf: '22', autorizador: 'SVRS', aliquotaPadrao: 21 },
  { uf: 'RJ', nome: 'Rio de Janeiro', cUf: '33', autorizador: 'RJ (Próprio)', aliquotaPadrao: 20 },
  { uf: 'RN', nome: 'Rio Grande do Norte', cUf: '24', autorizador: 'SVRS', aliquotaPadrao: 18 },
  { uf: 'RS', nome: 'Rio Grande do Sul', cUf: '43', autorizador: 'RS (Próprio)', aliquotaPadrao: 17 },
  { uf: 'RO', nome: 'Rondônia', cUf: '11', autorizador: 'SVRS', aliquotaPadrao: 19.5 },
  { uf: 'RR', nome: 'Roraima', cUf: '14', autorizador: 'SVRS', aliquotaPadrao: 20 },
  { uf: 'SC', nome: 'Santa Catarina', cUf: '42', autorizador: 'SVRS', aliquotaPadrao: 17 },
  { uf: 'SP', nome: 'São Paulo', cUf: '35', autorizador: 'SP (Próprio)', aliquotaPadrao: 18 },
  { uf: 'SE', nome: 'Sergipe', cUf: '28', autorizador: 'SVRS', aliquotaPadrao: 19 },
  { uf: 'TO', nome: 'Tocantins', cUf: '17', autorizador: 'SVRS', aliquotaPadrao: 20 },
];

export function obterSefazInfo(uf) {
  if (!uf) return null;
  const ufUpper = String(uf).trim().toUpperCase();
  const estado = UFS_BRASIL.find((e) => e.uf === ufUpper);
  if (!estado) return null;

  const autorizadorDisplay = estado.autorizador.includes('Próprio')
    ? `SEFAZ ${estado.uf}`
    : estado.autorizador;

  return {
    ...estado,
    autorizadorDisplay,
    badgeText: `🏛️ Autorizador Fiscal: ${autorizadorDisplay} (cUF ${estado.cUf})`,
  };
}

export default function Configuracoes() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [cnpjBusca, setCnpjBusca] = useState('');
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  const [form, setForm] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: 'ISENTO',
    inscricao_municipal: '',
    cep: '',
    logradouro: '',
    numero: 'S/N',
    complemento: '',
    bairro: '',
    municipio: '',
    uf: '',
    codigo_municipio_ibge: '',
    email_comercial: '',
    telefone_comercial: '',
    ambiente_fiscal: 'HOMOLOGACAO',
    serie_nfse: 1,
    serie_nfe: 1,
    serie_nfce: 1,
  });

  const [isIsentoIE, setIsIsentoIE] = useState(true);

  // Estados do Certificado Digital A1
  const [certStatus, setCertStatus] = useState({
    configurado: false,
    cnpj: '',
    razaoSocial: '',
    validoAte: null,
    diasRestantes: 0,
    ativo: false,
    nomeArquivo: '',
  });
  const [carregandoCert, setCarregandoCert] = useState(false);
  const [arquivoCert, setArquivoCert] = useState(null);
  const [senhaCert, setSenhaCert] = useState('');
  const [mostrarSenhaCert, setMostrarSenhaCert] = useState(false);
  const [enviandoCert, setEnviandoCert] = useState(false);
  const [alternandoTransmissao, setAlternandoTransmissao] = useState(false);
  const [removendoCert, setRemovendoCert] = useState(false);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    if (type === 'success') {
      setTimeout(() => {
        setFeedback((prev) => (prev.message === message ? { type: null, message: '' } : prev));
      }, 5000);
    }
  };

  const carregarCertificado = async () => {
    try {
      setCarregandoCert(true);
      const res = await api.get('/configuracoes/certificado');
      if (res.data?.dados) {
        setCertStatus(res.data.dados);
      }
    } catch (err) {
      console.error('Erro ao buscar status do certificado:', err);
    } finally {
      setCarregandoCert(false);
    }
  };

  useEffect(() => {
    async function carregarConfiguracoes() {
      try {
        setLoading(true);
        const res = await api.get('/configuracoes');
        const dados = res.data?.dados;
        if (dados) {
          setForm({
            razao_social: dados.razao_social || '',
            nome_fantasia: dados.nome_fantasia || '',
            cnpj: dados.cnpj || '',
            inscricao_estadual: dados.inscricao_estadual || 'ISENTO',
            inscricao_municipal: dados.inscricao_municipal || '',
            cep: dados.cep || '',
            logradouro: dados.logradouro || '',
            numero: dados.numero || 'S/N',
            complemento: dados.complemento || '',
            bairro: dados.bairro || '',
            municipio: dados.municipio || '',
            uf: dados.uf || '',
            codigo_municipio_ibge: dados.codigo_municipio_ibge || '',
            email_comercial: dados.email_comercial || '',
            telefone_comercial: dados.telefone_comercial || '',
            ambiente_fiscal: dados.ambiente_fiscal || 'HOMOLOGACAO',
            serie_nfse: Number(dados.serie_nfse) || 1,
            serie_nfe: Number(dados.serie_nfe) || 1,
            serie_nfce: Number(dados.serie_nfce) || 1,
          });

          const ie = String(dados.inscricao_estadual || '').trim().toUpperCase();
          setIsIsentoIE(!ie || ie === 'ISENTO');
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
        showFeedback('error', 'Falha ao carregar as configurações do MEI.');
      } finally {
        setLoading(false);
      }
    }

    carregarConfiguracoes();
    carregarCertificado();
  }, []);

  const handleUploadCertificado = async (e) => {
    e?.preventDefault();
    if (!arquivoCert) {
      showFeedback('error', 'Selecione um arquivo de certificado digital (.pfx ou .p12).');
      return;
    }
    if (!senhaCert) {
      showFeedback('error', 'Digite a senha do certificado digital.');
      return;
    }

    try {
      setEnviandoCert(true);
      const formData = new FormData();
      formData.append('certificado', arquivoCert);
      formData.append('senha', senhaCert);

      const res = await api.post('/configuracoes/certificado', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showFeedback('success', res.data?.mensagem || 'Certificado digital instalado com sucesso!');
      setArquivoCert(null);
      setSenhaCert('');
      await carregarCertificado();
    } catch (err) {
      const msg = err.response?.data?.mensagem || err.message || 'Falha ao instalar certificado digital.';
      showFeedback('error', msg);
    } finally {
      setEnviandoCert(false);
    }
  };

  const handleToggleTransmissao = async () => {
    try {
      setAlternandoTransmissao(true);
      const novoStatus = !certStatus.ativo;
      const res = await api.patch('/configuracoes/certificado/toggle', { ativo: novoStatus });
      setCertStatus((prev) => ({ ...prev, ativo: novoStatus }));
      showFeedback('success', res.data?.mensagem || `Transmissão SEFAZ ${novoStatus ? 'ativada' : 'desativada'}.`);
    } catch (err) {
      showFeedback('error', 'Falha ao alterar transmissão SEFAZ.');
    } finally {
      setAlternandoTransmissao(false);
    }
  };

  const handleRemoverCertificado = async () => {
    if (!window.confirm('Tem certeza que deseja remover o Certificado Digital? O sistema retornará ao modo de simulação local.')) {
      return;
    }

    try {
      setRemovendoCert(true);
      await api.delete('/configuracoes/certificado');
      showFeedback('success', 'Certificado digital removido com sucesso.');
      await carregarCertificado();
    } catch (err) {
      showFeedback('error', 'Erro ao remover o certificado digital.');
    } finally {
      setRemovendoCert(false);
    }
  };

  const sefazInfo = useMemo(() => obterSefazInfo(form.uf), [form.uf]);

  const handleBuscarCnpj = async (e) => {
    e?.preventDefault();
    const cnpjLimpo = cnpjBusca.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      showFeedback('error', 'Informe um CNPJ válido com 14 dígitos para a busca.');
      return;
    }

    setBuscandoCnpj(true);
    try {
      const res = await api.get(`/configuracoes/cnpj/${cnpjLimpo}`);
      const dados = res.data?.dados;
      if (dados) {
        setForm((prev) => ({
          ...prev,
          cnpj: dados.cnpj || cnpjLimpo,
          razao_social: dados.razao_social || prev.razao_social,
          nome_fantasia: dados.nome_fantasia || dados.razao_social || prev.nome_fantasia,
          cep: dados.cep || prev.cep,
          logradouro: dados.logradouro || prev.logradouro,
          numero: dados.numero || prev.numero || 'S/N',
          complemento: dados.complemento || prev.complemento,
          bairro: dados.bairro || prev.bairro,
          municipio: dados.municipio || prev.municipio,
          uf: (dados.uf || prev.uf || '').toUpperCase(),
          codigo_municipio_ibge: dados.codigo_municipio_ibge || prev.codigo_municipio_ibge,
          telefone_comercial: dados.telefone || prev.telefone_comercial,
          email_comercial: dados.email || prev.email_comercial,
        }));
        showFeedback('success', 'Dados da empresa preenchidos com sucesso via BrasilAPI!');
      }
    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao consultar CNPJ na Receita Federal.';
      showFeedback('error', msg);
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const handleSalvar = async (e) => {
    e?.preventDefault();

    if (!form.razao_social?.trim()) {
      showFeedback('error', 'A Razão Social é obrigatória.');
      return;
    }
    const cnpjLimpo = (form.cnpj || '').replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      showFeedback('error', 'CNPJ inválido. Forneça 14 dígitos numéricos.');
      return;
    }
    if (!form.uf) {
      showFeedback('error', 'Selecione o Estado (UF) do MEI.');
      return;
    }
    if (!form.municipio?.trim()) {
      showFeedback('error', 'O Município é obrigatório.');
      return;
    }
    const cepLimpo = (form.cep || '').replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      showFeedback('error', 'CEP inválido. Forneça 8 dígitos numéricos.');
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        ...form,
        razao_social: form.razao_social.trim(),
        nome_fantasia: form.nome_fantasia?.trim() || form.razao_social.trim(),
        cnpj: cnpjLimpo,
        inscricao_estadual: isIsentoIE ? 'ISENTO' : (form.inscricao_estadual?.trim() || 'ISENTO'),
        inscricao_municipal: form.inscricao_municipal?.trim() || '',
        cep: cepLimpo,
        logradouro: form.logradouro?.trim() || '',
        numero: form.numero?.trim() || 'S/N',
        complemento: form.complemento?.trim() || '',
        bairro: form.bairro?.trim() || '',
        municipio: form.municipio.trim(),
        uf: form.uf.toUpperCase(),
        codigo_municipio_ibge: form.codigo_municipio_ibge?.trim() || '',
        email_comercial: form.email_comercial?.trim() || '',
        telefone_comercial: form.telefone_comercial?.trim() || '',
        ambiente_fiscal: form.ambiente_fiscal === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO',
        serie_nfse: Number(form.serie_nfse) || 1,
        serie_nfe: Number(form.serie_nfe) || 1,
        serie_nfce: Number(form.serie_nfce) || 1,
      };

      const res = await api.put('/configuracoes', payload);
      const msg = res.data?.mensagem || 'Configurações salvas com sucesso!';
      showFeedback('success', msg);
      if (res.data?.dados) {
        setForm((prev) => ({
          ...prev,
          ...res.data.dados,
        }));
      }
    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao salvar configurações do MEI.';
      showFeedback('error', msg);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">Carregando configurações do MEI...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mx-auto pb-12">
      {/* Toast Feedback */}
      {feedback.message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between transition-all ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
          role="alert"
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback({ type: null, message: '' })}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-indigo-600" />
            Configurações do MEI & SEFAZ
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestão cadastral, domicílio fiscal para as 27 UFs do Brasil e parâmetros de emissão de notas fiscais.
          </p>
        </div>
      </div>

      {/* CARD 0: Busca Rápida de CNPJ (BrasilAPI) */}
      <div className="bg-gradient-to-r from-indigo-50/60 to-purple-50/60 p-6 rounded-2xl border border-indigo-100 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-600" />
              Busca Rápida de CNPJ (Receita Federal / BrasilAPI)
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              Consulte seu CNPJ para preencher automaticamente razão social, endereço completo e dados de contato.
            </p>
          </div>
        </div>

        <form onSubmit={handleBuscarCnpj} className="mt-4 flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Digite o CNPJ da empresa (ex: 00.000.000/0000-00)"
              value={cnpjBusca}
              onChange={(e) => setCnpjBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={buscandoCnpj}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {buscandoCnpj ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Consultando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Buscar CNPJ
              </>
            )}
          </button>
        </form>
      </div>

      <form onSubmit={handleSalvar} className="space-y-6">
        {/* CARD 1: Dados da Empresa */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Dados da Empresa
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Informações jurídicas e registros fiscais do seu MEI.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="cnpj" className="block text-sm font-semibold text-gray-700 mb-1">
                CNPJ <span className="text-rose-500">*</span>
              </label>
              <input
                id="cnpj"
                name="cnpj"
                type="text"
                required
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="razao_social" className="block text-sm font-semibold text-gray-700 mb-1">
                Razão Social <span className="text-rose-500">*</span>
              </label>
              <input
                id="razao_social"
                name="razao_social"
                type="text"
                required
                value={form.razao_social}
                onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                placeholder="Ex: João da Silva Serviços MEI"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="nome_fantasia" className="block text-sm font-semibold text-gray-700 mb-1">
                Nome Fantasia
              </label>
              <input
                id="nome_fantasia"
                name="nome_fantasia"
                type="text"
                value={form.nome_fantasia}
                onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                placeholder="Ex: Silva Manutenções"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="inscricao_estadual" className="block text-sm font-semibold text-gray-700">
                  Inscrição Estadual
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isIsentoIE}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsIsentoIE(checked);
                      setForm((prev) => ({
                        ...prev,
                        inscricao_estadual: checked ? 'ISENTO' : '',
                      }));
                    }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Isento</span>
                </label>
              </div>
              <input
                id="inscricao_estadual"
                name="inscricao_estadual"
                type="text"
                disabled={isIsentoIE}
                value={isIsentoIE ? 'ISENTO' : form.inscricao_estadual}
                onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })}
                placeholder={isIsentoIE ? 'ISENTO' : 'Ex: 123456789'}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div>
              <label htmlFor="inscricao_municipal" className="block text-sm font-semibold text-gray-700 mb-1">
                Inscrição Municipal (CCM)
              </label>
              <input
                id="inscricao_municipal"
                name="inscricao_municipal"
                type="text"
                value={form.inscricao_municipal}
                onChange={(e) => setForm({ ...form, inscricao_municipal: e.target.value })}
                placeholder="Ex: 98765432"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="email_comercial" className="block text-sm font-semibold text-gray-700 mb-1">
                E-mail Comercial
              </label>
              <input
                id="email_comercial"
                name="email_comercial"
                type="email"
                value={form.email_comercial}
                onChange={(e) => setForm({ ...form, email_comercial: e.target.value })}
                placeholder="contato@empresa.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="telefone_comercial" className="block text-sm font-semibold text-gray-700 mb-1">
                Telefone Comercial / WhatsApp
              </label>
              <input
                id="telefone_comercial"
                name="telefone_comercial"
                type="text"
                value={form.telefone_comercial}
                onChange={(e) => setForm({ ...form, telefone_comercial: e.target.value })}
                placeholder="(00) 00000-0000"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* CARD 2: Domicílio Fiscal e Localização (Sincronização SEFAZ) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                Domicílio Fiscal e Localização
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Endereço de registro do estabelecimento e autorizador SEFAZ correspondente.
              </p>
            </div>

            {/* BADGE SEFAZ EM TEMPO REAL */}
            {sefazInfo ? (
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold shadow-sm"
                title={`Código IBGE UF: ${sefazInfo.cUf} | Alíquota Padrão ICMS: ${sefazInfo.aliquotaPadrao}%`}
              >
                <span>{sefazInfo.badgeText}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                <span>🏛️ Selecione uma UF para sincronizar com a SEFAZ</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="uf" className="block text-sm font-semibold text-gray-700 mb-1">
                Estado (UF) <span className="text-rose-500">*</span>
              </label>
              <select
                id="uf"
                name="uf"
                required
                value={form.uf}
                onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Selecione o Estado</option>
                {UFS_BRASIL.map((item) => (
                  <option key={item.uf} value={item.uf}>
                    {item.uf} - {item.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="municipio" className="block text-sm font-semibold text-gray-700 mb-1">
                Município <span className="text-rose-500">*</span>
              </label>
              <input
                id="municipio"
                name="municipio"
                type="text"
                required
                value={form.municipio}
                onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                placeholder="Ex: São Paulo"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="codigo_municipio_ibge" className="block text-sm font-semibold text-gray-700 mb-1">
                Código IBGE (Município)
              </label>
              <input
                id="codigo_municipio_ibge"
                name="codigo_municipio_ibge"
                type="text"
                value={form.codigo_municipio_ibge}
                onChange={(e) => setForm({ ...form, codigo_municipio_ibge: e.target.value })}
                placeholder="Ex: 3550308"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="cep" className="block text-sm font-semibold text-gray-700 mb-1">
                CEP <span className="text-rose-500">*</span>
              </label>
              <input
                id="cep"
                name="cep"
                type="text"
                required
                value={form.cep}
                onChange={(e) => setForm({ ...form, cep: e.target.value })}
                placeholder="00000-000"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="logradouro" className="block text-sm font-semibold text-gray-700 mb-1">
                Logradouro (Rua, Avenida, etc.)
              </label>
              <input
                id="logradouro"
                name="logradouro"
                type="text"
                value={form.logradouro}
                onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
                placeholder="Ex: Avenida Paulista"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="numero" className="block text-sm font-semibold text-gray-700 mb-1">
                Número
              </label>
              <input
                id="numero"
                name="numero"
                type="text"
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                placeholder="Ex: 1000 ou S/N"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="complemento" className="block text-sm font-semibold text-gray-700 mb-1">
                Complemento
              </label>
              <input
                id="complemento"
                name="complemento"
                type="text"
                value={form.complemento}
                onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                placeholder="Ex: Sala 201"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="bairro" className="block text-sm font-semibold text-gray-700 mb-1">
                Bairro
              </label>
              <input
                id="bairro"
                name="bairro"
                type="text"
                value={form.bairro}
                onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                placeholder="Ex: Centro"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* CARD 3: Parâmetros Fiscais */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              Parâmetros Fiscais
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Ambiente de transmissão e controle sequencial das séries de documentos fiscais.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="ambiente_fiscal" className="block text-sm font-semibold text-gray-700 mb-1">
                Ambiente Fiscal
              </label>
              <select
                id="ambiente_fiscal"
                name="ambiente_fiscal"
                value={form.ambiente_fiscal}
                onChange={(e) => setForm({ ...form, ambiente_fiscal: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="HOMOLOGACAO">Homologação (Ambiente de Testes)</option>
                <option value="PRODUCAO">Produção (Ambiente Oficial)</option>
              </select>
            </div>

            <div>
              <label htmlFor="serie_nfse" className="block text-sm font-semibold text-gray-700 mb-1">
                Série NFS-e (Serviços)
              </label>
              <input
                id="serie_nfse"
                name="serie_nfse"
                type="number"
                min="1"
                value={form.serie_nfse}
                onChange={(e) => setForm({ ...form, serie_nfse: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="serie_nfe" className="block text-sm font-semibold text-gray-700 mb-1">
                Série NF-e (Mercadorias)
              </label>
              <input
                id="serie_nfe"
                name="serie_nfe"
                type="number"
                min="1"
                value={form.serie_nfe}
                onChange={(e) => setForm({ ...form, serie_nfe: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="serie_nfce" className="block text-sm font-semibold text-gray-700 mb-1">
                Série NFC-e (Consumidor)
              </label>
              <input
                id="serie_nfce"
                name="serie_nfce"
                type="number"
                min="1"
                value={form.serie_nfce}
                onChange={(e) => setForm({ ...form, serie_nfce: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={salvando}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar Configurações
            </button>
          </div>
        </div>

        {/* CARD 4: Certificado Digital ICP-Brasil (A1) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Certificado Digital ICP-Brasil (A1)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Emissão oficial com assinatura digital e transmissão direta aos servidores de Homologação da SEFAZ.
              </p>
            </div>
            {certStatus.configurado && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  certStatus.ativo
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {certStatus.ativo ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Certificado Ativo e Válido
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" /> Transmissão SEFAZ em Pausa (Modo Emulador)
                  </>
                )}
              </span>
            )}
          </div>

          {certStatus.configurado ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-100 text-xs">
                <div>
                  <span className="text-gray-500 font-medium block">Razão Social / Titular:</span>
                  <span className="font-semibold text-gray-900 break-words">{certStatus.razaoSocial || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium block">CNPJ Vinculado:</span>
                  <span className="font-semibold text-gray-900">{certStatus.cnpj || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium block">Arquivo Instalado:</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                    {certStatus.nomeArquivo || 'certificado.pfx'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium block">Validade:</span>
                  <span className={`font-semibold ${certStatus.diasRestantes < 30 ? 'text-amber-600' : 'text-emerald-700'}`}>
                    {certStatus.validoAte ? new Date(certStatus.validoAte).toLocaleDateString('pt-BR') : '—'}
                    {certStatus.diasRestantes > 0 && ` (${certStatus.diasRestantes} dias restantes)`}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleTransmissao}
                    disabled={alternandoTransmissao}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      certStatus.ativo
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {certStatus.ativo ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                    {certStatus.ativo ? 'Transmissão Oficial Ativa' : 'Modo Simulação Local Ativo'}
                  </button>
                  <span className="text-xs text-gray-500">
                    {certStatus.ativo
                      ? 'NF-e será transmitida e autorizada ao vivo na SEFAZ.'
                      : 'NF-e será simulada localmente sem chamar a SEFAZ.'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRemoverCertificado}
                  disabled={removendoCert}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  {removendoCert ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Remover Certificado
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-900 leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Modo Híbrido Automático:</strong> Usuários sem certificado continuam operando normalmente via Emulador Fiscal Local sem custo. Para transmitir notas oficiais com protocolo SEFAZ, instale seu certificado digital padrão ICP-Brasil A1 (<code className="bg-white/80 px-1 py-0.5 rounded border border-indigo-200">.pfx</code> ou <code className="bg-white/80 px-1 py-0.5 rounded border border-indigo-200">.p12</code>). O arquivo e a senha são protegidos com criptografia AES-256-GCM.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="arquivo_certificado" className="block text-sm font-semibold text-gray-700 mb-1">
                    Arquivo do Certificado (.pfx / .p12)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id="arquivo_certificado"
                      accept=".pfx,.p12"
                      onChange={(e) => setArquivoCert(e.target.files?.[0] || null)}
                      className="w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-gray-300 rounded-xl focus:outline-none"
                    />
                  </div>
                  {arquivoCert && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {arquivoCert.name} ({(arquivoCert.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="senha_certificado" className="block text-sm font-semibold text-gray-700 mb-1">
                    Senha do Certificado
                  </label>
                  <div className="relative">
                    <input
                      type={mostrarSenhaCert ? 'text' : 'password'}
                      id="senha_certificado"
                      value={senhaCert}
                      onChange={(e) => setSenhaCert(e.target.value)}
                      placeholder="Digite a senha de proteção do certificado"
                      className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenhaCert(!mostrarSenhaCert)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      title={mostrarSenhaCert ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {mostrarSenhaCert ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleUploadCertificado}
                  disabled={enviandoCert || !arquivoCert || !senhaCert}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {enviandoCert ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  Instalar Certificado A1
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

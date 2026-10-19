import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowDownRight,
  TrendingDown,
  Layers,
  ChefHat,
  Calculator,
  History,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  ArrowRight,
  Boxes,
  Camera,
  UploadCloud,
  FileCode,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import CameraCaptureModal from '../components/CameraCaptureModal';
import AdaptiveParagraph from '../components/AdaptiveParagraph';

export const formatCurrency = (val) => {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

export const formatQuantity = (qty, unit) => {
  const num = Number(qty) || 0;
  const formatted = num % 1 === 0 ? num.toString() : num.toFixed(2);
  return `${formatted} ${unit || ''}`.trim();
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export default function Estoque() {
  const [activeTab, setActiveTab] = useState('insumos'); // 'insumos', 'receitas', 'simulador', 'movimentacoes'
  const [insumos, setInsumos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  // Filtros de Insumos
  const [buscaInsumo, setBuscaInsumo] = useState('');
  const [apenasAbaixoMinimo, setApenasAbaixoMinimo] = useState(false);

  // Modals
  const [modalInsumoAberto, setModalInsumoAberto] = useState(false);
  const [modalEntradaAberto, setModalEntradaAberto] = useState(false);
  const [modalNotaFiscalAberto, setModalNotaFiscalAberto] = useState(false);
  const [modalReceitaAberto, setModalReceitaAberto] = useState(false);
  const [modalProducaoAberto, setModalProducaoAberto] = useState(false);
  const [cameraModalAberto, setCameraModalAberto] = useState(false);
  const [cameraDestino, setCameraDestino] = useState('nota'); // 'nota', 'novo_insumo', 'entrada'
  const [analisandoFotoOcr, setAnalisandoFotoOcr] = useState(false);

  // Importação por Nota Fiscal (Foto ou XML)
  const [modoImportacao, setModoImportacao] = useState('foto'); // 'foto' ou 'xml'
  const [fotoBase64, setFotoBase64] = useState('');
  const [fotoPreview, setFotoPreview] = useState('');
  const [arquivoXmlNome, setArquivoXmlNome] = useState('');
  const [processandoNota, setProcessandoNota] = useState(false);
  const [dadosNotaImportada, setDadosNotaImportada] = useState(null);
  const [lancarCaixaNota, setLancarCaixaNota] = useState(true);

  // Form: Novo Insumo
  const [formInsumo, setFormInsumo] = useState({
    nome: '',
    unidade_base: 'g',
    estoque_minimo: '',
    custo_unitario: '',
  });

  // Form: Entrada de Insumo
  const [formEntrada, setFormEntrada] = useState({
    insumo_id: '',
    nome: '',
    quantidade: '',
    unidade: 'kg',
    custo_total: '',
    lancar_no_caixa: true,
  });

  // Ficha Técnica (Receita)
  const [servicoSelecionadoId, setServicoSelecionadoId] = useState('');
  const [fichaAtual, setFichaAtual] = useState({ custo_ingredientes: 0, ingredientes: [] });
  const [loadingFicha, setLoadingFicha] = useState(false);
  const [ingredientesForm, setIngredientesForm] = useState([]);

  // Produção de Lote
  const [formProducao, setFormProducao] = useState({
    servico_id: '',
    quantidade: '1',
  });

  // Simulador de Capacidade
  const [simulacaoServicoId, setSimulacaoServicoId] = useState('');
  const [resultadoSimulacao, setResultadoSimulacao] = useState(null);
  const [simulando, setSimulando] = useState(false);

  // Envio / Loading
  const [salvando, setSalvando] = useState(false);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    if (type === 'success') {
      setTimeout(() => {
        setFeedback((prev) => (prev.message === message ? { type: null, message: '' } : prev));
      }, 4000);
    }
  };

  // Carrega insumos
  const carregarInsumos = useCallback(async () => {
    try {
      const params = {};
      if (buscaInsumo.trim()) params.busca = buscaInsumo.trim();
      if (apenasAbaixoMinimo) params.apenas_abaixo_minimo = 'true';

      const res = await api.get('/estoque/insumos', { params });
      const dados = res?.data?.dados || res?.data || [];
      setInsumos(Array.isArray(dados) ? dados : []);
    } catch (err) {
      console.error('Erro ao carregar insumos:', err);
      showFeedback('error', 'Falha ao buscar insumos do estoque.');
    }
  }, [buscaInsumo, apenasAbaixoMinimo]);

  // Carrega catálogo de serviços para fichas técnicas
  const carregarServicos = useCallback(async () => {
    try {
      const res = await api.get('/servicos');
      const dados = res?.data?.dados || res?.data || [];
      setServicos(Array.isArray(dados) ? dados : []);
    } catch (err) {
      console.error('Erro ao carregar serviços:', err);
    }
  }, []);

  // Carrega histórico de movimentações
  const carregarMovimentacoes = useCallback(async () => {
    try {
      const res = await api.get('/estoque/movimentacoes', { params: { limite: 50 } });
      const dados = res?.data?.dados || res?.data || [];
      setMovimentacoes(Array.isArray(dados) ? dados : []);
    } catch (err) {
      console.error('Erro ao carregar movimentações:', err);
    }
  }, []);

  // Inicialização
  useEffect(() => {
    const carregarTudo = async () => {
      setLoading(true);
      await Promise.all([carregarInsumos(), carregarServicos(), carregarMovimentacoes()]);
      setLoading(false);
    };
    carregarTudo();
  }, [carregarInsumos, carregarServicos, carregarMovimentacoes]);

  // Carrega ficha técnica ao selecionar serviço
  const carregarFichaTecnica = async (servId) => {
    if (!servId) {
      setFichaAtual({ custo_ingredientes: 0, ingredientes: [] });
      return;
    }
    setLoadingFicha(true);
    try {
      const res = await api.get(`/estoque/fichas-tecnicas/${servId}`);
      const dados = res?.data?.dados || { custo_ingredientes: 0, ingredientes: [] };
      setFichaAtual(dados);
      setIngredientesForm(
        (dados.ingredientes || []).map((i) => ({
          insumo_id: i.insumo_id,
          quantidade_necessaria: i.quantidade_necessaria,
        }))
      );
    } catch (err) {
      console.error('Erro ao buscar ficha técnica:', err);
      showFeedback('error', 'Não foi possível carregar a receita deste produto.');
    } finally {
      setLoadingFicha(false);
    }
  };

  // Handler: Cadastrar Novo Insumo
  const handleCadastrarInsumo = async (e) => {
    e.preventDefault();
    if (!formInsumo.nome.trim()) {
      showFeedback('error', 'Informe o nome do insumo.');
      return;
    }
    setSalvando(true);
    try {
      await api.post('/estoque/insumos', {
        nome: formInsumo.nome.trim(),
        unidade_base: formInsumo.unidade_base,
        estoque_minimo: parseFloat(formInsumo.estoque_minimo) || 0,
        custo_unitario: parseFloat(formInsumo.custo_unitario) || 0,
      });
      showFeedback('success', `Insumo "${formInsumo.nome}" cadastrado com sucesso!`);
      setModalInsumoAberto(false);
      setFormInsumo({ nome: '', unidade_base: 'g', estoque_minimo: '', custo_unitario: '' });
      await carregarInsumos();
    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao cadastrar insumo.';
      showFeedback('error', msg);
    } finally {
      setSalvando(false);
    }
  };

  // Handler: Registrar Entrada/Compra
  const handleRegistrarEntrada = async (e) => {
    e.preventDefault();
    if (!formEntrada.quantidade || parseFloat(formEntrada.quantidade) <= 0) {
      showFeedback('error', 'Informe uma quantidade válida.');
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        quantidade: parseFloat(formEntrada.quantidade),
        unidade: formEntrada.unidade,
        lancar_no_caixa: formEntrada.lancar_no_caixa,
      };
      if (formEntrada.insumo_id) {
        payload.insumo_id = parseInt(formEntrada.insumo_id, 10);
      } else if (formEntrada.nome.trim()) {
        payload.nome = formEntrada.nome.trim();
        payload.unidade_base = ['kg', 'g'].includes(formEntrada.unidade)
          ? 'g'
          : ['l', 'ml'].includes(formEntrada.unidade)
          ? 'ml'
          : 'un';
      } else {
        showFeedback('error', 'Selecione um insumo existente ou digite o nome de um novo.');
        setSalvando(false);
        return;
      }

      if (formEntrada.custo_total) {
        payload.custo_total = parseFloat(formEntrada.custo_total);
      }

      await api.post('/estoque/insumos/entrada', payload);
      showFeedback('success', 'Entrada de insumo registrada com sucesso!');
      setModalEntradaAberto(false);
      setFormEntrada({
        insumo_id: '',
        nome: '',
        quantidade: '',
        unidade: 'kg',
        custo_total: '',
        lancar_no_caixa: true,
      });
      await Promise.all([carregarInsumos(), carregarMovimentacoes()]);
    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao registrar compra.';
      showFeedback('error', msg);
    } finally {
      setSalvando(false);
    }
  };

  // Handler: Selecionar Foto de Nota Fiscal
  const handleSelecionarFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result;
      setFotoBase64(b64);
      setFotoPreview(b64);
      setDadosNotaImportada(null);
    };
    reader.readAsDataURL(file);
  };

  // Função compartilhada: Analisar imagem com OCR multimodal
  const executarOcrFoto = async (imagemB64) => {
    if (!imagemB64) return null;
    setProcessandoNota(true);
    try {
      const mime = imagemB64.startsWith('data:')
        ? imagemB64.split(';')[0].replace('data:', '')
        : 'image/jpeg';
      const res = await api.post('/estoque/insumos/ocr-foto', {
        imagem_base64: imagemB64,
        mime_type: mime,
      });
      const dados = res.data?.dados;
      if (dados && dados.sucesso !== false) {
        setDadosNotaImportada({
          fornecedor: dados.fornecedor || '',
          numero_documento: dados.numero_documento || '',
          valor_total: dados.valor_total || 0,
          itens: (dados.itens || []).map((it) => ({
            nome: it.nome,
            quantidade: it.quantidade || 1,
            unidade: it.unidade || 'un',
            custo_total: it.valor_total || 0,
          })),
        });
        showFeedback('success', 'Foto analisada com sucesso pela IA! Confira os itens abaixo.');
        return dados;
      } else {
        showFeedback('error', dados?.mensagem || 'Não foi possível extrair dados da imagem.');
        return null;
      }
    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao processar imagem da nota.';
      showFeedback('error', msg);
      return null;
    } finally {
      setProcessandoNota(false);
    }
  };

  // Handler: Analisar Foto com IA
  const handleAnalisarFoto = async () => {
    if (!fotoBase64) {
      showFeedback('error', 'Selecione ou tire uma foto da nota fiscal primeiro.');
      return;
    }
    await executarOcrFoto(fotoBase64);
  };

  // Handler: Foto capturada pela câmera do app
  const handleFotoCapturada = async (fotoB64) => {
    if (!fotoB64) return;

    if (cameraDestino === 'nota') {
      setFotoBase64(fotoB64);
      setFotoPreview(fotoB64);
      setModoImportacao('foto');
      setModalNotaFiscalAberto(true);
      await executarOcrFoto(fotoB64);
    } else if (cameraDestino === 'novo_insumo') {
      setAnalisandoFotoOcr(true);
      try {
        const mime = fotoB64.startsWith('data:')
          ? fotoB64.split(';')[0].replace('data:', '')
          : 'image/jpeg';
        const res = await api.post('/estoque/insumos/ocr-foto', {
          imagem_base64: fotoB64,
          mime_type: mime,
        });
        const dados = res.data?.dados;
        if (dados && dados.itens && dados.itens.length > 0) {
          const primeiro = dados.itens[0];
          let unidBase = 'un';
          const u = (primeiro.unidade || '').toLowerCase();
          if (['g', 'kg', 'quilo', 'quilos'].includes(u)) unidBase = 'g';
          else if (['ml', 'l', 'litro', 'litros'].includes(u)) unidBase = 'ml';

          let custo = '';
          const qtdNum = parseFloat(primeiro.quantidade) || 1;
          const valTotal = parseFloat(primeiro.valor_total) || 0;
          if (valTotal > 0) {
            let divisor = qtdNum;
            if (u === 'kg') divisor *= 1000;
            else if (u === 'l') divisor *= 1000;
            custo = (valTotal / (divisor > 0 ? divisor : 1)).toFixed(4);
          }

          setFormInsumo((prev) => ({
            ...prev,
            nome: primeiro.nome || prev.nome,
            unidade_base: unidBase,
            custo_unitario: custo || prev.custo_unitario,
          }));
          setModalInsumoAberto(true);
          showFeedback('success', `Insumo "${primeiro.nome}" preenchido a partir da foto!`);
        } else {
          setModalInsumoAberto(true);
          showFeedback('error', 'Não foi possível identificar itens na foto capturada.');
        }
      } catch (err) {
        setModalInsumoAberto(true);
        const msg = err.response?.data?.mensagem || 'Erro ao analisar foto do insumo.';
        showFeedback('error', msg);
      } finally {
        setAnalisandoFotoOcr(false);
      }
    } else if (cameraDestino === 'entrada') {
      setAnalisandoFotoOcr(true);
      try {
        const mime = fotoB64.startsWith('data:')
          ? fotoB64.split(';')[0].replace('data:', '')
          : 'image/jpeg';
        const res = await api.post('/estoque/insumos/ocr-foto', {
          imagem_base64: fotoB64,
          mime_type: mime,
        });
        const dados = res.data?.dados;
        if (dados && dados.itens && dados.itens.length > 0) {
          const primeiro = dados.itens[0];
          const insumoExistente = insumos.find(
            (i) =>
              i.nome.toLowerCase() === primeiro.nome.toLowerCase() ||
              i.nome.toLowerCase().includes(primeiro.nome.toLowerCase()) ||
              primeiro.nome.toLowerCase().includes(i.nome.toLowerCase())
          );

          let unid = 'kg';
          const u = (primeiro.unidade || '').toLowerCase();
          if (['kg', 'g', 'l', 'ml', 'un'].includes(u)) unid = u;

          setFormEntrada((prev) => ({
            ...prev,
            insumo_id: insumoExistente ? String(insumoExistente.id) : '',
            nome: insumoExistente ? '' : primeiro.nome || prev.nome,
            quantidade: primeiro.quantidade ? String(primeiro.quantidade) : prev.quantidade,
            unidade: unid,
            custo_total: primeiro.valor_total
              ? String(primeiro.valor_total)
              : dados.valor_total
              ? String(dados.valor_total)
              : prev.custo_total,
          }));
          setModalEntradaAberto(true);

          if (dados.itens.length > 1) {
            showFeedback(
              'success',
              `Preenchido com o 1º item da foto ("${primeiro.nome}"). Foram detectados ${dados.itens.length} itens no total.`
            );
          } else {
            showFeedback('success', `Entrada de compra preenchida a partir da foto: "${primeiro.nome}".`);
          }
        } else {
          setModalEntradaAberto(true);
          showFeedback('error', 'Nenhum insumo identificado na foto.');
        }
      } catch (err) {
        setModalEntradaAberto(true);
        const msg = err.response?.data?.mensagem || 'Erro ao processar imagem para entrada.';
        showFeedback('error', msg);
      } finally {
        setAnalisandoFotoOcr(false);
      }
    }
  };

  // Handler: Selecionar XML de NF-e
  const handleSelecionarXml = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivoXmlNome(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      const xmlTexto = reader.result;
      setProcessandoNota(true);
      try {
        const res = await api.post('/estoque/insumos/parse-xml', { xml: xmlTexto });
        const dados = res.data?.dados;
        if (dados) {
          setDadosNotaImportada({
            fornecedor: dados.fornecedor_nome || '',
            numero_documento: dados.numero_documento || '',
            valor_total: dados.valor_total || 0,
            itens: (dados.itens || []).map((it) => ({
              nome: it.nome,
              quantidade: it.quantidade_original || 1,
              unidade: (it.unidade_original || 'un').toLowerCase(),
              custo_total: it.valor_total || 0,
            }))
          });
          showFeedback('success', 'XML da NF-e processado com sucesso! Confira os itens abaixo.');
        }
      } catch (err) {
        const msg = err.response?.data?.mensagem || 'Erro ao ler arquivo XML da nota fiscal.';
        showFeedback('error', msg);
      } finally {
        setProcessandoNota(false);
      }
    };
    reader.readAsText(file);
  };

  // Handler: Confirmar Entrada de Itens da Nota Fiscal
  const handleConfirmarEntradaNota = async () => {
    if (!dadosNotaImportada || !dadosNotaImportada.itens || dadosNotaImportada.itens.length === 0) {
      showFeedback('error', 'Nenhum item válido para dar entrada.');
      return;
    }
    setSalvando(true);
    try {
      await api.post('/estoque/insumos/entrada-nota', {
        fornecedor: dadosNotaImportada.fornecedor,
        numero_documento: dadosNotaImportada.numero_documento,
        lancar_no_caixa: lancarCaixaNota,
        itens: dadosNotaImportada.itens
      });
      showFeedback('success', 'Entrada de todos os insumos da nota registrada com sucesso!');
      setModalNotaFiscalAberto(false);
      setDadosNotaImportada(null);
      setFotoBase64('');
      setFotoPreview('');
      setArquivoXmlNome('');
      await Promise.all([carregarInsumos(), carregarMovimentacoes()]);
    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao confirmar entrada da nota fiscal.';
      showFeedback('error', msg);
    } finally {
      setSalvando(false);
    }
  };

  // Handler: Salvar Receita (Ficha Técnica)
  const handleSalvarFichaTecnica = async (e) => {
    e.preventDefault();
    if (!servicoSelecionadoId) {
      showFeedback('error', 'Selecione um produto do catálogo.');
      return;
    }
    if (ingredientesForm.length === 0) {
      showFeedback('error', 'Adicione pelo menos um insumo à receita.');
      return;
    }
    setSalvando(true);
    try {
      await api.post('/estoque/fichas-tecnicas', {
        servico_id: parseInt(servicoSelecionadoId, 10),
        ingredientes: ingredientesForm.map((ing) => ({
          insumo_id: parseInt(ing.insumo_id, 10),
          quantidade_necessaria: parseFloat(ing.quantidade_necessaria),
        })),
      });
      showFeedback('success', 'Ficha técnica salva com sucesso!');
      setModalReceitaAberto(false);
      await carregarFichaTecnica(servicoSelecionadoId);
    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao salvar ficha técnica.';
      showFeedback('error', msg);
    } finally {
      setSalvando(false);
    }
  };

  // Handler: Registrar Lote de Produção
  const handleRegistrarProducao = async (e) => {
    e.preventDefault();
    if (!formProducao.servico_id) {
      showFeedback('error', 'Selecione o produto a ser produzido.');
      return;
    }
    const qtd = parseInt(formProducao.quantidade, 10);
    if (!qtd || qtd <= 0) {
      showFeedback('error', 'A quantidade de unidades deve ser maior que zero.');
      return;
    }
    setSalvando(true);
    try {
      const res = await api.post('/estoque/producao', {
        servico_id: parseInt(formProducao.servico_id, 10),
        quantidade: qtd,
      });
      showFeedback('success', res.data?.dados?.mensagem || 'Lote produzido com sucesso! Insumos baixados.');
      setModalProducaoAberto(false);
      setFormProducao({ servico_id: '', quantidade: '1' });
      await Promise.all([carregarInsumos(), carregarMovimentacoes()]);
    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao registrar lote de produção.';
      showFeedback('error', msg);
    } finally {
      setSalvando(false);
    }
  };

  // Handler: Simulação de Capacidade
  const handleSimular = async (e) => {
    e.preventDefault();
    if (!simulacaoServicoId) {
      showFeedback('error', 'Selecione um produto para simular.');
      return;
    }
    setSimulando(true);
    setResultadoSimulacao(null);
    try {
      const res = await api.post('/estoque/simulacao', {
        servico_id: parseInt(simulacaoServicoId, 10),
        usar_estoque_atual: true,
      });
      setResultadoSimulacao(res.data?.dados || null);
    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao realizar simulação de capacidade.';
      showFeedback('error', msg);
    } finally {
      setSimulando(false);
    }
  };

  // Métricas rápidas
  const totalInsumos = insumos.length;
  const insumosAlerta = useMemo(
    () => insumos.filter((i) => Number(i.quantidade_atual) <= Number(i.estoque_minimo)).length,
    [insumos]
  );

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedback.message && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between transition-all ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
          role="alert"
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'error' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
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
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-theme-primary shrink-0" />
            <span>Estoque & Produção</span>
          </h1>
          <AdaptiveParagraph className="text-sm text-gray-500 mt-1">
            Controle de insumos, receitas técnicas (CMV), simulação de rendimento e baixas automáticas.
          </AdaptiveParagraph>
        </div>

        {/* Ações Rápidas em Linha Única no Web (sem scroll) */}
        <div className="grid grid-cols-2 sm:flex sm:items-center sm:flex-nowrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setModalNotaFiscalAberto(true)}
            aria-label="Entrada por Nota Fiscal ou Foto"
            className="badge-theme-subtle hover:brightness-95 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap shadow-xs"
            title="Importar Insumos por Foto da Câmera, Galeria ou XML de NF-e"
          >
            <Camera className="w-4 h-4 text-theme-primary shrink-0" />
            <span>Foto / Nota</span>
          </button>

          <button
            type="button"
            onClick={() => setModalEntradaAberto(true)}
            aria-label="Registrar compra / entrada de insumo"
            className="badge-theme-subtle hover:brightness-95 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap shadow-xs"
            title="Registrar compra avulsa de insumos"
          >
            <ArrowDownRight className="w-4 h-4 text-theme-primary shrink-0" />
            <span>Nova Compra</span>
          </button>

          <button
            type="button"
            onClick={() => setModalProducaoAberto(true)}
            aria-label="Registrar Produção"
            className="badge-theme-subtle hover:brightness-95 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap shadow-xs"
            title="Registrar produção de lote de produtos"
          >
            <ChefHat className="w-4 h-4 text-theme-primary shrink-0" />
            <span>Produzir</span>
          </button>

          <button
            type="button"
            onClick={() => setModalInsumoAberto(true)}
            aria-label="Novo Insumo"
            className="btn-theme-primary inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap shadow-sm"
            title="Cadastrar nova matéria-prima ou insumo"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Novo Insumo</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total de Insumos</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalInsumos}</p>
          </div>
          <div className="p-3 badge-theme-subtle rounded-xl">
            <Boxes className="w-6 h-6 text-theme-primary" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Alerta de Estoque Mínimo</p>
            <p className={`text-2xl font-bold mt-1 ${insumosAlerta > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {insumosAlerta} {insumosAlerta === 1 ? 'item' : 'itens'}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${insumosAlerta > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Produtos com Receita</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{servicos.length}</p>
          </div>
          <div className="p-3 badge-theme-subtle rounded-xl">
            <ChefHat className="w-6 h-6 text-theme-primary" />
          </div>
        </div>
      </div>

      {/* Navegação por Abas Responsiva: 1 linha no Web, 2x2 no Mobile */}
      <div className="bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/60 shadow-xs">
        <nav className="grid grid-cols-2 lg:grid-cols-4 gap-1.5" aria-label="Abas de Estoque">
          <button
            type="button"
            onClick={() => setActiveTab('insumos')}
            className={`py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'insumos'
                ? 'tab-theme-active shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <Boxes className="w-4 h-4 shrink-0" />
            <span className="truncate">Insumos & Estoque</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('receitas')}
            className={`py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'receitas'
                ? 'tab-theme-active shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <ChefHat className="w-4 h-4 shrink-0" />
            <span className="truncate">Fichas Técnicas & CMV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulador')}
            aria-label="Simulador de Capacidade"
            className={`py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'simulador'
                ? 'tab-theme-active shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <Calculator className="w-4 h-4 shrink-0" />
            <span className="truncate">Simulador de Capacidade</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('movimentacoes')}
            className={`py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'movimentacoes'
                ? 'tab-theme-active shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <History className="w-4 h-4 shrink-0" />
            <span className="truncate">Histórico de Movimentações</span>
          </button>
        </nav>
      </div>

      {/* ABA 1: Matérias-Primas & Insumos */}
      {activeTab === 'insumos' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar insumo pelo nome..."
                value={buscaInsumo}
                onChange={(e) => setBuscaInsumo(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={apenasAbaixoMinimo}
                  onChange={(e) => setApenasAbaixoMinimo(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Apenas abaixo do mínimo</span>
              </label>

              <button
                type="button"
                onClick={carregarInsumos}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Atualizar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabela de Insumos */}
          {loading ? (
            <div
              className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2 shadow-sm"
              style={{
                backgroundColor: 'var(--bg-surface, #ffffff)',
                borderColor: 'var(--border-color, #e5e7eb)',
              }}
            >
              <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
              <p className="text-sm">Carregando estoque de matérias-primas...</p>
            </div>
          ) : insumos.length === 0 ? (
            <div
              className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm"
              style={{
                backgroundColor: 'var(--bg-surface, #ffffff)',
                borderColor: 'var(--border-color, #e5e7eb)',
              }}
            >
              <Boxes className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800">Nenhum insumo encontrado</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                Cadastre matérias-primas (farinha, frango, embalagens) ou registre compras para iniciar o controle.
              </p>
              <button
                type="button"
                onClick={() => setModalInsumoAberto(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-theme-primary text-sm font-semibold shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Primeiro Insumo
              </button>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW: Exibida em telas médias e grandes (md+) */}
              <div
                className="hidden md:block bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden"
                style={{
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  borderColor: 'var(--border-color, #e5e7eb)',
                }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3.5">Insumo / Matéria-Prima</th>
                        <th className="px-6 py-3.5">Saldo Atual</th>
                        <th className="px-6 py-3.5">Estoque Mínimo</th>
                        <th className="px-6 py-3.5">Custo Médio Ponderado</th>
                        <th className="px-6 py-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {insumos.map((insumo) => {
                        const saldo = Number(insumo.quantidade_atual);
                        const minimo = Number(insumo.estoque_minimo);
                        const isAbaixo = saldo <= minimo;

                        return (
                          <tr key={insumo.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-6 py-4 font-semibold text-gray-900">
                              {insumo.nome}
                              <span className="ml-2 text-xs text-gray-400 font-normal">
                                ({insumo.unidade_base})
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-800">
                              {formatQuantity(insumo.quantidade_atual, insumo.unidade_base)}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {formatQuantity(insumo.estoque_minimo, insumo.unidade_base)}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {formatCurrency(insumo.custo_unitario)} / {insumo.unidade_base}
                            </td>
                            <td className="px-6 py-4">
                              {isAbaixo ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Repor Estoque
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Suficiente
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MOBILE CARDS VIEW: Exibida em celulares (< md) - Cards destacados e espaçados como em /servicos */}
              <div className="block md:hidden space-y-4">
                {insumos.map((insumo) => {
                  const saldo = Number(insumo.quantidade_atual);
                  const minimo = Number(insumo.estoque_minimo);
                  const isAbaixo = saldo <= minimo;

                  return (
                    <div
                      key={insumo.id}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-all space-y-3.5"
                      style={{
                        backgroundColor: 'var(--bg-surface, #ffffff)',
                        borderColor: 'var(--border-color, #e5e7eb)',
                      }}
                      data-testid={`insumo-card-${insumo.id}`}
                    >
                        {/* Topo do Card: Nome e Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4
                              className="font-semibold text-gray-900 text-sm"
                              style={{ color: 'var(--text-main, #111827)' }}
                            >
                              {insumo.nome}
                            </h4>
                            <span className="text-xs text-gray-400 font-normal">
                              Unidade: {insumo.unidade_base}
                            </span>
                          </div>
                          <div>
                            {isAbaixo ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Repor Estoque
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Suficiente
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Micro-grid de Dados: Saldo, Mínimo e Custo */}
                        <div
                          className="grid grid-cols-2 gap-2.5 p-3 rounded-xl border text-xs"
                          style={{
                            backgroundColor: 'var(--bg-surface-hover, #f9fafb)',
                            borderColor: 'var(--border-color, #f3f4f6)',
                          }}
                        >
                          <div>
                            <span
                              className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider block"
                              style={{ color: 'var(--text-muted, #9ca3af)' }}
                            >
                              Saldo Atual
                            </span>
                            <span
                              className="font-bold text-sm text-gray-900 mt-0.5 block"
                              style={{ color: 'var(--text-main, #111827)' }}
                            >
                              {formatQuantity(insumo.quantidade_atual, insumo.unidade_base)}
                            </span>
                          </div>

                          <div>
                            <span
                              className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider block"
                              style={{ color: 'var(--text-muted, #9ca3af)' }}
                            >
                              Estoque Mínimo
                            </span>
                            <span
                              className="font-medium text-gray-700 mt-0.5 block"
                              style={{ color: 'var(--text-secondary, #374151)' }}
                            >
                              {formatQuantity(insumo.estoque_minimo, insumo.unidade_base)}
                            </span>
                          </div>

                          <div
                            className="col-span-2 pt-2 border-t flex items-center justify-between"
                            style={{ borderColor: 'var(--border-color, #e5e7eb)' }}
                          >
                            <span
                              className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider"
                              style={{ color: 'var(--text-muted, #9ca3af)' }}
                            >
                              Custo Médio Ponderado
                            </span>
                            <span
                              className="font-semibold text-xs text-gray-800"
                              style={{ color: 'var(--text-main, #111827)' }}
                            >
                              {formatCurrency(insumo.custo_unitario)} / {insumo.unidade_base}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
        </div>
      )}

      {/* ABA 2: Fichas Técnicas (Receitas) */}
      {activeTab === 'receitas' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="w-full sm:w-96">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Selecione um Produto do Catálogo:
                </label>
                <select
                  value={servicoSelecionadoId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setServicoSelecionadoId(id);
                    carregarFichaTecnica(id);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Escolha o produto para ver a receita --</option>
                  {servicos.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} ({formatCurrency(s.preco)})
                    </option>
                  ))}
                </select>
              </div>

              {servicoSelecionadoId && (
                <button
                  type="button"
                  onClick={() => setModalReceitaAberto(true)}
                  className="btn-theme-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  <ChefHat className="w-4 h-4" />
                  Editar / Montar Receita
                </button>
              )}
            </div>

            {/* Conteúdo da Ficha Técnica */}
            {loadingFicha ? (
              <div className="py-8 text-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin text-theme-primary mx-auto mb-2" />
                <p className="text-sm">Buscando ingredientes e CMV...</p>
              </div>
            ) : servicoSelecionadoId ? (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="badge-theme-subtle p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-theme-primary uppercase">
                      Custo Médio de Confecção (CMV dos Insumos)
                    </p>
                    <p className="text-2xl font-bold text-theme-primary mt-0.5">
                      {formatCurrency(fichaAtual.custo_ingredientes)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-600 uppercase">Ingredientes Cadastrados</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">
                      {(fichaAtual.ingredientes || []).length}
                    </p>
                  </div>
                </div>

                {(fichaAtual.ingredientes || []).length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-sm">Nenhum ingrediente configurado para este produto ainda.</p>
                    <button
                      type="button"
                      onClick={() => setModalReceitaAberto(true)}
                      className="mt-3 text-sm text-theme-primary font-semibold hover:underline"
                    >
                      Cadastrar ingredientes agora &rarr;
                    </button>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Visualização Tabela para Telas Médias e Grandes */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                          <tr>
                            <th className="px-4 py-3">Insumo</th>
                            <th className="px-4 py-3">Quantidade por Unidade de Produto</th>
                            <th className="px-4 py-3">Custo Unitário</th>
                            <th className="px-4 py-3">Custo Parcial</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {fichaAtual.ingredientes.map((ing) => {
                            const parcial =
                              Number(ing.quantidade_necessaria) * Number(ing.custo_unitario);
                            return (
                              <tr key={ing.id || ing.insumo_id}>
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {ing.nome_insumo}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                  {formatQuantity(ing.quantidade_necessaria, ing.unidade_base)}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {formatCurrency(ing.custo_unitario)} / {ing.unidade_base}
                                </td>
                                <td className="px-4 py-3 font-semibold text-gray-900">
                                  {formatCurrency(parcial)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Visualização em Cards para Mobile */}
                    <div className="block md:hidden divide-y divide-gray-100">
                      {fichaAtual.ingredientes.map((ing) => {
                        const parcial =
                          Number(ing.quantidade_necessaria) * Number(ing.custo_unitario);
                        return (
                          <div key={ing.id || ing.insumo_id} className="p-3.5 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="font-semibold text-sm text-gray-900">
                                {ing.nome_insumo}
                              </h5>
                              <span className="font-bold text-sm text-theme-primary">
                                {formatCurrency(parcial)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-gray-50">
                              <span>Qtd: <strong className="text-gray-800">{formatQuantity(ing.quantidade_necessaria, ing.unidade_base)}</strong></span>
                              <span>Unit.: <strong className="text-gray-800">{formatCurrency(ing.custo_unitario)}/{ing.unidade_base}</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic py-4">
                Selecione um produto acima para visualizar os ingredientes e o custo técnico.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: Simulador de Capacidade */}
      {activeTab === 'simulador' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-theme-primary" />
                Simulador Produtivo ("Com meu estoque atual, quanto consigo fazer?")
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Calcula o rendimento máximo imediato, identifica o ingrediente limitante (gargalo) e exibe as sobras estimadas.
              </p>
            </div>

            <form onSubmit={handleSimular} className="flex flex-col sm:flex-row items-end gap-3 pt-2">
              <div className="w-full sm:w-96">
                <label htmlFor="simulacao-servico" className="block text-xs font-semibold text-gray-700 mb-1">
                  Produto a Simular:
                </label>
                <select
                  id="simulacao-servico"
                  value={simulacaoServicoId}
                  onChange={(e) => setSimulacaoServicoId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Selecione o produto --</option>
                  {servicos.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={simulando || !simulacaoServicoId}
                className="btn-theme-primary px-5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {simulando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                Simular Agora
              </button>
            </form>

            {/* Resultado da Simulação */}
            {resultadoSimulacao && (
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                      Capacidade Máxima de Produção
                    </p>
                    <p className="text-3xl font-extrabold text-emerald-900 mt-1">
                      {resultadoSimulacao.rendimentoMaximo} unidade(s)
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">
                      Baseado exclusivamente nos insumos atualmente disponíveis no seu estoque.
                    </p>
                  </div>

                  {resultadoSimulacao.insumoLimitante && (
                    <div className="p-5 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                        Ingrediente Limitante (Gargalo Principal)
                      </p>
                      <p className="text-2xl font-bold text-amber-900 mt-1">
                        {resultadoSimulacao.insumoLimitante.nome}
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Para produzir mais 1 unidade, faltam{' '}
                        <span className="font-bold">
                          {resultadoSimulacao.insumoLimitante.faltaFormatada}
                        </span>.
                      </p>
                    </div>
                  )}
                </div>

                {/* Tabela de Sobras */}
                {Array.isArray(resultadoSimulacao.sobras) && resultadoSimulacao.sobras.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden mt-4">
                    <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 font-semibold text-xs text-gray-700 uppercase">
                      Estimativa de Sobras de Insumos após Fabricação
                    </div>
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {resultadoSimulacao.sobras.map((sobra) => (
                          <tr key={sobra.insumo_id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-800">{sobra.nome}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-gray-700">
                              Sobra: {sobra.sobraFormatada}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 4: Histórico de Movimentações */}
      {activeTab === 'movimentacoes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold text-gray-900" style={{ color: 'var(--text-main, #111827)' }}>
              Extrato de Movimentações do Estoque
            </h3>
            <button
              type="button"
              onClick={carregarMovimentacoes}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {movimentacoes.length === 0 ? (
            <div
              className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center text-gray-500 shadow-sm"
              style={{
                backgroundColor: 'var(--bg-surface, #ffffff)',
                borderColor: 'var(--border-color, #e5e7eb)',
              }}
            >
              <History className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">Nenhuma movimentação registrada até o momento.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW: Exibida em telas médias e grandes (md+) */}
              <div
                className="hidden md:block bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden"
                style={{
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  borderColor: 'var(--border-color, #e5e7eb)',
                }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3">Data / Hora</th>
                      <th className="px-6 py-3">Insumo</th>
                      <th className="px-6 py-3">Tipo</th>
                      <th className="px-6 py-3">Quantidade</th>
                      <th className="px-6 py-3">Saldo Resultante</th>
                      <th className="px-6 py-3">Motivo / Documento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movimentacoes.map((m) => {
                      const isEntrada = m.tipo === 'ENTRADA' || m.tipo === 'ESTORNO';
                      return (
                        <tr key={m.id} className="hover:bg-gray-50/80">
                          <td className="px-6 py-3.5 text-gray-500">{formatDate(m.criado_em)}</td>
                          <td className="px-6 py-3.5 font-semibold text-gray-900">
                            {m.nome_insumo || `Insumo #${m.insumo_id}`}
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                isEntrada ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {m.tipo}
                            </span>
                          </td>
                          <td className={`px-6 py-3.5 font-bold ${isEntrada ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isEntrada ? '+' : '-'} {formatQuantity(m.quantidade, m.unidade_base)}
                          </td>
                          <td className="px-6 py-3.5 text-gray-700 font-medium">
                            {formatQuantity(m.saldo_apos, m.unidade_base)}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-gray-500 truncate max-w-xs">
                            {m.motivo || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE CARDS VIEW: Exibida em celulares (< md) - Cards destacados e espaçados como em /servicos */}
            <div className="block md:hidden space-y-4">
              {movimentacoes.map((m) => {
                const isEntrada = m.tipo === 'ENTRADA' || m.tipo === 'ESTORNO';
                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-all space-y-3.5"
                    style={{
                      backgroundColor: 'var(--bg-surface, #ffffff)',
                      borderColor: 'var(--border-color, #e5e7eb)',
                    }}
                    data-testid={`mov-estoque-card-${m.id}`}
                  >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4
                            className="font-semibold text-gray-900 text-sm"
                            style={{ color: 'var(--text-main, #111827)' }}
                          >
                            {m.nome_insumo || `Insumo #${m.insumo_id}`}
                          </h4>
                          <span className="text-xs text-gray-400 block mt-0.5">
                            {formatDate(m.criado_em)}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            isEntrada ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {m.tipo}
                        </span>
                      </div>

                      <div
                        className="grid grid-cols-2 gap-2.5 p-3 rounded-xl border text-xs"
                        style={{
                          backgroundColor: 'var(--bg-surface-hover, #f9fafb)',
                          borderColor: 'var(--border-color, #f3f4f6)',
                        }}
                      >
                        <div>
                          <span
                            className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider block"
                            style={{ color: 'var(--text-muted, #9ca3af)' }}
                          >
                            Quantidade
                          </span>
                          <span
                            className={`font-bold text-sm block mt-0.5 ${
                              isEntrada ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {isEntrada ? '+' : '-'}
                            {formatQuantity(m.quantidade, m.unidade_base)}
                          </span>
                        </div>

                        <div>
                          <span
                            className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider block"
                            style={{ color: 'var(--text-muted, #9ca3af)' }}
                          >
                            Saldo Resultante
                          </span>
                          <span
                            className="font-medium text-gray-800 block mt-0.5"
                            style={{ color: 'var(--text-secondary, #374151)' }}
                          >
                            {formatQuantity(m.saldo_apos, m.unidade_base)}
                          </span>
                        </div>

                        {m.motivo && (
                          <div
                            className="col-span-2 pt-2 border-t text-[11px] text-gray-500 italic"
                            style={{ borderColor: 'var(--border-color, #e5e7eb)' }}
                          >
                            Motivo: {m.motivo}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL 1: Novo Insumo */}
      <Modal
        isOpen={modalInsumoAberto}
        onClose={() => setModalInsumoAberto(false)}
        title="Novo Insumo / Matéria-Prima"
      >
        <form onSubmit={handleCadastrarInsumo} className="space-y-4">
          <div className="badge-theme-subtle rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 btn-theme-primary rounded-lg">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Preenchimento Rápido com IA</p>
                <p className="text-[11px] text-gray-600">Fotografe a embalagem ou rótulo do insumo</p>
              </div>
            </div>
            <button
              type="button"
              disabled={analisandoFotoOcr}
              onClick={() => {
                setCameraDestino('novo_insumo');
                setCameraModalAberto(true);
              }}
              className="btn-theme-primary px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {analisandoFotoOcr ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Lendo Foto...
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  Preencher por Foto (Câmera)
                </>
              )}
            </button>
          </div>

          <FormField
            label="Nome do Insumo (ex: Farinha de Trigo, Frango, Embalagem)"
            id="nome-insumo"
            value={formInsumo.nome}
            onChange={(e) => setFormInsumo({ ...formInsumo, nome: e.target.value })}
            placeholder="Ex: Farinha de Trigo Especial"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidade Base de Fracionamento:
            </label>
            <select
              value={formInsumo.unidade_base}
              onChange={(e) => setFormInsumo({ ...formInsumo, unidade_base: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="g">Gramas (g) — Ideal para farinhas, carnes, temperos</option>
              <option value="ml">Mililitros (ml) — Ideal para óleos, leite, líquidos</option>
              <option value="un">Unidades (un) — Ideal para ovos, embalagens, potes</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={`Estoque Mínimo (${formInsumo.unidade_base})`}
              id="minimo-insumo"
              type="number"
              step="any"
              value={formInsumo.estoque_minimo}
              onChange={(e) => setFormInsumo({ ...formInsumo, estoque_minimo: e.target.value })}
              placeholder="Ex: 1000"
            />

            <FormField
              label={`Custo Unitário Padrão (R$ por ${formInsumo.unidade_base})`}
              id="custo-insumo"
              type="number"
              step="any"
              value={formInsumo.custo_unitario}
              onChange={(e) => setFormInsumo({ ...formInsumo, custo_unitario: e.target.value })}
              placeholder="Ex: 0.005"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalInsumoAberto(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="btn-theme-primary px-4 py-2 text-sm font-semibold rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-sm transition"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar Insumo
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Registrar Compra / Entrada */}
      <Modal
        isOpen={modalEntradaAberto}
        onClose={() => setModalEntradaAberto(false)}
        title="Registrar Compra / Entrada de Insumo"
      >
        <form onSubmit={handleRegistrarEntrada} className="space-y-4">
          <div className="badge-theme-subtle rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 btn-theme-primary rounded-lg">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Preencher Dados por Foto</p>
                <p className="text-[11px] text-gray-600">Fotografe o cupom ou embalagem comprada</p>
              </div>
            </div>
            <button
              type="button"
              disabled={analisandoFotoOcr}
              onClick={() => {
                setCameraDestino('entrada');
                setCameraModalAberto(true);
              }}
              className="btn-theme-primary px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {analisandoFotoOcr ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Lendo Foto...
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  Preencher por Foto (Câmera)
                </>
              )}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selecionar Insumo Cadastrado:
            </label>
            <select
              value={formEntrada.insumo_id}
              onChange={(e) => setFormEntrada({ ...formEntrada, insumo_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Ou digite o nome abaixo caso seja novo --</option>
              {insumos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome} (Saldo atual: {formatQuantity(i.quantidade_atual, i.unidade_base)})
                </option>
              ))}
            </select>
          </div>

          {!formEntrada.insumo_id && (
            <FormField
              label="Nome do Insumo (se ainda não cadastrado)"
              id="nome-novo-entrada"
              value={formEntrada.nome}
              onChange={(e) => setFormEntrada({ ...formEntrada, nome: e.target.value })}
              placeholder="Ex: Queijo Mussarela"
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Quantidade Comprada"
              id="qtd-entrada"
              type="number"
              step="any"
              value={formEntrada.quantidade}
              onChange={(e) => setFormEntrada({ ...formEntrada, quantidade: e.target.value })}
              placeholder="Ex: 5"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade:</label>
              <select
                value={formEntrada.unidade}
                onChange={(e) => setFormEntrada({ ...formEntrada, unidade: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="kg">Quilos (kg) — converte para gramas</option>
                <option value="g">Gramas (g)</option>
                <option value="l">Litros (l) — converte para ml</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="un">Unidades (un)</option>
              </select>
            </div>
          </div>

          <FormField
            label="Valor Total Pago (R$)"
            id="custo-total-entrada"
            type="number"
            step="0.01"
            value={formEntrada.custo_total}
            onChange={(e) => setFormEntrada({ ...formEntrada, custo_total: e.target.value })}
            placeholder="Ex: 25.00"
          />

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={formEntrada.lancar_no_caixa}
                onChange={(e) => setFormEntrada({ ...formEntrada, lancar_no_caixa: e.target.checked })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-medium">Lançar saída financeira automaticamente no Livro Caixa</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Gera registro de despesa em Dinheiro/Caixa no valor total informado.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalEntradaAberto(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="btn-theme-primary px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-2 shadow-xs"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar Entrada
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Montar/Editar Ficha Técnica */}
      <Modal
        isOpen={modalReceitaAberto}
        onClose={() => setModalReceitaAberto(false)}
        title="Editar Receita / Ficha Técnica do Produto"
      >
        <form onSubmit={handleSalvarFichaTecnica} className="space-y-4">
          <p className="text-xs text-gray-500">
            Defina quais matérias-primas e quantidades são consumidas para confeccionar cada unidade deste produto.
          </p>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {ingredientesForm.map((item, index) => {
              const insumoObj = insumos.find((i) => i.id === parseInt(item.insumo_id, 10));
              const unidade = insumoObj ? insumoObj.unidade_base : '';

              return (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <select
                      value={item.insumo_id}
                      onChange={(e) => {
                        const novo = [...ingredientesForm];
                        novo[index].insumo_id = e.target.value;
                        setIngredientesForm(novo);
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                      required
                    >
                      <option value="">-- Insumo --</option>
                      {insumos.map((ins) => (
                        <option key={ins.id} value={ins.id}>
                          {ins.nome} ({ins.unidade_base})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32">
                    <input
                      type="number"
                      step="any"
                      placeholder={`Qtd (${unidade || 'base'})`}
                      value={item.quantidade_necessaria}
                      onChange={(e) => {
                        const novo = [...ingredientesForm];
                        novo[index].quantidade_necessaria = e.target.value;
                        setIngredientesForm(novo);
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIngredientesForm(ingredientesForm.filter((_, i) => i !== index));
                    }}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Remover"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIngredientesForm([...ingredientesForm, { insumo_id: '', quantidade_necessaria: '' }])}
            className="inline-flex items-center gap-1.5 text-xs text-theme-primary font-semibold hover:opacity-80"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Ingrediente à Receita
          </button>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalReceitaAberto(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="btn-theme-primary px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-2 shadow-xs"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar Receita
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Registrar Produção de Lote */}
      <Modal
        isOpen={modalProducaoAberto}
        onClose={() => setModalProducaoAberto(false)}
        title="Registrar Produção de Lote de Produtos"
      >
        <form onSubmit={handleRegistrarProducao} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Produto Fabricado:
            </label>
            <select
              value={formProducao.servico_id}
              onChange={(e) => setFormProducao({ ...formProducao, servico_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">-- Selecione o produto --</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>

          <FormField
            label="Quantidade de Unidades Fabricadas"
            id="qtd-producao"
            type="number"
            min="1"
            value={formProducao.quantidade}
            onChange={(e) => setFormProducao({ ...formProducao, quantidade: e.target.value })}
            placeholder="Ex: 5"
            required
          />

          <p className="text-xs text-gray-600 badge-theme-subtle p-3 rounded-lg border border-gray-200/60">
            💡 Ao registrar a produção, os insumos da ficha técnica serão abatidos proporcionalmente do seu estoque de matérias-primas.
          </p>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalProducaoAberto(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="btn-theme-primary px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-2 shadow-xs"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar Produção
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: Entrada por Nota Fiscal / Foto / XML */}
      <Modal
        isOpen={modalNotaFiscalAberto}
        onClose={() => {
          setModalNotaFiscalAberto(false);
          setDadosNotaImportada(null);
          setFotoBase64('');
          setFotoPreview('');
          setArquivoXmlNome('');
        }}
        title="Entrada de Insumos por Nota Fiscal (Foto ou XML)"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 border-b border-gray-100 pb-3">
            <button
              type="button"
              onClick={() => setModoImportacao('foto')}
              className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all flex items-center justify-center gap-1.5 ${
                modoImportacao === 'foto'
                  ? 'tab-theme-active shadow-xs border-transparent'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Camera className="w-4 h-4" /> Foto do Cupom / Nota
            </button>
            <button
              type="button"
              onClick={() => setModoImportacao('xml')}
              className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all flex items-center justify-center gap-1.5 ${
                modoImportacao === 'xml'
                  ? 'tab-theme-active shadow-xs border-transparent'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FileCode className="w-4 h-4" /> Arquivo XML da NF-e
            </button>
          </div>

          {modoImportacao === 'foto' ? (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-gray-700">
                Selecione como deseja importar a foto da nota fiscal / cupom:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opção 1: Câmera Direta do App */}
                <button
                  type="button"
                  onClick={() => {
                    setCameraDestino('nota');
                    setCameraModalAberto(true);
                  }}
                  className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 hover:border-gray-400 badge-theme-subtle rounded-xl text-center transition-all group shadow-xs"
                >
                  <div className="w-11 h-11 rounded-full btn-theme-primary flex items-center justify-center mb-2 shadow-sm group-hover:scale-105 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-gray-900">
                    Tirar Foto Agora (Câmera)
                  </span>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Visor direto no app para fotografar
                  </p>
                </button>

                {/* Opção 2: Galeria / Seletor de Arquivos / PDF */}
                <div className="border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-50/60 hover:bg-gray-50 rounded-xl p-4 text-center transition-colors flex flex-col items-center justify-center">
                  <input
                    type="file"
                    id="input-foto-nota"
                    accept="image/*,application/pdf"
                    capture="environment"
                    onChange={handleSelecionarFoto}
                    className="hidden"
                  />
                  <label htmlFor="input-foto-nota" className="cursor-pointer block w-full">
                    <div className="w-11 h-11 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center mb-2 mx-auto">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-800 hover:underline">
                      Escolher da Galeria / PDF
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      PNG, JPG, JPEG ou PDF
                    </p>
                  </label>
                </div>
              </div>

              {fotoPreview && (
                <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <img src={fotoPreview} alt="Preview" className="w-12 h-12 object-cover rounded border border-gray-300" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Foto carregada</p>
                      <p className="text-[10px] text-gray-500">Pronta para leitura visual inteligente</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAnalisarFoto}
                    disabled={processandoNota}
                    className="btn-theme-primary px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                  >
                    {processandoNota ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Analisar com IA
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700">
                Anexe o arquivo XML da NF-e emitida pelo fornecedor:
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  id="input-xml-nota"
                  accept=".xml,text/xml"
                  onChange={handleSelecionarXml}
                  className="hidden"
                />
                <label htmlFor="input-xml-nota" className="cursor-pointer block">
                  <FileCode className="w-8 h-8 text-theme-primary mx-auto mb-1" />
                  <span className="text-xs font-semibold text-theme-primary hover:underline">
                    {arquivoXmlNome || 'Clique para carregar o arquivo .XML'}
                  </span>
                  <p className="text-[11px] text-gray-400 mt-0.5">Layout oficial NF-e SEFAZ 4.00</p>
                </label>
              </div>
            </div>
          )}

          {/* Prévia / Conferência dos Itens Extraídos */}
          {dadosNotaImportada && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
              <div className="p-3 badge-theme-subtle border border-gray-200/60 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-gray-900">
                    Fornecedor: {dadosNotaImportada.fornecedor || 'Identificado na nota'}
                  </p>
                  <p className="text-gray-500 mt-0.5">
                    Doc / NF: #{dadosNotaImportada.numero_documento || 'S/N'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-500 uppercase font-semibold">Valor Total</p>
                  <p className="text-base font-bold text-gray-900">
                    {formatCurrency(dadosNotaImportada.valor_total)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                <p className="text-xs font-semibold text-gray-700">
                  Itens Identificados ({dadosNotaImportada.itens?.length || 0}):
                </p>
                {(dadosNotaImportada.itens || []).map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                    <input
                      type="text"
                      value={it.nome}
                      onChange={(e) => {
                        const novo = { ...dadosNotaImportada };
                        novo.itens[idx].nome = e.target.value;
                        setDadosNotaImportada(novo);
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                      placeholder="Nome do insumo"
                    />
                    <input
                      type="number"
                      step="any"
                      value={it.quantidade}
                      onChange={(e) => {
                        const novo = { ...dadosNotaImportada };
                        novo.itens[idx].quantidade = e.target.value;
                        setDadosNotaImportada(novo);
                      }}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
                      placeholder="Qtd"
                    />
                    <select
                      value={it.unidade}
                      onChange={(e) => {
                        const novo = { ...dadosNotaImportada };
                        novo.itens[idx].unidade = e.target.value;
                        setDadosNotaImportada(novo);
                      }}
                      className="w-16 px-1 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="ml">ml</option>
                      <option value="un">un</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={it.custo_total}
                      onChange={(e) => {
                        const novo = { ...dadosNotaImportada };
                        novo.itens[idx].custo_total = e.target.value;
                        setDadosNotaImportada(novo);
                      }}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                      placeholder="R$ Total"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const novo = { ...dadosNotaImportada };
                        novo.itens = novo.itens.filter((_, i) => i !== idx);
                        setDadosNotaImportada(novo);
                      }}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Excluir item da entrada"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lancarCaixaNota}
                    onChange={(e) => setLancarCaixaNota(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold">Lançar valor total como despesa no Livro Caixa</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDadosNotaImportada(null)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarEntradaNota}
                  disabled={salvando || (dadosNotaImportada.itens || []).length === 0}
                  className="btn-theme-primary px-4 py-2 text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmar Entrada de Insumos
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL DE CÂMERA INTEGRADA DIRETO NO APP */}
      <CameraCaptureModal
        isOpen={cameraModalAberto}
        onClose={() => setCameraModalAberto(false)}
        onCapture={handleFotoCapturada}
        title={
          cameraDestino === 'novo_insumo'
            ? 'Fotografar Rótulo / Insumo'
            : cameraDestino === 'entrada'
            ? 'Fotografar Comprovante / Insumo Comprado'
            : 'Fotografar Nota / Cupom de Insumos'
        }
        subtitle={
          cameraDestino === 'novo_insumo'
            ? 'Aponte para a embalagem para preencher os campos do insumo automaticamente com IA'
            : cameraDestino === 'entrada'
            ? 'Aponte para o comprovante ou produto para preencher a compra com IA'
            : 'Aponte para a nota fiscal impressa ou cupom para extrair todos os itens'
        }
      />
    </div>
  );
}

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  FileText,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Activity,
  UserPlus,
  BarChart3,
  LayoutDashboard,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import DynamicWidgetCard from '../components/dashboard/DynamicWidgetCard';
import ModalNovoDashboard from '../components/dashboard/ModalNovoDashboard';
import ModalNovoWidget from '../components/dashboard/ModalNovoWidget';
import { isMobileEnvironment } from '../utils/device';

const ResponsiveGridLayout = WidthProvider(Responsive);

const formatMoney = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
  } catch {}
  return String(dateStr).split('T')[0];
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
  } catch {}
  return '';
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState({
    saldo_mes: 0,
    entradas_mes: 0,
    saidas_mes: 0,
    a_receber_pendente: 0,
    agendamentos_hoje: 0,
    proximos_agendamentos: [],
  });

  const [dashboards, setDashboards] = useState([]);
  const [activeDashboardId, setActiveDashboardId] = useState(null);
  const [activeDashboard, setActiveDashboard] = useState(null);
  const [loadingWidgets, setLoadingWidgets] = useState(false);
  const [modalNovoDashboardAberto, setModalNovoDashboardAberto] = useState(false);
  const [modalNovoWidgetAberto, setModalNovoWidgetAberto] = useState(false);
  const [metricasCatalogo, setMetricasCatalogo] = useState([]);
  const [isDraggingTab, setIsDraggingTab] = useState(false);
  const [draggedDashboard, setDraggedDashboard] = useState(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [modalExcluirDashboardAberto, setModalExcluirDashboardAberto] = useState(false);
  const [dashboardParaExcluir, setDashboardParaExcluir] = useState(null);
  const [excluindoDashboard, setExcluindoDashboard] = useState(false);
  const [isMobile, setIsMobile] = useState(isMobileEnvironment);
  const [insightsIA, setInsightsIA] = useState({ total_insights: 0, resumo_saude: 'EXCELENTE', insights: [] });
  const [loadingInsights, setLoadingInsights] = useState(false);

  const fetchInsights = useCallback(async () => {
    setLoadingInsights(true);
    try {
      const res = await api.get('/dashboard/insights');
      const dados = res?.data?.dados || res?.data;
      if (dados && Array.isArray(dados.insights)) {
        setInsightsIA({
          total_insights: Number(dados.total_insights ?? dados.insights.length),
          resumo_saude: dados.resumo_saude || 'EXCELENTE',
          insights: dados.insights,
        });
      }
    } catch (err) {
      console.error('Erro ao buscar insights proativos:', err);
    } finally {
      setLoadingInsights(false);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileEnvironment());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchDashboardDetalhes = useCallback(async (id, currentList = []) => {
    const listToSearch = currentList.length > 0 ? currentList : dashboards;
    const dashFromList = listToSearch.find((d) => d.id === id);
    if (dashFromList) {
      setActiveDashboard(dashFromList);
    }
    setLoadingWidgets(true);
    try {
      const res = await api.get(`/dashboards/${id}`);
      const dados = res?.data?.dados || res?.data;
      if (dados && dados.id) {
        setActiveDashboard(dados);
        setDashboards((prev) =>
          prev.map((d) => (d.id === dados.id ? { ...d, ...dados } : d))
        );
      }
    } catch (err) {
      if (!dashFromList) {
        console.error('Erro ao carregar detalhes do dashboard:', err);
      }
    } finally {
      setLoadingWidgets(false);
    }
  }, [dashboards]);

  const fetchDashboards = useCallback(async (preferredId = null) => {
    try {
      const res = await api.get('/dashboards');
      const lista = res?.data?.dados || (Array.isArray(res?.data) ? res?.data : []);
      setDashboards(lista);

      if (lista.length > 0) {
        const targetId =
          preferredId ||
          activeDashboardId ||
          (lista.find((d) => d.eh_padrao)?.id || lista[0].id);
        setActiveDashboardId(targetId);
        await fetchDashboardDetalhes(targetId, lista);
      }
    } catch (err) {
      console.error('Erro ao listar dashboards:', err);
    }
  }, [activeDashboardId, fetchDashboardDetalhes]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/resumo');
      const dados = res?.data?.dados || res?.data || {};
      const fin = dados.financeiro || {};
      const op = dados.operacional || {};

      let proximos =
        dados.proximos_agendamentos ??
        op.proximos_agendamentos ??
        dados.proximos_atendimentos ??
        dados.agendamentos ??
        [];

      // Se o endpoint não retornou a lista nem chave de agendamentos, tenta fallback
      const hasAgendamentosKey =
        dados.proximos_agendamentos !== undefined ||
        op.proximos_agendamentos !== undefined;

      if (!hasAgendamentosKey && (!Array.isArray(proximos) || proximos.length === 0)) {
        try {
          const resAgend = await api.get('/agendamentos');
          const listaAgend = Array.isArray(resAgend?.data?.dados)
            ? resAgend.data.dados
            : Array.isArray(resAgend?.data)
            ? resAgend.data
            : [];
          if (listaAgend.length > 0) {
            proximos = listaAgend.slice(0, 5);
          }
        } catch {
          // ignore fallback error
        }
      }

      const entradas = Number(
        dados.entradas_mes ??
        fin.entradas_mes ??
        dados.entradas ??
        dados.total_entradas ??
        0
      );

      const saidas = Number(
        dados.saidas_mes ??
        fin.saidas_mes ??
        dados.saidas ??
        dados.total_saidas ??
        0
      );

      const saldo =
        dados.saldo_mes !== undefined
          ? Number(dados.saldo_mes)
          : fin.saldo_mes !== undefined
          ? Number(fin.saldo_mes)
          : dados.saldo !== undefined
          ? Number(dados.saldo)
          : Number((entradas - saidas).toFixed(2));

      const aReceber = Number(
        dados.a_receber_pendente ??
        fin.a_receber_pendente ??
        dados.a_receber ??
        dados.cobrancas_pendentes ??
        0
      );

      const agendHoje = Number(
        dados.agendamentos_hoje ??
        op.agendamentos_hoje ??
        dados.atendimentos_hoje ??
        0
      );

      setResumo({
        saldo_mes: saldo,
        entradas_mes: entradas,
        saidas_mes: saidas,
        a_receber_pendente: aReceber,
        agendamentos_hoje: agendHoje,
        proximos_agendamentos: Array.isArray(proximos) ? proximos : [],
      });
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchDashboards();
    fetchInsights();

    api
      .get('/dashboards/metricas/catalogo')
      .then((res) => {
        const cats = res?.data?.dados?.metricas || res?.data?.metricas;
        if (Array.isArray(cats) && cats.length > 0) {
          setMetricasCatalogo(cats);
        }
      })
      .catch(() => {});
  }, [fetchInsights]);

  const handleSelectDashboard = async (id) => {
    setActiveDashboardId(id);
    await fetchDashboardDetalhes(id, dashboards);
  };

  const handleCriarDashboard = async ({ nome, descricao }) => {
    const res = await api.post('/dashboards', { nome, descricao });
    const novo = res?.data?.dados || res?.data;
    const novoId = novo?.id;
    await fetchDashboards(novoId);
  };

  const handleAdicionarWidget = async (dadosWidget) => {
    if (!activeDashboardId) return;
    await api.post(`/dashboards/${activeDashboardId}/widgets`, dadosWidget);
    await fetchDashboardDetalhes(activeDashboardId, dashboards);
  };

  const layouts = useMemo(() => {
    let curX = 0;
    let curY = 0;

    return (activeDashboard?.widgets || []).map((w) => {
      const cfg = w.configuracoes || {};
      const platformCfg = isMobile ? (cfg.mobile || {}) : (cfg.web || {});

      // Determinar width da plataforma ativa com fallback
      let width;
      if (platformCfg.w !== undefined) {
        width = Number(platformCfg.w);
      } else if (platformCfg.largura !== undefined) {
        width = Number(platformCfg.largura) === 2 ? 12 : 6;
      } else if (!isMobile && cfg.w !== undefined) {
        width = Number(cfg.w);
      } else if (isMobile) {
        if (cfg.w !== undefined) {
          width = Number(cfg.w);
        } else if (w.largura !== undefined) {
          width = Number(w.largura) === 2 ? 12 : 6;
        } else {
          width = 12;
        }
      } else {
        width = Number(w.largura) === 2 ? 12 : 6;
      }

      // Determinar height da plataforma ativa com fallback
      let height;
      if (platformCfg.h !== undefined) {
        height = Number(platformCfg.h);
      } else if (cfg.h !== undefined) {
        height = Number(cfg.h);
      } else {
        height = 3;
      }

      // Determinar x e y
      let x =
        platformCfg.x !== undefined
          ? Number(platformCfg.x)
          : !isMobile && cfg.x !== undefined
          ? Number(cfg.x)
          : curX;
      let y =
        platformCfg.y !== undefined
          ? Number(platformCfg.y)
          : !isMobile && cfg.y !== undefined
          ? Number(cfg.y)
          : curY;

      const hasExplicitX =
        platformCfg.x !== undefined || (!isMobile && cfg.x !== undefined);

      if (!hasExplicitX) {
        if (curX + width > 12) {
          curX = 0;
          curY += height;
          x = curX;
          y = curY;
        }
        curX += width;
      }

      return {
        i: String(w.id),
        x: isNaN(x) ? 0 : x,
        y: isNaN(y) ? 0 : y,
        w: isNaN(width) ? (isMobile ? 12 : 6) : width,
        h: isNaN(height) ? 3 : height,
        minW: isMobile ? 1 : 4,
        maxW: 12,
        minH: 2,
        maxH: 8,
        isResizable: !isMobile,
      };
    });
  }, [activeDashboard?.widgets, isMobile]);

  const handleDragOrResizeStop = async (layout) => {
    if (!layout || !activeDashboardId) return;

    if (isMobile) {
      setActiveDashboard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          widgets: (prev.widgets || []).map((w) => {
            const item = layout.find((l) => l.i === String(w.id));
            if (!item) return w;
            const mobileLargura = item.w >= 9 ? 2 : 1;
            const novoConfigMobile = {
              ...(w.configuracoes?.mobile || {}),
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
              largura: mobileLargura,
            };
            return {
              ...w,
              configuracoes: {
                ...(w.configuracoes || {}),
                mobile: novoConfigMobile,
              },
            };
          }),
        };
      });

      try {
        await Promise.all(
          layout.map(async (item) => {
            const widgetId = Number(item.i);
            const targetWidget = (activeDashboard?.widgets || []).find((w) => w.id === widgetId);
            if (!targetWidget) return;
            const mobileLargura = item.w >= 9 ? 2 : 1;
            const novoConfigMobile = {
              ...(targetWidget.configuracoes?.mobile || {}),
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
              largura: mobileLargura,
            };
            const novoConfig = {
              ...(targetWidget.configuracoes || {}),
              mobile: novoConfigMobile,
            };
            return api.put(`/dashboards/${activeDashboardId}/widgets/${widgetId}`, {
              largura: Number(targetWidget.largura) === 2 ? 2 : 1,
              configuracoes: novoConfig,
            });
          })
        );
      } catch (err) {
        console.error('Erro ao salvar layout ajustado no mobile:', err);
      }
      return;
    }

    // Web
    setActiveDashboard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: (prev.widgets || []).map((w) => {
          const item = layout.find((l) => l.i === String(w.id));
          if (!item) return w;
          const novaLargura = item.w >= 9 ? 2 : 1;
          const novoConfigWeb = {
            ...(w.configuracoes?.web || {}),
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
            largura: novaLargura,
          };
          return {
            ...w,
            largura: novaLargura,
            configuracoes: {
              ...(w.configuracoes || {}),
              web: novoConfigWeb,
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
            },
          };
        }),
      };
    });

    try {
      await Promise.all(
        layout.map(async (item) => {
          const widgetId = Number(item.i);
          const targetWidget = (activeDashboard?.widgets || []).find((w) => w.id === widgetId);
          if (!targetWidget) return;
          const novaLargura = item.w >= 9 ? 2 : 1;
          const novoConfigWeb = {
            ...(targetWidget.configuracoes?.web || {}),
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
            largura: novaLargura,
          };
          const novoConfig = {
            ...(targetWidget.configuracoes || {}),
            web: novoConfigWeb,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
          };
          return api.put(`/dashboards/${activeDashboardId}/widgets/${widgetId}`, {
            largura: novaLargura,
            configuracoes: novoConfig,
          });
        })
      );
    } catch (err) {
      console.error('Erro ao salvar layout ajustado dos widgets:', err);
    }
  };

  const handleToggleWidth = async (widget) => {
    if (isMobile) {
      const curMobile = widget.configuracoes?.mobile || {};
      const isCurrentWide =
        curMobile.largura !== undefined
          ? Number(curMobile.largura) === 2 || curMobile.largura === 'inteira'
          : curMobile.w !== undefined
          ? Number(curMobile.w) >= 9
          : widget.configuracoes?.w !== undefined
          ? Number(widget.configuracoes.w) >= 9
          : Number(widget.largura) === 2;

      const novaLarguraMobile = isCurrentWide ? 1 : 2;
      const novoWMobile = novaLarguraMobile === 2 ? 12 : 6;
      const novoHMobile =
        curMobile.h !== undefined
          ? Number(curMobile.h)
          : widget.configuracoes?.h !== undefined
          ? Number(widget.configuracoes.h)
          : 3;

      const novoConfigMobile = {
        ...curMobile,
        largura: novaLarguraMobile,
        w: novoWMobile,
        h: novoHMobile,
      };

      const novoConfig = {
        ...(widget.configuracoes || {}),
        mobile: novoConfigMobile,
      };

      setActiveDashboard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          widgets: (prev.widgets || []).map((w) =>
            w.id === widget.id
              ? {
                  ...w,
                  configuracoes: novoConfig,
                }
              : w
          ),
        };
      });

      try {
        await api.put(`/dashboards/${activeDashboardId}/widgets/${widget.id}`, {
          largura: Number(widget.largura) === 2 ? 2 : 1,
          configuracoes: novoConfig,
        });
      } catch (err) {
        console.error('Erro ao atualizar largura do widget no mobile:', err);
        await fetchDashboardDetalhes(activeDashboardId, dashboards);
      }
      return;
    }

    // Web
    const curWeb = widget.configuracoes?.web || {};
    const isCurrentWide =
      curWeb.largura !== undefined
        ? Number(curWeb.largura) === 2 || curWeb.largura === 'inteira'
        : curWeb.w !== undefined
        ? Number(curWeb.w) >= 9
        : widget.configuracoes?.w !== undefined
        ? Number(widget.configuracoes.w) >= 9
        : Number(widget.largura) === 2;

    const novaLargura = isCurrentWide ? 1 : 2;
    const novoW = novaLargura === 2 ? 12 : 6;
    const novoH =
      curWeb.h !== undefined
        ? Number(curWeb.h)
        : widget.configuracoes?.h !== undefined
        ? Number(widget.configuracoes.h)
        : 3;

    const novoConfigWeb = {
      ...curWeb,
      largura: novaLargura,
      w: novoW,
      h: novoH,
    };

    const novoConfig = {
      ...(widget.configuracoes || {}),
      web: novoConfigWeb,
      w: novoW,
      h: novoH,
    };

    setActiveDashboard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: (prev.widgets || []).map((w) =>
          w.id === widget.id
            ? { ...w, largura: novaLargura, configuracoes: novoConfig }
            : w
        ),
      };
    });
    try {
      await api.put(`/dashboards/${activeDashboardId}/widgets/${widget.id}`, {
        largura: novaLargura,
        configuracoes: novoConfig,
      });
    } catch (err) {
      console.error('Erro ao atualizar largura do widget:', err);
      await fetchDashboardDetalhes(activeDashboardId, dashboards);
    }
  };

  const handleChangePeriod = async (widget, novoPeriodo) => {
    try {
      await api.put(`/dashboards/${activeDashboardId}/widgets/${widget.id}`, {
        periodo: novoPeriodo,
      });
      await fetchDashboardDetalhes(activeDashboardId, dashboards);
    } catch (err) {
      console.error('Erro ao atualizar período do widget:', err);
    }
  };

  const handleDeleteWidget = async (widget) => {
    setActiveDashboard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: (prev.widgets || []).filter((w) => w.id !== widget.id),
      };
    });
    try {
      await api.delete(`/dashboards/${activeDashboardId}/widgets/${widget.id}`);
    } catch (err) {
      console.error('Erro ao excluir widget:', err);
      await fetchDashboardDetalhes(activeDashboardId, dashboards);
    }
  };

  const handleRestaurarLayoutPadrao = async () => {
    if (!activeDashboard?.widgets || !activeDashboardId) return;

    if (isMobile) {
      let curY = 0;
      const novosWidgets = (activeDashboard.widgets || []).map((w) => {
        const wWidth = 12;
        const wHeight = 3;
        const posX = 0;
        const posY = curY;
        curY += 3;

        const novoConfigMobile = {
          x: posX,
          y: posY,
          w: wWidth,
          h: wHeight,
          largura: 2,
        };

        return {
          ...w,
          configuracoes: {
            ...(w.configuracoes || {}),
            mobile: novoConfigMobile,
          },
        };
      });

      setActiveDashboard((prev) => ({
        ...prev,
        widgets: novosWidgets,
      }));

      try {
        await Promise.all(
          novosWidgets.map((w) =>
            api.put(`/dashboards/${activeDashboardId}/widgets/${w.id}`, {
              largura: Number(w.largura) === 2 ? 2 : 1,
              configuracoes: w.configuracoes,
            })
          )
        );
      } catch (err) {
        console.error('Erro ao restaurar layout padrão no mobile:', err);
      }
      return;
    }

    let curX = 0;
    let curY = 0;
    const novosWidgets = (activeDashboard.widgets || []).map((w) => {
      const isWide = Number(w.largura) === 2;
      const wWidth = isWide ? 12 : 6;
      const wHeight = 3;

      if (curX + wWidth > 12) {
        curX = 0;
        curY += 3;
      }
      const posX = curX;
      const posY = curY;
      curX += wWidth;

      const novoConfigWeb = {
        x: posX,
        y: posY,
        w: wWidth,
        h: wHeight,
        largura: isWide ? 2 : 1,
      };

      return {
        ...w,
        configuracoes: {
          ...(w.configuracoes || {}),
          web: novoConfigWeb,
          x: posX,
          y: posY,
          w: wWidth,
          h: wHeight,
        },
      };
    });

    setActiveDashboard((prev) => ({
      ...prev,
      widgets: novosWidgets,
    }));

    try {
      await Promise.all(
        novosWidgets.map((w) =>
          api.put(`/dashboards/${activeDashboardId}/widgets/${w.id}`, {
            largura: w.largura,
            configuracoes: w.configuracoes,
          })
        )
      );
    } catch (err) {
      console.error('Erro ao restaurar layout padrão:', err);
    }
  };

  const handleDragStartTab = (e, dash) => {
    if (dashboards.length <= 1) return;
    setIsDraggingTab(true);
    setDraggedDashboard(dash);
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', String(dash.id));
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragEndTab = () => {
    setIsDraggingTab(false);
    setDraggedDashboard(null);
    setIsOverTrash(false);
  };

  const handleDropOnTrash = () => {
    if (draggedDashboard) {
      setDashboardParaExcluir(draggedDashboard);
      setModalExcluirDashboardAberto(true);
    }
    setIsDraggingTab(false);
    setIsOverTrash(false);
  };

  const handleConfirmarExclusaoDashboard = async () => {
    if (!dashboardParaExcluir) return;
    setExcluindoDashboard(true);
    try {
      await api.delete(`/dashboards/${dashboardParaExcluir.id}`);
      const novaLista = dashboards.filter((d) => d.id !== dashboardParaExcluir.id);
      setDashboards(novaLista);
      setModalExcluirDashboardAberto(false);
      setDashboardParaExcluir(null);

      if (novaLista.length > 0) {
        const nextActiveId =
          activeDashboardId === dashboardParaExcluir.id
            ? (novaLista.find((d) => d.eh_padrao)?.id || novaLista[0].id)
            : activeDashboardId;
        setActiveDashboardId(nextActiveId);
        await fetchDashboardDetalhes(nextActiveId, novaLista);
      }
    } catch (err) {
      console.error('Erro ao excluir dashboard:', err);
    } finally {
      setExcluindoDashboard(false);
    }
  };

  const kpis = [
    {
      title: 'Saldo do Mês',
      value: formatMoney(resumo.saldo_mes),
      desc: 'Resultado líquido do período',
      icon: Wallet,
      color: 'bg-indigo-600',
      textColor: resumo.saldo_mes >= 0 ? 'text-indigo-600' : 'text-rose-600',
      link: '/caixa',
      labelTest: 'kpi-saldo-mes',
    },
    {
      title: 'Entradas do Mês',
      value: formatMoney(resumo.entradas_mes),
      desc: 'Receitas e pagamentos recebidos',
      icon: TrendingUp,
      color: 'bg-emerald-600',
      textColor: 'text-emerald-600',
      link: '/caixa',
      labelTest: 'kpi-entradas-mes',
    },
    {
      title: 'Saídas do Mês',
      value: formatMoney(resumo.saidas_mes),
      desc: 'Custos operacionais e despesas',
      icon: TrendingDown,
      color: 'bg-rose-600',
      textColor: 'text-rose-600',
      link: '/caixa',
      labelTest: 'kpi-saidas-mes',
    },
    {
      title: 'A Receber Pendente',
      value: formatMoney(resumo.a_receber_pendente),
      desc: 'Cobranças emitidas a liquidar',
      icon: CreditCard,
      color: 'bg-amber-600',
      textColor: 'text-amber-600',
      link: '/cobrancas',
      labelTest: 'kpi-a-receber-pendente',
    },
    {
      title: 'Agendamentos Hoje',
      value: String(resumo.agendamentos_hoje),
      desc: 'Atendimentos para o dia atual',
      icon: Calendar,
      color: 'bg-sky-600',
      textColor: 'text-sky-700',
      link: '/agenda',
      labelTest: 'kpi-agendamentos-hoje',
    },
  ];

  const acoesRapidas = [
    {
      titulo: 'Novo Cliente',
      descricao: 'Cadastrar contato',
      icone: UserPlus,
      link: '/clientes?novo=true',
      cor: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40 dark:hover:bg-blue-900/50',
    },
    {
      titulo: 'Novo Orçamento',
      descricao: 'Emitir proposta',
      icone: FileText,
      link: '/orcamentos?novo=true',
      cor: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40 dark:hover:bg-indigo-900/50',
    },
    {
      titulo: 'Novo Agendamento',
      descricao: 'Marcar atendimento',
      icone: Calendar,
      link: '/agenda?novo=true',
      cor: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40 dark:hover:bg-purple-900/50',
    },
    {
      titulo: 'Nova Cobrança',
      descricao: 'Registrar pagamento',
      icone: CreditCard,
      link: '/cobrancas?novo=true',
      cor: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40 dark:hover:bg-emerald-900/50',
    },
    {
      titulo: 'Lançar Despesa',
      descricao: 'Saída no livro caixa',
      icone: ArrowUpRight,
      link: '/caixa?nova_saida=true',
      cor: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40 dark:hover:bg-rose-900/50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Seção de Ações Rápidas */}
      <div
        className="theme-card bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm transition-colors duration-200"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-main)',
        }}
      >
        <h2
          className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2"
          style={{ color: 'var(--text-main)' }}
        >
          <Activity className="w-4 h-4 text-indigo-600" />
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {acoesRapidas.map((acao) => {
            const Icon = acao.icone;
            return (
              <Link
                key={acao.titulo}
                to={acao.link}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-150 group ${acao.cor}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-white/80 dark:bg-white/10 shadow-xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                </div>
                <div>
                  <p className="font-bold text-xs leading-snug">{acao.titulo}</p>
                  <p className="text-[11px] opacity-80 mt-0.5">{acao.descricao}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.title}
              to={kpi.link}
              data-testid={kpi.labelTest}
              className="theme-card bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between group"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-main)',
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {kpi.title}
                  </p>
                  <p className={`text-2xl font-extrabold mt-2 ${kpi.textColor}`}>
                    {loading ? '—' : kpi.value}
                  </p>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl ${kpi.color} text-white flex items-center justify-center shadow-md flex-shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div
                className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <span className="truncate">{kpi.desc}</span>
                <span className="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5 ml-2 flex-shrink-0">
                  Ver <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Seção de Painéis Analíticos & Gráficos Dinâmicos */}
      <div className="space-y-4">
        {/* Barra de Abas e Ações do Painel */}
        <div
          className="theme-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:px-5 sm:py-3.5 rounded-2xl border border-gray-200/80 shadow-sm transition-colors duration-200"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
        >
          {/* Abas */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl">
              {dashboards.map((dash) => {
                const isActive = dash.id === activeDashboardId;
                const podeArrastar = dashboards.length > 1;
                return (
                  <button
                    key={dash.id}
                    data-testid={`tab-dashboard-${dash.id}`}
                    type="button"
                    draggable={podeArrastar}
                    onDragStart={(e) => handleDragStartTab(e, dash)}
                    onDragEnd={handleDragEndTab}
                    onClick={() => handleSelectDashboard(dash.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap select-none ${
                      podeArrastar ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${
                      isActive
                        ? 'bg-white text-indigo-700 shadow-xs border border-gray-200/70'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                    }`}
                    title={podeArrastar ? 'Segure e arraste até a lixeira para excluir este painel' : undefined}
                  >
                    <span>{dash.nome}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setModalNovoDashboardAberto(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-indigo-600 hover:bg-white/80 transition flex items-center gap-1 whitespace-nowrap"
                title="Criar novo painel"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Painel</span>
              </button>
            </div>
          </div>

          {/* Ações da Aba Ativa */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {activeDashboard?.widgets && activeDashboard.widgets.length > 0 && (
              <button
                type="button"
                data-testid="btn-restaurar-layout"
                onClick={handleRestaurarLayoutPadrao}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-indigo-600 text-xs font-semibold shadow-xs transition"
                title="Restaurar posições e tamanhos originais dos gráficos"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restaurar Layout</span>
                <span className="sm:hidden">Restaurar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setModalNovoWidgetAberto(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Adicionar Gráfico</span>
            </button>
          </div>
        </div>

        {/* Grid de Widgets do Painel Ativo */}
        {loadingWidgets ? (
          <div
            className="theme-card p-12 bg-white rounded-2xl border border-gray-200/80 text-center transition-colors duration-200"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)',
            }}
          >
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-500" style={{ color: 'var(--text-secondary)' }}>Atualizando gráficos...</p>
          </div>
        ) : !activeDashboard?.widgets || activeDashboard.widgets.length === 0 ? (
          <div
            className="theme-card bg-white rounded-2xl p-8 border border-gray-200/80 text-center transition-colors duration-200"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)',
            }}
          >
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-800" style={{ color: 'var(--text-main)' }}>
              Nenhum gráfico cadastrado neste painel
            </p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
              Adicione gráficos e indicadores customizados para acompanhar o desempenho do seu MEI.
            </p>
            <button
              type="button"
              onClick={() => setModalNovoWidgetAberto(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Adicionar Gráfico
            </button>
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: layouts, md: layouts, sm: layouts, xs: layouts, xxs: layouts }}
            breakpoints={{ lg: 1024, md: 768, sm: 640, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={110}
            draggableHandle=".widget-drag-handle"
            isResizable={!isMobile}
            isDraggable={true}
            compactType="vertical"
            onDragStop={handleDragOrResizeStop}
            onResizeStop={handleDragOrResizeStop}
          >
            {activeDashboard.widgets.map((widget) => (
              <div key={String(widget.id)} className="h-full relative">
                <DynamicWidgetCard
                  widget={widget}
                  isMobile={isMobile}
                  onToggleWidth={handleToggleWidth}
                  onChangePeriod={handleChangePeriod}
                  onDelete={handleDeleteWidget}
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}

      </div>

      {/* Seção Insights & Alertas Proativos da IA */}
      <div
        className="theme-card bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl shadow-md p-6 relative overflow-hidden mb-6"
      >
        <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-200 border border-white/10">
              <Activity className="w-5 h-5 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Insights & Alertas Proativos da IA</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  insightsIA.resumo_saude === 'CRITICO' ? 'bg-rose-500/80 text-white' :
                  insightsIA.resumo_saude === 'ATENCAO' ? 'bg-amber-500/80 text-white' : 'bg-emerald-500/80 text-white'
                }`}>
                  Saúde: {insightsIA.resumo_saude}
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Monitoramento inteligente de caixa, inadimplência, estoque e teto MEI em tempo real
              </p>
            </div>
          </div>
          <button
            onClick={fetchInsights}
            disabled={loadingInsights}
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-md transition border border-white/10"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loadingInsights ? 'animate-spin' : ''}`} />
            Atualizar Insights
          </button>
        </div>

        {loadingInsights ? (
          <div className="py-6 text-center text-indigo-200 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-300" />
            Analisando indicadores do negócio...
          </div>
        ) : !Array.isArray(insightsIA?.insights) || insightsIA.insights.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-white">Tudo em ordem por aqui!</p>
            <p className="text-[11px] text-indigo-200/70 mt-0.5">Nenhum alerta crítico ou pendência detectada no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
            {(insightsIA?.insights || []).map((item) => {
              const bgBadge = 
                item.severidade === 'critico' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                item.severidade === 'alerta' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                'bg-sky-500/20 text-sky-300 border-sky-500/30';
              
              return (
                <div key={item.id} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 flex flex-col justify-between hover:bg-white/15 transition">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${bgBadge}`}>
                        {item.severidade} • {item.categoria}
                      </span>
                      {item.valor_associado !== undefined && item.valor_associado !== null && (
                        <span className="text-xs font-bold text-white">
                          {typeof item.valor_associado === 'number' && item.valor_associado > 10 ? formatMoney(item.valor_associado) : item.valor_associado}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">{item.titulo}</h3>
                    <p className="text-xs text-indigo-100/90 leading-relaxed mb-3">{item.descricao}</p>
                  </div>
                  {item.acao_rota && (
                    <div className="pt-2 border-t border-white/10 flex justify-end">
                      <Link
                        to={item.acao_rota}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold transition shadow-sm"
                      >
                        <span>{item.acao_label || 'Ver Detalhes'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seção Próximos Atendimentos */}
      <div
        className="theme-card bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden transition-colors duration-200"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-main)',
        }}
      >
        <div
          className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Calendar className="w-5 h-5 text-indigo-600" />
              Próximos Atendimentos
            </h2>
            <p className="text-xs text-gray-500 mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Compromissos agendados na sua agenda de serviços
            </p>
          </div>

          <Link
            to="/agenda"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition"
          >
            <span>Ver Agenda Completa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-500">Carregando agendamentos...</p>
          </div>
        ) : resumo.proximos_agendamentos.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-gray-800">
              Nenhum agendamento futuro no momento
            </p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              Agende novos atendimentos com seus clientes para organizar sua rotina de trabalho.
            </p>
            <Link
              to="/agenda?novo=true"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              <Calendar className="w-3.5 h-3.5" />
              Agendar Atendimento
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {resumo.proximos_agendamentos.map((agendamento) => {
              const dataFormatada = formatDate(
                agendamento.data_hora || agendamento.data || agendamento.horario
              );
              const horaFormatada = formatTime(agendamento.data_hora) || agendamento.horario || '';
              const cliNome =
                agendamento.cliente_nome ||
                agendamento.cliente?.nome ||
                'Cliente não especificado';
              const servNome =
                agendamento.servico_nome ||
                agendamento.servico?.nome ||
                'Serviço geral';

              return (
                <div
                  key={agendamento.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50/70 transition"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex flex-col items-center justify-center flex-shrink-0 text-center font-bold text-xs border border-indigo-100">
                      <Clock className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{cliNome}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-gray-700">{servNome}</span>
                        <span>•</span>
                        <span>{dataFormatada}</span>
                        {horaFormatada && (
                          <>
                            <span>às</span>
                            <span className="font-semibold text-gray-700">{horaFormatada}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <StatusBadge status={agendamento.status || 'PENDENTE'} />
                    <Link
                      to="/agenda"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      title="Ver na Agenda"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Novo Dashboard */}
      <ModalNovoDashboard
        isOpen={modalNovoDashboardAberto}
        onClose={() => setModalNovoDashboardAberto(false)}
        onSalvar={handleCriarDashboard}
      />

      {/* Modal Novo Widget */}
      <ModalNovoWidget
        isOpen={modalNovoWidgetAberto}
        onClose={() => setModalNovoWidgetAberto(false)}
        onSalvar={handleAdicionarWidget}
        dashboardId={activeDashboardId}
        metricasDisponiveis={metricasCatalogo}
      />

      {/* Zona da Lixeira Flutuante para Exclusão de Dashboard via Drag & Drop */}
      {isDraggingTab && (
        <div
          data-testid="trash-dropzone-dashboard"
          onDragOver={(e) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            if (!isOverTrash) setIsOverTrash(true);
          }}
          onDragLeave={() => setIsOverTrash(false)}
          onDrop={(e) => {
            e.preventDefault();
            handleDropOnTrash();
          }}
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ease-out flex items-center gap-3.5 px-8 py-4 rounded-2xl shadow-2xl border-2 cursor-pointer select-none ${
            isOverTrash
              ? 'bg-rose-600 border-rose-700 text-white scale-110 shadow-rose-500/40 ring-4 ring-rose-200'
              : 'bg-white/95 backdrop-blur-md border-dashed border-rose-400 text-rose-600 hover:border-rose-500 scale-100'
          }`}
        >
          <Trash2 className={`w-6 h-6 transition-transform ${isOverTrash ? 'scale-125 animate-bounce' : ''}`} />
          <div className="text-left">
            <p className="text-xs font-bold uppercase tracking-wider">
              {isOverTrash ? 'Solte para excluir este painel' : 'Arraste aqui para excluir'}
            </p>
            <p className={`text-[11px] ${isOverTrash ? 'text-rose-100' : 'text-gray-500'}`}>
              {draggedDashboard ? `Painel: "${draggedDashboard.nome}"` : 'Jogar painel na lixeira'}
            </p>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Dashboard */}
      <Modal
        isOpen={modalExcluirDashboardAberto}
        onClose={() => !excluindoDashboard && setModalExcluirDashboardAberto(false)}
        title="Excluir Painel de Dashboard"
        footer={
          <>
            <button
              type="button"
              disabled={excluindoDashboard}
              onClick={() => setModalExcluirDashboardAberto(false)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              data-testid="confirmar-exclusao-dashboard"
              disabled={excluindoDashboard}
              onClick={handleConfirmarExclusaoDashboard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-xs font-bold text-white shadow-xs disabled:opacity-60 transition"
            >
              {excluindoDashboard && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Sim, Excluir Painel
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2">
            <Trash2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-gray-800 text-center">
            Tem certeza de que deseja excluir o painel{' '}
            <span className="font-bold text-rose-600">"{dashboardParaExcluir?.nome}"</span>?
          </p>
          <p className="text-xs text-gray-500 text-center">
            Todos os gráficos dinâmicos vinculados a este painel serão removidos permanentemente. Esta ação não pode ser desfeita.
          </p>
        </div>
      </Modal>
    </div>
  );
}

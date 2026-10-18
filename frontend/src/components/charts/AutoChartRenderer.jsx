import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3, AlertCircle, TrendingUp, DollarSign } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Formata um número para moeda brasileira (BRL).
 */
export const formatarMoeda = (valor) => {
  if (valor === undefined || valor === null || isNaN(Number(valor))) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(valor));
};

/**
 * Formata um número inteiro ou decimal.
 */
export const formatarNumero = (valor) => {
  if (valor === undefined || valor === null || isNaN(Number(valor))) return '0';
  return new Intl.NumberFormat('pt-BR').format(Number(valor));
};

export const STATUS_CORES_MAP = {
  PAGO: '#10b981',
  APROVADO: '#10b981',
  CONCLUIDO: '#10b981',
  RECEBIDO: '#10b981',
  ATIVO: '#10b981',
  PENDENTE: '#f59e0b',
  EM_ANALISE: '#f59e0b',
  AGENDADO: '#f59e0b',
  ENVIADO: '#3b82f6',
  CONFIRMADO: '#0284c7',
  ATRASADO: '#ef4444',
  VENCIDO: '#ef4444',
  CANCELADO: '#ef4444',
  RECUSADO: '#ef4444',
  INATIVO: '#64748b',
  RASCUNHO: '#94a3b8',
};

export function hexToHsl(hex) {
  if (typeof hex !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(hex.trim())) return [240, 70, 50];
  const num = parseInt(hex.trim().slice(1), 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function gerarPaletaTema(tokens) {
  const primary = tokens?.primary || '#6366f1';
  const accent = tokens?.accent || '#f59e0b';
  const [h, s, l] = hexToHsl(primary);
  const [ah, as, al] = hexToHsl(accent);

  return [
    primary,
    accent,
    hslToHex(h + 30, Math.min(s, 75), Math.max(45, Math.min(60, l))),
    hslToHex(h - 30, Math.min(s, 75), Math.max(45, Math.min(60, l))),
    hslToHex(ah + 25, Math.min(as, 80), Math.max(45, Math.min(60, al))),
    hslToHex(h + 60, Math.min(s, 65), 52),
    hslToHex(h - 60, Math.min(s, 65), 52),
    hslToHex((h + 180) % 360, Math.min(s, 70), 50),
    hslToHex(h, Math.min(s, 50), 38),
    hslToHex(ah, Math.min(as, 60), 65),
  ];
}

const PALETTE_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
];

/**
 * Tooltip personalizada com suporte a formatação BRL e layout clean.
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="theme-card bg-white p-3 rounded-lg shadow-md border border-gray-100 text-xs z-50"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-main)',
        }}
      >
        {label && (
          <p className="font-semibold text-gray-700 mb-1" style={{ color: 'var(--text-main)' }}>
            {label}
          </p>
        )}
        {payload.map((entry, index) => {
          const keyStr = String(entry.dataKey || entry.name || '').toLowerCase();
          const isCurrency =
            typeof entry.value === 'number' &&
            ['entradas', 'saidas', 'saldo', 'receita', 'valor', 'faturamento', 'cobrancas', 'agendamentos', 'total_projetado', 'previstas', 'previstos'].some((k) =>
              keyStr.includes(k)
            );
          const formattedVal = isCurrency
            ? formatarMoeda(entry.value)
            : formatarNumero(entry.value);

          return (
            <div key={`tooltip-${index}`} className="flex items-center gap-2 py-0.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: entry.color || entry.fill }}
              />
              <span className="text-gray-600 font-medium" style={{ color: 'var(--text-secondary)' }}>
                {entry.name}:
              </span>
              <span className="font-bold text-gray-900" style={{ color: 'var(--text-main)' }}>
                {formattedVal}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

/**
 * Renderizador Inteligente de Gráficos e KPIs do Dashboard MEI.
 * Suporta: 'bar', 'line', 'area', 'donut', 'pie', 'radial_gauge', 'kpi'
 */
export default function AutoChartRenderer({ type, data, config = {} }) {
  // 1. Verificação de dados vazios
  const isDataEmpty =
    !data ||
    (Array.isArray(data) && data.length === 0) ||
    (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0);

  if (isDataEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-48 sm:h-56 p-4 text-center text-gray-500 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
        <BarChart3 className="w-8 h-8 text-gray-300 mb-2" />
        <p className="text-sm font-medium text-gray-600">Nenhum dado disponível</p>
        <p className="text-xs text-gray-400 mt-1">Não foram encontrados registros para o período selecionado.</p>
      </div>
    );
  }

  const height = config.height || 260;

  // 2. Renderização de Radial Gauge (Termômetro MEI)
  if (type === 'radial_gauge') {
    const raw = Array.isArray(data) ? data[0] : data;
    if (!raw) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500">
          <p className="text-sm">Nenhum dado disponível</p>
        </div>
      );
    }

    const valor = Number(raw.valor ?? raw.faturamento_anual ?? raw.faturamento ?? 0);
    const limite = Number(raw.limite ?? raw.teto_anual ?? 81000);
    const percentual = Number(
      raw.percentual !== undefined
        ? raw.percentual
        : limite > 0
        ? ((valor / limite) * 100).toFixed(1)
        : 0
    );
    const saldoRestante = Number(
      raw.saldo_restante !== undefined ? raw.saldo_restante : Math.max(0, limite - valor)
    );

    // Cor dinâmica de acordo com a proximidade do teto MEI
    let statusCor = '#10b981'; // emerald
    let statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    let statusTexto = 'Margem Segura';

    if (percentual >= 90) {
      statusCor = '#ef4444'; // red
      statusBg = 'bg-red-50 text-red-700 border-red-200';
      statusTexto = 'Alerta de Desenquadramento';
    } else if (percentual >= 70) {
      statusCor = '#f59e0b'; // amber
      statusBg = 'bg-amber-50 text-amber-700 border-amber-200';
      statusTexto = 'Atenção ao Teto';
    }

    const gaugeChartData = [
      { name: 'Teto MEI', valor: limite, fill: '#f1f5f9' },
      { name: 'Faturado', valor: Math.min(valor, limite), fill: statusCor },
    ];

    return (
      <div className="flex flex-col items-center justify-center p-4 w-full">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="70%"
              outerRadius="100%"
              barSize={14}
              data={gaugeChartData}
              startAngle={210}
              endAngle={-30}
            >
              <RadialBar background dataKey="valor" cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Conteúdo central do medidor */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span
              className="text-2xl font-black text-gray-800 tracking-tight"
              style={{ color: 'var(--text-main)' }}
            >
              {percentual}%
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1 ${statusBg}`}>
              {statusTexto}
            </span>
          </div>
        </div>

        {/* Resumo financeiro de suporte */}
        <div
          className="grid grid-cols-2 gap-3 w-full max-w-sm mt-3 pt-3 border-t border-gray-100 text-center"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div
            className="bg-gray-50/80 p-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-surface-hover)' }}
          >
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Faturado</p>
            <p className="text-sm font-bold text-gray-800 mt-0.5" style={{ color: 'var(--text-main)' }}>{formatarMoeda(valor)}</p>
          </div>
          <div
            className="bg-gray-50/80 p-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-surface-hover)' }}
          >
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Saldo Restante</p>
            <p className="text-sm font-bold text-emerald-600 mt-0.5">{formatarMoeda(saldoRestante)}</p>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-2" style={{ color: 'var(--text-muted)' }}>Teto Anual: {formatarMoeda(limite)}</p>
      </div>
    );
  }

  // 3. Renderização de KPI Card
  if (type === 'kpi') {
    const raw = Array.isArray(data) ? data[0] : data;
    if (!raw) {
      return (
        <div className="flex flex-col items-center justify-center h-32 text-center text-gray-500">
          <p className="text-sm">Nenhum dado disponível</p>
        </div>
      );
    }

    const valor = Number(raw.faturamento_anual ?? raw.valor ?? raw.total ?? raw.receita ?? 0);
    const limite = raw.teto_anual ?? raw.limite ?? null;
    const percentual = raw.percentual !== undefined ? Number(raw.percentual) : null;
    const titulo = config.titulo || raw.nome || raw.rotulo || 'Métrica Principal';

    return (
      <div
        className="theme-card p-4 bg-gradient-to-br from-white to-gray-50/50 rounded-xl border border-gray-100 flex flex-col justify-between h-full"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-main)',
        }}
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{titulo}</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2" style={{ color: 'var(--text-main)' }}>
            {formatarMoeda(valor)}
          </div>
        </div>

        <div
          className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        >
          {percentual !== null && (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {percentual}%
            </span>
          )}
          {limite !== null && (
            <span className="text-gray-500 font-medium">Teto: {formatarMoeda(limite)}</span>
          )}
        </div>
      </div>
    );
  }

  // Prepara dados de série para gráficos cartesianos (bar, line, area)
  const arrayData = Array.isArray(data) ? data : [data];
  if (arrayData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500">
        <p className="text-sm">Nenhum dado disponível</p>
      </div>
    );
  }

  const firstItem = arrayData[0] || {};
  const xKey =
    config.xKey ||
    (firstItem.periodo
      ? 'periodo'
      : firstItem.categoria
      ? 'categoria'
      : firstItem.nome
      ? 'nome'
      : firstItem.status
      ? 'status'
      : Object.keys(firstItem)[0]);

  const themeContext = useTheme ? useTheme() : null;
  const temaTokens = themeContext?.temaAtual?.tokens || themeContext?.temaAtual?.cores;
  const primaryColor = temaTokens?.primary || '#6366f1';
  const accentColor = temaTokens?.accent || '#f59e0b';
  const themePalette = gerarPaletaTema(temaTokens);

  // 4. Gráfico de Barras ('bar')
  if (type === 'bar') {
    const hasEntradasSaidas = 'entradas' in firstItem && 'saidas' in firstItem;
    const hasProjecao = 'cobrancas_previstas' in firstItem || 'total_projetado' in firstItem;
    const hasReceita = 'receita' in firstItem;
    const hasValor = 'valor' in firstItem;
    const hasTotal = 'total' in firstItem;

    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
          <BarChart data={arrayData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : v)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

            {hasEntradasSaidas ? (
              <>
                <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </>
            ) : hasProjecao ? (
              <>
                <Bar dataKey="cobrancas_previstas" name="Cobranças Previstas" fill={primaryColor} radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="agendamentos_previstos" name="Agendamentos Previstos" fill={accentColor} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </>
            ) : hasReceita ? (
              <Bar dataKey="receita" name="Receita" fill={primaryColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
            ) : hasValor ? (
              <Bar dataKey="valor" name="Valor" fill={primaryColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
            ) : hasTotal ? (
              <Bar dataKey="total" name="Total" fill={primaryColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
            ) : (
              <Bar dataKey={Object.keys(firstItem)[1] || xKey} fill={primaryColor} radius={[4, 4, 0, 0]} maxBarSize={44} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 5. Gráfico de Linha ('line')
  if (type === 'line') {
    const hasEntradasSaidas = 'entradas' in firstItem && 'saidas' in firstItem;
    const hasProjecao = 'total_projetado' in firstItem || 'cobrancas_previstas' in firstItem;
    const hasNovosClientes = 'novos_clientes' in firstItem;
    const hasTotal = 'total' in firstItem;
    const hasReceita = 'receita' in firstItem;
    const hasValor = 'valor' in firstItem;

    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
          <LineChart data={arrayData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

            {hasEntradasSaidas ? (
              <>
                <Line
                  type="monotone"
                  dataKey="entradas"
                  name="Entradas"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="saidas"
                  name="Saídas"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </>
            ) : hasProjecao ? (
              <>
                <Line
                  type="monotone"
                  dataKey="total_projetado"
                  name="Total Projetado"
                  stroke={primaryColor}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                {'cobrancas_previstas' in firstItem && (
                  <Line
                    type="monotone"
                    dataKey="cobrancas_previstas"
                    name="Cobranças Previstas"
                    stroke={accentColor}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                )}
                {'agendamentos_previstos' in firstItem && (
                  <Line
                    type="monotone"
                    dataKey="agendamentos_previstos"
                    name="Agendamentos"
                    stroke={themePalette[2] || '#0ea5e9'}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                )}
              </>
            ) : hasNovosClientes ? (
              <Line
                type="monotone"
                dataKey="novos_clientes"
                name="Novos Clientes"
                stroke={primaryColor}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ) : hasTotal ? (
              <Line
                type="monotone"
                dataKey="total"
                name="Total"
                stroke={primaryColor}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ) : hasReceita ? (
              <Line
                type="monotone"
                dataKey="receita"
                name="Receita"
                stroke={primaryColor}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ) : hasValor ? (
              <Line
                type="monotone"
                dataKey="valor"
                name="Valor"
                stroke={primaryColor}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ) : (
              <Line
                type="monotone"
                dataKey={Object.keys(firstItem)[1] || xKey}
                stroke={primaryColor}
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 6. Gráfico de Área ('area')
  if (type === 'area') {
    const hasEntradasSaidas = 'entradas' in firstItem && 'saidas' in firstItem;
    const hasProjecao = 'total_projetado' in firstItem || 'cobrancas_previstas' in firstItem;
    const hasReceita = 'receita' in firstItem;
    const hasValor = 'valor' in firstItem;

    return (
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
          <AreaChart data={arrayData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradienteEntradas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradienteSaidas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradienteThemePrimary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

            {hasEntradasSaidas ? (
              <>
                <Area
                  type="monotone"
                  dataKey="entradas"
                  name="Entradas"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gradienteEntradas)"
                />
                <Area
                  type="monotone"
                  dataKey="saidas"
                  name="Saídas"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gradienteSaidas)"
                />
              </>
            ) : hasProjecao ? (
              <Area
                type="monotone"
                dataKey="total_projetado"
                name="Total Projetado"
                stroke={primaryColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gradienteThemePrimary)"
              />
            ) : hasReceita ? (
              <Area
                type="monotone"
                dataKey="receita"
                name="Receita"
                stroke={primaryColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gradienteThemePrimary)"
              />
            ) : hasValor ? (
              <Area
                type="monotone"
                dataKey="valor"
                name="Valor"
                stroke={primaryColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gradienteThemePrimary)"
              />
            ) : (
              <Area
                type="monotone"
                dataKey={Object.keys(firstItem)[1] || xKey}
                stroke={primaryColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gradienteThemePrimary)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 7. Gráfico de Rosca ('donut') ou Pizza ('pie')
  if (type === 'donut' || type === 'pie') {
    const isDonut = type === 'donut';
    const nameKey =
      firstItem.categoria ? 'categoria' : firstItem.nome ? 'nome' : firstItem.status ? 'status' : 'name';
    const dataKey =
      firstItem.valor ? 'valor' : firstItem.receita ? 'receita' : firstItem.total ? 'total' : 'quantidade';

    const pieData = arrayData.map((entry, index) => {
      const statusKey = String(entry.status || entry.nome || entry.categoria || '').toUpperCase().trim();
      const fillCor = entry.fill || STATUS_CORES_MAP[statusKey] || themePalette[index % themePalette.length];
      return { ...entry, fill: fillCor };
    });

    return (
      <div className="w-full flex items-center justify-center" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Pie
              data={pieData}
              nameKey={nameKey}
              dataKey={dataKey}
              cx="50%"
              cy="50%"
              innerRadius={isDonut ? 52 : 0}
              outerRadius={80}
              paddingAngle={isDonut ? 3 : 1}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 8. Fallback para tipos desconhecidos
  return (
    <div className="flex flex-col items-center justify-center h-48 p-4 text-center text-amber-600 bg-amber-50/50 rounded-xl border border-amber-200">
      <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
      <p className="text-sm font-semibold">Tipo de gráfico não suportado</p>
      <p className="text-xs text-amber-500 mt-1">O tipo "{type}" não é reconhecido pelo visualizador.</p>
    </div>
  );
}

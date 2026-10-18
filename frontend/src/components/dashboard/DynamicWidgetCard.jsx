import React, { useMemo } from 'react';
import { Maximize2, Minimize2, Trash2, Calendar, GripVertical } from 'lucide-react';
import AutoChartRenderer from '../charts/AutoChartRenderer';
import { isMobileEnvironment } from '../../utils/device';

/**
 * Cartão de Widget Gráfico Dinâmico para o Dashboard do MEI.
 * Suporta arrastar e soltar (drag & drop), redimensionamento interativo pelos cantos,
 * alternância de colunas, troca de período analítico e remoção.
 */
const DynamicWidgetCard = React.forwardRef(function DynamicWidgetCard({
  widget,
  onToggleWidth,
  onChangePeriod,
  onDelete,
  isMobile: isMobileProp,
  style,
  className = '',
  children,
  ...rest
}, ref) {
  if (!widget) return null;

  const isMobile = isMobileProp !== undefined ? isMobileProp : isMobileEnvironment();

  const isWide = useMemo(() => {
    const cfg = widget.configuracoes || {};
    if (isMobile) {
      if (cfg.mobile?.largura !== undefined) {
        return Number(cfg.mobile.largura) === 2 || cfg.mobile.largura === 'inteira';
      }
      if (cfg.mobile?.w !== undefined) {
        return Number(cfg.mobile.w) >= 9;
      }
      if (cfg.w !== undefined) {
        return Number(cfg.w) >= 9;
      }
      return Number(widget.largura) === 2;
    } else {
      if (cfg.web?.largura !== undefined) {
        return Number(cfg.web.largura) === 2 || cfg.web.largura === 'inteira';
      }
      if (cfg.web?.w !== undefined) {
        return Number(cfg.web.w) >= 9;
      }
      if (cfg.w !== undefined) {
        return Number(cfg.w) >= 9;
      }
      return Number(widget.largura) === 2;
    }
  }, [widget, isMobile]);

  const isLimiteMei = widget.metrica === 'limite_mei';

  return (
    <div
      ref={ref}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-main)',
        ...style,
      }}
      data-testid={`widget-card-${widget.id}`}
      className={`theme-card bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex flex-col justify-between transition-all duration-200 hover:shadow-md h-full relative overflow-hidden group select-none ${className}`}
      {...rest}
    >
      {/* Cabeçalho do Card com Alça de Arraste */}
      <div
        className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100 flex-wrap sm:flex-nowrap"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Alça de Arraste */}
          <div
            className="widget-drag-handle cursor-grab active:cursor-grabbing p-1 -ml-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/70 transition flex-shrink-0"
            title="Clique e arraste para reposicionar o gráfico"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          <h3
            className="font-bold text-sm text-gray-900 truncate"
            style={{ color: 'var(--text-main)' }}
            title={widget.titulo}
          >
            {widget.titulo}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Seletor Rápido de Período */}
          {isLimiteMei ? (
            <span
              className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg border border-gray-200"
              style={{
                backgroundColor: 'var(--bg-surface-hover)',
                color: 'var(--text-secondary)',
                borderColor: 'var(--border-color)',
              }}
            >
              Ano Atual
            </span>
          ) : (
            <div className="relative inline-flex items-center">
              <select
                value={widget.periodo || 'ultimos_6_meses'}
                onChange={(e) => onChangePeriod && onChangePeriod(widget, e.target.value)}
                className="text-xs font-medium bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none transition"
                style={{
                  backgroundColor: 'var(--bg-surface-hover)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-main)',
                }}
                aria-label="Selecionar período"
              >
                <option value="mes_atual">Mês Atual</option>
                <option value="ultimos_3_meses">Últimos 3 Meses</option>
                <option value="ultimos_6_meses">Últimos 6 Meses</option>
                <option value="ultimos_12_meses">Últimos 12 Meses</option>
                <option value="ano_atual">Ano Atual</option>
                <option value="historico_total">Histórico Total</option>
                <option value="proximos_30_dias">Próximos 30 Dias</option>
                <option value="proximos_60_dias">Próximos 60 Dias</option>
                <option value="proximos_3_meses">Próximos 3 Meses</option>
                <option value="proximos_6_meses">Próximos 6 Meses</option>
                <option value="proximos_12_meses">Próximos 12 Meses</option>
                <option value="proximos_1_ano">Próximo 1 Ano</option>
              </select>
              <Calendar className="w-3 h-3 text-gray-400 absolute right-1.5 pointer-events-none" />
            </div>
          )}

          {/* Botão de Redimensionamento Rápido */}
          {onToggleWidth && (
            <button
              type="button"
              data-testid={`widget-resize-btn-${widget.id}`}
              onClick={() => onToggleWidth(widget)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
              title={isWide ? 'Reduzir para metade da tela' : 'Expandir para largura total'}
              aria-label={isWide ? 'Reduzir largura' : 'Expandir largura'}
            >
              {isWide ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Botão de Excluir Widget */}
          {onDelete && (
            <button
              type="button"
              data-testid={`widget-delete-btn-${widget.id}`}
              onClick={() => onDelete(widget)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Excluir widget"
              aria-label="Excluir widget"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo Gráfico com AutoChartRenderer */}
      <div className="pt-2 w-full flex-1 min-h-0 flex flex-col justify-center">
        <AutoChartRenderer
          type={widget.tipo_grafico}
          data={widget.dados}
          config={isMobile ? (widget.configuracoes?.mobile || widget.configuracoes || {}) : (widget.configuracoes?.web || widget.configuracoes || {})}
        />
      </div>

      {/* Puxador de redimensionamento e elementos injetados pelo react-grid-layout */}
      {children}
    </div>
  );
});

export default DynamicWidgetCard;

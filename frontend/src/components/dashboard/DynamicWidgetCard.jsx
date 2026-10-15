import React from 'react';
import { Maximize2, Minimize2, Trash2, Calendar } from 'lucide-react';
import AutoChartRenderer from '../charts/AutoChartRenderer';

/**
 * Cartão de Widget Gráfico Dinâmico para o Dashboard do MEI.
 * Suporta redimensionamento entre 1 e 2 colunas, troca de período analítico e remoção.
 */
export default function DynamicWidgetCard({
  widget,
  onToggleWidth,
  onChangePeriod,
  onDelete,
}) {
  if (!widget) return null;

  const isWide = Number(widget.largura) === 2;
  const isLimiteMei = widget.metrica === 'limite_mei';

  return (
    <div
      data-testid={`widget-card-${widget.id}`}
      className={`bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
        isWide ? 'col-span-1 lg:col-span-2' : 'col-span-1'
      }`}
    >
      {/* Cabeçalho do Card */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 min-w-0">
          <h3
            className="font-bold text-sm text-gray-900 truncate"
            title={widget.titulo}
          >
            {widget.titulo}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Seletor Rápido de Período */}
          {isLimiteMei ? (
            <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg border border-gray-200">
              Ano Atual
            </span>
          ) : (
            <div className="relative inline-flex items-center">
              <select
                value={widget.periodo || 'ultimos_6_meses'}
                onChange={(e) => onChangePeriod && onChangePeriod(widget, e.target.value)}
                className="text-xs font-medium bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none transition"
                aria-label="Selecionar período"
              >
                <option value="mes_atual">Mês Atual</option>
                <option value="ultimos_3_meses">Últimos 3 Meses</option>
                <option value="ultimos_6_meses">Últimos 6 Meses</option>
                <option value="ano_atual">Ano Atual</option>
                <option value="historico_total">Histórico Total</option>
              </select>
              <Calendar className="w-3 h-3 text-gray-400 absolute right-1.5 pointer-events-none" />
            </div>
          )}

          {/* Botão de Redimensionamento */}
          {onToggleWidth && (
            <button
              type="button"
              data-testid={`widget-resize-btn-${widget.id}`}
              onClick={() => onToggleWidth(widget)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
              title={isWide ? 'Reduzir para 1 coluna' : 'Expandir para 2 colunas'}
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
      <div className="pt-3 w-full flex-1 flex flex-col justify-center">
        <AutoChartRenderer
          type={widget.tipo_grafico}
          data={widget.dados}
          config={widget.configuracoes || {}}
        />
      </div>
    </div>
  );
}

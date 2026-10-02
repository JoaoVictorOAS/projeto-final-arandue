import React from 'react';
import { Wallet, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react';

export default function Caixa() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-indigo-600" />
            Livro Caixa & Finanças
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Controle entradas, saídas operacionais e apure o saldo do seu negócio MEI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Nova Entrada
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
          >
            <ArrowUpRight className="w-4 h-4" />
            Nova Saída
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total de Entradas</span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">R$ 0,00</p>
          <div className="flex items-center gap-1 text-xs text-emerald-600 mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Recebimentos e vendas</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total de Saídas</span>
          <p className="text-2xl font-bold text-rose-600 mt-2">R$ 0,00</p>
          <div className="flex items-center gap-1 text-xs text-rose-600 mt-2">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Custos, DAS e despesas</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saldo Líquido</span>
          <p className="text-2xl font-bold text-indigo-600 mt-2">R$ 0,00</p>
          <p className="text-xs text-gray-500 mt-2">Posição consolidada do período</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Nenhuma movimentação financeira</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
          Ao marcar cobranças como pagas, os valores entram automaticamente aqui. Você também pode registrar despesas operacionais manuais.
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Registrar Primeira Movimentação
        </button>
      </div>
    </div>
  );
}

import React from 'react';
import { CreditCard, Plus, Search, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export default function Cobrancas() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-indigo-600" />
            Controle de Cobranças
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Acompanhe pagamentos pendentes, vencidos e pagos com baixa automática no fluxo de caixa.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Nova Cobrança
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Pendentes</p>
            <p className="text-lg font-bold text-gray-900">R$ 0,00</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Vencidas</p>
            <p className="text-lg font-bold text-gray-900">R$ 0,00</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Recebidas</p>
            <p className="text-lg font-bold text-gray-900">R$ 0,00</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Nenhuma cobrança registrada</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
          Gere cobranças a partir de orçamentos aprovados ou cadastre cobranças avulsas para seus clientes.
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Lançar Primeira Cobrança
        </button>
      </div>
    </div>
  );
}

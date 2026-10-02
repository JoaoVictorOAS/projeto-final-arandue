import React from 'react';
import { Briefcase, Plus, Search } from 'lucide-react';

export default function Servicos() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-indigo-600" />
            Catálogo de Serviços
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Defina serviços, valores padrão e descrições para agilizar orçamentos.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Novo Serviço
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar serviço por nome..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Catálogo Vazio</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
          Cadastre seus serviços e valores de referência para incluir facilmente nos orçamentos e agendamentos.
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Primeiro Serviço
        </button>
      </div>
    </div>
  );
}

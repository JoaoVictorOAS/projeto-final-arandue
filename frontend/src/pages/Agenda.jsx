import React from 'react';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Agenda() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-indigo-600" />
            Agenda de Atendimentos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Controle horários, clientes e serviços agendados com validação contra choque de horários.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-800">Semana Atual</span>
          <button
            type="button"
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
            aria-label="Próxima semana"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full">
            Visão Semanal
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CalendarIcon className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Nenhum compromisso agendado</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
          Evite conflitos de horário cadastrando atendimentos para seus clientes diretamente na agenda.
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Agendar Primeiro Atendimento
        </button>
      </div>
    </div>
  );
}

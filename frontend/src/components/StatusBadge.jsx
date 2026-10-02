import React from 'react';

/**
 * Status config for Budgets (Orçamentos) and Appointments (Agendamentos)
 */
const STATUS_CONFIG = {
  // Orçamentos
  RASCUNHO: {
    label: 'Rascunho',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  ENVIADO: {
    label: 'Enviado',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  APROVADO: {
    label: 'Aprovado',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  RECUSADO: {
    label: 'Recusado',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },

  // Agendamentos
  PENDENTE: {
    label: 'Pendente',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  CONFIRMADO: {
    label: 'Confirmado',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    dotClass: 'bg-sky-500',
  },
  CONCLUIDO: {
    label: 'Concluído',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  // Cobranças & Financeiro
  PAGO: {
    label: 'Pago',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  ATRASADO: {
    label: 'Atrasado',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
  VENCIDO: {
    label: 'Atrasado',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
  ENTRADA: {
    label: 'Entrada',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  SAIDA: {
    label: 'Saída',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
};

/**
 * Flexible semantic StatusBadge component
 *
 * @param {string} status - e.g. 'RASCUNHO' | 'ENVIADO' | 'APROVADO' | 'RECUSADO' | 'PENDENTE' | 'CONFIRMADO' | 'CONCLUIDO' | 'CANCELADO'
 * @param {boolean} showDot - Whether to show the colored indicator dot (default: true)
 * @param {string} className - Additional CSS classes
 */
export default function StatusBadge({ status, showDot = true, className = '' }) {
  const normalizedKey = (status || '').toUpperCase().trim();
  const config = STATUS_CONFIG[normalizedKey] || {
    label: status || 'Indefinido',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    dotClass: 'bg-gray-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeClass} ${className}`}
      data-testid="status-badge"
      data-status={normalizedKey}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`}
          aria-hidden="true"
        />
      )}
      {config.label}
    </span>
  );
}

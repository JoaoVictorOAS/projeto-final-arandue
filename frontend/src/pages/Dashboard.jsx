import React from 'react';
import {
  Users,
  Briefcase,
  Calendar,
  FileText,
  CreditCard,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { usuario } = useAuth();

  const cards = [
    {
      title: 'Clientes Cadastrados',
      value: '—',
      desc: 'Base ativa de contatos',
      icon: Users,
      color: 'bg-blue-500',
      link: '/clientes',
    },
    {
      title: 'Serviços no Catálogo',
      value: '—',
      desc: 'Tabela de preços cadastrada',
      icon: Briefcase,
      color: 'bg-indigo-500',
      link: '/servicos',
    },
    {
      title: 'Agendamentos da Semana',
      value: '—',
      desc: 'Compromissos agendados',
      icon: Calendar,
      color: 'bg-purple-500',
      link: '/agenda',
    },
    {
      title: 'Orçamentos Emitidos',
      value: '—',
      desc: 'Propostas enviadas e pendentes',
      icon: FileText,
      color: 'bg-amber-500',
      link: '/orcamentos',
    },
    {
      title: 'Cobranças Pendentes',
      value: '—',
      desc: 'Aguardando pagamento / Pix',
      icon: CreditCard,
      color: 'bg-rose-500',
      link: '/cobrancas',
    },
    {
      title: 'Saldo do Caixa',
      value: 'R$ 0,00',
      desc: 'Entradas menos saídas do mês',
      icon: Wallet,
      color: 'bg-emerald-500',
      link: '/caixa',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-indigo-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm inline-block mb-3">
            Visão Geral do Negócio
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Bem-vindo(a), {usuario?.nome || 'Empreendedor'}!
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base mt-1 max-w-xl">
            Acompanhe o desempenho do seu MEI: clientes, catálogo, compromissos e fluxo de caixa centralizados em um só lugar.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/orcamentos"
            className="px-4 py-2.5 rounded-xl bg-white text-indigo-700 text-sm font-semibold hover:bg-indigo-50 transition shadow-sm inline-flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Novo Orçamento
          </Link>
          <Link
            to="/agenda"
            className="px-4 py-2.5 rounded-xl bg-indigo-500/40 text-white text-sm font-semibold hover:bg-indigo-500/60 transition backdrop-blur-sm inline-flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Agendar Atendimento
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.link}
              className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl ${card.color} text-white flex items-center justify-center shadow-md`}
                >
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>{card.desc}</span>
                <span className="text-indigo-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 font-medium">
                  Acessar <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Activity / Notice Box */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Próximos Passos
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Comece cadastrando seus primeiros clientes e seus serviços para emitir orçamentos e controlar cobranças automaticamente.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-800">1. Cadastre Clientes</p>
              <p className="text-xs text-gray-500 mt-0.5">Registre nomes, contatos e endereços.</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-800">2. Adicione Serviços</p>
              <p className="text-xs text-gray-500 mt-0.5">Defina preços e descrições dos serviços.</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-800">3. Emita Orçamentos</p>
              <p className="text-xs text-gray-500 mt-0.5">Gere propostas com cálculo seguro no backend.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

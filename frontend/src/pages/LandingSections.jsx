import React from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  Boxes,
  FileText,
  BarChart3,
  CalendarClock,
  Users,
  Palette,
  ShieldCheck,
  Lock,
  Bot,
  BookOpen,
  Plug,
  BellRing,
  UserCheck,
} from 'lucide-react';
import AdaptiveParagraph from '../components/AdaptiveParagraph';
import {
  WhatsappPhoneDoodle,
  SketchArrow,
  SketchUnderline,
  SketchSparkle,
  SketchStickerBadge,
} from '../components/SketchDoodles';

const cardStyle = {
  backgroundColor: 'var(--bg-surface, #ffffff)',
  color: 'var(--text-main, #18181b)',
};
const mutedStyle = { color: 'var(--text-secondary, #52525b)' };
const pPropsClass = 'text-sm mt-2';

function SectionTitle({ kicker, title, children }) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-16">
      <span
        className="font-hand text-2xl font-bold block -rotate-1"
        style={{ color: 'var(--color-primary)' }}
      >
        {kicker}
      </span>
      <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight mt-1">
        {title}
      </h2>
      {children && (
        <AdaptiveParagraph
          className="text-sm sm:text-base mt-2 max-w-xl mx-auto"
          style={mutedStyle}
          title={title}
        >
          {children}
        </AdaptiveParagraph>
      )}
      <div className="flex justify-center mt-2">
        <SketchUnderline className="w-48 h-4" style={{ color: 'var(--color-accent)' }} />
      </div>
    </div>
  );
}

const MODULOS = [
  {
    icon: Wallet,
    titulo: 'Fluxo de Caixa',
    selo: 'Tempo real',
    texto:
      'Entradas, saídas, categorias e saldo atualizados a cada lançamento — manual, por orçamento pago ou por cobrança PIX.',
    itens: ['Lucro líquido do mês', 'Categorias personalizadas', 'Baixa automática de cobranças'],
  },
  {
    icon: Boxes,
    titulo: 'Controle de Estoque',
    selo: 'Sem furos',
    texto:
      'Cadastre produtos, acompanhe entradas e saídas e veja o que está acabando antes de perder uma venda.',
    itens: ['Movimentações rastreadas', 'Alerta de estoque baixo', 'Baixa vinculada à venda'],
  },
  {
    icon: FileText,
    titulo: 'Notas NF-e e NFS-e',
    selo: 'Fiscal',
    texto:
      'Configure seu MEI, escolha o estado e emita notas com transmissão à SEFAZ em ambiente de homologação usando certificado A1.',
    itens: ['Multi-estado (SEFAZ)', 'Certificado digital A1', 'Homologação antes de valer'],
  },
  {
    icon: BarChart3,
    titulo: 'Dashboards Dinâmicos',
    selo: 'Visual',
    texto:
      'Gráficos que se adaptam ao seu tema e ao seu negócio: faturamento, despesas, clientes e agenda num só olhar.',
    itens: ['Cores harmonizadas com o tema', 'Resumo mensal', 'Indicadores do MEI'],
  },
  {
    icon: CalendarClock,
    titulo: 'Agenda de Serviços',
    selo: 'Organizada',
    texto:
      'Agendamentos ligados ao cliente e ao orçamento, com respeito ao seu expediente e à antecedência que você definir.',
    itens: ['Horários livres validados', 'Vinculado ao cliente', 'Confirmação pelo atendente'],
  },
  {
    icon: Users,
    titulo: 'Clientes & Histórico',
    selo: 'CRM leve',
    texto:
      'Todos os contatos, orçamentos, cobranças e agendamentos de cada cliente em um único lugar.',
    itens: ['Cadastro rápido', 'Histórico completo', 'Dados só seus'],
  },
  {
    icon: Palette,
    titulo: 'Temas Dinâmicos',
    selo: 'Sua cara',
    texto:
      'Escolha entre temas prontos (Esmeralda, Oceano, Âmbar, Noturno) ou peça ao assistente para criar um tema personalizado.',
    itens: ['Modo claro e noturno', 'Tema gerado por IA', 'Aplica em todo o app'],
  },
  {
    icon: ShieldCheck,
    titulo: 'Bússola Fiscal (RAG)',
    selo: 'Oficial',
    texto:
      'Dúvidas sobre DAS, limite anual e obrigações? A resposta vem da cartilha oficial do MEI, citando a página.',
    itens: ['Fonte oficial', 'Citação de página', 'Sem achismo da IA'],
  },
];

export function ModulosSection() {
  return (
    <section id="modulos" className="mt-32 relative">
      <SectionTitle
        kicker="↓ Tudo num lugar só"
        title="O SISTEMA COMPLETO DO SEU NEGÓCIO"
      >
        Cada módulo conversa com os outros: um orçamento aprovado vira agendamento, cobrança, entrada
        no caixa e baixa de estoque.
      </SectionTitle>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
        {MODULOS.map(({ icon: Icon, titulo, selo, texto, itens }, i) => (
          <div
            key={titulo}
            className={`sketch-card p-6 relative transform ${
              i % 2 === 0 ? '-rotate-1' : 'rotate-1'
            } hover:rotate-0 transition-transform`}
            style={cardStyle}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl border-2"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  color: 'var(--color-primary)',
                }}
              >
                <Icon className="w-6 h-6" />
              </span>
              <span className="badge-theme-subtle text-xs font-bold px-2 py-1 rounded-full">
                {selo}
              </span>
            </div>
            <h3 className="font-display font-extrabold text-xl leading-tight mt-3">{titulo}</h3>
            <p className={pPropsClass} style={mutedStyle}>
              {texto}
            </p>
            <ul className="mt-3 space-y-1 text-sm font-semibold">
              {itens.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span style={{ color: 'var(--color-accent)' }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

const PASSOS = [
  { n: 1, titulo: 'Orçamento', texto: 'Monte a proposta com itens e desconto.' },
  { n: 2, titulo: 'Agendamento', texto: 'Cliente aprova e o serviço entra na agenda.' },
  { n: 3, titulo: 'Cobrança PIX', texto: 'Link/QR de pagamento enviado ao cliente.' },
  { n: 4, titulo: 'Caixa', texto: 'Pagamento confirmado vira entrada no livro caixa.' },
];

export function FluxoIntegradoSection() {
  return (
    <section id="fluxo" className="mt-32">
      <SectionTitle kicker="↓ Do pedido ao dinheiro no bolso" title="UM FLUXO, ZERO RETRABALHO">
        Você não digita a mesma informação duas vezes. O Aranduê encadeia cada etapa da venda por você.
      </SectionTitle>

      <div className="flex flex-col lg:flex-row items-stretch justify-center gap-4">
        {PASSOS.map((p, i) => (
          <React.Fragment key={p.n}>
            <div
              className={`sketch-card p-6 flex-1 relative ${i % 2 ? 'rotate-1' : '-rotate-1'}`}
              style={cardStyle}
            >
              <span
                className="absolute -top-4 -left-3 w-10 h-10 rounded-full border-2 flex items-center justify-center font-display font-extrabold"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--btn-primary-text, #ffffff)',
                  borderColor: 'var(--border-color)',
                }}
              >
                {p.n}
              </span>
              <h3 className="font-display font-extrabold text-xl">{p.titulo}</h3>
              <p className={pPropsClass} style={mutedStyle}>
                {p.texto}
              </p>
            </div>
            {i < PASSOS.length - 1 && (
              <div className="flex items-center justify-center" style={{ color: 'var(--color-accent)' }}>
                <SketchArrow
                  direction="right"
                  className="w-10 h-8 hidden lg:block"
                />
                <SketchArrow direction="down" className="w-8 h-10 lg:hidden" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

function Bubble({ lado = 'left', children, tool }) {
  const direita = lado === 'right';
  return (
    <div className={`flex ${direita ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] rounded-2xl border-2 px-4 py-2 text-sm"
        style={{
          borderColor: 'var(--border-color)',
          backgroundColor: direita ? 'var(--color-primary)' : 'var(--bg-surface-hover)',
          color: direita ? 'var(--btn-primary-text, #ffffff)' : 'var(--text-main)',
        }}
      >
        {children}
        {tool && (
          <div
            className="mt-1 font-mono text-xs flex items-center gap-1"
            style={{ color: 'var(--text-muted)' }}
          >
            <Plug className="w-3 h-3" /> {tool}
          </div>
        )}
      </div>
    </div>
  );
}

export function AssistenteSection() {
  return (
    <section id="assistente" className="mt-32">
      <SectionTitle
        kicker="↓ Converse, não clique"
        title="COPILOTO IA: DADOS REAIS, NÃO ACHISMO"
      >
        O assistente usa duas vias: ferramentas MCP para dados do seu negócio em tempo real e a
        cartilha oficial para dúvidas legais.
      </SectionTitle>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="sketch-card p-6 space-y-3 -rotate-1" style={cardStyle}>
          <div
            className="flex items-center gap-2 font-display font-extrabold pb-2 border-b-2 border-dashed"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Bot className="w-5 h-5" style={{ color: 'var(--color-primary)' }} /> Assistente Aranduê
          </div>
          <Bubble lado="right">Quanto entrou no caixa esse mês?</Bubble>
          <Bubble tool="consultar_fluxo_caixa()">
            Você faturou R$ 4.820 e gastou R$ 1.950. Lucro líquido: R$ 2.870 ✨
          </Bubble>
          <Bubble lado="right">Qual o limite anual do MEI?</Bubble>
          <Bubble tool="RAG · cartilha oficial, pág. citada">
            O limite de faturamento anual do MEI é de R$ 81 mil, conforme a cartilha oficial.
          </Bubble>
          <Bubble lado="right">Cadastra o cliente Marina e agenda corte de cabelo sexta às 15h.</Bubble>
          <Bubble tool="cadastrar_cliente() · criar_agendamento()">
            Pronto! Marina cadastrada e agendamento confirmado ✅
          </Bubble>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="sketch-card p-5 rotate-1" style={cardStyle}>
            <Plug className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
            <h3 className="font-display font-extrabold text-lg mt-2">Ferramentas MCP</h3>
            <p className={pPropsClass} style={mutedStyle}>
              Saldo, clientes, agenda, orçamentos e cobranças vêm direto do sistema. Tudo o que você faz
              no painel, o assistente também faz.
            </p>
          </div>
          <div className="sketch-card p-5 -rotate-1" style={cardStyle}>
            <BookOpen className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
            <h3 className="font-display font-extrabold text-lg mt-2">Legislação com fonte</h3>
            <p className={pPropsClass} style={mutedStyle}>
              Só usa a base oficial quando a resposta é confiável, e cita a página para você conferir.
            </p>
          </div>
          <div className="sketch-card p-5 -rotate-1" style={cardStyle}>
            <Palette className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
            <h3 className="font-display font-extrabold text-lg mt-2">Personaliza o app</h3>
            <p className={pPropsClass} style={mutedStyle}>
              Peça “deixa o app em tons de roxo” e o tema é gerado e aplicado na hora.
            </p>
          </div>
          <div className="sketch-card p-5 rotate-1" style={cardStyle}>
            <Lock className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
            <h3 className="font-display font-extrabold text-lg mt-2">Isolado por empresa</h3>
            <p className={pPropsClass} style={mutedStyle}>
              O assistente só enxerga os dados da sua conta, nunca de outro MEI.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const GUARDRAILS = [
  {
    icon: Bot,
    titulo: 'Tom de voz e nome',
    texto: 'Formal, amigável, descontraído, consultivo ou direto — com mensagem de boas-vindas própria.',
  },
  {
    icon: Wallet,
    titulo: 'Alçada de orçamento',
    texto: 'Você define valor mínimo, máximo e o desconto máximo que ele pode fechar sozinho.',
  },
  {
    icon: CalendarClock,
    titulo: 'Limites de agenda',
    texto: 'Antecedência mínima e máxima em dias e horário de expediente, validados pelo servidor.',
  },
  {
    icon: UserCheck,
    titulo: 'Passa pra você',
    texto: 'Fugiu do combinado? Abre um “Atendimento pendente” com resumo da conversa para você assumir.',
  },
];

export function AtendenteSection() {
  return (
    <section id="atendente" className="mt-32">
      <SectionTitle
        kicker="↓ Um funcionário que nunca dorme"
        title="SEU ATENDENTE PESSOAL NO WHATSAPP"
      >
        Configure uma vez, converse com o assistente para ajustar quando quiser. Seus clientes são
        atendidos 24h dentro das regras que você criou.
      </SectionTitle>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-4 flex flex-col items-center relative">
          <SketchSparkle className="w-8 h-8 absolute top-0 left-6 animate-pulse" />
          <WhatsappPhoneDoodle className="w-56 h-56 sm:w-64 sm:h-64" />
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <SketchStickerBadge rotate="-4deg" className="bg-lime-300 text-zinc-900">
              Atende 24h
            </SketchStickerBadge>
            <SketchStickerBadge rotate="3deg" className="bg-amber-300 text-zinc-900">
              Você no controle
            </SketchStickerBadge>
          </div>
          <div
            className="sketch-card mt-6 p-4 flex items-center gap-3 rotate-1"
            style={cardStyle}
          >
            <BellRing className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
            <span className="text-sm font-bold">
              Alerta de “Atendimento pendente” no app e no celular
            </span>
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
          {GUARDRAILS.map(({ icon: Icon, titulo, texto }, i) => (
            <div
              key={titulo}
              className={`sketch-card p-6 ${i % 2 ? 'rotate-1' : '-rotate-1'}`}
              style={cardStyle}
            >
              <Icon className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
              <h3 className="font-display font-extrabold text-xl mt-2">{titulo}</h3>
              <p className={pPropsClass} style={mutedStyle}>
                {texto}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-8">
        <Link
          to="/atendimento/demo"
          className="sketch-btn btn-theme-primary px-6 py-3 rounded-2xl font-bold text-lg inline-block"
        >
          Ver o atendente em ação 💬
        </Link>
      </div>
    </section>
  );
}

const TEMAS = [
  { nome: 'Esmeralda MEI', cores: ['#059669', '#d1fae5', '#065f46'] },
  { nome: 'Oceano Índigo', cores: ['#4f46e5', '#e0e7ff', '#312e81'] },
  { nome: 'Âmbar Café', cores: ['#d97706', '#fef3c7', '#78350f'] },
  { nome: 'Noturno Corporativo', cores: ['#0f172a', '#334155', '#38bdf8'] },
];

export function TemasSegurancaSection() {
  return (
    <section id="seguranca" className="mt-32">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="sketch-card p-6 -rotate-1" style={cardStyle}>
          <h3 className="font-display font-extrabold text-2xl">TEMAS COM A SUA CARA</h3>
          <p className={pPropsClass} style={mutedStyle}>
            Alterne entre modo claro e noturno e escolha a paleta que combina com a sua marca.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {TEMAS.map((t) => (
              <div
                key={t.nome}
                className="rounded-xl border-2 p-3"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="flex gap-1 mb-2">
                  {t.cores.map((c) => (
                    <span
                      key={c}
                      className="w-6 h-6 rounded-full border-2"
                      style={{ backgroundColor: c, borderColor: 'var(--border-color)' }}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold">{t.nome}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sketch-card p-6 rotate-1" style={cardStyle}>
          <h3 className="font-display font-extrabold text-2xl">SEUS DADOS, SÓ SEUS</h3>
          <p className={pPropsClass} style={mutedStyle}>
            Cada MEI vive em um espaço isolado. Nada é compartilhado entre contas.
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              [Lock, 'Login protegido por token JWT e opção de entrar com Google.'],
              [ShieldCheck, 'O assistente nunca recebe nem escolhe a identidade da empresa: ela vem da sua sessão.'],
              [UserCheck, 'O atendente de clientes não acessa seu caixa, notas ou outros clientes.'],
              [Plug, 'Tudo o que o painel faz, o assistente também faz — pelas mesmas regras de negócio.'],
            ].map(([Icon, texto]) => (
              <li key={texto} className="flex items-start gap-3">
                <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }} />
                <span>{texto}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  {
    q: 'Preciso entender de contabilidade?',
    a: 'Não. O sistema organiza caixa, notas e impostos de forma simples, e o assistente explica as dúvidas com base na cartilha oficial do MEI.',
  },
  {
    q: 'O atendente pode fechar negócio sozinho?',
    a: 'Somente dentro dos limites que você definir: faixa de valor, desconto máximo e antecedência de agenda. Fora disso, ele chama você.',
  },
  {
    q: 'Funciona no celular?',
    a: 'Sim. A interface é responsiva e existe um aplicativo Android com as mesmas funções do painel web.',
  },
  {
    q: 'As notas fiscais já valem de verdade?',
    a: 'A transmissão está disponível em ambiente de homologação com certificado A1, para você testar com segurança antes de emitir oficialmente.',
  },
  {
    q: 'Meus dados ficam misturados com os de outros MEIs?',
    a: 'Nunca. Cada conta é isolada e o assistente só acessa os dados da sua sessão.',
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="mt-32 max-w-3xl mx-auto">
      <SectionTitle kicker="↓ Ficou com dúvida?" title="PERGUNTAS FREQUENTES" />
      <div className="space-y-4">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="sketch-card p-4 group" style={cardStyle}>
            <summary className="cursor-pointer font-display font-extrabold text-lg list-none flex items-center justify-between gap-2">
              {q}
              <span style={{ color: 'var(--color-accent)' }}>＋</span>
            </summary>
            <p className="text-sm mt-3" style={mutedStyle}>
              {a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

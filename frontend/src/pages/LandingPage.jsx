import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { applyThemeToDOM, TEMA_COFFEE_LANDING } from '../context/ThemeContext';
import {
  CartoonEyes,
  OwlMascotDoodle,
  PeaceHandDoodle,
  CoffeeCupDoodle,
  PencilInvoiceDoodle,
  FlamingCursorDoodle,
  SketchUnderline,
  SketchArrow,
  SketchSparkle,
  SketchStickerBadge,
} from '../components/SketchDoodles';
import {
  ModulosSection,
  FluxoIntegradoSection,
  AssistenteSection,
  AtendenteSection,
  TemasSegurancaSection,
  FaqSection,
} from './LandingSections';

export default function LandingPage() {
  const { estaAutenticado } = useAuth();

  // Isola a landing do tema do usuário: força o tema "coffee" (Âmbar & Café) e restaura ao sair
  useEffect(() => {
    applyThemeToDOM(TEMA_COFFEE_LANDING);
    return () => {
      let anterior = null;
      try {
        const cached = window.localStorage.getItem('arandue_tema_ativo');
        if (cached) anterior = JSON.parse(cached);
      } catch {
        anterior = null;
      }
      applyThemeToDOM(anterior || undefined);
    };
  }, []);

  return (
    <div
      className="min-h-screen sketch-paper-bg transition-colors duration-300"
      style={{
        backgroundColor: 'var(--bg-app, #f4f1ea)',
        color: 'var(--text-main, #18181b)',
      }}
    >
      <div className="max-w-6xl 2xl:max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        {/* 1. Header Editorial Sketch */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b-2 border-dashed border-current/30">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-display font-extrabold text-3xl tracking-tighter">
              ARANDUÊ
            </Link>
            <CartoonEyes className="w-10 h-7 inline-block text-current" />
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-bold">
            <a href="#como-funciona" className="hover:underline decoration-wavy decoration-2">
              como funciona
            </a>
            <a href="#superpoderes" className="hover:underline decoration-wavy decoration-2">
              superpoderes IA
            </a>
            <a
              href="#manifesto"
              className="hover:underline decoration-wavy decoration-2 flex items-center gap-1"
            >
              para o MEI{' '}
              <span className="font-hand text-lg text-amber-600 dark:text-amber-400">
                (sem burocracia!)
              </span>
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {estaAutenticado && (
              <Link
                to="/"
                className="sketch-btn px-4 py-2 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Ir para o Meu Painel →
              </Link>
            )}
            <Link
              to="/login"
              className="sketch-btn px-4 py-2 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 text-zinc-900 dark:text-white"
            >
              Entrar
            </Link>
            <Link
              to="/register"
              className="sketch-btn px-4 py-2 rounded-xl font-bold text-sm bg-lime-300 dark:bg-lime-400 text-zinc-900 -rotate-1 hover:rotate-0"
            >
              Criar Conta Grátis ✎
            </Link>
          </div>
        </header>

        {/* 3. Hero Section (Referência PKLS) */}
        <section className="mt-14 text-center relative">
          <div className="inline-flex items-center gap-2 font-hand text-2xl font-bold bg-amber-200 text-zinc-900 px-4 py-1 rounded-full border-2 border-zinc-900 -rotate-2 shadow-[3px_3px_0px_#18181b] mb-8">
            <span>✨ Chega de planilha cinza e sistema sem graça!</span>
          </div>

          {/* Monumental Display Heading — o nome é o foco logo no início */}
          <h1 className="font-display font-extrabold text-6xl sm:text-8xl md:text-9xl tracking-tighter leading-none select-none">
            ARANDUÊ
          </h1>
          <div className="flex justify-center mt-3">
            <SketchUnderline className="w-56 h-4 text-amber-500" />
          </div>

          {/* 5 Personagens em Linha com Olhos Cartoon */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-8 gap-y-10 items-end max-w-6xl mx-auto mt-16 py-4">
            {/* 1. Coruja Aranduê */}
            <div className="flex flex-col items-center group">
              <OwlMascotDoodle
                variant="cool"
                className="w-28 h-28 sm:w-32 sm:h-32 transform -rotate-3 group-hover:rotate-0 transition-transform"
              />
              <span className="font-hand text-xl font-bold mt-1">Coruja Aranduê</span>
            </div>

            {/* 2. Sinal Tranquilo */}
            <div className="flex flex-col items-center group">
              <PeaceHandDoodle className="w-28 h-28 sm:w-32 sm:h-32 transform rotate-2 group-hover:rotate-0 transition-transform" />
              <span className="font-hand text-xl font-bold mt-1">Zero Estresse</span>
            </div>

            {/* 3. Lápis / Orçamentos */}
            <div className="flex flex-col items-center group">
              <PencilInvoiceDoodle className="w-28 h-28 sm:w-32 sm:h-32 transform -rotate-6 group-hover:rotate-0 transition-transform" />
              <span className="font-hand text-xl font-bold mt-1">Orçamentos</span>
            </div>

            {/* 4. Xícara de Café */}
            <div className="flex flex-col items-center group">
              <CoffeeCupDoodle className="w-28 h-28 sm:w-32 sm:h-32 transform rotate-3 group-hover:rotate-0 transition-transform" />
              <span className="font-hand text-xl font-bold mt-1">Café & Caixa</span>
            </div>

            {/* 5. Cursor em Chamas */}
            <div className="flex flex-col items-center group col-span-2 sm:col-span-1">
              <FlamingCursorDoodle className="w-28 h-28 sm:w-32 sm:h-32 transform -rotate-2 group-hover:rotate-0 transition-transform" />
              <span className="font-hand text-xl font-bold mt-1">IA 24h no Zap</span>
            </div>
          </div>


          {/* CTA Principal */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="sketch-btn px-6 py-3 rounded-2xl font-display font-bold text-base sm:text-lg bg-lime-300 dark:bg-lime-400 text-zinc-900 -rotate-1 hover:rotate-0 flex items-center gap-2"
            >
              <span>Começar Grátis Agora</span>
              <SketchArrow direction="right" className="w-6 h-6 inline-block" />
            </Link>
            <Link
              to="/login"
              className="sketch-btn px-6 py-3 rounded-2xl font-bold text-base sm:text-lg bg-white dark:bg-slate-800 text-zinc-900 dark:text-white"
            >
              Já tenho conta (Entrar)
            </Link>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 font-hand text-lg sm:text-xl text-zinc-700 dark:text-zinc-300">
            <SketchSparkle className="w-5 h-5 text-amber-500" />
            <span>Sem cartão de crédito, sem pegadinhas. Pronto em 2 minutos!</span>
            <SketchSparkle className="w-5 h-5 text-amber-500" />
          </div>
        </section>

        {/* 4. Seção "Ordem Primeiro, Caos Depois" (Referência Dzaglik + Cadeira de Praia PKLS) */}
        <section id="como-funciona" className="mt-32 relative">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="font-hand text-2xl font-bold text-indigo-600 dark:text-indigo-400 block -rotate-1">
              ↓ Esqueça as grades rígidas e planilhas complicadas
            </span>
            <h2 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight mt-1">
              VOCÊ FOCA NO SEU CORRE — A GENTE CUIDA DA BUROCRACIA.
            </h2>
            <p className="text-sm sm:text-base opacity-80 mt-2 max-w-xl mx-auto">
              Começamos pela ordem das suas finanças e deixamos sua rotina leve como um domingo de sol.
            </p>
            <div className="flex justify-center mt-2">
              <SketchUnderline className="w-48 h-4 text-amber-500" />
            </div>
          </div>

          {/* Grid Espalhado (4 Cards Assimétricos ao redor da Ilustração Central) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Coluna Esquerda */}
            <div className="lg:col-span-4 space-y-12">
              <div
                className="sketch-card sketch-tape p-6 relative transform -rotate-2"
                style={{
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  color: 'var(--text-main, #18181b)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-extrabold text-2xl leading-tight">
                    LIVRO CAIXA
                    <br />
                    & PIX RÁPIDO
                  </h3>
                  <SketchStickerBadge
                    rotate="6deg"
                    className="bg-lime-300 text-zinc-900"
                  >
                    Sem planilha!
                  </SketchStickerBadge>
                </div>
                <p className="text-sm mt-3 opacity-85">
                  Registre entradas e saídas pelo painel ou mandando um áudio no WhatsApp. Saiba seu
                  lucro líquido real na hora.
                </p>
              </div>

              <div
                className="sketch-card p-6 relative transform rotate-2 lg:translate-x-4"
                style={{
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  color: 'var(--text-main, #18181b)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-extrabold text-2xl leading-tight">
                    ATENDENTE IA
                    <br />
                    NO WHATSAPP
                  </h3>
                  <SketchStickerBadge
                    rotate="-6deg"
                    className="bg-amber-300 text-zinc-900"
                  >
                    24h por dia
                  </SketchStickerBadge>
                </div>
                <p className="text-sm mt-3 opacity-85">
                  Seu agente pessoal responde clientes, calcula orçamentos com desconto inteligente
                  e agenda serviços sozinho.
                </p>
              </div>
            </div>

            {/* Centro: Coruja na Cadeira de Praia */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center py-6 relative">
              <div className="relative">
                <SketchSparkle className="w-8 h-8 text-pink-400 absolute -top-4 -left-4 animate-pulse" />
                <SketchSparkle className="w-6 h-6 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
                <OwlMascotDoodle
                  variant="beach"
                  className="w-64 h-64 sm:w-72 sm:h-72"
                />
              </div>
              <span className="font-hand text-2xl font-bold text-center mt-2">
                "Deixa que a IA anota o pedido!" 😎🍹
              </span>
            </div>

            {/* Coluna Direita */}
            <div className="lg:col-span-4 space-y-12">
              <div
                className="sketch-card sketch-tape p-6 relative transform rotate-1 lg:-translate-x-2"
                style={{
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  color: 'var(--text-main, #18181b)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-extrabold text-2xl leading-tight">
                    ORÇAMENTOS &
                    <br />
                    COBRANÇAS
                  </h3>
                  <SketchStickerBadge
                    rotate="3deg"
                    className="bg-sky-300 text-zinc-900"
                  >
                    1 Clique
                  </SketchStickerBadge>
                </div>
                <p className="text-sm mt-3 opacity-85">
                  Monte propostas profissionais, aprove orçamentos e dispare lembretes amigáveis de
                  cobrança direto no WhatsApp.
                </p>
              </div>

              <div
                className="sketch-card p-6 relative transform -rotate-1"
                style={{
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  color: 'var(--text-main, #18181b)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-extrabold text-2xl leading-tight">
                    BÚSSOLA FISCAL
                    <br />
                    OFICIAL MEI
                  </h3>
                  <SketchStickerBadge
                    rotate="-3deg"
                    className="bg-pink-300 text-zinc-900"
                  >
                    RAG Oficial
                  </SketchStickerBadge>
                </div>
                <p className="text-sm mt-3 opacity-85">
                  Dúvidas sobre DAS, limite de faturamento ou nota fiscal? O assistente consulta a
                  legislação oficial do MEI com citação de página.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Seções informativas: módulos, fluxo integrado, copiloto IA, atendente, temas/segurança e FAQ */}
        <ModulosSection />
        <FluxoIntegradoSection />
        <AssistenteSection />
        <AtendenteSection />
        <TemasSegurancaSection />
        <FaqSection />

        {/* 5. Seção Anéis Tracejados & Manifesto (Referência PKLS) */}
        <section id="manifesto" className="mt-32 py-10 relative overflow-hidden">
          <div id="superpoderes" className="max-w-4xl mx-auto relative px-4">
            {/* Elipse Superior */}
            <div className="border-2 border-dashed border-current rounded-[100%] py-8 px-6 text-center">
              <h3 className="font-display font-extrabold text-2xl sm:text-4xl md:text-5xl tracking-tight">
                MENTES CRIATIVAS & EMPREENDEDORES REAIS
              </h3>
            </div>
            {/* Elipse Inferior Sobreposta */}
            <div className="border-2 border-dashed border-current rounded-[100%] py-8 px-6 text-center -mt-6">
              <h3 className="font-display font-extrabold text-2xl sm:text-4xl md:text-5xl tracking-tight">
                MUDAM O MUNDO & MOVEM A ECONOMIA DE VERDADE
              </h3>
            </div>

            {/* Sticker Redondo Rotacionado */}
            <div className="sketch-sticker w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-lime-400 text-zinc-900 flex flex-col items-center justify-center font-display font-extrabold text-lg sm:text-xl leading-none rotate-12 mx-auto sm:mx-0 sm:absolute sm:-bottom-6 sm:right-10 mt-4 sm:mt-0 shadow-[3px_3px_0px_#18181b]">
              <span>FEITO</span>
              <span>PARA</span>
              <span>MEI ★</span>
            </div>
          </div>

          <div className="text-center mt-12 max-w-2xl mx-auto px-4">
            <p className="font-hand text-2xl sm:text-3xl font-bold">
              "Criado especialmente para quem faz acontecer com as próprias mãos."
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="sketch-btn px-6 py-3 rounded-2xl font-bold text-lg bg-lime-300 dark:bg-lime-400 text-zinc-900 -rotate-1 hover:rotate-0"
              >
                Começar Grátis Agora
              </Link>
              <Link
                to="/atendimento/demo"
                className="sketch-btn px-6 py-3 rounded-2xl font-bold text-lg bg-white dark:bg-slate-800 text-zinc-900 dark:text-white"
              >
                Testar Atendente IA 💬
              </Link>
            </div>
          </div>
        </section>

        {/* 6. Footer */}
        <footer className="mt-20 border-t-2 border-dashed border-current/25 py-10 w-full flex flex-col sm:flex-row items-center justify-between gap-6 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-display font-black text-2xl tracking-tighter">ARANDUÊ</span>
            <CartoonEyes className="w-8 h-5 text-current inline-block" />
            <span className="font-hand text-lg opacity-80">— Feito à mão para o MEI</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 font-bold">
            <Link to="/login" className="hover:underline">
              Entrar
            </Link>
            <Link to="/register" className="hover:underline">
              Criar Conta Grátis
            </Link>
            <Link to="/atendimento/demo" className="hover:underline">
              Demonstração Atendente IA
            </Link>
            <a href="#como-funciona" className="hover:underline">
              Como Funciona
            </a>
          </div>
          <div className="text-xs opacity-60">
            © {new Date().getFullYear()} Aranduê. Todos os direitos reservados.
          </div>
        </footer>
      </div>
    </div>
  );
}

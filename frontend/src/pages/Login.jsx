import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  TrendingUp,
  FileText,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { auth, googleProvider } from '../services/firebase';
import {
  OwlMascotDoodle,
  CartoonEyes,
  SketchUnderline,
  SketchStickerBadge,
} from '../components/SketchDoodles';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [submetendo, setSubmetendo] = useState(false);
  const [submetendoGoogle, setSubmetendoGoogle] = useState(false);

  const { login, loginComGoogle } = useAuth();
  const navigate = useNavigate();

  // Desativa modo escuro e isola o tema enquanto estiver na tela de login
  useEffect(() => {
    const root = document.documentElement;
    const estavaDark = root.classList.contains('dark');
    const modoAnterior = root.getAttribute('data-theme-mode');

    root.classList.remove('dark');
    root.setAttribute('data-theme-mode', 'light');

    return () => {
      if (estavaDark) {
        root.classList.add('dark');
      }
      if (modoAnterior) {
        root.setAttribute('data-theme-mode', modoAnterior);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!email || !senha) {
      setErro('Por favor, preencha todos os campos.');
      return;
    }

    try {
      setSubmetendo(true);
      await login(email, senha);
      navigate('/');
    } catch (err) {
      const msg =
        err.response?.data?.mensagem ||
        err.response?.data?.erros?.[0] ||
        'Credenciais inválidas. Verifique seu e-mail e senha.';
      setErro(msg);
    } finally {
      setSubmetendo(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErro('');
    setSubmetendoGoogle(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user) {
        throw new Error('Não foi possível obter os dados da conta Google.');
      }

      await loginComGoogle(user);
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setSubmetendoGoogle(false);
        return;
      }

      let msg = 'Não foi possível conectar com o Google no momento.';
      if (err.code === 'auth/unauthorized-domain') {
        msg = 'Domínio local ainda não autorizado no Firebase Auth.';
      } else if (err.response?.data?.mensagem) {
        msg = err.response.data.mensagem;
      } else if (err.message) {
        msg = err.message;
      }

      setErro(msg);
    } finally {
      setSubmetendoGoogle(false);
    }
  };

  return (
    <div
      className="h-screen w-full flex flex-col lg:flex-row bg-white theme-isolated overflow-y-auto lg:overflow-hidden"
      style={{
        backgroundColor: '#ffffff',
        color: '#1c1917',
        colorScheme: 'light',
      }}
    >
      {/* Lado Esquerdo: Vitrine Modular (Oculto no mobile, visível apenas a partir de lg) */}
      <div className="hidden lg:flex lg:w-1/2 bg-stone-100/70 border-r border-stone-200 p-6 lg:p-8 xl:p-10 flex-col justify-between h-full overflow-hidden">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Link
              to="/landing"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:underline transition-colors"
            >
              ← Explorar Landing Page
            </Link>
            <SketchStickerBadge rotate="-2deg" className="bg-amber-100 text-amber-900 border-amber-300">
              FEITO À MÃO ✎
            </SketchStickerBadge>
          </div>

          <div className="flex items-center gap-3">
            <Logo size="md" showText={true} />
            <CartoonEyes className="w-8 h-5 opacity-80" />
          </div>

          <div className="mt-4 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-md text-xs font-bold bg-amber-200 text-stone-900 border-2 border-stone-800 shadow-[2px_2px_0px_#292524] mb-2 transform -rotate-1 font-hand">
              ✎ Caderno de Gestão Descomplicada
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-stone-900 tracking-tight leading-snug">
              Gestão modular feita para o microempreendedor.
            </h1>
            <SketchUnderline className="w-32 h-2 text-amber-500 opacity-80 mt-0.5" />
            <p className="text-stone-600 text-xs sm:text-sm mt-2 leading-relaxed">
              Controle financeiro, emissão de notas e suporte prático reunidos em uma experiência sem enrolação.
            </p>
          </div>

          {/* Destaque do Mascote Aranduê com anotação manuscrita */}
          <div className="mt-4 flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-stone-800 shadow-[2.5px_2.5px_0px_#292524]">
            <OwlMascotDoodle variant="cool" className="w-12 h-12 flex-shrink-0" />
            <div>
              <p className="font-hand text-base text-stone-900 font-bold leading-tight">
                "Você foca no seu corre, o Aranduê cuida da burocracia!"
              </p>
              <p className="text-[11px] text-stone-500 font-sans mt-0.5">
                Coruja Aranduê — sua parceira no financeiro e no WhatsApp
              </p>
            </div>
          </div>

          {/* Cards Modulares Bento (Estilo Desenhado à Mão, Bordas Sólidas de Nanquim) */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            {/* Bloco 1: Livro Caixa */}
            <div className="bg-white border-2 border-stone-800 rounded-xl p-3.5 shadow-[2.5px_2.5px_0px_#292524]">
              <div className="w-8 h-8 rounded-lg bg-amber-100 border-2 border-stone-800 text-stone-900 flex items-center justify-center mb-2 shadow-[1px_1px_0px_#292524]">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-stone-900">Livro Caixa</h3>
              <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                Acompanhamento ágil de entradas, saídas e faturamento sem planilhas complexas.
              </p>
            </div>

            {/* Bloco 2: Notas Fiscais */}
            <div className="bg-white border-2 border-stone-800 rounded-xl p-3.5 shadow-[2.5px_2.5px_0px_#292524]">
              <div className="w-8 h-8 rounded-lg bg-sky-100 border-2 border-stone-800 text-stone-900 flex items-center justify-center mb-2 shadow-[1px_1px_0px_#292524]">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-stone-900">Notas Fiscais</h3>
              <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                Emissão simplificada e cálculo tributário automático no padrão oficial do MEI.
              </p>
            </div>

            {/* Bloco 3: Assistente IA */}
            <div className="sm:col-span-2 bg-white border-2 border-stone-800 rounded-xl p-3.5 shadow-[2.5px_2.5px_0px_#292524]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-lime-200 border-2 border-stone-800 text-stone-900 flex items-center justify-center shadow-[1px_1px_0px_#292524]">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-stone-900">Assistente Virtual Aranduê</h3>
                </div>
                <span className="font-hand text-xs font-bold text-stone-900 bg-lime-300 border-2 border-stone-800 px-2.5 py-0.5 rounded-md shadow-[1px_1px_0px_#292524] rotate-1">
                  24h no Zap ✎
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Tire dúvidas com base no manual oficial do MEI e consulte relatórios diretamente pelo chat.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé do painel de apresentação */}
        <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Isolamento de dados e segurança
          </span>
          <span>Versão 1.0</span>
        </div>
      </div>

      {/* Lado Direito: Formulário de Autenticação (100% da tela no mobile, 50% em desktop) */}
      <div className="w-full lg:w-1/2 h-full flex items-center justify-center p-6 sm:p-8 lg:p-10 xl:p-12 bg-white overflow-y-auto lg:overflow-hidden">
        <div className="w-full max-w-md my-auto">
          {/* Logo exibido no topo do formulário em dispositivos móveis */}
          <div className="lg:hidden mb-4 flex flex-col items-center gap-1.5">
            <Logo size="md" showText={true} />
            <Link
              to="/landing"
              className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors"
            >
              ← Explorar Landing Page
            </Link>
          </div>

          {/* Cabeçalho do formulário */}
          <div className="mb-5 text-center">
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-stone-900 tracking-tight flex items-center justify-center gap-2">
              <span>Bem-vindo de volta</span>
              <CartoonEyes className="w-7 h-5 inline-block opacity-85" />
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Acesse sua conta para continuar gerenciando seu negócio.
            </p>
          </div>

          {erro && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-rose-800 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <div className="leading-relaxed">{erro}</div>
            </div>
          )}

          {/* Botão de Login com Google via Firebase */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={submetendoGoogle || submetendo}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
            >
              {submetendoGoogle ? (
                <>
                  <div className="w-4 h-4 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
                  <span>Conectando com o Google...</span>
                </>
              ) : (
                <>
                  {/* SVG Oficial Google */}
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continuar com o Google</span>
                </>
              )}
            </button>

            {/* Divisor Visual */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-stone-200 w-full" />
              <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-stone-400 font-medium absolute">
                ou entre com seu e-mail
              </span>
            </div>

            {/* Formulário Tradicional */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
                >
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors placeholder:text-stone-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="senha"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone-700"
                  >
                    Senha
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="senha"
                    name="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-11 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors placeholder:text-stone-400"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    aria-label={mostrarSenha ? 'Ocultar caracteres' : 'Exibir caracteres'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 focus:outline-none"
                  >
                    {mostrarSenha ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Botão Entrar Sólido */}
              <button
                type="submit"
                disabled={submetendo || submetendoGoogle}
                className="w-full mt-2 py-3 px-4 bg-stone-900 hover:bg-black disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2"
              >
                {submetendo ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Entrar</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Rodapé do Form */}
          <div className="mt-4 pt-3 border-t border-stone-100 text-center">
            <p className="text-xs text-stone-500">
              Ainda não tem conta no Aranduê?{' '}
              <Link
                to="/register"
                className="font-semibold text-stone-900 hover:underline transition-colors inline-flex items-center gap-1 group"
              >
                <span>Cadastre-se grátis</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

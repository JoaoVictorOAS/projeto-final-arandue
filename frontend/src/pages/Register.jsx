import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  TrendingUp,
  FileText,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [submetendo, setSubmetendo] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Desativa modo escuro e isola o tema enquanto estiver na tela de cadastro
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
    setSucesso('');

    if (!nome.trim() || !email.trim() || !senha) {
      setErro('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (senha.length < 6) {
      setErro('A senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas informadas não coincidem.');
      return;
    }

    try {
      setSubmetendo(true);
      await register(nome.trim(), email.trim(), senha);
      setSucesso('Cadastro realizado com sucesso! Redirecionando...');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err) {
      const msg =
        err.response?.data?.mensagem ||
        err.response?.data?.erros?.[0] ||
        'Não foi possível realizar o cadastro. Verifique os dados e tente novamente.';
      setErro(msg);
    } finally {
      setSubmetendo(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col lg:flex-row bg-white theme-isolated"
      style={{
        backgroundColor: '#ffffff',
        color: '#1c1917',
        colorScheme: 'light',
      }}
    >
      {/* Lado Esquerdo: Vitrine Modular (Oculto no mobile, visível apenas a partir de lg) */}
      <div className="hidden lg:flex lg:w-1/2 bg-stone-100/70 border-r border-stone-200 p-8 sm:p-12 lg:p-16 flex-col justify-between">
        <div>
          <Logo size="md" showText={true} />

          <div className="mt-10 lg:mt-14 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 mb-4 border border-emerald-200/60">
              <Sparkles className="w-3.5 h-3.5" />
              Simplicidade que acompanha sua rotina
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight leading-snug">
              Gestão modular feita para o microempreendedor.
            </h1>
            <p className="text-stone-600 text-sm sm:text-base mt-3 leading-relaxed">
              Controle financeiro, emissão de notas e suporte com inteligência artificial reunidos em uma experiência limpa, intuitiva e sem ruídos.
            </p>
          </div>

          {/* Cards Modulares Bento (Cores sólidas, sem gradientes) */}
          <div className="mt-8 lg:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            {/* Bloco 1: Livro Caixa */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:border-stone-300 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-stone-900">Livro Caixa</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Acompanhamento ágil de entradas, saídas e previsão de faturamento sem planilhas complexas.
              </p>
            </div>

            {/* Bloco 2: Notas Fiscais */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:border-stone-300 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center mb-3">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-stone-900">Notas Fiscais</h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Emissão simplificada e cálculo tributário automático no padrão oficial do MEI.
              </p>
            </div>

            {/* Bloco 3: Assistente IA */}
            <div className="sm:col-span-2 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:border-stone-300 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-stone-900">Assistente Virtual Aranduê</h3>
                </div>
                <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Suporte Ativo
                </span>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed mt-1">
                Tire dúvidas com base no manual oficial do MEI e consulte relatórios diretamente pelo chat.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé do painel de apresentação */}
        <div className="mt-10 pt-6 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Isolamento de dados e segurança
          </span>
          <span>Versão 1.0</span>
        </div>
      </div>

      {/* Lado Direito: Formulário de Cadastro (100% da tela no mobile, 50% em desktop) */}
      <div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-white">
        <div className="w-full max-w-md">
          {/* Logo exibido no topo do formulário em dispositivos móveis */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="md" showText={true} />
          </div>

          {/* Cabeçalho do formulário centralizado */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Crie sua Conta no Aranduê
            </h2>
            <p className="text-sm text-stone-500 mt-1.5">
              Organize clientes, serviços, agenda, orçamentos e financeiro num só lugar.
            </p>
          </div>

          {erro && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <div className="leading-relaxed">{erro}</div>
            </div>
          )}

          {sucesso && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3 text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
              <div className="leading-relaxed">{sucesso}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="nome"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
              >
                Nome Completo
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Maria Pereira da Silva"
                className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors placeholder:text-stone-400"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
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
                className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors placeholder:text-stone-400"
              />
            </div>

            <div>
              <label
                htmlFor="senha"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  name="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors placeholder:text-stone-400"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  aria-label={mostrarSenha ? 'Ocultar caracteres' : 'Exibir caracteres'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 focus:outline-none"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmarSenha"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
              >
                Confirmar Senha
              </label>
              <div className="relative">
                <input
                  id="confirmarSenha"
                  name="confirmarSenha"
                  type={mostrarConfirmarSenha ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita sua senha"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-colors placeholder:text-stone-400"
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                  aria-label={mostrarConfirmarSenha ? 'Ocultar confirmação' : 'Exibir confirmação'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 focus:outline-none"
                >
                  {mostrarConfirmarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submetendo}
              className="w-full mt-2 py-3.5 px-4 bg-stone-900 hover:bg-black disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2"
            >
              {submetendo ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Criando conta...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Criar Conta</span>
                </>
              )}
            </button>
          </form>

          {/* Rodapé com link para login */}
          <div className="mt-8 pt-6 border-t border-stone-100 text-center">
            <p className="text-sm text-stone-500">
              Já possui uma conta no Aranduê?{' '}
              <Link
                to="/login"
                className="font-semibold text-stone-900 hover:underline transition-colors inline-flex items-center gap-1 group"
              >
                <span>Faça login</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

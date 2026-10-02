import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [submetendo, setSubmetendo] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-200 mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Crie sua Conta MEI</h2>
          <p className="text-sm text-gray-500 mt-1">
            Organize clientes, serviços, orçamentos e financeiro num só lugar
          </p>
        </div>

        {erro && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-700 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" />
            <span>{sucesso}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="nome"
              className="block text-sm font-semibold text-gray-700 mb-1.5"
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
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-gray-400 text-gray-900 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-gray-700 mb-1.5"
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
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-gray-400 text-gray-900 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="senha"
              className="block text-sm font-semibold text-gray-700 mb-1.5"
            >
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-gray-400 text-gray-900 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="confirmarSenha"
              className="block text-sm font-semibold text-gray-700 mb-1.5"
            >
              Confirmar Senha
            </label>
            <input
              id="confirmarSenha"
              name="confirmarSenha"
              type="password"
              autoComplete="new-password"
              required
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Repita sua senha"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-gray-400 text-gray-900 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submetendo}
            className="w-full mt-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            Já possui uma conta?{' '}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

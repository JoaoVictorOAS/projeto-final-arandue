import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Loader2 } from 'lucide-react';
import Modal from '../Modal';

/**
 * Modal para criação de novas abas/painéis customizados de Dashboard para o MEI.
 */
export default function ModalNovoDashboard({ isOpen, onClose, onSalvar }) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNome('');
      setDescricao('');
      setErro('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Por favor, informe o nome do painel.');
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      await onSalvar({
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErro(err?.response?.data?.mensagem || err?.message || 'Erro ao criar painel');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Painel de Dashboard"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {erro && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {erro}
          </div>
        )}

        <div>
          <label
            htmlFor="dashboard-nome"
            className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
          >
            Nome do Painel
          </label>
          <input
            id="dashboard-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Vendas e Metas"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            required
            autoFocus
          />
        </div>

        <div>
          <label
            htmlFor="dashboard-descricao"
            className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5"
          >
            Descrição (opcional)
          </label>
          <textarea
            id="dashboard-descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Breve resumo dos objetivos deste painel..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition resize-none"
          />
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Criar Painel
          </button>
        </div>
      </form>
    </Modal>
  );
}

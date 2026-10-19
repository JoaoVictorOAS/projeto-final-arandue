import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * ThemedSelect - Componente canônico de seleção com gaveta tátil (Bottom Sheet) no mobile
 * e dropdown integrado ao sistema de temas dinâmicos do Aranduê.
 */
export default function ThemedSelect({
  id,
  name,
  value = '',
  onChange,
  options = [],
  placeholder = 'Selecione uma opção...',
  label,
  error,
  disabled = false,
  required = false,
  className = '',
  children,
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Extrai lista normalizada de opções a partir de props ou children (<option>)
  const parsedOptions = useMemo(() => {
    if (children) {
      const childArray = React.Children.toArray(children);
      return childArray
        .filter((child) => React.isValidElement(child) && child.type === 'option')
        .map((child) => ({
          value: child.props.value !== undefined ? child.props.value : '',
          label: child.props.children || child.props.value || '',
          disabled: Boolean(child.props.disabled),
        }));
    }

    return options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value !== undefined ? opt.value : '',
          label: opt.label !== undefined ? opt.label : opt.value,
          disabled: Boolean(opt.disabled),
        };
      }
      return {
        value: opt,
        label: String(opt),
        disabled: false,
      };
    });
  }, [options, children]);

  // Localiza a opção selecionada atual
  const selectedOption = useMemo(() => {
    return parsedOptions.find((opt) => String(opt.value) === String(value));
  }, [parsedOptions, value]);

  // Trava scroll da página de fundo quando a Bottom Sheet estiver aberta
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Autofocus no input de busca se houver
      if (parsedOptions.length > 5) {
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 50);
      }

      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen, parsedOptions.length]);

  // Tecla Escape para fechar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // Opções filtradas pela busca
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return parsedOptions;
    const q = searchQuery.toLowerCase();
    return parsedOptions.filter((opt) =>
      String(opt.label).toLowerCase().includes(q)
    );
  }, [parsedOptions, searchQuery]);

  const handleSelect = (optValue) => {
    if (onChange) {
      // Dispara evento sintético compatível com o padrão React de inputs
      const syntheticEvent = {
        target: {
          id,
          name: name || id,
          value: optValue,
        },
      };
      onChange(syntheticEvent);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* Gatilho Principal (Trigger Button) */}
      <button
        type="button"
        id={id ? `${id}-btn` : undefined}
        name={name}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(true)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm rounded-xl border transition-all duration-150 text-left focus:outline-none focus:ring-2 disabled:cursor-not-allowed ${
          error
            ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20'
            : 'focus:border-indigo-500 focus:ring-indigo-500/20'
        }`}
        style={{
          backgroundColor: disabled ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
          borderColor: error ? undefined : 'var(--border-color)',
          color: selectedOption ? 'var(--text-main)' : 'var(--text-muted)',
        }}
      >
        <span className="truncate pr-2 font-medium">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={18}
          className="shrink-0 transition-transform duration-200"
          style={{
            color: 'var(--text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>

      {/* Select oculto para compatibilidade e validação de formulários nativos */}
      <select
        tabIndex={-1}
        aria-hidden="true"
        id={id}
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(e) => handleSelect(e.target.value)}
        className="sr-only opacity-0 pointer-events-none absolute w-0 h-0"
      >
        <option value="">{placeholder}</option>
        {parsedOptions.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Modal / Bottom Sheet */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4"
        >
          {/* Backdrop Escurecido com Blur */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery('');
            }}
          />

          {/* Container da Gaveta (Bottom Sheet no Mobile, Card Centrado no Desktop) */}
          <div
            className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border-t-2 sm:border-2 shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[75vh] z-10 animate-scale-in overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)',
            }}
          >
            {/* Alça Tátil de Arrasto (Mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div
                className="w-12 h-1.5 rounded-full"
                style={{ backgroundColor: 'var(--border-color)' }}
              />
            </div>

            {/* Cabeçalho */}
            <div
              className="px-5 py-3 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <h3 className="font-display font-bold text-base truncate pr-2">
                {label || placeholder}
              </h3>
              <button
                type="button"
                aria-label="Fechar seleção"
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className="p-1.5 rounded-xl transition hover:opacity-80 active:scale-95"
                style={{
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-surface-hover)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Barra de Pesquisa Rápida (quando há mais de 5 itens) */}
            {parsedOptions.length > 5 && (
              <div
                className="p-3 border-b"
                style={{
                  backgroundColor: 'var(--bg-surface-hover)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-transparent"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <Search size={16} style={{ color: 'var(--text-muted)' }} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar opções..."
                    className="w-full bg-transparent text-sm focus:outline-none"
                    style={{ color: 'var(--text-main)' }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-0.5 rounded-full hover:opacity-70"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Lista Rolável de Opções */}
            <div className="overflow-y-auto p-2 space-y-1 flex-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => !opt.disabled && handleSelect(opt.value)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors min-h-[48px] ${
                        opt.disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : 'cursor-pointer active:scale-[0.99]'
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--bg-surface-hover)'
                          : 'transparent',
                        color: isSelected
                          ? 'var(--color-primary)'
                          : 'var(--text-main)',
                      }}
                    >
                      <span className="truncate pr-2">{opt.label}</span>
                      {isSelected && (
                        <Check
                          size={18}
                          className="shrink-0"
                          style={{ color: 'var(--color-primary)' }}
                        />
                      )}
                    </button>
                  );
                })
              ) : (
                <div
                  className="py-10 text-center text-sm font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Nenhuma opção encontrada para "{searchQuery}"
                </div>
              )}
            </div>

            {/* Espaçador de segurança para navegação inferior móvel */}
            <div className="h-4 sm:h-2" />
          </div>
        </div>
      )}
    </div>
  );
}

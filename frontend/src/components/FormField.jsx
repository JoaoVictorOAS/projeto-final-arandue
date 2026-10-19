import React from 'react';
import ThemedSelect from './ThemedSelect';

/**
 * Reusable FormField component
 * Supports input, textarea, and select with unified styling, labels, and error states.
 */
export default function FormField({
  label,
  id,
  name,
  type = 'text',
  as = 'input',
  error,
  required = false,
  helpText,
  options = [],
  className = '',
  children,
  ...props
}) {
  const fieldId = id || name;

  const baseInputClasses = `w-full px-3.5 py-2.5 text-sm rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed ${
    error
      ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20'
      : 'border-gray-200 bg-white text-gray-900 focus:border-indigo-500 focus:ring-indigo-500/20'
  } ${className}`;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-semibold"
          style={{ color: 'var(--text-main)' }}
        >
          {label}
          {required && <span className="text-rose-500 ml-1" title="Campo obrigatório">*</span>}
        </label>
      )}

      {as === 'textarea' ? (
        <textarea
          id={fieldId}
          name={name || fieldId}
          rows={props.rows || 3}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : helpText ? `${fieldId}-help` : undefined}
          required={required}
          className={baseInputClasses}
          {...props}
        />
      ) : as === 'select' ? (
        <ThemedSelect
          id={fieldId}
          name={name || fieldId}
          label={label}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : helpText ? `${fieldId}-help` : undefined}
          required={required}
          error={error}
          options={options}
          className={className}
          {...props}
        >
          {children}
        </ThemedSelect>
      ) : (
        <input
          id={fieldId}
          name={name || fieldId}
          type={type}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : helpText ? `${fieldId}-help` : undefined}
          required={required}
          className={baseInputClasses}
          {...props}
        />
      )}

      {helpText && !error && (
        <p id={`${fieldId}-help`} className="text-xs text-gray-500">
          {helpText}
        </p>
      )}

      {error && (
        <p
          id={`${fieldId}-error`}
          role="alert"
          className="text-xs font-medium text-rose-600 flex items-center gap-1"
        >
          {error}
        </p>
      )}
    </div>
  );
}

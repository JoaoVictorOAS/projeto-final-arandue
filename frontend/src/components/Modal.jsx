import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable accessible Modal dialog component
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-lg',
  showCloseButton = true,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Prevent background scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Box */}
      <div
        className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-10 my-8 transform transition-all animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <h2
            id="modal-title"
            className="text-lg font-bold text-gray-900 leading-tight"
          >
            {title}
          </h2>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(85vh-8rem)] overflow-y-auto">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

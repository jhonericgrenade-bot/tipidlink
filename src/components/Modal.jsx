import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={onClose} 
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
        <div 
          className={`relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all my-4 sm:my-8 w-full ${maxWidth} border border-slate-100 animate-modal-pop z-10 flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 sm:px-6 sm:py-4 bg-white sticky top-0 z-10">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 sm:px-6 sm:py-5 max-h-[calc(100vh-8rem)] sm:max-h-[75vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

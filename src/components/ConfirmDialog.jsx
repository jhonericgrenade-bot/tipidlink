import React, { useState } from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import { Modal } from './Modal';

const ICONS = {
  danger: Trash2,
  warning: AlertTriangle,
  info: Info,
};

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Please Confirm',
  description,
  details,
  confirmLabel = 'Confirm',
  variant = 'warning',
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const Icon = ICONS[variant] || AlertTriangle;
  const isDanger = variant === 'danger';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm?.();
      onClose?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={isSubmitting ? () => {} : onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-5">
        <div className={`flex gap-3 rounded-2xl border p-3.5 ${
          isDanger ? 'border-rose-200 bg-rose-50' : variant === 'info' ? 'border-sky-200 bg-sky-50' : 'border-amber-200 bg-amber-50'
        }`}>
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isDanger ? 'bg-rose-100 text-rose-700' : variant === 'info' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'
          }`}>
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-5 text-slate-800">{description}</p>
            {details && <p className="mt-1.5 text-xs leading-5 text-slate-600">{details}</p>}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-600'
                : 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-600'
            }`}
          >
            {isSubmitting ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

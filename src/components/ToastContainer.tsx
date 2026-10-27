import React from 'react';
import { useSocial } from '../context/SocialContext';
import { Bell, Heart, CheckCircle2, AlertCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useSocial();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        return (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-2xl bg-neutral-900 border border-neutral-750 p-4 shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-5 fade-in duration-200"
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : toast.type === 'alert' ? (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              ) : (
                <Bell className="w-4 h-4 text-indigo-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-white truncate">{toast.title}</h5>
              <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="text-neutral-500 hover:text-white p-1 rounded-lg shrink-0 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

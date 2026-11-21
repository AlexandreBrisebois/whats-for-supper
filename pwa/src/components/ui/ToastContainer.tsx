'use client';

import { useUiStore } from '@/store/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

const TOAST_DURATION = 5000;

export function ToastContainer() {
  const toasts = useUiStore((state) => state.toasts);
  const removeToast = useUiStore((state) => state.removeToast);

  return (
    <div className="flex flex-col items-center gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: any; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (toast.persistent) return;

    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, [toast.id, toast.persistent, onDismiss]);

  const icons = {
    success: <CheckCircle2 size={18} className="text-garden-ink" aria-hidden="true" />,
    error: <AlertCircle size={18} className="text-hearth-ink" aria-hidden="true" />,
    info: <Info size={18} className="text-sunlight-ink" aria-hidden="true" />,
    loading: <Loader2 size={18} className="text-sunlight-ink animate-spin" aria-hidden="true" />,
  };

  const borderColors = {
    success: 'border-garden-line border-l-sage-700',
    error: 'border-hearth-line border-l-terracotta',
    info: 'border-sunlight-line border-l-ochre-700',
    loading: 'border-sunlight-line border-l-ochre-700',
  };

  return (
    <motion.div
      data-testid="toast"
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={cn(
        'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border border-l-4 bg-white shadow-card min-w-[200px] max-w-sm',
        borderColors[toast.type as keyof typeof borderColors] || borderColors.info
      )}
    >
      <div className="flex-shrink-0">{icons[toast.type as keyof typeof icons] || icons.info}</div>
      <p className="text-sm font-bold text-ink-body leading-tight flex-1">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        title="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full hover:bg-charcoal-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
      >
        <X size={16} className="text-ink-muted" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

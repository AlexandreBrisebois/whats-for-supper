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
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons = {
    success: <CheckCircle2 size={18} className="text-sage" />,
    error: <AlertCircle size={18} className="text-terracotta" />,
    info: <Info size={18} className="text-ochre" />,
    loading: <Loader2 size={18} className="text-ochre animate-spin" />,
  };

  const borderColors = {
    success: 'border-sage/30 border-l-sage',
    error: 'border-terracotta/30 border-l-terracotta',
    info: 'border-ochre/30 border-l-ochre',
    loading: 'border-ochre/30 border-l-ochre',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={cn(
        'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border border-l-4 bg-white/95 backdrop-blur-md shadow-glass min-w-[200px] max-w-sm',
        borderColors[toast.type as keyof typeof borderColors] || borderColors.info
      )}
    >
      <div className="flex-shrink-0">{icons[toast.type as keyof typeof icons] || icons.info}</div>
      <p className="text-sm font-bold text-charcoal leading-tight flex-1">{toast.message}</p>
      <button
        aria-label="Dismiss notification"
        title="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-1 rounded-full hover:bg-black/5 transition-colors"
      >
        <X size={14} className="text-charcoal/40" />
      </button>
    </motion.div>
  );
}

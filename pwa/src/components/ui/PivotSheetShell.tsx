'use client';

import React, {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/locales';

function subscribeReducedMotion(onStoreChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener?.('change', onStoreChange);
  return () => media.removeEventListener?.('change', onStoreChange);
}

function getReducedMotionSnapshot() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, () => false);
}

export interface PivotSheetShellProps {
  /** Locked top-left eyebrow title (e.g. "Plan B", "Planner options", "Other plans") */
  eyebrow: string;
  /** Optional secondary line under eyebrow (e.g. "Step 1 of 2" or formatted date) */
  subtitle?: ReactNode;
  /** Optional id for the subtitle element (useful when combining aria-labelledby) */
  subtitleId?: string;
  /** Optional 2-step progress strip rendered under the locked header */
  stepProgress?: { current: 1 | 2; total: 2 };
  /** Show top-right Back pill button beside Close when provided */
  onBack?: () => void;
  backLabel?: string;
  backTestId?: string;
  /** Close handler (backdrop click, Escape, and top-right Close button) */
  onClose: () => void;
  closeTestId?: string;
  /** Disables Back, Close, backdrop dismissal, and Escape while true */
  pending?: boolean;
  /** Optional consistent minimum height on >= 375px viewports to prevent vertical title shift across steps */
  consistentMinHeight?: boolean;
  /** Optional custom aria-labelledby (defaults to internal eyebrow heading id) */
  ariaLabelledBy?: string;
  /** Test IDs for the sheet container, backdrop, and eyebrow title */
  panelTestId?: string;
  backdropTestId?: string;
  titleTestId?: string;
  /** Stacking layer class (e.g. z-[70], z-[80], z-[100]) */
  zIndexClass?: string;
  /** Focus the close button on mount and trap Tab navigation inside the sheet */
  trapFocus?: boolean;
  /** Fallback CSS selector to focus when restoring focus on unmount */
  restoreFocusSelector?: string;
  /** Optional extra panel classes */
  panelClassName?: string;
  children: ReactNode;
}

export function PivotSheetShell({
  eyebrow,
  subtitle,
  subtitleId,
  stepProgress,
  onBack,
  backLabel,
  backTestId,
  onClose,
  closeTestId,
  pending = false,
  consistentMinHeight = false,
  ariaLabelledBy,
  panelTestId,
  backdropTestId,
  titleTestId,
  zIndexClass = 'z-[100]',
  trapFocus = false,
  restoreFocusSelector,
  panelClassName,
  children,
}: PivotSheetShellProps) {
  const generatedTitleId = useId();
  const reducedMotion = usePrefersReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!trapFocus) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      if (previous?.isConnected) {
        previous.focus();
      } else if (restoreFocusSelector) {
        document.querySelector<HTMLElement>(restoreFocusSelector)?.focus();
      }
    };
  }, [trapFocus, restoreFocusSelector]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !pending) {
      event.stopPropagation();
      onClose();
      return;
    }
    if (!trapFocus || event.key !== 'Tab') return;
    const controls = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const resolvedLabelledBy =
    ariaLabelledBy ?? (subtitleId ? `${generatedTitleId} ${subtitleId}` : generatedTitleId);

  return (
    <div
      className={cn(
        'fixed inset-0 flex items-end justify-center sm:items-center px-[12px] min-[360px]:px-4 pb-4 pt-4',
        zIndexClass
      )}
      onKeyDown={handleKeyDown}
    >
      <motion.div
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reducedMotion ? { duration: 0 } : undefined}
        onClick={pending ? undefined : onClose}
        data-testid={backdropTestId}
        aria-hidden="true"
        className="absolute inset-0 bg-charcoal/45 backdrop-blur-sm"
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedLabelledBy}
        aria-busy={pending}
        data-testid={panelTestId}
        initial={reducedMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
        transition={
          reducedMotion ? { duration: 0 } : { type: 'spring', damping: 26, stiffness: 240 }
        }
        className={cn(
          'relative flex w-full max-w-[24rem] flex-col overflow-hidden rounded-[2rem] border border-chrome-line bg-cream p-5 shadow-2xl',
          'max-h-[calc(100dvh-2rem-env(safe-area-inset-bottom))]',
          consistentMinHeight &&
            'min-[375px]:min-h-[min(564px,calc(100dvh-2rem-env(safe-area-inset-bottom)))]',
          panelClassName
        )}
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2
              id={generatedTitleId}
              data-testid={titleTestId}
              className="break-words [overflow-wrap:anywhere] font-heading text-sm font-bold leading-tight text-hearth-ink"
            >
              {eyebrow}
            </h2>
            {subtitle && (
              <div
                id={subtitleId}
                className="mt-0.5 break-words [overflow-wrap:anywhere] text-xs font-medium leading-tight text-ink-muted"
              >
                {subtitle}
              </div>
            )}
          </div>

          <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">
            {onBack && (
              <button
                type="button"
                disabled={pending}
                onClick={pending ? undefined : onBack}
                data-testid={backTestId}
                className="inline-flex min-h-12 max-w-full items-center justify-center gap-1.5 rounded-full border border-chrome-line bg-white px-3.5 text-sm font-semibold text-hearth-ink hover:border-hearth-line hover:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:cursor-not-allowed disabled:opacity-40 transition-colors motion-reduce:transition-none"
              >
                <ArrowLeft size={16} aria-hidden="true" className="shrink-0" />
                <span>{backLabel ?? t('common.back', 'Back')}</span>
              </button>
            )}
            <button
              ref={closeRef}
              type="button"
              disabled={pending}
              onClick={pending ? undefined : onClose}
              data-testid={closeTestId}
              aria-label={t('common.close', 'Close')}
              title={t('common.close', 'Close')}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-chrome-line bg-white text-ink-muted hover:bg-charcoal-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:cursor-not-allowed disabled:opacity-40 transition-colors motion-reduce:transition-none"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        {stepProgress && (
          <div className="mt-3 grid shrink-0 grid-cols-2 gap-2" aria-hidden="true">
            <div
              className={cn(
                'h-1 rounded-full transition-colors',
                stepProgress.current === 1 ? 'bg-hearth-fill' : 'bg-hearth-line'
              )}
            />
            <div
              className={cn(
                'h-1 rounded-full transition-colors',
                stepProgress.current === 2 ? 'bg-hearth-fill' : 'bg-chrome-line'
              )}
            />
          </div>
        )}

        <div className="mt-3.5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
      </motion.div>
    </div>
  );
}

interface SheetMealContextProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  testId?: string;
  showDivider?: boolean;
}

/**
 * Non-clickable editorial meal context rendered directly on warm cream beside
 * a 3.5px terracotta bar — never boxed like an interactive white card.
 */
export function SheetMealContext({
  eyebrow,
  title,
  subtitle,
  testId,
  showDivider = true,
}: SheetMealContextProps) {
  return (
    <div>
      <div className="flex items-stretch gap-3" data-testid={testId}>
        <span aria-hidden="true" className="w-[3.5px] shrink-0 rounded-full bg-hearth-fill" />
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-xs font-semibold leading-snug text-hearth-ink">{eyebrow}</p>
          )}
          <h3 className="mt-0.5 break-words font-heading text-lg font-extrabold leading-snug tracking-tight text-ink-body">
            {title}
          </h3>
        </div>
      </div>
      {subtitle && (
        <p className="mt-2 text-xs font-medium leading-relaxed text-ink-muted">{subtitle}</p>
      )}
      {showDivider && <hr className="my-3.5 border-0 border-t border-chrome-line" />}
    </div>
  );
}

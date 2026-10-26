'use client';

import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { X } from 'lucide-react';
import { t } from '@/locales';

/** A small native modal using the app's existing sheet/dialog surfaces. */
export function DemoDialog({
  title,
  description,
  children,
  onClose,
  returnFocus,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
  returnFocus?: RefObject<HTMLElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const node = dialog.current;
    const focusTarget = returnFocus?.current;
    node?.showModal();
    heading.current?.focus();
    return () => {
      node?.close();
      if (focusTarget?.isConnected) focusTarget.focus();
    };
  }, [returnFocus]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = dialog.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]'
        );
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === heading.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[calc(100dvh-2rem)] w-full max-w-none overflow-y-auto rounded-t-[2rem] border border-charcoal/15 bg-cream p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-charcoal shadow-2xl backdrop:bg-charcoal/45 sm:inset-0 sm:m-auto sm:max-w-md sm:rounded-[2rem]"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2
          ref={heading}
          id={titleId}
          tabIndex={-1}
          className="font-heading text-2xl font-bold leading-tight focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close', 'Close')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-charcoal/5 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <p id={descriptionId} className="text-sm leading-relaxed">
        {description}
      </p>
      <div className="mt-4 space-y-4">{children}</div>
    </dialog>
  );
}

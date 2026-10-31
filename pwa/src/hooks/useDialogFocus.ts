'use client';

import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';

/** Focus ownership for the active recipe chooser or acquisition sheet. */
export function useDialogFocus(onClose: () => void, returnFocus?: RefObject<HTMLElement | null>) {
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const trigger = returnFocus?.current ?? (document.activeElement as HTMLElement | null);
    panelRef.current
      ?.querySelector<HTMLElement>('button:not(:disabled), [href], input:not(:disabled)')
      ?.focus();
    return () => {
      if (trigger?.isConnected) trigger.focus();
    };
  }, [returnFocus]);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
    );
    const first = controls?.[0];
    const last = controls?.[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  return { panelRef, onKeyDown };
}

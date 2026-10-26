'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { CircleHelp } from 'lucide-react';
import { useDemoMode } from '@/components/demo/DemoModeProvider';
import { DemoDialog } from '@/components/demo/DemoDialog';
import { useFamilyStore } from '@/store/familyStore';
import { useUiStore } from '@/store/uiStore';
import { useCaptureStore } from '@/store/captureStore';
import { usePdfCaptureStore } from '@/store/pdfCaptureStore';
import { DEMO_CONTEXT_ACK_KEY, useDemoContextVisit } from '@/store/demoContextStore';
import { t } from '@/locales';

export function DemoContext() {
  const { mode } = useDemoMode();
  return mode === false ? null : <DemoContextState mode={mode} />;
}

function DemoContextState({ mode }: { mode: boolean | null }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const member = useFamilyStore((s) => s.selectedFamilyMemberId);
  const familyReady = useFamilyStore((s) => s.hasLoaded && !s.isLoading);
  const busy = useUiStore((s) => s.isLoading);
  const pending = useCaptureStore((s) => s.pendingRecipes.length > 0);
  const pdf = usePdfCaptureStore((s) => Boolean(s.selection));
  const visit = useDemoContextVisit();
  const [dialogOwner] = useState(() => ({}));
  const open = visit.openPath === pathname && visit.openOwner === dialogOwner;
  const band = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const state = useDemoContextVisit.getState();
    if (state.eligibleEntry === null)
      useDemoContextVisit.setState({ eligibleEntry: pathname === '/home' && params.size === 0 });
    if (!state.storageRead) {
      let acknowledged = state.acknowledged;
      try {
        acknowledged ||= localStorage.getItem(DEMO_CONTEXT_ACK_KEY) === 'true';
      } catch {
        /* Visit memory remains usable. */
      }
      useDemoContextVisit.setState({ storageRead: true, acknowledged });
    }
  }, [pathname, params]);

  useEffect(() => {
    const interact = () => useDemoContextVisit.setState({ interacted: true });
    document.addEventListener('pointerdown', interact, true);
    document.addEventListener('keydown', interact, true);
    document.addEventListener('wheel', interact, { capture: true, passive: true });
    return () => {
      document.removeEventListener('pointerdown', interact, true);
      document.removeEventListener('keydown', interact, true);
      document.removeEventListener('wheel', interact, true);
    };
  }, []);

  useEffect(() => {
    if (busy || pending || pdf) {
      if (!visit.interacted) useDemoContextVisit.setState({ interacted: true });
      return;
    }
    if (
      mode !== true ||
      pathname !== '/home' ||
      !member ||
      !familyReady ||
      !visit.storageRead ||
      !visit.eligibleEntry ||
      visit.acknowledged ||
      visit.presented ||
      visit.interacted
    )
      return;
    if (document.querySelector('dialog[open], [role="dialog"], [aria-modal="true"]')) {
      // Do not queue a later interruption after the other task finishes.
      useDemoContextVisit.setState({ interacted: true });
      return;
    }
    useDemoContextVisit.setState({ presented: true, openPath: pathname, openOwner: dialogOwner });
  }, [mode, pathname, member, familyReady, busy, pending, pdf, visit, dialogOwner]);

  useEffect(() => {
    if (useDemoContextVisit.getState().openPath !== pathname)
      useDemoContextVisit.setState({ openPath: null });
  }, [pathname]);

  const dismiss = () => {
    useDemoContextVisit.setState({ acknowledged: true, openPath: null });
    try {
      localStorage.setItem(DEMO_CONTEXT_ACK_KEY, 'true');
    } catch {
      /* No repeated introduction in this visit. */
    }
  };

  if (mode !== true) return null;
  return (
    <div
      className="relative z-40 bg-cream pt-[env(safe-area-inset-top)] text-charcoal"
      data-testid="demo-context"
    >
      <button
        ref={band}
        type="button"
        data-testid="demo-context-band"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          useDemoContextVisit.setState({ presented: true });
          useDemoContextVisit.setState({ openPath: pathname, openOwner: dialogOwner });
        }}
        className="group flex min-h-8 w-full items-center bg-sage-100 p-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-charcoal"
      >
        <span
          data-testid="demo-context-strip"
          className="flex min-h-8 w-full items-center justify-center gap-2 bg-sage-100 px-4 py-1 text-[0.8125rem] leading-[1.125rem] font-medium group-hover:bg-sage-200 group-active:bg-sage-300"
        >
          <CircleHelp size={16} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">
            {t('demoContext.label', 'Demo · What to know')}
          </span>
        </span>
      </button>
      {open && (
        <DemoDialog
          title={t('demoContext.label', 'Demo · What to know')}
          description={t(
            'demoContext.shared',
            'Welcome to What’s for Supper! You’re sharing this demo with other visitors, just like a family sharing the app. You’ll see their changes as you explore, and they’ll see yours.'
          )}
          onClose={dismiss}
          returnFocus={band}
          showTitleFocusOutline={false}
        >
          <p className="text-sm leading-relaxed">
            {t(
              'demoContext.temporary',
              'Try things out! Your changes are temporary and will be reset. Please don’t add personal information.'
            )}
          </p>
          <p className="text-sm leading-relaxed">
            {t(
              'demoContext.aiUnavailable',
              'AI capture and generation are turned off in this demo. Explore the recipes we’ve prepared for you instead.'
            )}
          </p>
          <p className="text-sm leading-relaxed">
            {t(
              'demoHosting.body',
              'When you set up your own What’s for Supper, AI features require your own subscription.'
            )}
          </p>
          <a
            href="https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/docs/install/quick-start.md"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            {t('demoHosting.link', 'Set up your own household')}
          </a>
          <button
            type="button"
            onClick={dismiss}
            className="min-h-11 w-full rounded-xl bg-sage-700 px-4 py-3 font-semibold text-white hover:bg-sage-800 active:bg-sage-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
          >
            {t('demoContext.start', 'Start exploring')}
          </button>
        </DemoDialog>
      )}
    </div>
  );
}

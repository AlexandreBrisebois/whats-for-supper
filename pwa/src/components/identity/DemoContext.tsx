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
      className="relative z-40 bg-[#6b21a8] pt-[env(safe-area-inset-top)] text-white"
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
        className="flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold hover:bg-[#581c87] active:bg-[#581c87] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
      >
        <CircleHelp size={18} aria-hidden="true" />
        {t('demoContext.label', 'Demo · What to know')}
      </button>
      {open && (
        <DemoDialog
          title={t('demoContext.label', 'Demo · What to know')}
          description={t(
            'demoContext.shared',
            'This sample household is shared with other visitors. They may change it while you explore.'
          )}
          onClose={dismiss}
          returnFocus={band}
        >
          <p className="text-sm leading-relaxed">
            {t(
              'demoContext.temporary',
              'Your changes are temporary and may be reset. Please avoid personal information.'
            )}
          </p>
          <p className="text-sm leading-relaxed">
            {t(
              'demoContext.aiUnavailable',
              'AI capture and generation are unavailable in this demo. Explore the prepared recipes and originals instead.'
            )}
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="min-h-11 w-full rounded-xl bg-[#6b21a8] px-4 py-3 font-semibold text-white hover:bg-[#581c87] active:bg-[#581c87] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b21a8]"
          >
            {t('demoContext.start', 'Start exploring')}
          </button>
        </DemoDialog>
      )}
    </div>
  );
}

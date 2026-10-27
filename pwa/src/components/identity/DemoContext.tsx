'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useDemoMode } from '@/components/demo/DemoModeProvider';
import { DemoExplanation } from './DemoExplanation';
import { useFamilyStore } from '@/store/familyStore';
import { useUiStore } from '@/store/uiStore';
import { useCaptureStore } from '@/store/captureStore';
import { usePdfCaptureStore } from '@/store/pdfCaptureStore';
import {
  acknowledgeDemoContext,
  readDemoContextAcknowledgement,
  useDemoContextVisit,
} from '@/store/demoContextStore';

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

  useEffect(() => {
    const state = useDemoContextVisit.getState();
    if (state.eligibleEntry === null)
      useDemoContextVisit.setState({ eligibleEntry: pathname === '/home' && params.size === 0 });
    readDemoContextAcknowledgement();
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

  if (mode !== true) return null;
  return (
    <DemoExplanation
      open={open}
      onOpen={() => {
        useDemoContextVisit.setState({
          presented: true,
          openPath: pathname,
          openOwner: dialogOwner,
        });
      }}
      onDismiss={acknowledgeDemoContext}
    />
  );
}

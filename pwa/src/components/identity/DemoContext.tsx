'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useDemoMode } from '@/components/demo/DemoModeProvider';
import { DemoExplanation } from './DemoExplanation';
import { useInstallIdentity } from './IdentityHint';
import { useFamilyStore } from '@/store/familyStore';
import { useUiStore } from '@/store/uiStore';
import { useCaptureStore } from '@/store/captureStore';
import { usePdfCaptureStore } from '@/store/pdfCaptureStore';
import {
  acknowledgeContext,
  readContextAcknowledgement,
  useDemoContextVisit,
} from '@/store/demoContextStore';

export function DemoContext() {
  const { mode } = useDemoMode();
  return <DemoContextState mode={mode} />;
}

function DemoContextState({ mode }: { mode: boolean | null }) {
  const identity = useInstallIdentity();
  const contextMode =
    mode === true
      ? 'demo'
      : mode === false && !identity.demo && identity.channel === 'beta'
        ? 'beta'
        : null;
  const pathname = usePathname();
  const params = useSearchParams();
  const member = useFamilyStore((s) => s.selectedFamilyMemberId);
  const familyReady = useFamilyStore((s) => s.hasLoaded && !s.isLoading);
  const busy = useUiStore((s) => s.isLoading);
  const pending = useCaptureStore((s) => s.pendingRecipes.length > 0);
  const pdf = usePdfCaptureStore((s) => Boolean(s.selection));
  const visit = useDemoContextVisit();
  const [dialogOwner] = useState(() => ({}));
  const open =
    visit.openPath === pathname &&
    visit.openOwner === dialogOwner &&
    visit.openMode === contextMode;
  const acknowledged = contextMode === 'beta' ? visit.betaAcknowledged : visit.acknowledged;
  const storageRead = contextMode === 'beta' ? visit.betaStorageRead : visit.storageRead;

  useEffect(() => {
    const state = useDemoContextVisit.getState();
    if (state.eligibleEntry === null)
      useDemoContextVisit.setState({ eligibleEntry: pathname === '/home' && params.size === 0 });
    const resolved = mode === null ? null : (contextMode ?? 'none');
    if (resolved && state.resolvedMode !== resolved) {
      useDemoContextVisit.setState({
        resolvedMode: resolved,
        ...(state.resolvedMode !== null
          ? { interacted: true, openPath: null, openMode: null }
          : {}),
      });
    }
    if (contextMode) readContextAcknowledgement(contextMode);
  }, [pathname, params, contextMode, mode]);

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
      !contextMode ||
      pathname !== '/home' ||
      !member ||
      !familyReady ||
      !storageRead ||
      !visit.eligibleEntry ||
      acknowledged ||
      visit.presented ||
      useDemoContextVisit.getState().interacted
    )
      return;
    if (document.querySelector('dialog[open], [role="dialog"], [aria-modal="true"]')) {
      // Do not queue a later interruption after the other task finishes.
      useDemoContextVisit.setState({ interacted: true });
      return;
    }
    useDemoContextVisit.setState({
      presented: true,
      openPath: pathname,
      openOwner: dialogOwner,
      openMode: contextMode,
    });
  }, [
    contextMode,
    pathname,
    member,
    familyReady,
    busy,
    pending,
    pdf,
    visit,
    dialogOwner,
    acknowledged,
    storageRead,
  ]);

  useEffect(() => {
    const state = useDemoContextVisit.getState();
    if (state.openPath !== pathname || state.openMode !== contextMode)
      useDemoContextVisit.setState({ openPath: null, openMode: null });
  }, [pathname, contextMode]);

  if (!contextMode) return null;
  return (
    <DemoExplanation
      key={contextMode}
      mode={contextMode}
      beta={contextMode === 'demo' && identity.channel === 'beta'}
      open={open}
      onOpen={() => {
        useDemoContextVisit.setState({
          presented: true,
          openPath: pathname,
          openOwner: dialogOwner,
          openMode: contextMode,
        });
      }}
      onDismiss={() => acknowledgeContext(contextMode)}
    />
  );
}

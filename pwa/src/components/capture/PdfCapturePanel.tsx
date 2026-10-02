'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFamilyStore } from '@/store/familyStore';
import { useFeatureFlagStore } from '@/store/featureFlagStore';
import { usePdfCaptureStore } from '@/store/pdfCaptureStore';
import { useCaptureStore } from '@/store/captureStore';
import { createPdfRecipe } from '@/lib/api/recipes';
import { claimSharedPdf, discardSharedPdf } from '@/lib/pdfShare';
import { PdfCaptureConfirmation } from './PdfCaptureConfirmation';
import { t } from '@/locales';

export function PdfCapturePanel({ isGoto, resetPhotos }: { isGoto: boolean; resetPhotos: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const selection = usePdfCaptureStore((state) => state.selection);
  const memberId = useFamilyStore((state) => state.selectedFamilyMemberId);
  const flags = useFeatureFlagStore();
  const [shareError, setShareError] = useState<string | null>(null);
  const token = params.get('share');
  const processedToken = useRef<string | null>(null);
  const mounted = useRef(true);
  const reset = useCallback(() => {
    const current = usePdfCaptureStore.getState().selection;
    if (!current) return;
    if (current?.shareToken) void discardSharedPdf(current.shareToken);
    usePdfCaptureStore.getState().reset(current?.generation);
    resetPhotos();
  }, [resetPhotos]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; reset(); };
  }, [reset]);
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        reset();
        if (token) void discardSharedPdf(token);
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [reset, token]);
  useEffect(() => {
    if (selection && selection.memberId !== memberId) reset();
  }, [memberId, selection, reset]);
  useEffect(() => {
    if (!token || processedToken.current === token) return;
    processedToken.current = token;
    let active = true;
    // A share is consumed exactly once. Unlock/member changes never restore it.
    void (async () => {
      try {
        if (!memberId || isGoto) { await discardSharedPdf(token); return; }
        const shared = await claimSharedPdf(token);
        if (!active || !mounted.current || useFamilyStore.getState().selectedFamilyMemberId !== memberId) return;
        if (!shared) throw new Error('Share expired.');
        resetPhotos();
        usePdfCaptureStore.getState().select(shared.file, memberId, token);
        setShareError(null);
      } catch {
        if (active) setShareError(t('capture.pdf.restart', 'Choose or share the PDF again.'));
      }
    })();
    return () => { active = false; void discardSharedPdf(token); };
  }, [token, memberId, isGoto, resetPhotos]);

  if (!selection) return shareError || params.get('pdfShareError') ? (
    <p role="alert" className="text-sm text-pink">{shareError || t('capture.pdf.restart', 'Choose or share the PDF again.')}</p>
  ) : null;
  if (isGoto || selection.memberId !== memberId) return null;
  const resolved = flags.memberId === memberId && !flags.loading;
  const flag = flags.flags['preview-pdf-recipe-import'];
  const enabled = resolved && !flags.error && flag?.enabled === true;
  if (!resolved) return <p role="status">{t('capture.pdf.loading', 'Loading preview features…')}</p>;
  if (!enabled) return (
    <section data-testid="pdf-disabled" className="flex flex-col gap-5">
      <p>{t('capture.pdf.disabled', 'PDF import preview isn’t enabled. This file hasn’t been added.')}</p>
      {flag?.mode === 'opt-in' && <button type="button" onClick={() => { reset(); router.push('/profile/settings'); }}>
        {t('capture.pdf.previewFeatures', 'Preview features')}
      </button>}
      <button type="button" onClick={() => { reset(); router.replace('/capture'); }}>
        {t('capture.pdf.chooseAnotherWay', 'Choose another way')}
      </button>
    </section>
  );
  return <PdfCaptureConfirmation key={selection.generation} file={selection.file} enabled onSave={async (rating, notes) => {
    const submitted = selection;
    const id = await createPdfRecipe(submitted.file, rating, notes, submitted.memberId);
    useCaptureStore.getState().addPending({ recipeId: id });
    const current = usePdfCaptureStore.getState().selection;
    if (mounted.current && current?.generation === submitted.generation && current.memberId === useFamilyStore.getState().selectedFamilyMemberId) {
      reset();
      router.push('/home');
    }
  }} />;
}

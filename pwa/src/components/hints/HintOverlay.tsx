'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';

import type { HintStep } from '@/types/domain';
import type { Locale } from '@/lib/i18n';
import { t, tWithVars } from '@/locales';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface HintOverlayProps {
  isActive: boolean;
  step: HintStep;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  onTargetMissed?: () => void;
  locale: Locale;
}

export function HintOverlay({
  isActive,
  step,
  stepNumber,
  totalSteps,
  onNext,
  onSkip,
  onTargetMissed,
  locale,
}: HintOverlayProps) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const onTargetMissedRef = useRef(onTargetMissed);
  onTargetMissedRef.current = onTargetMissed;

  const measureTarget = useCallback(() => {
    if (!step.targetSelector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.targetSelector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = step.highlightPadding ?? 8;
    setRect({
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    });
  }, [step.targetSelector, step.highlightPadding]);

  useEffect(() => {
    if (!isActive) return;
    // Small delay so the DOM settles after step transitions
    const id = requestAnimationFrame(measureTarget);
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, { passive: true });
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget);
    };
  }, [isActive, measureTarget]);

  // Auto-advance when the target element is missing (e.g. form not yet open)
  useEffect(() => {
    if (!isActive || rect !== null || !step.targetSelector) return;
    // Give the DOM one more frame to settle before deciding the target is truly absent
    const id = requestAnimationFrame(() => {
      const el = document.querySelector(step.targetSelector!);
      if (!el) {
        onTargetMissedRef.current?.();
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isActive, rect, step.targetSelector]);

  if (!isActive) return null;

  const isLastStep = stepNumber >= totalSteps - 1;
  const titleText = step.titleKey ? t(step.titleKey, '', locale) : '';
  const descText = step.descriptionKey ? t(step.descriptionKey, '', locale) : '';
  const ctaText = step.actionKey
    ? t(step.actionKey, isLastStep ? 'Got it!' : 'Next', locale)
    : isLastStep
      ? t('buttons.done', 'Got it!', locale)
      : t('buttons.next', 'Next', locale);
  const progressText = tWithVars(
    'progress.step',
    'Step {{current}} of {{total}}',
    { current: stepNumber + 1, total: totalSteps },
    locale
  );

  const popoverStyle = buildPopoverStyle(rect, step.position ?? 'bottom');
  const showSkip = step.allowSkip !== false && !isLastStep;

  return (
    <>
      {/* Spotlight — sits over the target, box-shadow creates the dark overlay */}
      {rect ? (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: '8px',
            // Sage green ring → terracotta glow → dark backdrop
            boxShadow: [
              '0 0 0 4px rgba(75, 93, 77, 0.9)',
              '0 0 20px 10px rgba(178, 94, 76, 0.45)',
              '0 0 0 9999px rgba(45, 49, 46, 0.72)',
            ].join(', '),
            zIndex: 50,
            pointerEvents: 'none',
          }}
        />
      ) : (
        // No target found — full-screen dim backdrop
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(45, 49, 46, 0.72)',
            zIndex: 50,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Popover card */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label={titleText || progressText}
        style={{ ...popoverStyle, zIndex: 51 }}
        className="pointer-events-auto w-72 rounded-2xl bg-cream p-4 shadow-card"
      >
        {titleText && (
          <p className="mb-1 text-sm font-semibold text-charcoal">{titleText}</p>
        )}
        {descText && (
          <p className="mb-3 text-sm leading-relaxed text-charcoal-400">{descText}</p>
        )}

        <p className="mb-3 text-xs font-medium text-sage-green-600">{progressText}</p>

        <div className="flex items-center gap-2">
          {showSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-charcoal-400 underline underline-offset-2 hover:text-charcoal transition-colors"
            >
              {t('buttons.skip', 'Skip', locale)}
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="ml-auto rounded-lg bg-sage-green px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-sage-green-700 active:scale-95"
          >
            {ctaText}
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPopoverStyle(
  rect: SpotlightRect | null,
  position: NonNullable<HintStep['position']>
): CSSProperties {
  const GAP = 16;
  const POPOVER_W = 288; // w-72 = 18rem = 288px

  if (!rect || typeof window === 'undefined') {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const clampX = (x: number) => Math.min(Math.max(x, 8), window.innerWidth - POPOVER_W - 8);
  const centeredX = clampX(rect.left + rect.width / 2 - POPOVER_W / 2);

  switch (position) {
    case 'top':
      return {
        position: 'fixed',
        bottom: window.innerHeight - rect.top + GAP,
        left: centeredX,
      };
    case 'bottom':
      return {
        position: 'fixed',
        top: rect.top + rect.height + GAP,
        left: centeredX,
      };
    case 'left':
      return {
        position: 'fixed',
        top: Math.max(rect.top + rect.height / 2 - 80, 8),
        right: window.innerWidth - rect.left + GAP,
      };
    case 'right':
      return {
        position: 'fixed',
        top: Math.max(rect.top + rect.height / 2 - 80, 8),
        left: rect.left + rect.width + GAP,
      };
  }
}

'use client';

import { Check } from 'lucide-react';
import { PreparationStatus } from '@/components/planner/PreparationStatus';
import { CookedSuccessCard } from '@/components/home/HomeSections';
import type { SupperPreparation } from '@/lib/api/generated/models/index';

interface HomeCookedStatusSectionProps {
  isCooked: boolean;
  preparation: SupperPreparation | null | undefined;
  cookedDismissed: boolean;
  onCookMode: () => void;
  onDismissCelebration: () => void;
}

export function HomeCookedStatusSection({
  isCooked,
  preparation,
  cookedDismissed,
  onCookMode,
  onDismissCelebration,
}: HomeCookedStatusSectionProps) {
  if (!isCooked) return null;

  if (preparation) {
    return (
      <button
        type="button"
        onClick={onCookMode}
        className="w-full rounded-2xl border border-garden-line bg-sage/10 p-5 text-left"
      >
        <PreparationStatus preparation={preparation} />
      </button>
    );
  }

  if (!cookedDismissed) {
    return <CookedSuccessCard onDismiss={onDismissCelebration} />;
  }

  return (
    <button
      data-testid="cooked-compact-badge"
      onClick={onCookMode}
      className="flex items-center gap-3 w-full bg-sage-50 border border-garden-line rounded-2xl px-5 py-4 transition-all active:scale-[0.98] hover:bg-sage-100"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-100 text-garden-ink flex-shrink-0">
        <Check size={20} strokeWidth={3} />
      </div>
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-sm font-bold text-garden-ink leading-none">Cooked tonight!</span>
        <span className="text-xs font-medium text-garden-ink">Tap to open Cook&apos;s Mode</span>
      </div>
    </button>
  );
}

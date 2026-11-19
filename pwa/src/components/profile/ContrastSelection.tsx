'use client';

import { useId } from 'react';
import { Check, Contrast } from 'lucide-react';
import { useContrast } from '@/components/common/ContrastProvider';
import { useLocale } from '@/components/common/LocaleProvider';
import type { ContrastMode } from '@/lib/contrast';
import { useFamilyStore } from '@/store/familyStore';
import { t } from '@/locales';

export function ContrastSelection() {
  const headingId = useId();
  const { locale } = useLocale();
  const { contrastMode, setLocalContrastMode } = useContrast();
  const selectedFamilyMemberId = useFamilyStore((s) => s.selectedFamilyMemberId);
  const familyMembers = useFamilyStore((s) => s.familyMembers);
  const updateMemberPreferences = useFamilyStore((s) => s.updateMemberPreferences);

  const handleContrastChange = (next: ContrastMode) => {
    if (selectedFamilyMemberId) {
      const selectedMemberLoaded = familyMembers.some(
        (member) => member.id.toLowerCase() === selectedFamilyMemberId.toLowerCase()
      );
      if (!selectedMemberLoaded) {
        setLocalContrastMode(next);
      }
      void updateMemberPreferences(selectedFamilyMemberId, { contrastMode: next });
      return;
    }
    setLocalContrastMode(next);
  };

  return (
    <section
      role="group"
      aria-labelledby={headingId}
      className="w-full rounded-3xl bg-white/50 border border-chrome-line p-[20px] shadow-[0_6px_24px_-10px_rgba(31,41,55,0.12)]"
    >
      <div className="mb-4 flex items-center gap-3">
        <Contrast aria-hidden="true" className="h-5 w-5 text-hearth-ink" />
        <h2 id={headingId} className="text-base font-semibold text-ink-body">
          {t('profile.contrast', 'Contrast', locale)}
        </h2>
      </div>
      <div className="flex flex-wrap gap-3">
        {(['standard', 'high'] as const).map((choice) => {
          const isSelected = contrastMode === choice;
          return (
            <button
              key={choice}
              type="button"
              data-testid={`contrast-btn-${choice}`}
              aria-pressed={isSelected}
              onClick={() => handleContrastChange(choice)}
              className={[
                'flex min-h-12 min-w-12 flex-1 basis-[8rem] items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-base font-semibold scroll-mb-[calc(8rem+env(safe-area-inset-bottom))] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hearth-ink',
                isSelected
                  ? 'bg-terracotta-50 text-hearth-ink border-hearth-line hover:border-hearth-ink'
                  : 'bg-white/80 text-ink-body border-chrome-line hover:bg-cream active:bg-terracotta-50',
              ].join(' ')}
            >
              {isSelected && (
                <Check data-contrast-check aria-hidden="true" className="h-5 w-5 shrink-0" />
              )}
              {choice === 'standard'
                ? t('profile.contrastStandard', 'Standard', locale)
                : t('profile.contrastHigh', 'High contrast', locale)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

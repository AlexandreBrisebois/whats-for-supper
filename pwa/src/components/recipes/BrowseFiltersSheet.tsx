'use client';

import { useState } from 'react';
import { t } from '@/locales';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { FamilyGOTOSettings } from '@/components/profile/FamilyGOTOSettings';

export function BrowseFiltersSheet({
  gotoOnly,
  onApply,
  onClose,
  onAddGoto,
  manageGoto = false,
}: {
  gotoOnly: boolean;
  onApply: (gotoOnly: boolean) => void;
  onClose: () => void;
  onAddGoto?: () => void;
  manageGoto?: boolean;
}) {
  const [draft, setDraft] = useState(gotoOnly);
  const { panelRef, onKeyDown } = useDialogFocus(onClose);
  return (
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-charcoal/40 md:items-center md:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="browse-filters-title"
        className="[&>*]:shrink-0 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-charcoal flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-[2rem] bg-cream p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:rounded-[2rem]"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="browse-filters-title" className="font-heading text-xl font-black text-charcoal">
            {t('recipes.filterRecipes', 'Filter recipes')}
          </h2>
          <button
            data-testid="browse-filters-close"
            type="button"
            onClick={onClose}
            className="min-h-11 px-3 text-charcoal"
          >
            {t('common.close', 'Close')}
          </button>
        </div>
        <div className="py-5">
          <button
            type="button"
            data-testid="browse-filter-goto"
            aria-pressed={draft}
            onClick={() => setDraft(!draft)}
            className={`min-h-11 rounded-full border px-4 py-2 text-sm font-bold ${draft ? 'border-terracotta bg-terracotta text-white' : 'border-charcoal/10 bg-white text-charcoal'}`}
          >
            GOTO
          </button>
        </div>
        <FamilyGOTOSettings onAdd={onAddGoto} initiallyExpanded={manageGoto} />
        <div className="flex flex-wrap justify-end gap-3 py-3">
          <button
            type="button"
            data-testid="browse-filters-clear"
            onClick={() => setDraft(false)}
            className="min-h-11 px-4 font-bold text-charcoal"
          >
            {t('recipes.clearFilters', 'Clear filters')}
          </button>
          <button
            type="button"
            data-testid="browse-filters-apply"
            onClick={() => onApply(draft)}
            className="min-h-11 rounded-full bg-terracotta px-6 font-bold text-white"
          >
            {t('recipes.applyFilters', 'Apply')}
          </button>
        </div>
      </section>
    </div>
  );
}

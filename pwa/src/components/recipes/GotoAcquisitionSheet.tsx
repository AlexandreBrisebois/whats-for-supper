'use client';

import { useRouter } from 'next/navigation';
import type { RefObject } from 'react';
import { t } from '@/locales';
import { useDialogFocus } from '@/hooks/useDialogFocus';

export function GotoAcquisitionSheet({
  onClose,
  returnFocus,
}: {
  onClose: () => void;
  returnFocus?: RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const { panelRef, onKeyDown } = useDialogFocus(onClose, returnFocus);
  const choices = [
    {
      id: 'goto-search-library',
      label: t('familyGoto.search', 'Search the Library'),
      description: t(
        'familyGoto.searchDescription',
        'Find the recipe, then tap the star to make it your GOTO.'
      ),
      href: '/recipes',
    },
    {
      id: 'goto-describe',
      label: t('familyGoto.describe', 'Describe a Dish'),
      description: t(
        'familyGoto.describeDescription',
        'AI synthesizes a full recipe from your description'
      ),
      href: '/capture?intent=goto&mode=describe',
    },
    {
      id: 'goto-photo',
      label: t('familyGoto.capture', 'Take a Photo'),
      description: t(
        'familyGoto.captureDescription',
        'Photo of a recipe card, box, or handwritten note'
      ),
      href: '/capture?intent=goto&mode=photo',
    },
  ];
  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-charcoal/40 md:items-center md:p-6"
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
        aria-labelledby="goto-acquisition-title"
        onKeyDown={onKeyDown}
        className="[&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-charcoal max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-cream p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:rounded-[2rem]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="goto-acquisition-title" className="font-heading text-xl font-bold text-charcoal">
            {t('familyGoto.add', 'Add a GOTO')}
          </h2>
          <button
            type="button"
            data-testid="goto-acquisition-close"
            onClick={onClose}
            className="min-h-11 px-3 text-charcoal"
          >
            {t('familyGoto.close', 'Close')}
          </button>
        </div>
        <div className="space-y-3 py-4">
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              data-testid={choice.id}
              onClick={() => {
                onClose();
                router.push(choice.href);
              }}
              className="min-h-11 w-full rounded-2xl border border-charcoal/10 bg-white p-4 text-left text-charcoal"
            >
              <span className="block text-base font-bold">{choice.label}</span>
              <span className="mt-1 block text-sm text-charcoal-600">{choice.description}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

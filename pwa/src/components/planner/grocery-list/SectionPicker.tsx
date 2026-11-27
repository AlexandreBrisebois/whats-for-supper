import React from 'react';
import type { GroceryExtraDto, GroceryLineItemDto } from '@/lib/api/generated/models';
import type { GrocerySection } from '@/lib/grocery/aisleMapper';
import { AISLE_ORDER } from '@/lib/grocery/aisleOrder';
import { t } from '@/locales';

interface RecipeItemSectionPickerProps {
  item: GroceryLineItemDto;
  itemLabel: string;
  isPending: boolean;
  onSelectSection: (item: GroceryLineItemDto, section: GrocerySection) => void;
}

export function RecipeItemSectionPicker({
  item,
  itemLabel,
  isPending,
  onSelectSection,
}: RecipeItemSectionPickerProps) {
  return (
    <div
      className="mx-4 mb-2 flex flex-wrap gap-2 p-3 bg-charcoal/3 rounded-2xl"
      data-testid="section-picker"
      data-item-name={itemLabel}
      aria-busy={isPending}
    >
      {item.categoryStatus === 'conflict' && (
        <div className="w-full text-sm text-ink-muted">
          <p>
            {t(
              'grocery.categoryConflict',
              'Different saved sections apply. Choose one for this food.'
            )}
          </p>
          {(item.categoryChoices?.length ?? 0) > 0 && (
            <p data-testid="category-prior-choices">
              {t('grocery.savedSections', 'Saved sections:')}{' '}
              {[
                ...new Set(
                  item.categoryChoices?.map((choice) => choice.grocerySection).filter(Boolean)
                ),
              ]
                .map((section) => t(`grocery.aisles.${section}`, section ?? ''))
                .join(', ')}
            </p>
          )}
        </div>
      )}
      {AISLE_ORDER.map((section) => (
        <button
          type="button"
          key={section}
          onClick={() => onSelectSection(item, section)}
          className={`min-h-12 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            item.section === section
              ? 'bg-garden-fill text-white'
              : 'bg-white text-ink-muted hover:bg-sage-50 border border-chrome-line'
          }`}
          data-testid={`section-option-${section}`}
          disabled={isPending}
        >
          {t(`grocery.aisles.${section}`, section)}
        </button>
      ))}
      {isPending && <span data-testid="reclassify-pending" data-item-name={itemLabel} />}
    </div>
  );
}

interface ExtraSectionPickerProps {
  extra: GroceryExtraDto;
  pending: boolean;
  onClosePicker: () => void;
  onSelectSection: (section: GrocerySection) => void;
}

export function ExtraSectionPicker({
  extra,
  pending,
  onClosePicker,
  onSelectSection,
}: ExtraSectionPickerProps) {
  return (
    <div
      className="flex flex-wrap gap-2 px-3 pb-2"
      role="group"
      aria-label={t('grocery.chooseSection', 'Choose section')}
    >
      {AISLE_ORDER.map((nextSection) => (
        <button
          type="button"
          key={nextSection}
          disabled={pending}
          className="min-h-11 rounded-full bg-charcoal/5 px-3 text-xs font-bold text-ink-body focus:ring-2 focus:ring-garden-ink"
          onClick={() => {
            if (extra.grocerySection === nextSection) onClosePicker();
            else onSelectSection(nextSection);
          }}
        >
          {t(`grocery.aisles.${nextSection}`, nextSection)}
        </button>
      ))}
    </div>
  );
}

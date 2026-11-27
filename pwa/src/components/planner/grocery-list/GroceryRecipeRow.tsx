import React from 'react';
import { AlertCircle, CheckCircle2, Circle, Tag } from 'lucide-react';
import type { GroceryLineItemDto } from '@/lib/api/generated/models';
import type { GrocerySection } from '@/lib/grocery/aisleMapper';
import { cn } from '@/lib/utils';
import { t, tWithVars } from '@/locales';
import {
  CATEGORY_BUTTON_CLASS,
  categoryCorrectionKey,
  formatQuantityHint,
  type PreserveCheckFocusFn,
} from './helpers';
import { RecipeSourcesRegion, RecipeSourcesToggleButton } from './RecipeSourcesRegion';
import { RecipeItemSectionPicker } from './SectionPicker';

interface GroceryRecipeRowProps {
  item: GroceryLineItemDto;
  renderKey: string;
  locale: 'en' | 'fr';
  isChecked: boolean;
  hasError: boolean;
  hasReclassifyError: boolean;
  isPickerOpen: boolean;
  isReclassifyPending: boolean;
  isSourcesOpen: boolean;
  sourceReturnParams: string;
  sourceTitles: Record<string, string | null | undefined>;
  preserveCheckFocus: PreserveCheckFocusFn;
  onToggleItem: (item: GroceryLineItemDto) => void;
  onToggleSources: (renderKey: string) => void;
  onToggleReclassifyPicker: (pickerKey: string) => void;
  onReclassify: (item: GroceryLineItemDto, section: GrocerySection) => void;
}

export function GroceryRecipeRow({
  item,
  renderKey,
  locale,
  isChecked,
  hasError,
  hasReclassifyError,
  isPickerOpen,
  isReclassifyPending,
  isSourcesOpen,
  sourceReturnParams,
  sourceTitles,
  preserveCheckFocus,
  onToggleItem,
  onToggleSources,
  onToggleReclassifyPicker,
  onReclassify,
}: GroceryRecipeRowProps) {
  const key = item.displayLabels?.[locale] ?? item.displayName ?? '';
  const knownQuantity = formatQuantityHint(item.quantity, item.unitText);
  const quantityHint =
    item.quantityComplete === false && knownQuantity
      ? tWithVars('grocery.knownSubtotal', '{{amount}} known', {
          amount: knownQuantity.slice(1, -1),
        })
      : knownQuantity;
  const categoryKey = categoryCorrectionKey(item);
  const validRecipeIds = (item.recipeIds ?? []).filter(
    (id): id is string => typeof id === 'string' && id.length > 0
  );

  return (
    <div className="relative">
      <div
        className={`flex flex-wrap items-center gap-1 px-1.5 py-2 rounded-2xl transition-all ${
          isChecked ? 'bg-sage-50 text-ink-muted' : 'hover:bg-charcoal-50 text-ink-body'
        }`}
      >
        <button
          type="button"
          onClick={(event) => {
            preserveCheckFocus(event.currentTarget, event.detail === 0);
            onToggleItem(item);
          }}
          onKeyDown={(event) => {
            if (event.key === ' ' || event.key === 'Enter') {
              event.preventDefault();
              if (event.repeat) return;
              preserveCheckFocus(event.currentTarget, true);
              onToggleItem(item);
            }
          }}
          className="flex min-h-12 min-w-0 flex-1 basis-full items-center gap-2.5 text-left @min-[18rem]:basis-0"
          data-testid="grocery-item-checkbox"
          data-row-id={item.rowId}
          data-item-name={key}
          data-state={isChecked ? 'checked' : 'unchecked'}
          role="checkbox"
          aria-checked={isChecked}
        >
          {isChecked ? (
            <CheckCircle2 size={20} className="text-garden-ink flex-shrink-0" aria-hidden="true" />
          ) : (
            <Circle size={20} className="text-icon-affordance flex-shrink-0" aria-hidden="true" />
          )}
          <span
            className={cn('min-w-0 flex-1 transition-all', isChecked && 'line-through opacity-60')}
          >
            <span
              data-testid="grocery-item-label"
              className={cn(
                'block break-words font-medium transition-all',
                isChecked && 'line-through opacity-60'
              )}
            >
              {key}
            </span>
            {quantityHint && (
              <span
                data-testid="grocery-item-quantity-hint"
                className={cn(
                  'mt-1 block text-sm font-normal',
                  item.quantityComplete === false ? 'text-ink-body' : 'text-ink-muted'
                )}
              >
                {quantityHint}
              </span>
            )}
          </span>
          {hasError && (
            <AlertCircle
              size={12}
              className="text-hearth-ink flex-shrink-0 ml-1"
              data-testid="grocery-item-error"
            />
          )}
        </button>

        <div
          data-testid="grocery-row-actions"
          className="ml-auto flex shrink-0 items-center gap-0.5"
        >
          {validRecipeIds.length > 0 && (
            <RecipeSourcesToggleButton
              itemLabel={key}
              renderKey={renderKey}
              isOpen={isSourcesOpen}
              onToggle={() => onToggleSources(renderKey)}
            />
          )}
          <button
            type="button"
            onClick={() => onToggleReclassifyPicker(item.rowId ?? categoryKey)}
            className={cn(CATEGORY_BUTTON_CLASS, 'relative')}
            aria-label={`${t('grocery.changeSection', 'Change section for')} ${key}`}
            aria-expanded={isPickerOpen}
            data-testid="reclassify-btn"
            data-item-name={key}
            disabled={isReclassifyPending}
          >
            <Tag size={16} className="mx-auto" aria-hidden="true" />
            {hasReclassifyError && (
              <AlertCircle
                size={10}
                className="text-hearth-ink absolute -top-1 -right-1"
                data-testid="reclassify-error"
              />
            )}
          </button>
        </div>

        {isSourcesOpen && (
          <RecipeSourcesRegion
            recipeIds={validRecipeIds}
            renderKey={renderKey}
            sourceReturnParams={sourceReturnParams}
            sourceTitles={sourceTitles}
          />
        )}
      </div>

      {isPickerOpen && (
        <RecipeItemSectionPicker
          item={item}
          itemLabel={key}
          isPending={isReclassifyPending}
          onSelectSection={onReclassify}
        />
      )}
    </div>
  );
}

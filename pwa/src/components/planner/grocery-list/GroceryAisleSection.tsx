import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import type { GroceryExtraDto, GroceryLineItemDto } from '@/lib/api/generated/models';
import type { GrocerySection } from '@/lib/grocery/aisleMapper';
import { cn } from '@/lib/utils';
import { t, tWithVars } from '@/locales';
import { GroceryExtraRow } from './GroceryExtraRow';
import { GroceryRecipeRow } from './GroceryRecipeRow';
import {
  AISLE_ICONS,
  categoryCorrectionKey,
  grocerySourceKey,
  type CheckControlInfo,
  type ExtraMutationChange,
  type PreserveCheckFocusFn,
} from './helpers';

interface GroceryAisleSectionProps {
  aisle: GrocerySection;
  aisleItems: GroceryLineItemDto[];
  aisleExtras: GroceryExtraDto[];
  locale: 'en' | 'fr';
  groceryState: Record<string, boolean>;
  isCollapsed: boolean;
  onToggleAisle: (aisle: GrocerySection) => void;
  errorItems: Set<string>;
  reclassifyOpen: string | null;
  reclassifyErrors: Set<string>;
  pendingReclassifications: Set<string>;
  onToggleReclassifyPicker: (pickerKey: string) => void;
  onCloseReclassifyPicker: () => void;
  onReclassifyItem: (item: GroceryLineItemDto, section: GrocerySection) => void;
  onToggleItem: (item: GroceryLineItemDto) => void;
  reviewKey: string | null;
  onSetReviewKey: (key: string | null) => void;
  sourceReturnParams: string;
  sourceTitles: Record<string, string | null | undefined>;
  pendingExtras: Set<string>;
  storePendingExtras: Set<string>;
  extraErrors: Set<string>;
  editingExtra: string | null;
  editingName: string;
  onEditingNameChange: (value: string) => void;
  onStartEditExtra: (id: string, currentName: string) => void;
  onMutateExtra: (
    extra: GroceryExtraDto,
    change: ExtraMutationChange,
    checkControl?: CheckControlInfo
  ) => void;
  onDeleteExtra: (extra: GroceryExtraDto) => void;
  preserveCheckFocus: PreserveCheckFocusFn;
  registerEditButton: (id: string, node: HTMLButtonElement | null) => void;
}

export function GroceryAisleSection({
  aisle,
  aisleItems,
  aisleExtras,
  locale,
  groceryState,
  isCollapsed,
  onToggleAisle,
  errorItems,
  reclassifyOpen,
  reclassifyErrors,
  pendingReclassifications,
  onToggleReclassifyPicker,
  onCloseReclassifyPicker,
  onReclassifyItem,
  onToggleItem,
  reviewKey,
  onSetReviewKey,
  sourceReturnParams,
  sourceTitles,
  pendingExtras,
  storePendingExtras,
  extraErrors,
  editingExtra,
  editingName,
  onEditingNameChange,
  onStartEditExtra,
  onMutateExtra,
  onDeleteExtra,
  preserveCheckFocus,
  registerEditButton,
}: GroceryAisleSectionProps) {
  const itemsWithRenderKeys = aisleItems.map((item, sourceIndex) => ({
    item,
    renderKey: grocerySourceKey(aisle, item, sourceIndex),
  }));
  const displayedRows = [
    ...aisleExtras
      .filter((extra) => !extra.checked)
      .map((extra) => ({ kind: 'extra' as const, extra })),
    ...itemsWithRenderKeys
      .filter(({ item }) => !groceryState[item.rowId ?? ''])
      .map((entry) => ({ kind: 'recipe' as const, ...entry })),
    ...aisleExtras
      .filter((extra) => extra.checked)
      .map((extra) => ({ kind: 'extra' as const, extra })),
    ...itemsWithRenderKeys
      .filter(({ item }) => groceryState[item.rowId ?? ''])
      .map((entry) => ({ kind: 'recipe' as const, ...entry })),
  ];

  const checkedCount =
    aisleItems.filter((item) => groceryState[item.rowId ?? '']).length +
    aisleExtras.filter((extra) => extra.checked).length;
  const totalCount = aisleItems.length + aisleExtras.length;
  const isComplete = totalCount > 0 && checkedCount === totalCount;
  const itemsRegionId = `aisle-items-${aisle.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="@container bg-white rounded-3xl border border-chrome-line overflow-hidden shadow-sm"
      data-testid={`aisle-section-${aisle}`}
    >
      <button
        type="button"
        onClick={() => onToggleAisle(aisle)}
        className={`px-6 py-4 border-b border-chrome-line ${
          isComplete ? 'bg-sage/20' : 'bg-gradient-to-r from-charcoal/2 to-transparent'
        } w-full text-left`}
        data-testid={isComplete ? 'aisle-header-complete' : 'aisle-header-incomplete'}
        aria-expanded={!isCollapsed}
        aria-controls={itemsRegionId}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{AISLE_ICONS[aisle]}</span>
            <div>
              <h3 className="font-black text-ink-body text-lg">
                {t(`grocery.aisles.${aisle}`, aisle)}
              </h3>
              <p className="text-xs text-ink-muted font-medium">
                {tWithVars('grocery.itemsCount', `${checkedCount}/${totalCount} items`, {
                  checked: checkedCount,
                  total: totalCount,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-sage-50 flex items-center justify-center">
              {isComplete ? (
                <CheckCircle2
                  size={18}
                  className="text-garden-ink"
                  data-testid="section-complete-icon"
                />
              ) : (
                <span className="text-xs font-black text-garden-ink">
                  {Math.round((checkedCount / totalCount) * 100)}%
                </span>
              )}
            </div>
            <ChevronDown
              size={18}
              className={cn(
                'text-icon-affordance transition-transform',
                isCollapsed && '-rotate-90'
              )}
              aria-hidden="true"
            />
          </div>
        </div>
      </button>

      <div
        id={itemsRegionId}
        className="divide-y divide-charcoal/5 px-1.5 py-2 space-y-1.5"
        hidden={isCollapsed}
        aria-hidden={isCollapsed}
      >
        {displayedRows.map((row) => {
          if (row.kind === 'extra') {
            const extraId = row.extra.id ?? '';
            return (
              <GroceryExtraRow
                key={`extra-${extraId}`}
                extra={row.extra}
                pending={pendingExtras.has(extraId) || storePendingExtras.has(extraId)}
                error={extraErrors.has(extraId)}
                editing={editingExtra === extraId}
                editingName={editingName}
                isSectionPickerOpen={reclassifyOpen === extraId}
                onEditingNameChange={onEditingNameChange}
                onStartEdit={onStartEditExtra}
                onMutateExtra={onMutateExtra}
                onDeleteExtra={onDeleteExtra}
                onToggleSectionPicker={onToggleReclassifyPicker}
                onCloseSectionPicker={onCloseReclassifyPicker}
                preserveCheckFocus={preserveCheckFocus}
                registerEditButton={registerEditButton}
              />
            );
          }

          const { item, renderKey } = row;
          const categoryKey = categoryCorrectionKey(item);
          return (
            <GroceryRecipeRow
              key={renderKey}
              item={item}
              renderKey={renderKey}
              locale={locale}
              isChecked={groceryState[item.rowId ?? ''] ?? false}
              hasError={errorItems.has(item.rowId ?? '')}
              hasReclassifyError={reclassifyErrors.has(categoryKey)}
              isPickerOpen={reclassifyOpen === (item.rowId ?? categoryKey)}
              isReclassifyPending={pendingReclassifications.has(categoryKey)}
              isSourcesOpen={reviewKey === renderKey}
              sourceReturnParams={sourceReturnParams}
              sourceTitles={sourceTitles}
              preserveCheckFocus={preserveCheckFocus}
              onToggleItem={onToggleItem}
              onToggleSources={(key) => onSetReviewKey(reviewKey === key ? null : key)}
              onToggleReclassifyPicker={onToggleReclassifyPicker}
              onReclassify={onReclassifyItem}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

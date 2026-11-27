import { Trash2 } from 'lucide-react';
import {
  ingredientPackageDraft,
  ingredientUnitOptions,
  isStandardIngredientUnit,
  type IngredientDraft,
} from '@/lib/recipes/ingredient-draft';
import { t } from '@/locales';

function renderUnitOptions(currentUnit: string) {
  return ingredientUnitOptions(currentUnit).map((unitOption) => (
    <option key={unitOption || '__none__'} value={unitOption}>
      {unitOption === ''
        ? t('recipes.unitNone', '—')
        : isStandardIngredientUnit(unitOption)
          ? t(`recipes.units.${unitOption}`, unitOption)
          : unitOption}
    </option>
  ));
}

export interface StructuredIngredientDraftCardProps {
  row: IngredientDraft;
  index: number;
  isSavingRecipe: boolean;
  onChange: (patch: Partial<IngredientDraft>) => void;
  onRemove: () => void;
}

export function StructuredIngredientDraftCard({
  row,
  index,
  isSavingRecipe,
  onChange,
  onRemove,
}: StructuredIngredientDraftCardProps) {
  const pack = ingredientPackageDraft(row);

  return (
    <div className="space-y-3 rounded-2xl border border-chrome-line bg-white p-3">
      <div
        data-testid={`recipe-ingredient-top-row-${index}`}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="grid min-w-[min(100%,5rem)] flex-1 gap-1 text-sm font-semibold text-ink-body">
          <span>{t('recipes.ingredientAmount', 'Amount')}</span>
          <input
            data-testid={`recipe-edit-amount-${index}`}
            disabled={isSavingRecipe}
            value={row.amount}
            onChange={(event) => onChange({ amount: event.target.value })}
            className="min-h-12 w-full min-w-0 rounded-xl border border-chrome-line bg-white px-3 text-sm font-normal text-ink-body"
          />
        </label>
        <label className="grid min-w-[min(100%,6rem)] flex-[1.2] gap-1 text-sm font-semibold text-ink-body">
          <span>{t('recipes.ingredientUnit', 'Unit')}</span>
          <select
            data-testid={`recipe-edit-unit-${index}`}
            disabled={isSavingRecipe}
            value={row.unit}
            onChange={(event) => onChange({ unit: event.target.value })}
            className="min-h-12 w-full min-w-0 rounded-xl border border-chrome-line bg-white px-2 text-sm font-normal text-ink-body"
          >
            {renderUnitOptions(row.unit)}
          </select>
        </label>
        <button
          type="button"
          data-testid={`recipe-remove-ingredient-${index}`}
          disabled={isSavingRecipe}
          aria-label={t('recipes.removeIngredient', 'Remove ingredient')}
          title={t('recipes.removeIngredient', 'Remove ingredient')}
          onClick={onRemove}
          className="ml-auto inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-icon-affordance transition hover:bg-charcoal/5 hover:text-ink-body disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>
      <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink-body">
        <span>{t('recipes.ingredientDescription', 'Description')}</span>
        <input
          data-testid={`recipe-edit-ingredient-${index}`}
          disabled={isSavingRecipe}
          value={row.description}
          onChange={(event) => onChange({ description: event.target.value })}
          className="min-h-12 w-full rounded-xl border border-chrome-line bg-white px-3 text-sm font-normal text-ink-body"
        />
      </label>
      <details className="rounded-xl bg-charcoal/3 px-3 py-1">
        <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-ink-body">
          {t('recipes.ingredientOptions', 'Shopping and scaling')}
        </summary>
        <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink-body">
          <span>{t('recipes.shoppingName', 'Shopping name')}</span>
          <input
            disabled={isSavingRecipe}
            value={row.shoppingName}
            onChange={(event) => onChange({ shoppingName: event.target.value })}
            className="min-h-12 w-full rounded-xl border border-chrome-line bg-white px-3 text-sm font-normal text-ink-body"
          />
        </label>
        <label className="flex min-h-12 items-center gap-2 text-sm text-ink-body">
          <input
            type="checkbox"
            disabled={isSavingRecipe}
            checked={row.fixed}
            onChange={(event) => onChange({ fixed: event.target.checked })}
          />
          {t('recipes.fixedIngredient', 'Keep amount fixed when portions change')}
        </label>
        <label className="flex min-h-12 items-center gap-2 text-sm text-ink-body">
          <input
            type="checkbox"
            data-testid={`recipe-edit-package-enabled-${index}`}
            disabled={isSavingRecipe}
            checked={pack.enabled}
            onChange={(event) =>
              onChange({
                packageEnabled: event.target.checked,
                packageCountUnit: row.packageCountUnit || row.unit.trim(),
              })
            }
          />
          {t('recipes.packageDetails', 'Package details')}
        </label>
        {pack.enabled && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-2 pb-2">
            <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink-body">
              <span>{t('recipes.packageCountUnit', 'Package label')}</span>
              <input
                data-testid={`recipe-edit-package-count-unit-${index}`}
                disabled={isSavingRecipe}
                value={pack.countUnit}
                onChange={(event) => onChange({ packageCountUnit: event.target.value })}
                className="min-h-12 w-full min-w-0 rounded-xl border border-chrome-line bg-white px-3 text-sm font-normal text-ink-body"
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink-body">
              <span>{t('recipes.packageCapacityAmount', 'Amount in each package')}</span>
              <input
                data-testid={`recipe-edit-package-capacity-${index}`}
                disabled={isSavingRecipe}
                value={pack.capacityAmount}
                onChange={(event) => onChange({ packageCapacityAmount: event.target.value })}
                className="min-h-12 w-full min-w-0 rounded-xl border border-chrome-line bg-white px-3 text-sm font-normal text-ink-body"
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink-body">
              <span>{t('recipes.packageCapacityUnit', 'Unit in each package')}</span>
              <select
                data-testid={`recipe-edit-package-unit-${index}`}
                disabled={isSavingRecipe}
                value={pack.capacityUnit}
                onChange={(event) => onChange({ packageCapacityUnit: event.target.value })}
                className="min-h-12 w-full min-w-0 rounded-xl border border-chrome-line bg-white px-2 text-sm font-normal text-ink-body"
              >
                {renderUnitOptions(pack.capacityUnit)}
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold text-ink-body">
              <span>{t('recipes.packageBasis', 'Amount refers to')}</span>
              <select
                data-testid={`recipe-edit-package-basis-${index}`}
                disabled={isSavingRecipe}
                value={pack.basis}
                onChange={(event) =>
                  onChange({
                    packageBasis: event.target.value as IngredientDraft['packageBasis'],
                  })
                }
                className="min-h-12 w-full min-w-0 rounded-xl border border-chrome-line bg-white px-2 text-sm font-normal text-ink-body"
              >
                <option value="unspecified">
                  {t('recipes.packageBasisUnspecified', 'Not specified')}
                </option>
                <option value="net">{t('recipes.packageBasisNet', 'Net amount')}</option>
                <option value="drained">
                  {t('recipes.packageBasisDrained', 'Drained amount')}
                </option>
              </select>
            </label>
          </div>
        )}
      </details>
    </div>
  );
}

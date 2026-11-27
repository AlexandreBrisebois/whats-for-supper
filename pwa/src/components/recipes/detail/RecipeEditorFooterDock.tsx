import { Check, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ingredientPackageDraft } from '@/lib/recipes/ingredient-draft';
import { instructionSections } from '@/lib/recipes/instruction-draft';
import { t } from '@/locales';
import type { EditorField, EditorFields } from '@/lib/recipes/editor-draft';
import type { EditorSessionState, ReconcileContext } from './useRecipeInlineEditor';

function editorFieldLabel(field: EditorField) {
  return {
    name: t('recipes.name', 'Name'),
    description: t('recipes.description', 'Description'),
    servings: t('recipes.originalServings', 'Original portions'),
    totalTime: t('recipes.totalTimeLabel', 'Time (minutes)'),
    cuisineType: t('recipes.cuisineType', 'Cuisine'),
    mealTypes: t('recipes.mealTypes', 'Meal types'),
    ingredients: t('recipes.ingredients', 'Ingredients'),
    instructions: t('recipes.instructions', 'Instructions'),
  }[field];
}

function editorFieldText(fields: EditorFields, field: EditorField, structured: boolean) {
  if (field === 'instructions')
    return instructionSections(fields.instructions ?? [], structured)
      .flatMap((section) => [
        ...(section.name.trim() ? [section.name.trim()] : []),
        ...section.steps.map((row) => row.text),
      ])
      .join('\n');
  if (field !== 'ingredients')
    return Array.isArray(fields[field]) ? fields[field].join(', ') : fields[field];
  return structured
    ? fields.ingredientDrafts
        .map((row) => {
          const pack = ingredientPackageDraft(row);
          const basis =
            pack.basis === 'net'
              ? t('recipes.packageBasisNet', 'Net amount')
              : pack.basis === 'drained'
                ? t('recipes.packageBasisDrained', 'Drained amount')
                : t('recipes.packageBasisUnspecified', 'Not specified');
          return [
            row.amount,
            row.unit,
            row.description,
            row.shoppingName,
            row.fixed ? t('recipes.fixedIngredient', 'Keep amount fixed when portions change') : '',
            pack.enabled
              ? `${t('recipes.packageDetails', 'Package details')}: ${pack.capacityAmount} ${pack.capacityUnit} / ${pack.countUnit} · ${basis}`
              : t('recipes.noPackageDetails', 'No package details'),
          ]
            .filter(Boolean)
            .join(' · ');
        })
        .join('\n')
    : fields.ingredients.join('\n');
}

export interface RecipeEditorFooterDockProps {
  draftStorageIssue: boolean;
  draftRecovered: boolean;
  saveNeedsRead: boolean;
  reconcileReadError: boolean;
  reconcileContext: ReconcileContext | null;
  conflictFields: EditorField[];
  reconcileChoices: Partial<Record<EditorField, 'draft' | 'current'>>;
  editorSession: EditorSessionState | null;
  isSavingRecipe: boolean;
  saveDisabled: boolean;
  onRetryReconcileRead: () => void;
  onChooseReconcileField: (field: EditorField, choice: 'draft' | 'current') => void;
  onSave: () => void;
  onCancel: () => void;
}

export function RecipeEditorFooterDock({
  draftStorageIssue,
  draftRecovered,
  saveNeedsRead,
  reconcileReadError,
  reconcileContext,
  conflictFields,
  reconcileChoices,
  editorSession,
  isSavingRecipe,
  saveDisabled,
  onRetryReconcileRead,
  onChooseReconcileField,
  onSave,
  onCancel,
}: RecipeEditorFooterDockProps) {
  return (
    <div className="shrink-0 max-h-[45dvh] overflow-y-auto flex flex-wrap gap-3 border-t border-chrome-line bg-cream px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-8">
      {draftStorageIssue && (
        <p
          role="alert"
          className="w-full rounded-2xl border border-hearth-line bg-terracotta-50 p-3 text-sm text-ink-body"
        >
          {t(
            'recipes.draftStorageUnavailable',
            'This tab cannot safely store your edits for recovery. Keep it open until you save or cancel.'
          )}
        </p>
      )}
      {draftRecovered && (
        <p
          role="status"
          className="w-full rounded-2xl border border-garden-line bg-sage-50 p-3 text-sm text-ink-body"
        >
          {t('recipes.draftRecovered', 'Your unsaved edits were recovered.')}
        </p>
      )}
      {saveNeedsRead && reconcileReadError && (
        <div
          role="alert"
          data-testid="recipe-reconcile-error"
          className="flex w-full flex-col items-start gap-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-4 text-sm text-ink-body"
        >
          <p>
            {t(
              'recipes.reconcileReadFailed',
              'Could not check the saved recipe. Your draft is kept.'
            )}
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            data-testid="recipe-reconcile-retry"
            onClick={onRetryReconcileRead}
          >
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      )}
      {reconcileContext && conflictFields.length > 0 && (
        <div
          role="region"
          aria-label={t('recipes.savedRecipeChangedTitle', 'The saved recipe changed')}
          data-testid="recipe-reconcile-conflicts"
          className="w-full space-y-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-4 text-sm text-ink-body"
        >
          <p className="font-heading text-base font-bold text-hearth-ink">
            {t('recipes.savedRecipeChangedTitle', 'The saved recipe changed')}
          </p>
          <p>
            {t(
              'recipes.draftReconcileHelp',
              'Other fields were updated automatically. For each field below, choose your draft or the saved version, then save.'
            )}
          </p>
          {conflictFields.map((field) => {
            const draftAllowed =
              !(field === 'ingredients' || field === 'instructions') ||
              reconcileContext.draftStructured === reconcileContext.saved.structured;
            const pill = (choice: 'draft' | 'current', label: string) => {
              const selected = reconcileChoices[field] === choice;
              return (
                <button
                  type="button"
                  className={cn(
                    'inline-flex min-h-12 max-w-full items-center gap-2 rounded-full border px-4 py-2 text-center font-semibold leading-snug whitespace-normal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body',
                    selected
                      ? 'border-hearth-line bg-terracotta-50 text-hearth-ink'
                      : 'border-chrome-line bg-white text-ink-body'
                  )}
                  aria-pressed={selected}
                  aria-label={`${label}: ${editorFieldLabel(field)}`}
                  onClick={() => onChooseReconcileField(field, choice)}
                >
                  {selected && <Check size={16} aria-hidden="true" />}
                  {label}
                </button>
              );
            };
            return (
              <fieldset
                key={field}
                className="min-w-0 space-y-2 rounded-xl border border-chrome-line bg-white p-3"
              >
                <legend className="px-1 font-semibold">{editorFieldLabel(field)}</legend>
                <p className="font-semibold text-ink-body">{t('recipes.myDraft', 'My draft')}</p>
                <p className="whitespace-pre-wrap break-words text-ink-muted">
                  {editorFieldText(
                    reconcileContext.draftFields,
                    field,
                    reconcileContext.draftStructured
                  )}
                </p>
                <p className="font-semibold text-ink-body">
                  {t('recipes.currentSaved', 'Currently saved')}
                </p>
                <p className="whitespace-pre-wrap break-words text-ink-muted">
                  {editorFieldText(
                    reconcileContext.saved.fields,
                    field,
                    reconcileContext.saved.structured
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {draftAllowed && pill('draft', t('recipes.keepMyDraft', 'Keep my draft'))}
                  {pill('current', t('recipes.useCurrentSaved', 'Use currently saved'))}
                </div>
              </fieldset>
            );
          })}
          {editorSession &&
            reconcileContext.draftStructured !== reconcileContext.saved.structured && (
              <p>
                {t(
                  'recipes.legacyDraftReference',
                  'The ingredient format changed. Your old ingredient text is retained below for reference; use the current ingredients and reapply corrections in the editor.'
                )}
              </p>
            )}
        </div>
      )}
      {editorSession?.original && (
        <details className="w-full text-sm text-ink-body">
          <summary className="min-h-12 cursor-pointer py-3 font-semibold">
            {t('recipes.originalRecoveredDraft', 'Original recovered draft')}
          </summary>
          {(
            [
              'name',
              'description',
              'servings',
              'totalTime',
              'cuisineType',
              'mealTypes',
              'ingredients',
            ] as EditorField[]
          ).map((field) => (
            <div key={field}>
              <p className="font-bold">{editorFieldLabel(field)}</p>
              <p className="whitespace-pre-wrap break-words">
                {editorFieldText(
                  editorSession.original!.fields,
                  field,
                  editorSession.original!.baseline.structured
                )}
              </p>
            </div>
          ))}
        </details>
      )}
      <Button
        type="button"
        variant="primary"
        size="md"
        data-testid="recipe-save-edits"
        onClick={onSave}
        disabled={saveDisabled}
        className="gap-2 rounded-full px-2 text-sm font-black sm:px-5"
      >
        <Save size={16} className="hidden shrink-0 sm:block" aria-hidden="true" />
        <span className="min-w-0 break-words">
          {isSavingRecipe ? t('common.saving', 'Saving') : t('common.saveChanges', 'Save changes')}
        </span>
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="md"
        data-testid="recipe-cancel-edits"
        onClick={onCancel}
        disabled={isSavingRecipe}
        className="gap-2 rounded-full px-2 text-sm font-black sm:px-5"
      >
        <X size={16} className="hidden shrink-0 sm:block" aria-hidden="true" />
        <span className="min-w-0 break-words">{t('common.cancel', 'Cancel')}</span>
      </Button>
    </div>
  );
}

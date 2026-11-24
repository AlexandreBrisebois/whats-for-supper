'use client';

import { useEffect, useState } from 'react';
import { Trash2, Utensils, X } from 'lucide-react';
import { deleteRecipe, getRecipe, resolveRecipeImportIssue, type Recipe } from '@/lib/api/recipes';
import { getImageUrl } from '@/lib/imageUtils';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useLocale } from '@/components/common/LocaleProvider';
import { t, tWithVars } from '@/locales';
import { Button } from '@/components/ui/button';

export interface PairedDuplicateReviewSheetProps {
  open: boolean;
  newRecipe: Recipe;
  existingRecipeId: string;
  onClose: () => void;
  onKeepBothComplete: (updatedRecipe: Recipe) => void;
  onNewMovedToBin: () => void;
  onExistingMovedToBin: (updatedRecipe: Recipe) => void;
  onOpenStandardIssueEditor?: () => void;
  onPreviewRecipe?: (recipeId: string) => void;
}

type PendingAction = 'keep-both' | 'keep-existing' | 'keep-new' | null;

export function PairedDuplicateReviewSheet(props: PairedDuplicateReviewSheetProps) {
  if (!props.open) return null;
  return <PairedDuplicateReviewSheetContent key={props.existingRecipeId} {...props} />;
}

function PairedDuplicateReviewSheetContent({
  newRecipe,
  existingRecipeId,
  onClose,
  onKeepBothComplete,
  onNewMovedToBin,
  onExistingMovedToBin,
  onOpenStandardIssueEditor,
  onPreviewRecipe,
}: PairedDuplicateReviewSheetProps) {
  const { locale } = useLocale();
  const [existingRecipe, setExistingRecipe] = useState<Recipe | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [existingDeletedNeedsResolve, setExistingDeletedNeedsResolve] = useState(false);

  const isBusy = pendingAction !== null;
  const { panelRef, onKeyDown } = useDialogFocus(() => {
    if (!isBusy) onClose();
  });

  useEffect(() => {
    let active = true;

    void getRecipe(existingRecipeId)
      .then((loaded) => {
        if (!active) return;
        setExistingRecipe(loaded);
        setLoadingExisting(false);
      })
      .catch(() => {
        if (!active) return;
        setExistingRecipe(null);
        setLoadError(true);
        setLoadingExisting(false);
      });

    return () => {
      active = false;
    };
  }, [existingRecipeId]);

  const handleKeepBoth = async () => {
    if (isBusy) return;
    setPendingAction('keep-both');
    setActionError(null);
    try {
      const updated = await resolveRecipeImportIssue(newRecipe.id);
      onKeepBothComplete(updated);
    } catch {
      setActionError(
        t(
          'recipes.duplicateReview.actionError',
          'Could not complete that action. Please try again.',
          locale
        )
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleKeepExistingMoveNew = async () => {
    if (isBusy) return;
    setPendingAction('keep-existing');
    setActionError(null);
    try {
      await deleteRecipe(newRecipe.id);
      onNewMovedToBin();
    } catch {
      setActionError(
        t(
          'recipes.duplicateReview.actionError',
          'Could not complete that action. Please try again.',
          locale
        )
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleKeepNewMoveExisting = async () => {
    if (isBusy) return;
    setPendingAction('keep-new');
    setActionError(null);
    try {
      if (!existingDeletedNeedsResolve) {
        await deleteRecipe(existingRecipeId);
        setExistingDeletedNeedsResolve(true);
      }
      const updated = await resolveRecipeImportIssue(newRecipe.id);
      setExistingDeletedNeedsResolve(false);
      onExistingMovedToBin(updated);
    } catch {
      setActionError(
        existingDeletedNeedsResolve
          ? t(
              'recipes.duplicateReview.clearReportRetry',
              'The older recipe was moved to Bin, but clearing the duplicate flag failed. Tap again to finish.',
              locale
            )
          : t(
              'recipes.duplicateReview.actionError',
              'Could not complete that action. Please try again.',
              locale
            )
      );
    } finally {
      setPendingAction(null);
    }
  };

  const renderRecipeCard = (
    label: string,
    recipe: Recipe | null,
    testId: string,
    isLoadingCard = false
  ) => {
    const ingredientCount = recipe?.ingredientLines?.length ?? recipe?.ingredients?.length ?? 0;

    return (
      <div
        data-testid={testId}
        className="flex flex-col gap-3 rounded-2xl border border-chrome-line bg-white p-3.5"
      >
        <span className="text-xs font-bold uppercase tracking-[0.06em] text-ink-muted">
          {label}
        </span>
        {isLoadingCard ? (
          <div className="space-y-2 py-4">
            <div className="h-24 w-full rounded-xl bg-charcoal-100" />
            <div className="h-4 w-3/4 rounded bg-charcoal-100" />
          </div>
        ) : recipe ? (
          <>
            <div className="relative h-28 w-full overflow-hidden rounded-xl bg-charcoal-100">
              {recipe.imageUrl && !recipe.imageUrl.includes('placeholder') ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={getImageUrl(recipe.imageUrl)}
                  alt={recipe.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-muted">
                  <Utensils size={24} aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="font-heading text-base font-semibold leading-snug text-ink-body break-words">
                {recipe.name}
              </h3>
              <p className="text-xs text-ink-muted">
                {tWithVars(
                  'recipes.duplicateReview.ingredientCount',
                  '{{count}} ingredients',
                  { count: ingredientCount },
                  locale
                )}
              </p>
              {recipe.sourceUrl && (
                <p className="truncate text-xs text-ink-muted">{recipe.sourceUrl}</p>
              )}
            </div>
            {onPreviewRecipe && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-12 w-full"
                onClick={() => onPreviewRecipe(recipe.id)}
                disabled={isBusy}
              >
                {t('recipes.duplicateReview.preview', 'Preview recipe', locale)}
              </Button>
            )}
          </>
        ) : (
          <p className="py-4 text-sm text-ink-muted">
            {t(
              'recipes.duplicateReview.existingUnavailable',
              'Existing recipe could not be loaded.',
              locale
            )}
          </p>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-charcoal-900/50 p-3 sm:items-center sm:p-4"
      onClick={() => {
        if (!isBusy) onClose();
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="paired-duplicate-review-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        data-testid="paired-duplicate-review-sheet"
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-y-auto rounded-[28px] border border-chrome-line bg-cream p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="paired-duplicate-review-title"
              className="font-heading text-2xl font-bold leading-tight text-ink-body"
            >
              {t('recipes.duplicateReview.title', 'Possible duplicate', locale)}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {t(
                'recipes.duplicateReview.subtitle',
                'Compare both recipes and choose what stays in your cookbook. Moved recipes stay recoverable in Recycle Bin.',
                locale
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label={t('common.close', 'Close', locale)}
            data-testid="paired-duplicate-close-btn"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-chrome-line bg-white text-ink-muted transition-colors hover:bg-charcoal-100 hover:text-ink-body focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:opacity-50"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {renderRecipeCard(
            t('recipes.duplicateReview.newImportLabel', 'New import', locale),
            newRecipe,
            'duplicate-card-new'
          )}
          {renderRecipeCard(
            t('recipes.duplicateReview.existingLabel', 'Existing in library', locale),
            existingRecipe,
            'duplicate-card-existing',
            loadingExisting
          )}
        </div>

        {loadError && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-hearth-line bg-terracotta-50 px-3.5 py-2.5 text-sm font-medium text-hearth-ink"
          >
            {t(
              'recipes.duplicateReview.loadError',
              'Could not load the existing recipe right now.',
              locale
            )}
          </p>
        )}

        {actionError && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-hearth-line bg-terracotta-50 px-3.5 py-2.5 text-sm font-medium text-hearth-ink"
          >
            {actionError}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2.5">
          <Button
            type="button"
            variant="secondary"
            className="min-h-12 w-full justify-center"
            onClick={() => void handleKeepBoth()}
            disabled={isBusy}
            data-testid="duplicate-keep-both-btn"
          >
            {t('recipes.duplicateReview.keepBoth', 'Keep both recipes', locale)}
          </Button>
          <Button
            type="button"
            variant="danger"
            className="min-h-12 w-full justify-center gap-2"
            onClick={() => void handleKeepExistingMoveNew()}
            disabled={isBusy}
            data-testid="duplicate-keep-existing-btn"
          >
            <Trash2 size={16} aria-hidden="true" />
            <span>
              {t('recipes.duplicateReview.keepExisting', 'Keep existing · move new to Bin', locale)}
            </span>
          </Button>
          <Button
            type="button"
            variant="danger"
            className="min-h-12 w-full justify-center gap-2"
            onClick={() => void handleKeepNewMoveExisting()}
            disabled={isBusy || loadError || loadingExisting}
            data-testid="duplicate-keep-new-btn"
          >
            <Trash2 size={16} aria-hidden="true" />
            <span>
              {t('recipes.duplicateReview.keepNew', 'Keep new · move existing to Bin', locale)}
            </span>
          </Button>
        </div>

        {onOpenStandardIssueEditor && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={onOpenStandardIssueEditor}
              disabled={isBusy}
              data-testid="duplicate-open-issue-editor-btn"
              className="min-h-12 rounded-xl px-4 text-sm font-semibold text-ink-muted underline-offset-4 hover:text-ink-body hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body disabled:opacity-50"
            >
              {t('recipes.duplicateReview.editIssueDetails', 'Edit issue report', locale)}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

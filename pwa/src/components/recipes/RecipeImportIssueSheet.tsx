'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type {
  RecipeImportIssue,
  RecipeImportIssueDraft,
  RecipeImportIssueReason,
} from '@/lib/api/recipes';
import { RecipeImportIssueReasonObject } from '@/lib/api/generated/models/index';
import { t } from '@/locales';
import { useLocale } from '@/components/common/LocaleProvider';
import { useDemoMode } from '@/components/demo/DemoModeProvider';
import { DemoAiActionGate } from '@/components/demo/DemoAiActionGate';

interface RecipeImportIssueSheetProps {
  issue: RecipeImportIssue | null;
  recipeId?: string;
  contextualReason?: RecipeImportIssueReason;
  canReportContentIssues?: boolean;
  isReimporting?: boolean;
  reimportFailureMessage?: string | null;
  reimportFailureImportId?: string | null;
  onClose: () => void;
  onSave: (draft: RecipeImportIssueDraft) => Promise<void>;
  onResolve: () => Promise<void>;
}

function mergeReasons(
  issue: RecipeImportIssue | null,
  contextualReason?: RecipeImportIssueReason
): RecipeImportIssueReason[] {
  const reasons = [...(issue?.reasons ?? [])];
  if (contextualReason && !reasons.includes(contextualReason)) reasons.push(contextualReason);
  return reasons;
}

export function RecipeImportIssueSheet(props: RecipeImportIssueSheetProps) {
  return <RecipeImportIssueEditor {...props} />;
}

function RecipeImportIssueEditor({
  issue,
  recipeId,
  contextualReason,
  canReportContentIssues = true,
  isReimporting = false,
  reimportFailureMessage = null,
  reimportFailureImportId = null,
  onClose,
  onSave,
  onResolve,
}: RecipeImportIssueSheetProps) {
  const { locale } = useLocale();
  const { mode } = useDemoMode();
  const aiUnavailable = mode !== false;
  const reimportingDescriptionId = 'import-issue-reimporting-description';
  const [reasons, setReasons] = useState<RecipeImportIssueReason[]>(() =>
    mergeReasons(issue, contextualReason)
  );
  const [note, setNote] = useState(issue?.note ?? '');
  const [noteOpen, setNoteOpen] = useState(Boolean(issue?.note));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<'recipe' | 'import' | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const existing = issue !== null;
  const title = existing
    ? t('recipes.importIssue.reviewTitle', 'Review issue', locale)
    : t('recipes.importIssue.reportTitle', 'Report issue', locale);

  const copyId = async (kind: 'recipe' | 'import', value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedId(kind);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  useEffect(() => closeRef.current?.focus(), []);

  const [reasonAnnouncement, setReasonAnnouncement] = useState('');
  const contentSelected = reasons.some(
    (reason) => reason !== RecipeImportIssueReasonObject.Duplicate
  );
  const duplicateSelected = reasons.includes(RecipeImportIssueReasonObject.Duplicate);
  const noteEligible = contentSelected && canReportContentIssues;

  const toggleReason = (reason: RecipeImportIssueReason) => {
    if (isReimporting || aiUnavailable) return;
    if (reason !== RecipeImportIssueReasonObject.Duplicate && canReportContentIssues) {
      setNoteOpen(true);
    }
    setReasons((current) => {
      const selected = current.includes(reason);
      if (selected) return current.filter((item) => item !== reason);
      if (reason === RecipeImportIssueReasonObject.Duplicate) {
        const cleared = current.filter((item) => item === RecipeImportIssueReasonObject.Duplicate);
        if (current.length !== cleared.length)
          setReasonAnnouncement(
            t('recipes.importIssue.ingredientsCleared', 'Ingredients cleared', locale)
          );
        return [RecipeImportIssueReasonObject.Duplicate];
      }
      const cleared = current.filter((item) => item !== RecipeImportIssueReasonObject.Duplicate);
      if (current.length !== cleared.length)
        setReasonAnnouncement(
          t('recipes.importIssue.duplicateCleared', 'Duplicate cleared', locale)
        );
      return [...cleared, reason];
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]):not([tabindex="-1"]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const save = async () => {
    if (aiUnavailable || reasons.length === 0 || busy || isReimporting) return;
    setBusy(true);
    setError(null);
    try {
      await onSave({ reasons, note: note.trim() || null });
    } catch (saveError) {
      setError(
        saveError instanceof Error && saveError.message === 'Re-import launch failed'
          ? t(
              'recipes.importIssue.launchFailed',
              'We saved your report, but couldn’t start re-import. Try again later.',
              locale
            )
          : t('recipes.importIssue.saveFailed', 'Could not save changes. Try again.', locale)
      );
    } finally {
      setBusy(false);
    }
  };

  const resolve = async () => {
    if (busy || isReimporting) return;
    setBusy(true);
    setError(null);
    try {
      await onResolve();
    } catch {
      setError(
        t('recipes.importIssue.resolveFailed', 'Could not mark as resolved. Try again.', locale)
      );
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-charcoal-900/50"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-issue-title"
        onKeyDown={handleKeyDown}
        className="relative z-10 w-full max-w-md rounded-t-[2rem] border border-chrome-line bg-cream p-6 shadow-2xl sm:rounded-[2rem]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="import-issue-title" className="font-heading text-2xl font-bold text-ink-body">
              {title}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {t('recipes.importIssue.subtitle', 'What needs a closer look?', locale)}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label={
              existing
                ? t('recipes.importIssue.closeReview', 'Close review issue', locale)
                : t('recipes.importIssue.closeReport', 'Close report issue', locale)
            }
            onClick={onClose}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-chrome-line bg-white text-ink-muted transition-colors hover:bg-charcoal-100 hover:text-ink-body focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {aiUnavailable && (
          <div className="mt-4">
            <DemoAiActionGate>{null}</DemoAiActionGate>
          </div>
        )}
        <fieldset className="mt-6 grid grid-cols-3 gap-2">
          <legend className="sr-only">
            {t('recipes.importIssue.reasonsLegend', 'Issue reasons', locale)}
          </legend>
          {[
            RecipeImportIssueReasonObject.Ingredients,
            RecipeImportIssueReasonObject.Steps,
            RecipeImportIssueReasonObject.Duplicate,
          ].map((reason) => {
            const selected = reasons.includes(reason);
            const isContentReason = reason !== RecipeImportIssueReasonObject.Duplicate;
            const disabled = isContentReason && !canReportContentIssues && !selected;
            return (
              <button
                key={reason}
                type="button"
                data-testid={`import-issue-reason-${reason}`}
                aria-pressed={selected}
                aria-describedby={isReimporting ? reimportingDescriptionId : undefined}
                disabled={disabled || isReimporting || aiUnavailable}
                onClick={() => toggleReason(reason)}
                className={`inline-flex min-h-12 items-center justify-center rounded-full border px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body ${
                  selected
                    ? 'border-hearth-line bg-terracotta-50 text-hearth-ink'
                    : 'border-chrome-line bg-white text-ink-body hover:bg-charcoal-50 disabled:cursor-not-allowed disabled:opacity-45'
                }`}
              >
                {reason === RecipeImportIssueReasonObject.Ingredients
                  ? t('recipes.importIssue.reasonIngredients', 'Ingredients', locale)
                  : reason === RecipeImportIssueReasonObject.Steps
                    ? t('recipes.importIssue.reasonSteps', 'Steps', locale)
                    : t('recipes.importIssue.reasonDuplicate', 'Duplicate', locale)}
              </button>
            );
          })}
        </fieldset>
        <p className="sr-only" role="status" aria-live="polite">
          {reasonAnnouncement}
        </p>
        {!canReportContentIssues && (
          <p data-testid="import-issue-content-ineligible" className="mt-3 text-sm text-ink-muted">
            {t(
              'recipes.importIssue.contentIneligible',
              'Ingredients and steps can only be reported for recipes that can be re-imported.',
              locale
            )}
          </p>
        )}

        {duplicateSelected && (
          <p className="mt-3 text-sm text-ink-muted">
            {t('recipes.importIssue.duplicateNotice', 'This will be saved for review.', locale)}
          </p>
        )}
        {isReimporting && (
          <p
            id={reimportingDescriptionId}
            role="status"
            className="mt-3 text-sm font-bold text-ink-muted"
          >
            {t(
              'recipes.importIssue.reimportingNotice',
              'Reimporting recipe… You can update this after it finishes.',
              locale
            )}
          </p>
        )}
        {reimportFailureMessage && (
          <div
            role="status"
            className="mt-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-3 text-sm text-hearth-ink"
          >
            <p className="font-bold">{reimportFailureMessage}</p>
            {reimportFailureImportId && (
              <div className="mt-2 flex flex-wrap gap-2">
                {recipeId && (
                  <button
                    type="button"
                    data-testid="copy-recipe-id"
                    onClick={() => void copyId('recipe', recipeId)}
                    className="min-h-12 rounded-full border border-hearth-line bg-white px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                  >
                    {copiedId === 'recipe'
                      ? t('recipes.importIssue.copied', 'Copied', locale)
                      : t('recipes.importIssue.copyRecipeId', 'Copy recipe ID', locale)}
                  </button>
                )}
                <button
                  type="button"
                  data-testid="copy-import-id"
                  onClick={() => void copyId('import', reimportFailureImportId)}
                  className="min-h-12 rounded-full border border-hearth-line bg-white px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                >
                  {copiedId === 'import'
                    ? t('recipes.importIssue.copied', 'Copied', locale)
                    : t('recipes.importIssue.copyImportId', 'Copy import ID', locale)}
                </button>
              </div>
            )}
          </div>
        )}
        {issue?.status === 'readyToReview' && (
          <p className="mt-3 text-sm text-ink-muted">
            {t(
              'recipes.importIssueReadyGuidance',
              'Ready for review. Check the ingredients and steps, then mark this resolved when it looks right.',
              locale
            )}
          </p>
        )}
        <button
          type="button"
          data-testid="import-issue-note-disclosure"
          aria-expanded={noteOpen}
          aria-describedby={isReimporting ? reimportingDescriptionId : undefined}
          disabled={isReimporting || aiUnavailable}
          onClick={() => setNoteOpen((open) => !open)}
          className="mt-4 flex min-h-12 items-center gap-2 rounded-xl px-1 text-sm font-bold text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronDown size={16} className={noteOpen ? 'rotate-180' : ''} aria-hidden="true" />
          {noteEligible
            ? t('recipes.importIssue.whatToCheck', 'What should we check?', locale)
            : t('recipes.importIssue.addNote', 'Add a note', locale)}
        </button>
        {noteEligible && !aiUnavailable && (
          <p className="mt-1 text-sm text-ink-muted">
            {t(
              'recipes.importIssueCorrectionGuidance',
              'Add or change the note to request automatic correction.',
              locale
            )}
          </p>
        )}
        {noteOpen && (
          <div className="mt-2">
            <label htmlFor="import-issue-note" className="text-sm font-bold text-ink-muted">
              {noteEligible
                ? t('recipes.importIssue.whatToCheck', 'What should we check?', locale)
                : t('recipes.importIssue.optionalNote', 'Optional note', locale)}
            </label>
            <textarea
              id="import-issue-note"
              data-testid="import-issue-note"
              maxLength={500}
              value={note}
              aria-describedby={isReimporting ? reimportingDescriptionId : undefined}
              disabled={isReimporting || aiUnavailable}
              onChange={(event) => setNote(event.target.value)}
              className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-icon-affordance bg-white px-4 py-3 text-ink-body transition focus:border-hearth-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
            />
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm font-bold text-hearth-ink">
            {error}
          </p>
        )}
        {reasons.length === 0 && (
          <p className="mt-3 text-sm text-ink-muted">
            {canReportContentIssues
              ? t(
                  'recipes.importIssue.chooseAny',
                  'Choose Ingredients, Steps, Duplicate, or any combination.',
                  locale
                )
              : t('recipes.importIssue.chooseDuplicate', 'Choose Duplicate.', locale)}
          </p>
        )}
        {!aiUnavailable && (
          <button
            type="button"
            data-testid="import-issue-save"
            aria-describedby={isReimporting ? reimportingDescriptionId : undefined}
            disabled={reasons.length === 0 || busy || isReimporting}
            onClick={() => void save()}
            className="mt-5 min-h-12 w-full rounded-2xl bg-hearth-fill hover:bg-hearth-fill-hover active:bg-hearth-fill-active px-4 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:cursor-not-allowed disabled:opacity-45"
          >
            {t('common.save', 'Save', locale)}
          </button>
        )}

        {existing && (
          <div className="mt-4 border-t border-chrome-line pt-4 text-center">
            <button
              type="button"
              data-testid="import-issue-resolve"
              aria-describedby={isReimporting ? reimportingDescriptionId : undefined}
              disabled={busy || isReimporting}
              onClick={() => void resolve()}
              className={`min-h-12 rounded-2xl border px-5 font-bold text-garden-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body ${issue.status === 'readyToReview' ? 'border-garden-line bg-sage-100' : 'border-garden-line bg-transparent'}`}
            >
              {t('recipes.importIssue.markResolved', 'Mark as resolved', locale)}
            </button>
            <p className="mt-2 text-xs text-ink-muted">
              {t(
                'recipes.importIssue.removesFromReview',
                'Removes this recipe from Needs review.',
                locale
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

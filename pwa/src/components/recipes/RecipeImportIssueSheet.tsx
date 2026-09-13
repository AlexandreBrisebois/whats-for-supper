'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import type {
  RecipeImportIssue,
  RecipeImportIssueDraft,
  RecipeImportIssueReason,
} from '@/lib/api/recipes';
import { RecipeImportIssueReasonObject } from '@/lib/api/generated/models/index';

interface RecipeImportIssueSheetProps {
  issue: RecipeImportIssue | null;
  contextualReason?: RecipeImportIssueReason;
  canReportContentIssues?: boolean;
  isReimporting?: boolean;
  reimportFailureMessage?: string | null;
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

export function RecipeImportIssueSheet({
  issue,
  contextualReason,
  canReportContentIssues = true,
  isReimporting = false,
  reimportFailureMessage = null,
  onClose,
  onSave,
  onResolve,
}: RecipeImportIssueSheetProps) {
  const [reasons, setReasons] = useState<RecipeImportIssueReason[]>(() =>
    mergeReasons(issue, contextualReason)
  );
  const [note, setNote] = useState(issue?.note ?? '');
  const [noteOpen, setNoteOpen] = useState(Boolean(issue?.note));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const existing = issue !== null;
  const title = existing ? 'Review issue' : 'Report issue';

  useEffect(() => closeRef.current?.focus(), []);

  const [reasonAnnouncement, setReasonAnnouncement] = useState('');
  const contentSelected = reasons.some(
    (reason) => reason !== RecipeImportIssueReasonObject.Duplicate
  );
  const duplicateSelected = reasons.includes(RecipeImportIssueReasonObject.Duplicate);
  const noteEligible = contentSelected && canReportContentIssues;

  const toggleReason = (reason: RecipeImportIssueReason) => {
    if (isReimporting) return;
    if (reason !== RecipeImportIssueReasonObject.Duplicate && canReportContentIssues) {
      setNoteOpen(true);
    }
    setReasons((current) => {
      const selected = current.includes(reason);
      if (selected) return current.filter((item) => item !== reason);
      if (reason === RecipeImportIssueReasonObject.Duplicate) {
        const cleared = current.filter((item) => item === RecipeImportIssueReasonObject.Duplicate);
        if (current.length !== cleared.length) setReasonAnnouncement('Ingredients cleared');
        return [RecipeImportIssueReasonObject.Duplicate];
      }
      const cleared = current.filter((item) => item !== RecipeImportIssueReasonObject.Duplicate);
      if (current.length !== cleared.length) setReasonAnnouncement('Duplicate cleared');
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
      'button:not([tabindex="-1"]), input, textarea, [tabindex]:not([tabindex="-1"])'
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
    if (reasons.length === 0 || busy || isReimporting) return;
    setBusy(true);
    setError(null);
    try {
      await onSave({ reasons, note: note.trim() || null });
    } catch (saveError) {
      setError(
        saveError instanceof Error && saveError.message === 'Re-import launch failed'
          ? 'We saved your report, but couldn’t start re-import. Try again later.'
          : 'Could not save changes. Try again.'
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
      setError('Could not mark as resolved. Try again.');
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
        className="absolute inset-0 bg-charcoal/45 backdrop-blur-sm"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-issue-title"
        onKeyDown={handleKeyDown}
        className="relative z-10 w-full max-w-md rounded-t-[2rem] border border-white/40 bg-cream p-6 shadow-2xl sm:rounded-[2rem]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="import-issue-title" className="font-heading text-2xl font-bold text-charcoal">
              {title}
            </h2>
            <p className="mt-1 text-sm text-charcoal/70">What needs a closer look?</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label={`Close ${title.toLowerCase()}`}
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-charcoal/5 text-charcoal"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <fieldset className="mt-6 grid grid-cols-3 gap-2">
          <legend className="sr-only">Issue reasons</legend>
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
                disabled={disabled || isReimporting}
                onClick={() => toggleReason(reason)}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                  selected
                    ? 'border-terracotta-600 bg-terracotta-600 text-white'
                    : 'border-charcoal/10 bg-white text-charcoal disabled:cursor-not-allowed disabled:opacity-45'
                }`}
              >
                {selected && <Check size={16} strokeWidth={3} aria-hidden="true" />}
                {reason === RecipeImportIssueReasonObject.Ingredients
                  ? 'Ingredients'
                  : reason === RecipeImportIssueReasonObject.Steps
                    ? 'Steps'
                    : 'Duplicate'}
              </button>
            );
          })}
        </fieldset>
        <p className="sr-only" role="status" aria-live="polite">
          {reasonAnnouncement}
        </p>
        {!canReportContentIssues && (
          <p
            data-testid="import-issue-content-ineligible"
            className="mt-3 text-sm text-charcoal/60"
          >
            Ingredients and steps can only be reported for recipes that can be re-imported.
          </p>
        )}

        {duplicateSelected && (
          <p className="mt-3 text-sm text-charcoal/70">This will be saved for review.</p>
        )}
        {isReimporting && (
          <p role="status" className="mt-3 text-sm font-bold text-charcoal/70">
            Reimporting recipe… You can update this after it finishes.
          </p>
        )}
        {reimportFailureMessage && (
          <p role="status" className="mt-3 text-sm font-bold text-terracotta-700">
            {reimportFailureMessage}
          </p>
        )}
        {issue?.status === 'readyToReview' && (
          <p className="mt-3 text-sm text-charcoal/70">
            Reimport complete. Check the recipe, then mark this resolved when it looks right.
          </p>
        )}
        <button
          type="button"
          data-testid="import-issue-note-disclosure"
          aria-expanded={noteOpen}
          disabled={isReimporting}
          onClick={() => setNoteOpen((open) => !open)}
          className="mt-4 flex min-h-11 items-center gap-2 text-sm font-bold text-charcoal/75 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronDown size={16} className={noteOpen ? 'rotate-180' : ''} aria-hidden="true" />
          {noteEligible ? 'What should we check?' : 'Add a note'}
        </button>
        {noteEligible && (
          <p className="mt-1 text-sm text-charcoal/60">Add a note to re-import this recipe.</p>
        )}
        {noteOpen && (
          <div className="mt-2">
            <label htmlFor="import-issue-note" className="text-sm font-bold text-charcoal/75">
              {noteEligible ? 'What should we check?' : 'Optional note'}
            </label>
            <textarea
              id="import-issue-note"
              data-testid="import-issue-note"
              maxLength={500}
              value={note}
              disabled={isReimporting}
              onChange={(event) => setNote(event.target.value)}
              className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-charcoal/15 bg-white px-4 py-3 text-charcoal outline-none transition focus:border-terracotta/30 focus:ring-4 focus:ring-terracotta/10"
            />
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm font-bold text-terracotta-700">
            {error}
          </p>
        )}
        {reasons.length === 0 && (
          <p className="mt-3 text-sm text-charcoal/60">
            {canReportContentIssues
              ? 'Choose Ingredients, Steps, Duplicate, or any combination.'
              : 'Choose Duplicate.'}
          </p>
        )}
        <button
          type="button"
          data-testid="import-issue-save"
          disabled={reasons.length === 0 || busy || isReimporting}
          onClick={() => void save()}
          className="mt-5 min-h-12 w-full rounded-2xl bg-terracotta px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          Save
        </button>

        {existing && (
          <div className="mt-4 border-t border-charcoal/10 pt-4 text-center">
            <button
              type="button"
              data-testid="import-issue-resolve"
              disabled={busy || isReimporting}
              onClick={() => void resolve()}
              className={`min-h-11 rounded-2xl border px-5 font-bold text-sage-800 ${issue.status === 'readyToReview' ? 'border-sage-300 bg-sage-100' : 'border-sage-300 bg-transparent'}`}
            >
              Mark as resolved
            </button>
            <p className="mt-2 text-xs text-charcoal/60">Removes this recipe from Needs review.</p>
          </div>
        )}
      </div>
    </div>
  );
}

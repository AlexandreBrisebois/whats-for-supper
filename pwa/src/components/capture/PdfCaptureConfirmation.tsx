'use client';

import { useId, useRef, useState } from 'react';
import { t } from '@/locales';
import { useLocale } from '@/components/common/LocaleProvider';
import type { CaptureRating } from '@/hooks/useCapture';
import { Button } from '@/components/ui/button';
import { SheetMealContext } from '@/components/ui/PivotSheetShell';
import { RecipeRatingControl } from '@/components/recipes/RecipeRatingControl';
import { CaptureHeader } from './CaptureHeader';

export function PdfCaptureConfirmation({
  file,
  enabled,
  onSave,
  onCancel,
}: {
  file: File;
  enabled: boolean;
  onSave: (rating: CaptureRating, notes: string) => Promise<void>;
  onCancel: () => void;
}) {
  const { locale } = useLocale();
  const notesId = useId();
  const [rating, setRating] = useState<CaptureRating>(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const save = async () => {
    if (!enabled || lock.current) return;
    lock.current = true;
    setSaving(true);
    setError(null);
    try {
      await onSave(rating, notes.trim());
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : t(
              'capture.pdf.uncertain',
              'Couldn’t confirm the upload. Try again; another submission may create a duplicate.',
              locale
            )
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  return (
    <section data-testid="pdf-confirmation" className="flex flex-col gap-6 pb-10">
      <CaptureHeader
        title={t('capture.pdf.importHeading', 'Import PDF', locale)}
        onCancel={onCancel}
        cancelDisabled={saving}
      />

      <SheetMealContext
        testId="pdf-file-context"
        title={file.name}
        subtitle={t('capture.pdf.guidance', 'One recipe · up to 10 pages · 20 MiB.', locale)}
        showDivider={false}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-bold text-ink-body">
          {t('recipes.rating', 'Rating', locale)}
        </legend>
        <RecipeRatingControl
          value={rating}
          onChange={setRating}
          disabled={saving}
          testIdPrefix="pdf-rating"
        />
      </fieldset>

      <div className="flex flex-col gap-3">
        <label htmlFor={notesId} className="text-sm font-bold text-ink-body">
          {t('capture.notes', 'Notes (Optional)', locale)}
        </label>
        <textarea
          id={notesId}
          data-testid="pdf-notes"
          value={notes}
          disabled={saving}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t('capture.notesPlaceholder', 'Any tweaks for next time?', locale)}
          className="min-h-[120px] w-full resize-y rounded-3xl border border-icon-affordance bg-white p-5 font-normal text-ink-body placeholder:text-ink-muted focus:border-hearth-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
        />
      </div>

      {error && (
        <p
          role="alert"
          data-testid="pdf-error"
          className="rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm font-medium text-hearth-ink"
        >
          {error}
        </p>
      )}

      <Button
        data-testid="pdf-save"
        onClick={save}
        disabled={!enabled || saving}
        isLoading={saving}
        hideSpinner
        loadingText={t('capture.pdf.preparing', 'Preparing your PDF…', locale)}
        fullWidth
        size="lg"
      >
        {t('capture.saveRecipe', 'Save Recipe', locale)}
      </Button>

      {saving && (
        <p role="status" className="text-center text-sm text-ink-muted">
          {t(
            'capture.pdf.takeYouHome',
            'We’ll take you home as soon as your PDF is saved.',
            locale
          )}
        </p>
      )}
    </section>
  );
}

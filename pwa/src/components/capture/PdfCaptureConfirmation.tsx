'use client';

import { useId, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { t } from '@/locales';
import { useLocale } from '@/components/common/LocaleProvider';
import type { CaptureRating } from '@/hooks/useCapture';
import { Button } from '@/components/ui/button';

export function PdfCaptureConfirmation({
  file,
  enabled,
  onSave,
}: {
  file: File;
  enabled: boolean;
  onSave: (rating: CaptureRating, notes: string) => Promise<void>;
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

  const getRatingClasses = (value: 1 | 2 | 3, selected: boolean) => {
    if (!selected) {
      return 'border-chrome-line bg-white text-ink-muted hover:bg-cream-100';
    }
    if (value === 1) {
      return 'border-hearth-line bg-terracotta-50 text-hearth-ink shadow-sm';
    }
    if (value === 2) {
      return 'border-garden-line bg-sage-50 text-garden-ink shadow-sm';
    }
    return 'border-ink-body bg-white text-ink-body shadow-sm';
  };

  return (
    <section data-testid="pdf-confirmation" className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-ink-body">
          {t('capture.pdf.title', 'Add this recipe to your library', locale)}
        </h2>
        <div className="rounded-2xl border border-chrome-line bg-white px-4 py-3 shadow-sm">
          <p className="break-words font-bold text-ink-body">{file.name}</p>
        </div>
        <p className="text-sm text-ink-muted">
          {t(
            'capture.pdf.guidance',
            'Choose a PDF containing one recipe · up to 10 pages · 20 MiB.',
            locale
          )}
        </p>
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-bold text-ink-body">
          {t('capture.appreciation', 'Appreciation', locale)}
        </legend>
        <div className="flex gap-2">
          {(
            [
              { value: 1, label: 'Not for me', icon: '👎' },
              { value: 2, label: 'It was OK', icon: '👍' },
              { value: 3, label: 'Loved it!', icon: '💚' },
            ] as const
          ).map((option) => {
            const isSelected = rating === option.value;
            return (
              <button
                key={option.value}
                type="button"
                data-testid={`pdf-rating-${option.value}`}
                aria-pressed={isSelected}
                disabled={saving}
                onClick={() => setRating(option.value)}
                className={`relative min-h-12 min-w-12 flex-1 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body ${getRatingClasses(option.value, isSelected)}`}
              >
                {isSelected && (
                  <span className="absolute right-2 top-2" aria-hidden="true">
                    <Check size={14} />
                  </span>
                )}
                <span aria-hidden="true" className="text-2xl leading-none">
                  {option.icon}
                </span>
                <span>{t(`capture.rating.${option.value}`, option.label, locale)}</span>
              </button>
            );
          })}
        </div>
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
        <p role="alert" data-testid="pdf-error" className="text-sm font-medium text-hearth-ink">
          {error}
        </p>
      )}
      <Button
        data-testid="pdf-save"
        onClick={save}
        disabled={!enabled || saving}
        isLoading={saving}
        loadingText={t('capture.pdf.preparing', 'Preparing your PDF…', locale)}
        fullWidth
        size="lg"
      >
        {t('capture.saveRecipe', 'Save Recipe', locale)}
      </Button>
      {saving && (
        <p role="status" className="text-sm text-ink-muted">
          {t(
            'capture.pdf.receipt',
            'Wait for the upload to finish. An interrupted upload may need to be restarted.',
            locale
          )}
        </p>
      )}
    </section>
  );
}

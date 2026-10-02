'use client';

import { useRef, useState } from 'react';
import { t } from '@/locales';
import type { CaptureRating } from '@/hooks/useCapture';
import { Button } from '@/components/ui/button';

export function PdfCaptureConfirmation({ file, enabled, onSave }: {
  file: File; enabled: boolean; onSave: (rating: CaptureRating, notes: string) => Promise<void>;
}) {
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
    try { await onSave(rating, notes.trim()); }
    catch (failure) {
      setError(failure instanceof Error ? failure.message : t('capture.pdf.uncertain', 'Couldn’t confirm the upload. Try again; another submission may create a duplicate.'));
    } finally { lock.current = false; setSaving(false); }
  };
  return (
    <section data-testid="pdf-confirmation" className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-2xl font-black text-charcoal">{t('capture.pdf.title', 'Add this recipe to your library')}</h2>
        <p className="break-words font-bold text-charcoal">{file.name}</p>
        <p className="text-sm text-charcoal/60">{t('capture.pdf.guidance', 'Choose a PDF containing one recipe · up to 10 pages · 20 MiB.')}</p>
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-bold text-charcoal/80">{t('capture.appreciation', 'Appreciation')}</legend>
        <div className="flex gap-2">
          {([{ value: 1, label: 'Not for me', icon: '👎' }, { value: 2, label: 'It was OK', icon: '👍' }, { value: 3, label: 'Loved it!', icon: '💚' }] as const).map((option) => (
            <button key={option.value} type="button" data-testid={`pdf-rating-${option.value}`}
              aria-pressed={rating === option.value} disabled={saving} onClick={() => setRating(option.value)}
              className={`flex-1 rounded-2xl border-2 p-4 text-xs font-bold ${rating === option.value ? 'border-terracotta bg-terracotta/5 text-terracotta' : 'border-charcoal/5 bg-white text-charcoal/60'}`}>
              <span aria-hidden className="mb-2 block text-2xl">{option.icon}</span>
              {t(`capture.rating.${option.value}`, option.label)}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-3 text-sm font-bold text-charcoal/80">
        {t('capture.notes', 'Notes (Optional)')}
        <textarea data-testid="pdf-notes" value={notes} disabled={saving} onChange={(event) => setNotes(event.target.value)}
          placeholder={t('capture.notesPlaceholder', 'Any tweaks for next time?')}
          className="min-h-[120px] w-full resize-none rounded-3xl border-2 border-charcoal/10 bg-white p-5 font-normal focus:border-terracotta focus:outline-none" />
      </label>
      {error && <p role="alert" data-testid="pdf-error" className="text-sm font-medium text-pink">{error}</p>}
      <Button data-testid="pdf-save" onClick={save} disabled={!enabled || saving} isLoading={saving}
        loadingText={t('capture.pdf.preparing', 'Preparing your PDF…')} fullWidth size="lg">
        {t('capture.saveRecipe', 'Save Recipe')}
      </Button>
      {saving && <p role="status" className="text-sm text-charcoal/60">{t('capture.pdf.receipt', 'Wait for the upload to finish. An interrupted upload may need to be restarted.')}</p>}
    </section>
  );
}

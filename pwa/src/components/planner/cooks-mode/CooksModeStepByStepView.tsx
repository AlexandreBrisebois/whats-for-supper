import { Check, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CookingStep } from '@/lib/cooking/stepParser';
import { t } from '@/locales';

export function StepEditErrorAlert({
  editPending,
  onRetry,
}: {
  editPending: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm text-ink-body shadow-sm"
    >
      <p className="min-w-0 flex-1 font-semibold text-hearth-ink">Couldn&apos;t save this step.</p>
      <Button type="button" variant="primary" size="md" disabled={editPending} onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function FocusedEditStepButton({ onStartEdit }: { onStartEdit: () => void }) {
  return (
    <button
      type="button"
      data-testid="cooks-mode-edit-step"
      aria-label="Edit step"
      onClick={onStartEdit}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-hearth-ink focus-visible:ring-2 focus-visible:ring-terracotta"
    >
      <Pencil size={20} aria-hidden="true" />
    </button>
  );
}

export interface CooksModeStepByStepViewProps {
  currentStepData: CookingStep;
  isEditing: boolean;
  editingValue: string;
  editPending: boolean;
  editError: boolean;
  onChangeEditingValue: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

export function CooksModeStepByStepView({
  currentStepData,
  isEditing,
  editingValue,
  editPending,
  editError,
  onChangeEditingValue,
  onSaveEdit,
  onCancelEdit,
}: CooksModeStepByStepViewProps) {
  return (
    <>
      <div className="mb-8 border-b border-charcoal/5 pb-6">
        <h3 className="text-2xl md:text-4xl lg:text-5xl font-heading font-black text-ink-body leading-tight">
          {currentStepData.title}
        </h3>
      </div>

      {isEditing ? (
        <div className="space-y-6 w-full">
          <textarea
            autoFocus
            aria-label="Edit step instructions"
            title="Edit step instructions"
            className="w-full rounded-[2rem] border-2 border-charcoal/5 bg-white/90 px-8 py-8 text-2xl md:text-3xl font-bold text-ink-muted leading-relaxed shadow-inner outline-none transition focus:border-hearth-line"
            rows={8}
            value={editingValue}
            onChange={(event) => onChangeEditingValue(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="button"
              variant="primary"
              size="lg"
              data-testid="cooks-mode-save-edit"
              disabled={editPending}
              onClick={onSaveEdit}
              className="gap-3 rounded-full px-8 shadow-xl shadow-terracotta/20"
            >
              <Check size={20} strokeWidth={3} />
              <span>{editPending ? 'Saving…' : t('common.save', 'Save')}</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              data-testid="cooks-mode-cancel-edit"
              disabled={editPending}
              onClick={onCancelEdit}
              className="gap-3 rounded-full px-8"
            >
              <X size={20} />
              <span>{t('common.cancel', 'Cancel')}</span>
            </Button>
          </div>
          {editError && <StepEditErrorAlert editPending={editPending} onRetry={onSaveEdit} />}
        </div>
      ) : (
        <p
          data-testid="cooks-mode-step-text"
          className="text-2xl md:text-3xl lg:text-4xl font-bold text-ink-muted leading-[1.4] md:leading-[1.5]"
        >
          {currentStepData.instruction}
        </p>
      )}
    </>
  );
}

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCookingInstruction } from '@/lib/cooking/instructionPresentation';
import type { CookingStep } from '@/lib/cooking/stepParser';
import { StepEditErrorAlert } from './CooksModeStepByStepView';

export interface CooksModeAllStepsViewProps {
  steps: CookingStep[];
  projectedSteps: CookingStep[] | null;
  isEditing: boolean;
  editingStepIndex: number | null;
  editingValue: string;
  editPending: boolean;
  editError: boolean;
  onStartEdit: (index: number) => void;
  onChangeEditingValue: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

export function CooksModeAllStepsView({
  steps,
  projectedSteps,
  isEditing,
  editingStepIndex,
  editingValue,
  editPending,
  editError,
  onStartEdit,
  onChangeEditingValue,
  onSaveEdit,
  onCancelEdit,
}: CooksModeAllStepsViewProps) {
  return (
    <div data-testid="all-steps-recipe-list">
      <ol role="list" aria-label="Cooking steps" className="list-none space-y-4">
        {steps.map((step, index) => {
          const rowEditing = editingStepIndex === index;
          const instruction = projectedSteps
            ? step.instruction
            : (step.editableInstruction ?? step.instruction);
          const showTitle =
            Boolean(step.title.trim()) &&
            !/^step\s+\d+$/i.test(step.title.trim()) &&
            step.title.trim() !== instruction.trim();
          const showSection =
            step.sectionTitle && step.sectionTitle !== steps[index - 1]?.sectionTitle;
          const editButton = !rowEditing ? (
            <button
              type="button"
              disabled={isEditing}
              data-testid={`single-page-edit-step-${step.index}`}
              aria-label={`Edit step ${step.index}`}
              onClick={() => {
                onStartEdit(index);
              }}
              className={`h-12 w-12 shrink-0 items-center justify-center rounded-xl text-ink-muted hover:bg-charcoal/5 hover:text-ink-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:opacity-40 ${
                showTitle ? 'col-start-2 row-start-1 flex' : 'float-right -mt-1.5 ml-3 inline-flex'
              }`}
            >
              <Pencil size={18} aria-hidden="true" />
            </button>
          ) : null;
          return (
            <li
              key={step.index}
              data-cooking-step={step.index}
              data-testid={`single-page-step-${step.index}`}
              className="border-b border-charcoal/10 py-5 first:pt-0 last:border-0"
            >
              {showSection && (
                <p className="mb-3 text-sm font-bold text-hearth-ink">{step.sectionTitle}</p>
              )}
              <div className="grid grid-cols-[minmax(0,1fr)_3rem] items-start gap-x-3 gap-y-2">
                <div className="contents">
                  {showTitle && (
                    <h4 className="col-start-1 row-start-1 min-w-0 break-words pt-1.5 font-heading text-xl font-semibold leading-[1.5] text-ink-body">
                      {step.title}
                    </h4>
                  )}
                  {showTitle && editButton}
                  {rowEditing ? (
                    <div className="col-span-2 space-y-3">
                      <textarea
                        autoFocus
                        aria-label={`Edit step ${step.index} instructions`}
                        value={editingValue}
                        onChange={(event) => onChangeEditingValue(event.target.value)}
                        className="min-h-40 w-full rounded-2xl border-2 border-chrome-line bg-white p-4 text-lg text-ink-body outline-none focus:border-hearth-line"
                      />
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          variant="primary"
                          size="md"
                          disabled={editPending}
                          onClick={onSaveEdit}
                          className="rounded-full px-6"
                        >
                          {editPending ? 'Saving…' : 'Save'}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="md"
                          disabled={editPending}
                          onClick={onCancelEdit}
                          className="rounded-full px-6"
                        >
                          Cancel
                        </Button>
                      </div>
                      {editError && (
                        <StepEditErrorAlert editPending={editPending} onRetry={onSaveEdit} />
                      )}
                    </div>
                  ) : (
                    <div
                      data-testid={`single-page-step-body-${step.index}`}
                      className={`min-w-0 space-y-3 break-words text-xl font-normal leading-[1.5] text-ink-body ${
                        showTitle ? 'col-span-2' : 'col-span-2 col-start-1 row-start-1 pt-1.5'
                      }`}
                    >
                      {formatCookingInstruction(instruction).map((paragraph, paragraphIndex) => (
                        <p key={paragraphIndex} className="flow-root">
                          {!showTitle && paragraphIndex === 0 && editButton}
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

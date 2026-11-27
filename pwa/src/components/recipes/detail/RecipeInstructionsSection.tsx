import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  originalInstructions,
  instructionSections,
  changeInstruction,
  changeInstructionSectionName,
  addInstruction,
  addInstructionSection,
  removeInstructionSection,
} from '@/lib/recipes/instruction-draft';
import { parseRecipeSteps, projectedCookingSteps } from '@/lib/cooking/stepParser';
import { formatCookingInstruction } from '@/lib/cooking/instructionPresentation';
import { t, tWithVars } from '@/locales';
import type { PreviewPortions, Recipe } from '@/lib/api/recipes';
import type { IngredientPreview, IngredientProjection } from '@/lib/api/generated/models/index';

export interface RecipeInstructionsSectionProps {
  recipe: Recipe;
  isEditing: boolean;
  isSavingRecipe: boolean;
  structuredEditing: boolean;
  draftInstructions: unknown[] | undefined;
  setDraftInstructions: React.Dispatch<React.SetStateAction<unknown[] | undefined>>;
  previewTarget: PreviewPortions | null;
  displayedProjection?: IngredientPreview | IngredientProjection;
}

export function RecipeInstructionsSection({
  recipe,
  isEditing,
  isSavingRecipe,
  structuredEditing,
  draftInstructions,
  setDraftInstructions,
  previewTarget,
  displayedProjection,
}: RecipeInstructionsSectionProps) {
  const projectedSteps = projectedCookingSteps(displayedProjection);
  const steps = projectedSteps ?? parseRecipeSteps(recipe.recipeInstructions);

  return (
    <section role="region" aria-labelledby="recipe-instructions-heading" className="min-w-0">
      <h3 id="recipe-instructions-heading" className="mb-4 text-xl font-semibold text-ink-body">
        {t('recipes.instructions', 'Instructions')}
      </h3>
      {previewTarget &&
        !projectedSteps &&
        displayedProjection?.factor != null &&
        displayedProjection.factor !== 1 &&
        displayedProjection.lines?.some((line) => line.status === 'scaled') && (
          <p data-testid="recipe-instruction-limitation" className="mb-4 text-sm text-ink-body">
            {t('cook.originalAmounts', 'Ingredients are adjusted; step amounts remain original.')}
          </p>
        )}
      {isEditing ? (
        <div className="grid min-w-0 gap-4">
          {(() => {
            const currentInstructions = draftInstructions ?? originalInstructions(recipe);
            const editableSections = instructionSections(currentInstructions, structuredEditing);
            return (
              <>
                {editableSections.map((section) => (
                  <div
                    key={section.key}
                    data-testid={`recipe-edit-section-${section.sectionIndex}`}
                    className="grid min-w-0 gap-3 rounded-2xl border border-chrome-line p-3"
                  >
                    <div className="flex items-end gap-2">
                      <label className="grid min-w-0 flex-1 gap-2">
                        <span className="text-sm font-semibold text-ink-body">
                          {tWithVars('recipes.sectionHeader', 'Section {{number}} header', {
                            number: section.sectionIndex + 1,
                          })}
                        </span>
                        <input
                          type="text"
                          data-testid={`recipe-edit-section-header-${section.sectionIndex}`}
                          disabled={isSavingRecipe}
                          placeholder={t(
                            'recipes.sectionHeaderPlaceholder',
                            'Optional section header'
                          )}
                          value={section.name}
                          onChange={(event) =>
                            setDraftInstructions(
                              changeInstructionSectionName(
                                currentInstructions,
                                structuredEditing,
                                section.sectionIndex,
                                event.target.value
                              )
                            )
                          }
                          className="min-h-12 min-w-0 w-full rounded-xl border border-chrome-line bg-white px-3 py-2 text-base font-semibold text-ink-body"
                        />
                      </label>
                      <button
                        type="button"
                        data-testid={`recipe-remove-section-${section.sectionIndex}`}
                        disabled={isSavingRecipe}
                        aria-label={tWithVars(
                          'recipes.removeSection',
                          'Remove section {{number}}',
                          {
                            number: section.sectionIndex + 1,
                          }
                        )}
                        title={tWithVars('recipes.removeSection', 'Remove section {{number}}', {
                          number: section.sectionIndex + 1,
                        })}
                        onClick={() =>
                          setDraftInstructions(
                            removeInstructionSection(
                              currentInstructions,
                              structuredEditing,
                              section.sectionIndex
                            )
                          )
                        }
                        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-icon-affordance transition hover:bg-charcoal/5 hover:text-ink-body disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    </div>
                    {section.steps.map((row) => (
                      <div key={row.path.join(':')} className="grid min-w-0 gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor={`recipe-edit-step-${row.stepNumber - 1}-input`}
                            className="text-sm font-semibold text-ink-body"
                          >
                            {tWithVars('recipes.stepInstructions', 'Step {{number}} instructions', {
                              number: row.stepNumber,
                            })}
                          </label>
                          <button
                            type="button"
                            data-testid={`recipe-remove-step-${row.stepNumber - 1}`}
                            disabled={isSavingRecipe}
                            aria-label={tWithVars('recipes.removeStep', 'Remove step {{number}}', {
                              number: row.stepNumber,
                            })}
                            title={tWithVars('recipes.removeStep', 'Remove step {{number}}', {
                              number: row.stepNumber,
                            })}
                            onClick={() =>
                              setDraftInstructions(
                                changeInstruction(
                                  currentInstructions,
                                  structuredEditing,
                                  row.path,
                                  null
                                )
                              )
                            }
                            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-icon-affordance transition hover:bg-charcoal/5 hover:text-ink-body disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                          >
                            <Trash2 size={18} aria-hidden="true" />
                          </button>
                        </div>
                        <textarea
                          id={`recipe-edit-step-${row.stepNumber - 1}-input`}
                          rows={3}
                          data-testid={`recipe-edit-step-${row.stepNumber - 1}`}
                          disabled={isSavingRecipe}
                          value={row.text}
                          onChange={(event) =>
                            setDraftInstructions(
                              changeInstruction(
                                currentInstructions,
                                structuredEditing,
                                row.path,
                                event.target.value
                              )
                            )
                          }
                          className="min-w-0 w-full rounded-2xl border border-chrome-line bg-white p-3 text-base text-ink-body"
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      data-testid={`recipe-add-step-section-${section.sectionIndex}`}
                      disabled={isSavingRecipe}
                      aria-label={
                        editableSections.length > 1
                          ? tWithVars(
                              'recipes.addStepToSection',
                              'Add step to section {{number}}',
                              {
                                number: section.sectionIndex + 1,
                              }
                            )
                          : undefined
                      }
                      onClick={() =>
                        setDraftInstructions(
                          addInstruction(
                            currentInstructions,
                            structuredEditing,
                            section.sectionIndex
                          )
                        )
                      }
                      className="rounded-xl border-chrome-line px-4 text-sm font-semibold text-ink-body hover:bg-cream"
                    >
                      {t('recipes.addStep', 'Add step')}
                    </Button>
                  </div>
                ))}
                {editableSections.length === 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    disabled={isSavingRecipe}
                    onClick={() =>
                      setDraftInstructions(addInstruction(currentInstructions, structuredEditing))
                    }
                    className="rounded-xl border-chrome-line px-4 text-sm font-semibold text-ink-body hover:bg-cream"
                  >
                    {t('recipes.addStep', 'Add step')}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  data-testid="recipe-add-section"
                  disabled={isSavingRecipe}
                  onClick={() =>
                    setDraftInstructions(
                      addInstructionSection(currentInstructions, structuredEditing)
                    )
                  }
                  className="rounded-xl border-chrome-line px-4 text-sm font-semibold text-ink-body hover:bg-cream"
                >
                  {t('recipes.addSection', 'Add section')}
                </Button>
              </>
            );
          })()}
        </div>
      ) : steps.length ? (
        <ol className="space-y-5">
          {steps.map((step, index) => (
            <li
              key={step.index}
              value={step.index}
              className="text-base leading-relaxed text-ink-body"
            >
              {step.sectionTitle && step.sectionTitle !== steps[index - 1]?.sectionTitle && (
                <h4 className="mb-3 text-lg font-semibold text-garden-ink">{step.sectionTitle}</h4>
              )}
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-50 border border-garden-line text-sm font-semibold text-garden-ink"
                >
                  {step.index}
                </span>
                <div className="min-w-0 whitespace-pre-wrap break-words">
                  {formatCookingInstruction(
                    projectedSteps
                      ? step.instruction
                      : (step.editableInstruction ?? step.instruction)
                  ).map((paragraph, part) => (
                    <p key={part} className={part ? 'mt-3' : undefined}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-base leading-relaxed text-ink-muted">
          {t('recipes.instructionsUnavailable', 'Instructions are unavailable for this recipe.')}
        </p>
      )}
    </section>
  );
}

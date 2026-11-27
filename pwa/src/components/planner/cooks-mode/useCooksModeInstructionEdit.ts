import { useLayoutEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getIngredientProjection, getRecipe, updateRecipe } from '@/lib/api/recipes';
import type { IngredientContext, Recipe } from '@/lib/api/recipes';
import type { IngredientProjection } from '@/lib/api/generated/models';
import { parseRecipeSteps, type CookingStep } from '@/lib/cooking/stepParser';
import type { ProjectionReadState, QuantityGenerationControls, QuantityNoticeState } from './types';

function updateInstructionValue(value: unknown, instruction: string): unknown {
  if (typeof value === 'string') return instruction;
  if (typeof value !== 'object' || value === null) return value;
  const step = value as Record<string, unknown>;
  if ('text' in step) return { ...step, text: instruction };
  return { ...step, name: instruction };
}

export interface UseCooksModeInstructionEditOptions {
  recipeId: string;
  ingredientContext?: IngredientContext;
  contextKey: string | null;
  contentKey: string;
  recipeDetails: Recipe | null;
  projection?: IngredientProjection;
  steps: CookingStep[];
  isEditing: boolean;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  setRecipeDetails: Dispatch<SetStateAction<Recipe | null>>;
  setParsedSteps: Dispatch<SetStateAction<CookingStep[]>>;
  setProjectionRead: Dispatch<SetStateAction<ProjectionReadState | null>>;
  setQuantityNotice: Dispatch<SetStateAction<QuantityNoticeState | null>>;
  generationControls: QuantityGenerationControls;
}

export function useCooksModeInstructionEdit({
  recipeId,
  ingredientContext,
  contextKey,
  contentKey,
  recipeDetails,
  projection,
  steps,
  isEditing,
  setIsEditing,
  setRecipeDetails,
  setParsedSteps,
  setProjectionRead,
  setQuantityNotice,
  generationControls,
}: UseCooksModeInstructionEditOptions) {
  const [editingValue, setEditingValue] = useState('');
  const activeInstructionDraft = useRef(editingValue);
  useLayoutEffect(() => {
    activeInstructionDraft.current = editingValue;
  }, [editingValue]);

  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editSnapshot, setEditSnapshot] = useState<{
    details: Recipe;
    projection: IngredientProjection | undefined;
    step: CookingStep;
  } | null>(null);
  const uncertainInstructionSave = useRef(false);
  const [editPending, setEditPending] = useState(false);
  const [editError, setEditError] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState('');

  const editingStep = editingStepIndex === null ? null : editSnapshot?.step;

  const startEdit = (index: number) => {
    if (!recipeDetails) return;
    const step = steps[index];
    // A retained draft stays bound to its original content even across explicit refresh.
    setEditSnapshot({ details: recipeDetails, projection, step });
    setIsEditing(true);
    setEditingStepIndex(index);
    setEditingValue(step.editableInstruction ?? step.instruction);
    setEditError(false);
  };

  const handleSaveEdit = async () => {
    if (editPending) return;
    const snapshot = editSnapshot;
    const details = snapshot?.details;
    const capturedProjection = snapshot?.projection;
    if (!details || !editingStep || editingValue === editingStep.editableInstruction) {
      setIsEditing(false);
      setEditingStepIndex(null);
      return;
    }

    setEditPending(true);
    setEditError(false);
    try {
      const datedSections = capturedProjection?.instructionProjection?.sections;
      if (datedSections || (details.instructionSections && details.contentRevision)) {
        // A dated editor requires its captured coherent projection even while
        // recovering. A detail read cannot turn it into an original-context save.
        if (ingredientContext && (!datedSections || !capturedProjection?.contentRevision))
          throw new Error('Missing captured cooking instruction projection');
        const revision = capturedProjection?.contentRevision ?? details.contentRevision!;
        const [sectionIndex, stepIndex] = editingStep.sourcePath!;
        const instructionSections = datedSections
          ? datedSections.map((section, outer) => ({
              id: section.sectionId,
              name: section.name ?? null,
              steps: (section.steps ?? []).map((step, inner) => ({
                id: step.stepId,
                text:
                  outer === sectionIndex && inner === stepIndex ? editingValue : step.originalText,
              })),
            }))
          : details.instructionSections!.map((section, outer) => ({
              id: section.id,
              name: section.name ?? null,
              steps: (section.steps ?? []).map((step, inner) => ({
                id: step.id,
                text: outer === sectionIndex && inner === stepIndex ? editingValue : step.text,
              })),
            }));
        const generation = generationControls.nextGeneration();
        let saved: Recipe | void = undefined;
        if (uncertainInstructionSave.current) {
          const current = await getRecipe(recipeId);
          if (
            generation !== generationControls.currentGeneration() ||
            editingValue !== activeInstructionDraft.current
          )
            throw new Error('Instruction recovery superseded');
          const savedSections = current.instructionSections?.map((section) => ({
            id: section.id,
            name: section.name ?? null,
            steps: (section.steps ?? []).map((step) => ({ id: step.id, text: step.text })),
          }));
          if (
            current.contentRevision &&
            JSON.stringify(savedSections) === JSON.stringify(instructionSections)
          ) {
            // Confirm the entire intended original content, not just a changed
            // opaque revision or the prior attempt's text after the draft changes.
            saved = current;
          } else if (current.contentRevision !== revision) {
            throw new Error('Instruction recovery needs current-content review');
          }
        }
        if (!saved) {
          uncertainInstructionSave.current = true;
          saved = await updateRecipe(recipeId, {
            expectedContentRevision: revision,
            instructionSections,
          });
        }
        if (!saved) throw new Error('Missing authoritative recipe after instruction save');
        // A failed post-save read is also uncertain from the editor's perspective:
        // recovery reads current detail instead of resubmitting the instruction.
        if (ingredientContext && contextKey) {
          const current = await getIngredientProjection(recipeId, ingredientContext);
          if (
            generation !== generationControls.currentGeneration() ||
            editingValue !== activeInstructionDraft.current
          )
            throw new Error('Instruction save superseded');
          generationControls.bumpGeneration();
          setProjectionRead({ key: contextKey, data: current });
        } else {
          if (
            generation !== generationControls.currentGeneration() ||
            editingValue !== activeInstructionDraft.current
          )
            throw new Error('Instruction save superseded');
          setParsedSteps(parseRecipeSteps(saved.recipeInstructions));
        }
        setRecipeDetails(saved);
        setQuantityNotice({ key: contentKey, error: false, available: false });
        uncertainInstructionSave.current = false;
        setIsEditing(false);
        setEditingStepIndex(null);
        setEditAnnouncement('Step saved');
        return;
      }

      const originalInstructions = [...(details.recipeInstructions || [])];
      const [outerIndex, innerIndex] = editingStep.sourcePath ?? [editingStepIndex ?? 0];
      const updatedInstructions = originalInstructions.map((entry, index) => {
        if (index !== outerIndex) return entry;
        if (innerIndex !== undefined && typeof entry === 'object' && entry !== null) {
          const section = entry as { itemListElement?: unknown[] };
          return {
            ...section,
            itemListElement: (section.itemListElement ?? []).map((step, stepIndex) =>
              stepIndex === innerIndex ? updateInstructionValue(step, editingValue) : step
            ),
          };
        }
        return updateInstructionValue(entry, editingValue);
      });

      await updateRecipe(recipeId, {
        recipeInstructions: updatedInstructions,
      });

      const updatedDetails = {
        ...details,
        recipeInstructions: updatedInstructions,
      };
      setRecipeDetails(updatedDetails);
      const newSteps = parseRecipeSteps(updatedInstructions);
      if (newSteps.length > 0) {
        setParsedSteps(newSteps);
      }
      setIsEditing(false);
      setEditingStepIndex(null);
      setEditAnnouncement('Step saved');
    } catch (error) {
      console.error('[CooksMode] Failed to save instruction edit:', error);
      setEditError(true);
    } finally {
      setEditPending(false);
    }
  };

  const handleCancelEdit = () => {
    const stepIndex = editingStep?.index;
    setIsEditing(false);
    setEditingStepIndex(null);
    setEditError(false);
    if (stepIndex !== undefined) {
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLButtonElement>(`[data-testid="single-page-edit-step-${stepIndex}"]`)
          ?.focus();
      });
    }
  };

  return {
    isEditing,
    editingValue,
    setEditingValue,
    editingStepIndex,
    editPending,
    editError,
    editAnnouncement,
    startEdit,
    handleSaveEdit,
    handleCancelEdit,
  };
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/image', () => ({
  default: ({ fill: _fill, priority: _priority, unoptimized: _unoptimized, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt} />
  ),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
}));

vi.mock('@/components/ui/SolarLoader', () => ({
  SolarLoader: () => <div>Loading...</div>,
}));

vi.mock('@/lib/imageUtils', () => ({
  getImageUrl: (value: string) => value,
}));

const getRecipeMock = vi.fn();
const updateRecipeMock = vi.fn();
const saveRecipeImportIssueMock = vi.fn();
const resolveRecipeImportIssueMock = vi.fn();

vi.mock('@/lib/api/recipes', () => ({
  getRecipe: (...args: any[]) => getRecipeMock(...args),
  updateRecipe: (...args: any[]) => updateRecipeMock(...args),
  saveRecipeImportIssue: (...args: any[]) => saveRecipeImportIssueMock(...args),
  resolveRecipeImportIssue: (...args: any[]) => resolveRecipeImportIssueMock(...args),
}));

vi.mock('@/components/recipes/RecipeDetailSheet', () => ({
  RecipeDetailSheet: ({ recipeId }: { recipeId: string }) => (
    <div data-testid="recipe-detail-sheet">Recipe Detail for {recipeId}</div>
  ),
}));

import { CooksMode } from './CooksMode';
import { usePlannerStore } from '@/store/plannerStore';

describe('CooksMode', () => {
  beforeEach(() => {
    getRecipeMock.mockReset();
    updateRecipeMock.mockReset();
    saveRecipeImportIssueMock.mockReset();
    resolveRecipeImportIssueMock.mockReset();
    usePlannerStore.setState({ cookProgress: {} });
  });

  it('reports Ingredients from Check & Prep without losing checked ingredients or cook progress', async () => {
    const recipe = {
      id: 'recipe-1',
      name: 'Pasta Night',
      canReimport: true,
      importIssue: null,
      ingredients: ['Pasta', 'Tomatoes'],
      recipeInstructions: [{ name: 'Boil Water', text: 'Boil the water.' }],
    };
    getRecipeMock.mockResolvedValue(recipe);
    saveRecipeImportIssueMock.mockResolvedValue({
      ...recipe,
      importIssue: {
        reasons: ['ingredients', 'steps'],
        note: null,
        status: 'reported',
      },
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    const firstIngredient = (await screen.findAllByTestId('ingredient-toggle'))[0];
    fireEvent.click(firstIngredient);

    const reportAction = screen.getByRole('button', { name: 'Report issue with ingredients' });
    expect(reportAction).toHaveClass('h-12', 'w-12', 'text-terracotta/70');
    expect(reportAction).toHaveTextContent('');
    expect(reportAction.closest('[data-testid="cooks-mode-controls"]')).toBeNull();
    fireEvent.click(reportAction);

    expect(screen.getByRole('button', { name: 'Ingredients' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Steps' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Steps' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(saveRecipeImportIssueMock).toHaveBeenCalledWith('recipe-1', {
        reasons: ['ingredients', 'steps'],
        note: null,
      })
    );
    expect(screen.queryByRole('dialog', { name: 'Report import issue' })).toBeNull();
    expect(firstIngredient).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('heading', { name: 'Check & Prep' })).toBeInTheDocument();
    expect(usePlannerStore.getState().cookProgress['recipe-1']).toBeUndefined();
  });

  it('merges Steps into an existing issue and preserves its reasons, note, and active step', async () => {
    const recipe = {
      id: 'recipe-1',
      name: 'Pasta Night',
      canReimport: true,
      ingredients: ['Pasta'],
      recipeInstructions: [{ name: 'Boil Water', text: 'Boil the water.' }],
      importIssue: {
        reasons: ['ingredients'],
        note: 'The amounts are unclear',
        status: 'reported',
      },
    };
    getRecipeMock.mockResolvedValue(recipe);
    saveRecipeImportIssueMock.mockResolvedValue({
      ...recipe,
      importIssue: {
        reasons: ['ingredients', 'steps'],
        note: 'The amounts are unclear',
        status: 'reported',
      },
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(await screen.findByTestId('cooks-mode-step-next'));
    expect(await screen.findByRole('heading', { name: 'Boil Water' })).toBeInTheDocument();

    const reportAction = screen.getByRole('button', { name: 'Report issue with steps' });
    const editAction = screen.getByRole('button', { name: 'Edit step' });
    expect(reportAction).toHaveClass('h-12', 'w-12', 'text-terracotta/70');
    expect(editAction).toHaveClass('h-12', 'w-12');
    expect(reportAction).toHaveTextContent('');
    expect(editAction).toHaveTextContent('');
    expect(reportAction.closest('[data-testid="cooks-mode-hero"]')).toBeInTheDocument();
    expect(editAction.closest('[data-testid="cooks-mode-hero"]')).toBeInTheDocument();
    expect(reportAction.closest('[data-testid="cooks-mode-controls"]')).toBeNull();
    fireEvent.click(reportAction);

    expect(screen.queryByTestId('recipe-detail-sheet')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ingredients' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Steps' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Optional note')).toHaveValue('The amounts are unclear');

    fireEvent.click(screen.getByRole('button', { name: 'Close review import issue' }));
    expect(screen.queryByRole('dialog', { name: 'Review import issue' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Boil Water' })).toBeInTheDocument();
    expect(usePlannerStore.getState().cookProgress['recipe-1']).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Report issue with steps' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(saveRecipeImportIssueMock).toHaveBeenCalledWith('recipe-1', {
        reasons: ['ingredients', 'steps'],
        note: 'The amounts are unclear',
      })
    );
    expect(screen.queryByRole('dialog', { name: 'Review import issue' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Boil Water' })).toBeInTheDocument();
    expect(usePlannerStore.getState().cookProgress['recipe-1']).toBe(1);
  });

  it('does not offer contextual reporting for an ineligible recipe', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Synthesized Pasta',
      canReimport: false,
      ingredients: ['Pasta'],
      recipeInstructions: [{ name: 'Step 1', text: 'Cook pasta.' }],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Synthesized Pasta', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    await screen.findByRole('heading', { name: 'Check & Prep' });
    expect(screen.queryByRole('button', { name: /Report issue with/ })).toBeNull();
  });

  it("keeps check and prep focused on ingredients, then starts recipe content at step 1 after Let's Cook", async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      description: '',
      imageUrl: '/img/pasta.jpg',
      totalTime: '30 mins',
      category: 'Dinner',
      rating: 0,
      ingredients: ['Pasta', 'Tomatoes'],
      recipeInstructions: [
        { name: 'Boil Water', text: 'Bring a large pot of salted water to a boil.' },
        { name: 'Cook Pasta', text: 'Cook the pasta until al dente.' },
      ],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByRole('heading', { name: 'Check & Prep' })).toBeInTheDocument();
    expect(screen.getByText('Pasta')).toBeInTheDocument();
    expect(screen.queryByText('Boil Water')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Bring a large pot of salted water to a boil.')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cooks-mode-step-next'));

    expect(await screen.findByText('Boil Water')).toBeInTheDocument();
    expect(screen.getByText('Bring a large pot of salted water to a boil.')).toBeInTheDocument();
  });

  it('aligns instructions to the left for better legibility', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      recipeInstructions: [{ name: 'Step 1', text: 'Instruction 1' }],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    // Advance past Check & Prep
    fireEvent.click(await screen.findByTestId('cooks-mode-step-next'));

    const instructionArea = screen.getByText('Instruction 1').closest('.text-left');
    expect(instructionArea).toBeInTheDocument();
  });

  it('renders a large editorial hero image and opens detail sheet on tap', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      recipeInstructions: [{ name: 'Step 1', text: 'Instruction 1' }],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    const heroImage = await screen.findByAltText('Pasta Night');
    const heroContainer = heroImage.closest('div');

    // Requirement: Larger, editorial hero image (not h-14 w-14)
    expect(heroContainer).not.toHaveClass('h-14');
    expect(heroContainer).toHaveClass('h-48'); // Assuming h-48 or similar for "large"

    // Tapping the hero image should open the detail sheet
    fireEvent.click(heroImage);
    expect(screen.getByTestId('recipe-detail-sheet')).toBeInTheDocument();
  });

  it('allows editing a step and saves on explicit Save button click', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      recipeInstructions: ['Original Step 1', 'Original Step 2'],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    // Advance to Step 1
    fireEvent.click(await screen.findByTestId('cooks-mode-step-next'));

    // Should find a pencil icon to trigger edit
    const editBtn = screen.getByTestId('cooks-mode-edit-step');
    fireEvent.click(editBtn);

    const textarea = screen.getByDisplayValue('Original Step 1');
    fireEvent.change(textarea, { target: { value: 'Updated Step 1' } });

    // Save button should be present
    const saveBtn = screen.getByTestId('cooks-mode-save-edit');
    fireEvent.click(saveBtn);

    await waitFor(() =>
      expect(updateRecipeMock).toHaveBeenCalledWith('recipe-1', {
        recipeInstructions: ['Updated Step 1', 'Original Step 2'],
      })
    );
    expect(await screen.findByText('Updated Step 1')).toBeInTheDocument();
  });

  it('cancels editing without saving when Cancel button is clicked', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      recipeInstructions: ['Original Step 1'],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    // Advance to Step 1
    fireEvent.click(await screen.findByTestId('cooks-mode-step-next'));

    fireEvent.click(screen.getByTestId('cooks-mode-edit-step'));
    const textarea = screen.getByDisplayValue('Original Step 1');
    fireEvent.change(textarea, { target: { value: 'Nonsense' } });

    const cancelBtn = screen.getByTestId('cooks-mode-cancel-edit');
    fireEvent.click(cancelBtn);

    expect(updateRecipeMock).not.toHaveBeenCalled();
    expect(screen.getByText('Original Step 1')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Nonsense')).not.toBeInTheDocument();
  });

  it('ingredient checklist toggles aria-checked on tap', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      ingredients: ['Pasta', 'Tomatoes'],
      recipeInstructions: [{ name: 'Step 1', text: 'Cook pasta.' }],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    const toggles = await screen.findAllByTestId('ingredient-toggle');
    const first = toggles[0];

    expect(first).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-checked', 'false');
  });

  it('dietary badge text is absent on the ingredient prep screen', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      isVegetarian: true,
      isHealthyChoice: true,
      ingredients: ['Pasta'],
      recipeInstructions: [{ name: 'Step 1', text: 'Cook pasta.' }],
    });

    render(
      <CooksMode
        recipe={{
          id: 'recipe-1',
          name: 'Pasta Night',
          image: '/img/pasta.jpg',
          isVegetarian: true,
          isHealthyChoice: true,
        }}
        onClose={vi.fn()}
      />
    );

    await screen.findByTestId('ingredient-toggle');

    expect(screen.queryByText('Plant-Powered Choice!')).not.toBeInTheDocument();
    expect(screen.queryByText('Healthy Pick!')).not.toBeInTheDocument();
  });

  it('next button reads "Let\'s Cook" on the ingredient prep screen (step 0)', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      ingredients: ['Pasta'],
      recipeInstructions: [{ name: 'Step 1', text: 'Cook pasta.' }],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    await screen.findByTestId('ingredient-toggle');

    expect(screen.getByTestId('cooks-mode-step-next')).toHaveTextContent("Let's Cook");
  });
});

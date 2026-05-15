import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

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

vi.mock('@/lib/api/recipes', () => ({
  getRecipe: (...args: any[]) => getRecipeMock(...args),
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
    usePlannerStore.setState({ cookProgress: {} });
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
});

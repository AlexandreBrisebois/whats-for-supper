import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { setLocale } from '@/locales';
import { TonightMenuCard } from './TonightMenuCard';

const projectionMocks = vi.hoisted(() => ({
  read: vi.fn(),
  invalidate: null as (() => void) | null,
}));
vi.mock('@/lib/api/recipes', () => ({ getIngredientProjection: projectionMocks.read }));
vi.mock('@/lib/ingredient-projection-invalidation', () => ({
  subscribeIngredientProjectionInvalidation: (_context: unknown, invalidate: () => void) => {
    projectionMocks.invalidate = invalidate;
    return () => {
      projectionMocks.invalidate = null;
    };
  },
}));
beforeEach(() => {
  setLocale('en');
  projectionMocks.read.mockReset();
  projectionMocks.invalidate = null;
});
const recipe = {
  recipeId: 'one',
  recipeName: 'Garden supper',
  description: 'Fresh vegetables',
  ingredients: ['Carrot'],
};

describe('Tonight planned actions and disclosure', () => {
  it('exposes one Cook and Change plan and calls each once without opening details', () => {
    const onCookMode = vi.fn();
    const onSkip = vi.fn();
    render(<TonightMenuCard {...recipe} onCookMode={onCookMode} onSkip={onSkip} />);
    expect(screen.getByTestId('cook-mode-btn')).toBeVisible();
    expect(screen.getByTestId('skip-tonight-btn')).toBeVisible();
    expect(screen.getByTestId('cook-mode-btn')).toHaveAccessibleName('Cook');
    expect(screen.getByTestId('skip-tonight-btn')).toHaveAccessibleName('Change plan');
    fireEvent.click(screen.getByTestId('cook-mode-btn'));
    fireEvent.click(screen.getByTestId('skip-tonight-btn'));
    expect(onCookMode).toHaveBeenCalledExactlyOnceWith('one');
    expect(onSkip).toHaveBeenCalledExactlyOnceWith('one');
    expect(screen.queryByText('Carrot')).not.toBeInTheDocument();
  });

  it('only explicit disclosure opens and closes details with semantic state', () => {
    const onCookMode = vi.fn();
    const onSkip = vi.fn();
    render(<TonightMenuCard {...recipe} onCookMode={onCookMode} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('heading', { name: recipe.recipeName }));
    const toggle = screen.getByTestId('tonight-ingredients-toggle');
    expect(toggle).toHaveAccessibleName('View ingredients');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAccessibleName('Hide ingredients');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toHaveTextContent(
      'Carrot'
    );
    expect(screen.getByText(recipe.description)).toBeVisible();
    expect(screen.getByTestId('cook-mode-btn')).toBeVisible();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Carrot')).not.toBeInTheDocument();
    expect(onCookMode).not.toHaveBeenCalled();
    expect(onSkip).not.toHaveBeenCalled();
  });

  it('keeps same-identity hydration expanded and resets for a different identity', () => {
    const { rerender } = render(<TonightMenuCard recipeId="one" recipeName="Garden supper" />);
    fireEvent.click(screen.getByTestId('tonight-ingredients-toggle'));
    expect(screen.getByText('No ingredients listed')).toBeVisible();
    rerender(<TonightMenuCard {...recipe} />);
    expect(screen.getByText('Carrot')).toBeVisible();
    expect(screen.getByTestId('tonight-ingredients-toggle')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    rerender(<TonightMenuCard recipeId="two" recipeName="New supper" ingredients={['Peas']} />);
    expect(screen.getByTestId('tonight-ingredients-toggle')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByText('Carrot')).not.toBeInTheDocument();
    expect(screen.queryByText('Peas')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tonight-ingredients-toggle'));
    expect(screen.getByText('Peas')).toBeVisible();
  });

  it('uses equivalent French disclosure and empty feedback', () => {
    setLocale('fr');
    render(<TonightMenuCard recipeId="one" recipeName="Souper" />);
    const toggle = screen.getByTestId('tonight-ingredients-toggle');
    expect(toggle).toHaveAccessibleName('Voir les ingrédients');
    fireEvent.click(toggle);
    expect(toggle).toHaveAccessibleName('Masquer les ingrédients');
    expect(screen.getByText('Aucun ingrédient listé')).toBeVisible();
  });
});

describe('Tonight planned image availability', () => {
  it('removes a failed image, retains actions and retries only for a new source or identity', () => {
    const props = { ...recipe, imageUrl: '/first.jpg' };
    const { rerender } = render(<TonightMenuCard {...props} />);
    fireEvent.error(screen.getByRole('img', { name: recipe.recipeName }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: recipe.recipeName })).toBeVisible();
    expect(screen.getByTestId('cook-mode-btn')).toBeVisible();
    rerender(<TonightMenuCard {...props} description="Hydrated" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    rerender(<TonightMenuCard {...props} imageUrl="/second.jpg" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/second.jpg');
    fireEvent.error(screen.getByRole('img'));
    rerender(<TonightMenuCard {...props} recipeId="two" imageUrl="/second.jpg" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/second.jpg');
  });
});

it('handles a cached failure that completed before the image handler attached', () => {
  const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
  try {
    render(<TonightMenuCard {...recipe} imageUrl="/already-failed.jpg" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('cook-mode-btn')).toBeVisible();
  } finally {
    complete.mockRestore();
  }
});

const assigned = {
  context: 'assigned' as const,
  supperDate: '2026-05-04',
  occurrenceId: 'occurrence-one',
};
const projected = (quantity = 600, extra = {}) => ({
  version: 'version-one',
  recipeId: 'one',
  ...assigned,
  originalServings: 2,
  targetServings: 6,
  factor: 3,
  status: 'complete',
  lines: [
    { originalText: '200 g pasta', name: 'pasta', quantity, unitText: 'g', status: 'scaled' },
  ],
  ...extra,
});

describe('Tonight captured dated ingredients', () => {
  it('reads only on disclosure and shows the dated six portions instead of original two', async () => {
    projectionMocks.read.mockResolvedValue(projected());
    render(
      <TonightMenuCard {...recipe} ingredients={['200 g pasta']} ingredientContext={assigned} />
    );
    expect(projectionMocks.read).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('tonight-ingredients-toggle'));
    expect(screen.queryByText('200 g pasta')).not.toBeInTheDocument();
    expect(await screen.findByText('600 g pasta')).toBeVisible();
    expect(screen.getByTestId('ingredients-info-title')).toHaveTextContent('6 portions');
    expect(projectionMocks.read).toHaveBeenCalledExactlyOnceWith('one', assigned);
  });

  it('keeps partial/unknown lines verbatim and the existing review feedback', async () => {
    projectionMocks.read.mockResolvedValue(
      projected(600, {
        status: 'partial',
        lines: [...projected().lines, { originalText: 'salt to taste', status: 'unresolved' }],
      })
    );
    render(<TonightMenuCard {...recipe} ingredientContext={assigned} />);
    fireEvent.click(screen.getByTestId('tonight-ingredients-toggle'));
    expect(await screen.findByText('600 g pasta')).toBeVisible();
    expect(screen.getByText('salt to taste')).toBeVisible();
    expect(
      screen.getByText('Some amounts need review. Consult the original recipe.')
    ).toBeVisible();
  });

  it('honestly shows pending, failed and retry states without original fallback', async () => {
    let fail!: (error: Error) => void;
    projectionMocks.read.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject;
        })
    );
    render(
      <TonightMenuCard {...recipe} ingredients={['200 g pasta']} ingredientContext={assigned} />
    );
    fireEvent.click(screen.getByTestId('tonight-ingredients-toggle'));
    expect(screen.getByRole('status')).toHaveTextContent('Loading ingredients for this date');
    expect(screen.queryByText('200 g pasta')).not.toBeInTheDocument();
    await act(async () => fail(new Error('changed occurrence')));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not confirm ingredients for this supper.'
    );
    expect(screen.queryByText('No ingredients listed')).not.toBeInTheDocument();
    projectionMocks.read.mockResolvedValue(projected());
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('600 g pasta')).toBeVisible();
  });

  it('does not fetch or label originals current when assigned identity is unavailable', () => {
    render(<TonightMenuCard {...recipe} ingredients={['200 g pasta']} ingredientContext={null} />);
    fireEvent.click(screen.getByTestId('tonight-ingredients-toggle'));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not confirm ingredients');
    expect(screen.queryByText('200 g pasta')).not.toBeInTheDocument();
    expect(projectionMocks.read).not.toHaveBeenCalled();
  });

  it('rejects late responses from the same recipe on another occurrence and invalidation', async () => {
    let finishOld!: (value: unknown) => void;
    projectionMocks.read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        })
    );
    const { rerender } = render(<TonightMenuCard {...recipe} ingredientContext={assigned} />);
    fireEvent.click(screen.getByTestId('tonight-ingredients-toggle'));
    const next = { ...assigned, occurrenceId: 'replacement-occurrence' };
    projectionMocks.read.mockResolvedValue(projected(800));
    rerender(<TonightMenuCard {...recipe} ingredientContext={next} />);
    expect(await screen.findByText('800 g pasta')).toBeVisible();
    await act(async () => finishOld(projected()));
    expect(screen.queryByText('600 g pasta')).not.toBeInTheDocument();
    projectionMocks.read.mockResolvedValue(projected(1000));
    act(() => projectionMocks.invalidate?.());
    expect(await screen.findByText('1,000 g pasta')).toBeVisible();
    expect(projectionMocks.read).toHaveBeenLastCalledWith('one', next);
  });

  it('invalidates an in-flight same-key read before an old result can settle', async () => {
    let finishOld!: (value: unknown) => void;
    let finishNew!: (value: unknown) => void;
    projectionMocks.read
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishNew = resolve;
          })
      );
    render(<TonightMenuCard {...recipe} ingredientContext={assigned} />);
    fireEvent.click(screen.getByTestId('tonight-ingredients-toggle'));
    await act(async () => {
      projectionMocks.invalidate?.();
      finishOld(projected());
      await Promise.resolve();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Loading ingredients for this date');
    expect(screen.queryByText('600 g pasta')).not.toBeInTheDocument();
    await act(async () => finishNew(projected(800)));
    expect(screen.getByText('800 g pasta')).toBeVisible();
  });

  it('refreshes an opened list honestly instead of exposing cached dated amounts', async () => {
    projectionMocks.read.mockResolvedValueOnce(projected());
    render(<TonightMenuCard {...recipe} ingredientContext={assigned} />);
    fireEvent.click(screen.getByTestId('tonight-ingredients-toggle'));
    expect(await screen.findByText('600 g pasta')).toBeVisible();
    fireEvent.click(screen.getByTestId('tonight-ingredients-toggle'));
    projectionMocks.read.mockReturnValue(new Promise(() => {}));
    fireEvent.click(screen.getByTestId('tonight-ingredients-toggle'));
    expect(screen.getByRole('status')).toHaveTextContent('Loading ingredients for this date');
    expect(screen.queryByText('600 g pasta')).not.toBeInTheDocument();
  });

  it('keeps an unknown basis and target as original evidence without inventing a portion count', async () => {
    projectionMocks.read.mockResolvedValue(
      projected(600, {
        originalServings: null,
        targetServings: null,
        factor: null,
        status: 'unresolved',
        lines: [{ originalText: '200 g pasta', status: 'unresolved' }],
      })
    );
    render(<TonightMenuCard {...recipe} ingredientContext={assigned} />);
    fireEvent.click(screen.getByTestId('tonight-ingredients-toggle'));
    expect(await screen.findByText('200 g pasta')).toBeVisible();
    expect(screen.getByTestId('ingredients-info-title')).toHaveTextContent(/^Ingredients & info$/);
    expect(screen.queryByText('600 g pasta')).not.toBeInTheDocument();
  });

  it.each([
    { id: 'one', context: { ...assigned, supperDate: '2026-05-05' } },
    { id: 'two', context: assigned },
  ])(
    'rejects delayed amounts after recipe/date identity changes: $id $context.supperDate',
    async ({ id, context }) => {
      let finishOld!: (value: unknown) => void;
      projectionMocks.read.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          })
      );
      const { rerender } = render(<TonightMenuCard {...recipe} ingredientContext={assigned} />);
      fireEvent.click(screen.getByTestId('tonight-ingredients-toggle'));
      projectionMocks.read.mockResolvedValue(projected(800));
      rerender(<TonightMenuCard {...recipe} recipeId={id} ingredientContext={context} />);
      if (id !== recipe.recipeId) fireEvent.click(screen.getByTestId('tonight-ingredients-toggle'));
      expect(await screen.findByText('800 g pasta')).toBeVisible();
      await act(async () => finishOld(projected()));
      expect(screen.queryByText('600 g pasta')).not.toBeInTheDocument();
      expect(projectionMocks.read).toHaveBeenLastCalledWith(id, context);
    }
  );

  it('renders frozen prepared seven from the projection without recalculating', async () => {
    projectionMocks.read.mockResolvedValue(projected(700, { targetServings: 7, factor: 3.5 }));
    render(<TonightMenuCard {...recipe} ingredientContext={assigned} />);
    fireEvent.click(screen.getByTestId('tonight-ingredients-toggle'));
    expect(await screen.findByText('700 g pasta')).toBeVisible();
    expect(screen.getByTestId('ingredients-info-title')).toHaveTextContent('7 portions');
  });
});

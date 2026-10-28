import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { setLocale } from '@/locales';
import { TonightMenuCard } from './TonightMenuCard';

beforeEach(() => setLocale('en'));
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

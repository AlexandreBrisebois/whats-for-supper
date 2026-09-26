import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setLocale } from '@/locales';
import { RecipeImportIssueBadge } from './RecipeImportIssueBadge';

describe('RecipeImportIssueBadge', () => {
  afterEach(() => setLocale('en'));

  it('renders the reported status with an accessible name', () => {
    render(<RecipeImportIssueBadge status="reported" />);
    const badge = screen.getByLabelText('Recipe reported');
    expect(badge).toHaveTextContent('Reported');
    expect(badge).toHaveClass('bg-ochre-50', 'text-ochre-800');
  });

  it('renders the durable reimport outcome with a non-color cue', () => {
    render(<RecipeImportIssueBadge status="readyToReview" />);
    const badge = screen.getByLabelText('Recipe updated — ready to review');
    expect(badge).toHaveTextContent('Review');
    expect(badge.querySelector('svg')).not.toBeNull();
    expect(badge).toHaveClass('bg-sage-100', 'text-sage-800');
  });

  it('uses a compact, non-wrapping presentation when requested', () => {
    render(<RecipeImportIssueBadge status="readyToReview" variant="compact" />);

    const badge = screen.getByLabelText('Recipe updated — ready to review');
    expect(badge).toHaveClass('shrink-0', 'whitespace-nowrap', 'text-[10px]');
    expect(badge).toHaveTextContent('Review');
  });

  it('localizes the compact label and accessible description in French', () => {
    setLocale('fr');
    render(<RecipeImportIssueBadge status="readyToReview" variant="compact" />);

    expect(screen.getByLabelText('Recette mise à jour — prête à vérifier')).toHaveTextContent(
      'À vérifier'
    );
  });
});

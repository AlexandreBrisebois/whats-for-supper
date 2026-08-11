import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RecipeImportIssueBadge } from './RecipeImportIssueBadge';

describe('RecipeImportIssueBadge', () => {
  it('renders the reported status with an accessible name', () => {
    render(<RecipeImportIssueBadge status="reported" />);
    const badge = screen.getByLabelText('Import issue status: Reported');
    expect(badge).toHaveTextContent('Reported');
    expect(badge).toHaveClass('bg-ochre-50', 'text-ochre-800');
  });

  it('renders ready to review with a non-color cue', () => {
    render(<RecipeImportIssueBadge status="readyToReview" />);
    const badge = screen.getByLabelText('Import issue status: Ready to review');
    expect(badge).toHaveTextContent('Ready to review');
    expect(badge.querySelector('svg')).not.toBeNull();
    expect(badge).toHaveClass('bg-sage-100', 'text-sage-800');
  });
});

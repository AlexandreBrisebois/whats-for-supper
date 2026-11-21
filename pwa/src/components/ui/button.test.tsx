import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';
import * as ui from './index';
import * as loaderModule from './SolarLoader';

describe('Button primitive (Family Cookbook Era 3)', () => {
  it('maps danger to accessible dual-mode Hearth destructive tokens rather than white-on-ochre', () => {
    render(<Button variant="danger">Delete recipe</Button>);
    const button = screen.getByRole('button', { name: 'Delete recipe' });

    expect(button.className).toContain('bg-terracotta-50');
    expect(button.className).toContain('text-hearth-ink');
    expect(button.className).toContain('border-hearth-line');
    expect(button.className).not.toContain('bg-ochre');
    expect(button.className).not.toContain('text-white');
  });

  it('maps primary, secondary, and ghost variants to dual-mode semantic role tokens', () => {
    const { rerender } = render(<Button variant="primary">Cook tonight</Button>);
    let button = screen.getByRole('button', { name: 'Cook tonight' });
    expect(button.className).toContain('bg-hearth-fill');
    expect(button.className).toContain('text-cream-100');
    expect(button.className).toContain('hover:bg-hearth-fill-hover');
    expect(button.className).toContain('active:bg-hearth-fill-active');

    rerender(<Button variant="secondary">Change plan</Button>);
    button = screen.getByRole('button', { name: 'Change plan' });
    expect(button.className).toContain('bg-white');
    expect(button.className).toContain('text-hearth-ink');
    expect(button.className).toContain('border-hearth-line');

    rerender(<Button variant="ghost">Dismiss</Button>);
    button = screen.getByRole('button', { name: 'Dismiss' });
    expect(button.className).toContain('text-hearth-ink');
  });

  it('enforces >= 48px target floor (min-h-12/min-h-14) on md and lg sizes and min-h-11 on sm', () => {
    const { rerender } = render(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button', { name: 'Medium' }).className).toContain('min-h-12');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button', { name: 'Large' }).className).toContain('min-h-14');

    rerender(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button', { name: 'Small' }).className).toContain('min-h-11');
  });

  it('includes visible semantic focus-visible outline styles on every variant', () => {
    const variants = ['primary', 'secondary', 'ghost', 'danger'] as const;

    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>Action {variant}</Button>);
      const button = screen.getByRole('button', { name: `Action ${variant}` });
      expect(button.className).toContain('focus-visible:outline-2');
      expect(button.className).toContain('focus-visible:outline-offset-4');
      expect(button.className).toContain('focus-visible:outline-ink-body');
      unmount();
    }
  });

  it('keeps disabled and loading states accessible and non-interactive', () => {
    const { rerender } = render(<Button disabled>Save</Button>);
    let button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button.className).toContain('disabled:opacity-50');

    rerender(
      <Button isLoading loadingText="Saving...">
        Save
      </Button>
    );
    button = screen.getByRole('button', { name: 'Saving...' });
    expect(button).toBeDisabled();
  });

  it('exports CookbookLoader alongside the legacy SolarLoader compatibility alias', () => {
    expect(loaderModule).toHaveProperty('CookbookLoader');
    expect(loaderModule).toHaveProperty('SolarLoader');
    expect(ui).toHaveProperty('CookbookLoader');
    expect(ui).toHaveProperty('SolarLoader');
  });
});

vi.mock('next/navigation', () => ({ usePathname: () => '/recipes' }));
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionGearMenu } from './ActionGearMenu';

describe('ActionGearMenu', () => {
  const defaultProps = {
    hasImportIssue: false,
    onMoveToBin: vi.fn(),
    onReportImportIssue: vi.fn(),
  };

  it('renders the gear icon button', () => {
    render(<ActionGearMenu {...defaultProps} />);
    expect(screen.getByTestId('action-gear-menu')).toBeDefined();
  });

  it('opens the menu when clicked', () => {
    render(<ActionGearMenu {...defaultProps} />);
    fireEvent.click(screen.getByTestId('action-gear-menu'));

    expect(screen.getByTestId('action-move-to-bin')).toBeDefined();
    expect(screen.queryByTestId('action-reimport-recipe')).toBeNull();
    const reportAction = screen.getByRole('button', { name: 'Report issue' });
    expect(reportAction).toBeVisible();
    expect(reportAction.querySelector('svg')).toHaveClass('text-terracotta-600');
  });

  it('keeps reporting visible without a direct re-import entry point', () => {
    render(<ActionGearMenu {...defaultProps} />);
    fireEvent.click(screen.getByTestId('action-gear-menu'));

    expect(screen.getByTestId('action-move-to-bin')).toBeDefined();
    expect(screen.queryByTestId('action-reimport-recipe')).toBeNull();
    expect(screen.getByTestId('action-report-import-issue')).toBeVisible();
  });

  it('labels an existing issue for update', () => {
    render(<ActionGearMenu {...defaultProps} hasImportIssue />);
    fireEvent.click(screen.getByTestId('action-gear-menu'));

    expect(screen.getByRole('button', { name: 'Review issue' })).toBeVisible();
  });

  it('calls onMoveToBin and closes menu when move to bin is clicked', () => {
    render(<ActionGearMenu {...defaultProps} />);
    fireEvent.click(screen.getByTestId('action-gear-menu'));

    const binBtn = screen.getByTestId('action-move-to-bin');
    fireEvent.click(binBtn);

    expect(defaultProps.onMoveToBin).toHaveBeenCalled();
    expect(screen.queryByTestId('action-move-to-bin')).toBeNull();
  });
});

it('preserves action flyout dismissal, reopening and action choice', async () => {
  const onMoveToBin = vi.fn();
  const props = { hasImportIssue: false, onMoveToBin, onReportImportIssue: vi.fn() };
  const view = render(<ActionGearMenu {...props} />);
  try {
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    view.rerender(<ActionGearMenu {...props} hasImportIssue />);

    fireEvent.mouseDown(document.body);
    await Promise.resolve();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByTestId('action-move-to-bin'));
    await Promise.resolve();
    expect(onMoveToBin).toHaveBeenCalledOnce();
  } finally {
    view.unmount();
  }
});

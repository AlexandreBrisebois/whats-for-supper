import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionGearMenu } from './ActionGearMenu';

describe('ActionGearMenu', () => {
  const defaultProps = {
    canReimport: true,
    hasImportIssue: false,
    onMoveToBin: vi.fn(),
    onReimport: vi.fn(),
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
    expect(screen.getByTestId('action-reimport-recipe')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Report issue' })).toBeVisible();
  });

  it('hides reimport if canReimport is false', () => {
    render(<ActionGearMenu {...defaultProps} canReimport={false} />);
    fireEvent.click(screen.getByTestId('action-gear-menu'));

    expect(screen.getByTestId('action-move-to-bin')).toBeDefined();
    expect(screen.queryByTestId('action-reimport-recipe')).toBeNull();
    expect(screen.queryByTestId('action-report-import-issue')).toBeNull();
  });

  it('labels an existing issue for update', () => {
    render(<ActionGearMenu {...defaultProps} hasImportIssue />);
    fireEvent.click(screen.getByTestId('action-gear-menu'));

    expect(screen.getByRole('button', { name: 'Update report' })).toBeVisible();
  });

  it('calls onReimport and closes menu when reimport is clicked', () => {
    render(<ActionGearMenu {...defaultProps} />);
    fireEvent.click(screen.getByTestId('action-gear-menu'));

    const reimportBtn = screen.getByTestId('action-reimport-recipe');
    fireEvent.click(reimportBtn);

    expect(defaultProps.onReimport).toHaveBeenCalled();
    expect(screen.queryByTestId('action-reimport-recipe')).toBeNull();
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

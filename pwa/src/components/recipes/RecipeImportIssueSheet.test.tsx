import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecipeImportIssueSheet } from './RecipeImportIssueSheet';
import type { RecipeImportIssue } from '@/lib/api/recipes';
import { RecipeImportIssueReasonObject } from '@/lib/api/generated/models/index';

const existingIssue: RecipeImportIssue = {
  reasons: ['ingredients'],
  note: 'Amounts are missing',
  status: 'readyToReview' as const,
};

describe('RecipeImportIssueSheet', () => {
  const onClose = vi.fn();
  const onSave = vi.fn();
  const onResolve = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it('requires at least one labeled reason and keeps the note collapsed for a new report', () => {
    render(
      <RecipeImportIssueSheet
        issue={null}
        onClose={onClose}
        onSave={onSave}
        onResolve={onResolve}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Report issue' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Close report issue' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Ingredients' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Steps' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Duplicate' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.queryByLabelText('Optional note')).toBeNull();

    fireEvent.click(screen.getByText('Add a note'));
    const note = screen.getByLabelText('Optional note');
    expect(note).toHaveAttribute('maxLength', '500');
    expect(note).toHaveClass('px-4', 'py-3', 'resize-none');
  });

  it('supports duplicate-only and mixed reports', async () => {
    onSave.mockResolvedValue(undefined);
    render(
      <RecipeImportIssueSheet
        issue={null}
        onClose={onClose}
        onSave={onSave}
        onResolve={onResolve}
      />
    );

    fireEvent.click(screen.getByTestId('import-issue-reason-duplicate'));
    fireEvent.click(screen.getByTestId('import-issue-save'));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        reasons: [RecipeImportIssueReasonObject.Duplicate],
        note: null,
      })
    );
  });

  it('keeps duplicate available while explaining content ineligibility', () => {
    render(
      <RecipeImportIssueSheet
        issue={null}
        canReportContentIssues={false}
        onClose={onClose}
        onSave={onSave}
        onResolve={onResolve}
      />
    );

    expect(screen.getByTestId('import-issue-reason-ingredients')).toBeDisabled();
    expect(screen.getByTestId('import-issue-reason-steps')).toBeDisabled();
    expect(screen.getByTestId('import-issue-reason-duplicate')).toBeEnabled();
    expect(screen.getByTestId('import-issue-content-ineligible')).toBeVisible();
    expect(screen.getByText('Choose Duplicate.')).toBeVisible();
  });

  it('supports one or both reasons and submits a trimmed optional note', async () => {
    onSave.mockResolvedValue(undefined);
    render(
      <RecipeImportIssueSheet
        issue={null}
        onClose={onClose}
        onSave={onSave}
        onResolve={onResolve}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ingredients' }));
    fireEvent.click(screen.getByRole('button', { name: 'Steps' }));
    fireEvent.click(screen.getByText('Add a note'));
    fireEvent.change(screen.getByLabelText('Optional note'), {
      target: { value: '  Missing detail  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        reasons: ['ingredients', 'steps'],
        note: 'Missing detail',
      })
    );
  });

  it('prepopulates an existing report and keeps the draft open after save failure', async () => {
    onSave.mockRejectedValue(new Error('network'));
    render(
      <RecipeImportIssueSheet
        issue={existingIssue}
        onClose={onClose}
        onSave={onSave}
        onResolve={onResolve}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Review issue' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ingredients' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Steps' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Optional note')).toHaveValue('Amounts are missing');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save changes. Try again.'
    );
    expect(screen.getByRole('dialog', { name: 'Review issue' })).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('uses settled resolve copy and stronger ready-to-review emphasis', async () => {
    onResolve.mockResolvedValue(undefined);
    render(
      <RecipeImportIssueSheet
        issue={existingIssue}
        onClose={onClose}
        onSave={onSave}
        onResolve={onResolve}
      />
    );

    const resolve = screen.getByRole('button', { name: 'Mark as resolved' });
    expect(resolve).toHaveClass('bg-sage-100');
    expect(screen.getByText('Removes this recipe from Needs review.')).toBeVisible();
    fireEvent.click(resolve);

    await waitFor(() => expect(onResolve).toHaveBeenCalledOnce());
  });

  it('closes on Escape and traps keyboard focus', () => {
    render(
      <RecipeImportIssueSheet
        issue={null}
        onClose={onClose}
        onSave={onSave}
        onResolve={onResolve}
      />
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

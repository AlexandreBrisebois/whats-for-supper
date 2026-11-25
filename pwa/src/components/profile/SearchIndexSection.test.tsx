import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSearchIndexStatus, triggerSearchBackfill } = vi.hoisted(() => ({
  getSearchIndexStatus: vi.fn<typeof import('@/lib/api/management').getSearchIndexStatus>(),
  triggerSearchBackfill: vi.fn<typeof import('@/lib/api/management').triggerSearchBackfill>(),
}));

vi.mock('@/lib/api/management', () => ({
  getSearchIndexStatus,
  triggerSearchBackfill,
}));

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
  tWithVars: (_key: string, fallback: string, vars: Record<string, unknown>) =>
    fallback.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => String(vars[key])),
}));

import { SearchIndexSection } from './SearchIndexSection';

describe('SearchIndexSection', () => {
  beforeEach(() => {
    getSearchIndexStatus.mockReset().mockResolvedValue({
      totalReadyRecipes: 145,
      searchableRecipes: 142,
      enrichedRecipes: 139,
      activeIndexingJobs: 0,
      demoMode: false,
    });
    triggerSearchBackfill
      .mockReset()
      .mockResolvedValue({ message: 'Search index backfill triggered in the background.' });
  });

  it('displays searchable and enriched counts with plain wrapped breakdown and zero checkmarks', async () => {
    const { container } = render(<SearchIndexSection />);
    await screen.findByText('142 of 145 searchable');
    expect(screen.getByText('139 smart-search enriched · 6 missing or paused')).toBeVisible();
    expect(screen.getByText('139 smart-search · 3 keyword-only · 3 not indexed')).toBeVisible();
    expect(container.textContent).not.toContain('✓');
    expect(container.textContent).not.toContain('✔');
  });

  it('triggers missing-only backfill (force=false) in one tap and refreshes status', async () => {
    render(<SearchIndexSection />);
    const missingBtn = await screen.findByRole('button', { name: 'Index missing recipes (6)' });
    expect(missingBtn).toHaveClass('min-h-12');

    fireEvent.click(missingBtn);
    await waitFor(() => expect(triggerSearchBackfill).toHaveBeenCalledWith(false));
    await screen.findByRole('status');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Reindexing in background… (updates live)'
    );
    expect(screen.getByRole('status').textContent).not.toContain('✓');
    expect(getSearchIndexStatus).toHaveBeenCalledTimes(2);
  });

  it('guards full rebuild with inline Cancel / Rebuild all confirmation (never window.confirm)', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    render(<SearchIndexSection />);
    const rebuildTrigger = await screen.findByRole('button', {
      name: 'Rebuild full search index (all 145)',
    });
    fireEvent.click(rebuildTrigger);

    expect(confirmSpy).not.toHaveBeenCalled();
    const confirmCard = screen.getByTestId('search-index-rebuild-confirm');
    expect(confirmCard).toHaveClass('bg-terracotta-50', 'border-hearth-line');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByTestId('search-index-rebuild-confirm')).not.toBeInTheDocument();
    expect(triggerSearchBackfill).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Rebuild full search index (all 145)' }));
    const rebuildAllBtn = screen.getByRole('button', { name: 'Rebuild all' });
    expect(rebuildAllBtn).toHaveClass('min-h-12');
    fireEvent.click(rebuildAllBtn);

    await waitFor(() => expect(triggerSearchBackfill).toHaveBeenCalledWith(true));
    await screen.findByRole('status');
    confirmSpy.mockRestore();
  });

  it('keeps actions enabled and displays inline role="alert" when backfill rejects', async () => {
    triggerSearchBackfill.mockRejectedValueOnce(new Error('Network down'));
    render(<SearchIndexSection />);
    const missingBtn = await screen.findByRole('button', { name: 'Index missing recipes (6)' });
    fireEvent.click(missingBtn);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Could not start search reindex. Existing keyword search still works; try again.'
    );
    expect(missingBtn).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Rebuild full search index (all 145)' })
    ).toBeEnabled();
  });

  it('notes Demo Mode when demoMode is true without calling external embeddings', async () => {
    getSearchIndexStatus.mockResolvedValueOnce({
      totalReadyRecipes: 12,
      searchableRecipes: 12,
      enrichedRecipes: 12,
      activeIndexingJobs: 0,
      demoMode: true,
    });
    render(<SearchIndexSection />);
    await screen.findByText('12 of 12 searchable');
    expect(screen.getByTestId('search-index-demo-note')).toBeVisible();
  });
});

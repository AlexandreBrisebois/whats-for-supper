import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { MOCK_IDS } from '@/testing/mock-ids';

const mocks = vi.hoisted(() => ({
  loadGoTo: vi.fn(),
  saveGoTo: vi.fn(),
  onAdd: vi.fn(),
  items: [] as { recipeId: string; description: string; status: 'ready' | 'pending' }[],
  ready: new Set<string>(),
}));
vi.mock('@/store/familyStore', () => ({
  useFamilyStore: (selector: (state: any) => unknown) =>
    selector({
      familySettings: { family_goto: { items: mocks.items } },
      loadGoTo: mocks.loadGoTo,
      saveGoTo: mocks.saveGoTo,
    }),
}));
vi.mock('@/store/gotoStore', () => ({
  useGotoStore: (selector: (state: any) => unknown) => selector({ readyRecipeIds: mocks.ready }),
}));
import { FamilyGOTOSettings } from './FamilyGOTOSettings';
const ready = {
  recipeId: MOCK_IDS.RECIPE_LASAGNA,
  description: 'Family Lasagna',
  status: 'ready' as const,
};
const pending = {
  recipeId: MOCK_IDS.RECIPE_GOTO_STUB,
  description: 'Preparing soup',
  status: 'pending' as const,
};
function openManagement() {
  render(<FamilyGOTOSettings onAdd={mocks.onAdd} />);
  fireEvent.click(screen.getByRole('button', { name: 'Manage GOTOs' }));
}
describe('Family GOTO management in Filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.items = [ready, pending];
    mocks.ready = new Set();
    mocks.loadGoTo.mockImplementation(async () => ({ items: mocks.items }));
    mocks.saveGoTo.mockImplementation(async (dto) => {
      mocks.items = dto.items;
    });
  });
  afterEach(() => localStorage.removeItem('locale'));
  it('localizes management and pending feedback in French', async () => {
    localStorage.setItem('locale', 'fr');
    render(<FamilyGOTOSettings onAdd={mocks.onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gérer les GOTOs' }));
    expect(await screen.findByText('En préparation…')).toBeVisible();
    expect(screen.getByText(/Les modifications de la liste sont enregistrées/)).toBeVisible();
  });

  it('starts collapsed and exposes complete ready/pending rows independently of result filtering', async () => {
    render(<FamilyGOTOSettings onAdd={mocks.onAdd} />);
    expect(screen.getByRole('button', { name: 'Manage GOTOs' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByText(ready.description)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Manage GOTOs' }));
    expect(await screen.findByText(ready.description)).toBeVisible();
    expect(screen.getByTestId('goto-pending-description')).toHaveTextContent(pending.description);
    expect(screen.getByText(/list changes save immediately/i)).toBeVisible();
  });
  it('hands acquisition to its mounted page coordinator', async () => {
    openManagement();
    fireEvent.click(await screen.findByTestId('add-goto-btn'));
    expect(mocks.onAdd).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('goto-search-library')).not.toBeInTheDocument();
  });
  it('removes membership after confirmation and keeps pending disablement until completion', async () => {
    let finish!: () => void;
    mocks.saveGoTo.mockImplementationOnce(
      (dto) =>
        new Promise<void>((resolve) => {
          finish = () => {
            mocks.items = dto.items;
            resolve();
          };
        })
    );
    openManagement();
    const remove = await screen.findByRole('button', { name: 'Remove Family Lasagna' });
    fireEvent.click(remove);
    expect(remove).toBeDisabled();
    await act(async () => finish());
    await waitFor(() => expect(screen.queryByText(ready.description)).not.toBeInTheDocument());
    expect(screen.getByText(pending.description)).toBeVisible();
    expect(mocks.saveGoTo).toHaveBeenCalledWith({ items: [pending] });
  });
  it('retains the confirmed list and exposes removal retry feedback on rejected saving', async () => {
    mocks.saveGoTo.mockRejectedValueOnce(new Error('save failed'));
    openManagement();
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Family Lasagna' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not remove/i);
    expect(screen.getByText(ready.description)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Family Lasagna' }));
    await waitFor(() => expect(screen.queryByText(ready.description)).not.toBeInTheDocument());
  });
  it('distinguishes failed reading from empty membership and retries reading', async () => {
    mocks.loadGoTo.mockResolvedValueOnce(null);
    openManagement();
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i);
    expect(screen.queryByText('No GOTO set yet.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(ready.description)).toBeVisible();
    expect(mocks.loadGoTo).toHaveBeenCalledTimes(2);
  });
});

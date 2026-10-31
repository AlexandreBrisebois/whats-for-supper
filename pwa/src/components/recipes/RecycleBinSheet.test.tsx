import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RecycleBinSheet } from './RecycleBinSheet';

const api = vi.hoisted(() => ({
  getTrashItems: vi.fn(),
  restoreRecipe: vi.fn(),
  purgeRecipe: vi.fn(),
}));
vi.mock('@/lib/api/recipes', () => api);
vi.mock('next/navigation', () => ({ usePathname: () => '/recipes' }));
vi.mock('@/locales', () => ({ t: (_key: string, fallback: string) => fallback }));
const item = {
  id: '550e8400-e29b-41d4-a716-446655440111',
  name: 'Pasta',
  deletedAt: '2026-10-20',
  imageUrl: null,
  deletedBy: null,
};
describe('Recycle Bin recovery', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  it('distinguishes a failed read from empty and retries', async () => {
    api.getTrashItems.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    render(<RecycleBinSheet onClose={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the Recycle Bin.');
    expect(screen.queryByTestId('trash-empty-state')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('trash-retry'));
    expect(await screen.findByTestId('trash-empty-state')).toBeVisible();
    expect(api.getTrashItems).toHaveBeenCalledTimes(2);
  });
  it('keeps a failed restore entry with feedback and permits retry', async () => {
    api.getTrashItems.mockResolvedValue([item]);
    api.restoreRecipe.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    render(<RecycleBinSheet onClose={vi.fn()} />);
    fireEvent.click(await screen.findByTestId(`action-restore-${item.id}`));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not restore this recipe. Try again.'
    );
    expect(screen.getByTestId(`trash-item-${item.id}`)).toBeVisible();
    expect(screen.getByTestId(`action-restore-${item.id}`)).toBeEnabled();
    fireEvent.click(screen.getByTestId(`action-restore-${item.id}`));
    await waitFor(() =>
      expect(screen.queryByTestId(`trash-item-${item.id}`)).not.toBeInTheDocument()
    );
    expect(api.restoreRecipe).toHaveBeenCalledTimes(2);
  });
});

it('retains Recycle Bin retry and nested PIN failure, cancellation and reopening', async () => {
  vi.resetAllMocks();

  api.getTrashItems.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([item]);
  let rejectPurge!: (error: Error) => void;
  api.purgeRecipe.mockImplementation(
    () =>
      new Promise<void>((_resolve, reject) => {
        rejectPurge = reject;
      })
  );
  const onClose = vi.fn();
  const view = render(<RecycleBinSheet onClose={onClose} />);
  try {
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the Recycle Bin.');
    fireEvent.click(screen.getByTestId('trash-retry'));
    fireEvent.click(await screen.findByTestId(`action-purge-${item.id}`));
    fireEvent.change(screen.getByTestId('elevated-pin-input'), {
      target: { value: 'pin-private-sentinel' },
    });

    fireEvent.submit(screen.getByTestId('elevated-pin-dialog'));
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();

    rejectPurge(new Error('synthetic rejection'));
    expect(await screen.findByTestId('elevated-pin-error')).toBeVisible();
    expect(screen.getByTestId('elevated-pin-input')).toHaveValue('pin-private-sentinel');

    fireEvent.click(screen.getByTestId('elevated-pin-cancel'));
    await Promise.resolve();
    fireEvent.click(screen.getByTestId(`action-purge-${item.id}`));
    expect(screen.getByTestId('elevated-pin-input')).toHaveValue('');
    view.unmount();
    await Promise.resolve();

    expect(api.purgeRecipe).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  } finally {
    view.unmount();
  }
});

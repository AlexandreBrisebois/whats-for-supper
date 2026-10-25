import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoModeProvider, useDemoMode } from './DemoModeProvider';

const health = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/api-client', () => ({ apiClient: { api: { health: { get: health } } } }));

function Probe() {
  const state = useDemoMode();
  return (
    <button onClick={state.retry}>
      {state.error ? 'retry' : state.mode === null ? 'checking' : state.mode ? 'demo' : 'normal'}
    </button>
  );
}

describe('API demo mode discovery', () => {
  beforeEach(() => {
    health.mockReset();
  });
  it('waits for actual API mode and shares one discovery across consumers', async () => {
    let resolve!: (value: unknown) => void;
    health.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    render(
      <DemoModeProvider>
        <Probe />
        <Probe />
      </DemoModeProvider>
    );
    expect(screen.getAllByText('checking')).toHaveLength(2);
    await waitFor(() => expect(health).toHaveBeenCalledTimes(1));
    resolve({ demoMode: true });
    await waitFor(() => expect(screen.getAllByText('demo')).toHaveLength(2));
    expect(health).toHaveBeenCalledTimes(1);
  });
  it('does not infer permission from failed health discovery and permits explicit retry', async () => {
    health.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ demoMode: false });
    render(
      <DemoModeProvider>
        <Probe />
      </DemoModeProvider>
    );
    fireEvent.click(await screen.findByText('retry'));
    expect(await screen.findByText('normal')).toBeInTheDocument();
  });
});

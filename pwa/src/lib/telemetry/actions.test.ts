import { afterEach, expect, it, vi } from 'vitest';
import { reportBrowserAppOpened, reportBrowserTelemetryCheck } from './actions';

const { callbacks, opening, check } = vi.hoisted(() => ({
  callbacks: [] as Array<() => Promise<void>>,
  opening: vi.fn<() => Promise<void>>(),
  check: vi.fn<() => Promise<void>>(),
}));
vi.mock('next/server', () => ({
  after: (callback: () => Promise<void>) => callbacks.push(callback),
}));
vi.mock('./server', () => ({ sendBrowserAppOpened: opening, sendBrowserCheck: check }));
afterEach(() => {
  callbacks.length = 0;
  vi.resetAllMocks();
});

it.each(['opening', 'check'])(
  'returns the %s action before starting a stalled receiver export',
  async (kind) => {
    let release!: () => void;
    const stalled = new Promise<void>((resolve) => {
      release = resolve;
    });
    opening.mockReturnValue(stalled);
    check.mockReturnValue(stalled);
    const action =
      kind === 'opening'
        ? reportBrowserAppOpened({ screen: 'search' })
        : reportBrowserTelemetryCheck();
    const result = await Promise.race([action, Promise.resolve('pending')]);
    expect(result).toBeUndefined();
    expect(opening).not.toHaveBeenCalled();
    expect(check).not.toHaveBeenCalled();
    expect(callbacks).toHaveLength(1);
    const exportWork = callbacks[0]();
    if (kind === 'opening') expect(opening).toHaveBeenCalledWith('search');
    else expect(check).toHaveBeenCalledOnce();
    release();
    await exportWork;
  }
);

it('does not schedule rejected browser input', async () => {
  await reportBrowserAppOpened({ screen: 'search', destination: 'private' });
  expect(callbacks).toHaveLength(0);
  expect(opening).not.toHaveBeenCalled();
});

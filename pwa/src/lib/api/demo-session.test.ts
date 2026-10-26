import { describe, expect, it, vi } from 'vitest';
import { DemoRequestSession, DemoResetError } from './demo-session';

const old = '11111111-1111-4111-8111-111111111111';
const fresh = '22222222-2222-4222-8222-222222222222';
const response = (generation = old, status = 200) =>
  new Response('{}', {
    status,
    headers: { 'X-Demo-Generation': generation },
  });

describe('demo request generation', () => {
  it('pins reads and sends their generation on writes, then checks for missed reset', async () => {
    const send = vi.fn().mockResolvedValue(response());
    const session = new DemoRequestSession(send, '/api/health');
    await session.fetch('/api/recipes');
    await session.fetch('/api/recipes/one', { method: 'PATCH', body: '{}' });
    expect(new Headers(send.mock.calls[1][1].headers).get('X-Demo-Generation')).toBe(old);
    expect(send.mock.calls[2][0]).toBe('/api/health');
  });
  it('rejects a late response after SSE observes reset and never moves back', async () => {
    let finish!: (value: Response) => void;
    const send = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        })
    );
    const session = new DemoRequestSession(send, '/api/health');
    session.observe(old);
    const pending = session.fetch('/api/recipes');
    session.observe(fresh);
    finish(response());
    await expect(pending).rejects.toBeInstanceOf(DemoResetError);
    expect(session.generation).toBe(old);
    expect(session.resetRequired).toBe(true);
    await expect(session.fetch('/api/recipes/one', { method: 'PATCH' })).rejects.toBeInstanceOf(
      DemoResetError
    );
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('does not replay a 412 or report an obsolete write as successful', async () => {
    const send = vi.fn().mockResolvedValue(response(fresh, 412));
    const session = new DemoRequestSession(send, '/api/health');
    session.observe(old);
    await expect(session.fetch('/api/recipes/one', { method: 'PATCH' })).rejects.toBeInstanceOf(
      DemoResetError
    );
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('detects a missed reset after a write even when its response belongs to the old generation', async () => {
    const send = vi.fn().mockResolvedValueOnce(response()).mockResolvedValueOnce(response(fresh));
    const session = new DemoRequestSession(send, '/api/health');
    session.observe(old);
    await expect(session.fetch('/api/recipes/one', { method: 'PATCH' })).rejects.toBeInstanceOf(
      DemoResetError
    );
    expect(send).toHaveBeenCalledTimes(2);
  });
  it('keeps ordinary installations unchanged and accepts search POST as a read', async () => {
    const send = vi.fn().mockResolvedValue(new Response('{}'));
    const session = new DemoRequestSession(send, '/api/health');
    await session.fetch('/api/recipes/search', { method: 'POST' });
    expect(send).toHaveBeenCalledTimes(1);
    expect(session.resetRequired).toBe(false);
  });
  it('detects SSR bootstrap older than the first browser response', () => {
    const session = new DemoRequestSession(vi.fn(), '/api/health');
    session.observe(fresh);
    session.observe(old);
    expect(session.resetRequired).toBe(true);
  });
});

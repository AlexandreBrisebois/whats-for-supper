const GENERATION_HEADER = 'X-Demo-Generation';

export class DemoResetError extends Error {
  constructor() {
    super('The demo has reset. Refresh before continuing.');
  }
}

/** One document owns one household generation. Only a fresh document may adopt a reset. */
export class DemoRequestSession {
  generation: string | null = null;
  resetRequired = false;
  private listeners = new Set<() => void>();
  constructor(
    private send: typeof fetch,
    private healthUrl: string
  ) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.resetRequired;

  observe(generation?: string | null) {
    if (!generation || this.resetRequired) return;
    if (this.generation && this.generation !== generation) this.requireRefresh();
    else this.generation = generation;
  }

  private requireRefresh() {
    if (this.resetRequired) return;
    this.resetRequired = true;
    this.listeners.forEach((listener) => listener());
  }

  fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (this.resetRequired) throw new DemoResetError();
    const request = typeof Request !== 'undefined' && input instanceof Request ? input : null;
    const url = new URL(request?.url ?? String(input), 'http://local');
    const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
    const mutation =
      !['GET', 'HEAD', 'OPTIONS'].includes(method) && url.pathname !== '/api/recipes/search';
    const headers = new Headers(init?.headers ?? request?.headers);
    if (mutation && this.generation) headers.set(GENERATION_HEADER, this.generation);
    const response = await this.send(
      input,
      mutation && this.generation ? { ...init, headers } : init
    );
    const generation = response.headers?.get(GENERATION_HEADER);
    this.observe(generation);
    if (response.status === 412 && generation) this.requireRefresh();
    if (this.resetRequired) throw new DemoResetError();
    // A write may have completed just before publication. Check before reporting success
    // even if the SSE event was lost. Never retry or replay the request.
    if (mutation && this.generation && response.ok) {
      const current = await this.send(this.healthUrl, {
        cache: 'no-store',
        credentials: 'include',
      });
      this.observe(current.headers?.get(GENERATION_HEADER));
      if (this.resetRequired) throw new DemoResetError();
      if (!current.ok)
        throw new Error('Could not confirm the current demo state. Refresh to check your changes.');
    }
    return response;
  };
}

export const demoSession = new DemoRequestSession(
  (input, init) => fetch(input, init),
  `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/health`
);
export const demoFetch: typeof fetch = (input, init) =>
  typeof window === 'undefined' ? fetch(input, init) : demoSession.fetch(input, init);

export function demoMediaUrl(path: string): string {
  if (typeof window === 'undefined' || !demoSession.generation) return path;
  const url = new URL(path, window.location.origin);
  const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || window.location.origin).origin;
  if (
    url.origin !== apiOrigin ||
    !/^\/api\/recipes\/[^/]+\/(hero|original\/\d+)$/.test(url.pathname)
  )
    return path;
  url.searchParams.set('demoGeneration', demoSession.generation);
  return path.startsWith('http') ? url.href : url.pathname + url.search;
}

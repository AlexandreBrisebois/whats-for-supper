// Static application vocabulary only. Never derive telemetry labels from content.
const screens = {
  '/welcome': 'welcome',
  '/onboarding': 'onboarding',
  '/invite': 'invite',
  '/home': 'home',
  '/recipes': 'search',
  '/capture': 'capture',
  '/capture/confirm': 'capture.confirm',
  '/planner': 'planner',
  '/discovery': 'discovery',
  '/profile': 'profile',
  '/profile/settings': 'profile.settings',
  '/browse-all-stack': 'browse.stack',
} as const;

export type OpeningScreen =
  (typeof screens)[keyof typeof screens] | 'error' | 'not.found' | 'other';
const allowedScreens = new Set<string>([...Object.values(screens), 'error', 'not.found', 'other']);

export function isOpeningScreen(value: unknown): value is OpeningScreen {
  return typeof value === 'string' && allowedScreens.has(value);
}

export function classifyScreen(pathname: string): OpeningScreen {
  return Object.hasOwn(screens, pathname) ? screens[pathname as keyof typeof screens] : 'other';
}

const fallbacks = new WeakMap<Document, { pathname: string; screen: 'error' | 'not.found' }>();

export function registerOpeningFallback(
  owner: Document,
  pathname: string,
  screen: 'error' | 'not.found'
): () => void {
  const candidate = { pathname, screen };
  fallbacks.set(owner, candidate);
  return () => {
    if (fallbacks.get(owner) === candidate) fallbacks.delete(owner);
  };
}

// Document identity is only an in-memory object key, never an exported identifier.
// A WeakMap survives component remounts without retaining a departed document.
const openings = new WeakMap<Document, 'waiting' | 'claimed' | 'disabled'>();

export function observeOpening(
  owner: Document,
  enabled: boolean,
  readyPathname: string | null,
  submit: (input: { screen: OpeningScreen }) => Promise<void>
): void {
  if (!openings.has(owner)) openings.set(owner, enabled ? 'waiting' : 'disabled');
  if (openings.get(owner) !== 'waiting') return;
  if (!readyPathname || readyPathname === '/' || owner.visibilityState !== 'visible') return;
  openings.set(owner, 'claimed');
  // Claim before asynchronous work; failure never rearms the document.
  try {
    const fallback = fallbacks.get(owner);
    const screen =
      fallback?.pathname === readyPathname ? fallback.screen : classifyScreen(readyPathname);
    void submit({ screen }).catch(() => {});
  } catch {
    /* Telemetry must not interrupt entry, even if submission throws synchronously. */
  }
}

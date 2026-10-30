import type { BrowserObservation } from './navigation';

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
interface ObservationState {
  disabled: boolean;
  sessionId?: string;
  tabId?: string;
  sequence: number;
  screen?: OpeningScreen;
  windowStart: number;
  count: number;
}
const openings = new WeakMap<Document, ObservationState>();

// Opening and subsequent screens have one document owner, ordering and admission window.
export function observeOpening(
  owner: Document,
  enabled: boolean,
  readyPathname: string | null,
  submit: (input: BrowserObservation) => Promise<void>
): void {
  let state = openings.get(owner);
  if (!state) {
    state = { disabled: !enabled, sequence: 0, windowStart: 0, count: 0 };
    openings.set(owner, state);
  }
  if (
    state.disabled ||
    !enabled ||
    !readyPathname ||
    readyPathname === '/' ||
    owner.visibilityState !== 'visible'
  )
    return;
  try {
    const fallback = fallbacks.get(owner);
    const screen =
      fallback?.pathname === readyPathname ? fallback.screen : classifyScreen(readyPathname);
    if (state.screen === screen) return;
    const initial = !state.sessionId;
    if (initial) {
      state.sessionId = crypto.randomUUID();
      state.tabId = crypto.randomUUID();
    }
    // Claim presentation before calling asynchronous code; delivery never rearms it.
    state.screen = screen;
    const timestamp = Date.now();
    const emit = (eventName: BrowserObservation['eventName']) => {
      const event: BrowserObservation = {
        eventName,
        screen,
        sessionId: state.sessionId!,
        tabId: state.tabId!,
        eventId: crypto.randomUUID(),
        sequence: ++state.sequence,
        timestamp,
      };
      if (eventName !== 'pwa.app.opened') {
        if (timestamp - state.windowStart >= 60_000) {
          state.windowStart = timestamp;
          state.count = 0;
        }
        if (state.count >= 60) return;
        state.count++;
      }
      try {
        void submit(event).catch(() => {});
      } catch {
        /* Submission cannot interrupt presentation. */
      }
    };
    if (initial) emit('pwa.app.opened');
    emit('pwa.screen.presented');
  } catch {
    // Missing browser randomness or unexpected inspection cannot interrupt the app.
    state.disabled = true;
  }
}

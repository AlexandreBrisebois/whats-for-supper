import type { BrowserObservation, PresentationScreen } from './navigation';

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

// Composition belongs to the rendered Planner owner, not tab clicks or URL queries.
// The shared observer still owns gates, visibility, scope and all emissions.
export const presentationChanged = 'wfs:telemetry-presentation';
const plannerPresentations = new WeakMap<
  Document,
  {
    primary: 'planner' | 'planner.grocery';
    companion: boolean;
  }
>();

export function registerPlannerPresentation(
  owner: Document,
  primary: 'planner' | 'planner.grocery',
  companion: boolean
): () => void {
  const declaration = { primary, companion };
  plannerPresentations.set(owner, declaration);
  owner.dispatchEvent(new Event(presentationChanged));
  return () => {
    if (plannerPresentations.get(owner) === declaration) plannerPresentations.delete(owner);
    // No cleanup emission: effect replay/unmount is not an observed closure.
    // The next eligible route/composition reconciles the actual visible state.
  };
}

// Document identity is only an in-memory object key, never an exported identifier.
// A WeakMap survives component remounts without retaining a departed document.
interface ObservationState {
  disabled: boolean;
  sessionId?: string;
  tabId?: string;
  sequence: number;
  screen?: PresentationScreen;
  companion?: boolean;
  windowStart: number;
  count: number;
}
const openings = new WeakMap<Document, ObservationState>();

// Opening, screens and the companion share one document owner, sequence and admission window.
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
    const entryScreen =
      fallback?.pathname === readyPathname ? fallback.screen : classifyScreen(readyPathname);
    const planner = entryScreen === 'planner' ? plannerPresentations.get(owner) : undefined;
    if (entryScreen === 'planner' && !planner) return;
    const screen = planner?.primary ?? entryScreen;
    const companion = planner?.companion ?? false;
    if (state.screen === screen && !!state.companion === companion) return;
    const initial = !state.sessionId;
    if (initial) {
      state.sessionId = crypto.randomUUID();
      state.tabId = crypto.randomUUID();
    }
    // Claim presentation before calling asynchronous code; delivery never rearms it.
    const screenChanged = state.screen !== screen;
    const companionChanged = !!state.companion !== companion;
    state.screen = screen;
    state.companion = companion;
    const timestamp = Date.now();
    const emit = (eventName: BrowserObservation['eventName'], identity: PresentationScreen) => {
      const event: BrowserObservation = {
        eventName,
        screen: identity,
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
    if (initial) emit('pwa.app.opened', entryScreen);
    if (companionChanged && !companion) emit('pwa.surface.closed', 'planner.grocery');
    if (screenChanged) emit('pwa.screen.presented', screen);
    if (companionChanged && companion) emit('pwa.surface.opened', 'planner.grocery');
  } catch {
    // Missing browser randomness or unexpected inspection cannot interrupt the app.
    state.disabled = true;
  }
}

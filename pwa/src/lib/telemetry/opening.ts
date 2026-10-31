import type { IssueResultReason } from './issue-results';
import { presentedSurfaces, presentationChanged, type SurfaceIdentity } from './surfaces';
export { presentationChanged } from './surfaces';
import type {
  BrowserObservation,
  NavigationObservation,
  ContentObservation,
  PresentationScreen,
} from './navigation';

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
  surfaces?: Set<SurfaceIdentity>;
  windowStart: number;
  count: number;
  errorCount: number;
  readyPathname?: string | null;
  enabled?: boolean;
  detailCount?: number;
  originalCount?: number;
  issueResultCount?: number;
  presentedEntries?: WeakSet<object>;
  reportingError?: boolean;
}
const openings = new WeakMap<Document, ObservationState>();

// Opening, screens and the companion share one document owner, sequence and admission window.
export function observeOpening(
  owner: Document,
  enabled: boolean,
  readyPathname: string | null,
  submit: (input: BrowserObservation) => Promise<void>,
  fallbackScreen?: 'error'
): void {
  let state = openings.get(owner);
  if (!state) {
    state = { disabled: !enabled, sequence: 0, windowStart: 0, count: 0, errorCount: 0 };
    openings.set(owner, state);
  }
  state.readyPathname = readyPathname;
  state.enabled = enabled;
  if (
    state.disabled ||
    !enabled ||
    (!fallbackScreen && (!readyPathname || readyPathname === '/')) ||
    owner.visibilityState !== 'visible'
  )
    return;
  try {
    const fallback = fallbacks.get(owner);
    const entryScreen =
      fallbackScreen ??
      (fallback?.pathname === readyPathname ? fallback.screen : classifyScreen(readyPathname!));
    const planner = entryScreen === 'planner' ? plannerPresentations.get(owner) : undefined;
    if (entryScreen === 'planner' && !planner) return;
    const screen = planner?.primary ?? entryScreen;
    const companion = planner?.companion ?? false;
    const previousSurfaces = state.surfaces ?? new Set<SurfaceIdentity>();
    // A pending cleanup may preserve an observed identity through replay, but
    // cannot introduce a surface that departed before eligibility.
    const surfaces = presentedSurfaces(owner, readyPathname ?? '', previousSurfaces);
    if (companion) surfaces.add('planner.grocery');
    const initial = !state.sessionId;
    if (initial) {
      allocateDocumentContext(owner);
    }
    // Claim presentation before calling asynchronous code; delivery never rearms it.
    const screenChanged = state.screen !== screen;
    state.screen = screen;
    state.surfaces = surfaces;
    const timestamp = Date.now();
    const emit = (eventName: NavigationObservation['eventName'], identity: PresentationScreen) => {
      const event: NavigationObservation = {
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
    for (const identity of previousSurfaces)
      if (!surfaces.has(identity)) emit('pwa.surface.closed', identity);
    if (screenChanged) emit('pwa.screen.presented', screen);
    for (const identity of surfaces)
      if (!previousSurfaces.has(identity)) emit('pwa.surface.opened', identity);
    for (const declaration of loadedPresentations.get(owner)?.values() ?? []) {
      if (!declaration.presented || declaration.pathname !== readyPathname) continue;
      state.presentedEntries ??= new WeakSet();
      if (state.presentedEntries.has(declaration.entry)) continue;
      state.presentedEntries.add(declaration.entry); // Claim before asynchronous submission.
      emitContentObservation(owner, declaration.name, submit);
    }
  } catch {
    // Missing browser randomness or unexpected inspection cannot interrupt the app.
    state.disabled = true;
  }
}

// Only presentation calls this in production. Errors can read existing context but
// cannot initialize a visit. Shared allocation is exposed for owner-level tests.
export function allocateDocumentContext(owner: Document): void {
  const state = openings.get(owner);
  if (!state || state.disabled || state.sessionId) return;
  state.sessionId = crypto.randomUUID();
  state.tabId = crypto.randomUUID();
}

export function snapshotDocumentError(owner: Document, includeContext = true) {
  const state = openings.get(owner);
  if (!state || state.disabled || state.reportingError || state.errorCount >= 10) return null;
  state.errorCount++;
  return includeContext && state.sessionId && state.tabId
    ? {
        sessionId: state.sessionId,
        tabId: state.tabId,
        sequence: ++state.sequence,
        ...(state.screen ? { screen: state.screen } : {}),
      }
    : {};
}

export function withDocumentErrorReporting(owner: Document, work: () => void): void {
  const state = openings.get(owner);
  if (!state || state.reportingError) return;
  state.reportingError = true;
  try {
    work();
  } finally {
    state.reportingError = false;
  }
}

export function errorReportingInitialized(owner: Document): boolean {
  return openings.has(owner);
}

export function observeErrorPresentation(
  owner: Document,
  submit: (input: BrowserObservation) => Promise<void>
): void {
  // A fallback is real presentation, but must not initialize a visit for an error.
  if (!openings.get(owner)?.sessionId) return;
  observeOpening(owner, true, null, submit, 'error');
}

export type LoadedPresentationName = 'pwa.recipe_detail.presented' | 'pwa.original.presented';
const loadedPresentations = new WeakMap<
  Document,
  Map<
    object,
    {
      pathname: string;
      name: LoadedPresentationName;
      entry: object;
      presented: boolean;
    }
  >
>();

export function registerLoadedPresentation(
  owner: Document,
  pathname: string,
  name: LoadedPresentationName,
  entry: object,
  presented: boolean,
  instance: object
): () => void {
  let current = loadedPresentations.get(owner);
  if (!current) {
    current = new Map();
    loadedPresentations.set(owner, current);
  }
  const declaration = { pathname, name, entry, presented };
  current.set(instance, declaration);
  owner.dispatchEvent(new Event(presentationChanged));
  return () => {
    // Points have no closing transition to defer. Stop new admission immediately,
    // including when root readiness/visibility changes before the cleanup task.
    declaration.presented = false;
    queueMicrotask(() => {
      if (current.get(instance) !== declaration) return;
      current.delete(instance);
      owner.dispatchEvent(new Event(presentationChanged));
    });
  };
}

function emitContentObservation(
  owner: Document,
  name: ContentObservation['eventName'],
  submit: (input: BrowserObservation) => Promise<void>
): void {
  const state = openings.get(owner);
  if (
    !state ||
    state.disabled ||
    !state.enabled ||
    !state.readyPathname ||
    !state.sessionId ||
    !state.tabId ||
    !state.screen ||
    owner.visibilityState !== 'visible'
  )
    return;
  const cap = name === 'pwa.recipe_detail.presented' ? 'detailCount' : 'originalCount';
  if ((state[cap] ?? 0) >= 20) return;
  state[cap] = (state[cap] ?? 0) + 1;
  const context = {
    screen: state.screen as ContentObservation['screen'],
    sessionId: state.sessionId,
    tabId: state.tabId,
    eventId: crypto.randomUUID(),
    sequence: ++state.sequence,
    timestamp: Date.now(),
  };
  const event: ContentObservation =
    name === 'pwa.recipe_detail.presented'
      ? { ...context, eventName: name }
      : name === 'pwa.original.presented'
        ? { ...context, eventName: name, reason: 'image' }
        : { ...context, eventName: name, reason: 'external' };
  try {
    void submit(event).catch(() => {});
  } catch {
    /* Observation cannot alter the action. */
  }
}

export function observeOriginalRequest(
  owner: Document,
  submit: (input: BrowserObservation) => Promise<void>
): void {
  try {
    emitContentObservation(owner, 'pwa.original.requested', submit);
  } catch {
    /* isolated */
  }
}

// Uses the presentation-owned stream; it cannot initialize scope or defer hidden results.
export function emitDocumentIssueResult(
  owner: Document,
  reason: IssueResultReason,
  submit: (input: BrowserObservation) => Promise<void>
): void {
  const state = openings.get(owner);
  if (
    !state ||
    state.disabled ||
    !state.enabled ||
    !state.readyPathname ||
    !state.sessionId ||
    !state.tabId ||
    !state.screen ||
    owner.visibilityState !== 'visible' ||
    (state.issueResultCount ?? 0) >= 10
  )
    return;
  // Claim before randomness/submission so failures cannot replenish document capacity.
  state.issueResultCount = (state.issueResultCount ?? 0) + 1;
  const event: BrowserObservation = {
    eventName: 'pwa.recipe_issue.save_result',
    reason,
    screen: state.screen as ContentObservation['screen'],
    sessionId: state.sessionId,
    tabId: state.tabId,
    eventId: crypto.randomUUID(),
    sequence: ++state.sequence,
    timestamp: Date.now(),
  };
  try {
    void submit(event).catch(() => {});
  } catch {
    /* Save remains independent of telemetry submission. */
  }
}

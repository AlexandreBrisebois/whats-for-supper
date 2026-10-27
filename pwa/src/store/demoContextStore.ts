import { create } from 'zustand';

export const BETA_CONTEXT_ACK_KEY = 'wfs:mode-info:beta:dismissed';
export type ContextMode = 'demo' | 'beta';

export const DEMO_CONTEXT_ACK_KEY = 'wfs:mode-info:demo:dismissed';

export const useDemoContextVisit = create(() => ({
  resolvedMode: null as ContextMode | 'none' | null,
  betaAcknowledged: false,
  betaStorageRead: false,
  openMode: null as ContextMode | null,
  presented: false,
  interacted: false,
  acknowledged: false,
  storageRead: false,
  eligibleEntry: null as boolean | null,
  openPath: null as string | null,
  // Component lifetime only; never persisted or transmitted.
  openOwner: null as object | null,
}));

/** Shared dismissal memory; entry/interaction policy belongs only to the app shell. */
export function readContextAcknowledgement(mode: ContextMode) {
  const acknowledgedField = mode === 'demo' ? 'acknowledged' : 'betaAcknowledged';
  const readField = mode === 'demo' ? 'storageRead' : 'betaStorageRead';
  const key = mode === 'demo' ? DEMO_CONTEXT_ACK_KEY : BETA_CONTEXT_ACK_KEY;
  const state = useDemoContextVisit.getState();
  if (state[readField]) return;
  let acknowledged = state[acknowledgedField];
  try {
    acknowledged ||= localStorage.getItem(key) === 'true';
  } catch {
    /* Visit memory remains usable. */
  }
  useDemoContextVisit.setState({ [readField]: true, [acknowledgedField]: acknowledged });
}

export function acknowledgeContext(mode: ContextMode) {
  const field = mode === 'demo' ? 'acknowledged' : 'betaAcknowledged';
  useDemoContextVisit.setState({ [field]: true, openPath: null, openMode: null });
  try {
    localStorage.setItem(mode === 'demo' ? DEMO_CONTEXT_ACK_KEY : BETA_CONTEXT_ACK_KEY, 'true');
  } catch {
    /* Share visit memory even without persistence. */
  }
}

export const readDemoContextAcknowledgement = () => readContextAcknowledgement('demo');
export const acknowledgeDemoContext = () => acknowledgeContext('demo');

import { create } from 'zustand';

export const DEMO_CONTEXT_ACK_KEY = 'wfs:mode-info:demo:dismissed';

export const useDemoContextVisit = create(() => ({
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
export function readDemoContextAcknowledgement() {
  const state = useDemoContextVisit.getState();
  if (state.storageRead) return;
  let acknowledged = state.acknowledged;
  try {
    acknowledged ||= localStorage.getItem(DEMO_CONTEXT_ACK_KEY) === 'true';
  } catch {
    /* Visit memory remains usable. */
  }
  useDemoContextVisit.setState({ storageRead: true, acknowledged });
}

export function acknowledgeDemoContext() {
  useDemoContextVisit.setState({ acknowledged: true, openPath: null });
  try {
    localStorage.setItem(DEMO_CONTEXT_ACK_KEY, 'true');
  } catch {
    /* Share visit memory even without persistence. */
  }
}

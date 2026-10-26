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

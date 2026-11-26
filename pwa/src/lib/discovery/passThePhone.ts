'use client';

import { useSyncExternalStore } from 'react';

export const PASS_THE_PHONE_ENABLED_KEY = 'wfs.passThePhone.enabled';
export const PASS_THE_PHONE_LOCK_KEY = 'wfs.passThePhone.lock';

export interface HandoffLockSession {
  originMemberId: string;
  participantName: string;
  pendingTargetMemberId?: string;
}

const listeners = new Set<() => void>();
let storageListenerAttached = false;

let cachedEnabledRaw: string | null | undefined = undefined;
let cachedEnabledValue = false;

let cachedLockRaw: string | null | undefined = undefined;
let cachedLockValue: HandoffLockSession | null = null;

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function ensureStorageListener() {
  if (typeof window === 'undefined' || storageListenerAttached) return;
  storageListenerAttached = true;
  window.addEventListener('storage', (event) => {
    if (
      event.key === null ||
      event.key === PASS_THE_PHONE_ENABLED_KEY ||
      event.key === PASS_THE_PHONE_LOCK_KEY
    ) {
      notifyListeners();
    }
  });
}

function subscribe(listener: () => void): () => void {
  ensureStorageListener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isPassThePhoneEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(PASS_THE_PHONE_ENABLED_KEY);
    if (raw !== cachedEnabledRaw) {
      cachedEnabledRaw = raw;
      cachedEnabledValue = raw === 'true';
    }
    return cachedEnabledValue;
  } catch {
    return false;
  }
}

export function setPassThePhoneEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  const serialized = enabled ? 'true' : 'false';
  try {
    window.localStorage.setItem(PASS_THE_PHONE_ENABLED_KEY, serialized);
  } catch {
    /* Storage denial must not break the UI interaction. */
  }
  cachedEnabledRaw = serialized;
  cachedEnabledValue = enabled;
  notifyListeners();
}

export function usePassThePhoneEnabled(): boolean {
  return useSyncExternalStore(subscribe, isPassThePhoneEnabled, () => false);
}

export function getHandoffLock(): HandoffLockSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PASS_THE_PHONE_LOCK_KEY);
    if (raw !== cachedLockRaw) {
      cachedLockRaw = raw;
      if (!raw) {
        cachedLockValue = null;
      } else {
        const parsed = JSON.parse(raw) as Partial<HandoffLockSession>;
        if (
          typeof parsed.originMemberId === 'string' &&
          parsed.originMemberId.length > 0 &&
          typeof parsed.participantName === 'string' &&
          parsed.participantName.length > 0
        ) {
          cachedLockValue = {
            originMemberId: parsed.originMemberId,
            participantName: parsed.participantName,
            ...(typeof parsed.pendingTargetMemberId === 'string' &&
            parsed.pendingTargetMemberId.length > 0
              ? { pendingTargetMemberId: parsed.pendingTargetMemberId }
              : {}),
          };
        } else {
          cachedLockValue = null;
        }
      }
    }
    return cachedLockValue;
  } catch {
    return null;
  }
}

export function setHandoffLock(lock: HandoffLockSession): void {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(lock);
  try {
    window.sessionStorage.setItem(PASS_THE_PHONE_LOCK_KEY, serialized);
  } catch {
    /* Storage denial must not crash the handoff. */
  }
  cachedLockRaw = serialized;
  cachedLockValue = lock;
  notifyListeners();
}

export function clearHandoffLock(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PASS_THE_PHONE_LOCK_KEY);
  } catch {
    /* Ignore storage errors on cleanup. */
  }
  cachedLockRaw = null;
  cachedLockValue = null;
  notifyListeners();
}

export function useHandoffLock(): HandoffLockSession | null {
  return useSyncExternalStore(subscribe, getHandoffLock, () => null);
}

const pendingVotes = new Set<Promise<void>>();
let settlingCount = 0;

export function isHandoffSettling(): boolean {
  return settlingCount > 0;
}

export function trackPendingVote(promise: Promise<unknown>): void {
  const settled = promise.then(
    () => undefined,
    () => undefined
  );
  pendingVotes.add(settled);
  void settled.finally(() => {
    pendingVotes.delete(settled);
  });
}

export async function waitForPendingVotes(): Promise<void> {
  settlingCount += 1;
  try {
    while (pendingVotes.size > 0) {
      await Promise.allSettled([...pendingVotes]);
    }
  } finally {
    settlingCount -= 1;
  }
}

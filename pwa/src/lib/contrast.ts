export type ContrastMode = 'standard' | 'high';

export const CONTRAST_STORAGE_KEY = 'contrastMode';
const CONTRAST_STORAGE_EVENT = 'wfs-contrast-storage';

export function isContrastMode(value: unknown): value is ContrastMode {
  return value === 'standard' || value === 'high';
}

export function readStoredContrast(): ContrastMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONTRAST_STORAGE_KEY);
    return isContrastMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredContrast(mode: ContrastMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONTRAST_STORAGE_KEY, mode);
    window.dispatchEvent(new Event(CONTRAST_STORAGE_EVENT));
  } catch {
    /* Storage denial must not break in-memory contrast resolution. */
  }
}

export function clearStoredContrast(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CONTRAST_STORAGE_KEY);
    window.dispatchEvent(new Event(CONTRAST_STORAGE_EVENT));
  } catch {
    /* Storage denial must not break in-memory contrast resolution. */
  }
}

export function getOsPrefersHighContrast(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-contrast: more)').matches;
  } catch {
    return false;
  }
}

export function subscribeOsContrast(listener: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mql = window.matchMedia('(prefers-contrast: more)');
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }
  mql.addListener?.(listener);
  return () => mql.removeListener?.(listener);
}

export function subscribeStorageContrast(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CONTRAST_STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CONTRAST_STORAGE_EVENT, listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CONTRAST_STORAGE_EVENT, listener);
  };
}

export function resolveContrastMode({
  hasLoadedMember,
  memberContrastMode,
  storedMode,
  osPrefersHigh,
}: {
  hasLoadedMember: boolean;
  memberContrastMode?: ContrastMode | null;
  storedMode: ContrastMode | null;
  osPrefersHigh: boolean;
}): ContrastMode {
  if (hasLoadedMember) {
    if (isContrastMode(memberContrastMode)) {
      return memberContrastMode;
    }
    return osPrefersHigh ? 'high' : 'standard';
  }
  return storedMode ?? (osPrefersHigh ? 'high' : 'standard');
}

export const CONTRAST_BOOT_SCRIPT = `(function(){var d=document.documentElement;var m='';try{var s=localStorage.getItem('${CONTRAST_STORAGE_KEY}');if(s==='standard'||s==='high'){m=s;}}catch(e){}if(!m){try{m=window.matchMedia&&window.matchMedia('(prefers-contrast: more)').matches?'high':'standard';}catch(e){m='standard';}}d.dataset.contrast=m||'standard';})();`;

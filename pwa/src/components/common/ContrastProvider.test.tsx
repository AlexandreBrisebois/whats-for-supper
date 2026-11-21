import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTRAST_BOOT_SCRIPT, resolveContrastMode } from '@/lib/contrast';
import { ContrastProvider, useContrast } from './ContrastProvider';

const storeState = vi.hoisted(() => ({
  familyMembers: [] as Array<{
    id: string;
    name: string;
    contrastMode: 'standard' | 'high' | null;
  }>,
  selectedFamilyMemberId: null as string | null,
}));

vi.mock('@/store/familyStore', () => ({
  useFamilyStore: (selector?: (s: typeof storeState) => unknown) =>
    selector ? selector(storeState) : storeState,
}));

function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mql = {
    get matches() {
      return matches;
    },
    media: '(prefers-contrast: more)',
    onchange: null,
    addEventListener: vi.fn((event: string, listener: (ev: MediaQueryListEvent) => void) => {
      if (event === 'change') listeners.add(listener);
    }),
    removeEventListener: vi.fn((event: string, listener: (ev: MediaQueryListEvent) => void) => {
      if (event === 'change') listeners.delete(listener);
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql)
  );

  return {
    setMatches(next: boolean) {
      matches = next;
      const event = { matches: next, media: '(prefers-contrast: more)' } as MediaQueryListEvent;
      for (const listener of listeners) listener(event);
    },
  };
}

function Probe() {
  const { contrastMode, setLocalContrastMode } = useContrast();
  return (
    <div>
      <span data-testid="resolved-contrast">{contrastMode}</span>
      <button type="button" onClick={() => setLocalContrastMode('high')}>
        Local High
      </button>
      <button type="button" onClick={() => setLocalContrastMode('standard')}>
        Local Standard
      </button>
    </div>
  );
}

describe('ContrastProvider & contrast resolution', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    delete document.documentElement.dataset.contrast;
    storeState.familyMembers = [];
    storeState.selectedFamilyMemberId = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolveContrastMode prioritizes explicit loaded member over OS and storage', () => {
    expect(
      resolveContrastMode({
        hasLoadedMember: true,
        memberContrastMode: 'standard',
        storedMode: 'high',
        osPrefersHigh: true,
      })
    ).toBe('standard');

    expect(
      resolveContrastMode({
        hasLoadedMember: true,
        memberContrastMode: null,
        storedMode: 'high',
        osPrefersHigh: false,
      })
    ).toBe('standard');

    expect(
      resolveContrastMode({
        hasLoadedMember: false,
        memberContrastMode: null,
        storedMode: 'high',
        osPrefersHigh: false,
      })
    ).toBe('high');

    expect(CONTRAST_BOOT_SCRIPT).toContain("matchMedia('(prefers-contrast: more)')");
    expect(CONTRAST_BOOT_SCRIPT).toContain('dataset.contrast');
  });

  it('overrides OS prefers-contrast: more when loaded member explicitly saved standard', () => {
    installMatchMedia(true);
    localStorage.setItem('contrastMode', 'high');
    storeState.familyMembers = [{ id: 'member-a', name: 'Alex', contrastMode: 'standard' }];
    storeState.selectedFamilyMemberId = 'member-a';

    render(
      <ContrastProvider>
        <Probe />
      </ContrastProvider>
    );

    expect(screen.getByTestId('resolved-contrast')).toHaveTextContent('standard');
    expect(document.documentElement.dataset.contrast).toBe('standard');
    expect(localStorage.getItem('contrastMode')).toBe('standard');
  });

  it('tracks OS prefers-contrast: more when loaded member has contrastMode null and updates live', () => {
    const media = installMatchMedia(false);
    storeState.familyMembers = [{ id: 'member-a', name: 'Alex', contrastMode: null }];
    storeState.selectedFamilyMemberId = 'member-a';

    render(
      <ContrastProvider>
        <Probe />
      </ContrastProvider>
    );

    expect(screen.getByTestId('resolved-contrast')).toHaveTextContent('standard');
    expect(document.documentElement.dataset.contrast).toBe('standard');

    act(() => {
      media.setMatches(true);
    });

    expect(screen.getByTestId('resolved-contrast')).toHaveTextContent('high');
    expect(document.documentElement.dataset.contrast).toBe('high');
  });

  it('clears leaked localStorage and resets root contrast when switching from high member to unset member', () => {
    installMatchMedia(false);
    storeState.familyMembers = [
      { id: 'member-high', name: 'HighUser', contrastMode: 'high' },
      { id: 'member-unset', name: 'UnsetUser', contrastMode: null },
    ];
    storeState.selectedFamilyMemberId = 'member-high';

    const { rerender } = render(
      <ContrastProvider>
        <Probe />
      </ContrastProvider>
    );

    expect(document.documentElement.dataset.contrast).toBe('high');
    expect(localStorage.getItem('contrastMode')).toBe('high');

    storeState.selectedFamilyMemberId = 'member-unset';
    rerender(
      <ContrastProvider>
        <Probe />
      </ContrastProvider>
    );

    expect(screen.getByTestId('resolved-contrast')).toHaveTextContent('standard');
    expect(document.documentElement.dataset.contrast).toBe('standard');
    expect(localStorage.getItem('contrastMode')).toBeNull();
  });

  it('matches selectedFamilyMemberId case-insensitively against loaded familyMembers', () => {
    installMatchMedia(false);
    const canonicalId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    storeState.familyMembers = [{ id: canonicalId, name: 'Alex', contrastMode: 'high' }];
    storeState.selectedFamilyMemberId = canonicalId.toUpperCase();

    render(
      <ContrastProvider>
        <Probe />
      </ContrastProvider>
    );

    expect(screen.getByTestId('resolved-contrast')).toHaveTextContent('high');
    expect(document.documentElement.dataset.contrast).toBe('high');
  });

  it('falls back safely to OS preference and in-memory state when browser storage throws', () => {
    installMatchMedia(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError');
    });

    render(
      <ContrastProvider>
        <Probe />
      </ContrastProvider>
    );

    expect(screen.getByTestId('resolved-contrast')).toHaveTextContent('standard');
    expect(document.documentElement.dataset.contrast).toBe('standard');

    act(() => {
      screen.getByRole('button', { name: 'Local High' }).click();
    });

    expect(screen.getByTestId('resolved-contrast')).toHaveTextContent('high');
    expect(document.documentElement.dataset.contrast).toBe('high');
  });
});

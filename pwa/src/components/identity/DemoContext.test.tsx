import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoContext } from './DemoContext';
import { DEMO_CONTEXT_ACK_KEY, useDemoContextVisit } from '@/store/demoContextStore';

const state = vi.hoisted(() => ({
  mode: { mode: true as boolean | null, loading: false, error: false, retry: vi.fn() },
  route: { path: '/home', query: '' },
  family: { selectedFamilyMemberId: 'synthetic-member', hasLoaded: true, isLoading: false },
  ui: { isLoading: false },
  capture: { pendingRecipes: [] as unknown[] },
  pdf: { selection: null as unknown },
}));
vi.mock('@/components/demo/DemoModeProvider', () => ({ useDemoMode: () => state.mode }));
vi.mock('next/navigation', () => ({
  usePathname: () => state.route.path,
  useSearchParams: () => new URLSearchParams(state.route.query),
}));
vi.mock('@/store/familyStore', () => ({
  useFamilyStore: (selector: (value: unknown) => unknown) => selector(state.family),
}));
vi.mock('@/store/uiStore', () => ({
  useUiStore: (selector: (value: unknown) => unknown) => selector(state.ui),
}));
vi.mock('@/store/captureStore', () => ({
  useCaptureStore: (selector: (value: unknown) => unknown) => selector(state.capture),
}));
vi.mock('@/store/pdfCaptureStore', () => ({
  usePdfCaptureStore: (selector: (value: unknown) => unknown) => selector(state.pdf),
}));

describe('demo context', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    Object.assign(state.mode, { mode: true, loading: false, error: false });
    Object.assign(state.route, { path: '/home', query: '' });
    state.family.hasLoaded = true;
    state.family.selectedFamilyMemberId = 'synthetic-member';
    state.ui.isLoading = false;
    state.capture.pendingRecipes = [];
    state.pdf.selection = null;
    useDemoContextVisit.setState({
      presented: false,
      interacted: false,
      acknowledged: false,
      storageRead: false,
      eligibleEntry: null,
      openPath: null,
      openOwner: null,
    });
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
  });

  it('introduces one short explanation on ready ordinary Home and remembers Start exploring', async () => {
    render(<DemoContext />);
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Demo · What to know');
    expect(screen.getByText(/shared with other visitors/i)).toBeInTheDocument();
    expect(screen.getByText(/personal information/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up your own household' })).toHaveAttribute(
      'href',
      'https://github.com/AlexandreBrisebois/whats-for-supper/blob/main/docs/install/quick-start.md'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start exploring' }));
    expect(localStorage.getItem(DEMO_CONTEXT_ACK_KEY)).toBe('true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('demo-context-band'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByTestId('demo-context-band')).toHaveFocus();
  });

  it('explicit close and Escape acknowledge without navigation or household state', async () => {
    render(<DemoContext />);
    const dialog = await screen.findByRole('dialog');
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(localStorage.getItem(DEMO_CONTEXT_ACK_KEY)).toBe('true');
    expect(state.route.path).toBe('/home');
    expect(state.family.selectedFamilyMemberId).toBe('synthetic-member');
  });

  it('does not interrupt a deep-link handoff or automatically pop up after navigating Home', () => {
    state.route.path = '/recipes';
    state.route.query = 'recipeId=synthetic';
    const view = render(<DemoContext />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    Object.assign(state.route, { path: '/home', query: '' });
    view.rerender(<DemoContext />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('demo-context-band'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not open when readiness arrives after interaction', () => {
    state.family.hasLoaded = false;
    const view = render(
      <>
        <button>Plan meal</button>
        <DemoContext />
      </>
    );
    fireEvent.pointerDown(screen.getByText('Plan meal'));
    state.family.hasLoaded = true;
    view.rerender(
      <>
        <button>Plan meal</button>
        <DemoContext />
      </>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('withholds introduction for active work and a competing dialog', () => {
    state.capture.pendingRecipes = [{}];
    render(
      <>
        <div role="dialog">Existing task</div>
        <DemoContext />
      </>
    );
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByTestId('demo-context-band')).toBeInTheDocument();
  });

  it('does not queue introduction for the moment an active task finishes', () => {
    state.capture.pendingRecipes = [{}];
    const view = render(<DemoContext />);
    state.capture.pendingRecipes = [];
    view.rerender(<DemoContext />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('routing away is not persisted dismissal and does not repeat within the visit', async () => {
    const view = render(<DemoContext />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    state.route.path = '/planner';
    view.rerender(<DemoContext />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(DEMO_CONTEXT_ACK_KEY)).toBeNull();
    state.route.path = '/home';
    view.rerender(<DemoContext />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps dismissal outside reset, profile and locale state; cosmetic changes do not replay it', () => {
    localStorage.setItem(DEMO_CONTEXT_ACK_KEY, 'true');
    const view = render(<DemoContext />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    state.family.selectedFamilyMemberId = 'another-synthetic-member';
    localStorage.setItem('locale', 'fr');
    view.rerender(<DemoContext />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('demo-context-band')).toHaveTextContent('Démo · À savoir');
    state.family.selectedFamilyMemberId = 'synthetic-member';
  });

  it('handles unavailable acknowledgement storage without repeat during this visit', async () => {
    const get = localStorage.getItem.bind(localStorage);
    vi.spyOn(localStorage, 'getItem').mockImplementation(function (key: string) {
      if (key === DEMO_CONTEXT_ACK_KEY) throw new DOMException('Denied');
      return get(key);
    });
    const set = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, 'setItem').mockImplementation(function (key: string, value: string) {
      if (key === DEMO_CONTEXT_ACK_KEY) throw new DOMException('Denied');
      set(key, value);
    });
    const view = render(<DemoContext />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start exploring' }));
    view.unmount();
    render(<DemoContext />);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(useDemoContextVisit.getState().acknowledged).toBe(true);
  });

  it('does not reopen an undismissed introduction after the app shell remounts', () => {
    const view = render(<DemoContext />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    view.unmount();
    render(<DemoContext />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(DEMO_CONTEXT_ACK_KEY)).toBeNull();
    fireEvent.click(screen.getByTestId('demo-context-band'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('introduces safely in React StrictMode', () => {
    render(
      <StrictMode>
        <DemoContext />
      </StrictMode>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not present a demo explanation in ordinary non-demo mode', () => {
    state.mode.mode = false;
    render(<DemoContext />);
    expect(screen.queryByTestId('demo-context-band')).not.toBeInTheDocument();
  });

  it('remains readable when the browser denies all local storage access', async () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('Denied');
    });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Denied');
    });
    render(<DemoContext />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start exploring' }));
    expect(useDemoContextVisit.getState().acknowledged).toBe(true);
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoContext } from './DemoContext';
import { InstallIdentityProvider } from './IdentityHint';
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
  const beta = () => (
    <InstallIdentityProvider identity={{ demo: false, channel: 'beta' }}>
      <DemoContext />
    </InstallIdentityProvider>
  );
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
      resolvedMode: null,
      betaAcknowledged: false,
      betaStorageRead: false,
      openMode: null,
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
    expect(screen.getByText(/sharing this demo with other visitors/i)).toBeInTheDocument();
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

  it('introduces Beta on ready non-demo Home with its own acknowledgement and approved copy', async () => {
    state.mode.mode = false;
    render(
      <InstallIdentityProvider identity={{ demo: false, channel: 'beta' }}>
        <DemoContext />
      </InstallIdentityProvider>
    );
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Beta · Better with your ideas');
    expect(
      screen.getByText(
        'We’re still working on this version. Some things may change, and you might run into a bug along the way. We’re building this in public, together. Your ideas and feedback help shape what comes next.'
      )
    ).toBeVisible();
    expect(
      screen.queryByText(/sharing this demo|AI capture and generation|personal information/i)
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start exploring' }));
    expect(localStorage.getItem('wfs:mode-info:beta:dismissed')).toBe('true');
    expect(localStorage.getItem(DEMO_CONTEXT_ACK_KEY)).toBeNull();
    fireEvent.click(screen.getByTestId('beta-context-band'));
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it.each(['query', 'deep-link', 'capture', 'pdf', 'modal', 'interaction'] as const)(
    'keeps Beta introduction suppressed after %s',
    (guard) => {
      state.mode.mode = false;
      state.family.hasLoaded = false;
      if (guard === 'query') state.route.query = 'vote=round';
      if (guard === 'deep-link') state.route.path = '/recipes';
      if (guard === 'capture') state.capture.pendingRecipes = [{}];
      if (guard === 'pdf') state.pdf.selection = {};
      const modal = guard === 'modal' ? document.createElement('dialog') : null;
      modal?.setAttribute('open', '');
      if (modal) document.body.append(modal);
      const view = render(beta());
      if (guard === 'interaction') fireEvent.pointerDown(document.body);
      state.family.hasLoaded = true;
      view.rerender(beta());
      if (modal) modal.remove();
      Object.assign(state.route, { path: '/home', query: '' });
      state.capture.pendingRecipes = [];
      state.pdf.selection = null;
      view.rerender(beta());
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('beta-context-band'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    }
  );

  it('does not infer Beta from unknown runtime or installation Demo disagreement', () => {
    state.mode.mode = null;
    const view = render(beta());
    expect(screen.queryByTestId('beta-context-band')).not.toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Tab' });
    state.mode.mode = false;
    view.rerender(beta());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(
      <InstallIdentityProvider identity={{ demo: true, channel: 'beta' }}>
        <DemoContext />
      </InstallIdentityProvider>
    );
    expect(screen.queryByTestId('beta-context-band')).not.toBeInTheDocument();
  });

  it('can introduce Beta when initial unknown mode first resolves before interaction', () => {
    state.mode.mode = null;
    const view = render(beta());
    expect(screen.queryByTestId('beta-context-band')).not.toBeInTheDocument();
    state.mode.mode = false;
    view.rerender(beta());
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Beta · Better with your ideas');
  });

  it.each(['read', 'write', 'both'] as const)(
    'keeps Beta usable when storage %s throws',
    (failure) => {
      state.mode.mode = false;
      if (failure !== 'write')
        vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
          throw new Error('denied');
        });
      if (failure !== 'read')
        vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
          throw new Error('denied');
        });
      const view = render(beta());
      fireEvent.click(screen.getByRole('button', { name: 'Start exploring' }));
      view.unmount();
      render(beta());
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(useDemoContextVisit.getState().betaAcknowledged).toBe(true);
      expect(useDemoContextVisit.getState().acknowledged).toBe(false);
    }
  );

  it('keeps acknowledgement separate and never introduces a second mode in the same shell visit', () => {
    localStorage.setItem(DEMO_CONTEXT_ACK_KEY, 'true');
    state.mode.mode = false;
    const view = render(beta());
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Beta · Better with your ideas');
    state.mode.mode = true;
    view.rerender(beta());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('demo-context-band')).toHaveAccessibleDescription(
      'Beta release channel'
    );
    expect(localStorage.getItem('wfs:mode-info:beta:dismissed')).toBeNull();
    fireEvent.click(screen.getByTestId('demo-context-band'));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Demo · What to know');
  });

  it('does not introduce Beta after switching from an already acknowledged Demo in the same visit', () => {
    localStorage.setItem(DEMO_CONTEXT_ACK_KEY, 'true');
    useDemoContextVisit.setState({ betaStorageRead: true });
    state.mode.mode = true;
    const view = render(beta());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    state.mode.mode = false;
    view.rerender(beta());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('beta-context-band'));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Beta · Better with your ideas');
  });

  it.each([
    [
      'en',
      [
        'Welcome to What’s for Supper! You’re sharing this demo with other visitors, just like a family sharing the app. You’ll see their changes as you explore, and they’ll see yours.',
        'Try things out! Your changes are temporary and will be reset. Please don’t add personal information.',
        'AI capture and generation are turned off in this demo. Explore the recipes we’ve prepared for you instead.',
        'When you set up your own What’s for Supper, AI features require your own subscription.',
      ],
    ],
    [
      'fr',
      [
        'Bienvenue dans What’s for Supper! Vous partagez cette démo avec d’autres visiteurs, comme une famille qui utilise l’application ensemble. Vous verrez leurs changements au fil de votre exploration, et ils verront les vôtres.',
        'Amusez-vous à essayer! Vos changements sont temporaires et seront réinitialisés. Veuillez ne pas ajouter de renseignements personnels.',
        'La capture et la génération par IA sont désactivées dans cette démo. Explorez plutôt les recettes que nous avons préparées pour vous.',
        'Lorsque vous installez votre propre What’s for Supper, les fonctionnalités d’IA nécessitent votre propre abonnement.',
      ],
    ],
  ])('shows exactly the approved four disclaimer paragraphs in %s', async (locale, paragraphs) => {
    localStorage.setItem('locale', locale);
    render(<DemoContext />);
    for (const copy of paragraphs)
      expect(await screen.findByText(copy, { exact: true })).toBeVisible();
    expect(screen.queryByText(/self-hosted household|foyer autohébergé/i)).not.toBeInTheDocument();
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

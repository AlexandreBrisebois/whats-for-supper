import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  healthGet: vi.fn(),
  replace: vi.fn(),
  authenticate: vi.fn(),
  cookie: vi.fn(),
  path: '/welcome',
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => mocks.path,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/server', () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/api/api-client', () => ({
  apiClient: { api: { health: { get: mocks.healthGet } } },
}));
vi.mock('@/lib/auth', () => ({
  authenticateWithPassphrase: mocks.authenticate,
  setHearthCookie: mocks.cookie,
}));
import WelcomePage from './page';
import LandingPage from '../../page';
import { InstallIdentityProvider } from '@/components/identity/IdentityHint';
import { LocaleProvider, useLocale } from '@/components/common/LocaleProvider';
import { useDemoContextVisit } from '@/store/demoContextStore';
import { DemoContext } from '@/components/identity/DemoContext';
import { useFamilyStore } from '@/store/familyStore';

async function welcome(demo = true, channel: 'stable' | 'beta' = 'stable') {
  vi.stubEnv('DEMO_MODE', String(demo));
  const page = await WelcomePage();
  return render(
    <LocaleProvider>
      <InstallIdentityProvider identity={{ demo, channel }}>{page}</InstallIdentityProvider>
    </LocaleProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  localStorage.clear();
  mocks.path = '/welcome';
  vi.stubEnv('HEARTH_SECRET', 'Swipe-Match-Cook');
  mocks.healthGet.mockResolvedValue({ demoMode: false });
  mocks.authenticate.mockResolvedValue({ success: false });
  mocks.cookie.mockResolvedValue(undefined);
  useDemoContextVisit.setState({
    betaAcknowledged: false,
    betaStorageRead: false,
    openMode: null,
    acknowledged: false,
    storageRead: false,
    eligibleEntry: null,
    presented: false,
    interacted: false,
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
afterEach(() => vi.unstubAllEnvs());

describe('entry branding', () => {
  it.each(['en', 'fr'])('keeps the exact app name on landing and Welcome in %s', async (locale) => {
    localStorage.setItem('locale', locale);
    const landing = render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Whats for Supper?' })).toBeVisible();
    landing.unmount();
    await welcome();
    expect(screen.getByRole('heading', { level: 1, name: 'Whats for Supper?' })).toBeVisible();
    expect(screen.getByTestId('welcome-helper')).toHaveTextContent(
      locale === 'en'
        ? 'The demo passphrase is filled in for you. Tap Enter to explore.'
        : 'Le mot de passe de la démo est déjà rempli pour vous. Appuyez sur Entrer pour explorer.'
    );
  });
});

describe('Welcome public prefill', () => {
  it('uses server identity despite browser non-demo health, with no automatic authentication', async () => {
    await welcome();
    expect(screen.getByTestId('passphrase-input')).toHaveValue('Swipe-Match-Cook');
    expect(
      screen.getByText('The demo passphrase is filled in for you. Tap Enter to explore.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('welcome-enter-btn')).toBeEnabled();
    expect(mocks.healthGet).not.toHaveBeenCalled();
    expect(mocks.authenticate).not.toHaveBeenCalled();
    expect(mocks.cookie).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it.each(['Private-canary', '', ' Swipe-Match-Cook ', 'swipe-match-cook'])(
    'withholds prefill for configured %s',
    async (secret) => {
      vi.stubEnv('HEARTH_SECRET', secret);
      mocks.healthGet.mockResolvedValue({ demoMode: true });
      await welcome();
      expect(screen.getByTestId('passphrase-input')).toHaveValue('');
      expect(screen.getByTestId('welcome-enter-btn')).toBeDisabled();
      expect(screen.getByText("Enter your family's passphrase to continue")).toBeInTheDocument();
    }
  );
  it('keeps private entry even with public constant and browser demo health', async () => {
    mocks.healthGet.mockResolvedValue({ demoMode: true });
    await welcome(false);
    expect(screen.getByTestId('passphrase-input')).toHaveValue('');
    expect(screen.queryByTestId('demo-context-band')).not.toBeInTheDocument();
  });
  it('respects clear and manual retyping, and never reinstates the prefill claim', async () => {
    const view = await welcome();
    const input = screen.getByTestId('passphrase-input');
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveValue('');
    expect(screen.getByTestId('welcome-enter-btn')).toBeDisabled();
    fireEvent.change(input, { target: { value: 'Swipe-Match-Cook' } });
    expect(screen.getByText("Enter your family's passphrase to continue")).toBeInTheDocument();
    localStorage.setItem('locale', 'fr');
    view.rerender(
      <LocaleProvider>
        <InstallIdentityProvider identity={{ demo: true, channel: 'stable' }}>
          {await WelcomePage()}
        </InstallIdentityProvider>
      </LocaleProvider>
    );
    expect(input).toHaveValue('Swipe-Match-Cook');
  });
  it('rejects, retains current input and lets a corrected explicit retry set cookie before navigation', async () => {
    await welcome();
    const input = screen.getByTestId('passphrase-input');
    fireEvent.change(input, { target: { value: 'incorrect' } });
    fireEvent.click(screen.getByTestId('welcome-enter-btn'));
    expect(await screen.findByTestId('auth-error')).toHaveTextContent(/Incorrect passphrase/);
    expect(input).toHaveValue('incorrect');
    expect(mocks.cookie).not.toHaveBeenCalled();
    let finishCookie!: () => void;
    mocks.authenticate.mockResolvedValue({ success: true, token: 'signed-test-token' });
    mocks.cookie.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishCookie = resolve;
        })
    );
    fireEvent.change(input, { target: { value: 'corrected' } });
    fireEvent.click(screen.getByTestId('welcome-enter-btn'));
    await waitFor(() => expect(mocks.cookie).toHaveBeenCalledWith('signed-test-token'));
    expect(screen.queryByTestId('auth-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('welcome-enter-btn')).toBeDisabled();
    expect(mocks.replace).not.toHaveBeenCalled();
    await act(async () => finishCookie());
    expect(mocks.replace).toHaveBeenCalledWith('/onboarding');
    expect(mocks.authenticate).toHaveBeenLastCalledWith('corrected');
  });
  it.each(['action', 'cookie'])(
    'recovers after %s exception without discarding untouched prefill',
    async (failure) => {
      if (failure === 'action') mocks.authenticate.mockRejectedValue(new Error('test'));
      else {
        mocks.authenticate.mockResolvedValue({ success: true, token: 'token' });
        mocks.cookie.mockRejectedValue(new Error('test'));
      }
      await welcome();
      fireEvent.click(screen.getByTestId('welcome-enter-btn'));
      expect(await screen.findByTestId('auth-error')).toHaveTextContent(/Something went wrong/);
      expect(screen.getByTestId('passphrase-input')).toHaveValue('Swipe-Match-Cook');
      expect(screen.getByTestId('welcome-enter-btn')).toBeEnabled();
      expect(
        screen.getByText('The demo passphrase is filled in for you. Tap Enter to explore.')
      ).toBeInTheDocument();
      expect(mocks.replace).not.toHaveBeenCalled();
    }
  );
  it('uses French for actual prefill and exposes a named input with its helper', async () => {
    localStorage.setItem('locale', 'fr');
    await welcome();
    expect(
      screen.getByRole('textbox', { name: 'Mot de passe de la famille' })
    ).toHaveAccessibleDescription(
      'Le mot de passe de la démo est déjà rempli pour vous. Appuyez sur Entrer pour explorer.'
    );
  });
});

describe('manual Welcome explanation', () => {
  it.each(['Start exploring', 'Close', 'Escape'])(
    'shares Beta Welcome %s acknowledgement with Home when storage fails',
    async (action) => {
      const view = await welcome(false, 'beta');
      fireEvent.click(screen.getByTestId('beta-context-band'));
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('denied');
      });
      if (action === 'Escape')
        fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
      else fireEvent.click(screen.getByRole('button', { name: action }));
      expect(useDemoContextVisit.getState()).toMatchObject({
        betaAcknowledged: true,
        acknowledged: false,
        eligibleEntry: null,
        presented: false,
        interacted: false,
      });
      view.unmount();
      mocks.path = '/home';
      useFamilyStore.setState({
        hasLoaded: true,
        isLoading: false,
        selectedFamilyMemberId: 'synthetic-beta-member',
      });
      render(
        <InstallIdentityProvider identity={{ demo: false, channel: 'beta' }}>
          <DemoContext />
        </InstallIdentityProvider>
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('beta-context-band'));
      expect(screen.getByRole('dialog')).toHaveAccessibleName('Beta · Better with your ideas');
    }
  );
  it.each(['en', 'fr'] as const)(
    'offers manual Beta context without losing login input in %s',
    async (locale) => {
      localStorage.setItem('locale', locale);
      await welcome(false, 'beta');
      const input = screen.getByTestId('passphrase-input');
      expect(input).toHaveValue('');
      fireEvent.change(input, { target: { value: 'my family edit' } });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByTestId('identity-hint')).not.toBeInTheDocument();
      const band = screen.getByTestId('beta-context-band');
      fireEvent.click(band);
      expect(screen.getByRole('dialog')).toHaveAccessibleName(
        locale === 'en' ? 'Beta · Better with your ideas' : 'Bêta · Meilleure grâce à vos idées'
      );
      const link = screen.getByRole('link', {
        name: locale === 'en' ? 'Share feedback on GitHub' : 'Donner votre avis sur GitHub',
      });
      expect(link).toHaveAttribute(
        'href',
        'https://github.com/AlexandreBrisebois/whats-for-supper/issues'
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(
        screen.queryByText(/Set up your own household|Installez votre propre/)
      ).not.toBeInTheDocument();
      fireEvent.click(
        screen.getByRole('button', {
          name: locale === 'en' ? 'Start exploring' : 'Commencer à explorer',
        })
      );
      expect(input).toHaveValue('my family edit');
      expect(band).toHaveFocus();
      expect(localStorage.getItem('wfs:mode-info:beta:dismissed')).toBe('true');
      expect(localStorage.getItem('wfs:mode-info:demo:dismissed')).toBeNull();
      expect(useDemoContextVisit.getState()).toMatchObject({
        eligibleEntry: null,
        presented: false,
        interacted: false,
      });
      expect(mocks.healthGet).not.toHaveBeenCalled();
      expect(mocks.authenticate).not.toHaveBeenCalled();
    }
  );

  it('does not consume Home eligibility through login interactions or manual open without dismissal', async () => {
    const view = await welcome();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('passphrase-input'), { target: { value: 'edited' } });
    fireEvent.click(screen.getByTestId('demo-context-band'));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.queryByTestId('identity-hint')).not.toBeInTheDocument();
    expect(useDemoContextVisit.getState()).toMatchObject({
      eligibleEntry: null,
      presented: false,
      interacted: false,
      acknowledged: false,
    });
    view.unmount();
    expect(localStorage.getItem('wfs:mode-info:demo:dismissed')).toBeNull();
  });
  it.each(['Start exploring', 'Close', 'Escape'])(
    'shares explicit %s acknowledgement without Home activity, even when storage fails',
    async (action) => {
      await welcome();
      fireEvent.click(screen.getByTestId('demo-context-band'));
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('denied');
      });
      if (action === 'Escape')
        fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
      else fireEvent.click(screen.getByRole('button', { name: String(action) }));
      expect(useDemoContextVisit.getState()).toMatchObject({
        acknowledged: true,
        eligibleEntry: null,
        presented: false,
        interacted: false,
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByTestId('demo-context-band')).toHaveFocus();
    }
  );
});

it.each(['en', 'fr'] as const)(
  'retains accessible beta channel on the sole %s Demo band',
  async (locale) => {
    localStorage.setItem('locale', locale);
    await welcome(true, 'beta');
    expect(screen.getAllByTestId('demo-context-band')).toHaveLength(1);
    expect(screen.getByTestId('demo-context-band')).toHaveAccessibleDescription(
      locale === 'en' ? 'Beta release channel' : 'Canal bêta'
    );
    expect(screen.queryByTestId('identity-hint')).not.toBeInTheDocument();
  }
);

function ChangeLanguage() {
  const { setCurrentLocale } = useLocale();
  return <button onClick={() => setCurrentLocale('fr')}>Change language</button>;
}

it('keeps Beta in the selected in-memory French locale when storage writes fail', async () => {
  vi.stubEnv('DEMO_MODE', 'false');
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new Error('denied');
  });
  render(
    <LocaleProvider>
      <ChangeLanguage />
      <InstallIdentityProvider identity={{ demo: false, channel: 'beta' }}>
        {await WelcomePage()}
      </InstallIdentityProvider>
    </LocaleProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Change language' }));
  expect(screen.getByTestId('beta-context-band')).toHaveTextContent(
    'Bêta · Meilleure grâce à vos idées'
  );
  fireEvent.click(screen.getByTestId('beta-context-band'));
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Bêta · Meilleure grâce à vos idées');
  expect(screen.getByRole('button', { name: 'Fermer' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Commencer à explorer' })).toBeVisible();
  expect(
    screen.getByText(
      'Bienvenue dans la version bêta de Whats for Supper? Essayez de choisir vos repas ensemble, de planifier votre semaine et de faire du souper une chose de moins à gérer.'
    )
  ).toBeVisible();
  expect(
    screen.getByText(
      'Nous travaillons encore sur cette version. Certaines choses peuvent changer et vous pourriez rencontrer un bogue en cours de route. Nous développons cette application en public, ensemble. Vos idées et vos commentaires aident à façonner la suite.'
    )
  ).toBeVisible();
  expect(
    screen.getByText(
      'Vous pouvez rouvrir cette explication à tout moment à partir du bandeau Bêta.'
    )
  ).toBeVisible();
});

it('translates helper without overwriting edited input or reviving prefill provenance', async () => {
  vi.stubEnv('DEMO_MODE', 'true');
  render(
    <LocaleProvider>
      <ChangeLanguage />
      <InstallIdentityProvider identity={{ demo: true, channel: 'stable' }}>
        {await WelcomePage()}
      </InstallIdentityProvider>
    </LocaleProvider>
  );
  const input = screen.getByTestId('passphrase-input');
  fireEvent.change(input, { target: { value: 'my edit' } });
  fireEvent.click(screen.getByRole('button', { name: 'Change language' }));
  expect(input).toHaveValue('my edit');
  expect(input).toHaveAccessibleDescription(
    'Entrez le mot de passe de votre famille pour continuer'
  );
});

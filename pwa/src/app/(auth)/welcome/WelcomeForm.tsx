'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateWithPassphrase, setHearthCookie } from '@/lib/auth';
import { WelcomeDemoContext } from '@/components/identity/WelcomeDemoContext';
import { IdentityHint, useInstallIdentity } from '@/components/identity/IdentityHint';
import { t } from '@/locales';
import { useLocale } from '@/components/common/LocaleProvider';

export function WelcomeForm({ initialPassphrase }: { initialPassphrase: string | null }) {
  const { locale } = useLocale();
  const { demo } = useInstallIdentity();
  const router = useRouter();
  const [passphrase, setPassphrase] = useState(initialPassphrase ?? '');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  const [untouchedPrefill, setUntouchedPrefill] = useState(initialPassphrase !== null);
  const helper = untouchedPrefill
    ? t(
        'auth.demoPrefilled',
        'The demo passphrase is filled in for you. Tap Enter to explore.',
        locale
      )
    : t('auth.welcomeSubtitle', "Enter your family's passphrase to continue", locale);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsPending(true);

    try {
      const result = await authenticateWithPassphrase(passphrase);

      if (result.success && result.token) {
        await setHearthCookie(result.token);
        router.replace('/onboarding');
      } else {
        setError(
          t(
            'auth.errorIncorrectPassphrase',
            'Incorrect passphrase. Ask a family member for the right one.'
          )
        );
      }
    } catch {
      setError(t('auth.errorGeneric', 'Something went wrong. Please try again.'));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-cream">
      <WelcomeDemoContext />
      <main className="relative flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12 bg-cream">
        {!demo && <IdentityHint className="right-4 top-[calc(env(safe-area-inset-top)+1rem)]" />}
        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-bold text-indigo tracking-tight" data-testid="welcome-title">
            {t('auth.welcomeTitle', "What's For Supper?")}
          </h1>
          <p
            id="welcome-helper"
            data-testid="welcome-helper"
            className="mt-2 text-sm font-medium text-charcoal/60"
          >
            {helper}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
          <input
            type="text"
            placeholder={t('auth.passphrasePlaceholder', 'Family passphrase')}
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value);
              setUntouchedPrefill(false);
            }}
            aria-label={t('auth.passphrasePlaceholder', 'Family passphrase', locale)}
            aria-describedby="welcome-helper"
            autoComplete="off"
            data-testid="passphrase-input"
            className="w-full px-4 py-3 rounded-2xl border border-charcoal/20 bg-white text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-ochre/50"
          />

          {error && (
            <p className="text-sm text-terracotta text-center" data-testid="auth-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || !passphrase.trim()}
            data-testid="welcome-enter-btn"
            className="w-full h-14 rounded-2xl bg-ochre text-white font-bold text-sm uppercase tracking-widest shadow-lg shadow-ochre/30 transition-all active:scale-95 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? t('auth.checking', 'Checking…') : t('auth.enter', 'Enter')}
          </button>
        </form>
      </main>
    </div>
  );
}

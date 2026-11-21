'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateWithPassphrase, setHearthCookie } from '@/lib/auth';
import { WelcomeDemoContext } from '@/components/identity/WelcomeDemoContext';
import { Button } from '@/components/ui/button';
import { t } from '@/locales';
import { useLocale } from '@/components/common/LocaleProvider';

export function WelcomeForm({ initialPassphrase }: { initialPassphrase: string | null }) {
  const { locale } = useLocale();
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
        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1
            className="font-heading text-4xl font-bold text-ink-body tracking-tight"
            data-testid="welcome-title"
          >
            {t('auth.welcomeTitle', "What's for Supper?")}
          </h1>
          <p
            id="welcome-helper"
            data-testid="welcome-helper"
            className="mt-2 text-sm font-medium text-ink-muted"
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
            className="w-full min-h-12 px-4 py-3 rounded-2xl border border-chrome-line bg-white text-ink-body placeholder:text-ink-muted focus:border-hearth-fill focus:ring-2 focus:ring-terracotta/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
          />

          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm font-medium text-hearth-ink text-center"
              data-testid="auth-error"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isPending || !passphrase.trim()}
            data-testid="welcome-enter-btn"
          >
            {isPending ? t('auth.checking', 'Checking…') : t('auth.enter', 'Enter')}
          </Button>
        </form>
      </main>
    </div>
  );
}

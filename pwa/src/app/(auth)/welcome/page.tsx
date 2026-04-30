'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/locales';

export default function WelcomePage() {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsPending(true);

    try {
      const res = await fetch('/api/auth/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });

      if (res.ok) {
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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12 bg-cream">
      <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl font-bold text-indigo tracking-tight" data-testid="welcome-title">
          {t('auth.welcomeTitle', "What's For Supper?")}
        </h1>
        <p className="mt-2 text-sm font-medium text-charcoal/60">
          {t('auth.welcomeSubtitle', "Enter your family's passphrase to continue")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="text"
          placeholder={t('auth.passphrasePlaceholder', 'Family passphrase')}
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
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
  );
}

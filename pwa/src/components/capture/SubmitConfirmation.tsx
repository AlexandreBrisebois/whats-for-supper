'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/lib/constants/routes';

interface SubmitConfirmationProps {
  onAddAnother: () => void;
}

const AUTO_REDIRECT_MS = 4000;

export function SubmitConfirmation({ onAddAnother }: SubmitConfirmationProps) {
  const router = useRouter();

  useEffect(() => {
    const id = setTimeout(() => {
      router.replace(ROUTES.HOME);
    }, AUTO_REDIRECT_MS);
    return () => clearTimeout(id);
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-8 px-6 py-12 text-center">
      {/* Success mark */}
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo/15 ring-4 ring-indigo">
        <span className="text-5xl" aria-hidden>✓</span>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-indigo">Recipe saved!</h2>
        <p className="text-sm text-charcoal-400">
          Your recipe has been captured. Redirecting home in a moment…
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={onAddAnother}
          className="w-full rounded-2xl bg-indigo px-6 py-4 text-base font-semibold text-lavender transition-opacity hover:opacity-90 active:scale-95"
        >
          Add Another Recipe
        </button>
        <button
          type="button"
          onClick={() => router.replace(ROUTES.HOME)}
          className="w-full rounded-2xl border border-indigo px-6 py-4 text-base font-semibold text-indigo transition-colors hover:bg-indigo/10 active:scale-95"
        >
          Back Home
        </button>
      </div>
    </div>
  );
}

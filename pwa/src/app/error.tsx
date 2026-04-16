'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <h2 className="text-2xl font-bold text-charcoal">Something went wrong</h2>
      <p className="text-charcoal-400">An unexpected error occurred. Please try again.</p>
      <button
        onClick={reset}
        className="rounded-xl bg-indigo px-6 py-3 font-semibold text-lavender transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </main>
  );
}

import Link from 'next/link';

import { ROUTES } from '@/lib/constants/routes';

/**
 * Splash / landing page — shown to first-time visitors.
 * Authenticated users are redirected to /home by middleware before reaching here.
 */
export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-indigo">What&apos;s for Supper?</h1>
        <p className="mt-3 text-lg text-charcoal-400">
          Capture recipes, plan your week, discover what to cook next.
        </p>
      </div>

      <Link
        href={ROUTES.ONBOARDING}
        className="rounded-2xl bg-indigo px-8 py-4 text-lg font-semibold text-lavender shadow-card transition-opacity hover:opacity-90 active:opacity-75"
      >
        Get Started
      </Link>
    </main>
  );
}

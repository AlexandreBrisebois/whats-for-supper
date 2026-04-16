'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Layout } from '@/components/common/Layout';
import { useFamily } from '@/hooks/useFamily';
import { ROUTES } from '@/lib/constants/routes';

export default function HomePage() {
  const router = useRouter();
  const { selectedMember, familyMembers, loadFamily } = useFamily();

  useEffect(() => {
    void loadFamily();
  }, [loadFamily]);

  // If somehow landed here without a selection, send back to onboarding
  useEffect(() => {
    if (familyMembers.length > 0 && !selectedMember) {
      router.replace(ROUTES.ONBOARDING);
    }
  }, [familyMembers, selectedMember, router]);

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        {/* Welcome heading */}
        <div className="pt-4 text-center">
          <h1 className="text-3xl font-bold text-indigo">
            {selectedMember ? `Welcome, ${selectedMember.name}!` : 'Welcome!'}
          </h1>
        </div>

        {/* Quick-action cards */}
        <div className="flex flex-col gap-4">
          {/* Capture — Session 9 */}
          <Link
            href={ROUTES.CAPTURE}
            className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-card transition-all hover:bg-indigo/5 active:scale-[0.98]"
          >
            <span className="text-3xl" aria-hidden="true">📸</span>
            <div>
              <p className="font-semibold text-charcoal">Capture a recipe</p>
              <p className="text-sm text-charcoal-400">Photo + notes in seconds</p>
            </div>
          </Link>

          {/* Recipes — Phase 1 placeholder */}
          <div
            className="flex items-center gap-4 rounded-2xl bg-white/50 px-5 py-4 shadow-card opacity-60"
            aria-disabled="true"
          >
            <span className="text-3xl" aria-hidden="true">📖</span>
            <div>
              <p className="font-semibold text-charcoal">Recipes</p>
              <p className="text-sm text-charcoal-400">No recipes yet. Add your first?</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

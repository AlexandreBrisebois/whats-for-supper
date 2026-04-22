import { StoreInitializer } from '@/components/common/StoreInitializer';
import { serverFetch } from '@/lib/api/server-client';
import type { FamilyMember } from '@/types/domain';

export const dynamic = 'force-dynamic';

import {
  TonightMenuCard,
  QuickCaptureTrigger,
  NextPrepStepCard,
  SmartPivotCard,
} from '@/components/home/HomeSections';

/**
 * HomePage is now a Server Component.
 * It fetches the family data on the server to prevent FOUC
 * and hydrates the client-side store via StoreInitializer.
 */
export default async function HomePage() {
  let familyMembers: FamilyMember[] = [];

  try {
    familyMembers = await serverFetch<FamilyMember[]>('/api/family');
  } catch (error) {
    console.error('Failed to fetch family members on server:', error);
  }

  // Next Prep Step data (Mocked for now)
  const nextTask = { id: '1', label: 'Defrost ground beef', time: '3:00 PM', completed: false };
  const isMealPlanned = true; // Toggle this to test SmartPivot
  const isPrepActive = true;

  return (
    <>
      <StoreInitializer familyMembers={familyMembers} />

      <div className="flex flex-col gap-8 pt-4 pb-12 max-w-md mx-auto">
        {!isMealPlanned && <SmartPivotCard />}

        {isPrepActive && <NextPrepStepCard task={nextTask} />}

        <TonightMenuCard
          recipeName="Homemade Lasagna"
          description="A cozy Italian classic, made from scratch with layers of rich meat sauce and creamy béchamel."
          imageUrl="https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&q=80&w=800"
          prepTime="45 mins"
        />

        <QuickCaptureTrigger />
      </div>
    </>
  );
}

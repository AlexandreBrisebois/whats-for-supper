import { StoreInitializer } from '@/components/common/StoreInitializer';
import { serverFetch } from '@/lib/api/server-client';
import type { FamilyMember } from '@/types/domain';

export const dynamic = 'force-dynamic';

import { HomeCommandCenter } from '@/components/home/HomeCommandCenter';
import type { ScheduleDays } from '@/lib/api/generated/models';

/**
 * HomePage is now a Server Component.
 * It fetches the family data on the server to prevent FOUC
 * and hydrates the client-side store via StoreInitializer.
 */
export default async function HomePage() {
  let familyMembers: FamilyMember[] = [];
  let schedule: ScheduleDays | null = null;

  try {
    [familyMembers, schedule] = await Promise.all([
      serverFetch<FamilyMember[]>('/api/family'),
      serverFetch<ScheduleDays>('/api/schedule?weekOffset=0'),
    ]);
  } catch (error) {
    console.error('Failed to fetch home data on server:', error);
  }

  // Find today's recipe
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysEntry = schedule?.days?.find((d) => d.date === todayStr);
  const todaysRecipe = todaysEntry?.recipe;

  // Next Prep Step data (Mocked for now)
  const nextTask = { id: '1', label: 'Defrost ground beef', time: '3:00 PM', completed: false };
  const isMealPlanned = !!todaysRecipe;
  const isPrepActive = true;

  return (
    <>
      <StoreInitializer familyMembers={familyMembers} />
      <HomeCommandCenter
        todaysRecipe={todaysRecipe}
        nextTask={nextTask}
        isPrepActive={isPrepActive}
      />
    </>
  );
}

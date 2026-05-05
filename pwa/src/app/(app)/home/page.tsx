import { StoreInitializer } from '@/components/common/StoreInitializer';
import { TodayStoreInitializer } from '@/components/TodayStoreInitializer';
import { serverFetch } from '@/lib/api/server-client';
import type { FamilyMember } from '@/types/domain';

export const dynamic = 'force-dynamic';

import { HomeCommandCenter } from '@/components/home/HomeCommandCenter';
import type { ScheduleDays } from '@/lib/api/generated/models';
import { isScheduleRecipe } from '@/lib/api/planner';
import { getTodayString } from '@/lib/imageUtils';

/**
 * HomePage is now a Server Component.
 * It fetches the family data on the server to prevent FOUC
 * and hydrates the client-side store via StoreInitializer.
 */
export default async function HomePage() {
  let familyMembers: FamilyMember[] | null = null;
  let schedule: ScheduleDays | null = null;

  try {
    const [familyResult, scheduleResult] = await Promise.all([
      serverFetch<FamilyMember[]>('/api/family'),
      serverFetch<ScheduleDays>('/api/schedule?weekOffset=0'),
    ]);
    familyMembers = familyResult;
    schedule = scheduleResult;
  } catch (error) {
    console.error('Failed to fetch home data on server:', error);
  }

  // Find today's recipe (only if not already cooked or skipped)
  const todayStr = getTodayString();
  const todaysEntry = schedule?.days?.find((d) => d.date === todayStr);
  const isDone = todaysEntry?.status === 2 || todaysEntry?.status === 3;
  const rawRecipe = isDone ? null : todaysEntry?.recipe;
  const todaysRecipe = isScheduleRecipe(rawRecipe) ? rawRecipe : null;

  const todayStatus: 0 | 2 | 3 = todaysEntry?.status === 2 ? 2 : todaysEntry?.status === 3 ? 3 : 0;

  return (
    <>
      {familyMembers && <StoreInitializer familyMembers={familyMembers} />}
      <TodayStoreInitializer todaysRecipe={todaysRecipe} todayStatus={todayStatus} />
      <HomeCommandCenter todaysRecipe={todaysRecipe} todayStatus={todayStatus} />
    </>
  );
}

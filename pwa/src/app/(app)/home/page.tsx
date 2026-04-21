import { StoreInitializer } from '@/components/common/StoreInitializer';
import { HomeGreeting } from '@/components/home/HomeGreeting';
import { serverFetch } from '@/lib/api/server-client';
import type { FamilyMember } from '@/types/domain';
import type { ApiResponse } from '@/types/api';

export const dynamic = 'force-dynamic';

import { TonightMenuCard, PrepChecklist } from '@/components/home/HomeSections';

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

  // Mock data for new sections as approved by user
  const mockPrepTasks = [
    { id: '1', label: 'Defrost ground beef', time: '3:00 PM', completed: false },
    { id: '2', label: 'Chop onions & garlic', time: '4:30 PM', completed: true },
    { id: '3', label: 'Sauté vegetables', time: '4:45 PM', completed: false },
    { id: '4', label: 'Boil pasta sheets', time: '5:00 PM', completed: false },
    { id: '5', label: 'Layer and bake', time: '5:15 PM', completed: false },
  ];

  return (
    <>
      <StoreInitializer familyMembers={familyMembers} />

      <div className="flex flex-col gap-6 pt-4 pb-8 max-w-md mx-auto">
        <HomeGreeting />

        <TonightMenuCard
          recipeName="Homemade Lasagna"
          description="A cozy Italian classic, made from scratch."
          imageUrl="https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&q=80&w=800"
          prepTime="45 mins"
          intensity="Medium"
        />

        <div className="flex flex-col gap-6 mt-2">
          <PrepChecklist tasks={mockPrepTasks} />
        </div>
      </div>
    </>
  );
}

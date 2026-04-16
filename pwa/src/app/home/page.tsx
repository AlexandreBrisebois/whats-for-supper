import { cookies } from 'next/headers';
import { Layout } from '@/components/common/Layout';
import { StoreInitializer } from '@/components/common/StoreInitializer';
import { serverFetch } from '@/lib/api/server-client';
import type { FamilyMember } from '@/types/domain';
import type { ApiResponse } from '@/types/api';

/**
 * HomePage is now a Server Component.
 * It fetches the family data on the server to prevent FOUC 
 * and hydrates the client-side store via StoreInitializer.
 */
export default async function HomePage() {
  const cookieStore = await cookies();
  const selectedMemberId = cookieStore.get('member_id')?.value ?? null;

  let familyMembers: FamilyMember[] = [];
  let selectedMember: FamilyMember | null = null;

  try {
    const response = await serverFetch<ApiResponse<FamilyMember[]>>('/api/family');
    familyMembers = response.data;
    selectedMember = familyMembers.find((m) => m.id === selectedMemberId) ?? null;
  } catch (error) {
    console.error('Failed to fetch family members on server:', error);
    // In a production app, you might redirect to an error page or onboarding
  }

  return (
    <Layout>
      {/* Hydrate the Zustand store on the client immediately */}
      <StoreInitializer 
        familyMembers={familyMembers} 
        selectedMemberId={selectedMemberId} 
      />

      <div className="flex flex-col gap-8">
        {/* Welcome heading - now rendered purely on the server! */}
        <div className="flex flex-1 flex-col items-center justify-center pt-12 text-center">
          <h1 className="text-4xl font-bold text-indigo tracking-tight">
            {selectedMember ? `Welcome, ${selectedMember.name}!` : 'Welcome!'}
          </h1>
          <p className="mt-4 text-charcoal-300 max-w-[200px]">
            Ready to cook something delicious?
          </p>
        </div>
      </div>
    </Layout>
  );
}

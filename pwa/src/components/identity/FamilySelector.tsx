'use client';

import { useState } from 'react';

import { FamilyMemberList } from '@/components/identity/FamilyMemberList';
import { AddFamilyMemberForm } from '@/components/identity/AddFamilyMemberForm';
import { Button } from '@/components/ui/button';
import { useFamilyStore } from '@/store/familyStore';
import { useFamily } from '@/hooks/useFamily';

interface FamilySelectorProps {
  onMemberSelected: (memberId: string) => void;
  isLoading?: boolean;
}

export function FamilySelector({ onMemberSelected, isLoading = false }: FamilySelectorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const { familyMembers, selectedMember, addMember, isLoading: storeLoading } = useFamily();

  const isBusy = isLoading || storeLoading;

  async function handleAddAndSelect(name: string) {
    await addMember(name);
    // Grab the freshly-added member directly from store state (avoids stale closure)
    const members = useFamilyStore.getState().familyMembers;
    const newest = members[members.length - 1];
    if (newest) {
      onMemberSelected(newest.id);
    }
  }

  return (
    <div className="w-full space-y-6">
      <FamilyMemberList
        members={familyMembers ?? []}
        selectedId={selectedMember?.id ?? null}
        onSelect={onMemberSelected}
      />

      {!showAddForm && (
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => setShowAddForm(true)}
          fullWidth
        >
          Don&apos;t see your name? Add it
        </Button>
      )}

      {showAddForm && (
        <div className="rounded-2xl bg-white/60 p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-charcoal">Add a family member</p>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-charcoal-400 hover:text-charcoal focus:outline-none"
              aria-label="Hide add member form"
            >
              Cancel
            </button>
          </div>
          <AddFamilyMemberForm onSubmit={handleAddAndSelect} isLoading={isBusy} />
        </div>
      )}
    </div>
  );
}

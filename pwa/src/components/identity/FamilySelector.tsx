'use client';

import { useState } from 'react';

import { FamilyMemberList } from '@/components/identity/FamilyMemberList';
import { AddFamilyMemberForm } from '@/components/identity/AddFamilyMemberForm';
import { Button } from '@/components/ui/button';
import { useFamilyStore } from '@/store/familyStore';
import { useFamily } from '@/hooks/useFamily';
import { t } from '@/locales';

interface FamilySelectorProps {
  onFamilyMemberSelected: (familyMemberId: string) => void;
  isLoading?: boolean;
}

export function FamilySelector({ onFamilyMemberSelected, isLoading = false }: FamilySelectorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const { familyMembers, selectedMember, addMember, isLoading: storeLoading } = useFamily();

  const isBusy = isLoading || storeLoading;

  async function handleAddAndSelect(name: string) {
    const member = await addMember(name);
    if (member) {
      onFamilyMemberSelected(member.id);
    }
  }

  return (
    <div className="w-full space-y-6">
      <FamilyMemberList
        members={familyMembers ?? []}
        selectedId={selectedMember?.id ?? null}
        onSelect={onFamilyMemberSelected}
      />

      {!showAddForm && (
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => setShowAddForm(true)}
          fullWidth
        >
          {t('family.addPrompt', "Don't see your name? Add it")}
        </Button>
      )}

      {showAddForm && (
        <div className="rounded-2xl bg-white/60 p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-charcoal">
              {t('family.addMember', 'Add a family member')}
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-charcoal-400 hover:text-charcoal focus:outline-none"
              aria-label="Hide add member form"
            >
              {t('buttons.cancel', 'Cancel')}
            </button>
          </div>
          <AddFamilyMemberForm onSubmit={handleAddAndSelect} isLoading={isBusy} />
        </div>
      )}
    </div>
  );
}

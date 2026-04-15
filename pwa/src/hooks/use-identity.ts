'use client';

import { useIdentityStore } from '@/store/identity-store';

export function useIdentity() {
  const { currentMemberId, members, setCurrentMember, clearIdentity } = useIdentityStore();
  const currentMember = members.find((m) => m.id === currentMemberId) ?? null;
  return { currentMemberId, currentMember, members, setCurrentMember, clearIdentity };
}

'use client';

import { useEffect } from 'react';
import { useFamilyStore } from '@/store/familyStore';
import { useFeatureFlagStore } from '@/store/featureFlagStore';

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const memberId = useFamilyStore((state) => state.selectedFamilyMemberId);
  const load = useFeatureFlagStore((state) => state.load);
  const refresh = useFeatureFlagStore((state) => state.refresh);

  useEffect(() => {
    void load(memberId);
  }, [load, memberId]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  return children;
}

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  clearStoredContrast,
  type ContrastMode,
  getOsPrefersHighContrast,
  isContrastMode,
  readStoredContrast,
  resolveContrastMode,
  subscribeOsContrast,
  subscribeStorageContrast,
  writeStoredContrast,
} from '@/lib/contrast';
import { useFamilyStore } from '@/store/familyStore';

interface ContrastContextValue {
  contrastMode: ContrastMode;
  setLocalContrastMode: (mode: ContrastMode) => void;
}

const ContrastContext = createContext<ContrastContextValue>({
  contrastMode: 'standard',
  setLocalContrastMode: () => {},
});

export function ContrastProvider({ children }: { children: React.ReactNode }) {
  const familyMembers = useFamilyStore((s) => s.familyMembers);
  const selectedFamilyMemberId = useFamilyStore((s) => s.selectedFamilyMemberId);

  const osPrefersHigh = useSyncExternalStore(
    subscribeOsContrast,
    getOsPrefersHighContrast,
    () => false
  );
  const storedMode = useSyncExternalStore(subscribeStorageContrast, readStoredContrast, () => null);
  const [localMemoryMode, setLocalMemoryMode] = useState<ContrastMode | null>(null);

  const selectedMember = selectedFamilyMemberId
    ? (familyMembers.find(
        (member) => member.id.toLowerCase() === selectedFamilyMemberId.toLowerCase()
      ) ?? null)
    : null;

  const hasLoadedMember = selectedMember !== null;
  const contrastMode = resolveContrastMode({
    hasLoadedMember,
    memberContrastMode: selectedMember?.contrastMode,
    storedMode: localMemoryMode ?? storedMode,
    osPrefersHigh,
  });

  const setLocalContrastMode = useCallback((next: ContrastMode) => {
    setLocalMemoryMode(next);
    writeStoredContrast(next);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.contrast = next;
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.contrast = contrastMode;
    }
    if (hasLoadedMember) {
      const explicitMode = selectedMember.contrastMode;
      if (isContrastMode(explicitMode)) {
        if (readStoredContrast() !== explicitMode) {
          writeStoredContrast(explicitMode);
        }
      } else if (readStoredContrast() !== null) {
        clearStoredContrast();
      }
    }
  }, [contrastMode, hasLoadedMember, selectedMember]);

  return (
    <ContrastContext.Provider value={{ contrastMode, setLocalContrastMode }}>
      {children}
    </ContrastContext.Provider>
  );
}

export function useContrast(): ContrastContextValue {
  return useContext(ContrastContext);
}
